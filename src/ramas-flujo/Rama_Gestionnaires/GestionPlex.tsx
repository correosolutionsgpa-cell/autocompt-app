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

import React, { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { UnitDoc } from "../../lib/dataService";
import {
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Menu,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GestionPlexProps {
  // Mode
  darkMode: boolean;

  // États globaux partagés (non encapsulables)
  plexManagementForm: any;
  plexManagementProperties: any[];
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

  // Composant sidebar
  WorkspaceSidebar: React.ComponentType;

  // ── S.O.F.I. Magic Tax Scanner ──────────────────────────────────────────────
  /** Called with a File when the user selects a tax bill image */
  onTaxScan: (file: File) => Promise<void>;
  /** Set by App when S.O.F.I. has pre-filled the form; cleared on next edit */
  sofiPrefillMessage: string;
}

// ── Composant ─────────────────────────────────────────────────────────────────

const GestionPlex: React.FC<GestionPlexProps> = ({
  darkMode,
  plexManagementForm,
  plexManagementProperties,
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
  WorkspaceSidebar,
  onTaxScan,
  sofiPrefillMessage,
}) => {
  const taxScanInputRef = useRef<HTMLInputElement>(null);

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
            Ajouter une Propriété
          </h3>

          {/* ── S.O.F.I. Tax Scanner ──────────────────────────────────────── */}
          <div className="ml-auto flex-shrink-0">
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
              Nombre de pièces (appellation commerciale)
            </label>
            <input
              type="text"
              value={plexManagementForm.nombrePieces}
              onChange={(e) =>
                setPlexManagementForm({
                  ...plexManagementForm,
                  nombrePieces: e.target.value,
                })
              }
              placeholder="Ex: 4½, 3½, Studio"
              className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border focus:ring-2 focus:ring-emerald-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"}`}
            />
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
                  className={`flex p-1 rounded-full w-full max-w-sm gap-1 border ${darkMode ? "border-zinc-800 bg-zinc-900/30" : "border-slate-200 bg-slate-50/50"}`}
                >
                  {["Actif", "Vacant", "Entretien"].map((s) => {
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
                        className={`flex-1 py-3 px-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all duration-300 ease-in-out flex items-center justify-center space-x-1.5 border ${
                          isSelected
                            ? darkMode
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm"
                              : "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm"
                            : "bg-transparent border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2 size={12} className="mr-1" />
                        )}
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
                  for (const c of plexManagementForm.chambres || []) {
                    if (c.status === "Actif" && (!c.locataire || !c.montant)) {
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

                const newId = `prop_${Date.now()}`;
                // Build units from the form (single unit for Logement entier, or multiple for Colocation)
                const formUnits: any[] =
                  plexManagementForm.typeLocation === "Chambres individuelles (Colocation)" ||
                  plexManagementForm.typeLocation === "Habitation/Chambre"
                    ? (plexManagementForm.units || [])
                    : [{
                        id: `unit_${Date.now()}`,
                        buildingId: newId,
                        unitName: plexManagementForm.nombrePieces || "Unité principale",
                        tenantName: plexManagementForm.locataire || "",
                        monthlyRent: parseFloat(plexManagementForm.montant) || 0,
                        isActive: plexManagementForm.status !== "Vacant",
                      }];

                setPlexManagementProperties([
                  ...plexManagementProperties,
                  {
                    ...plexManagementForm,
                    id: newId,
                    isContainer: formUnits.length > 1,
                    units: formUnits,
                  },
                ]);
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
              <span>Enregistrer l'unité</span>
            </button>
          </div>
        </div>
      </div>

      {/* Liste des propriétés enregistrées */}
      {plexManagementProperties.length > 0 && (
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
                {plexManagementProperties.filter((p) => p.status === "Actif").length} Unités Actives
              </span>
              <span className="bg-slate-400/10 text-slate-500 px-2 py-1 rounded-md">
                {plexManagementProperties.filter((p) => p.status === "Vacant").length} Vacantes
              </span>
              {plexManagementProperties.filter((p) => p.status === "Entretien").length > 0 && (
                <span className="bg-rose-500/10 text-rose-500 px-2 py-1 rounded-md">
                  {plexManagementProperties.filter((p) => p.status === "Entretien").length} En Entretien
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {plexManagementProperties.map((p) => {
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
                          className={`text-[10px] px-2 py-1 rounded-md font-black uppercase tracking-widest text-white ${p.status === "Vacant" ? "bg-slate-500" : p.status === "Entretien" ? "bg-rose-500" : "bg-emerald-500"}`}
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
                      <p
                        className={`text-lg font-black mt-2 ${darkMode ? "text-zinc-200" : "text-slate-800"}`}
                      >
                        {p.montant} ${" "}
                        <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">
                          / Mois
                        </span>
                      </p>
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
                            <p className={`text-base font-black ${darkMode ? "text-zinc-100" : "text-slate-900"}`}>
                              {u.monthlyRent} $
                            </p>
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
  </div>
  );
};

export default GestionPlex;
