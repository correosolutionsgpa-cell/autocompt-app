/**
 * SyndicModuleGrid.tsx
 *
 * Dashboard shortcut card grid for the Syndicat de Copropriété dashboard mode.
 * Extracted from App.tsx (Phase 1 modularisation).
 *
 * Props surface is intentionally minimal — each card simply navigates to a vista.
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
}

export default function SyndicModuleGrid({ darkMode, setVista }: SyndicModuleGridProps) {
  const card = darkMode
    ? "bg-zinc-950/60 border-zinc-900/80 text-white backdrop-blur-md"
    : "bg-white/85 border-slate-200/80 text-slate-900 shadow-sm";
  const base = `p-5 rounded-[32px] border flex flex-col items-start space-y-2 text-left transition-all active:scale-95 cursor-pointer`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-left col-span-2">

      {/* Module 3: Cotisations */}
      <button
        onClick={() => setVista("cotisations")}
        className={`${card} ${base} hover:border-amber-500/60 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]`}
      >
        <div className={`${darkMode ? "bg-amber-900/20 text-amber-400" : "bg-amber-100 text-amber-600"} p-3 rounded-2xl`}>
          <Wallet size={22} />
        </div>
        <span className="text-[10px] font-black uppercase italic tracking-tighter">
          Gestion des Cotisations
        </span>
        <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight leading-snug">
          Suivi des charges de copropriété et encaissement des payments.
        </p>
      </button>

      {/* Module 4: Contrats & Résolutions */}
      <button
        onClick={() => setVista("contrats")}
        className={`${card} ${base} hover:border-emerald-500/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]`}
      >
        <div className={`${darkMode ? "bg-emerald-900/20 text-emerald-400" : "bg-emerald-100 text-[#059669]"} p-3 rounded-2xl`}>
          <FileSignature size={22} />
        </div>
        <span className="text-[10px] font-black uppercase italic tracking-tighter">
          Contrats &amp; Résolutions (DocuLegal)
        </span>
        <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight leading-snug">
          Suivez, gérez et signez numériquement vos contrats et résolutions.
        </p>
      </button>

      {/* Module 5: Tableau de Transparence */}
      <button
        onClick={() => setVista("transparence")}
        className={`${card} ${base} hover:border-blue-500/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]`}
      >
        <div className={`${darkMode ? "bg-blue-900/20 text-indigo-400" : "bg-blue-100 text-indigo-500"} p-3 rounded-2xl`}>
          <TableProperties size={22} />
        </div>
        <span className="text-[10px] font-black uppercase italic tracking-tighter">
          Tableau de Transparence
        </span>
        <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight leading-snug">
          Visibilité totale des finances, livres et fonds de prévoyance.
        </p>
      </button>

      {/* Module 6: Loi 16 & Carnet d'entretien */}
      <button
        onClick={() => setVista("loi16")}
        className={`${card} ${base} hover:border-violet-500/60 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]`}
      >
        <div className={`${darkMode ? "bg-violet-900/20 text-violet-400" : "bg-violet-100 text-violet-600"} p-3 rounded-2xl`}>
          <Wrench size={22} />
        </div>
        <span className="text-[10px] font-black uppercase italic tracking-tighter">
          Loi 16 &amp; Carnet Entretien
        </span>
        <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight leading-snug">
          Carnet d&apos;entretien technique et projections financières réglementaires.
        </p>
      </button>

      {/* Module 7: Mur de Communication */}
      <button
        onClick={() => setVista("muro")}
        className={`${card} ${base} hover:border-rose-500/60 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]`}
      >
        <div className={`${darkMode ? "bg-rose-900/20 text-rose-400" : "bg-rose-100 text-rose-600"} p-3 rounded-2xl`}>
          <MessageSquare size={22} />
        </div>
        <span className="text-[10px] font-black uppercase italic tracking-tighter">
          Mur de Communication
        </span>
        <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight leading-snug">
          Discussions et avis officiels partagés pour les copropriétaires.
        </p>
      </button>

      {/* Module 8: Paramètres Syndicat — always visible */}
      <button
        onClick={() => setVista("settings")}
        className={`${card} ${base} hover:border-zinc-700/60 hover:shadow-[0_0_20px_rgba(113,113,122,0.15)]`}
      >
        <div className={`${darkMode ? "bg-zinc-900 text-zinc-400" : "bg-slate-100 text-slate-600"} p-3 rounded-2xl`}>
          <Settings size={22} />
        </div>
        <span className="text-[10px] font-black uppercase italic tracking-tighter">
          Paramètres SYNDICAT
        </span>
        <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight leading-snug">
          Configurez les informações du Syndicat, de facturation et accès.
        </p>
      </button>

      {/* Module 9: Rapport IA (full-width featured card) */}
      <button
        onClick={() => setVista("rapport-ia")}
        className={`col-span-2 md:col-span-3 ${
          darkMode
            ? "bg-gradient-to-r from-purple-950/60 via-zinc-950/60 to-indigo-950/60 border-purple-900/50 text-white backdrop-blur-md hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(147,51,234,0.2)]"
            : "bg-gradient-to-r from-purple-50 via-white to-indigo-50 border-purple-200/80 text-slate-900 shadow-sm hover:border-purple-400 hover:shadow-lg"
        } p-5 rounded-[32px] border flex items-center gap-5 text-left transition-all active:scale-[0.99] cursor-pointer`}
      >
        <div className={`${darkMode ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-600"} p-4 rounded-2xl shrink-0`}>
          <Sparkles size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-black uppercase italic tracking-tighter block">
            Rapport IA — SyndicAI
          </span>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight leading-snug mt-1">
            Génération intelligente de rapports financiers, convocations, mises en demeure et inspections Loi 16 — propulsé par l'IA.
          </p>
        </div>
        <div className={`shrink-0 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest ${darkMode ? "bg-purple-600 text-white" : "bg-purple-600 text-white"}`}>
          Ouvrir →
        </div>
      </button>
    </div>
  );
}
