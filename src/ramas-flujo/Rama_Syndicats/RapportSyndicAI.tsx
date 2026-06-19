/**
 * RapportSyndicAI.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Syndicats
 * Extraído de: src/App.tsx (L22575–L22629) — Fase 4 del desmantelamiento modular
 *
 * Shell wrapper para SyndicAiReporter (ya modularizado).
 * Sin estados propios — componente presentacional puro.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { ArrowLeft, Bell, ChevronDown } from "lucide-react";
import SyndicAiReporter from "../../components/SyndicAiReporter";

export interface RapportSyndicAIProps {
  darkMode: boolean;
  depenses: any[];
  activeCompanyId: string;
  adminName: string;
  adminRole: string;
  adminPhoto: string;
  companyName: string;
  setVista: (vista: string) => void;
  WorkspaceSidebar: React.ComponentType;
}

const RapportSyndicAI: React.FC<RapportSyndicAIProps> = ({
  darkMode,
  depenses,
  activeCompanyId,
  adminName,
  adminRole,
  adminPhoto,
  companyName,
  setVista,
  WorkspaceSidebar,
}) => (
  <div
    className={`min-h-screen ${darkMode ? "bg-transparent text-white" : "bg-slate-50 text-slate-900"} flex flex-col font-sans transition-all duration-300 md:pl-72`}
  >
    {darkMode && (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-600/10 blur-[100px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-indigo-600/10 blur-[100px]" />
      </div>
    )}

    <WorkspaceSidebar />

    <header
      className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} px-6 py-4 border-b shadow-sm sticky top-0 z-50 flex items-center justify-between`}
    >
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setVista("dashboard")}
          className={`p-2 rounded-xl transition-colors ${darkMode ? "text-zinc-400 hover:bg-zinc-900 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-left">
          <div className="flex items-center gap-1.5 text-[8.5px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
            <span>AutoCompt</span>
            <span>/</span>
            <span>Tableau de Bord</span>
            <span>/</span>
            <span className="text-purple-500 font-bold">Rapport IA (SyndicAI)</span>
          </div>
          <h1 className="font-black uppercase italic tracking-tighter text-base sm:text-lg mt-0.5">
            Rapport IA — SyndicAI
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          className={`p-2 rounded-lg relative transition-all ${darkMode ? "bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800" : "bg-white shadow-sm border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
        >
          <Bell size={14} />
        </button>
        <div className="flex items-center gap-2.5 bg-slate-50/50 dark:bg-zinc-900/40 p-1.5 pr-3 rounded-full border border-slate-200 dark:border-zinc-800 shadow-sm hover:border-purple-500/30 transition-all cursor-pointer">
          <img
            src={adminPhoto}
            alt={adminName}
            className="w-7 h-7 rounded-full border border-purple-500/20 object-cover shadow-sm"
          />
          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1 leading-none">
              <p className="text-[9px] font-black uppercase tracking-tight text-slate-900 dark:text-zinc-100">
                {adminName}
              </p>
              <ChevronDown size={8} className="text-slate-400" />
            </div>
            <p className="text-[7px] font-bold uppercase text-purple-500 tracking-wider mt-0.5 leading-none">
              {adminRole}
            </p>
          </div>
        </div>
      </div>
    </header>

    <main className="flex-1 max-w-5xl w-full p-4 sm:p-6 space-y-6 mx-auto">
      <SyndicAiReporter
        depenses={depenses}
        activeCompanyId={activeCompanyId}
        darkMode={darkMode}
        companyName={companyName}
        adminName={adminName}
        adminRole={adminRole}
      />
    </main>
  </div>
);

export default RapportSyndicAI;
