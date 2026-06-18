/**
 * GlassRoleButton — AutoCompt Design System v2.0
 *
 * Implements the Physical 3D Glass standard from design_system_rules.md §2:
 *   • Resting state: clear glass with colored edge border + specular top highlight
 *   • Hover state:   internal colored light turns on (inset glow) — NOT a solid fill
 *   • Contents (icon, text) are 100% static — zero translate/scale/rotate on hover
 *   • backdrop-blur-md always present
 */

import React from "react";

// ─── Color theme tokens ────────────────────────────────────────────────────────
// Per design_system_rules.md §2 — Profile Color Tokens
type ColorTheme = "cyan" | "emerald" | "amber" | "indigo" | "purple";

interface ThemeTokens {
  borderRest:   string; // border-[color]/50
  borderHover:  string; // hover:border-[color]/80
  bgHoverLight: string; // hover:bg-[color]/15
  bgHoverDark:  string; // dark:hover:bg-[color]/20
  iconBg:       string; // bg-[color]/10
  iconText:     string; // text-[color]-600 dark:text-[color]-400
  labelHover:   string; // group-hover:text-[color]-600 dark:group-hover:text-[color]-400
  arrowColor:   string; // text-[color]-500
  // shadow rgba strings for inset glow & outer halo
  shadowRgb:    string; // e.g. "6,182,212"
}

const THEME_MAP: Record<ColorTheme, ThemeTokens> = {
  cyan: {
    borderRest:   "border-cyan-500/50",
    borderHover:  "hover:border-cyan-500/80",
    bgHoverLight: "hover:bg-cyan-500/15",
    bgHoverDark:  "dark:hover:bg-cyan-500/20",
    iconBg:       "bg-cyan-500/10",
    iconText:     "text-cyan-600 dark:text-cyan-400",
    labelHover:   "group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
    arrowColor:   "text-cyan-500 dark:text-cyan-400",
    shadowRgb:    "6,182,212",
  },
  emerald: {
    borderRest:   "border-emerald-500/50",
    borderHover:  "hover:border-emerald-500/80",
    bgHoverLight: "hover:bg-emerald-500/15",
    bgHoverDark:  "dark:hover:bg-emerald-500/20",
    iconBg:       "bg-emerald-500/10",
    iconText:     "text-emerald-600 dark:text-emerald-400",
    labelHover:   "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    arrowColor:   "text-emerald-500 dark:text-emerald-400",
    shadowRgb:    "16,185,129",
  },
  amber: {
    borderRest:   "border-amber-500/50",
    borderHover:  "hover:border-amber-500/80",
    bgHoverLight: "hover:bg-amber-500/15",
    bgHoverDark:  "dark:hover:bg-amber-500/20",
    iconBg:       "bg-amber-500/10",
    iconText:     "text-amber-600 dark:text-amber-400",
    labelHover:   "group-hover:text-amber-600 dark:group-hover:text-amber-400",
    arrowColor:   "text-amber-500 dark:text-amber-400",
    shadowRgb:    "245,158,11",
  },
  indigo: {
    borderRest:   "border-indigo-500/50",
    borderHover:  "hover:border-indigo-500/80",
    bgHoverLight: "hover:bg-indigo-500/15",
    bgHoverDark:  "dark:hover:bg-indigo-500/20",
    iconBg:       "bg-indigo-500/10",
    iconText:     "text-indigo-600 dark:text-indigo-400",
    labelHover:   "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
    arrowColor:   "text-indigo-500 dark:text-indigo-400",
    shadowRgb:    "99,102,241",
  },
  purple: {
    borderRest:   "border-purple-500/50",
    borderHover:  "hover:border-purple-500/80",
    bgHoverLight: "hover:bg-purple-500/15",
    bgHoverDark:  "dark:hover:bg-purple-500/20",
    iconBg:       "bg-purple-500/10",
    iconText:     "text-purple-600 dark:text-purple-400",
    labelHover:   "group-hover:text-purple-600 dark:group-hover:text-purple-400",
    arrowColor:   "text-purple-500 dark:text-purple-400",
    shadowRgb:    "139,92,246",
  },
};

