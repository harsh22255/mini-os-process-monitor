#pragma once

#include <string>
#include <vector>
#include <deque>
#include <mutex>
#include <atomic>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <nlohmann/json.hpp>

struct LogEntry {
    uint64_t id;
    std::string timestamp;
    std::string category; // PROCESS, LIFECYCLE, RESOURCE, ALERT, SYSTEM
    std::string severity; // INFO, WARNING, ERROR, CRITICAL
    std::string message;

    nlohmann::json to_json() const {
        return nlohmann::json{
            {"id", id},
            {"timestamp", timestamp},
            {"category", category},
            {"severity", severity},
            {"message", message}
        };
    }
};

class ActivityLogger {
private:
    std::mutex mutex_;
    std::atomic<uint64_t> next_log_id_{1};
    std::deque<LogEntry> logs_;
    const size_t max_logs_{1000};

public:
    ActivityLogger() = default;

    void log(const std::string& category, const std::string& severity, const std::string& message) {
        std::lock_guard<std::mutex> lock(mutex_);

        auto now = std::chrono::system_clock::now();
        auto in_time_t = std::chrono::system_clock::to_time_t(now);
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()) % 1000;

        std::stringstream ss;
        ss << std::put_time(std::localtime(&in_time_t), "%Y-%m-%d %H:%M:%S")
           << '.' << std::setfill('0') << std::setw(3) << ms.count();

        LogEntry entry{
            next_log_id_++,
            ss.str(),
            category,
            severity,
            message
        };

        logs_.push_front(entry);
        if (logs_.size() > max_logs_) {
            logs_.pop_back();
        }
    }

    std::vector<LogEntry> get_logs(const std::string& category_filter = "", 
                                  const std::string& search = "", 
                                  size_t limit = 150) {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<LogEntry> result;

        for (const auto& entry : logs_) {
            if (!category_filter.empty() && category_filter != "ALL" && entry.category != category_filter) {
                continue;
            }
            if (!search.empty()) {
                if (entry.message.find(search) == std::string::npos && 
                    entry.category.find(search) == std::string::npos &&
                    entry.severity.find(search) == std::string::npos) {
                    continue;
                }
            }
            result.push_back(entry);
            if (result.size() >= limit) break;
        }

        return result;
    }

    std::string export_csv() {
        std::lock_guard<std::mutex> lock(mutex_);
        std::stringstream ss;
        ss << "ID,Timestamp,Category,Severity,Message\n";
        for (auto it = logs_.rbegin(); it != logs_.rend(); ++it) {
            ss << it->id << ","
               << "\"" << it->timestamp << "\","
               << "\"" << it->category << "\","
               << "\"" << it->severity << "\","
               << "\"" << it->message << "\"\n";
        }
        return ss.str();
    }

    void clear() {
        std::lock_guard<std::mutex> lock(mutex_);
        logs_.clear();
    }
};
