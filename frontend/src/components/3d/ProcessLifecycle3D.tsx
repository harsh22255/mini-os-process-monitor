import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useOS } from '../../context/OSContext';
import { ProcessState, StateTransition } from '../../types';
import { getStateColor } from './ProcessParticleCloud3D';

// Geometric coordinates for each state machine node in 3D space
const NODE_POSITIONS: Record<ProcessState, [number, number, number]> = {
  NEW: [-4.2, 2.0, 0],
  READY: [-1.8, 1.0, 0],
  RUNNING: [1.8, 1.0, 0],
  WAITING: [1.8, -1.8, 0],
  SUSPENDED: [-1.8, -1.8, 0],
  TERMINATED: [4.2, -0.4, 0],
};

const TRANSITION_PATHS: Array<{ from: ProcessState; to: ProcessState; label: string }> = [
  { from: 'NEW', to: 'READY', label: 'Admit' },
  { from: 'READY', to: 'RUNNING', label: 'Dispatch' },
  { from: 'RUNNING', to: 'READY', label: 'Preempt / Timeout' },
  { from: 'RUNNING', to: 'WAITING', label: 'I/O Wait' },
  { from: 'WAITING', to: 'READY', label: 'I/O Complete' },
  { from: 'RUNNING', to: 'SUSPENDED', label: 'Suspend' },
  { from: 'WAITING', to: 'SUSPENDED', label: 'Suspend' },
  { from: 'SUSPENDED', to: 'READY', label: 'Resume' },
  { from: 'RUNNING', to: 'TERMINATED', label: 'Exit / Complete' },
  { from: 'READY', to: 'TERMINATED', label: 'Kill' },
  { from: 'SUSPENDED', to: 'TERMINATED', label: 'Kill' },
];

function ConnectionPipeline({ from, to }: { from: ProcessState; to: ProcessState }) {
  const p1 = NODE_POSITIONS[from];
  const p2 = NODE_POSITIONS[to];

  const lineObj = useMemo(() => {
    const v1 = new THREE.Vector3(...p1);
    const v2 = new THREE.Vector3(...p2);
    const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
    mid.z += 0.35;
    const curve = new THREE.QuadraticBezierCurve3(v1, mid, v2);
    const points = curve.getPoints(30);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x2979FF, transparent: true, opacity: 0.35 });
    return new THREE.Line(geometry, material);
  }, [p1, p2]);

  return <primitive object={lineObj} />;
}

function TravelingParticle({
  from,
  to,
  progress,
}: {
  from: ProcessState;
  to: ProcessState;
  progress: number; // 0 to 1
}) {
  const p1 = NODE_POSITIONS[from] || [0, 0, 0];
  const p2 = NODE_POSITIONS[to] || [0, 0, 0];

  const pos = useMemo(() => {
    const v1 = new THREE.Vector3(...p1);
    const v2 = new THREE.Vector3(...p2);
    const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
    mid.z += 0.35;
    const curve = new THREE.QuadraticBezierCurve3(v1, mid, v2);
    return curve.getPoint(Math.min(1, Math.max(0, progress)));
  }, [p1, p2, progress]);

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <mesh>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshBasicMaterial color="#00E5FF" />
      </mesh>
      <pointLight color="#00E5FF" intensity={2.0} distance={1.2} />
    </group>
  );
}

function StateNode({
  stateName,
  position,
  count,
  isHighlighted,
}: {
  stateName: ProcessState;
  position: [number, number, number];
  count: number;
  isHighlighted: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = getStateColor(stateName);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      if (isHighlighted) {
        meshRef.current.rotation.z += delta * 0.8;
      }
    }
  });

  return (
    <group position={position}>
      {/* 3D Polyhedron Node */}
      <mesh ref={meshRef}>
        <dodecahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial
          color={isHighlighted ? '#FFFFFF' : '#080F1E'}
          emissive={color}
          emissiveIntensity={isHighlighted ? 2.5 : 0.8}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Outer Glowing Hologram Ring */}
      <mesh>
        <torusGeometry args={[0.85, 0.02, 16, 48]} />
        <meshBasicMaterial color={color} transparent opacity={isHighlighted ? 0.95 : 0.5} />
      </mesh>

      {/* Floating State Badge & Count */}
      <Html position={[0, -0.95, 0]} center distanceFactor={9}>
        <div className={`px-2.5 py-1 rounded-md backdrop-blur-md border text-center transition-all ${
          isHighlighted 
            ? 'bg-cyan-500/20 border-cyan-400 shadow-cyan-glow scale-110' 
            : 'bg-bg-card/90 border-slate-700/60'
        }`}>
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color }}>
            {stateName}
          </div>
          <div className="text-xs font-display font-bold text-white mt-0.5">
            {count} {count === 1 ? 'proc' : 'procs'}
          </div>
        </div>
      </Html>
    </group>
  );
}

export const ProcessLifecycle3D: React.FC<{
  selectedPidFilter?: number | null;
  onTransitionSelect?: (t: StateTransition) => void;
}> = ({ selectedPidFilter }) => {
  const { snapshot } = useOS();
  const [activeParticles, setActiveParticles] = useState<Array<{ id: number; from: ProcessState; to: ProcessState; progress: number }>>([]);
  const [highlightedState, setHighlightedState] = useState<ProcessState | null>(null);
  const lastTransitionIdRef = useRef<number>(0);

  const stateCounts = snapshot?.state_counts || {
    NEW: 0, READY: 0, RUNNING: 0, WAITING: 0, SUSPENDED: 0, TERMINATED: 0
  };

  // Detect new transition from recent_transitions
  useEffect(() => {
    const transitions = snapshot?.recent_transitions || [];
    if (transitions.length === 0) return;

    const latest = transitions[0];
    if (latest && latest.id !== lastTransitionIdRef.current) {
      lastTransitionIdRef.current = latest.id;

      if (!selectedPidFilter || latest.pid === selectedPidFilter) {
        const from = latest.from_state as ProcessState;
        const to = latest.to_state as ProcessState;

        setHighlightedState(from);
        setActiveParticles((prev) => [
          ...prev.slice(-3),
          { id: latest.id, from, to, progress: 0 }
        ]);

        setTimeout(() => setHighlightedState(to), 600);
        setTimeout(() => setHighlightedState(null), 1500);
      }
    }
  }, [snapshot?.recent_transitions, selectedPidFilter]);

  // Advance particle animation
  useFrame((_, delta) => {
    setActiveParticles((prev) =>
      prev
        .map((p) => ({ ...p, progress: p.progress + delta * 0.9 }))
        .filter((p) => p.progress <= 1.0)
    );
  });

  return (
    <group position={[0, 0, 0]}>
      {/* State Machine Transition Connecting Pipelines */}
      {TRANSITION_PATHS.map((path, i) => (
        <ConnectionPipeline key={`pipe-${i}`} from={path.from} to={path.to} />
      ))}

      {/* Traveling Transition Energy Particles */}
      {activeParticles.map((p) => (
        <TravelingParticle key={`active-p-${p.id}`} from={p.from} to={p.to} progress={p.progress} />
      ))}

      {/* 6 State Nodes */}
      {(['NEW', 'READY', 'RUNNING', 'WAITING', 'SUSPENDED', 'TERMINATED'] as ProcessState[]).map((state) => (
        <StateNode
          key={`statenode-${state}`}
          stateName={state}
          position={NODE_POSITIONS[state]}
          count={stateCounts[state] || 0}
          isHighlighted={highlightedState === state}
        />
      ))}
    </group>
  );
};
