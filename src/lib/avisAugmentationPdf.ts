/**
 * avisAugmentationPdf.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a PDF "Avis d'augmentation de loyer et de modification d'une autre
 * condition du bail" inspired by the TAL-806 model from the Tribunal
 * administratif du logement (tal.gouv.qc.ca).
 *
 * AutoCompt does NOT reproduce the official TAL form verbatim — it generates
 * a legally-compliant notice based on the same structure, pre-filled from the
 * user's GestionPlex data. The user remains responsible for verifying the
 * content and consulting a professional for complex situations.
 *
 * Legal requirements included (as of 2024-2025):
 *  - The 3 mandatory tenant options (Loi modifying the TAL, Dec 2024)
 *  - Legal notice deadlines (3-6 months for ≥12 month leases, 1-2 months for others)
 *  - Current rent disclosure (Loi 31, Section G requirement)
 *
 * Same jsPDF pattern as releve31Pdf.ts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import jsPDF from "jspdf";

export interface AvisAugmentationLocateur {
  nom: string;
  adresse?: string;
  tel?: string;
  email?: string;
}

export interface AvisAugmentationData {
  // Locateur (pre-filled from company profile)
  locateur: AvisAugmentationLocateur;

  // Locataire (pre-filled from UnitDoc)
  locataireNom: string;

  // Logement (pre-filled from PropertyDoc + UnitDoc)
  adresseLogement: string;  // civic address of the building
  unitLabel: string;        // e.g. "Appt 1 (RDC)"

  // Bail actuel (pre-filled from UnitDoc)
  loyerActuel: number;
  dateDebutBail?: string;   // YYYY-MM-DD, used to compute legal deadlines

  // Augmentation (entered by user in the modal)
  nouveauLoyer: number;
  dateEffetAugmentation: string; // YYYY-MM-DD — when the new rent takes effect
  dateAvis: string;              // YYYY-MM-DD — date the notice is issued

  // Optional: additional conditions modified
  autresModifications?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d?: string): string => {
  if (!d) return "—";
  const parsed = new Date(d + "T00:00:00");
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const fmtCAD = (n: number): string =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

const fmtPct = (ancien: number, nouveau: number): string => {
  if (!ancien || ancien === 0) return "—";
  const pct = ((nouveau - ancien) / ancien) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)} %`;
};

// ─── Main export ─────────────────────────────────────────────────────────────

export function generateAvisAugmentationPDF(data: AvisAugmentationData): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 14;
  const contentW = W - margin * 2;

  // ── Colours ──────────────────────────────────────────────────────────────
  const emerald: [number, number, number] = [5, 150, 105];
  const slate: [number, number, number] = [71, 85, 105];
  const lightSlate: [number, number, number] = [241, 245, 249];
  const darkText: [number, number, number] = [30, 30, 30];
  const mutedText: [number, number, number] = [100, 116, 139];
  const alertBg: [number, number, number] = [254, 252, 232]; // amber-50

  let y = 0;

  // ── Header band ──────────────────────────────────────────────────────────
  pdf.setFillColor(...emerald);
  pdf.rect(0, 0, W, 40, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("AVIS D'AUGMENTATION DE LOYER", margin, 14);
  pdf.text("ET DE MODIFICATION DU BAIL", margin, 21);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("Inspiré du formulaire TAL-806 · Tribunal administratif du logement", margin, 28);
  pdf.text(`Date de l'avis : ${fmtDate(data.dateAvis)}`, margin, 34);

  y = 48;

  // ── Section helper ────────────────────────────────────────────────────────
  const section = (title: string) => {
    pdf.setFillColor(...lightSlate);
    pdf.rect(margin, y, contentW, 7, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...slate);
    pdf.text(title, margin + 2, y + 5);
    y += 11;
  };

  // ── Two-column field helper ───────────────────────────────────────────────
  const field = (label: string, value: string, labelW = 70) => {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...mutedText);
    pdf.text(label, margin, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...darkText);
    const lines = pdf.splitTextToSize(value || "—", contentW - labelW);
    pdf.text(lines, margin + labelW, y);
    y += Math.max(6, lines.length * 5);
  };

  // ── Parties ───────────────────────────────────────────────────────────────
  section("1. LOCATEUR (PROPRIÉTAIRE / GESTIONNAIRE)");
  field("Nom", data.locateur.nom);
  if (data.locateur.adresse) field("Adresse", data.locateur.adresse);
  if (data.locateur.tel) field("Téléphone", data.locateur.tel);
  if (data.locateur.email) field("Courriel", data.locateur.email);
  y += 3;

  section("2. LOCATAIRE");
  field("Nom du locataire", data.locataireNom);
  y += 3;

  section("3. LOGEMENT VISÉ");
  field("Adresse civique", data.adresseLogement);
  field("Unité / logement", data.unitLabel);
  if (data.dateDebutBail) field("Date de début du bail", fmtDate(data.dateDebutBail));
  y += 3;

  // ── Augmentation box ─────────────────────────────────────────────────────
  section("4. MODIFICATION DU LOYER");

  // Highlighted comparison box
  pdf.setFillColor(240, 253, 244); // green-50
  pdf.setDrawColor(...emerald);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y, contentW, 28, 2, 2, "FD");

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...mutedText);
  pdf.text("Loyer actuel :", margin + 4, y + 8);
  pdf.text("Nouveau loyer proposé :", margin + 4, y + 16);
  pdf.text("Augmentation :", margin + 4, y + 23);

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...darkText);
  pdf.text(fmtCAD(data.loyerActuel) + " / mois", margin + 70, y + 8);
  pdf.setFontSize(12);
  pdf.setTextColor(...emerald);
  pdf.text(fmtCAD(data.nouveauLoyer) + " / mois", margin + 70, y + 16);
  pdf.setFontSize(9);
  pdf.setTextColor(...slate);
  pdf.text(
    `${fmtCAD(data.nouveauLoyer - data.loyerActuel)} / mois  (${fmtPct(data.loyerActuel, data.nouveauLoyer)})`,
    margin + 70, y + 23
  );
  y += 34;

  field("Date de prise d'effet", fmtDate(data.dateEffetAugmentation));

  if (data.autresModifications) {
    y += 2;
    field("Autres modifications", data.autresModifications);
  }
  y += 5;

  // ── 3 Options légales (obligatoire depuis déc. 2024) ─────────────────────
  section("5. OPTIONS DU LOCATAIRE (réponse requise dans le mois suivant la réception)");

  const options = [
    {
      num: "Option 1",
      titre: "ACCEPTER les modifications proposées",
      desc: "Le locataire accepte le nouveau loyer et les autres modifications indiquées ci-dessus. Le bail est reconduit aux nouvelles conditions.",
    },
    {
      num: "Option 2",
      titre: "REFUSER les modifications et RENOUVELER le bail",
      desc: "Le locataire refuse les modifications mais souhaite renouveler son bail. Le locateur devra alors s'adresser au Tribunal administratif du logement pour faire fixer le loyer ou toute autre condition contestée.",
    },
    {
      num: "Option 3",
      titre: "NE PAS RENOUVELER le bail",
      desc: "Le locataire quitte le logement à la date de fin du bail en cours. Il doit aviser le locateur dans le mois suivant la réception du présent avis.",
    },
  ];

  for (const opt of options) {
    // Check box
    pdf.setDrawColor(...slate);
    pdf.setLineWidth(0.4);
    pdf.rect(margin, y, 5, 5);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...emerald);
    pdf.text(opt.num + " —", margin + 7, y + 4);

    pdf.setTextColor(...darkText);
    pdf.text(opt.titre, margin + 38, y + 4);
    y += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...mutedText);
    const descLines = pdf.splitTextToSize(opt.desc, contentW - 7);
    pdf.text(descLines, margin + 7, y);
    y += descLines.length * 4.5 + 4;
  }
  y += 4;

  // ── New page check before signatures ─────────────────────────────────────
  if (y > 240) {
    pdf.addPage();
    y = 20;
  }

  // ── Délai légal alert ─────────────────────────────────────────────────────
  pdf.setFillColor(...alertBg);
  pdf.setDrawColor(234, 179, 8); // amber-500
  pdf.setLineWidth(0.4);
  pdf.roundedRect(margin, y, contentW, 16, 2, 2, "FD");
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(133, 77, 14); // amber-800
  pdf.text("⚠  DÉLAIS LÉGAUX D'ENVOI", margin + 3, y + 6);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 80, 0);
  pdf.text(
    "Bail ≥ 12 mois : entre 3 et 6 mois avant la fin du bail.  |  Bail < 12 mois : entre 1 et 2 mois avant la fin du bail.  |  Bail indéterminé : entre 1 et 2 mois avant la date d'effet.",
    margin + 3, y + 12
  );
  y += 22;

  // ── Signature block ───────────────────────────────────────────────────────
  section("6. SIGNATURE DU LOCATEUR");

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...darkText);
  pdf.text("Je, soussigné(e), certifie que les renseignements ci-dessus sont exacts.", margin, y);
  y += 10;

  // Signature line
  pdf.setDrawColor(...slate);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y + 8, margin + 80, y + 8);
  pdf.line(margin + 95, y + 8, margin + 140, y + 8);

  pdf.setFontSize(8);
  pdf.setTextColor(...mutedText);
  pdf.text("Signature du locateur", margin, y + 13);
  pdf.text("Date", margin + 95, y + 13);
  y += 22;

  // ── Locataire response section ────────────────────────────────────────────
  pdf.setFillColor(...lightSlate);
  pdf.rect(margin, y, contentW, 7, "F");
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...slate);
  pdf.text("RÉPONSE DU LOCATAIRE (à retourner au locateur dans le mois suivant la réception)", margin + 2, y + 5);
  y += 11;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...darkText);
  pdf.text("Je, soussigné(e),", margin, y);
  pdf.setDrawColor(...slate);
  pdf.setLineWidth(0.3);
  pdf.line(margin + 35, y + 1, margin + 130, y + 1);
  pdf.text(", locataire du logement visé, choisis l'option :", margin + 131, y);
  y += 8;

  for (const opt of options) {
    pdf.rect(margin, y, 4, 4);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...darkText);
    pdf.text(`${opt.num} — ${opt.titre}`, margin + 6, y + 3.5);
    y += 7;
  }
  y += 6;

  pdf.line(margin, y + 8, margin + 80, y + 8);
  pdf.line(margin + 95, y + 8, margin + 140, y + 8);
  pdf.setFontSize(8);
  pdf.setTextColor(...mutedText);
  pdf.text("Signature du locataire", margin, y + 13);
  pdf.text("Date", margin + 95, y + 13);
  y += 20;

  // ── Footer disclaimer ─────────────────────────────────────────────────────
  const footerY = 277;
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, footerY, W, 20, "F");
  pdf.setDrawColor(220, 220, 230);
  pdf.setLineWidth(0.3);
  pdf.line(0, footerY, W, footerY);

  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(148, 163, 184);
  const disclaimer = pdf.splitTextToSize(
    "Modèle inspiré du formulaire TAL-806 du Tribunal administratif du logement (tal.gouv.qc.ca). " +
    "Ce document est produit à titre de référence seulement et ne remplace pas le formulaire officiel du TAL. " +
    "AutoCompt n'est pas un cabinet juridique. Consultez un professionnel du droit pour toute situation complexe.",
    W - 28
  );
  pdf.text(disclaimer, margin, footerY + 5);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Généré le ${new Date().toLocaleString("fr-CA")} · AutoCompt`, margin, footerY + 15);

  return pdf;
}
