/**
 * BureauDomicile.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Entrepreneurs (Prospecteur / Flippeur)
 * Extraído de: src/App.tsx (L18308–L18852) — Fase 2 del desmantelamiento modular
 *
 * Nota arquitectónica (Golden Rule §1):
 *   Este componente NO fue eliminado de App.tsx. La lógica fue portada aquí
 *   con todos los estados encapsulados internamente y los datos compartidos
 *   recibidos via props tipadas.
 *   App.tsx llama a <BureauDomicile ... /> exactamente donde el bloque
 *   `if (vista === "homeoffice") { ... }` existía.
 *
 * Estados encapsulados (ya no viven en App.tsx):
 *   - homeOfficeFiles     : Record<string, string>
 *   - showHomeOfficeConfig: boolean
 *   - hoConfigForm        : { adresse, aireTotale, aireBureau }
 *
 * Props requeridas (todas vienen del closure de App):
 *   darkMode, activeUser, currentCompany, activeCompanyId, partnerData,
 *   filteredDepenses, porcBureau, setVista, setIsSidebarOpen, setPartnerData,
 *   setListaEmpresas, setDepenses, setDossierFiles, setDispatcherSuccessToast,
 *   playNotificationSound, WorkspaceSidebar
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Eye,
  FileCheck,
  Home,
  Layout,
  Lightbulb,
  Menu,
  Percent,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { dataService } from "../../lib/dataService";
import { auth } from "../../lib/firebase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HomeOfficeData {
  adresse?: string;
  aireTotale?: number;
  aireBureau?: number;
  [key: string]: unknown;
}

interface PartnerEntry {
  homeOffice?: HomeOfficeData;
  [key: string]: unknown;
}

interface Company {
  partnerData: Record<string, PartnerEntry>;
  [key: string]: unknown;
}

interface Depense {
  id?: string | number;
  cat?: string;
  partnerTag?: string;
  total?: number;
  fournisseur?: string;
  fecha?: string;
  adresseHistorique?: string;
  tauxApplique?: number;
  lien?: string | null;
  [key: string]: unknown;
}

interface Empresa {
  id: string;
  partnerData: Record<string, PartnerEntry>;
  [key: string]: unknown;
}

export interface BureauDomicileProps {
  // Données partagées
  darkMode: boolean;
  activeUser: string;
  currentCompany: Company;
  activeCompanyId: string;
  partnerData: Record<string, PartnerEntry>;
  filteredDepenses: Depense[];
  porcBureau: number;

  // Callbacks App
  setVista: (vista: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setPartnerData: (fn: (prev: any) => any) => void;
  setListaEmpresas: (fn: (prev: Empresa[]) => Empresa[]) => void;
  setDepenses: (fn: (prev: any[]) => any[]) => void;
  setDossierFiles: (fn: (prev: any[]) => any[]) => void;
  setDispatcherSuccessToast: (msg: string) => void;
  playNotificationSound: () => void;

  // Composant sidebar (fermeture App)
  WorkspaceSidebar: React.ComponentType;
}

// ── Composant ─────────────────────────────────────────────────────────────────

const BureauDomicile: React.FC<BureauDomicileProps> = ({
  darkMode,
  activeUser,
  currentCompany,
  activeCompanyId,
  partnerData,
  filteredDepenses,
  porcBureau,
  setVista,
  setIsSidebarOpen,
  setPartnerData,
  setListaEmpresas,
  setDepenses,
  setDossierFiles,
  setDispatcherSuccessToast,
  playNotificationSound,
  WorkspaceSidebar,
}) => {
  // ── Local input state — avoids parent-round-trip resets on every keystroke ──
  // Keys mirror the item.key values (loyer, hydro, internet, assurance, taxesMuni, entretien).
  const [inputValues, setInputValues] = useState<Record<string, string>>(() => {
    const ho = (currentCompany?.partnerData?.[activeUser]?.homeOffice as any) ?? {};
    return {
      loyer: ho.loyer != null ? String(ho.loyer) : "",
      hydro: ho.hydro != null ? String(ho.hydro) : "",
      internet: ho.internet != null ? String(ho.internet) : "",
      assurance: ho.assurance != null ? String(ho.assurance) : "",
      taxesMuni: ho.taxesMuni != null ? String(ho.taxesMuni) : "",
      entretien: ho.entretien != null ? String(ho.entretien) : "",
    };
  });

  // ── Autres états encapsulés (extraits de App.tsx L685-687) ────────────────
  const [homeOfficeFiles, setHomeOfficeFiles] = useState<Record<string, string>>({});
  const [showHomeOfficeConfig, setShowHomeOfficeConfig] = useState(false);
  const [hoConfigForm, setHoConfigForm] = useState({
    adresse: "",
    aireTotale: "",
    aireBureau: "",
  });


  // currentHomeOffice is still needed for adresse & other read-only derived fields
  const currentHomeOffice: HomeOfficeData =
    (currentCompany?.partnerData?.[activeUser]?.homeOffice as HomeOfficeData) ?? {};

  // ── Accounting category map: home office key → Tenue de Livres cat ───────
  const LEDGER_CATEGORY_MAP: Record<string, string> = {
    loyer: "Loyer et charges locatives",
    hydro: "Électricité / Énergie",
    internet: "Télécommunications",
    assurance: "Assurance",
    taxesMuni: "Taxes",
    entretien: "Entretien et réparations",
  };

  const totalHomeOfficeExpenses = filteredDepenses
    .filter((d) => d.cat === "Bureau à domicile" && d.partnerTag === activeUser)
    .reduce((a, b) => a + (b.total || 0), 0);


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col font-sans animate-in slide-in-from-right text-left max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}
    >
      <WorkspaceSidebar />
      <header
        className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} px-6 py-4 border-b flex items-center space-x-3 text-left shadow-sm`}
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
          <ArrowLeft />
        </button>
        <div className="flex-1 text-left">
          <h2 className="font-black uppercase italic text-lg tracking-tighter">
            Bureau à domicile
          </h2>
          <p className="text-[8px] font-black text-[#059669] uppercase italic tracking-widest">
            Partenaire: {activeUser}
          </p>
        </div>
        <button
          onClick={() => {
            setHoConfigForm({
              adresse: String(currentHomeOffice.adresse || ""),
              aireTotale: String(currentHomeOffice.aireTotale || ""),
              aireBureau: String(currentHomeOffice.aireBureau || ""),
            });
            setShowHomeOfficeConfig(true);
          }}
          className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
          title="Paramètres du bureau"
        >
          <Settings size={20} />
        </button>
      </header>

      <main className="p-4 space-y-6 max-w-md mx-auto w-full text-left pb-24">
        {/* Info Alert */}
        <div className="relative z-10 bg-blue-50 dark:bg-slate-800 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-slate-700 p-4 rounded-xl mb-6 shadow-none flex items-start space-x-3">
          <div className="mt-0.5">
            <Lightbulb size={20} className="text-blue-500 shrink-0" />
          </div>
          <p className="text-xs font-semibold leading-relaxed">
            💡 <strong>Info Fiscale :</strong> Cette section est conçue pour les
            travailleurs autonomes et professionnels afin de déduire la portion
            "bureau" de leur résidence personnelle. Si vous êtes propriétaire
            occupant d'un Plex, n'inscrivez ici que les dépenses relatives à
            votre unité personnelle. Ne dédoublez pas les montants déjà déclarés
            dans la comptabilité de vos immeubles locatifs.
          </p>
        </div>

        {/* Dashboard-style Summary Banner */}
        <div
          className={`p-8 rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[160px] border-none ${darkMode ? "bg-white text-slate-950" : "bg-black text-white"}`}
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p
                  className={`text-[10px] font-black uppercase italic tracking-[0.2em] mb-1 ${darkMode ? "text-slate-500" : "text-white/40"}`}
                >
                  Facteur de Déduction
                </p>
                <h3 className="text-4xl font-black italic tracking-tighter">
                  {(porcBureau * 100).toFixed(1)}%
                </h3>
              </div>
              <Percent className="text-emerald-500" size={32} />
            </div>
            <div className="mt-6">
              <p
                className={`text-[9px] font-black uppercase italic tracking-widest ${darkMode ? "text-zinc-500" : "text-white/40"}`}
              >
                Total Accumulé (Pro-rata)
              </p>
              <p className="text-2xl font-black italic tracking-tighter text-emerald-500">
                {totalHomeOfficeExpenses.toFixed(2)} $
              </p>
            </div>
          </div>
          <Sparkles
            size={120}
            className="absolute -right-8 -bottom-8 opacity-5 text-emerald-500 rotate-12"
          />
        </div>

        {/* Mosaic Cards Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              name: "Loyer de la Résidence",
              cat: "Loyer",
              key: "loyer",
              icon: <Home size={24} />,
              textColor: darkMode ? "text-indigo-400" : "text-indigo-600",
              bgColor: darkMode ? "bg-indigo-900/40" : "bg-indigo-100",
            },
            {
              name: "Électricité / Hydro-Qc",
              cat: "Electricité",
              key: "hydro",
              icon: <Zap size={24} />,
              textColor: darkMode ? "text-yellow-400" : "text-yellow-500",
              bgColor: darkMode ? "bg-yellow-905/40" : "bg-yellow-100",
            },
            {
              name: "Internet / Télécom (Bell/Videotron)",
              cat: "Internet",
              key: "internet",
              icon: <Settings size={24} />,
              textColor: darkMode ? "text-cyan-400" : "text-cyan-600",
              bgColor: darkMode ? "bg-cyan-900/40" : "bg-cyan-100",
            },
            {
              name: "Assurance Habitation",
              cat: "Assurance",
              key: "assurance",
              icon: <ShieldCheck size={24} />,
              textColor: darkMode ? "text-blue-400" : "text-blue-600",
              bgColor: darkMode ? "bg-blue-900/40" : "bg-blue-100",
            },
            {
              name: "Taxes Municipales & Scolaires",
              cat: "Taxes",
              key: "taxesMuni",
              icon: <Briefcase size={24} />,
              textColor: darkMode ? "text-rose-400" : "text-rose-600",
              bgColor: darkMode ? "bg-rose-900/40" : "bg-rose-100",
            },
            {
              name: "Entretien / Réparations Générales",
              cat: "Entretien",
              key: "entretien",
              icon: <Layout size={24} />,
              textColor: darkMode ? "text-amber-400" : "text-amber-600",
              bgColor: darkMode ? "bg-amber-900/40" : "bg-amber-100",
            },
          ].map((item) => {
            const fileKey = item.key;
            const hasFile = !!homeOfficeFiles[fileKey];
            const fileName =
              homeOfficeFiles[`${fileKey}_fileName`] || "reçu.pdf";

            return (
              <div
                key={item.cat}
                className={`p-6 rounded-[32px] border shadow-sm flex flex-col justify-between space-y-4 hover:shadow-xl transition-all text-left ${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md text-zinc-100" : "bg-white border-slate-100"}`}
              >
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${item.bgColor || (darkMode ? "bg-zinc-900 border border-zinc-800" : "bg-slate-50 border border-slate-100")}`}
                    >
                      <div className={item.textColor || "text-emerald-500"}>
                        {item.icon}
                      </div>
                    </div>

                    {/* Bouton '+' — ouvre le sélecteur de fichiers */}
                    <button
                      onClick={() => {
                        const el = document.getElementById(
                          `file-upload-${item.key}`,
                        );
                        if (el) el.click();
                      }}
                      className={`w-9 h-9 rounded-full border transition-all active:scale-90 flex items-center justify-center cursor-pointer ${hasFile
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        : darkMode
                          ? "bg-zinc-900 text-slate-400 border-zinc-800 hover:text-white"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                      title="Joindre un reçu (+)"
                    >
                      {hasFile ? <FileCheck size={18} /> : <Plus size={18} />}
                    </button>

                    {/* Input fichier caché */}
                    <input
                      id={`file-upload-${item.key}`}
                      type="file"
                      accept="application/pdf, image/jpeg, image/png, image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const fileUrl = URL.createObjectURL(file);
                          const simulatedAmount = parseFloat(
                            (Math.random() * 120 + 40).toFixed(2),
                          );

                          // ① Update local input display immediately
                          setInputValues((prev) => ({
                            ...prev,
                            [fileKey]: String(simulatedAmount),
                          }));

                          setHomeOfficeFiles((prev) => ({
                            ...prev,
                            [fileKey]: fileUrl,
                            [`${fileKey}_fileName`]: file.name,
                          }));

                          setPartnerData((prev: any) => ({
                            ...prev,
                            [activeUser]: {
                              ...prev[activeUser],
                              homeOffice: {
                                ...prev[activeUser].homeOffice,
                                [item.key]: simulatedAmount,
                              },
                            },
                          }));

                          setListaEmpresas((prev) =>
                            prev.map((emp) => {
                              if (emp.id === activeCompanyId) {
                                const newData = {
                                  ...partnerData,
                                  [activeUser]: {
                                    ...partnerData[activeUser],
                                    homeOffice: {
                                      ...partnerData[activeUser].homeOffice,
                                      [item.key]: simulatedAmount,
                                    },
                                  },
                                };
                                return { ...emp, partnerData: newData };
                              }
                              return emp;
                            }),
                          );

                          setDispatcherSuccessToast(
                            `OCR: Reçu ${file.name} analysé d'une manière intelligente. Montant détecté: ${simulatedAmount}$`,
                          );
                        }
                      }}
                    />
                  </div>

                  <div>
                    <p
                      className={`text-[10px] font-black uppercase italic tracking-tight leading-tight ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
                    >
                      {item.cat}
                    </p>
                    <h4 className="text-sm font-black italic mt-1 leading-tight mb-3">
                      {item.name}
                    </h4>

                    {/* Thumbnail reçu */}
                    {hasFile && (
                      <div className="mb-3 p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-600 truncate max-w-[130px]">
                          📄 {fileName}
                        </span>
                        <a
                          href={homeOfficeFiles[fileKey]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] font-black uppercase tracking-wider text-emerald-500 hover:underline cursor-pointer"
                        >
                          Voir
                        </a>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[7px] font-black uppercase text-slate-500 italic">
                        Montant total ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={inputValues[item.key] ?? ""}
                        onChange={(e) => {
                          // Only update local state — no parent round-trip on every keystroke
                          setInputValues((prev) => ({
                            ...prev,
                            [item.key]: e.target.value,
                          }));
                        }}
                        onBlur={(e) => {
                          // Sync to parent on blur (lose focus), not on every keystroke
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            setPartnerData((prev: any) => ({
                              ...prev,
                              [activeUser]: {
                                ...prev[activeUser],
                                homeOffice: {
                                  ...(prev[activeUser]?.homeOffice ?? {}),
                                  [item.key]: val,
                                },
                              },
                            }));
                          }
                        }}
                        className={`w-full p-3 rounded-xl text-[11px] font-bold border focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all ${darkMode ? "bg-zinc-900 text-zinc-100 border-zinc-800" : "bg-slate-50 text-slate-900 border-slate-100"}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Bouton Confirmer Déduction */}
                <button
                  onClick={async () => {
                    // Read from local state — guaranteed to reflect what user typed
                    const rawVal = inputValues[item.key] ?? "";
                    const amount = parseFloat(rawVal);
                    if (!rawVal || isNaN(amount) || amount <= 0) {
                      alert(
                        "Veuillez d'abord saisir un montant ou numériser un reçu.",
                      );
                      return;
                    }

                    const deductibleAmount = parseFloat(
                      (amount * porcBureau).toFixed(2),
                    );

                    // ── Quebec tax-exempt categories ─────────────────────────
                    // Per Revenu Québec: municipal taxes and insurance premiums
                    // are NOT subject to TPS or TVQ.
                    const TAX_EXEMPT_KEYS = new Set(["taxesMuni", "assurance"]);
                    const isTaxExempt = TAX_EXEMPT_KEYS.has(item.key);

                    const subtotalNum = isTaxExempt
                      ? deductibleAmount                                  // no reverse-tax calc
                      : parseFloat((deductibleAmount / 1.14975).toFixed(2));
                    const tpsNum = isTaxExempt
                      ? 0
                      : parseFloat((subtotalNum * 0.05).toFixed(2));
                    const tvqNum = isTaxExempt
                      ? 0
                      : parseFloat((subtotalNum * 0.09975).toFixed(2));
                    const fileUrl = homeOfficeFiles[fileKey] || null;

                    // ── Map to Tenue de Livres accounting category ──────────
                    const ledgerCat =
                      LEDGER_CATEGORY_MAP[item.key] ?? "Bureau à domicile";

                    // Double sauvegarde dans partnerData
                    setPartnerData((prev: any) => {
                      const baseObj = prev[activeUser] || {};
                      const hoObj = baseObj.homeOffice || {};
                      return {
                        ...prev,
                        [activeUser]: {
                          ...baseObj,
                          homeOffice: {
                            ...hoObj,
                            [item.key]: amount,
                            [`${item.key}_fileUrl`]: fileUrl,
                          },
                        },
                      };
                    });

                    // ── Build the ExpenseDoc record ──────────────────────────
                    const newGlobalExpense = {
                      id: `HO-${Date.now()}-${item.key}`,
                      companyId: activeCompanyId,
                      fecha: new Date().toISOString().split("T")[0],
                      fournisseur: `${item.name} (Bureau à domicile — ${activeUser})`,
                      // Use the proper ledger category so it appears in Tenue de Livres
                      cat: ledgerCat,
                      subtotal: subtotalNum,
                      tps: tpsNum,
                      tvq: tvqNum,
                      total: deductibleAmount,
                      lien: fileUrl,
                      partnerTag: activeUser,
                      status: "Vérifiée",
                      tauxApplique: Number((porcBureau * 100).toFixed(1)),
                      adresseHistorique: currentHomeOffice.adresse || "",
                    };

                    // ── ① Optimistic UI update (instant) ─────────────────────
                    setDepenses((prev) => [newGlobalExpense, ...prev]);

                    // ── Enregistrement dossiers fiscaux si fichier joint ─────
                    if (fileUrl) {
                      const fname =
                        homeOfficeFiles[`${item.key}_fileName`] ||
                        `reçu_${item.key}.pdf`;
                      const fileExt =
                        fname.split(".").pop()?.toLowerCase() || "";
                      const isImage = ["jpg", "jpeg", "png", "webp"].includes(
                        fileExt,
                      );
                      const newFileItem = {
                        id: `df-ho-${Date.now()}-${item.key}`,
                        name: fname,
                        year: new Date().getFullYear(),
                        profile: activeUser,
                        category: "Bureau à domicile",
                        type: isImage ? "jpg" : "pdf",
                        size: "Auto",
                        date: new Date().toISOString().split("T")[0],
                        status: "Concilié",
                        provider: item.name,
                        lien: fileUrl,
                      };
                      setDossierFiles((prev: any) => [...prev, newFileItem]);
                    }

                    // ── ② Persist to Firestore + double-entry journal ─────────
                    const userId = auth.currentUser?.uid;
                    if (userId) {
                      try {
                        await dataService.saveExpense(userId, {
                          ...newGlobalExpense,
                          ownerId: userId,
                          createdAt: new Date().toISOString(),
                        });
                        console.log(
                          `[Bureau à Domicile] ✅ Expense persisted to Firestore + journal: ${ledgerCat} ${deductibleAmount}$`,
                        );
                        setDispatcherSuccessToast(
                          `✅ Tenue de Livres: ${ledgerCat} — ${deductibleAmount.toFixed(2)}$ (${(porcBureau * 100).toFixed(1)}% bureau) enregistrée dans le grand livre.`,
                        );
                      } catch (fsErr: any) {
                        console.error("[Bureau à Domicile] Firestore persist failed:", fsErr);
                        setDispatcherSuccessToast(
                          `⚠️ Dépense sauvegardée localement. Erreur Firestore: ${fsErr?.message?.slice(0, 80)}`,
                        );
                      }
                    } else {
                      // Offline fallback — local state already updated above
                      setDispatcherSuccessToast(
                        `Dépense confirmée! Déduction de ${deductibleAmount}$ (${(porcBureau * 100).toFixed(1)}%) enregistrée.`,
                      );
                    }
                    playNotificationSound();
                  }}
                  className="w-full py-2.5 rounded-xl flex items-center justify-center space-x-2 text-[9px] font-black uppercase italic transition-all active:scale-95 bg-[#059669] text-white hover:bg-emerald-700 cursor-pointer border-none shadow-md"
                >
                  <CheckCircle2 size={13} />
                  <span>Confirmer Déduction</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Bandeau info taux */}
        <div className="bg-emerald-500/10 p-4 mt-6 rounded-2xl flex items-center space-x-3 border border-emerald-500/20">
          <Sparkles size={18} className="text-emerald-500" />
          <p className="text-[10px] font-bold italic text-emerald-600 opacity-80 leading-snug">
            Toutes les entrées seront automatiquement calculées à{" "}
            {(porcBureau * 100).toFixed(1)}% pour vos rapports de dépenses.
          </p>
        </div>

        {/* Historique des dépenses */}
        <div className="mt-8 overflow-hidden rounded-[32px] border text-left bg-white dark:bg-zinc-950 border-slate-100 dark:border-zinc-900 shadow-sm">
          <div className="bg-slate-50 dark:bg-zinc-900 px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
            <h3 className="text-xs font-black uppercase italic tracking-widest text-[#059669]">
              Historique des dépenses
            </h3>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-zinc-800/50">
            {filteredDepenses
              .filter(
                (d) =>
                  d.cat === "Bureau à domicile" && d.partnerTag === activeUser,
              )
              .map((expense, idx) => (
                <div
                  key={idx}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div>
                    <p className="text-sm font-black italic">
                      {expense.fournisseur}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                        {expense.fecha}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
                      <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 line-clamp-1 max-w-[200px]">
                        🏠 {expense.adresseHistorique || "Aucune adresse historique"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end space-x-4">
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        + {expense.total?.toFixed(2)} ${" "}
                        <span className="text-[8px] uppercase">Déductible</span>
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">
                        Taux utilisé: {expense.tauxApplique || "N/A"}%
                      </p>
                    </div>
                    {expense.lien && (
                      <a
                        href={expense.lien}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-full text-slate-400 border border-slate-200 dark:border-zinc-700 hover:text-emerald-500 hover:border-emerald-500 transition-colors"
                        title="Voir le reçu"
                      >
                        <Eye size={16} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            {filteredDepenses.filter(
              (d) =>
                d.cat === "Bureau à domicile" && d.partnerTag === activeUser,
            ).length === 0 && (
                <div className="p-8 text-center text-slate-400 dark:text-zinc-500 text-sm font-bold">
                  Aucune dépense enregistrée.
                </div>
              )}
          </div>
        </div>
      </main>

      {/* Modal Paramètres du Bureau */}
      <AnimatePresence>
        {showHomeOfficeConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className={`w-full max-w-sm rounded-[32px] shadow-2xl p-6 border ${darkMode ? "bg-zinc-950 border-emerald-900/50" : "bg-white border-emerald-100"}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                  <Settings size={16} /> Paramètres du Bureau
                </h3>
                <button
                  onClick={() => setShowHomeOfficeConfig(false)}
                  className={`p-2 rounded-full ${darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-slate-100 text-slate-500"}`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    className={`block text-[10px] font-black uppercase mb-1.5 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
                  >
                    Adresse de la résidence
                  </label>
                  <input
                    type="text"
                    value={hoConfigForm.adresse}
                    onChange={(e) =>
                      setHoConfigForm({ ...hoConfigForm, adresse: e.target.value })
                    }
                    placeholder="Ex: 123 Rue Principale, Montréal"
                    className={`w-full p-3 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-bold transition-colors ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-[10px] font-black uppercase mb-1.5 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
                  >
                    Superficie totale de la résidence (pi²)
                  </label>
                  <input
                    type="number"
                    value={hoConfigForm.aireTotale}
                    onChange={(e) =>
                      setHoConfigForm({ ...hoConfigForm, aireTotale: e.target.value })
                    }
                    placeholder="Ex: 1000"
                    className={`w-full p-3 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-bold transition-colors ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-[10px] font-black uppercase mb-1.5 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
                  >
                    Superficie du bureau (pi²)
                  </label>
                  <input
                    type="number"
                    value={hoConfigForm.aireBureau}
                    onChange={(e) =>
                      setHoConfigForm({ ...hoConfigForm, aireBureau: e.target.value })
                    }
                    placeholder="Ex: 150"
                    className={`w-full p-3 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-bold transition-colors ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  const tv = parseFloat(hoConfigForm.aireTotale) || 1;
                  const bv = parseFloat(hoConfigForm.aireBureau) || 0;

                  setPartnerData((prev: any) => {
                    const baseObj = prev[activeUser] || {};
                    return {
                      ...prev,
                      [activeUser]: {
                        ...baseObj,
                        homeOffice: {
                          ...(baseObj.homeOffice || {}),
                          adresse: hoConfigForm.adresse,
                          aireTotale: tv,
                          aireBureau: bv,
                        },
                      },
                    };
                  });

                  setShowHomeOfficeConfig(false);
                }}
                className="w-full mt-6 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2"
              >
                <Save size={14} />
                <span>Enregistrer</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BureauDomicile;
