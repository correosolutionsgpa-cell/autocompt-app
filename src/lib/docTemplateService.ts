/**
 * docTemplateService.ts — Custom document templates (DocuLegal)
 *
 * Lets a user upload their own .docx (e.g. a "promesse d'achat" they already
 * use) with `{{champ}}` placeholders where they want blanks, and optional
 * `{{#clause}}...{{/clause}}` conditional sections (e.g. clauses that only
 * apply to a condo vs. a plex) — AutoCompt detects both, builds a fill-in
 * form (text inputs for fields, checkboxes for clauses), and when submitted
 * produces a final PDF preserving the original Word formatting/logo.
 *
 * Everything runs client-side (docxtemplater/pizzip/mammoth/jsPDF), on purpose:
 * no cloud provider (Drive, Dropbox, etc.) is required to use this feature.
 * Fidelity note: the docx→HTML→PDF conversion is good for text + logo/images
 * (the typical case for a contract template), but complex tables or elaborate
 * layouts may lose some visual fidelity compared to opening the file in Word.
 */

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import jsPDF from 'jspdf';

const DELIMITERS = { start: '{{', end: '}}' };

export interface TemplateAnalysis {
  fields: string[];
  conditions: string[];
}

// ─── Extraction ─────────────────────────────────────────────────────────────

/**
 * Detects every `{{champ}}` field and `{{#clause}}...{{/clause}}` conditional
 * section in an uploaded .docx. Uses docxtemplater's own parser (via
 * nullGetter) instead of a raw regex — Word frequently splits a single tag
 * across multiple XML text runs, which a naive regex over document.xml would
 * miss. Runs two passes: the first finds the conditional sections; the second
 * forces them all to `true` so fields nested inside a clause are also found
 * (a falsy section never gets its inner content visited by the parser).
 */
export async function analyzeTemplate(arrayBuffer: ArrayBuffer): Promise<TemplateAnalysis> {
  const conditions = new Set<string>();
  const fields = new Set<string>();

  const passOne = new Docxtemplater(new PizZip(arrayBuffer), {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: DELIMITERS,
    nullGetter: (part: any) => {
      if (part?.value && part.module === 'loop') conditions.add(String(part.value).trim());
      return '';
    },
  });
  passOne.render({});

  const forcedTrue: Record<string, boolean> = {};
  conditions.forEach((c) => { forcedTrue[c] = true; });

  const passTwo = new Docxtemplater(new PizZip(arrayBuffer), {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: DELIMITERS,
    nullGetter: (part: any) => {
      if (part?.value) fields.add(String(part.value).trim());
      return '';
    },
  });
  passTwo.render(forcedTrue);

  return { fields: Array.from(fields), conditions: Array.from(conditions) };
}

/** @deprecated use {@link analyzeTemplate} — kept only for call sites not yet migrated. */
export async function extractTemplateFields(arrayBuffer: ArrayBuffer): Promise<string[]> {
  return (await analyzeTemplate(arrayBuffer)).fields;
}

// ─── Fill ───────────────────────────────────────────────────────────────────

/**
 * Fills a template's `{{champ}}` fields and `{{#clause}}` conditions with
 * real values, returning a filled .docx Blob. `conditions` maps each detected
 * clause name to whether it should appear in the final document.
 */
export function fillTemplate(
  arrayBuffer: ArrayBuffer,
  values: Record<string, string>,
  conditions: Record<string, boolean> = {}
): Blob {
  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: DELIMITERS });
  doc.render({ ...values, ...conditions });
  return doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

// ─── Convert to PDF ─────────────────────────────────────────────────────────

/** Converts a filled .docx Blob to a PDF Blob (docx → HTML via mammoth → PDF via jsPDF). */
export async function convertDocxToPdf(docxBlob: Blob): Promise<Blob> {
  const arrayBuffer = await docxBlob.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

  // jsPDF's .html() renders a live DOM node (via html2canvas), so the
  // container has to be attached to the document while it renders.
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.width = '190mm';
  container.style.padding = '10mm';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  try {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    await new Promise<void>((resolve, reject) => {
      pdf.html(container, {
        callback: () => resolve(),
        x: 10,
        y: 10,
        width: 190,
        windowWidth: 720,
      });
      setTimeout(() => reject(new Error('PDF generation timed out')), 30000);
    });
    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}

/** End-to-end helper: fill a template (fields + conditions) and return the final signable PDF Blob. */
export async function generateFilledDocumentPdf(
  templateArrayBuffer: ArrayBuffer,
  values: Record<string, string>,
  conditions: Record<string, boolean> = {}
): Promise<Blob> {
  const filledDocx = fillTemplate(templateArrayBuffer, values, conditions);
  return convertDocxToPdf(filledDocx);
}

/** Raw base64 (no `data:...;base64,` prefix) — the format Google Drive's upload API expects. */
export async function blobToRawBase64(blob: Blob): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return dataUrl.split(',')[1] || '';
}
