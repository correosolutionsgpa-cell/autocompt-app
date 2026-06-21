/**
 * SofiChestCore — Sacred Brand Core (Torso Logo Integration)
 *
 * Renders the recessed circular chest bay sealed under a curved
 * anti-reflective PBR Sapphire Glass lens, with the AutoCompt logo
 * as a physical 3D emblem with breathing emissive green pulse.
 *
 * Architecture per .cursorrules §"The Sacred Brand Core":
 *   • Recessed CylinderGeometry alcove (carbon fiber lining)
 *   • Curved CircleGeometry Sapphire Glass lens (transparent PBR)
 *   • Logo: useTexture() mapped onto PlaneGeometry floating inside bay
 *   • Emissive pulse synchronized to pulseHz from useSofiState
 */

import { useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import {
  createCarbonFiberMaterial,
  createSapphireGlassMaterial,
  createLogoEmissiveMaterial,
  createCeramicWhiteMaterial,
  COLOR_EMERALD_SEAM,
} from "./SofiMaterials";

// Import logo asset
import logoUrl from "../../assets/brand/autocompt-logo-final.png";

interface SofiChestCoreProps {
  /** Pulse frequency Hz — from useSofiState */
  pulseHz?: number;
  /** Base emissive intensity */
  emissiveIntensity?: number;
}

export function SofiChestCore({
  pulseHz = 0.8,
  emissiveIntensity = 0.8,
}: SofiChestCoreProps) {
  const logoTexture = useLoader(TextureLoader, logoUrl);
  
  // Material refs for animation
  const logoMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const rimMatRef = useRef<THREE.MeshStandardMaterial>(null!);

  // Animate emissive pulse synchronized to pulseHz
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Sinusoidal breathing: oscillates between base/4 and full intensity
    const pulse = 0.5 + 0.5 * Math.sin(t * pulseHz * Math.PI * 2);
    
    if (logoMatRef.current) {
      logoMatRef.current.emissiveIntensity = emissiveIntensity * (0.4 + 0.6 * pulse);
    }
    if (rimMatRef.current) {
      rimMatRef.current.emissiveIntensity = 0.5 * (0.3 + 0.7 * pulse);
    }
  });

  // Pre-create materials
  const carbonMat = createCarbonFiberMaterial();
  const sapphireMat = createSapphireGlassMaterial();
  const ceramicMat = createCeramicWhiteMaterial();

  return (
    // Centered on the torso front face
    <group position={[0, 0.05, 0.28]}>
      
      {/* ── Outer ceramic ring frame ── */}
      <mesh>
        <cylinderGeometry args={[0.22, 0.22, 0.035, 48, 1, true]} />
        <primitive object={ceramicMat} attach="material" />
      </mesh>

      {/* ── Emissive accent rim (emerald glow) ── */}
      <mesh>
        <torusGeometry args={[0.22, 0.008, 16, 80]} />
        <meshStandardMaterial
          ref={rimMatRef}
          color={COLOR_EMERALD_SEAM}
          emissive={COLOR_EMERALD_SEAM}
          emissiveIntensity={0.5}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>

      {/* ── Recessed carbon-fiber alcove bay ── */}
      <mesh position={[0, -0.01, -0.005]}>
        <cylinderGeometry args={[0.195, 0.195, 0.025, 48]} />
        <primitive object={carbonMat} attach="material" />
      </mesh>

      {/* ── Logo texture plane (suspended inside bay) ── */}
      <mesh position={[0, -0.005, 0.005]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.32, 0.32]} />
        <meshStandardMaterial
          ref={logoMatRef}
          map={logoTexture}
          emissiveMap={logoTexture}
          emissive={new THREE.Color("#10b981")}
          emissiveIntensity={emissiveIntensity}
          transparent={true}
          roughness={0.1}
          metalness={0.0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Sapphire Glass lens cover (on top of bay) ── */}
      <mesh position={[0, 0.015, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.195, 64]} />
        <primitive object={sapphireMat} attach="material" />
      </mesh>
    </group>
  );
}
