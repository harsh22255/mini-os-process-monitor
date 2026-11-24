#pragma once

#include "OSProcess.h"
#include "StateManager.h"
#include "ResourceMonitor.h"
#include "AlertManager.h"
#include "ActivityLogger.h"
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <winsock2.h>
#include <windows.h>
#include <tlhelp32.h>
#include <psapi.h>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <memory>
#include <mutex>
#include <atomic>
#include <random>
#include <algorithm>
#include <nlohmann/json.hpp>

class ProcessManager {
private:
    std::mutex mutex_;
    std::atomic<uint32_t> next_pid_{1001};
    std::unordered_map<uint32_t, std::shared_ptr<Process>> processes_;
    std::mt19937 rng_{std::random_device{}()};

    // Predefined process names for dynamic spawning in simulation mode
    const std::vector<std::string> system_task_names_{
        "AI_NeuralInference", "ShaderCompiler", "PacketFilter", "AudioDspMatrix", 
        "MemoryCompressor", "CacheInvalidator", "VfsSynchronizer", "QuantumEntropyGen",
        "ThermalRegulator", "PowerGridSync", "SensorTelemetry", "DatabaseIndexer"
    };

    // Critical Windows system processes protected from termination
    const std::unordered_set<std::string> protected_system_processes_{
        "System", "Secure System", "Registry", "smss.exe", "csrss.exe", 
        "wininit.exe", "services.exe", "lsass.exe", "svchost.exe", "dwm.exe"
    };

public:
    ProcessManager() {
        seed_initial_processes();
    }

    void seed_initial_processes() {
        std::lock_guard<std::mutex> lock(mutex_);
        
        struct InitSeed {
            std::string name;
            int priority;
            ProcessState state;
            double cpu;
            double mem;
            int burst;
        };

        std::vector<InitSeed> initial_seeds = {
            {"KernelCore.sys", 10, ProcessState::RUNNING, 14.5, 512.0, 9999},
            {"HoloGraphicsEngine", 9, ProcessState::RUNNING, 24.2, 1450.0, 9999},
            {"WindowServer.ui", 8, ProcessState::RUNNING, 12.0, 720.0, 9999},
            {"SecurityMonitor", 9, ProcessState::READY, 5.5, 340.0, 800},
            {"NetstackBridge.io", 7, ProcessState::WAITING, 2.1, 260.0, 600},
            {"DiskJournalService", 6, ProcessState::READY, 1.8, 180.0, 450},
            {"TelemetryDaemon", 4, ProcessState::READY, 3.4, 210.0, 500},
            {"CryptoKeyManager", 8, ProcessState::SUSPENDED, 0.0, 150.0, 300}
        };

        for (const auto& seed : initial_seeds) {
            uint32_t pid = next_pid_++;
            auto p = std::make_shared<Process>(pid, seed.name, seed.priority, seed.burst, seed.mem);
            p->state = seed.state;
            p->cpu_usage = seed.cpu;
            p->memory_usage = seed.mem;
            p->memory_percentage = (seed.mem / 16384.0) * 100.0;
            processes_[pid] = p;
        }
    }

    void switch_mode(const std::string& new_mode) {
        std::lock_guard<std::mutex> lock(mutex_);
        processes_.clear();
        if (new_mode == "SIMULATION") {
            struct InitSeed {
                std::string name;
                int priority;
                ProcessState state;
                double cpu;
                double mem;
                int burst;
            };

            std::vector<InitSeed> initial_seeds = {
                {"KernelCore.sys", 10, ProcessState::RUNNING, 14.5, 512.0, 9999},
                {"HoloGraphicsEngine", 9, ProcessState::RUNNING, 24.2, 1450.0, 9999},
                {"WindowServer.ui", 8, ProcessState::RUNNING, 12.0, 720.0, 9999},
                {"SecurityMonitor", 9, ProcessState::READY, 5.5, 340.0, 800},
                {"NetstackBridge.io", 7, ProcessState::WAITING, 2.1, 260.0, 600},
                {"DiskJournalService", 6, ProcessState::READY, 1.8, 180.0, 450},
                {"TelemetryDaemon", 4, ProcessState::READY, 3.4, 210.0, 500},
                {"CryptoKeyManager", 8, ProcessState::SUSPENDED, 0.0, 150.0, 300}
            };

            for (const auto& seed : initial_seeds) {
                uint32_t pid = next_pid_++;
                auto p = std::make_shared<Process>(pid, seed.name, seed.priority, seed.burst, seed.mem);
                p->state = seed.state;
                p->cpu_usage = seed.cpu;
                p->memory_usage = seed.mem;
                p->memory_percentage = (seed.mem / 16384.0) * 100.0;
                processes_[pid] = p;
            }
        }
    }

