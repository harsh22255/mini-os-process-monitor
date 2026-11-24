export type ProcessState = 'NEW' | 'READY' | 'RUNNING' | 'WAITING' | 'SUSPENDED' | 'TERMINATED';

export interface Process {
  pid: number;
  name: string;
  priority: number;
  state: ProcessState;
  cpu_usage: number;
  memory_usage: number;
  memory_percentage: number;
  creation_time: string;
  burst_time: number;
  remaining_burst: number;
  waiting_time: number;
  execution_time: number;
  thread_count: number;
  has_alert: boolean;
  alert_msg: string;
}

export interface StateTransition {
  id: number;
  pid: number;
  process_name: string;
  from_state: string;
  to_state: string;
  reason: string;
  timestamp: string;
}

export interface ResourceDataPoint {
  timestamp: string;
  cpu_usage: number;
  memory_usage_mb: number;
  memory_percentage: number;
  active_processes: number;
  running_processes: number;
  total_threads: number;
}

export interface ResourceMetrics {
  cpu_usage: number;
  memory_usage_mb: number;
  memory_total_mb: number;
  memory_available_mb: number;
  memory_percentage: number;
  cpu_threshold: number;
  memory_threshold: number;
  core_utilization: number[];
  top_cpu_processes: Process[];
  top_memory_processes: Process[];
  history: ResourceDataPoint[];
}

export interface Alert {
  id: number;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  source: string;
  message: string;
  acknowledged: boolean;
  resolved: boolean;
  pid: number;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  category: string;
  severity: string;
  message: string;
}

export interface SystemSettings {
  cpu_threshold: number;
  memory_threshold: number;
  refresh_interval_ms: number;
  auto_spawn_enabled: boolean;
  visual_mode: 'CINEMATIC' | 'PERFORMANCE' | 'ACCESSIBILITY';
  operational_mode: 'REAL_HOST' | 'SIMULATION';
  monitoring_active: boolean;
}

export interface TopologyNode {
  id: string;
  label: string;
  type: string;
  status: string;
  utilization: number;
  details: string;
  pid?: number;
  state?: string;
  cpu?: number;
  mem?: number;
}

export interface TopologyLink {
  source: string;
  target: string;
  type: string;
}

export interface SystemTopology {
  nodes: TopologyNode[];
  links: TopologyLink[];
}

export interface FullStateSnapshot {
  timestamp: number;
  uptime_seconds: number;
  monitoring_active: boolean;
  operational_mode: 'REAL_HOST' | 'SIMULATION';
  resources: ResourceMetrics;
  processes: Process[];
  state_counts: Record<ProcessState, number>;
  recent_transitions: StateTransition[];
  active_alerts: Alert[];
  active_alert_count: number;
}
