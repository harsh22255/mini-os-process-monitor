import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useOS } from '../../context/OSContext';
import { Process, ProcessState } from '../../types';

export const getStateColor = (state: ProcessState): string => {
  switch (state) {
    case 'RUNNING': return '#00F5A0'; // Neon Green
    case 'READY': return '#00E5FF';   // Electric Cyan
    case 'WAITING': return '#FFD166'; // Amber Yellow
    case 'SUSPENDED': return '#9D4EDD'; // Neon Purple
    case 'TERMINATED': return '#FF3864'; // Warning Red
    case 'NEW': return '#2979FF';     // Blue
    default: return '#94A3B8';
  }
};

function ProcessNode({
  proc,
  position,
  isSelected,
  onSelect,
}: {
  proc: Process;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const color = getStateColor(proc.state);
  const size = isSelected ? 0.38 : hovered ? 0.32 : 0.22 + (proc.priority / 10) * 0.08;

  useFrame((_, delta) => {
    if (meshRef.current) {
      if (proc.state === 'RUNNING') {
        meshRef.current.rotation.y += delta * 2.0;
        meshRef.current.rotation.x += delta * 1.0;
      } else {
        meshRef.current.rotation.y += delta * 0.5;
      }
    }
    if (ringRef.current && (isSelected || hovered)) {
      ringRef.current.rotation.z += delta * 1.5;
    }
  });

  return (
    <group position={position}>
      {/* Interactive 3D Node Mesh */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <octahedronGeometry args={[size, 0]} />
        <meshStandardMaterial
          color={isSelected ? '#FFFFFF' : color}
          emissive={color}
          emissiveIntensity={isSelected ? 2.5 : hovered ? 1.8 : 0.9}
          roughness={0.15}
          metalness={0.8}
        />
      </mesh>

      {/* Selected / Hover Ring */}
      {(isSelected || hovered) && (
        <mesh ref={ringRef}>
          <ringGeometry args={[size * 1.4, size * 1.6, 32]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}

      {/* Floating HUD Tag on hover or select */}
      {(hovered || isSelected) && (
        <Html position={[0, size + 0.35, 0]} center distanceFactor={10}>
          <div className="bg-bg-dark/95 border border-cyan-500/60 backdrop-blur-md px-2.5 py-1 rounded-md shadow-cyan-glow text-center whitespace-nowrap pointer-events-none select-none">
            <div className="text-[11px] font-mono font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span>[{proc.pid}] {proc.name}</span>
            </div>
            <div className="text-[9px] font-mono text-cyan-300">
              {proc.state} | CPU: {proc.cpu_usage.toFixed(1)}% | RAM: {proc.memory_usage.toFixed(0)}MB
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export const ProcessParticleCloud3D: React.FC<{ interactive?: boolean }> = ({ interactive = true }) => {
  const { snapshot, selectedPid, setSelectedPid, visualMode } = useOS();
  const groupRef = useRef<THREE.Group>(null);

  const processes = snapshot?.processes || [];

  useFrame((_, delta) => {
    if (groupRef.current && visualMode !== 'ACCESSIBILITY') {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {processes.map((proc, index) => {
        // Calculate orbital layout based on state and index
        const angle = (index / Math.max(1, processes.length)) * Math.PI * 2;
        const radius = 2.4 + (proc.state === 'RUNNING' ? 0.4 : proc.state === 'WAITING' ? 1.4 : 0.9) + (index % 3) * 0.5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(angle * 2.5) * 1.2;

        return (
          <ProcessNode
            key={`proc-node-${proc.pid}`}
            proc={proc}
            position={[x, y, z]}
            isSelected={selectedPid === proc.pid}
            onSelect={() => interactive && setSelectedPid(proc.pid)}
          />
        );
      })}
    </group>
  );
};
