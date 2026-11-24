import React, { useState, useEffect } from 'react';
import { SceneContainer } from '../components/3d/SceneContainer';
import { SystemTopology3D } from '../components/3d/SystemTopology3D';
import { api } from '../services/api';
import { SystemTopology, TopologyNode } from '../types';
import { Network, Info, Server, Cpu, HardDrive, ShieldAlert, GitCommit, Layers } from 'lucide-react';

export const TopologyPage: React.FC = () => {
  const [topology, setTopology] = useState<SystemTopology | null>(null);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);

  useEffect(() => {
    const fetchTopo = () => {
      api.getTopology().then((data: SystemTopology) => {
        if (data) {
          setTopology(data);
          if (!selectedNode && data.nodes && data.nodes.length > 0) {
            setSelectedNode(data.nodes[0]);
          }
        }
      }).catch(() => {});
    };

    fetchTopo();
    const interval = setInterval(fetchTopo, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Network className="w-5 h-5 text-cyan-400" />
          3D SYSTEM TOPOLOGY MATRIX
        </h1>
        <p className="text-xs font-mono text-slate-400 mt-0.5">
          Live inter-process communication graph & architectural subsystem mapping
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[560px]">
        {/* 3D Network Topology Viewport */}
        <div className="lg:col-span-8 rounded-2xl bg-bg-card/75 border border-cyan-500/30 p-2 backdrop-blur-md relative overflow-hidden shadow-cyan-glow flex flex-col">
          <div className="absolute top-4 left-5 z-10 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 font-bold tracking-widest uppercase">
              INTER-MODULE IPC NETWORK // CLICK NODES TO INSPECT
            </span>
          </div>

          <SceneContainer cameraPosition={[0, 2, 8.5]} autoRotate={true}>
            <SystemTopology3D
              topology={topology}
              selectedNodeId={selectedNode ? selectedNode.id : null}
              onSelectNode={(node) => setSelectedNode(node)}
            />
          </SceneContainer>

          <div className="absolute bottom-4 left-5 right-5 z-10 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-bg-dark/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800">
            <span>Nodes: {topology?.nodes.length || 0} Subsystems & Tasks</span>
            <span className="text-cyan-400 font-bold">ANIMATED DATA STREAMS ACTIVE</span>
          </div>
        </div>

        {/* Right Architectural Inspector Card */}
        <div className="lg:col-span-4 rounded-2xl bg-bg-card/85 border border-slate-800/80 p-5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
              <Info className="w-4 h-4" />
              <span>MODULE ARCHITECTURE INSPECTOR</span>
            </div>

            {selectedNode ? (
              <div className="mt-4 space-y-4">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Selected Component:</span>
                  <h3 className="text-lg font-display font-bold text-white mt-0.5">{selectedNode.label}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      {selectedNode.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      selectedNode.status === 'HEALTHY'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}>
                      {selectedNode.status}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-bg-secondary/70 border border-slate-800 text-xs font-mono">
                  <div className="text-slate-400 text-[10px] uppercase mb-1">Functional Description:</div>
                  <p className="text-slate-300 leading-relaxed">{selectedNode.details}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-bg-secondary/70 border border-slate-800 text-xs font-mono space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Node Identifier:</span>
                    <span className="text-white font-bold">{selectedNode.id}</span>
                  </div>
                  {selectedNode.pid && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Simulated PID:</span>
                      <span className="text-cyan-300 font-bold">#{selectedNode.pid}</span>
                    </div>
                  )}
                  {selectedNode.cpu !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current CPU Load:</span>
                      <span className="text-emerald-400 font-bold">{selectedNode.cpu.toFixed(1)}%</span>
                    </div>
                  )}
                  {selectedNode.mem !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Allocated Memory:</span>
                      <span className="text-blue-400 font-bold">{selectedNode.mem.toFixed(0)} MB</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-500 mt-6 text-center italic">
                Select any node in the 3D topology matrix to inspect its role.
              </div>
            )}
          </div>

          {/* Subsystem Communication Legend */}
          <div className="pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-400 space-y-1.5">
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Architecture Legend:</div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>CPU Core: Execution matrix & context switching</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Memory Subsystem: Virtual page frames & caching</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>State Lifecycle: Finite automaton transition checks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
