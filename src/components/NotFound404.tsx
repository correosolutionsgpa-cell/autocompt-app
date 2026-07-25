import React from 'react';
import { ArrowLeft, Home, FileSearch, Sparkles, HelpCircle, ShieldCheck } from 'lucide-react';

interface NotFound404Props {
  darkMode?: boolean;
  onNavigateHome?: () => void;
}

export const NotFound404: React.FC<NotFound404Props> = ({
  darkMode = true,
  onNavigateHome,
}) => {
  const handleHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden transition-colors duration-300 ${
        darkMode ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Background Blooms */}
      {darkMode && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px]" />
        </div>
      )}

      <div className="max-w-md w-full relative z-10 space-y-6 animate-in zoom-in-95 duration-300">
        {/* Badge 404 */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-widest">
          <FileSearch size={14} />
          <span>Erreur 404 · Page introuvable</span>
        </div>

        {/* Big Code & Illustration */}
        <div className="relative">
          <h1 className="text-8xl sm:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-emerald-400 to-teal-700 opacity-90 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`text-sm font-bold uppercase tracking-widest px-4 py-2 rounded-xl backdrop-blur-md border ${
              darkMode ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300' : 'bg-white/80 border-slate-200 text-slate-700'
            }`}>
              Cette page a changé d'adresse
            </span>
          </div>
        </div>

        {/* Sofi Message */}
        <div className={`p-4 rounded-2xl border text-left flex items-start gap-3 ${
          darkMode ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
        }`}>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <Sparkles size={16} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">S.O.F.I. Assistant</p>
            <p className="text-[11px] leading-relaxed">
              La vista o documento que buscas no está disponible o la URL ha caducado. Regresa al panel principal para acceder a tus herramientas de comptabilité.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleHome}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Home size={16} />
            <span>Tableau de bord</span>
          </button>

          <a
            href="mailto:support@autocompt.ca"
            className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
              darkMode
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <HelpCircle size={16} className="text-blue-400" />
            <span>Contact Support</span>
          </a>
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-slate-500 dark:text-zinc-600 font-mono">
          AutoCompt Inc. · https://app.autocompt.ca
        </p>
      </div>
    </div>
  );
};
