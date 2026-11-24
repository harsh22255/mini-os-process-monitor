import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { FullStateSnapshot, Process, ResourceMetrics, Alert, StateTransition, SystemSettings } from '../types';
import { api, WebSocketManager } from '../services/api';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface OSContextType {
  snapshot: FullStateSnapshot | null;
  connected: boolean;
  selectedPid: number | null;
  setSelectedPid: (pid: number | null) => void;
  selectedProcess: Process | null;
  visualMode: 'CINEMATIC' | 'PERFORMANCE' | 'ACCESSIBILITY';
  setVisualMode: (mode: 'CINEMATIC' | 'PERFORMANCE' | 'ACCESSIBILITY') => void;
  operationalMode: 'REAL_HOST' | 'SIMULATION';
  setOperationalMode: (mode: 'REAL_HOST' | 'SIMULATION') => Promise<void>;
  toasts: Toast[];
  removeToast: (id: string) => void;
  showToast: (type: Toast['type'], title: string, message: string) => void;

  // Actions
  createProcess: (name: string, priority: number, burst: number, mem: number) => Promise<boolean>;
  terminateProcess: (pid: number) => Promise<boolean>;
  suspendProcess: (pid: number) => Promise<boolean>;
  resumeProcess: (pid: number) => Promise<boolean>;
  acknowledgeAlert: (id: number) => Promise<boolean>;
  toggleMonitoring: () => Promise<void>;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  refreshSnapshot: () => Promise<void>;
}

const createDefaultSnapshot = (): FullStateSnapshot => {
  const procs: Process[] = [
    { pid: 1001, name: 'KernelCore.sys', priority: 10, state: 'RUNNING', cpu_usage: 14.2, memory_usage: 512.0, memory_percentage: 3.1, creation_time: '2026-11-24 02:00:00', burst_time: 9999, remaining_burst: 9999, waiting_time: 0, execution_time: 120, thread_count: 16, has_alert: false, alert_msg: '' },
    { pid: 1002, name: 'HoloGraphicsEngine', priority: 9, state: 'RUNNING', cpu_usage: 22.5, memory_usage: 1450.0, memory_percentage: 8.8, creation_time: '2026-11-24 02:00:01', burst_time: 9999, remaining_burst: 9999, waiting_time: 0, execution_time: 119, thread_count: 24, has_alert: false, alert_msg: '' },
    { pid: 1003, name: 'WindowServer.ui', priority: 8, state: 'RUNNING', cpu_usage: 11.8, memory_usage: 720.0, memory_percentage: 4.3, creation_time: '2026-11-24 02:00:01', burst_time: 9999, remaining_burst: 9999, waiting_time: 0, execution_time: 119, thread_count: 12, has_alert: false, alert_msg: '' },
    { pid: 1004, name: 'SecurityMonitor', priority: 9, state: 'READY', cpu_usage: 5.2, memory_usage: 340.0, memory_percentage: 2.0, creation_time: '2026-11-24 02:00:02', burst_time: 800, remaining_burst: 750, waiting_time: 15, execution_time: 45, thread_count: 8, has_alert: false, alert_msg: '' },
    { pid: 1005, name: 'NetstackBridge.io', priority: 7, state: 'WAITING', cpu_usage: 2.1, memory_usage: 260.0, memory_percentage: 1.5, creation_time: '2026-11-24 02:00:02', burst_time: 600, remaining_burst: 580, waiting_time: 30, execution_time: 20, thread_count: 6, has_alert: false, alert_msg: '' },
    { pid: 1006, name: 'DiskJournalService', priority: 6, state: 'READY', cpu_usage: 1.8, memory_usage: 180.0, memory_percentage: 1.1, creation_time: '2026-11-24 02:00:03', burst_time: 450, remaining_burst: 410, waiting_time: 12, execution_time: 28, thread_count: 4, has_alert: false, alert_msg: '' },
    { pid: 1007, name: 'TelemetryDaemon', priority: 4, state: 'READY', cpu_usage: 3.4, memory_usage: 210.0, memory_percentage: 1.2, creation_time: '2026-11-24 02:00:03', burst_time: 500, remaining_burst: 470, waiting_time: 10, execution_time: 20, thread_count: 4, has_alert: false, alert_msg: '' },
    { pid: 1008, name: 'CryptoKeyManager', priority: 8, state: 'SUSPENDED', cpu_usage: 0.0, memory_usage: 150.0, memory_percentage: 0.9, creation_time: '2026-11-24 02:00:04', burst_time: 300, remaining_burst: 280, waiting_time: 0, execution_time: 20, thread_count: 2, has_alert: false, alert_msg: '' }
  ];

  return {
    timestamp: Math.floor(Date.now() / 1000),
    uptime_seconds: 360,
    monitoring_active: true,
    operational_mode: 'SIMULATION',
    resources: {
      cpu_usage: 42.6,
      memory_usage_mb: 6822.0,
      memory_total_mb: 16384.0,
      memory_available_mb: 9562.0,
      memory_percentage: 41.6,
      cpu_threshold: 80.0,
      memory_threshold: 70.0,
      core_utilization: [38.2, 45.1, 41.0, 52.3, 39.4, 46.8, 35.1, 43.5],
      top_cpu_processes: [procs[1], procs[0], procs[2], procs[3]],
      top_memory_processes: [procs[1], procs[2], procs[0], procs[3]],
      history: [
        { timestamp: '02:40:00', cpu_usage: 36.2, memory_usage_mb: 6400, memory_percentage: 39.0, active_processes: 8, running_processes: 3, total_threads: 96 },
        { timestamp: '02:40:15', cpu_usage: 40.1, memory_usage_mb: 6600, memory_percentage: 40.2, active_processes: 8, running_processes: 3, total_threads: 96 },
        { timestamp: '02:40:30', cpu_usage: 45.4, memory_usage_mb: 6750, memory_percentage: 41.2, active_processes: 8, running_processes: 3, total_threads: 96 },
        { timestamp: '02:40:45', cpu_usage: 42.6, memory_usage_mb: 6822, memory_percentage: 41.6, active_processes: 8, running_processes: 3, total_threads: 96 },
      ]
    },
    processes: procs,
    state_counts: { NEW: 0, READY: 3, RUNNING: 3, WAITING: 1, SUSPENDED: 1, TERMINATED: 0 },
    recent_transitions: [
      { id: 1, pid: 1001, process_name: 'KernelCore.sys', from_state: 'NEW', to_state: 'RUNNING', reason: 'System Boot', timestamp: '02:00:00' },
      { id: 2, pid: 1002, process_name: 'HoloGraphicsEngine', from_state: 'NEW', to_state: 'RUNNING', reason: 'Engine Init', timestamp: '02:00:01' },
      { id: 3, pid: 1008, process_name: 'CryptoKeyManager', from_state: 'RUNNING', to_state: 'SUSPENDED', reason: 'Idle Timeout', timestamp: '02:05:10' }
    ],
    active_alerts: [],
    active_alert_count: 0
  };
};

