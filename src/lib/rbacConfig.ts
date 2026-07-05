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
 * Plex Module IDs (cards in PlexModuleGrid)
 * ─────────────────────────────────────────────────────
 *  facturation         Facturation (invoicing)
 *  tenue_livres        Tenue de Livres (bookkeeping / reports)
 *  bureau_domicile     Bureau à domicile (home office deduction)
 *  tps_tvq             Déclaration TPS/TVQ
 *  doculegal           Contrats & Résolutions (DocuLegal)
 *  dossiers_fiscaux    Dossiers Fiscaux (universal — all profiles)
 *  heures_paie         Heures & Paie
 *  conciliation        Conciliation Bancaire
 *  gestion_immo        Gestion Immobilière (Plex management)
 *  taxes_assurances    Taxes & Assurances
 *  assistant_ia        Assistant IA / Sofi (universal — all profiles)
 *
 * Syndicat Module IDs (cards in SyndicModuleGrid)
 * ─────────────────────────────────────────────────────
 *  cotisations         Gestion des cotisations
 *  contrats            Contrats & Résolutions (Syndicat)
 *  transparence        Tableau de transparence
 *  loi16               Loi 16 & Carnet d'entretien
 *  mur_communication   Mur de communication
 *  parametres_syndicat Paramètres Syndicat
 *  rapport_ia          Rapport IA (SyndicAI)
 *
 * Source of truth: .cursorrules §2 PROFILE ACCESS MATRIX
 * Golden Rule: Universal modules (dossiers_fiscaux, assistant_ia) are granted
 * to ALL profiles per .cursorrules §1 Rule 3.
 */

// ─── Module ID union type ───────────────────────────────────────────────────
export type ModuleId =
  // ── Plex modules ──
  | "facturation"
  | "tenue_livres"
  | "bureau_domicile"
  | "tps_tvq"
  | "doculegal"
  | "dossiers_fiscaux"    // Universal (all Plex profiles)
  | "heures_paie"
  | "conciliation"
  | "gestion_immo"
  | "taxes_assurances"
  | "fideicommis"         // Compte en Fidéicommis (gestionnaire only)
  | "assistant_ia"        // Universal (all Plex profiles)
  // ── Syndicat modules ──
  | "cotisations"
  | "contrats"
  | "transparence"
  | "loi16"
  | "mur_communication"
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
  label: string;
  description: string;
  /** Which dashboard this module belongs to */
  dashboard: "Plex" | "Syndic";
}

