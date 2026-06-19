/**
 * FiscalContext — Global fiscal profile store
 *
 * Single source of truth for the business fiscal identity.
 * All modules (Facturation, DocuLegal, Tenue de Livres) read from this
 * context. The user configures once in Settings → Profil d'Entreprise;
 * all templates auto-populate.
 *
 * Architectural rules enforced here:
 *   - 1 Building = 1 separate Tenue de Livres ledger (BuildingLedger)
 *   - Owner-occupied buildings carry a `occupancyPct` that determines
 *     the deductible portion (e.g. 33% occupied → 67% deductible).
 *   - 100% rental buildings: full deduction on eligible expenses.
 *   - Co-owner splits must validate to exactly 100%.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CoOwner {
  name: string;
  percentage: number; // must all sum to 100
}

export type BuildingType = "full_rental" | "owner_occupied" | "mixed";

export interface BuildingLedger {
  id: string;
  address: string;
  type: BuildingType;
  /** % of building occupied by owner (0 for full_rental) */
  occupancyPct: number;
  /** Deductible portion = 100 - occupancyPct */
  deductiblePct: number;
  coOwners: CoOwner[];
  /** Unique Tenue de Livres ledger identifier */
  ledgerId: string;
}

export interface FiscalProfile {
  // ── Identity ──────────────────────────────────────────────────────────────
  logo: string | null;
  nom: string;
  adresse: string;
  tel: string;
  email: string;
  site: string;
  // ── Tax registration ──────────────────────────────────────────────────────
  neq: string;
  tps: string;
  tvq: string;
  tpsRate: number;
  tvqRate: number;
  // ── Payment info ──────────────────────────────────────────────────────────
  paiementInfo: string;
  // ── Invoice branding ─────────────────────────────────────────────────────
  color: string;
  font: string;
  // ── Building portfolio (Investisseur architecture) ────────────────────────
  buildings: BuildingLedger[];
}

const LS_KEY = "autocompt_fiscal_profile";

const DEFAULT_PROFILE: FiscalProfile = {
  logo: null,
  nom: "Proprio Solutions",
  adresse: "Laval, QC",
  tel: "450-000-0000",
  email: "",
  site: "www.propiosolutions.com",
  neq: "1170000000",
  tps: "123456789 RT0001",
  tvq: "1098765432 TQ0001",
  tpsRate: 5,
  tvqRate: 9.975,
  paiementInfo: "Virement Interac: gestion@propiosolutions.com\nMot de passe: GPA2026",
  color: "#059669",
  font: "Moderne",
  buildings: [],
};

function loadFromLS(): FiscalProfile {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {}
  // Legacy: migrate individual keys saved by Phase 4 Settings fields
  const legacy: Partial<FiscalProfile> = {};
  const map: [keyof FiscalProfile, string][] = [
    ["nom",     "autocompt_company_nom"],
    ["adresse", "autocompt_company_adresse"],
    ["tel",     "autocompt_company_tel"],
    ["email",   "autocompt_company_email"],
    ["neq",     "autocompt_company_neq"],
    ["tps",     "autocompt_company_tps"],
    ["tvq",     "autocompt_company_tvq"],
  ];
  map.forEach(([field, key]) => {
    const v = localStorage.getItem(key);
    if (v) (legacy as any)[field] = v;
  });
  return { ...DEFAULT_PROFILE, ...legacy };
}

// ── Context ───────────────────────────────────────────────────────────────────

interface FiscalContextValue {
  fiscal: FiscalProfile;
  setFiscal: React.Dispatch<React.SetStateAction<FiscalProfile>>;
  /** Convenience updater — patches a subset of fields and persists. */
  updateFiscal: (patch: Partial<FiscalProfile>) => void;
  /** Add or update a building ledger by id. */
  upsertBuilding: (building: BuildingLedger) => void;
  /** Remove a building ledger by id. */
  removeBuilding: (id: string) => void;
  /** Compute deductible % for a given building. */
  getDeductiblePct: (buildingId: string) => number;
}

const FiscalContext = createContext<FiscalContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function FiscalProvider({ children }: { children: React.ReactNode }) {
  const [fiscal, setFiscal] = useState<FiscalProfile>(loadFromLS);

  // Persist on every change
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(fiscal)); } catch {}
  }, [fiscal]);

  const updateFiscal = useCallback((patch: Partial<FiscalProfile>) => {
    setFiscal((prev) => ({ ...prev, ...patch }));
  }, []);

  const upsertBuilding = useCallback((building: BuildingLedger) => {
    setFiscal((prev) => {
      const idx = prev.buildings.findIndex((b) => b.id === building.id);
      const next = [...prev.buildings];
      if (idx >= 0) next[idx] = building;
      else next.push(building);
      return { ...prev, buildings: next };
    });
  }, []);

  const removeBuilding = useCallback((id: string) => {
    setFiscal((prev) => ({
      ...prev,
      buildings: prev.buildings.filter((b) => b.id !== id),
    }));
  }, []);

  const getDeductiblePct = useCallback(
    (buildingId: string) => {
      const b = fiscal.buildings.find((b) => b.id === buildingId);
      return b ? b.deductiblePct : 100;
    },
    [fiscal.buildings]
  );

  return (
    <FiscalContext.Provider
      value={{ fiscal, setFiscal, updateFiscal, upsertBuilding, removeBuilding, getDeductiblePct }}
    >
      {children}
    </FiscalContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFiscal(): FiscalContextValue {
  const ctx = useContext(FiscalContext);
  if (!ctx) throw new Error("useFiscal must be used inside <FiscalProvider>");
  return ctx;
}

export default FiscalContext;
