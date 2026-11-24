import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useOS } from '../../context/OSContext';

export const MemoryTower3D: React.FC = () => {
  const { snapshot, visualMode } = useOS();
  const towerRef = useRef<THREE.Group>(null);

  const memPct = snapshot?.resources.memory_percentage || 30.0;
  const memUsed = snapshot?.resources.memory_usage_mb || 4096.0;
  const memTotal = snapshot?.resources.memory_total_mb || 16384.0;
  const isHigh = memPct > 70;
  const isCrit = memPct > 85;
  const color = isCrit ? '#FF3864' : isHigh ? '#FFD166' : '#2979FF';

  const totalBlocks = 12;
  const activeBlocks = Math.round((memPct / 100) * totalBlocks);

  useFrame((_, delta) => {
    if (towerRef.current && visualMode !== 'ACCESSIBILITY') {
      towerRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
      <group ref={towerRef} position={[0, -1.2, 0]}>
        {/* Foundation Base */}
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[1.5, 1.8, 0.3, 32]} />
          <meshStandardMaterial color="#080F1E" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Vertical Stacking Memory Modules */}
        {Array.from({ length: totalBlocks }).map((_, i) => {
          const y = i * 0.32;
          const isActive = i < activeBlocks;
          const blockColor = isActive ? (i > totalBlocks * 0.85 ? '#FF3864' : i > totalBlocks * 0.7 ? '#FFD166' : color) : '#101A2C';

          return (
            <group key={`mem-block-${i}`} position={[0, y, 0]}>
              {/* Outer Hex / Rounded Ring */}
              <mesh>
                <cylinderGeometry args={[1.1, 1.1, 0.22, 6]} />
                <meshStandardMaterial
                  color={isActive ? '#080F1E' : '#05070D'}
                  metalness={0.9}
                  roughness={0.2}
                  emissive={blockColor}
                  emissiveIntensity={isActive ? 0.7 : 0.05}
                />
              </mesh>

              {/* Glowing Corner Notches */}
              {isActive && (
                <mesh position={[0, 0, 0]}>
                  <cylinderGeometry args={[1.12, 1.12, 0.08, 6]} />
                  <meshBasicMaterial color={blockColor} transparent opacity={0.9} />
                </mesh>
              )}
            </group>
          );
        })}

        {/* Central Core Pillar */}
        <mesh position={[0, (totalBlocks * 0.32) / 2 - 0.1, 0]}>
          <cylinderGeometry args={[0.3, 0.3, totalBlocks * 0.32 + 0.4, 16]} />
          <meshBasicMaterial color="#00E5FF" transparent opacity={0.3} />
        </mesh>

        {/* Overhead Telemetry Tag */}
        <Html position={[0, totalBlocks * 0.32 + 0.8, 0]} center distanceFactor={10}>
          <div className="bg-bg-card/90 border border-blue-500/50 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-blue-glow text-center pointer-events-none select-none min-w-[140px]">
            <div className="text-[10px] font-mono tracking-widest text-blue-400 font-bold uppercase">
              VIRTUAL MEMORY TOWER
            </div>
            <div className="text-sm font-display font-bold text-white flex items-center justify-center gap-1.5 mt-0.5">
              <span>{(memUsed / 1024).toFixed(1)} GB / {(memTotal / 1024).toFixed(0)} GB</span>
            </div>
            <div className="text-[10px] font-mono text-cyan-300 font-semibold mt-0.5">
              {memPct.toFixed(1)}% CONSUMPTION
            </div>
          </div>
        </Html>
      </group>
    </Float>
  );
};
