import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, X, Lock, Check } from 'lucide-react';

interface CookieConsentBannerProps {
  darkMode?: boolean;
  onNavigateLegal?: (vista: string) => void;
}

export const COOKIE_CONSENT_KEY = 'autocompt_cookie_consent';

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  darkMode = true,
  onNavigateLegal,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        // Show after small delay for smooth UX
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setIsVisible(false);
  };

  const handleOpenPrivacy = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateLegal) {
      onNavigateLegal('politique-de-confidentialite');
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#politique-de-confidentialite';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Avis de confidentialité et témoin de connexion"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-[999] animate-in slide-in-from-bottom-5 duration-300"
    >
      <div
        className={`p-5 sm:p-6 rounded-[28px] border shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          darkMode
            ? 'bg-zinc-950/95 border-zinc-800/90 text-zinc-100 shadow-emerald-950/20'
            : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-900/10'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Cookie size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-xs tracking-tight flex items-center gap-1.5">
                <span>Respect de votre vie privée</span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  Loi 25 (QC)
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">AutoCompt Inc.</p>
            </div>
          </div>
          <button
            onClick={handleDecline}
            className={`p-1.5 rounded-lg transition-colors ${
              darkMode ? 'text-zinc-500 hover:text-white hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Fermer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <p className={`text-[11px] leading-relaxed mb-4 ${darkMode ? 'text-zinc-300' : 'text-slate-600'}`}>
          Nous utilisons des témoins (cookies) essentiels pour sécuriser votre session et mesurer l'utilisation du service au Québec.{' '}
          <a
            href="#politique-de-confidentialite"
            onClick={handleOpenPrivacy}
            className="text-emerald-400 hover:underline font-semibold"
          >
            En savoir plus dans notre Politique de confidentialité
          </a>.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <button
            onClick={handleAccept}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10.5px] uppercase tracking-wider transition-all shadow-md hover:shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Check size={13} className="stroke-[3]" />
            <span>Tout accepter</span>
          </button>

          <button
            onClick={handleDecline}
            className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl border text-[10.5px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              darkMode
                ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Essentiels seulement</span>
          </button>
        </div>
      </div>
    </div>
  );
};
