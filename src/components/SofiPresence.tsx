/**
 * SofiPresence — Canonical PNG-based SOFI Entity Component
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  IMMUTABLE SOFI ENTITY — design_system_rules.md & .cursorrules      ║
 * ║                                                                      ║
 * ║  Asset Map (src/assets/sofi/):                                       ║
 * ║   • soficompletablanco.png      → Step 1 "Welcome" (waving)         ║
 * ║   • sofi completa mano baja.png → Idle / post-welcome (resting)     ║
 * ║   • sofimediocuerpoblanco.png   → Dashboard sidebar (half-body)     ║
 * ║                                                                      ║
 * ║  Strict Rules:                                                       ║
 * ║   • NO box shadows on container, NO borders, NO clip paths          ║
 * ║   • Background: radial-gradient emerald aura → transparent          ║
 * ║   • Framer Motion float: y[0,-6,0] / 4.5s / easeInOut              ║
 * ║   • Floor shadow ellipse synchronized to float animation            ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { motion } from "motion/react";

// ── Asset Imports ─────────────────────────────────────────────────────────────
import sofiWelcome  from "../assets/sofi/soficompletablanco.png";
import sofiIdle     from "../assets/sofi/sofi completa mano baja.png";
import sofiHalfBody from "../assets/sofi/sofimediocuerpoblanco.png";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Controls which SOFI asset is displayed */
export type SofiVariant =
  | "welcome"    // Step 1 onboarding — soficompletablanco.png (waving)
  | "idle"       // Post-welcome / subsequent steps — sofi completa mano baja.png
  | "halfbody";  // Dashboard sidebar / contextual panels — sofimediocuerpoblanco.png

export interface SofiPresenceProps {
  /** Asset variant to render */
  variant?: SofiVariant;
  /** Height of the image in pixels (width is auto) */
  height?: number;
  /** Extra Tailwind classes on the outermost wrapper */
  className?: string;
  /** Disable the floating animation (e.g. during low-power mode) */
  disableFloat?: boolean;
}

// ── Asset resolver ─────────────────────────────────────────────────────────────
const ASSET_MAP: Record<SofiVariant, string> = {
  welcome:  sofiWelcome,
  idle:     sofiIdle,
  halfbody: sofiHalfBody,
};

const ALT_MAP: Record<SofiVariant, string> = {
  welcome:  "S.O.F.I. — AutoCompt AI Assistant, welcoming stance",
  idle:     "S.O.F.I. — AutoCompt AI Assistant, executive resting stance",
  halfbody: "S.O.F.I. — AutoCompt AI Assistant, dashboard contextual panel",
};

// ── Framer Motion variants ─────────────────────────────────────────────────────
const FLOAT_DURATION = 4.5;

const floatTransition = {
  duration: FLOAT_DURATION,
  ease: "easeInOut" as const,
  repeat: Infinity,
  repeatType: "loop" as const,
};

// ── Component ─────────────────────────────────────────────────────────────────
export function SofiPresence({
  variant = "idle",
  height = 280,
  className = "",
  disableFloat = false,
}: SofiPresenceProps) {
  const src = ASSET_MAP[variant];
  const alt = ALT_MAP[variant];

  return (
    <div
      className={`relative flex flex-col items-center justify-end select-none ${className}`}
      style={{ height: height + 20 }} // +20 for shadow space
    >
      {/* ── Organic radial aura backdrop — eliminates hard rectangular outlines ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,178,0.10) 0%, transparent 65%)",
          backdropFilter: "blur(0px)",
          // NO border, NO box-shadow — strictly per directive §3
        }}
      />

      {/* ── Floating SOFI image container ── */}
      <motion.div
        className="relative z-10 bg-transparent"
        style={{ height }}
        animate={disableFloat ? undefined : { y: [0, -6, 0] }}
        transition={disableFloat ? undefined : floatTransition}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            height: "100%",
            width: "auto",
            objectFit: "contain",
            // Transparent background — NO background color, NO box artifacts
            background: "transparent",
            // No border, no shadow on image element itself
            border: "none",
            boxShadow: "none",
            // mix-blend-mode to seamlessly merge with dark backgrounds
            mixBlendMode: "normal",
          }}
        />
      </motion.div>

      {/* ── Dynamic floor shadow ellipse — synchronized to float ── */}
      {!disableFloat && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 mx-auto w-32 h-2 bg-black/30 rounded-full blur-sm"
          style={{ zIndex: 5 }}
          animate={{
            scale:   [1, 0.85, 1],
            opacity: [0.3, 0.15, 0.3],
          }}
          transition={floatTransition}
        />
      )}
    </div>
  );
}

export default SofiPresence;
