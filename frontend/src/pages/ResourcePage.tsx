import React, { useState } from 'react';
import { useOS } from '../context/OSContext';
import { SceneContainer } from '../components/3d/SceneContainer';
import { CpuCircularRing3D } from '../components/3d/CpuCircularRing3D';
import { MemoryTower3D } from '../components/3d/MemoryTower3D';
import { ResourceBarChart3D } from '../components/3d/ResourceBarChart3D';
import { Cpu, HardDrive, BarChart3, TrendingUp, Layers } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar 
} from 'recharts';

export const ResourcePage: React.FC = () => {
  const { snapshot } = useOS();
  const [barMode, setBarMode] = useState<'CPU' | 'MEMORY'>('CPU');

  const history = snapshot?.resources.history || [];
  const cores = snapshot?.resources.core_utilization || [10, 10, 10, 10, 10, 10, 10, 10];
  const cpu = snapshot?.resources.cpu_usage || 0;
  const memPct = snapshot?.resources.memory_percentage || 0;
  const memUsed = snapshot?.resources.memory_usage_mb || 0;
  const memTotal = snapshot?.resources.memory_total_mb || 16384;
  const memAvail = snapshot?.resources.memory_available_mb || (memTotal - memUsed);

  const coreData = cores.map((val: number, idx: number) => ({
    name: `Core ${idx}`,
    load: val,
  }));

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          3D RESOURCE OBSERVABILITY LAB
        </h1>
        <p className="text-xs font-mono text-slate-400 mt-0.5">
          Real-time hardware utilization telemetry & 3D memory architecture
        </p>
      </div>

      {/* Top 3D Visualizer Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-[360px]">
        {/* CPU 3D Gauge */}
        <div className="rounded-2xl bg-bg-card/75 border border-cyan-500/30 p-3 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-cyan-glow">
          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-mono text-slate-300 font-bold uppercase flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              DYNAMIC CPU CORE
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">{cpu.toFixed(1)}%</span>
          </div>

          <div className="h-60 w-full">
            <SceneContainer cameraPosition={[0, 0, 6.5]} enableControls={true}>
              <CpuCircularRing3D />
            </SceneContainer>
          </div>

          <div className="text-[10px] font-mono text-slate-400 flex justify-between border-t border-slate-800 pt-1.5">
            <span>Peak Threshold: {snapshot?.resources.cpu_threshold || 80}%</span>
            <span className="text-cyan-400">8 Virtual Cores</span>
          </div>
        </div>

        {/* Memory Tower 3D */}
        <div className="rounded-2xl bg-bg-card/75 border border-blue-500/30 p-3 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-blue-glow">
          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-mono text-slate-300 font-bold uppercase flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-blue-400" />
              MEMORY TOWER
            </span>
            <span className="text-[10px] font-mono text-blue-400 font-bold">{memPct.toFixed(1)}%</span>
          </div>

          <div className="h-60 w-full">
            <SceneContainer cameraPosition={[0, 1.2, 7]} enableControls={true}>
              <MemoryTower3D />
            </SceneContainer>
          </div>

          <div className="text-[10px] font-mono text-slate-400 flex justify-between border-t border-slate-800 pt-1.5">
            <span>Avail: {(memAvail / 1024).toFixed(1)} GB</span>
            <span className="text-blue-400">{(memTotal / 1024).toFixed(0)} GB Pool</span>
          </div>
        </div>

        {/* Top Consumers 3D Floating Bars */}
        <div className="rounded-2xl bg-bg-card/75 border border-purple-500/30 p-3 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-purple-glow">
          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-mono text-slate-300 font-bold uppercase flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              TOP CONSUMERS
            </span>
            <div className="flex bg-slate-900 border border-slate-800 rounded p-0.5 text-[10px] font-mono">
              <button
                onClick={() => setBarMode('CPU')}
                className={`px-2 py-0.5 rounded ${barMode === 'CPU' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'}`}
              >
                CPU
              </button>
              <button
                onClick={() => setBarMode('MEMORY')}
                className={`px-2 py-0.5 rounded ${barMode === 'MEMORY' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'}`}
              >
                RAM
              </button>
            </div>
          </div>

          <div className="h-60 w-full">
            <SceneContainer cameraPosition={[0, 2, 7]} enableControls={true}>
              <ResourceBarChart3D mode={barMode} />
            </SceneContainer>
          </div>

          <div className="text-[10px] font-mono text-slate-400 flex justify-between border-t border-slate-800 pt-1.5">
            <span>Interactive 3D Bar Stack</span>
            <span className="text-purple-400">{barMode === 'CPU' ? 'By Core Load' : 'By Footprint'}</span>
          </div>
        </div>
      </div>

      {/* 2D Precision Historical Telemetry Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CPU Historical Timeline Chart */}
        <div className="p-4 rounded-2xl bg-bg-card/75 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                60-SECOND CPU UTILIZATION CURVE
              </h3>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-bold">{cpu.toFixed(1)}%</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis domain={[0, 100]} stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#080F1E', borderColor: '#00E5FF', borderRadius: 8, fontSize: 11 }}
                  itemStyle={{ color: '#00E5FF' }}
                />
                <Area type="monotone" dataKey="cpu_usage" stroke="#00E5FF" strokeWidth={2} fillOpacity={1} fill="url(#cpuGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Historical Timeline Chart */}
        <div className="p-4 rounded-2xl bg-bg-card/75 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                60-SECOND MEMORY PRESSURE CURVE
              </h3>
            </div>
            <span className="text-xs font-mono text-blue-400 font-bold">{memPct.toFixed(1)}%</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2979FF" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#2979FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis domain={[0, 100]} stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#080F1E', borderColor: '#2979FF', borderRadius: 8, fontSize: 11 }}
                  itemStyle={{ color: '#2979FF' }}
                />
                <Area type="monotone" dataKey="memory_percentage" stroke="#2979FF" strokeWidth={2} fillOpacity={1} fill="url(#memGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Per-Core Virtual CPU Breakdown */}
      <div className="p-4 rounded-2xl bg-bg-card/75 border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              8-CORE LOAD BALANCING MATRIX
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Real-time CPU Sched Core Distribution</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={coreData}>
              <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <YAxis domain={[0, 100]} stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#080F1E', borderColor: '#00E5FF', borderRadius: 8, fontSize: 11 }}
                itemStyle={{ color: '#00E5FF' }}
              />
              <Bar dataKey="load" fill="#00E5FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
