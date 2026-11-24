#pragma once

#include "ProcessManager.h"
#include "StateManager.h"
#include "ResourceMonitor.h"
#include "AlertManager.h"
#include "ActivityLogger.h"
#include <thread>
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <functional>
#include <chrono>

class MonitorThread {
public:
    using BroadcastCallback = std::function<void()>;

private:
    std::thread worker_thread_;
    std::mutex cv_mutex_;
    std::condition_variable cv_;
    std::atomic<bool> is_running_{false};
    std::atomic<bool> is_paused_{false};
    std::atomic<int> interval_ms_{1000};
    std::atomic<bool> auto_spawn_enabled_{true};

    std::string operational_mode_{"REAL_HOST"}; // "REAL_HOST" or "SIMULATION"
    std::mutex mode_mutex_;

    ProcessManager& process_mgr_;
    StateManager& state_mgr_;
    ResourceMonitor& resource_mon_;
    AlertManager& alert_mgr_;
    ActivityLogger& logger_;

    BroadcastCallback on_tick_callback_;

    void run_loop() {
        while (is_running_) {
            {
                std::unique_lock<std::mutex> lock(cv_mutex_);
                cv_.wait_for(lock, std::chrono::milliseconds(interval_ms_.load()), [this]() {
                    return !is_running_.load();
                });
            }

            if (!is_running_) break;
            if (is_paused_) continue;

            std::string mode;
            {
                std::lock_guard<std::mutex> lock(mode_mutex_);
                mode = operational_mode_;
            }

            // 1. Tick process simulation & scheduling
            process_mgr_.tick_simulation(state_mgr_, resource_mon_, alert_mgr_, logger_, auto_spawn_enabled_.load(), mode);

            // 2. Update resource metrics based on latest process states
            auto procs = process_mgr_.get_all_processes();
            resource_mon_.update(procs, mode);

            // 3. Check system resource thresholds and generate alerts
            double cpu = 0.0;
            double mem_pct = 0.0;
            {
                auto rjson = resource_mon_.get_resources_json(procs);
                cpu = rjson["cpu_usage"].get<double>();
                mem_pct = rjson["memory_percentage"].get<double>();
            }
            alert_mgr_.check_system_thresholds(
                cpu, 
                mem_pct, 
                resource_mon_.get_cpu_threshold(), 
                resource_mon_.get_memory_threshold(), 
                logger_
            );

            // 4. Notify subscribers (WebSocket & SSE broadcast)
            if (on_tick_callback_) {
                on_tick_callback_();
            }
        }
    }

public:
    MonitorThread(ProcessManager& pm, StateManager& sm, ResourceMonitor& rm, AlertManager& am, ActivityLogger& log)
        : process_mgr_(pm), state_mgr_(sm), resource_mon_(rm), alert_mgr_(am), logger_(log) {}

    ~MonitorThread() {
        stop();
    }

    void start() {
        if (is_running_) return;
        is_running_ = true;
        is_paused_ = false;
        worker_thread_ = std::thread(&MonitorThread::run_loop, this);
        logger_.log("SYSTEM", "INFO", "Simulation Engine thread started (Interval: " + std::to_string(interval_ms_.load()) + "ms)");
    }

    void stop() {
        if (!is_running_) return;
        is_running_ = false;
        cv_.notify_all();
        if (worker_thread_.joinable()) {
            worker_thread_.join();
        }
        logger_.log("SYSTEM", "WARNING", "Simulation Engine thread stopped");
    }

    void pause() {
        is_paused_ = true;
        logger_.log("SYSTEM", "INFO", "Simulation Engine paused");
    }

    void resume() {
        is_paused_ = false;
        logger_.log("SYSTEM", "INFO", "Simulation Engine resumed");
    }

    bool is_active() const {
        return is_running_ && !is_paused_;
    }

    void set_interval(int ms) {
        interval_ms_ = std::max(200, std::min(10000, ms));
        logger_.log("SYSTEM", "INFO", "Monitoring tick interval adjusted to " + std::to_string(interval_ms_.load()) + "ms");
    }

    int get_interval() const {
        return interval_ms_.load();
    }

    void set_auto_spawn(bool enabled) {
        auto_spawn_enabled_ = enabled;
    }

    bool get_auto_spawn() const {
        return auto_spawn_enabled_.load();
    }

    void set_operational_mode(const std::string& mode) {
        {
            std::lock_guard<std::mutex> lock(mode_mutex_);
            operational_mode_ = mode;
        }
        process_mgr_.switch_mode(mode);
        logger_.log("SYSTEM", "INFO", "Operational mode set to: " + mode);
        if (on_tick_callback_) {
            on_tick_callback_();
        }
    }

    std::string get_operational_mode() {
        std::lock_guard<std::mutex> lock(mode_mutex_);
        return operational_mode_;
    }

    void set_broadcast_callback(BroadcastCallback cb) {
        on_tick_callback_ = std::move(cb);
    }
};
