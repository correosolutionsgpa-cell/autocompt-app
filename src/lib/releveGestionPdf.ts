/**
 * releveGestionPdf.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a SEALED "Relevé de Gestion" — the owner-side counterpart to
 * generateRelevePDF() in Rama_Gestionnaires/CompteFideicommis.tsx. That
 * original function itemizes every FideicommisDepotDoc/RetraitDoc row
 * because the gestionnaire has direct read access to them. The owner never
 * does — by design (see SealedStatementDoc/firestore.rules), they only ever
 * receive the four already-computed totals for a period. So this renderer
 * takes those totals directly rather than raw deposit/withdrawal arrays,
 * and is regenerated client-side on demand from the sealed Firestore doc —
 * no PDF file is ever stored, the sealed numbers ARE the source of truth.
 *
 * Same jsPDF library/visual language as generateRelevePDF (indigo header,
 * section bands, "SOLDE NET REMIS" highlight box) so the two look like the
 * same document family from either side of the relationship.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import jsPDF from "jspdf";
import type { SealedStatementDoc } from "./dataService";

const fmtCAD = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

export function generateSealedStatementPDF(statement: SealedStatementDoc, ownerName: string): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const indigo = [99, 102, 241] as [number, number, number];
  const [year, month] = statement.period.split("-");
  const periodLabel = new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString("fr-CA", { month: "long", year: "numeric" });

  pdf.setFillColor(...indigo);
  pdf.rect(0, 0, W, 42, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(17);
  pdf.setFont("helvetica", "bold");
  pdf.text("RELEVÉ DE GESTION IMMOBILIÈRE", 14, 16);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Période : ${periodLabel.toUpperCase()}`, 14, 25);
  pdf.text(`Propriétaire : ${ownerName}`, 14, 32);
  pdf.text(`Gestionnaire : ${statement.companyName || statement.gestionnaireName}`, 14, 39);

  let y = 52;

  if (statement.propertyAddresses.length > 0) {
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    const addrLine = `Immeuble(s) couvert(s) : ${statement.propertyAddresses.join(" · ")}`;
    const wrapped = pdf.splitTextToSize(addrLine, W - 28);
    pdf.text(wrapped, 14, y);
    y += wrapped.length * 4 + 6;
  }

  const total = (label: string, amount: number, color: [number, number, number]) => {
    pdf.setFillColor(245, 246, 250);
    pdf.rect(14, y, W - 28, 14, "F");
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...color);
    pdf.text(label, 20, y + 9);
    pdf.text(fmtCAD(amount), W - 20, y + 9, { align: "right" });
    y += 18;
  };

  total("REVENUS — LOYERS PERÇUS", statement.totalLoyers, [22, 101, 52]);
  total("DÉPENSES PAYÉES EN VOTRE NOM", statement.totalDepenses, [180, 50, 50]);
  total("HONORAIRES DE GESTION", statement.totalHonoraires, [120, 80, 200]);

  y += 4;
  pdf.setFillColor(230, 255, 240);
  pdf.roundedRect(14, y, W - 28, 16, 3, 3, "F");
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(22, 101, 52);
  pdf.text("SOLDE NET REMIS AU PROPRIÉTAIRE", 20, y + 10);
  pdf.text(fmtCAD(statement.netRemis), W - 14, y + 10, { align: "right" });
  y += 26;

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(120, 120, 120);
  pdf.text("Relevé scellé — les montants ci-dessus ne peuvent plus être modifiés une fois émis.", 14, y);
  y += 6;
  pdf.text(`Scellé le ${new Date(statement.sealedAt).toLocaleString("fr-CA")}.`, 14, y);

  pdf.setFillColor(245, 245, 250);
  pdf.rect(0, 275, W, 22, "F");
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  pdf.text("Relevé de gestion — AutoCompt. Document régénéré à partir des données scellées.", 14, 283);
  pdf.text(`Téléchargé le ${new Date().toLocaleString("fr-CA")}`, 14, 289);

  return pdf;
}
