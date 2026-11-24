import React, { useEffect, useState } from 'react';
import { useOS } from '../../context/OSContext';
import { Process, StateTransition } from '../../types';
import { api } from '../../services/api';
import { getStateColor } from '../3d/ProcessParticleCloud3D';
import { X, Play, Pause, XCircle, Clock, Cpu, HardDrive, Shield, GitCommit, Layers } from 'lucide-react';

export const ProcessDetailDrawer: React.FC<{
  process: Process | null;
  onClose: () => void;
}> = ({ process, onClose }) => {
  const { suspendProcess, resumeProcess, terminateProcess } = useOS();
  const [history, setHistory] = useState<StateTransition[]>([]);

  useEffect(() => {
    if (process) {
      api.getProcess(process.pid)
        .then((data) => {
          if (data && data.lifecycle_history) {
            setHistory(data.lifecycle_history);
          }
        })
        .catch(() => {});
    }
  }, [process]);

  if (!process) return null;

  const stateColor = getStateColor(process.state);
  const burstPercent = Math.min(100, Math.max(0, ((process.burst_time - process.remaining_burst) / process.burst_time) * 100));

  return (
    <div className="fixed top-16 right-0 bottom-0 w-96 bg-bg-navy/95 border-l border-cyan-500/30 backdrop-blur-xl z-40 p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-left">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stateColor }} />
            <div>
              <div className="text-xs font-mono text-cyan-400 font-bold">PID #{process.pid}</div>
              <h3 className="text-base font-display font-bold text-white tracking-wide">{process.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* State & Priority Badges */}
        <div className="flex items-center gap-2 mt-4">
          <span
            className="px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wider border"
            style={{
              color: stateColor,
              borderColor: `${stateColor}40`,
              backgroundColor: `${stateColor}15`,
            }}
          >
            {process.state}
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
            Priority {process.priority}
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-mono text-slate-400 bg-bg-secondary/80 border border-slate-800">
            {process.thread_count} threads
          </span>
        </div>

        {/* Execution Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <div className="p-3 rounded-lg bg-bg-secondary/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>CPU UTILIZATION</span>
            </div>
            <div className="text-lg font-display font-bold text-white">{process.cpu_usage.toFixed(1)}%</div>
          </div>

          <div className="p-3 rounded-lg bg-bg-secondary/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-1">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span>MEMORY FOOTPRINT</span>
            </div>
            <div className="text-lg font-display font-bold text-white">
              {process.memory_usage.toFixed(0)} <span className="text-xs text-slate-400 font-mono">MB</span>
            </div>
          </div>
        </div>

        {/* Burst Progress Bar */}
        <div className="mt-4 p-3 rounded-lg bg-bg-secondary/70 border border-slate-800">
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1.5">
            <span>BURST EXECUTION PROGRESS</span>
            <span className="text-cyan-300 font-bold">{burstPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
              style={{ width: `${burstPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
            <span>Executed: {process.execution_time}s</span>
            <span>Remaining: {process.remaining_burst}s</span>
          </div>
        </div>

        {/* Timestamp Info */}
        <div className="mt-3 text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>Created at: {process.creation_time}</span>
        </div>

        {/* Lifecycle Transitions Timeline */}
        <div className="mt-5">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
            <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
            <span>STATE TRANSITION HISTORY</span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {history.length === 0 ? (
              <div className="text-[11px] font-mono text-slate-500 italic">
                Active in initial {process.state} state.
              </div>
            ) : (
              history.map((t) => (
                <div key={t.id} className="p-2 rounded bg-bg-secondary/60 border border-slate-800 text-[10px] font-mono">
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span className="font-bold text-cyan-300">{t.from_state} ➔ {t.to_state}</span>
                    <span className="text-slate-500">{t.timestamp}</span>
                  </div>
                  <div className="text-slate-400">{t.reason}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Control Buttons Footer */}
      <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
        {process.state === 'SUSPENDED' ? (
          <button
            onClick={() => resumeProcess(process.pid)}
            className="flex-1 py-2 px-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold hover:bg-emerald-500/30 flex items-center justify-center gap-1.5 transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            RESUME
          </button>
        ) : process.state !== 'TERMINATED' ? (
          <button
            onClick={() => suspendProcess(process.pid)}
            className="flex-1 py-2 px-3 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-mono font-bold hover:bg-yellow-500/30 flex items-center justify-center gap-1.5 transition-all"
          >
            <Pause className="w-3.5 h-3.5" />
            SUSPEND
          </button>
        ) : null}

        {process.state !== 'TERMINATED' && (
          <button
            onClick={() => {
              terminateProcess(process.pid);
              onClose();
            }}
            className="flex-1 py-2 px-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-mono font-bold hover:bg-red-500/30 flex items-center justify-center gap-1.5 transition-all"
          >
            <XCircle className="w-3.5 h-3.5" />
            TERMINATE
          </button>
        )}
      </div>
    </div>
  );
};
