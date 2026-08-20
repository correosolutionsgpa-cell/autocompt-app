/**
 * FlipCalculatorView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Flippeurs
 * Module: Calculateur de Flip (profils Flippeur ET Prospecteur — RBAC
 * "flip_calculator". Un prospecteur n'assigne pas seulement des promesses/
 * cessions, il peut aussi acheter-rénover-revendre lui-même, tout comme
 * un flippeur — pas exclusif à un seul profil.)
 *
 * Suivi d'un projet d'achat-rénovation-revente. Le coût total du projet a
 * TROIS composantes, toutes nécessaires pour un profit réel (pas juste
 * "prix de vente moins prix d'achat"), corrigé 2026-08-13 par Fabiola:
 *   1. Coût d'acquisition — notaire, taxe de mutation ("bienvenue"),
 *      inspection, arpenteur, évaluation, frais de dossier (prêteur).
 *      Brièvement saisi en 6 champs séparés (2026-08-20), puis remplacé le
 *      même jour par un calcul automatique (5% du prix d'achat, estimation
 *      de Fabiola) — plus de saisie manuelle du tout, stocké dans fraisAchat
 *      comme avant pour ne rien casser côté profit/mise de fonds/faisabilité.
 *   2. Frais de possession — TOUT ce qui est dépensé pendant que le bien est
 *      détenu : rénovation, taxes foncières, assurances, intérêts
 *      hypothécaires/de financement, électricité, entretien. Lus directement
 *      depuis les dépenses déjà enregistrées dans Tenue de Livres (n'importe
 *      quelle catégorie), associées à l'adresse du projet — PAS limité à la
 *      rénovation seule.
 *   3. Frais de disposition — notaire à la vente et commission du courtier,
 *      saisis séparément à la vente (fraisNotaireVente / fraisCourtier).
 *
 * Délibérément PAS un second endroit pour saisir les dépenses de possession —
 * le formulaire rapide ici écrit dans la MÊME collection `expenses` que le
 * reste de l'app (via setDepenses, le setter qui synchronise déjà Firestore),
 * donc tout ce qui est loggé ici apparaît aussi dans Tenue de Livres, Grand
 * Livre et les déclarations TPS/TVQ — pas un silo séparé.
 *
 * Avertissement Anti-Flip : la règle fédérale de l'ARC (en vigueur depuis
 * 2023) impose une imposition à 100% comme revenu d'entreprise (aucune
 * exemption résidence principale) pour un bien détenu moins de 12 mois.
 * Le calcul ici (365 jours) est une approximation indicative, pas un avis
 * fiscal — la règle a ses propres exceptions (décès, divorce, perte
 * d'emploi...) qu'AutoCompt ne peut pas évaluer automatiquement.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from "react";
import StyledSelect from "../../components/ui/StyledSelect";
import jsPDF from "jspdf";
import {
  ArrowLeft, Menu, Hammer, Plus, X, Loader2, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Trash2, Edit3, Receipt, Home,
  ChevronDown, ChevronUp, Calculator, Percent, Users, Save, Download,
} from "lucide-react";
import { auth } from "../../lib/firebase";
import { dataService } from "../../lib/dataService";
import { getCompanyDriveConfig, uploadDocumentToDrive } from "../../lib/driveService";
import type { FlipProjectDoc, FlipRenovationItem, ExpenseDoc } from "../../lib/dataService";

// Same category strings as the main "Validation IA" expense form (App.tsx)
// so an expense logged here reads identically everywhere else in the app.
// "Capital remboursé" is deliberately excluded from HOLDING_CATEGORIES — a
// mortgage principal paydown isn't a cost of the flip, it's equity.
const HOLDING_CATEGORIES = [
  "Réparations et entretien",
  "Assurances",
  "Intérêts hypothécaires",
  // Broader than a bank mortgage on purpose — covers a private lender's
  // interest too (often a higher rate, interest-only during the flip).
  "Intérêts de financement (incl. prêteur privé)",
  // A private lender's underwriting/setup fee — distinct from the interest
  // itself, usually charged once when the loan is arranged. Added 2026-08-13
  // at Fabiola's request.
  "Frais de dossier (prêteur privé)",
  // What's paid to the original promettant-acheteur to take over their
  // promesse d'achat instead of buying directly — relevant to a
  // Prospecteur/Flippeur who acquires via cession. Added 2026-08-13.
  "Frais de cession de promesse d'achat",
  "Électricité / Chauffage",
  "Taxes foncières et scolaires",
  "Autre",
];
const EXCLUDED_FROM_PROJECT_COST = "Capital remboursé (non déductible)";

const fmtCAD = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n || 0);

const daysBetween = (a: string, b: string) => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

/**
 * Rapport d'analyse complet d'un projet de flip — adresse, ARV, budget de
 * rénovation détaillé, financement, possession réelle (Tenue de Livres),
 * disposition, résultat, associés. Même gabarit visuel que les autres PDF
 * de l'app (voir MandatDeGestionView.tsx: generateMandatPDF).
 */
