#pragma once

#include "OSProcess.h"
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <winsock2.h>
#include <windows.h>
#include <psapi.h>
#include <cstdint>
#include <vector>
#include <deque>
#include <mutex>
#include <cmath>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <random>
#include <algorithm>
#include <nlohmann/json.hpp>

struct ResourceDataPoint {
    std::string timestamp;
    double cpu_usage; // %
    double memory_usage_mb;
    double memory_percentage; // %
    int active_processes;
    int running_processes;
    int total_threads;

    nlohmann::json to_json() const {
        return nlohmann::json{
            {"timestamp", timestamp},
            {"cpu_usage", std::round(cpu_usage * 10.0) / 10.0},
            {"memory_usage_mb", std::round(memory_usage_mb * 10.0) / 10.0},
            {"memory_percentage", std::round(memory_percentage * 10.0) / 10.0},
            {"active_processes", active_processes},
            {"running_processes", running_processes},
            {"total_threads", total_threads}
        };
    }
};

class ResourceMonitor {
private:
    std::mutex mutex_;
    double total_memory_mb_{16384.0};
    double base_os_memory_mb_{2048.0};
    double current_cpu_usage_{12.5};
    double current_memory_usage_mb_{2048.0};
    double current_memory_percentage_{12.5};
    
    // Core CPU simulation / tracking
    std::vector<double> core_utilization_{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};

    // Configurable thresholds
    double cpu_threshold_{80.0};
    double memory_threshold_{70.0};

    std::deque<ResourceDataPoint> history_;
    const size_t max_history_points_{60};

    std::mt19937 rng_{std::random_device{}()};

    // Real Windows CPU measurement state
    FILETIME prev_idle_{0,0}, prev_kernel_{0,0}, prev_user_{0,0};
    bool first_cpu_sample_{true};

    uint64_t filetime_to_uint64(const FILETIME& ft) {
        return (static_cast<uint64_t>(ft.dwHighDateTime) << 32) | ft.dwLowDateTime;
    }

    double sample_real_cpu() {
        FILETIME idle, kernel, user;
        if (GetSystemTimes(&idle, &kernel, &user)) {
            uint64_t idle_val = filetime_to_uint64(idle);
            uint64_t kernel_val = filetime_to_uint64(kernel);
            uint64_t user_val = filetime_to_uint64(user);

            if (first_cpu_sample_) {
                prev_idle_ = idle;
                prev_kernel_ = kernel;
                prev_user_ = user;
                first_cpu_sample_ = false;
                return 15.0;
            }

            uint64_t prev_idle_val = filetime_to_uint64(prev_idle_);
            uint64_t prev_kernel_val = filetime_to_uint64(prev_kernel_);
            uint64_t prev_user_val = filetime_to_uint64(prev_user_);

            prev_idle_ = idle;
            prev_kernel_ = kernel;
            prev_user_ = user;

            uint64_t diff_idle = idle_val - prev_idle_val;
            uint64_t diff_kernel = kernel_val - prev_kernel_val;
            uint64_t diff_user = user_val - prev_user_val;
            uint64_t diff_total = diff_kernel + diff_user;

            if (diff_total > 0) {
                double usage = 100.0 * (1.0 - (double)diff_idle / (double)diff_total);
                return std::max(0.0, std::min(100.0, usage));
            }
        }
        return 15.0;
    }

    void sample_real_memory(double& total_mb, double& used_mb, double& pct) {
        MEMORYSTATUSEX memInfo;
        memInfo.dwLength = sizeof(MEMORYSTATUSEX);
        if (GlobalMemoryStatusEx(&memInfo)) {
            total_mb = memInfo.ullTotalPhys / (1024.0 * 1024.0);
            double avail_mb = memInfo.ullAvailPhys / (1024.0 * 1024.0);
            used_mb = total_mb - avail_mb;
            pct = static_cast<double>(memInfo.dwMemoryLoad);
        }
    }

public:
    ResourceMonitor() {
        // Detect hardware cores
        SYSTEM_INFO sysInfo;
        GetSystemInfo(&sysInfo);
        int cores = std::max(4, (int)sysInfo.dwNumberOfProcessors);
        core_utilization_.resize(cores, 10.0);

        // Initial memory probe
        double tot, used, pct;
        sample_real_memory(tot, used, pct);
        if (tot > 0.0) {
            total_memory_mb_ = tot;
            current_memory_usage_mb_ = used;
            current_memory_percentage_ = pct;
        }
    }

    void set_thresholds(double cpu_thresh, double mem_thresh) {
        std::lock_guard<std::mutex> lock(mutex_);
        cpu_threshold_ = std::max(10.0, std::min(100.0, cpu_thresh));
        memory_threshold_ = std::max(10.0, std::min(100.0, mem_thresh));
    }

    double get_cpu_threshold() const { return cpu_threshold_; }
    double get_memory_threshold() const { return memory_threshold_; }
    double get_total_memory() const { return total_memory_mb_; }

