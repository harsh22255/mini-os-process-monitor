#pragma once

#ifndef ASIO_STANDALONE
#define ASIO_STANDALONE
#endif
#include "crow_all.h"
#include "OSMonitorApp.h"
#include <mutex>
#include <unordered_set>
#include <iostream>

class APIController {
private:
    OSMonitorApp& app_;
    crow::SimpleApp crow_app_;
    std::mutex ws_mutex_;
    std::unordered_set<crow::websocket::connection*> ws_clients_;

    crow::response json_response(const nlohmann::json& j, int code = 200) {
        crow::response res(code, j.dump());
        res.set_header("Content-Type", "application/json");
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return res;
    }

    crow::response cors_options() {
        crow::response res(204);
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return res;
    }

public:
    APIController(OSMonitorApp& app) : app_(app) {
        setup_routes();
        setup_websocket();

        // Wire monitor thread broadcast to active WebSocket clients
        app_.get_monitor_thread().set_broadcast_callback([this]() {
            broadcast_snapshot();
        });
    }

    void broadcast_snapshot() {
        std::string payload;
        {
            auto snapshot = app_.get_full_state_snapshot();
            payload = snapshot.dump();
        }

        std::lock_guard<std::mutex> lock(ws_mutex_);
        for (auto* conn : ws_clients_) {
            try {
                conn->send_text(payload);
            } catch (...) {}
        }
    }

    void setup_websocket() {
        CROW_WEBSOCKET_ROUTE(crow_app_, "/ws")
            .onopen([&](crow::websocket::connection& conn) {
                {
                    std::lock_guard<std::mutex> lock(ws_mutex_);
                    ws_clients_.insert(&conn);
                }
                auto snap = app_.get_full_state_snapshot();
                conn.send_text(snap.dump());
            })
            .onclose([&](crow::websocket::connection& conn, const std::string& /*reason*/, uint16_t /*status_code*/) {
                std::lock_guard<std::mutex> lock(ws_mutex_);
                ws_clients_.erase(&conn);
            })
            .onmessage([&](crow::websocket::connection& conn, const std::string& data, bool /*is_binary*/) {
                try {
                    auto j = nlohmann::json::parse(data);
                    if (j.contains("action") && j["action"] == "ping") {
                        conn.send_text("{\"action\":\"pong\"}");
                    }
                } catch (...) {}
            });
    }

    void setup_routes() {
        // 1. GET /api/health
        CROW_ROUTE(crow_app_, "/api/health")
            .methods("GET"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            return json_response({
                {"status", "online"},
                {"engine", "Mini OS Process Monitor C++ Engine"},
                {"version", "2.0.0"},
                {"uptime_seconds", app_.get_uptime_seconds()},
                {"monitoring_active", app_.get_monitor_thread().is_active()}
            });
        });

