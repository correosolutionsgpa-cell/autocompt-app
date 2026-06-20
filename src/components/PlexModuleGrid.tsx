/**
 * PlexModuleGrid.tsx
 *
 * Dashboard shortcut card grid for the Plex dashboard mode.
 * Extracted from App.tsx (Phase 1 modularisation).
 *
 * Shows quick-access cards based on the active user profile.
 * Cards are conditionally rendered via hasAccess() — no module component
 * is deleted; they are simply hidden for profiles that lack permission.
 *
 * Styling: design_system_rules.md §2 — 3D Glass Button Standard
 *   • Resting: clear glass + specular top highlight
 *   • Hover: inset colored glow using profile color token + outer halo
 *   • Profile color tokens (§2 table):
 *       prospecteur  → cyan-500   / rgba(6,182,212,...)
 *       investisseur → emerald-500 / rgba(16,185,129,...)
 *       flippeur     → amber-500  / rgba(245,158,11,...)
 *       gestionnaire → indigo-500 / rgba(99,102,241,...)
 *
 * RBAC source of truth: src/lib/rbacConfig.ts
 * Profile matrix source: .cursorrules §2 PROFILE ACCESS MATRIX
 */
import React from "react";
import {
  Receipt,
  FileSpreadsheet,
  Home,
  Percent,
  FileSignature,
  Folder,
  Timer,
  Wallet,
  Building2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { hasAccess, type ProfileId } from "../lib/rbacConfig";

interface PlexModuleGridProps {
  darkMode: boolean;
  activeProfile: ProfileId;
  setVista: (vista: string) => void;
  getEffectiveTier: () => string;
  plexManagementProperties: { status: string }[];
  setDispatcherSuccessToast: (toast: { text: string; channel: string; customMessage: string }) => void;
  playNotificationSound: () => void;
  setShowFiscalChat: (show: boolean) => void;
}

// ── Profile color tokens — design_system_rules.md §2 ────────────────────────
const PROFILE_RGB: Record<ProfileId, string> = {
  prospecteur:  "6,182,212",    // cyan-500
  investisseur: "16,185,129",   // emerald-500
  flippeur:     "245,158,11",   // amber-500
  gestionnaire: "99,102,241",   // indigo-500
  syndicat:     "139,92,246",   // purple-500
};

// ── Shadow helpers ────────────────────────────────────────────────────────────
const hoverShadow = (rgb: string) =>
  [
    `inset 0 1px 1px rgba(255,255,255,0.1)`,
    `inset 0 0 30px rgba(${rgb},0.25)`,
    `0 0 20px rgba(${rgb},0.18)`,
  ].join(",");

const hoverShadowLight = (rgb: string) =>
  [
    `inset 0 1px 1px rgba(255,255,255,0.6)`,
    `inset 0 0 30px rgba(${rgb},0.15)`,
    `0 0 16px rgba(${rgb},0.12)`,
  ].join(",");

const restShadowDark  = "inset 0 1px 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.40)";
const restShadowLight = "inset 0 1px 1px rgba(255,255,255,0.6), 0 4px 24px rgba(0,0,0,0.04)";

export default function PlexModuleGrid({
  darkMode,
  activeProfile,
  setVista,
  getEffectiveTier,
  plexManagementProperties,
  setDispatcherSuccessToast,
  playNotificationSound,
  setShowFiscalChat,
}: PlexModuleGridProps) {

  const rgb = PROFILE_RGB[activeProfile] ?? PROFILE_RGB.investisseur;
  const tier = getEffectiveTier();
  const isLocked = tier === "gratuit" || tier === "basique";

  // ── §4 Standard Card glass base ───────────────────────────────────────────
  const cardBase = [
    "p-5 rounded-[32px] border flex flex-col items-start space-y-2 text-left",
    "transition-all duration-300 active:scale-[0.98] cursor-pointer",
    "bg-white/60 dark:bg-white/[0.04]",
    "backdrop-blur-xl",
    "border-white/70 dark:border-white/[0.08]",
    "text-slate-800 dark:text-zinc-100",
    // Rotating border light (dark mode only — §index.css .card-glow-spin)
    "card-glow-spin",
  ].join(" ");

  // ── Hover handlers — internal light turns on (§2) ─────────────────────────
  const onHoverIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    const shadow = darkMode ? hoverShadow(rgb) : hoverShadowLight(rgb);
    (e.currentTarget as HTMLButtonElement).style.boxShadow = shadow;
    (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${rgb},0.5)`;
  };
  const onHoverOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.boxShadow = darkMode ? restShadowDark : restShadowLight;
    (e.currentTarget as HTMLButtonElement).style.borderColor = "";
  };

  const restShadow = darkMode ? restShadowDark : restShadowLight;

  // Shared style for all module cards: rest shadow + profile spin RGB
  const cardStyle = {
    boxShadow: restShadow,
    "--spin-rgb": rgb,
  } as React.CSSProperties;
  const can = (moduleId: Parameters<typeof hasAccess>[1]) =>
    hasAccess(activeProfile, moduleId);

  // ── Icon container per §7 — static glass badge, NO solid fills ───────────
  const iconBadge = (colorBg: string, colorText: string) =>
    `flex items-center justify-center p-3 rounded-2xl border border-white/30 dark:border-white/10 ${colorBg} ${colorText}`;

  return (
    <div className="grid grid-cols-2 gap-3 text-left">

      {/* Facturation — prospecteur, flippeur */}
      {can("facturation") && (
        <button
          onClick={() => setVista("facturas")}
          className={cardBase}
          style={cardStyle}
          onMouseEnter={onHoverIn}
          onMouseLeave={onHoverOut}
        >
          <div className={iconBadge("bg-emerald-500/10", "text-emerald-600 dark:text-emerald-400")}>
            <Receipt size={22} />
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-tighter">
            Facturation
          </span>
        </button>
      )}

      {/* Tenue de Livres — prospecteur, investisseur, flippeur, gestionnaire */}
      {can("tenue_livres") && (
        <button
          onClick={() => setVista("reportes")}
          className={cardBase}
          style={cardStyle}
          onMouseEnter={onHoverIn}
          onMouseLeave={onHoverOut}
        >
          <div className={iconBadge("bg-blue-500/10", "text-blue-600 dark:text-blue-400")}>
            <FileSpreadsheet size={22} />
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-tighter">
            Tenue de Livres
          </span>
        </button>
      )}

      {/* Bureau à domicile — prospecteur, flippeur */}
      {can("bureau_domicile") && (
        <button
          onClick={() => setVista("homeoffice")}
          className={cardBase}
          style={cardStyle}
          onMouseEnter={onHoverIn}
          onMouseLeave={onHoverOut}
        >
          <div className={iconBadge("bg-amber-500/10", "text-amber-600 dark:text-amber-400")}>
            <Home size={22} />
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-tighter">
            Bureau à domicile
          </span>
        </button>
      )}

      {/* TPS / TVQ — prospecteur, flippeur */}
      {can("tps_tvq") && (
        <button
          onClick={() => setVista("taxes")}
          className={cardBase}
          style={cardStyle}
          onMouseEnter={onHoverIn}
          onMouseLeave={onHoverOut}
        >
          <div className={iconBadge("bg-rose-500/10", "text-rose-600 dark:text-rose-400")}>
            <Percent size={22} />
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-tighter leading-tight">
            Déclaration
            <br />
            TPS / TVQ
          </span>
        </button>
      )}

      {/* DocuLegal — prospecteur, flippeur (paywall-gated for gratuit/basique) */}
      {can("doculegal") && (
        <button
          onClick={() => {
            if (isLocked) {
              setVista("dashboard");
              setDispatcherSuccessToast({
                text: "Restriction Forfait",
                channel: "DocuLégal 🔒",
                customMessage: "« Module réservé aux membres PRO et INTÉGRAL. »",
              });
              playNotificationSound();
              return;
            }
            setVista("doculegal");
          }}
          className={cardBase}
          style={cardStyle}
          onMouseEnter={onHoverIn}
          onMouseLeave={onHoverOut}
        >
          <div className={`${iconBadge("bg-indigo-500/10", "text-indigo-600 dark:text-indigo-400")} relative`}>
            <FileSignature size={22} />
            {isLocked && (
              <div className="absolute -top-1 -right-1 bg-amber-500/90 backdrop-blur-sm text-slate-950 p-0.5 rounded-full shadow border border-white/20">
                <span>🔒</span>
              </div>
            )}
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-tighter">
            DocuLegal {isLocked && "🔒"}
          </span>
        </button>
      )}

      {/* Dossiers Fiscaux — Universal (all Plex profiles) */}
      {can("dossiers_fiscaux") && (
        <button
          onClick={() => setVista("dossiers")}
          className={cardBase}
          style={cardStyle}
          onMouseEnter={onHoverIn}
          onMouseLeave={onHoverOut}
        >
          <div className={iconBadge("bg-amber-500/10", "text-amber-600 dark:text-amber-400")}>
            <Folder size={22} />
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-tighter leading-none">
            Dossiers
            <br />
            Fiscaux
          </span>
        </button>
      )}

      {/* Heures & Paie — flippeur only */}
      {can("heures_paie") && (
        <button
          onClick={() => setVista("heures-paie")}
          className={cardBase}
          style={{ boxShadow: restShadow }}
          onMouseEnter={onHoverIn}
          onMouseLeave={onHoverOut}
        >
          <div className={iconBadge("bg-emerald-500/10", "text-emerald-600 dark:text-emerald-400")}>
            <Timer size={22} />
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-tighter leading-none">
            Heures &amp;
            <br />
            Paie
          </span>
        </button>
      )}

      {/* Conciliation Bancaire — prospecteur, investisseur, flippeur, gestionnaire */}
      {can("conciliation") && (
        <button
          onClick={() => setVista("banque")}
          className={cardBase}
          style={{ boxShadow: restShadow }}
          onMouseEnter={onHoverIn}
          onMouseLeave={onHoverOut}
        >
          <div className={iconBadge("bg-teal-500/10", "text-teal-600 dark:text-teal-400")}>
            <Wallet size={22} />
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-tighter leading-none">
            Conciliation
            <br />
            Bancaire
          </span>
        </button>
      )}

      {/* Gestion Immobilière — investisseur, gestionnaire (shows live vacancy stats) */}
      {can("gestion_immo") && (
        <button
          onClick={() => setVista("plex")}
          className={cardBase}
          style={{ boxShadow: restShadow }}
          onMouseEnter={onHoverIn}
          onMouseLeave={onHoverOut}
        >
          <div className={iconBadge("bg-emerald-500/10", "text-emerald-600 dark:text-emerald-400")}>
            <Building2 size={22} />
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-tighter leading-none">
            Gestion
            <br />
            Immobilière
          </span>
          {plexManagementProperties.length > 0 && (
            <div className="mt-2 space-y-1 w-full flex flex-col gap-1 items-start text-[8px] font-bold uppercase tracking-wider">
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{plexManagementProperties.filter((p) => p.status === "Actif").length} Unités Actives</span>
              </div>
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>{plexManagementProperties.filter((p) => p.status === "Vacant").length} Vacantes</span>
              </div>
            </div>
          )}
        </button>
      )}

      {/* Taxes & Assurances — prospecteur, investisseur, flippeur, gestionnaire */}
      {can("taxes_assurances") && (
        <button
          onClick={() => setVista("taxes_assurances")}
          className={cardBase}
          style={{ boxShadow: restShadow }}
          onMouseEnter={onHoverIn}
          onMouseLeave={onHoverOut}
        >
          <div className={iconBadge("bg-emerald-500/10", "text-emerald-600 dark:text-emerald-400")}>
            <ShieldAlert size={22} />
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-tighter leading-none">
            Taxes &amp;
            <br />
            Assurances
          </span>
        </button>
      )}

      {/* Assistant IA — Universal (all Plex profiles, paywall-gated on gratuit) */}
      {/* §2: Glass anatomy — NO solid bg-emerald-600, color lives as tint/glow */}
      {can("assistant_ia") && (
        <div className="col-span-2 grid grid-cols-1 gap-6 mt-6">
          <button
            onClick={() => {
              setShowFiscalChat(true);
              playNotificationSound();
            }}
            className={[
              "p-5 rounded-[32px] border",
              "flex flex-col items-start space-y-2 text-left",
              "transition-all duration-300 active:scale-[0.99] cursor-pointer relative",
              // Glass with profile-tinted base — translucent, NOT opaque
              "bg-emerald-500/[0.05] dark:bg-emerald-500/[0.05]",
              "backdrop-blur-xl",
              "border-emerald-500/25 dark:border-emerald-500/20",
              "text-slate-800 dark:text-zinc-100",
            ].join(" ")}
            style={{ boxShadow: restShadow }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                darkMode ? hoverShadow("16,185,129") : hoverShadowLight("16,185,129");
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(16,185,129,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = restShadow;
              (e.currentTarget as HTMLButtonElement).style.borderColor = "";
            }}
          >
            {/* Icon — §2: glass badge, NOT solid fill. §6: pulse allowed on AI hero */}
            <div
              className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-2xl text-emerald-600 dark:text-emerald-400 relative animate-living-pulse"
              style={{ "--pulse-rgb": "16,185,129" } as React.CSSProperties}
            >
              <Sparkles size={20} />
              {tier === "gratuit" && (
                <div className="absolute -top-1 -right-1 bg-amber-500/90 backdrop-blur-sm text-slate-950 p-0.5 rounded-full shadow border border-white/20">
                  <span className="text-[8px]">🔒</span>
                </div>
              )}
            </div>

            <span className="text-[10px] font-black uppercase italic tracking-tighter leading-none mt-1">
              ✨ Assistant IA {tier === "gratuit" && "🔒"}
            </span>
            <p className="text-[7px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight leading-snug">
              Posez vos questions fiscales ou demandez de l'aide en direct !
            </p>
          </button>
        </div>
      )}
    </div>
  );
}
