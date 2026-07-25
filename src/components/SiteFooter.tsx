import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, Globe, ExternalLink, Lock, ArrowUp } from 'lucide-react';
import { CookieConsentBanner } from './CookieConsentBanner';

interface SiteFooterProps {
  darkMode?: boolean;
  onNavigate?: (vista: string) => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({ darkMode = true, onNavigate }) => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = (e?: any) => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || (e?.target?.scrollTop || 0);
      if (scrollPos > 150) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (document.documentElement) document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    if (document.body) document.body.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto, main');
    scrollContainers.forEach((el) => {
      try { el.scrollTo({ top: 0, behavior: 'smooth' }); } catch (err) {}
    });
  };

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
      
      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Volver arriba"
          title="Volver arriba"
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/30 border border-emerald-400/30 transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer group"
        >
          <ArrowUp size={20} className="transition-transform group-hover:-translate-y-0.5" />
        </button>
      )}

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

          {/* Social Media Links */}
          <div className="pt-2 flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mr-1">Suivez-nous :</span>
            
            {/* Facebook - Activo */}
            <a
              href="https://www.facebook.com/profile.php?id=61590298907041"
              target="_blank"
              rel="noopener noreferrer"
              title="AutoCompt sur Facebook"
              aria-label="Facebook AutoCompt"
              className="w-8 h-8 rounded-full bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500 hover:text-blue-400 transition-all transform hover:scale-110 group"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>

            {/* Instagram - Preparado */}
            <a
              href="https://instagram.com/autocompt"
              target="_blank"
              rel="noopener noreferrer"
              title="AutoCompt sur Instagram (Bientôt disponible)"
              aria-label="Instagram AutoCompt"
              className="w-8 h-8 rounded-full bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 hover:text-pink-300 transition-all transform hover:scale-110 relative group"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>

            {/* LinkedIn - Preparado */}
            <a
              href="https://linkedin.com/company/autocompt"
              target="_blank"
              rel="noopener noreferrer"
              title="AutoCompt sur LinkedIn (Bientôt disponible)"
              aria-label="LinkedIn AutoCompt"
              className="w-8 h-8 rounded-full bg-sky-600/10 hover:bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 hover:text-sky-300 transition-all transform hover:scale-110 relative group"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
          </div>
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

