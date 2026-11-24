import React from 'react';
import { useOS } from '../context/OSContext';
import { SceneContainer } from '../components/3d/SceneContainer';
import { ProcessParticleCloud3D } from '../components/3d/ProcessParticleCloud3D';
import { ProcessTable } from '../components/ui/ProcessTable';
import { ProcessDetailDrawer } from '../components/ui/ProcessDetailDrawer';
import { Compass, Sparkles, Cpu, HardDrive } from 'lucide-react';

export const ExplorerPage: React.FC<{ onOpenCreate: () => void }> = ({ onOpenCreate }) => {
  const { snapshot, selectedProcess, setSelectedPid } = useOS();

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            3D PROCESS EXPLORER
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Interactive spatial process nodes & real-time lifecycle tracking
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-mono font-bold shadow-cyan-glow hover:brightness-110 transition-all flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          SPAWN SIMULATED PROCESS
        </button>
      </div>

      {/* Center 3D Spatial Canvas */}
      <div className="h-[420px] rounded-2xl bg-bg-card/75 border border-cyan-500/30 p-2 backdrop-blur-md relative overflow-hidden shadow-cyan-glow">
        <div className="absolute top-4 left-5 z-10 pointer-events-none">
          <span className="px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 font-bold tracking-widest uppercase">
            ORBITAL PROCESS NODES // CLICK TO INSPECT
          </span>
        </div>

        <div className="absolute top-4 right-5 z-10 pointer-events-none text-right">
          <div className="text-[10px] font-mono text-slate-400 uppercase">ACTIVE PID IN VIEW</div>
          <div className="text-xs font-display font-bold text-cyan-300">
            {selectedProcess ? `PID #${selectedProcess.pid} SELECTED` : 'SELECT ANY NODE'}
          </div>
        </div>

        <SceneContainer cameraPosition={[0, 4, 11]} autoRotate={true}>
          <ProcessParticleCloud3D interactive={true} />
        </SceneContainer>

        <div className="absolute bottom-4 left-5 z-10 text-[11px] font-mono text-slate-400 pointer-events-none bg-bg-dark/80 px-3 py-1.5 rounded-lg border border-slate-800">
          Tip: Left click + drag to orbit camera. Scroll to zoom. Click any glowing node to inspect details.
        </div>
      </div>

      {/* Comprehensive Process Management Table */}
      <div className="h-[460px]">
        <ProcessTable />
      </div>

      {/* Selected Process Detail Drawer */}
      <ProcessDetailDrawer
        process={selectedProcess}
        onClose={() => setSelectedPid(null)}
      />
    </div>
  );
};
