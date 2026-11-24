import React, { useState, useEffect } from 'react';
import { useOS } from '../context/OSContext';
import { SceneContainer } from '../components/3d/SceneContainer';
import { AlertBeacon3D } from '../components/3d/AlertBeacon3D';
import { api } from '../services/api';
import { Alert } from '../types';
import { AlertTriangle, CheckCircle, ShieldAlert, Filter, Clock } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { acknowledgeAlert } = useOS();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const fetchAlerts = () => {
    api.getAlerts(severityFilter).then((data: Alert[]) => {
      if (data) setAlerts(data);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 1500);
    return () => clearInterval(interval);
  }, [severityFilter]);

  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter((a) => a.acknowledged);

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            3D ALERT INCIDENT COMMAND CENTER
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Real-time threshold sentinels, process anomalies & automated notifications
          </p>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1.5 bg-bg-secondary/80 border border-slate-700/70 p-1 rounded-lg text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-cyan-400 ml-1.5 mr-1" />
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                severityFilter === sev
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-cyan-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Hero 3D Alert Beacon & Stats Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[340px]">
        {/* 3D Warning Beacon */}
        <div className="lg:col-span-8 rounded-2xl bg-bg-card/75 border border-red-500/30 p-2 backdrop-blur-md relative overflow-hidden shadow-red-glow">
          <div className="absolute top-4 left-5 z-10 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-red-950/80 border border-red-500/40 text-[10px] font-mono text-red-300 font-bold tracking-widest uppercase">
              HOLOGRAPHIC ALERT SENTINEL BEACON
            </span>
          </div>

          <SceneContainer cameraPosition={[0, 1.5, 6]} enableControls={true}>
            <AlertBeacon3D />
          </SceneContainer>

          <div className="absolute bottom-4 left-5 z-10 text-[11px] font-mono text-slate-400 pointer-events-none bg-bg-dark/80 px-3 py-1.5 rounded-lg border border-slate-800">
            Automated Watchdog monitors CPU &gt; 80%, RAM &gt; 70%, and process stall conditions.
          </div>
        </div>

        {/* Stats Column */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex-1 p-4 rounded-xl bg-bg-card/75 border border-slate-800 flex flex-col justify-between">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">ACTIVE UNACKNOWLEDGED</div>
            <div className="text-3xl font-display font-black text-red-400">{activeAlerts.length}</div>
            <div className="text-[10px] font-mono text-slate-500">Requires operator attention</div>
          </div>

          <div className="flex-1 p-4 rounded-xl bg-bg-card/75 border border-slate-800 flex flex-col justify-between">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">ACKNOWLEDGED INCIDENTS</div>
            <div className="text-3xl font-display font-black text-cyan-300">{acknowledgedAlerts.length}</div>
            <div className="text-[10px] font-mono text-slate-500">Recorded in audit timeline</div>
          </div>
        </div>
      </div>

      {/* Incident List */}
      <div className="bg-bg-card/75 border border-slate-800/80 rounded-xl overflow-hidden backdrop-blur-md p-4">
        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-3 pb-2 border-b border-slate-800 flex items-center justify-between">
          <span>ACTIVE INCIDENT LOGS</span>
          <span className="text-slate-400">{alerts.length} incidents recorded</span>
        </h3>

        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {alerts.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-mono text-xs">
              No alert conditions active. System operates within nominal safety parameters.
            </div>
          ) : (
            alerts.map((alert) => {
              const isCrit = alert.severity === 'CRITICAL';
              const isWarn = alert.severity === 'WARNING';

              return (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border backdrop-blur-md flex items-center justify-between gap-4 transition-all ${
                    alert.acknowledged
                      ? 'bg-bg-secondary/40 border-slate-800 opacity-60'
                      : isCrit
                      ? 'bg-red-500/10 border-red-500/40 shadow-red-glow'
                      : isWarn
                      ? 'bg-yellow-500/10 border-yellow-500/40'
                      : 'bg-bg-secondary/70 border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider shrink-0 mt-0.5 ${
                        isCrit
                          ? 'bg-red-500 text-white animate-pulse'
                          : isWarn
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {alert.severity}
                    </span>

                    <div>
                      <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                        <span>[{alert.source}]</span>
                        <span className="text-slate-400 font-normal">{alert.timestamp}</span>
                      </div>
                      <p className="text-xs font-mono text-slate-300 mt-0.5 leading-snug">{alert.message}</p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {!alert.acknowledged ? (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold transition-all shadow-cyan-glow"
                      >
                        ACKNOWLEDGE
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>ACKNOWLEDGED</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
