/**
 * TrialExpiredModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown once per session when the user's beta trial (granted by a redeemed
 * beta access code — see dataService.ts's betaCodes/redeemBetaCode) has
 * expired. Purely informational: closing it does NOT unlock anything — the
 * actual write-block lives in dataService's assertCanWrite() guard. The user
 * can keep viewing their existing data; only new writes are blocked.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export const TRIAL_EXTENSION_FORM_URL = "https://forms.gle/REMPLACER-PAR-LE-VRAI-FORMULAIRE";

export interface TrialExpiredModalProps {
  darkMode: boolean;
  show: boolean;
  onClose: () => void;
}

const TrialExpiredModal: React.FC<TrialExpiredModalProps> = ({ darkMode, show, onClose }) => {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300 text-left">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4 }}
            className={`w-full max-w-md ${darkMode
              ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md text-white"
              : "bg-white border-slate-100 text-slate-900"
              } rounded-[36px] border p-8 shadow-2xl space-y-6 relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex flex-col items-center text-center space-y-4">
              <img
                src="/sofi/Estado_de__Error___Advertencia.jpeg"
                alt="S.O.F.I. — période d'essai terminée"
                className="w-20 h-20 rounded-3xl object-cover shadow-xl shadow-amber-500/10"
              />

              <div className="space-y-1">
                <span className="text-[9px] font-black tracking-widest uppercase italic text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  Période d'essai terminée
                </span>
                <h3 className="text-xl font-black uppercase italic tracking-tighter mt-2">
                  Votre essai bêta est arrivé à échéance
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-relaxed max-w-xs mx-auto">
                  Vous pouvez continuer à consulter toutes vos données déjà enregistrées, mais l'ajout de nouvelles dépenses, immeubles ou unités est maintenant bloqué. Répondez à ce court questionnaire pour obtenir un mois supplémentaire gratuit.
                </p>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <a
                href={TRIAL_EXTENSION_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-xs font-black uppercase italic tracking-widest text-center hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-amber-950/20 cursor-pointer block"
              >
                Répondre au questionnaire
              </a>
              <button
                onClick={onClose}
                className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest transition-all ${darkMode
                  ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-900"
                  } border cursor-pointer`}
              >
                Entendu
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TrialExpiredModal;
