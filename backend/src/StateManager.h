#pragma once

#include "OSProcess.h"
#include <mutex>
#include <vector>
#include <deque>
#include <atomic>
#include <algorithm>
#include <nlohmann/json.hpp>

struct StateTransition {
    uint64_t id;
    uint32_t pid;
    std::string process_name;
    std::string from_state;
    std::string to_state;
    std::string reason;
    std::string timestamp;

    nlohmann::json to_json() const {
        return nlohmann::json{
            {"id", id},
            {"pid", pid},
            {"process_name", process_name},
            {"from_state", from_state},
            {"to_state", to_state},
            {"reason", reason},
            {"timestamp", timestamp}
        };
    }
};

class StateManager {
private:
    std::mutex mutex_;
    std::atomic<uint64_t> next_transition_id_{1};
    std::deque<StateTransition> transition_history_;
    const size_t max_history_size_{300};

public:
    StateManager() = default;

    bool validate_transition(ProcessState from, ProcessState to) const {
        if (from == to) return false;
        if (from == ProcessState::TERMINATED) return false; // terminal state
        if (to == ProcessState::TERMINATED) return true; // any non-terminated state can be terminated

        switch (from) {
            case ProcessState::NEW:
                return to == ProcessState::READY;

            case ProcessState::READY:
                return to == ProcessState::RUNNING || to == ProcessState::SUSPENDED;

            case ProcessState::RUNNING:
                return to == ProcessState::READY || 
                       to == ProcessState::WAITING || 
                       to == ProcessState::SUSPENDED;

            case ProcessState::WAITING:
                return to == ProcessState::READY || 
                       to == ProcessState::SUSPENDED;

            case ProcessState::SUSPENDED:
                return to == ProcessState::READY;

            case ProcessState::TERMINATED:
            default:
                return false;
        }
    }

    void record_transition(uint32_t pid, const std::string& name, ProcessState from, ProcessState to, const std::string& reason) {
        std::lock_guard<std::mutex> lock(mutex_);

        auto now = std::chrono::system_clock::now();
        auto in_time_t = std::chrono::system_clock::to_time_t(now);
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()) % 1000;
        
        std::stringstream ss;
        ss << std::put_time(std::localtime(&in_time_t), "%H:%M:%S")
           << '.' << std::setfill('0') << std::setw(3) << ms.count();

        StateTransition t{
            next_transition_id_++,
            pid,
            name,
            processStateToString(from),
            processStateToString(to),
            reason,
            ss.str()
        };

        transition_history_.push_front(t);
        if (transition_history_.size() > max_history_size_) {
            transition_history_.pop_back();
        }
    }

    std::vector<StateTransition> get_history(size_t limit = 100) {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<StateTransition> result;
        size_t count = std::min(limit, transition_history_.size());
        result.reserve(count);
        for (size_t i = 0; i < count; ++i) {
            result.push_back(transition_history_[i]);
        }
        return result;
    }

    std::vector<StateTransition> get_history_for_pid(uint32_t pid) {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<StateTransition> result;
        for (const auto& t : transition_history_) {
            if (t.pid == pid) {
                result.push_back(t);
            }
        }
        return result;
    }

    void clear_history() {
        std::lock_guard<std::mutex> lock(mutex_);
        transition_history_.clear();
    }
};
