/**
 * MiseEnDemeureModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Génère et envoie une mise en demeure pour non-paiement de loyer, adressée à
 * un locataire, depuis la fiche de l'unité dans GestionPlex.
 *
 * Même architecture que SyndicAiReporter.tsx (Sofi rédige via /api/chat, texte
 * révisable dans un textarea avant envoi) — mais adaptée pour UN locataire :
 *   1. L'historique réel des loyers (LoyerDoc, filtré par unitId) est résumé
 *      automatiquement — jamais de montant inventé par l'IA.
 *   2. Le locateur peut ajouter un contexte libre (relances déjà faites,
 *      communications, etc.) que Sofi intègre dans le brouillon.
 *   3. Le texte généré reste éditable ; l'envoi n'est possible qu'après une
 *      case de confirmation explicite du locateur (approbation du compte
 *      AutoCompt), jamais automatique.
 *
 * Envoi réel via /api/send-report-email (même endpoint générique et
 * authentifié déjà utilisé par ComptableExportView) — pas de nouvel endpoint
 * backend nécessaire.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Scale, Sparkles, Loader2, AlertTriangle, ExternalLink,
  Send, Download, CheckCircle2, History, Mail,
} from "lucide-react";
import jsPDF from "jspdf";
import { auth } from "../../lib/firebase";
import { dataService, type UnitDoc, type LoyerDoc } from "../../lib/dataService";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MiseEnDemeureModalProps {
  darkMode: boolean;
  isOpen: boolean;
  onClose: () => void;

  unit: UnitDoc | null;
  adresseLogement: string;
  activeCompanyId: string;
  companyName: string;

  // Pre-filled from company profile (mêmes props qu'AvisAugmentationModal)
  locateurNom: string;
  locateurAdresse?: string;
  locateurTel?: string;
  locateurEmail?: string;
  adminName?: string;
  adminRole?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtCAD = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n || 0);

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");

// ── Composant ─────────────────────────────────────────────────────────────────

const MiseEnDemeureModal: React.FC<MiseEnDemeureModalProps> = ({
  darkMode,
  isOpen,
  onClose,
  unit,
  adresseLogement,
  activeCompanyId,
  companyName,
  locateurNom,
  locateurAdresse,
  locateurTel,
  locateurEmail,
  adminName,
  adminRole,
}) => {
  const [contextText, setContextText] = useState("");
  const [loyerHistory, setLoyerHistory] = useState<LoyerDoc[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [recipientEmail, setRecipientEmail] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  // Reset + fetch this unit's real payment history whenever the modal opens.
  useEffect(() => {
    if (!isOpen || !unit) return;
    setContextText("");
    setGeneratedText("");
    setError("");
    setIsSent(false);
    setConfirmChecked(false);
    setRecipientEmail(unit.tenantEmail || "");
    setLoyerHistory([]);

    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setIsLoadingHistory(true);
    dataService
      .fetchLoyers(uid)
      .then((all) => setLoyerHistory(all.filter((l) => l.unitId === unit.id)))
      .catch((e) => console.error("[MiseEnDemeureModal] fetchLoyers error:", e))
      .finally(() => setIsLoadingHistory(false));
  }, [isOpen, unit?.id]);

  if (!unit) return null;

  const unitLabel = unit.unitName || "";
  const sortedHistory = [...loyerHistory].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const enRetard = loyerHistory.filter((l) => l.statut === "En retard");
  const totalEnRetard = enRetard.reduce((sum, l) => sum + (l.loyer || 0), 0);

  const buildHistoryLines = (): string => {
    if (loyerHistory.length === 0) {
      return "Aucun historique de paiement enregistré dans AutoCompt pour cette unité.";
    }
    return sortedHistory
      .slice(0, 12)
      .map((l) => `- ${l.date || "(date non précisée)"} : ${fmtCAD(l.loyer)} — ${l.statut}`)
      .join("\n");
  };

  const buildPrompt = (): string => `Tu es un juriste spécialisé en droit du logement résidentiel au Québec. Rédige une mise en demeure formelle qu'un locateur envoie à son locataire pour non-paiement de loyer, en te basant STRICTEMENT sur les faits fournis ci-dessous — n'invente aucun montant, aucune date, ni aucun article de loi précis dont tu n'es pas certain.

LOCATEUR : ${locateurNom}${locateurAdresse ? ` — ${locateurAdresse}` : ""}
LOCATAIRE : ${unit.tenantName}
LOGEMENT : ${unitLabel} — ${adresseLogement}
LOYER MENSUEL : ${fmtCAD(unit.monthlyRent)}

HISTORIQUE DE PAIEMENT ENREGISTRÉ DANS AUTOCOMPT :
${buildHistoryLines()}
${totalEnRetard > 0 ? `\nMONTANT TOTAL ACTUELLEMENT EN RETARD (calculé automatiquement) : ${fmtCAD(totalEnRetard)}` : ""}

CONTEXTE ADDITIONNEL FOURNI PAR LE LOCATEUR :
${contextText.trim() || "Aucun contexte additionnel fourni."}

La mise en demeure doit inclure :
1. Identification claire du locateur, du locataire et du logement concerné
2. Rappel de l'obligation de payer le loyer prévue au bail résidentiel
3. Résumé factuel du retard, en te basant uniquement sur les montants et dates ci-dessus
4. Un délai raisonnable pour régulariser la situation
5. Mention que le locataire peut s'adresser au Tribunal administratif du logement (TAL) en cas de désaccord, et que le locateur pourrait y avoir recours en cas de non-paiement persistant
6. Ton ferme, professionnel et factuel — jamais menaçant au-delà de ce que permet la loi

Ne cite aucun article précis du Code civil du Québec ou d'un règlement à moins d'en être certain — préfère une formulation générale ("conformément aux dispositions applicables au bail résidentiel au Québec") si tu n'es pas sûr du numéro exact.`;

  const buildFallback = (): string => `MISE EN DEMEURE — NON-PAIEMENT DE LOYER

Locateur : ${locateurNom}${locateurAdresse ? ` — ${locateurAdresse}` : ""}
Locataire : ${unit.tenantName}
Logement : ${unitLabel} — ${adresseLogement}
Date : ${new Date().toLocaleDateString("fr-CA", { dateStyle: "long" })}

Madame, Monsieur,

La présente constitue une mise en demeure formelle concernant le loyer impayé pour le logement mentionné ci-dessus, au montant mensuel de ${fmtCAD(unit.monthlyRent)}.

${buildHistoryLines()}
${totalEnRetard > 0 ? `\nMontant total actuellement en retard : ${fmtCAD(totalEnRetard)}` : ""}

${contextText.trim() ? `Contexte additionnel :\n${contextText.trim()}\n` : ""}
Vous êtes par la présente mis en demeure de régulariser votre situation dans un délai raisonnable. À défaut, le locateur se réserve le droit de s'adresser au Tribunal administratif du logement.

Ce document est produit à titre de référence — consultez un professionnel du droit pour toute situation complexe.

${locateurNom}`;

  const handleGenerate = async () => {
    setError("");
    setIsGenerating(true);
    setGeneratedText("");
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: buildPrompt() }], currentForfeit: "Pro" }),
      });
      if (!resp.ok) throw new Error("API error");
      const data = await resp.json();
      setGeneratedText(data.reply || data.message || buildFallback());
    } catch (e) {
      console.error("[MiseEnDemeureModal] handleGenerate error:", e);
      setGeneratedText(buildFallback());
    } finally {
      setIsGenerating(false);
    }
  };

  const pdfFilename = () =>
    `Mise_en_demeure_${(unit.tenantName || unitLabel).replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;

  const buildPdfDoc = (): jsPDF => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const margin = 18;
    const contentW = pageW - margin * 2;
    const rose: [number, number, number] = [225, 29, 72];

    doc.setFillColor(...rose);
    doc.rect(0, 0, pageW, 34, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("MISE EN DEMEURE — NON-PAIEMENT DE LOYER", margin, 15);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${unitLabel} — ${adresseLogement}`, margin, 22);
    doc.text(new Date().toLocaleDateString("fr-CA", { dateStyle: "long" }), pageW - margin, 15, { align: "right" });

    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(generatedText, contentW);
    let y = 46;
    const lineH = 5.2;
    lines.forEach((line: string) => {
      if (y > pageH - 30) {
        doc.addPage();
        y = 20;
      }
      const isSectionTitle = /^[1-9]\. /.test(line.trim()) || (line === line.toUpperCase() && line.trim().length > 3);
      if (isSectionTitle) {
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(...rose);
      } else {
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(30, 41, 59);
      }
      doc.text(line, margin, y);
      y += lineH;
    });

    y = Math.max(y + 10, pageH - 45);
    if (y + 30 > pageH) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(...rose);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(locateurNom, margin, y);
    y += 4;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${adminName || ""}${adminName && adminRole ? " — " : ""}${adminRole || ""}`.trim() || companyName, margin, y);

    doc.setFillColor(...rose);
    doc.rect(0, pageH - 12, pageW, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text("Document généré via AutoCompt — DocuLegal. À titre de référence, ne remplace pas un avis juridique professionnel.", margin, pageH - 5);

    return doc;
  };

  const handleDownload = () => {
    if (!generatedText) return;
    buildPdfDoc().save(pdfFilename());
  };

  const handleSend = async () => {
    setError("");
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      setError("Veuillez entrer un courriel valide pour le locataire.");
      return;
    }
    if (!confirmChecked) {
      setError("Veuillez confirmer avoir vérifié l'exactitude du document avant l'envoi.");
      return;
    }
    setIsSending(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const pdfBase64 = buildPdfDoc().output("datauristring").split(",")[1];
      const resp = await fetch("/api/send-report-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          recipientEmail,
          recipientName: unit.tenantName,
          companyName,
          reportLabel: `Mise en demeure — ${unitLabel}`,
          replyToEmail: locateurEmail || auth.currentUser?.email,
          attachments: [{ filename: pdfFilename(), content: pdfBase64 }],
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || "Échec de l'envoi.");

      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          await dataService.saveAiReport(uid, {
            id: "",
            companyId: activeCompanyId,
            type: "mise_en_demeure_locataire",
            period: `${unitLabel} — ${unit.tenantName}`,
            text: generatedText,
          });
        } catch (e) {
          console.error("[MiseEnDemeureModal] saveAiReport error:", e);
        }
      }
      setIsSent(true);
    } catch (e: any) {
      console.error("[MiseEnDemeureModal] handleSend error:", e);
      setError(e.message || "Erreur lors de l'envoi du courriel.");
    } finally {
      setIsSending(false);
    }
  };

  // ── Styles helpers (mêmes conventions qu'AvisAugmentationModal) ────────────
  const card = darkMode
    ? "bg-slate-900/60 border-white/[0.08] backdrop-blur-md text-white"
    : "bg-white border-slate-200 text-slate-900";
  const input = darkMode
    ? "bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-rose-500"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-rose-500";
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
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] border shadow-2xl ${card} relative`}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="p-6 pb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
                  <Scale size={22} />
                </div>
                <div>
                  <h2 className="font-black uppercase italic tracking-tighter text-lg leading-tight">
                    Mise en demeure
                  </h2>
                  <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${darkMode ? "text-rose-500" : "text-rose-600"}`}>
                    Non-paiement de loyer · {unit.tenantName || "Locataire"}
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

            {/* Legal disclaimer */}
            <div className={`mx-6 mb-4 p-3 rounded-2xl border text-[9px] font-bold flex items-start gap-2 ${darkMode ? "bg-amber-900/20 border-amber-700/40 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <span>
                Document généré à titre de référence par Sofi (IA) — pas un avis juridique. Consultez un professionnel pour toute situation complexe. Formulaires officiels du{" "}
                <a href="https://www.tal.gouv.qc.ca" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">
                  Tribunal administratif du logement <ExternalLink size={9} />
                </a>{" "}
                disponibles dans DocuLegal.
              </span>
            </div>

            <div className="px-6 pb-6 space-y-5">

              {/* Pre-filled data */}
              <div className="space-y-2">
                <p className={`text-[9px] font-black uppercase tracking-widest ${label}`}>Données pré-remplies depuis GestionPlex</p>
                <div className={`p-4 rounded-2xl border space-y-2 ${prefilledBg}`}>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${label}`}>Locataire</p>
                      <p className="font-bold">{unit.tenantName || "—"}</p>
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
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${label}`}>Loyer mensuel</p>
                      <p className="font-bold text-rose-600 dark:text-rose-400">{fmtCAD(unit.monthlyRent)} / mois</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment history (real data, auto-pulled) */}
              <div className="space-y-2">
                <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${label}`}>
                  <History size={11} /> Historique de paiement (réel, enregistré dans AutoCompt)
                </p>
                <div className={`p-4 rounded-2xl border ${prefilledBg}`}>
                  {isLoadingHistory ? (
                    <div className="flex items-center gap-2 text-[10px] font-bold py-2">
                      <Loader2 size={12} className="animate-spin" /> Chargement de l'historique…
                    </div>
                  ) : loyerHistory.length === 0 ? (
                    <p className="text-[10px] font-bold opacity-70">Aucun historique de loyer enregistré pour cette unité.</p>
                  ) : (
                    <>
                      {totalEnRetard > 0 && (
                        <p className="text-[11px] font-black text-rose-600 dark:text-rose-400 mb-2">
                          Total en retard : {fmtCAD(totalEnRetard)} ({enRetard.length} période{enRetard.length > 1 ? "s" : ""})
                        </p>
                      )}
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {sortedHistory.slice(0, 8).map((l) => (
                          <div key={l.id} className="flex items-center justify-between text-[10px] font-bold">
                            <span className="opacity-70">{l.date || "—"}</span>
                            <span>{fmtCAD(l.loyer)}</span>
                            <span className={l.statut === "En retard" ? "text-rose-500" : l.statut === "Payé" ? "text-emerald-500" : "opacity-60"}>
                              {l.statut}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Context textarea */}
              <div className="space-y-2">
                <label className={`text-[9px] font-black uppercase tracking-widest ${label}`}>
                  Expliquez la situation à Sofi (contexte additionnel)
                </label>
                <textarea
                  rows={4}
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  placeholder="Ex. : Retard depuis 2 mois, 3 relances envoyées par texto sans réponse, promesse de paiement le 15 non tenue…"
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-colors resize-none ${input}`}
                />
              </div>

              {/* Generate button */}
              {!generatedText && (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:from-rose-600 hover:to-rose-700 shadow-md hover:shadow-rose-500/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Sofi rédige…
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} /> Générer la mise en demeure avec Sofi
                    </>
                  )}
                </button>
              )}

              {/* Generated text — editable review */}
              {generatedText && !isSent && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className={`text-[9px] font-black uppercase tracking-widest ${label}`}>
                      Brouillon — révisez et modifiez avant l'envoi
                    </label>
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${darkMode ? "text-zinc-400 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
                    >
                      {isGenerating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} Régénérer
                    </button>
                  </div>
                  <textarea
                    rows={12}
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-[12px] leading-relaxed font-medium outline-none transition-colors ${input}`}
                  />

                  <div className="space-y-2">
                    <label className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${label}`}>
                      <Mail size={11} /> Courriel du locataire
                    </label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="locataire@courriel.com"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none transition-colors ${input}`}
                    />
                  </div>

                  <label className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer text-[10px] font-bold ${darkMode ? "bg-zinc-900/60 border-zinc-800 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                    <input
                      type="checkbox"
                      checked={confirmChecked}
                      onChange={(e) => setConfirmChecked(e.target.checked)}
                      className="mt-0.5 accent-rose-500"
                    />
                    <span>
                      Je confirme avoir vérifié l'exactitude des informations ci-dessus et j'autorise l'envoi de ce document au nom de {companyName}.
                    </span>
                  </label>

                  {error && (
                    <p className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-3 py-2 rounded-xl">{error}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleDownload}
                      className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${darkMode ? "border-zinc-700 text-zinc-400 hover:bg-zinc-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                    >
                      <Download size={13} /> Télécharger
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={isSending}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:from-rose-600 hover:to-rose-700 shadow-md hover:shadow-rose-500/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSending ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Envoi…
                        </>
                      ) : (
                        <>
                          <Send size={13} /> Envoyer au locataire
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Success state */}
              {isSent && (
                <div className={`p-5 rounded-2xl border flex items-center gap-3 ${darkMode ? "bg-emerald-950/20 border-emerald-700/40 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                  <CheckCircle2 size={20} className="shrink-0" />
                  <p className="text-[11px] font-bold">
                    Mise en demeure envoyée à {recipientEmail}. Une copie a été archivée dans l'historique des documents générés.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MiseEnDemeureModal;
