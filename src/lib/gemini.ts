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

export interface PayrollEmployeeRow {
  nom: string;
  brut: number;
  deductions: number;
  net: number;
}

export interface PayrollExtractionResult {
  periode: string | null;
  employees: PayrollEmployeeRow[];
}

const PAYROLL_EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    periode: {
      type: Type.STRING,
      description: "Période de paie couverte par ce rapport (ex: '2026-08-01 au 2026-08-15'), ou null si absente du document.",
      nullable: true,
    },
    employees: {
      type: Type.ARRAY,
      description: "Une ligne par employé listé dans le rapport.",
      items: {
        type: Type.OBJECT,
        properties: {
          nom: { type: Type.STRING, description: "Nom complet de l'employé." },
          brut: { type: Type.NUMBER, description: "Salaire brut en CAD." },
          deductions: { type: Type.NUMBER, description: "Total des déductions/retenues en CAD." },
          net: { type: Type.NUMBER, description: "Salaire net versé en CAD." },
        },
        required: ["nom", "brut", "deductions", "net"],
      },
    },
  },
  required: ["employees"],
};

/**
 * Extracts one row per employee from a payroll report produced by an
 * EXTERNAL provider (Nethris, Employeur D, ADP...) — AutoCompt never
 * calculates payroll itself (tax tables, CNESST, RRQ/AE are out of scope
 * and a real liability risk if done wrong); this only reads back numbers
 * the third party already computed, for the user to review/correct before
 * anything is saved. See savePayrollRecordWithJournal's `source` tag,
 * which marks every record derived from this as externally-sourced.
 */
export async function extractPayrollDataFromDocument(base64Data: string, mimeType: string): Promise<PayrollExtractionResult> {
  const systemInstruction = `ROLE: Act as a meticulous data-entry clerk transcribing a payroll report into a table.
Task: Extract ONE ROW PER EMPLOYEE from this payroll report (rapport de paie), produced by an external payroll provider.
Rules:
1. ZERO HALLUCINATION RULE: Extract ONLY numbers/names actually printed on the document. If a value is missing or unreadable for an employee, use 0 for that number rather than inventing one.
2. Do NOT calculate or estimate anything — this document already contains the final, provider-calculated figures. You are transcribing, not computing.
3. One entry in "employees" per distinct employee row found in the report.
4. Amounts in CAD, as plain numbers (no currency symbols).
Output: valid JSON only, matching the schema exactly.`;

  const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const normalisedMime: string = (
    mimeType === "application/pdf" ||
    mimeType === "application/octet-stream" &&
      (base64Data.slice(0, 8).startsWith("JVBERi0"))
      ? "application/pdf"
      : mimeType || "image/jpeg"
  );

  const MODEL_CHAIN = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
  ] as const;

  const contents = {
    parts: [
      { inlineData: { data: cleanBase64, mimeType: normalisedMime } },
      { text: "Extract the payroll table from this document following the schema." },
    ],
  };

  const config = {
    systemInstruction,
    responseMimeType: "application/json",
    responseSchema: PAYROLL_EXTRACTION_SCHEMA as any,
  };

  let lastError: any;
  for (const model of MODEL_CHAIN) {
    try {
      const response = await ai.models.generateContent({ model, contents, config });
      const result = JSON.parse(response.text || "{}");
      if (!Array.isArray(result.employees)) result.employees = [];
      return result as PayrollExtractionResult;
    } catch (err: any) {
      lastError = err;
      const msg: string = err?.message ?? String(err);
      const isModelError =
        msg.includes("404") ||
        msg.toLowerCase().includes("not found") ||
        msg.toLowerCase().includes("not supported") ||
        msg.toLowerCase().includes("deprecated");
      if (!isModelError) break;
    }
  }

  throw new Error(
    `Failed to extract payroll data: ${lastError?.message || "unknown error"}. ` +
    `Ensure the document is clear and VITE_GEMINI_API_KEY is valid.`
  );
}

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

  // Model fallback chain — no -latest suffixes (they 404 on v1beta).
  // Each entry is tried in order; on a 404 / model-not-found error we move to the next.
  // Google retired the whole gemini-1.0/1.5 family in 2025 — use current 2.5-series models.
  const MODEL_CHAIN = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
  ] as const;

  const contents = {
    parts: [
      {
        inlineData: {
          data: cleanBase64,
          // Pass the normalised MIME type so PDFs use Gemini's Document Understanding pipeline.
          mimeType: normalisedMime,
        },
      },
      { text: "Extract the accounting data from this document following the schema." },
    ],
  };

  const config = {
    systemInstruction,
    responseMimeType: "application/json",
    responseSchema: EXTRACTION_SCHEMA as any,
  };

  let lastError: any;

  for (const model of MODEL_CHAIN) {
    try {
      console.log(`[gemini.ts] Trying model: ${model}`);
      const response = await ai.models.generateContent({ model, contents, config });
      console.log(`[gemini.ts] Success with model: ${model}`);
      console.log("[gemini.ts] Raw API response text:", response.text?.slice(0, 200));
      const result = JSON.parse(response.text || "{}");
      console.log("[gemini.ts] Parsed result:", result);
      return result as ExtractionResult;
    } catch (err: any) {
      lastError = err;
      const msg: string = err?.message ?? String(err);
      // Only continue to fallback if this looks like a model-not-found / unavailable error.
      const isModelError =
        msg.includes("404") ||
        msg.toLowerCase().includes("not found") ||
        msg.toLowerCase().includes("not supported") ||
        msg.toLowerCase().includes("deprecated");
      console.warn(`[gemini.ts] Model ${model} failed (${msg.slice(0, 120)}). ${isModelError ? "Trying next model..." : "Non-model error — aborting chain."}`);
      if (!isModelError) break; // Don't retry on auth errors, quota errors, etc.
    }
  }

  console.error("[gemini.ts] All models in chain failed. Last error:", lastError?.message ?? lastError);
  throw new Error(
    `Failed to extract data: ${lastError?.message || "unknown error"}. ` +
    `Ensure the image is clear and VITE_GEMINI_API_KEY is valid.`
  );
}
