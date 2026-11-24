#pragma once

#include "ActivityLogger.h"
#include <string>
#include <vector>
#include <deque>
#include <mutex>
#include <atomic>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <nlohmann/json.hpp>

struct Alert {
    uint64_t id;
    std::string timestamp;
    std::string severity; // INFO, WARNING, CRITICAL
    std::string source;   // SYSTEM, PID:1002, etc.
    std::string message;
    bool acknowledged;
    bool resolved;
    uint32_t pid;

    nlohmann::json to_json() const {
        return nlohmann::json{
            {"id", id},
            {"timestamp", timestamp},
            {"severity", severity},
            {"source", source},
            {"message", message},
            {"acknowledged", acknowledged},
            {"resolved", resolved},
            {"pid", pid}
        };
    }
};

class AlertManager {
private:
    std::mutex mutex_;
    std::atomic<uint64_t> next_alert_id_{1};
    std::deque<Alert> alerts_;
    const size_t max_alerts_{500};

    // State trackers to prevent duplicate alerts for unchanged conditions
    bool cpu_alert_active_{false};
    bool cpu_critical_active_{false};
    bool mem_alert_active_{false};
    bool mem_critical_active_{false};

public:
    AlertManager() = default;

    uint64_t add_alert(const std::string& severity, const std::string& source, 
                        const std::string& message, uint32_t pid = 0, ActivityLogger* logger = nullptr) {
        std::lock_guard<std::mutex> lock(mutex_);

        auto now = std::chrono::system_clock::now();
        auto in_time_t = std::chrono::system_clock::to_time_t(now);
        std::stringstream ss;
        ss << std::put_time(std::localtime(&in_time_t), "%Y-%m-%d %H:%M:%S");

        uint64_t aid = next_alert_id_++;
        Alert alert{
            aid,
            ss.str(),
            severity,
            source,
            message,
            false,
            false,
            pid
        };

        alerts_.push_front(alert);
        if (alerts_.size() > max_alerts_) {
            alerts_.pop_back();
        }

        if (logger) {
            logger->log("ALERT", severity, "[" + source + "] " + message);
        }

        return aid;
    }

    void check_system_thresholds(double cpu, double mem_pct, double cpu_thresh, double mem_thresh, ActivityLogger& logger) {
        // CPU alert condition
        if (cpu >= 90.0) {
            if (!cpu_critical_active_) {
                cpu_critical_active_ = true;
                cpu_alert_active_ = true;
                std::stringstream ss;
                ss << "Critical CPU utilization reached: " << std::fixed << std::setprecision(1) << cpu << "% (Limit: " << cpu_thresh << "%)";
                add_alert("CRITICAL", "SYSTEM:CPU", ss.str(), 0, &logger);
            }
        } else if (cpu >= cpu_thresh) {
            if (!cpu_alert_active_) {
                cpu_alert_active_ = true;
                std::stringstream ss;
                ss << "High CPU utilization warning: " << std::fixed << std::setprecision(1) << cpu << "% (Threshold: " << cpu_thresh << "%)";
                add_alert("WARNING", "SYSTEM:CPU", ss.str(), 0, &logger);
            }
        } else {
            if (cpu_alert_active_ || cpu_critical_active_) {
                cpu_alert_active_ = false;
                cpu_critical_active_ = false;
                std::stringstream ss;
                ss << "CPU utilization normalized to: " << std::fixed << std::setprecision(1) << cpu << "%";
                add_alert("INFO", "SYSTEM:CPU", ss.str(), 0, &logger);
            }
        }

        // Memory alert condition
        if (mem_pct >= 88.0) {
            if (!mem_critical_active_) {
                mem_critical_active_ = true;
                mem_alert_active_ = true;
                std::stringstream ss;
                ss << "Critical Memory pressure: " << std::fixed << std::setprecision(1) << mem_pct << "% (Limit: " << mem_thresh << "%)";
                add_alert("CRITICAL", "SYSTEM:MEM", ss.str(), 0, &logger);
            }
        } else if (mem_pct >= mem_thresh) {
            if (!mem_alert_active_) {
                mem_alert_active_ = true;
                std::stringstream ss;
                ss << "High Memory consumption warning: " << std::fixed << std::setprecision(1) << mem_pct << "% (Threshold: " << mem_thresh << "%)";
                add_alert("WARNING", "SYSTEM:MEM", ss.str(), 0, &logger);
            }
        } else {
            if (mem_alert_active_ || mem_critical_active_) {
                mem_alert_active_ = false;
                mem_critical_active_ = false;
                std::stringstream ss;
                ss << "Memory consumption normalized to: " << std::fixed << std::setprecision(1) << mem_pct << "%";
                add_alert("INFO", "SYSTEM:MEM", ss.str(), 0, &logger);
            }
        }
    }

    bool acknowledge_alert(uint64_t id) {
        std::lock_guard<std::mutex> lock(mutex_);
        for (auto& a : alerts_) {
            if (a.id == id) {
                a.acknowledged = true;
                return true;
            }
        }
        return false;
    }

    bool resolve_alert(uint64_t id) {
        std::lock_guard<std::mutex> lock(mutex_);
        for (auto& a : alerts_) {
            if (a.id == id) {
                a.resolved = true;
                return true;
            }
        }
        return false;
    }

    std::vector<Alert> get_alerts(const std::string& severity_filter = "", uint32_t pid_filter = 0, bool active_only = false) {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<Alert> result;

        for (const auto& a : alerts_) {
            if (active_only && a.resolved) continue;
            if (!severity_filter.empty() && severity_filter != "ALL" && a.severity != severity_filter) continue;
            if (pid_filter > 0 && a.pid != pid_filter) continue;
            result.push_back(a);
        }

        return result;
    }

    int get_active_count() {
        std::lock_guard<std::mutex> lock(mutex_);
        int count = 0;
        for (const auto& a : alerts_) {
            if (!a.resolved && !a.acknowledged) count++;
        }
        return count;
    }

    void clear_all() {
        std::lock_guard<std::mutex> lock(mutex_);
        alerts_.clear();
    }
};
