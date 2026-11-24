#pragma once

#include "ProcessManager.h"
#include "StateManager.h"
#include "ResourceMonitor.h"
#include "AlertManager.h"
#include "ActivityLogger.h"
#include "ReportManager.h"
#include "MonitorThread.h"
#include <chrono>
#include <memory>
#include <nlohmann/json.hpp>

class OSMonitorApp {
private:
    std::chrono::system_clock::time_point start_time_;
    
    StateManager state_manager_;
    ActivityLogger activity_logger_;
    AlertManager alert_manager_;
    ResourceMonitor resource_monitor_;
    ProcessManager process_manager_;
    ReportManager report_manager_;
    std::unique_ptr<MonitorThread> monitor_thread_;

    std::string visual_mode_{"CINEMATIC"}; // CINEMATIC, PERFORMANCE, ACCESSIBILITY

public:
    OSMonitorApp() : start_time_(std::chrono::system_clock::now()) {
        monitor_thread_ = std::make_unique<MonitorThread>(
            process_manager_, state_manager_, resource_monitor_, alert_manager_, activity_logger_
        );
        activity_logger_.log("SYSTEM", "INFO", "Mini OS Process Monitor Simulator initialized");
    }

    void start() {
        monitor_thread_->start();
    }

    void stop() {
        monitor_thread_->stop();
    }

    ProcessManager& get_process_manager() { return process_manager_; }
    StateManager& get_state_manager() { return state_manager_; }
    ResourceMonitor& get_resource_monitor() { return resource_monitor_; }
    AlertManager& get_alert_manager() { return alert_manager_; }
    ActivityLogger& get_activity_logger() { return activity_logger_; }
    ReportManager& get_report_manager() { return report_manager_; }
    MonitorThread& get_monitor_thread() { return *monitor_thread_; }

    uint64_t get_uptime_seconds() const {
        auto now = std::chrono::system_clock::now();
        return std::chrono::duration_cast<std::chrono::seconds>(now - start_time_).count();
    }

    nlohmann::json get_settings() {
        return nlohmann::json{
            {"cpu_threshold", resource_monitor_.get_cpu_threshold()},
            {"memory_threshold", resource_monitor_.get_memory_threshold()},
            {"refresh_interval_ms", monitor_thread_->get_interval()},
            {"auto_spawn_enabled", monitor_thread_->get_auto_spawn()},
            {"visual_mode", visual_mode_},
            {"operational_mode", monitor_thread_->get_operational_mode()},
            {"monitoring_active", monitor_thread_->is_active()}
        };
    }

    void update_settings(const nlohmann::json& j) {
        if (j.contains("cpu_threshold") && j.contains("memory_threshold")) {
            resource_monitor_.set_thresholds(
                j["cpu_threshold"].get<double>(),
                j["memory_threshold"].get<double>()
            );
        }
        if (j.contains("refresh_interval_ms")) {
            monitor_thread_->set_interval(j["refresh_interval_ms"].get<int>());
        }
        if (j.contains("auto_spawn_enabled")) {
            monitor_thread_->set_auto_spawn(j["auto_spawn_enabled"].get<bool>());
        }
        if (j.contains("visual_mode")) {
            visual_mode_ = j["visual_mode"].get<std::string>();
        }
        if (j.contains("operational_mode")) {
            monitor_thread_->set_operational_mode(j["operational_mode"].get<std::string>());
        }
        activity_logger_.log("SYSTEM", "INFO", "System settings updated");
    }

