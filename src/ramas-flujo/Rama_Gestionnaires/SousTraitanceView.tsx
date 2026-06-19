/**
 * SousTraitanceView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Gestionnaires (Main-d'œuvre & Sous-traitance)
 * Extraído de: src/App.tsx (L18013–L18729) — Fase 9 del desmantelamiento modular
 *
 * Vista de gestión de paiements de sous-traitance / main-d'œuvre.
 * CERO estados propios — 100% presentacional via props.
 *
 * Mandato de conformité fiscale (Golden Rule §2):
 *   NO modificar la lógica de cálculo TPS/TVQ (5% / 9.975%),
 *   ni el seuil de déductibilité (500$ sans facture),
 *   ni la cumulation NEQ de même travailleur.
 *
 * Rama: también es válido para Entrepreneurs (pago de sub-contratistas).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Menu,
  Trash2,
  Users,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SousTraitanceViewProps {
  // Mode
  darkMode: boolean;

  // Données filtrées (dérivées de filteredDepenses dans App)
  filteredDepenses: any[];

  // Profil actif
  activeCompanyId: string;
  activeUser: string;
  currentCompany: any;

  // États du formulaire sous-traitance (globaux — L1472–L1482 de App)
  subfFecha: string;
  setSubfFecha: (val: string) => void;
  subfFournisseur: string;
  setSubfFournisseur: (val: string) => void;
  subfNeq: string;
  setSubfNeq: (val: string) => void;
  subfDesc: string;
  setSubfDesc: (val: string) => void;
  subfSubtotal: string;
  setSubfSubtotal: (val: string) => void;
  subfTypePaiement: string;
  setSubfTypePaiement: (val: string) => void;
  subfIsTaxable: boolean;
  setSubfIsTaxable: (val: boolean) => void;
  subfAttachmentName: string;
  setSubfAttachmentName: (val: string) => void;

  // Dépenses globales
  setDepenses: (fn: any[] | ((prev: any[]) => any[])) => void;

  // Fonctions utilitaires App
  playNotificationSound: () => void;

  // Navigation
  setVista: (vista: string) => void;
  setIsSidebarOpen: (open: boolean) => void;

  // Composant App
  WorkspaceSidebar: React.ComponentType;
}

// ── Composant ─────────────────────────────────────────────────────────────────

const SousTraitanceView: React.FC<SousTraitanceViewProps> = ({
  darkMode,
  filteredDepenses,
  activeCompanyId,
  activeUser,
  currentCompany,
  subfFecha,
  setSubfFecha,
  subfFournisseur,
  setSubfFournisseur,
  subfNeq,
  setSubfNeq,
  subfDesc,
  setSubfDesc,
  subfSubtotal,
  setSubfSubtotal,
  subfTypePaiement,
  setSubfTypePaiement,
  subfIsTaxable,
  setSubfIsTaxable,
  subfAttachmentName,
  setSubfAttachmentName,
  setDepenses,
  playNotificationSound,
  setVista,
  setIsSidebarOpen,
  WorkspaceSidebar,
}) => {
    return (
      <div
        className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col font-sans text-left animate-in zoom-in-95 max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}
      >
        <WorkspaceSidebar />
        <header
          className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} px-6 py-5 border-b flex items-center justify-between shadow-sm text-left`}
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
              className={`p-2 transition-colors rounded-xl transition-all ${darkMode ? "text-zinc-500 hover:text-white hover:bg-zinc-900" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"}`}
            >
              <ArrowLeft size={24} />
            </button>
          </div>
          <h2 className="font-black uppercase italic tracking-tighter text-xl text-left">
            Sous-traitance & Main-d'œuvre
          </h2>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center space-x-2 border border-emerald-500/20 font-bold text-[9px] uppercase tracking-wider">
              <Users size={14} />
              <span>Mano d'œuvre</span>
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* FORMULAIRE DE SAISIE RAPIDE (Left Column - 5 cols equivalent on wide screen) */}
            <div
              className={`lg:col-span-5 p-6 rounded-[36px] border shadow-xl flex flex-col space-y-4 text-left ${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-100"}`}
            >
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-[#059669] dark:text-emerald-400">
                  ENREGISTRER UN PAIEMENT DE LA MAIN D'ŒUVRE
                </span>
                <h3
                  className={`text-sm font-black uppercase italic leading-none ${darkMode ? "text-zinc-150" : "text-slate-800"}`}
                >
                  Formulaire de Sous-traitance
                </h3>
                <p className="text-[10px] text-slate-450 dark:text-zinc-500 tracking-tight leading-normal">
                  Ajoutez les paiements de vos peintres, plombiers, jardiniers
                  et d'autres professionnels de la main-d'œuvre pour les déduire
                  automatiquement de vos impôts.
                </p>
              </div>

              {/* NOTIFICACIÓN DE ADVERTENCIA (UI) */}
              <div className="p-3.5 rounded-2xl border bg-amber-500/10 border-amber-500/20 text-amber-400 text-[10px] leading-relaxed flex items-start space-x-2.5">
                <AlertTriangle
                  size={16}
                  className="text-amber-400 flex-shrink-0 mt-0.5"
                />
                <span>
                  <strong>Avertissement fiscal :</strong> Pour les dépenses de
                  main-d'œuvre de moins de 500 $ par an sans facture, veuillez
                  indiquer l'ID ou le NEQ du travailleur. Pour tout montant
                  supérieur ou contrat régulier, une facture officielle incluant
                  le NEQ et les numéros TPS/TVQ est obligatoire pour garantir la
                  déductibilité fiscale.
                </span>
              </div>

              <hr
                className={darkMode ? "border-zinc-900" : "border-slate-100"}
              />

              {/* Form Fields container */}
              <div className="space-y-3.5 text-left">
                {/* DATE DU PAIEMENT */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500 flex items-center justify-between">
                    <span>
                      Date du paiement{" "}
                      <span className="text-emerald-500">*</span>
                    </span>
                  </label>
                  <input
                    type="date"
                    value={subfFecha}
                    onChange={(e) => setSubfFecha(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-inner" : "bg-slate-50 border-slate-205"}`}
                  />
                </div>

                {/* SOUS-TRAITANT / OUVRIER */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500">
                    Sous-traitant / Ouvrier{" "}
                    <span className="text-emerald-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subfFournisseur}
                    onChange={(e) => setSubfFournisseur(e.target.value)}
                    placeholder="ex: Jean Tremblay, Plombier Enr."
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-inner" : "bg-slate-50 border-slate-205"}`}
                  />
                </div>

                {/* IDENTIFIANT / NEQ / ID */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500">
                    Identifiant / NEQ / ID{" "}
                    <span className="text-emerald-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subfNeq}
                    onChange={(e) => setSubfNeq(e.target.value)}
                    placeholder="ex: NEQ 1178239401 / ID 48293"
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-inner" : "bg-slate-50 border-slate-205"}`}
                  />
                </div>

                {/* DESCRIPTION */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500">
                    Description des travaux{" "}
                    <span className="text-emerald-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subfDesc}
                    onChange={(e) => setSubfDesc(e.target.value)}
                    placeholder="ex: Jardinier, Plombier, réparation..."
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-inner" : "bg-slate-50 border-slate-205"}`}
                  />
                </div>

                {/* TYPE DE PAIEMENT */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500">
                    Type de Paiement <span className="text-emerald-500">*</span>
                  </label>
                  <select
                    value={subfTypePaiement}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubfTypePaiement(val);
                      if (
                        val === "Paiement sans facture - Travailleur autonome"
                      ) {
                        setSubfIsTaxable(false);
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-slate-50 border-slate-205"}`}
                  >
                    <option value="Facture Officielle">
                      Facture Officielle
                    </option>
                    <option value="Paiement sans facture - Travailleur autonome">
                      Paiement sans facture - Travailleur autonome
                    </option>
                  </select>
                </div>

                {/* MONTANT (HORS TAXES) */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500">
                    Montant ($) <span className="text-emerald-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400">
                      $ CAD
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={subfSubtotal}
                      onChange={(e) => setSubfSubtotal(e.target.value)}
                      placeholder="0.00"
                      className={`w-full p-2.5 pl-14 rounded-xl border text-xs outline-none font-bold focus:ring-1 focus:ring-[#059669] ${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-inner" : "bg-slate-50 border-slate-210"}`}
                    />
                  </div>
                </div>

                {/* DYNAMIC ERROR MESSAGE / NOTIFICATION (Lógica de Protección) */}
                {(() => {
                  const amtVal = parseFloat(subfSubtotal) || 0;
                  const isSansFacture =
                    subfTypePaiement ===
                    "Paiement sans facture - Travailleur autonome";

                  // Calculate cumulative for this same worker across aready registered items
                  const sameWorkerPayments = filteredDepenses.filter(
                    (d) =>
                      d.cat === "Sous-traitance" &&
                      d.neq &&
                      subfNeq.trim() &&
                      d.neq.toLowerCase() === subfNeq.trim().toLowerCase(),
                  );
                  const cumulativeForNEQ = sameWorkerPayments.reduce(
                    (acc, current) => acc + (current.subtotal || 0),
                    0,
                  );
                  const totalWithNew = cumulativeForNEQ + amtVal;

                  if (isSansFacture && (amtVal > 500 || totalWithNew > 500)) {
                    return (
                      <div className="p-3 rounded-2xl border bg-rose-500/10 border-rose-500/20 text-rose-400 text-[9.5px] font-bold leading-normal flex items-start space-x-2 animate-bounce">
                        <AlertTriangle
                          size={14}
                          className="text-rose-400 flex-shrink-0 mt-0.5"
                        />
                        <span>
                          Le montant dépasse 500 $. Une facture officielle est
                          requise pour la déductibilité.
                          {totalWithNew > 500 &&
                            amtVal <= 500 &&
                            ` (Cumul annuel de ${totalWithNew.toFixed(2)}$ pour ce travailleur)`}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* PHOTO / DOCUMENT ATTACHMENT REQUIRED FOR > 500$ & FACTURE OFFICIELLE */}
                {(() => {
                  const amtVal = parseFloat(subfSubtotal) || 0;
                  const isFactureOfficielle =
                    subfTypePaiement === "Facture Officielle";
                  if (isFactureOfficielle) {
                    const isRequired = amtVal > 500;
                    return (
                      <div className="space-y-1.5 text-left">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500 flex justify-between">
                          <span>
                            Preuve de facture / Document PDF ou Image{" "}
                            <span
                              className={
                                isRequired
                                  ? "text-rose-500 font-extrabold"
                                  : "text-slate-400"
                              }
                            >
                              {isRequired
                                ? " (OBLIGATOIRE pour > 500$)"
                                : "(Facultatif)"}
                            </span>
                          </span>
                        </label>
                        <div
                          className={`relative border border-dashed rounded-xl p-3.5 flex flex-col items-center justify-center text-center transition-all ${isRequired && !subfAttachmentName
                              ? "border-rose-500/40 bg-rose-500/5"
                              : "border-slate-200 dark:border-zinc-850 bg-slate-500/5 hover:border-[#059669]"
                            }`}
                        >
                          {subfAttachmentName ? (
                            <div className="flex items-center space-x-2">
                              <CheckCircle2
                                size={16}
                                className="text-emerald-500"
                              />
                              <span className="text-[10px] font-extrabold text-[#059669] dark:text-emerald-400 truncate max-w-[220px]">
                                {subfAttachmentName}
                              </span>
                              <button
                                onClick={() => setSubfAttachmentName("")}
                                className="p-1 text-rose-550 hover:bg-rose-500/10 rounded-lg text-[9px] font-bold uppercase transition-all"
                              >
                                Supprimer
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer flex flex-col items-center space-y-1 w-full p-2 select-none">
                              <Camera
                                size={18}
                                className={
                                  isRequired
                                    ? "text-rose-400 animate-pulse"
                                    : "text-slate-400"
                                }
                              />
                              <span
                                className={`text-[8.5px] font-extrabold uppercase tracking-wide mt-1 ${isRequired ? "text-rose-455" : "text-slate-455 dark:text-zinc-500"}`}
                              >
                                {isRequired
                                  ? "Joindre la photo de la facture (Requis)"
                                  : "Prendre photo / Joindre facture"}
                              </span>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setSubfAttachmentName(
                                      e.target.files[0].name,
                                    );
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Taxation details (Only enabled when Facture Officielle is selected) */}
                {subfTypePaiement === "Facture Officielle" && (
                  <div className="flex items-center space-x-3.5 p-3 rounded-2xl border border-dashed text-left bg-emerald-500/5 border-emerald-500/10">
                    <input
                      type="checkbox"
                      id="subfIsTaxable"
                      checked={subfIsTaxable}
                      onChange={(e) => setSubfIsTaxable(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-500 scale-110 cursor-pointer"
                    />
                    <label
                      htmlFor="subfIsTaxable"
                      className="text-[9.5px] leading-snug font-extrabold cursor-pointer select-none"
                    >
                      Calculer les taxes du Québec (TPS 5% & TVQ 9.975% auto)
                    </label>
                  </div>
                )}

                {/* Live tax preview */}
                {subfSubtotal && parseFloat(subfSubtotal) > 0 && (
                  <div
                    className={`p-3 rounded-2xl border text-left space-y-1 ${darkMode ? "bg-zinc-900/40 border-zinc-850" : "bg-slate-50 border-slate-100 shadow-inner"}`}
                  >
                    <div className="flex justify-between text-[9px] font-bold">
                      <span className="text-slate-450">Sous-total :</span>
                      <span>{parseFloat(subfSubtotal).toFixed(2)}$</span>
                    </div>
                    {subfTypePaiement === "Facture Officielle" &&
                      subfIsTaxable && (
                        <>
                          <div className="flex justify-between text-[9px] font-bold">
                            <span className="text-slate-450">TPS (5%) :</span>
                            <span>
                              {(parseFloat(subfSubtotal) * 0.05).toFixed(2)}$
                            </span>
                          </div>
                          <div className="flex justify-between text-[9px] font-bold">
                            <span className="text-slate-450">
                              TVQ (9.975%) :
                            </span>
                            <span>
                              {(parseFloat(subfSubtotal) * 0.09975).toFixed(2)}$
                            </span>
                          </div>
                        </>
                      )}
                    <div className="flex justify-between text-[10px] font-black border-t pt-1 mt-1 border-slate-200 dark:border-zinc-800">
                      <span className="text-emerald-500">Total estimé :</span>
                      <span className="text-emerald-500">
                        {subfTypePaiement === "Facture Officielle" &&
                          subfIsTaxable
                          ? (parseFloat(subfSubtotal) * 1.14975).toFixed(2)
                          : parseFloat(subfSubtotal).toFixed(2)}
                        $
                      </span>
                    </div>
                  </div>
                )}

                {/* Submit trigger button (Deshabilitado si supera 500$ sans facture) */}
                {(() => {
                  const amtVal = parseFloat(subfSubtotal) || 0;
                  const isSansFacture =
                    subfTypePaiement ===
                    "Paiement sans facture - Travailleur autonome";

                  // Cumulative same worker
                  const sameWorkerPayments = filteredDepenses.filter(
                    (d) =>
                      d.cat === "Sous-traitance" &&
                      d.neq &&
                      subfNeq.trim() &&
                      d.neq.toLowerCase() === subfNeq.trim().toLowerCase(),
                  );
                  const cumulativeForNEQ = sameWorkerPayments.reduce(
                    (acc, current) => acc + (current.subtotal || 0),
                    0,
                  );
                  const totalWithNew = cumulativeForNEQ + amtVal;

                  const isBlocked =
                    isSansFacture && (amtVal > 500 || totalWithNew > 500);

                  return (
                    <button
                      onClick={() => {
                        const amt = parseFloat(subfSubtotal);
                        if (!subfFournisseur.trim()) {
                          alert(
                            "Veuillez indiquer le nom de l'ouvrier / du sous-traitant.",
                          );
                          return;
                        }
                        if (!subfNeq.trim()) {
                          alert(
                            "Veuillez compléter le champ 'Identifiant / NEQ / ID'.",
                          );
                          return;
                        }
                        if (!subfDesc.trim()) {
                          alert(
                            "Veuillez compléter le champ 'Description' (ex: Jardinier, Plombier...).",
                          );
                          return;
                        }
                        if (isNaN(amt) || amt <= 0) {
                          alert("Veuillez entrer un montant supérieur à 0.");
                          return;
                        }

                        // Check attachment requirement
                        const isFactureOfficielle =
                          subfTypePaiement === "Facture Officielle";
                        if (
                          isFactureOfficielle &&
                          amt > 500 &&
                          !subfAttachmentName
                        ) {
                          alert(
                            "Une preuve de facture / document est obligatoire pour tout montant de facture officielle supérieur à 500 $.",
                          );
                          return;
                        }

                        const sub = amt;
                        const hasTax = isFactureOfficielle && subfIsTaxable;
                        const tpsVal = hasTax
                          ? parseFloat((sub * 0.05).toFixed(2))
                          : 0;
                        const tvqVal = hasTax
                          ? parseFloat((sub * 0.09975).toFixed(2))
                          : 0;
                        const tot = hasTax
                          ? parseFloat((sub * 1.14975).toFixed(2))
                          : sub;

                        const newDepInstance = {
                          id: Date.now(),
                          companyId: activeCompanyId,
                          fecha: subfFecha,
                          fournisseur: subfFournisseur.trim(),
                          cat: "Sous-traitance",
                          subtotal: sub,
                          tps: tpsVal,
                          tvq: tvqVal,
                          total: tot,
                          lien: subfAttachmentName ? "Attached Document" : null,
                          partnerTag: activeUser,
                          refacturableTriplex: false,
                          // Custom trace fields
                          neq: subfNeq.trim(),
                          typePaiement: subfTypePaiement,
                          desc: subfDesc.trim(),
                        };

                        setDepenses((prev) => [newDepInstance, ...prev]);
                        playNotificationSound();

                        // Reset form fields except date
                        setSubfFournisseur("");
                        setSubfNeq("");
                        setSubfDesc("");
                        setSubfSubtotal("");
                        setSubfAttachmentName("");

                        alert(
                          `Paiement de sous-traitance de ${tot.toFixed(2)}$ (${subfTypePaiement}) enregistré et déduit avec succès.`,
                        );
                      }}
                      disabled={isBlocked}
                      className={`w-full py-3 text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all shadow-lg active:scale-95 ${isBlocked
                          ? "bg-zinc-700/50 cursor-not-allowed opacity-50 shadow-none"
                          : "bg-[#059669] hover:bg-emerald-700 shadow-emerald-500/10 cursor-pointer"
                        }`}
                    >
                      Enregistrer le paiement
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* LIST OF RECORDED PAYMENTS (Right Column - 7 cols equivalent on wide screen) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Cumulated statistics widget header card */}
              {(() => {
                const activeSoutraitances = filteredDepenses.filter(
                  (d) => d.cat === "Sous-traitance",
                );
                const grandSubtotal = activeSoutraitances.reduce(
                  (acc, current) => acc + current.subtotal,
                  0,
                );
                const grandTps = activeSoutraitances.reduce(
                  (acc, current) => acc + current.tps,
                  0,
                );
                const grandTvq = activeSoutraitances.reduce(
                  (acc, current) => acc + current.tvq,
                  0,
                );
                const grandTotal = activeSoutraitances.reduce(
                  (acc, current) => acc + current.total,
                  0,
                );

                return (
                  <div
                    className={`p-6 rounded-[36px] border text-left relative overflow-hidden ${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md shadow-[0_15px_30px_rgba(0,0,0,0.4)]" : "bg-slate-900 shadow-[0_15px_30px_rgba(51,65,85,0.08)]"}`}
                  >
                    <div className="relative z-10 space-y-2 text-left">
                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400">
                        RÉSUMÉ FIABLE DES COÛTS DE MAIN D'ŒUVRE
                      </span>
                      <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">
                        Sous-traitance active
                      </h3>
                      <p className="text-[10.5px] leading-snug text-slate-300 dark:text-zinc-400 font-medium text-left">
                        Total cumulé des travaux de sous-traitance et
                        maintenance enregistrés pour{" "}
                        <span className="font-extrabold text-[#059669] dark:text-emerald-400">
                          {currentCompany?.nombre}
                        </span>{" "}
                        :
                      </p>

                      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/5 text-left">
                        <div className="text-left">
                          <span className="text-[7.5px] font-bold text-white/40 uppercase block">
                            Sous-total
                          </span>
                          <span className="text-xs font-bold text-white">
                            {grandSubtotal.toFixed(2)}$
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-[7.5px] font-bold text-white/40 uppercase block">
                            TPS (5%)
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            {grandTps.toFixed(2)}$
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-[7.5px] font-bold text-white/40 uppercase block">
                            TVQ (9.98%)
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            {grandTvq.toFixed(2)}$
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-[7.5px] font-black text-emerald-400 uppercase block">
                            Total Net
                          </span>
                          <span className="text-sm font-black text-emerald-400">
                            {grandTotal.toFixed(2)}$
                          </span>
                        </div>
                      </div>
                    </div>
                    <Users
                      className="absolute -right-6 -bottom-6 text-white/5 p-0 select-none pointer-events-none"
                      size={110}
                    />
                  </div>
                );
              })()}

              {/* List Table Container */}
              <div
                className={`p-6 rounded-[36px] border ${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-100"} text-left`}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[8.5px] font-black uppercase tracking-widest text-[#059669] dark:text-emerald-400">
                    Historique des paiements de main-d'œuvre
                  </p>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-extrabold text-[8px] uppercase tracking-wider">
                    {
                      filteredDepenses.filter((d) => d.cat === "Sous-traitance")
                        .length
                    }{" "}
                    Enregistrés
                  </span>
                </div>

                {filteredDepenses.filter((d) => d.cat === "Sous-traitance")
                  .length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="p-3 bg-slate-500/5 text-slate-400 dark:text-zinc-500 rounded-full">
                      <Users size={24} />
                    </div>
                    <p className="text-[10px] text-slate-450 dark:text-zinc-500 italic max-w-xs">
                      Aucun paiement de sous-traitance n'a encore été saisi pour
                      cette entreprise. Remplissez le formulaire de gauche pour
                      en ajouter un.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-left text-[9px] border-collapse min-w-[500px]">
                      <thead>
                        <tr
                          className={`border-b text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider ${darkMode ? "border-zinc-900" : "border-slate-100"}`}
                        >
                          <th className="py-2.5 pb-2">Date</th>
                          <th className="py-2.5 pb-2">
                            Sous-traitant / Travaux
                          </th>
                          <th className="py-2.5 pb-2">Identifiant / NEQ</th>
                          <th className="py-2.5 pb-2">Type / Reçu</th>
                          <th className="py-2.5 pb-2">Sous-total</th>
                          <th className="py-2.5 pb-2">TPS / TVQ</th>
                          <th className="py-2.5 pb-2 text-right">Total</th>
                          <th className="py-2.5 pb-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-900/50">
                        {filteredDepenses
                          .filter((d) => d.cat === "Sous-traitance")
                          .map((exInstance) => (
                            <tr
                              key={exInstance.id}
                              className={`hover:bg-slate-500/5 transition-all`}
                            >
                              <td className="py-2.5 font-bold whitespace-nowrap text-slate-550 dark:text-zinc-400">
                                {exInstance.fecha}
                              </td>
                              <td className="py-2.5">
                                <p className="font-extrabold text-slate-900 dark:text-white">
                                  {exInstance.fournisseur}
                                </p>
                                <p className="text-[7.5px] text-slate-400 dark:text-zinc-500">
                                  {exInstance.desc ||
                                    "Main-d'œuvre & Entretien"}
                                </p>
                              </td>
                              <td className="py-2.5 font-mono font-medium text-slate-600 dark:text-zinc-400">
                                {exInstance.neq || "N/A"}
                              </td>
                              <td className="py-2.5">
                                <div className="flex flex-col space-y-0.5 text-[8px]">
                                  <span
                                    className={`font-bold uppercase tracking-wider ${exInstance.typePaiement === "Facture Officielle" ? "text-emerald-500" : "text-amber-500"}`}
                                  >
                                    {exInstance.typePaiement ||
                                      "Facture Officielle"}
                                  </span>
                                  {exInstance.lien && (
                                    <span className="text-[#059669] dark:text-emerald-400 font-black flex items-center space-x-1">
                                      <span>📎 Reçu joint</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 font-bold">
                                {exInstance.subtotal.toFixed(2)}$
                              </td>
                              <td className="py-2.5 font-medium text-slate-450 dark:text-zinc-500">
                                {exInstance.tps > 0
                                  ? `${exInstance.tps.toFixed(2)}$ / ${exInstance.tvq.toFixed(2)}$`
                                  : "0.00$ / 0.00$"}
                              </td>
                              <td className="py-2.5 font-black italic tracking-tight text-right text-rose-500">
                                -{exInstance.total.toFixed(2)}$
                              </td>
                              <td className="py-2.5 text-center">
                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Êtes-vous certain de vouloir supprimer l'entrée de sous-traitance de ${exInstance.fournisseur} ?`,
                                      )
                                    ) {
                                      setDepenses((prev) =>
                                        prev.filter(
                                          (d) => d.id !== exInstance.id,
                                        ),
                                      );
                                      playNotificationSound();
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 dark:text-zinc-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                  title="Supprimer la dépense"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
};

export default SousTraitanceView;
