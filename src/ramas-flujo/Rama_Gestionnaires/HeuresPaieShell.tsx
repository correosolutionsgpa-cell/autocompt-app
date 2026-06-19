/**
 * HeuresPaieShell.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Gestionnaires (Suivi Heures & Paie)
 * Extraído de: src/App.tsx (L18047–L18083) — Fase 10 del desmantelamiento modular
 *
 * Shell de navegación de 37 líneas que envuelve a <HeuresPaieView>.
 * CERO estados propios — 100% presentacional via props.
 *
 * Nota arquitectónica:
 *   HeuresPaieView ya es un componente externo en src/components/HeuresPaieView.
 *   Este shell solo provee el layout (header, main, sidebar) y pasa los datos.
 *   Se importa directamente aquí para no duplicar el import en App.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { Menu, Timer } from "lucide-react";
import { HeuresPaieView } from "../../components/HeuresPaieView";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HeuresPaieShellProps {
  // Mode
  darkMode: boolean;

  // Langue
  activeLang: "FR" | "ES" | "EN";

  // Données paie
  paieRecords: any[];
  setPaieRecords: (fn: any[] | ((prev: any[]) => any[])) => void;

  // Profil actif
  currentCompany: any;

  // Dépenses autonomes
  setAutonomeExpenses: (fn: any[] | ((prev: any[]) => any[])) => void;

  // Fonctions utilitaires App
  playNotificationSound: () => void;

  // Navigation
  setVista: (vista: string) => void;
  setIsSidebarOpen: (open: boolean) => void;

  // Composant App
  WorkspaceSidebar: React.ComponentType;
}

// ── Composant ─────────────────────────────────────────────────────────────────

const HeuresPaieShell: React.FC<HeuresPaieShellProps> = ({
  darkMode,
  activeLang,
  paieRecords,
  setPaieRecords,
  currentCompany,
  setAutonomeExpenses,
  playNotificationSound,
  setVista,
  setIsSidebarOpen,
  WorkspaceSidebar,
}) => {
  return (
    <div className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col font-sans transition-all duration-300 md:pl-72 relative`}>
      <WorkspaceSidebar />
      <header className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} px-6 py-5 border-b shadow-sm sticky top-0 z-50 flex items-center justify-between`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden mr-1"
          >
            <Menu size={22} />
          </button>
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Timer size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase">
              {activeLang === "FR" ? "Suivi Heures & Paie" : activeLang === "ES" ? "Control de Horas y Nóminas" : "Hours & Payroll"}
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {activeLang === "FR" ? "Masse salariale & heures par employé par semaine" : activeLang === "ES" ? "Nómina y horas de trabajo semanales" : "Payroll & weekly hours by employee"}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 w-full animate-in fade-in duration-300">
        <HeuresPaieView
          paieRecords={paieRecords}
          setPaieRecords={setPaieRecords}
          darkMode={darkMode}
          activeLang={activeLang}
          currentCompany={currentCompany}
          playNotificationSound={playNotificationSound}
          setVista={setVista}
          setAutonomeExpenses={setAutonomeExpenses}
        />
      </main>
    </div>
  );
};

export default HeuresPaieShell;