    nlohmann::json get_system_topology() {
        auto processes = process_manager_.get_active_processes();
        auto res = resource_monitor_.get_resources_json(processes);

        nlohmann::json nodes = nlohmann::json::array();
        nlohmann::json links = nlohmann::json::array();

        // 1. Central Core Node
        nodes.push_back({
            {"id", "node_cpu"},
            {"label", "Central Processor Core"},
            {"type", "CPU"},
            {"status", res["cpu_usage"].get<double>() > 80.0 ? "CRITICAL" : "HEALTHY"},
            {"utilization", res["cpu_usage"]},
            {"details", "Primary multi-threaded execution matrix with 8 virtual cores"}
        });

        // 2. Memory Controller Node
        nodes.push_back({
            {"id", "node_mem"},
            {"label", "Unified Memory Subsystem"},
            {"type", "MEMORY"},
            {"status", res["memory_percentage"].get<double>() > 70.0 ? "WARNING" : "HEALTHY"},
            {"utilization", res["memory_percentage"]},
            {"details", "16 GB DDR5 high-speed virtual memory pool"}
        });

        // 3. Process Manager Node
        nodes.push_back({
            {"id", "node_sched"},
            {"label", "Scheduler & Process Manager"},
            {"type", "SCHEDULER"},
            {"status", "HEALTHY"},
            {"utilization", processes.size()},
            {"details", "Preemptive priority-based round robin scheduler"}
        });

        // 4. State Manager Node
        nodes.push_back({
            {"id", "node_state"},
            {"label", "State Lifecycle Engine"},
            {"type", "STATE_ENGINE"},
            {"status", "HEALTHY"},
            {"utilization", 100.0},
            {"details", "Guarantees finite-state automaton consistency"}
        });

        // 5. Alert Manager Node
        nodes.push_back({
            {"id", "node_alert"},
            {"label", "Telemetry & Alert Sentinel"},
            {"type", "ALERT_ENGINE"},
            {"status", alert_manager_.get_active_count() > 0 ? "ALERT" : "HEALTHY"},
            {"utilization", alert_manager_.get_active_count()},
            {"details", "Real-time constraint watchdog and event dispatcher"}
        });

        // Connect infrastructure nodes
        links.push_back({{"source", "node_sched"}, {"target", "node_cpu"}, {"type", "DISPATCH"}});
        links.push_back({{"source", "node_sched"}, {"target", "node_mem"}, {"type", "ALLOCATE"}});
        links.push_back({{"source", "node_sched"}, {"target", "node_state"}, {"type", "TRANSITION"}});
        links.push_back({{"source", "node_cpu"}, {"target", "node_alert"}, {"type", "TELEMETRY"}});
        links.push_back({{"source", "node_mem"}, {"target", "node_alert"}, {"type", "TELEMETRY"}});

        // Add top active processes as satellite nodes
        for (size_t i = 0; i < std::min((size_t)6, processes.size()); ++i) {
            auto p = processes[i];
            std::string p_id = "proc_" + std::to_string(p->pid);
            nodes.push_back({
                {"id", p_id},
                {"label", p->name},
                {"type", "PROCESS"},
                {"pid", p->pid},
                {"state", processStateToString(p->state)},
                {"cpu", p->cpu_usage},
                {"mem", p->memory_usage},
                {"details", "PID " + std::to_string(p->pid) + " (" + processStateToString(p->state) + ")"}
            });

            links.push_back({{"source", "node_sched"}, {"target", p_id}, {"type", "MANAGE"}});
            if (p->state == ProcessState::RUNNING) {
                links.push_back({{"source", p_id}, {"target", "node_cpu"}, {"type", "EXECUTE"}});
            }
        }

        return nlohmann::json{
            {"nodes", nodes},
            {"links", links}
        };
    }

    nlohmann::json get_full_state_snapshot() {
        auto all_procs = process_manager_.get_all_processes();
        auto res_json = resource_monitor_.get_resources_json(all_procs);
        auto state_counts = process_manager_.get_state_counts();
        auto history = state_manager_.get_history(30);
        auto active_alerts = alert_manager_.get_alerts("", 0, true);

        nlohmann::json procs_json = nlohmann::json::array();
        for (const auto& p : all_procs) {
            procs_json.push_back(p->to_json());
        }

        nlohmann::json hist_json = nlohmann::json::array();
        for (const auto& h : history) {
            hist_json.push_back(h.to_json());
        }

        nlohmann::json alerts_json = nlohmann::json::array();
        for (const auto& a : active_alerts) {
            alerts_json.push_back(a.to_json());
        }

        return nlohmann::json{
            {"timestamp", std::chrono::system_clock::to_time_t(std::chrono::system_clock::now())},
            {"uptime_seconds", get_uptime_seconds()},
            {"monitoring_active", monitor_thread_->is_active()},
            {"operational_mode", monitor_thread_->get_operational_mode()},
            {"resources", res_json},
            {"processes", procs_json},
            {"state_counts", state_counts},
            {"recent_transitions", hist_json},
            {"active_alerts", alerts_json},
            {"active_alert_count", alert_manager_.get_active_count()}
        };
    }
};
