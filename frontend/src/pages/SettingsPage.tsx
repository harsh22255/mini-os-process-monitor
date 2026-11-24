import React, { useState, useEffect } from 'react';
import { useOS } from '../context/OSContext';
import { api } from '../services/api';
import { SystemSettings } from '../types';
import { Settings, Save, Sliders, Shield, Monitor, Zap, Radio, Layers } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { visualMode, setVisualMode, updateSettings, showToast, operationalMode, setOperationalMode } = useOS();

  const [cpuThresh, setCpuThresh] = useState<number>(80);
  const [memThresh, setMemThresh] = useState<number>(70);
  const [intervalMs, setIntervalMs] = useState<number>(1000);
  const [autoSpawn, setAutoSpawn] = useState<boolean>(true);
  const [opMode, setOpMode] = useState<'REAL_HOST' | 'SIMULATION'>('REAL_HOST');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    setOpMode(operationalMode);
    api.getSettings().then((s: SystemSettings) => {
      if (s) {
        setCpuThresh(s.cpu_threshold);
        setMemThresh(s.memory_threshold);
        setIntervalMs(s.refresh_interval_ms);
        setAutoSpawn(s.auto_spawn_enabled);
        if (s.operational_mode) setOpMode(s.operational_mode);
      }
    }).catch(() => {});
  }, [operationalMode]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await setOperationalMode(opMode);
    await updateSettings({
      cpu_threshold: cpuThresh,
      memory_threshold: memThresh,
      refresh_interval_ms: intervalMs,
      auto_spawn_enabled: autoSpawn,
      visual_mode: visualMode,
      operational_mode: opMode,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-6 pb-8 max-w-4xl animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          SYSTEM CONFIGURATION & THRESHOLDS
        </h1>
        <p className="text-xs font-mono text-slate-400 mt-0.5">
          Tune C++ simulation engine parameters, monitoring intervals & graphics pipeline
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Backend Operating Engine Mode */}
        <div className="p-5 rounded-2xl bg-bg-card/75 border border-slate-800 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold uppercase pb-2 border-b border-slate-800">
            <Radio className="w-4 h-4" />
            <span>OPERATIONAL ENGINE ARCHITECTURE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              onClick={() => setOpMode('REAL_HOST')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                opMode === 'REAL_HOST'
                  ? 'bg-emerald-500/15 border-emerald-400 shadow-green-glow'
                  : 'bg-bg-secondary/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  REAL HOST OS (WINDOWS)
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                Connects directly to Windows Kernel via Win32 Toolhelp32 & Psapi. Displays actual running host processes, real physical RAM usage ({'>'}24GB), and real CPU differential percentages matching Windows Task Manager.
              </p>
            </div>

            <div
              onClick={() => setOpMode('SIMULATION')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                opMode === 'SIMULATION'
                  ? 'bg-purple-500/15 border-purple-400 shadow-purple-glow'
                  : 'bg-bg-secondary/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  KERNEL SIMULATOR ENGINE
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30">
                  ALGORITHMIC OS
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                Full operating system simulation with synthetic round-robin scheduler, automated priority preemption, burst completion, waiting states, and simulated high-load scenarios.
              </p>
            </div>
          </div>
        </div>

        {/* Visual Engine Mode */}
        <div className="p-5 rounded-2xl bg-bg-card/75 border border-slate-800 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase pb-2 border-b border-slate-800">
            <Monitor className="w-4 h-4" />
            <span>3D GRAPHICS PIPELINE & ACCESSIBILITY</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: 'CINEMATIC',
                title: 'CINEMATIC MODE',
                desc: 'Full 3D effects, particles, bloom, postprocessing & holographic depth',
                tag: 'Recommended GPU',
              },
              {
                id: 'PERFORMANCE',
                title: 'PERFORMANCE MODE',
                desc: 'Reduced particles, disabled heavy shaders, optimized for laptops',
                tag: 'Balanced',
              },
              {
                id: 'ACCESSIBILITY',
                title: 'ACCESSIBILITY MODE',
                desc: 'Reduced motion, high contrast, static camera, zero flashing',
                tag: 'Low Motion',
              },
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => setVisualMode(m.id as any)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  visualMode === m.id
                    ? 'bg-cyan-500/15 border-cyan-400 shadow-cyan-glow'
                    : 'bg-bg-secondary/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-mono font-bold text-white">{m.title}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                    {m.tag}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Alert Thresholds */}
        <div className="p-5 rounded-2xl bg-bg-card/75 border border-slate-800 backdrop-blur-md space-y-5">
          <div className="flex items-center gap-2 text-xs font-mono text-yellow-400 font-bold uppercase pb-2 border-b border-slate-800">
            <Shield className="w-4 h-4" />
            <span>AUTOMATED WATCHDOG THRESHOLDS</span>
          </div>

          {/* CPU Threshold */}
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1.5">
              <span>CPU Alert Trigger Threshold</span>
              <span className="font-bold text-cyan-300">{cpuThresh}%</span>
            </div>
            <input
              type="range"
              min={20}
              max={95}
              value={cpuThresh}
              onChange={(e) => setCpuThresh(parseInt(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] font-mono text-slate-500 mt-1">
              Triggers visual amber/red alert beacons and incident logs when CPU exceeds this level.
            </p>
          </div>

          {/* Memory Threshold */}
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1.5">
              <span>Memory Alert Trigger Threshold</span>
              <span className="font-bold text-blue-300">{memThresh}%</span>
            </div>
            <input
              type="range"
              min={20}
              max={95}
              value={memThresh}
              onChange={(e) => setMemThresh(parseInt(e.target.value))}
              className="w-full accent-blue-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] font-mono text-slate-500 mt-1">
              Triggers memory pressure incident logs when consumption exceeds this level.
            </p>
          </div>
        </div>

        {/* Engine Scheduling & Ticks */}
        <div className="p-5 rounded-2xl bg-bg-card/75 border border-slate-800 backdrop-blur-md space-y-5">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold uppercase pb-2 border-b border-slate-800">
            <Zap className="w-4 h-4" />
            <span>SIMULATION SCHEDULER ENGINE</span>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1.5">
              <span>Simulation Cycle Tick Interval</span>
              <span className="font-bold text-emerald-300">{intervalMs} ms</span>
            </div>
            <input
              type="range"
              min={250}
              max={3000}
              step={250}
              value={intervalMs}
              onChange={(e) => setIntervalMs(parseInt(e.target.value))}
              className="w-full accent-emerald-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] font-mono text-slate-500 mt-1">
              Controls the frequency of C++ MonitorThread scheduling execution and real-time broadcast.
            </p>
          </div>

          {/* Auto Spawn Toggle */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-xs font-mono font-bold text-white">Dynamic Background Batch Tasks</div>
              <div className="text-[10px] font-mono text-slate-400">
                Periodically queues realistic OS worker tasks to simulate dynamic operating system workload.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoSpawn(!autoSpawn)}
              className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${
                autoSpawn ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-black" />
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-mono font-bold shadow-cyan-glow hover:brightness-110 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'SAVING...' : 'SAVE SETTINGS'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
