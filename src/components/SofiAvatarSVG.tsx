/**
 * SofiAvatarSVG — canonical AutoCompt SOFI brand avatar
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  IMMUTABLE SOFI ENTITY DEFINITION — design_system_rules.md & .cursorrules
 * ║  DO NOT alter colors, text labels, chest logo, or proportions.
 * ║
 * ║  Anatomy (all values are LAW):
 * ║    • Body panels:         #FFFFFF  — Polished White
 * ║    • Chassis / joints:    #000000  — Matte Black
 * ║    • Accent lights:       #00D4B2  — Emerald Teal (joints & edge glow)
 * ║    • Face screen fill:    #001A12  — Deep emerald-black
 * ║    • Eye / smile color:   #00FF88  — Bright green geometric expression
 * ║    • Chest logo:          Inline SVG replica of logo_3.png anatomy:
 * ║                           black rounded-square background,
 * ║                           green star, plus sign, open circle
 * ║    • Engraved texts:      "S.O.F.I."  (body front)
 * ║                           "VERSION 1.0"  (leg plate)
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Props
 *   size        – width in px (default 160); height = size × 1.25
 *   className   – extra CSS classes on the wrapper <div>
 *   floatAnim   – if true, adds the 6s gentle hover animation (§6)
 *   showShadow  – 'none' | 'soft' | 'cyan'
 *   onClick     – optional click handler
 */

import React, { useEffect } from "react";

