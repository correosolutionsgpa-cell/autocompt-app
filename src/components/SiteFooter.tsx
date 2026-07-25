import React from 'react';
import { ShieldCheck, Mail, Globe, ExternalLink, Lock } from 'lucide-react';
import { CookieConsentBanner } from './CookieConsentBanner';

interface SiteFooterProps {
  darkMode?: boolean;
  onNavigate?: (vista: string) => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({ darkMode = true, onNavigate }) => {
  const handleNav = (vista: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(vista);
    } else if (typeof window !== 'undefined') {
      window.location.hash = `#${vista}`;
    }
  };

  return (
    <>
      <CookieConsentBanner darkMode={darkMode} onNavigateLegal={onNavigate} />
      <footer className={`w-full border-t text-xs transition-colors duration-300 py-8 px-4 sm:px-8 mt-auto ${
        darkMode 
          ? "bg-zinc-950/90 border-zinc-800/80 text-zinc-400" 
          : "bg-slate-50 border-slate-200 text-slate-600"
      }`}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand & Mission */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xs">
              AC
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-100 dark:text-white">AutoCompt Inc.</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              Québec / Canada
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-md leading-relaxed">
            Comptabilité automatisée, coffre-fort Google Drive sécurisé, conformité Loi 25 & Loi 16, taxes TPS/TVQ et DocuLégal.
          </p>
        </div>

        {/* Legal Links & Contacts */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-semibold text-xs">
          <a
            href="#politique-de-confidentialite"
            onClick={(e) => handleNav("politique-de-confidentialite", e)}
            className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer underline underline-offset-4 decoration-emerald-500/30 hover:decoration-emerald-400"
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Politique de confidentialité</span>
          </a>

          <a
            href="#conditions-d-utilisation"
            onClick={(e) => handleNav("conditions-d-utilisation", e)}
            className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer underline underline-offset-4 decoration-blue-500/30 hover:decoration-emerald-400"
          >
            <Lock size={14} className="text-blue-400" />
            <span>Conditions d'utilisation</span>
          </a>

          <a
            href="mailto:confidentialite@autocompt.ca"
            className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
          >
            <Mail size={14} className="text-purple-400" />
            <span>confidentialite@autocompt.ca</span>
          </a>

          <a
            href="https://app.autocompt.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 font-bold text-emerald-400"
          >
            <Globe size={14} />
            <span>app.autocompt.ca</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-zinc-800/40 text-center text-[10px] text-slate-500 dark:text-zinc-600 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} AutoCompt Inc. Tous droits réservés. Vos données ne sont jamais vendues ou partagées avec des tiers.</p>
        <p className="font-mono text-[9.5px]">https://app.autocompt.ca · Solution de référence · Respect de la Loi 25 & Intégration Google Drive API</p>
      </div>
    </footer>
    </>
  );
};
