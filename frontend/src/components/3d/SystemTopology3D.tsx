import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { SystemTopology, TopologyNode } from '../../types';

interface TopologyProps {
  topology: SystemTopology | null;
  selectedNodeId: string | null;
  onSelectNode: (node: TopologyNode) => void;
}

export const SystemTopology3D: React.FC<TopologyProps> = ({
  topology,
  selectedNodeId,
  onSelectNode,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [packetProgress, setPacketProgress] = useState(0);

  const nodes = topology?.nodes || [];
  const links = topology?.links || [];

  // Fixed 3D coordinate layout for system architecture components
  const nodePositions = useMemo(() => {
    const posMap: Record<string, [number, number, number]> = {
      node_sched: [0, 1.8, 0],
      node_cpu: [-2.8, 0.4, -0.5],
      node_mem: [2.8, 0.4, -0.5],
      node_state: [-1.8, -2.0, 0.5],
      node_alert: [1.8, -2.0, 0.5],
    };

    // Arrange dynamic process nodes in a lower orbital arc
    const dynamicProcs = nodes.filter((n) => n.type === 'PROCESS');
    dynamicProcs.forEach((p, idx) => {
      const angle = (idx / Math.max(1, dynamicProcs.length)) * Math.PI - Math.PI / 2;
      const x = Math.sin(angle) * 4.2;
      const y = -0.6 + Math.cos(angle) * 0.8;
      const z = Math.cos(angle) * 2.5;
      posMap[p.id] = [x, y, z];
    });

    return posMap;
  }, [nodes]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
    }
    setPacketProgress((prev) => (prev + delta * 0.8) % 1.0);
  });

  const getNodeColor = (node: TopologyNode): string => {
    if (node.status === 'CRITICAL' || node.status === 'ALERT') return '#FF3864';
    if (node.status === 'WARNING') return '#FFD166';
    if (node.type === 'CPU') return '#00E5FF';
    if (node.type === 'MEMORY') return '#2979FF';
    if (node.type === 'SCHEDULER') return '#00F5A0';
    if (node.type === 'STATE_ENGINE') return '#9D4EDD';
    if (node.type === 'ALERT_ENGINE') return '#FF3864';
    return '#38BDF8';
  };

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Topology Connecting Links */}
      {links.map((link, idx) => {
        const p1 = nodePositions[link.source];
        const p2 = nodePositions[link.target];
        if (!p1 || !p2) return null;

        const v1 = new THREE.Vector3(...p1);
        const v2 = new THREE.Vector3(...p2);
        const lineGeo = new THREE.BufferGeometry().setFromPoints([v1, v2]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x2979FF, transparent: true, opacity: 0.4 });
        const lineMesh = new THREE.Line(lineGeo, lineMat);

        // Traveling data packet
        const packetPos = new THREE.Vector3().lerpVectors(v1, v2, packetProgress);

        return (
          <group key={`topo-link-${idx}`}>
            <primitive object={lineMesh} />
            <mesh position={[packetPos.x, packetPos.y, packetPos.z]}>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshBasicMaterial color="#00E5FF" />
            </mesh>
          </group>
        );
      })}

      {/* Topology Nodes */}
      {nodes.map((node) => {
        const pos = nodePositions[node.id] || [0, 0, 0];
        const isSelected = selectedNodeId === node.id;
        const color = getNodeColor(node);
        const size = node.type === 'PROCESS' ? 0.35 : 0.6;

        return (
          <group key={`topo-node-${node.id}`} position={pos}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node);
              }}
            >
              <icosahedronGeometry args={[size, 1]} />
              <meshStandardMaterial
                color={isSelected ? '#FFFFFF' : '#080F1E'}
                emissive={color}
                emissiveIntensity={isSelected ? 2.5 : 1.1}
                roughness={0.15}
                metalness={0.8}
              />
            </mesh>

            {isSelected && (
              <mesh>
                <ringGeometry args={[size * 1.3, size * 1.5, 32]} />
                <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.8} />
              </mesh>
            )}

            <Html position={[0, size + 0.35, 0]} center distanceFactor={11}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node);
                }}
                className={`cursor-pointer px-2.5 py-1 rounded backdrop-blur-md border text-center transition-all ${
                  isSelected
                    ? 'bg-cyan-500/30 border-cyan-400 shadow-cyan-glow scale-105'
                    : 'bg-bg-dark/90 border-slate-700/80 hover:border-cyan-400'
                }`}
              >
                <div className="text-[11px] font-mono font-bold text-white whitespace-nowrap">
                  {node.label}
                </div>
                <div className="text-[9px] font-mono text-cyan-300 font-semibold uppercase">
                  {node.type}
                </div>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};