    std::shared_ptr<Process> create_process(const std::string& name, int priority, 
                                           int burst_time = 45, double base_memory = 256.0,
                                           StateManager* state_mgr = nullptr,
                                           ActivityLogger* logger = nullptr) {
        std::lock_guard<std::mutex> lock(mutex_);

        std::string valid_name = name.empty() ? "Task_" + std::to_string(next_pid_.load()) : name;
        int valid_prio = std::max(1, std::min(10, priority));
        int valid_burst = std::max(5, std::min(1000, burst_time));
        double valid_mem = std::max(32.0, std::min(4096.0, base_memory));

        uint32_t pid = next_pid_++;
        auto proc = std::make_shared<Process>(pid, valid_name, valid_prio, valid_burst, valid_mem);

        // Transition from NEW to READY
        if (state_mgr) {
            state_mgr->record_transition(pid, valid_name, ProcessState::NEW, ProcessState::READY, "Process Initialized");
        }
        proc->state = ProcessState::READY;
        proc->cpu_usage = 0.5;

        processes_[pid] = proc;

        if (logger) {
            logger->log("PROCESS", "INFO", "Process spawned: [" + std::to_string(pid) + "] " + valid_name + " (Priority " + std::to_string(valid_prio) + ")");
        }

        return proc;
    }

    bool terminate_process(uint32_t pid, const std::string& reason, 
                          StateManager* state_mgr = nullptr, 
                          ActivityLogger* logger = nullptr,
                          bool is_real_host_mode = false) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = processes_.find(pid);
        if (it == processes_.end()) return false;

        auto proc = it->second;
        if (proc->state == ProcessState::TERMINATED) return false;

        // Security check for real Windows host mode
        if (is_real_host_mode) {
            if (pid <= 4 || protected_system_processes_.count(proc->name)) {
                if (logger) {
                    logger->log("SECURITY", "ERROR", "Denied termination of critical system process: " + proc->name);
                }
                return false;
            }

            // Real Windows Process Termination via Win32 API
            HANDLE hProc = OpenProcess(PROCESS_TERMINATE, FALSE, pid);
            if (hProc) {
                TerminateProcess(hProc, 1);
                CloseHandle(hProc);
            }
        }

        ProcessState old_state = proc->state;
        proc->state = ProcessState::TERMINATED;
        proc->cpu_usage = 0.0;
        proc->memory_usage = 0.0;
        proc->memory_percentage = 0.0;

        if (state_mgr) {
            state_mgr->record_transition(pid, proc->name, old_state, ProcessState::TERMINATED, reason);
        }

        if (logger) {
            logger->log("PROCESS", "WARNING", "Process terminated: [" + std::to_string(pid) + "] " + proc->name + " (" + reason + ")");
        }

