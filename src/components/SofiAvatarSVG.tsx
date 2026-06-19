/**
 * SofiAvatarSVG — canonical AutoCompt Sofi brand avatar
 *
 * Single source of truth for the Sofi robot character. Used in:
 *   - SofiOnboarding.tsx  (full size, left panel)
 *   - App.tsx floating guide  (80×80 px variant)
 *   - App.tsx settings logo sticker  (44×44 px variant)
 *
 * The chest panel features the brand-consistent animated equalizer bars
 * instead of a generic icon, matching the AutoCompt identity.
 *
 * Props
 *   size        – width/height in px (default 160)
 *   className   – extra Tailwind / CSS classes on the wrapper <div>
 *   floatAnim   – if true, adds the 6 s gentle hover animation
 *   showShadow  – drop-shadow intensity: 'none' | 'soft' | 'cyan'
 *   onClick     – optional click handler
 */

import React, { useEffect } from "react";

// ── Keyframe injection ────────────────────────────────────────────────────────
// Injected once per page. Pure CSS, no Tailwind dependency inside SVG.
function injectKeyframes() {
  const id = "sofi-avatar-keyframes";
  if (typeof document === "undefined" || document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    @keyframes sofiRobotFloat {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-10px); }
    }
    @keyframes sofiBar0 { from { height: 6px  } to { height: 16px } }
    @keyframes sofiBar1 { from { height: 12px } to { height: 22px } }
    @keyframes sofiBar2 { from { height: 4px  } to { height: 14px } }
    @keyframes sofiBar3 { from { height: 10px } to { height: 20px } }
    @keyframes sofiBar4 { from { height: 3px  } to { height: 12px } }
  `;
  document.head.appendChild(style);
}

// ── Component ─────────────────────────────────────────────────────────────────
interface SofiAvatarSVGProps {
  size?: number;
  className?: string;
  floatAnim?: boolean;
  showShadow?: "none" | "soft" | "cyan";
  onClick?: () => void;
}

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
      ? "drop-shadow-[0_8px_24px_rgba(6,182,212,0.35)]"
      : showShadow === "soft"
        ? "drop-shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
        : "";

  const floatStyle: React.CSSProperties = floatAnim
    ? { animation: "sofiRobotFloat 6s ease-in-out infinite" }
    : {};

  // Unique gradient/filter IDs per instance (avoids SVG ID conflicts when
  // multiple avatars are mounted simultaneously)
  const uid = React.useId().replace(/:/g, "");
  const bId = `sofiBody-${uid}`;
  const jId = `sofiJoint-${uid}`;
  const gId = `sofiGlow-${uid}`;

  // Equalizer bars heights
  const bars = [14, 20, 12, 18, 10];

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
      >
        <defs>
          {/* ── Gradients ── */}
          <linearGradient id={bId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#FAFAFA" />
            <stop offset="100%" stopColor="#D4D4D8" />
          </linearGradient>
          <linearGradient id={jId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#27272A" />
            <stop offset="100%" stopColor="#09090B" />
          </linearGradient>
          {/* ── Emerald glow filter for eyes / smile ── */}
          <filter id={gId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── Neck joint ── */}
        <rect x="72" y="86" width="16" height="12" rx="2"
          fill={`url(#${jId})`} stroke="#09090B" strokeWidth="0.5" />
        <line x1="72" y1="91" x2="88" y2="91" stroke="#3F3F46" strokeWidth="1" />

        {/* ── Leg hips & feet ── */}
        <rect x="62" y="160" width="36" height="7" rx="3.5"
          fill={`url(#${jId})`} stroke="#09090B" strokeWidth="0.5" />
        <circle cx="68" cy="173" r="5" fill="#18181B" />
        <circle cx="92" cy="173" r="5" fill="#18181B" />
        <path d="M63,174 C63,174 63,192 63,192 C63,194 73,194 73,192 C73,192 73,174 73,174 Z"
          fill={`url(#${bId})`} stroke="#D4D4D8" strokeWidth="0.5" />
        <path d="M87,174 C87,174 87,192 87,192 C87,194 97,194 97,192 C97,192 97,174 97,174 Z"
          fill={`url(#${bId})`} stroke="#D4D4D8" strokeWidth="0.5" />

        {/* ── Right arm ── */}
        <circle cx="118" cy="106" r="6" fill="#D4D4D8" stroke="#A1A1AA" strokeWidth="0.5" />
        <path d="M117,106 L125,128 C126,130 122,132 120,129 L112,108 Z"
          fill={`url(#${bId})`} stroke="#D4D4D8" strokeWidth="0.5" />
        <circle cx="122" cy="129" r="4.5" fill={`url(#${jId})`} />
        <path d="M122,129 L117,148 C116,150 112,149 113,146 L118,128 Z"
          fill={`url(#${bId})`} stroke="#D4D4D8" strokeWidth="0.5" />
        <circle cx="115" cy="149" r="4" fill={`url(#${bId})`} stroke="#D4D4D8" strokeWidth="0.5" />

        {/* ── Torso ── */}
        <path
          d="M50,96 L110,96 C116,96 118,102 116,110 L104,152 C102,158 96,160 80,160 C64,160 58,158 56,152 L44,110 C42,102 44,96 50,96 Z"
          fill={`url(#${bId})`} stroke="#D4D4D8" strokeWidth="0.6"
        />

        {/* ── Chest panel (brand AutoCompt identity) ── */}
        <foreignObject x="56" y="105" width="48" height="40">
          <div
            // @ts-ignore — xmlns required inside foreignObject
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              width: "100%", height: "100%",
              background: "#0A0A12",
              borderRadius: "10px",
              border: "1px solid rgba(16,185,129,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "20px" }}>
              {bars.map((h, i) => (
                <span
                  key={i}
                  style={{
                    display: "block",
                    width: "3px",
                    height: `${h}px`,
                    background: "#10B981",
                    borderRadius: "2px",
                    opacity: 0.85,
                    animation: `sofiBar${i} ${0.6 + i * 0.12}s ease-in-out infinite alternate`,
                  }}
                />
              ))}
            </span>
          </div>
        </foreignObject>

        {/* ── Left arm ── */}
        <circle cx="42" cy="106" r="6" fill="#D4D4D8" stroke="#A1A1AA" strokeWidth="0.5" />
        <path d="M38,106 L25,85 C23,82 26,79 28,81 L41,102 Z"
          fill={`url(#${bId})`} stroke="#D4D4D8" strokeWidth="0.5" />
        <circle cx="26" cy="83" r="4.5" fill={`url(#${jId})`} />
        <path d="M26,83 L26,53 C26,50 30,50 30,53 L30,83 Z"
          fill={`url(#${bId})`} stroke="#D4D4D8" strokeWidth="0.5" />
        <circle cx="28" cy="51" r="4.5" fill={`url(#${bId})`} stroke="#D4D4D8" strokeWidth="0.5" />
        <circle cx="29" cy="49" r="1.8" fill="#A1A1AA" />
        <circle cx="31.5" cy="51" r="1.8" fill="#A1A1AA" />
        <rect x="26.5" y="34" width="3" height="13" rx="1.5"
          fill={`url(#${bId})`} stroke="#D4D4D8" strokeWidth="0.5" />
        <ellipse cx="33" cy="52" rx="6.5" ry="12"
          fill={`url(#${bId})`} stroke="#D4D4D8" strokeWidth="0.5" />
        <rect x="30" y="44" width="3.5" height="16" fill={`url(#${jId})`} rx="0.8" />

        {/* ── Right shoulder ellipse ── */}
        <ellipse cx="127" cy="52" rx="6.5" ry="12"
          fill={`url(#${bId})`} stroke="#D4D4D8" strokeWidth="0.5" />
        <rect x="126.5" y="44" width="3.5" height="16" fill={`url(#${jId})`} rx="0.8" />

        {/* ── Head shell ── */}
        <rect x="35" y="15" width="90" height="74" rx="31" ry="31"
          fill={`url(#${bId})`} stroke="#D4D4D8" strokeWidth="0.5" />

        {/* ── Face screen ── */}
        <rect x="44.5" y="24" width="71" height="52" rx="18.5" ry="18.5"
          fill="#0A0A0C" stroke="#27272A" strokeWidth="1.2" />

        {/* ── Eyes ── */}
        <rect x="58" y="38" width="7.5" height="18" rx="3.75" fill="#10B981" filter={`url(#${gId})`} />
        <rect x="94.5" y="38" width="7.5" height="18" rx="3.75" fill="#10B981" filter={`url(#${gId})`} />

        {/* ── Smile ── */}
        <path d="M 70.5 61.5 Q 80 68.5 89.5 61.5"
          fill="none" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round"
          filter={`url(#${gId})`} />
      </svg>
    </div>
  );
}

export default SofiAvatarSVG;
