import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import jsPDF from "jspdf";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getAdminAuth, getAdminDb, verifyRequestAuth } from "./src/lib/firebaseAdmin.js";
import { isSuperAdminEmail } from "./src/lib/superAdmin.js";
import {
  companyDocId,
  driveCredDocId,
  isAuthorizedForCompany,
  exchangeCodeForTokens,
  refreshAccessToken,
  getGoogleUserEmail,
  getOrCreateDriveFolderServer,
  resolveCompanyDriveFolder,
  uploadBase64ToDrive,
} from "./src/lib/googleDriveAdmin.js";

// Load .env BEFORE anything else — including SDK initialization
dotenv.config({ override: true });
console.log("[server.ts] dotenv loaded. GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY, "| Length:", process.env.GEMINI_API_KEY?.length ?? 0);

// ── Startup: list available models to confirm which names this key supports ──
(async () => {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) return;
  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1" } });
    const modelsPage = await ai.models.list();
    const names: string[] = [];
    for await (const m of modelsPage) { names.push(m.name ?? ""); }
    console.log("[server.ts] Available models for this API key:", names.filter(n => n.includes("gemini")));
  } catch (e: any) {
    console.error("[server.ts] Could not list models:", e?.message?.slice(0, 200));
  }
})();


// ── DocuLegal: compile the final certified PDF for a real multi-party ────────
// document (2+ named signers). Runs server-side because no single signer's
// browser ever has every OTHER signer's signature image — each one only
// persists their own to Firestore when they sign (see handleSign in
// PublicSignaturePage.tsx). Deliberately a single-column stacked layout
// (not a fixed 2-column "Partie 1/Partie 2" grid) since the signer count is
// variable.
function generateMultiPartyPdf(data: {
  docTitle: string;
  docSummary: string;
  companyName: string;
  token: string;
  customDocUrl?: string;
  signers: Array<{ name: string; email: string; signedDate: string; sigDataUrl: string; initialsDataUrl: string }>;
}): string | null {
  try {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, H = 297, M = 18;
    const green: [number, number, number] = [5, 150, 105];
    const PAGE_BOTTOM = 270;
    let y = 0;

    const addHeader = (isFirst: boolean) => {
      if (isFirst) {
        pdf.setFillColor(...green);
        pdf.rect(0, 0, W, 32, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("Helvetica", "bold");
        pdf.setFontSize(13);
        pdf.text(data.companyName.toUpperCase() || "AUTOCOMPT", M, 14);
        pdf.setFont("Helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text("DOCUMENT SIGNÉ — TOUTES LES PARTIES — DOCULEGAL (AUTOCOMPT)", M, 20);
        pdf.text(`Réf: ${data.token.slice(0, 16).toUpperCase()} · ${new Date().toLocaleDateString("fr-CA")}`, M, 26);
      } else {
        pdf.setFillColor(...green);
        pdf.rect(0, 0, W, 10, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("Helvetica", "normal");
        pdf.setFontSize(6.5);
        pdf.text(`${data.companyName.toUpperCase()} · ${data.docTitle}`, M, 6.5);
      }
    };

    const addFooter = () => {
      pdf.setFillColor(...green);
      pdf.rect(0, H - 12, W, 12, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.text("Document numérique certifié — DocuLegal by AutoCompt Canada", W / 2, H - 7, { align: "center" });
    };

    const newPage = () => {
      addFooter();
      pdf.addPage();
      addHeader(false);
      y = 18;
    };

    addHeader(true);
    y = 42;

    pdf.setTextColor(30, 41, 59);
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(data.docTitle, M, y);
    y += 7;
    pdf.setDrawColor(226, 232, 240);
    pdf.line(M, y, W - M, y);
    y += 8;

    if (data.customDocUrl) {
      pdf.setFont("Helvetica", "italic");
      pdf.setFontSize(8);
      pdf.setTextColor(79, 70, 229);
      pdf.textWithLink("Document original (format complet) : voir la pièce jointe transmise par courriel", M, y, { url: data.customDocUrl });
      y += 7;
    }

    pdf.setFont("Helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(71, 85, 105);
    const contentLines = pdf.splitTextToSize(data.docSummary || "", W - M * 2);
    for (const line of contentLines) {
      if (y > PAGE_BOTTOM) newPage();
      pdf.text(line, M, y);
      y += 6;
    }

    y += 6;
    if (y > PAGE_BOTTOM - 20) newPage();
    pdf.setDrawColor(226, 232, 240);
    pdf.line(M, y, W - M, y);
    y += 8;
    pdf.setTextColor(30, 41, 59);
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(`SIGNATURES ÉLECTRONIQUES — ${data.signers.length} PARTIE${data.signers.length > 1 ? "S" : ""}`, M, y);
    y += 10;

    for (const signer of data.signers) {
      const blockH = 42;
      if (y + blockH > PAGE_BOTTOM) newPage();

      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(M, y, W - M * 2, blockH, 4, 4, "FD");
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...green);
      pdf.text(signer.name, M + 6, y + 9);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(8);
      if (signer.email) pdf.text(`Courriel: ${signer.email}`, M + 6, y + 15);
      pdf.text(`Signé le: ${signer.signedDate}`, M + 6, y + 20);

      if (signer.sigDataUrl) {
        try { pdf.addImage(signer.sigDataUrl, "PNG", W - M - 60, y + 6, 54, 20); }
        catch {
          pdf.setFont("Times", "italic"); pdf.setFontSize(14);
          pdf.setTextColor(...green);
          pdf.text(signer.name, W - M - 33, y + 18, { align: "center" });
        }
      } else {
        pdf.setFont("Times", "italic"); pdf.setFontSize(14);
        pdf.setTextColor(...green);
        pdf.text(signer.name, W - M - 33, y + 18, { align: "center" });
      }
      y += blockH + 6;
    }

    if (y + 30 > PAGE_BOTTOM) newPage();
    pdf.setDrawColor(...green);
    pdf.setLineDashPattern([2, 1], 0);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(M, y, W - M * 2, 26, "FD");
    pdf.setLineDashPattern([], 0);
    pdf.setTextColor(...green);
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text("CERTIFICATION DOCULEGAL — DOCUMENT MULTI-PARTIES VALIDÉ", M + 4, y + 8);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont("Helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(`Ce document a été signé électroniquement par les ${data.signers.length} partie(s) via DocuLegal, une solution AutoCompt.`, M + 4, y + 14);
    pdf.text("Il constitue une preuve légale d'engagement enregistrée dans les registres sécurisés d'AutoCompt.", M + 4, y + 19);
    pdf.setFont("Courier", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Token: ${data.token.slice(0, 32).toUpperCase()}`, M + 4, y + 24);

    addFooter();

    try { return pdf.output("datauristring").split(",")[1]; }
    catch { return null; }
  } catch (err) {
    console.error("generateMultiPartyPdf error:", err);
    return null;
  }
}

// ── DocuLegal: burn every real signer's actual signature/initials/date/name ──
// directly onto the ORIGINAL uploaded PDF, at the exact spots the sender
// placed them in DocuLegalPdfEditor — the "sign right on the document, like
// DocuSign" experience requested 2026-08-12, instead of the old separate
// certificate-style PDF. xPct/yPct/wPct/hPct use the same top-left-origin,
// percentage-of-page convention as the on-screen field editor/viewer; PDF
// coordinates start bottom-left, hence the Y flip below.
async function generatePdfFieldOverlay(params: {
  pdfBytes: ArrayBuffer;
  token: string;
  companyName: string;
  signers: Array<{
    fields: Array<{ id: string; page: number; type: string; xPct: number; yPct: number; wPct: number; hPct: number }>;
    values: Record<string, { type: string; dataUrl?: string; text?: string }>;
  }>;
}): Promise<string | null> {
  try {
    const pdfDoc = await PDFDocument.load(params.pdfBytes);
    const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helvOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const green = rgb(5 / 255, 150 / 255, 105 / 255);

    for (const signer of params.signers) {
      for (const field of signer.fields) {
        const value = signer.values[field.id];
        if (!value) continue;
        const pageIndex = Math.max(0, (field.page || 1) - 1);
        const page = pdfDoc.getPage(Math.min(pageIndex, pdfDoc.getPageCount() - 1));
        const { width: pw, height: ph } = page.getSize();
        const xPt = (field.xPct / 100) * pw;
        const wPt = (field.wPct / 100) * pw;
        const hPt = (field.hPct / 100) * ph;
        const yPt = ph - (field.yPct / 100) * ph - hPt;

        if (value.dataUrl) {
          try {
            const base64 = value.dataUrl.split(",")[1] || "";
            const imgBytes = Buffer.from(base64, "base64");
            const img = await pdfDoc.embedPng(imgBytes);
            page.drawImage(img, { x: xPt, y: yPt, width: wPt, height: hPt });
          } catch (imgErr) {
            console.error("[generatePdfFieldOverlay] image embed failed:", imgErr);
          }
        } else if (value.text) {
          const fontSize = Math.max(7, Math.min(13, hPt * 0.5));
          page.drawText(value.text, {
            x: xPt + 2,
            y: yPt + hPt / 2 - fontSize / 3,
            size: fontSize,
            font: helvOblique,
            color: green,
          });
        }
      }
    }

    // ── Certification stamp on the last page ──────────────────────────────
    const lastPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
    const { width: pw } = lastPage.getSize();
    const stampY = 14;
    lastPage.drawRectangle({ x: 10, y: stampY - 4, width: pw - 20, height: 22, borderColor: green, borderWidth: 0.8, color: rgb(1, 1, 1), opacity: 0.9 });
    lastPage.drawText(
      `Document signé électroniquement via DocuLegal (AutoCompt) — ${params.companyName || ""} — Réf: ${params.token.slice(0, 24).toUpperCase()}`,
      { x: 14, y: stampY + 4, size: 6.5, font: helv, color: green },
    );

    const outBytes = await pdfDoc.save();
    return Buffer.from(outBytes).toString("base64");
  } catch (err) {
    console.error("generatePdfFieldOverlay error:", err);
    return null;
  }
}

// Builds the Express app with every route registered, but does NOT bind a
// port — Vercel imports this and wraps it as a serverless function handler
// (see the `handler` export at the bottom), since a long-lived `app.listen()`
// process has no meaning in that environment. Local dev / traditional hosting
// gets a real listening server from dev-server.ts, which wraps this app with
// Vite's dev middleware / static file serving.
//
// IMPORTANT: this file must never import "vite" (statically OR dynamically)
// — Vercel's function bundler traces it in regardless, and Vite pulls in
// Rollup's platform-specific optional native binary, which isn't present in
// the Lambda runtime and crashes every request with
// "Cannot find module @rollup/rollup-linux-x64-gnu". That's exactly what
// broke this endpoint in production; keep the dev-only pieces in
// dev-server.ts, never here.
export async function buildApp() {
  const app = express();

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Gemini API route
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, currentForfeit } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      const lastUserMessage = messages[messages.length - 1]?.content || "";
      const lower = lastUserMessage.toLowerCase();

      // Detect language from user message: Français, English, Español
      let detectedLang: "fr" | "en" | "es" = "fr";
      if (lower.match(/\b(hi\b|hello\b|how\b|bookkeeping\b|tax\b|deduction\b|english\b|amortization\b|income\b|receipt\b|upload\b)/)) {
        detectedLang = "en";
      } else if (lower.match(/\b(hola\b|buenos\b|como\b|deducciones\b|impuestos\b|gasto\b|espanol\b|propiedad\b|factura\b|clases\b)/)) {
        detectedLang = "es";
      }

      // Billing or limit question detection to apply customer psychology of "moins qu'un café par jour"
      const isBillingOrLimit = lower.match(/\b(facturation|facture|limite|bloqué|bloque|abonnement|forfait|prix|tarif|payer|paywall|upgrade|seuil|unite|porte|coût|frais|dépense|depasse|dépassé|bancaire|doculegal)\b/);

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        // Fallback mock AI responses when API key is not configured, matching prompt requirements
        let reply = "";

        if (isBillingOrLimit) {
          if (detectedLang === "en") {
            reply = "I understand you have reached a limit or have a question about billing. It is a wonderful sign of your growing real estate investments! Upgrading to the higher tier costs less than a cup of coffee per day, yet it fully unlocks automatic banking synchronization, advanced tax reporting, and document audit features. It's a small, stress-free investment for peace of mind!";
          } else if (detectedLang === "es") {
            reply = "Entiendo que ha alcanzado un límite o tiene preguntas sobre la facturación. ¡Es una fantástica señal de crecimiento para sus activos! Actualizar al plan superior cuesta menos que un café al día, pero desbloquea la sincronización bancaria automática, informes avanzados y auditoría fiscal de documentos. ¡Una pequeña inversión para asegurar su tranquilidad fiscal!";
          } else {
            reply = "Je comprends tout à fait que vous fassiez face à une limite ou que vous ayez des questions de facturation. C'est une excellente nouvelle qui montre que votre parc immobilier grandit ! Pour continuer sur cette lancée, passer au forfait supérieur représente un investissement dérisoire de moins qu'un café par jour. En échange, vous débloquez l'automatisation complète de votre comptabilité, l'accès à DocuLégal et des rapports avancés. C'est un choix serein et ultra-rentable pour optimiser votre fiscalité immobilière sans stress !";
          }
          return res.json({ reply });
        }

        if (currentForfeit !== "Pro") {
          // System prompt of sales agent
          if (lower.includes("déduction") || lower.includes("impôt") || lower.includes("fiscal") || lower.includes("immeuble") || lower.includes("complex") || lower.includes("amortissement") || lower.includes("deduction") || lower.includes("tax") || lower.includes("deducción") || lower.includes("impuesto")) {
            if (detectedLang === "en") {
              reply = "To automate your bookkeeping and analyze your deductions, upgrade to the AutoCompt Pro plan.";
            } else if (detectedLang === "es") {
              reply = "Para automatizar su contabilidad y analizar sus deducciones, cámbiese al plan AutoCompt Pro.";
            } else {
              reply = "Pour automatiser votre comptabilité et analyser vos déductions, passez au forfait AutoCompt Pro.";
            }
          } else {
            if (detectedLang === "en") {
              reply = `Hello! I am Sofi, a virtual assistant specializing in bookkeeping organization. I see you are currently using the ${currentForfeit} plan. Note that our Pro Plan unlocks complete custom organization and preparation of your real estate tax files! Please note: I am a virtual assistant and do not replace a real CPA; my role is simply to help you organize and prepare your records.`;
            } else if (detectedLang === "es") {
              reply = `¡Hola! Soy Sofi, una asistente virtual especializada en organización contable. Veo que estás utilizando el plan ${currentForfeit}. ¡Ten en cuenta que nuestro Plan Pro desbloquea la preparación y organización de tus archivos de impuestos inmobiliarios! Nota: Soy una asistente virtual y no reemplazo a un CPA real; mi función es simplemente ayudarte a organizar y preparar tus registros.`;
            } else {
              reply = `Bonjour! Je suis Sofi, assistante virtuelle spécialisée en organisation comptable d'AutoCompt. Je constate que vous utilisez actuellement le forfait ` + currentForfeit + `. Sachez que notre Forfait Pro déverrouille l'aide à l'organisation complète de vos dossiers d'impôts immobiliers par notre IA! Clause de non-responsabilité : Je ne remplace pas un véritable CPA et j'aide simplement à préparer les dossiers.`;
            }
          }
        } else {
          // Pro: expert assistant specializing in bookkeeping prep
          if (lower.includes("peinture") || lower.includes("peindre") || lower.includes("paint") || lower.includes("pintar") || lower.includes("pintura")) {
            if (detectedLang === "en") {
              reply = "As an AutoCompt Pro virtual assistant specializing in bookkeeping organization (note: I do not replace a real CPA, I help organize and prepare your files), I can guide you that painting works on your Triplex in Laval are usually considered current maintenance and repair expenses, which are 100% deductible in the current fiscal year (Quebec TP-128 form).";
            } else if (detectedLang === "es") {
              reply = "Como asistente virtual de AutoCompt Pro especializada en organización contable (nota: no reemplazo a un CPA real, solo ayudo a organizar y preparar sus archivos), le informo que los trabajos de pintura en su Triplex en Laval se consideran comúnmente gastos corrientes de mantenimiento y reparación, deducibles al 100% en el año fiscal en curso (formulario TP-128 de Quebec).";
            } else {
              reply = "En tant qu'assistante virtuelle spécialisée en organisation comptable AutoCompt Pro (clause de non-responsabilité : je ne remplace pas un véritable CPA et j'aide simplement à préparer les dossiers), je confirme que les travaux de peinture sur votre Triplex à Laval sont considérés comme des dépenses courantes d'entretien et réparations déductibles à 100% sur l'exercice en cours (Formulaire TP-128 du Québec).";
            }
          } else if (lower.includes("déduction") || lower.includes("immeuble") || lower.includes("plex") || lower.includes("amortissement") || lower.includes("deducción") || lower.includes("impuesto") || lower.includes("deduction") || lower.includes("tax")) {
            if (detectedLang === "en") {
              reply = "For income-generating properties (Plex or Triplex), you can organize deductible expenses like depreciation (Capital Cost Allowance/CCA) on the building cost (but not the land), mortgage interest, municipal and school taxes, building insurance, and management fees. My virtual assistance recommendation is to organize your current maintenance expenses to limit your immediate taxable net income while keeping all your classified digital receipts. Disclaimer: I do not replace a real CPA, I simply help prepare documents.";
            } else if (detectedLang === "es") {
              reply = "Para propiedades que generan ingresos (Plex o Triplex), puede organizar gastos deducibles como la depreciación (DPA) sobre el costo del edificio (excluyendo el terreno), los intereses de la hipoteca, impuestos municipales y escolares, seguro del edificio y honorarios de administración. Mi recomendación es organizar sus gastos corrientes de mantenimiento para limitar sus ingresos netos imponibles inmediatos conservando todos sus recibos digitales. Disclaimer: No reemplazo a un CPA real.";
            } else {
              reply = "Pour les immeubles à revenus (Plex ou Triplex), vous pouvez organiser vos dépenses déductibles comme l'amortissement (DPA) sur le coût du bâtiment (mais pas le terrain), les intérêts hypothécaires, les taxes municipales et scolaires, les assurances de l'immeuble, et les frais de gestion. Ma recommandation d'organisation est de maximiser vos dépenses d'entretien courantes pour limiter votre revenu net imposable immédiat tout en conservant vos reçus numériques classifiés. Clause de non-responsabilité : je ne remplace pas un véritable CPA et j'aide simplement à préparer les dossiers.";
            }
          } else {
            if (detectedLang === "en") {
              reply = "Hello! As an AutoCompt Pro virtual assistant specializing in bookkeeping organization, I am at your entire disposal to help you organize your Canadian/Quebec real estate records. Ask me your questions about organizing forms TP-128, T776, management fees, or depreciation records. Note: I do not replace a real CPA.";
            } else if (detectedLang === "es") {
              reply = "¡Hola! Como asistente virtual de AutoCompt Pro especializada en organización contable, estoy a su entera disposición para ayudarle a organizar sus registros de bienes raíces en Quebec y Canadá. Hágame sus preguntas específicas sobre la preparación de los formularios TP-128, T776, honorarios de administración o registros de depreciación. Nota: No reemplazo a un CPA real.";
            } else {
              reply = "Bonjour ! En tant qu'assistante virtuelle spécialisée en organisation comptable AutoCompt Pro, je suis à votre entière disposition pour vous aider dans l'organisation de votre fiscalité immobilière québécoise. Posez-moi vos questions sur la préparation de vos formulaires TP-128, T776, frais de gestion ou calculs d'amortissement. Clause de non-responsabilité : je ne remplace pas un véritable CPA et j'aide simplement à préparer les dossiers.";
            }
          }
        }

        return res.json({ reply });
      }

      // Real Gemini API call using @google/genai SDK — v1beta, not v1: this
      // endpoint is the only Gemini caller in the app that sets
      // systemInstruction (Sofi's persona/rules), and v1 rejects any request
      // containing it with "Developer instruction is not enabled for api
      // version v1" — every single chat message failed on this, 100% of the
      // time, regardless of content. The scan-* endpoints don't use
      // systemInstruction and stay on v1 (unchanged, already working).
      const ai = new GoogleGenAI({ apiKey: apiKey, httpOptions: { apiVersion: "v1beta" } });

      // Hard topic scope-lock — Sofi must stay on AutoCompt / bookkeeping /
      // Quebec real estate tax organization. Prepended to every system prompt
      // so off-topic requests (recipes, general chit-chat, unrelated coding
      // help, etc.) get politely declined instead of answered.
      const SCOPE_GUARDRAIL =
        "RÈGLE ABSOLUE DE PÉRIMÈTRE : tu ne réponds JAMAIS à une question hors du périmètre d'AutoCompt. Ton périmètre autorisé est strictement : (1) comment utiliser l'application AutoCompt (navigation, boutons, où trouver une fonctionnalité), (2) où et comment classer/enregistrer une facture, un reçu ou un document, (3) l'organisation comptable et fiscale immobilière au Québec (catégories de dépenses, TPS/TVQ, formulaires TP-128/T776, amortissement, etc.), (4) la facturation et les forfaits AutoCompt. " +
        "Si l'utilisateur pose une question hors de ce périmètre (recettes de cuisine, actualités, programmation générale, sujets personnels, ou tout autre sujet sans rapport), décline poliment et brièvement en rappelant que tu es uniquement l'assistante comptable d'AutoCompt, puis propose de l'aider avec l'application ou sa comptabilité. Ne donne jamais de réponse sur le sujet hors-périmètre lui-même, même partiellement. ";

      // The exact, real category list used by AutoCompt's expense forms —
      // without this, Sofi reasons in the abstract about what a category
      // "should" be called and invents plausible-sounding names (e.g.
      // "Frais postaux et de messagerie") that don't actually exist in the
      // app, sending the user hunting for a dropdown option that was never
      // there. Keep this in sync with the <option> lists in App.tsx.
      const CATEGORY_GUARDRAIL =
        "RÈGLE ABSOLUE DE CATÉGORIES : quand tu recommandes dans quelle catégorie classer une dépense, tu dois TOUJOURS choisir parmi cette liste EXACTE (ce sont les seules options qui existent réellement dans le menu déroulant d'AutoCompt) et ne jamais inventer ou reformuler un nom de catégorie : " +
        "Réparations et entretien, Assurances, Intérêts hypothécaires, Intérêts de financement (Hypothèque/Marge/Prêt), Capital remboursé (non déductible), Électricité / Chauffage, Taxes foncières et scolaires, Honoraires professionnels, Frais de gestion / Marketing, Fournitures de bureau, Essence / Carburant, Entretien Véhicule, Assurance auto, Déplacements / Automobile, Immatriculation / Permis, Autre. " +
        "Un envoi postal/courrier lié à la gestion locative (avis, mise en demeure, etc.) va dans « Frais de gestion / Marketing ». Si aucune catégorie ne correspond clairement, recommande « Autre » plutôt que d'inventer un nom qui n'existe pas dans l'application. " +
        "IMPORTANT — CES NOMS SONT DES VALEURS LITTÉRALES DU MENU, PAS DU TEXTE À TRADUIRE : même si tu réponds en espagnol ou en anglais parce que l'utilisateur écrit dans cette langue, tu dois citer le nom de catégorie EXACTEMENT tel qu'il est écrit ci-dessus, en français, sans le traduire ni le reformuler (par exemple, ne dis jamais « Administración y Gastos Legales » ou « Communications » — dis « Frais de gestion / Marketing », entre guillemets, tel quel) — sinon l'utilisateur ne le retrouvera pas dans le menu déroulant réel de l'application, qui n'existe qu'en français.";

      // Sans ceci, Sofi raisonne dans l'abstrait sur ce qu'une app de
      // comptabilité "devrait" avoir et invente/nie des fonctionnalités.
      // Trouvé 2026-08-21 (Fabiola) : demandé comment signer un document,
      // Sofi a répondu que ce n'est pas possible dans AutoCompt — pire, une
      // deuxième fois elle a dit que "DocuLegal" est un outil EXTERNE, hors
      // de son périmètre, alors que c'est un module d'AutoCompt lui-même.
      const MODULE_GUARDRAIL =
        "RÈGLE ABSOLUE DE MODULES : voici les VRAIS modules qui existent DANS AutoCompt (ne dis jamais que l'un d'eux est un outil externe, et ne nie jamais qu'une de ces fonctionnalités existe) : " +
        "DocuLegal — module de signature électronique DANS AutoCompt : on y crée un document (baux, contrats de gestion, avis, Relevé 31...), on ajoute les signataires, et ils signent électroniquement depuis un lien reçu par courriel/SMS — oui, on PEUT signer des documents dans AutoCompt, via DocuLegal. " +
        "Compte en Fidéicommis — suivi des dépôts/retraits de loyers en fidéicommis (Gestionnaire), génère le Mandat de Gestion. " +
        "Facturation — création et envoi de factures aux clients. " +
        "Tenue de Livres — registre des revenus/dépenses, avec un Scanner IA pour classer les reçus automatiquement. " +
        "Gestion Immobilière — gestion des immeubles et de leurs unités/logements. " +
        "TPS/TVQ — suivi de l'inscription et des remises de taxes (Gestionnaire, si inscrit). " +
        "Dossiers Fiscaux — clôture annuelle et assistant de préparation du Relevé 31 (préparation seulement — le vrai formulaire officiel se produit sur revenuquebec.ca). " +
        "Taxes & Assurances — suivi des taxes municipales/scolaires et assurances par propriété. " +
        "Conciliation — rapprochement bancaire. " +
        "Heures & Paie — registre de paie des employés/concierges : saisie manuelle du salaire (brut/déductions/net), OU import d'un rapport de paie déjà calculé par un tiers (Nethris, etc.) via extraction IA — AutoCompt ne calcule PAS les heures travaillées ni les salaires elle-même, ce module ne fait que consigner/organiser des montants déjà déterminés ailleurs. " +
        "Portefeuille Clients — vue consolidée des clients (Gestionnaire/Comptable). " +
        "Si une question porte sur une fonctionnalité qui n'est PAS dans cette liste et que tu n'es pas sûre qu'elle existe, dis que tu n'es pas certaine plutôt que d'inventer une réponse ferme (oui ou non).";

      let systemInstruction = "";
      if (currentForfeit !== "Pro") {
        systemInstruction =
          SCOPE_GUARDRAIL +
          CATEGORY_GUARDRAIL +
          MODULE_GUARDRAIL +
          "Tu es Sofi, une assistante de vente d'AutoCompt et assistante virtuelle spécialisée en organisation comptable. Tu es une assistante multilingue. Tu dois détecter automatiquement la langue de l'utilisateur (Français, Anglais, Espagnol) et répondre dans cette même langue. Ton but est d'agir comme une assistante et de pousser l'utilisateur à s'abonner au forfait Pro d'AutoCompt. " +
          "Pour toute question fiscale complexe, d'amortissement, d'optimisation d'impôts ou de déduction d'immeubles, tu devez ABSOLUMENT et uniquement répondre avec l'équivalent de cette phrase exacte dans la langue détectée : " +
          "En Français : \"Pour automatiser votre comptabilité et analyser vos déductions, passez au forfait AutoCompt Pro.\", " +
          "En Anglais : \"To automate your bookkeeping and analyze your deductions, upgrade to the AutoCompt Pro plan.\", " +
          "En Espagnol : \"Para automatizar su contabilidad y analizar sus deducciones, cámbiese al plan AutoCompt Pro.\" " +
          "Si l'utilisateur pose une question de facturation, de seuil, de limite ou d'abonnement bloqué, explique poliment les avantages du forfait supérieur en utilisant la psychologie du 'moins qu'un café par jour' pour dédramatiser l'investissement. " +
          "Rappelle toujours gentiment à l'utilisateur que tu es une assistante virtuelle d'organisation comptable, que tu ne remplaces pas un véritable CPA, et que tu l'aides simplement à organiser et trier ses documents.";
      } else {
        systemInstruction =
          SCOPE_GUARDRAIL +
          CATEGORY_GUARDRAIL +
          MODULE_GUARDRAIL +
          "Tu es Sofi, assistante virtuelle spécialisée en organisation comptable pour AutoCompt, et assistante multilingue. Tu ne remplaces pas un véritable CPA et ton rôle consiste uniquement à aider avec plaisir à préparer et à organiser de manière structurée les rapports et les justificatifs comptables. " +
          "Tu devez détecter automatiquement la langue de l'utilisateur (Français, Anglais, Espagnol) et répondre dans cette même langue. " +
          "Tu es capable de répondre de façon extrêmement précise pour aider à l'organisation des stratégies de dépenses, les déductions fiscales d'usage, le classement des reçus, des baux, " +
          "les formulaires fiscaux TP-128 et T776, l'amortissement (DPA), les intérêts sur emprunt et les dépenses d'entretien (peinture, etc.). " +
          "Si l'utilisateur pose une question de facturation, de limite d'unités ou de bannières d'abonnement bloqué, tu dois lui expliquer calmement les avantages du forfait supérieur en insistant sur le fait que cela représente moins d'un café par jour pour une automatisation complète et un gain de temps fantastique. " +
          "Rappelle systématiquement ou indique clairement dans tes explications (via une clause de non-responsabilité) que tu agis en tant qu'assistante d'organisation comptable, que tu ne remplaces pas un véritable CPA et que tu aides simplement à préparer les dossiers.";
      }

      // Format messages history for Gemini API — everything BEFORE the
      // current message, since the current one is sent separately below via
      // sendMessage(). Trouvé 2026-08-21 (Fabiola) : ce tableau était calculé
      // mais jamais passé à ai.chats.create(), donc chaque message ouvrait
      // une session Gemini toute neuve sans aucune mémoire des tours
      // précédents — Sofi "perdait le fil" de la conversation à chaque
      // réponse (ex : elle propose de l'aide, l'utilisateur répond "oui",
      // et ce "oui" arrive sans aucun contexte de ce qui a été proposé).
      // Gemini requires history to start with a 'user' turn — the client's
      // chat always opens with a canned "Bonjour, je suis Sofi..." assistant
      // greeting as messages[0], so that (and any other leading assistant
      // message) must be dropped, not just the current message.
      const chatHistoryRaw = messages.slice(0, -1).map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));
      const firstUserIdx = chatHistoryRaw.findIndex((m) => m.role === "user");
      const chatHistory = firstUserIdx === -1 ? [] : chatHistoryRaw.slice(firstUserIdx);

      // Create Chat
      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemInstruction,
        },
        history: chatHistory,
      });

      // Send the latest user query
      const lastMessageText = messages[messages.length - 1]?.content || "Bonjour";
      const response = await chat.sendMessage({ message: lastMessageText });

      return res.json({ reply: response.text });

    } catch (error: any) {
      console.error("Gemini API Error in backend:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Real-time AI Scan receipt parser endpoint with dynamic fallback parsing
  app.post("/api/scan", async (req, res) => {
    try {
      const { base64Data, mimeType, filename } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      /**
       * parseCurrency – robust parser for any currency string from Gemini.
       * Strategy: strip EVERYTHING except digits, commas, and dots.
       * Then decide if the last separator is a decimal mark.
       * Handles: "471,40 $" / "$ 229.95" / "1 234,56 $" / "1,234.56" / 229.95
       * Returns 0 for null / undefined / empty / non-numeric input.
       */
      const parseCurrency = (raw: any): number => {
        if (raw == null) return 0;
        // Already a JS number — just round to 2dp
        if (typeof raw === 'number') return isFinite(raw) ? Math.round(raw * 100) / 100 : 0;
        // Strip everything except digits, comma, dot
        const stripped = String(raw).replace(/[^0-9.,]/g, '');
        if (!stripped) return 0;
        // Find the last comma or dot — treat it as the decimal separator
        const lastComma = stripped.lastIndexOf(',');
        const lastDot = stripped.lastIndexOf('.');
        const lastSep = Math.max(lastComma, lastDot);
        let normalised: string;
        if (lastSep === -1) {
          normalised = stripped;
        } else if (lastSep === lastComma) {
          // Last separator is a comma → francophone decimal  e.g. "471,40"
          normalised = stripped.replace(/\./g, '').replace(',', '.');
        } else {
          // Last separator is a dot → dot-decimal  e.g. "1,234.56"
          normalised = stripped.replace(/,/g, '');
        }
        const result = parseFloat(normalised);
        return isFinite(result) ? Math.round(result * 100) / 100 : 0;
      };

      // 1. DYNAMIC REGEX & FUZZY-MATCHING FROM METADATA (Fallback / dynamic extraction)
      let detectedSupplier = "Amazon Business";
      let detectedDate = new Date().toISOString().split('T')[0];
      let detectedSubtotal = 0;
      let detectedCategory = "À classer";

      const nameLower = (filename || "").toLowerCase();

      // Dynamic Supplier & Category recognition based on common accounting tags
      if (nameLower.includes("home") || nameLower.includes("depot") || nameLower.includes("quincaillerie") || nameLower.includes("canac") || nameLower.includes("rona") || nameLower.includes("brico") || nameLower.includes("renov") || nameLower.includes("hardware")) {
        detectedSupplier = "Home Depot";
        detectedCategory = "Réparations / Entretien";
      } else if (nameLower.includes("bell") || nameLower.includes("videotron") || nameLower.includes("telus") || nameLower.includes("fido") || nameLower.includes("rogers") || nameLower.includes("telecom")) {
        detectedSupplier = nameLower.includes("bell") ? "Bell" : nameLower.includes("videotron") ? "Videotron" : "Telecom Corp";
        detectedCategory = "Télécommunications";
      } else if (nameLower.includes("hydro") || nameLower.includes("quebec") || nameLower.includes("hydroquebec") || nameLower.includes("electricite") || nameLower.includes("electricity")) {
        detectedSupplier = "Hydro-Québec";
        detectedCategory = "Electricité";
      } else if (nameLower.includes("tax")) {
        detectedSupplier = "Taxes Municipales";
        detectedCategory = "Taxes";
      } else if (nameLower.includes("assurance") || nameLower.includes("insurance")) {
        detectedSupplier = "Assurances Immeuble";
        detectedCategory = "Assurance";
      } else if (nameLower.includes("apple") || nameLower.includes("bureau en gros") || nameLower.includes("staples") || nameLower.includes("bestbuy") || nameLower.includes("computer")) {
        detectedSupplier = nameLower.includes("apple") ? "Apple Store" : "Bureau en Gros";
        detectedCategory = "Équipement";
      } else if (nameLower.includes("amazon")) {
        detectedSupplier = "Amazon Business";
        detectedCategory = "À classer";
      } else {
        // Dynamic extraction of supplier name from filename if no match is found
        const cleanName = (filename || "").replace(/\.[^/.]+$/, ""); // strip extension
        const parts = cleanName.split(/[_\-\s+]+/);
        const candidates = parts.filter(p => p.length > 2 && !p.match(/\b(facture|invoice|scanned|photo|img|pdf|scan|2026|2025|doc|bill)\b/i));
        if (candidates.length > 0) {
          detectedSupplier = candidates[0].charAt(0).toUpperCase() + candidates[0].slice(1);
        }
      }

      // Dynamic parsing of decimal money figures from the filename (e.g. '_145.20', 'rona_55_95.jpg')
      const moneyMatches = nameLower.match(/(\d+[\.,]\d{2})/g);
      if (moneyMatches && moneyMatches.length > 0) {
        const parsedVal = parseFloat(moneyMatches[moneyMatches.length - 1].replace(',', '.'));
        if (parsedVal > 0) {
          detectedSubtotal = parsedVal;
        }
      } else {
        const simpleDigitMatches = nameLower.match(/(\d+)\s*$/); // matches straight integers near end
        if (simpleDigitMatches) {
          const parsedVal = parseInt(simpleDigitMatches[1], 10);
          if (parsedVal > 0 && parsedVal < 100000) {
            detectedSubtotal = parsedVal;
          }
        }
      }

      // Dynamic parsing of ISO dates YYYY-MM-DD or YY-MM-DD
      const dateMatch = nameLower.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
      if (dateMatch) {
        detectedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      } else {
        const shortDateMatch = nameLower.match(/(\d{2})[-_](\d{2})[-_](\d{2})/);
        if (shortDateMatch && shortDateMatch[1].startsWith('2')) {
          detectedDate = `20${shortDateMatch[1]}-${shortDateMatch[2]}-${shortDateMatch[3]}`;
        }
      }

      // Match precise Québec tax structure breakdown (TPS 5% & TVQ 9.975%)
      const calculatedTps = parseFloat((detectedSubtotal * 0.05).toFixed(2));
      const calculatedTvq = parseFloat((detectedSubtotal * 0.09975).toFixed(2));
      const calculatedTotal = parseFloat((detectedSubtotal + calculatedTps + calculatedTvq).toFixed(2));

      const fallbackResult = {
        supplier: detectedSupplier,
        date: detectedDate,
        subtotal: parseFloat(detectedSubtotal.toFixed(2)),
        tps: calculatedTps,
        tvq: calculatedTvq,
        total: calculatedTotal,
        category: detectedCategory,
        propertyAddress: null as string | null,
      };

      // 2. REAL GEMINI EXTRACTION — diagnostic logging to surface exact failures
      const apiKeyRaw = process.env.GEMINI_API_KEY ?? "";
      const apiKeyOk = apiKeyRaw.trim() !== "" && apiKeyRaw !== "MY_GEMINI_API_KEY";
      console.log(`[S.O.F.I. Scanner] /api/scan called — file: "${filename}", mimeType: "${mimeType}", base64 bytes: ${base64Data?.length ?? 0}`);
      console.log(`[S.O.F.I. Scanner] API key present: ${apiKeyOk} | Key prefix: ${apiKeyRaw.slice(0, 8)}... | base64 present: ${!!base64Data}`);

      if (apiKeyOk && base64Data) {
        const ai = new GoogleGenAI({ apiKey: apiKeyRaw, httpOptions: { apiVersion: "v1" } });
        const isPdf = (mimeType || "").toLowerCase() === "application/pdf";

        console.log(`[S.O.F.I. Scanner] Gemini extraction — type: ${isPdf ? "PDF (Files API)" : "Image (inlineData)"}, file: ${filename}`);

        const extractionPrompt = `ROLE: Act as an expert, highly precise fiscal auditor for Quebec real estate.
Analyze this receipt or invoice document. Extract the following and return ONLY valid JSON.
ZERO HALLUCINATION RULE: Extract ONLY exact text/numbers printed on the document. Never invent names or amounts.

JSON schema to return:
{
  "supplier": string,   // Legal company/vendor name (who issued/sold this). null if unreadable.
  "date": string,       // Transaction date YYYY-MM-DD. Use "${detectedDate}" if not found.
  "subtotal": number,   // Net amount before taxes (CAD). Never invent.
  "tps": number,        // GST/TPS (5%) amount. Calculate as subtotal*0.05 if not printed.
  "tvq": number,        // QST/TVQ (9.975%) amount. Calculate as subtotal*0.09975 if not printed.
  "total": number,      // Grand total all-taxes-included (CAD). Never invent.
  "category": string,   // One of: ["À classer","Télécommunications","Bureau à domicile","Équipement","Réparations / Entretien","Rénovation / Construction","Taxes","Assurance","Chauffage","Electricité","Frais de gestion / Exploitation","Essence / Carburant","Entretien Véhicule","Assurance auto","Déplacements / Automobile","Immatriculation / Permis"]
  // Vehicle rule: gas/essence/carburant, car repairs/garage/pneus, car insurance, and SAAQ/immatriculation charges are VEHICLE expenses — never "Frais de gestion / Exploitation" (that category is for property management/admin fees only, not vehicle costs).
  // Parking rule (depends on purpose, per Quebec real-estate accounting practice):
  //   - Meter, short-term/temporary lot (e.g. "Stationnement de Montréal", Indigo, Vinci), or any SMALL one-off amount (a few hours, under ~$30) => "Déplacements / Automobile" (this is a work-trip cost: showing a property, meeting a client, notary signing, property visit).
  //   - RECURRING monthly charge for a FIXED reserved spot at the business's own office/agency (higher amount, e.g. $100-$250, from a property-management/parking-management company, billed monthly) => "Frais de gestion / Exploitation" instead (it's an office/operating cost, not a trip).
  //   - When genuinely ambiguous between these two, prefer "Déplacements / Automobile" (the more common real-estate case) but this is exactly the kind of borderline call the human should double-check — do not guess confidently.
  "propertyAddress": string | null  // The PROPERTY/CIVIC ADDRESS this document concerns (e.g. the address on a municipal tax bill, insurance policy, or utility bill) — NOT the supplier's own business address. Only fill this when a real property address is printed on the document (street + city). If the document doesn't reference a specific property (e.g. a generic retail receipt), return null. Never confuse a municipality/city name alone with a full address — only return it if it's part of a real civic address.
}`;

        let documentPart: any;

        if (isPdf) {
          // ── PDF via inlineData: Gemini 1.5-flash/2.0-flash support PDFs directly ──
          // We avoid the Files API (FileService.CreateFile) which is blocked on this project.
          // Per Google docs: inlineData accepts application/pdf up to 20MB inline.
          console.log(`[S.O.F.I. Scanner] Sending PDF as inlineData (${Math.round(base64Data.length * 0.75 / 1024)}KB)`);
          documentPart = {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data,
            },
          };
        } else {
          // ── Image: inlineData path (JPEG, PNG, WebP) ───────────────────────────
          documentPart = { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Data } };
        }


        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [documentPart, { text: extractionPrompt }] }],
          });

          const rawText = response.text ?? "";
          console.log("[S.O.F.I. Scanner] 📤 RAW Gemini response (" + rawText.length + " chars):", JSON.stringify(rawText.slice(0, 500)));

          if (rawText) {
            // Strip markdown code fences that Gemini sometimes wraps around JSON
            let cleanText = rawText.trim();
            if (cleanText.startsWith("```")) {
              cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
            }
            try {
              const parsed = JSON.parse(cleanText);
              const ocrResult = {
                supplier: parsed.supplier || fallbackResult.supplier,
                date: parsed.date || fallbackResult.date,
                subtotal: (parsed.subtotal != null && parsed.subtotal !== '') ? parseCurrency(parsed.subtotal) : fallbackResult.subtotal,
                tps: (parsed.tps != null && parsed.tps !== '') ? parseCurrency(parsed.tps) : fallbackResult.tps,
                tvq: (parsed.tvq != null && parsed.tvq !== '') ? parseCurrency(parsed.tvq) : fallbackResult.tvq,
                total: (parsed.total != null && parsed.total !== '') ? parseCurrency(parsed.total) : fallbackResult.total,
                category: parsed.category || fallbackResult.category,
                propertyAddress: (typeof parsed.propertyAddress === 'string' && parsed.propertyAddress.trim()) ? parsed.propertyAddress.trim() : null,
              };
              console.log("[S.O.F.I. Scanner] ✅ Parsed result:", ocrResult);
              return res.json(ocrResult);
            } catch (parseErr: any) {
              console.error("[S.O.F.I. Scanner] ❌ JSON.parse failed. cleanText was:", JSON.stringify(cleanText.slice(0, 300)));
              console.error("[S.O.F.I. Scanner] Parse error:", parseErr?.message);
            }
          } else {
            console.warn("[S.O.F.I. Scanner] ⚠️ Gemini returned empty text.");
          }
        } catch (geminiErr: any) {
          console.error("[S.O.F.I. Scanner] ❌ Gemini generateContent FAILED — FULL ERROR DUMP:");
          console.error("  message     :", geminiErr?.message);
          console.error("  status      :", geminiErr?.status);
          console.error("  statusText  :", geminiErr?.statusText);
          console.error("  errorDetails:", JSON.stringify(geminiErr?.errorDetails ?? geminiErr?.details ?? null));
          console.error("  body        :", JSON.stringify(geminiErr?.body ?? null));
          console.error("  response    :", JSON.stringify(geminiErr?.response ?? null));
          console.error("  stack       :", geminiErr?.stack?.slice(0, 600));
          console.error("  toString    :", String(geminiErr));
          try { console.error("  full JSON   :", JSON.stringify(geminiErr, Object.getOwnPropertyNames(geminiErr))); } catch { }
          console.error("[S.O.F.I. Scanner] ⚠️ Falling back to filename-based extraction.");
        }
      } else {
        if (!apiKeyOk) console.error("[S.O.F.I. Scanner] ❌ API key missing or invalid — check GEMINI_API_KEY in .env");
        if (!base64Data) console.error("[S.O.F.I. Scanner] ❌ No base64 document data received");
      }

      console.log("[S.O.F.I. Scanner] Returning fallback result:", fallbackResult);
      return res.json(fallbackResult);
    } catch (e: any) {
      console.error("API Scanner parser error, returning secure fallback:", e);
      res.status(200).json({
        supplier: "Fournisseur inconnu",
        date: new Date().toISOString().split('T')[0],
        subtotal: 0,
        tps: 0,
        tvq: 0,
        total: 0,
        category: "À classer"
      });
    }
  });

  // ── S.O.F.I. Dimensions Scanner: extracts superficie_totale & superficie_personnelle ──
  app.post("/api/scan-dimensions", async (req, res) => {
    try {
      const { base64Data, mimeType, filename } = req.body;
      const apiKey = process.env.GEMINI_API_KEY ?? "";

      // Shape returned by this endpoint — mirrors the Gemini prompt's JSON exactly.
      const emptyResult = () => ({
        adresse_propriete: "",
        adresse_proprietaire: "",
        proprietaires: [] as string[],
        est_proprietaire_occupant: false,
        nombre_unites_total: 0,
        unites_identifiees: [] as string[],
        superficie_totale_pi2: 0,
        valeur_terrain: 0,
        valeur_batiment: 0,
        numero_lot: "",
      });

      if (!apiKey || !base64Data) {
        return res.status(200).json(emptyResult());
      }

      // safeInt: converts any value (number, string, null) to a rounded integer ≥ 0
      const safeInt = (val: any): number => {
        if (val == null) return 0;
        if (typeof val === 'number') return isFinite(val) && val > 0 ? Math.round(val) : 0;
        // Handle Quebec comma-decimal strings like "402,100" → 402.1
        const clean = String(val).replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
        const n = parseFloat(clean);
        return isFinite(n) && n > 0 ? Math.round(n) : 0;
      };

      // safeStr: converts any value to a trimmed string, defaulting to "".
      const safeStr = (val: any): string => (val == null ? "" : String(val).trim());

      // safeStrArray: converts any value to a string[], filtering out empties.
      const safeStrArray = (val: any): string[] =>
        Array.isArray(val) ? val.map((v) => safeStr(v)).filter((v) => v.length > 0) : [];

      const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1" } });
      const prompt = `Tu es un expert en fiscalité immobilière québécoise spécialisé dans la lecture de rôles d'évaluation foncière et comptes de taxes.
Analyse ce document pour extraire TOUTES les données nécessaires à la création d'une fiche immobilière complète et de son dossier comptable (Tenue de livres).

RÈGLES OBLIGATOIRES — applique-les dans cet ordre exact :

1. UNITÉS DE SURFACE : Si l'aire d'étages ou la superficie du bâtiment est exprimée en mètres carrés (m², mètres 2), tu DOIS la convertir en pieds carrés en multipliant par 10.764. Ne retourne JAMAIS une valeur en m².
2. VIRGULE DÉCIMALE QUÉBÉCOISE : "402,100" = 402.1. "1 200,50" = 1200.5. Ne confonds pas la virgule avec un séparateur de milliers anglophone.
3. PROPRIÉTAIRE OCCUPANT : Compare l'Adresse de l'unité d'évaluation (propriété) avec l'Adresse postale du propriétaire. Si elles sont identiques (ou partagent le même numéro principal), attribue true à "est_proprietaire_occupant". Sinon, false.
4. UNITÉS ET PORTES : Trouve le "Nombre de logements" (ex: 3). Liste les numéros de portes/adresses explicitement visibles dans le document (ex: ["1841", "1843"]). S'il manque des portes par rapport au nombre total, le système s'en chargera plus tard.
5. VALEURS FINANCIÈRES : Extrais les valeurs exactes en nombres entiers pour le terrain et le bâtiment. Retire les espaces et les signes $.

Retourne STRICTEMENT ce JSON (entiers arrondis, JAMAIS de décimales, pas de markdown, pas d'explication) :
{
  "adresse_propriete": "string",
  "adresse_proprietaire": "string",
  "proprietaires": ["string"],
  "est_proprietaire_occupant": boolean,
  "nombre_unites_total": integer,
  "unites_identifiees": ["string"],
  "superficie_totale_pi2": integer,
  "valeur_terrain": integer,
  "valeur_batiment": integer,
  "numero_lot": "string"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          parts: [
            { inlineData: { mimeType: mimeType || "application/pdf", data: base64Data } },
            { text: prompt },
          ]
        }],
      });

      const raw = (response.text ?? "").replace(/```json/gi, "").replace(/```/g, "").trim();
      console.log("[S.O.F.I. Dimensions] 📤 RAW response:", JSON.stringify(raw.slice(0, 300)));

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.error("[S.O.F.I. Dimensions] ❌ JSON.parse failed on:", JSON.stringify(raw.slice(0, 200)));
        return res.json(emptyResult());
      }

      const safeResult = {
        adresse_propriete: safeStr(parsed.adresse_propriete),
        adresse_proprietaire: safeStr(parsed.adresse_proprietaire),
        proprietaires: safeStrArray(parsed.proprietaires),
        est_proprietaire_occupant: parsed.est_proprietaire_occupant === true || parsed.est_proprietaire_occupant === "true",
        nombre_unites_total: safeInt(parsed.nombre_unites_total),
        unites_identifiees: safeStrArray(parsed.unites_identifiees),
        superficie_totale_pi2: safeInt(parsed.superficie_totale_pi2),
        valeur_terrain: safeInt(parsed.valeur_terrain),
        valeur_batiment: safeInt(parsed.valeur_batiment),
        numero_lot: safeStr(parsed.numero_lot),
      };
      console.log("[S.O.F.I. Dimensions] ✅ Safe result:", safeResult);
      return res.json(safeResult);
    } catch (e: any) {
      console.error("[S.O.F.I. Dimensions] Error:", e);
      return res.json({
        adresse_propriete: "",
        adresse_proprietaire: "",
        proprietaires: [],
        est_proprietaire_occupant: false,
        nombre_unites_total: 0,
        unites_identifiees: [],
        superficie_totale_pi2: 0,
        valeur_terrain: 0,
        valeur_batiment: 0,
        numero_lot: "",
      });
    }
  });

  // ── S.O.F.I. Tax Scanner: extracts cadastral values from Quebec municipal tax bills ──
  app.post("/api/scan-tax", async (req, res) => {
    try {
      const { base64Data, mimeType, filename } = req.body;
      const apiKey = process.env.GEMINI_API_KEY ?? "";
      if (!apiKey || !base64Data) {
        return res.status(400).json({ error: "Missing API key or document data" });
      }
      const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1" } });
      console.log(`[S.O.F.I. Tax] Scanning: "${filename}", type: ${mimeType}`);

      const prompt = `Analyse ce document qui est un compte de taxes municipales du Québec.
Extrais les informations suivantes et retourne UNIQUEMENT un objet JSON valide (sans markdown, sans explication).
Le JSON doit utiliser exactement ces clés :
- "adresse": L'adresse civique complète de la propriété taxée (ex: "123 Rue Principale, Montréal, QC").
- "numeroLot": Le numéro de lot au cadastre du Québec (ex: "1 234 567" ou "1-234-567").
- "valeurTerrain": La valeur d'évaluation du terrain (valeur numérique seulement, sans symbole $).
- "valeurBatiment": La valeur d'évaluation du bâtiment (valeur numérique seulement, sans symbole $).
Si une valeur est introuvable, retourne null pour ce champ.
Format strict : { "adresse": string|null, "numeroLot": string|null, "valeurTerrain": number|null, "valeurBatiment": number|null }`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          parts: [
            { inlineData: { mimeType: mimeType || "application/pdf", data: base64Data } },
            { text: prompt },
          ]
        }],
      });

      const rawTax = response.text ?? "";
      console.log("[S.O.F.I. Tax] 📤 RAW response (" + rawTax.length + " chars):", JSON.stringify(rawTax.slice(0, 400)));

      let cleanTax = rawTax.trim();
      if (cleanTax.startsWith("```")) {
        cleanTax = cleanTax.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      }
      if (!cleanTax) return res.json({ adresse: null, numeroLot: null, valeurTerrain: null, valeurBatiment: null });

      try {
        const parsed = JSON.parse(cleanTax);
        console.log("[S.O.F.I. Tax] ✅ Parsed:", parsed);
        return res.json(parsed);
      } catch (parseErr: any) {
        console.error("[S.O.F.I. Tax] Parse error:", parseErr?.message);
        return res.json({ adresse: null, numeroLot: null, valeurTerrain: null, valeurBatiment: null });
      }
    } catch (e: any) {
      console.error("[S.O.F.I. Tax] ❌ FULL ERROR:");
      console.error("  message:", e?.message);
      console.error("  status :", e?.status);
      console.error("  toString:", String(e));
      try { console.error("  JSON:", JSON.stringify(e, null, 2)); } catch { }
      res.status(200).json({ adresse: null, numeroLot: null, valeurTerrain: null, valeurBatiment: null });
    }
  });

  // ── S.O.F.I. Financing Scanner: annual mortgage / line-of-credit / second-rank
  //    loan statement. Deliberately generic — covers hypothèque, marge de crédit,
  //    prêt de second rang, or any other debt instrument secured on a property,
  //    since they're all fiscally identical (interest deductible, principal not).
  app.post("/api/scan-financing", async (req, res) => {
    try {
      const { base64Data, mimeType, filename } = req.body;
      const apiKey = process.env.GEMINI_API_KEY ?? "";
      const emptyResult = () => ({
        typeFinancement: null, preteur: null, adresseProperty: null,
        anneeFiscale: null, interetsPayes: null, capitalRembourse: null, soldeRestant: null,
      });
      if (!apiKey || !base64Data) {
        return res.status(200).json(emptyResult());
      }
      const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1" } });
      console.log(`[S.O.F.I. Financing] Scanning: "${filename}", type: ${mimeType}`);

      const prompt = `Analyse ce document qui est un relevé annuel de financement immobilier au Québec/Canada
(peut être : hypothèque, marge de crédit hypothécaire, prêt de second rang, ou tout autre prêt garanti par une propriété).
Extrais les informations suivantes et retourne UNIQUEMENT un objet JSON valide (sans markdown, sans explication).
ZERO HALLUCINATION: n'invente jamais un montant ou un nom absent du document — retourne null si introuvable.
Le JSON doit utiliser exactement ces clés :
- "typeFinancement": Type de financement — un de ["Hypothèque", "Marge de crédit", "Prêt de second rang", "Autre"].
- "preteur": Nom de l'institution prêteuse (banque, caisse, prêteur privé).
- "adresseProperty": L'adresse civique de la propriété concernée, si indiquée sur le document.
- "anneeFiscale": L'année couverte par ce relevé (ex: "2025").
- "interetsPayes": Total des INTÉRÊTS payés durant l'année (valeur numérique seulement, sans symbole $). C'est la portion déductible fiscalement.
- "capitalRembourse": Total du CAPITAL/PRINCIPAL remboursé durant l'année (valeur numérique seulement). C'est la portion NON déductible — un remboursement de dette, pas une dépense.
- "soldeRestant": Solde restant dû à la fin de la période (valeur numérique seulement).
Format strict : { "typeFinancement": string|null, "preteur": string|null, "adresseProperty": string|null, "anneeFiscale": string|null, "interetsPayes": number|null, "capitalRembourse": number|null, "soldeRestant": number|null }`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          parts: [
            { inlineData: { mimeType: mimeType || "application/pdf", data: base64Data } },
            { text: prompt },
          ]
        }],
      });

      const rawText = response.text ?? "";
      console.log("[S.O.F.I. Financing] 📤 RAW response (" + rawText.length + " chars):", JSON.stringify(rawText.slice(0, 400)));

      let cleanText = rawText.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      }
      if (!cleanText) return res.json(emptyResult());

      try {
        const parsed = JSON.parse(cleanText);
        console.log("[S.O.F.I. Financing] ✅ Parsed:", parsed);
        return res.json({ ...emptyResult(), ...parsed });
      } catch (parseErr: any) {
        console.error("[S.O.F.I. Financing] Parse error:", parseErr?.message);
        return res.json(emptyResult());
      }
    } catch (e: any) {
      console.error("[S.O.F.I. Financing] ❌ FULL ERROR:", e?.message || e);
      res.status(200).json({
        typeFinancement: null, preteur: null, adresseProperty: null,
        anneeFiscale: null, interetsPayes: null, capitalRembourse: null, soldeRestant: null,
      });
    }
  });

  // ── Fidéicommis: Send reçu de loyer officiel to tenant ──────────────
  app.post("/api/send-recu-loyer", async (req, res) => {
    try {
      const {
        to, numeroRecu, locataireName, propertyAddress, montant,
        periode, gestionnaireName, companyName, adminEmail, pdfBase64,
      } = req.body;
      if (!to || !pdfBase64) return res.status(400).json({ error: "Missing required fields" });

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

      const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 36px;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:900;">Reçu de loyer</h1>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Réf. #${numeroRecu}</p>
  </div>
  <div style="padding:32px 36px;">
    <p style="color:#374151;font-size:15px;">Bonjour <strong>${locataireName}</strong>,</p>
    <p style="color:#6b7280;font-size:14px;">Voici votre reçu officiel enregistré par <strong>${gestionnaireName}</strong>.</p>
    <div style="background:#f0f3ff;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #6366f1;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;padding:4px 0;">Propriété</td><td style="color:#111827;font-size:14px;font-weight:600;text-align:right;">${propertyAddress}</td></tr>
        <tr><td style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;padding:4px 0;">Période</td><td style="color:#111827;font-size:14px;font-weight:600;text-align:right;">${periode}</td></tr>
        <tr><td style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;padding:8px 0 4px;">Montant</td><td style="color:#6366f1;font-size:22px;font-weight:900;text-align:right;">${new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(montant)}</td></tr>
      </table>
    </div>
    <div style="background:#f0fdf4;border-radius:10px;padding:14px;border:1px solid #bbf7d0;margin-bottom:24px;">
      <p style="margin:0;color:#15803d;font-size:12px;font-weight:600;">&#10003; Cette somme a été déposée au compte en fidéicommis conformément à la Loi sur le courtage immobilier du Québec.</p>
    </div>
    <p style="color:#9ca3af;font-size:11px;">Le reçu PDF officiel est joint à cet email.</p>
  </div>
  <div style="padding:16px 36px 24px;background:#f9fafb;border-top:1px solid #f0f0f0;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">${companyName || "Gestion Immobilière"} · Propulsé par AutoCompt</p>
  </div>
</div>
</body></html>`;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "AutoCompt <info@autocompt.ca>",
          reply_to: adminEmail || "info@autocompt.ca",
          to: [to],
          subject: `Reçu de loyer #${numeroRecu} — ${propertyAddress}`,
          html,
          attachments: [{ filename: `Recu-${numeroRecu}.pdf`, content: pdfBase64 }],
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        return res.status(502).json({ error: "Email delivery failed", details: errBody });
      }
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[send-recu-loyer]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Fidéicommis: Send relevé mensuel to property owner ─────────────────
  app.post("/api/send-releve-mensuel", async (req, res) => {
    try {
      const {
        to, clientName, period, gestionnaireName,
        companyName, adminEmail, pdfBase64,
      } = req.body;
      if (!to || !pdfBase64) return res.status(400).json({ error: "Missing required fields" });

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

      const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;"><div style="max-width:520px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);"><div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:32px 36px;"><h1 style="color:#fff;margin:0;font-size:22px;font-weight:900;">Relev\u00e9 de gestion immobili\u00e8re</h1><p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">${period}</p></div><div style="padding:32px 36px;"><p style="color:#374151;font-size:15px;">Bonjour <strong>${clientName}</strong>,</p><p style="color:#6b7280;font-size:14px;">Veuillez trouver ci-joint votre relev\u00e9 mensuel pour la p\u00e9riode <strong>${period}</strong>, pr\u00e9par\u00e9 par <strong>${gestionnaireName}</strong>.</p><div style="background:#eff6ff;border-radius:12px;padding:16px 20px;margin:20px 0;border-left:4px solid #6366f1;"><p style="margin:0;color:#4338ca;font-size:13px;font-weight:600;">Le document PDF officiel est joint. Conservez-le pour vos dossiers fiscaux (T776 / TP-128).</p></div><p style="color:#9ca3af;font-size:11px;">En cas de questions, r\u00e9pondez directement \u00e0 cet email.</p></div><div style="padding:16px 36px 24px;background:#f9fafb;border-top:1px solid #f0f0f0;"><p style="color:#9ca3af;font-size:11px;margin:0;">${companyName || "Gestion Immobili\u00e8re"} \u00b7 Conformit\u00e9 OACIQ</p></div></div></body></html>`;

      const safeClientName = (clientName || "client").replace(/\s+/g, "-");
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "AutoCompt <info@autocompt.ca>",
          reply_to: adminEmail || "info@autocompt.ca",
          to: [to],
          subject: `Relev\u00e9 de gestion \u2014 ${period}`,
          html,
          attachments: [{ filename: `Releve-${safeClientName}-${period}.pdf`, content: pdfBase64 }],
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        return res.status(502).json({ error: "Email delivery failed", details: errBody });
      }
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[send-releve-mensuel]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Fidéicommis: Send Mandat de Gestion to property owner ──────────────────
  app.post("/api/send-mandat-gestion", async (req, res) => {
    try {
      const {
        to, proprietaireName, gestionnaireName,
        companyName, adminEmail, dateDebut, dateFin, pdfBase64,
      } = req.body;
      if (!to || !pdfBase64) return res.status(400).json({ error: "Missing required fields" });

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

      const fmtDate = (d: string) => {
        try { return new Date(d + "T12:00:00").toLocaleDateString("fr-CA", { dateStyle: "long" }); } catch { return d; }
      };

      const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;"><div style="max-width:520px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);"><div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:36px;"><div style="display:inline-block;background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:20px;font-size:9px;font-weight:700;color:rgba(255,255,255,0.8);letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">OACIQ 2024 · Conforme RLRQ c C-73.2</div><h1 style="color:#fff;margin:0;font-size:22px;font-weight:900;">Mandat de Gestion Immobilière</h1><p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;">Votre gestionnaire vous soumet un mandat à examiner</p></div><div style="padding:32px 36px;"><p style="color:#374151;font-size:15px;">Bonjour <strong>${proprietaireName}</strong>,</p><p style="color:#6b7280;font-size:14px;line-height:1.6;"><strong>${gestionnaireName}</strong> vous soumet le <strong>Mandat de gestion immobilière</strong> pour la période du <strong>${fmtDate(dateDebut)}</strong> au <strong>${fmtDate(dateFin)}</strong>.</p><p style="color:#6b7280;font-size:14px;line-height:1.6;">Veuillez lire attentivement le document PDF joint, qui détaille les conditions de gestion, les honoraires, les pouvoirs conférés et vos obligations respectives.</p><div style="background:#eff6ff;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #6366f1;"><p style="margin:0 0 8px;color:#1e40af;font-size:13px;font-weight:700;">⚖️ Mandat conforme à l'OACIQ</p><p style="margin:0;color:#3730a3;font-size:12px;line-height:1.6;">Ce mandat est établi conformément à la Loi sur le courtage immobilier du Québec (RLRQ, c C-73.2, art. 95-99). Votre gestionnaire est titulaire d'un permis délivré par l'OACIQ. En cas de litige, vous pouvez contacter l'OACIQ au 1 800 440-7170.</p></div><p style="color:#9ca3af;font-size:11px;">Pour toute question, répondez directement à cet email. Le document signé doit être retourné par courriel ou via DocuLegal.</p></div><div style="padding:16px 36px 24px;background:#f9fafb;border-top:1px solid #f0f0f0;"><p style="color:#9ca3af;font-size:11px;margin:0;">${companyName || "Gestion Immobilière"} · Propulsé par AutoCompt · OACIQ</p></div></div></body></html>`;

      const safeName = (proprietaireName || "proprietaire").replace(/\s+/g, "-");
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "AutoCompt <info@autocompt.ca>",
          reply_to: adminEmail || "info@autocompt.ca",
          to: [to],
          subject: `Mandat de gestion immobilière — ${gestionnaireName}`,
          html,
          attachments: [{ filename: `Mandat-Gestion-${safeName}.pdf`, content: pdfBase64 }],
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        return res.status(502).json({ error: "Email delivery failed", details: errBody });
      }
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[send-mandat-gestion]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Syndicat: send a real cotisation-payment reminder to a condo unit owner ─
  // Was previously a fake setTimeout that always claimed success without
  // sending anything (found 2026-08-22, Fabiola/audit). Email only — there is
  // no SMS-sending infrastructure anywhere in this backend, so the reminder
  // no longer claims to also send by SMS.
  app.post("/api/send-cotisation-reminder", async (req, res) => {
    try {
      const { to, ownerName, unitLabel, amountDue, companyName, adminEmail } = req.body;
      if (!to || !unitLabel || amountDue == null) return res.status(400).json({ error: "Missing required fields" });

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

      const amountStr = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(Number(amountDue) || 0);
      const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;"><div style="max-width:520px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);"><div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 36px;"><h1 style="color:#fff;margin:0;font-size:20px;font-weight:900;">Rappel de cotisation de copropriété</h1><p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">${unitLabel}</p></div><div style="padding:32px 36px;"><p style="color:#374151;font-size:15px;">Bonjour <strong>${ownerName || "copropriétaire"}</strong>,</p><p style="color:#6b7280;font-size:14px;line-height:1.6;">Le Conseil d'administration de <strong>${companyName || "votre syndicat"}</strong> vous rappelle que votre cotisation de copropriété demeure impayée à ce jour.</p><div style="background:#fffbeb;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #f59e0b;"><p style="margin:0;color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;">Montant dû</p><p style="margin:4px 0 0;color:#b45309;font-size:24px;font-weight:900;">${amountStr}</p></div><p style="color:#9ca3af;font-size:11px;">Merci de régulariser votre situation dans les meilleurs délais. Pour toute question, répondez directement à cet email.</p></div><div style="padding:16px 36px 24px;background:#f9fafb;border-top:1px solid #f0f0f0;"><p style="color:#9ca3af;font-size:11px;margin:0;">${companyName || "Syndicat de copropriété"} · Propulsé par AutoCompt</p></div></div></body></html>`;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "AutoCompt <info@autocompt.ca>",
          reply_to: adminEmail || "info@autocompt.ca",
          to: [to],
          subject: `Rappel de cotisation — ${unitLabel}`,
          html,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        return res.status(502).json({ error: "Email delivery failed", details: errBody });
      }
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[send-cotisation-reminder]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Syndicat: broadcast an AI-drafted document (convocation, mise en
  // demeure, rapport financier...) to every condo unit owner with a
  // registered email. Was previously a fake setTimeout with no real send
  // (found 2026-08-22, Fabiola/audit) — dangerous for legally-significant
  // documents like an AGM convocation or a mise en demeure. Resend supports
  // multiple `to` recipients in one call; recipients don't see each other
  // since `to` on a single Resend call is treated as one thread — for real
  // per-owner privacy at scale this should move to individual sends later,
  // but this already fixes "nothing was sent at all".
  app.post("/api/send-syndic-broadcast", async (req, res) => {
    try {
      const { to, docLabel, companyName, adminName, adminRole, adminEmail, period, pdfBase64, filename } = req.body;
      if (!Array.isArray(to) || to.length === 0 || !pdfBase64) return res.status(400).json({ error: "Missing required fields" });

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

      const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;"><div style="max-width:520px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);"><div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:32px 36px;"><h1 style="color:#fff;margin:0;font-size:20px;font-weight:900;">${docLabel || "Document du syndicat"}</h1><p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">${companyName || ""} ${period ? "· " + period : ""}</p></div><div style="padding:32px 36px;"><p style="color:#374151;font-size:15px;">Bonjour,</p><p style="color:#6b7280;font-size:14px;line-height:1.6;">Le Conseil d'administration de <strong>${companyName || "votre syndicat"}</strong> vous transmet le document ci-joint : <strong>${docLabel || "un document officiel"}</strong>.</p><p style="color:#9ca3af;font-size:11px;">Document PDF joint à ce courriel. Pour toute question, répondez directement à cet email.</p></div><div style="padding:16px 36px 24px;background:#f9fafb;border-top:1px solid #f0f0f0;"><p style="color:#9ca3af;font-size:11px;margin:0;">${adminName || ""}${adminRole ? " — " + adminRole : ""} · ${companyName || "Syndicat de copropriété"} · Propulsé par AutoCompt</p></div></div></body></html>`;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "AutoCompt <info@autocompt.ca>",
          reply_to: adminEmail || "info@autocompt.ca",
          to,
          subject: `${docLabel || "Document du syndicat"} — ${companyName || ""}`,
          html,
          attachments: [{ filename: filename || "Document.pdf", content: pdfBase64 }],
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        return res.status(502).json({ error: "Email delivery failed", details: errBody });
      }
      res.json({ ok: true, sentTo: to.length });
    } catch (err: any) {
      console.error("[send-syndic-broadcast]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Relevé de Gestion: notify the owner that something is waiting for them ──
  // Deliberately NOT the document itself — the pull model (statementLinks/
  // sealedStatements) means the owner always fetches the real data from their
  // own AutoCompt account; this is just a "you have mail" nudge, same as a
  // bank's "your statement is ready" email.
  app.post("/api/send-releve-gestion-notification", async (req, res) => {
    try {
      const {
        to, type, clientName, gestionnaireName, companyName, period, adminEmail,
      } = req.body;
      if (!to || !type) return res.status(400).json({ error: "Missing required fields" });

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

      const isInvitation = type === "invitation";
      const subject = isInvitation
        ? `${gestionnaireName} vous invite à consulter vos relevés sur AutoCompt`
        : `Nouveau relevé de gestion disponible — ${period}`;
      const introText = isInvitation
        ? `<strong>${gestionnaireName}</strong>${companyName ? ` (${companyName})` : ""} vous invite à consulter vos relevés de gestion immobilière directement depuis votre propre compte AutoCompt.`
        : `Un nouveau relevé de gestion pour la période <strong>${period}</strong> est maintenant disponible dans votre compte AutoCompt.`;
      const stepText = isInvitation
        ? `Connectez-vous (ou créez un compte gratuit) avec cette adresse courriel, puis rendez-vous dans <strong>« Mes relevés de gestion »</strong> pour accepter l'invitation.`
        : `Connectez-vous à votre compte, puis rendez-vous dans <strong>« Mes relevés de gestion »</strong> pour le consulter et le télécharger.`;

      const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;"><div style="max-width:520px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);"><div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:32px 36px;"><h1 style="color:#fff;margin:0;font-size:20px;font-weight:900;">Relevé de gestion immobilière</h1></div><div style="padding:32px 36px;"><p style="color:#374151;font-size:15px;">Bonjour${clientName ? ` <strong>${clientName}</strong>` : ""},</p><p style="color:#6b7280;font-size:14px;line-height:1.6;">${introText}</p><div style="background:#eff6ff;border-radius:12px;padding:16px 20px;margin:20px 0;border-left:4px solid #6366f1;"><p style="margin:0;color:#4338ca;font-size:13px;font-weight:600;">${stepText}</p></div><p style="color:#9ca3af;font-size:11px;">En cas de questions, répondez directement à cet email.</p></div><div style="padding:16px 36px 24px;background:#f9fafb;border-top:1px solid #f0f0f0;"><p style="color:#9ca3af;font-size:11px;margin:0;">Propulsé par AutoCompt</p></div></div></body></html>`;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "AutoCompt <info@autocompt.ca>",
          reply_to: adminEmail || "info@autocompt.ca",
          to: [to],
          subject,
          html,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        return res.status(502).json({ error: "Email delivery failed", details: errBody });
      }
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[send-releve-gestion-notification]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Real email for the companyInvites flow — BOTH directions share this one
  // endpoint (distinguished by `context`) since they're the same underlying
  // "you've been invited, log in (or create a free account) with this exact
  // email and you'll be added automatically" mechanic, just phrased for a
  // different audience:
  //  - 'client_to_comptable': the CLIENT already has an account and invited
  //    their accountant (existing "Inviter un associé" flow) — the
  //    accountant is auto-joined the moment they next log in, no accept
  //    click needed.
  //  - 'comptable_to_client': the ACCOUNTANT is reaching a prospect who may
  //    not have an AutoCompt account yet — this is a pure email NUDGE, not a
  //    new access grant. It tells the prospect to create an account and then
  //    invite the accountant back via that SAME existing flow — never
  //    bypasses or duplicates it.
  app.post("/api/send-company-invite-email", async (req, res) => {
    try {
      const { recipientEmail, recipientName, inviterName, inviterEmail, companyName, context, unitLabel } = req.body;
      if (!recipientEmail || !inviterName || !context) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        return res.status(400).json({ error: "Invalid recipientEmail" });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

      const esc = (v: any) => String(v ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
      const safeInviter = esc(inviterName);

      const isClientToComptable = context === "client_to_comptable";
      // Syndicat unit owner ("coproprietaire") invite — same underlying
      // mechanic as client_to_comptable (log in with this exact email and
      // you're auto-linked), just phrased for a condo owner instead of an
      // accountant, and scoped to one unit.
      const isCondoOwner = context === "condo_owner";
      const subject = isCondoOwner
        ? `${inviterName} vous invite à consulter votre cotisation sur AutoCompt`
        : isClientToComptable
        ? `${inviterName} vous invite à accéder à sa comptabilité sur AutoCompt`
        : `${inviterName} vous invite à essayer AutoCompt`;
      const introText = isCondoOwner
        ? `Le Conseil d'administration de <strong>${companyName ? esc(companyName) : "votre syndicat de copropriété"}</strong> vous invite à consulter en ligne l'état de votre cotisation${unitLabel ? ` (${esc(unitLabel)})` : ""}, les documents du syndicat et les communications du conseil.`
        : isClientToComptable
        ? `<strong>${safeInviter}</strong>${companyName ? ` (${esc(companyName)})` : ""} vous a ajouté comme associé/collaborateur sur son compte AutoCompt.`
        : `<strong>${safeInviter}</strong>, votre comptable/gestionnaire, utilise AutoCompt — un outil de comptabilité automatisée conçu pour la fiscalité québécoise — et vous invite à l'essayer.`;
      // Every new signup still requires a beta access code during this beta
      // phase (no public self-serve signup yet) — the invite email used to
      // say "créez un compte gratuit" with no mention of this, which left a
      // real invited prospect stuck exactly like Fabiola was earlier today.
      // Codes are issued manually today (Panneau d'Administration), so the
      // simplest correct next step is a pre-filled mailto request instead of
      // building a whole intake form for what's still a handful of testers.
      const betaCodeMailto = `mailto:info@autocompt.ca` +
        `?subject=${encodeURIComponent("Demande de code d'accès bêta AutoCompt")}` +
        `&body=${encodeURIComponent(
          `Bonjour,\n\nJ'ai été invité(e) par ${inviterName} à essayer AutoCompt.\nMon adresse courriel : ${recipientEmail}\n\nPourriez-vous me faire parvenir un code d'accès bêta ?\n\nMerci !`
        )}`;
      const stepText = isCondoOwner
        ? `Connectez-vous (ou créez un compte, code d'accès bêta requis pour l'instant) avec cette adresse courriel — vous serez automatiquement lié à votre unité dès votre connexion, aucune autre étape n'est nécessaire.`
        : isClientToComptable
        ? `Connectez-vous (ou créez un compte gratuit) avec cette adresse courriel — vous serez automatiquement ajouté comme collaborateur dès votre connexion, aucune autre étape n'est nécessaire.`
        : `AutoCompt est en phase bêta : chaque nouveau compte nécessite un code d'accès. Cliquez ci-dessous pour en demander un, avec cette adresse courriel (${esc(recipientEmail)}). Une fois votre compte créé, allez dans <strong>Paramètres → « Inviter un associé »</strong> et entrez l'adresse courriel de ${safeInviter}${inviterEmail ? ` (${esc(inviterEmail)})` : ""} pour lui donner accès à votre comptabilité.`;
      // Daniel's QA report (2026-08-11): this invite email had no clickable
      // link to AutoCompt at all — just a footer text mention — so the
      // recipient had no fast way to go create/open their account.
      const ctaButton = (isClientToComptable || isCondoOwner)
        ? `<a href="https://autocompt-app.vercel.app?login=1" style="display:inline-block;margin-top:16px;background:#059669;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-size:13px;font-weight:700;">Ouvrir AutoCompt</a>`
        : `<a href="${betaCodeMailto}" style="display:inline-block;margin-top:16px;background:#059669;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-size:13px;font-weight:700;">Demander mon code d'accès bêta</a>`;

      const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;"><div style="max-width:520px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);"><div style="background:linear-gradient(135deg,#059669,#047857);padding:32px 36px;"><h1 style="color:#fff;margin:0;font-size:20px;font-weight:900;">AutoCompt</h1></div><div style="padding:32px 36px;"><p style="color:#374151;font-size:15px;">Bonjour${recipientName ? ` <strong>${esc(recipientName)}</strong>` : ""},</p><p style="color:#6b7280;font-size:14px;line-height:1.6;">${introText}</p><div style="background:#ecfdf5;border-radius:12px;padding:16px 20px;margin:20px 0;border-left:4px solid #059669;"><p style="margin:0;color:#065f46;font-size:13px;font-weight:600;">${stepText}</p>${ctaButton}</div><p style="color:#9ca3af;font-size:11px;">En cas de questions, répondez directement à cet email.</p></div><div style="padding:16px 36px 24px;background:#f9fafb;border-top:1px solid #f0f0f0;"><p style="color:#9ca3af;font-size:11px;margin:0;">Propulsé par AutoCompt · <a href="https://autocompt-app.vercel.app" style="color:#059669">autocompt-app.vercel.app</a></p></div></div></body></html>`;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "AutoCompt <info@autocompt.ca>",
          reply_to: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviterEmail || "") ? inviterEmail : "info@autocompt.ca",
          to: [recipientEmail],
          subject,
          html,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        return res.status(502).json({ error: "Email delivery failed", details: errBody });
      }
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[send-company-invite-email]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── DocuLegal: Send signature invitation email to signer ─────────────────────
  // Creates the legal audit chain: email delivery → link click → consent → signature

  app.post("/api/send-signature-invitation", async (req, res) => {

    try {
      const {
        signerEmail,      // Destination email (required)
        signerName,       // Signer display name (optional, used in email greeting)
        signUrl,          // Unique signing link
        docTitle,         // Document title
        docSummary,       // Document summary
        companyName,      // Admin's company
        adminName,        // Admin display name
        adminEmail,       // Admin email (for reply-to)
        token,            // Unique signature token
      } = req.body;

      if (!signerEmail || !signUrl || !docTitle) {
        return res.status(400).json({ success: false, error: "signerEmail, signUrl and docTitle are required" });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      const fromEmail   = process.env.RESEND_FROM_EMAIL || "DocuLegal <doculegal@autocompt.ca>";

      if (!resendApiKey) {
        return res.status(500).json({ success: false, error: "RESEND_API_KEY not configured" });
      }

      const greeting   = signerName ? `Bonjour ${signerName.split(' ')[0]},` : "Bonjour,";
      const tokenShort = (token || "").slice(0, 20).toUpperCase();
      const sentAt     = new Date().toLocaleString("fr-CA", { dateStyle: "full", timeStyle: "short" });

      const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:36px 40px 32px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">✦</div>
        <div>
          <div style="color:rgba(255,255,255,0.75);font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase">DocuLegal · AutoCompt</div>
          <div style="color:#fff;font-size:13px;font-weight:900;letter-spacing:1px">${companyName || "AutoCompt"}</div>
        </div>
      </div>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:900;line-height:1.2">📄 Demande de signature électronique</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px">${docTitle}</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 40px">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6">${greeting}</p>
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6">
        <strong>${companyName || adminName || "AutoCompt"}</strong> vous invite à signer électroniquement le document suivant :
      </p>

      <!-- Document card -->
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;padding:20px;margin-bottom:28px">
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px">Document à signer</div>
        <div style="font-size:17px;font-weight:900;color:#111827;margin-bottom:6px">${docTitle}</div>
        ${docSummary ? `<div style="font-size:13px;color:#4b5563;line-height:1.5">${docSummary}</div>` : ''}
      </div>

      <!-- Legal consent notice -->
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:16px;margin-bottom:28px">
        <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6">
          <strong>⚖️ Consentement électronique :</strong> En cliquant sur le bouton ci-dessous, vous accusez réception de ce document et consentez à le signer électroniquement. Cet acte constitue une signature légalement valide conformément à la <em>Loi concernant le cadre juridique des technologies de l'information (LCCJTI)</em> du Québec et au <em>Code civil du Québec, art. 2827</em>.
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin-bottom:28px">
        <a href="${signUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;text-decoration:none;font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase;padding:16px 40px;border-radius:50px;box-shadow:0 4px 20px rgba(5,150,105,0.35)">
          Réviser et Signer ce Document →
        </a>
      </div>

      <p style="margin:0 0 12px;color:#6b7280;font-size:12px;line-height:1.5;text-align:center">
        Vous pouvez également copier-coller ce lien dans votre navigateur :<br>
        <span style="font-family:monospace;font-size:10px;color:#059669;word-break:break-all">${signUrl}</span>
      </p>
    </div>

    <!-- Audit footer -->
    <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb">
      <p style="margin:0 0 6px;color:#9ca3af;font-size:10px">
        🔒 Envoyé le <strong>${sentAt}</strong> · Réf: <code style="background:#f3f4f6;padding:2px 5px;border-radius:4px;font-family:monospace">${tokenShort}</code>
      </p>
      <p style="margin:0;color:#d1d5db;font-size:10px">
        Ce courriel est une preuve légale d'invitation à signer. Si vous n'attendiez pas ce document, ignorez ce courriel ou contactez <a href="mailto:${adminEmail || 'support@autocompt.ca'}" style="color:#059669">${adminEmail || 'support@autocompt.ca'}</a>.
      </p>
    </div>
  </div>
</body>
</html>`;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail,
          to: [signerEmail],
          reply_to: adminEmail || undefined,
          subject: `📄 ${companyName || "AutoCompt"} vous demande de signer : ${docTitle}`,
          html,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        console.error("[DocuLegal] Invitation email error:", errBody);
        return res.status(502).json({ success: false, error: "Email delivery failed", details: errBody });
      }

      // Note: invitationSentAt / invitationSentTo are persisted to Firestore by the client
      // in SyndicatDocuLegal.tsx after this API responds successfully.

      return res.json({ success: true, sentTo: signerEmail, sentAt: new Date().toISOString() });

    } catch (err: any) {
      console.error("[DocuLegal] send-signature-invitation error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── DocuLegal: Save signed document, email both parties, route to Drive ──
  app.post("/api/save-signed-document", async (req, res) => {

    try {
      const {
        pdfBase64,          // Base64 of the final bipartite PDF
        adminEmail,         // Admin email (building manager)
        clientEmail,        // Signer client email (optional)
        clientName,         // Signer display name
        docTitle,           // Document title
        companyName,        // Active company name
        token,              // Unique signature token (for audit)
        driveAccessToken,   // Company's Google Drive OAuth token (if configured)
        driveFolderId,      // Company's Drive folder ID (if configured)
      } = req.body;

      const resendApiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || "DocuLegal <noreply@autocompt.ca>";
      const results: Record<string, any> = { emailAdmin: false, emailClient: false, driveUpload: false };

      const safeTitle = (docTitle || "Document").replace(/[^a-zA-Z0-9\s\-_]/g, "").trim();
      const dateStr = new Date().toLocaleDateString("fr-CA");

      const emailHtml = (recipientType: "admin" | "client") => `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:0">
          <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
            <div style="background:linear-gradient(135deg,#059669,#10b981);padding:32px 40px">
              <div style="color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;opacity:0.85">DocuLegal · AutoCompt</div>
              <div style="color:#fff;font-size:22px;font-weight:900;margin-top:8px">✅ Document Signé</div>
            </div>
            <div style="padding:32px 40px">
              <p style="color:#374151;font-size:15px;margin:0 0 16px">
                ${recipientType === "admin"
          ? `<strong>${clientName}</strong> a signé le document suivant le <strong>${dateStr}</strong>.`
          : `Vous avez signé le document suivant le <strong>${dateStr}</strong>. Une copie vous est remise ci-dessous.`}
              </p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px">
                <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px">Document</div>
                <div style="font-size:16px;font-weight:900;color:#111827">${docTitle}</div>
                <div style="font-size:12px;color:#6b7280;margin-top:4px">${companyName}</div>
              </div>
              <p style="color:#6b7280;font-size:13px;margin:0 0 8px">
                📎 Le PDF certifié bipartite est joint à cet email. Il contient les deux signatures avec les métadonnées légales.
              </p>
              <p style="color:#9ca3af;font-size:11px;margin:0">
                🔒 Réf: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace">${token?.slice(0, 24) || "N/A"}</code><br>
                Ce document a été certifié via DocuLegal (AutoCompt) conformément à la LCCJTI du Québec.
              </p>
            </div>
            <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center">
              <p style="color:#9ca3af;font-size:11px;margin:0">
                Document numérique certifié · DocuLegal by AutoCompt Canada<br>
                <a href="https://autocompt-app.vercel.app" style="color:#059669">autocompt-app.vercel.app</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      // ── 1. Send email via Resend REST API (no package needed — uses native fetch) ──
      if (resendApiKey && pdfBase64) {
        const attachment = {
          filename: `DocuLegal_${safeTitle.replace(/\s+/g, "_")}_Signé.pdf`,
          content: pdfBase64,  // Base64 string
        };

        // Email to Admin
        if (adminEmail) {
          try {
            const adminResp = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: fromEmail,
                to: [adminEmail],
                subject: `✅ Signé: ${docTitle} — ${clientName}`,
                html: emailHtml("admin"),
                attachments: [attachment],
              }),
            });
            results.emailAdmin = adminResp.ok;
            if (!adminResp.ok) {
              const errBody = await adminResp.json().catch(() => ({}));
              console.error("Resend admin email error:", errBody);
            }
          } catch (emailErr) {
            console.error("Admin email send failed:", emailErr);
          }
        }

        // Email to Client (if they provided their email)
        if (clientEmail) {
          try {
            const clientResp = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: fromEmail,
                to: [clientEmail],
                reply_to: adminEmail || undefined,
                subject: `📄 Votre copie signée: ${docTitle}`,
                html: emailHtml("client"),
                attachments: [attachment],
              }),
            });
            results.emailClient = clientResp.ok;
          } catch (emailErr) {
            console.error("Client email send failed:", emailErr);
          }
        }
      } else if (!resendApiKey) {
        console.log("[DocuLegal] RESEND_API_KEY not configured — email delivery skipped. Set RESEND_API_KEY in .env");
        results.emailAdmin = "skipped_no_api_key";
      }

      // ── 2. Google Drive Upload (activates when company OAuth is configured) ──
      // Architecture: per-company OAuth token stored in Firestore companies/{id}/driveOAuth
      // This infrastructure is ready — Drive routing activates in Phase 2 when OAuth is set up per workspace.
      if (driveAccessToken && driveFolderId && pdfBase64) {
        try {
          const pdfBuffer = Buffer.from(pdfBase64, "base64");
          const boundary = "autocompt_boundary";
          const metadata = JSON.stringify({
            name: `DocuLegal_${safeTitle}_${dateStr.replace(/\//g, "-")}.pdf`,
            parents: [driveFolderId],
            mimeType: "application/pdf",
          });

          const multipartBody = [
            `--${boundary}`,
            "Content-Type: application/json; charset=UTF-8",
            "",
            metadata,
            `--${boundary}`,
            "Content-Type: application/pdf",
            "Content-Transfer-Encoding: base64",
            "",
            pdfBase64,
            `--${boundary}--`,
          ].join("\r\n");

          const driveResp = await fetch(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${driveAccessToken}`,
                "Content-Type": `multipart/related; boundary=${boundary}`,
              },
              body: multipartBody,
            }
          );

          if (driveResp.ok) {
            const driveFile = await driveResp.json() as { id?: string; webViewLink?: string };
            results.driveUpload = true;
            results.driveFileId = driveFile.id;
            console.log(`[DocuLegal] Document uploaded to Drive folder ${driveFolderId}: ${driveFile.id}`);
          } else {
            const driveErr = await driveResp.json().catch(() => ({}));
            console.error("[DocuLegal] Drive upload failed:", driveErr);
          }
        } catch (driveErr) {
          console.error("[DocuLegal] Drive upload error:", driveErr);
        }
      } else if (!driveAccessToken) {
        results.driveUpload = "pending_oauth_setup";
        // Drive upload will activate when company OAuth is configured (Phase 2)
      }

      return res.json({ success: true, results });

    } catch (error: any) {
      console.error("save-signed-document error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── DocuLegal: proxy a Storage PDF so the public signing page can read it ──
  // Firebase Storage download URLs are public content-wise (token-gated),
  // but the bucket has no CORS config for cross-origin browser fetch() — a
  // plain <a href> navigation works fine (no CORS involved), but pdf.js
  // fetching the bytes directly from client JS to render it inline fails
  // silently. Found 2026-08-12: the new click-to-sign-on-document viewer
  // showed "0/4 zones" with nothing to click and no error at all — the PDF
  // simply never loaded. Routing through the server sidesteps browser CORS
  // entirely (server-to-server requests aren't subject to it). Restricted to
  // Firebase Storage URLs only — never an open proxy for arbitrary URLs.
  app.get("/api/proxy-pdf", async (req, res) => {
    try {
      const url = String(req.query.url || "");
      let parsed: URL;
      try { parsed = new URL(url); } catch { return res.status(400).json({ error: "URL invalide" }); }
      if (parsed.hostname !== "firebasestorage.googleapis.com") {
        return res.status(400).json({ error: "Domaine non autorisé" });
      }
      const upstream = await fetch(url);
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: "Échec du chargement du document" });
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Cache-Control", "private, max-age=300");
      res.send(buf);
    } catch (err: any) {
      console.error("proxy-pdf error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── DocuLegal: permanently delete a document + its signature attempts ──────
  // pendingSignatures has `allow delete: if false` in firestore.rules — it's
  // a public, unauthenticated "magic link" collection (any signer, no
  // AutoCompt account, can read/update it), so deletion is intentionally
  // blocked at the client level to prevent a signer from destroying their
  // own signature record. The owner still needs a way to clear out test/
  // abandoned signature requests, so this does it server-side instead.
  app.post("/api/delete-doculegal-document", async (req, res) => {
    try {
      const { ownerId, docId } = req.body;
      if (!ownerId || !docId) {
        return res.status(400).json({ success: false, error: "ownerId and docId are required" });
      }
      const db = getAdminDb();
      const snap = await db.collection("pendingSignatures").where("docId", "==", docId).get();
      let deletedCount = 0;
      for (const d of snap.docs) {
        const data = d.data();
        if (d.id === `${docId}_lock` || data.ownerId === ownerId) {
          await d.ref.delete();
          deletedCount++;
        }
      }
      await db.collection("docuLegalDocs").doc(`${ownerId}_doculegal_${docId}`).delete();
      res.json({ success: true, deletedCount });
    } catch (error: any) {
      console.error("delete-doculegal-document error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── DocuLegal: finalize a real multi-party signature (2+ named signers) ────
  // Each signer completes independently from their own link/browser, so no
  // single one of them ever has every other signer's signature image. This
  // endpoint is called by EVERY signer right after their own signature is
  // recorded; it checks whether the whole group (same docId) is now fully
  // signed, and — using a Firestore transaction so only ONE of the possibly-
  // concurrent callers wins — compiles and emails ONE final PDF showing every
  // real signer's actual signature to everyone once they're all done.
  // Replaces the old behavior where each signer's OWN browser generated an
  // incomplete "Partie 1 = the sending AutoCompt account / Partie 2 = this
  // signer" PDF — found 2026-08-12: a real 2-party contract only ever showed
  // one real signature per copy.
  app.post("/api/finalize-signature-group", async (req, res) => {
    try {
      const { docId, token } = req.body;
      if (!docId || !token) {
        return res.status(400).json({ success: false, error: "docId et token sont requis" });
      }

      const db = getAdminDb();
      const snap = await db.collection("pendingSignatures").where("docId", "==", docId).get();
      const siblingDocs = snap.docs.filter((d) => !d.id.endsWith("_lock"));
      if (siblingDocs.length === 0) {
        return res.status(404).json({ success: false, error: "Document introuvable" });
      }

      const totalSigners = Math.max(
        ...siblingDocs.map((d) => Number(d.data().totalSigners) || 0),
        siblingDocs.length,
      );
      const signedDocs = siblingDocs.filter((d) => d.data().status === "signed");
      const allSigned = signedDocs.length >= totalSigners;

      if (!allSigned) {
        return res.json({ success: true, allSigned: false, signedCount: signedDocs.length, totalSigners });
      }

      // ── Everyone has signed — claim the right to compile+send exactly once ──
      const lockRef = db.collection("pendingSignatures").doc(`${docId}_lock`);
      const wonLock = await db.runTransaction(async (tx) => {
        const lockSnap = await tx.get(lockRef);
        if (lockSnap.exists) return false;
        tx.set(lockRef, { docId, finalizedAt: new Date().toISOString() });
        return true;
      });

      if (!wonLock) {
        return res.json({ success: true, allSigned: true, alreadySent: true, signedCount: signedDocs.length, totalSigners });
      }

      const first = signedDocs[0].data();
      const docTitle: string = first.docTitle || "Document";
      const docSummary: string = first.docSummary || "";
      const companyName: string = first.companyName || "";
      const adminEmail: string = first.adminEmail || "";
      const companyId: string | undefined = first.companyId;
      const ownerId: string | undefined = first.ownerId;

      const signerContacts = signedDocs.map((d) => {
        const data = d.data();
        return { name: data.clientSignerName || "Signataire", email: data.clientSignerEmail || "" };
      });

      // Click-to-sign-on-the-document (2026-08-12): each signer's own
      // pendingSignatures doc carries its OWN signatureFields (their exact
      // placed zones) and fieldValues (what they put in each). When that
      // shape is present, overlay everyone's real input onto the actual
      // uploaded PDF instead of building a separate certificate PDF.
      const hasFieldOverlayData = !!first.pdfStorageUrl && signedDocs.some((d) => {
        const data = d.data();
        return data.fieldValues && Object.keys(data.fieldValues).length > 0;
      });

      let pdfBase64: string | null;
      if (hasFieldOverlayData) {
        const pdfResp = await fetch(first.pdfStorageUrl);
        const pdfBytes = await pdfResp.arrayBuffer();
        const overlaySigners = signedDocs.map((d) => {
          const data = d.data();
          return { fields: data.signatureFields || [], values: data.fieldValues || {} };
        });
        pdfBase64 = await generatePdfFieldOverlay({ pdfBytes, token: docId, companyName, signers: overlaySigners });
      } else {
        const signerRecords = signedDocs.map((d) => {
          const data = d.data();
          return {
            name: data.clientSignerName || "Signataire",
            email: data.clientSignerEmail || "",
            signedDate: data.clientSignedDate || "",
            sigDataUrl: data.clientSignatureDataUrl || "",
            initialsDataUrl: data.clientInitialsDataUrl || "",
          };
        });
        pdfBase64 = generateMultiPartyPdf({ docTitle, docSummary, companyName, token: docId, customDocUrl: first.customDocUrl || undefined, signers: signerRecords });
      }

      // ── Email the final PDF to every real signer + the admin (deduped) ──
      const resendApiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || "DocuLegal <noreply@autocompt.ca>";
      const recipients = Array.from(new Set([
        ...signerContacts.map((s) => s.email).filter(Boolean),
        adminEmail,
      ].filter(Boolean)));

      if (resendApiKey && pdfBase64 && recipients.length > 0) {
        const safeTitle = (docTitle || "Document").replace(/[^a-zA-Z0-9\s\-_]/g, "").trim().replace(/\s+/g, "_");
        const attachment = { filename: `DocuLegal_${safeTitle}_Signe_Final.pdf`, content: pdfBase64 };
        const namesLine = signerContacts.map((s) => s.name).join(", ");
        const html = `
          <!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:0">
            <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
              <div style="background:linear-gradient(135deg,#059669,#10b981);padding:32px 40px">
                <div style="color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;opacity:0.85">DocuLegal · AutoCompt</div>
                <div style="color:#fff;font-size:22px;font-weight:900;margin-top:8px">✅ Document Signé par Toutes les Parties</div>
              </div>
              <div style="padding:32px 40px">
                <p style="color:#374151;font-size:15px;margin:0 0 16px">
                  Toutes les signatures ont été reçues pour <strong>${docTitle}</strong>, signé par : ${namesLine}.
                </p>
                <p style="color:#6b7280;font-size:13px;margin:0 0 8px">
                  📎 Le PDF final certifié, avec la signature réelle de chaque partie, est joint à cet email.
                </p>
              </div>
              <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center">
                <p style="color:#9ca3af;font-size:11px;margin:0">Document numérique certifié · DocuLegal by AutoCompt Canada</p>
              </div>
            </div>
          </body></html>`;
        for (const to of recipients) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: fromEmail,
                to: [to],
                subject: `✅ Signé par toutes les parties : ${docTitle}`,
                html,
                attachments: [attachment],
              }),
            });
          } catch (emailErr) {
            console.error("[finalize-signature-group] email send failed for", to, emailErr);
          }
        }
      }

      // ── Best-effort Drive upload ─────────────────────────────────────────
      let driveFileUrl: string | undefined;
      if (pdfBase64 && companyId && ownerId) {
        try {
          const credSnap = await db.collection("driveCredentials").doc(driveCredDocId(ownerId, companyId)).get();
          if (credSnap.exists) {
            const accessToken = await refreshAccessToken(credSnap.data()!.refreshToken);
            const folderId = await resolveCompanyDriveFolder(accessToken, companyName, "DocuLegal", undefined);
            const safeTitle = (docTitle || "Document").replace(/[^a-zA-Z0-9\s\-_]/g, "").trim().replace(/\s+/g, "_");
            const driveFile = await uploadBase64ToDrive(accessToken, folderId, `DocuLegal_${safeTitle}_Signe_Final.pdf`, "application/pdf", pdfBase64);
            driveFileUrl = driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`;
          }
        } catch (driveErr) {
          console.error("[finalize-signature-group] Drive upload failed:", driveErr);
        }
      }

      // Persist the final signed PDF's link onto every signer's own
      // pendingSignatures doc too (not just the owner's docuLegalDocs entry
      // below) — SuperAdminPanel's DocuLegal registry reads pendingSignatures
      // directly and had no way to open the actual signed file.
      if (driveFileUrl) {
        for (const d of signedDocs) {
          try {
            await d.ref.set({ signedPdfUrl: driveFileUrl }, { merge: true });
          } catch (linkErr) {
            console.error("[finalize-signature-group] signedPdfUrl persist failed:", linkErr);
          }
        }
      }

      // ── Mark the document "Signé" in the app's own DocuLegal list ────────
      // Without this, the document stayed "En attente" in the app forever
      // even after every party had signed and the final PDF was emailed —
      // the only way to find it was digging through email or Drive. Found
      // 2026-08-13: Fabiola couldn't locate her completed document anywhere
      // in the app. docuLegalOwnerId is only present on documents created
      // after this fix; older ones can't be resolved and are skipped.
      //
      // Syndicat documents live in a DIFFERENT collection (legalDocuments,
      // doc id "{uid}_legaldoc_{docId}") than Plex/Gestionnaire's docuLegalDocs
      // ("{uid}_doculegal_{docId}") — docuLegalCollection tells us which one
      // to update. Absent on older/Plex documents, defaults to docuLegalDocs.
      // Found 2026-08-16: Syndicat's own signed documents never auto-marked
      // "Signé" because this always wrote to the wrong collection.
      const docuLegalOwnerId = first.docuLegalOwnerId;
      if (docuLegalOwnerId) {
        try {
          const collectionName = first.docuLegalCollection === "legalDocuments" ? "legalDocuments" : "docuLegalDocs";
          const idSuffix = first.docuLegalCollection === "legalDocuments" ? "_legaldoc_" : "_doculegal_";
          await db.collection(collectionName).doc(`${docuLegalOwnerId}${idSuffix}${docId}`).set({
            status: "Signé",
            ...(driveFileUrl ? { fileUrl: driveFileUrl } : {}),
          }, { merge: true });
        } catch (updateErr) {
          console.error("[finalize-signature-group] docuLegal status update failed:", updateErr);
        }
      }

      return res.json({ success: true, allSigned: true, signedCount: signedDocs.length, totalSigners, fileUrl: driveFileUrl });
    } catch (error: any) {
      console.error("finalize-signature-group error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── SuperAdmin: Email a generated platform invoice to the client ───────────
  app.post("/api/send-invoice-email", async (req, res) => {
    try {
      const { pdfBase64, clientEmail, clientName, adminEmail, invoiceNumber, planLabel, total } = req.body;

      if (!pdfBase64 || !clientEmail || !invoiceNumber) {
        return res.status(400).json({ success: false, error: "pdfBase64, clientEmail and invoiceNumber are required" });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      // Dedicated billing sender — intentionally not RESEND_FROM_EMAIL, which is
      // DocuLegal's address. The domain is fully verified in Resend, so any
      // @autocompt.ca address works here regardless of RESEND_FROM_EMAIL's value.
      const fromEmail = process.env.RESEND_INVOICE_FROM_EMAIL || "AutoCompt Facturation <facturation@autocompt.ca>";
      if (!resendApiKey) {
        return res.status(500).json({ success: false, error: "RESEND_API_KEY not configured" });
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:0">
          <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
            <div style="background:linear-gradient(135deg,#059669,#10b981);padding:32px 40px">
              <div style="color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;opacity:0.85">AutoCompt · Facturation</div>
              <div style="color:#fff;font-size:22px;font-weight:900;margin-top:8px">Facture ${invoiceNumber}</div>
            </div>
            <div style="padding:32px 40px">
              <p style="color:#374151;font-size:15px;margin:0 0 16px">
                Bonjour ${clientName || ""}, veuillez trouver ci-joint votre facture AutoCompt.
              </p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px">
                <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px">Abonnement</div>
                <div style="font-size:16px;font-weight:900;color:#111827">${planLabel || ""}</div>
                <div style="font-size:20px;font-weight:900;color:#059669;margin-top:8px">${Number(total || 0).toFixed(2)} $ TTC</div>
              </div>
              <p style="color:#9ca3af;font-size:11px;margin:0">
                Gestions Solutions G.PA INC. — NEQ: 1179999900<br>
                TPS: 75385 8620 RT 0001 — TVQ: 12 3186 5353 TQ 0001
              </p>
            </div>
            <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center">
              <p style="color:#9ca3af;font-size:11px;margin:0">
                AutoCompt Canada · <a href="https://www.autocompt.ca" style="color:#059669">www.autocompt.ca</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [clientEmail],
          cc: adminEmail ? [adminEmail] : undefined,
          subject: `Facture AutoCompt ${invoiceNumber}`,
          html: emailHtml,
          attachments: [{
            filename: `Facture_AutoCompt_${invoiceNumber}.pdf`,
            content: pdfBase64,
          }],
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        console.error("[Invoice email] Resend error:", errBody);
        return res.status(502).json({ success: false, error: "Resend rejected the email" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("send-invoice-email error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── Client invoices: email a real one-click send on behalf of an AutoCompt
  // user's own company (property manager -> their tenant/client). Distinct
  // from /api/send-invoice-email above, which is AutoCompt's own subscription
  // billing to beta users with hardcoded AutoCompt branding — this route is
  // dynamic per company (name/color from the caller's own userProfile) and
  // requires the caller to be authenticated, since it's sent as them.
  app.post("/api/send-client-invoice-email", async (req, res) => {
    try {
      const auth = await verifyRequestAuth(req.headers.authorization);
      if (!auth) {
        console.error("[send-client-invoice-email] 401: no/invalid auth token");
        return res.status(401).json({ success: false, error: "Non authentifié" });
      }

      const {
        pdfBase64, clientEmail, clientName, companyName, companyColor,
        invoiceId, invoiceTotal, invoiceDate, replyToEmail, docType,
      } = req.body;

      console.log(`[send-client-invoice-email] request from uid=${auth.uid} -> clientEmail=${clientEmail} invoiceId=${invoiceId} pdfBase64Length=${pdfBase64 ? pdfBase64.length : 0}`);

      if (!pdfBase64 || !clientEmail || !invoiceId) {
        console.error(`[send-client-invoice-email] 400: missing required field(s) — pdfBase64=${!!pdfBase64} clientEmail=${!!clientEmail} invoiceId=${!!invoiceId}`);
        return res.status(400).json({ success: false, error: "pdfBase64, clientEmail et invoiceId sont requis" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
        console.error(`[send-client-invoice-email] 400: invalid clientEmail format: ${clientEmail}`);
        return res.status(400).json({ success: false, error: "Courriel du client invalide" });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error("[send-client-invoice-email] 500: RESEND_API_KEY not configured");
        return res.status(500).json({ success: false, error: "RESEND_API_KEY not configured" });
      }

      // Basic HTML-escaping for values interpolated into the email body —
      // these come from user-editable company/client fields, not just IDs.
      const esc = (v: any) => String(v ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
      // Separate sanitizer for header fields (From display name, Subject) —
      // strips line breaks (header-injection) and characters that would
      // confuse the "Display Name <email>" syntax; must NOT be HTML-escaped
      // or "&amp;" would show up literally in the client's inbox.
      const headerSafe = (v: any) => String(v ?? "").replace(/[\r\n<>"]/g, "").trim();

      const safeCompany = esc(companyName || "Votre entreprise");
      const safeClient = esc(clientName || "");
      const safeDocType = esc(docType || "Facture");
      const fromName = headerSafe(companyName || "Votre entreprise") || "Votre entreprise";
      const subjectDocType = headerSafe(docType || "Facture") || "Facture";
      const subjectInvoiceId = headerSafe(invoiceId);
      const accent = /^#[0-9a-fA-F]{6}$/.test(companyColor || "") ? companyColor : "#059669";
      const total = Number(invoiceTotal || 0).toFixed(2);

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:0">
          <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
            <div style="background:${accent};padding:32px 40px">
              <div style="color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;opacity:0.85">${safeCompany}</div>
              <div style="color:#fff;font-size:22px;font-weight:900;margin-top:8px">${safeDocType} ${esc(invoiceId)}</div>
            </div>
            <div style="padding:32px 40px">
              <p style="color:#374151;font-size:15px;margin:0 0 16px">
                Bonjour ${safeClient}, veuillez trouver ci-joint votre ${safeDocType.toLowerCase()}.
              </p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px">
                <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px">Montant à payer</div>
                <div style="font-size:22px;font-weight:900;color:${accent}">${total} $</div>
                ${invoiceDate ? `<div style="font-size:11px;color:#9ca3af;margin-top:8px">Émise le ${esc(invoiceDate)}</div>` : ""}
              </div>
              <p style="color:#6b7280;font-size:13px;margin:0">
                Si vous avez des questions, répondez simplement à ce courriel — il sera lu directement par ${safeCompany}.
              </p>
            </div>
            <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center">
              <p style="color:#9ca3af;font-size:10px;margin:0">
                Envoyé via AutoCompt · <a href="https://www.autocompt.ca" style="color:${accent}">www.autocompt.ca</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} via AutoCompt <factures@autocompt.ca>`,
          to: [clientEmail],
          reply_to: isValidEmail(replyToEmail) ? [replyToEmail] : undefined,
          subject: `${subjectDocType} ${subjectInvoiceId} — ${fromName}`,
          html: emailHtml,
          attachments: [{
            filename: `${headerSafe(docType) || "Facture"}_${subjectInvoiceId}.pdf`,
            content: pdfBase64,
          }],
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        console.error(`[send-client-invoice-email] Resend rejected (status ${resp.status}):`, JSON.stringify(errBody));
        return res.status(502).json({ success: false, error: "Resend a refusé l'envoi du courriel" });
      }

      const resendData = await resp.json().catch(() => ({}));
      console.log(`[send-client-invoice-email] sent OK — resend id=${resendData?.id} to=${clientEmail}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[send-client-invoice-email] uncaught exception:", error?.message || error, error?.stack);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── Send an accounting report (GIFI/CSV/PDF export) to the client's accountant ──
  // Generic multi-attachment version of send-client-invoice-email above — used
  // by "Export Comptable" (Journal/Grand Livre/Balance/TPS-TVQ/GIFI) so the
  // accountant receives the real file directly instead of the user manually
  // forwarding a downloaded file, or the old fake "Envoyer par Email" simulator.
  app.post("/api/send-report-email", async (req, res) => {
    try {
      const auth = await verifyRequestAuth(req.headers.authorization);
      if (!auth) {
        console.error("[send-report-email] 401: no/invalid auth token");
        return res.status(401).json({ success: false, error: "Non authentifié" });
      }

      const {
        recipientEmail, recipientName, companyName, companyColor,
        reportLabel, replyToEmail, attachments,
      } = req.body;

      console.log(`[send-report-email] request from uid=${auth.uid} -> recipientEmail=${recipientEmail} reportLabel=${reportLabel} attachments=${Array.isArray(attachments) ? attachments.length : 0}`);

      if (!recipientEmail || !Array.isArray(attachments) || attachments.length === 0) {
        console.error(`[send-report-email] 400: missing required field(s) — recipientEmail=${!!recipientEmail} attachments=${Array.isArray(attachments) ? attachments.length : "not-array"}`);
        return res.status(400).json({ success: false, error: "recipientEmail et au moins une pièce jointe sont requis" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        console.error(`[send-report-email] 400: invalid recipientEmail format: ${recipientEmail}`);
        return res.status(400).json({ success: false, error: "Courriel du destinataire invalide" });
      }
      if (attachments.some((a: any) => !a || !a.filename || !a.content)) {
        console.error("[send-report-email] 400: an attachment is missing filename/content");
        return res.status(400).json({ success: false, error: "Chaque pièce jointe doit avoir un nom et un contenu" });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error("[send-report-email] 500: RESEND_API_KEY not configured");
        return res.status(500).json({ success: false, error: "RESEND_API_KEY not configured" });
      }

      const esc = (v: any) => String(v ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
      const headerSafe = (v: any) => String(v ?? "").replace(/[\r\n<>"]/g, "").trim();
      const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");

      const safeCompany = esc(companyName || "Votre entreprise");
      const safeRecipient = esc(recipientName || "");
      const safeReportLabel = esc(reportLabel || "Rapport comptable");
      const fromName = headerSafe(companyName || "Votre entreprise") || "Votre entreprise";
      const subjectLabel = headerSafe(reportLabel || "Rapport comptable");
      const accent = /^#[0-9a-fA-F]{6}$/.test(companyColor || "") ? companyColor : "#059669";
      const fileList = attachments.map((a: any) => `<li style="margin:4px 0">${esc(a.filename)}</li>`).join("");

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:0">
          <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
            <div style="background:${accent};padding:32px 40px">
              <div style="color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;opacity:0.85">${safeCompany}</div>
              <div style="color:#fff;font-size:22px;font-weight:900;margin-top:8px">${safeReportLabel}</div>
            </div>
            <div style="padding:32px 40px">
              <p style="color:#374151;font-size:15px;margin:0 0 16px">
                Bonjour ${safeRecipient || ""}, veuillez trouver ci-joint le rapport comptable généré depuis AutoCompt.
              </p>
              <ul style="color:#374151;font-size:13px;padding-left:20px;margin:0 0 16px">${fileList}</ul>
              <p style="color:#6b7280;font-size:13px;margin:0">
                Si vous avez des questions, répondez simplement à ce courriel.
              </p>
            </div>
            <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center">
              <p style="color:#9ca3af;font-size:10px;margin:0">
                Envoyé via AutoCompt · <a href="https://www.autocompt.ca" style="color:${accent}">www.autocompt.ca</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} via AutoCompt <factures@autocompt.ca>`,
          to: [recipientEmail],
          reply_to: isValidEmail(replyToEmail) ? [replyToEmail] : undefined,
          subject: `${subjectLabel} — ${fromName}`,
          html: emailHtml,
          attachments: attachments.map((a: any) => ({
            filename: headerSafe(a.filename) || "rapport",
            content: a.content,
          })),
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        console.error(`[send-report-email] Resend rejected (status ${resp.status}):`, JSON.stringify(errBody));
        return res.status(502).json({ success: false, error: "Resend a refusé l'envoi du courriel" });
      }

      const resendData = await resp.json().catch(() => ({}));
      console.log(`[send-report-email] sent OK — resend id=${resendData?.id} to=${recipientEmail}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[send-report-email] uncaught exception:", error?.message || error, error?.stack);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Extra PIN gate in front of the SuperAdmin panel for the shared
  // correo.solutionsgpa@gmail.com account (Daniel also signs into it for his
  // own regular work) — checked server-side so the PIN itself never ships in
  // the client bundle. Fabiola's other SuperAdmin email (info@autocompt.ca,
  // not shared) never calls this at all. Added 2026-08-21.
  app.post("/api/verify-superadmin-pin", async (req, res) => {
    try {
      const auth = await verifyRequestAuth(req.headers.authorization);
      if (!auth) return res.status(401).json({ valid: false });
      const { pin } = req.body;
      const SUPERADMIN_PIN = "0505";
      return res.json({ valid: String(pin) === SUPERADMIN_PIN });
    } catch (err: any) {
      console.error("[verify-superadmin-pin] error:", err);
      return res.status(500).json({ valid: false });
    }
  });

  // SuperAdmin-only cleanup for a test account: removes the Firebase Auth
  // credential, the users/{uid} profile doc, and every company that account
  // owns. Fabiola asked for this after doing all three by hand (via one-off
  // Admin SDK scripts) several times while beta-testing — she needs a real
  // button so test profiles don't pile up. Never touches companies where
  // this uid is only a collaborator (someone else's real data) — ownership
  // only. Irreversible; the client must confirm before calling this.
  app.post("/api/superadmin-delete-user", async (req, res) => {
    try {
      const caller = await verifyRequestAuth(req.headers.authorization);
      if (!caller || !isSuperAdminEmail(caller.email)) {
        return res.status(403).json({ success: false, error: "Accès refusé" });
      }
      const { uid } = req.body;
      if (!uid || typeof uid !== "string") {
        return res.status(400).json({ success: false, error: "uid requis" });
      }
      if (uid === caller.uid) {
        return res.status(400).json({ success: false, error: "Impossible de supprimer votre propre compte." });
      }

      const db = getAdminDb();
      const companiesSnap = await db.collection("companies").where("ownerId", "==", uid).get();
      const deletedCompanies: string[] = [];
      for (const doc of companiesSnap.docs) {
        deletedCompanies.push(doc.data()?.nombre || doc.id);
        await doc.ref.delete();
      }

      await db.collection("users").doc(uid).delete();

      try {
        await getAdminAuth().deleteUser(uid);
      } catch (authErr: any) {
        // Firestore side is already cleaned up — report the partial
        // success rather than a bare 500, so the caller isn't left
        // guessing whether anything happened.
        console.error("[superadmin-delete-user] Auth deletion failed:", authErr?.message || authErr);
        return res.json({
          success: true,
          authDeleted: false,
          deletedCompanies,
          warning: "Profil et entreprises supprimés, mais le compte Auth n'a pas pu être retiré : " + (authErr?.message || "erreur inconnue"),
        });
      }

      return res.json({ success: true, authDeleted: true, deletedCompanies });
    } catch (err: any) {
      console.error("[superadmin-delete-user] error:", err);
      return res.status(500).json({ success: false, error: err.message || "Erreur inconnue" });
    }
  });

  // Sends a freshly generated beta access code directly to the invitee —
  // used by the "Codes Bêta" admin tab so the code doesn't have to be
  // copy-pasted manually into a separate email client.
  app.post("/api/send-beta-code-email", async (req, res) => {
    try {
      const auth = await verifyRequestAuth(req.headers.authorization);
      if (!auth) {
        console.error("[send-beta-code-email] 401: no/invalid auth token");
        return res.status(401).json({ success: false, error: "Non authentifié" });
      }

      const { recipientEmail, code, validDays } = req.body;
      console.log(`[send-beta-code-email] request from uid=${auth.uid} -> recipientEmail=${recipientEmail} code=${code}`);

      if (!recipientEmail || !code) {
        console.error(`[send-beta-code-email] 400: missing required field(s) — recipientEmail=${!!recipientEmail} code=${!!code}`);
        return res.status(400).json({ success: false, error: "recipientEmail et code sont requis" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        console.error(`[send-beta-code-email] 400: invalid recipientEmail format: ${recipientEmail}`);
        return res.status(400).json({ success: false, error: "Courriel du destinataire invalide" });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error("[send-beta-code-email] 500: RESEND_API_KEY not configured");
        return res.status(500).json({ success: false, error: "RESEND_API_KEY not configured" });
      }

      const esc = (v: any) => String(v ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
      const safeCode = esc(code);
      const safeDays = esc(validDays || 30);

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:0">
          <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
            <div style="background:#059669;padding:32px 40px">
              <div style="color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;opacity:0.85">AutoCompt</div>
              <div style="color:#fff;font-size:22px;font-weight:900;margin-top:8px">Votre accès bêta</div>
            </div>
            <div style="padding:32px 40px">
              <p style="color:#374151;font-size:15px;margin:0 0 16px">
                Bonjour, voici votre code d'accès à la version bêta d'AutoCompt.
              </p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin:0 0 16px">
                <div style="font-size:24px;font-weight:900;letter-spacing:3px;color:#059669">${safeCode}</div>
              </div>
              <p style="color:#374151;font-size:13px;margin:0 0 16px">
                Rendez-vous sur <a href="https://autocompt-app.vercel.app" style="color:#059669">autocompt-app.vercel.app</a>,
                entrez ce code avec l'adresse courriel <strong>${esc(recipientEmail)}</strong> pour créer votre compte.
                Ce code est valide ${safeDays} jours et à usage unique.
              </p>
              <p style="color:#6b7280;font-size:13px;margin:0">
                Si vous avez des questions, répondez simplement à ce courriel.
              </p>
            </div>
            <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center">
              <p style="color:#9ca3af;font-size:10px;margin:0">
                Envoyé via AutoCompt · <a href="https://www.autocompt.ca" style="color:#059669">www.autocompt.ca</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `AutoCompt <factures@autocompt.ca>`,
          to: [recipientEmail],
          subject: `Votre code d'accès bêta AutoCompt : ${code}`,
          html: emailHtml,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        console.error(`[send-beta-code-email] Resend rejected (status ${resp.status}):`, JSON.stringify(errBody));
        return res.status(502).json({ success: false, error: "Resend a refusé l'envoi du courriel" });
      }

      const resendData = await resp.json().catch(() => ({}));
      console.log(`[send-beta-code-email] sent OK — resend id=${resendData?.id} to=${recipientEmail}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[send-beta-code-email] uncaught exception:", error?.message || error, error?.stack);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── Google Drive: connect a company's Drive permanently (authorization-code flow) ──
  // The client sends the one-time `code` from google.accounts.oauth2.initCodeClient.
  // We exchange it for a refresh token here (needs the Client Secret, server-only) and
  // store it keyed by the company's OWNER uid — never the current viewer's uid — so
  // every collaborator invited to the company shares the same connected Drive.
  app.post("/api/drive/connect", async (req, res) => {
    try {
      const auth = await verifyRequestAuth(req.headers.authorization);
      if (!auth) return res.status(401).json({ success: false, error: "Non authentifié" });

      const { code, companyId, ownerId, redirectUri } = req.body;
      if (!code || !companyId || !ownerId || !redirectUri) {
        return res.status(400).json({ success: false, error: "code, companyId, ownerId et redirectUri sont requis" });
      }

      const authorized = await isAuthorizedForCompany(auth.uid, ownerId, companyId);
      if (!authorized) return res.status(403).json({ success: false, error: "Accès refusé à cette entreprise" });

      const tokens = await exchangeCodeForTokens(code, redirectUri);
      const connectedEmail = await getGoogleUserEmail(tokens.accessToken);
      const folderId = await getOrCreateDriveFolderServer("AutoCompt", "root", tokens.accessToken);

      const db = getAdminDb();
      const credId = driveCredDocId(ownerId, companyId);
      const credRef = db.collection("driveCredentials").doc(credId);

      // Google only returns a refresh_token on first consent — if this is a
      // reconnect where none came back, keep the previously stored one.
      let refreshToken = tokens.refreshToken;
      if (!refreshToken) {
        const existing = await credRef.get();
        refreshToken = existing.exists ? existing.data()?.refreshToken : null;
      }
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: "Google n'a pas renvoyé de jeton permanent. Révoquez l'accès dans votre compte Google (myaccount.google.com/permissions) puis reconnectez.",
        });
      }

      const connectedAt = new Date().toISOString();
      await credRef.set({ refreshToken, connectedEmail, folderId, folderName: "AutoCompt", connectedAt, ownerId, companyShortId: companyId }, { merge: true });

      await db.collection("companyDriveConfig").doc(credId).set({
        ownerId,
        companyId: companyDocId(ownerId, companyId),
        connectedEmail,
        folderId,
        folderName: "AutoCompt",
        connectedAt,
        connected: true,
        sharedAccess: true, // marks this as using the permanent server-backed flow
      }, { merge: true });

      return res.json({ success: true, connectedEmail, folderId, folderName: "AutoCompt", connectedAt });
    } catch (err: any) {
      console.error("[drive/connect] error:", err);
      return res.status(500).json({ success: false, error: err.message || "Erreur de connexion Google Drive" });
    }
  });

  // ── Google Drive: upload a file to the company's shared Drive ──────────────
  // Works for ANY collaborator on the company, not just whoever connected it —
  // the server mints a fresh access token from the stored refresh token each call.
  app.post("/api/drive/upload", async (req, res) => {
    try {
      const auth = await verifyRequestAuth(req.headers.authorization);
      if (!auth) return res.status(401).json({ success: false, error: "Non authentifié" });

      const { companyId, ownerId, fileName, mimeType, base64Data, companyName, category, year, clientName, buildingName } = req.body;
      if (!companyId || !ownerId || !fileName || !base64Data) {
        return res.status(400).json({ success: false, error: "companyId, ownerId, fileName et base64Data sont requis" });
      }

      const authorized = await isAuthorizedForCompany(auth.uid, ownerId, companyId);
      if (!authorized) return res.status(403).json({ success: false, error: "Accès refusé à cette entreprise" });

      const db = getAdminDb();
      const credSnap = await db.collection("driveCredentials").doc(driveCredDocId(ownerId, companyId)).get();
      if (!credSnap.exists) {
        return res.status(400).json({ success: false, error: "not_connected", message: "Google Drive n'est pas connecté pour cette entreprise." });
      }

      let accessToken: string;
      try {
        accessToken = await refreshAccessToken(credSnap.data()!.refreshToken);
      } catch (refreshErr: any) {
        console.error("[drive/upload] token refresh failed:", refreshErr.message);
        return res.status(400).json({ success: false, error: "reconnect_required", message: "L'accès Google Drive a été révoqué. Reconnectez le Drive de cette entreprise." });
      }

      const folderId = await resolveCompanyDriveFolder(accessToken, companyName, category, year, clientName, buildingName);
      const file = await uploadBase64ToDrive(accessToken, folderId, fileName, mimeType, base64Data);

      return res.json({ success: true, fileId: file.id, webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view` });
    } catch (err: any) {
      console.error("[drive/upload] error:", err);
      return res.status(500).json({ success: false, error: err.message || "Erreur de téléversement Google Drive" });
    }
  });

  // ── Google Drive: upload from the PUBLIC signature page (no Firebase Auth — ──
  // the external signer never has an AutoCompt account). Trust is anchored to the
  // unique signing token instead: the request must match the companyId/ownerId
  // already recorded on that pendingSignatures doc, which only the legitimate
  // signing link (sent by the admin) could have produced.
  app.post("/api/drive/upload-public", async (req, res) => {
    try {
      const { companyId, ownerId, fileName, mimeType, base64Data, companyName, category, year, token } = req.body;
      if (!companyId || !ownerId || !fileName || !base64Data || !token) {
        return res.status(400).json({ success: false, error: "companyId, ownerId, fileName, base64Data et token sont requis" });
      }

      const db = getAdminDb();
      const pendingSnap = await db.collection("pendingSignatures").doc(token).get();
      if (!pendingSnap.exists) {
        return res.status(403).json({ success: false, error: "Jeton de signature invalide" });
      }
      const pending = pendingSnap.data()!;
      if (pending.companyId !== companyId || pending.ownerId !== ownerId) {
        return res.status(403).json({ success: false, error: "Jeton de signature ne correspond pas à cette entreprise" });
      }

      const credSnap = await db.collection("driveCredentials").doc(driveCredDocId(ownerId, companyId)).get();
      if (!credSnap.exists) {
        return res.status(400).json({ success: false, error: "not_connected" });
      }

      let accessToken: string;
      try {
        accessToken = await refreshAccessToken(credSnap.data()!.refreshToken);
      } catch {
        return res.status(400).json({ success: false, error: "reconnect_required" });
      }

      const folderId = await resolveCompanyDriveFolder(accessToken, companyName, category, year);
      const file = await uploadBase64ToDrive(accessToken, folderId, fileName, mimeType, base64Data);

      return res.json({ success: true, fileId: file.id, webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view` });
    } catch (err: any) {
      console.error("[drive/upload-public] error:", err);
      return res.status(500).json({ success: false, error: err.message || "Erreur de téléversement Google Drive" });
    }
  });

  // ── Google Drive: disconnect a company's Drive (owner only — affects every collaborator) ──
  app.post("/api/drive/disconnect", async (req, res) => {
    try {
      const auth = await verifyRequestAuth(req.headers.authorization);
      if (!auth) return res.status(401).json({ success: false, error: "Non authentifié" });

      const { companyId, ownerId } = req.body;
      if (!companyId || !ownerId) return res.status(400).json({ success: false, error: "companyId et ownerId sont requis" });
      if (auth.uid !== ownerId) return res.status(403).json({ success: false, error: "Seul le propriétaire de l'entreprise peut déconnecter le Drive" });

      const db = getAdminDb();
      const credId = driveCredDocId(ownerId, companyId);
      const credSnap = await db.collection("driveCredentials").doc(credId).get();

      if (credSnap.exists) {
        const refreshToken = credSnap.data()?.refreshToken;
        if (refreshToken) {
          try {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: "POST" });
          } catch { /* best-effort revoke */ }
        }
        await db.collection("driveCredentials").doc(credId).delete();
      }

      await db.collection("companyDriveConfig").doc(credId).set({ connected: false, connectedEmail: "", folderId: null }, { merge: true });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[drive/disconnect] error:", err);
      return res.status(500).json({ success: false, error: err.message || "Erreur de déconnexion" });
    }
  });

  // ── Cron: daily check for trials expiring in 5 days ─────────────────────────
  // Triggered by Vercel Cron (see vercel.json "crons") once a day. Vercel signs
  // these requests with an Authorization: Bearer <CRON_SECRET> header when
  // CRON_SECRET is set on the project — reject anything else so this endpoint
  // can't be hit publicly to spam Resend or leak how many trials exist.
  app.get("/api/cron/trial-reminders", async (req, res) => {
    try {
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ success: false, error: "Non authentifié" });
      }

      const db = getAdminDb();
      // Small dataset at beta scale — fetch all users and filter in memory
      // rather than a Firestore inequality query (avoids index/quirks for a
      // one-field filter that'll never need to scale beyond a few hundred docs).
      const snap = await db.collection("users").get();

      const soonToExpire: { email: string; name: string; daysLeft: number }[] = [];
      const batch = db.batch();

      for (const docSnap of snap.docs) {
        const u = docSnap.data();
        if (!u.trialStartDate || u.trialReminderSent) continue;
        const validDays = u.trialValidDays ?? 30;
        const daysElapsed = (Date.now() - new Date(u.trialStartDate).getTime()) / 86400000;
        const daysLeft = Math.max(0, Math.ceil(validDays - daysElapsed));
        if (daysLeft <= 5 && daysLeft > 0) {
          soonToExpire.push({ email: u.email || docSnap.id, name: u.name || u.email || docSnap.id, daysLeft });
          batch.update(docSnap.ref, { trialReminderSent: true });
        }
      }

      if (soonToExpire.length === 0) {
        return res.json({ success: true, notified: 0 });
      }

      await batch.commit();

      const resendApiKey = process.env.RESEND_API_KEY;
      const notifyEmail = process.env.TRIAL_REMINDER_NOTIFY_EMAIL || "correo.solutionsgpa@gmail.com";
      if (resendApiKey) {
        const rowsHtml = soonToExpire
          .map((u) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${u.name}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${u.email}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${u.daysLeft} j</td></tr>`)
          .join("");
        const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif">
          <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
            <div style="background:linear-gradient(135deg,#059669,#10b981);padding:28px 36px">
              <div style="color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;opacity:0.85">AutoCompt · Essais bêta</div>
              <div style="color:#fff;font-size:20px;font-weight:900;margin-top:6px">${soonToExpire.length} essai(s) expirent bientôt</div>
            </div>
            <div style="padding:28px 36px">
              <p style="color:#374151;font-size:14px">Envoyez-leur le courriel de prolongation (bouton ✉️ dans SuperAdmin → Utilisateurs) pour leur offrir un mois gratuit additionnel.</p>
              <table style="width:100%;border-collapse:collapse;margin-top:12px">
                <thead><tr><th style="text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#9ca3af">Nom</th><th style="text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#9ca3af">Courriel</th><th style="padding:8px 12px;font-size:11px;text-transform:uppercase;color:#9ca3af">Restant</th></tr></thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>
          </div>
        </body></html>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "AutoCompt <info@autocompt.ca>",
            to: [notifyEmail],
            subject: `⏳ ${soonToExpire.length} essai(s) AutoCompt expirent dans 5 jours ou moins`,
            html,
          }),
        }).catch((err) => console.error("[cron/trial-reminders] Resend error:", err));
      }

      return res.json({ success: true, notified: soonToExpire.length });
    } catch (err: any) {
      console.error("[cron/trial-reminders] error:", err);
      return res.status(500).json({ success: false, error: err.message || "Erreur cron" });
    }
  });

  return app;
}

let appPromise: Promise<express.Express> | null = null;
export default async function handler(req: express.Request, res: express.Response) {
  if (!appPromise) appPromise = buildApp();
  const app = await appPromise;
  return app(req, res);
}