        return true;
    }

    bool suspend_process(uint32_t pid, StateManager* state_mgr = nullptr, ActivityLogger* logger = nullptr) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = processes_.find(pid);
        if (it == processes_.end()) return false;

        auto proc = it->second;
        if (proc->state == ProcessState::TERMINATED || proc->state == ProcessState::SUSPENDED) return false;

        ProcessState old_state = proc->state;
        proc->state = ProcessState::SUSPENDED;
        proc->cpu_usage = 0.0;

        if (state_mgr) {
            state_mgr->record_transition(pid, proc->name, old_state, ProcessState::SUSPENDED, "User request suspend");
        }

        if (logger) {
            logger->log("LIFECYCLE", "INFO", "Process suspended: [" + std::to_string(pid) + "] " + proc->name);
        }

        return true;
    }

    bool resume_process(uint32_t pid, StateManager* state_mgr = nullptr, ActivityLogger* logger = nullptr) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = processes_.find(pid);
        if (it == processes_.end()) return false;

        auto proc = it->second;
        if (proc->state != ProcessState::SUSPENDED) return false;

        proc->state = ProcessState::READY;
        proc->cpu_usage = 1.0;

        if (state_mgr) {
            state_mgr->record_transition(pid, proc->name, ProcessState::SUSPENDED, ProcessState::READY, "User request resume");
        }

        if (logger) {
            logger->log("LIFECYCLE", "INFO", "Process resumed: [" + std::to_string(pid) + "] " + proc->name + " -> READY");
        }

        return true;
    }

    std::shared_ptr<Process> get_process(uint32_t pid) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = processes_.find(pid);
        if (it != processes_.end()) return it->second;
        return nullptr;
    }

    std::vector<std::shared_ptr<Process>> get_all_processes() {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<std::shared_ptr<Process>> result;
        result.reserve(processes_.size());
        for (const auto& pair : processes_) {
            result.push_back(pair.second);
        }
        return result;
    }

    std::vector<std::shared_ptr<Process>> get_active_processes() {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<std::shared_ptr<Process>> result;
        for (const auto& pair : processes_) {
            if (pair.second->state != ProcessState::TERMINATED) {
                result.push_back(pair.second);
            }
        }
        return result;
    }

    std::map<std::string, int> get_state_counts() {
        std::lock_guard<std::mutex> lock(mutex_);
        std::map<std::string, int> counts = {
            {"NEW", 0}, {"READY", 0}, {"RUNNING", 0}, 
            {"WAITING", 0}, {"SUSPENDED", 0}, {"TERMINATED", 0}
        };

        for (const auto& pair : processes_) {
            counts[processStateToString(pair.second->state)]++;
        }
        return counts;
    }

    // REAL WINDOWS HOST PROCESS SAMPLER
    void sample_real_host_processes(StateManager& state_mgr, ResourceMonitor& res_mon, 
                                   AlertManager& alert_mgr, ActivityLogger& logger) {
        std::lock_guard<std::mutex> lock(mutex_);

        HANDLE hSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (hSnap == INVALID_HANDLE_VALUE) return;

        PROCESSENTRY32 pe;
        pe.dwSize = sizeof(PROCESSENTRY32);

        std::unordered_set<uint32_t> current_live_pids;
        double total_mem_mb = res_mon.get_total_memory();

        std::uniform_real_distribution<double> cpu_dist(0.1, 4.5);

        if (Process32First(hSnap, &pe)) {
            do {
                uint32_t pid = pe.th32ProcessID;
                current_live_pids.insert(pid);
                std::string exeName = pe.szExeFile;

                // Priority estimation from Windows base priority
                int priority = std::max(1, std::min(10, (int)(pe.pcPriClassBase / 3)));
                if (exeName == "csrss.exe" || exeName == "System") priority = 10;

                // Query Real Memory (Working Set Size)
                double mem_mb = 32.0;
                HANDLE hProc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid);
                if (hProc) {
                    PROCESS_MEMORY_COUNTERS pmc;
                    if (GetProcessMemoryInfo(hProc, &pmc, sizeof(pmc))) {
                        mem_mb = pmc.WorkingSetSize / (1024.0 * 1024.0);
                    }
                    CloseHandle(hProc);
                } else {
                    // Protected system process estimate
                    mem_mb = std::max(48.0, (double)(pe.cntThreads * 8.0));
                }

                auto it = processes_.find(pid);
                if (it == processes_.end()) {
                    // New process discovered on host
                    auto np = std::make_shared<Process>(pid, exeName, priority, 9999, mem_mb);
                    np->state = ProcessState::RUNNING;
                    np->thread_count = pe.cntThreads;
                    np->update_resources(cpu_dist(rng_), mem_mb, total_mem_mb);

                    state_mgr.record_transition(pid, exeName, ProcessState::NEW, ProcessState::RUNNING, "Host Process Discovered");
                    processes_[pid] = np;
                } else {
                    // Update existing real process metrics
                    auto proc = it->second;
                    proc->thread_count = pe.cntThreads;
                    proc->tick_execution();
                    if (proc->state != ProcessState::TERMINATED && proc->state != ProcessState::SUSPENDED) {
                        proc->state = (pe.cntThreads > 4) ? ProcessState::RUNNING : ProcessState::READY;
                        double simulated_cpu = (proc->state == ProcessState::RUNNING) ? cpu_dist(rng_) : 0.1;
                        proc->update_resources(simulated_cpu, mem_mb, total_mem_mb);
                    }
                }
            } while (Process32Next(hSnap, &pe));
        }

        CloseHandle(hSnap);

        // Detect terminated real processes
        for (auto& pair : processes_) {
            if (current_live_pids.find(pair.first) == current_live_pids.end()) {
                if (pair.second->state != ProcessState::TERMINATED) {
                    pair.second->state = ProcessState::TERMINATED;
                    pair.second->cpu_usage = 0.0;
                    state_mgr.record_transition(pair.first, pair.second->name, ProcessState::RUNNING, ProcessState::TERMINATED, "Host Process Exited");
                }
            }
        }
    }

    // Dynamic simulation tick for scheduling and realistic OS activity
    void tick_simulation(StateManager& state_mgr, ResourceMonitor& res_mon, 
                         AlertManager& alert_mgr, ActivityLogger& logger, 
                         bool auto_spawn = true, const std::string& operational_mode = "REAL_HOST") {
        if (operational_mode == "REAL_HOST") {
            sample_real_host_processes(state_mgr, res_mon, alert_mgr, logger);
            return;
        }

        // SIMULATION MODE
        std::lock_guard<std::mutex> lock(mutex_);

        std::uniform_real_distribution<double> cpu_dist(2.0, 18.0);
        std::uniform_real_distribution<double> mem_fluct(-15.0, 20.0);
        std::uniform_int_distribution<int> event_roll(1, 100);

        std::vector<std::shared_ptr<Process>> running_procs;
        std::vector<std::shared_ptr<Process>> ready_procs;
        std::vector<std::shared_ptr<Process>> waiting_procs;

        // Clean up ancient terminated processes if too many accumulate (> 40)
        size_t term_count = 0;
        for (auto it = processes_.begin(); it != processes_.end();) {
            if (it->second->state == ProcessState::TERMINATED) {
                term_count++;
                if (term_count > 30) {
                    it = processes_.erase(it);
                    continue;
                }
            }
            ++it;
        }

        for (auto& pair : processes_) {
            auto proc = pair.second;
            proc->tick_execution();

            if (proc->state == ProcessState::RUNNING) {
                running_procs.push_back(proc);
                double cpu_target = 8.0 + (proc->priority * 2.5) + cpu_dist(rng_);
                proc->update_resources(cpu_target, std::max(64.0, proc->memory_usage + mem_fluct(rng_)), res_mon.get_total_memory());

                if (proc->remaining_burst <= 0 && proc->priority < 9) {
                    proc->state = ProcessState::TERMINATED;
                    proc->cpu_usage = 0.0;
                    state_mgr.record_transition(proc->pid, proc->name, ProcessState::RUNNING, ProcessState::TERMINATED, "Completed execution burst");
                    logger.log("PROCESS", "INFO", "Process completed: [" + std::to_string(proc->pid) + "] " + proc->name);
                }
            } else if (proc->state == ProcessState::READY) {
                ready_procs.push_back(proc);
                proc->cpu_usage = 0.2;
            } else if (proc->state == ProcessState::WAITING) {
                waiting_procs.push_back(proc);
                proc->cpu_usage = 0.1;
            }
        }

        // Context Switching / Preemption
        if (!running_procs.empty() && running_procs.size() > 2 && event_roll(rng_) < 35) {
            for (auto& p : running_procs) {
                if (p->priority < 9) {
                    if (event_roll(rng_) < 40) {
                        p->state = ProcessState::WAITING;
                        p->cpu_usage = 0.1;
                        state_mgr.record_transition(p->pid, p->name, ProcessState::RUNNING, ProcessState::WAITING, "Waiting for I/O operation");
                    } else {
                        p->state = ProcessState::READY;
                        p->cpu_usage = 0.2;
                        state_mgr.record_transition(p->pid, p->name, ProcessState::RUNNING, ProcessState::READY, "Time quantum expired");
                    }
                    break;
                }
            }
        }

        // I/O Completion (WAITING -> READY)
        for (auto& p : waiting_procs) {
            if (event_roll(rng_) < 45) {
                p->state = ProcessState::READY;
                p->cpu_usage = 0.5;
                state_mgr.record_transition(p->pid, p->name, ProcessState::WAITING, ProcessState::READY, "I/O operation completed");
                break;
            }
        }

        // Schedule READY -> RUNNING
        if (running_procs.size() < 4 && !ready_procs.empty()) {
            std::sort(ready_procs.begin(), ready_procs.end(), [](const auto& a, const auto& b) {
                return a->priority > b->priority;
            });
            auto candidate = ready_procs.front();
            candidate->state = ProcessState::RUNNING;
            candidate->cpu_usage = 12.0;
            state_mgr.record_transition(candidate->pid, candidate->name, ProcessState::READY, ProcessState::RUNNING, "Scheduled on CPU core");
        }

        // Auto spawn dynamic worker tasks in simulation mode
        if (auto_spawn && processes_.size() < 16 && event_roll(rng_) < 20) {
            std::uniform_int_distribution<size_t> name_idx(0, system_task_names_.size() - 1);
            std::uniform_int_distribution<int> prio_dist(2, 7);
            std::uniform_int_distribution<int> burst_dist(20, 60);
            std::uniform_real_distribution<double> mem_dist(128.0, 512.0);

            std::string tname = system_task_names_[name_idx(rng_)];
            uint32_t new_pid = next_pid_++;
            auto np = std::make_shared<Process>(new_pid, tname, prio_dist(rng_), burst_dist(rng_), mem_dist(rng_));
            state_mgr.record_transition(new_pid, tname, ProcessState::NEW, ProcessState::READY, "Background batch task queued");
            np->state = ProcessState::READY;
            processes_[new_pid] = np;
            logger.log("SYSTEM", "INFO", "Scheduled background task: [" + std::to_string(new_pid) + "] " + tname);
        }
    }
};
