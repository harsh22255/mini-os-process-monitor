#pragma once

#include <string>
#include <vector>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <nlohmann/json.hpp>

enum class ProcessState {
    NEW,
    READY,
    RUNNING,
    WAITING,
    SUSPENDED,
    TERMINATED
};

inline std::string processStateToString(ProcessState state) {
    switch (state) {
        case ProcessState::NEW: return "NEW";
        case ProcessState::READY: return "READY";
        case ProcessState::RUNNING: return "RUNNING";
        case ProcessState::WAITING: return "WAITING";
        case ProcessState::SUSPENDED: return "SUSPENDED";
        case ProcessState::TERMINATED: return "TERMINATED";
        default: return "UNKNOWN";
    }
}

inline ProcessState stringToProcessState(const std::string& str) {
    if (str == "NEW") return ProcessState::NEW;
    if (str == "READY") return ProcessState::READY;
    if (str == "RUNNING") return ProcessState::RUNNING;
    if (str == "WAITING") return ProcessState::WAITING;
    if (str == "SUSPENDED") return ProcessState::SUSPENDED;
    return ProcessState::TERMINATED;
}

class Process {
public:
    uint32_t pid;
    std::string name;
    int priority; // 1 (Low) to 10 (Critical/Real-time)
    ProcessState state;
    double cpu_usage; // %
    double memory_usage; // MB
    double memory_percentage; // %
    std::string creation_time;
    int burst_time; // total work required
    int remaining_burst;
    int waiting_time;
    int execution_time;
    int thread_count;
    bool has_alert;
    std::string alert_msg;
    std::vector<std::string> tags;

    Process(uint32_t p, std::string n, int prio, int burst = 30, double base_mem = 64.0)
        : pid(p), name(std::move(n)), priority(prio), state(ProcessState::NEW),
          cpu_usage(0.0), memory_usage(base_mem), memory_percentage(0.0),
          burst_time(burst), remaining_burst(burst), waiting_time(0),
          execution_time(0), thread_count(1 + (prio % 4)), has_alert(false) {
        auto now = std::chrono::system_clock::now();
        auto in_time_t = std::chrono::system_clock::to_time_t(now);
        std::stringstream ss;
        ss << std::put_time(std::localtime(&in_time_t), "%Y-%m-%d %H:%M:%S");
        creation_time = ss.str();
    }

    void update_resources(double cpu, double mem, double total_mem) {
        cpu_usage = cpu;
        memory_usage = mem;
        if (total_mem > 0.0) {
            memory_percentage = (memory_usage / total_mem) * 100.0;
        }
        if (cpu_usage > 75.0 || memory_usage > 1024.0) {
            has_alert = true;
            alert_msg = cpu_usage > 75.0 ? "High CPU utilization" : "High Memory footprint";
        } else {
            has_alert = false;
            alert_msg = "";
        }
    }

    void tick_execution() {
        if (state == ProcessState::RUNNING) {
            execution_time++;
            if (remaining_burst > 0) {
                remaining_burst--;
            }
        } else if (state == ProcessState::READY || state == ProcessState::WAITING) {
            waiting_time++;
        }
    }

    nlohmann::json to_json() const {
        return nlohmann::json{
            {"pid", pid},
            {"name", name},
            {"priority", priority},
            {"state", processStateToString(state)},
            {"cpu_usage", std::round(cpu_usage * 10.0) / 10.0},
            {"memory_usage", std::round(memory_usage * 10.0) / 10.0},
            {"memory_percentage", std::round(memory_percentage * 10.0) / 10.0},
            {"creation_time", creation_time},
            {"burst_time", burst_time},
            {"remaining_burst", remaining_burst},
            {"waiting_time", waiting_time},
            {"execution_time", execution_time},
            {"thread_count", thread_count},
            {"has_alert", has_alert},
            {"alert_msg", alert_msg}
        };
    }
};