export const MODULES: Record<ModuleId, ModuleDefinition> = {
  // ── Plex modules ──────────────────────────────────────────────────────────
  facturation: {
    id: "facturation",
    label: "Facturation",
    description: "Création et envoi de factures clients",
    dashboard: "Plex",
  },
  tenue_livres: {
    id: "tenue_livres",
    label: "Tenue de Livres",
    description: "Rapports de dépenses, revenus et rentabilité",
    dashboard: "Plex",
  },
  bureau_domicile: {
    id: "bureau_domicile",
    label: "Bureau à domicile",
    description: "Calcul de la déduction pour bureau à domicile",
    dashboard: "Plex",
  },
  tps_tvq: {
    id: "tps_tvq",
    label: "Déclaration TPS/TVQ",
    description: "Suivi et déclaration des taxes à la consommation",
    dashboard: "Plex",
  },
  doculegal: {
    id: "doculegal",
    label: "DocuLegal",
    description: "Contrats, résolutions et signatures numériques",
    dashboard: "Plex",
  },
  dossiers_fiscaux: {
    id: "dossiers_fiscaux",
    label: "Dossiers Fiscaux",
    description: "Classement et archivage des dossiers fiscaux annuels",
    dashboard: "Plex",
  },
  heures_paie: {
    id: "heures_paie",
    label: "Heures & Paie",
    description: "Suivi des heures et paie simplifiée",
    dashboard: "Plex",
  },
  conciliation: {
    id: "conciliation",
    label: "Conciliation Bancaire",
    description: "Rapprochement des transactions bancaires",
    dashboard: "Plex",
  },
  gestion_immo: {
    id: "gestion_immo",
    label: "Gestion Immobilière",
    description: "Gestion des unités, locataires et loyers",
    dashboard: "Plex",
  },
  taxes_assurances: {
    id: "taxes_assurances",
    label: "Taxes & Assurances",
    description: "Suivi des taxes municipales et polices d'assurance",
    dashboard: "Plex",
  },
  assistant_ia: {
    id: "assistant_ia",
    label: "Assistant IA",
    description: "Assistant fiscal Sofi — questions et analyses en temps réel",
    dashboard: "Plex",
  },
  fideicommis: {
    id: "fideicommis",
    label: "Compte en Fidéicommis",
    description: "Gestion OACIQ: dépôts, retraits, conciliation mensuelle, relevés propriétaires",
    dashboard: "Plex",
  },
  // ── Syndicat modules ──────────────────────────────────────────────────────
  cotisations: {
    id: "cotisations",
    label: "Gestion des cotisations",
    description: "Suivi et collecte des cotisations des copropriétaires",
    dashboard: "Syndic",
  },
  contrats: {
    id: "contrats",
    label: "Contrats & Résolutions",
    description: "Bibliothèque de contrats, résolutions officielles et signatures",
    dashboard: "Syndic",
  },
  transparence: {
    id: "transparence",
    label: "Tableau de transparence",
    description: "Portail de transparence financière pour les copropriétaires",
    dashboard: "Syndic",
  },
  loi16: {
    id: "loi16",
    label: "Loi 16 & Carnet d'entretien",
    description: "Conformité Loi 16 Québec et carnet d'entretien immeuble",
    dashboard: "Syndic",
  },
  mur_communication: {
    id: "mur_communication",
    label: "Mur de communication",
    description: "Messagerie et annonces interne au syndicat",
    dashboard: "Syndic",
  },
  rapport_ia: {
    id: "rapport_ia",
    label: "Rapport IA",
    description: "Génération de rapports financiers et analyses IA (SyndicAI)",
    dashboard: "Syndic",
  },
};

// ─── RBAC Matrix ────────────────────────────────────────────────────────────
/**
 * The canonical permission matrix.
 *
 * Source: .cursorrules §2 PROFILE ACCESS MATRIX
 *
 * Universal modules (Golden Rule §1-3): dossiers_fiscaux, assistant_ia
 * are included in every Plex profile.
 *
 * To extend: add new moduleIds to any profile's array.
 * The UI gating layer (PlexModuleGrid) reads from `hasAccess()`.
 */
