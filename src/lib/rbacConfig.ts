/**
 * rbacConfig.ts — AutoCompt Role-Based Access Control Matrix
 *
 * Maps each user profile to the set of module IDs they are allowed to access.
 * This is the brain of the RBAC system. Rendering/gating logic is applied
 * separately — this file only declares the truth table.
 *
 * Profiles
 * ─────────────────────────────────────────────────────
 *  prospecteur  — Prospecteur Immobilier
 *  investisseur — Investisseur Immobilier
 *  flippeur     — Flippeur Immobilier (rénovateur)
 *  gestionnaire — Gestionnaire Immobilier
 *  syndicat     — Syndicat de Copropriété
 *
 * Modules (canonical IDs)
 * ─────────────────────────────────────────────────────
 *  1  scanner_ia          Scanner IA (OCR + extraction TPS/TVQ)
 *  2  repartition         Répartition par catégorie
 *  3  cotisations         Gestion des cotisations
 *  4  contrats            Contrats & Résolutions
 *  5  transparence        Tableau de transparence
 *  6  loi16               Loi 16 & Carnet d'entretien
 *  7  mur_communication   Mur de communication
 *  8  parametres_syndicat Paramètres Syndicat
 *  9  rapport_ia          Rapport IA
 */

// ─── Module ID union type ───────────────────────────────────────────────────
export type ModuleId =
  | "scanner_ia"
  | "repartition"
  | "cotisations"
  | "contrats"
  | "transparence"
  | "loi16"
  | "mur_communication"
  | "parametres_syndicat"
  | "rapport_ia";

// ─── Profile union type ─────────────────────────────────────────────────────
export type ProfileId =
  | "prospecteur"
  | "investisseur"
  | "flippeur"
  | "gestionnaire"
  | "syndicat";

// ─── Module metadata ────────────────────────────────────────────────────────
export interface ModuleDefinition {
  id: ModuleId;
  /** Sequential module number as referenced in the product spec */
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  label: string;
  description: string;
}

export const MODULES: Record<ModuleId, ModuleDefinition> = {
  scanner_ia: {
    id: "scanner_ia",
    number: 1,
    label: "Scanner IA",
    description: "Extraction automatique TPS/TVQ, OCR de factures et reçus",
  },
  repartition: {
    id: "repartition",
    number: 2,
    label: "Répartition par catégorie",
    description: "Analyse et visualisation des dépenses par catégorie fiscale",
  },
  cotisations: {
    id: "cotisations",
    number: 3,
    label: "Gestion des cotisations",
    description: "Suivi et collecte des cotisations des copropriétaires",
  },
  contrats: {
    id: "contrats",
    number: 4,
    label: "Contrats & Résolutions",
    description: "Bibliothèque de contrats, résolutions officielles et signatures",
  },
  transparence: {
    id: "transparence",
    number: 5,
    label: "Tableau de transparence",
    description: "Portail de transparence financière pour les copropriétaires",
  },
  loi16: {
    id: "loi16",
    number: 6,
    label: "Loi 16 & Carnet d'entretien",
    description: "Conformité Loi 16 Québec et carnet d'entretien immeuble",
  },
  mur_communication: {
    id: "mur_communication",
    number: 7,
    label: "Mur de communication",
    description: "Messagerie et annonces interne au syndicat",
  },
  parametres_syndicat: {
    id: "parametres_syndicat",
    number: 8,
    label: "Paramètres Syndicat",
    description: "Configuration du syndicat, unités, administrateurs",
  },
  rapport_ia: {
    id: "rapport_ia",
    number: 9,
    label: "Rapport IA",
    description: "Génération de rapports financiers et analyses IA",
  },
};

// ─── RBAC Matrix ────────────────────────────────────────────────────────────
/**
 * The canonical permission matrix.
 *
 * Access rules (v1.0):
 *  • prospecteur, investisseur, flippeur, gestionnaire → modules 1–2 (Plex tools)
 *  • syndicat → modules 3–9 (Syndicat tools)
 *
 * To extend: add new moduleIds to any profile's array.
 * The UI gating layer (not in this file) reads from `hasAccess()`.
 */
export const RBAC_MATRIX: Record<ProfileId, ModuleId[]> = {
  prospecteur:  ["scanner_ia", "repartition"],
  investisseur: ["scanner_ia", "repartition"],
  flippeur:     ["scanner_ia", "repartition"],
  gestionnaire: ["scanner_ia", "repartition"],
  syndicat: [
    "cotisations",
    "contrats",
    "transparence",
    "loi16",
    "mur_communication",
    "parametres_syndicat",
    "rapport_ia",
  ],
};

// ─── Helper functions ────────────────────────────────────────────────────────

/**
 * Returns true if the given profile has access to the given module.
 *
 * @example
 *   hasAccess("syndicat", "cotisations")  // → true
 *   hasAccess("investisseur", "cotisations") // → false
 */
export function hasAccess(profile: ProfileId, moduleId: ModuleId): boolean {
  return RBAC_MATRIX[profile]?.includes(moduleId) ?? false;
}

/**
 * Returns the full list of ModuleDefinition objects accessible to a profile.
 * Ordered by module number ascending.
 *
 * @example
 *   getAccessibleModules("syndicat")
 *   // → [cotisations (3), contrats (4), transparence (5), ...]
 */
export function getAccessibleModules(profile: ProfileId): ModuleDefinition[] {
  return RBAC_MATRIX[profile]
    .map((id) => MODULES[id])
    .sort((a, b) => a.number - b.number);
}

/**
 * Returns true if the current dashboard mode ("Plex" | "Syndic") matches
 * the expected mode for the given profile.
 *
 * Convenience helper to keep mode-checks consistent.
 */
export function getExpectedDashboardMode(
  profile: ProfileId
): "Plex" | "Syndic" {
  return profile === "syndicat" ? "Syndic" : "Plex";
}
