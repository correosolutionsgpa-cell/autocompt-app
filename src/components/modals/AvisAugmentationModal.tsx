/**
 * AvisAugmentationModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal de génération de l'Avis d'augmentation de loyer (TAL-806).
 * Accessible depuis la fiche de chaque propriété/unité dans GestionPlex.
 *
 * Données pré-remplies automatiquement depuis GestionPlex :
 *   - Nom du locataire (UnitDoc.tenantName)
 *   - Adresse du logement (PropertyDoc.adresse + UnitDoc.unitName)
 *   - Loyer actuel (UnitDoc.monthlyRent)
 *   - Date de début du bail (UnitDoc.moveInDate)
 *
 * L'utilisateur ne saisit que : nouveau loyer + date d'effet + date de l'avis.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Download, AlertTriangle, ExternalLink, Calculator } from "lucide-react";
import { generateAvisAugmentationPDF, type AvisAugmentationData } from "../../lib/avisAugmentationPdf";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AvisAugmentationModalProps {
  darkMode: boolean;
  isOpen: boolean;
  onClose: () => void;

  // Pre-filled from UnitDoc
  tenantName: string;
  monthlyRent: number;
  moveInDate?: string;
  unitLabel: string;

  // Pre-filled from PropertyDoc
  adresseLogement: string;

  // Pre-filled from company profile
  locateurNom: string;
  locateurAdresse?: string;
  locateurTel?: string;
  locateurEmail?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

/** Compute the legal deadline window based on move-in date (proxy for lease start). */
const computeDeadline = (moveInDate?: string): string => {
  if (!moveInDate) return "Vérifiez les délais légaux applicables selon la durée de votre bail.";
  const start = new Date(moveInDate + "T00:00:00");
  const now = new Date();
  const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (monthsDiff >= 12) {
    return "Bail ≥ 12 mois : l'avis doit être envoyé entre 3 et 6 mois avant la fin du bail.";
  }
  return "Bail < 12 mois : l'avis doit être envoyé entre 1 et 2 mois avant la fin du bail.";
};

const fmtCAD = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

// ── Composant ─────────────────────────────────────────────────────────────────

