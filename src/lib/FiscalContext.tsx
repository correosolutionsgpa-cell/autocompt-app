/**
 * FiscalContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Global fiscal profile store.
 *
 * Architectural rules enforced here:
 *   § 1 — BuildingLedger types are canonical in dataService.ts and re-exported
 *          here so downstream consumers (SofiOnboarding, etc.) keep their
 *          current import paths without change.
 *   § 2 — `buildings[]` state is synced to Firestore via dataService.
 *          localStorage is REMOVED from BuildingLedger persistence.
 *   § 3 — All other FiscalProfile fields (nom, neq, tps…) remain in
 *          localStorage for instant reads without a Firestore round-trip.
 *   § 4 — Auth-gated Firestore calls: buildings are fetched only when
 *          auth.currentUser is present. The context listens for auth state
 *          changes and re-fetches when a user signs in.
 *   § 5 — `upsertBuilding` and `removeBuilding` are optimistic: local state
 *          is updated immediately; Firestore write happens in the background.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { dataService } from './dataService';

// ── Re-export canonical types so existing imports don't break ─────────────────
export type { BuildingLedger, BuildingType, CoOwner } from './dataService';
import type { BuildingLedger } from './dataService';

// ── Non-building fiscal profile ────────────────────────────────────────────────

export interface FiscalProfile {
  // Identity
  logo: string | null;
  nom: string;
  adresse: string;
  tel: string;
  email: string;
  site: string;
  // Tax registration
  neq: string;
  tps: string;
  tvq: string;
  tpsRate: number;
  tvqRate: number;
  // Payment info
  paiementInfo: string;
  // Invoice branding
  color: string;
  font: string;
  /**
   * Live building portfolio.
   * Source of truth: Firestore `buildings` collection.
   * This field is populated async after auth is resolved.
   */
  buildings: BuildingLedger[];
}

// ── localStorage key (non-building fields only) ───────────────────────────────
const LS_KEY = 'autocompt_fiscal_profile';

const DEFAULT_PROFILE: FiscalProfile = {
  logo: null,
  nom: 'Proprio Solutions',
  adresse: 'Laval, QC',
  tel: '450-000-0000',
  email: '',
  site: 'www.propiosolutions.com',
  neq: '1170000000',
  tps: '123456789 RT0001',
  tvq: '1098765432 TQ0001',
  tpsRate: 5,
  tvqRate: 9.975,
  paiementInfo: 'Virement Interac: gestion@propiosolutions.com\nMot de passe: GPA2026',
  color: '#059669',
  font: 'Moderne',
  buildings: [],   // populated from Firestore, never from localStorage
};

/** Loads non-building profile fields from localStorage only. */
function loadProfileFromLS(): FiscalProfile {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Strip any stale `buildings` that were accidentally persisted in the past
      const { buildings: _ignored, ...rest } = parsed;
      return { ...DEFAULT_PROFILE, ...rest, buildings: [] };
    }
  } catch { /* ignore */ }

  // Legacy individual keys (Phase 4 migration)
  const legacy: Partial<FiscalProfile> = {};
  const map: [keyof FiscalProfile, string][] = [
    ['nom',     'autocompt_company_nom'],
    ['adresse', 'autocompt_company_adresse'],
    ['tel',     'autocompt_company_tel'],
    ['email',   'autocompt_company_email'],
    ['neq',     'autocompt_company_neq'],
    ['tps',     'autocompt_company_tps'],
    ['tvq',     'autocompt_company_tvq'],
  ];
  map.forEach(([field, key]) => {
    const v = localStorage.getItem(key);
    if (v) (legacy as any)[field] = v;
  });
  return { ...DEFAULT_PROFILE, ...legacy };
}

/** Persists non-building fields to localStorage. Buildings are never stored there. */
function saveProfileToLS(profile: FiscalProfile): void {
  try {
    const { buildings: _omit, ...rest } = profile;
    localStorage.setItem(LS_KEY, JSON.stringify(rest));
  } catch { /* ignore quota errors */ }
}

// ── Context value shape ────────────────────────────────────────────────────────

interface FiscalContextValue {
  fiscal: FiscalProfile;
  setFiscal: React.Dispatch<React.SetStateAction<FiscalProfile>>;
  /** Patch a subset of non-building fields and persist to localStorage. */
  updateFiscal: (patch: Partial<Omit<FiscalProfile, 'buildings'>>) => void;

