import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

function IntroChip({ onPulse }: { onPulse: () => void }) {
  const meshRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const pulseScaleRef = useRef(0.1);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.8) * 0.15;
    }

    if (ringRef.current) {
      pulseScaleRef.current += delta * 2.5;
      if (pulseScaleRef.current > 6.0) {
        pulseScaleRef.current = 0.5;
        onPulse();
      }
      ringRef.current.scale.set(pulseScaleRef.current, pulseScaleRef.current, 1);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = Math.max(0, 1.0 - pulseScaleRef.current / 6.0);
      }
    }
  });

  return (
    <group ref={meshRef}>
      {/* Central Processor Substrate */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.4, 0.3, 2.4]} />
        <meshStandardMaterial
          color="#080F1E"
          metalness={0.9}
          roughness={0.2}
          emissive="#00E5FF"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Heatspreader Die */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[1.5, 0.15, 1.5]} />
        <meshStandardMaterial
          color="#101A2C"
          metalness={0.95}
          roughness={0.1}
          emissive="#2979FF"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Core Glowing Core Crystal */}
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[0.7, 0.1, 0.7]} />
        <meshBasicMaterial color="#00E5FF" />
      </mesh>

      {/* Pins and Circuit paths */}
      {[-1.1, 1.1].map((x) =>
        [-0.8, -0.4, 0, 0.4, 0.8].map((z, i) => (
          <mesh key={`pin-${x}-${i}`} position={[x, -0.05, z]}>
            <boxGeometry args={[0.15, 0.2, 0.15]} />
            <meshBasicMaterial color="#FFD166" />
          </mesh>
        ))
      )}

      {/* Expanding Holographic Energy Wave */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[0.9, 1.05, 48]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export const CinematicIntro: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [pulseCount, setPulseCount] = useState(0);
  const [textStage, setTextStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setTextStage(1), 800);
    const t2 = setTimeout(() => setTextStage(2), 2200);
    const t3 = setTimeout(() => setTextStage(3), 3800);
    const t4 = setTimeout(() => {
      onComplete();
    }, 5200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1.2 } }}
      className="fixed inset-0 z-50 bg-[#05070D] flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 3, 6], fov: 50 }}>
          <ambientLight intensity={0.4} />
          <pointLight position={[0, 4, 0]} intensity={2.5} color="#00E5FF" />
          <pointLight position={[-4, -2, -3]} intensity={1.5} color="#9D4EDD" />

          {/* Futuristic Digital Grid Floor */}
          <Grid
            position={[0, -1.8, 0]}
            args={[30, 30]}
            cellSize={0.6}
            cellThickness={0.8}
            cellColor="#00E5FF"
            sectionSize={2.4}
            sectionThickness={1.5}
            sectionColor="#2979FF"
            fadeDistance={22}
            fadeStrength={1.5}
          />

          {/* Floating Subtle Particles */}
          <Sparkles count={180} scale={10} size={2.5} speed={0.8} color="#00E5FF" />
          <Sparkles count={120} scale={12} size={3} speed={0.5} color="#9D4EDD" />

          <Float speed={1.8} rotationIntensity={0.5} floatIntensity={0.8}>
            <IntroChip onPulse={() => setPulseCount((c) => c + 1)} />
          </Float>

          <EffectComposer>
            <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={1.8} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Floating Holographic Typography */}
      <div className="relative z-10 text-center pointer-events-none mt-48 px-6">
        <AnimatePresence>
          {textStage >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 25, letterSpacing: '0.4em' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '0.25em' }}
              transition={{ duration: 1.0, ease: 'easeOut' }}
              className="text-xs sm:text-sm font-mono text-cyan-400 font-bold uppercase tracking-widest drop-shadow-[0_0_12px_rgba(0,229,255,0.8)]"
            >
              SYSTEM BOOT SEQUENCE // V2.0 ACTIVE
            </motion.div>
          )}

          {textStage >= 2 && (
            <motion.h1
              initial={{ opacity: 0, scale: 0.85, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className="text-3xl sm:text-5xl md:text-6xl font-black font-display text-white mt-2 tracking-wider"
            >
              MINI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">OS</span> PROCESS MONITOR
            </motion.h1>
          )}

          {textStage >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mt-3 text-sm sm:text-base font-mono text-slate-400 tracking-widest"
            >
              <span className="text-cyan-300">MONITOR.</span>{' '}
              <span className="text-blue-400">VISUALIZE.</span>{' '}
              <span className="text-purple-400">CONTROL.</span>{' '}
              <span className="text-emerald-400">EXPERIENCE.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip Intro Button */}
      <button
        onClick={onComplete}
        className="absolute bottom-8 right-8 z-20 px-5 py-2.5 rounded-lg border border-cyan-500/40 bg-bg-card/80 text-cyan-300 text-xs font-mono uppercase tracking-wider backdrop-blur-md hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-cyan-glow transition-all"
      >
        Skip Intro ➔
      </button>
    </motion.div>
  );
};
