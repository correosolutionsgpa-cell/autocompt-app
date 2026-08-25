import jsPDF from "jspdf";
import type { SignatureField } from "../components/DocuLegalPdfEditor";

// Turns a "modèle texte" DocuLegal document (a plain substituted string,
// e.g. a Promesse d'Achat Dynamique) into a real paginated PDF, so it can
// go through the exact same click-to-sign pipeline already built for
// admin-uploaded PDFs (DocuLegalPdfEditor.tsx / PublicSignaturePage.tsx) —
// paginated real document, company logo, and initials boxes at the bottom
// of every page. The body text is treated as an opaque string: this file
// only lays it out, it never parses or alters the legal wording.
// Added 2026-08-25 (Fabiola: sent herself a real Promesse d'Achat
// Dynamique and got one unpaginated wall of raw text with no logo and
// nowhere for initials to go).

export interface DocTextToPdfSigner {
  name: string;
  email: string;
  role?: string;
}

export interface DocTextToPdfResult {
  pdf: jsPDF;
  fields: SignatureField[];
}

const W = 210;
const H = 297;
const M = 18;
const TW = W - M * 2;
const FOOTER_BAND_H = 28; // reserved bottom band for the initials strip, every content page
const CONTENT_MAX_Y = H - FOOTER_BAND_H - 4;
const GREEN: [number, number, number] = [5, 150, 105];
const LIGHT_GREEN: [number, number, number] = [236, 253, 245];
const DARK: [number, number, number] = [30, 30, 30];
const GRAY: [number, number, number] = [110, 110, 110];

let fieldSeq = 0;
const nextFieldId = () => `dtp-${Date.now().toString(36)}-${(fieldSeq++).toString(36)}`;

