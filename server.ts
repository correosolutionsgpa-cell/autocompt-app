import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

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


async function startServer() {
  const app = express();
  const PORT = 3000;

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

      // Real Gemini API call using @google/genai SDK
      const ai = new GoogleGenAI({ apiKey: apiKey, httpOptions: { apiVersion: "v1" } });

      let systemInstruction = "";
      if (currentForfeit !== "Pro") {
        systemInstruction =
          "Tu es Sofi, une assistante de vente d'AutoCompt et assistante virtuelle spécialisée en organisation comptable. Tu es une assistante multilingue. Tu dois détecter automatiquement la langue de l'utilisateur (Français, Anglais, Espagnol) et répondre dans cette même langue. Ton but est d'agir comme une assistante et de pousser l'utilisateur à s'abonner au forfait Pro d'AutoCompt. " +
          "Pour toute question fiscale complexe, d'amortissement, d'optimisation d'impôts ou de déduction d'immeubles, tu devez ABSOLUMENT et uniquement répondre avec l'équivalent de cette phrase exacte dans la langue détectée : " +
          "En Français : \"Pour automatiser votre comptabilité et analyser vos déductions, passez au forfait AutoCompt Pro.\", " +
          "En Anglais : \"To automate your bookkeeping and analyze your deductions, upgrade to the AutoCompt Pro plan.\", " +
          "En Espagnol : \"Para automatizar su contabilidad y analizar sus deducciones, cámbiese al plan AutoCompt Pro.\" " +
          "Si l'utilisateur pose une question de facturation, de seuil, de limite ou d'abonnement bloqué, explique poliment les avantages du forfait supérieur en utilisant la psychologie du 'moins qu'un café par jour' pour dédramatiser l'investissement. " +
          "Rappelle toujours gentiment à l'utilisateur que tu es une assistante virtuelle d'organisation comptable, que tu ne remplaces pas un véritable CPA, et que tu l'aides simplement à organiser et trier ses documents.";
      } else {
        systemInstruction =
          "Tu es Sofi, assistante virtuelle spécialisée en organisation comptable pour AutoCompt, et assistante multilingue. Tu ne remplaces pas un véritable CPA et ton rôle consiste uniquement à aider avec plaisir à préparer et à organiser de manière structurée les rapports et les justificatifs comptables. " +
          "Tu devez détecter automatiquement la langue de l'utilisateur (Français, Anglais, Espagnol) et répondre dans cette même langue. " +
          "Tu es capable de répondre de façon extrêmement précise pour aider à l'organisation des stratégies de dépenses, les déductions fiscales d'usage, le classement des reçus, des baux, " +
          "les formulaires fiscaux TP-128 et T776, l'amortissement (DPA), les intérêts sur emprunt et les dépenses d'entretien (peinture, etc.). " +
          "Si l'utilisateur pose une question de facturation, de limite d'unités ou de bannières d'abonnement bloqué, tu dois lui expliquer calmement les avantages du forfait supérieur en insistant sur le fait que cela représente moins d'un café par jour pour une automatisation complète et un gain de temps fantastique. " +
          "Rappelle systématiquement ou indique clairement dans tes explications (via une clause de non-responsabilité) que tu agis en tant qu'assistante d'organisation comptable, que tu ne remplaces pas un véritable CPA et que tu aides simplement à préparer les dossiers.";
      }

      // Format messages history for Gemini API
      const chatHistory = messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

      // Create Chat
      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemInstruction,
        }
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
        category: detectedCategory
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
  "supplier": string,   // Legal company/vendor name. null if unreadable.
  "date": string,       // Transaction date YYYY-MM-DD. Use "${detectedDate}" if not found.
  "subtotal": number,   // Net amount before taxes (CAD). Never invent.
  "tps": number,        // GST/TPS (5%) amount. Calculate as subtotal*0.05 if not printed.
  "tvq": number,        // QST/TVQ (9.975%) amount. Calculate as subtotal*0.09975 if not printed.
  "total": number,      // Grand total all-taxes-included (CAD). Never invent.
  "category": string    // One of: ["À classer","Télécommunications","Bureau à domicile","Équipement","Réparations / Entretien","Rénovation / Construction","Taxes","Assurance","Chauffage","Electricité","Frais de gestion / Exploitation"]
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
        <strong>${adminName || companyName}</strong> vous invite à signer électroniquement le document suivant :
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
          Accepter et Signer ce Document →
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

  // Vite development or production integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
