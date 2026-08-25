/**
 * fiscalRules.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single Source of Truth: taux de déduction fiscale par catégorie de dépense.
 *
 * Remplace `customDossiers` (table figée en dur dans App.tsx, jamais éditable)
 * par une logique portable, appelée à la fois par App.tsx (`processedDepenses`)
 * et RapportComptable.tsx — avant cette extraction, les deux avaient chacun
 * leur propre copie de cette logique, et avaient divergé (RapportComptable.tsx
 * ne gérait pas du tout le kilométrage). Ne jamais réimplémenter cette
 * branching ailleurs — importer ces fonctions.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type FiscalRule = "full" | "half" | "mileage" | "homeoffice";

// ── Catégories véhicule TP-80 / T2125 — aucune configuration manuelle requise ─
// Ces catégories déclenchent automatiquement le pro-rata d'utilisation
// professionnelle du véhicule, sans dépendre des règles configurées.
export const VEHICLE_EXPENSE_CATS = new Set([
  "Essence / Carburant",
  "Entretien Véhicule",
  "Assurance auto",
  "Déplacements / Automobile",
  "Immatriculation / Permis",
]);

export interface CategoryFiscalRuleEntry {
  categoryName: string;
  rule: FiscalRule;
}

export interface FiscalRateContext {
  /** Règles configurées pour l'entreprise dont on calcule les dépenses. */
  rules: CategoryFiscalRuleEntry[];
  buildingWideCats: string[];
  vehicleExpenseCats: Set<string>;
  isPlex: boolean;
  propertyType: string | undefined;
  /** Taux [0,1] d'utilisation professionnelle du bureau à domicile. */
  porcBureau: number;
  /** Taux [0,1] d'utilisation professionnelle du véhicule. */
  porcVehicule: number;
  /** false = le véhicule n'appartient PAS à l'entreprise (voiture
   *  personnelle d'un associé) — confirmé par un fiscaliste réel
   *  (2026-08-25, Achat Direct) : aucune facture réelle (essence,
   *  assurance, entretien) n'est alors réclamable, même prorata, seule
   *  une indemnité au kilomètre l'est (gérée séparément par
   *  KilometrageGPS, catégorie "Indemnité kilométrique" — hors de
   *  vehicleExpenseCats, donc jamais affectée par ce taux). Défaut true
   *  pour ne rien changer aux véhicules existants. */
  vehiculeReclamable?: boolean;
  /** Pourcentage [0,100] de participation de l'associé actif. */
  activePct: number;
}

export interface ExpenseLike {
  cat: string;
  subtotal: number;
  tps: number;
  tvq: number;
  total: number;
  tauxApplique?: number | null;
}

export interface FiscalRateResult {
  deductionRate: number;
  dossierRule: FiscalRule | "full";
  isMileage: boolean;
}

/** Résout le taux de déduction [0,1] d'une dépense (sans appliquer aux montants). */
export function resolveFiscalRate(expense: ExpenseLike, ctx: FiscalRateContext): FiscalRateResult {
  const matchingRule = ctx.rules.find((r) => r.categoryName === expense.cat);
  const dossierRule: FiscalRule | "full" = matchingRule ? matchingRule.rule : "full";

  let fiscalRate = 1.0;

  // Principal/capital remboursé sur une hypothèque/marge/prêt est un
  // remboursement de dette, jamais déductible, peu importe les autres règles.
  if (expense.cat === "Capital remboursé (non déductible)") {
    fiscalRate = 0;
  } else if (ctx.isPlex) {
    const isBuildingWide = ctx.buildingWideCats.includes(expense.cat);
    const propType = ctx.propertyType || "Triplex";
    let propFactor = 0.666;
    if (propType === "Duplex") propFactor = 0.5;
    else if (propType === "Triplex") propFactor = 0.666;
    else if (propType === "Quadruplex" || propType === "Quadruplex (4plex)") propFactor = 0.75;
    else if (propType === "Multi-logement") propFactor = 1.0;

    fiscalRate = isBuildingWide ? propFactor : 1.0;
  } else {
    if (dossierRule === "half") {
      fiscalRate = 0.5;
    } else if (dossierRule === "homeoffice") {
      fiscalRate = ctx.porcBureau;
    } else if (dossierRule === "mileage" || ctx.vehicleExpenseCats.has(expense.cat)) {
      // Pro-rata Québec : Km Affaires / Km Total parcouru cette année.
      // Déclenché automatiquement par vehicleExpenseCats — aucune config manuelle requise.
      // Utilise le tauxApplique figé si disponible (protège les registres historiques).
      const frozenRate = expense.tauxApplique != null ? expense.tauxApplique / 100 : null;
      if (frozenRate != null) {
        fiscalRate = frozenRate;
      } else if (ctx.vehiculeReclamable === false) {
        // Véhicule personnel, pas de l'entreprise — aucune facture réelle
        // n'est réclamable, peu importe le taux d'utilisation professionnelle.
        fiscalRate = 0;
      } else {
        fiscalRate = ctx.porcVehicule > 0 ? ctx.porcVehicule : 1.0;
      }
    }
    // 'full' reste à 1.0
  }

  return {
    deductionRate: fiscalRate,
    dossierRule,
    isMileage: dossierRule === "mileage",
  };
}

/** Applique le taux de déduction + le split associés aux montants d'une dépense. */
export function applyFiscalRate<T extends ExpenseLike>(
  expense: T,
  ctx: FiscalRateContext
): T & {
  deductionRate: number;
  deductibleSubtotal: number;
  deductibleTps: number;
  deductibleTvq: number;
  deductibleTotal: number;
  partnerSplit: number;
  tauxApplique?: number;
  vehicleRateApplied?: boolean;
} {
  const { deductionRate: fiscalRate, isMileage } = resolveFiscalRate(expense, ctx);
  const splitFactor = ctx.isPlex ? ctx.activePct / 100 : 1;

  return {
    ...expense,
    deductionRate: fiscalRate,
    deductibleSubtotal: expense.subtotal * fiscalRate * splitFactor,
    deductibleTps: expense.tps * fiscalRate * splitFactor,
    deductibleTvq: expense.tvq * fiscalRate * splitFactor,
    deductibleTotal: expense.total * fiscalRate * splitFactor,
    partnerSplit: expense.total * fiscalRate * splitFactor,
    // Marque le badge de taux véhicule (miroir de tauxApplique du bureau à domicile)
    ...(isMileage && ctx.porcVehicule > 0
      ? {
          tauxApplique: Number((ctx.porcVehicule * 100).toFixed(1)),
          vehicleRateApplied: true,
        }
      : {}),
  };
}
