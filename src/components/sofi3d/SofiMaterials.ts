/**
 * SofiMaterials — PBR Material Definitions (AutoCompt SOFI Entity)
 *
 * All material constants follow the Immutable SOFI Entity Definition
 * from .cursorrules §"The Immutable 3D SOFI Entity Definition".
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COLOR CONSTANTS (IMMUTABLE — DO NOT MODIFY)                ║
 * ║  White Ceramic panels:     #FFFFFF                         ║
 * ║  Titanium chassis:         #000000                         ║
 * ║  Emerald seam / glow:      #00D4B2                         ║
 * ║  Eye LED emerald:          #00D4B2  (brand identity match) ║
 * ║  Logo emissive:            #10b981                         ║
 * ║  Sapphire glass:           #0a1628  transparent            ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import * as THREE from "three";

// ── Brand Color Constants ────────────────────────────────────────────────────
export const COLOR_WHITE_CERAMIC  = new THREE.Color("#FFFFFF");
export const COLOR_TITANIUM_BLACK = new THREE.Color("#080808");
export const COLOR_EMERALD_SEAM   = new THREE.Color("#00D4B2");
export const COLOR_EYE_LED        = new THREE.Color("#00D4B2");
export const COLOR_LOGO_GREEN     = new THREE.Color("#10b981");
export const COLOR_SAPPHIRE       = new THREE.Color("#0a1628");
export const COLOR_CARBON_FIBER   = new THREE.Color("#0d0d10");
export const COLOR_SKIN_PORCELAIN = new THREE.Color("#f5e6d8");
export const COLOR_SKIN_SHADOW    = new THREE.Color("#e8c9a8");

// ── Factory Functions ─────────────────────────────────────────────────────────

/** High-gloss polished white ceramic — shoulder mantle & body panels */
export function createCeramicWhiteMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: COLOR_WHITE_CERAMIC,
    roughness: 0.05,
    metalness: 0.15,
    envMapIntensity: 1.2,
  });
}

/** Sandblasted matte black titanium — skeleton, joints, chassis */
export function createTitaniumBlackMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: COLOR_TITANIUM_BLACK,
    roughness: 0.88,
    metalness: 0.92,
    envMapIntensity: 0.4,
  });
}

/** Emerald seam emissive — the razor-sharp transition glow line */
export function createSeamEmissiveMaterial(intensity = 0.6): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: COLOR_EMERALD_SEAM,
    emissive: COLOR_EMERALD_SEAM,
    emissiveIntensity: intensity,
    roughness: 0.0,
    metalness: 0.0,
    transparent: false,
  });
}

/** Eye LED — digital emerald green matrix (#00D4B2) */
export function createEyeLEDMaterial(intensity = 1.2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: COLOR_EYE_LED,
    emissive: COLOR_EYE_LED,
    emissiveIntensity: intensity,
    roughness: 0.0,
    metalness: 0.0,
  });
}

/** Sapphire glass lens — anti-reflective curved bay cover */
export function createSapphireGlassMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: COLOR_SAPPHIRE,
    transparent: true,
    opacity: 0.55,
    roughness: 0.0,
    metalness: 0.05,
    envMapIntensity: 2.0,
    side: THREE.FrontSide,
  });
}

/** Carbon fiber chest alcove lining */
export function createCarbonFiberMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: COLOR_CARBON_FIBER,
    roughness: 0.95,
    metalness: 0.3,
  });
}

/** Logo AutoCompt emblem — emissive green */
export function createLogoEmissiveMaterial(intensity = 0.8): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: COLOR_LOGO_GREEN,
    emissive: COLOR_LOGO_GREEN,
    emissiveIntensity: intensity,
    roughness: 0.1,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
}

/** Human skin — porcelain with subtle warm tones */
export function createSkinMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: COLOR_SKIN_PORCELAIN,
    roughness: 0.75,
    metalness: 0.0,
    envMapIntensity: 0.3,
  });
}

/** Neck collar ring — dark metallic chrome */
export function createNeckCollarMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1a1a1a"),
    roughness: 0.3,
    metalness: 0.85,
  });
}
