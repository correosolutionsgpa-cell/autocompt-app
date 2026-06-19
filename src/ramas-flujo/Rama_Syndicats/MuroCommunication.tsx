/**
 * MuroCommunication.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Syndicats
 * Extraído de: src/App.tsx (L22424–L22521) — Fase 4 del desmantelamiento modular
 *
 * Componente del Mur de Communication (tableau interne Syndicat).
 * Sin estados propios — componente presentacional puro con datos mock.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { ArrowLeft, Bell, ChevronDown, Send } from "lucide-react";

export interface MuroCommunicationProps {
  darkMode: boolean;
  adminName: string;
  adminRole: string;
  adminPhoto: string;
  setVista: (vista: string) => void;
  WorkspaceSidebar: React.ComponentType;
}

const MuroCommunication: React.FC<MuroCommunicationProps> = ({
  darkMode,
  adminName,
  adminRole,
  adminPhoto,
  setVista,
  WorkspaceSidebar,
}) => (
  <div
    className={`min-h-screen ${darkMode ? "bg-transparent text-white" : "bg-slate-50 text-slate-900"} flex flex-col font-sans transition-all duration-300 md:pl-72`}
  >
    {darkMode && (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-rose-650/10 blur-[100px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-indigo-650/10 blur-[100px]" />
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
            <span className="text-rose-500 font-bold">Mur de Communication</span>
          </div>
          <h1 className="font-black uppercase italic tracking-tighter text-base sm:text-lg mt-0.5">
            Mur de Communication
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          className={`p-2 rounded-lg relative transition-all ${darkMode ? "bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800" : "bg-white shadow-sm border border-slate-200 text-slate-450 hover:bg-slate-50"}`}
        >
          <Bell size={14} />
        </button>
        <div className="flex items-center gap-2.5 bg-slate-50/50 dark:bg-zinc-900/40 p-1.5 pr-3 rounded-full border border-slate-150 dark:border-zinc-800 shadow-sm hover:border-rose-500/30 transition-all cursor-pointer">
          <img
            src={adminPhoto}
            alt={adminName}
            className="w-7 h-7 rounded-full border border-violet-500/20 object-cover shadow-sm"
          />
          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1 leading-none">
              <p className="text-[9px] font-black uppercase tracking-tight text-slate-900 dark:text-zinc-150">
                {adminName}
              </p>
              <ChevronDown size={8} className="text-slate-400" />
            </div>
            <p className="text-[7px] font-bold uppercase text-rose-500 tracking-wider mt-0.5 leading-none">
              {adminRole}
            </p>
          </div>
        </div>
      </div>
    </header>

    <main className="flex-1 max-w-3xl w-full p-4 sm:p-6 mx-auto space-y-6">
      {/* Zone de publication */}
      <div
        className={`rounded-[32px] p-6 shadow-sm border ${darkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-white border-slate-200"}`}
      >
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
            A
          </div>
          <div className="flex-1">
            <textarea
              className={`w-full p-4 rounded-2xl border outline-none resize-none ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`}
              rows={3}
              placeholder="Publier une annonce, un avis technique ou un incident..."
            />
            <div className="flex justify-end mt-3">
              <button className="px-6 py-2 bg-[#059669] text-white rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center gap-2">
                <Send size={14} /> Publier l'Avis
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Publications */}
      <div className="space-y-4">
        <div
          className={`p-6 rounded-[32px] border shadow-sm ${darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-slate-200"}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold">
              C
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">
                Conseil d'Administration
              </p>
              <p className="text-[10px] uppercase font-black text-emerald-500 tracking-wider">
                Annonce Officielle • Il y a 2 jours
              </p>
            </div>
          </div>
          <p className="text-sm">
            Rappel: Les travaux de réparation du portail principal auront lieu
            ce jeudi de 9h à 15h. Merci de prévoir vos déplacements.
          </p>
        </div>

        <div
          className={`p-6 rounded-[32px] border shadow-sm ${darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-slate-200"}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold">
              U
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">Unité 302</p>
              <p className="text-[10px] uppercase font-black text-rose-500 tracking-wider">
                Signalement d'Incident • Il y a 4 jours
              </p>
            </div>
          </div>
          <p className="text-sm">
            Il y a une légère fuite d'eau dans le garage au niveau de la place
            #12.
          </p>
          <div className="mt-4 p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-100 dark:border-zinc-800 text-xs flex gap-2">
            <div className="font-bold text-emerald-600">Admin:</div>
            <p>Problème pris en charge. Le plombier passe demain matin.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
);

export default MuroCommunication;