const AvisAugmentationModal: React.FC<AvisAugmentationModalProps> = ({
  darkMode,
  isOpen,
  onClose,
  tenantName,
  monthlyRent,
  moveInDate,
  unitLabel,
  adresseLogement,
  locateurNom,
  locateurAdresse,
  locateurTel,
  locateurEmail,
}) => {
  const [nouveauLoyer, setNouveauLoyer] = useState("");
  const [dateEffet, setDateEffet] = useState("");
  const [dateAvis, setDateAvis] = useState(today());
  const [autresModifications, setAutresModifications] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNouveauLoyer("");
      setDateEffet("");
      setDateAvis(today());
      setAutresModifications("");
      setError("");
    }
  }, [isOpen]);

  const nouveauLoyerNum = parseFloat(nouveauLoyer) || 0;
  const augmentation = nouveauLoyerNum - monthlyRent;
  const augmentationPct = monthlyRent > 0 ? ((augmentation / monthlyRent) * 100).toFixed(2) : "0.00";
  const deadlineMsg = computeDeadline(moveInDate);

  const handleGenerate = async () => {
    setError("");
    if (!nouveauLoyer || nouveauLoyerNum <= 0) {
      setError("Veuillez entrer le nouveau loyer proposé.");
      return;
    }
    if (nouveauLoyerNum < monthlyRent) {
      setError("Le nouveau loyer ne peut pas être inférieur au loyer actuel.");
      return;
    }
    if (!dateEffet) {
      setError("Veuillez entrer la date de prise d'effet de l'augmentation.");
      return;
    }
    if (!dateAvis) {
      setError("Veuillez entrer la date de l'avis.");
      return;
    }

    setIsGenerating(true);
    try {
      const data: AvisAugmentationData = {
        locateur: {
          nom: locateurNom,
          adresse: locateurAdresse,
          tel: locateurTel,
          email: locateurEmail,
        },
        locataireNom: tenantName,
        adresseLogement,
        unitLabel,
        loyerActuel: monthlyRent,
        dateDebutBail: moveInDate,
        nouveauLoyer: nouveauLoyerNum,
        dateEffetAugmentation: dateEffet,
        dateAvis,
        autresModifications: autresModifications.trim() || undefined,
      };

      const pdf = generateAvisAugmentationPDF(data);
      const safeName = `${adresseLogement}-${unitLabel}`
        .replace(/[^a-z0-9]/gi, "_")
        .slice(0, 40);
      pdf.save(`Avis_Augmentation_${safeName}_${dateAvis}.pdf`);
    } catch (err) {
      console.error("Génération PDF échouée:", err);
      setError("Une erreur est survenue lors de la génération du PDF. Réessayez.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Styles helpers ────────────────────────────────────────────────────────
  const card = darkMode
    ? "bg-slate-900/60 border-white/[0.08] backdrop-blur-md text-white"
    : "bg-white border-slate-200 text-slate-900";
  const input = darkMode
    ? "bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-emerald-500"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500";
  const label = darkMode ? "text-zinc-400" : "text-slate-500";
  const prefilledBg = darkMode ? "bg-zinc-900/60 border-zinc-800 text-zinc-300" : "bg-slate-50 border-slate-100 text-slate-700";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", duration: 0.4 }}
            className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[32px] border shadow-2xl ${card} relative`}
          >
            {/* Glow accent */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="p-6 pb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <FileText size={22} />
                </div>
                <div>
                  <h2 className="font-black uppercase italic tracking-tighter text-lg leading-tight">
                    Avis d'augmentation de loyer
                  </h2>
                  <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${darkMode ? "text-emerald-500" : "text-emerald-600"}`}>
                    Inspiré du formulaire TAL-806
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors ${darkMode ? "text-zinc-400 hover:bg-zinc-800 hover:text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"}`}
              >
                <X size={18} />
              </button>
            </div>

            {/* TAL Disclaimer */}
            <div className={`mx-6 mb-4 p-3 rounded-2xl border text-[9px] font-bold flex items-start gap-2 ${darkMode ? "bg-amber-900/20 border-amber-700/40 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <span>
                Modèle inspiré du formulaire officiel TAL-806 du Tribunal administratif du logement (
                <a
                  href="https://www.tal.gouv.qc.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline inline-flex items-center gap-0.5"
                >
                  tal.gouv.qc.ca <ExternalLink size={9} />
                </a>
                ). AutoCompt n'est pas un cabinet juridique. Consultez un professionnel pour toute situation complexe.
              </span>
            </div>

            <div className="px-6 pb-6 space-y-5">

              {/* Pre-filled data section */}
              <div className="space-y-2">
                <p className={`text-[9px] font-black uppercase tracking-widest ${label}`}>
                  Données pré-remplies depuis GestionPlex
                </p>
                <div className={`p-4 rounded-2xl border space-y-2 ${prefilledBg}`}>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${label}`}>Locataire</p>
                      <p className="font-bold">{tenantName || "—"}</p>
                    </div>
                    <div>
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${label}`}>Logement</p>
                      <p className="font-bold">{unitLabel}</p>
                    </div>
                    <div>
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${label}`}>Adresse</p>
                      <p className="font-bold">{adresseLogement}</p>
                    </div>
                    <div>
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${label}`}>Loyer actuel</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">{fmtCAD(monthlyRent)} / mois</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* New rent input */}
              <div className="space-y-2">
                <label className={`text-[9px] font-black uppercase tracking-widest ${label}`}>
                  Nouveau loyer proposé ($ / mois) *
                </label>
                <input
                  id="avis-augmentation-nouveau-loyer"
                  type="number"
                  min={monthlyRent}
                  step="0.01"
                  value={nouveauLoyer}
                  onChange={(e) => setNouveauLoyer(e.target.value)}
                  placeholder={`Ex. : ${(monthlyRent * 1.03).toFixed(2)}`}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none transition-colors ${input}`}
                />
                {/* Live preview of the increase */}
                {nouveauLoyerNum > 0 && nouveauLoyerNum >= monthlyRent && (
                  <div className={`flex items-center gap-2 text-[10px] font-bold px-3 py-2 rounded-xl ${darkMode ? "bg-emerald-900/20 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>
                    <Calculator size={12} />
                    Augmentation : {fmtCAD(augmentation)} / mois · +{augmentationPct} %
                  </div>
                )}
              </div>

              {/* Date d'effet */}
              <div className="space-y-2">
                <label className={`text-[9px] font-black uppercase tracking-widest ${label}`}>
                  Date de prise d'effet *
                </label>
                <input
                  id="avis-augmentation-date-effet"
                  type="date"
                  value={dateEffet}
                  onChange={(e) => setDateEffet(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none transition-colors ${input}`}
                />
              </div>

              {/* Date de l'avis */}
              <div className="space-y-2">
                <label className={`text-[9px] font-black uppercase tracking-widest ${label}`}>
                  Date de l'avis (aujourd'hui)
                </label>
                <input
                  id="avis-augmentation-date-avis"
                  type="date"
                  value={dateAvis}
                  onChange={(e) => setDateAvis(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none transition-colors ${input}`}
                />
              </div>

              {/* Autres modifications (optional) */}
              <div className="space-y-2">
                <label className={`text-[9px] font-black uppercase tracking-widest ${label}`}>
                  Autres modifications au bail (optionnel)
                </label>
                <textarea
                  id="avis-augmentation-autres"
                  rows={2}
                  value={autresModifications}
                  onChange={(e) => setAutresModifications(e.target.value)}
                  placeholder="Ex. : Modification de la clause d'animaux, ajout de stationnement, etc."
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none transition-colors resize-none ${input}`}
                />
              </div>

              {/* Legal deadline reminder */}
              <div className={`p-3 rounded-2xl border flex items-start gap-2 text-[10px] font-bold ${darkMode ? "bg-slate-800/60 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5 text-amber-500" />
                <span>{deadlineMsg}</span>
              </div>

              {/* Error message */}
              {error && (
                <p className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-3 py-2 rounded-xl">
                  {error}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-colors ${darkMode ? "border-zinc-700 text-zinc-400 hover:bg-zinc-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                >
                  Annuler
                </button>
                <button
                  id="avis-augmentation-generate-btn"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Génération…
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      Générer le PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AvisAugmentationModal;