  // Building CRUD — Firestore-backed
  /** Optimistically updates local state then writes to Firestore. */
  upsertBuilding: (building: BuildingLedger) => Promise<void>;
  /** Optimistically removes from local state then deletes from Firestore (cascades units). */
  removeBuilding: (id: string) => Promise<void>;
  /** Returns the deductible % for a given building (100 if not found). */
  getDeductiblePct: (buildingId: string) => number;

  /** True while the initial Firestore buildings fetch is in progress. */
  buildingsLoading: boolean;
}

const FiscalContext = createContext<FiscalContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function FiscalProvider({ children }: { children: React.ReactNode }) {
  const [fiscal, setFiscal] = useState<FiscalProfile>(loadProfileFromLS);
  const [buildingsLoading, setBuildingsLoading] = useState(false);

  // ── Persist non-building fields to localStorage on every change ─────────────
  useEffect(() => {
    saveProfileToLS(fiscal);
  }, [fiscal]);

  // ── Firestore buildings sync: triggered whenever auth state resolves ─────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // No logged-in user: clear buildings from memory, keep profile fields
        setFiscal((prev) => ({ ...prev, buildings: [] }));
        return;
      }

      setBuildingsLoading(true);
      try {
        const buildings = await dataService.fetchBuildings(user.uid);
        setFiscal((prev) => ({ ...prev, buildings }));
      } catch (e) {
        console.error('FiscalContext: failed to fetch buildings from Firestore:', e);
      } finally {
        setBuildingsLoading(false);
      }
    });

    return unsubscribe; // cleanup on unmount
  }, []);

  // ── updateFiscal — patches non-building fields only ─────────────────────────
  const updateFiscal = useCallback(
    (patch: Partial<Omit<FiscalProfile, 'buildings'>>) => {
      setFiscal((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  // ── upsertBuilding — optimistic + Firestore write ───────────────────────────
  const upsertBuilding = useCallback(async (building: BuildingLedger) => {
    // 1. Optimistic local update
    setFiscal((prev) => {
      const idx = prev.buildings.findIndex((b) => b.id === building.id);
      const next = [...prev.buildings];
      if (idx >= 0) next[idx] = building;
      else next.push(building);
      return { ...prev, buildings: next };
    });

    // 2. Persist to Firestore
    const userId = auth.currentUser?.uid;
    if (userId) {
      try {
        await dataService.saveBuilding(userId, building);
      } catch (e) {
        console.error('FiscalContext: upsertBuilding Firestore write failed:', e);
        // Revert optimistic update on failure
        setFiscal((prev) => ({
          ...prev,
          buildings: prev.buildings.filter((b) => b.id !== building.id),
        }));
      }
    }
  }, []);

  // ── removeBuilding — optimistic + Firestore delete (cascade units) ──────────
  const removeBuilding = useCallback(async (id: string) => {
    // 1. Snapshot for potential revert
    let snapshot: BuildingLedger | undefined;
    setFiscal((prev) => {
      snapshot = prev.buildings.find((b) => b.id === id);
      return { ...prev, buildings: prev.buildings.filter((b) => b.id !== id) };
    });

    // 2. Delete from Firestore (cascades units)
    const userId = auth.currentUser?.uid;
    if (userId) {
      try {
        await dataService.deleteBuilding(userId, id);
      } catch (e) {
        console.error('FiscalContext: removeBuilding Firestore delete failed:', e);
        // Revert optimistic removal
        if (snapshot) {
          setFiscal((prev) => ({
            ...prev,
            buildings: [...prev.buildings, snapshot!],
          }));
        }
      }
    }
  }, []);

  // ── getDeductiblePct ─────────────────────────────────────────────────────────
  const getDeductiblePct = useCallback(
    (buildingId: string) => {
      const b = fiscal.buildings.find((b) => b.id === buildingId);
      return b ? b.deductiblePct : 100;
    },
    [fiscal.buildings],
  );

  return (
    <FiscalContext.Provider
      value={{
        fiscal,
        setFiscal,
        updateFiscal,
        upsertBuilding,
        removeBuilding,
        getDeductiblePct,
        buildingsLoading,
      }}
    >
      {children}
    </FiscalContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFiscal(): FiscalContextValue {
  const ctx = useContext(FiscalContext);
  if (!ctx) throw new Error('useFiscal must be used inside <FiscalProvider>');
  return ctx;
}

export default FiscalContext;
