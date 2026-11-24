import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useOS } from '../../context/OSContext';

export const HoloProcessorChip: React.FC = () => {
  const { snapshot, visualMode } = useOS();
  const chipGroup = useRef<THREE.Group>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const coreMesh = useRef<THREE.Mesh>(null);

  const cpu = snapshot?.resources.cpu_usage || 20.0;
  const isHighAlert = cpu > 80.0 || (snapshot?.active_alert_count || 0) > 0;
  const isCritical = cpu > 90.0;

  const coreColor = isCritical ? "#FF3864" : isHighAlert ? "#FFD166" : "#00E5FF";
  const glowIntensity = Math.min(3.5, 0.8 + (cpu / 100.0) * 2.5);

  useFrame((state, delta) => {
    if (chipGroup.current && visualMode !== 'ACCESSIBILITY') {
      chipGroup.current.rotation.y += delta * (0.2 + (cpu / 100.0) * 0.4);
      chipGroup.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.6) * 0.08;
    }

    if (ring1.current) {
      ring1.current.rotation.z += delta * 0.8;
      ring1.current.rotation.x += delta * 0.4;
    }

    if (ring2.current) {
      ring2.current.rotation.z -= delta * 0.6;
      ring2.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.6}>
      <group ref={chipGroup} position={[0, 0, 0]}>
        {/* Motherboard Base Plate */}
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[4.2, 0.2, 4.2]} />
          <meshStandardMaterial
            color="#080F1E"
            metalness={0.8}
            roughness={0.25}
            emissive="#101A2C"
            emissiveIntensity={0.4}
          />
        </mesh>

        {/* Outer Circuit Traces Grid Lines */}
        {[-1.6, -0.8, 0, 0.8, 1.6].map((x, i) => (
          <mesh key={`trace-x-${i}`} position={[x, -0.09, 0]}>
            <boxGeometry args={[0.04, 0.02, 3.8]} />
            <meshBasicMaterial color={isHighAlert ? "#FFD166" : "#00E5FF"} transparent opacity={0.4} />
          </mesh>
        ))}
        {[-1.6, -0.8, 0, 0.8, 1.6].map((z, i) => (
          <mesh key={`trace-z-${i}`} position={[0, -0.09, z]}>
            <boxGeometry args={[3.8, 0.02, 0.04]} />
            <meshBasicMaterial color={isHighAlert ? "#FFD166" : "#00E5FF"} transparent opacity={0.4} />
          </mesh>
        ))}

        {/* CPU Socket Bezel */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[2.8, 0.3, 2.8]} />
          <meshStandardMaterial
            color="#101A2C"
            metalness={0.9}
            roughness={0.15}
            emissive="#2979FF"
            emissiveIntensity={0.4}
          />
        </mesh>

        {/* Silicon Die / Heatspreader */}
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[1.8, 0.2, 1.8]} />
          <meshStandardMaterial
            color="#05070D"
            metalness={0.95}
            roughness={0.1}
            emissive={coreColor}
            emissiveIntensity={glowIntensity * 0.5}
          />
        </mesh>

        {/* Central Core Luminescent Node */}
        <mesh ref={coreMesh} position={[0, 0.38, 0]}>
          <boxGeometry args={[0.9, 0.08, 0.9]} />
          <meshBasicMaterial color={coreColor} />
        </mesh>

        {/* Floating Orbital Gyro Rings */}
        <mesh ref={ring1} position={[0, 0.2, 0]}>
          <torusGeometry args={[2.5, 0.03, 16, 64]} />
          <meshBasicMaterial color={coreColor} transparent opacity={0.7} />
        </mesh>

        <mesh ref={ring2} position={[0, 0.2, 0]}>
          <torusGeometry args={[2.9, 0.02, 16, 64]} />
          <meshBasicMaterial color="#9D4EDD" transparent opacity={0.5} />
        </mesh>

        {/* Floating Holographic Telemetry Tag */}
        <Html position={[0, 1.8, 0]} center distanceFactor={12}>
          <div className="bg-bg-card/90 border border-cyan-500/50 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-cyan-glow text-center pointer-events-none min-w-[140px]">
            <div className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase">
              QUANTUM SILICON CORE
            </div>
            <div className="text-sm font-display font-bold text-white flex items-center justify-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: coreColor }} />
              <span>{cpu.toFixed(1)}% LOAD</span>
            </div>
          </div>
        </Html>
      </group>
    </Float>
  );
};
