// Shared invoice branding constants — used by SettingsView.tsx (the picker)
// and App.tsx (the invoice preview/PDF) so both always agree on the exact
// same color/font/template options.

export const INVOICE_COLOR_PALETTE = [
  "#059669", // emerald (défaut AutoCompt)
  "#2563EB", // bleu
  "#8B5CF6", // violet
  "#DB2777", // rose
  "#F59E0B", // ambre
  "#0D9488", // sarcelle
  "#DC2626", // rouge
  "#334155", // ardoise
];

export const INVOICE_FONT_STACKS: Record<string, string> = {
  Moderne: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  Classique: "Georgia, 'Times New Roman', Times, serif",
  Élégante: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif",
};

export interface InvoiceTemplateOption {
  id: "epure" | "bandeau";
  label: string;
  description: string;
}

export const INVOICE_TEMPLATES: InvoiceTemplateOption[] = [
  { id: "epure", label: "Épuré", description: "Ligne d'accent sobre, fond blanc" },
  { id: "bandeau", label: "Bandeau", description: "Bandeau de couleur en en-tête" },
];

export function getInvoiceFontStack(font: string | undefined): string {
  return INVOICE_FONT_STACKS[font || "Moderne"] || INVOICE_FONT_STACKS.Moderne;
}