function generateFlipPDF(p: FlipProjectDoc, projectExpenses: ExpenseDoc[], companyName: string): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 18;
  const TW = W - M * 2;
  const amber: [number, number, number] = [217, 119, 6];
  const lightAmber: [number, number, number] = [255, 247, 237];
  const gray: [number, number, number] = [100, 100, 100];
  const dark: [number, number, number] = [30, 30, 30];

  let y = 0;
  const nextPage = () => {
    pdf.addPage();
    y = 18;
    pdf.setFillColor(...amber);
    pdf.rect(0, 0, W, 8, "F");
    pdf.setFontSize(6);
    pdf.setTextColor(255, 240, 220);
    pdf.setFont("helvetica", "bold");
    pdf.text("CALCULATEUR DE FLIP — ANALYSE DE PROJET", M, 5.5);
    pdf.text(p.adresse, W - M, 5.5, { align: "right" });
  };
  const checkY = (needed = 12) => { if (y + needed > 270) nextPage(); };
  const sectionHeader = (title: string) => {
    checkY(14);
    pdf.setFillColor(...lightAmber);
    pdf.rect(M, y, TW, 8, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...amber);
    pdf.text(title.toUpperCase(), M + 3, y + 5.5);
    y += 12;
  };
  const row = (label: string, value: string, bold = false) => {
    checkY(7);
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setTextColor(...(bold ? dark : gray));
    pdf.text(label, M + 2, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...dark);
    pdf.text(value, W - M - 2, y, { align: "right" });
    y += 6;
  };

  // ── En-tête ──
  pdf.setFillColor(...amber);
  pdf.rect(0, 0, W, 30, "F");
  pdf.setFontSize(15);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text("Calculateur de Flip — Analyse de projet", M, 14);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(p.adresse, M, 21);
  pdf.text(companyName, M, 26);
  y = 38;

  const projectExpTotal = projectExpenses.reduce((s, d) => s + (d.total || 0), 0);
  const prixRevente = p.statut === "vendu" ? (p.prixReventeReel || 0) : (p.prixReventeEstime || 0);
  const fraisDisposition = (p.fraisNotaireVente || 0) + (p.fraisCourtier || 0);
  const profit = prixRevente - p.prixAchat - (p.fraisAchat || 0) - projectExpTotal - fraisDisposition;
  const endDate = p.statut === "vendu" && p.dateRevente ? p.dateRevente : new Date().toISOString().slice(0, 10);
  const joursDetenus = daysBetween(p.dateAchat, endDate);
  const isAntiFlip = joursDetenus < 365;
  const coutPi2ParEtat = p.etatCondition === "mauvais" ? (p.coutPi2Mauvais ?? 120)
    : p.etatCondition === "gout_du_jour" ? (p.coutPi2GoutDuJour ?? 60)
    : (p.coutPi2Bon ?? 30);
  const quickRenoEstimate = (p.nombreEtages || 0) * (p.pi2ParEtage || 0) * coutPi2ParEtat;
  const coutRenovationReel = (p.renovationLineItems || []).reduce((s, it) => s + (it.coutReel ?? 0), 0) || quickRenoEstimate;
  const moisDetenus = joursDetenus / 30.44;
  const miseDeFondsTotal = p.prixAchat * (1 - (p.banqueFinancementPct || 0) / 100);
  const montantFinanceBanque = p.prixAchat * (p.banqueFinancementPct || 0) / 100;
  const interetBanque = montantFinanceBanque * (p.banqueTauxHypothecaire || 0) / 100 * (moisDetenus / 12);
  const miseDeFondsFinanceeParPreteur = miseDeFondsTotal * (p.preteurPriveMiseDeFondsPct || 0) / 100;
  const renosFinanceesParPreteur = coutRenovationReel * (p.preteurPriveRenosPct || 0) / 100;
  const interetPreteurPrive = (miseDeFondsFinanceeParPreteur + renosFinanceesParPreteur) * (p.preteurPriveTauxAnnuel || 0) / 100 * (moisDetenus / 12);
  const hasFinancingData = p.banqueFinancementPct != null || p.preteurPriveMiseDeFondsPct != null;
  const investissementCashReel = hasFinancingData
    ? (miseDeFondsTotal - miseDeFondsFinanceeParPreteur) + (coutRenovationReel - renosFinanceesParPreteur) + (p.fraisAchat || 0)
    : p.prixAchat + (p.fraisAchat || 0);
  const roiAllCash = investissementCashReel > 0 ? (profit / investissementCashReel) * 100 : 0;
  const interetTotalReference = interetBanque + interetPreteurPrive;
  const coutsFixesMensuelTotal = (p.coutsFixesMensuels?.taxesMunicipales || 0)
    + (p.coutsFixesMensuels?.taxesScolaires || 0) + (p.coutsFixesMensuels?.electricite || 0)
    + (p.coutsFixesMensuels?.assurances || 0) + (p.coutsFixesMensuels?.deneigement || 0)
    + (p.coutsFixesMensuels?.fraisCondo || 0) + (p.coutsFixesMensuels?.entretien || 0)
    - (p.coutsFixesMensuels?.loyer || 0);
  const moisPotentiel = p.possessionMoisEstime || moisDetenus || 1;
  const coutsFixesPeriodeEstimes = coutsFixesMensuelTotal * moisPotentiel;
  const reventeEstimeePourFaisabilite = p.arv || p.prixReventeEstime || 0;
  const commissionEstimee = reventeEstimeePourFaisabilite * (p.commissionCourtierPctEstime || 0) / 100;
  const profitPotentiel = reventeEstimeePourFaisabilite - (p.prixAchat + (p.fraisAchat || 0)) - coutRenovationReel - coutsFixesPeriodeEstimes - interetTotalReference - commissionEstimee;

  sectionHeader("Coût d'Acquisition");
  row("Prix d'achat", fmtCAD(p.prixAchat));
  if (p.fraisAchat) row("Coût d'acquisition (notaire, mutation, inspection...)", fmtCAD(p.fraisAchat));
  row("Date d'achat", new Date(p.dateAchat).toLocaleDateString("fr-CA"));

  if (p.arv || p.nombreEtages) {
    sectionHeader("Analyse — valeur rénovée et estimation rapide");
    if (p.arv) row("Valeur marchande une fois rénovée (ARV)", fmtCAD(p.arv));
    if (p.nombreEtages) row("Nombre d'étages × pi² par étage", `${p.nombreEtages} × ${p.pi2ParEtage || 0} pi²`);
    if (p.nombreEtages) row(`État : ${p.etatCondition === "mauvais" ? "mauvais état" : p.etatCondition === "gout_du_jour" ? "mis au goût du jour" : "bon état"} (${coutPi2ParEtat} $/pi²)`, fmtCAD(quickRenoEstimate));
  }

  if (p.renovationLineItems && p.renovationLineItems.length > 0) {
    sectionHeader("Budget de rénovation détaillé");
    p.renovationLineItems.forEach((it) => {
      if (it.coutReel != null) row(it.categorie, fmtCAD(it.coutReel));
    });
    row("Total budget rénovation", fmtCAD(coutRenovationReel), true);
  }

  if (hasFinancingData) {
    sectionHeader("Structure de financement");
    if (p.banqueFinancementPct) row(`Banque — ${p.banqueFinancementPct}% @ ${p.banqueTauxHypothecaire || 0}%/an`, fmtCAD(interetBanque) + " intérêt réf.");
    if (p.preteurPriveMiseDeFondsPct || p.preteurPriveRenosPct) row(`Prêteur privé @ ${p.preteurPriveTauxAnnuel || 0}%/an`, fmtCAD(interetPreteurPrive) + " intérêt réf.");
  }

  sectionHeader(`Possession réelle (${projectExpenses.length} dépense(s) — Tenue de Livres)`);
  if (projectExpenses.length === 0) {
    pdf.setFontSize(8); pdf.setFont("helvetica", "italic"); pdf.setTextColor(...gray);
    pdf.text("Aucune dépense enregistrée pour cette adresse.", M + 2, y); y += 6;
  } else {
    projectExpenses.forEach((d) => row(`${d.fecha} — ${d.fournisseur || d.cat}`, fmtCAD(d.total || 0)));
  }
  row("Total possession", fmtCAD(projectExpTotal), true);

  sectionHeader(`Disposition — ${p.statut === "vendu" ? "revente réelle" : "revente estimée"}`);
  row("Prix de revente", fmtCAD(prixRevente));
  if (fraisDisposition) row("Frais de disposition (notaire + courtier)", fmtCAD(fraisDisposition));

  sectionHeader("Résultat");
  row("Profit" + (p.statut !== "vendu" ? " (estimé)" : ""), fmtCAD(profit), true);
  row("Marge sur prix d'achat", `${(p.prixAchat > 0 ? (profit / p.prixAchat) * 100 : 0).toFixed(1)}%`);
  row("ROI All Cash", `${roiAllCash.toFixed(1)}%`, true);

  if (reventeEstimeePourFaisabilite > 0) {
    sectionHeader("Profit potentiel — calculette de faisabilité");
    row("Base (ARV ou prix de revente estimé)", fmtCAD(reventeEstimeePourFaisabilite));
    row(`Coûts fixes de possession (${moisPotentiel.toFixed(1)} mois)`, fmtCAD(coutsFixesPeriodeEstimes));
    row("Commission de vente estimée", fmtCAD(commissionEstimee));
    row("Profit potentiel", fmtCAD(profitPotentiel), true);
  }

  if (p.associes && p.associes.length > 0) {
    sectionHeader("Répartition entre associés");
    const totalApports = p.associes.reduce((s, a) => s + a.apport, 0);
    p.associes.forEach((a) => {
      const pct = totalApports > 0 ? (a.apport / totalApports) * 100 : 0;
      row(`${a.nom} — apport ${fmtCAD(a.apport)} (${pct.toFixed(1)}%)`, fmtCAD(profit * pct / 100));
    });
  }

  if (isAntiFlip) {
    checkY(20);
    pdf.setFillColor(254, 226, 226);
    pdf.rect(M, y, TW, 16, "F");
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(190, 30, 30);
    pdf.text("⚠ RÈGLE ANTI-FLIP (ARC) — détention estimée à moins de 12 mois : le profit serait imposé", M + 3, y + 5);
    pdf.text("à 100% comme revenu d'entreprise, sans exemption résidence principale. Confirmez avec votre comptable.", M + 3, y + 10);
    y += 20;
  }

  checkY(12);
  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(...gray);
  pdf.text("Outil de calcul, pas un avis fiscal — vérifiez indépendamment. Généré par AutoCompt le " + new Date().toLocaleDateString("fr-CA"), M, y);

  return pdf;
}

