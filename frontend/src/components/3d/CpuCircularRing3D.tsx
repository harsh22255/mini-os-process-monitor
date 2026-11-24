import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useOS } from '../../context/OSContext';

export const CpuCircularRing3D: React.FC<{ cpuUsage?: number }> = ({ cpuUsage }) => {
  const { snapshot, visualMode } = useOS();
  const ring1 = useRef<THREE.Group>(null);
  const ring2 = useRef<THREE.Group>(null);
  const ring3 = useRef<THREE.Group>(null);

  const cpu = cpuUsage ?? (snapshot?.resources.cpu_usage || 0);
  const isHigh = cpu > 80;
  const isCrit = cpu > 90;
  const color = isCrit ? '#FF3864' : isHigh ? '#FFD166' : '#00E5FF';

  useFrame((_, delta) => {
    if (visualMode === 'ACCESSIBILITY') return;
    if (ring1.current) ring1.current.rotation.z += delta * (0.5 + (cpu / 100) * 1.5);
    if (ring2.current) ring2.current.rotation.z -= delta * (0.8 + (cpu / 100) * 1.2);
    if (ring3.current) ring3.current.rotation.y += delta * 0.4;
  });

  const numSegments = 16;
  const activeSegments = Math.round((cpu / 100) * numSegments);

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
      <group position={[0, 0, 0]}>
        {/* Core Ring Base */}
        <mesh>
          <torusGeometry args={[2.2, 0.08, 16, 64]} />
          <meshStandardMaterial color="#080F1E" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Outer Circular Segments */}
        <group ref={ring1}>
          {Array.from({ length: numSegments }).map((_, i) => {
            const angle = (i / numSegments) * Math.PI * 2;
            const x = Math.cos(angle) * 2.2;
            const y = Math.sin(angle) * 2.2;
            const isActive = i < activeSegments;

            return (
              <mesh key={`cpu-seg-${i}`} position={[x, y, 0]} rotation={[0, 0, angle + Math.PI / 2]}>
                <boxGeometry args={[0.06, 0.35, 0.1]} />
                <meshBasicMaterial
                  color={isActive ? color : '#101A2C'}
                  transparent
                  opacity={isActive ? 0.95 : 0.3}
                />
              </mesh>
            );
          })}
        </group>

        {/* Counter-rotating Inner Ring */}
        <group ref={ring2}>
          <mesh>
            <torusGeometry args={[1.7, 0.04, 16, 48]} />
            <meshBasicMaterial color="#2979FF" transparent opacity={0.6} />
          </mesh>
        </group>

        {/* Tilting Orbital Gyro */}
        <group ref={ring3}>
          <mesh rotation={[Math.PI / 4, 0, 0]}>
            <torusGeometry args={[2.6, 0.02, 16, 64]} />
            <meshBasicMaterial color="#9D4EDD" transparent opacity={0.4} />
          </mesh>
        </group>

        {/* Central Core Sphere */}
        <mesh>
          <sphereGeometry args={[0.9, 32, 32]} />
          <meshStandardMaterial
            color="#05070D"
            metalness={0.9}
            roughness={0.1}
            emissive={color}
            emissiveIntensity={0.6 + (cpu / 100) * 1.5}
          />
        </mesh>

        {/* Central Metric HUD */}
        <Html center distanceFactor={9}>
          <div className="flex flex-col items-center justify-center text-center pointer-events-none select-none">
            <span className="text-2xl font-bold font-display text-white tracking-wider drop-shadow-[0_0_10px_rgba(0,229,255,0.7)]">
              {cpu.toFixed(1)}%
            </span>
            <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase mt-0.5">
              CPU LOAD
            </span>
          </div>
        </Html>
      </group>
    </Float>
  );
};
