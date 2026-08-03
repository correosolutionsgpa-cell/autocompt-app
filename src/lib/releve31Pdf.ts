/**
 * releve31Pdf.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a Relevé 31 PREPARATION WORKSHEET — not an official Revenu Québec
 * slip. AutoCompt does not (yet) register as an official RL-31 producer or
 * transmit copy 1 electronically to Revenu Québec — that's a separate,
 * larger compliance project. This PDF exists so a landlord can gather every
 * field the real form needs (tenant, dwelling, dates, landlord identity) in
 * one place, then re-enter it quickly into Revenu Québec's own "Produire et
 * consulter les relevés 31" online service (or "Mon dossier") to actually
 * file it — that transmission step is deliberately NOT replaced here.
 *
 * Same jsPDF pattern/library as generateBuildingLedgerPDF in
 * Rama_Gestionnaires/TenueLivresImmeubleView.tsx — no new dependency.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import jsPDF from "jspdf";
import type { PropertyDoc, UnitDoc } from "./dataService";

export interface Releve31CompanyProfile {
  nom: string;
  neq?: string;
  adresse?: string;
  tel?: string;
}

const fmtDate = (d?: string) => {
  if (!d) return "—";
  const parsed = new Date(d + "T00:00:00");
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
};

export function generateReleve31PDF(
  unit: UnitDoc,
  property: PropertyDoc,
  companyProfile: Releve31CompanyProfile,
  year: string
): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const slate = [71, 85, 105] as [number, number, number];

  pdf.setFillColor(...slate);
  pdf.rect(0, 0, W, 38, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(15);
  pdf.setFont("helvetica", "bold");
  pdf.text("RELEVÉ 31 — DOCUMENT DE PRÉPARATION", 14, 15);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("NON OFFICIEL — sert à préparer les données avant transmission via Revenu Québec", 14, 21);
  pdf.setFontSize(9);
  pdf.text(`Année visée : ${year}`, 14, 30);

  let y = 48;
  const section = (title: string) => {
    pdf.setFillColor(241, 245, 249);
    pdf.rect(14, y, W - 28, 7, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...slate);
    pdf.text(title, 16, y + 5);
    y += 12;
  };
  const field = (label: string, value: string) => {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text(label, 16, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 30, 30);
    pdf.text(value || "—", 90, y);
    y += 7;
  };

  section("1. LOCATEUR (PROPRIÉTAIRE)");
  field("Nom légal", companyProfile.nom);
  field("NEQ", companyProfile.neq || "—");
  field("Adresse", companyProfile.adresse || "—");
  field("Téléphone", companyProfile.tel || "—");

  y += 3;
  section("2. LOGEMENT");
  field("Adresse du logement", property.adresse);
  field("Type de logement", property.typeLocation);
  field("Unité / pièce", unit.unitName);

  y += 3;
  section("3. LOCATAIRE(S)");
  field("Locataire principal", unit.tenantName || "—");
  if (unit.occupantsSupplementaires && unit.occupantsSupplementaires.length > 0) {
    unit.occupantsSupplementaires.forEach((occ, i) => field(`Occupant additionnel ${i + 1}`, occ));
  }

  y += 3;
  section("4. PÉRIODE D'OCCUPATION");
  field("Date d'entrée", fmtDate(unit.moveInDate));
  field("Date de départ", unit.moveOutDate ? fmtDate(unit.moveOutDate) : "Toujours occupé au 31 décembre");
  field("Résidence principale du locataire au 31 décembre", unit.residencePrincipale === true ? "Oui" : unit.residencePrincipale === false ? "Non" : "À confirmer");

  pdf.setDrawColor(220, 220, 230);
  pdf.line(14, y + 2, W - 14, y + 2);
  y += 10;

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  const noteLines = pdf.splitTextToSize(
    "Ce document regroupe les renseignements requis pour le Relevé 31 mais n'est PAS le relevé officiel. " +
    "Utilisez le service en ligne « Produire et consulter les relevés 31 » de Revenu Québec (ou Mon dossier) " +
    "pour transmettre officiellement la copie 1 à Revenu Québec et remettre la copie 2 au locataire, avant le 28 février.",
    W - 28
  );
  pdf.text(noteLines, 14, y);
  y += noteLines.length * 4 + 4;
  pdf.text("revenuquebec.ca — Produire et consulter les relevés 31", 14, y);

  pdf.setFillColor(245, 245, 250);
  pdf.rect(0, 275, W, 22, "F");
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text("Document de préparation généré automatiquement par AutoCompt.", 14, 283);
  pdf.text(`Généré le ${new Date().toLocaleString("fr-CA")}`, 14, 289);

  return pdf;
}
