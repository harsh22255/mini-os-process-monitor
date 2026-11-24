import React, { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { X, Sparkles, Cpu, HardDrive, Clock, ShieldAlert } from 'lucide-react';

export const CreateProcessModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { createProcess } = useOS();

  const [name, setName] = useState('');
  const [priority, setPriority] = useState(5);
  const [burst, setBurst] = useState(45);
  const [memory, setMemory] = useState(256);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await createProcess(name, priority, burst, memory);
    setIsSubmitting(false);
    if (success) {
      setName('');
      onClose();
    }
  };

  const presetTasks = [
    { name: 'NeuralNetInfer.bin', prio: 8, burst: 60, mem: 512 },
    { name: 'VfsCryptoSync', prio: 6, burst: 30, mem: 128 },
    { name: 'QuantumMatrixMath', prio: 9, burst: 80, mem: 1024 },
    { name: 'ShaderPipeline.gpu', prio: 7, burst: 45, mem: 384 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-bg-navy/95 border border-cyan-500/40 rounded-2xl shadow-cyan-glow p-6 text-slate-200 backdrop-blur-xl relative overflow-hidden">
        {/* Glow corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-white tracking-wider">
                SPAWN SIMULATED PROCESS
              </h2>
              <p className="text-[10px] font-mono text-slate-400">
                Initialize new task in C++ Process Manager
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mt-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Quick Templates:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presetTasks.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => {
                  setName(t.name);
                  setPriority(t.prio);
                  setBurst(t.burst);
                  setMemory(t.mem);
                }}
                className="px-2.5 py-1 rounded bg-bg-secondary/80 border border-slate-700/60 hover:border-cyan-400 text-[11px] font-mono text-cyan-300 transition-all"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Process Name */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Process Name</label>
            <input
              type="text"
              required
              placeholder="e.g. HoloRenderWorker"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary/80 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-cyan-glow"
            />
          </div>

          {/* Priority Slider */}
          <div>
            <div className="flex justify-between items-center text-xs font-mono text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-yellow-400" />
                Scheduling Priority (1 Low - 10 Realtime)
              </span>
              <span className="font-bold text-cyan-300">Level {priority}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Burst & Memory inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-mono text-slate-300 mb-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Burst Quantum (Ticks)
              </label>
              <input
                type="number"
                min={5}
                max={500}
                value={burst}
                onChange={(e) => setBurst(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 rounded-lg bg-bg-secondary/80 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-mono text-slate-300 mb-1">
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                Base Memory (MB)
              </label>
              <input
                type="number"
                min={32}
                max={4096}
                value={memory}
                onChange={(e) => setMemory(parseFloat(e.target.value) || 64)}
                className="w-full px-3 py-2 rounded-lg bg-bg-secondary/80 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-mono text-slate-400 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-mono font-bold shadow-cyan-glow hover:brightness-110 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Spawning...' : 'INITIALIZE PROCESS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
