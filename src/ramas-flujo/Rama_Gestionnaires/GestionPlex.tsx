/**
 * GestionPlex.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Gestionnaires
 * Extraído de: src/App.tsx (L17769–L18286) — Fase 5 del desmantelamiento modular
 *
 * Nota arquitectónica (Golden Rule §1):
 *   Este componente NO encapsula estados propios — todos los estados
 *   (plexManagementForm, plexManagementProperties, expandedDoors,
 *   showLimitModal, nombrePortes) residen en App porque son usados
 *   también en vista "immeuble" y en el módulo PlexModuleGrid del dashboard.
 *   Todo llega via props tipadas.
 *
 * Handlers del closure de App (pasados como props):
 *   setPlexManagementForm, setPlexManagementProperties, setExpandedDoors,
 *   setShowLimitModal, setVista
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { UnitDoc } from "../../lib/dataService";
import {
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Menu,
  PenLine,
  Save,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import AvisAugmentationModal from "../../components/modals/AvisAugmentationModal";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GestionPlexProps {
  // Mode
  darkMode: boolean;

  // États globaux partagés (non encapsulables)
  plexManagementForm: any;
  /** Every property across every company the account owns — never filter this array itself when adding/removing (see `visibleProperties` inside the component); doing so would make the reconcile diff in App.tsx delete every other company's properties. */
  plexManagementProperties: any[];
  /** Which company/workspace is currently active — used to show only its properties and to tag newly-created ones. */
  activeCompanyId: string;
  /** All units for the current user, fetched from Firestore `units` collection */
  allUnits: UnitDoc[];
  expandedDoors: Record<string | number, boolean>;
  showLimitModal: boolean;
  nombrePortes: number;

  // Setters globaux
  setPlexManagementForm: (form: any) => void;
  setPlexManagementProperties: (fn: any[] | ((prev: any[]) => any[])) => void;
  setExpandedDoors: (fn: Record<string | number, boolean> | ((prev: Record<string | number, boolean>) => Record<string | number, boolean>)) => void;
  setShowLimitModal: (val: boolean) => void;

  // Navigation
  setVista: (vista: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  /** Opens this building's own separate ledger (TenueLivresImmeubleView) —
   *  previously reachable only from Portefeuille Clients (Gestionnaire/
   *  Comptable only). An Investisseur who owns several buildings directly
   *  has no Portefeuille Clients at all, so had no way to see one building's
   *  numbers in isolation — needed at resale time to work out that
   *  property's own capital gain. Added 2026-08-13 at Fabiola's request. */
  onOpenBuildingLedger?: (buildingId: string) => void;

  // Composant sidebar
  WorkspaceSidebar: React.ComponentType;

  // ── S.O.F.I. Magic Tax Scanner ──────────────────────────────────────────────
  /** Called with a File when the user selects a tax bill image */
  onTaxScan: (file: File) => Promise<void>;
  /** Set by App when S.O.F.I. has pre-filled the form; cleared on next edit */
  sofiPrefillMessage: string;
  /** Name of the logged-in admin — used to pre-fill locateur name in generated documents. */
  adminName?: string;
  /** Active company — used to pre-fill locateur address/phone in generated documents. */
  currentCompany?: any;
  /** Fidéicommis clients managed by this gestionnaire.
   *  Used to link a building to its owner-client (fideicommisClientId). */
  fideicommisClients?: Array<{ id: string; nom: string }>;
}

// ── Composant ─────────────────────────────────────────────────────────────────

