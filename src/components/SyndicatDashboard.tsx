import React from 'react';
import { Building2, PiggyBank, ArrowRight } from 'lucide-react';

interface SyndicatDashboardProps {
  onNavigate: (view: string) => void;
}

export default function SyndicatDashboard({ onNavigate }: SyndicatDashboardProps) {
  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
          Vue d'ensemble du Syndicat
        </h1>
        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">
          Gouvernance & Transparence
        </p>
      </header>

      {/* Financial Overview (Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Fonds d'opération */}
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 shadow-xl shadow-emerald-500/5 border border-slate-100 dark:border-zinc-800 transition-all hover:shadow-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-800/50 group flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
              <Building2 size={24} />
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">
              Fonds d'opération
            </h3>
            <div className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
              14 500,00 $
            </div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
              Solde courant actuel
            </p>
          </div>
        </div>

        {/* Card 2: Fonds de prévoyance */}
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 shadow-xl shadow-emerald-500/5 border border-slate-100 dark:border-zinc-800 transition-all hover:shadow-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-800/50 group flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl group-hover:scale-110 transition-transform">
              <PiggyBank size={24} />
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">
              Fonds de prévoyance
            </h3>
            <div className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
              62 350,00 $
            </div>
            <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mt-2">
              Réserve réglementaire
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Button for Cotisations */}
      <div className="mt-8">
        <button
          onClick={() => onNavigate('cotisations')}
          className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-5 bg-white dark:bg-zinc-900 border-2 border-emerald-500 dark:border-emerald-600 rounded-[24px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
        >
          <span>Gérer les cotisations (Mensuel)</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
