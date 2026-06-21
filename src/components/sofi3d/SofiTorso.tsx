/**
 * SofiTorso — Android Chassis Body
 *
 * Renders the shoulder mantle, torso body, and arm stumps
 * in high-gloss polished white ceramic with matte titanium joints.
 *
 * Layout:
 *   • Main torso capsule — ceramic white
 *   • Left & right shoulder mantle plates — ceramic white
 *   • Shoulder ball joints — titanium black + emerald teal ring
 *   • SofiChestCore embedded at front center
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  createCeramicWhiteMaterial,
  createTitaniumBlackMaterial,
  createNeckCollarMaterial,
  COLOR_EMERALD_SEAM,
} from "./SofiMaterials";
import { SofiChestCore } from "./SofiChestCore";

interface SofiTorsoProps {
  pulseHz?: number;
  emissiveIntensity?: number;
}

export function SofiTorso({ pulseHz = 0.8, emissiveIntensity = 0.6 }: SofiTorsoProps) {
  const leftShoulderRingRef = useRef<THREE.MeshStandardMaterial>(null!);
  const rightShoulderRingRef = useRef<THREE.MeshStandardMaterial>(null!);

  // Animate shoulder accent rings in sync with pulse
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.5 + 0.5 * Math.sin(t * pulseHz * Math.PI * 2 + 1.0);
    const ringIntensity = emissiveIntensity * 0.4 * pulse;

    if (leftShoulderRingRef.current) leftShoulderRingRef.current.emissiveIntensity = ringIntensity;
    if (rightShoulderRingRef.current) rightShoulderRingRef.current.emissiveIntensity = ringIntensity;
  });

  const ceramicMat = createCeramicWhiteMaterial();
  const ceramicMat2 = createCeramicWhiteMaterial();
  const ceramicMat3 = createCeramicWhiteMaterial();
  const titaniumMat = createTitaniumBlackMaterial();
  const titaniumMat2 = createTitaniumBlackMaterial();
  const titaniumMat3 = createTitaniumBlackMaterial();
  const titaniumMat4 = createTitaniumBlackMaterial();
  const neckPlate = createNeckCollarMaterial();

  return (
    <group position={[0, 0, 0]}>

      {/* ════════════════════════════════════════════════════
          MAIN TORSO BODY
      ════════════════════════════════════════════════════ */}

      {/* Torso capsule — polished white ceramic */}
      <mesh position={[0, 0.12, 0]}>
        <capsuleGeometry args={[0.36, 0.55, 12, 32]} />
        <primitive object={ceramicMat} attach="material" />
      </mesh>

      {/* Torso front plate highlight (subtle rounded box on front) */}
      <mesh position={[0, 0.14, 0.3]}>
        <boxGeometry args={[0.5, 0.55, 0.06]} />
        <primitive object={ceramicMat2} attach="material" />
      </mesh>

      {/* Centerline groove — titanium strip */}
      <mesh position={[0, 0.1, 0.33]}>
        <boxGeometry args={[0.018, 0.48, 0.015]} />
        <primitive object={titaniumMat} attach="material" />
      </mesh>

      {/* ════════════════════════════════════════════════════
          SHOULDER MANTLE PLATES
      ════════════════════════════════════════════════════ */}

      {/* Left shoulder mantle — wide ceramic plate */}
      <mesh position={[-0.56, 0.48, 0]} rotation={[0, 0.15, -0.25]}>
        <boxGeometry args={[0.38, 0.18, 0.26]} />
        <primitive object={ceramicMat3} attach="material" />
      </mesh>

      {/* Right shoulder mantle — wide ceramic plate */}
      <mesh position={[0.56, 0.48, 0]} rotation={[0, -0.15, 0.25]}>
        <boxGeometry args={[0.38, 0.18, 0.26]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.05} metalness={0.15} />
      </mesh>

      {/* ════════════════════════════════════════════════════
          SHOULDER BALL JOINTS — Titanium + Emerald Ring
      ════════════════════════════════════════════════════ */}

      {/* Left shoulder ball — matte titanium */}
      <mesh position={[-0.52, 0.44, 0]}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <primitive object={titaniumMat2} attach="material" />
      </mesh>
      {/* Left shoulder emerald teal ring */}
      <mesh position={[-0.52, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.008, 8, 48]} />
        <meshStandardMaterial
          ref={leftShoulderRingRef}
          color={COLOR_EMERALD_SEAM}
          emissive={COLOR_EMERALD_SEAM}
          emissiveIntensity={0.3}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>

      {/* Right shoulder ball — matte titanium */}
      <mesh position={[0.52, 0.44, 0]}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <primitive object={titaniumMat3} attach="material" />
      </mesh>
      {/* Right shoulder emerald teal ring */}
      <mesh position={[0.52, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.008, 8, 48]} />
        <meshStandardMaterial
          ref={rightShoulderRingRef}
          color={COLOR_EMERALD_SEAM}
          emissive={COLOR_EMERALD_SEAM}
          emissiveIntensity={0.3}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>

      {/* ════════════════════════════════════════════════════
          UPPER ARMS (stubs — visible at sides of torso)
      ════════════════════════════════════════════════════ */}

      {/* Left upper arm stub */}
      <mesh position={[-0.56, 0.2, 0]} rotation={[0, 0, Math.PI / 8]}>
        <capsuleGeometry args={[0.09, 0.28, 8, 16]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.05} metalness={0.15} />
      </mesh>

      {/* Right upper arm stub */}
      <mesh position={[0.56, 0.2, 0]} rotation={[0, 0, -Math.PI / 8]}>
        <capsuleGeometry args={[0.09, 0.28, 8, 16]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.05} metalness={0.15} />
      </mesh>

      {/* ════════════════════════════════════════════════════
          CLAVICLE PLATE — horizontal bar at top of chest
      ════════════════════════════════════════════════════ */}
      <mesh position={[0, 0.55, 0.2]}>
        <boxGeometry args={[0.62, 0.06, 0.18]} />
        <primitive object={titaniumMat4} attach="material" />
      </mesh>

      {/* Clavicle emerald accent line */}
      <mesh position={[0, 0.56, 0.28]}>
        <boxGeometry args={[0.56, 0.006, 0.006]} />
        <meshStandardMaterial
          color={COLOR_EMERALD_SEAM}
          emissive={COLOR_EMERALD_SEAM}
          emissiveIntensity={0.5}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>

      {/* Upper chest connector plate */}
      <mesh position={[0, 0.48, 0.26]}>
        <boxGeometry args={[0.28, 0.04, 0.02]} />
        <primitive object={neckPlate} attach="material" />
      </mesh>

      {/* ════════════════════════════════════════════════════
          SACRED CHEST CORE — Logo Bay (embedded)
      ════════════════════════════════════════════════════ */}
      <SofiChestCore pulseHz={pulseHz} emissiveIntensity={emissiveIntensity} />

    </group>
  );
}