// ── Keyframe injection ────────────────────────────────────────────────────────
function injectKeyframes() {
  const id = "sofi-avatar-keyframes";
  if (typeof document === "undefined" || document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    @keyframes sofiRobotFloat {
      0%, 100% { transform: translateY(0px);   }
      50%       { transform: translateY(-10px); }
    }
    @keyframes sofiAccentPulse {
      0%, 100% { opacity: 0.7; }
      50%       { opacity: 1;   }
    }
    @keyframes sofiEyeBlink {
      0%, 90%, 100% { transform: scaleY(1); }
      95%           { transform: scaleY(0.08); }
    }
    @keyframes sofiScreenScan {
      0%   { opacity: 0.15; transform: translateY(-20px); }
      100% { opacity: 0;    transform: translateY(52px);  }
    }
  `;
  document.head.appendChild(style);
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SofiAvatarSVGProps {
  size?: number;
  className?: string;
  floatAnim?: boolean;
  showShadow?: "none" | "soft" | "cyan";
  onClick?: () => void;
}

// ── IMMUTABLE COLOR CONSTANTS ─────────────────────────────────────────────────
/** Polished White — body panels */
const C_WHITE  = "#FFFFFF";
/** Matte Black — chassis, joints, face screen base */
const C_BLACK  = "#000000";
/** Emerald Teal #00D4B2 — accent lights on joints */
const C_ACCENT = "#00D4B2";
/** Bright screen green — eyes, smile, scan line */
const C_GREEN  = "#00FF88";
/** Deep screen background */
const C_SCREEN = "#001A12";
/** Subtle panel edge tint */
const C_EDGE   = "#D4D4D8";

// ── Component ─────────────────────────────────────────────────────────────────
export function SofiAvatarSVG({
  size = 160,
  className = "",
  floatAnim = false,
  showShadow = "soft",
  onClick,
}: SofiAvatarSVGProps) {
  useEffect(() => { injectKeyframes(); }, []);

  const shadowClass =
    showShadow === "cyan"
      ? "drop-shadow-[0_8px_24px_rgba(0,212,178,0.40)]"
      : showShadow === "soft"
        ? "drop-shadow-[0_4px_16px_rgba(0,0,0,0.20)]"
        : "";

  const floatStyle: React.CSSProperties = floatAnim
    ? { animation: "sofiRobotFloat 6s ease-in-out infinite" }
    : {};

  // Unique IDs per instance (avoids conflicts with multiple mounted avatars)
  const uid   = React.useId().replace(/:/g, "");
  const bId   = `sofiBody-${uid}`;     // white panel gradient
  const jId   = `sofiJoint-${uid}`;    // black joint gradient
  const gId   = `sofiGlow-${uid}`;     // screen glow filter
  const aId   = `sofiAccent-${uid}`;   // accent teal gradient
  const cId   = `sofiClip-${uid}`;     // chest logo clip

  return (
    <div
      className={`relative select-none ${className}`}
      style={{ width: size, height: Math.round(size * 1.25), ...floatStyle }}
      onClick={onClick}
    >
      <svg
        viewBox="0 0 160 200"
        width={size}
        height={Math.round(size * 1.25)}
        className={shadowClass}
        aria-label="SOFI – AutoCompt AI Assistant"
        role="img"
      >
        <defs>
          {/* ── Polished White panel gradient ── */}
          <linearGradient id={bId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={C_WHITE} />
            <stop offset="50%"  stopColor="#F8F8F8" />
            <stop offset="100%" stopColor="#E0E0E2" />
          </linearGradient>

          {/* ── Matte Black joint gradient ── */}
          <linearGradient id={jId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#1A1A1A" />
            <stop offset="100%" stopColor={C_BLACK} />
          </linearGradient>

          {/* ── Emerald Teal accent gradient ── */}
          <linearGradient id={aId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={C_ACCENT} stopOpacity="0.9" />
            <stop offset="100%" stopColor="#00B89A"  stopOpacity="0.7" />
          </linearGradient>

          {/* ── Screen glow filter ── */}
          <filter id={gId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* ── Chest logo clipPath ── */}
          <clipPath id={cId}>
            <rect x="0" y="0" width="44" height="36" rx="8" />
          </clipPath>
        </defs>

        {/* ════════════════════════════════════════════════════════════
            LEGS & FEET
            Panels: Polished White (#FFFFFF)
            Hip joint: Matte Black (#000000)
            Accent ring on knee: Emerald Teal (#00D4B2)
        ═════════════════════════════════════════════════════════════ */}

        {/* Hip crossbar joint — Matte Black */}
        <rect x="60" y="160" width="40" height="8" rx="4"
          fill={`url(#${jId})`} stroke={C_BLACK} strokeWidth="0.5" />
        {/* Accent line on hip — Emerald Teal */}
        <rect x="64" y="162.5" width="32" height="2" rx="1"
          fill={`url(#${aId})`}
          style={{ animation: "sofiAccentPulse 2.4s ease-in-out infinite" }} />

        {/* Left leg — Polished White */}
        <path d="M62,168 L62,190 C62,193 72,193 72,190 L72,168 Z"
          fill={`url(#${bId})`} stroke={C_EDGE} strokeWidth="0.6" />
        {/* Left knee accent ring */}
        <circle cx="67" cy="172" r="3.5" fill={C_BLACK} />
        <circle cx="67" cy="172" r="2"   fill={C_ACCENT}
          style={{ animation: "sofiAccentPulse 2.4s ease-in-out infinite" }} />
        {/* Left foot */}
        <ellipse cx="67" cy="192" rx="7" ry="3"
          fill={`url(#${jId})`} stroke={C_BLACK} strokeWidth="0.4" />

        {/* Right leg — Polished White */}
        <path d="M88,168 L88,190 C88,193 98,193 98,190 L98,168 Z"
          fill={`url(#${bId})`} stroke={C_EDGE} strokeWidth="0.6" />
        {/* Right knee accent ring */}
        <circle cx="93" cy="172" r="3.5" fill={C_BLACK} />
        <circle cx="93" cy="172" r="2"   fill={C_ACCENT}
          style={{ animation: "sofiAccentPulse 2.4s ease-in-out infinite 0.3s" }} />
        {/* Right foot */}
        <ellipse cx="93" cy="192" rx="7" ry="3"
          fill={`url(#${jId})`} stroke={C_BLACK} strokeWidth="0.4" />

        {/* VERSION 1.0 — engraved on leg plate (IMMUTABLE) */}
        <text x="80" y="198" textAnchor="middle"
          fontSize="4.5" fontFamily="monospace" fontWeight="bold" letterSpacing="0.5"
          fill={C_ACCENT} opacity="0.85">
          VERSION 1.0
        </text>

        {/* ════════════════════════════════════════════════════════════
            TORSO
            Polished White body + Matte Black neck joint
            Accent lights at shoulder and neck
        ═════════════════════════════════════════════════════════════ */}

        {/* Neck joint — Matte Black */}
        <rect x="71" y="84" width="18" height="14" rx="3"
          fill={`url(#${jId})`} stroke={C_BLACK} strokeWidth="0.5" />
        {/* Neck accent stripe */}
        <rect x="73" y="89" width="14" height="2" rx="1"
          fill={`url(#${aId})`}
          style={{ animation: "sofiAccentPulse 2s ease-in-out infinite 0.5s" }} />

        {/* Torso body — Polished White */}
        <path
          d="M48,98 L112,98 C118,98 120,104 118,112 L106,154 C104,160 97,162 80,162 C63,162 56,160 54,154 L42,112 C40,104 42,98 48,98 Z"
          fill={`url(#${bId})`} stroke={C_EDGE} strokeWidth="0.6"
        />
        {/* Torso centerline groove (detail) */}
        <line x1="80" y1="100" x2="80" y2="155"
          stroke={C_BLACK} strokeWidth="0.4" opacity="0.12" />

        {/* ════════════════════════════════════════════════════════════
            CHEST LOGO PANEL — AutoCompt Canonical Logo
            Source: logo-preview.html (single source of truth)
            Anatomy:
              • Black squircle bg (#000000) + #059669 glow border
              • Sparkle star outline (#10b981) — stroke-only, no fill
              • Plus sign (+) outline (#10b981) — top-right detail
              • Open circle (○) outline (#10b981) — bottom-left detail
            Rule: this block MUST NOT be removed or replaced.
        ═════════════════════════════════════════════════════════════ */}
        <g transform="translate(56,104)">
          {/* Black squircle background + emerald glow border */}
          {/* Scaled from logo-preview.html viewBox 128×128 → 48×48 px chest */}
          <svg viewBox="0 0 128 128" width="48" height="48" overflow="visible">
            {/* Squircle background — exact from logo-preview.html */}
            <path
              d="M 64,4 C 108,4 124,20 124,64 C 124,108 108,124 64,124 C 20,124 4,108 4,64 C 4,20 20,4 64,4 Z"
              fill="#000000"
              stroke="#059669"
              strokeWidth="2"
              strokeOpacity="0.35"
            />

            {/* Logo icon group — exact from logo-preview.html */}
            <g transform="translate(28,28) scale(3.0)" strokeLinejoin="round">
              {/* Main sparkle star — outline only, #10b981 */}
              <path
                d="m12 3-1.9 5.8c-.1.3-.4.6-.7.7L3.6 12l5.8 1.9c.3.1.6.4.7.7L12 21l1.9-5.8c.1-.3.4-.6.7-.7l5.8-1.9-5.8-1.9c-.3-.1-.6-.4-.7-.7L12 3z"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              {/* Plus sign (+) — top-right detail */}
              <path
                d="M18 4.5v3M16.5 6h3"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Open circle (○) — bottom-left detail */}
              <circle
                cx="6" cy="18" r="1.5"
                stroke="#10b981"
                strokeWidth="1.5"
                fill="none"
              />
            </g>
          </svg>

          {/* S.O.F.I. — engraved below logo (IMMUTABLE) */}
          <text x="24" y="55" textAnchor="middle"
            fontSize="6" fontFamily="monospace" fontWeight="900"
            letterSpacing="1.8" fill={C_ACCENT}>
            S.O.F.I.
          </text>
        </g>

        {/* ════════════════════════════════════════════════════════════
            LEFT ARM
            Panels: Polished White
            Shoulder ball: Matte Black socket + Teal accent ring
            Elbow joint: Matte Black + Teal accent
        ═════════════════════════════════════════════════════════════ */}

        {/* Left shoulder socket — Matte Black */}
        <circle cx="42" cy="108" r="7" fill={`url(#${jId})`} stroke={C_BLACK} strokeWidth="0.5" />
        {/* Left shoulder teal ring */}
        <circle cx="42" cy="108" r="4.5" fill="none" stroke={C_ACCENT} strokeWidth="1.2"
          style={{ animation: "sofiAccentPulse 3s ease-in-out infinite 0.2s" }} />

        {/* Left upper arm — Polished White */}
        <path d="M40,108 L27,86 C25,83 28,80 30,82 L43,104 Z"
          fill={`url(#${bId})`} stroke={C_EDGE} strokeWidth="0.6" />
        {/* Left elbow joint */}
        <circle cx="28" cy="84" r="5" fill={`url(#${jId})`} />
        <circle cx="28" cy="84" r="3" fill="none" stroke={C_ACCENT} strokeWidth="1"
          style={{ animation: "sofiAccentPulse 3s ease-in-out infinite 0.8s" }} />

        {/* Left forearm — Polished White */}
        <path d="M28,84 L28,54 C28,51 32,51 32,54 L32,84 Z"
          fill={`url(#${bId})`} stroke={C_EDGE} strokeWidth="0.5" />
        {/* Left wrist cap */}
        <circle cx="30" cy="52" r="5" fill={`url(#${bId})`} stroke={C_EDGE} strokeWidth="0.5" />
        {/* Left wrist teal bolt */}
        <circle cx="30" cy="52" r="2" fill={C_ACCENT} opacity="0.8" />

        {/* Left shoulder blade ellipse — Polished White */}
        <ellipse cx="32" cy="54" rx="7" ry="13"
          fill={`url(#${bId})`} stroke={C_EDGE} strokeWidth="0.5" />
        {/* Chassis stripe on shoulder */}
        <rect x="29.5" y="45" width="4" height="18" rx="1" fill={`url(#${jId})`} />

        {/* ════════════════════════════════════════════════════════════
            RIGHT ARM (mirror of left)
        ═════════════════════════════════════════════════════════════ */}

        {/* Right shoulder socket */}
        <circle cx="118" cy="108" r="7" fill={`url(#${jId})`} stroke={C_BLACK} strokeWidth="0.5" />
        <circle cx="118" cy="108" r="4.5" fill="none" stroke={C_ACCENT} strokeWidth="1.2"
          style={{ animation: "sofiAccentPulse 3s ease-in-out infinite 0.4s" }} />

        {/* Right upper arm — Polished White */}
        <path d="M120,108 L133,86 C135,83 132,80 130,82 L117,104 Z"
          fill={`url(#${bId})`} stroke={C_EDGE} strokeWidth="0.6" />
        {/* Right elbow */}
        <circle cx="132" cy="84" r="5" fill={`url(#${jId})`} />
        <circle cx="132" cy="84" r="3" fill="none" stroke={C_ACCENT} strokeWidth="1"
          style={{ animation: "sofiAccentPulse 3s ease-in-out infinite 1.0s" }} />

        {/* Right forearm */}
        <path d="M132,84 L132,54 C132,51 128,51 128,54 L128,84 Z"
          fill={`url(#${bId})`} stroke={C_EDGE} strokeWidth="0.5" />
        {/* Right wrist */}
        <circle cx="130" cy="52" r="5" fill={`url(#${bId})`} stroke={C_EDGE} strokeWidth="0.5" />
        <circle cx="130" cy="52" r="2" fill={C_ACCENT} opacity="0.8" />

        {/* Right shoulder blade ellipse */}
        <ellipse cx="128" cy="54" rx="7" ry="13"
          fill={`url(#${bId})`} stroke={C_EDGE} strokeWidth="0.5" />
        <rect x="126.5" y="45" width="4" height="18" rx="1" fill={`url(#${jId})`} />

        {/* ════════════════════════════════════════════════════════════
            HEAD SHELL
            Polished White outer dome
            Matte Black chassis rim
            Emerald Teal crown accent light strip
        ═════════════════════════════════════════════════════════════ */}

        {/* Head shell — Polished White */}
        <rect x="33" y="13" width="94" height="76" rx="32" ry="32"
          fill={`url(#${bId})`} stroke={C_EDGE} strokeWidth="0.6" />

        {/* Crown accent strip — Emerald Teal (immutable identity light) */}
        <rect x="50" y="13" width="60" height="4" rx="2"
          fill={`url(#${aId})`}
          style={{ animation: "sofiAccentPulse 2.6s ease-in-out infinite" }} />

        {/* Chassis rim around head — Matte Black */}
        <rect x="33" y="13" width="94" height="76" rx="32" ry="32"
          fill="none" stroke={C_BLACK} strokeWidth="1.2" />

        {/* ════════════════════════════════════════════════════════════
            FACE SCREEN
            Deep emerald-black fill (#001A12)
            Bright green geometric expressions:
              • Two rectangular eyes with blink animation
              • Curved smile (arc)
              • Horizontal scan line sweep
        ═════════════════════════════════════════════════════════════ */}

        {/* Face screen bezel — Matte Black frame */}
        <rect x="42" y="22" width="76" height="56" rx="20" ry="20"
          fill={C_BLACK} stroke={C_BLACK} strokeWidth="1.5" />

        {/* Face screen display — deep emerald-black */}
        <rect x="44" y="24" width="72" height="52" rx="19" ry="19"
          fill={C_SCREEN} />

        {/* Scan line — subtle green sweep across screen */}
        <rect x="44" y="24" width="72" height="4" rx="2"
          fill={C_GREEN} opacity="0.08"
          style={{ animation: "sofiScreenScan 2.8s linear infinite" }} />

        {/* Left eye — bright green rectangle, blink animation */}
        <g style={{ transformOrigin: "62px 46px", animation: "sofiEyeBlink 4s ease-in-out infinite" }}>
          <rect x="57" y="37" width="10" height="18" rx="5"
            fill={C_GREEN} filter={`url(#${gId})`} />
          {/* Pupil glint */}
          <rect x="59" y="39" width="3" height="4" rx="1.5"
            fill={C_WHITE} opacity="0.4" />
        </g>

        {/* Right eye — bright green rectangle, blink animation (offset) */}
        <g style={{ transformOrigin: "98px 46px", animation: "sofiEyeBlink 4s ease-in-out infinite 0.15s" }}>
          <rect x="93" y="37" width="10" height="18" rx="5"
            fill={C_GREEN} filter={`url(#${gId})`} />
          {/* Pupil glint */}
          <rect x="95" y="39" width="3" height="4" rx="1.5"
            fill={C_WHITE} opacity="0.4" />
        </g>

        {/* Smile — friendly geometric arc */}
        <path d="M 67 62 Q 80 72 93 62"
          fill="none" stroke={C_GREEN} strokeWidth="2.8" strokeLinecap="round"
          filter={`url(#${gId})`} />

        {/* Cheek accent dots — Emerald Teal */}
        <circle cx="50" cy="52" r="2.5" fill={C_ACCENT} opacity="0.6" />
        <circle cx="110" cy="52" r="2.5" fill={C_ACCENT} opacity="0.6" />

      </svg>
    </div>
  );
}

export default SofiAvatarSVG;