export const RBAC_MATRIX: Record<ProfileId, ModuleId[]> = {
  /**
   * A. Prospecteur Immobilier
   * Focus: Speed, street mobility, fast invoicing.
   * Modules per .cursorrules: Scanner IA (handled by parent), Kilométrage GPS (handled by parent),
   * Facturation, Bureau à domicile, Contrats & Résolutions (DocuLegal — Promesse d'achat/Cession limited),
   * Sous-traitants (handled by parent), Déclaration TPS/TVQ, Conciliation bancaire,
   * Taxes & Assurances, Tenue de livres.
   * + Universal: Dossiers Fiscaux, Assistant IA.
   */
  prospecteur: [
    "facturation",
    "tenue_livres",
    "bureau_domicile",
    "tps_tvq",
    "doculegal",
    "dossiers_fiscaux",   // Universal
    "conciliation",
    "taxes_assurances",
    "assistant_ia",       // Universal
  ],

  /**
   * B. Investisseur Immobilier
   * Focus: Asset tracking and multi-tenant transparency.
   * Modules per .cursorrules: Tenue de livres/Rentabilité, Gestion Immobilière (Plex units),
   * Conciliation bancaire, Taxes & Assurances.
   * + Universal: Dossiers Fiscaux, Assistant IA.
   * (Onboarding-mode subsets handled inside MeubleFinancialModule / dedicated logic)
   */
  investisseur: [
    "tenue_livres",
    "dossiers_fiscaux",   // Universal
    "conciliation",
    "gestion_immo",
    "taxes_assurances",
    "assistant_ia",       // Universal
  ],

  /**
   * C. Flippeur Immobilier
   * Focus: Budget control, contractors, fast flips.
   * Modules per .cursorrules: Scanner IA (parent), Kilométrage GPS (parent),
   * Facturation, Tenue de livres & Répartition, Bureau à domicile,
   * Déclaration TPS/TVQ, DocuLegal, Dossiers Fiscaux (Universal),
   * Conciliation bancaire, Taxes & Assurances, Heures & Paie.
   * + Universal: Assistant IA.
   */
  flippeur: [
    "facturation",
    "tenue_livres",
    "bureau_domicile",
    "tps_tvq",
    "doculegal",
    "dossiers_fiscaux",   // Universal
    "heures_paie",
    "conciliation",
    "taxes_assurances",
    "assistant_ia",       // Universal
  ],

  /**
   * D. Gestionnaire Immobilier
   * Focus: Multi-tenant architecture and property administration.
   * Modules per .cursorrules: Multi-tenant Tenue de livres (1-click sharing),
   * Gestion Immobilière, Conciliation bancaire, Taxes & Assurances.
   * DocuLegal added: leases (baux), mandat de gestion, contractor agreements.
   * Heures & Paie added: concierges, building supers, maintenance workers.
   * + Universal: Dossiers Fiscaux, Assistant IA.
   */
  gestionnaire: [
    "tenue_livres",
    "doculegal",          // Baux, mandats de gestion, contrats sous-traitance
    "dossiers_fiscaux",   // Universal
    "heures_paie",        // Concierges, surintendants, entretien
    "conciliation",
    "gestion_immo",
    "taxes_assurances",
    "fideicommis",        // Compte en fidéicommis OACIQ — gestion des fonds clients
    "assistant_ia",       // Universal
  ],

  /**
   * E. Syndicat de Copropriété
   * Focus: Co-owner transparency and compliance.
   * Modules per .cursorrules: Gestion des Cotisations, Contrats & Résolutions,
   * Tableau de Transparence, Loi 16 & Carnet d'entretien, Mur de communication,
   * Paramètres Syndicat, Rapport IA (SyndicAI).
   */
  syndicat: [
    "cotisations",
    "contrats",
    "transparence",
    "loi16",
    "mur_communication",
    "rapport_ia",
  ],
};

// ─── Helper functions ────────────────────────────────────────────────────────

/**
 * Returns true if the given profile has access to the given module.
 *
 * @example
 *   hasAccess("syndicat", "cotisations")   // → true
 *   hasAccess("investisseur", "cotisations") // → false
 *   hasAccess("flippeur", "heures_paie")   // → true
 *   hasAccess("prospecteur", "heures_paie") // → false
 */
export function hasAccess(profile: ProfileId, moduleId: ModuleId): boolean {
  return RBAC_MATRIX[profile]?.includes(moduleId) ?? false;
}

/**
 * Returns the full list of ModuleDefinition objects accessible to a profile,
 * filtered to a specific dashboard, ordered by their position in RBAC_MATRIX.
 *
 * @example
 *   getAccessibleModules("flippeur", "Plex")
 *   // → [facturation, tenue_livres, bureau_domicile, ...]
 */
export function getAccessibleModules(
  profile: ProfileId,
  dashboard?: "Plex" | "Syndic"
): ModuleDefinition[] {
  return RBAC_MATRIX[profile]
    .map((id) => MODULES[id])
    .filter((m) => (dashboard ? m.dashboard === dashboard : true));
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
