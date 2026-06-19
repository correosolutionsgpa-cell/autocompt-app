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
  const card = `${
    darkMode
      ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md text-white"
      : "bg-white border-slate-200 text-slate-900"
  } p-5 rounded-[32px] border shadow-sm flex flex-col items-start space-y-2 text-left hover:border-[#059669] hover:shadow-xl transition-all active:scale-95`;

  const tier = getEffectiveTier();
  const isLocked = tier === "gratuit" || tier === "basique";

  // Convenience alias so each card reads: can("facturation")
  const can = (moduleId: Parameters<typeof hasAccess>[1]) =>
    hasAccess(activeProfile, moduleId);

  return (
    <div className="grid grid-cols-2 gap-3 text-left">

      {/* Facturation — prospecteur, flippeur */}
      {can("facturation") && (
        <button onClick={() => setVista("facturas")} className={card}>
          <div className={`${darkMode ? "bg-emerald-900/20 text-emerald-400" : "bg-emerald-100 text-[#059669]"} p-3 rounded-2xl`}>
            <Receipt size={22} />
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-tighter">
            Facturation
          </span>
        </button>
      )}

      {/* Tenue de Livres — prospecteur, investisseur, flippeur, gestionnaire */}
      {can("tenue_livres") && (
        <button onClick={() => setVista("reportes")} className={card}>
          <div className={`${darkMode ? "bg-blue-900/20 text-blue-400" : "bg-blue-100 text-blue-600 shadow-inner"} p-3 rounded-2xl`}>
            <FileSpreadsheet size={22} />
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-tighter">
            Tenue de Livres
          </span>
        </button>
      )}

      {/* Bureau à domicile — prospecteur, flippeur */}
      {can("bureau_domicile") && (
        <button onClick={() => setVista("homeoffice")} className={card}>
          <div className={`${darkMode ? "bg-amber-900/20 text-amber-400" : "bg-amber-100 text-amber-600"} p-3 rounded-2xl`}>
            <Home size={22} />
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-tighter">
            Bureau à domicile
          </span>
        </button>
      )}

      {/* TPS / TVQ — prospecteur, flippeur */}
      {can("tps_tvq") && (
        <button onClick={() => setVista("taxes")} className={card}>
          <div className={`${darkMode ? "bg-rose-905/20 text-rose-450" : "bg-rose-100 text-rose-600"} p-3 rounded-2xl`}>
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
          className={card}
        >
          <div className={`${darkMode ? "bg-indigo-900/20 text-indigo-400" : "bg-indigo-100 text-indigo-600"} p-3 rounded-2xl relative`}>
            <FileSignature size={22} />
            {isLocked && (
              <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow border border-white/20">
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
        <button onClick={() => setVista("dossiers")} className={card}>
          <div className={`${darkMode ? "bg-amber-900/20 text-amber-400" : "bg-amber-100 text-amber-600"} p-3 rounded-2xl`}>
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
        <button onClick={() => setVista("heures-paie")} className={card}>
          <div className={`${darkMode ? "bg-emerald-900/20 text-emerald-400" : "bg-emerald-105 text-[#059669]"} p-3 rounded-2xl`}>
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
        <button onClick={() => setVista("banque")} className={card}>
          <div className={`${darkMode ? "bg-teal-900/20 text-teal-400" : "bg-teal-100 text-teal-600"} p-3 rounded-2xl`}>
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
        <button onClick={() => setVista("plex")} className={card}>
          <div className={`${darkMode ? "bg-emerald-900/20 text-emerald-400" : "bg-emerald-100 text-[#059669]"} p-3 rounded-2xl`}>
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
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-gradient-to-r from-orange-500/20 to-amber-600/20 text-orange-600 dark:text-orange-400">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>{plexManagementProperties.filter((p) => p.status === "Vacant").length} Vacantes</span>
              </div>
            </div>
          )}
        </button>
      )}

      {/* Taxes & Assurances — prospecteur, investisseur, flippeur, gestionnaire */}
      {can("taxes_assurances") && (
        <button onClick={() => setVista("taxes_assurances")} className={card}>
          <div className={`${darkMode ? "bg-emerald-900/20 text-emerald-400" : "bg-emerald-100 text-emerald-600"} p-3 rounded-2xl`}>
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
      {can("assistant_ia") && (
        <div className="col-span-2 grid grid-cols-1 gap-6 mt-6">
          <button
            onClick={() => {
              if (tier === "gratuit") {
                playNotificationSound();
                // Paywall is opened from App.tsx — signal via setShowFiscalChat false-then-true
                // We keep the paywall modal in App.tsx; this button simply opens the chat.
                // For gratuit users, show the fiscal chat which internally handles upgrade CTA.
              }
              setShowFiscalChat(true);
              playNotificationSound();
            }}
            className={`${
              darkMode
                ? "bg-gradient-to-br from-emerald-950/40 to-zinc-900 border-zinc-900 text-white"
                : "bg-gradient-to-br from-emerald-500/5 to-slate-50 border-emerald-500/20 text-slate-900"
            } p-5 rounded-[32px] border shadow-sm flex flex-col items-start space-y-2 text-left hover:border-[#059669] hover:shadow-xl transition-all active:scale-95 relative`}
          >
            <div className="bg-emerald-600 p-2.5 rounded-2xl text-white shadow-md shadow-emerald-600/20 animate-pulse relative">
              <Sparkles size={20} />
              {tier === "gratuit" && (
                <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow border border-white/20">
                  <span className="text-[8px]">🔒</span>
                </div>
              )}
            </div>
            <span className="text-[10px] font-black uppercase italic tracking-tighter leading-none mt-1">
              ✨ Assistant IA {tier === "gratuit" && "🔒"}
            </span>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight leading-snug">
              Posez vos questions fiscales ou demandez de l'aide en direct !
            </p>
          </button>
        </div>
      )}
    </div>
  );
}