const GestionPlex: React.FC<GestionPlexProps> = ({
  darkMode,
  plexManagementForm,
  plexManagementProperties,
  activeCompanyId,
  allUnits,
  expandedDoors,
  showLimitModal,
  nombrePortes,
  setPlexManagementForm,
  setPlexManagementProperties,
  setExpandedDoors,
  setShowLimitModal,
  setVista,
  setIsSidebarOpen,
  onOpenBuildingLedger,
  WorkspaceSidebar,
  onTaxScan,
  sofiPrefillMessage,
  fideicommisClients = [],
  adminName = "",
  currentCompany,
}) => {
  const taxScanInputRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);
  // Which existing property (by id) the form above is currently editing —
  // null means the form is in "create new" mode. There was previously NO way
  // to modify an already-saved property/unit at all (only delete + recreate
  // from scratch), which blocked correcting a mistake like a wrong "durée
  // minimale" value on an existing room.
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  // Custom-styled dropdown state for "Propriétaire-client" — a native
  // <select>'s open option list is rendered by the OS/browser and can't be
  // styled, which broke the app's minimalist rounded-pill look. Replaced
  // with the same button+panel pattern already used for the workspace
  // selector in App.tsx. Found 2026-08-09.
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  // Was a free-text input requiring the user to type the "½" fraction
  // character by hand — awkward for casual users. Custom dropdown (never a
  // native <select>, per established convention), same button+panel pattern
  // as showClientDropdown above. Found 2026-08-11 via Daniel's QA report.
  const [showNombrePiecesDropdown, setShowNombrePiecesDropdown] = useState(false);
  const NOMBRE_PIECES_OPTIONS = ["Studio", "1½", "2½", "3½", "4½", "5½", "6½", "7½", "8½", "9+"];

  // ── Avis d'augmentation de loyer modal ───────────────────────────────────
  const [avisModalOpen, setAvisModalOpen] = useState(false);
  const [avisModalUnit, setAvisModalUnit] = useState<{ unit: UnitDoc; adresse: string } | null>(null);
  const openAvisModal = (unit: UnitDoc, adresse: string) => {
    setAvisModalUnit({ unit, adresse });
    setAvisModalOpen(true);
  };

  // Only show this company's properties. Untagged (`companyId` missing) entries
  // are properties saved before this feature existed — keep showing them until
  // they're next edited/re-saved, instead of silently hiding real data.
  const visibleProperties = plexManagementProperties.filter(
    (p) => !p.companyId || p.companyId === activeCompanyId
  );

  return (
  <div
    className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col font-sans text-left max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}
  >
    <WorkspaceSidebar />

    <header
      className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} px-6 py-4 border-b flex items-center space-x-3 text-left shadow-sm`}
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
          Gestion Immobilière
        </h2>
        <p
          className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-emerald-500" : "text-emerald-600"}`}
        >
          Rendement &amp; Baux
        </p>
      </div>
    </header>

    <main className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-4xl mx-auto space-y-6">
      {/* Alerta Relevé 31 */}
      <div
        className={`w-full p-5 rounded-[24px] border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${darkMode ? "bg-amber-900/10 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-800"}`}
      >
        <div className="flex items-center space-x-4">
          <div
            className={`p-3 flex-shrink-0 rounded-2xl ${darkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-200/50 text-amber-600"}`}
          >
            <Bell size={24} />
          </div>
          <p className="text-sm sm:text-base font-medium leading-tight">
            <strong>⚠️ Rappel Important :</strong> N'oubliez pas de produire et
            transmettre les <strong>Relevés 31</strong> à vos locataires avant
            le 28 février.
          </p>
        </div>
        <a
          href="https://www.revenuquebec.ca/fr/services-en-ligne/services-en-ligne/produire-des-releves-31/"
          target="_blank"
          rel="noopener noreferrer"
          className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-center whitespace-nowrap transition-shadow flex-shrink-0 w-full sm:w-auto ${darkMode ? "bg-amber-500 hover:bg-amber-400 text-amber-950" : "bg-amber-500 hover:bg-amber-600 text-white"} shadow-md`}
        >
          Produire sur Revenu Québec
        </a>
      </div>

      {/* Formulaire d'ajout de propriété */}
      <div
        ref={formTopRef}
        className={`p-6 rounded-[32px] border shadow-sm ${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"}`}
      >
        <div className="flex items-center space-x-3 mb-6">
          <div
            className={`p-3 rounded-2xl ${darkMode ? "bg-emerald-900/20 text-emerald-500" : "bg-emerald-100 text-emerald-700"}`}
          >
            <Building2 size={24} />
          </div>
          <h3
            className={`text-xl font-black uppercase italic tracking-tighter ${darkMode ? "text-white" : "text-slate-900"}`}
          >
            {editingPropertyId ? "Modifier la Propriété" : "Ajouter une Propriété"}
          </h3>
          {editingPropertyId && (
            <button
              type="button"
              onClick={() => {
                setEditingPropertyId(null);
                setPlexManagementForm({
                  typeLocation: "Logement entier",
                  nombrePieces: "",
                  adresse: "",
                  montant: "",
                  locataire: "",
                  nomBail: "",
                  status: "Actif",
                  nombreChambres: 1,
                  estMeuble: false,
                  isContainer: false,
                  fideicommisClientId: undefined,
                  fideicommisClientName: undefined,
                  units: [
                    { id: `unit_${Date.now()}`, buildingId: "", unitName: "Habitation 1", tenantName: "", monthlyRent: 0, isActive: true },
                  ],
                });
              }}
              className={`ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${darkMode ? "border-zinc-700 text-zinc-400 hover:bg-zinc-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
              <X size={11} /> Annuler la modification
            </button>
          )}

          {/* ── Propriétaire-client + S.O.F.I. Tax Scanner ──────────────────
              Moved here (top-right of the form header) from the bottom of
              the field list — deciding which client this building belongs
              to is contextually a first-thing-you-pick decision, not an
              afterthought right before saving. Found 2026-08-09. */}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {fideicommisClients.length === 0 && (
              // Daniel's QA report (2026-08-11): he couldn't find this selector
              // and concluded it didn't exist — it's just conditionally hidden
              // until the account has at least one Compte en Fidéicommis
              // client, with nothing explaining that dependency.
              <p className={`text-[9px] font-bold italic ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
                Créez un client dans Compte en Fidéicommis pour pouvoir lier cet immeuble à un propriétaire-client.
              </p>
            )}
            {fideicommisClients.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowClientDropdown(!showClientDropdown)}
                  title="Propriétaire-client (optionnel) — lier cet immeuble à un client de votre Compte en fidéicommis"
                  className={`flex items-center gap-2 max-w-[220px] px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all ${
                    darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100 hover:border-indigo-500/40" : "bg-slate-50 border-slate-200 text-slate-900 hover:border-indigo-300"
                  }`}
                >
                  <span className="truncate">
                    {plexManagementForm.fideicommisClientName || "— Immeuble géré en propre —"}
                  </span>
                  <ChevronDown size={11} className={`shrink-0 transition-transform duration-300 ${showClientDropdown ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {showClientDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className={`absolute right-0 mt-2 w-64 p-2 rounded-2xl border shadow-2xl z-30 text-left space-y-1 max-h-[280px] overflow-y-auto ${
                        darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setPlexManagementForm({ ...plexManagementForm, fideicommisClientId: undefined, fideicommisClientName: undefined });
                          setShowClientDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-bold transition-colors ${
                          !plexManagementForm.fideicommisClientId
                            ? (darkMode ? "bg-zinc-800 text-white" : "bg-slate-100 text-slate-900")
                            : (darkMode ? "text-zinc-400 hover:bg-zinc-800/60" : "text-slate-500 hover:bg-slate-50")
                        }`}
                      >
                        — Immeuble géré en propre —
                      </button>
                      {fideicommisClients.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setPlexManagementForm({ ...plexManagementForm, fideicommisClientId: c.id, fideicommisClientName: c.nom });
                            setShowClientDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-bold transition-colors ${
                            plexManagementForm.fideicommisClientId === c.id
                              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                              : (darkMode ? "text-zinc-300 hover:bg-zinc-800/60" : "text-slate-700 hover:bg-slate-50")
                          }`}
                        >
                          {c.nom}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <input
              ref={taxScanInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onTaxScan(file);
                // Reset so the same file can be re-scanned
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => taxScanInputRef.current?.click()}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border shadow-sm ${
                darkMode
                  ? "bg-indigo-950/60 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/60 hover:border-indigo-400/50"
                  : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              <Sparkles size={12} className="text-indigo-400" />
              <span>Scanner le compte de taxes</span>
              <Upload size={11} className="opacity-60" />
            </button>
          </div>
        </div>
        {fideicommisClients.length > 0 && plexManagementForm.fideicommisClientId && (
          <p className={`text-[9px] -mt-4 mb-4 ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
            Lié à <strong>{plexManagementForm.fideicommisClientName}</strong> — visible dans son portefeuille complet au Compte en fidéicommis.
          </p>
        )}

        {/* ── S.O.F.I. Pre-fill confirmation toast ──────────────────────── */}
        {sofiPrefillMessage && (
          <div className={`mb-4 flex items-start gap-3 p-3.5 rounded-2xl border ${
            darkMode
              ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-200"
              : "bg-indigo-50 border-indigo-200 text-indigo-800"
          }`}>
            <Sparkles size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
            <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
              {sofiPrefillMessage}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Type de location */}
          <div>
            <label
              className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
            >
              Type de location
            </label>
            <div
              className={`flex flex-col sm:flex-row p-1 rounded-2xl sm:rounded-full w-full max-w-md gap-1 border ${darkMode ? "border-zinc-800 bg-zinc-900/30" : "border-slate-200 bg-slate-50/50"}`}
            >
              {[
                { id: "Logement entier", label: "Logement entier" },
                {
                  id: "Chambres individuelles (Colocation)",
                  label: "Chambres individuelles",
                },
              ].map((model) => {
                const normalizedType =
                  plexManagementForm.typeLocation === "Appartement/Maison"
                    ? "Logement entier"
                    : plexManagementForm.typeLocation === "Habitation/Chambre"
                      ? "Chambres individuelles (Colocation)"
                      : plexManagementForm.typeLocation;
                const isSelected = normalizedType === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      const typeLocation = model.id;
                      setPlexManagementForm({
                        ...plexManagementForm,
                        typeLocation,
                        chambres:
                          typeLocation === "Chambres individuelles (Colocation)"
                            ? plexManagementForm.chambres ||
                              [{ id: Date.now(), identifiantChambre: "Habitation 1", montant: "", locataire: "", status: "Actif", vacanceMois: 0 }]
                            : plexManagementForm.chambres,
                      });
                    }}
                    className={`flex-1 py-3 px-3 text-[11px] font-black uppercase tracking-widest rounded-full sm:rounded-full transition-all duration-300 ease-in-out flex items-center justify-center space-x-1.5 border ${
                      isSelected
                        ? darkMode
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm"
                          : "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm"
                        : "bg-transparent border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                    }`}
                  >
                    {isSelected && <CheckCircle2 size={12} className="mr-1" />}
                    <span>{model.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adresse */}
          {(plexManagementForm.typeLocation === "Logement entier" ||
            plexManagementForm.typeLocation === "Appartement/Maison") && (
            <div>
              <label
                className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
              >
                Adresse de la propriété
              </label>
              <input
                type="text"
                value={plexManagementForm.adresse}
                onChange={(e) =>
                  setPlexManagementForm({
                    ...plexManagementForm,
                    adresse: e.target.value,
                  })
                }
                placeholder="Ex: 123 Rue Principale, Montréal"
                className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-emerald-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}
              />
            </div>
          )}

          {/* Nombre de pièces */}
          <div>
            <label
              className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
            >
              Nombre de pièces (format immobilier standard)
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNombrePiecesDropdown(!showNombrePiecesDropdown)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-emerald-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}
              >
                <span className={plexManagementForm.nombrePieces ? "" : "opacity-50"}>
                  {plexManagementForm.nombrePieces || "Sélectionner…"}
                </span>
                <ChevronDown size={14} className={`shrink-0 transition-transform duration-300 ${showNombrePiecesDropdown ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showNombrePiecesDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`absolute left-0 right-0 mt-2 p-2 rounded-2xl border shadow-2xl z-30 text-left space-y-1 max-h-[280px] overflow-y-auto ${
                      darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
                    }`}
                  >
                    {NOMBRE_PIECES_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setPlexManagementForm({ ...plexManagementForm, nombrePieces: opt });
                          setShowNombrePiecesDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-[11px] font-bold transition-colors ${
                          plexManagementForm.nombrePieces === opt
                            ? (darkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700")
                            : (darkMode ? "text-zinc-300 hover:bg-zinc-800/60" : "text-slate-700 hover:bg-slate-50")
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Logement entier fields */}
          {(plexManagementForm.typeLocation === "Logement entier" ||
            plexManagementForm.typeLocation === "Appartement/Maison") && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
                  >
                    Loyer mensuel ($)
                  </label>
                  <input
                    type="number"
                    value={plexManagementForm.montant}
                    onChange={(e) =>
                      setPlexManagementForm({
                        ...plexManagementForm,
                        montant: e.target.value,
                      })
                    }
                    placeholder="Ex: 1200"
                    className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-emerald-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
                  >
                    Nom du locataire
                  </label>
                  <input
                    type="text"
                    value={plexManagementForm.locataire}
                    onChange={(e) =>
                      setPlexManagementForm({
                        ...plexManagementForm,
                        locataire: e.target.value,
                      })
                    }
                    placeholder="Ex: Jean Dupont"
                    className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-emerald-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                  />
                </div>
              </div>

              {/* Statut */}
              <div>
                <label
                  className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
                >
                  Statut de l'unité
                </label>
                <div
                  // Was flex-wrap with whitespace-nowrap pills at min-w-[45%] —
                  // "Propriétaire occupant" (the longest label) never fit that
                  // width without overflowing/looking squished, on PC (4 pills
                  // in a narrow max-w-lg row) and mobile alike. A grid gives
                  // each label its own cell that can wrap onto 2 lines instead
                  // of fighting for space. Found 2026-08-11 via Daniel's QA report.
                  className={`grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-[28px] w-full border ${darkMode ? "border-zinc-800 bg-zinc-900/30" : "border-slate-200 bg-slate-50/50"}`}
                >
                  {["Actif", "Vacant", "Entretien", "Propriétaire occupant"].map((s) => {
                    const isSelected = plexManagementForm.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setPlexManagementForm({
                            ...plexManagementForm,
                            status: s,
                          })
                        }
                        className={`py-2.5 px-2 text-[10px] font-black uppercase tracking-wide rounded-2xl transition-all duration-300 ease-in-out flex flex-col items-center justify-center gap-1 border text-center leading-tight ${
                          isSelected
                            ? darkMode
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm"
                              : "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm"
                            : "bg-transparent border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                        }`}
                      >
                        {isSelected && <CheckCircle2 size={12} />}
                        <span>{s}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Chambres individuelles (Colocation) ── using units[] (UnitDoc) ── */}
          {(plexManagementForm.typeLocation ===
            "Chambres individuelles (Colocation)" ||
            plexManagementForm.typeLocation === "Habitation/Chambre") && (
            <>
              <div>
                <label
                  className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
                >
                  Adresse de l'immeuble
                </label>
                <input
                  type="text"
                  value={plexManagementForm.adresse}
                  onChange={(e) =>
                    setPlexManagementForm({
                      ...plexManagementForm,
                      adresse: e.target.value,
                    })
                  }
                  placeholder="Ex: 123 Rue Principale, Montréal"
                  className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-emerald-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                />
              </div>
              <div>
                <label
                  className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
                >
                  Nombre d'unités / habitations
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={plexManagementForm.nombreChambres || 1}
                  onChange={(e) => {
                    const nb = parseInt(e.target.value) || 1;
                    let newUnits: any[] = [...(plexManagementForm.units || [])];
                    if (nb > newUnits.length) {
                      newUnits = [
                        ...newUnits,
                        ...Array(nb - newUnits.length)
                          .fill(null)
                          .map((_, i) => ({
                            id: `unit_${Date.now() + i}`,
                            buildingId: "",
                            unitName: `Habitation ${newUnits.length + i + 1}`,
                            tenantName: "",
                            monthlyRent: 0,
                            isActive: true,
                          })),
                      ];
                    } else if (nb < newUnits.length) {
                      newUnits = newUnits.slice(0, nb);
                    }
                    setPlexManagementForm({
                      ...plexManagementForm,
                      nombreChambres: nb,
                      units: newUnits,
                    });
                  }}
                  className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-emerald-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                />
              </div>

              <div
                className={`mt-6 p-4 rounded-3xl space-y-4 border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-slate-100/50 border-slate-200"}`}
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-zinc-800">
                  <h4
                    className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
                  >
                    Configuration des Unités ({plexManagementForm.nombreChambres || 1})
                  </h4>
                  <p
                    className={`text-[10px] font-black uppercase ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}
                  >
                    Total:{" "}
                    {(plexManagementForm.units || []).reduce(
                      (s: number, u: any) =>
                        s + (u.isActive ? (parseFloat(u.monthlyRent) || 0) : 0),
                      0,
                    )}{" "}
                    $ / mois
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(plexManagementForm.units || []).map(
                    (unit: any) => (
                      <div
                        key={unit.id}
                        className={`p-4 rounded-2xl space-y-3 border ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`}
                      >
                        <div className="flex justify-between items-center">
                          <p
                            className={`text-[11px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-300" : "text-slate-700"}`}
                          >
                            {unit.unitName}
                          </p>
                          <div
                            className={`flex p-0.5 rounded-full gap-0.5 border text-[9px] ${darkMode ? "border-zinc-700 bg-zinc-800" : "border-slate-200 bg-slate-100"}`}
                          >
                            {[true, false].map((active) => (
                              <button
                                key={String(active)}
                                type="button"
                                onClick={() => {
                                  const updated = (
                                    plexManagementForm.units || []
                                  ).map((u: any) =>
                                    u.id === unit.id ? { ...u, isActive: active } : u
                                  );
                                  setPlexManagementForm({
                                    ...plexManagementForm,
                                    units: updated,
                                  });
                                }}
                                className={`px-2 py-1 rounded-full font-black uppercase transition-all ${unit.isActive === active ? (!active ? "bg-slate-400 text-white" : "bg-emerald-500 text-white") : "text-slate-400 dark:text-zinc-500"}`}
                              >
                                {active ? "Actif" : "Vacant"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label
                            className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
                          >
                            Locataire
                          </label>
                          <input
                            type="text"
                            value={unit.tenantName}
                            onChange={(e) => {
                              const updated = (
                                plexManagementForm.units || []
                              ).map((u: any) =>
                                u.id === unit.id ? { ...u, tenantName: e.target.value } : u
                              );
                              setPlexManagementForm({
                                ...plexManagementForm,
                                units: updated,
                              });
                            }}
                            placeholder="Nom du locataire"
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:ring-2 focus:ring-emerald-500/50 transition-all ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                            disabled={!unit.isActive}
                          />
                        </div>
                        <div>
                          <label
                            className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
                          >
                            Courriel du locataire
                          </label>
                          <input
                            type="email"
                            value={unit.tenantEmail || ""}
                            onChange={(e) => {
                              const updated = (
                                plexManagementForm.units || []
                              ).map((u: any) =>
                                u.id === unit.id ? { ...u, tenantEmail: e.target.value } : u
                              );
                              setPlexManagementForm({
                                ...plexManagementForm,
                                units: updated,
                              });
                            }}
                            placeholder="email@exemple.com"
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:ring-2 focus:ring-emerald-500/50 transition-all ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                            disabled={!unit.isActive}
                          />
                        </div>
                        <div>
                          <label
                            className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
                          >
                            Loyer mensuel
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={unit.monthlyRent || ""}
                              onChange={(e) => {
                                const updated = (
                                  plexManagementForm.units || []
                                ).map((u: any) =>
                                  u.id === unit.id
                                    ? { ...u, monthlyRent: parseFloat(e.target.value) || 0 }
                                    : u
                                );
                                setPlexManagementForm({
                                  ...plexManagementForm,
                                  units: updated,
                                });
                              }}
                              placeholder="0"
                              className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:ring-2 focus:ring-emerald-500/50 transition-all ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                              disabled={!unit.isActive}
                            />
                            <span
                              className={`absolute right-3 top-1/2 -translate-y-1/2 font-black text-[10px] ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
                            >
                              $
                            </span>
                          </div>
                          {(() => {
                            // Loi 31 (2024, Clause G) : tout nouveau bail doit divulguer
                            // le loyer le plus bas payé pour ce logement dans les 12
                            // derniers mois. Calculé depuis l'historique réel — jamais deviné.
                            const oneYearAgo = new Date();
                            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                            const recent = (unit.rentHistory || []).filter(
                              (h: any) => h.amount > 0 && new Date(h.date) >= oneYearAgo,
                            );
                            const amounts = [...recent.map((h: any) => h.amount)];
                            if (unit.monthlyRent > 0) amounts.push(unit.monthlyRent);
                            const lowest = amounts.length ? Math.min(...amounts) : null;
                            return (
                              <div className={`mt-2 p-2.5 rounded-xl border text-[9px] leading-relaxed ${darkMode ? "bg-amber-500/5 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                <p className="font-black uppercase tracking-wide">
                                  Loyer le plus bas (12 mois) : {lowest !== null ? `${lowest} $` : "aucun historique"}
                                </p>
                                <p className="opacity-80 mt-0.5">
                                  Obligatoire à divulguer au nouveau bail (Loi 31, Clause G).
                                </p>
                                {(unit.rentHistory || []).length > 0 && (
                                  <ul className="mt-1 space-y-0.5 font-mono opacity-70">
                                    {(unit.rentHistory || []).map((h: any, i: number) => (
                                      <li key={i}>{h.date} — {h.amount} $</li>
                                    ))}
                                  </ul>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const dateStr = window.prompt("Date de ce loyer antérieur (AAAA-MM-JJ) :", new Date().toISOString().slice(0, 10));
                                    if (!dateStr) return;
                                    const amountStr = window.prompt("Montant de ce loyer antérieur ($) :");
                                    const amount = parseFloat(amountStr || "");
                                    if (!amountStr || isNaN(amount) || amount <= 0) return;
                                    const updated = (plexManagementForm.units || []).map((u: any) =>
                                      u.id === unit.id
                                        ? { ...u, rentHistory: [...(u.rentHistory || []), { date: dateStr, amount }] }
                                        : u
                                    );
                                    setPlexManagementForm({ ...plexManagementForm, units: updated });
                                  }}
                                  className="mt-1.5 underline font-bold"
                                >
                                  + Ajouter un loyer antérieur connu
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="pt-1">
                          <p className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                            Durée minimale de location (nuits)
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="number"
                              min={1}
                              placeholder="Ex: 30"
                              value={unit.dureeMinimaleJours ?? ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
                                // Québec's tourist-establishment threshold is
                                // "moins de 32 jours" (under 32 nights) — a
                                // 31-night minimum stay still counts as
                                // courte durée/requires registration; only
                                // 32+ nights is exempt as a normal
                                // residential lease. Was < 31, incorrectly
                                // exempting 31-night listings. Corrected
                                // 2026-08-13 per Fabiola.
                                const updated = (plexManagementForm.units || []).map((u: any) =>
                                  u.id === unit.id
                                    ? { ...u, dureeMinimaleJours: val, courteDuree: val != null && val > 0 && val < 32 }
                                    : u
                                );
                                setPlexManagementForm({ ...plexManagementForm, units: updated });
                              }}
                              className={`w-20 p-2 rounded-xl border text-xs font-bold ${darkMode ? "bg-zinc-950 border-zinc-700 text-white" : "bg-white border-slate-200 text-slate-900"}`}
                            />
                            {unit.dureeMinimaleJours != null && unit.dureeMinimaleJours > 0 && (
                              <span className={`text-[8px] font-black uppercase tracking-widest ${unit.courteDuree ? "text-indigo-500" : "text-emerald-500"}`}>
                                {unit.courteDuree ? "→ Touristique — CITQ requis (Meublé/Airbnb)" : "→ Bail résidentiel normal"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </>
          )}

          {/* Aménagement (Fiscalité) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
              >
                Aménagement (Fiscalité)
              </label>
              <div
                className={`flex p-1 rounded-full w-full gap-1 border ${darkMode ? "border-zinc-800 bg-zinc-900/30" : "border-slate-200 bg-slate-50/50"}`}
              >
                {[
                  { id: true, label: "Meublées" },
                  { id: false, label: "Non meublées" },
                ].map((model) => {
                  const isSelected =
                    (plexManagementForm.estMeuble === true &&
                      model.id === true) ||
                    (!plexManagementForm.estMeuble && model.id === false);
                  return (
                    <button
                      key={model.id ? "oui" : "non"}
                      type="button"
                      onClick={() =>
                        setPlexManagementForm({
                          ...plexManagementForm,
                          estMeuble: model.id,
                        })
                      }
                      className={`flex-1 py-3 px-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all duration-300 ease-in-out flex items-center justify-center space-x-1.5 border ${
                        isSelected
                          ? darkMode
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-sm"
                            : "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm"
                          : "bg-transparent border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 size={12} className="mr-1" />
                      )}
                      <span>{model.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bouton Enregistrer */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                // Daniel's QA report (2026-08-11): the form let him save a
                // building with nothing filled in at all — required fields
                // now block the save with a clear message instead.
                if (!plexManagementForm.adresse?.trim() || !plexManagementForm.nombrePieces?.trim()) {
                  alert("Veuillez remplir au moins l'adresse et le nombre de pièces avant d'enregistrer l'unité.");
                  return;
                }

                const totalUsedDoors = plexManagementProperties.reduce(
                  (sum, p) => {
                    if (
                      p.typeLocation ===
                        "Chambres individuelles (Colocation)" ||
                      p.typeLocation === "Habitation/Chambre"
                    ) {
                      return sum + (parseInt(p.nombreChambres) || 1);
                    }
                    return sum + 1;
                  },
                  0,
                );

                const doorsToAdd =
                  plexManagementForm.typeLocation ===
                    "Chambres individuelles (Colocation)" ||
                  plexManagementForm.typeLocation === "Habitation/Chambre"
                    ? parseInt(plexManagementForm.nombreChambres) || 1
                    : 1;

                // ── BETA LAUNCH: paywall gate bypassed ────────────────────────────────
                // TODO: remove BETA_BYPASS and restore the guard before pricing launch.
                const BETA_BYPASS = true;
                if (!BETA_BYPASS && totalUsedDoors + doorsToAdd > nombrePortes) {
                  setShowLimitModal(true);
                  return;
                }


                let allRoomsValid = true;
                if (
                  plexManagementForm.typeLocation ===
                    "Chambres individuelles (Colocation)" ||
                  plexManagementForm.typeLocation === "Habitation/Chambre"
                ) {
                  // Validate against units[] (the field the "Configuration des
                  // Unités" grid actually edits) — vacant units are exempt,
                  // only occupied ("Actif") units need a tenant + rent.
                  for (const u of plexManagementForm.units || []) {
                    if (u.isActive && (!u.tenantName || !u.monthlyRent)) {
                      allRoomsValid = false;
                    }
                  }
                }

                if (!allRoomsValid) {
                  alert(
                    "Veuillez remplir le nom et le loyer pour toutes les chambres louées (Actif).",
                  );
                  return;
                }

                const propId = editingPropertyId || `prop_${Date.now()}`;
                // Loi 31 (2024, Clause G) : divulguer le loyer le plus bas des
                // 12 derniers mois exige un historique. On le construit ici,
                // au moment réel du changement — jamais deviné rétroactivement.
                const oldPropertyForRentLog = editingPropertyId
                  ? plexManagementProperties.find((x) => x.id === editingPropertyId)
                  : null;
                const withRentHistory = (u: any) => {
                  const oldUnit = oldPropertyForRentLog?.units?.find((ou: any) => ou.id === u.id);
                  if (oldUnit && oldUnit.monthlyRent > 0 && oldUnit.monthlyRent !== u.monthlyRent) {
                    const entry = { date: new Date().toISOString().slice(0, 10), amount: oldUnit.monthlyRent };
                    return { ...u, rentHistory: [...(u.rentHistory || oldUnit.rentHistory || []), entry] };
                  }
                  return u;
                };
                // Build units from the form (single unit for Logement entier, or multiple for Colocation)
                const formUnits: any[] =
                  plexManagementForm.typeLocation === "Chambres individuelles (Colocation)" ||
                  plexManagementForm.typeLocation === "Habitation/Chambre"
                    ? (plexManagementForm.units || []).map((u: any) => withRentHistory({ ...u, buildingId: propId }))
                    : [withRentHistory({
                        id: (plexManagementForm.units || [])[0]?.id || `unit_${Date.now()}`,
                        buildingId: propId,
                        unitName: plexManagementForm.nombrePieces || "Unité principale",
                        tenantName: plexManagementForm.locataire || "",
                        monthlyRent: parseFloat(plexManagementForm.montant) || 0,
                        isActive: plexManagementForm.status !== "Vacant",
                        rentHistory: (plexManagementForm.units || [])[0]?.rentHistory,
                      })];

                const savedProperty = {
                  ...plexManagementForm,
                  id: propId,
                  companyId: activeCompanyId,
                  isContainer: formUnits.length > 1,
                  units: formUnits,
                };

                if (editingPropertyId) {
                  setPlexManagementProperties(
                    plexManagementProperties.map((x) => x.id === editingPropertyId ? savedProperty : x)
                  );
                  setEditingPropertyId(null);
                } else {
                  setPlexManagementProperties([...plexManagementProperties, savedProperty]);
                }
                setPlexManagementForm({
                  typeLocation: "Logement entier",
                  nombrePieces: "",
                  adresse: "",
                  montant: "",
                  locataire: "",
                  nomBail: "",
                  status: "Actif",
                  nombreChambres: 1,
                  estMeuble: false,
                  isContainer: false,
                  fideicommisClientId: undefined,
                  fideicommisClientName: undefined,
                  units: [
                    {
                      id: `unit_${Date.now() + 1}`,
                      buildingId: "",
                      unitName: "Habitation 1",
                      tenantName: "",
                      monthlyRent: 0,
                      isActive: true,
                    },
                  ],
                });
                if (
                  typeof window !== "undefined" &&
                  typeof (window as any).playNotificationSound !== "undefined"
                ) {
                  (window as any).playNotificationSound();
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 border-0 text-white font-black uppercase tracking-widest rounded-xl text-[10px] transition-transform active:scale-95 shadow-md hover:from-emerald-600 hover:to-emerald-700 hover:shadow-emerald-500/40 inline-flex items-center space-x-2"
            >
              <Save size={14} />
              <span>{editingPropertyId ? "Enregistrer les modifications" : "Enregistrer l'unité"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Liste des propriétés enregistrées */}
      {visibleProperties.length > 0 && (
        <div
          className={`p-6 rounded-[32px] border shadow-sm space-y-4 ${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h4
              className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
            >
              Unités enregistrées
            </h4>
            <div className="flex space-x-3 text-[10px] font-black uppercase tracking-widest">
              <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md">
                {visibleProperties.filter((p) => p.status === "Actif").length} Unités Actives
              </span>
              <span className="bg-slate-400/10 text-slate-500 px-2 py-1 rounded-md">
                {visibleProperties.filter((p) => p.status === "Vacant").length} Vacantes
              </span>
              {visibleProperties.filter((p) => p.status === "Entretien").length > 0 && (
                <span className="bg-rose-500/10 text-rose-500 px-2 py-1 rounded-md">
                  {visibleProperties.filter((p) => p.status === "Entretien").length} En Entretien
                </span>
              )}
              {visibleProperties.filter((p) => p.status === "Propriétaire occupant").length > 0 && (
                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md">
                  {visibleProperties.filter((p) => p.status === "Propriétaire occupant").length} Occupée(s) par le propriétaire
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {visibleProperties.map((p) => {
              // ── Fetch units for this building from the allUnits prop ──────────────────
              const buildingUnits = allUnits.filter(u => u.buildingId === p.id);
              const isContainer = buildingUnits.length > 1 || p.isContainer;
              const doorIsExpanded = expandedDoors[p.id];

              // Compute totals from units instead of legacy chambres[]
              const containerTotal = buildingUnits.reduce(
                (sum, u) => sum + (u.isActive ? u.monthlyRent : 0), 0
              );
              const activeUnits   = buildingUnits.filter(u => u.isActive).length;
              const vacantUnits   = buildingUnits.filter(u => !u.isActive).length;
              const occupRate     = buildingUnits.length > 0
                ? (activeUnits / buildingUnits.length) * 100
                : (p.status === "Actif" ? 100 : 0);

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-3xl border flex flex-col space-y-2 ${darkMode ? "border-zinc-800 bg-zinc-950 shadow-[0_8px_30px_rgb(0,0,0,0.12)]" : "border-slate-200 bg-white shadow-xl shadow-slate-200/50"}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] px-2 py-1 rounded-md font-black uppercase tracking-widest text-white ${p.status === "Vacant" ? "bg-slate-500" : p.status === "Entretien" ? "bg-rose-500" : p.status === "Propriétaire occupant" ? "bg-amber-500" : "bg-emerald-500"}`}
                        >
                          {isContainer ? "Habitations" : p.status || "Actif"}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                          {p.typeLocation}
                        </span>
                      </div>
                      <p
                        className={`font-bold text-lg ${darkMode ? "text-white" : "text-slate-900"}`}
                      >
                        {p.adresse}{" "}
                        {p.nombrePieces ? "- " + p.nombrePieces + " pièces" : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            const isColoc = p.typeLocation === "Chambres individuelles (Colocation)" || p.typeLocation === "Habitation/Chambre";
                            const formUnits = buildingUnits.map((u) => ({
                              id: u.id,
                              buildingId: u.buildingId,
                              unitName: u.unitName,
                              tenantName: u.tenantName,
                              monthlyRent: u.monthlyRent,
                              isActive: u.isActive,
                              courteDuree: u.courteDuree,
                              dureeMinimaleJours: (u as any).dureeMinimaleJours,
                            }));
                            const singleUnit = buildingUnits[0];
                            setEditingPropertyId(p.id);
                            setPlexManagementForm({
                              typeLocation: p.typeLocation || "Logement entier",
                              adresse: p.adresse || "",
                              nombrePieces: p.nombrePieces || "",
                              nombreChambres: isColoc ? (formUnits.length || 1) : 1,
                              estMeuble: !!p.estMeuble,
                              status: singleUnit ? (singleUnit.isActive ? "Actif" : "Vacant") : (p.status || "Actif"),
                              montant: singleUnit ? String(singleUnit.monthlyRent || "") : (p.montant || ""),
                              locataire: singleUnit ? (singleUnit.tenantName || "") : (p.locataire || ""),
                              nomBail: p.nomBail || "",
                              isContainer: isColoc,
                              fideicommisClientId: p.fideicommisClientId,
                              fideicommisClientName: p.fideicommisClientName,
                              units: formUnits.length > 0 ? formUnits : [
                                { id: `unit_${Date.now()}`, buildingId: p.id, unitName: "Habitation 1", tenantName: "", monthlyRent: 0, isActive: true },
                              ],
                            });
                            formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className={`p-2 transition-colors rounded-xl ${darkMode ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
                          title="Modifier cette propriété"
                        >
                          <PenLine size={16} />
                        </button>
                        <button
                          onClick={() =>
                            setPlexManagementProperties(
                              plexManagementProperties.filter(
                                (x) => x.id !== p.id,
                              ),
                            )
                          }
                          className="p-2 text-rose-500 hover:text-rose-600 transition-colors bg-rose-50 dark:bg-rose-950/20 rounded-xl"
                        >
                          <Trash2 size={16} />
                        </button>
                        {onOpenBuildingLedger && (
                          <button
                            onClick={() => onOpenBuildingLedger(p.id)}
                            className={`p-2 transition-colors rounded-xl ${darkMode ? "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}
                            title="Voir le Tenue de Livres de cet édifice (séparé, utile à la revente)"
                          >
                            <FileSpreadsheet size={16} />
                          </button>
                        )}
                        {isContainer && (
                          <button
                            onClick={() =>
                              setExpandedDoors({
                                ...expandedDoors,
                                [p.id]: !doorIsExpanded,
                              })
                            }
                            className={`p-2 transition-colors rounded-xl ${darkMode ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
                          >
                            {doorIsExpanded ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </button>
                        )}
                      </div>
                  <div
                    className={`px-3 py-1.5 rounded-xl border ${occupRate < 90 ? (darkMode ? "bg-slate-900/50 border-slate-700" : "bg-slate-100 border-slate-300") : (darkMode ? "bg-emerald-950/20 border-emerald-900/50" : "bg-emerald-50 border-emerald-200")}`}
                  >
                    <p
                      className="text-[9px] font-black uppercase tracking-widest text-emerald-600"
                    >
                      Ocup. {occupRate.toFixed(1)}%
                    </p>
                    <p
                      className={`text-[7px] font-bold ${darkMode ? "text-zinc-500" : "text-slate-500"}`}
                    >
                      {activeUnits} actives / {buildingUnits.length || 1} unités
                    </p>
                  </div>
                    </div>
                  </div>

                  {!isContainer && (
                    <>
                      <div className="flex flex-col space-y-1">
                        <p
                          className={`text-xs font-bold ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
                        >
                          Locataire: {p.locataire}
                        </p>
                        <p className="text-[9px] font-mono font-black uppercase text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-1 rounded w-fit">
                          ID Conciliation: PROP-{p.id}-
                          {p.identifiantChambre || p.nombrePieces || "UNT"}-
                          {p.adresse?.split(" ")[0] || "ADR"}
                        </p>
                      </div>
                      <div className="flex items-end justify-between mt-2">
                        <p
                          className={`text-lg font-black ${darkMode ? "text-zinc-200" : "text-slate-800"}`}
                        >
                          {p.montant} ${" "}
                          <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">
                            / Mois
                          </span>
                        </p>
                        {buildingUnits[0] && buildingUnits[0].isActive && (
                          <button
                            onClick={() => openAvisModal(buildingUnits[0], p.adresse || "")}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors ${
                              darkMode
                                ? "bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/50"
                                : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            }`}
                            title="Générer un avis d'augmentation de loyer"
                          >
                            <TrendingUp size={12} />
                            Avis d'augm.
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {isContainer && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 text-right">
                      <p
                        className={`text-[10px] uppercase font-black tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
                      >
                        Total par Mois pour {p.adresse || "cette adresse"}
                      </p>
                      <p
                        className={`text-2xl font-black ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}
                      >
                        {containerTotal} ${" "}
                        <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">
                          / Mois
                        </span>
                      </p>
                    </div>
                  )}

                  {isContainer && doorIsExpanded && buildingUnits.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {buildingUnits.map((u) => (
                        <div
                          key={u.id}
                          className={`p-4 rounded-2xl flex flex-col justify-between ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-100"} border shadow-sm`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className={`text-[11px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-300" : "text-slate-700"}`}>
                                {u.unitName}
                              </p>
                              <p className={`text-[9px] font-bold mt-0.5 ${darkMode ? "text-zinc-500" : "text-slate-500"}`}>
                                Locataire: {u.tenantName || "—"}
                              </p>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md text-white ${!u.isActive ? "bg-slate-400" : "bg-emerald-500"}`}>
                              {u.isActive ? "Actif" : "Vacant"}
                            </span>
                          </div>
                          <div className="flex justify-between items-end mt-3">
                            <p className="text-[8px] font-mono font-black uppercase px-2 py-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                              {u.id.slice(0, 12)}…
                            </p>
                            <div className="flex items-center gap-2">
                              <p className={`text-base font-black ${darkMode ? "text-zinc-100" : "text-slate-900"}`}>
                                {u.monthlyRent} $
                              </p>
                              {u.isActive && (
                                <button
                                  onClick={() => openAvisModal(u, p.adresse || "")}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-colors ${
                                    darkMode
                                      ? "bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/50"
                                      : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                  }`}
                                  title="Générer un avis d'augmentation de loyer"
                                >
                                  <TrendingUp size={10} />
                                  Avis
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Limite de Portes */}
      <AnimatePresence>
        {showLimitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowLimitModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className={`relative z-10 w-full max-w-sm rounded-[32px] p-8 shadow-2xl ${darkMode ? "bg-zinc-950 border border-zinc-800" : "bg-white border border-slate-100"}`}
            >
              <div className="text-center space-y-4">
                <div
                  className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${darkMode ? "bg-amber-500/10" : "bg-amber-100"}`}
                >
                  <Building2
                    size={28}
                    className={darkMode ? "text-amber-400" : "text-amber-600"}
                  />
                </div>
                <h3
                  className={`text-base font-black uppercase italic tracking-tighter ${darkMode ? "text-white" : "text-slate-900"}`}
                >
                  Limite de Portes Atteinte
                </h3>
                <p
                  className={`text-sm font-semibold leading-relaxed ${darkMode ? "text-zinc-400" : "text-slate-500"}`}
                >
                  Votre forfait actuel permet un maximum de{" "}
                  <strong>{nombrePortes} porte(s)</strong>. Passez à un forfait
                  supérieur pour gérer plus de propriétés.
                </p>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowLimitModal(false)}
                  className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase transition-all border-none ${darkMode ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"} focus:outline-none focus:ring-0`}
                >
                  Plus tard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLimitModal(false);
                    setVista("pricing");
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase text-white bg-[#059669] hover:bg-emerald-700 shadow-xl shadow-emerald-900/20 active:scale-95 transition-all border-none focus:outline-none focus:ring-0"
                >
                  Voir les forfaits
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>

    {/* ── Avis d'augmentation de loyer modal ──────────────────────────── */}
    {avisModalUnit && (
      <AvisAugmentationModal
        darkMode={darkMode}
        isOpen={avisModalOpen}
        onClose={() => { setAvisModalOpen(false); setAvisModalUnit(null); }}
        tenantName={avisModalUnit.unit.tenantName || ""}
        monthlyRent={avisModalUnit.unit.monthlyRent || 0}
        moveInDate={avisModalUnit.unit.moveInDate}
        unitLabel={avisModalUnit.unit.unitName || ""}
        adresseLogement={avisModalUnit.adresse}
        locateurNom={adminName || currentCompany?.nombre || ""}
        locateurAdresse={currentCompany?.adresse}
        locateurTel={currentCompany?.tel}
        locateurEmail={currentCompany?.email}
      />
    )}
  </div>
  );
};

export default GestionPlex;