// ─── Props ─────────────────────────────────────────────────────────────────────
export interface GlassRoleButtonProps {
  /** The role title displayed in uppercase */
  label: string;
  /** Short description shown below the title */
  description: string;
  /** Lucide React icon element, sized w-5 h-5 */
  icon: React.ReactNode;
  /** Color theme key that determines all tints, borders, and glows */
  colorTheme: ColorTheme;
  /** Click handler */
  onClick: () => void;
  /** Optional extra class overrides */
  className?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function GlassRoleButton({
  label,
  description,
  icon,
  colorTheme,
  onClick,
  className = "",
}: GlassRoleButtonProps) {
  const t = THEME_MAP[colorTheme];
  const rgb = t.shadowRgb;

  return (
    <button
      onClick={onClick}
      // ── design_system_rules.md §2: 3D Glass Container ─────────────────────
      // Resting: clear glass + colored border + top specular inset highlight
      // Hover:   internal colored light activates (inset glow) + outer halo
      // No solid fill ever — all color lives in the glass as a tint/glow
      className={[
        // Layout
        "group w-full px-5 py-3.5 text-left",
        "flex items-center gap-3",
        "cursor-pointer active:scale-[0.98]",
        // ── 3D Glass base ──
        "relative overflow-hidden rounded-full backdrop-blur-md",
        "bg-white/20 dark:bg-white/5",
        // ── Colored edge border (rest state) ──
        `border ${t.borderRest}`,
        // ── Specular top-edge highlight — the "physical glass" line ──
        "shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]",
        "dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]",
        // ── Smooth transition ──
        "transition-all duration-300",
        // ── Hover: subtle tinted bg fill ──
        t.bgHoverLight,
        t.bgHoverDark,
        // ── Hover: border sharpens ──
        t.borderHover,
        // ── Hover: internal light glow (inset) + outer halo (via style attr) ──
        // Applied via inline style below to handle the dynamic rgb values
        "text-slate-800 dark:text-zinc-200",
        className,
      ].join(" ")}
      // Hover shadow uses CSS custom property approach via onMouseEnter/Leave
      // to combine the static specular line with the dynamic colored inset glow.
      // We use a data-attribute technique so pure Tailwind handles transitions.
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = [
          `inset 0 1px 1px rgba(255,255,255,0.6)`,
          `inset 0 0 30px rgba(${rgb},0.3)`,
          `0 0 20px rgba(${rgb},0.2)`,
        ].join(",");
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
      }}
    >
      {/* ── Icon container: static circular glass badge ────────────────── */}
      {/* Per rules §7: icon containers use bg-[color]/10 with matching text color */}
      {/* Per rules §6: NO scale, rotate, or translate on hover */}
      <div
        className={[
          "w-9 h-9 rounded-full shrink-0",
          "flex items-center justify-center",
          "border border-white/30 dark:border-white/10",
          t.iconBg,
          t.iconText,
        ].join(" ")}
      >
        {icon}
      </div>

      {/* ── Text block: static, no movement ─────────────────────────────── */}
      <div className="flex-1 min-w-0 select-none">
        {/* Role title — subtle color shift on hover, no translate */}
        <p
          className={[
            "text-[11px] font-black uppercase tracking-widest",
            "transition-colors duration-300",
            t.labelHover,
          ].join(" ")}
        >
          {label}
        </p>
        {/* Description — muted, slightly brightens on hover */}
        <p className="text-[9.5px] font-normal leading-snug mt-0.5 text-slate-500 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-300 transition-colors duration-300 truncate">
          {description}
        </p>
      </div>

      {/* ── Arrow chevron: fades in on hover, color-matched, no translate ── */}
      <div
        className={[
          "w-4 h-4 shrink-0",
          "opacity-0 group-hover:opacity-100",
          "transition-opacity duration-300",
          t.arrowColor,
        ].join(" ")}
        aria-hidden="true"
      >
        <svg
          className="w-full h-full fill-none stroke-current stroke-[2.5]"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
