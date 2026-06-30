/**
 * vehicleRateService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single Source of Truth: Taux d'Utilisation Professionnelle des Véhicules
 *
 * Quebec/CRA Pro-Rata Formula (T2125 / TP-80):
 *   Business Use % = Business KM Logged / Total KM Driven
 *   where Total KM = Current Odometer − Initial Odometer
 *
 * Storage contract (shared with SettingsView + KilometrageGPS):
 *   localStorage["autocompt_vehicles"]   → RegisteredVehicle[]   (from SettingsView)
 *   localStorage["autocompt_km_current"] → Record<vehicleId, number>  (updated by KilometrageGPS on save)
 *   localStorage["autocompt_km_business"]→ Record<vehicleId, number>  (sum of logged business trips)
 *
 * Returns a value in [0, 1]. Default 0 if no vehicle or no data.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface RegisteredVehicle {
  id: string;
  marque: string;
  modele: string;
  annee: string;
  plaque: string;
  odometreInitial: number;
}

/** Keys used across all modules — change here only. */
export const VEHICLE_STORAGE_KEYS = {
  vehicles:       "autocompt_vehicles",       // RegisteredVehicle[]
  kmCurrent:      "autocompt_km_current",     // Record<vehicleId, number>
  kmBusiness:     "autocompt_km_business",    // Record<vehicleId, number>
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJSON<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns all registered vehicles from localStorage.
 */
export function getRegisteredVehicles(): RegisteredVehicle[] {
  return safeParseJSON<RegisteredVehicle[]>(VEHICLE_STORAGE_KEYS.vehicles, []);
}

/**
 * Returns the primary (first) registered vehicle, or null if none.
 */
export function getPrimaryVehicle(): RegisteredVehicle | null {
  return getRegisteredVehicles()[0] ?? null;
}

/**
 * Reads current odometer values (set by KilometrageGPS after each trip save).
 */
export function getKmCurrentMap(): Record<string, number> {
  return safeParseJSON<Record<string, number>>(VEHICLE_STORAGE_KEYS.kmCurrent, {});
}

/**
 * Reads total business km per vehicle (accumulated by KilometrageGPS).
 */
export function getKmBusinessMap(): Record<string, number> {
  return safeParseJSON<Record<string, number>>(VEHICLE_STORAGE_KEYS.kmBusiness, {});
}

/**
 * Records a new business trip for a vehicle.
 * Called by KilometrageGPS when the user taps "Enregistrer le trajet".
 *
 * @param vehicleId  - RegisteredVehicle.id
 * @param kmLogged   - distance of this trip in km
 * @param newOdometer - current odometer after the trip (optional but recommended)
 */
export function recordBusinessTrip(
  vehicleId: string,
  kmLogged: number,
  newOdometer?: number
): void {
  // 1. Accumulate business KM
  const bizMap = getKmBusinessMap();
  bizMap[vehicleId] = (bizMap[vehicleId] ?? 0) + kmLogged;
  localStorage.setItem(VEHICLE_STORAGE_KEYS.kmBusiness, JSON.stringify(bizMap));

  // 2. Update current odometer if provided
  if (newOdometer !== undefined) {
    const curMap = getKmCurrentMap();
    curMap[vehicleId] = newOdometer;
    localStorage.setItem(VEHICLE_STORAGE_KEYS.kmCurrent, JSON.stringify(curMap));
  }
}

/**
 * Computes Business Use Percentage for a specific vehicle.
 *
 * Formula: businessKM / (currentOdometer − initialOdometer)
 * Returns a decimal in [0, 1]. Returns 0 if data is insufficient.
 */
export function computeVehicleBusinessRate(vehicleId: string): number {
  const vehicles = getRegisteredVehicles();
  const vehicle = vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return 0;

  const bizMap  = getKmBusinessMap();
  const curMap  = getKmCurrentMap();

  const businessKM = bizMap[vehicleId] ?? 0;
  const currentOdo = curMap[vehicleId] ?? vehicle.odometreInitial;
  const totalKM    = currentOdo - vehicle.odometreInitial;

  if (totalKM <= 0 || businessKM <= 0) return 0;

  // Clamp to [0, 1] — business use cannot exceed 100%
  return Math.min(businessKM / totalKM, 1);
}

/**
 * Computes Business Use Percentage for the primary vehicle.
 * This is the main function called by App.tsx and ledger modules.
 *
 * Falls back to 0 if no vehicle is registered.
 */
export function getPrimaryVehicleBusinessRate(): number {
  const primary = getPrimaryVehicle();
  if (!primary) return 0;
  return computeVehicleBusinessRate(primary.id);
}

/**
 * Returns a formatted display string for the business rate.
 * e.g. "67.3%" or "—" if no data.
 */
export function formatVehicleRate(rate: number): string {
  if (rate <= 0) return "—";
  return `${(rate * 100).toFixed(1)} %`;
}
