/**
 * vehicleRateService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single Source of Truth: Taux d'Utilisation Professionnelle des Véhicules
 *
 * Quebec/CRA Pro-Rata Formula (T2125 / TP-80):
 *   Business Use % = Business KM Logged / Total KM Driven (Business + Personnel)
 *
 * Each vehicle declares a `usageType`:
 *   - "travail"    → 100% business use, fixed. No per-trip classification needed.
 *   - "personnel"  → 0% business use, fixed. Not used for business deductions.
 *   - "hybride"    → computed from logged km: kmBusinessTotal / (kmBusinessTotal + kmPersonalTotal).
 *                    Each trip must be classified Personnel/Professionnel when saved
 *                    (see KilometrageGPS.tsx) so both accumulators stay accurate.
 *
 * Storage: kmBusinessTotal / kmPersonalTotal live directly on the RegisteredVehicle
 * object in Firestore (partnerData.vehicles, via setPartnerData) — NOT localStorage.
 * (Earlier version of this file tracked km in localStorage only, which silently
 * reset on every new browser/device and was never updated once vehicles migrated
 * to Firestore — the same class of bug fixed elsewhere in this app.)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { RegisteredVehicle } from "../ramas-flujo/Rama_Gestionnaires/SettingsView";

export type { RegisteredVehicle };

/**
 * Computes Business Use Percentage for a given vehicle.
 * Returns a decimal in [0, 1]. Returns 0 if no vehicle or no data.
 */
export function computeVehicleBusinessRate(vehicle: RegisteredVehicle | null | undefined): number {
  if (!vehicle) return 0;

  if (vehicle.usageType === "travail") return 1;
  if (vehicle.usageType === "personnel") return 0;

  // "hybride" (or legacy vehicles with no usageType set) — computed from logged km.
  const biz = vehicle.kmBusinessTotal ?? 0;
  const perso = vehicle.kmPersonalTotal ?? 0;
  const total = biz + perso;
  if (total <= 0) return 0;

  return Math.min(biz / total, 1);
}

/**
 * Returns a formatted display string for the business rate.
 * e.g. "67.3%" or "—" if no data.
 */
export function formatVehicleRate(rate: number): string {
  if (rate <= 0) return "—";
  return `${(rate * 100).toFixed(1)} %`;
}
