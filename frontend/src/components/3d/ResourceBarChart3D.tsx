import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useOS } from '../../context/OSContext';
import { getStateColor } from './ProcessParticleCloud3D';

export const ResourceBarChart3D: React.FC<{ mode: 'CPU' | 'MEMORY' }> = ({ mode }) => {
  const { snapshot, selectedPid, setSelectedPid } = useOS();
  const groupRef = useRef<THREE.Group>(null);

  const topProcesses = mode === 'CPU' 
    ? snapshot?.resources.top_cpu_processes || [] 
    : snapshot?.resources.top_memory_processes || [];

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  const spacing = 1.4;
  const startX = -((topProcesses.length - 1) * spacing) / 2;

  return (
    <Float speed={1.0} rotationIntensity={0.15} floatIntensity={0.3}>
      <group ref={groupRef} position={[0, -0.8, 0]}>
        {/* Base Grid Stage */}
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[Math.max(6, topProcesses.length * 1.6), 0.15, 3]} />
          <meshStandardMaterial color="#080F1E" metalness={0.9} roughness={0.2} />
        </mesh>

        {topProcesses.map((proc, i) => {
          const val = mode === 'CPU' ? proc.cpu_usage : proc.memory_usage;
          const maxVal = mode === 'CPU' ? 100 : 2048;
          const barHeight = Math.max(0.2, (val / maxVal) * 3.2);
          const x = startX + i * spacing;
          const isSelected = selectedPid === proc.pid;
          const color = getStateColor(proc.state);

          return (
            <group key={`res-bar-${proc.pid}`} position={[x, barHeight / 2, 0]}>
              {/* 3D Bar Column */}
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPid(proc.pid);
                }}
              >
                <boxGeometry args={[0.7, barHeight, 0.7]} />
                <meshStandardMaterial
                  color={isSelected ? '#FFFFFF' : '#080F1E'}
                  emissive={isSelected ? '#00E5FF' : color}
                  emissiveIntensity={isSelected ? 2.0 : 0.8}
                  metalness={0.85}
                  roughness={0.2}
                />
              </mesh>

              {/* Overhead Process Metric Tag */}
              <Html position={[0, barHeight / 2 + 0.35, 0]} center distanceFactor={10}>
                <div className={`px-2 py-0.5 rounded backdrop-blur-md border text-center pointer-events-none select-none ${
                  isSelected ? 'bg-cyan-500/20 border-cyan-400' : 'bg-bg-dark/90 border-slate-700/80'
                }`}>
                  <div className="text-[10px] font-mono font-bold text-white whitespace-nowrap">
                    [{proc.pid}] {proc.name.substring(0, 10)}
                  </div>
                  <div className="text-[9px] font-mono text-cyan-300 font-semibold">
                    {mode === 'CPU' ? `${val.toFixed(1)}%` : `${val.toFixed(0)}MB`}
                  </div>
                </div>
              </Html>
            </group>
          );
        })}
      </group>
    </Float>
  );
};
