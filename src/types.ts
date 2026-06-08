export enum Category {
  Gas = "Essence",
  Meals = "Repas",
  Office = "Bureau",
  Maintenance = "Entretien",
  Legal = "Juridique",
  Insurance = "Assurance",
  Other = "Autre"
}

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  billing_notes?: string;
  official_language: 'fr' | 'en';
  ownerId: string;
}

export interface TaxBreakdown {
  tps: number;
  tvq: number;
}

export interface ExtractionResult {
  vendor: string;
  date: string; // YYYY-MM-DD
  subtotal: number;
  taxes: TaxBreakdown;
  grandTotal: number;
  category: Category;
  payment: {
    type: string;
    last4: string | null;
  };
}

export interface DocumentEntry {
  id: string;
  timestamp: string;
  fileName: string;
  fileData: string; // base64
  companyId: string;
  ownerId: string;
  result: ExtractionResult;
  fileUrl?: string; // Cloud Storage URL (if implemented)
}
