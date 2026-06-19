/**
 * RapportTaxes.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Gestionnaires (compartido con Entrepreneurs y perfiles fiscales)
 * Extraído de: src/App.tsx (L17860–L18139) — Fase 6 del desmantelamiento modular
 *
 * Nota arquitectónica:
 *   Componente 100% presentacional — sin estados propios.
 *   Recibe todos sus valores computados desde App como props:
 *     • tpsPerçue, tvqPerçue, tpsITR, tvqRTI — derivados de processedHistorique
 *     • totalVentesBrutes — reducido de filteredHistorique
 *     • showTaxModal / setShowTaxModal — estado global (también usado en otros módulos)
 *     • currentCompany (empresa) — derivado del workspace activo
 *
 *   Mandato de conformité fiscale (Golden Rule §2):
 *     Este módulo NO modifica la lógica de cálculo TPS/TVQ/ITR/RTI.
 *     Solo presenta los valores ya computados por processedHistorique/processedDepenses.
 *
 *   LogoPrincipal — definido inline en App.tsx (L216), se pasa como prop
 *   para no duplicar la definición ni crear una dependencia circular.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Menu,
  Percent,
  ShieldCheck,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RapportTaxesProps {
  // Mode
  darkMode: boolean;

  // Valeurs fiscales computées (non encapsulables — dérivées de processedHistorique/processedDepenses)
  tpsPerçue: number;
  tvqPerçue: number;
  tpsITR: number;
  tvqRTI: number;
  totalVentesBrutes: number;

  // État modal FP-500
  showTaxModal: boolean;
  setShowTaxModal: (val: boolean) => void;

  // Workspace actif
  activeCompanyId: string;
  currentCompany: any; // Typage loose — même schéma que dans App

  // Navigation
  setVista: (vista: string) => void;
  setIsSidebarOpen: (open: boolean) => void;

  // Composants App passés en prop
  WorkspaceSidebar: React.ComponentType;
  LogoPrincipal: React.ComponentType<{
    size?: number;
    showText?: boolean;
    animate?: boolean;
    textColor?: string;
  }>;
}

// ── Composant ─────────────────────────────────────────────────────────────────

const RapportTaxes: React.FC<RapportTaxesProps> = ({
  darkMode,
  tpsPerçue,
  tvqPerçue,
  tpsITR,
  tvqRTI,
  totalVentesBrutes,
  showTaxModal,
  setShowTaxModal,
  activeCompanyId,
  currentCompany,
  setVista,
  setIsSidebarOpen,
  WorkspaceSidebar,
  LogoPrincipal,
}) => {
  // Calculs fiscaux locaux (identiques au closure d'App — ne pas modifier)
  const resultFiscalNet = tpsPerçue + tvqPerçue - (tpsITR + tvqRTI);

  // STRICT MANDATE: Define exempt profile (Residential Plex) vs Commercial Profiles
  const isExemptTaxProfile =
    activeCompanyId === "3" ||
    (currentCompany?.legalEntity &&
      currentCompany.legalEntity.includes("Co-propriété"));
  const isCommercialProfile = !isExemptTaxProfile;

  return (
    <div
      className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col font-sans animate-in slide-in-from-right text-left max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}
    >
      <WorkspaceSidebar />

      <header
        className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} px-6 py-5 border-b flex items-center space-x-3 text-left shadow-sm`}
        style={{
          borderTop: `4px solid ${darkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.3)"}`,
        }}
      >
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden mr-1"
        >
          <Menu size={18} />
        </button>
        <button
          onClick={() => setVista("dashboard")}
          className={`p-2 transition-colors ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}
        >
          <ArrowLeft size={28} />
        </button>
        <h2 className="font-black uppercase italic tracking-tighter text-lg text-left leading-none mt-1">
          Rapport de Taxes (TPS/TVQ)
        </h2>
      </header>

      <main className="p-6 space-y-6 max-w-md mx-auto w-full text-left flex-1">
        {/* Carte résultat net */}
        <div
          className={`p-8 rounded-[40px] text-white shadow-lg relative overflow-hidden text-left border ${darkMode ? "bg-[#059669]/90 border-[#059669]" : "bg-[#059669] border-emerald-500/10"}`}
        >
          <div className="relative z-10">
            <p
              className={`text-[10px] font-black uppercase mb-2 italic tracking-[0.2em] ${darkMode ? "text-emerald-200/50" : "text-emerald-900/50"}`}
            >
              Remboursement Net Estimé
            </p>
            <p className="text-5xl font-black italic tracking-tighter text-left">
              {resultFiscalNet.toFixed(2)} $
            </p>

            {isExemptTaxProfile && (
              <div className="mt-4 flex space-x-4 border-t border-white/20 pt-4">
                <div>
                  {currentCompany?.partners?.map((p: string) => {
                    const pct =
                      currentCompany?.partnersPct?.[p] ??
                      100 / (currentCompany?.partners?.length || 1);
                    return (
                      <div key={p} className="mr-4">
                        <p className="text-[8px] font-black uppercase opacity-60">
                          Part {p} ({pct}%)
                        </p>
                        <p className="text-lg font-black italic tracking-tighter">
                          {(resultFiscalNet * (pct / 100)).toFixed(2)}$
                        </p>
                      </div>
                    );
                  })}
                  {/* Commentaire conservé intentionnellement — ne pas supprimer */}
                </div>{" "}
                <div className="hidden">
                  <p className="text-lg font-black italic tracking-tighter">
                    {(resultFiscalNet * 0.5).toFixed(2)}$
                  </p>
                </div>
              </div>
            )}
          </div>
          <Percent
            size={120}
            className="absolute -right-8 -bottom-8 text-white/10 rotate-12"
          />
        </div>

        {/* Lignes TPS/TVQ */}
        <div className="space-y-3 text-left">
          {[
            { l: "TPS Perçue (Ventes)", v: tpsPerçue, c: "text-[#059669]" },
            { l: "ITR-TPS (Dépenses)", v: tpsITR, c: "text-rose-500" },
            { l: "TVQ Perçue (Ventes)", v: tvqPerçue, c: "text-[#059669]" },
            { l: "RTI-TVQ (Dépenses)", v: tvqRTI, c: "text-rose-500" },
          ].map((line, i) => (
            <div
              key={i}
              className={`p-5 rounded-[28px] border flex justify-between items-center text-left hover:border-[#059669] transition-all shadow-sm ${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"}`}
            >
              <span
                className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
              >
                {line.l}
              </span>
              <span className={`font-black italic text-sm ${line.c}`}>
                {line.v.toFixed(2)}$
              </span>
            </div>
          ))}
        </div>

        {/* Période et statut fiscal */}
        <div
          className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} p-6 rounded-[32px] border space-y-3 shadow-sm`}
        >
          <div
            className={`flex justify-between items-center text-[10px] font-black uppercase italic px-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
          >
            <span>Période</span>
            <span
              className={`${darkMode ? "text-zinc-100" : "text-slate-900"} underline decoration-[#059669] italic`}
            >
              MAI 2026
            </span>
          </div>
          <div className={`h-px ${darkMode ? "bg-zinc-900" : "bg-slate-100"}`} />

          {isExemptTaxProfile ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-3 text-left">
              <ShieldCheck
                className="text-emerald-500 mt-0.5 shrink-0"
                size={18}
              />
              <p
                className={`text-[9px] italic font-bold leading-relaxed ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}
              >
                Statut : Activité résidentielle exonérée. Aucune déclaration de
                taxes FP-500 n'est requise pour ce profil. La TPS/TVQ payée sur
                les réparations est automatiquement capitalisée comme dépense
                déductible brute pour vos impôts fonciers de fin d'année
                (Formulaire TP-128 / T776).
              </p>
            </div>
          ) : (
            <div
              className={`p-4 rounded-2xl border flex items-start space-x-3 text-left ${darkMode ? "bg-amber-950/20 border-amber-900" : "bg-amber-50 border-amber-100"}`}
            >
              <AlertTriangle className="text-amber-500 mt-0.5" size={18} />
              <p
                className={`text-[9px] italic font-medium leading-relaxed ${darkMode ? "text-amber-200/80" : "text-amber-700"}`}
              >
                ATTENTION: Ce rapport est une estimation automatisée par l'IA
                d'AutoCompt. Veuillez vérifier vos factures avant la déclaration
                finale via le portail de Revenu Québec.
              </p>
            </div>
          )}
        </div>

        {/* Bouton export FP-500 (profils commerciaux seulement) */}
        {isCommercialProfile && (
          <button
            onClick={() => setShowTaxModal(true)}
            className={`w-full py-5 rounded-[32px] font-black uppercase text-[10px] tracking-widest italic active:scale-95 transition-all shadow-xl ${darkMode ? "bg-zinc-100 text-black" : "bg-slate-900 text-white"}`}
          >
            Exporter Formulaire FP-500
          </button>
        )}
      </main>

      {/* Modal Formulaire FP-500 */}
      <AnimatePresence>
        {showTaxModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`w-full max-w-sm rounded-[40px] shadow-2xl overflow-y-auto max-h-[92vh] border ${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-100"}`}
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center space-x-2">
                  <LogoPrincipal size={18} />
                  <h3 className="text-[10px] font-black uppercase italic tracking-widest leading-none mt-1">
                    Formulaire FP-500
                  </h3>
                </div>
                <button
                  onClick={() => setShowTaxModal(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  Fermer
                </button>
              </div>

              <div className="p-8 space-y-5">
                {[
                  {
                    label:
                      "Ligne 22 : Fournitures taxables totales (Ventes brutes)",
                    value: totalVentesBrutes,
                  },
                  { label: "Ligne 105 : TPS perçue", value: tpsPerçue },
                  {
                    label: "Ligne 108 : Crédits ITR (TPS payée sur dépenses)",
                    value: tpsITR,
                  },
                  { label: "Ligne 205 : TVQ perçue", value: tvqPerçue },
                  {
                    label: "Ligne 208 : Crédits RTI (TVQ payée sur dépenses)",
                    value: tvqRTI,
                  },
                ].map((row, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-end border-b border-dashed border-zinc-100 dark:border-zinc-900 pb-2"
                  >
                    <span className="text-[8px] font-bold uppercase text-zinc-400 text-left max-w-[70%] leading-tight">
                      {row.label}
                    </span>
                    <span
                      className={`text-[11px] font-black italic ${darkMode ? "text-zinc-100" : "text-slate-900"}`}
                    >
                      {row.value.toFixed(2)} $
                    </span>
                  </div>
                ))}

                <div
                  className={`mt-8 p-6 rounded-3xl border-2 ${resultFiscalNet < 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <p
                        className={`text-[9px] font-black uppercase italic ${resultFiscalNet < 0 ? "text-emerald-600" : "text-amber-600"}`}
                      >
                        Résultat Fiscal Net
                      </p>
                      <p
                        className={`text-[8px] font-bold uppercase opacity-50 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
                      >
                        {resultFiscalNet < 0
                          ? "Remboursement attendu"
                          : "Solde à payer"}
                      </p>
                    </div>
                    <p
                      className={`text-2xl font-black italic tracking-tighter ${resultFiscalNet < 0 ? "text-emerald-500" : "text-amber-500"}`}
                    >
                      {resultFiscalNet.toFixed(2)} $
                    </p>
                  </div>
                </div>

                <p className="text-[7px] font-bold text-zinc-400 uppercase italic text-center mt-4 tracking-widest">
                  Généré le {new Date().toLocaleDateString("fr-CA")}
                </p>
              </div>

              <button
                onClick={() => setShowTaxModal(false)}
                className={`w-full py-6 text-[10px] font-black uppercase italic tracking-widest border-t ${darkMode ? "bg-zinc-900 text-zinc-400 border-zinc-800" : "bg-zinc-50 text-zinc-400 border-zinc-100"} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`}
              >
                Fermer l'aperçu
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RapportTaxes;
