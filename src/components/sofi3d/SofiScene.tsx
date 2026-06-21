/**
 * SofiScene — WebGL Canvas Container + Environment + Post-Processing
 *
 * Architecture:
 *   • React Three Fiber <Canvas> with transparent background
 *   • Professional 3-point studio lighting matching PBR workflow
 *   • Bloom post-processing for emissive glow channels (#00D4B2 seam)
 *   • Vignette for cinematic depth
 *   • SofiHead + SofiTorso assembled in world space
 *   • Mouse tracking and state hooks wired to all geometry
 */

import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { SofiHead } from "./SofiHead";
import { SofiTorso } from "./SofiTorso";
import { useSofiState } from "./useSofiState";
import { useMouseTracking } from "./useMouseTracking";

interface SofiSceneProps {
  /** True when Scanner IA / document parsing is active */
  isProcessing?: boolean;
  /** Disable OrbitControls in production (only used for debug) */
  debugOrbit?: boolean;
}

function SofiModel({ isProcessing, debugOrbit }: SofiSceneProps) {
  const { pulseHz, emissiveIntensity } = useSofiState({ isProcessing });
  const mouseTracking = useMouseTracking();

  return (
    <>
      {/* ── 3-Point Studio Lighting ── */}

      {/* Key light — warm from upper-left front */}
      <directionalLight
        position={[1.5, 3.0, 2.5]}
        intensity={1.6}
        color={new THREE.Color("#f8f4ee")}
        castShadow={false}
      />

      {/* Fill light — cool from right */}
      <directionalLight
        position={[-2.0, 1.0, 1.5]}
        intensity={0.5}
        color={new THREE.Color("#d0e8ff")}
      />

      {/* Rim / back light — emerald teal from behind (brand identity) */}
      <pointLight
        position={[0, 2.0, -2.0]}
        intensity={1.2}
        color={new THREE.Color("#00D4B2")}
        distance={8}
        decay={2}
      />

      {/* Chest area fill — warm under-light */}
      <pointLight
        position={[0, -0.5, 1.5]}
        intensity={0.4}
        color={new THREE.Color("#10b981")}
        distance={3}
        decay={2}
      />

      {/* Ambient — low for dramatic shadows */}
      <ambientLight intensity={0.18} color={new THREE.Color("#0b1121")} />

      {/* ── SOFI Entity Assembly ── */}
      <group position={[0, -0.5, 0]}>
        <SofiHead
          mouseTracking={mouseTracking}
          emissiveIntensity={emissiveIntensity}
          pulseHz={pulseHz}
        />
        <SofiTorso
          pulseHz={pulseHz}
          emissiveIntensity={emissiveIntensity}
        />
      </group>

      {/* ── Post-Processing Effects ── */}
      <EffectComposer>
        {/* Bloom — highlights emissive emerald (#00D4B2) channels with glow */}
        <Bloom
          luminanceThreshold={0.35}
          luminanceSmoothing={0.85}
          intensity={1.4}
          mipmapBlur={true}
        />
        {/* Vignette — cinematic depth, darkens edges */}
        <Vignette offset={0.25} darkness={0.55} eskil={false} />
      </EffectComposer>

      {/* Environment — HDRI preset for PBR reflections */}
      <Environment preset="city" />

      {/* Debug orbit controls — disabled in production */}
      {debugOrbit && (
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={(3 * Math.PI) / 4}
        />
      )}
    </>
  );
}

/** Fallback shown while WebGL scene loads */
function SofiFallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#00D4B2",
        fontSize: "12px",
        fontFamily: "monospace",
        letterSpacing: "0.1em",
        opacity: 0.7,
      }}
    >
      SOFI •••
    </div>
  );
}

export function SofiScene({ isProcessing = false, debugOrbit = false }: SofiSceneProps) {
  return (
    <Canvas
      camera={{
        position: [0, 0, 2.2],
        fov: 42,
        near: 0.01,
        far: 50,
      }}
      gl={{
        antialias: true,
        alpha: true,              // transparent canvas bg
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{ background: "transparent" }}
      shadows={false}
      dpr={[1, 2]}               // responsive pixel ratio
    >
      <Suspense fallback={null}>
        <SofiModel isProcessing={isProcessing} debugOrbit={debugOrbit} />
      </Suspense>
    </Canvas>
  );
}
