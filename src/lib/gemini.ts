import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult, Category } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    vendor: {
      type: Type.STRING,
      description: "Nom légal complet du fournisseur.",
    },
    date: {
      type: Type.STRING,
      description: "Date de la transaction au format YYYY-MM-DD.",
    },
    subtotal: {
      type: Type.NUMBER,
      description: "Montant avant taxes en CAD.",
    },
    taxes: {
      type: Type.OBJECT,
      properties: {
        tps: { type: Type.NUMBER, description: "Montant de la TPS (5%)." },
        tvq: { type: Type.NUMBER, description: "Montant de la TVQ (9.975%)." },
      },
      required: ["tps", "tvq"],
    },
    grandTotal: {
      type: Type.NUMBER,
      description: "Montant total payé en CAD.",
    },
    category: {
      type: Type.STRING,
      enum: Object.values(Category),
      description: "Classification automatique.",
    },
    payment: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, description: "Type de carte (ex: Visa, Mastercard)." },
        last4: { type: Type.STRING, description: "Derniers 4 chiffres de la carte.", nullable: true },
      },
      required: ["type"],
    },
  },
  required: ["vendor", "date", "subtotal", "taxes", "grandTotal", "category", "payment"],
};

export async function extractDataFromImage(base64Data: string, mimeType: string): Promise<ExtractionResult> {
  const systemInstruction = `ROLE: Act as an expert, highly precise fiscal auditor for Quebec real estate.
Task: Extract structured data from receipts with 100% accuracy.
Rules:
1. ZERO HALLUCINATION RULE: Extract ONLY the exact text/numbers printed on the receipt. If a number is blurry or unreadable, return null or leave it blank. Never invent totals or guess vendor names.
2. PREDICTIVE CATEGORIZATION: Based on the Vendor name, automatically assign a category from a standard Quebec real estate Chart of Accounts (e.g., Hydro-Québec -> 'Électricité / Énergie', Home Depot -> 'Entretien et réparations', Bell -> 'Télécommunications', etc.). If uncertain, default to 'Non catégorisé'.
3. Date: YYYY-MM-DD.
4. Taxes: TPS: 5%, TVQ: 9.975%. Only if explicitly "Taxes Included" but not listed, calculate mathematically. Otherwise extract exact numbers.
5. Amounts: Subtotal and Grand Total in CAD. Never invent amounts.
6. Payment: Identify card type and last 4 digits.
Output: valid JSON only. Data values in French (Quebec).`;

  // ── Diagnostic logs — visible in browser DevTools console ────────────────
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  console.log("[gemini.ts] extractDataFromImage called");
  console.log("[gemini.ts] API key set:", apiKey ? `YES (${apiKey.slice(0, 8)}...)` : "NO — VITE_GEMINI_API_KEY is missing or empty");
  console.log("[gemini.ts] mimeType:", mimeType);
  console.log("[gemini.ts] base64Data length:", base64Data?.length ?? 0);
  console.log("[gemini.ts] base64Data preview (first 60 chars):", base64Data?.slice(0, 60) ?? "(empty)");

  // Strip data URL prefix if caller forgot to (safety net)
  const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;

  // Normalise MIME type — Gemini Vision accepts image/* and application/pdf.
  // Some browsers/OS report PDFs as "application/octet-stream"; map those back.
  const normalisedMime: string = (
    mimeType === "application/pdf" ||
    mimeType === "application/octet-stream" &&
      (base64Data.slice(0, 8).startsWith("JVBERi0") /* %PDF base64 */) 
      ? "application/pdf"
      : mimeType || "image/jpeg"
  );
  console.log("[gemini.ts] normalisedMime:", normalisedMime);

  try {
    const response = await ai.models.generateContent({
      // Use the stable REST alias — bare 'gemini-1.5-flash' returns 404 on v1beta.
      model: "gemini-1.5-flash-latest",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              // Pass the normalised MIME type so PDFs are sent as application/pdf
              // and handled by Gemini's Document Understanding pipeline.
              mimeType: normalisedMime,
            },
          },
          { text: "Extract the accounting data from this document following the schema." },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA as any,
      },
    });

    console.log("[gemini.ts] Raw API response text:", response.text?.slice(0, 200));
    const result = JSON.parse(response.text || "{}");
    console.log("[gemini.ts] Parsed result:", result);
    return result as ExtractionResult;
  } catch (error: any) {
    console.error("[gemini.ts] Extraction failed:", error?.message ?? error);
    throw new Error(`Failed to extract data: ${error?.message || "unknown error"}. Ensure the image is clear and VITE_GEMINI_API_KEY is valid.`);
  }
}
