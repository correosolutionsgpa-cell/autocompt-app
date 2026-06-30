/**
 * CorporatifModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Carpeta: src/components/modals/
 * Extraído de: src/App.tsx (L10709–L10803) — Fase 14 del desmantelamiento modular
 *
 * Modal informatif présentant le Plan Corporatif requis.
 * S'affiche quand la limite de partenaires (2) ou d'immeubles (3) est atteinte.
 * Purement présentationnel — CERO estados propios.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CorporatifModalProps {
  darkMode: boolean;
  showCorporatifModal: boolean;
  setShowCorporatifModal: (val: boolean) => void;
  corporatifModalReason: string;
  playNotificationSound: () => void;
}

// ── Composant ─────────────────────────────────────────────────────────────────

const CorporatifModal: React.FC<CorporatifModalProps> = ({
  darkMode,
  showCorporatifModal,
  setShowCorporatifModal,
  corporatifModalReason,
  playNotificationSound,
}) => {
  return (
    <AnimatePresence>
      {showCorporatifModal && (
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
            {/* Background accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-emerald-600 rounded-3xl text-white shadow-xl shadow-emerald-500/10">
                <ShieldCheck size={32} className="animate-pulse" />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black tracking-widest uppercase italic text-teal-400 bg-teal-400/10 px-3 py-1 rounded-full border border-teal-400/20">
                  Plan Corporatif Requis 🏢
                </span>
                <h3 className="text-xl font-black uppercase italic tracking-tighter mt-2">
                  {corporatifModalReason === "partenaire"
                    ? "Accès Limité à 2 Partenaires"
                    : "Accès Limité à 3 Immeubles"}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-relaxed max-w-xs mx-auto">
                  {corporatifModalReason === "partenaire"
                    ? "Le forfait Pro d'AutoCompt (18.99$/mois) supporte un maximum de 2 collaborateurs par compte pour assurer la sécurité et l'intégrité de vos données financières."
                    : "La gestion d'un 4ème immeuble ou plus d'envergure requiert l'activation d'un forfait Corporatif sur notre infrastructure Cloud dédiée."}
                </p>
              </div>
            </div>

            {/* Package features summary */}
            <div
              className={`p-5 rounded-2xl border ${darkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-slate-50 border-slate-100"
                } space-y-3`}
            >
              <p className="text-[8px] font-extrabold uppercase tracking-wider text-emerald-500">
                Avantages exclusifs du plan Corporatif :
              </p>
              <ul className="space-y-2 text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <span>Nombre illimité de partenaires et actionnaires avec synchronisation en temps réel</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <span>Gestion d&apos;un nombre illimité de portefeuilles, d&apos;entreprises ou d&apos;immeubles</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <span>Audit mensuel de vos rapports par un comptable fiscaliste accrédité</span>
                </li>
              </ul>
            </div>

            {/* Decision Actions */}
            <div className="flex flex-col space-y-2">
              <a
                href={`mailto:support@autocompt.ca?subject=Demande%20de%20Plan%20Corporatif%20-%20AutoCompt&body=Bonjour%2520l'equipe%2520AutoCompt,%2520je%2520souhaite%2520obtenir%252520des%252520details%252520sur%252520le%252520Plan%252520Corporatif.%250A%250APartenaire%2520limite%2520dépassée%2520ou%2520Immeuble%2520limite%2520dépassée.`}
                onClick={() => {
                  setShowCorporatifModal(false);
                  playNotificationSound();
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-[#059669] text-white text-xs font-black uppercase italic tracking-widest text-center hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-emerald-950/20 cursor-pointer block"
              >
                Contacter le support d&apos;AutoCompt
              </a>
              <button
                onClick={() => setShowCorporatifModal(false)}
                className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest transition-all ${darkMode
                    ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-900"
                  } border cursor-pointer`}
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CorporatifModal;
