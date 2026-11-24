import React from 'react';
import { useOS } from '../../context/OSContext';
import { Cpu, HardDrive, Activity, Play, Pause, Radio, Eye, Layers } from 'lucide-react';

export const Navbar: React.FC<{ onOpenCreateModal: () => void }> = ({ onOpenCreateModal }) => {
  const { snapshot, connected, visualMode, setVisualMode, toggleMonitoring, operationalMode, setOperationalMode } = useOS();

  const cpu = snapshot?.resources.cpu_usage || 0;
  const memPct = snapshot?.resources.memory_percentage || 0;
  const isRunning = snapshot?.monitoring_active ?? false;
  const uptimeSec = snapshot?.uptime_seconds || 0;

  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = uptimeSec % 60;
  const uptimeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <header className="h-16 border-b border-cyan-500/20 bg-bg-navy/80 backdrop-blur-md px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-cyan-glow border border-cyan-400/30">
          <Activity className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-lg text-white tracking-wider">
              MINI <span className="text-cyan-400">OS</span> MONITOR
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
              v2.0
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 tracking-wider">
            MONITOR. VISUALIZE. CONTROL.
          </div>
        </div>
      </div>

      {/* Center Live Telemetry Pills */}
      <div className="hidden lg:flex items-center gap-4">
        {/* CPU Telemetry */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-bg-secondary/70 border border-slate-700/60">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <div className="text-xs font-mono">
            <span className="text-slate-400">CPU: </span>
            <span className={`font-bold ${cpu > 80 ? 'text-red-400 animate-pulse' : 'text-cyan-300'}`}>
              {cpu.toFixed(1)}%
            </span>
          </div>
          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${cpu > 80 ? 'bg-red-500' : 'bg-cyan-400'}`}
              style={{ width: `${Math.min(100, cpu)}%` }}
            />
          </div>
        </div>

        {/* Memory Telemetry */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-bg-secondary/70 border border-slate-700/60">
          <HardDrive className="w-4 h-4 text-blue-400" />
          <div className="text-xs font-mono">
            <span className="text-slate-400">RAM: </span>
            <span className={`font-bold ${memPct > 70 ? 'text-yellow-400' : 'text-blue-300'}`}>
              {memPct.toFixed(1)}%
            </span>
          </div>
          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${memPct > 70 ? 'bg-yellow-400' : 'bg-blue-400'}`}
              style={{ width: `${Math.min(100, memPct)}%` }}
            />
          </div>
        </div>

        {/* Uptime Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary/70 border border-slate-700/60 text-xs font-mono text-slate-300">
          <span className="text-slate-400">UPTIME:</span>
          <span className="text-white font-bold">{uptimeFormatted}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Real Host vs Simulation Engine Toggle */}
        <div className="hidden sm:flex items-center bg-bg-secondary/90 border border-slate-700/80 rounded-lg p-0.5">
          <button
            onClick={() => setOperationalMode('REAL_HOST')}
            title="Live Windows Host Process & Resource Monitoring"
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold rounded transition-all ${
              operationalMode === 'REAL_HOST'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-green-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>REAL HOST</span>
          </button>
          <button
            onClick={() => setOperationalMode('SIMULATION')}
            title="Algorithmic OS Kernel Simulator"
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold rounded transition-all ${
              operationalMode === 'SIMULATION'
                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50 shadow-purple-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3 text-purple-400" />
            <span>SIMULATOR</span>
          </button>
        </div>

        {/* Visual Mode Selector */}
        <div className="flex items-center bg-bg-secondary/80 border border-slate-700/70 rounded-lg p-0.5">
          {(['CINEMATIC', 'PERFORMANCE', 'ACCESSIBILITY'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setVisualMode(mode)}
              title={`${mode} Mode`}
              className={`px-2 py-1 text-[10px] font-mono font-semibold rounded transition-all ${
                visualMode === mode
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-cyan-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode === 'CINEMATIC' ? '3D' : mode === 'PERFORMANCE' ? 'FAST' : 'A11Y'}
            </button>
          ))}
        </div>

        {/* Play / Pause Monitoring */}
        <button
          onClick={toggleMonitoring}
          title={isRunning ? 'Pause Engine Simulation' : 'Resume Engine Simulation'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
            isRunning
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/20'
          }`}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isRunning ? 'PAUSE' : 'RESUME'}</span>
        </button>

        {/* Quick Spawn Button */}
        <button
          onClick={onOpenCreateModal}
          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-mono font-bold hover:brightness-110 shadow-cyan-glow transition-all"
        >
          + NEW PROCESS
        </button>

        {/* Live Socket Status */}
        <div
          title={connected ? 'Connected to C++ Backend (Live Sync)' : 'Cloud Preview Mode (Running 3D Client Simulation)'}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono"
        >
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 shadow-green-glow' : 'bg-cyan-400 shadow-cyan-glow animate-pulse'}`}
          />
          <span className="hidden md:inline text-slate-400">{connected ? 'LIVE C++' : 'PREVIEW'}</span>
        </div>
      </div>
    </header>
  );
};
