/**
 * SofiHead — Hyperrealistic Hybrid Head Assembly
 *
 * Geometry split:
 *   FRONT hemisphere → Human Core (porcelain skin, LED eyes, professional expression)
 *   REAR  hemisphere → Android Core (polished white ceramic plates)
 *   SEAM             → Razor-sharp emissive torus ring (#00D4B2)
 *
 * Mouse tracking:
 *   The entire head group lerps toward targetRef angles each frame,
 *   clamped to ±15° per the .cursorrules spec.
 *
 * Eye LEDs:
 *   Glowing digital emerald green (#00D4B2) — breathing emissive pulse
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  createSkinMaterial,
  createCeramicWhiteMaterial,
  createTitaniumBlackMaterial,
  createSeamEmissiveMaterial,
  createEyeLEDMaterial,
  createNeckCollarMaterial,
  COLOR_EMERALD_SEAM,
  COLOR_EYE_LED,
} from "./SofiMaterials";
import { LERP_FACTOR, type MouseTrackingResult } from "./useMouseTracking";

interface SofiHeadProps {
  mouseTracking: MouseTrackingResult;
  /** Emissive intensity from useSofiState */
  emissiveIntensity?: number;
  pulseHz?: number;
}

export function SofiHead({
  mouseTracking,
  emissiveIntensity = 0.6,
  pulseHz = 0.8,
}: SofiHeadProps) {
  const headGroupRef = useRef<THREE.Group>(null!);
  const leftEyeMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const rightEyeMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const seamMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const crownMatRef = useRef<THREE.MeshStandardMaterial>(null!);

  const { targetRef, currentRef } = mouseTracking;

  useFrame(({ clock }) => {
    // ── Lerp head rotation toward mouse target ──
    currentRef.current.x += (targetRef.current.x - currentRef.current.x) * LERP_FACTOR;
    currentRef.current.y += (targetRef.current.y - currentRef.current.y) * LERP_FACTOR;

    if (headGroupRef.current) {
      headGroupRef.current.rotation.x = currentRef.current.x;
      headGroupRef.current.rotation.y = currentRef.current.y;
    }

    // ── Animate emissive elements (eyes + seam) ──
    const t = clock.getElapsedTime();
    const pulse = 0.5 + 0.5 * Math.sin(t * pulseHz * Math.PI * 2);
    const eyeIntensity = emissiveIntensity * (0.6 + 0.4 * pulse);

    if (leftEyeMatRef.current) leftEyeMatRef.current.emissiveIntensity = eyeIntensity;
    if (rightEyeMatRef.current) rightEyeMatRef.current.emissiveIntensity = eyeIntensity;
    if (seamMatRef.current) seamMatRef.current.emissiveIntensity = emissiveIntensity * (0.4 + 0.6 * pulse);
    if (crownMatRef.current) crownMatRef.current.emissiveIntensity = emissiveIntensity * 0.4 * pulse;
  });

  // Pre-create stable materials
  const skinMat = createSkinMaterial();
  const ceramicMat = createCeramicWhiteMaterial();
  const titaniumMat = createTitaniumBlackMaterial();
  const neckMat = createNeckCollarMaterial();

  return (
    <group ref={headGroupRef} position={[0, 0.92, 0]}>

      {/* ════════════════════════════════════════════════════
          REAR HEMISPHERE — Android Core (ceramic white)
          phiStart = π → renders the back half
      ════════════════════════════════════════════════════ */}
      <mesh>
        <sphereGeometry args={[0.42, 64, 32, Math.PI, Math.PI, 0, Math.PI]} />
        <primitive object={ceramicMat} attach="material" />
      </mesh>

      {/* ════════════════════════════════════════════════════
          FRONT HEMISPHERE — Human Core (porcelain skin)
          phiStart = 0, phiLength = π → renders the front half
      ════════════════════════════════════════════════════ */}
      <mesh>
        <sphereGeometry args={[0.42, 64, 32, 0, Math.PI, 0, Math.PI]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* ════════════════════════════════════════════════════
          TRANSITION SEAM — Razor emissive torus ring
          Sits at the equator (Y=0 of head), ultra-thin tube
      ════════════════════════════════════════════════════ */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.007, 16, 120]} />
        <meshStandardMaterial
          ref={seamMatRef}
          color={COLOR_EMERALD_SEAM}
          emissive={COLOR_EMERALD_SEAM}
          emissiveIntensity={emissiveIntensity}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>

      {/* ════════════════════════════════════════════════════
          CROWN ACCENT STRIP — top emissive line
      ════════════════════════════════════════════════════ */}
      <mesh position={[0, 0.42, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.22, 0.004, 8, 80, Math.PI]} />
        <meshStandardMaterial
          ref={crownMatRef}
          color={COLOR_EMERALD_SEAM}
          emissive={COLOR_EMERALD_SEAM}
          emissiveIntensity={0.3}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>

      {/* ════════════════════════════════════════════════════
          FACE FEATURES — Eyes, Brow ridge
      ════════════════════════════════════════════════════ */}

      {/* Left Eye LED — Glowing digital emerald (#00D4B2) */}
      <mesh position={[-0.13, 0.08, 0.36]}>
        <capsuleGeometry args={[0.028, 0.055, 8, 16]} />
        <meshStandardMaterial
          ref={leftEyeMatRef}
          color={COLOR_EYE_LED}
          emissive={COLOR_EYE_LED}
          emissiveIntensity={emissiveIntensity}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>

      {/* Left Eye inner highlight */}
      <mesh position={[-0.12, 0.1, 0.39]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial
          color={new THREE.Color("#ffffff")}
          roughness={0.0}
          metalness={0.0}
          transparent={true}
          opacity={0.5}
        />
      </mesh>

      {/* Right Eye LED — Glowing digital emerald (#00D4B2) */}
      <mesh position={[0.13, 0.08, 0.36]}>
        <capsuleGeometry args={[0.028, 0.055, 8, 16]} />
        <meshStandardMaterial
          ref={rightEyeMatRef}
          color={COLOR_EYE_LED}
          emissive={COLOR_EYE_LED}
          emissiveIntensity={emissiveIntensity}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>

      {/* Right Eye inner highlight */}
      <mesh position={[0.14, 0.1, 0.39]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial
          color={new THREE.Color("#ffffff")}
          roughness={0.0}
          metalness={0.0}
          transparent={true}
          opacity={0.5}
        />
      </mesh>

      {/* Brow ridge — subtle titanium bar above eyes */}
      <mesh position={[0, 0.14, 0.37]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.34, 0.016, 0.028]} />
        <primitive object={titaniumMat} attach="material" />
      </mesh>

      {/* Nose bridge — minimal subtle feature */}
      <mesh position={[0, -0.04, 0.4]}>
        <boxGeometry args={[0.03, 0.09, 0.04]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* Lip curl — confident micro-expression bar */}
      <mesh position={[0, -0.16, 0.38]}>
        <boxGeometry args={[0.16, 0.012, 0.02]} />
        <meshStandardMaterial
          color={new THREE.Color("#c8927a")}
          roughness={0.6}
          metalness={0.0}
        />
      </mesh>

      {/* ════════════════════════════════════════════════════
          ANDROID CHASSIS DETAILS — Rear panels
      ════════════════════════════════════════════════════ */}

      {/* Left rear panel — polished ceramic plate */}
      <mesh position={[-0.3, 0, -0.22]} rotation={[0, -0.4, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.04]} />
        <primitive object={ceramicMat} attach="material" />
      </mesh>

      {/* Right rear panel — polished ceramic plate */}
      <mesh position={[0.3, 0, -0.22]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.04]} />
        <primitive object={ceramicMat} attach="material" />
      </mesh>

      {/* ════════════════════════════════════════════════════
          NECK ARTICULATION COLLARS
      ════════════════════════════════════════════════════ */}

      {/* Neck collar top — chrome ring */}
      <mesh position={[0, -0.46, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.18, 0.022, 12, 60]} />
        <primitive object={neckMat} attach="material" />
      </mesh>

      {/* Neck collar emerald accent ring */}
      <mesh position={[0, -0.51, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.17, 0.006, 8, 60]} />
        <meshStandardMaterial
          color={COLOR_EMERALD_SEAM}
          emissive={COLOR_EMERALD_SEAM}
          emissiveIntensity={0.4}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>

      {/* Neck cylinder — titanium */}
      <mesh position={[0, -0.58, 0]}>
        <cylinderGeometry args={[0.155, 0.18, 0.22, 32]} />
        <primitive object={titaniumMat} attach="material" />
      </mesh>

      {/* Neck collar bottom — chrome ring */}
      <mesh position={[0, -0.68, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.185, 0.025, 12, 60]} />
        <primitive object={neckMat} attach="material" />
      </mesh>
    </group>
  );
}