const OSContext = createContext<OSContextType | null>(null);

export const OSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState<FullStateSnapshot>(createDefaultSnapshot());
  const [connected, setConnected] = useState<boolean>(false);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [visualMode, setVisualMode] = useState<'CINEMATIC' | 'PERFORMANCE' | 'ACCESSIBILITY'>('CINEMATIC');
  const [preferredMode, setPreferredMode] = useState<'REAL_HOST' | 'SIMULATION'>('REAL_HOST');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const wsRef = useRef<WebSocketManager | null>(null);
  const pollingRef = useRef<any>(null);

  const showToast = useCallback((type: Toast['type'], title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshSnapshot = useCallback(async () => {
    try {
      const data = await api.getSnapshot();
      if (data && data.resources) {
        setSnapshot(prev => ({
          ...data,
          operational_mode: prev.operational_mode || data.operational_mode
        }));
        setConnected(true);
      }
    } catch (e) {
      setConnected(false);
    }
  }, []);

  // Connect WebSocket with polling fallback
  useEffect(() => {
    refreshSnapshot();

    wsRef.current = new WebSocketManager(
      (newSnapshot) => {
        setSnapshot(prev => ({
          ...newSnapshot,
          operational_mode: prev.operational_mode || newSnapshot.operational_mode
        }));
        setConnected(true);
      },
      (isConnected) => {
        setConnected(isConnected);
      }
    );

    // Backup polling every 2.5s if socket isn't connected
    pollingRef.current = setInterval(() => {
      refreshSnapshot();
    }, 2500);

    return () => {
      wsRef.current?.destroy();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [refreshSnapshot]);

  // Selected process derived
  const selectedProcess = snapshot?.processes.find((p) => p.pid === selectedPid) || null;

  // Actions
  const createProcess = async (name: string, priority: number, burst: number, mem: number): Promise<boolean> => {
    try {
      const proc = await api.createProcess({ name, priority, burst_time: burst, memory_usage: mem });
      if (proc && proc.pid) {
        setSelectedPid(proc.pid);
        showToast('success', 'Process Spawned', `[PID ${proc.pid}] ${proc.name} initialized in READY state.`);
        await refreshSnapshot();
        return true;
      }
    } catch (e: any) {
      console.warn('Backend unavailable, simulating process creation locally:', e);
    }
    // Simulation fallback:
    const newPid = Math.floor(2000 + Math.random() * 8000);
    const newProc: Process = {
      pid: newPid,
      name,
      priority,
      state: 'READY',
      cpu_usage: Number((Math.random() * 4 + 1).toFixed(1)),
      memory_usage: mem,
      memory_percentage: Number(((mem / 16384) * 100).toFixed(1)),
      creation_time: new Date().toLocaleTimeString(),
      burst_time: burst,
      remaining_burst: burst,
      waiting_time: 0,
      execution_time: 0,
      thread_count: 4,
      has_alert: false,
      alert_msg: ''
    };
    setSnapshot(prev => ({
      ...prev,
      processes: [newProc, ...prev.processes],
      state_counts: {
        ...prev.state_counts,
        READY: prev.state_counts.READY + 1
      },
      recent_transitions: [
        {
          id: Date.now(),
          pid: newPid,
          process_name: name,
          from_state: 'NEW',
          to_state: 'READY',
          reason: 'Spawned in Simulator',
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.recent_transitions.slice(0, 9)
      ]
    }));
    setSelectedPid(newPid);
    showToast('success', 'Process Spawned', `[PID ${newPid}] ${name} initialized in READY state.`);
    return true;
  };

  const terminateProcess = async (pid: number): Promise<boolean> => {
    try {
      const res = await api.terminateProcess(pid);
      if (res && res.success) {
        showToast('warning', 'Process Terminated', `Process ${pid} has been moved to TERMINATED state.`);
        await refreshSnapshot();
        return true;
      }
    } catch (e: any) {
      console.warn('Backend unavailable, simulating termination locally:', e);
    }
    setSnapshot(prev => ({
      ...prev,
      processes: prev.processes.map(p => p.pid === pid ? { ...p, state: 'TERMINATED' as const, cpu_usage: 0 } : p),
      state_counts: {
        ...prev.state_counts,
        TERMINATED: prev.state_counts.TERMINATED + 1
      },
      recent_transitions: [
        {
          id: Date.now(),
          pid,
          process_name: prev.processes.find(p => p.pid === pid)?.name || `PID-${pid}`,
          from_state: prev.processes.find(p => p.pid === pid)?.state || 'READY',
          to_state: 'TERMINATED',
          reason: 'SIGKILL / Termination',
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.recent_transitions.slice(0, 9)
      ]
    }));
    showToast('warning', 'Process Terminated', `Process ${pid} moved to TERMINATED state.`);
    return true;
  };

  const suspendProcess = async (pid: number): Promise<boolean> => {
    try {
      const res = await api.suspendProcess(pid);
      if (res && res.success) {
        showToast('info', 'Process Suspended', `PID ${pid} transitioned to SUSPENDED.`);
        await refreshSnapshot();
        return true;
      }
    } catch (e: any) {
      console.warn('Backend unavailable, simulating suspension locally:', e);
    }
    setSnapshot(prev => ({
      ...prev,
      processes: prev.processes.map(p => p.pid === pid ? { ...p, state: 'SUSPENDED' as const, cpu_usage: 0 } : p),
      recent_transitions: [
        {
          id: Date.now(),
          pid,
          process_name: prev.processes.find(p => p.pid === pid)?.name || `PID-${pid}`,
          from_state: prev.processes.find(p => p.pid === pid)?.state || 'READY',
          to_state: 'SUSPENDED',
          reason: 'SIGSTOP / Suspended',
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.recent_transitions.slice(0, 9)
      ]
    }));
    showToast('info', 'Process Suspended', `PID ${pid} transitioned to SUSPENDED.`);
    return true;
  };

  const resumeProcess = async (pid: number): Promise<boolean> => {
    try {
      const res = await api.resumeProcess(pid);
      if (res && res.success) {
        showToast('success', 'Process Resumed', `PID ${pid} returned to READY queue.`);
        await refreshSnapshot();
        return true;
      }
    } catch (e: any) {
      console.warn('Backend unavailable, simulating resume locally:', e);
    }
    setSnapshot(prev => ({
      ...prev,
      processes: prev.processes.map(p => p.pid === pid ? { ...p, state: 'READY' as const, cpu_usage: 2.1 } : p),
      recent_transitions: [
        {
          id: Date.now(),
          pid,
          process_name: prev.processes.find(p => p.pid === pid)?.name || `PID-${pid}`,
          from_state: 'SUSPENDED',
          to_state: 'READY',
          reason: 'SIGCONT / Resumed',
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.recent_transitions.slice(0, 9)
      ]
    }));
    showToast('success', 'Process Resumed', `PID ${pid} returned to READY queue.`);
    return true;
  };

  const acknowledgeAlert = async (id: number): Promise<boolean> => {
    try {
      const res = await api.acknowledgeAlert(id);
      if (res && res.success) {
        showToast('info', 'Alert Acknowledged', `Alert #${id} marked as acknowledged.`);
        await refreshSnapshot();
        return true;
      }
    } catch (e: any) {
      // Ignore
    }
    setSnapshot(prev => ({
      ...prev,
      active_alerts: prev.active_alerts.filter(a => a.id !== id),
      active_alert_count: Math.max(0, prev.active_alert_count - 1)
    }));
    showToast('info', 'Alert Acknowledged', `Alert #${id} marked as acknowledged.`);
    return true;
  };

  const toggleMonitoring = async () => {
    try {
      if (snapshot?.monitoring_active) {
        await api.stopMonitoring();
        showToast('warning', 'Simulation Paused', 'Core simulation tick paused.');
      } else {
        await api.startMonitoring();
        showToast('success', 'Simulation Active', 'Core simulation engine resumed.');
      }
      await refreshSnapshot();
      return;
    } catch (e: any) {
      console.warn('Backend unavailable, toggling locally:', e);
    }
    setSnapshot(prev => {
      const nextActive = !prev.monitoring_active;
      showToast(nextActive ? 'success' : 'warning', nextActive ? 'Simulation Active' : 'Simulation Paused', nextActive ? 'Engine resumed.' : 'Engine paused.');
      return { ...prev, monitoring_active: nextActive };
    });
  };

  const operationalMode = preferredMode;

  const setOperationalMode = async (mode: 'REAL_HOST' | 'SIMULATION') => {
    setPreferredMode(mode);
    setSnapshot(prev => ({ ...prev, operational_mode: mode }));
    try {
      const res = await api.setMode(mode);
      if (res && res.success) {
        showToast(
          'info',
          'Operational Engine Switched',
          mode === 'REAL_HOST'
            ? 'Switched to LIVE HOST OS: Monitoring real host processes, CPU & RAM'
            : 'Switched to KERNEL SIMULATOR: Multi-state algorithmic OS process simulator'
        );
        await refreshSnapshot();
        return;
      }
    } catch (e: any) {
      console.warn('Backend mode switch request failed, applying mode locally:', e);
    }
    showToast(
      'info',
      'Operational Engine Switched',
      mode === 'REAL_HOST'
        ? 'Switched to LIVE HOST OS: Monitoring host processes, CPU & RAM'
        : 'Switched to KERNEL SIMULATOR: Multi-state algorithmic OS process simulator'
    );
  };

  const updateSettings = async (settings: Partial<SystemSettings>) => {
    try {
      await api.updateSettings(settings);
      showToast('success', 'Settings Saved', 'Backend thresholds and configurations updated.');
      await refreshSnapshot();
      return;
    } catch (e: any) {
      console.warn('Backend unavailable, applying settings locally:', e);
    }
    showToast('success', 'Settings Saved', 'Local simulation thresholds and configurations updated.');
  };

  return (
    <OSContext.Provider
      value={{
        snapshot,
        connected,
        selectedPid,
        setSelectedPid,
        selectedProcess,
        visualMode,
        setVisualMode,
        operationalMode,
        setOperationalMode,
        toasts,
        removeToast,
        showToast,
        createProcess,
        terminateProcess,
        suspendProcess,
        resumeProcess,
        acknowledgeAlert,
        toggleMonitoring,
        updateSettings,
        refreshSnapshot,
      }}
    >
      {children}
    </OSContext.Provider>
  );
};

export const useOS = () => {
  const ctx = useContext(OSContext);
  if (!ctx) throw new Error('useOS must be used within an OSProvider');
  return ctx;
};
