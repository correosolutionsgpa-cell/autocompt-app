import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

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
      const ai = new GoogleGenAI({ apiKey: apiKey });

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
        model: "gemini-3.5-flash",
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
        const lastDot   = stripped.lastIndexOf('.');
        const lastSep   = Math.max(lastComma, lastDot);
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

      // 2. REAL GEMINI VISION EXTRACTION (if API Key is initialized)
      if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "" && base64Data) {
        console.log("Real Gemini Vision scan invocation -> extracting invoice from live capture");
        const ai = new GoogleGenAI({ apiKey: apiKey });

        const imagePart = {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: base64Data
          }
        };

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            imagePart,
            `Analyze this receipt or invoice image. Extract the following properties:
            1. Supplier or company name / 'fournisseur' (e.g. 'Rona', 'Québec Tel', 'Bell')
            2. Date in YYYY-MM-DD format (if none is located, use '${detectedDate}')
            3. Net subtotal amount (numerical value)
            4. TPS tax (GST 5%) amount (numerical value) - if not specified, calculate as subtotal * 0.05
            5. TVQ tax (QST 9.975%) amount (numerical value) - if not specified, calculate as subtotal * 0.09975
            6. Total amount (numerical value)
            7. The single most appropriate bookkeeping account category selection from this discrete list:
               ["À classer", "Télécommunications", "Bureau à domicile", "Équipement", "Réparations / Entretien", "Rénovation / Construction", "Taxes", "Assurance", "Chauffage", "Electricité", "Frais de gestion / Exploitation"]
            
            Return ONLY a valid JSON object matching these fields strictly:
            {
              "supplier": string,
              "date": string,
              "subtotal": number,
              "tps": number,
              "tvq": number,
              "total": number,
              "category": string
            }`
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT" as any,
              properties: {
                supplier: { type: "STRING" as any },
                date: { type: "STRING" as any },
                subtotal: { type: "NUMBER" as any },
                tps: { type: "NUMBER" as any },
                tvq: { type: "NUMBER" as any },
                total: { type: "NUMBER" as any },
                category: { type: "STRING" as any }
              },
              required: ["supplier", "date", "subtotal", "tps", "tvq", "total", "category"]
            }
          }
        });

        const textOutput = response.text;
        if (textOutput) {
          const parsed = JSON.parse(textOutput.trim());
          const ocrResult = {
            supplier: parsed.supplier || fallbackResult.supplier,
            date: parsed.date || fallbackResult.date,
            // parseCurrency handles francophone/formatted strings from Gemini ("229,95 $", "$ 1 234.56")
            subtotal: (parsed.subtotal != null && parsed.subtotal !== '') ? parseCurrency(parsed.subtotal) : fallbackResult.subtotal,
            tps:     (parsed.tps     != null && parsed.tps     !== '') ? parseCurrency(parsed.tps)     : fallbackResult.tps,
            tvq:     (parsed.tvq     != null && parsed.tvq     !== '') ? parseCurrency(parsed.tvq)     : fallbackResult.tvq,
            total:   (parsed.total   != null && parsed.total   !== '') ? parseCurrency(parsed.total)   : fallbackResult.total,
            category: parsed.category || fallbackResult.category
          };
          console.log("Real Gemini OCR Vision extraction complete:", ocrResult);
          return res.json(ocrResult);
        }
      }

      console.log("API Key absent or unconfigured -> returning dynamic fallback extraction results:", fallbackResult);
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
