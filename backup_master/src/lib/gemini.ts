import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult, Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
  const systemInstruction = `Role: Core AI Engine for "ComptaHub," a minimalist accounting platform.
Task: Extract structured data from receipts with 100% accuracy.
Rules:
1. Vendor: Full legal name.
2. Date: YYYY-MM-DD.
3. Taxes: TPS: 5%, TVQ: 9.975%. If not specified but total is "Taxes Included", calculate mathematically.
4. Amounts: Subtotal and Grand Total in CAD.
5. Categories: Essence, Repas, Bureau, Entretien, Juridique, Assurance.
6. Payment: Identify card type and last 4 digits.
Output: valid JSON only. Data values in French (Quebec).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data.split(",")[1] || base64Data,
              mimeType: mimeType,
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

    const result = JSON.parse(response.text || "{}");
    return result as ExtractionResult;
  } catch (error) {
    console.error("Extraction failed:", error);
    throw new Error("Failed to extract data. Please ensure the image is clear.");
  }
}
