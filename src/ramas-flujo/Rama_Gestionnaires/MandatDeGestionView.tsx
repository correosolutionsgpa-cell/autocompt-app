/**
 * MandatDeGestionView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Gestionnaires
 * Module: Mandat de Gestion Immobilière — Conforme OACIQ 2024
 *
 * Génère le contrat de mandat de gestion conforme à :
 *   • Loi sur le courtage immobilier (RLRQ, c C-73.2), art. 95-99
 *   • Règlement sur les conditions d'exercice d'une opération de courtage
 *   • OACIQ — Formulaire obligatoire de mandat de gestion 2024
 *
 * Le gestionnaire remplit les champs du formulaire, génère un PDF signable
 * et l'envoie au propriétaire-client via le flow DocuLegal existant.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  Scale,
  FileText,
  Download,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  Building2,
  User,
  Percent,
  Calendar,
  ChevronDown,
  ChevronRight,
  Info,
  Menu,
} from "lucide-react";
import { db, auth } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ProprieteMandat {
  adresse: string;
  ville: string;
  codePostal: string;
  typePropriete: string;
  nbLogements: string;
  descriptionLogements: string;
}

interface MandatFormData {
  // Parties
  gestionnaireName: string;
  gestionnairePermis: string;
  gestionnaireAdresse: string;
  gestionnaireTel: string;
  gestionnaireEmail: string;
  gestionnaireAgence: string;

  proprietaireName: string;
  proprietaireAdresse: string;
  proprietaireTel: string;
  proprietaireEmail: string;
  proprietaireNAS?: string; // Optional — for tax purposes

  // Propriétés
  proprietes: ProprieteMandat[];

  // Durée
  dateDebut: string;
  dateFin: string;
  reconductionTacite: boolean;
  preavisResiliation: string; // days

  // Honoraires
  tauxHonoraires: string;
  baseCalcul: "loyer_brut" | "loyer_net" | "montant_fixe";
  montantFixe: string;
  periodiciteFacturation: "mensuelle" | "trimestrielle";

  // Compte en fidéicommis
  banqueFideicommis: string;
  noCompteFideicommis: string;

  // Pouvoirs du gestionnaire
  pouvoirLouer: boolean;
  pouvoirNegocierBaux: boolean;
  pouvoirSignerBaux: boolean;
  pouvoirSigner3ans: boolean; // baux > 3 ans require owner consent
  pouvoirPercevoirLoyers: boolean;
  pouvoirPayerDepenses: boolean;
  pouvoirRepairationsUrgentes: boolean;
  montantMaxReparation: string;
  pouvoirPoursuivre: boolean;
  pouvoirEngagerPersonnel: boolean;

  // Obligations
  releve_mensuel: boolean;
  conciliation_mensuelle: boolean;
  assurance_gestionnaire: boolean;
  numPoliceAssurance: string;

  // Clauses spéciales
  clausesSpeciales: string;
}

const defaultPropriete = (): ProprieteMandat => ({
  adresse: "",
  ville: "Montréal",
  codePostal: "",
  typePropriete: "Immeuble à revenus",
  nbLogements: "",
  descriptionLogements: "",
});

const defaultForm = (gestionnaireName: string, gestionnaireEmail: string): MandatFormData => ({
  gestionnaireName,
  gestionnairePermis: "",
  gestionnaireAdresse: "",
  gestionnaireTel: "",
  gestionnaireEmail,
  gestionnaireAgence: "",
  proprietaireName: "",
  proprietaireAdresse: "",
  proprietaireTel: "",
  proprietaireEmail: "",
  proprietes: [defaultPropriete()],
  dateDebut: new Date().toISOString().split("T")[0],
  dateFin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  reconductionTacite: true,
  preavisResiliation: "60",
  tauxHonoraires: "8",
  baseCalcul: "loyer_brut",
  montantFixe: "",
  periodiciteFacturation: "mensuelle",
  banqueFideicommis: "",
  noCompteFideicommis: "",
  pouvoirLouer: true,
  pouvoirNegocierBaux: true,
  pouvoirSignerBaux: true,
  pouvoirSigner3ans: false,
  pouvoirPercevoirLoyers: true,
  pouvoirPayerDepenses: true,
  pouvoirRepairationsUrgentes: true,
  montantMaxReparation: "500",
  pouvoirPoursuivre: false,
  pouvoirEngagerPersonnel: true,
  releve_mensuel: true,
  conciliation_mensuelle: true,
  assurance_gestionnaire: true,
  numPoliceAssurance: "",
  clausesSpeciales: "",
});

// ─────────────────────────────────────────────────────────────────────────────
// PDF Generation — Mandat de Gestion OACIQ
// ─────────────────────────────────────────────────────────────────────────────
function generateMandatPDF(form: MandatFormData): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 18; // margin
  const TW = W - M * 2; // text width
  const indigo: [number, number, number] = [99, 102, 241];
  const darkGray: [number, number, number] = [30, 30, 30];
  const gray: [number, number, number] = [100, 100, 100];
  const lightGray: [number, number, number] = [240, 240, 247];

  let y = 0;

  const nextPage = () => {
    pdf.addPage();
    y = 18;
    // Header on new pages
    pdf.setFillColor(...indigo);
    pdf.rect(0, 0, W, 8, "F");
    pdf.setFontSize(6);
    pdf.setTextColor(200, 200, 255);
    pdf.setFont("helvetica", "bold");
    pdf.text("MANDAT DE GESTION IMMOBILIÈRE — CONFORME OACIQ", M, 5.5);
    pdf.text(`${form.gestionnaireName} / ${form.proprietaireName}`, W - M, 5.5, { align: "right" });
  };

  const checkY = (needed: number = 12) => {
    if (y + needed > 270) nextPage();
  };

  const sectionHeader = (title: string) => {
    checkY(14);
    pdf.setFillColor(...lightGray);
    pdf.rect(M, y, TW, 8, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...indigo);
    pdf.text(title.toUpperCase(), M + 3, y + 5.5);
    y += 12;
  };

  const fieldRow = (label: string, value: string, halfWidth = false) => {
    checkY(10);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...gray);
    pdf.text(label.toUpperCase(), M, y);
    pdf.setFontSize(9.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...darkGray);
    const maxW = halfWidth ? TW / 2 - 5 : TW;
    const lines = pdf.splitTextToSize(value || "—", maxW);
    pdf.text(lines, M, y + 5);
    y += 6 + (lines.length - 1) * 5;
    // underline
    pdf.setDrawColor(200, 200, 220);
    pdf.line(M, y, M + (halfWidth ? TW / 2 - 5 : TW), y);
    y += 5;
  };

  const checkbox = (label: string, checked: boolean, indent = 0) => {
    checkY(7);
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...darkGray);
    pdf.rect(M + indent, y - 3.5, 3.5, 3.5);
    if (checked) {
      pdf.setFont("helvetica", "bold");
      pdf.text("✓", M + indent + 0.3, y - 0.5);
    }
    pdf.setFont("helvetica", "normal");
    pdf.text(label, M + indent + 5.5, y - 0.2);
    y += 6;
  };

  const bodyText = (text: string, bold = false) => {
    checkY(10);
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setTextColor(...darkGray);
    const lines = pdf.splitTextToSize(text, TW);
    lines.forEach((line: string) => {
      checkY(5);
      pdf.text(line, M, y);
      y += 5;
    });
  };

  // ── COVER ──────────────────────────────────────────────────────────────────
  pdf.setFillColor(...indigo);
  pdf.rect(0, 0, W, 58, "F");

  // Badge OACIQ
  pdf.setFillColor(255, 255, 255, 20);
  pdf.roundedRect(W - 54, 6, 36, 10, 2, 2, "F");
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(200, 210, 255);
  pdf.text("CONFORME OACIQ 2024", W - 36, 12.5, { align: "center" });

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.text("LOI SUR LE COURTAGE IMMOBILIER — RLRQ, c C-73.2, art. 95-99", M, 14);

  pdf.setFontSize(22);
  pdf.text("MANDAT DE GESTION", M, 30);
  pdf.setFontSize(14);
  pdf.text("IMMOBILIÈRE", M, 40);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(180, 190, 255);
  pdf.text(`Entre : ${form.gestionnaireName} (Gestionnaire)`, M, 50);
  pdf.text(`Et : ${form.proprietaireName || "[Propriétaire]"} (Mandant)`, M, 55);

  y = 70;

  // ── PARTIES ────────────────────────────────────────────────────────────────
  sectionHeader("Article 1 — Identification des parties");

  bodyText("1.1  LE GESTIONNAIRE (Mandataire)", true);
  fieldRow("Nom ou raison sociale", form.gestionnaireName);
  fieldRow("Numéro de permis OACIQ", form.gestionnairePermis);
  fieldRow("Agence immobilière", form.gestionnaireAgence);
  fieldRow("Adresse", form.gestionnaireAdresse);
  fieldRow("Téléphone", form.gestionnaireTel);
  fieldRow("Courriel", form.gestionnaireEmail);

  y += 4;
  bodyText("1.2  LE PROPRIÉTAIRE (Mandant)", true);
  fieldRow("Nom complet", form.proprietaireName);
  fieldRow("Adresse", form.proprietaireAdresse);
  fieldRow("Téléphone", form.proprietaireTel);
  fieldRow("Courriel", form.proprietaireEmail);

  // ── PROPRIÉTÉS ──────────────────────────────────────────────────────────────
  sectionHeader("Article 2 — Propriétés visées par le mandat");

  form.proprietes.forEach((p, i) => {
    checkY(30);
    bodyText(`Propriété ${i + 1}`, true);
    fieldRow("Adresse civique", `${p.adresse}, ${p.ville} (${p.codePostal})`);
    fieldRow("Type de propriété", p.typePropriete);
    fieldRow("Nombre de logements", p.nbLogements);
    if (p.descriptionLogements) fieldRow("Description", p.descriptionLogements);
    y += 3;
  });

  // ── DURÉE ──────────────────────────────────────────────────────────────────
  sectionHeader("Article 3 — Durée du mandat");

  const fmtDate = (d: string) => {
    try { return new Date(d + "T12:00:00").toLocaleDateString("fr-CA", { dateStyle: "long" }); }
    catch { return d; }
  };

  fieldRow("Date d'entrée en vigueur", fmtDate(form.dateDebut));
  fieldRow("Date d'échéance", fmtDate(form.dateFin));

  checkY(8);
  checkbox(`Reconduction tacite après l'échéance`, form.reconductionTacite);
  if (form.reconductionTacite) {
    bodyText(`En l'absence d'un avis de résiliation envoyé par courrier recommandé au moins ${form.preavisResiliation} jours avant l'échéance, le présent mandat sera automatiquement reconduit pour une période équivalente.`);
  }

  // ── HONORAIRES ─────────────────────────────────────────────────────────────
  sectionHeader("Article 4 — Honoraires de gestion");

  const baseLabel = form.baseCalcul === "loyer_brut"
    ? "du loyer brut mensuel"
    : form.baseCalcul === "loyer_net"
    ? "du loyer net mensuel (déduction faite des charges)"
    : "montant fixe mensuel";

  if (form.baseCalcul !== "montant_fixe") {
    fieldRow("Taux d'honoraires", `${form.tauxHonoraires}% ${baseLabel}`);
  } else {
    fieldRow("Montant fixe mensuel", `${form.montantFixe} $`);
  }
  fieldRow("Périodicité de facturation", form.periodiciteFacturation === "mensuelle" ? "Mensuelle" : "Trimestrielle");

  bodyText("Les honoraires seront prélevés directement du compte en fidéicommis après la réception des loyers et avant toute remise au Mandant, conformément à l'article 97 de la Loi sur le courtage immobilier.");

  // ── COMPTE EN FIDÉICOMMIS ──────────────────────────────────────────────────
  sectionHeader("Article 5 — Compte en fidéicommis (obligatoire OACIQ)");

  bodyText("Le Gestionnaire s'engage à déposer immédiatement et intégralement dans un compte en fidéicommis distinct de ses fonds personnels et de ses fonds d'exploitation toutes les sommes reçues pour le compte du Mandant, conformément à l'article 95 de la Loi sur le courtage immobilier.");

  fieldRow("Institution financière", form.banqueFideicommis);
  fieldRow("Numéro de compte en fidéicommis", form.noCompteFideicommis);

  bodyText("Une conciliation bancaire mensuelle du compte en fidéicommis sera effectuée et conservée au dossier.");

  // ── POUVOIRS DU GESTIONNAIRE ────────────────────────────────────────────────
  sectionHeader("Article 6 — Pouvoirs conférés au Gestionnaire");

  bodyText("Le Mandant confère au Gestionnaire les pouvoirs suivants :");
  y += 2;
  checkbox("Louer les logements vacants et présenter les locataires", form.pouvoirLouer);
  checkbox("Négocier les baux et les renouvellements", form.pouvoirNegocierBaux);
  checkbox("Signer les baux d'une durée inférieure ou égale à un (1) an", form.pouvoirSignerBaux);
  checkbox("Signer les baux d'une durée supérieure à un (1) an (requiert l'accord écrit du Mandant)", form.pouvoirSigner3ans);
  checkbox("Percevoir les loyers et tous autres montants dus par les locataires", form.pouvoirPercevoirLoyers);
  checkbox("Payer les dépenses courantes d'exploitation de l'immeuble", form.pouvoirPayerDepenses);
  checkbox(
    `Autoriser et payer les réparations urgentes jusqu'à concurrence de ${form.montantMaxReparation} $ par intervention sans autorisation préalable`,
    form.pouvoirRepairationsUrgentes
  );
  checkbox("Intenter des procédures judiciaires pour non-paiement de loyer ou reprise de logement", form.pouvoirPoursuivre);
  checkbox("Engager et congédier le personnel d'entretien de l'immeuble", form.pouvoirEngagerPersonnel);

  // ── OBLIGATIONS DU GESTIONNAIRE ────────────────────────────────────────────
  sectionHeader("Article 7 — Obligations du Gestionnaire");

  bodyText("En plus des obligations prévues par la Loi et les règlements applicables, le Gestionnaire s'engage à :");
  y += 2;
  checkbox("Remettre au Mandant un relevé mensuel détaillé (loyers perçus, dépenses, honoraires, solde net remis)", form.releve_mensuel);
  checkbox("Effectuer mensuellement la conciliation du compte en fidéicommis et conserver les registres pendant 6 ans", form.conciliation_mensuelle);
  checkbox(`Maintenir une assurance responsabilité professionnelle en vigueur (police n° ${form.numPoliceAssurance || "—"})`, form.assurance_gestionnaire);

  bodyText("Le Gestionnaire doit agir conformément aux règles de l'OACIQ et aux lois applicables, notamment : la Loi sur le courtage immobilier, le Code civil du Québec, la Loi visant à améliorer les rapports entre propriétaires et locataires (L.Q. 2024) et la Charte des droits et libertés de la personne.");

  // ── OBLIGATIONS DU MANDANT ─────────────────────────────────────────────────
  sectionHeader("Article 8 — Obligations du Mandant");

  bodyText("Le Mandant s'engage à :");
  y += 2;
  bodyText("• Ne pas intervenir directement dans la gestion courante de l'immeuble ni communiquer directement avec les locataires sur les questions relevant du Gestionnaire ;");
  bodyText("• Informer le Gestionnaire de toute modification affectant les propriétés (travaux majeurs, vente, hypothèque) ;");
  bodyText("• Maintenir l'immeuble en bon état et souscrire une assurance habitation adéquate ;");
  bodyText("• Rembourser le Gestionnaire de toutes les dépenses dûment autorisées et payées en son nom dans les 30 jours suivant la réception du relevé mensuel.");

  // ── RÉSILIATION ────────────────────────────────────────────────────────────
  sectionHeader("Article 9 — Résiliation du mandat");

  bodyText(`Chacune des parties peut résilier le présent mandat en donnant un préavis écrit d'au moins ${form.preavisResiliation} jours à l'autre partie, par courrier recommandé ou par voie électronique avec accusé de réception.`);
  bodyText("En cas de résiliation, le Gestionnaire doit :");
  bodyText("(a) remettre au Mandant tous les fonds détenus en fidéicommis dans les 5 jours ouvrables ;");
  bodyText("(b) transmettre un relevé final complet de toutes les opérations effectuées ;");
  bodyText("(c) remettre tous les documents relatifs à l'immeuble et aux locataires.");

  // ── CONFIDENTIALITÉ ET PROTECTION DES RENSEIGNEMENTS ──────────────────────
  sectionHeader("Article 10 — Confidentialité et protection des renseignements personnels");

  bodyText("Les parties s'engagent à protéger les renseignements personnels conformément à la Loi sur la protection des renseignements personnels dans le secteur privé (RLRQ, c P-39.1) et aux lignes directrices de la Commission d'accès à l'information du Québec.");

  // ── CLAUSES SPÉCIALES ─────────────────────────────────────────────────────
  if (form.clausesSpeciales.trim()) {
    sectionHeader("Article 11 — Clauses particulières");
    bodyText(form.clausesSpeciales);
  }

  // ── DÉCLARATIONS ─────────────────────────────────────────────────────────
  sectionHeader(`Article ${form.clausesSpeciales.trim() ? 12 : 11} — Déclarations des parties`);

  bodyText("Les parties déclarent avoir lu et compris le présent mandat dans son intégralité. Le Mandant déclare être propriétaire des immeubles mentionnés à l'Article 2 ou avoir l'autorisation de leurs propriétaires pour conclure le présent mandat.");
  bodyText("Le Gestionnaire déclare détenir un permis en règle délivré par l'OACIQ et agir à titre de courtier immobilier agréé, conformément à la Loi sur le courtage immobilier.");

  // ── SIGNATURES ─────────────────────────────────────────────────────────────
  nextPage();
  sectionHeader("Signatures");

  const fmtNow = new Date().toLocaleDateString("fr-CA", { dateStyle: "long" });

  bodyText(`Signé électroniquement à ${form.gestionnaireAdresse.split(",")[0] || "Québec"}, le ${fmtNow}.`);
  y += 8;

  // Gestionnaire signature block
  pdf.setFillColor(248, 248, 255);
  pdf.roundedRect(M, y, TW / 2 - 5, 38, 3, 3, "F");
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...gray);
  pdf.text("LE GESTIONNAIRE — MANDATAIRE", M + 4, y + 7);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...darkGray);
  pdf.text(form.gestionnaireName, M + 4, y + 15);
  pdf.text(`Permis OACIQ : ${form.gestionnairePermis || "—"}`, M + 4, y + 21);
  pdf.setFontSize(6);
  pdf.setTextColor(150, 150, 150);
  pdf.text("Signature électronique", M + 4, y + 30);
  pdf.setDrawColor(...indigo);
  pdf.line(M + 4, y + 36, M + TW / 2 - 10, y + 36);

  // Propriétaire signature block
  const rightX = M + TW / 2 + 5;
  pdf.setFillColor(248, 248, 255);
  pdf.roundedRect(rightX, y, TW / 2 - 5, 38, 3, 3, "F");
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...gray);
  pdf.text("LE PROPRIÉTAIRE — MANDANT", rightX + 4, y + 7);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...darkGray);
  pdf.text(form.proprietaireName || "[Nom du propriétaire]", rightX + 4, y + 15);
  pdf.text(form.proprietaireEmail || "—", rightX + 4, y + 21);
  pdf.setFontSize(6);
  pdf.setTextColor(150, 150, 150);
  pdf.text("Signature électronique", rightX + 4, y + 30);
  pdf.setDrawColor(...indigo);
  pdf.line(rightX + 4, y + 36, W - M - 5, y + 36);

  y += 45;

  // OACIQ notice
  pdf.setFillColor(230, 235, 255);
  pdf.roundedRect(M, y, TW, 22, 3, 3, "F");
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...indigo);
  pdf.text("AVIS JURIDIQUE IMPORTANT", M + 4, y + 6);
  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(60, 60, 120);
  const notice = "Ce mandat de gestion est conforme aux exigences de l'OACIQ et de la Loi sur le courtage immobilier (RLRQ, c C-73.2). La signature électronique apposée sur ce document constitue une signature légalement valide en vertu de la Loi concernant le cadre juridique des technologies de l'information (LCCJTI, RLRQ, c C-1.1) et du Code civil du Québec, art. 2827. Ce document est généré et conservé par AutoCompt à titre de preuve documentaire.";
  const noticeLines = pdf.splitTextToSize(notice, TW - 8);
  noticeLines.forEach((line: string, i: number) => {
    pdf.text(line, M + 4, y + 12 + i * 3.8);
  });

  // Footer on all pages
  const pageCount = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFillColor(245, 245, 252);
    pdf.rect(0, 280, W, 17, "F");
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(150, 150, 170);
    pdf.text(
      `Mandat de Gestion Immobilière · ${form.gestionnaireName} / ${form.proprietaireName} · Généré par AutoCompt · Page ${i} de ${pageCount}`,
      W / 2, 287, { align: "center" }
    );
    pdf.text("OACIQ — Loi sur le courtage immobilier (RLRQ, c C-73.2)", W / 2, 292, { align: "center" });
  }

  return pdf;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
export interface MandatDeGestionViewProps {
  darkMode: boolean;
  activeCompanyId: string;
  currentCompany: any;
  adminName: string;
  adminEmail: string;
  setVista: (v: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  WorkspaceSidebar: React.ComponentType;
  playNotificationSound?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const MandatDeGestionView: React.FC<MandatDeGestionViewProps> = ({
  darkMode,
  activeCompanyId,
  currentCompany,
  adminName,
  adminEmail,
  setVista,
  setIsSidebarOpen,
  WorkspaceSidebar,
  playNotificationSound,
}) => {
  const [form, setForm] = useState<MandatFormData>(() =>
    defaultForm(adminName, adminEmail)
  );

  // Steps: form | preview | send
  const [step, setStep] = useState<"form" | "preview" | "send">("form");
  const [isSending, setIsSending] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    parties: true,
    proprietes: true,
    duree: false,
    honoraires: false,
    fideicommis: false,
    pouvoirs: false,
    obligations: false,
    clauses: false,
  });

  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const f = useCallback(<K extends keyof MandatFormData>(key: K, value: MandatFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const updatePropriete = (idx: number, field: keyof ProprieteMandat, value: string) => {
    setForm(prev => {
      const next = [...prev.proprietes];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, proprietes: next };
    });
  };

  const addPropriete = () =>
    setForm(prev => ({ ...prev, proprietes: [...prev.proprietes, defaultPropriete()] }));

  const removePropriete = (idx: number) =>
    setForm(prev => ({ ...prev, proprietes: prev.proprietes.filter((_, i) => i !== idx) }));

  const handleDownload = () => {
    const pdf = generateMandatPDF(form);
    const safeName = form.proprietaireName.replace(/\s+/g, "-") || "Proprietaire";
    pdf.save(`Mandat-Gestion-${safeName}.pdf`);
    playNotificationSound?.();
  };

  const handleSendForSignature = async () => {
    const email = sendEmail || form.proprietaireEmail;
    if (!email) return;
    setIsSending(true);
    try {
      const pdf = generateMandatPDF(form);
      const pdfBase64 = pdf.output("datauristring").split(",")[1];

      // Save record to Firestore
      const uid = auth.currentUser?.uid;
      if (uid) {
        const id = `${uid}_mandat_${Date.now()}`;
        await setDoc(doc(db, "mandatsGestion", id), {
          id,
          companyId: activeCompanyId,
          proprietaireName: form.proprietaireName,
          proprietaireEmail: email,
          gestionnaireName: form.gestionnaireName,
          dateDebut: form.dateDebut,
          dateFin: form.dateFin,
          tauxHonoraires: form.tauxHonoraires,
          statut: "envoyé",
          ownerId: uid,
          createdAt: new Date().toISOString(),
        });
      }

      // Send via API
      await fetch("/api/send-mandat-gestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          proprietaireName: form.proprietaireName,
          gestionnaireName: form.gestionnaireName,
          companyName: currentCompany?.nombre,
          adminEmail,
          dateDebut: form.dateDebut,
          dateFin: form.dateFin,
          pdfBase64,
        }),
      });

      setSent(true);
      playNotificationSound?.();
    } catch (e) {
      console.error("[mandat] send error:", e);
    } finally {
      setIsSending(false);
    }
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const glass = darkMode
    ? "bg-slate-900/40 border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)]"
    : "bg-white border-slate-200";

  const inputCls = `w-full px-4 py-3 rounded-2xl border text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"}`;

  const labelCls = `block text-[9px] font-black uppercase tracking-widest mb-1.5 ${darkMode ? "text-zinc-500" : "text-slate-400"}`;

  const SectionToggle = ({ id, title, icon }: { id: string; title: string; icon: React.ReactNode }) => (
    <button
      onClick={() => toggleSection(id)}
      className={`w-full flex items-center justify-between px-5 py-4 rounded-[24px] border text-left ${glass} transition-all`}
    >
      <div className="flex items-center gap-3">
        <div className="text-indigo-500">{icon}</div>
        <span className="text-sm font-black uppercase italic tracking-tighter">{title}</span>
      </div>
      {openSections[id] ? <ChevronDown size={16} className="text-indigo-400" /> : <ChevronRight size={16} className={darkMode ? "text-zinc-600" : "text-slate-400"} />}
    </button>
  );

  return (
    <div className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col font-sans text-left max-w-full overflow-x-hidden md:pl-72`}>
      <WorkspaceSidebar />

      {/* Header */}
      <header className={`${glass} px-6 py-4 border-b flex items-center gap-3 sticky top-0 z-40`}>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white md:hidden">
          <Menu size={18} />
        </button>
        <button onClick={() => setVista("fideicommis")} className={`p-2 transition-colors ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}>
          <ArrowLeft size={20} />
        </button>
        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
          <FileText size={20} />
        </div>
        <div className="flex-1">
          <h1 className="font-black uppercase italic tracking-tighter text-lg leading-none">Mandat de Gestion Immobilière</h1>
          <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
            OACIQ · RLRQ, c C-73.2, art. 95-99
          </p>
        </div>
        {/* Step indicator */}
        <div className="hidden sm:flex items-center gap-2">
          {["Formulaire", "Aperçu", "Signature"].map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border transition-all ${
                (step === "form" && i === 0) || (step === "preview" && i === 1) || (step === "send" && i === 2)
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : darkMode ? "border-zinc-700 text-zinc-600" : "border-slate-200 text-slate-400"
              }`}>{i + 1}</div>
              <span className={`text-[9px] font-bold hidden lg:block ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{s}</span>
              {i < 2 && <ChevronRight size={10} className={darkMode ? "text-zinc-700" : "text-slate-300"} />}
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full space-y-3">
        <AnimatePresence mode="wait">

          {/* ── STEP 1: FORMULAIRE ──────────────────────────────────────── */}
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">

              {/* OACIQ info banner */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3 ${darkMode ? "bg-indigo-900/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-100"}`}>
                <Info size={15} className="text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Ce formulaire génère un <strong>Mandat de gestion immobilière</strong> conforme à la Loi sur le courtage immobilier du Québec (art. 95-99) et aux directives 2024 de l'OACIQ. Le document PDF peut être signé électroniquement et est admissible comme preuve légale.
                </p>
              </div>

              {/* 1 — Gestionnaire */}
              <SectionToggle id="parties" title="Gestionnaire & Propriétaire" icon={<User size={16} />} />
              {openSections.parties && (
                <div className={`p-5 rounded-[24px] border space-y-4 ${glass}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>Le Gestionnaire (Mandataire)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={labelCls}>Nom / Raison sociale *</label><input className={inputCls} value={form.gestionnaireName} onChange={e => f("gestionnaireName", e.target.value)} placeholder="Gestion XYZ Inc." /></div>
                    <div><label className={labelCls}>N° Permis OACIQ</label><input className={inputCls} value={form.gestionnairePermis} onChange={e => f("gestionnairePermis", e.target.value)} placeholder="12345" /></div>
                    <div><label className={labelCls}>Agence immobilière</label><input className={inputCls} value={form.gestionnaireAgence} onChange={e => f("gestionnaireAgence", e.target.value)} placeholder="Remax / Royal LePage / ..." /></div>
                    <div><label className={labelCls}>Adresse</label><input className={inputCls} value={form.gestionnaireAdresse} onChange={e => f("gestionnaireAdresse", e.target.value)} placeholder="123 Rue Principale, Montréal" /></div>
                    <div><label className={labelCls}>Téléphone</label><input className={inputCls} value={form.gestionnaireTel} onChange={e => f("gestionnaireTel", e.target.value)} placeholder="514-555-0000" /></div>
                    <div><label className={labelCls}>Courriel</label><input className={inputCls} value={form.gestionnaireEmail} onChange={e => f("gestionnaireEmail", e.target.value)} placeholder="info@gestion.ca" /></div>
                  </div>

                  <div className={`h-px ${darkMode ? "bg-zinc-800" : "bg-slate-100"}`} />
                  <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>Le Propriétaire (Mandant)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={labelCls}>Nom complet *</label><input className={inputCls} value={form.proprietaireName} onChange={e => f("proprietaireName", e.target.value)} placeholder="Jean-Paul Tremblay" /></div>
                    <div><label className={labelCls}>Courriel *</label><input className={inputCls} value={form.proprietaireEmail} onChange={e => f("proprietaireEmail", e.target.value)} placeholder="jptremblay@email.com" /></div>
                    <div className="col-span-full"><label className={labelCls}>Adresse</label><input className={inputCls} value={form.proprietaireAdresse} onChange={e => f("proprietaireAdresse", e.target.value)} placeholder="456 Avenue des Pins, Laval, QC H7B 1A1" /></div>
                    <div><label className={labelCls}>Téléphone</label><input className={inputCls} value={form.proprietaireTel} onChange={e => f("proprietaireTel", e.target.value)} placeholder="514-555-1234" /></div>
                  </div>
                </div>
              )}

              {/* 2 — Propriétés */}
              <SectionToggle id="proprietes" title="Propriétés visées par le mandat" icon={<Building2 size={16} />} />
              {openSections.proprietes && (
                <div className={`p-5 rounded-[24px] border space-y-4 ${glass}`}>
                  {form.proprietes.map((p, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border space-y-3 ${darkMode ? "border-zinc-800 bg-zinc-900/20" : "border-slate-100 bg-slate-50"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Propriété {idx + 1}</span>
                        {idx > 0 && <button onClick={() => removePropriete(idx)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 transition-colors"><Trash2 size={13} /></button>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="col-span-full"><label className={labelCls}>Adresse civique *</label><input className={inputCls} value={p.adresse} onChange={e => updatePropriete(idx, "adresse", e.target.value)} placeholder="789 Boul. St-Laurent" /></div>
                        <div><label className={labelCls}>Ville</label><input className={inputCls} value={p.ville} onChange={e => updatePropriete(idx, "ville", e.target.value)} /></div>
                        <div><label className={labelCls}>Code postal</label><input className={inputCls} value={p.codePostal} onChange={e => updatePropriete(idx, "codePostal", e.target.value)} placeholder="H1A 1A1" /></div>
                        <div>
                          <label className={labelCls}>Type de propriété</label>
                          <select className={inputCls} value={p.typePropriete} onChange={e => updatePropriete(idx, "typePropriete", e.target.value)}>
                            <option>Immeuble à revenus</option>
                            <option>Duplex</option>
                            <option>Triplex</option>
                            <option>Quadruplex</option>
                            <option>Maison unifamiliale en location</option>
                            <option>Condo en location</option>
                            <option>Immeuble commercial</option>
                          </select>
                        </div>
                        <div><label className={labelCls}>Nombre de logements</label><input className={inputCls} value={p.nbLogements} onChange={e => updatePropriete(idx, "nbLogements", e.target.value)} placeholder="4" type="number" /></div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addPropriete} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full border transition-all ${darkMode ? "border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10" : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"}`}>
                    <Plus size={12} />Ajouter une propriété
                  </button>
                </div>
              )}

              {/* 3 — Durée */}
              <SectionToggle id="duree" title="Durée du mandat" icon={<Calendar size={16} />} />
              {openSections.duree && (
                <div className={`p-5 rounded-[24px] border space-y-4 ${glass}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={labelCls}>Date de début</label><input type="date" className={inputCls} value={form.dateDebut} onChange={e => f("dateDebut", e.target.value)} /></div>
                    <div><label className={labelCls}>Date d'échéance</label><input type="date" className={inputCls} value={form.dateFin} onChange={e => f("dateFin", e.target.value)} /></div>
                    <div><label className={labelCls}>Préavis de résiliation (jours)</label><input type="number" className={inputCls} value={form.preavisResiliation} onChange={e => f("preavisResiliation", e.target.value)} /></div>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.reconductionTacite} onChange={e => f("reconductionTacite", e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-sm font-medium">Reconduction tacite à l'échéance</span>
                  </label>
                </div>
              )}

              {/* 4 — Honoraires */}
              <SectionToggle id="honoraires" title="Honoraires de gestion" icon={<Percent size={16} />} />
              {openSections.honoraires && (
                <div className={`p-5 rounded-[24px] border space-y-4 ${glass}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Base de calcul</label>
                      <select className={inputCls} value={form.baseCalcul} onChange={e => f("baseCalcul", e.target.value as any)}>
                        <option value="loyer_brut">% du loyer brut mensuel</option>
                        <option value="loyer_net">% du loyer net mensuel</option>
                        <option value="montant_fixe">Montant fixe mensuel ($)</option>
                      </select>
                    </div>
                    {form.baseCalcul !== "montant_fixe" ? (
                      <div><label className={labelCls}>Taux d'honoraires (%)</label><input type="number" className={inputCls} value={form.tauxHonoraires} onChange={e => f("tauxHonoraires", e.target.value)} placeholder="8" /></div>
                    ) : (
                      <div><label className={labelCls}>Montant fixe mensuel ($)</label><input type="number" className={inputCls} value={form.montantFixe} onChange={e => f("montantFixe", e.target.value)} placeholder="300" /></div>
                    )}
                    <div>
                      <label className={labelCls}>Périodicité de facturation</label>
                      <select className={inputCls} value={form.periodiciteFacturation} onChange={e => f("periodiciteFacturation", e.target.value as any)}>
                        <option value="mensuelle">Mensuelle</option>
                        <option value="trimestrielle">Trimestrielle</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 5 — Fidéicommis */}
              <SectionToggle id="fideicommis" title="Compte en fidéicommis (obligatoire OACIQ)" icon={<Scale size={16} />} />
              {openSections.fideicommis && (
                <div className={`p-5 rounded-[24px] border space-y-4 ${glass}`}>
                  <div className={`p-3 rounded-2xl border flex items-start gap-2 ${darkMode ? "bg-amber-900/10 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <p className="text-[10px] font-medium">Obligatoire selon l'art. 95 de la Loi sur le courtage immobilier. Le gestionnaire DOIT tenir un compte en fidéicommis distinct pour les fonds de ses clients.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={labelCls}>Institution financière</label><input className={inputCls} value={form.banqueFideicommis} onChange={e => f("banqueFideicommis", e.target.value)} placeholder="Banque Nationale, Desjardins..." /></div>
                    <div><label className={labelCls}>Numéro de compte en fidéicommis</label><input className={inputCls} value={form.noCompteFideicommis} onChange={e => f("noCompteFideicommis", e.target.value)} placeholder="1234-567890" /></div>
                  </div>
                </div>
              )}

              {/* 6 — Pouvoirs */}
              <SectionToggle id="pouvoirs" title="Pouvoirs conférés au gestionnaire" icon={<CheckCircle2 size={16} />} />
              {openSections.pouvoirs && (
                <div className={`p-5 rounded-[24px] border space-y-3 ${glass}`}>
                  {[
                    ["pouvoirLouer", "Louer les logements vacants et présenter les locataires"],
                    ["pouvoirNegocierBaux", "Négocier les baux et les renouvellements"],
                    ["pouvoirSignerBaux", "Signer les baux (≤ 1 an)"],
                    ["pouvoirSigner3ans", "Signer les baux (> 1 an) — accord du propriétaire requis"],
                    ["pouvoirPercevoirLoyers", "Percevoir les loyers et montants dus"],
                    ["pouvoirPayerDepenses", "Payer les dépenses courantes d'exploitation"],
                    ["pouvoirRepairationsUrgentes", "Autoriser les réparations urgentes"],
                    ["pouvoirPoursuivre", "Intenter des procédures judiciaires (non-paiement / reprise)"],
                    ["pouvoirEngagerPersonnel", "Engager et congédier le personnel d'entretien"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={form[key as keyof MandatFormData] as boolean}
                        onChange={e => f(key as keyof MandatFormData, e.target.checked as any)}
                        className="w-4 h-4 rounded mt-0.5 shrink-0" />
                      <span className="text-[12px] font-medium leading-snug">{label}</span>
                    </label>
                  ))}
                  {form.pouvoirRepairationsUrgentes && (
                    <div className="ml-7"><label className={labelCls}>Montant max par réparation sans autorisation ($)</label><input type="number" className={inputCls} value={form.montantMaxReparation} onChange={e => f("montantMaxReparation", e.target.value)} /></div>
                  )}
                </div>
              )}

              {/* 7 — Obligations */}
              <SectionToggle id="obligations" title="Obligations & Assurances" icon={<FileText size={16} />} />
              {openSections.obligations && (
                <div className={`p-5 rounded-[24px] border space-y-3 ${glass}`}>
                  {[
                    ["releve_mensuel", "Remettre un relevé mensuel détaillé au propriétaire"],
                    ["conciliation_mensuelle", "Effectuer la conciliation bancaire mensuelle du fidéicommis"],
                    ["assurance_gestionnaire", "Maintenir une assurance responsabilité professionnelle"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={form[key as keyof MandatFormData] as boolean}
                        onChange={e => f(key as keyof MandatFormData, e.target.checked as any)}
                        className="w-4 h-4 rounded mt-0.5" />
                      <span className="text-[12px] font-medium">{label}</span>
                    </label>
                  ))}
                  {form.assurance_gestionnaire && (
                    <div><label className={labelCls}>Numéro de police d'assurance</label><input className={inputCls} value={form.numPoliceAssurance} onChange={e => f("numPoliceAssurance", e.target.value)} placeholder="PRO-2024-XXXXXX" /></div>
                  )}
                </div>
              )}

              {/* 8 — Clauses spéciales */}
              <SectionToggle id="clauses" title="Clauses particulières (optionnel)" icon={<FileText size={16} />} />
              {openSections.clauses && (
                <div className={`p-5 rounded-[24px] border space-y-3 ${glass}`}>
                  <textarea rows={5} className={`${inputCls} resize-none`}
                    value={form.clausesSpeciales}
                    onChange={e => f("clausesSpeciales", e.target.value)}
                    placeholder="Ex: Le gestionnaire aura accès au stationnement intérieur pour ses visites. Le propriétaire s'engage à maintenir le système de chauffage en bon état de fonctionnement..."
                  />
                </div>
              )}

              {/* CTA */}
              <button
                onClick={() => setStep("preview")}
                disabled={!form.gestionnaireName || !form.proprietaireName || !form.proprietes[0].adresse}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
              >
                <FileText size={14} />Aperçu du mandat →
              </button>
            </motion.div>
          )}

          {/* ── STEP 2: APERÇU ──────────────────────────────────────────── */}
          {step === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className={`p-6 rounded-[28px] border ${glass}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500"><FileText size={22} /></div>
                  <div>
                    <h2 className="font-black text-base italic uppercase tracking-tighter">Mandat de Gestion Immobilière</h2>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Prêt à télécharger et signer</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { l: "Gestionnaire", v: form.gestionnaireName },
                    { l: "Propriétaire", v: form.proprietaireName },
                    { l: "Propriétés", v: `${form.proprietes.length} propriété(s)` },
                    { l: "Durée", v: `${form.dateDebut} → ${form.dateFin}` },
                    { l: "Honoraires", v: form.baseCalcul !== "montant_fixe" ? `${form.tauxHonoraires}%` : `${form.montantFixe} $/mois` },
                    { l: "Reconduction tacite", v: form.reconductionTacite ? "Oui" : "Non" },
                  ].map(item => (
                    <div key={item.l} className={`p-3 rounded-2xl ${darkMode ? "bg-zinc-900/40" : "bg-slate-50"}`}>
                      <p className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>{item.l}</p>
                      <p className="text-[12px] font-bold mt-0.5 truncate">{item.v || "—"}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep("form")} className={`flex-1 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${darkMode ? "border-zinc-700 hover:bg-zinc-900" : "border-slate-200 hover:bg-slate-50"}`}>
                    <ArrowLeft size={13} />Modifier
                  </button>
                  <button onClick={handleDownload} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20">
                    <Download size={13} />Télécharger PDF
                  </button>
                  <button onClick={() => setStep("send")} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20">
                    <Send size={13} />Envoyer →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: SEND ────────────────────────────────────────────── */}
          {step === "send" && (
            <motion.div key="send" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {sent ? (
                <div className={`p-8 rounded-[28px] border text-center ${glass}`}>
                  <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-black italic uppercase tracking-tighter mb-2">Mandat envoyé !</h3>
                  <p className={`text-sm ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                    Le mandat de gestion a été envoyé à <strong>{sendEmail || form.proprietaireEmail}</strong>. Le propriétaire recevra un email avec le PDF attaché.
                  </p>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => { setStep("form"); setSent(false); setForm(defaultForm(adminName, adminEmail)); }} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">
                      Nouveau mandat
                    </button>
                    <button onClick={() => setVista("fideicommis")} className={`flex-1 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${darkMode ? "border-zinc-700 text-zinc-400" : "border-slate-200 text-slate-600"}`}>
                      Retour au fidéicommis
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`p-6 rounded-[28px] border space-y-5 ${glass}`}>
                  <h3 className="text-sm font-black italic uppercase tracking-tighter">Envoyer pour signature électronique</h3>
                  <p className={`text-[11px] ${darkMode ? "text-zinc-500" : "text-slate-500"}`}>
                    Le mandat PDF sera envoyé au propriétaire par email. En ouvrant le PDF, il pourra l'imprimer, le signer, ou utiliser DocuLegal pour la signature électronique.
                  </p>
                  <div>
                    <label className={labelCls}>Adresse courriel du propriétaire</label>
                    <input
                      type="email"
                      className={inputCls}
                      value={sendEmail || form.proprietaireEmail}
                      onChange={e => setSendEmail(e.target.value)}
                      placeholder="proprietaire@email.com"
                    />
                  </div>
                  <div className={`p-3 rounded-2xl border flex items-start gap-2 ${darkMode ? "bg-amber-900/10 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <p className="text-[10px] font-medium">Le mandat est envoyé avec le PDF joint. Pour une signature électronique avec valeur légale complète, importez ensuite le mandat dans <strong>DocuLegal</strong> via l'onglet Contrats.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep("preview")} className={`flex-1 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${darkMode ? "border-zinc-700" : "border-slate-200"}`}>
                      <ArrowLeft size={13} className="inline mr-1" />Retour
                    </button>
                    <button onClick={handleDownload} className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                      <Download size={13} />PDF
                    </button>
                    <button
                      onClick={handleSendForSignature}
                      disabled={isSending || (!sendEmail && !form.proprietaireEmail)}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20"
                    >
                      {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Envoyer
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
};

export default MandatDeGestionView;
