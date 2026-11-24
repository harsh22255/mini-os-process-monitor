#pragma once

#include "ProcessManager.h"
#include "ResourceMonitor.h"
#include "AlertManager.h"
#include <string>
#include <sstream>
#include <iomanip>
#include <chrono>
#include <nlohmann/json.hpp>

class ReportManager {
public:
    ReportManager() = default;

    nlohmann::json generate_summary_report(ProcessManager& pm, ResourceMonitor& rm, AlertManager& am, uint64_t uptime_sec) {
        auto processes = pm.get_all_processes();
        auto state_counts = pm.get_state_counts();
        auto active_alerts = am.get_alerts("", 0, true);
        auto all_alerts = am.get_alerts("", 0, false);
        auto res_json = rm.get_resources_json(processes);

        int total_created = 0;
        int active_count = 0;
        int terminated_count = 0;
        double total_cpu = 0.0;
        double total_mem = 0.0;

        for (const auto& p : processes) {
            total_created++;
            if (p->state == ProcessState::TERMINATED) {
                terminated_count++;
            } else {
                active_count++;
                total_cpu += p->cpu_usage;
                total_mem += p->memory_usage;
            }
        }

        uint64_t hours = uptime_sec / 3600;
        uint64_t minutes = (uptime_sec % 3600) / 60;
        uint64_t seconds = uptime_sec % 60;
        std::stringstream uptime_ss;
        uptime_ss << std::setfill('0') << std::setw(2) << hours << ":"
                  << std::setfill('0') << std::setw(2) << minutes << ":"
                  << std::setfill('0') << std::setw(2) << seconds;

        return nlohmann::json{
            {"report_id", "REP-" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count())},
            {"generated_at", std::chrono::system_clock::to_time_t(std::chrono::system_clock::now())},
            {"uptime_seconds", uptime_sec},
            {"uptime_formatted", uptime_ss.str()},
            {"system_status", active_alerts.empty() ? "OPTIMAL" : "ATTENTION_REQUIRED"},
            {"process_metrics", {
                {"total_processes_tracked", total_created},
                {"active_processes", active_count},
                {"terminated_processes", terminated_count},
                {"state_distribution", state_counts}
            }},
            {"resource_metrics", {
                {"current_cpu_usage", res_json["cpu_usage"]},
                {"current_memory_usage_mb", res_json["memory_usage_mb"]},
                {"memory_total_mb", res_json["memory_total_mb"]},
                {"memory_percentage", res_json["memory_percentage"]},
                {"cpu_threshold", res_json["cpu_threshold"]},
                {"memory_threshold", res_json["memory_threshold"]}
            }},
            {"alert_metrics", {
                {"total_alerts_generated", all_alerts.size()},
                {"active_unacknowledged_alerts", am.get_active_count()},
                {"critical_alerts_count", am.get_alerts("CRITICAL", 0, false).size()},
                {"warning_alerts_count", am.get_alerts("WARNING", 0, false).size()}
            }}
        };
    }

    std::string export_csv(ProcessManager& pm, ResourceMonitor& rm, AlertManager& am, uint64_t uptime_sec) {
        auto summary = generate_summary_report(pm, rm, am, uptime_sec);
        auto processes = pm.get_all_processes();

        std::stringstream ss;
        ss << "MINI OS PROCESS MONITOR - SYSTEM REPORT\n";
        ss << "Generated At," << summary["generated_at"] << "\n";
        ss << "Uptime," << summary["uptime_formatted"] << "\n";
        ss << "Status," << summary["system_status"] << "\n\n";

        ss << "PROCESS INVENTORY\n";
        ss << "PID,Name,Priority,State,CPU(%),Memory(MB),Memory(%),Burst,ExecutionTime,Waiting\n";
        for (const auto& p : processes) {
            ss << p->pid << ","
               << "\"" << p->name << "\","
               << p->priority << ","
               << processStateToString(p->state) << ","
               << p->cpu_usage << ","
               << p->memory_usage << ","
               << p->memory_percentage << ","
               << p->burst_time << ","
               << p->execution_time << ","
               << p->waiting_time << "\n";
        }

        return ss.str();
    }
};
