/**
 * RapportComptable.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Gestionnaires (también compartido con Entrepreneurs/perfiles multi)
 * Extraído de: src/App.tsx (L17884–L19473) — Fase 7 del desmantelamiento modular
 *
 * Componente más grande extraído hasta ahora: 1,590 líneas originales.
 * Todos los cálculos (filterBySelectedPeriod, processedReportExpenses,
 * mappedInvoices, sortedRows, etc.) se realizan localmente dentro del
 * componente — idéntico al closure original de App.tsx.
 *
 * CERO estados propios encapsulados — todo llega vía props tipadas.
 * Mandato de integridad contable (Golden Rule §2):
 *   NO modificar la lógica de cálculo fiscal, los filtros de período
 *   ni el mapeo de filas del grand livre.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { UnitDoc } from "../../lib/dataService";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Folder,
  Home,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  Percent,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sun,
  TrendingDown,
  TrendingUp,
  Trash2,
  X,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// ── Currency formatter — fr-CA, CAD ─────────────────────────────────────────
// Produces: 86 250,00 $ (NNBSP grouping, comma decimal, $ suffix)
const _cadFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
/** Format a number as Québec CAD currency: 86250 → "86 250,00 $" */
const fmtCAD = (n: number) => _cadFormatter.format(n);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RapportComptableProps {
  // Mode
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;

  // Données brutes (calculées localement dans le composant — identique au closure App)
  listaEmpresas: any[];
  historique: any[];
  depenses: any[];
  bankTransactions: any[];
  customDossiers: Record<string, any[]>;
  buildingWideCats: string[];
  partnerData: Record<string, any>;
  partnersPct: Record<string, number>;
  partners: string[];
  activeUser: string;
  currentCompany: any;

  // États de filtres (globaux — aussi utilisés par d'autres modules)
  selectedRapportPeriod: string;
  setSelectedRapportPeriod: (val: string) => void;
  selectedRapportProfile: string;
  setSelectedRapportProfile: (val: string) => void;
  selectedMonth: number;
  activeCompanyId: string;
  porcBureau: number;

  // UI dropdowns (états globaux)
  showPeriodDropdown: boolean;
  setShowPeriodDropdown: (val: boolean) => void;
  showProfileDropdown: boolean;
  setShowProfileDropdown: (val: boolean) => void;
  showFormatDropdown: boolean;
  setShowFormatDropdown: (val: boolean) => void;
  selectedRapportFormat: string;
  setSelectedRapportFormat: (val: string) => void;

  // Modaux supplémentaires (globaux — partagés avec autres vues)
  showRapportDispatcherModal: boolean;
  setShowRapportDispatcherModal: (val: boolean) => void;
  showLoyerModal: boolean;
  setShowLoyerModal: (val: boolean) => void;
  showPlexExpenseModal: boolean;
  setShowPlexExpenseModal: (val: boolean) => void;

  // Formulaires loyer/plex (états globaux)
  loyerForm: any;
  setLoyerForm: (val: any) => void;
  loyerEditingId: number | null;
  plexLoyers: any[];
  setPlexLoyers: (fn: any[] | ((prev: any[]) => any[])) => void;
  plexExpenseForm: any;
  setPlexExpenseForm: (val: any) => void;
  plexExpenseEditingId: number | null;
  /** All units from Firestore `units` collection — powers the loyer dropdown */
  allUnits: UnitDoc[];

  // Handlers loyer/plex (définis dans App)
  handleAdresseChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveLoyer: () => void;
  handleSavePlexExpense: () => void;

  // Données plex supplémentaires
  plexDepenses: any[];
  setPlexDepenses: (fn: any[] | ((prev: any[]) => any[])) => void;

  // Dépenses globales
  setDepenses: (fn: any[] | ((prev: any[]) => any[])) => void;

  // Modaux de dépenses manuelles et autonomes
  showManualExpenseModal: boolean;
  setShowManualExpenseModal: (val: boolean) => void;
  manualExpenseForm: any;
  setManualExpenseForm: (val: any) => void;
  showAutonomeExpenseModal: boolean;
  setShowAutonomeExpenseModal: (val: boolean) => void;
  autonomeExpenseForm: any;
  setAutonomeExpenseForm: (val: any) => void;

  // Handlers de dépenses (définis dans App)
  handleSaveAutonomeExpense: () => void;

  // Profil comptable
  isSuperAdmin: boolean;
  currentComptable: any;
  comptableEmail: string;
  setComptablesConfig: (val: any) => void;
  comptableMessage: string;
  setComptableMessage: (val: string) => void;
  rapportSentSuccess: boolean;
  setRapportSentSuccess: (val: boolean) => void;
  showComptableModal: boolean;
  setShowComptableModal: (val: boolean) => void;
  isTransmittingChannel: string | null;
  setIsTransmittingChannel: (val: string | null) => void;

  // Paywall
  setPaywallTargetTier: (val: string) => void;
  setShowPaywallModal: (val: boolean) => void;

  // Fonctions utilitaires App (déjà en partie)
  getEffectiveTier: () => string;

  // Gestion des pièces jointes
  setEditingExpense: (val: any) => void;
  setSelectedFac: (val: any) => void;
  setShowPreview: (val: boolean) => void;
  setReceiptPreviewUrl: (val: string | null) => void;
  setReceiptPreviewName: (val: string) => void;

  // Toast système
  dispatcherSuccessToast: any;
  setDispatcherSuccessToast: (val: any) => void;

  // Fonctions utilitaires App
  validateDeposit: (txn: any) => { status: string };
  playNotificationSound: () => void;

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

const RapportComptable: React.FC<RapportComptableProps> = ({
  darkMode,
  setDarkMode,
  listaEmpresas,
  historique,
  depenses,
  bankTransactions,
  customDossiers,
  buildingWideCats,
  partnerData,
  partnersPct,
  partners,
  activeUser,
  currentCompany,
  selectedRapportPeriod,
  setSelectedRapportPeriod,
  selectedRapportProfile,
  setSelectedRapportProfile,
  selectedMonth,
  activeCompanyId,
  porcBureau,
  showPeriodDropdown,
  setShowPeriodDropdown,
  showProfileDropdown,
  setShowProfileDropdown,
  showFormatDropdown,
  setShowFormatDropdown,
  selectedRapportFormat,
  setSelectedRapportFormat,
  showRapportDispatcherModal,
  setShowRapportDispatcherModal,
  showLoyerModal,
  setShowLoyerModal,
  showPlexExpenseModal,
  setShowPlexExpenseModal,
  loyerForm,
  setLoyerForm,
  loyerEditingId,
  plexLoyers,
  setPlexLoyers,
  allUnits,
  plexExpenseForm,
  setPlexExpenseForm,
  plexExpenseEditingId,
  handleAdresseChange,
  handleSaveLoyer,
  handleSavePlexExpense,
  plexDepenses,
  setPlexDepenses,
  setDepenses,
  showManualExpenseModal,
  setShowManualExpenseModal,
  manualExpenseForm,
  setManualExpenseForm,
  showAutonomeExpenseModal,
  setShowAutonomeExpenseModal,
  autonomeExpenseForm,
  setAutonomeExpenseForm,
  handleSaveAutonomeExpense,
  isSuperAdmin,
  currentComptable,
  comptableEmail,
  setComptablesConfig,
  comptableMessage,
  setComptableMessage,
  rapportSentSuccess,
  setRapportSentSuccess,
  showComptableModal,
  setShowComptableModal,
  isTransmittingChannel,
  setIsTransmittingChannel,
  setPaywallTargetTier,
  setShowPaywallModal,
  getEffectiveTier,
  setEditingExpense,
  setSelectedFac,
  setShowPreview,
  setReceiptPreviewUrl,
  setReceiptPreviewName,
  dispatcherSuccessToast,
  setDispatcherSuccessToast,
  validateDeposit,
  playNotificationSound,
  setVista,
  setIsSidebarOpen,
  WorkspaceSidebar,
  LogoPrincipal,
}) => {
    const profileSelected =
      listaEmpresas.find((e) => e.nombre === selectedRapportProfile) ||
      currentCompany;
    const profileId = profileSelected ? profileSelected.id : activeCompanyId;

    const compFilteredInvoices = historique.filter(
      (h) => h.companyId === profileId,
    );
    const compFilteredExpenses = depenses.filter(
      (d) => d.companyId === profileId,
    );

    const filterBySelectedPeriod = (items: any[]) =>
      items.filter((item) => {
        const dateStr = item.fecha || item.date;
        if (!dateStr) return true;
        const d = new Date(dateStr);
        const currentYear = 2026;

        if (selectedRapportPeriod === "Mois en cours") {
          return (
            d.getMonth() === selectedMonth && d.getFullYear() === currentYear
          );
        }
        if (selectedRapportPeriod === "Dernier trimestre") {
          const m = d.getMonth();
          return (
            d.getFullYear() === currentYear &&
            m >= selectedMonth - 2 &&
            m <= selectedMonth
          );
        }
        if (selectedRapportPeriod === "Année financière 2026") {
          return d.getFullYear() === currentYear;
        }
        return true;
      });

    const periodFilteredInvoices = filterBySelectedPeriod(compFilteredInvoices);
    const periodFilteredExpenses = filterBySelectedPeriod(compFilteredExpenses);

    const periodFilteredBankTxn = filterBySelectedPeriod(bankTransactions.filter(t => t.companyId === activeCompanyId));

    // Data Fidelity Protection: sum of 'Contabilisé' entries ONLY
    const totalRevenus = periodFilteredBankTxn.reduce((acc, txn) => {
      const v = validateDeposit(txn);
      if (txn.amt > 0 && v.status === "Contabilisé") {
        return acc + txn.amt;
      }
      return acc;
    }, 0);
    const totalDepenses = periodFilteredExpenses.reduce(
      (a, b) => a + (b.total || 0),
      0,
    );

    const tpsCollectee = periodFilteredInvoices.reduce(
      (a, b) => a + (b.tps || 0),
      0,
    );
    const tvqCollectee = periodFilteredInvoices.reduce(
      (a, b) => a + (b.tvq || 0),
      0,
    );

    const processedReportExpenses = periodFilteredExpenses.map((d) => {
      const companyFolders = customDossiers[profileId] || [];
      const matchingFolder = companyFolders.find((f) => f.name === d.cat);
      const dossierRule = matchingFolder ? matchingFolder.rule : "full";

      let fiscalRate = 1.0;
      if (profileId === "3") {
        const isBuildingWide = buildingWideCats.includes(d.cat);
        fiscalRate = isBuildingWide ? 0.666 : 1.0;
      } else {
        if (dossierRule === "half") fiscalRate = 0.5;
        else if (dossierRule === "homeoffice") fiscalRate = porcBureau;
      }

      return {
        ...d,
        deductibleTps: (d.tps || 0) * fiscalRate,
        deductibleTvq: (d.tvq || 0) * fiscalRate,
      };
    });

    const tpsPayee = processedReportExpenses.reduce(
      (a, b) => a + b.deductibleTps,
      0,
    );
    const tvqPayee = processedReportExpenses.reduce(
      (a, b) => a + b.deductibleTvq,
      0,
    );

    const netTaxBalance = tpsCollectee - tpsPayee + (tvqCollectee - tvqPayee);

    const mappedInvoices = periodFilteredInvoices.map((idx) => ({
      id: idx.id,
      date: idx.fecha || idx.date,
      tiers: idx.cliente || idx.client || "Client Général",
      compte: "Loyers / Ventes",
      partenaire: idx.partenaire || "Fabiola",
      net: idx.subtotal,
      tps: idx.tps,
      tvq: idx.tvq,
      total: idx.total,
      type: "revenu",
      lien: idx.lien,
      status: idx.status,
      original: idx,
    }));

    const mappedExpenses = periodFilteredExpenses.map((idx) => ({
      id: idx.id,
      date: idx.fecha || idx.date,
      tiers: idx.proveedor || idx.fournisseur || idx.tiers || "Fournisseur Général",
      compte: idx.cat || "Frais de fonctionnement",
      partenaire: idx.partenaire || "Fabiola",
      net: idx.subtotal,
      tps: idx.tps,
      tvq: idx.tvq,
      total: idx.total,
      type: "depense",
      lien: idx.lien,
      status: idx.status,
      original: idx,
    }));

    const sortedRows = [...mappedInvoices, ...mappedExpenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const displayRows =
      sortedRows.length > 0
        ? sortedRows
        : [
          {
            id: "m1",
            date: "2026-05-15",
            tiers: currentCompany?.nombre || "Solutions GPA Inc.",
            compte: "Services Conseil",
            partenaire: "Fabiola",
            net: 1500.0,
            tps: 75.0,
            tvq: 149.63,
            total: 1724.63,
            type: "revenu",
            lien: null,
            status: "Payée",
            original: null,
          },
          {
            id: "m2",
            date: "2026-05-12",
            tiers: "Hydro-Québec",
            compte: "Électricité / Chauffage",
            partenaire: "Fabiola",
            net: 0,
            tps: 0,
            tvq: 0,
            total: 0,
            type: "depense",
            lien: null,
            status: "Payée",
            original: null,
          },
          {
            id: "m3",
            date: "2026-05-08",
            tiers: "Videotron",
            compte: "Internet / Télécom",
            partenaire: "Natalia",
            net: 85.0,
            tps: 4.25,
            tvq: 8.48,
            total: 97.73,
            type: "depense",
            lien: null,
            status: "Payée",
            original: null,
          },
        ];

    return (
      <div
        className={`min-h-screen relative ${darkMode ? "bg-[#0A0A0B] text-zinc-105" : "bg-[#FAF9F6] text-slate-900"} flex flex-col font-sans text-left animate-in zoom-in-95 max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}
      >
        <WorkspaceSidebar />

        {/* Soft background pastel glows for minimalist warmth */}
        <div className="absolute top-1/4 left-1/4 w-[340px] h-[340px] rounded-full bg-teal-500/[0.04] dark:bg-teal-500/[0.02] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[380px] h-[380px] rounded-full bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] blur-[120px] pointer-events-none" />

        <header
          className={`${darkMode ? "bg-zinc-950/80 border-zinc-900" : "bg-white/85 border-slate-200"} backdrop-blur-md px-6 py-5 border-b flex items-center justify-between sticky top-0 z-40`}
          style={{
            borderTop: `4px solid ${darkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.3)"}`,
          }}
        >
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden mr-1"
            >
              <Menu size={18} />
            </button>
            <button
              onClick={() => setVista("reportes")}
              className={`p-2 transition-colors rounded-xl transition-all ${darkMode ? "text-zinc-500 hover:text-white hover:bg-zinc-900" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"}`}
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="font-black uppercase italic tracking-tighter text-xl leading-none">
                Rapports Comptables
              </h2>
              <p className="text-[7.5px] font-black uppercase text-slate-400 italic tracking-[0.2em] mt-1.5">
                Paquet de fin de période pour Natalia
              </p>
            </div>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2.5 rounded-full transition-all ${darkMode ? "text-amber-400 bg-zinc-900" : "text-slate-400 bg-white border border-slate-100 shadow-sm"}`}
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </header>

        <main className="p-6 space-y-6 max-w-5xl mx-auto w-full flex-1 relative z-10 text-left">
          {/* 1. FILTERS HEADER (Filtres de Période) */}
          <div
            className={`p-5 rounded-[28px] border ${darkMode ? "bg-zinc-950/70 border-zinc-901" : "bg-white border-slate-200/50 shadow-sm"} grid grid-cols-1 md:grid-cols-3 gap-4`}
          >
            {/* Filter 1: Période */}
            <div className="relative">
              <label className="block text-[8px] font-black uppercase italic tracking-wider text-slate-400 mb-1.5">
                Période fiscale
              </label>
              <button
                onClick={() => {
                  setShowPeriodDropdown(!showPeriodDropdown);
                  setShowProfileDropdown(false);
                  setShowFormatDropdown(false);
                }}
                className={`w-full px-4 py-3 rounded-2xl border text-left flex justify-between items-center text-[10px] font-black uppercase italic tracking-wide transition-all ${darkMode ? "bg-zinc-900 border-zinc-805 text-zinc-300 hover:bg-zinc-850" : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50"}`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar
                    size={13}
                    className="text-teal-600 dark:text-teal-400"
                  />
                  <span>{selectedRapportPeriod}</span>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              <AnimatePresence>
                {showPeriodDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowPeriodDropdown(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className={`absolute left-0 right-0 mt-2 p-2 rounded-2xl shadow-xl border z-50 overflow-hidden ${darkMode ? "bg-zinc-900 border-zinc-805" : "bg-white border-slate-150"}`}
                    >
                      {[
                        "Mois en cours",
                        "Dernier trimestre",
                        "Année financière 2026",
                      ].map((period) => (
                        <button
                          key={period}
                          onClick={() => {
                            setSelectedRapportPeriod(period);
                            setShowPeriodDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left rounded-xl text-[9px] font-black uppercase italic tracking-wider transition-all ${selectedRapportPeriod === period ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800"}`}
                        >
                          {period}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Filter 2: Profil */}
            <div className="relative">
              <label className="block text-[8px] font-black uppercase italic tracking-wider text-slate-400 mb-1.5">
                Profil d'entreprise
              </label>
              <button
                onClick={() => {
                  setShowProfileDropdown(!showProfileDropdown);
                  setShowPeriodDropdown(false);
                  setShowFormatDropdown(false);
                }}
                className={`w-full px-4 py-3 rounded-2xl border text-left flex justify-between items-center text-[10px] font-black uppercase italic tracking-wide transition-all ${darkMode ? "bg-zinc-900 border-zinc-805 text-zinc-300 hover:bg-zinc-850" : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50"}`}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Briefcase
                    size={13}
                    className="text-emerald-600 dark:text-emerald-400 flex-shrink-0"
                  />
                  <span className="truncate">{selectedRapportProfile}</span>
                </div>
                <ChevronDown
                  size={14}
                  className="text-slate-400 flex-shrink-0"
                />
              </button>

              <AnimatePresence>
                {showProfileDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProfileDropdown(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className={`absolute left-0 right-0 mt-2 p-2 rounded-2xl shadow-xl border z-50 overflow-hidden ${darkMode ? "bg-zinc-905 border-zinc-805" : "bg-white border-slate-150"}`}
                    >
                      {listaEmpresas.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => {
                            setSelectedRapportProfile(e.nombre);
                            setShowProfileDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left rounded-xl text-[9px] font-black uppercase italic tracking-wider transition-all truncate flex items-center justify-between ${selectedRapportProfile === e.nombre ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800"}`}
                        >
                          <span>{e.nombre}</span>
                          <span className="text-[6.5px] font-semibold opacity-60 px-1 py-0.5 rounded bg-slate-100 dark:bg-zinc-805">
                            {e.industry}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Filter 3: Format */}
            <div className="relative">
              <label className="block text-[8px] font-black uppercase italic tracking-wider text-slate-400 mb-1.5">
                Format d'exportation
              </label>
              <button
                onClick={() => {
                  setShowFormatDropdown(!showFormatDropdown);
                  setShowPeriodDropdown(false);
                  setShowProfileDropdown(false);
                }}
                className={`w-full px-4 py-3 rounded-2xl border text-left flex justify-between items-center text-[10px] font-black uppercase italic tracking-wide transition-all ${darkMode ? "bg-zinc-900 border-zinc-805 text-zinc-300 hover:bg-zinc-850" : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50"}`}
              >
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet
                    size={13}
                    className="text-amber-600 dark:text-amber-400"
                  />
                  <span>{selectedRapportFormat}</span>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              <AnimatePresence>
                {showFormatDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowFormatDropdown(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className={`absolute left-0 right-0 mt-2 p-2 rounded-2xl shadow-xl border z-50 overflow-hidden ${darkMode ? "bg-zinc-900 border-zinc-805" : "bg-white border-slate-150"}`}
                    >
                      {["Excel / CSV", "PDF Unifié"].map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => {
                            setSelectedRapportFormat(fmt);
                            setShowFormatDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left rounded-xl text-[9px] font-black uppercase italic tracking-wider transition-all ${selectedRapportFormat === fmt ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800"}`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 2. FISCAL SUMMARY CARDS (Aperçu de la Période) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {/* Card 1: Revenues */}
            <div
              className={`p-6 rounded-[32px] border transition-all ${darkMode ? "bg-zinc-950/70 border-zinc-900/85 hover:border-emerald-500/20 shadow-lg shadow-emerald-950/[0.01]" : "bg-white border-slate-200/50 hover:shadow-lg shadow-sm hover:border-emerald-500/20"}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div
                  className={`p-3 rounded-2xl ${darkMode ? "bg-emerald-950/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}
                >
                  <TrendingUp size={20} />
                </div>
                <span className="text-[7.5px] font-black uppercase text-slate-400 italic bg-slate-100 dark:bg-zinc-900 px-2 py-1 rounded-lg">
                  Brut Fiscal
                </span>
              </div>
              <p className="text-[8px] font-black uppercase italic text-slate-400 tracking-wider">
                Total des Revenus
              </p>
              <h3 className="text-2xl font-black italic tracking-tighter text-emerald-600 dark:text-emerald-400 mt-1">
                {fmtCAD(totalRevenus)}
              </h3>
              <p className="text-[7px] font-bold text-slate-400 dark:text-zinc-500 mt-2.5 uppercase tracking-wide">
                Indice de rentabilité • Est. AutoCompt
              </p>
            </div>

            {/* Card 2: Expenditures */}
            <div
              className={`p-6 rounded-[32px] border transition-all ${darkMode ? "bg-zinc-950/70 border-zinc-900/85 hover:border-teal-500/20 shadow-lg shadow-emerald-950/[0.01]" : "bg-white border-slate-200/50 hover:shadow-lg shadow-sm hover:border-teal-500/20"}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div
                  className={`p-3 rounded-2xl ${darkMode ? "bg-teal-950/20 text-teal-400" : "bg-teal-50 text-teal-600"}`}
                >
                  <Percent size={20} />
                </div>
                <span className="text-[7.5px] font-black uppercase text-slate-400 italic bg-slate-100 dark:bg-zinc-900 px-2 py-1 rounded-lg">
                  Frais Réclamables
                </span>
              </div>
              <p className="text-[8px] font-black uppercase italic text-slate-400 tracking-wider">
                Total des Dépenses
              </p>
              <h3 className="text-2xl font-black italic tracking-tighter text-teal-600 dark:text-teal-400 mt-1">
                {fmtCAD(totalDepenses)}
              </h3>
              <p className="text-[7px] font-bold text-slate-400 dark:text-zinc-500 mt-2.5 uppercase tracking-wide">
                Justificatifs réclamables indexés
              </p>
            </div>

            {/* Card 3: TPS & TVQ Breakdown */}
            <div
              className={`p-6 rounded-[32px] border transition-all ${darkMode ? "bg-zinc-950/70 border-zinc-900/85 hover:border-teal-500/20 shadow-lg shadow-emerald-955/[0.01]" : "bg-white border-slate-200/50 hover:shadow-lg shadow-sm hover:border-teal-500/20"} flex flex-col justify-between`}
            >
              <div>
                <p className="text-[8px] font-black uppercase italic text-slate-400 tracking-wider">
                  Retenues TPS/TVQ accumulées
                </p>

                <div className="grid grid-cols-2 gap-3 mt-3 border-b border-dashed border-slate-100 dark:border-zinc-900 pb-2.5">
                  <div>
                    <h5 className="text-[6.5px] font-black text-slate-400 text-left uppercase">
                      TPS (Perçue vs Payée)
                    </h5>
                    <div className="flex items-center space-x-1.5 mt-1 font-mono text-[9px]">
                      <span className="text-emerald-600 font-bold">
                        +{fmtCAD(tpsCollectee)}
                      </span>
                      <span className="text-slate-400 dark:text-zinc-650">
                        /
                      </span>
                      <span className="text-teal-600 dark:text-teal-400">
                        -{fmtCAD(tpsPayee)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-[6.5px] font-black text-slate-400 text-left uppercase">
                      TVQ (Perçue vs Payée)
                    </h5>
                    <div className="flex items-center space-x-1.5 mt-1 font-mono text-[9px]">
                      <span className="text-emerald-600 font-bold">
                        +{fmtCAD(tvqCollectee)}
                      </span>
                      <span className="text-slate-400 dark:text-zinc-650">
                        /
                      </span>
                      <span className="text-teal-600 dark:text-teal-400">
                        -{fmtCAD(tvqPayee)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[7.5px] font-black uppercase text-slate-500 dark:text-zinc-400">
                  Net estimatif à payer
                </span>
                <span
                  className={`font-mono text-[10px] font-black italic px-2 py-1 rounded-lg ${netTaxBalance >= 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}
                >
                  {netTaxBalance >= 0 ? "+" : ""}
                  {fmtCAD(netTaxBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. 8 COLUMNS DOCUMENT PREVIEW */}
          <div
            className={`p-6 rounded-[32px] border ${darkMode ? "bg-zinc-950/70 border-zinc-900/85 shadow-2xl" : "bg-white border-slate-200/50 shadow-sm"} text-left overflow-hidden flex flex-col`}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h4 className="text-[9px] font-black uppercase italic text-slate-400 tracking-wider">
                  PREVISUALISATION DES 8 COLONNES FISCALES
                </h4>
                <p className="text-[7px] text-slate-400 mt-1 uppercase tracking-tight">
                  Registre consolidé pour conformité avec Revenu Québec
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wide">
                  Prêt pour audit
                </span>
              </div>
            </div>

            <div className="overflow-x-auto w-full no-scrollbar">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="text-[8px] uppercase font-black bg-slate-50 dark:bg-zinc-900/50 text-slate-500 dark:text-zinc-400 rounded-xl">
                    <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-left rounded-l-xl">
                      Date
                    </th>
                    <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-left">
                      Fournisseur
                    </th>
                    <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-left">
                      Catégorie
                    </th>
                    <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-left">
                      Partenaire
                    </th>
                    <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-right">
                      Sous-total Net
                    </th>
                    <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-right">
                      TPS
                    </th>
                    <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-right">
                      TVQ
                    </th>
                    <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-right">
                      Total
                    </th>
                    <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-center rounded-r-xl">
                      Facture
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${darkMode ? "divide-zinc-900" : "divide-slate-100"}`}
                >
                  {displayRows.map((row) => (
                    <tr
                      key={row.id}
                      className="text-[9.5px] font-bold transition-all hover:bg-slate-50/50 dark:hover:bg-zinc-900/30"
                    >
                      <td className="py-4 px-4 font-mono text-slate-400 dark:text-zinc-500 text-left">
                        {row.date}
                      </td>
                      <td className="py-4 px-4 text-left">
                        <span
                          className={`${darkMode ? "text-zinc-200" : "text-slate-800"}`}
                        >
                          {row.tiers}
                        </span>
                        <span
                          className={`ml-2 text-[6.5px] px-1.5 py-0.5 rounded-full font-black uppercase ${row.type === "revenu" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}
                        >
                          {row.type === "revenu" ? "Rev" : "Dép"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-500 dark:text-zinc-400 italic font-sans text-left">
                        {row.compte}
                      </td>
                      <td className="py-4 px-4 text-left">
                        <span className="text-[8px] font-black uppercase italic tracking-wider text-slate-400 bg-slate-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-md">
                          {row.partenaire}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-right text-slate-600 dark:text-zinc-400">
                        {row.status === "Traitement de la facture en cours..." ? "..." : fmtCAD(row.net)}
                      </td>
                      <td className="py-4 px-4 font-mono text-right text-slate-500 dark:text-zinc-500">
                        {row.status === "Traitement de la facture en cours..." ? "..." : fmtCAD(row.tps)}
                      </td>
                      <td className="py-4 px-4 font-mono text-right text-slate-500 dark:text-zinc-500">
                        {row.status === "Traitement de la facture en cours..." ? "..." : fmtCAD(row.tvq)}
                      </td>
                      <td className="py-4 px-4 font-mono text-right font-black italic text-slate-900 dark:text-zinc-100">
                        {row.status === "Traitement de la facture en cours..." ? (
                          <span className="text-amber-500 animate-pulse text-[8px] uppercase tracking-widest leading-tight">Traitement...</span>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span>{fmtCAD(row.total)}</span>
                            {row.status === "En attente" && (
                              <span
                                onClick={() => {
                                  if (row.type === "depense" && row.lien) {
                                    setEditingExpense(row.original);
                                  }
                                }}
                                className="text-[7px] bg-rose-500/10 text-rose-600 dark:text-rose-400 mt-1 px-1.5 py-0.5 rounded uppercase tracking-wider cursor-pointer hover:bg-rose-500 hover:text-white transition-colors"
                              >
                                À VALIDER
                              </span>
                            )}
                            {row.status === "Vérifiée" && (
                              <span className="text-[7px] text-emerald-500 italic mt-0.5 uppercase tracking-widest">
                                vérifié
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {(row.lien || row.type === "revenu") && (
                          <button
                            onClick={() => {
                              if (row.type === "revenu") {
                                setSelectedFac(row.original);
                                setShowPreview(true);
                              } else if (row.lien) {
                                // Provide exactly the preview for receipt if verifiable or validated
                                if (row.original.status === "Vérifiée") {
                                  setReceiptPreviewUrl(row.lien);
                                  setReceiptPreviewName(`Facture: ${row.tiers}`);
                                } else {
                                  setEditingExpense(row.original);
                                }
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${darkMode ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200"}`}
                            title="Voir le document"
                          >
                            <Eye size={16} className={row.type === "revenu" ? "text-emerald-500" : "text-amber-500"} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. ACTIONS FOR TRANSMISSION */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => {
                playNotificationSound();
                const text =
                  `Date,Tiers,Compte,Partenaire,Net,TPS,TVQ,Total\n` +
                  displayRows
                    .map(
                      (r) =>
                        `"${r.date}","${r.tiers}","${r.compte}","${r.partenaire}",${r.net},${r.tps},${r.tvq},${r.total}`,
                    )
                    .join("\n");
                const blob = new Blob([text], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Livre_Comptes_AutoCompt_${selectedRapportProfile.replace(/\s+/g, "_")}_${selectedRapportPeriod.replace(/\s+/g, "_")}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className={`py-4 px-6 rounded-2xl flex items-center justify-center space-x-2 text-[9.5px] font-black uppercase italic tracking-wider transition-all border ${darkMode ? "bg-zinc-900 text-zinc-300 border-zinc-805 hover:border-zinc-700" : "bg-white text-slate-705 border-slate-200 hover:bg-slate-50"}`}
            >
              <Download size={15} />
              <span>Télécharger le CSV local</span>
            </button>

            <button
              onClick={() => {
                playNotificationSound();
                setShowRapportDispatcherModal(true);
              }}
              className="flex-1 py-4.5 rounded-2xl text-[9.5px] font-black uppercase italic tracking-widest bg-gradient-to-r from-teal-600 via-[#059669] to-teal-500 text-white shadow-lg shadow-emerald-900/25 flex items-center justify-center space-x-2.5 transition-all hover:scale-[1.01] active:scale-98"
            >
              <Send size={15} />
              <span>Envoyer</span>
            </button>
          </div>
        </main>

        {/* MODAL PLEX: LOYER ET DEPENSES */}
        <AnimatePresence>
          {showLoyerModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 animate-out fade-out">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className={`relative w-full max-w-lg rounded-[32px] border overflow-hidden shadow-2xl ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-slate-200"}`}
              >
                <div className={`p-6 border-b flex justify-between items-center ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0/10 text-orange-500">
                      <Home size={20} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-black italic tracking-tighter ${darkMode ? "text-zinc-100" : "text-slate-900"}`}>{loyerEditingId ? "Modifier le loyer" : "Enregistrer un loyer"}</h3>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Plex: Revenus</p>
                    </div>
                  </div>
                  <button onClick={() => setShowLoyerModal(false)} className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-slate-100 text-slate-500"}`}>
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 space-y-4">

                  {/* ── Unité Selector (Firestore `units` FK) ────────────────────── */}
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                      Unité locative
                    </label>
                    {allUnits.length > 0 ? (
                      <select
                        value={loyerForm.unitId || ""}
                        onChange={(e) => {
                          const selectedUnit = allUnits.find(u => u.id === e.target.value);
                          setLoyerForm({
                            ...loyerForm,
                            unitId:     e.target.value,
                            buildingId: selectedUnit?.buildingId || "",
                            locataire:  selectedUnit?.tenantName || loyerForm.locataire,
                            typeBail:   selectedUnit ? (selectedUnit.unitName.toLowerCase().includes("chambre") || selectedUnit.unitName.toLowerCase().includes("habitation") ? "Habitation" : "Logement complet") : loyerForm.typeBail,
                            // keep legacy fields for backward-compat display
                            adresse:    selectedUnit?.buildingId || loyerForm.adresse,
                            unite:      selectedUnit?.unitName    || loyerForm.unite,
                          });
                        }}
                        className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-orange-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                      >
                        <option value="">-- Sélectionner une unité --</option>
                        {allUnits.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.unitName}{u.tenantName ? ` — ${u.tenantName}` : ""} ({u.isActive ? "Actif" : "Vacant"})
                          </option>
                        ))}
                      </select>
                    ) : (
                      // Fallback: manual text entry when no units exist yet
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={loyerForm.adresse}
                          onChange={handleAdresseChange}
                          className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-orange-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                          placeholder="Adresse de l'immeuble"
                        />
                        <input
                          type="text"
                          value={loyerForm.unite}
                          onChange={(e) => setLoyerForm({ ...loyerForm, unite: e.target.value })}
                          className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-orange-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                          placeholder="Numéro d'unité (ex: Apt 1)"
                        />
                        <p className={`text-[10px] italic ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                          Ajoutez d'abord des unités dans la section « Gestion Plex » pour activer le sélecteur automatique.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── Montant + Date ──────────────────────────────────────────────── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Montant du loyer</label>
                      <div className="relative">
                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>$</span>
                        <input type="text" value={loyerForm.montant} onChange={(e) => setLoyerForm({ ...loyerForm, montant: e.target.value })} className={`w-full pl-8 pr-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-orange-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`} placeholder="1200.00" />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Date de réception</label>
                      <input type="date" value={loyerForm.date} onChange={(e) => setLoyerForm({ ...loyerForm, date: e.target.value })} className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-orange-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
                    </div>
                  </div>

                  {/* ── Nom du locataire (auto-filled from unit, editable) ────────── */}
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Nom du locataire</label>
                    <input type="text" value={loyerForm.locataire} onChange={(e) => setLoyerForm({ ...loyerForm, locataire: e.target.value })} className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-orange-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`} placeholder="Jean Tremblay" />
                  </div>

                </div>
                <div className={`p-4 border-t flex justify-end gap-2 ${darkMode ? "border-zinc-800 bg-zinc-900/30" : "border-slate-100 bg-slate-50"}`}>
                  {loyerEditingId && (
                    <button onClick={() => {
                      setPlexLoyers(plexLoyers.filter(l => l.id !== loyerEditingId));
                      setShowLoyerModal(false);
                    }}
                      className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider text-orange-500 hover:bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0/10 transition-colors mr-auto flex items-center space-x-2`}>
                      <Trash2 size={14} />
                      <span>Supprimer</span>
                    </button>
                  )}
                  <button onClick={() => setShowLoyerModal(false)} className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${darkMode ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"}`}>Annuler</button>
                  <button onClick={handleSaveLoyer} className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0 text-white hover:from-orange-600 hover:to-amber-700 hover:shadow-orange-500/40 transition-transform active:scale-95 shadow-md shadow-orange-500/20 flex items-center space-x-2">
                    <Save size={14} />
                    <span>Enregistrer</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>





        <AnimatePresence>
          {showPlexExpenseModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 animate-out fade-out">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className={`relative w-full max-w-lg rounded-[32px] border overflow-hidden shadow-2xl ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-slate-200"}`}
              >
                <div className={`p-6 border-b flex justify-between items-center ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0/10 text-orange-500">
                      <Plus size={20} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-black italic tracking-tighter ${darkMode ? "text-zinc-100" : "text-slate-900"}`}>{plexExpenseEditingId ? "Modifier la dépense" : "Ajouter une dépense"}</h3>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Plex: Dépenses</p>
                    </div>
                  </div>
                  <button onClick={() => setShowPlexExpenseModal(false)} className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-slate-100 text-slate-500"}`}>
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Adresse de l'immeuble</label>
                    <input type="text" value={plexExpenseForm.adresse} onChange={(e) => setPlexExpenseForm({ ...plexExpenseForm, adresse: e.target.value })} className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-orange-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`} placeholder="123 Rue Principale" />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Catégorie de dépense</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-800 p-2 rounded-xl">
                      {[
                        { id: "Taxes", label: "Taxes" },
                        { id: "Assurance", label: "Assurance" },
                        { id: "Intérêts", label: "Intérêts" },
                        { id: "Entretien", label: "Entretien" },
                        { id: "Sous-traitance", label: "Sous-traitance" }
                      ].map((model) => {
                        const isSelected = plexExpenseForm.categorie === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => setPlexExpenseForm({ ...plexExpenseForm, categorie: model.id })}
                            className={`flex flex-col items-center justify-center py-2 px-1 text-[10px] font-bold rounded-lg transition-all duration-200 ease-in-out border border-transparent ${isSelected
                                ? "bg-teal-500 text-white shadow-sm border-teal-400 scale-[1.02]"
                                : "bg-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                              }`}
                          >
                            <div className="flex items-center justify-center space-x-1">
                              {isSelected && <CheckCircle2 size={12} />}
                              <span>{model.label}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {plexExpenseForm.categorie === "Sous-traitance" && (
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Nom du professionnel / Compagnie *</label>
                      <input type="text" required value={plexExpenseForm.professionnel || ""} onChange={(e) => setPlexExpenseForm({ ...plexExpenseForm, professionnel: e.target.value })} className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-orange-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`} placeholder="Nom de l'entreprise ou du travailleur..." />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Montant (TTC)</label>
                      <div className="relative">
                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>$</span>
                        <input type="text" value={plexExpenseForm.montant} onChange={(e) => setPlexExpenseForm({ ...plexExpenseForm, montant: e.target.value })} className={`w-full pl-8 pr-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-orange-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`} placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Date de la facture</label>
                      <input type="date" value={plexExpenseForm.date} onChange={(e) => setPlexExpenseForm({ ...plexExpenseForm, date: e.target.value })} className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-orange-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
                    </div>
                  </div>
                </div>
                <div className={`p-4 border-t flex justify-end gap-2 ${darkMode ? "border-zinc-800 bg-zinc-900/30" : "border-slate-100 bg-slate-50"}`}>
                  {plexExpenseEditingId && (
                    <button onClick={() => {
                      setPlexDepenses(plexDepenses.filter(d => d.id !== plexExpenseEditingId));
                      setShowPlexExpenseModal(false);
                    }}
                      className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider text-orange-500 hover:bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0/10 transition-colors mr-auto flex items-center space-x-2`}>
                      <Trash2 size={14} />
                      <span>Supprimer</span>
                    </button>
                  )}
                  <button onClick={() => setShowPlexExpenseModal(false)} className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${darkMode ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"}`}>Annuler</button>
                  <button onClick={handleSavePlexExpense} className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0 text-white hover:from-orange-600 hover:to-amber-700 hover:shadow-orange-500/40 transition-transform active:scale-95 shadow-md shadow-orange-500/20 flex items-center space-x-2">
                    <Save size={14} />
                    <span>{plexExpenseEditingId ? "Enregistrer" : "Ajouter"}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showManualExpenseModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 animate-out fade-out">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className={`w-full max-w-sm rounded-[36px] overflow-hidden border shadow-2xl relative ${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-100"} text-left`}
              >
                <div className={`p-6 border-b ${darkMode ? "border-zinc-900" : "border-slate-100"} flex items-center justify-between`}>
                  <div className="flex items-center space-x-3 text-left">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg">
                      <Plus size={20} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-black italic tracking-tighter ${darkMode ? "text-zinc-100" : "text-slate-900"}`}>Ajouter manuellement</h3>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Saisie informative sans reçu</p>
                    </div>
                  </div>
                  <button onClick={() => setShowManualExpenseModal(false)} className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-slate-100 text-slate-500"}`}>
                    <X size={18} />
                  </button>
                </div>

                <div className={`p-6 space-y-4 ${darkMode ? "bg-zinc-950/50" : "bg-slate-50/50"}`}>
                  <div className="space-y-1.5 text-left">
                    <label className={`text-[9.5px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Montant ($)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={manualExpenseForm.montant}
                      onChange={e => setManualExpenseForm({ ...manualExpenseForm, montant: e.target.value })}
                      className={`w-full p-3.5 rounded-2xl text-[11px] font-bold border outline-none focus:ring-1 focus:ring-emerald-500 ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className={`text-[9.5px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Description</label>
                    <input
                      type="text"
                      placeholder="Identifiant ou description du fournisseur"
                      value={manualExpenseForm.description}
                      onChange={e => setManualExpenseForm({ ...manualExpenseForm, description: e.target.value })}
                      className={`w-full p-3.5 rounded-2xl text-[11px] font-bold border outline-none focus:ring-1 focus:ring-emerald-500 ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className={`text-[9.5px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Date</label>
                    <input
                      type="date"
                      value={manualExpenseForm.date}
                      onChange={e => setManualExpenseForm({ ...manualExpenseForm, date: e.target.value })}
                      className={`w-full p-3.5 rounded-2xl text-[11px] font-bold border outline-none focus:ring-1 focus:ring-emerald-500 ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
                    />
                  </div>

                  <div className="mt-4 pt-4 border-t border-rose-500/20 text-left">
                    <label className="flex items-start space-x-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input
                          type="checkbox"
                          checked={manualExpenseForm.confirmed}
                          onChange={(e) => setManualExpenseForm({ ...manualExpenseForm, confirmed: e.target.checked })}
                          className={`appearance-none w-5 h-5 rounded-md border-2 border-rose-500 outline-none cursor-pointer transition-all ${manualExpenseForm.confirmed ? "bg-rose-500" : "bg-transparent group-hover:bg-rose-500/10"}`}
                        />
                        {manualExpenseForm.confirmed && <CheckCircle2 size={12} className="text-white absolute pointer-events-none" />}
                      </div>
                      <span className={`text-[8px] font-bold leading-tight ${darkMode ? "text-rose-400/90" : "text-rose-600/90"}`}>
                        Je confirme que cette dépense est réelle et j'assume l'entière responsabilité de cette saisie manuelle en l'absence de justificatif. Je comprends que cette dépense pourrait être refusée lors d'une vérification fiscale.
                      </span>
                    </label>
                  </div>
                </div>

                <div className={`p-6 border-t font-sans ${darkMode ? "border-zinc-900 bg-zinc-950" : "border-slate-100 bg-white"}`}>
                  <button
                    onClick={() => {
                      if (!manualExpenseForm.montant || !manualExpenseForm.description || !manualExpenseForm.date) {
                        alert("Veuillez remplir tous les champs.");
                        return;
                      }
                      if (!manualExpenseForm.confirmed) {
                        alert("Vous devez accepter la clause de responsabilité.");
                        return;
                      }

                      const newExpense = {
                        id: Date.now(),
                        companyId: activeCompanyId,
                        fecha: manualExpenseForm.date,
                        fournisseur: manualExpenseForm.description,
                        cat: "À classer", // Catégorie générique à reclasser plus tard
                        subtotal: parseFloat(manualExpenseForm.montant),
                        tps: 0,
                        tvq: 0,
                        total: parseFloat(manualExpenseForm.montant),
                        lien: null,
                        partnerTag: activeUser,
                        isManual: true
                      };
                      setDepenses(prev => [newExpense, ...prev]);
                      setManualExpenseForm({ montant: "", description: "", date: new Date().toISOString().split("T")[0], confirmed: false });
                      setShowManualExpenseModal(false);
                      playNotificationSound();
                    }}
                    className={`w-full py-4 text-[10px] font-black uppercase italic tracking-widest rounded-2xl transition-all border ${!manualExpenseForm.confirmed ? "opacity-50 cursor-not-allowed " + (darkMode ? "bg-zinc-800 text-zinc-500 border-zinc-700" : "bg-slate-100 text-slate-400 border-slate-200") : "bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:scale-[1.02] border-rose-500"}`}
                    disabled={!manualExpenseForm.confirmed}
                  >
                    + Enregistrer
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAutonomeExpenseModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 animate-out fade-out">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className={`w-full max-w-sm rounded-[36px] overflow-hidden border shadow-2xl relative ${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-100"} text-left`}
              >
                <div className={`p-6 border-b flex justify-between items-center ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Plus size={20} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-black italic tracking-tighter ${darkMode ? "text-zinc-100" : "text-slate-900"}`}>Ajouter une dépense</h3>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Travailleur Autonome</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAutonomeExpenseModal(false)} className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-slate-100 text-slate-500"}`}>
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Catégorie de dépense</label>
                    <select value={autonomeExpenseForm.categorie} onChange={(e) => setAutonomeExpenseForm({ ...autonomeExpenseForm, categorie: e.target.value })} className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-[#ff823a]/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
                      <option value="Réparations et entretien">Réparations et entretien</option>
                      <option value="Assurances">Assurances</option>
                      <option value="Intérêts hypothécaires">Intérêts hypothécaires</option>
                      <option value="Électricité / Chauffage">Électricité / Chauffage</option>
                      <option value="Taxes foncières et scolaires">Taxes foncières et scolaires</option>
                      <option value="Honoraires professionnels">Honoraires professionnels</option>
                      <option value="Frais de gestion / Marketing">Frais de gestion / Marketing</option>
                      <option value="Fournitures de bureau">Fournitures de bureau</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  {autonomeExpenseForm.categorie === "Honoraires professionnels" && (
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Nom du professionnel / Compagnie *</label>
                      <input type="text" required value={autonomeExpenseForm.professionnel || ""} onChange={(e) => setAutonomeExpenseForm({ ...autonomeExpenseForm, professionnel: e.target.value })} className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-[#ff823a]/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`} placeholder="Nom de l'entreprise ou du travailleur..." />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Net ($)</label>
                      <input type="text" value={autonomeExpenseForm.net} onChange={(e) => setAutonomeExpenseForm({ ...autonomeExpenseForm, net: e.target.value })} className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-[#ff823a]/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`} placeholder="0.00" />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>TPS ($)</label>
                      <input type="text" value={autonomeExpenseForm.tps} onChange={(e) => setAutonomeExpenseForm({ ...autonomeExpenseForm, tps: e.target.value })} className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-[#ff823a]/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`} placeholder="0.00" />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>TVQ ($)</label>
                      <input type="text" value={autonomeExpenseForm.tvq} onChange={(e) => setAutonomeExpenseForm({ ...autonomeExpenseForm, tvq: e.target.value })} className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-[#ff823a]/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`} placeholder="0.00" />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Total ($)</label>
                      <input type="text" value={autonomeExpenseForm.total} onChange={(e) => setAutonomeExpenseForm({ ...autonomeExpenseForm, total: e.target.value })} className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-[#059669]/50 outline-none transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 focus:border-zinc-700 text-zinc-100" : "bg-slate-50 border-slate-200 focus:border-slate-300 text-slate-900"}`} placeholder="0.00" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => {
                      const n = parseFloat(autonomeExpenseForm.net.replace(/[^0-9.-]+/g, "")) || 0;
                      const tps = parseFloat(autonomeExpenseForm.tps.replace(/[^0-9.-]+/g, "")) || 0;
                      const tvq = parseFloat(autonomeExpenseForm.tvq.replace(/[^0-9.-]+/g, "")) || 0;
                      const sum = n + tps + tvq;
                      const t = parseFloat(autonomeExpenseForm.total.replace(/[^0-9.-]+/g, "")) || 0;
                      if (Math.abs(sum - t) > 0.02) {
                        setAutonomeExpenseForm({ ...autonomeExpenseForm, warning: "Attention: Le total ne correspond pas à la somme." });
                      } else {
                        setAutonomeExpenseForm({ ...autonomeExpenseForm, warning: "" });
                      }
                    }} className="text-[10px] font-black uppercase tracking-widest text-[#059669] hover:underline">
                      Auto-calcul
                    </button>
                    {autonomeExpenseForm.warning && (
                      <span className="text-[10px] font-bold text-red-500 tracking-wide">{autonomeExpenseForm.warning}</span>
                    )}
                  </div>

                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Date de la facture</label>
                    <input type="date" value={autonomeExpenseForm.date} onChange={(e) => setAutonomeExpenseForm({ ...autonomeExpenseForm, date: e.target.value })} className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-[#059669]/50 outline-none transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 focus:border-zinc-700 text-zinc-100" : "bg-slate-50 border-slate-200 focus:border-slate-300 text-slate-900"}`} />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-zinc-300">
                      Concilié avec mon compte bancaire
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (isSuperAdmin) {
                          setAutonomeExpenseForm({ ...autonomeExpenseForm, concilie: !autonomeExpenseForm.concilie });
                        }
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#059669] focus:ring-offset-2 ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''} ${autonomeExpenseForm.concilie ? 'bg-[#059669]' : 'bg-slate-300 dark:bg-zinc-700'}`}
                    >
                      <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autonomeExpenseForm.concilie ? 'translate-x-2' : '-translate-x-2'}`} />
                    </button>
                  </div>
                </div>
                <div className={`p-4 border-t flex justify-end gap-2 ${darkMode ? "border-zinc-800 bg-zinc-900/30" : "border-slate-100 bg-slate-50"}`}>
                  <button onClick={() => setShowAutonomeExpenseModal(false)} className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${darkMode ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"}`}>Annuler</button>
                  <button onClick={handleSaveAutonomeExpense} className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider bg-[#059669] text-white hover:bg-[#047857] transition-transform active:scale-95 shadow-md shadow-[#059669]/20 flex items-center space-x-2">
                    <Save size={14} />
                    <span>Ajouter</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL TRANSMISSION ENVOYER À LE COMPTABLE */}
        <AnimatePresence>
          {showComptableModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 animate-out fade-out">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className={`w-full max-w-lg p-6 rounded-[36px] border ${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md text-white" : "bg-white border-slate-150 text-slate-905"} shadow-2xl relative text-left`}
              >
                <button
                  onClick={() => setShowComptableModal(false)}
                  className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>

                <div className="flex items-center space-x-2.5 mb-5 border-b border-slate-100 dark:border-zinc-900 pb-4 text-left">
                  <div className="p-2.5 bg-teal-500/10 text-teal-600 rounded-xl">
                    <Mail size={18} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-[12px] font-black uppercase italic">
                      Paquet de Transmission Comptable
                    </h4>
                    <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wide">
                      Compilateur unifié AutoCompt v2.6
                    </p>
                  </div>
                </div>

                {rapportSentSuccess ? (
                  <motion.div
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="py-10 text-center space-y-4"
                  >
                    <div className="inline-flex p-4.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20 shadow-md">
                      <CheckCircle2 size={36} className="text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase italic text-emerald-600 dark:text-emerald-400">
                        Succès: Rapport envoyé !
                      </h4>
                      <p className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase font-black tracking-widest mt-1">
                        Natalia recevra les pièces jointes sous peu
                      </p>
                    </div>

                    <p className="text-[8px] italic text-slate-400 bg-slate-50 dark:bg-zinc-905 p-4.5 rounded-2xl max-w-xs mx-auto">
                      Transmission chiffrée de bout en bout effectuée avec
                      succès via le relais sécurisé d'AutoCompt.
                    </p>

                    <div className="pt-2">
                      <button
                        onClick={() => setShowComptableModal(false)}
                        className="w-full py-3.5 bg-slate-100 dark:bg-zinc-900 text-[9px] font-black uppercase italic tracking-widest rounded-2xl text-slate-600 dark:text-zinc-400"
                      >
                        Terminer
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-4 text-left">
                    <div className="text-left">
                      <label className="block text-[8px] font-black uppercase italic text-slate-400 tracking-wider mb-1.5">
                        Courriel de la comptable{" "}
                        {currentComptable.nom
                          ? `(${currentComptable.nom})`
                          : "(Natalia C.)"}
                      </label>
                      <input
                        type="email"
                        value={comptableEmail}
                        onChange={(e) => {
                          const newEmail = e.target.value;
                          setComptablesConfig((prev) => ({
                            ...prev,
                            [activeCompanyId]: {
                              ...(prev[activeCompanyId] || {
                                nom: "Natalia Caisse",
                                email: "natalia.caisse@solutionsgpa.ca",
                                tel: "+1 (514) 555-0199",
                                drive: "",
                              }),
                              email: newEmail,
                            },
                          }));
                        }}
                        placeholder="ex: natalia@comptable.ca"
                        className={`w-full p-4 rounded-2xl border text-[9.5px] font-mono tracking-wide ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-slate-50 border-slate-100 text-slate-800"}`}
                      />
                    </div>

                    <div className="text-left">
                      <label className="block text-[8px] font-black uppercase italic text-slate-400 tracking-wider mb-1.5">
                        Message personnalisé d'accompagnement (FR-QC)
                      </label>
                      <textarea
                        rows={5}
                        value={comptableMessage}
                        onChange={(e) => setComptableMessage(e.target.value)}
                        className={`w-full p-4 rounded-2xl border text-[9px] font-medium leading-relaxed font-sans ${darkMode ? "bg-zinc-900 border-zinc-805 text-zinc-200" : "bg-slate-50 border-slate-100 text-slate-705"}`}
                      />
                    </div>

                    <div
                      className={`p-4 rounded-2xl border text-[8px] font-semibold flex items-center space-x-3 bg-teal-500/[0.03] border-teal-500/10 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
                    >
                      <FileSpreadsheet
                        size={16}
                        className="text-teal-500 flex-shrink-0"
                      />
                      <p className="leading-snug text-left">
                        <strong className="text-teal-600 dark:text-teal-400">
                          Pièces jointes incluses :
                        </strong>{" "}
                        Livre des comptes au format{" "}
                        <strong className="font-bold underline">
                          {selectedRapportFormat}
                        </strong>
                        , ainsi que le registre des dépenses justificatives
                        raccordé pour{" "}
                        <strong className="font-bold">
                          {selectedRapportPeriod}
                        </strong>
                        .
                      </p>
                    </div>

                    <div className="pt-2 flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowComptableModal(false)}
                        className={`flex-1 py-4 bg-slate-100 dark:bg-zinc-900 text-[9px] font-black uppercase italic tracking-widest rounded-2xl ${darkMode ? "text-zinc-405" : "text-slate-500"}`}
                      >
                        Annuler
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playNotificationSound();
                          setRapportSentSuccess(true);
                        }}
                        className="flex-1 py-4 bg-emerald-600 text-white text-[9px] font-black uppercase italic tracking-widest rounded-2xl hover:bg-emerald-500 active:scale-98 transition-all flex items-center justify-center space-x-2"
                      >
                        <Send size={12} />
                        <span>Confirmer l'envoi</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SMART TRANS-DISPATCHER MODAL FOR RAPPORT */}
        <AnimatePresence>
          {showRapportDispatcherModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-350">
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 15 }}
                className={`w-full max-w-sm rounded-[36px] border ${darkMode
                    ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md text-zinc-100"
                    : "bg-white border-slate-150 text-slate-905"
                  } shadow-2xl relative overflow-hidden`}
              >
                {/* Close Button */}
                <button
                  onClick={() => {
                    if (!isTransmittingChannel) {
                      setShowRapportDispatcherModal(false);
                      playNotificationSound();
                    }
                  }}
                  className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white dark:hover:text-white transition-colors cursor-pointer"
                  disabled={isTransmittingChannel !== null}
                >
                  <X size={15} />
                </button>

                <div className="p-6">
                  {/* Title / Question */}
                  <div className="text-left mb-6 mt-1 space-y-2">
                    <span className="text-[8px] font-black uppercase italic tracking-widest text-[#059669] bg-emerald-500/10 px-2.5 py-1 rounded-full">
                      AutoCompt Dispatcher
                    </span>
                    <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-400 dark:text-zinc-500 pl-1 mt-1.5">
                      SÉLECTIONNER LE MÉDIUM DE TRANSMISSION
                    </h4>
                    <p
                      className={`text-[11.5px] font-black leading-relaxed tracking-tight ${darkMode ? "text-zinc-200" : "text-slate-800"}`}
                    >
                      ¿Cómo desea enviar el reporte de{" "}
                      <span className="text-[#059669] italic font-black">
                        {selectedRapportPeriod}
                      </span>{" "}
                      a{" "}
                      <span className="text-teal-605 dark:text-teal-400 italic font-black">
                        {currentComptable.nom}
                      </span>
                      ?
                    </p>
                  </div>

                  {isTransmittingChannel ? (
                    /* TRANSMITTING LOADING BLOCK */
                    <div className="py-8 flex flex-col items-center justify-center space-y-4">
                      <div className="relative flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
                        <span className="absolute animate-pulse text-[#059669]">
                          {isTransmittingChannel === "Par Email" ? (
                            <Mail size={16} />
                          ) : isTransmittingChannel === "Par WhatsApp" ? (
                            <MessageSquare size={16} />
                          ) : (
                            <Folder size={16} />
                          )}
                        </span>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-[9.5px] font-black uppercase tracking-wider text-[#059669] animate-pulse">
                          Transmission en cours
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                          Génération du flux via {isTransmittingChannel}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* CHOICES PANEL */
                    <div className="space-y-3">
                      {/* 1. Par Email */}
                      <button
                        onClick={() => {
                          playNotificationSound();
                          setIsTransmittingChannel("Par Email");
                          setTimeout(() => {
                            setIsTransmittingChannel(null);
                            setShowRapportDispatcherModal(false);
                            setDispatcherSuccessToast({
                              text: `Reporte del periodo ${selectedRapportPeriod} enviado exitosamente a través de Par Email`,
                              channel: "Par Email",
                            });
                            playNotificationSound();
                          }, 1400);
                        }}
                        className={`w-full p-4.5 rounded-[22px] border text-left flex items-center justify-between transition-all group ${darkMode
                            ? "bg-zinc-900/50 border-zinc-850 hover:border-emerald-500/40 hover:bg-zinc-900 text-zinc-100"
                            : "bg-slate-50/50 border-slate-105 hover:border-[#059669]/30 hover:bg-slate-100/40 text-slate-800"
                          }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl group-hover:scale-110 transition-transform">
                            <Mail size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase italic tracking-wide">
                              Par Email
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                              {currentComptable.email}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>

                      {/* 2. Par WhatsApp */}
                      <button
                        onClick={() => {
                          playNotificationSound();
                          setIsTransmittingChannel("Par WhatsApp");
                          setTimeout(() => {
                            setIsTransmittingChannel(null);
                            setShowRapportDispatcherModal(false);
                            setDispatcherSuccessToast({
                              text: `Reporte del periodo ${selectedRapportPeriod} enviado exitosamente a través de Par WhatsApp`,
                              channel: "Par WhatsApp",
                            });
                            playNotificationSound();
                            // Open WhatsApp link
                            const cleanTel =
                              (currentComptable.tel || "").replace(/\D/g, "") ||
                              "15145550199";
                            const waText = `Bonjour ${currentComptable.nom}, j'ai généré les rapports comptables de ${selectedRapportPeriod} sur AutoCompt pour ${currentCompany?.nombre || "mon entreprise"}. Pouvons-nous valider?`;
                            window.open(
                              `https://wa.me/${cleanTel}?text=${encodeURIComponent(waText)}`,
                              "_blank",
                            );
                          }, 1200);
                        }}
                        className={`w-full p-4.5 rounded-[22px] border text-left flex items-center justify-between transition-all group ${darkMode
                            ? "bg-zinc-900/50 border-zinc-850 hover:border-emerald-500/40 hover:bg-zinc-900 text-zinc-100"
                            : "bg-slate-50/50 border-slate-105 hover:border-emerald-500/30 hover:bg-slate-100/40 text-slate-800"
                          }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="p-3 bg-emerald-500/10 text-[#059669] dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                            <MessageSquare size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase italic tracking-wide text-emerald-600 dark:text-emerald-450">
                              Par WhatsApp
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                              Envoi direct au {currentComptable.tel}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>

                      {/* 3. Vers Google Drive */}
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
                          playNotificationSound();
                          setIsTransmittingChannel("Vers Google Drive");
                          setTimeout(() => {
                            setIsTransmittingChannel(null);
                            setShowRapportDispatcherModal(false);
                            setDispatcherSuccessToast({
                              text: `Reporte del periodo ${selectedRapportPeriod} enviado exitosamente a través de Vers Google Drive`,
                              channel: "Vers Google Drive",
                            });
                            playNotificationSound();
                            // Open Drive link
                            const driveUrl =
                              currentComptable.drive ||
                              `https://drive.google.com/drive/folders/${currentCompany?.driveConfig?.folderId || "vault"}`;
                            window.open(driveUrl, "_blank");
                          }, 1200);
                        }}
                        className={`w-full p-4.5 rounded-[22px] border text-left flex items-center justify-between transition-all group ${darkMode
                            ? "bg-zinc-900/50 border-zinc-850 hover:border-teal-500/40 hover:bg-zinc-900 text-zinc-100"
                            : "bg-slate-50/50 border-slate-105 hover:border-teal-500/30 hover:bg-slate-100/40 text-slate-800"
                          }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="p-3 bg-teal-500/10 text-teal-500 rounded-xl group-hover:scale-110 transition-transform">
                            <Folder size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase italic tracking-wide text-teal-600 dark:text-teal-400 font-black">
                              Vers Google Drive{" "}
                              {(getEffectiveTier() === "gratuit" ||
                                getEffectiveTier() === "basique") &&
                                "🔒"}
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                              Sauvegarder dans le nuage
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* TRANSIENT DYNAMIC TRACEABILITY TOAST */}
        <AnimatePresence>
          {dispatcherSuccessToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-[200] max-w-sm"
            >
              <div
                className={`p-4 rounded-[22px] border shadow-2xl flex items-center space-x-3.5 ${darkMode
                    ? "bg-zinc-950 border-emerald-950/45 text-white shadow-emerald-950/25"
                    : "bg-[#FAF9F6] border-emerald-200 text-slate-805 shadow-emerald-950/10"
                  }`}
              >
                <div className="p-2.5 bg-emerald-500/15 rounded-xl text-emerald-500 shrink-0">
                  {dispatcherSuccessToast.channel === "Par Email" ? (
                    <Mail size={16} />
                  ) : dispatcherSuccessToast.channel === "Par WhatsApp" ? (
                    <MessageSquare size={16} />
                  ) : (
                    <Folder size={16} />
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <span className="block text-[8px] font-black uppercase italic tracking-widest text-[#059669] leading-none">
                    {dispatcherSuccessToast.customMessage
                      ? "IA Document Scanner"
                      : "Trazabilidad de Envío"}
                  </span>
                  <p className="text-[10px] font-bold mt-1.5 leading-relaxed tracking-tight text-slate-700 dark:text-zinc-200">
                    {dispatcherSuccessToast.customMessage ? (
                      dispatcherSuccessToast.customMessage
                    ) : (
                      <>
                        Reporte del periodo{" "}
                        <span className="font-extrabold italic text-[#059669]">
                          {selectedRapportPeriod}
                        </span>{" "}
                        enviado exitosamente a través de{" "}
                        <span className="font-black italic text-teal-500 dark:text-teal-400">
                          {dispatcherSuccessToast.channel}
                        </span>
                      </>
                    )}
                  </p>
                  {dispatcherSuccessToast.actionText && dispatcherSuccessToast.onAction && (
                    <button
                      onClick={() => {
                        dispatcherSuccessToast.onAction!();
                        setDispatcherSuccessToast(null);
                      }}
                      className="mt-2 text-[9px] font-black uppercase italic underline text-[#059669] hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                    >
                      {dispatcherSuccessToast.actionText}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setDispatcherSuccessToast(null)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-850 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
};

export default RapportComptable;