export interface FlipCalculatorViewProps {
  darkMode: boolean;
  activeCompanyId: string;
  currentCompany: any;
  setVista: (v: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  WorkspaceSidebar: React.ComponentType;
  depenses: ExpenseDoc[];
  setDepenses: (value: ExpenseDoc[] | ((prev: ExpenseDoc[]) => ExpenseDoc[])) => void;
  activeUser: string;
  playNotificationSound?: () => void;
}

/** Estimation de Fabiola pour le coût d'acquisition (notaire, taxe de
 *  mutation, inspection, arpenteur, évaluation, frais de dossier) — calculé
 *  automatiquement, plus de saisie manuelle poste par poste. Ajusté de 5%
 *  à 6% le 2026-08-20 (Fabiola : "5% + 1% pour les frais qui ne s'appliquent
 *  pas à chaque opération, ex. arpenteur/évaluation à 0$") après avoir
 *  comparé avec un exemple réel où le détail ligne par ligne totalisait
 *  plus que 5% du prix d'achat — reste une estimation, pas un calcul exact
 *  (la vraie taxe de mutation du Québec est par paliers, pas un % plat). */
const TAUX_COUT_ACQUISITION = 0.06;

const emptyForm = {
  adresse: "", dateAchat: new Date().toISOString().slice(0, 10), prixAchat: "",
  prixReventeEstime: "", notes: "",
};

const emptySellForm = { prixReventeReel: "", dateRevente: new Date().toISOString().slice(0, 10), fraisNotaireVente: "", fraisCourtier: "" };

const emptyExpenseForm = { date: new Date().toISOString().slice(0, 10), description: "", montant: "", cat: HOLDING_CATEGORIES[0] };

// ── Analyse avancée — panneau optionnel/repliable par projet, jamais requis
// pour le flux simple (adresse/prix/frais/revente) ci-dessus. Un seul état
// de formulaire couvre les 3 phases (ARV/ROI, budget détaillé, financement +
// associés) pour rester cohérent — chaque phase construit sur la précédente.
const RENOVATION_CATEGORIES = [
  "Conditions générales", "Démo et conteneurs", "Excavation", "Fondation béton",
  "Béton finition et crépi", "Maçonnerie", "Revêtement extérieur", "Toiture",
  "Portes et fenêtres", "Aluminium, gouttières", "Patio, deck, balcon",
  "Paysagement", "Rough menuiserie", "Isolation", "Porte de garage",
  "Plomberie", "Électricité", "Ventilation, chauffage", "Gypse",
  "Portes et moulures", "Plancher de bois", "Plancher autre", "Céramique",
  "Plâtre", "Peinture", "Armoires et comptoirs", "Foyer", "Robinetterie",
  "Luminaires", "Autre",
];

const emptyAnalysisForm = {
  arv: "",
  etatCondition: "bon" as "bon" | "gout_du_jour" | "mauvais",
  nombreEtages: "",
  pi2ParEtage: "",
  coutPi2Bon: "30",
  coutPi2GoutDuJour: "60",
  coutPi2Mauvais: "120",
  renovationLineItems: [] as FlipRenovationItem[],
  banqueFinancementPct: "",
  banqueTauxHypothecaire: "",
  banqueAmortissementAns: "25",
  preteurPriveMiseDeFondsPct: "",
  preteurPriveRenosPct: "",
  preteurPriveTauxAnnuel: "",
  associes: [] as { nom: string; apport: number }[],
  possessionMoisEstime: "",
  coutsFixesMensuels: {
    taxesMunicipales: "", taxesScolaires: "", electricite: "", assurances: "",
    deneigement: "", fraisCondo: "", entretien: "", loyer: "",
  },
  commissionCourtierPctEstime: "4",
};

// ── Coûts fixes de possession — estimation rapide (montant MENSUEL, calcul
// automatique de la période complète) pour évaluer la rentabilité AVANT
// d'avoir de vraies dépenses dans Tenue de Livres. ──
const COUTS_FIXES_LABELS: { key: keyof typeof emptyAnalysisForm.coutsFixesMensuels; label: string }[] = [
  { key: "taxesMunicipales", label: "Taxes municipales" },
  { key: "taxesScolaires", label: "Taxes scolaires" },
  { key: "electricite", label: "Électricité" },
  { key: "assurances", label: "Assurances" },
  { key: "deneigement", label: "Déneigement" },
  { key: "fraisCondo", label: "Frais de condo" },
  { key: "entretien", label: "Entretien" },
  { key: "loyer", label: "Loyer perçu (déduit du coût)" },
];

const FlipCalculatorView: React.FC<FlipCalculatorViewProps> = ({
  darkMode, activeCompanyId, currentCompany, setVista, setIsSidebarOpen, WorkspaceSidebar,
  depenses, setDepenses, activeUser, playNotificationSound,
}) => {
  const [projects, setProjects] = useState<FlipProjectDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [sellForm, setSellForm] = useState(emptySellForm);
  const [expenseProjectId, setExpenseProjectId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);
  const [analysisForm, setAnalysisForm] = useState(emptyAnalysisForm);
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  const glass = darkMode
    ? "bg-slate-900/40 border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)]"
    : "bg-white border-slate-200 shadow-sm";
  const inputCls = `w-full p-3 rounded-2xl text-[12px] font-bold border outline-none ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200"}`;
  const inputClsSm = `w-full p-1.5 rounded-lg text-[10px] font-bold border outline-none ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200"}`;

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeCompanyId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      setProjects(await dataService.fetchFlipProjects(uid, activeCompanyId));
    } catch (e) {
      console.error("[FlipCalculator] load error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId]);
  useEffect(() => { load(); }, [load]);

  // Every expense tagged to this address counts toward the project's cost —
  // rénovation, taxes, assurances, intérêts, entretien, all of it — not just
  // renovation. Only a principal paydown is excluded (see constant above).
  const projectExpensesFor = (adresse: string) =>
    depenses.filter((d) => d.cat !== EXCLUDED_FROM_PROJECT_COST && d.companyId === activeCompanyId && (d as any).propertyAddress === adresse);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  const handleSaveProject = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (!form.adresse.trim() || !form.prixAchat) {
      alert("L'adresse et le prix d'achat sont obligatoires.");
      return;
    }
    setIsSaving(true);
    try {
      const existing = editingId ? projects.find((p) => p.id === editingId) : null;
      const prixAchatNum = parseFloat(form.prixAchat) || 0;
      // Coût d'acquisition (notaire, taxe de mutation, inspection, arpenteur,
      // évaluation, frais de dossier) — calculé automatiquement à 5% du prix
      // d'achat, plus de saisie manuelle poste par poste.
      const fraisAchatTotal = prixAchatNum * TAUX_COUT_ACQUISITION;
      const saved = await dataService.saveFlipProject(uid, {
        id: editingId || `flip_${Date.now()}`,
        companyId: activeCompanyId,
        adresse: form.adresse.trim(),
        dateAchat: form.dateAchat,
        prixAchat: prixAchatNum,
        fraisAchat: fraisAchatTotal || undefined,
        prixReventeEstime: form.prixReventeEstime ? parseFloat(form.prixReventeEstime) : undefined,
        notes: form.notes || undefined,
        statut: existing?.statut || "en_cours",
        prixReventeReel: existing?.prixReventeReel,
        dateRevente: existing?.dateRevente,
        fraisNotaireVente: existing?.fraisNotaireVente,
        fraisCourtier: existing?.fraisCourtier,
      });
      setProjects((prev) => editingId ? prev.map((p) => (p.id === editingId ? saved : p)) : [saved, ...prev]);
      resetForm();
      playNotificationSound?.();
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement : " + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (p: FlipProjectDoc) => {
    setForm({
      adresse: p.adresse, dateAchat: p.dateAchat, prixAchat: String(p.prixAchat),
      prixReventeEstime: p.prixReventeEstime ? String(p.prixReventeEstime) : "",
      notes: p.notes || "",
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (p: FlipProjectDoc) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (!window.confirm(`Supprimer le projet "${p.adresse}" ? Les dépenses déjà enregistrées dans Tenue de Livres pour cette adresse ne seront PAS supprimées.`)) return;
    try {
      await dataService.deleteFlipProject(uid, p.id);
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + (err?.message || err));
    }
  };

  const handleMarkSold = async (p: FlipProjectDoc) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !sellForm.prixReventeReel) { alert("Le prix de revente réel est requis."); return; }
    setIsSaving(true);
    try {
      const saved = await dataService.saveFlipProject(uid, {
        ...p,
        statut: "vendu",
        prixReventeReel: parseFloat(sellForm.prixReventeReel) || 0,
        dateRevente: sellForm.dateRevente,
        fraisNotaireVente: sellForm.fraisNotaireVente ? parseFloat(sellForm.fraisNotaireVente) : undefined,
        fraisCourtier: sellForm.fraisCourtier ? parseFloat(sellForm.fraisCourtier) : undefined,
      });
      setProjects((prev) => prev.map((x) => (x.id === p.id ? saved : x)));
      setSellingId(null);
      setSellForm(emptySellForm);
      playNotificationSound?.();
    } catch (err: any) {
      alert("Erreur : " + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExpense = (p: FlipProjectDoc) => {
    const montant = parseFloat(expenseForm.montant);
    if (!montant || montant <= 0) { alert("Veuillez indiquer un montant."); return; }
    const uid = auth.currentUser?.uid;
    const newExpense: any = {
      id: Date.now(),
      companyId: activeCompanyId,
      fecha: expenseForm.date,
      fournisseur: expenseForm.description || `${expenseForm.cat} — ${p.adresse}`,
      cat: expenseForm.cat,
      subtotal: montant,
      tps: 0,
      tvq: 0,
      total: montant,
      lien: null,
      partnerTag: activeUser,
      isManual: true,
      propertyAddress: p.adresse,
      ownerId: uid,
    };
    setDepenses((prev) => [newExpense, ...prev]);
    setExpenseProjectId(null);
    setExpenseForm(emptyExpenseForm);
    playNotificationSound?.();
  };

  // ── Analyse avancée (ARV, budget détaillé, financement, associés) ─────────
  const toggleAnalysis = (p: FlipProjectDoc) => {
    if (expandedAnalysisId === p.id) { setExpandedAnalysisId(null); return; }
    setAnalysisForm({
      arv: p.arv != null ? String(p.arv) : "",
      etatCondition: p.etatCondition || "bon",
      nombreEtages: p.nombreEtages != null ? String(p.nombreEtages) : "",
      pi2ParEtage: p.pi2ParEtage != null ? String(p.pi2ParEtage) : "",
      coutPi2Bon: p.coutPi2Bon != null ? String(p.coutPi2Bon) : "30",
      coutPi2GoutDuJour: p.coutPi2GoutDuJour != null ? String(p.coutPi2GoutDuJour) : "60",
      coutPi2Mauvais: p.coutPi2Mauvais != null ? String(p.coutPi2Mauvais) : "120",
      renovationLineItems: p.renovationLineItems || [],
      banqueFinancementPct: p.banqueFinancementPct != null ? String(p.banqueFinancementPct) : "",
      banqueTauxHypothecaire: p.banqueTauxHypothecaire != null ? String(p.banqueTauxHypothecaire) : "",
      banqueAmortissementAns: p.banqueAmortissementAns != null ? String(p.banqueAmortissementAns) : "25",
      preteurPriveMiseDeFondsPct: p.preteurPriveMiseDeFondsPct != null ? String(p.preteurPriveMiseDeFondsPct) : "",
      preteurPriveRenosPct: p.preteurPriveRenosPct != null ? String(p.preteurPriveRenosPct) : "",
      preteurPriveTauxAnnuel: p.preteurPriveTauxAnnuel != null ? String(p.preteurPriveTauxAnnuel) : "",
      associes: p.associes || [],
      possessionMoisEstime: p.possessionMoisEstime != null ? String(p.possessionMoisEstime) : "",
      coutsFixesMensuels: {
        taxesMunicipales: p.coutsFixesMensuels?.taxesMunicipales != null ? String(p.coutsFixesMensuels.taxesMunicipales) : "",
        taxesScolaires: p.coutsFixesMensuels?.taxesScolaires != null ? String(p.coutsFixesMensuels.taxesScolaires) : "",
        electricite: p.coutsFixesMensuels?.electricite != null ? String(p.coutsFixesMensuels.electricite) : "",
        assurances: p.coutsFixesMensuels?.assurances != null ? String(p.coutsFixesMensuels.assurances) : "",
        deneigement: p.coutsFixesMensuels?.deneigement != null ? String(p.coutsFixesMensuels.deneigement) : "",
        fraisCondo: p.coutsFixesMensuels?.fraisCondo != null ? String(p.coutsFixesMensuels.fraisCondo) : "",
        entretien: p.coutsFixesMensuels?.entretien != null ? String(p.coutsFixesMensuels.entretien) : "",
        loyer: p.coutsFixesMensuels?.loyer != null ? String(p.coutsFixesMensuels.loyer) : "",
      },
      commissionCourtierPctEstime: p.commissionCourtierPctEstime != null ? String(p.commissionCourtierPctEstime) : "4",
    });
    setExpandedAnalysisId(p.id);
  };

  // ── Budget de rénovation détaillé — un poste préréglé à la fois, jamais
  // écrit dans Tenue de Livres (voir note du panneau) ──
  const addRenovationCategory = (categorie: string) => {
    if (analysisForm.renovationLineItems.some((it) => it.categorie === categorie)) return;
    setAnalysisForm({
      ...analysisForm,
      renovationLineItems: [
        ...analysisForm.renovationLineItems,
        { id: `reno_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, categorie },
      ],
    });
  };
  const updateRenovationItem = (id: string, patch: Partial<FlipRenovationItem>) => {
    setAnalysisForm({
      ...analysisForm,
      renovationLineItems: analysisForm.renovationLineItems.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  };
  const removeRenovationItem = (id: string) => {
    setAnalysisForm({
      ...analysisForm,
      renovationLineItems: analysisForm.renovationLineItems.filter((it) => it.id !== id),
    });
  };

  // ── Associés — liste libre nom + apport, jamais des champs codés en dur ──
  const [associeDraft, setAssocieDraft] = useState({ nom: "", apport: "" });
  const addAssocie = () => {
    const apport = parseFloat(associeDraft.apport);
    if (!associeDraft.nom.trim() || !apport || apport <= 0) return;
    setAnalysisForm({
      ...analysisForm,
      associes: [...analysisForm.associes, { nom: associeDraft.nom.trim(), apport }],
    });
    setAssocieDraft({ nom: "", apport: "" });
  };
  const removeAssocie = (index: number) => {
    setAnalysisForm({
      ...analysisForm,
      associes: analysisForm.associes.filter((_, i) => i !== index),
    });
  };

  const handleSaveAnalysis = async (p: FlipProjectDoc) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSavingAnalysis(true);
    try {
      const num = (s: string) => (s.trim() === "" ? undefined : parseFloat(s) || 0);
      // Firestore rejette `undefined` même dans un objet imbriqué (saveFlipProject
      // ne nettoie que les clés de premier niveau) — on nettoie chaque ligne ici.
      const cleanLineItems = analysisForm.renovationLineItems.map((it) => {
        const clean: any = { id: it.id, categorie: it.categorie };
        if (it.soumission1 != null) clean.soumission1 = it.soumission1;
        if (it.soumission2 != null) clean.soumission2 = it.soumission2;
        if (it.soumission3 != null) clean.soumission3 = it.soumission3;
        if (it.coutReel != null) clean.coutReel = it.coutReel;
        return clean as FlipRenovationItem;
      });
      // Même règle pour l'objet imbriqué des coûts fixes mensuels.
      const cleanCoutsFixes: any = {};
      COUTS_FIXES_LABELS.forEach(({ key }) => {
        const v = num(analysisForm.coutsFixesMensuels[key]);
        if (v != null) cleanCoutsFixes[key] = v;
      });
      const saved = await dataService.saveFlipProject(uid, {
        ...p,
        arv: num(analysisForm.arv),
        etatCondition: analysisForm.etatCondition,
        nombreEtages: num(analysisForm.nombreEtages),
        pi2ParEtage: num(analysisForm.pi2ParEtage),
        coutPi2Bon: num(analysisForm.coutPi2Bon),
        coutPi2GoutDuJour: num(analysisForm.coutPi2GoutDuJour),
        coutPi2Mauvais: num(analysisForm.coutPi2Mauvais),
        renovationLineItems: cleanLineItems,
        banqueFinancementPct: num(analysisForm.banqueFinancementPct),
        banqueTauxHypothecaire: num(analysisForm.banqueTauxHypothecaire),
        banqueAmortissementAns: num(analysisForm.banqueAmortissementAns),
        preteurPriveMiseDeFondsPct: num(analysisForm.preteurPriveMiseDeFondsPct),
        preteurPriveRenosPct: num(analysisForm.preteurPriveRenosPct),
        preteurPriveTauxAnnuel: num(analysisForm.preteurPriveTauxAnnuel),
        associes: analysisForm.associes,
        possessionMoisEstime: num(analysisForm.possessionMoisEstime),
        coutsFixesMensuels: Object.keys(cleanCoutsFixes).length > 0 ? cleanCoutsFixes : undefined,
        commissionCourtierPctEstime: num(analysisForm.commissionCourtierPctEstime),
      });
      setProjects((prev) => prev.map((x) => (x.id === p.id ? saved : x)));
      playNotificationSound?.();
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement de l'analyse : " + (err?.message || err));
    } finally {
      setSavingAnalysis(false);
    }
  };

  // ── Export PDF + sauvegarde Drive — même pattern que le reste de l'app
  // (HeuresPaieView.tsx: vérifie la connexion, upload si connecté). ──
  const handleGeneratePdf = async (p: FlipProjectDoc) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setGeneratingPdfId(p.id);
    try {
      const projectExp = projectExpensesFor(p.adresse);
      const pdf = generateFlipPDF(p, projectExp, currentCompany?.nombre || "Entreprise");
      const safeName = p.adresse.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 60);
      const fileName = `Flip-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`;

      const driveOwnerId = currentCompany?.ownerId || uid;
      const driveStatus = await getCompanyDriveConfig(activeCompanyId, driveOwnerId);
      if (driveStatus?.connected) {
        const base64 = pdf.output("datauristring").split(",")[1];
        const result = await uploadDocumentToDrive(
          activeCompanyId, driveOwnerId, base64, fileName,
          "application/pdf", currentCompany?.nombre || "Entreprise", "Calculateur de Flip",
        );
        if (!result.success) {
          console.error("[FlipCalculator] Drive upload failed:", result.error);
          alert("Le PDF a été téléchargé, mais l'enregistrement dans Drive a échoué : " + (result.error || "erreur inconnue"));
        }
      }
      pdf.save(fileName);
      playNotificationSound?.();
    } catch (err: any) {
      alert("Erreur lors de la génération du PDF : " + (err?.message || err));
    } finally {
      setGeneratingPdfId(null);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-slate-950" : "bg-slate-50"}`}>
        <Loader2 size={32} className="text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col font-sans md:pl-72`}>
      <WorkspaceSidebar />

      <header className={`${glass} px-6 py-4 border-b flex items-center gap-3 sticky top-0 z-40`}>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white md:hidden">
          <Menu size={18} />
        </button>
        <button onClick={() => setVista("dashboard")} className={`p-2 transition-colors ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}>
          <ArrowLeft size={20} />
        </button>
        <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
          <Hammer size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-black uppercase italic tracking-tighter text-lg leading-none truncate">
            Calculateur de Flip
          </h1>
          <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${darkMode ? "text-amber-400" : "text-amber-600"}`}>
            Budget, revente et profit par projet
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-wider shadow-lg"
        >
          <Plus size={13} /> Nouveau projet
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-3xl w-full mx-auto">
        {projects.length === 0 && !showForm && (
          <div className={`p-12 rounded-[28px] border flex flex-col items-center gap-4 text-center ${glass}`}>
            <Hammer size={40} className={darkMode ? "text-zinc-700" : "text-slate-200"} />
            <p className={`text-sm font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
              Aucun projet de flip pour l'instant.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-wider"
            >
              Créer votre premier projet
            </button>
          </div>
        )}

        {/* ── New/Edit project form ─────────────────────────────────────────── */}
        {showForm && (
          <div className={`p-5 rounded-[24px] border space-y-3 ${glass}`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest">
                {editingId ? "Modifier le projet" : "Nouveau projet de flip"}
              </p>
              <button onClick={resetForm} className="text-slate-400 hover:text-rose-500"><X size={16} /></button>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Adresse de la propriété</label>
              <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="123 Rue Exemple, Montréal" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Date d'achat</label>
                <input type="date" value={form.dateAchat} onChange={(e) => setForm({ ...form, dateAchat: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Prix d'achat ($)</label>
                <input type="number" value={form.prixAchat} onChange={(e) => setForm({ ...form, prixAchat: e.target.value })} placeholder="0.00" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Prix de revente estimé ($)</label>
                <input type="number" value={form.prixReventeEstime} onChange={(e) => setForm({ ...form, prixReventeEstime: e.target.value })} placeholder="0.00" className={inputCls} />
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between ${darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Coût d'acquisition (estimé)</p>
                <p className="text-[7px] font-medium text-slate-400 mt-0.5">Notaire, taxe de mutation, inspection, arpenteur, évaluation, frais de dossier — {(TAUX_COUT_ACQUISITION * 100).toFixed(0)}% du prix d'achat, calculé automatiquement</p>
              </div>
              <p className={`text-sm font-black shrink-0 ml-3 ${darkMode ? "text-zinc-100" : "text-slate-900"}`}>{fmtCAD((parseFloat(form.prixAchat) || 0) * TAUX_COUT_ACQUISITION)}</p>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Notes (optionnel)</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
            </div>
            <button
              onClick={handleSaveProject}
              disabled={isSaving}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider"
            >
              {isSaving ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Créer le projet"}
            </button>
          </div>
        )}

        {/* ── Project cards ──────────────────────────────────────────────────── */}
        {projects.map((p) => {
          const projectExp = projectExpensesFor(p.adresse);
          const projectExpTotal = projectExp.reduce((s, d) => s + (d.total || 0), 0);
          const prixRevente = p.statut === "vendu" ? (p.prixReventeReel || 0) : (p.prixReventeEstime || 0);
          const fraisDisposition = (p.fraisNotaireVente || 0) + (p.fraisCourtier || 0);
          const profit = prixRevente - p.prixAchat - (p.fraisAchat || 0) - projectExpTotal - fraisDisposition;
          const margeSurAchat = p.prixAchat > 0 ? (profit / p.prixAchat) * 100 : 0;
          const endDate = p.statut === "vendu" && p.dateRevente ? p.dateRevente : new Date().toISOString().slice(0, 10);
          const joursDetenus = daysBetween(p.dateAchat, endDate);
          const isAntiFlip = joursDetenus < 365;
          const profitable = profit >= 0;

          // ── Analyse avancée — approximations avant que le financement réel
          // (Phase 3) ne soit rempli : l'investissement cash suppose tout
          // payé comptant, à raffiner une fois banque/prêteur privé saisis.
          const coutPi2ParEtat = p.etatCondition === "mauvais" ? (p.coutPi2Mauvais ?? 120)
            : p.etatCondition === "gout_du_jour" ? (p.coutPi2GoutDuJour ?? 60)
            : (p.coutPi2Bon ?? 30);
          const quickRenoEstimate = (p.nombreEtages || 0) * (p.pi2ParEtage || 0) * coutPi2ParEtat;

          // ── Structure de financement — banque + prêteur privé, séparés pour
          // la mise de fonds et pour les rénovations (un flip combine souvent
          // les deux). Intérêt approximé sur la période de possession réelle,
          // sans amortissement (raisonnable pour quelques mois de détention).
          const coutRenovationReel = (p.renovationLineItems || []).reduce((s, it) => s + (it.coutReel ?? 0), 0) || quickRenoEstimate;
          const moisDetenus = joursDetenus / 30.44;
          const miseDeFondsTotal = p.prixAchat * (1 - (p.banqueFinancementPct || 0) / 100);
          const montantFinanceBanque = p.prixAchat * (p.banqueFinancementPct || 0) / 100;
          const interetBanque = montantFinanceBanque * (p.banqueTauxHypothecaire || 0) / 100 * (moisDetenus / 12);
          const miseDeFondsFinanceeParPreteur = miseDeFondsTotal * (p.preteurPriveMiseDeFondsPct || 0) / 100;
          const renosFinanceesParPreteur = coutRenovationReel * (p.preteurPriveRenosPct || 0) / 100;
          const interetPreteurPrive = (miseDeFondsFinanceeParPreteur + renosFinanceesParPreteur) * (p.preteurPriveTauxAnnuel || 0) / 100 * (moisDetenus / 12);
          const interetTotalReference = interetBanque + interetPreteurPrive;
          const hasFinancingData = p.banqueFinancementPct != null || p.preteurPriveMiseDeFondsPct != null;
          const investissementCashReel = hasFinancingData
            ? (miseDeFondsTotal - miseDeFondsFinanceeParPreteur) + (coutRenovationReel - renosFinanceesParPreteur) + (p.fraisAchat || 0)
            : p.prixAchat + (p.fraisAchat || 0);
          const roiAllCash = investissementCashReel > 0 ? (profit / investissementCashReel) * 100 : 0;

          // ── Profit potentiel — calculette de faisabilité complète, à partir
          // de coûts SAISIS À LA MAIN (pas de vraies dépenses requises) : sert
          // à évaluer un projet AVANT même de l'acheter. Distinct du "Profit"
          // ci-dessus, qui lui vient des vraies dépenses de Tenue de Livres. ──
          const coutsFixesMensuelTotal = (p.coutsFixesMensuels?.taxesMunicipales || 0)
            + (p.coutsFixesMensuels?.taxesScolaires || 0)
            + (p.coutsFixesMensuels?.electricite || 0)
            + (p.coutsFixesMensuels?.assurances || 0)
            + (p.coutsFixesMensuels?.deneigement || 0)
            + (p.coutsFixesMensuels?.fraisCondo || 0)
            + (p.coutsFixesMensuels?.entretien || 0)
            - (p.coutsFixesMensuels?.loyer || 0);
          const moisPotentiel = p.possessionMoisEstime || moisDetenus || 1;
          const coutsFixesPeriodeEstimes = coutsFixesMensuelTotal * moisPotentiel;
          const reventeEstimeePourFaisabilite = p.arv || p.prixReventeEstime || 0;
          const commissionEstimee = reventeEstimeePourFaisabilite * (p.commissionCourtierPctEstime || 0) / 100;
          const hasFeasibilityData = reventeEstimeePourFaisabilite > 0;
          const profitPotentiel = reventeEstimeePourFaisabilite
            - (p.prixAchat + (p.fraisAchat || 0))
            - coutRenovationReel
            - coutsFixesPeriodeEstimes
            - interetTotalReference
            - commissionEstimee;

          const isAnalysisOpen = expandedAnalysisId === p.id;

          return (
            <div key={p.id} className={`rounded-[24px] border overflow-hidden ${glass}`}>
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0 mt-0.5"><Home size={14} /></div>
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate">{p.adresse}</p>
                      <p className="text-[8.5px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                        Acheté le {new Date(p.dateAchat).toLocaleDateString("fr-CA")} · {joursDetenus} jours {p.statut === "vendu" ? "(détenus)" : "(en cours)"}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${p.statut === "vendu" ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500"}`}>
                    {p.statut === "vendu" ? "Vendu" : "En cours"}
                  </span>
                </div>

                {isAntiFlip && (
                  <div className={`flex items-start gap-2 p-3 rounded-xl border ${darkMode ? "bg-rose-500/10 border-rose-500/20" : "bg-rose-50 border-rose-200"}`} title="Approximation à 365 jours — la règle ARC a ses propres exceptions (décès, divorce, perte d'emploi...) qu'AutoCompt ne peut pas évaluer automatiquement.">
                    <AlertTriangle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[9.5px] font-bold text-rose-500 leading-relaxed">
                      Règle Anti-Flip (ARC) : détention {p.statut === "vendu" ? "de" : "estimée à"} moins de 12 mois — le profit serait imposé à 100% comme revenu d'entreprise, sans exemption résidence principale. Confirmez avec votre comptable.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className={`p-3 rounded-2xl border ${glass}`}>
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Acquisition (achat + frais)</p>
                    <p className="text-[13px] font-black mt-0.5">{fmtCAD(p.prixAchat + (p.fraisAchat || 0))}</p>
                  </div>
                  <div className={`p-3 rounded-2xl border ${glass}`}>
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Possession (réel)</p>
                    <p className="text-[13px] font-black mt-0.5">{fmtCAD(projectExpTotal)}</p>
                    <p className="text-[7px] font-bold text-slate-400 mt-0.5">{projectExp.length} dépense(s) liée(s) — rénov., taxes, assurances, intérêts...</p>
                  </div>
                  <div className={`p-3 rounded-2xl border ${glass}`}>
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">
                      Disposition — {p.statut === "vendu" ? "revente réelle" : "revente estimée"}
                    </p>
                    <p className="text-[13px] font-black mt-0.5">{fmtCAD(prixRevente)}</p>
                    {!!fraisDisposition && <p className="text-[7px] font-bold text-slate-400 mt-0.5">Net de {fmtCAD(fraisDisposition)} de frais (notaire + courtier)</p>}
                  </div>
                  <div className={`p-3 rounded-2xl border ${profitable ? "border-emerald-500/30" : "border-rose-500/30"} ${glass}`}>
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      {profitable ? <TrendingUp size={9} className="text-emerald-500" /> : <TrendingDown size={9} className="text-rose-500" />}
                      Profit {p.statut !== "vendu" && "(estimé)"}
                    </p>
                    <p className={`text-[13px] font-black mt-0.5 ${profitable ? "text-emerald-500" : "text-rose-500"}`}>
                      {fmtCAD(profit)} <span className="text-[9px] font-bold">({margeSurAchat.toFixed(1)}%)</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button onClick={() => { setExpenseProjectId(p.id); setExpenseForm(emptyExpenseForm); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all">
                    <Receipt size={11} /> + Dépense de possession
                  </button>
                  {p.statut !== "vendu" && (
                    <button onClick={() => { setSellingId(p.id); setSellForm(emptySellForm); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all">
                      <CheckCircle2 size={11} /> Marquer comme vendu
                    </button>
                  )}
                  <button onClick={() => handleEdit(p)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-400 hover:bg-slate-500 hover:text-white transition-all">
                    <Edit3 size={11} /> Modifier
                  </button>
                  <button onClick={() => handleDelete(p)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                    <Trash2 size={11} /> Supprimer
                  </button>
                  <button onClick={() => handleGeneratePdf(p)} disabled={generatingPdfId === p.id} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500 hover:text-white disabled:opacity-60 transition-all ml-auto">
                    {generatingPdfId === p.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} PDF
                  </button>
                  <button onClick={() => toggleAnalysis(p)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all">
                    <Calculator size={11} /> Analyse avancée {isAnalysisOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                </div>

                {/* Quick holding-cost expense form — reno, taxes, insurance, interest... */}
                {expenseProjectId === p.id && (
                  <div className={`p-4 rounded-2xl border space-y-2.5 ${darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                      Enregistré dans Tenue de Livres, lié à cette adresse
                    </p>
                    <StyledSelect darkMode={darkMode} value={expenseForm.cat} onChange={(v) => setExpenseForm({ ...expenseForm, cat: v })}
                      options={HOLDING_CATEGORIES.map((c) => ({ value: c, label: c }))} />
                    <div className="grid grid-cols-2 gap-2.5">
                      <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} className={inputCls} />
                      <input type="number" placeholder="Montant total ($)" value={expenseForm.montant} onChange={(e) => setExpenseForm({ ...expenseForm, montant: e.target.value })} className={inputCls} />
                    </div>
                    <input placeholder="Description (ex: Plomberie, Toiture...)" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className={inputCls} />
                    <div className="flex gap-2">
                      <button onClick={() => handleAddExpense(p)} className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider">
                        Enregistrer la dépense
                      </button>
                      <button onClick={() => setExpenseProjectId(null)} className="px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-800">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Mark-as-sold form */}
                {sellingId === p.id && (
                  <div className={`p-4 rounded-2xl border space-y-2.5 ${darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Prix de revente réel ($)</label>
                        <input type="number" value={sellForm.prixReventeReel} onChange={(e) => setSellForm({ ...sellForm, prixReventeReel: e.target.value })} className={inputCls} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Date de vente</label>
                        <input type="date" value={sellForm.dateRevente} onChange={(e) => setSellForm({ ...sellForm, dateRevente: e.target.value })} className={inputCls} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Frais de notaire (vente) ($)</label>
                        <input type="number" value={sellForm.fraisNotaireVente} onChange={(e) => setSellForm({ ...sellForm, fraisNotaireVente: e.target.value })} className={inputCls} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Commission du courtier ($)</label>
                        <input type="number" value={sellForm.fraisCourtier} onChange={(e) => setSellForm({ ...sellForm, fraisCourtier: e.target.value })} className={inputCls} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleMarkSold(p)} disabled={isSaving} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl text-[9px] font-black uppercase tracking-wider">
                        Confirmer la vente
                      </button>
                      <button onClick={() => setSellingId(null)} className="px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-800">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Analyse avancée — repliable, jamais requise pour l'usage courant */}
                {isAnalysisOpen && (
                  <div className={`p-4 rounded-2xl border space-y-4 ${darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center gap-2">
                      <Calculator size={13} className="text-amber-500" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">Analyse avancée — planification seulement, ne modifie jamais Tenue de Livres</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Valeur marchande rénovée (ARV) ($)</label>
                        <input type="number" value={analysisForm.arv} onChange={(e) => setAnalysisForm({ ...analysisForm, arv: e.target.value })} className={inputCls} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Nombre d'étages</label>
                        <input type="number" value={analysisForm.nombreEtages} onChange={(e) => setAnalysisForm({ ...analysisForm, nombreEtages: e.target.value })} className={inputCls} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Pi² par étage</label>
                        <input type="number" value={analysisForm.pi2ParEtage} onChange={(e) => setAnalysisForm({ ...analysisForm, pi2ParEtage: e.target.value })} className={inputCls} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">État de la propriété</label>
                      <div className={`flex p-1 rounded-full border ${darkMode ? "border-zinc-800 bg-zinc-900/30" : "border-slate-200 bg-white"}`}>
                        {([
                          { id: "bon", label: "Bon état" },
                          { id: "gout_du_jour", label: "Mis au goût du jour" },
                          { id: "mauvais", label: "Mauvais état" },
                        ] as const).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setAnalysisForm({ ...analysisForm, etatCondition: opt.id })}
                            className={`flex-1 py-1.5 rounded-full text-[7.5px] font-black uppercase tracking-wider transition-all ${analysisForm.etatCondition === opt.id ? "bg-amber-500 text-white" : darkMode ? "text-zinc-400" : "text-slate-500"}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[7px] font-bold uppercase tracking-widest text-slate-400">$/pi² — bon état</label>
                        <input type="number" value={analysisForm.coutPi2Bon} onChange={(e) => setAnalysisForm({ ...analysisForm, coutPi2Bon: e.target.value })} className={inputCls} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] font-bold uppercase tracking-widest text-slate-400">$/pi² — goût du jour</label>
                        <input type="number" value={analysisForm.coutPi2GoutDuJour} onChange={(e) => setAnalysisForm({ ...analysisForm, coutPi2GoutDuJour: e.target.value })} className={inputCls} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] font-bold uppercase tracking-widest text-slate-400">$/pi² — mauvais état</label>
                        <input type="number" value={analysisForm.coutPi2Mauvais} onChange={(e) => setAnalysisForm({ ...analysisForm, coutPi2Mauvais: e.target.value })} className={inputCls} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className={`p-3 rounded-2xl border ${glass}`}>
                        <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Estimation rapide de rénovation</p>
                        <p className="text-[13px] font-black mt-0.5">{fmtCAD(quickRenoEstimate)}</p>
                        <p className="text-[7px] font-bold text-slate-400 mt-0.5">Référence — voir le budget détaillé si besoin</p>
                      </div>
                      <div className={`p-3 rounded-2xl border ${roiAllCash >= 0 ? "border-emerald-500/30" : "border-rose-500/30"} ${glass}`}>
                        <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><Percent size={9} /> ROI All Cash</p>
                        <p className={`text-[13px] font-black mt-0.5 ${roiAllCash >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{roiAllCash.toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* Budget de rénovation détaillé — jusqu'à 3 soumissions par poste */}
                    <div className="space-y-2 pt-3 border-t border-dashed border-slate-200 dark:border-zinc-800">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Budget de rénovation détaillé — jamais écrit dans Tenue de Livres</p>
                      {analysisForm.renovationLineItems.length > 0 && (
                        <div className="space-y-2">
                          {analysisForm.renovationLineItems.map((it) => (
                            <div key={it.id} className={`p-2.5 rounded-xl border space-y-1.5 ${glass}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[9px] font-black uppercase tracking-wider truncate">{it.categorie}</span>
                                <button onClick={() => removeRenovationItem(it.id)} className="text-slate-400 hover:text-rose-500 shrink-0"><X size={12} /></button>
                              </div>
                              <div className="grid grid-cols-4 gap-1.5">
                                {(["soumission1", "soumission2", "soumission3"] as const).map((key, i) => (
                                  <div key={key} className="space-y-0.5">
                                    <label className="text-[6.5px] font-bold uppercase tracking-wider text-slate-400">Soum. {i + 1}</label>
                                    <input
                                      type="number"
                                      value={it[key] ?? ""}
                                      onChange={(e) => updateRenovationItem(it.id, { [key]: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0 })}
                                      className={inputClsSm}
                                    />
                                  </div>
                                ))}
                                <div className="space-y-0.5">
                                  <label className="text-[6.5px] font-bold uppercase tracking-wider text-amber-500">Coût réel</label>
                                  <input
                                    type="number"
                                    value={it.coutReel ?? ""}
                                    onChange={(e) => updateRenovationItem(it.id, { coutReel: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0 })}
                                    className={`${inputClsSm} border-amber-400`}
                                  />
                                </div>
                              </div>
                              {it.coutReel == null && (it.soumission1 != null || it.soumission2 != null || it.soumission3 != null) && (
                                <div className="flex gap-2 flex-wrap">
                                  {([["soumission1", it.soumission1], ["soumission2", it.soumission2], ["soumission3", it.soumission3]] as const).map(([key, val]) => val != null && (
                                    <button key={key} type="button" onClick={() => updateRenovationItem(it.id, { coutReel: val })} className="text-[7px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-600">
                                      ↳ Utiliser {fmtCAD(val)}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {RENOVATION_CATEGORIES.filter((c) => !analysisForm.renovationLineItems.some((it) => it.categorie === c)).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => addRenovationCategory(c)}
                            className={`px-2 py-1 rounded-lg text-[7px] font-bold uppercase tracking-wider border transition-all ${darkMode ? "border-zinc-700 text-zinc-400 hover:bg-zinc-800" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                          >
                            + {c}
                          </button>
                        ))}
                      </div>
                      {analysisForm.renovationLineItems.length > 0 && (
                        <div className={`p-3 rounded-2xl border ${glass} flex items-center justify-between`}>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total budget rénovation (coûts réels)</span>
                          <span className="text-[13px] font-black text-amber-600">
                            {fmtCAD(analysisForm.renovationLineItems.reduce((s, it) => s + (it.coutReel ?? 0), 0))}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Structure de financement */}
                    <div className="space-y-2 pt-3 border-t border-dashed border-slate-200 dark:border-zinc-800">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Structure de financement — référence pour compléter les dépenses de possession à la main</p>
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[7px] font-bold uppercase tracking-widest text-slate-400">% financé par la banque</label>
                          <input type="number" value={analysisForm.banqueFinancementPct} onChange={(e) => setAnalysisForm({ ...analysisForm, banqueFinancementPct: e.target.value })} className={inputClsSm} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Taux hypothécaire (%)</label>
                          <input type="number" value={analysisForm.banqueTauxHypothecaire} onChange={(e) => setAnalysisForm({ ...analysisForm, banqueTauxHypothecaire: e.target.value })} className={inputClsSm} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Amortissement (ans)</label>
                          <input type="number" value={analysisForm.banqueAmortissementAns} onChange={(e) => setAnalysisForm({ ...analysisForm, banqueAmortissementAns: e.target.value })} className={inputClsSm} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] font-bold uppercase tracking-widest text-slate-400">% mise de fonds — prêteur privé</label>
                          <input type="number" value={analysisForm.preteurPriveMiseDeFondsPct} onChange={(e) => setAnalysisForm({ ...analysisForm, preteurPriveMiseDeFondsPct: e.target.value })} className={inputClsSm} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] font-bold uppercase tracking-widest text-slate-400">% rénos — prêteur privé</label>
                          <input type="number" value={analysisForm.preteurPriveRenosPct} onChange={(e) => setAnalysisForm({ ...analysisForm, preteurPriveRenosPct: e.target.value })} className={inputClsSm} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Taux annuel prêteur privé (%)</label>
                          <input type="number" value={analysisForm.preteurPriveTauxAnnuel} onChange={(e) => setAnalysisForm({ ...analysisForm, preteurPriveTauxAnnuel: e.target.value })} className={inputClsSm} />
                        </div>
                      </div>
                      {hasFinancingData && (
                        <div className={`p-3 rounded-2xl border ${glass} flex items-center justify-between`}>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Intérêt de référence — banque + prêteur privé ({moisDetenus.toFixed(1)} mois)</span>
                          <span className="text-[13px] font-black text-amber-600">{fmtCAD(interetTotalReference)}</span>
                        </div>
                      )}
                    </div>

                    {/* Associés */}
                    <div className="space-y-2 pt-3 border-t border-dashed border-slate-200 dark:border-zinc-800">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><Users size={10} /> Associés — répartition du profit selon l'apport</p>
                      {analysisForm.associes.length > 0 && (
                        <div className="space-y-1.5">
                          {analysisForm.associes.map((a, i) => {
                            const totalApports = analysisForm.associes.reduce((s, x) => s + x.apport, 0);
                            const pct = totalApports > 0 ? (a.apport / totalApports) * 100 : 0;
                            return (
                              <div key={i} className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${glass}`}>
                                <div className="min-w-0">
                                  <p className="text-[9px] font-black truncate">{a.nom}</p>
                                  <p className="text-[7.5px] font-bold text-slate-400">Apport {fmtCAD(a.apport)} · {pct.toFixed(1)}% · profit {fmtCAD(profit * pct / 100)}</p>
                                </div>
                                <button onClick={() => removeAssocie(i)} className="text-slate-400 hover:text-rose-500 shrink-0"><X size={12} /></button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input placeholder="Nom" value={associeDraft.nom} onChange={(e) => setAssocieDraft({ ...associeDraft, nom: e.target.value })} className={`${inputClsSm} flex-1`} />
                        <input type="number" placeholder="Apport ($)" value={associeDraft.apport} onChange={(e) => setAssocieDraft({ ...associeDraft, apport: e.target.value })} className={`${inputClsSm} w-28`} />
                        <button type="button" onClick={addAssocie} className="px-3 rounded-lg text-[8px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shrink-0">
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Coûts fixes de possession — estimation rapide, saisie à la main */}
                    <div className="space-y-2 pt-3 border-t border-dashed border-slate-200 dark:border-zinc-800">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Coûts fixes de possession — montants MENSUELS, pour évaluer la rentabilité avant même d'acheter</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Durée de possession estimée (mois)</label>
                          <input type="number" value={analysisForm.possessionMoisEstime} onChange={(e) => setAnalysisForm({ ...analysisForm, possessionMoisEstime: e.target.value })} placeholder={joursDetenus > 0 ? `${(joursDetenus / 30.44).toFixed(1)} (réel)` : ""} className={inputClsSm} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] font-bold uppercase tracking-widest text-slate-400">% commission courtier estimée (revente)</label>
                          <input type="number" value={analysisForm.commissionCourtierPctEstime} onChange={(e) => setAnalysisForm({ ...analysisForm, commissionCourtierPctEstime: e.target.value })} className={inputClsSm} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {COUTS_FIXES_LABELS.map(({ key, label }) => (
                          <div key={key} className="space-y-1">
                            <label className="text-[6.5px] font-bold uppercase tracking-wider text-slate-400">{label} ($/mois)</label>
                            <input
                              type="number"
                              value={analysisForm.coutsFixesMensuels[key]}
                              onChange={(e) => setAnalysisForm({ ...analysisForm, coutsFixesMensuels: { ...analysisForm.coutsFixesMensuels, [key]: e.target.value } })}
                              className={inputClsSm}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Profit potentiel — résultat final de la calculette de faisabilité */}
                    {hasFeasibilityData && (
                      <div className={`p-4 rounded-2xl border-2 ${profitPotentiel >= 0 ? "border-emerald-500/40" : "border-rose-500/40"} ${glass}`}>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                          {profitPotentiel >= 0 ? <TrendingUp size={10} className="text-emerald-500" /> : <TrendingDown size={10} className="text-rose-500" />}
                          Profit potentiel — ARV/revente estimée moins tous les coûts saisis ci-dessus
                        </p>
                        <p className={`text-[22px] font-black mt-1 ${profitPotentiel >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                          {fmtCAD(profitPotentiel)}
                        </p>
                        <p className="text-[7.5px] font-bold text-slate-400 mt-1">
                          Sur {moisPotentiel.toFixed(1)} mois de possession — {reventeEstimeePourFaisabilite === (p.arv || 0) ? "ARV" : "prix de revente estimé"} {fmtCAD(reventeEstimeePourFaisabilite)}, rénovation {fmtCAD(coutRenovationReel)}, coûts fixes {fmtCAD(coutsFixesPeriodeEstimes)}, intérêts {fmtCAD(interetTotalReference)}, commission estimée {fmtCAD(commissionEstimee)}.
                        </p>
                      </div>
                    )}

                    <button onClick={() => handleSaveAnalysis(p)} disabled={savingAnalysis} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                      {savingAnalysis ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Enregistrer l'analyse
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default FlipCalculatorView;
