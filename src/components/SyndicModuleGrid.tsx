/**
 * SyndicModuleGrid.tsx
 *
 * Dashboard shortcut card grid for the Syndicat de Copropriété dashboard mode.
 * Extracted from App.tsx (Phase 1 modularisation).
 *
 * Styling: design_system_rules.md §2 — 3D Glass Button Standard
 *   • Resting: bg-white/[0.04] dark + border-white/[0.08] + specular inset highlight
 *   • Hover: inset colored glow (purple-500 → RGB 139,92,246) + outer halo
 *   • No solid backgrounds — color lives inside the glass as a tint/glow
 *   • Profile color: Syndicat → purple-500
 */
import React from "react";
import {
  Wallet,
  FileSignature,
  TableProperties,
  Wrench,
  MessageSquare,
  Settings,
  Sparkles,
} from "lucide-react";

interface SyndicModuleGridProps {
  darkMode: boolean;
  setVista: (vista: string) => void;
  setShowFiscalChat: (show: boolean) => void;
  playNotificationSound: () => void;
}

// ── design_system_rules.md §2 — 3D Glass Card Base ────────────────────────────
// Applied via onMouseEnter/Leave for the dynamic inset+outer glow combo.
// Resting state is clear glass; hover activates the internal light.
const SYNDICAT_RGB = "139,92,246"; // purple-500

/**
 * Returns inline boxShadow string for hover state.
 * Combines: specular top line + inset colored glow + outer halo.
 */
const hoverShadow = (rgb: string) =>
  [
    `inset 0 1px 1px rgba(255,255,255,0.1)`,
    `inset 0 0 30px rgba(${rgb},0.25)`,
    `0 0 20px rgba(${rgb},0.18)`,
  ].join(",");

/**
 * Resting shadow: specular top-edge highlight ("physical glass" line) +
 * soft drop shadow to anchor the card.
 */
const restShadow = "inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.35)";
const restShadowLight = "inset 0 1px 1px rgba(255,255,255,0.6), 0 4px 24px rgba(0,0,0,0.04)";

