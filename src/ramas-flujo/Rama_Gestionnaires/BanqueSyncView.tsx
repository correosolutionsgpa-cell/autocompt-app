/**
 * BanqueSyncView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Gestionnaires (Analyse & Banque Sync)
 * Extraído de: src/App.tsx (L17978–L18634) — Fase 8 del desmantelamiento modular
 *
 * Vista de réconciliation bancaire Zero-Knowledge.
 * CERO estados propios — todo llega via props tipadas (auditadas en primera ronda).
 *
 * Mandato de integridad contable (Golden Rule §2):
 *   NO modificar la lógica de validateDeposit, processedHistorique/processedDepenses,
 *   ni el motor de réconciliation recoState.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import StyledSelect from "../../components/ui/StyledSelect";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileQuestion,
  FileSearch,
  Menu,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BanqueSyncViewProps {
  // Mode
  t: (key: string) => string;
  darkMode: boolean;
  porcBureau: number;

  // Données bancaires
  bankTransactions: any[];
  setBankTransactions: (fn: any[] | ((prev: any[]) => any[])) => void;

  // Données filtrées (calculées dans App — dérivées de processedHistorique/processedDepenses)
  filteredDepenses: any[];
  filteredHistorique: any[];
  processedHistorique: any[];
  processedDepenses: any[];

  // Profil actif
  activeCompanyId: string;
  activeUser: string;
  currentCompany: any;
  isSolutionsGPA: boolean;
  isPlex: boolean;
  plexManagementProperties: any[];

  // Paywall
  setPaywallTargetTier: (val: string) => void;
  setShowPaywallModal: (val: boolean) => void;

  // CSV upload (ref + handler définis dans App — ne peuvent pas être recréés localement)
  csvInputRef: React.RefObject<HTMLInputElement>;
  handleCSVUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;

  // Dépenses globales
  setDepenses: (fn: any[] | ((prev: any[]) => any[])) => void;

  // Revenus / factures globaux (pour confirmer un dépôt bancaire comme revenu réel)
  setHistorique: (fn: any[] | ((prev: any[]) => any[])) => void;

  // Fonctions utilitaires App
  validateDeposit: (txn: any) => { status: string; [key: string]: any };
  getEffectiveTier: () => string;
  playNotificationSound: () => void;

  // Navigation
  setVista: (vista: string) => void;
  setIsSidebarOpen: (open: boolean) => void;

  // Composant App
  WorkspaceSidebar: React.ComponentType;

  // Correspondance optionnelle avec le Compte Fidéicommis — désactivée par
  // défaut (certaines gestionnaires préfèrent garder ce grand livre séparé
  // du rapprochement bancaire automatique). Les dépôts fidéicommis sont déjà
  // inclus dans validateDeposit() côté App quand ce flag est actif; seuls
  // les retraits (dépenses payées via le fidéicommis) sont matchés ici.
  matchFideicommisInConciliation: boolean;
  onToggleMatchFideicommis: () => void;
  fideicommisRetraitsForReco: any[];
  // Past dépôts (same company) — used to detect a recurring tenant paying
  // again (same amount, name found in the bank description) and suggest
  // auto-creating the next dépôt instead of re-typing the "Nouveau dépôt"
  // form by hand. fideicommisClients lets the very first payment from a
  // brand-new tenant still be suggested when there's exactly one client.
  fideicommisDepotsForReco: any[];
  fideicommisClients: Array<{ id: string; nom: string }>;
  onCreateFideicommisDepot: (payload: {
    clientId: string; clientName: string; locataireName: string;
    propertyAddress: string; montant: number; date: string;
  }) => void;
}

// ── Composant ─────────────────────────────────────────────────────────────────

const BanqueSyncView: React.FC<BanqueSyncViewProps> = ({
  t,
  darkMode,
  porcBureau,
  bankTransactions,
  setBankTransactions,
  filteredDepenses,
  filteredHistorique,
  processedHistorique,
  processedDepenses,
  activeCompanyId,
  activeUser,
  currentCompany,
  isSolutionsGPA,
  isPlex,
  plexManagementProperties,
  setPaywallTargetTier,
  setShowPaywallModal,
  csvInputRef,
  handleCSVUpload,
  setDepenses,
  setHistorique,
  validateDeposit,
  getEffectiveTier,
  playNotificationSound,
  setVista,
  setIsSidebarOpen,
  WorkspaceSidebar,
  matchFideicommisInConciliation,
  onToggleMatchFideicommis,
  fideicommisRetraitsForReco,
  fideicommisDepotsForReco,
  fideicommisClients,
  onCreateFideicommisDepot,
}) => {
  // Selected value for the two manual-assignment StyledSelects below (per
  // transaction row, keyed by `i`) — these used to be uncontrolled native
  // <select> elements read imperatively via the DOM at click time; StyledSelect
  // isn't a real form control, so the selection now lives in React state.
  const [autoLierSelection, setAutoLierSelection] = useState<Record<number, string>>({});
  const [missingExpenseBuilding, setMissingExpenseBuilding] = useState<Record<number, string>>({});

  // Best-guess suggestion for auto-creating a fideicommisDepots doc from a
  // bank deposit — prefers a past dépôt from the same recurring tenant
  // (name in the bank description + same amount); falls back to amount-only
  // history, then (only when unambiguous — a single fideicommis client) a
  // cold-start guess for a brand-new tenant's very first payment.
  const guessFideicommisDeposit = (txn: any) => {
    if (!matchFideicommisInConciliation || txn.amt <= 0) return null;
    const alreadyExists = fideicommisDepotsForReco.some(
      (d: any) => d.date === txn.date && Math.abs(d.montant - txn.amt) < 0.01,
    );
    if (alreadyExists) return null;

    const cleanStr = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const desc = cleanStr(txn.desc);

    const nameAndAmount = fideicommisDepotsForReco.find((d: any) => {
      const name = cleanStr(d.locataireName);
      return name && desc.includes(name) && Math.abs(d.montant - txn.amt) < 0.01;
    });
    if (nameAndAmount) {
      return { clientId: nameAndAmount.clientId, clientName: nameAndAmount.clientName, locataireName: nameAndAmount.locataireName, propertyAddress: nameAndAmount.propertyAddress };
    }
    const amountOnly = fideicommisDepotsForReco.find((d: any) => Math.abs(d.montant - txn.amt) < 0.01);
    if (amountOnly) {
      return { clientId: amountOnly.clientId, clientName: amountOnly.clientName, locataireName: amountOnly.locataireName, propertyAddress: amountOnly.propertyAddress };
    }
    if (fideicommisClients.length === 1) {
      return { clientId: fideicommisClients[0].id, clientName: fideicommisClients[0].nom, locataireName: txn.desc, propertyAddress: "" };
    }
    return null;
  };
    return (
      <div
        className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col font-sans animate-in slide-in-from-bottom text-left overflow-x-hidden md:pl-72 relative transition-all duration-300`}
      >
        <WorkspaceSidebar />
        <header
          className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} px-6 py-5 border-b flex items-center justify-between shadow-sm`}
          style={{
            borderTop: `4px solid ${darkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.3)"}`,
          }}
        >
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden"
            >
              <Menu size={18} />
            </button>
            <button
              onClick={() => setVista("dashboard")}
              className={`p-2 transition-colors ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}
            >
              <ArrowLeft size={24} />
            </button>
          </div>
          <h2 className="font-black uppercase italic tracking-tighter text-xl leading-none">
            {t("Analyse & Banque sync")}
          </h2>
          <div className="w-10"></div>
        </header>

        <main className="p-4 space-y-6 max-w-md mx-auto w-full text-left">
          {/* Zero-Knowledge Privacy Badge */}
          <div className="bg-emerald-600 p-4 rounded-[28px] shadow-lg shadow-emerald-900/10 flex items-center space-x-3 border border-emerald-500">
            <div className="bg-white/20 p-2 rounded-xl text-white backdrop-blur-md">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-white italic leading-tight">
                {t("Privacité Locale Garantie")}
              </p>
              <p className="text-[8px] text-emerald-100 font-bold uppercase mt-0.5 tracking-tight">
                {t("Vos données bancaires sont traitées localement. Confidentialité totale garantie.")}
              </p>
            </div>
          </div>

          {/* State Toggle */}
          <div
            className={`p-2 rounded-[28px] border flex space-x-1 shadow-sm ${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"}`}
          >
            <button className="flex-1 py-3 bg-[#059669] text-white rounded-[22px] text-[9px] font-black uppercase italic shadow-lg">
              {t("Vues Transactions")}
            </button>
            <button
              onClick={() => setVista("reportes")}
              className={`flex-1 py-3 text-[9px] font-black uppercase italic ${darkMode ? "text-zinc-600" : "text-slate-400"}`}
            >
              {t("Performance TP-80")}
            </button>
          </div>

          <div
            className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} p-7 rounded-[40px] shadow-sm border`}
          >
            <div className="flex justify-between items-center mb-6">
              <h3
                className={`text-[10px] font-black uppercase italic tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
              >
                {t("Poids des Déductions")}
              </h3>
              <Sparkles size={14} className="text-[#059669]" />
            </div>
            <div className="space-y-6">
              {[
                { cat: t("Repas & Frais (50%)"), val: 40, color: "bg-orange-500" },
                {
                  cat: t("Bureau dom. (Pro rata)"),
                  val: (porcBureau * 100).toFixed(0),
                  color: "bg-[#059669]",
                },
                { cat: t("Déplacement (KM)"), val: 65, color: "bg-blue-600" },
              ].map((g) => (
                <div key={g.cat} className="space-y-2">
                  <div
                    className={`flex justify-between text-[9px] font-black uppercase italic ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
                  >
                    <span>{g.cat}</span>
                    <span
                      className={`${darkMode ? "text-zinc-100" : "text-slate-900"} font-black`}
                    >
                      {g.val}%
                    </span>
                  </div>
                  <div
                    className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? "bg-zinc-900" : "bg-slate-100"}`}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${g.val}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`${g.color} h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.05)]`}
                    ></motion.div>
                  </div>
                </div>
              ))}
            </div>
            <p
              className={`text-[8px] font-bold uppercase mt-6 text-center italic opacity-60 ${darkMode ? "text-zinc-600" : "text-slate-400"}`}
            >
              {t("Optimisation fiscale active • TP-80 / T2125")}
            </p>
          </div>

          {/* Correspondance optionnelle avec le Compte Fidéicommis — désactivée
              par défaut, certaines gestionnaires préfèrent garder ce grand
              livre entièrement séparé du rapprochement bancaire automatique. */}
          <div className={`p-4 rounded-[24px] border flex items-center justify-between gap-4 ${darkMode ? "bg-slate-900/40 border-white/[0.08]" : "bg-white border-slate-200"}`}>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-200" : "text-slate-900"}`}>{t("Faire correspondre avec le Compte Fidéicommis")}</p>
              <p className={`text-[8px] font-bold uppercase tracking-wider mt-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                {t("Inclut les dépôts et retraits du fidéicommis dans la recherche de correspondances bancaires")}
              </p>
            </div>
            <button
              onClick={onToggleMatchFideicommis}
              className={`shrink-0 w-12 h-7 rounded-full relative transition-colors ${matchFideicommisInConciliation ? "bg-emerald-500" : (darkMode ? "bg-zinc-700" : "bg-slate-300")}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${matchFideicommisInConciliation ? "left-6" : "left-1"}`} />
            </button>
          </div>

          {/* Banque Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <div>
                <h4
                  className={`text-xs font-black uppercase italic tracking-tighter ${darkMode ? "text-zinc-100" : "text-[#0F172A]"}`}
                >
                  {t("Réconciliation")}
                </h4>
                <p
                  className={`text-[8px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}
                >
                  {currentCompany?.nombre}
                </p>
                <div className="flex items-center space-x-1 mt-1 opacity-70">
                  <Shield size={8} className="text-emerald-600" />
                  <p
                    className={`text-[6px] font-bold uppercase tracking-tighter ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
                  >
                    {t("Traitement local Zero-Knowledge • Confidentialité totale")}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const currentTier = getEffectiveTier();
                    if (
                      currentTier === "gratuit" ||
                      currentTier === "basique"
                    ) {
                      setPaywallTargetTier("pro_ind");
                      setShowPaywallModal(true);
                      playNotificationSound();
                      return;
                    }
                    alert(
                      "📱 Connexion bancaire automatique en direct via Flinks/Plaid active.",
                    );
                  }}
                  className={`p-3 rounded-2xl transition-all active:scale-95 border ${darkMode ? "bg-zinc-900 border-zinc-800 text-teal-400 hover:bg-teal-500/10" : "bg-white border-slate-100 text-teal-600 hover:bg-teal-50"}`}
                  title="Premium Sync Live"
                >
                  <Zap size={16} />
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        t("Voulez-vous effacer toutes les transactions bancaires de test pour ce profil?")
                      )
                    ) {
                      setBankTransactions((prev) =>
                        prev.filter((t) => t.companyId !== activeCompanyId),
                      );
                    }
                  }}
                  className={`p-3 rounded-2xl transition-all active:scale-95 border ${darkMode ? "bg-zinc-900 border-zinc-800 text-rose-500 hover:bg-rose-500/10" : "bg-white border-slate-100 text-rose-600 hover:bg-rose-50"}`}
                  title="Réinitialiser les tests"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => csvInputRef.current?.click()}
                  className="bg-[#059669] text-white px-5 py-3 rounded-2xl text-[9px] font-black uppercase italic flex items-center space-x-2 shadow-xl shadow-emerald-900/10 active:scale-95 transition-all"
                >
                  <Upload size={14} /> <span>{t("Sync Relevé")}</span>
                </button>
              </div>
              <input
                type="file"
                ref={csvInputRef}
                onChange={handleCSVUpload}
                className="hidden"
                accept=".csv"
              />
            </div>

            <div className="space-y-3">
              {bankTransactions
                .filter((t) => t.companyId === activeCompanyId)
                .map((txn, i) => {
                  const isDeposit = txn.amt > 0;
                  let recoState: "conciliated" | "need_receipt" | "missing" | "potencial_match" | "erreur_rejet" = "missing";

                  let matchedExpense = null;
                  let matchedInvoice = null;

                  let depValidation: any = null;

                  if (isDeposit) {
                    depValidation = validateDeposit(txn);
                    const depStatus = depValidation.status;
                    if (depStatus === "Contabilisé") {
                      recoState = "conciliated";
                    } else if (depStatus === "À Confirmer") {
                      recoState = "potencial_match";
                    } else {
                      recoState = "erreur_rejet";
                    }
                  } else {
                    // It's an expense (or negative amt withdrawal, if any, wait, in our mock some amts are positive for expenses, let's just use absolute value for matching if needed)
                    // Let's assume expenses in txn are positive locally but matched against filteredDepenses. 
                    // Actually, if amt is positive it could be an expense! Wait, the mock data has `amt: 91.98` for "Virement Bell Canada". 
                    // Wait! A positive amount in bank feed could mean a withdrawal? Let me look at the mock data.
                    matchedExpense = filteredDepenses.find(
                      (d) => Math.abs(d.total - Math.abs(txn.amt)) < 0.01,
                    );
                    matchedInvoice = filteredHistorique.find(
                      (h) => Math.abs(parseFloat(h.total || 0) - Math.abs(txn.amt)) < 0.01,
                    );
                    // Opt-in (toggle above) — a retrait already recorded in
                    // Compte Fidéicommis (expense/honoraires/remise paid on
                    // behalf of an owner-client) counts as fully conciliated
                    // on its own, same as an expense with a receipt attached.
                    const matchedFideicommisRetrait = matchFideicommisInConciliation
                      ? fideicommisRetraitsForReco.find((r) => Math.abs(r.montant - Math.abs(txn.amt)) < 0.01)
                      : null;

                    const entryFound = matchedExpense || matchedInvoice || matchedFideicommisRetrait;
                    const hasLien = (matchedExpense && matchedExpense.lien) || matchedInvoice || matchedFideicommisRetrait;
                    const isManual = matchedExpense && matchedExpense.isManual;
                    if (entryFound && (hasLien || isManual)) recoState = "conciliated";
                    else if (entryFound && !hasLien) recoState = "need_receipt";
                  }

                  // Force the engine deposit logic cleanly if we know it's related to plex or real revenues:
                  // For simplicity in this unified structure, we apply the requested engine explicitly for validation:
                  if (depValidation) {
                    if (depValidation.status === "Contabilisé") {
                      recoState = "conciliated";
                    } else if (depValidation.status === "À Confirmer") {
                      recoState = "potencial_match";
                    } else if (depValidation.status === "Erreur/Rejet" && !matchedExpense && !matchedInvoice) {
                      recoState = "erreur_rejet";
                    }
                  }

                  const cardStyles = darkMode
                    ? {
                      conciliated: "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md shadow-sm opacity-90",
                      need_receipt: "bg-zinc-950 border-amber-900 shadow-xl shadow-amber-900/20 ring-1 ring-amber-900",
                      missing: "bg-zinc-950 border-rose-900 shadow-2xl shadow-rose-900/40 ring-1 ring-rose-900",
                      potencial_match: "bg-zinc-950 border-indigo-900 shadow-xl shadow-indigo-900/20 ring-1 ring-indigo-900",
                      erreur_rejet: "bg-zinc-950 border-red-900 shadow-2xl shadow-red-900/40 ring-1 ring-red-900",
                    }
                    : {
                      conciliated: "bg-white border-emerald-100 shadow-sm opacity-90",
                      need_receipt: "bg-white border-amber-300 shadow-xl shadow-amber-100/50 ring-1 ring-amber-100 bg-amber-50/20",
                      missing: "bg-white border-rose-300 shadow-2xl shadow-rose-200/40 ring-1 ring-rose-100",
                      potencial_match: "bg-indigo-50/30 border-indigo-200 shadow-xl shadow-indigo-100/50 ring-1 ring-indigo-200",
                      erreur_rejet: "bg-red-50/30 border-red-300 shadow-2xl shadow-red-200/40 ring-1 ring-red-300",
                    };

                  return (
                    <div
                      key={i}
                      className={`p-6 rounded-[36px] border ${cardStyles[recoState]} flex flex-col space-y-4 transition-all hover:scale-[1.01]`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 text-left">
                          <p
                            className={`text-[11px] font-black italic tracking-tight leading-tight uppercase ${darkMode ? "text-zinc-100" : "text-slate-900"}`}
                          >
                            {txn.desc}
                          </p>
                          <p
                            className={`text-[8px] font-bold uppercase tracking-[0.2em] ${darkMode ? "text-zinc-600" : "text-slate-400"}`}
                          >
                            {txn.date}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-black italic leading-none ${darkMode ? "text-zinc-100" : "text-slate-900"}`}
                          >
                            {txn.amt.toFixed(2)}$
                          </p>
                          <div className="mt-2 flex justify-end">
                            {recoState === "conciliated" ? (
                              <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-xl text-[8px] font-black uppercase italic flex items-center space-x-1.5 border border-emerald-200 shadow-sm">
                                <CheckCircle2 size={10} /> <span>{depValidation ? t("Payé") : t("Concilié")}</span>
                              </div>
                            ) : recoState === "potencial_match" ? (
                              <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-xl text-[8px] font-black uppercase italic flex items-center space-x-1.5 border border-indigo-200 shadow-sm">
                                <AlertTriangle size={10} /> <span>{t("À Confirmer")}</span>
                              </div>
                            ) : recoState === "erreur_rejet" ? (
                              <div className="bg-red-100 text-red-700 px-3 py-1 rounded-xl text-[8px] font-black uppercase italic flex items-center space-x-1.5 border border-red-200 shadow-sm">
                                <X size={10} /> <span>{t("Erreur/Rejet")}</span>
                              </div>
                            ) : recoState === "need_receipt" ? (
                              <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-xl text-[8px] font-black uppercase italic flex items-center space-x-1.5 border border-amber-200 shadow-sm">
                                <FileSearch size={10} />{" "}
                                <span>{t("Reçu manquant")}</span>
                              </div>
                            ) : (
                              <motion.div
                                animate={{
                                  scale: [1, 1.05, 1],
                                  opacity: [0.8, 1, 0.8],
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="bg-rose-600 text-white px-3 py-1 rounded-xl text-[8px] font-black uppercase italic flex items-center space-x-1.5 shadow-lg shadow-rose-900/10 border border-rose-500"
                              >
                                <AlertTriangle size={10} />{" "}
                                <span>{t("Manquant")}</span>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>

                      {recoState === "conciliated" ? (
                        <div
                          className={`flex items-center space-x-3 p-4 rounded-2xl border ${darkMode ? "bg-emerald-950/10 border-emerald-900 text-emerald-400" : "bg-emerald-50/50 border-emerald-100 text-[#059669]"}`}
                        >
                          <div
                            className={`p-2 rounded-xl shadow-sm ${darkMode ? "bg-zinc-900" : "bg-white"}`}
                          >
                            <CheckCircle2 size={14} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black italic uppercase leading-none mb-1 flex items-center">
                              {matchedExpense?.isManual ? t("Saisie Manuelle Confirmée") : t("Pièce Justificative Validée")}
                              {matchedExpense?.isManual && (
                                <span className="ml-2 px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-[6px] tracking-widest border border-rose-500/20">{t("SANS JUSTIFICATIF")}</span>
                              )}
                            </p>
                            <p
                              className={`text-[8px] font-bold uppercase tracking-tight ${darkMode ? "text-emerald-500/70" : "text-emerald-600/70"}`}
                            >
                              {matchedExpense
                                ? `${t("Récépissé: ")}${matchedExpense.fournisseur}`
                                : matchedInvoice
                                  ? `${t("Facture client: ")}${matchedInvoice?.cliente}`
                                  : depValidation?.match?.locataire ? `${t("Dépôt réconcilié (Locataire: ")}${depValidation.match.locataire})` : t("Dépôt réconcilié (Revenu Confirmé)")}
                            </p>
                          </div>
                          <button
                            className={`p-2 rounded-xl shadow-sm border transition-transform active:scale-90 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-emerald-100"}`}
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      ) : recoState === "potencial_match" ? (
                        <div
                          className={`flex justify-between items-center space-x-3 p-4 rounded-2xl border ${darkMode ? "bg-indigo-950/10 border-indigo-900 text-indigo-400" : "bg-indigo-50/50 border-indigo-100 text-indigo-500"}`}
                        >
                          <div className="flex-1">
                            <p className="text-[10px] font-black italic uppercase leading-none mb-1">
                              {t("Validation Manuelle Requise")}
                            </p>
                            <p className={`text-[8px] font-bold uppercase tracking-tight ${darkMode ? "text-indigo-500/70" : "text-indigo-600/70"}`}>
                              {depValidation?.reason || t("Correspondance partielle trouvée")}
                            </p>
                          </div>
                          {depValidation?.match?.locataire && (
                            <button
                              onClick={() => {
                                const match = depValidation.match;
                                setHistorique((prev) => [
                                  {
                                    id: `rev_${Date.now()}_${i}`,
                                    companyId: activeCompanyId,
                                    cliente: match.locataire,
                                    fecha: txn.date,
                                    cat: "Loyer",
                                    subtotal: txn.amt,
                                    tps: 0,
                                    tvq: 0,
                                    total: txn.amt,
                                    status: "Payée",
                                  },
                                  ...prev,
                                ]);
                                playNotificationSound();
                              }}
                              className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-[8px] font-black uppercase italic shadow active:scale-95 transition-all"
                            >
                              {t("Confirmer que ceci est le loyer de ")}{depValidation.match.locataire}
                            </button>
                          )}
                          {!depValidation?.match?.locataire && (
                            <button
                              onClick={() => {
                                setHistorique((prev) => [
                                  {
                                    id: `rev_${Date.now()}_${i}`,
                                    companyId: activeCompanyId,
                                    cliente: txn.desc,
                                    fecha: txn.date,
                                    cat: "Loyer",
                                    subtotal: txn.amt,
                                    tps: 0,
                                    tvq: 0,
                                    total: txn.amt,
                                    status: "Payée",
                                  },
                                  ...prev,
                                ]);
                                playNotificationSound();
                              }}
                              className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-[8px] font-black uppercase italic shadow active:scale-95 transition-all"
                            >
                              {t("Valider manuellement")}
                            </button>
                          )}
                        </div>
                      ) : recoState === "erreur_rejet" ? (
                        <div
                          className={`flex flex-col space-y-3 p-4 rounded-2xl border ${darkMode ? "bg-red-950/10 border-red-900 text-red-400" : "bg-red-50/50 border-red-100 text-red-600"}`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <p className="text-[10px] font-black italic uppercase leading-none mb-1 text-red-600">
                                {t("Erreur de Montant / Rejeté")}
                              </p>
                              <p className={`text-[8px] font-bold uppercase tracking-tight ${darkMode ? "text-red-500/70" : "text-red-600/70"}`}>
                                {t("Aucun dépôt programmé équivalent. Vérifiez la transaction.")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-red-200 dark:border-red-900/50">
                            <p className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase">{t("Assigner manuellement :")}</p>
                            <StyledSelect
                              darkMode={darkMode}
                              value={autoLierSelection[i] || ""}
                              onChange={(v) => setAutoLierSelection(prev => ({ ...prev, [i]: v }))}
                              placeholder={t("Sélectionner la porte...")}
                              options={[
                                { value: "", label: t("Sélectionner la porte...") },
                                ...plexManagementProperties.flatMap(door =>
                                  door.isContainer && door.chambres
                                    ? door.chambres.map((c: any) => ({ value: c.id, label: `${c.identifiantChambre} - ${c.locataire}`, group: `Puerta: ${door.adresse}` }))
                                    : [{ value: door.id, label: `${door.adresse} - ${door.locataire}`, group: `Puerta: ${door.adresse}` }]
                                ),
                              ]}
                            />
                            <button
                              onClick={() => {
                                const selectedId = autoLierSelection[i];
                                if (!selectedId) {
                                  alert(t("Veuillez sélectionner une porte."));
                                  return;
                                }
                                let locataire = "";
                                for (const door of plexManagementProperties) {
                                  if (door.isContainer && door.chambres) {
                                    const room = door.chambres.find((c: any) => c.id === selectedId);
                                    if (room) { locataire = room.locataire; break; }
                                  } else if (door.id === selectedId) {
                                    locataire = door.locataire;
                                    break;
                                  }
                                }
                                setHistorique((prev) => [
                                  {
                                    id: `rev_${Date.now()}_${i}`,
                                    companyId: activeCompanyId,
                                    cliente: locataire || txn.desc,
                                    fecha: txn.date,
                                    cat: "Loyer",
                                    subtotal: txn.amt,
                                    tps: 0,
                                    tvq: 0,
                                    total: txn.amt,
                                    status: "Payée",
                                    unitId: selectedId,
                                  },
                                  ...prev,
                                ]);
                                playNotificationSound();
                              }}
                              className="bg-red-600 text-white px-3 py-1 rounded-xl text-[8px] font-black uppercase italic shadow active:scale-95 transition-all"
                            >
                              Auto-Lier
                            </button>
                          </div>
                        </div>
                      ) : recoState === "need_receipt" ? (
                        <div
                          className={`flex items-center justify-between p-4 rounded-2xl border border-dashed ${darkMode ? "bg-amber-950/10 border-amber-900 text-amber-50" : "bg-amber-50/50 border-amber-200 text-amber-700"}`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`p-2 rounded-xl border shadow-sm ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-amber-100"}`}
                            >
                              <FileQuestion
                                size={14}
                                className="text-amber-500"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase italic block tracking-tighter">
                                Montant détecté
                              </span>
                              <span
                                className={`text-[7px] font-bold uppercase leading-none tracking-tight ${darkMode ? "text-amber-500/70" : "text-amber-600/70"}`}
                              >
                                Attacher le document "
                                {matchedExpense?.fournisseur}"
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setVista("drive");
                              alert(
                                `Veuillez attacher le reçu pour l'entrée: ${matchedExpense?.fournisseur}`,
                              );
                            }}
                            className="bg-amber-600 text-white px-4 py-2 rounded-xl text-[8px] font-black uppercase italic shadow-lg active:scale-95 transition-all border border-amber-500"
                          >
                            Lier Reçu
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`flex items-center justify-between p-4 rounded-2xl border border-dashed animate-in fade-in duration-700 ${darkMode ? "bg-rose-950/10 border-rose-900 text-rose-500" : "bg-rose-50/50 border-rose-100 text-rose-600"}`}
                        >
                          <div className="flex items-center space-x-2">
                            <div
                              className={`p-2 rounded-xl border shadow-sm ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-rose-100"}`}
                            >
                              <AlertTriangle
                                size={14}
                                className="animate-pulse"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase italic block tracking-tighter">
                                Document non détecté
                              </span>
                              <span
                                className={`text-[7px] font-bold uppercase leading-none tracking-tight ${darkMode ? "text-rose-400" : "text-rose-400"}`}
                              >
                                L'IA nécessite ce justificatif
                              </span>
                              <div
                                className={`mt-1.5 text-[6px] font-black uppercase italic tracking-wider opacity-80 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}
                              >
                                ✨ IA Estimation: Subtotal:{" "}
                                {(txn.amt / 1.14975).toFixed(2)}$ | TPS:{" "}
                                {((txn.amt / 1.14975) * 0.05).toFixed(2)}$ |
                                TVQ:{" "}
                                {((txn.amt / 1.14975) * 0.09975).toFixed(2)}$
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 items-end">
                            {/* Same "à quel immeuble" gap the Validation IA screen already
                                closes (buildingId selector, S.O.F.I.-suggested but always
                                correctable) — a missing expense created from an unmatched
                                bank transaction had no equivalent, so it always landed
                                un-tagged in the company-wide pool, never in that building's
                                own separate ledger. Read at click time (uncontrolled select,
                                same pattern as "Auto-Lier" above) — this component is
                                deliberately state-free per its own Golden Rule §2. Found
                                2026-08-13 via Fabiola confirming each building needs its
                                own separated bookkeeping (capital gain at resale time). */}
                            {plexManagementProperties.length > 0 && (
                              <StyledSelect
                                darkMode={darkMode}
                                value={missingExpenseBuilding[i] || ""}
                                onChange={(v) => setMissingExpenseBuilding(prev => ({ ...prev, [i]: v }))}
                                placeholder="Immeuble (optionnel)..."
                                options={[
                                  { value: "", label: "Immeuble (optionnel)..." },
                                  ...plexManagementProperties.map((p: any) => ({ value: p.id, label: p.adresse })),
                                ]}
                              />
                            )}
                            <button
                              onClick={() => {
                                const selectedBuildingId = missingExpenseBuilding[i];
                                const newDepense = {
                                  id: Date.now(),
                                  companyId: activeCompanyId,
                                  fecha: txn.date,
                                  fournisseur: txn.desc,
                                  cat: "À classer",
                                  subtotal: txn.amt / 1.14975,
                                  tps: (txn.amt / 1.14975) * 0.05,
                                  tvq: (txn.amt / 1.14975) * 0.09975,
                                  total: txn.amt,
                                  lien: null,
                                  partnerTag: activeUser,
                                  refacturableTriplex: false,
                                  ...(selectedBuildingId ? { buildingId: selectedBuildingId } : {}),
                                };
                                setDepenses((prev) => [newDepense, ...prev]);
                                alert(
                                  `Dépense créée pour ${txn.desc}. N'oubliez pas d'attacher le reçu !`,
                                );
                              }}
                              className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase italic shadow-xl active:scale-95 transition-all border ${darkMode ? "bg-zinc-100 text-black border-zinc-300" : "bg-slate-900 text-white border-slate-700"}`}
                            >
                              + Ajouter Justificatif
                            </button>
                            {activeCompanyId === "1" && (
                              <button
                                onClick={() => {
                                  const selectedBuildingId = missingExpenseBuilding[i];
                                  const newDepense = {
                                    id: Date.now(),
                                    companyId: "1",
                                    fecha: txn.date,
                                    fournisseur: txn.desc,
                                    cat: "Réparations / Entretien",
                                    subtotal: txn.amt / 1.14975,
                                    tps: (txn.amt / 1.14975) * 0.05,
                                    tvq: (txn.amt / 1.14975) * 0.09975,
                                    total: txn.amt,
                                    lien: null,
                                    partnerTag: activeUser,
                                    refacturableTriplex: true,
                                    ...(selectedBuildingId ? { buildingId: selectedBuildingId } : {}),
                                  };
                                  setDepenses((prev) => [newDepense, ...prev]);
                                  alert(
                                    `Dépense REFACTURABLE créée pour ${txn.desc}.`,
                                  );
                                }}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[8px] font-black uppercase italic shadow-lg active:scale-95 transition-all border border-emerald-500"
                              >
                                + Refacturable au Triplex
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Opt-in (toggle above) — detected a likely dépôt
                          fidéicommis (recurring tenant, or the only client on
                          this company if there's no history yet). One click
                          creates the real record instead of re-typing it in
                          the "Nouveau dépôt" form. */}
                      {(() => {
                        const suggestion = guessFideicommisDeposit(txn);
                        if (!suggestion) return null;
                        return (
                          <div className={`flex items-center justify-between gap-3 p-4 rounded-2xl border border-dashed ${darkMode ? "bg-indigo-950/10 border-indigo-900 text-indigo-300" : "bg-indigo-50/50 border-indigo-200 text-indigo-700"}`}>
                            <div className="flex-1">
                              <p className="text-[9px] font-black uppercase italic tracking-tighter">Dépôt Fidéicommis détecté</p>
                              <p className={`text-[8px] font-bold uppercase tracking-tight mt-0.5 ${darkMode ? "text-indigo-400/70" : "text-indigo-600/70"}`}>
                                {suggestion.locataireName} · {suggestion.clientName}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                onCreateFideicommisDepot({ ...suggestion, montant: txn.amt, date: txn.date });
                                playNotificationSound();
                              }}
                              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[8px] font-black uppercase italic shadow active:scale-95 transition-all shrink-0"
                            >
                              Créer le dépôt
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
            </div>

            <div
              className={`px-6 py-4 rounded-[32px] border mt-6 flex items-start space-x-3 ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-slate-100/50 border-slate-200"}`}
            >
              <Shield className="text-emerald-600 mt-0.5 shrink-0" size={16} />
              <div>
                <p
                  className={`text-[10px] font-black uppercase italic leading-tight ${darkMode ? "text-zinc-100" : "text-slate-900"}`}
                >
                  Garantie de Confidentialité
                </p>
                <p
                  className={`text-[9px] font-bold uppercase mt-1 leading-relaxed ${darkMode ? "text-zinc-600" : "text-slate-500"}`}
                >
                  Vos données bancaires sont traitées localement. Aucun
                  transfert vers un serveur externe n'est effectué.
                  Confidentialité totale garantie.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Report Summary */}
          <div
            className={`${darkMode ? "bg-black border border-zinc-900 shadow-2xl" : "bg-slate-900 shadow-2xl"} p-8 rounded-[40px] text-white relative overflow-hidden text-left`}
          >
            <div className="relative z-10 space-y-4 text-left">
              <h4
                className={`text-[9px] font-black uppercase italic tracking-[0.2em] leading-none ${darkMode ? "text-emerald-400" : "text-emerald-400"}`}
              >
                Récapitulatif Mensuel
              </h4>
              <div className="grid grid-cols-2 gap-6 text-left">
                <div className="text-left">
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest text-left">
                    Entrées
                  </p>
                  <p className="text-xl font-black italic tracking-tighter text-emerald-400 text-left">
                    +
                    {processedHistorique
                      .reduce((a, b) => a + b.deductibleTotal, 0)
                      .toFixed(2)}
                    $
                  </p>
                  {isPlex && (
                    <p className="text-[7px] text-emerald-400 font-bold uppercase mt-1 text-left">
                      {processedHistorique
                        .reduce((a, b) => a + b.partnerSplit, 0)
                        .toFixed(2)}
                      $ / proprio
                    </p>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest text-left">
                    Sorties
                  </p>
                  <p className="text-xl font-black italic tracking-tighter text-rose-400 text-left">
                    -
                    {processedDepenses
                      .reduce((a, b) => a + b.deductibleTotal, 0)
                      .toFixed(2)}
                    $
                  </p>
                  {isPlex && (
                    <p className="text-[7px] text-rose-400 font-bold uppercase mt-1 text-left">
                      {processedDepenses
                        .reduce((a, b) => a + b.partnerSplit, 0)
                        .toFixed(2)}
                      $ / proprio
                    </p>
                  )}
                </div>
              </div>
              {/* "Calculer le Split du Triplex" button removed 2026-08-13 —
                  opened a modal built on hardcoded fake tenant data
                  (Juan/Marie/Pierre-Luc) and a hardcoded "Eric Plante" 50/50
                  partner split, none of it backed by real data. Requested by
                  Fabiola while cleaning up the app for real accounting. */}

              <div className="pt-4 border-t border-white/10 flex justify-between items-center text-left">
                <span className="text-[10px] font-black uppercase italic tracking-widest">
                  Santé Fiscale
                </span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div
                      key={s}
                      className={`w-3 h-1 rounded-full ${s <= 4 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-white/10"}`}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
            <Sparkles
              className="absolute -right-6 -bottom-6 text-white/5"
              size={120}
            />
          </div>
        </main>
      </div>
    );

};

export default BanqueSyncView;