        // 2. /api/processes (GET, POST)
        CROW_ROUTE(crow_app_, "/api/processes")
            .methods("GET"_method, "POST"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            if (req.method == "POST"_method) {
                try {
                    auto body = nlohmann::json::parse(req.body);
                    std::string name = body.value("name", "UserProcess");
                    int priority = body.value("priority", 5);
                    int burst = body.value("burst_time", 40);
                    double mem = body.value("memory_usage", 128.0);

                    auto proc = app_.get_process_manager().create_process(
                        name, priority, burst, mem,
                        &app_.get_state_manager(),
                        &app_.get_activity_logger()
                    );

                    return json_response(proc->to_json(), 201);
                } catch (const std::exception& e) {
                    return json_response({{"error", e.what()}}, 400);
                }
            }
            // GET
            auto procs = app_.get_process_manager().get_all_processes();
            nlohmann::json arr = nlohmann::json::array();
            for (const auto& p : procs) {
                arr.push_back(p->to_json());
            }
            return json_response(arr);
        });

        // 3. /api/processes/<int> (GET, DELETE)
        CROW_ROUTE(crow_app_, "/api/processes/<int>")
            .methods("GET"_method, "DELETE"_method, "OPTIONS"_method)
        ([this](const crow::request& req, int pid) {
            if (req.method == "OPTIONS"_method) return cors_options();
            if (req.method == "DELETE"_method) {
                bool is_real = (app_.get_monitor_thread().get_operational_mode() == "REAL_HOST");
                bool ok = app_.get_process_manager().terminate_process(
                    pid, "Terminated by user command",
                    &app_.get_state_manager(),
                    &app_.get_activity_logger(),
                    is_real
                );
                if (!ok) {
                    return json_response({{"error", "Process cannot be terminated or is protected"}}, 400);
                }
                return json_response({{"success", true}, {"pid", pid}});
            }
            // GET
            auto proc = app_.get_process_manager().get_process(pid);
            if (!proc) {
                return json_response({{"error", "Process not found"}}, 404);
            }
            auto j = proc->to_json();
            auto history = app_.get_state_manager().get_history_for_pid(pid);
            nlohmann::json hist_arr = nlohmann::json::array();
            for (const auto& h : history) {
                hist_arr.push_back(h.to_json());
            }
            j["lifecycle_history"] = hist_arr;
            return json_response(j);
        });

        // 4. POST /api/processes/<int>/suspend
        CROW_ROUTE(crow_app_, "/api/processes/<int>/suspend")
            .methods("POST"_method, "OPTIONS"_method)
        ([this](const crow::request& req, int pid) {
            if (req.method == "OPTIONS"_method) return cors_options();
            bool ok = app_.get_process_manager().suspend_process(
                pid, &app_.get_state_manager(), &app_.get_activity_logger()
            );
            if (!ok) {
                return json_response({{"error", "Cannot suspend process in current state"}}, 400);
            }
            return json_response({{"success", true}, {"pid", pid}, {"state", "SUSPENDED"}});
        });

        // 5. POST /api/processes/<int>/resume
        CROW_ROUTE(crow_app_, "/api/processes/<int>/resume")
            .methods("POST"_method, "OPTIONS"_method)
        ([this](const crow::request& req, int pid) {
            if (req.method == "OPTIONS"_method) return cors_options();
            bool ok = app_.get_process_manager().resume_process(
                pid, &app_.get_state_manager(), &app_.get_activity_logger()
            );
            if (!ok) {
                return json_response({{"error", "Cannot resume non-suspended process"}}, 400);
            }
            return json_response({{"success", true}, {"pid", pid}, {"state", "READY"}});
        });

        // 6. GET /api/resources
        CROW_ROUTE(crow_app_, "/api/resources")
            .methods("GET"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            auto procs = app_.get_process_manager().get_all_processes();
            return json_response(app_.get_resource_monitor().get_resources_json(procs));
        });

        // 7. GET /api/alerts
        CROW_ROUTE(crow_app_, "/api/alerts")
            .methods("GET"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            std::string severity = req.url_params.get("severity") ? req.url_params.get("severity") : "";
            auto alerts = app_.get_alert_manager().get_alerts(severity);
            nlohmann::json arr = nlohmann::json::array();
            for (const auto& a : alerts) {
                arr.push_back(a.to_json());
            }
            return json_response(arr);
        });

        // 8. POST /api/alerts/<int>/acknowledge
        CROW_ROUTE(crow_app_, "/api/alerts/<int>/acknowledge")
            .methods("POST"_method, "OPTIONS"_method)
        ([this](const crow::request& req, int aid) {
            if (req.method == "OPTIONS"_method) return cors_options();
            bool ok = app_.get_alert_manager().acknowledge_alert(aid);
            return json_response({{"success", ok}, {"id", aid}});
        });

        // 9. GET /api/logs
        CROW_ROUTE(crow_app_, "/api/logs")
            .methods("GET"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            std::string category = req.url_params.get("category") ? req.url_params.get("category") : "";
            std::string search = req.url_params.get("search") ? req.url_params.get("search") : "";
            auto logs = app_.get_activity_logger().get_logs(category, search);
            nlohmann::json arr = nlohmann::json::array();
            for (const auto& l : logs) {
                arr.push_back(l.to_json());
            }
            return json_response(arr);
        });

        // 10. GET /api/reports/summary
        CROW_ROUTE(crow_app_, "/api/reports/summary")
            .methods("GET"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            return json_response(app_.get_report_manager().generate_summary_report(
                app_.get_process_manager(),
                app_.get_resource_monitor(),
                app_.get_alert_manager(),
                app_.get_uptime_seconds()
            ));
        });

        // 11. GET /api/reports/export
        CROW_ROUTE(crow_app_, "/api/reports/export")
            .methods("GET"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            std::string format = req.url_params.get("format") ? req.url_params.get("format") : "json";
            if (format == "csv") {
                std::string csv_data = app_.get_report_manager().export_csv(
                    app_.get_process_manager(),
                    app_.get_resource_monitor(),
                    app_.get_alert_manager(),
                    app_.get_uptime_seconds()
                );
                crow::response res(200, csv_data);
                res.set_header("Content-Type", "text/csv");
                res.set_header("Content-Disposition", "attachment; filename=\"os_monitor_report.csv\"");
                res.set_header("Access-Control-Allow-Origin", "*");
                return res;
            } else {
                return json_response(app_.get_report_manager().generate_summary_report(
                    app_.get_process_manager(),
                    app_.get_resource_monitor(),
                    app_.get_alert_manager(),
                    app_.get_uptime_seconds()
                ));
            }
        });

        // 12. /api/settings (GET, PUT)
        CROW_ROUTE(crow_app_, "/api/settings")
            .methods("GET"_method, "PUT"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            if (req.method == "PUT"_method) {
                try {
                    auto body = nlohmann::json::parse(req.body);
                    app_.update_settings(body);
                    return json_response(app_.get_settings());
                } catch (const std::exception& e) {
                    return json_response({{"error", e.what()}}, 400);
                }
            }
            return json_response(app_.get_settings());
        });

        // 13. POST /api/monitoring/start
        CROW_ROUTE(crow_app_, "/api/monitoring/start")
            .methods("POST"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            app_.get_monitor_thread().resume();
            return json_response({{"status", "running"}, {"active", true}});
        });

        // 14. POST /api/monitoring/stop
        CROW_ROUTE(crow_app_, "/api/monitoring/stop")
            .methods("POST"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            app_.get_monitor_thread().pause();
            return json_response({{"status", "paused"}, {"active", false}});
        });

        // 15. GET /api/lifecycle/history
        CROW_ROUTE(crow_app_, "/api/lifecycle/history")
            .methods("GET"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            int limit = 100;
            if (req.url_params.get("limit")) {
                try { limit = std::stoi(req.url_params.get("limit")); } catch (...) {}
            }
            auto hist = app_.get_state_manager().get_history(limit);
            nlohmann::json arr = nlohmann::json::array();
            for (const auto& h : hist) {
                arr.push_back(h.to_json());
            }
            return json_response(arr);
        });

        // 16. GET /api/topology
        CROW_ROUTE(crow_app_, "/api/topology")
            .methods("GET"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            return json_response(app_.get_system_topology());
        });

        // 17. GET /api/snapshot (Single call snapshot)
        CROW_ROUTE(crow_app_, "/api/snapshot")
            .methods("GET"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            return json_response(app_.get_full_state_snapshot());
        });

        // 18. /api/mode (GET, POST)
        CROW_ROUTE(crow_app_, "/api/mode")
            .methods("GET"_method, "POST"_method, "OPTIONS"_method)
        ([this](const crow::request& req) {
            if (req.method == "OPTIONS"_method) return cors_options();
            if (req.method == "POST"_method) {
                try {
                    auto body = nlohmann::json::parse(req.body);
                    std::string mode = body.value("mode", "REAL_HOST");
                    if (mode != "REAL_HOST" && mode != "SIMULATION") {
                        return json_response({{"error", "Invalid mode. Expected REAL_HOST or SIMULATION"}}, 400);
                    }
                    app_.get_monitor_thread().set_operational_mode(mode);
                    broadcast_snapshot();
                    return json_response({{"success", true}, {"operational_mode", mode}});
                } catch (const std::exception& e) {
                    return json_response({{"error", e.what()}}, 400);
                }
            }
            return json_response({{"operational_mode", app_.get_monitor_thread().get_operational_mode()}});
        });
    }

    void run(int port = 8080) {
        try {
            if (const char* env_port = std::getenv("PORT")) {
                try {
                    port = std::stoi(env_port);
                } catch (...) {}
            }
            std::cout << "[Mini OS Server] Initializing on http://0.0.0.0:" << port << std::endl;
            crow_app_.validate();
            std::cout << "[Mini OS Server] Routes validated successfully." << std::endl;
            crow_app_.bindaddr("0.0.0.0").port(port).multithreaded().run();
        } catch (const std::exception& e) {
            std::cerr << "[Mini OS Server] FATAL EXCEPTION: " << e.what() << std::endl;
        } catch (...) {
            std::cerr << "[Mini OS Server] UNKNOWN FATAL EXCEPTION" << std::endl;
        }
    }
};
