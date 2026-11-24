import React from 'react';
import { useOS } from '../context/OSContext';
import { SceneContainer } from '../components/3d/SceneContainer';
import { HoloProcessorChip } from '../components/3d/HoloProcessorChip';
import { CpuCircularRing3D } from '../components/3d/CpuCircularRing3D';
import { MemoryTower3D } from '../components/3d/MemoryTower3D';
import { ProcessParticleCloud3D } from '../components/3d/ProcessParticleCloud3D';
import { ProcessTable } from '../components/ui/ProcessTable';
import { Activity, ShieldCheck, AlertTriangle, Layers, Cpu, HardDrive } from 'lucide-react';

export const DashboardPage: React.FC<{ onNavigate: (page: any) => void; onOpenCreate: () => void }> = ({
  onNavigate,
  onOpenCreate,
}) => {
  const { snapshot } = useOS();

  const cpu = snapshot?.resources.cpu_usage || 0;
  const memPct = snapshot?.resources.memory_percentage || 0;
  const memUsed = snapshot?.resources.memory_usage_mb || 0;
  const memTotal = snapshot?.resources.memory_total_mb || 16384;
  const activeAlerts = snapshot?.active_alerts || [];
  const stateCounts = snapshot?.state_counts || {
    NEW: 0, READY: 0, RUNNING: 0, WAITING: 0, SUSPENDED: 0, TERMINATED: 0,
  };

  const hasCritical = activeAlerts.some((a: { severity: string }) => a.severity === 'CRITICAL') || cpu > 90;

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Top Banner Alert Bar if issues detected */}
      {activeAlerts.length > 0 && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-xs font-mono text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="font-bold">SYSTEM TELEMETRY ALERT:</span>
            <span>{activeAlerts[0].message}</span>
          </div>
          <button
            onClick={() => onNavigate('alerts')}
            className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-white font-bold transition-all"
          >
            VIEW INCIDENTS ({activeAlerts.length}) ➔
          </button>
        </div>
      )}

      {/* Hero 3D Command Center Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[520px]">
        {/* Left Telemetry Widgets */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* 3D CPU Gauge Widget */}
          <div className="flex-1 rounded-2xl bg-bg-card/75 border border-slate-800/80 p-4 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between z-10">
              <span className="text-xs font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                CENTRAL CPU LOAD
              </span>
              <span className="text-[10px] font-mono font-bold text-cyan-300">8 V-CORES</span>
            </div>

            <div className="h-44 w-full">
              <SceneContainer cameraPosition={[0, 0, 7]} enableControls={false}>
                <CpuCircularRing3D />
              </SceneContainer>
            </div>

            <div className="z-10 text-[11px] font-mono text-slate-400 flex justify-between border-t border-slate-800 pt-2">
              <span>Threshold: {snapshot?.resources.cpu_threshold || 80}%</span>
              <span className={cpu > 80 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                {cpu > 80 ? 'HIGH LOAD' : 'OPTIMAL'}
              </span>
            </div>
          </div>

          {/* 3D Memory Widget */}
          <div className="flex-1 rounded-2xl bg-bg-card/75 border border-slate-800/80 p-4 flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:border-blue-500/40 transition-all">
            <div className="flex items-center justify-between z-10">
              <span className="text-xs font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                MEMORY TOWER
              </span>
              <span className="text-[10px] font-mono font-bold text-blue-300">16 GB DDR5</span>
            </div>

            <div className="h-44 w-full">
              <SceneContainer cameraPosition={[0, 1.5, 7]} enableControls={false}>
                <MemoryTower3D />
              </SceneContainer>
            </div>

            <div className="z-10 text-[11px] font-mono text-slate-400 flex justify-between border-t border-slate-800 pt-2">
              <span>{(memUsed / 1024).toFixed(1)} GB used</span>
              <span className={memPct > 70 ? 'text-yellow-400 font-bold' : 'text-emerald-400 font-bold'}>
                {memPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Center: Main 3D Holographic Processor Viewport */}
        <div className="lg:col-span-6 rounded-2xl bg-bg-card/60 border border-cyan-500/30 p-2 backdrop-blur-md relative overflow-hidden shadow-cyan-glow flex flex-col">
          <div className="absolute top-4 left-5 z-10 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 font-bold tracking-widest uppercase">
              3D PROCESSOR DIE VISUALIZATION
            </span>
          </div>

          <div className="absolute top-4 right-5 z-10 pointer-events-none text-right">
            <div className="text-[10px] font-mono text-slate-400 uppercase">ACTIVE PARTICLES</div>
            <div className="text-xs font-display font-bold text-cyan-300">
              {snapshot?.processes.length || 0} SIMULATED THREADS
            </div>
          </div>

          <div className="flex-1 w-full h-full">
            <SceneContainer
              cameraPosition={[0, 3.5, 8.5]}
              autoRotate={true}
              hasCriticalAlert={hasCritical}
            >
              <HoloProcessorChip />
              <ProcessParticleCloud3D interactive={true} />
            </SceneContainer>
          </div>

          <div className="absolute bottom-4 left-5 right-5 z-10 flex items-center justify-between text-xs font-mono bg-bg-dark/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Running: {stateCounts.RUNNING}
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Ready: {stateCounts.READY}
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-yellow-400" /> Waiting: {stateCounts.WAITING}
              </span>
            </div>

            <button
              onClick={() => onNavigate('explorer')}
              className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
            >
              EXPLORE 3D SPACE ➔
            </button>
          </div>
        </div>

        {/* Right Status & Lifecycle Summary */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* State Distribution Card */}
          <div className="p-4 rounded-2xl bg-bg-card/75 border border-slate-800/80 backdrop-blur-md">
            <div className="text-xs font-mono text-slate-400 uppercase font-bold mb-3 flex items-center justify-between">
              <span>STATE DISTRIBUTION</span>
              <Layers className="w-3.5 h-3.5 text-purple-400" />
            </div>

            <div className="space-y-2 text-xs font-mono">
              {[
                { state: 'RUNNING', count: stateCounts.RUNNING, color: 'bg-emerald-400' },
                { state: 'READY', count: stateCounts.READY, color: 'bg-cyan-400' },
                { state: 'WAITING', count: stateCounts.WAITING, color: 'bg-yellow-400' },
                { state: 'SUSPENDED', count: stateCounts.SUSPENDED, color: 'bg-purple-400' },
                { state: 'TERMINATED', count: stateCounts.TERMINATED, color: 'bg-red-400' },
              ].map((s) => (
                <div key={s.state} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.color}`} />
                    <span className="text-slate-300">{s.state}</span>
                  </div>
                  <span className="font-bold text-white">{s.count}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate('lifecycle')}
              className="w-full mt-4 py-2 rounded-lg bg-bg-secondary border border-slate-700/60 hover:border-purple-500/50 text-[11px] font-mono text-purple-300 transition-all font-bold"
            >
              OPEN 3D LIFECYCLE ➔
            </button>
          </div>

          {/* Quick Actions Card */}
          <div className="flex-1 p-4 rounded-2xl bg-bg-card/75 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase font-bold mb-3 flex items-center justify-between">
                <span>COMMAND ACTIONS</span>
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
              </div>

              <div className="space-y-2">
                <button
                  onClick={onOpenCreate}
                  className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-mono font-bold shadow-cyan-glow hover:brightness-110 transition-all text-center"
                >
                  + SPAWN NEW PROCESS
                </button>

                <button
                  onClick={() => onNavigate('topology')}
                  className="w-full py-2 px-3 rounded-lg bg-bg-secondary/80 border border-slate-700 hover:border-cyan-400 text-xs font-mono text-cyan-300 transition-all text-center"
                >
                  SYSTEM TOPOLOGY
                </button>

                <button
                  onClick={() => onNavigate('reports')}
                  className="w-full py-2 px-3 rounded-lg bg-bg-secondary/80 border border-slate-700 hover:border-blue-400 text-xs font-mono text-slate-300 transition-all text-center"
                >
                  EXPORT AUDIT REPORT
                </button>
              </div>
            </div>

            <div className="mt-3 text-[10px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-800 pt-2">
              <span>ENGINE: C++17 MULTITHREADED</span>
              <span className="text-emerald-400">SYNCED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Process Inventory Table */}
      <div className="h-96">
        <ProcessTable onInspect={() => onNavigate('explorer')} />
      </div>
    </div>
  );
};