    void update(const std::vector<std::shared_ptr<Process>>& processes, const std::string& operational_mode = "REAL_HOST") {
        std::lock_guard<std::mutex> lock(mutex_);

        int active_count = 0;
        int running_count = 0;
        int thread_count = 0;

        for (const auto& proc : processes) {
            if (proc->state != ProcessState::TERMINATED) {
                active_count++;
                thread_count += proc->thread_count;
                if (proc->state == ProcessState::RUNNING) {
                    running_count++;
                }
            }
        }

        if (operational_mode == "REAL_HOST") {
            // Read REAL Host CPU & Memory from Windows OS APIs
            current_cpu_usage_ = sample_real_cpu();
            double tot, used, pct;
            sample_real_memory(tot, used, pct);
            total_memory_mb_ = tot;
            current_memory_usage_mb_ = used;
            current_memory_percentage_ = pct;

            // Balance per-core load
            std::uniform_real_distribution<double> core_jitter(-3.5, 3.5);
            for (size_t i = 0; i < core_utilization_.size(); ++i) {
                double c = current_cpu_usage_ + core_jitter(rng_) * (i % 2 == 0 ? 1.1 : 0.9);
                core_utilization_[i] = std::min(100.0, std::max(0.5, c));
            }
        } else {
            // Simulation model
            double sum_proc_cpu = 0.0;
            double sum_proc_mem = base_os_memory_mb_;

            std::uniform_real_distribution<double> jitter(-1.2, 1.2);
            for (const auto& proc : processes) {
                if (proc->state != ProcessState::TERMINATED) {
                    sum_proc_mem += proc->memory_usage;
                    if (proc->state == ProcessState::RUNNING) {
                        sum_proc_cpu += proc->cpu_usage;
                    }
                }
            }

            double os_background_cpu = 4.0 + std::max(0.0, jitter(rng_));
            current_cpu_usage_ = std::min(100.0, std::max(1.0, sum_proc_cpu + os_background_cpu));
            current_memory_usage_mb_ = std::min(total_memory_mb_, sum_proc_mem);
            current_memory_percentage_ = (current_memory_usage_mb_ / total_memory_mb_) * 100.0;

            for (size_t i = 0; i < core_utilization_.size(); ++i) {
                core_utilization_[i] = std::min(100.0, std::max(0.5, current_cpu_usage_ + jitter(rng_)));
            }
        }

        // Timestamp
        auto now = std::chrono::system_clock::now();
        auto in_time_t = std::chrono::system_clock::to_time_t(now);
        std::stringstream ss;
        ss << std::put_time(std::localtime(&in_time_t), "%H:%M:%S");

        ResourceDataPoint dp{
            ss.str(),
            current_cpu_usage_,
            current_memory_usage_mb_,
            current_memory_percentage_,
            active_count,
            running_count,
            std::max(thread_count, 24)
        };

        history_.push_back(dp);
        if (history_.size() > max_history_points_) {
            history_.pop_front();
        }
    }

    nlohmann::json get_resources_json(const std::vector<std::shared_ptr<Process>>& processes) {
        std::lock_guard<std::mutex> lock(mutex_);

        std::vector<std::shared_ptr<Process>> active;
        for (const auto& p : processes) {
            if (p->state != ProcessState::TERMINATED) {
                active.push_back(p);
            }
        }

        auto top_cpu = active;
        std::sort(top_cpu.begin(), top_cpu.end(), [](const auto& a, const auto& b) {
            return a->cpu_usage > b->cpu_usage;
        });

        auto top_mem = active;
        std::sort(top_mem.begin(), top_mem.end(), [](const auto& a, const auto& b) {
            return a->memory_usage > b->memory_usage;
        });

        nlohmann::json top_cpu_json = nlohmann::json::array();
        for (size_t i = 0; i < std::min((size_t)6, top_cpu.size()); ++i) {
            top_cpu_json.push_back(top_cpu[i]->to_json());
        }

        nlohmann::json top_mem_json = nlohmann::json::array();
        for (size_t i = 0; i < std::min((size_t)6, top_mem.size()); ++i) {
            top_mem_json.push_back(top_mem[i]->to_json());
        }

        nlohmann::json cores_json = nlohmann::json::array();
        for (double c : core_utilization_) {
            cores_json.push_back(std::round(c * 10.0) / 10.0);
        }

        nlohmann::json hist_json = nlohmann::json::array();
        for (const auto& h : history_) {
            hist_json.push_back(h.to_json());
        }

        return nlohmann::json{
            {"cpu_usage", std::round(current_cpu_usage_ * 10.0) / 10.0},
            {"memory_usage_mb", std::round(current_memory_usage_mb_ * 10.0) / 10.0},
            {"memory_total_mb", std::round(total_memory_mb_ * 10.0) / 10.0},
            {"memory_available_mb", std::round((total_memory_mb_ - current_memory_usage_mb_) * 10.0) / 10.0},
            {"memory_percentage", std::round(current_memory_percentage_ * 10.0) / 10.0},
            {"cpu_threshold", cpu_threshold_},
            {"memory_threshold", memory_threshold_},
            {"core_utilization", cores_json},
            {"top_cpu_processes", top_cpu_json},
            {"top_memory_processes", top_mem_json},
            {"history", hist_json}
        };
    }
};
