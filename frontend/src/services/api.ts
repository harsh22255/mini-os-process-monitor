import { FullStateSnapshot, Process, ResourceMetrics, Alert, LogEntry, SystemSettings, SystemTopology, StateTransition } from '../types';

const RAW_BACKEND = (import.meta.env.VITE_BACKEND_URL || '').trim();
const API_BASE = RAW_BACKEND ? `${RAW_BACKEND.replace(/\/$/, '')}/api` : '/api';

export const api = {
  async getHealth(): Promise<{ status: string; uptime_seconds: number; monitoring_active: boolean }> {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async getSnapshot(): Promise<FullStateSnapshot> {
    const res = await fetch(`${API_BASE}/snapshot`);
    return res.json();
  },

  async getProcesses(): Promise<Process[]> {
    const res = await fetch(`${API_BASE}/processes`);
    return res.json();
  },

  async getProcess(pid: number): Promise<Process & { lifecycle_history: StateTransition[] }> {
    const res = await fetch(`${API_BASE}/processes/${pid}`);
    return res.json();
  },

  async createProcess(data: { name: string; priority: number; burst_time: number; memory_usage: number }): Promise<Process> {
    const res = await fetch(`${API_BASE}/processes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async terminateProcess(pid: number): Promise<{ success: boolean; pid: number }> {
    const res = await fetch(`${API_BASE}/processes/${pid}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async suspendProcess(pid: number): Promise<{ success: boolean; pid: number; state: string }> {
    const res = await fetch(`${API_BASE}/processes/${pid}/suspend`, {
      method: 'POST',
    });
    return res.json();
  },

  async resumeProcess(pid: number): Promise<{ success: boolean; pid: number; state: string }> {
    const res = await fetch(`${API_BASE}/processes/${pid}/resume`, {
      method: 'POST',
    });
    return res.json();
  },

  async getResources(): Promise<ResourceMetrics> {
    const res = await fetch(`${API_BASE}/resources`);
    return res.json();
  },

  async getAlerts(severity?: string): Promise<Alert[]> {
    const url = severity && severity !== 'ALL' ? `${API_BASE}/alerts?severity=${severity}` : `${API_BASE}/alerts`;
    const res = await fetch(url);
    return res.json();
  },

  async acknowledgeAlert(id: number): Promise<{ success: boolean; id: number }> {
    const res = await fetch(`${API_BASE}/alerts/${id}/acknowledge`, {
      method: 'POST',
    });
    return res.json();
  },

  async getLogs(category?: string, search?: string): Promise<LogEntry[]> {
    const params = new URLSearchParams();
    if (category && category !== 'ALL') params.append('category', category);
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/logs?${params.toString()}`);
    return res.json();
  },

  async getTopology(): Promise<SystemTopology> {
    const res = await fetch(`${API_BASE}/topology`);
    return res.json();
  },

  async getLifecycleHistory(limit = 100): Promise<StateTransition[]> {
    const res = await fetch(`${API_BASE}/lifecycle/history?limit=${limit}`);
    return res.json();
  },

  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  async startMonitoring(): Promise<{ status: string; active: boolean }> {
    const res = await fetch(`${API_BASE}/monitoring/start`, { method: 'POST' });
    return res.json();
  },

  async stopMonitoring(): Promise<{ status: string; active: boolean }> {
    const res = await fetch(`${API_BASE}/monitoring/stop`, { method: 'POST' });
    return res.json();
  },

  async getMode(): Promise<{ operational_mode: 'REAL_HOST' | 'SIMULATION' }> {
    const res = await fetch(`${API_BASE}/mode`);
    return res.json();
  },

  async setMode(mode: 'REAL_HOST' | 'SIMULATION'): Promise<{ success: boolean; operational_mode: 'REAL_HOST' | 'SIMULATION' }> {
    const res = await fetch(`${API_BASE}/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    return res.json();
  },

  async getSummaryReport(): Promise<any> {
    const res = await fetch(`${API_BASE}/reports/summary`);
    return res.json();
  },

  getExportUrl(format: 'json' | 'csv'): string {
    return `${API_BASE}/reports/export?format=${format}`;
  }
};

// Real-Time WebSocket and polling fallback manager
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private onSnapshotCallback: ((snapshot: FullStateSnapshot) => void) | null = null;
  private onStatusCallback: ((connected: boolean) => void) | null = null;
  private reconnectTimer: any = null;
  private isDestroyed = false;

  constructor(
    onSnapshot: (snapshot: FullStateSnapshot) => void,
    onStatus: (connected: boolean) => void
  ) {
    this.onSnapshotCallback = onSnapshot;
    this.onStatusCallback = onStatus;
    this.connect();
  }

  private connect() {
    if (this.isDestroyed) return;

    let wsUrl: string;
    if (RAW_BACKEND) {
      const cleanUrl = RAW_BACKEND.replace(/\/$/, '');
      const wsProtocol = cleanUrl.startsWith('https:') ? 'wss:' : 'ws:';
      const hostPart = cleanUrl.replace(/^https?:\/\//, '');
      wsUrl = `${wsProtocol}//${hostPart}/ws`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.onStatusCallback) this.onStatusCallback(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.resources && this.onSnapshotCallback) {
            this.onSnapshotCallback(data);
          }
        } catch (e) {
          console.error("Failed to parse websocket message", e);
        }
      };

      this.ws.onclose = () => {
        if (this.onStatusCallback) this.onStatusCallback(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.onStatusCallback) this.onStatusCallback(false);
        this.ws?.close();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isDestroyed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
