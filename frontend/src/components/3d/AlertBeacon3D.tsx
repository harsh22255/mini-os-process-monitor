import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useOS } from '../../context/OSContext';

export const AlertBeacon3D: React.FC = () => {
  const { snapshot, visualMode } = useOS();
  const beaconRef = useRef<THREE.Group>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);

  const activeAlertCount = snapshot?.active_alert_count || 0;
  const cpu = snapshot?.resources.cpu_usage || 0;
  const isCritical = activeAlertCount > 0 && snapshot?.active_alerts.some((a) => a.severity === 'CRITICAL');
  const isWarning = activeAlertCount > 0 || cpu > 80;

  const beaconColor = isCritical ? '#FF3864' : isWarning ? '#FFD166' : '#00F5A0';

  useFrame((state, delta) => {
    if (visualMode === 'ACCESSIBILITY') return;
    if (beaconRef.current) {
      beaconRef.current.rotation.y += delta * (isCritical ? 1.5 : 0.6);
    }
    if (ring1.current) {
      ring1.current.rotation.z += delta * 1.2;
    }
    if (ring2.current) {
      ring2.current.rotation.z -= delta * 0.9;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.6}>
      <group ref={beaconRef} position={[0, 0, 0]}>
        {/* Holographic Warning Prism */}
        <mesh position={[0, 0, 0]}>
          <tetrahedronGeometry args={[1.5, 0]} />
          <meshStandardMaterial
            color="#080F1E"
            emissive={beaconColor}
            emissiveIntensity={isCritical ? 2.5 : 1.2}
            roughness={0.1}
            metalness={0.9}
            wireframe={false}
          />
        </mesh>

        {/* Wireframe Holographic Aura */}
        <mesh position={[0, 0, 0]}>
          <tetrahedronGeometry args={[1.8, 0]} />
          <meshBasicMaterial color={beaconColor} wireframe transparent opacity={0.6} />
        </mesh>

        {/* Gyro Rings */}
        <mesh ref={ring1} rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[2.2, 0.03, 16, 48]} />
          <meshBasicMaterial color={beaconColor} transparent opacity={0.8} />
        </mesh>

        <mesh ref={ring2} rotation={[-Math.PI / 4, 0, 0]}>
          <torusGeometry args={[2.5, 0.02, 16, 48]} />
          <meshBasicMaterial color="#9D4EDD" transparent opacity={0.5} />
        </mesh>

        {/* Center Light Pulse */}
        <pointLight color={beaconColor} intensity={isCritical ? 3.0 : 1.5} distance={8} />

        {/* Floating Telemetry Tag */}
        <Html position={[0, 2.2, 0]} center distanceFactor={10}>
          <div className="bg-bg-dark/95 border border-slate-700/80 px-3.5 py-1.5 rounded-lg shadow-lg text-center pointer-events-none select-none min-w-[150px]">
            <div className="text-[10px] font-mono tracking-widest uppercase font-bold" style={{ color: beaconColor }}>
              {isCritical ? 'CRITICAL ALERT ACTIVE' : isWarning ? 'SYSTEM WARNING' : 'STATUS NORMAL'}
            </div>
            <div className="text-sm font-display font-bold text-white mt-0.5">
              {activeAlertCount} {activeAlertCount === 1 ? 'ACTIVE INCIDENT' : 'ACTIVE INCIDENTS'}
            </div>
          </div>
        </Html>
      </group>
    </Float>
  );
};