export default function SyndicModuleGrid({
  darkMode,
  setVista,
  setShowFiscalChat,
  playNotificationSound,
}: SyndicModuleGridProps) {
  // ── §4 Standard Card: near-invisible glass, NOT an opaque block ────────────
  const cardBase = [
    "p-5 rounded-[32px] border flex flex-col items-start space-y-2 text-left",
    "transition-all duration-300 active:scale-[0.98] cursor-pointer",
    // Glass base — light / dark
    "bg-white/60 dark:bg-white/[0.04]",
    "backdrop-blur-xl",
    // Border — light / dark
    "border-white/70 dark:border-white/[0.08]",
    // Text
    "text-slate-800 dark:text-zinc-100",
    // Rotating border light effect (dark mode only — §index.css .card-glow-spin)
    "card-glow-spin",
  ].join(" ");

  // ── Icon container per §7 — circular glass badge ──────────────────────────
  // bg-[color]/10 with matching text color; NO filled/solid glyphs
  const iconContainer = (colorBg: string, colorText: string) =>
    `flex items-center justify-center p-3 rounded-2xl border border-white/30 dark:border-white/10 ${colorBg} ${colorText}`;

  // ── Card hover handlers — activate internal light ──────────────────────────
  const onHoverIn = (e: React.MouseEvent<HTMLButtonElement>, rgb: string) => {
    (e.currentTarget as HTMLButtonElement).style.boxShadow = hoverShadow(rgb);
    (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${rgb},0.55)`;
  };
  const onHoverOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.boxShadow = darkMode ? restShadow : restShadowLight;
    (e.currentTarget as HTMLButtonElement).style.borderColor = "";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-left col-span-2">

      {/* Module 3: Cotisations — amber accent */}
      <button
        onClick={() => setVista("cotisations")}
        className={cardBase}
        style={{ boxShadow: darkMode ? restShadow : restShadowLight, "--spin-rgb": "245,158,11" } as React.CSSProperties}
        onMouseEnter={(e) => onHoverIn(e, "245,158,11")}
        onMouseLeave={onHoverOut}
      >
        <div className={iconContainer("bg-amber-500/10", "text-amber-600 dark:text-amber-400")}>
          <Wallet size={22} />
        </div>
        <span className="text-[10px] font-black uppercase italic tracking-tighter">
          Gestion des Cotisations
        </span>
        <p className="text-[7.5px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight leading-snug">
          Suivi des charges de copropriété et encaissement des payments.
        </p>
      </button>

      {/* Module 4: Contrats & Résolutions — emerald accent */}
      <button
        onClick={() => setVista("contrats")}
        className={cardBase}
        style={{ boxShadow: darkMode ? restShadow : restShadowLight, "--spin-rgb": "16,185,129" } as React.CSSProperties}
        onMouseEnter={(e) => onHoverIn(e, "16,185,129")}
        onMouseLeave={onHoverOut}
      >
        <div className={iconContainer("bg-emerald-500/10", "text-emerald-600 dark:text-emerald-400")}>
          <FileSignature size={22} />
        </div>
        <span className="text-[10px] font-black uppercase italic tracking-tighter">
          Contrats &amp; Résolutions (DocuLegal)
        </span>
        <p className="text-[7.5px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight leading-snug">
          Suivez, gérez et signez numériquement vos contrats et résolutions.
        </p>
      </button>

      {/* Module 5: Tableau de Transparence — indigo accent */}
      <button
        onClick={() => setVista("transparence")}
        className={cardBase}
        style={{ boxShadow: darkMode ? restShadow : restShadowLight, "--spin-rgb": "99,102,241" } as React.CSSProperties}
        onMouseEnter={(e) => onHoverIn(e, "99,102,241")}
        onMouseLeave={onHoverOut}
      >
        <div className={iconContainer("bg-indigo-500/10", "text-indigo-600 dark:text-indigo-400")}>
          <TableProperties size={22} />
        </div>
        <span className="text-[10px] font-black uppercase italic tracking-tighter">
          Tableau de Transparence
        </span>
        <p className="text-[7.5px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight leading-snug">
          Visibilité totale des finances, livres et fonds de prévoyance.
        </p>
      </button>

      {/* Module 6: Loi 16 & Carnet d'entretien — violet accent */}
      <button
        onClick={() => setVista("loi16")}
        className={cardBase}
        style={{ boxShadow: darkMode ? restShadow : restShadowLight, "--spin-rgb": SYNDICAT_RGB } as React.CSSProperties}
        onMouseEnter={(e) => onHoverIn(e, SYNDICAT_RGB)}
        onMouseLeave={onHoverOut}
      >
        <div className={iconContainer("bg-purple-500/10", "text-purple-600 dark:text-purple-400")}>
          <Wrench size={22} />
        </div>
        <span className="text-[10px] font-black uppercase italic tracking-tighter">
          Loi 16 &amp; Carnet Entretien
        </span>
        <p className="text-[7.5px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight leading-snug">
          Carnet d&apos;entretien technique et projections financières réglementaires.
        </p>
      </button>

      {/* Module 7: Mur de Communication — rose accent */}
      <button
        onClick={() => setVista("muro")}
        className={cardBase}
        style={{ boxShadow: darkMode ? restShadow : restShadowLight, "--spin-rgb": "244,63,94" } as React.CSSProperties}
        onMouseEnter={(e) => onHoverIn(e, "244,63,94")}
        onMouseLeave={onHoverOut}
      >
        <div className={iconContainer("bg-rose-500/10", "text-rose-600 dark:text-rose-400")}>
          <MessageSquare size={22} />
        </div>
        <span className="text-[10px] font-black uppercase italic tracking-tighter">
          Mur de Communication
        </span>
        <p className="text-[7.5px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight leading-snug">
          Discussions et avis officiels partagés pour les copropriétaires.
        </p>
      </button>

      {/* Module 8: Paramètres Syndicat — zinc accent */}
      <button
        onClick={() => setVista("settings")}
        className={cardBase}
        style={{ boxShadow: darkMode ? restShadow : restShadowLight, "--spin-rgb": "113,113,122" } as React.CSSProperties}
        onMouseEnter={(e) => onHoverIn(e, "113,113,122")}
        onMouseLeave={onHoverOut}
      >
        <div className={iconContainer("bg-zinc-500/10", "text-zinc-600 dark:text-zinc-400")}>
          <Settings size={22} />
        </div>
        <span className="text-[10px] font-black uppercase italic tracking-tighter">
          Paramètres SYNDICAT
        </span>
        <p className="text-[7.5px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight leading-snug">
          Configurez les informações du Syndicat, de facturation et accès.
        </p>
      </button>

      {/* Module 9: Rapport IA — full-width featured glass card (purple-500) */}
      {/* §2: Glass anatomy applied — no solid bg-purple-600, no opaque gradient */}
      <button
        onClick={() => setVista("rapport-ia")}
        className={[
          "col-span-2 md:col-span-3",
          "p-5 rounded-[32px] border",
          "flex items-center gap-5 text-left",
          "transition-all duration-300 active:scale-[0.99] cursor-pointer",
          // Glass base — purple-tinted but translucent
          "bg-purple-500/[0.06] dark:bg-purple-500/[0.06]",
          "backdrop-blur-xl",
          "border-purple-500/30 dark:border-purple-500/25",
          "text-slate-800 dark:text-zinc-100",
        ].join(" ")}
        style={{ boxShadow: darkMode ? restShadow : restShadowLight }}
        onMouseEnter={(e) => {
          onHoverIn(e, SYNDICAT_RGB);
          (e.currentTarget as HTMLButtonElement).style.boxShadow = hoverShadow(SYNDICAT_RGB);
        }}
        onMouseLeave={onHoverOut}
      >
        {/* Icon — glass badge, NOT solid fill */}
        <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-2xl shrink-0 text-purple-600 dark:text-purple-400">
          <Sparkles size={28} />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-black uppercase italic tracking-tighter block">
            Rapport IA — SyndicAI
          </span>
          <p className="text-[8px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight leading-snug mt-1">
            Génération intelligente de rapports financiers, convocations, mises en demeure et inspections Loi 16 — propulsé par l'IA.
          </p>
        </div>

        {/* CTA pill — glass, NOT solid purple-600 */}
        <div className="shrink-0 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest bg-purple-500/15 dark:bg-purple-500/20 border border-purple-500/40 text-purple-700 dark:text-purple-300 transition-colors duration-300">
          Ouvrir →
        </div>
      </button>

      {/* Assistant IA — Universal (all profiles) */}
      {/* Styled in purple for the Syndicat dashboard */}
      <button
        onClick={() => {
          setShowFiscalChat(true);
          playNotificationSound();
        }}
        className={[
          "col-span-2 md:col-span-3",
          "p-5 rounded-[32px] border",
          "flex items-center gap-5 text-left",
          "transition-all duration-300 active:scale-[0.99] cursor-pointer relative",
          // Glass with purple-tinted base
          "bg-purple-500/[0.06] dark:bg-purple-500/[0.06]",
          "backdrop-blur-xl",
          "border-purple-500/30 dark:border-purple-500/25",
          "text-slate-800 dark:text-zinc-100",
        ].join(" ")}
        style={{ boxShadow: darkMode ? restShadow : restShadowLight }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = hoverShadow(SYNDICAT_RGB);
          (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${SYNDICAT_RGB},0.55)`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = darkMode ? restShadow : restShadowLight;
          (e.currentTarget as HTMLButtonElement).style.borderColor = "";
        }}
      >
        {/* Icon — glass badge containing Sofi Face */}
        <div className="bg-purple-500/10 border border-purple-500/30 p-1.5 rounded-2xl shrink-0 text-purple-600 dark:text-purple-400 flex items-center justify-center">
          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-zinc-950">
            <img
              src="/sofi/La_pose__Sofi_con_exito.jpeg"
              alt="Sofi"
              className="w-full h-full object-cover"
              style={{ transform: "scale(3.2)", transformOrigin: "50% 15%" }}
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-black uppercase italic tracking-tighter block">
            Assistant IA Expert (S.O.F.I.)
          </span>
          <p className="text-[8px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight leading-snug mt-1">
            Posez vos questions sur la gestion de copropriété, règlements d'immeuble et obligations légales au Québec.
          </p>
        </div>

        {/* CTA pill */}
        <div className="shrink-0 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest bg-purple-500/15 dark:bg-purple-500/20 border border-purple-500/40 text-purple-700 dark:text-purple-300 transition-colors duration-300">
          Clavarder →
        </div>
      </button>

    </div>
  );
}
