import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { Vector2 } from 'three';
import { useOS } from '../../context/OSContext';

interface SceneContainerProps {
  children: React.ReactNode;
  cameraPosition?: [number, number, number];
  enableControls?: boolean;
  autoRotate?: boolean;
  className?: string;
  hasCriticalAlert?: boolean;
}

export const SceneContainer: React.FC<SceneContainerProps> = ({
  children,
  cameraPosition = [0, 4, 12],
  enableControls = true,
  autoRotate = false,
  className = "w-full h-full",
  hasCriticalAlert = false,
}) => {
  const { visualMode } = useOS();

  const isCinematic = visualMode === 'CINEMATIC';
  const isPerformance = visualMode === 'PERFORMANCE';
  const isAccessibility = visualMode === 'ACCESSIBILITY';

  return (
    <div className={`relative ${className} select-none`}>
      <Canvas
        camera={{ position: cameraPosition, fov: 48 }}
        dpr={isPerformance ? [1, 1.2] : [1, 2]}
        gl={{ antialias: !isPerformance, alpha: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#05070D']} />
        <fog attach="fog" args={['#05070D', 10, 35]} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={isAccessibility ? 0.8 : 0.4} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} color="#00E5FF" />
        <directionalLight position={[-10, -10, -10]} intensity={0.6} color="#9D4EDD" />
        <pointLight position={[0, 0, 0]} intensity={hasCriticalAlert ? 2.5 : 1.5} color={hasCriticalAlert ? "#FF3864" : "#00E5FF"} />

        {/* Starfield particles */}
        {!isAccessibility && (
          <Stars
            radius={50}
            depth={50}
            count={isPerformance ? 1200 : 3500}
            factor={3}
            saturation={1}
            fade
            speed={isCinematic ? 0.8 : 0.3}
          />
        )}

        <Suspense fallback={null}>
          {children}
        </Suspense>

        {enableControls && !isAccessibility && (
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            maxDistance={25}
            minDistance={3}
            autoRotate={autoRotate}
            autoRotateSpeed={0.6}
            maxPolarAngle={Math.PI / 1.7}
          />
        )}

        {/* Selective Postprocessing for Cinematic Mode */}
        {isCinematic && (
          <EffectComposer multisampling={0}>
            <Bloom
              luminanceThreshold={0.25}
              luminanceSmoothing={0.9}
              intensity={hasCriticalAlert ? 1.8 : 1.1}
            />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
            {hasCriticalAlert ? (
              <ChromaticAberration
                offset={new Vector2(0.003, 0.003)}
                radialModulation={false}
                modulationOffset={0}
              />
            ) : <></>}
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
};