export function generateDocTextPDF(opts: {
  title: string;
  companyName?: string;
  bodyText: string; // already-substituted contract text — laid out as-is, never parsed
  logoBase64?: string | null;
  signers: DocTextToPdfSigner[];
}): DocTextToPdfResult {
  const { title, companyName, bodyText, logoBase64 } = opts;
  const signers = opts.signers.length > 0 ? opts.signers : [{ name: "Signataire", email: "" }];
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const fields: SignatureField[] = [];
  let y = 16;

  const drawSlimHeader = () => {
    pdf.setFillColor(...GREEN);
    pdf.rect(0, 0, W, 9, "F");
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text(title.slice(0, 60), M, 6);
    if (companyName) pdf.text(companyName.slice(0, 40), W - M, 6, { align: "right" });
  };

  const nextPage = () => {
    pdf.addPage();
    y = 16;
    drawSlimHeader();
  };

  const checkY = (needed: number) => {
    if (y + needed > CONTENT_MAX_Y) nextPage();
  };

  // ── Page 1 : en-tête + logo + titre ───────────────────────────────────────
  drawSlimHeader();
  if (logoBase64) {
    try {
      const fmt = logoBase64.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      pdf.addImage(logoBase64, fmt, M, y, 22, 22);
    } catch {
      // Format d'image non supporté (ex. data URL SVG) — on l'ignore
      // silencieusement, comme le générateur de PDF de facture (App.tsx).
    }
  }
  const titleX = logoBase64 ? M + 28 : M;
  pdf.setFontSize(15);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...DARK);
  const titleLines = pdf.splitTextToSize(title, TW - (logoBase64 ? 28 : 0));
  pdf.text(titleLines, titleX, y + 8);
  if (companyName) {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...GRAY);
    pdf.text(companyName, titleX, y + 8 + titleLines.length * 6);
  }
  y += Math.max(logoBase64 ? 26 : 0, 8 + titleLines.length * 6 + 6);
  pdf.setDrawColor(...GREEN);
  pdf.setLineWidth(0.6);
  pdf.line(M, y, W - M, y);
  y += 8;

  // ── Corps du document — chaîne opaque, jamais interprétée ─────────────────
  pdf.setFontSize(9);
  bodyText.split("\n").forEach((line) => {
    if (!line.trim()) {
      y += 3.5;
      return;
    }
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...DARK);
    const wrapped = pdf.splitTextToSize(line, TW);
    wrapped.forEach((sub: string) => {
      checkY(5.2);
      pdf.text(sub, M, y);
      y += 5.2;
    });
  });

  const totalContentPages = (pdf as any).internal.getNumberOfPages();

  // ── Bande d'initiales en pied de page, sur chaque page de contenu ─────────
  const boxesPerRow = signers.length > 4 ? Math.ceil(signers.length / 2) : signers.length;
  const gap = 4;
  const boxW = (TW - gap * (boxesPerRow - 1)) / boxesPerRow;
  const rowH = 11;
  const bandTop = H - FOOTER_BAND_H;

  for (let p = 1; p <= totalContentPages; p++) {
    pdf.setPage(p);
    pdf.setFillColor(...LIGHT_GREEN);
    pdf.rect(0, bandTop, W, FOOTER_BAND_H, "F");
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...GREEN);
    pdf.text("INITIALES DE CHAQUE PARTIE", M, bandTop + 5);

    signers.forEach((signer, i) => {
      const row = Math.floor(i / boxesPerRow);
      const col = i % boxesPerRow;
      const bx = M + col * (boxW + gap);
      const by = bandTop + 7 + row * (rowH + 3);
      pdf.setDrawColor(...GREEN);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(bx, by, boxW, rowH, 1.5, 1.5);
      pdf.setFontSize(5.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...GRAY);
      const label = (signer.role || signer.name || `Signataire ${i + 1}`).slice(0, 24);
      pdf.text(label, bx + 1.5, by - 1);

      fields.push({
        id: nextFieldId(),
        page: p,
        type: "initials",
        xPct: (bx / W) * 100,
        yPct: (by / H) * 100,
        wPct: (boxW / W) * 100,
        hPct: (rowH / H) * 100,
        required: true,
        label: `Initiales — ${signer.name || signer.role || `Signataire ${i + 1}`}`,
        signerIndex: i,
      });
    });

    pdf.setFontSize(6);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(170, 170, 170);
    pdf.text(`Page ${p} / ${totalContentPages + 1}`, W - M, H - 3, { align: "right" });
  }

  // ── Page de signature finale dédiée ────────────────────────────────────────
  pdf.addPage();
  const sigPage = totalContentPages + 1;
  drawSlimHeader();
  y = 30;
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...DARK);
  pdf.text("Signatures et acceptation", M, y);
  y += 12;

  const blockH = 46;
  signers.forEach((signer, i) => {
    pdf.setFillColor(248, 250, 249);
    pdf.roundedRect(M, y, TW, blockH, 3, 3, "F");
    pdf.setDrawColor(...GREEN);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(M, y, TW, blockH, 3, 3);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...GREEN);
    pdf.text((signer.role || `Signataire ${i + 1}`).toUpperCase(), M + 5, y + 8);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...DARK);
    pdf.text(`${signer.name}${signer.email ? ` — ${signer.email}` : ""}`, M + 5, y + 14);

    const sigW = TW * 0.42;
    const dateW = TW * 0.2;
    const lieuW = TW - sigW - dateW - 10;
    const sigX = M + 5;
    const dateX = sigX + sigW + 5;
    const lieuX = dateX + dateW + 5;
    const boxY = y + 18;
    const boxH = 16;

    (
      [
        { x: sigX, w: sigW, label: "Signature", type: "signature" as const, required: true },
        { x: dateX, w: dateW, label: "Date", type: "date" as const, required: true },
        { x: lieuX, w: lieuW, label: "Lieu", type: "lieu" as const, required: false },
      ]
    ).forEach(({ x, w, label, type, required }) => {
      pdf.setDrawColor(...GRAY);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(x, boxY, w, boxH, 1.5, 1.5);
      pdf.setFontSize(6);
      pdf.setTextColor(...GRAY);
      pdf.text(label, x + 2, boxY + boxH + 3.5);
      fields.push({
        id: nextFieldId(),
        page: sigPage,
        type,
        xPct: (x / W) * 100,
        yPct: (boxY / H) * 100,
        wPct: (w / W) * 100,
        hPct: (boxH / H) * 100,
        required,
        label: `${label} — ${signer.name}`,
        signerIndex: i,
      });
    });

    y += blockH + 8;
  });

  return { pdf, fields };
}
