/**
 * i18n.ts — traduction progressive de l'interface AutoCompt.
 *
 * L'app est écrite en français québécois par défaut partout (voir
 * feedback_ui_copy_language en mémoire projet) — ce fichier NE remplace
 * pas cette règle, il ajoute la capacité de traduire à la demande vers
 * l'anglais/espagnol quand un utilisateur choisit ES/EN dans le sélecteur
 * de langue (App.tsx, activeLang).
 *
 * Approche volontairement simple pour une migration incrémentale sur une
 * très grosse base de code déjà écrite en français: la CLÉ du dictionnaire
 * est le texte français lui-même (déjà présent partout dans le code), pas
 * un identifiant abstrait à inventer/maintenir séparément. Tant qu'une
 * chaîne n'a pas encore été ajoutée ici, elle reste simplement affichée en
 * français — jamais d'erreur, jamais de clé manquante visible.
 */

export type Lang = "FR" | "ES" | "EN";

type Entry = { ES: string; EN: string };

const translations: Record<string, Entry> = {
  // ── Navigation — sidebar (App.tsx WorkspaceSidebar) ────────────────────
  "Tableau de Bord": { ES: "Panel de Control", EN: "Dashboard" },
  "Gestion Immobilière": { ES: "Gestión Inmobiliaria", EN: "Property Management" },
  "Meublé / Airbnb": { ES: "Amueblado / Airbnb", EN: "Furnished / Airbnb" },
  "Dossiers Fiscaux": { ES: "Expedientes Fiscales", EN: "Tax Records" },
  "Taxes & Assurances": { ES: "Impuestos y Seguros", EN: "Taxes & Insurance" },
  "Conciliation": { ES: "Conciliación", EN: "Reconciliation" },
  "Tenue de Livres": { ES: "Contabilidad", EN: "Bookkeeping" },
  "Facturation": { ES: "Facturación", EN: "Invoicing" },
  "Bureau Rénov": { ES: "Renovación Oficina", EN: "Home Office Reno" },
  "GPS trajets": { ES: "Trayectos GPS", EN: "GPS Trips" },
  "TPS / TVQ": { ES: "GST / QST", EN: "GST / QST" },
  "DocuLegal": { ES: "DocuLegal", EN: "DocuLegal" },
  "Notre Équipe": { ES: "Nuestro Equipo", EN: "Our Team" },
  "Heures & Paie": { ES: "Horas y Nómina", EN: "Hours & Payroll" },
  "Gestion des Cotisations": { ES: "Gestión de Cuotas", EN: "Assessments Management" },
  "Contrats & Résolutions (DocuLegal)": { ES: "Contratos y Resoluciones (DocuLegal)", EN: "Contracts & Resolutions (DocuLegal)" },
  "Tableau de Transparence": { ES: "Tablero de Transparencia", EN: "Transparency Board" },
  "Loi 16 & Carnet Entretien": { ES: "Ley 16 y Bitácora de Mantenimiento", EN: "Bill 16 & Maintenance Logbook" },
  "Rapport IA (SyndicAI)": { ES: "Informe IA (SyndicAI)", EN: "AI Report (SyndicAI)" },
  "Mur de Communication": { ES: "Muro de Comunicación", EN: "Communication Wall" },
  "Espace Copropriétaire": { ES: "Espacio del Copropietario", EN: "Co-owner Space" },
  "Paramètres": { ES: "Configuración", EN: "Settings" },
};

/** Traduit `frText` vers `lang` — retombe toujours sur le français si la
 *  clé n'existe pas encore ou si `lang === "FR"`. Jamais de clé brute
 *  affichée, jamais d'exception. */
export function tr(lang: Lang, frText: string): string {
  if (lang === "FR" || !frText) return frText;
  return translations[frText]?.[lang] ?? frText;
}
