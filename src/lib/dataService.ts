/**
 * dataService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single gateway for all Firestore and local-seed data operations.
 *
 * Architectural rules enforced here:
 *   § 1 — Every Firestore collection has a corresponding typed interface.
 *   § 2 — No `any[]` return types on new methods. Legacy methods kept for
 *          backward compatibility but annotated with @deprecated.
 *   § 3 — Document ID convention: `{userId}_{collection}_{originalId}`.
 *   § 4 — Units (portes) are a first-class collection independent of properties.
 *          The old `chambres[]` nested array is REMOVED from PropertyDoc.
 *   § 5 — BuildingLedger is persisted in Firestore (`buildings` collection).
 *          FiscalContext is the authoritative in-memory layer on top.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Company, DocumentEntry } from '../types';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { postJournalEntry } from '../services/ledgerService';

// ══════════════════════════════════════════════════════════════════════════════
// §1 — TYPED INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

// ── Co-ownership ──────────────────────────────────────────────────────────────

/** One co-owner's fractional interest. All CoOwners on a BuildingLedger MUST
 *  sum to exactly 100. */
export interface CoOwner {
  name: string;
  percentage: number;
}

export type BuildingType = 'full_rental' | 'owner_occupied' | 'mixed';

// ── BuildingLedger — Firestore `buildings` collection ─────────────────────────

/**
 * One physical building = one independent Tenue de Livres ledger.
 * Persisted in Firestore collection `buildings`.
 * Document ID: `{userId}_building_{id}`
 */
export interface BuildingLedger {
  id: string;
  /** Civic address — used as display label and ledger title */
  address: string;
  type: BuildingType;
  /** % of building occupied by owner (0 for full_rental) */
  occupancyPct: number;
  /** Deductible portion = 100 − occupancyPct (computed on write) */
  deductiblePct: number;
  coOwners: CoOwner[];
  /** Unique Tenue de Livres ledger identifier (mirrors id by convention) */
  ledgerId: string;
  ownerId: string;
  createdAt: string;
  /** Fields below are populated from the S.O.F.I. rôle-foncier scanner, when available */
  numeroLot?: string;
  valeurTerrain?: number;
  valeurBatiment?: number;
  superficieTotalePi2?: number;
}

// ── PropertyDoc — Firestore `properties` collection ──────────────────────────

/**
 * A registerable property (address-level record).
 * Units/doors are stored in the independent `units` collection (see UnitDoc).
 * NOTE: The legacy `chambres[]` nested array has been REMOVED.
 * Document ID: `{userId}_prop_{id}`
 */
export interface PropertyDoc {
  id: string;
  /** FK → BuildingLedger.id (links property to its fiscal ledger) */
  buildingId?: string;
  typeLocation: string;   // "Appartement/Maison" | "Immeuble à revenus" | etc.
  adresse: string;
  status: 'Actif' | 'Vacant' | 'Archivé';
  ownerId: string;
  createdAt: string;
}

// ── UnitDoc — Firestore `units` collection ────────────────────────────────────

/**
 * One rentable unit (porte) inside a building.
 * Independent collection — can be queried by buildingId.
 * Document ID: `{userId}_unit_{id}`
 */
export interface UnitDoc {
  id: string;
  /** FK → BuildingLedger.id (or PropertyDoc.id for legacy data) */
  buildingId: string;
  /** Human-readable unit label, e.g. "Appt 1 (RDC)", "Habitation 3" */
  unitName: string;
  tenantName: string;
  monthlyRent: number;
  isActive: boolean;
  ownerId: string;
  createdAt: string;
}

// ── ExpenseDoc — Firestore `expenses` collection ──────────────────────────────

export interface ExpenseDoc {
  id: string;
  companyId: string;
  fecha: string;          // "YYYY-MM-DD"
  fournisseur: string;
  cat: string;
  subtotal: number;
  tps: number;
  tvq: number;
  total: number;
  lien: string | null;
  partnerTag: string;
  /** Receipt confirmed missing — set by disclaimer checkbox */
  noReceiptConfirmed?: boolean;
  /** FK → UnitDoc.id (optional, for property-linked expenses) */
  unitId?: string;
  /** FK → BuildingLedger.id (optional, for property-linked expenses) */
  buildingId?: string;
  ownerId: string;
  createdAt: string;
}

// ── LoyerDoc — Firestore `loyers` collection ─────────────────────────────────

export interface LoyerDoc {
  id: string;
  uniteAdresse: string;
  locataire: string;
  loyer: number;
  statut: 'Payé' | 'En retard' | 'En attente';
  ownerId: string;
  createdAt: string;
}

// ── InvoiceDoc — Firestore `invoices` collection (revenue/ventes ledger) ─────

export interface InvoiceDoc {
  id: string;
  companyId: string;
  fecha: string;
  cliente: string;
  cat: string;
  subtotal: number;
  tps: number;
  tvq: number;
  total: number;
  status?: string;
  noteComptable?: string;
  unitId?: string;
  buildingId?: string;
  ownerId: string;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// §2 — SEED DATA
// ══════════════════════════════════════════════════════════════════════════════

export const defaultWorkspaces = [
  {
    id: '1',
    nombre: 'Solutions GPA Inc.',
    industry: 'Gestionnaire de Bâtiments',
    legalEntity: 'Incorporée',
    partners: ['Fabiola'],
    googleEmail: 'solutionsgpa@gmail.com',
    driveConfig: { folderId: 'gpa_management_vault', connected: true },
    accentColor: 'purple',
    borderColor: 'border-purple-500/25 dark:border-purple-500/35',
    focusRingColor: 'ring-purple-500',
    textAccentColor: 'text-purple-600 dark:text-purple-400',
    bgAccentColor: 'bg-purple-50/50 dark:bg-purple-950/20',
    badgeBg: 'bg-purple-100/80 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    gradientFromTo: 'from-purple-500 to-indigo-600',
    partnerData: {
      Fabiola: {
        homeOffice: { aireTotale: 1000, aireBureau: 150, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
        vehicle: { model: 'Tesla Model Y', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
        paradas: [''],
      },
    },
    userProfile: {
      logo: null, color: '#8B5CF6', font: 'Moderne',
      nom: 'Solutions GPA Inc.', adresse: 'Laval, QC', tel: '450-555-0123',
      neq: '1170000000', tps: '123456789 RT0001', tvq: '1098765432 TQ0001',
      site: 'www.propiosolutions.com', pago: 'Virement: gestion@propiosolutions.com',
      tpsRate: 5, tvqRate: 9.975,
    },
  },
  {
    id: '2',
    nombre: 'Achat Direct Inc.',
    industry: 'Prospecteur & Flip',
    legalEntity: 'Incorporée',
    partners: ['Fabiola', 'Natalia'],
    googleEmail: 'achatdirectqc@gmail.com',
    driveConfig: { folderId: 'achat_direct_shared_vault', connected: true },
    accentColor: 'emerald',
    borderColor: 'border-emerald-500/25 dark:border-emerald-500/35',
    focusRingColor: 'ring-emerald-500',
    textAccentColor: 'text-[#059669] dark:text-emerald-400',
    bgAccentColor: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    badgeBg: 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    gradientFromTo: 'from-emerald-500 to-teal-600',
    partnerData: {
      Fabiola: {
        homeOffice: { aireTotale: 1000, aireBureau: 150, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
        vehicle: { model: 'Tesla Model Y', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
        paradas: [''],
      },
      Natalia: {
        homeOffice: { aireTotale: 1200, aireBureau: 200, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
        vehicle: { model: 'Audi Q5 Sportback', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
        paradas: [''],
      },
    },
    userProfile: {
      logo: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=100&h=100&fit=crop',
      color: '#059669', font: 'Moderne',
      nom: 'Achat Direct Inc. (Natalia & Fabiola)', adresse: 'Montréal, QC', tel: '514-555-9876',
      neq: '1179999999', tps: '987654321 RT0001', tvq: '1122334455 TQ0001',
      site: 'www.achatdirect.ca', pago: 'Virement: accounts@achatdirect.ca',
      tpsRate: 5, tvqRate: 9.975,
    },
  },
  {
    id: '3',
    nombre: 'Triplex - Immobilier',
    industry: 'Propriétaire de Plex',
    legalEntity: 'Co-propriété (Individus)',
    partners: ['Fabiola', 'Eric'],
    googleEmail: 'solutionsgpa@gmail.com',
    driveConfig: { folderId: 'plex_personal_drive', connected: true },
    accentColor: 'orange',
    borderColor: 'border-orange-500/25 dark:border-orange-500/35',
    focusRingColor: 'ring-orange-500',
    textAccentColor: 'text-orange-600 dark:text-orange-400',
    bgAccentColor: 'bg-orange-50/50 dark:bg-orange-950/20',
    badgeBg: 'bg-orange-100/80 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    gradientFromTo: 'from-orange-500 to-amber-600',
    deductionFactor: 0.666,
    propertyType: 'Triplex',
    partnersPct: { Fabiola: 50, Eric: 50 },
    partnerData: {
      Fabiola: {
        homeOffice: { aireTotale: 1000, aireBureau: 50, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
        vehicle: { model: 'Tesla Model Y', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
        paradas: [''],
      },
      Eric: {
        homeOffice: { aireTotale: 1000, aireBureau: 50, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
        vehicle: { model: 'Camry Hybrid', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
        paradas: [''],
      },
    },
    userProfile: {
      logo: null, color: '#F59E0B', font: 'Moderne',
      nom: 'Triplex - Immobilier', adresse: 'Montréal (Triplex)', tel: '514-555-0000',
      neq: 'Personal-Account', tps: 'Personal', tvq: 'Personal',
      site: '', pago: 'Paiement Hypothécaire: Compte Conjoint',
      tpsRate: 5, tvqRate: 9.975,
    },
  },
  {
    id: '4',
    nombre: 'Gonzalo Real Estate',
    industry: 'Courtier Immobilier',
    legalEntity: 'Travailleur Autonome',
    partners: ['Gonzalo', 'Fabiola'],
    driveConfig: { folderId: 'brokerage_courtier_vault', connected: true },
    partnerData: {
      Gonzalo: {
        homeOffice: { aireTotale: 1500, aireBureau: 300, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
        vehicle: { model: 'Lexus RX', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
        paradas: [''],
      },
      Fabiola: {
        homeOffice: { aireTotale: 1000, aireBureau: 150, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
        vehicle: { model: 'Tesla Model Y', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
        paradas: [''],
      },
    },
    userProfile: {
      logo: null, color: '#059669', font: 'Moderne',
      nom: 'Gonzalo Real Estate', adresse: 'Brossard, QC', tel: '450-555-1122',
      neq: '2230000000', tps: '888777666 RT0001', tvq: '4445556667 TQ0001',
      site: 'www.gonzalorealestate.ca', pago: 'Virement: info@gonzalorealestate.ca',
      tpsRate: 5, tvqRate: 9.975,
    },
  },
  {
    id: '5',
    nombre: 'Entrepreneur Général',
    industry: 'Construction & Rénovations',
    legalEntity: 'Incorporée',
    partners: ['Fabiola'],
    driveConfig: { folderId: 'entrepreneur_construction_vault', connected: true },
    partnerData: {
      Fabiola: {
        homeOffice: { aireTotale: 1000, aireBureau: 100, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
        vehicle: { model: 'F-150 Lightning', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
        paradas: [''],
      },
    },
    userProfile: {
      logo: null, color: '#059669', font: 'Moderne',
      nom: 'Entrepreneur Général Inc.', adresse: 'Terrebonne, QC', tel: '450-555-3344',
      neq: '3340000000', tps: '555444333 RT0001', tvq: '6667778889 TQ0001',
      site: 'www.fabiolaconstruction.ca', pago: 'Virement: construction@fabiola.ca',
      tpsRate: 5, tvqRate: 9.975,
    },
  },
];

export const defaultHistorique = [
  { id: 'FAC-001', companyId: '1', cliente: 'Jean Tremblay',      fecha: '2026-05-10', subtotal: 1000, tps: 50,  tvq: 99.75, total: 1149.75, status: 'Payée' },
  { id: 'FAC-002', companyId: '1', cliente: 'Marie Cote',         fecha: '2026-05-12', subtotal: 500,  tps: 25,  tvq: 49.88, total: 574.88,  status: 'En attente' },
  { id: 'FAC-003', companyId: '2', cliente: 'Investisseur Global',fecha: '2026-05-14', subtotal: 2000, tps: 100, tvq: 199.5, total: 2299.5,  status: 'Payée' },
  { id: 'PLEX-001',companyId: '3', cliente: 'Locataire 1234',     fecha: '2026-05-15', subtotal: 1200, tps: 0,   tvq: 0,     total: 1200.0,  status: 'Payée' },
];

export const defaultDepenses: ExpenseDoc[] = [
  { id: '1', companyId: '1', fecha: '2026-05-01', fournisseur: 'Bell',              cat: 'Télécommunications', subtotal: 80.00,   tps: 4.0,  tvq: 7.98,   total: 91.98,   lien: null, partnerTag: 'Fabiola', ownerId: '', createdAt: '' },
  { id: '2', companyId: '1', fecha: '2026-05-03', fournisseur: 'Hydro-Québec',      cat: 'Bureau à domicile',  subtotal: 0,       tps: 0,    tvq: 0,      total: 0,       lien: null, partnerTag: 'Fabiola', ownerId: '', createdAt: '' },
  { id: '3', companyId: '2', fecha: '2026-05-05', fournisseur: 'Apple Store',       cat: 'Équipement',         subtotal: 1200.00, tps: 60.0, tvq: 119.70, total: 1379.70, lien: null, partnerTag: 'Natalia', ownerId: '', createdAt: '' },
  { id: '4', companyId: '3', fecha: '2026-05-06', fournisseur: 'Taxes Municipales', cat: 'Bureau à domicile',  subtotal: 2000.00, tps: 0,    tvq: 0,      total: 2000.00, lien: null, partnerTag: 'Fabiola', ownerId: '', createdAt: '' },
];

/**
 * Seed properties — address-level records only.
 * NOTE: No `chambres[]` nesting. Units are in `defaultUnitsSeed` below.
 */
export const defaultPropertiesSeed: PropertyDoc[] = [
  {
    id: 'prop_1',
    buildingId: 'building_triplex_main',
    typeLocation: 'Appartement/Maison',
    adresse: '123 Rue Principale, Montréal, QC',
    status: 'Actif',
    ownerId: '',
    createdAt: '',
  },
  {
    id: 'prop_2',
    buildingId: 'building_triplex_main',
    typeLocation: 'Immeuble à revenus (Triplex)',
    adresse: '123 Rue Principale, Montréal, QC',
    status: 'Actif',
    ownerId: '',
    createdAt: '',
  },
];

/**
 * Seed units — independent `units` collection.
 * Each unit carries a `buildingId` FK to its parent building.
 */
export const defaultUnitsSeed: UnitDoc[] = [
  { id: 'unit_1', buildingId: 'building_triplex_main', unitName: 'Appt 1 (RDC)',   tenantName: 'Jean Tremblay', monthlyRent: 1200, isActive: true,  ownerId: '', createdAt: '' },
  { id: 'unit_2', buildingId: 'building_triplex_main', unitName: 'Appt 2 (Étage)', tenantName: 'Marie Dubois',  monthlyRent: 950,  isActive: false, ownerId: '', createdAt: '' },
  { id: 'unit_3', buildingId: 'building_triplex_main', unitName: 'Habitation 1',   tenantName: 'Alice Roy',     monthlyRent: 450,  isActive: true,  ownerId: '', createdAt: '' },
  { id: 'unit_4', buildingId: 'building_triplex_main', unitName: 'Habitation 2',   tenantName: 'Marc Coté',     monthlyRent: 400,  isActive: false, ownerId: '', createdAt: '' },
  { id: 'unit_5', buildingId: 'building_triplex_main', unitName: 'Habitation 3',   tenantName: 'Julie Martin',  monthlyRent: 425,  isActive: true,  ownerId: '', createdAt: '' },
  { id: 'unit_6', buildingId: 'building_triplex_main', unitName: 'Habitation 4',   tenantName: 'Luc Lavoie',    monthlyRent: 450,  isActive: true,  ownerId: '', createdAt: '' },
];

export const defaultLoyersSeed: LoyerDoc[] = [
  { id: 'loyer_1', uniteAdresse: 'Appt 1 (RDC) - 123 Rue Principale',   locataire: 'Jean Tremblay', loyer: 1200, statut: 'Payé',      ownerId: '', createdAt: '' },
  { id: 'loyer_2', uniteAdresse: 'Appt 2 (Étage) - 123 Rue Principale', locataire: 'Marie Dubois',  loyer: 950,  statut: 'En retard', ownerId: '', createdAt: '' },
];

// ── BetaCodeDoc — Firestore `betaCodes` collection ───────────────────────────

/**
 * One beta access code. Doc ID === `code`. Tied to a single email and
 * single-use — see firestore.rules for the enforcement of both.
 */
export interface BetaCodeDoc {
  code: string;
  email: string;
  status: 'unused' | 'redeemed';
  validDays: number;
  createdAt: string;
  createdBy: string;
  redeemedAt?: string;
  redeemedByUid?: string;
}

// ── Trial write-gate ──────────────────────────────────────────────────────────
// Set once per session by App.tsx after reading the user's trial status —
// avoids an extra Firestore read on every single save call.
let trialExpired = false;
export function setTrialExpired(expired: boolean): void {
  trialExpired = expired;
}
function assertCanWrite(): void {
  if (trialExpired) throw new Error('TRIAL_EXPIRED');
}

// ══════════════════════════════════════════════════════════════════════════════
// §3 — DATA SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export const dataService = {
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  // ── Seeding ────────────────────────────────────────────────────────────────

  async seedUserData(userId: string): Promise<void> {
    const workspaces = await this.fetchWorkspaces(userId);
    if (workspaces.length > 0) return; // already seeded

    for (const comp of defaultWorkspaces) {
      const docId = `${userId}_company_${comp.id}`;
      await setDoc(doc(db, 'companies', docId), { ...comp, id: docId, ownerId: userId, createdAt: new Date().toISOString() });
    }

    for (const dep of defaultDepenses) {
      const expenseId = `exp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const docCompanyId = `${userId}_company_${dep.companyId}`;
      await setDoc(doc(db, 'expenses', expenseId), {
        companyId: docCompanyId, fecha: dep.fecha, fournisseur: dep.fournisseur,
        cat: dep.cat, subtotal: dep.subtotal, tps: dep.tps, tvq: dep.tvq,
        total: dep.total, lien: dep.lien, partnerTag: dep.partnerTag,
        ownerId: userId, createdAt: new Date().toISOString(),
      });
    }

    for (const prop of defaultPropertiesSeed) {
      const docId = `${userId}_prop_${prop.id}`;
      await setDoc(doc(db, 'properties', docId), { ...prop, id: docId, ownerId: userId, createdAt: new Date().toISOString() });
    }

    for (const unit of defaultUnitsSeed) {
      const docId = `${userId}_unit_${unit.id}`;
      await setDoc(doc(db, 'units', docId), { ...unit, id: docId, ownerId: userId, createdAt: new Date().toISOString() });
    }

    for (const loyer of defaultLoyersSeed) {
      const docId = `${userId}_loyer_${loyer.id}`;
      await setDoc(doc(db, 'loyers', docId), { ...loyer, id: docId, ownerId: userId, createdAt: new Date().toISOString() });
    }
  },

  // ── Workspaces / Companies ─────────────────────────────────────────────────

  async fetchWorkspaces(userId: string): Promise<any[]> {
    try {
      const q = query(collection(db, 'companies'), where('ownerId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_company_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id };
      });
    } catch (e) {
      console.error('fetchWorkspaces failed, returning local default:', e);
      return defaultWorkspaces;
    }
  },

  async saveWorkspace(userId: string, workspaceData: any): Promise<any> {
    assertCanWrite();
    const originalId = workspaceData.id || `company_${Date.now()}`;
    const docId = `${userId}_company_${originalId}`;
    const data = { ...workspaceData, id: docId, ownerId: userId, createdAt: workspaceData.createdAt || new Date().toISOString() };
    // merge: true — callers often save a single changed field (e.g. partnerData)
    // without the full company object; a plain setDoc would wipe everything else.
    await setDoc(doc(db, 'companies', docId), data, { merge: true });
    return { ...data, id: originalId };
  },

  // ── Buildings — Firestore `buildings` collection ───────────────────────────

  /**
   * Upsert a BuildingLedger to Firestore.
   * Computes `deductiblePct` automatically before writing.
   */
  async saveBuilding(userId: string, building: Omit<BuildingLedger, 'ownerId' | 'createdAt'>): Promise<BuildingLedger> {
    assertCanWrite();
    const docId = `${userId}_building_${building.id}`;
    const now = new Date().toISOString();
    const data: BuildingLedger = {
      ...building,
      deductiblePct: 100 - building.occupancyPct,   // enforce invariant
      ownerId: userId,
      createdAt: now,
    };
    await setDoc(doc(db, 'buildings', docId), data);
    return data;
  },

  /**
   * Fetch all BuildingLedgers for a user.
   */
  async fetchBuildings(userId: string): Promise<BuildingLedger[]> {
    try {
      const q = query(collection(db, 'buildings'), where('ownerId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as BuildingLedger);
    } catch (e) {
      console.error('fetchBuildings failed:', e);
      return [];
    }
  },

  /**
   * Delete a building and all its associated units (cascade).
   */
  async deleteBuilding(userId: string, buildingId: string): Promise<void> {
    // 1. Delete building document
    const docId = `${userId}_building_${buildingId}`;
    await deleteDoc(doc(db, 'buildings', docId));

    // 2. Cascade: delete all units that reference this building
    try {
      const units = await this.fetchUnitsByBuilding(userId, buildingId);
      await Promise.all(units.map((u) => this.deleteUnit(userId, u.id)));
    } catch (e) {
      console.warn('Cascade unit deletion partially failed:', e);
    }
  },

  // ── Properties — Firestore `properties` collection ─────────────────────────

  async fetchProperties(userId: string): Promise<PropertyDoc[]> {
    try {
      const q = query(collection(db, 'properties'), where('ownerId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_prop_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id } as PropertyDoc;
      });
    } catch (e) {
      console.error('fetchProperties failed, returning local default:', e);
      return defaultPropertiesSeed;
    }
  },

  async saveProperty(userId: string, propertyData: Omit<PropertyDoc, 'ownerId' | 'createdAt'>): Promise<PropertyDoc> {
    assertCanWrite();
    const originalId = propertyData.id || `prop_${Date.now()}`;
    const docId = `${userId}_prop_${originalId}`;
    const data: PropertyDoc = {
      ...propertyData,
      id: docId,
      ownerId: userId,
      createdAt: new Date().toISOString(),   // service generates timestamp (not in Omit)
    };
    await setDoc(doc(db, 'properties', docId), data);
    return { ...data, id: originalId };
  },


  async deleteProperty(propertyId: string): Promise<boolean> {
    const userId = auth.currentUser?.uid;
    const docId = userId ? `${userId}_prop_${propertyId}` : propertyId;
    await deleteDoc(doc(db, 'properties', docId));
    return true;
  },

  // ── Units (Portes) — Firestore `units` collection ─────────────────────────

  /**
   * Upsert a single unit (porte) document.
   */
  async saveUnit(userId: string, unit: Omit<UnitDoc, 'ownerId' | 'createdAt'>): Promise<UnitDoc> {
    assertCanWrite();
    const originalId = unit.id || `unit_${Date.now()}`;
    const docId = `${userId}_unit_${originalId}`;
    const data: UnitDoc = {
      ...unit,
      id: originalId,
      ownerId: userId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'units', docId), { ...data, id: docId });
    return data;
  },

  /**
   * Fetch all units belonging to a specific building.
   */
  async fetchUnitsByBuilding(userId: string, buildingId: string): Promise<UnitDoc[]> {
    try {
      const q = query(
        collection(db, 'units'),
        where('ownerId', '==', userId),
        where('buildingId', '==', buildingId),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_unit_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id } as UnitDoc;
      });
    } catch (e) {
      console.error(`fetchUnitsByBuilding(${buildingId}) failed:`, e);
      return [];
    }
  },

  /**
   * Fetch all units for a user across all buildings.
   */
  async fetchAllUnits(userId: string): Promise<UnitDoc[]> {
    try {
      const q = query(collection(db, 'units'), where('ownerId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_unit_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id } as UnitDoc;
      });
    } catch (e) {
      console.error('fetchAllUnits failed:', e);
      return [];
    }
  },

  async deleteUnit(userId: string, unitId: string): Promise<boolean> {
    const docId = `${userId}_unit_${unitId}`;
    await deleteDoc(doc(db, 'units', docId));
    return true;
  },

  // ── Expenses — Firestore `expenses` collection ──────────────────────────

  // ── Loyers — Firestore `loyers` collection ─────────────────────────────────

  async fetchLoyers(userId: string): Promise<LoyerDoc[]> {
    try {
      const q = query(collection(db, 'loyers'), where('ownerId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_loyer_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id } as LoyerDoc;
      });
    } catch (e) {
      console.error('fetchLoyers failed, returning local default:', e);
      return defaultLoyersSeed;
    }
  },

  async saveLoyer(userId: string, loyerData: Partial<LoyerDoc> & { id?: string }): Promise<LoyerDoc> {
    assertCanWrite();
    const originalId = loyerData.id || `loyer_${Date.now()}`;
    const docId = `${userId}_loyer_${originalId}`;
    const data = { ...loyerData, id: docId, ownerId: userId, createdAt: loyerData.createdAt || new Date().toISOString() };
    
    const entryData = {
      id: docId,
      date: new Date().toISOString(),
      description: `Income: Rent collection from ${data.locataire || 'Unknown'} - Unit: ${data.uniteAdresse || 'Unknown'}`,
      documentReference: docId,
      createdAt: data.createdAt,
      ownerId: userId,
    };

    const totalAmount = data.loyer || 0;

    const linesData = [
      {
        id: `${docId}-debit`,
        journalEntryId: docId,
        accountId: "acc-bank", // Debiting Bank (Asset increase)
        type: 'Debit',
        amount: totalAmount,
        ownerId: userId,
      },
      {
        id: `${docId}-credit`,
        journalEntryId: docId,
        accountId: "acc-revenue", // Crediting Revenue (Income increase)
        type: 'Credit',
        amount: totalAmount,
        ownerId: userId,
      }
    ];

    // Persist the flat document first — this is what fetchLoyers() reads back.
    // (The double-entry journal below is a secondary ledger record; without this
    // setDoc, the rent entry never actually survives a page reload.)
    await setDoc(doc(db, 'loyers', docId), data);

    try {
      // Fix: guard against unauthenticated Firestore batch writes.
      // postJournalEntry writes to 'journalEntries' and 'journalLines';
      // if the JWT hasn't propagated yet, the batch is rejected.
      if (!auth.currentUser) {
        throw new Error("User not authenticated — cannot write to journalEntries/journalLines");
      }
      await postJournalEntry(entryData, linesData);
      console.log(`Successfully converted flat rent to double-entry journal (ID: ${docId})`);
    } catch (error: any) {
      console.error("Double-entry validation failed:", error.message);
      alert(`Transaction rejected: ${error.message}`);
      throw error;
    }

    return { ...data, id: originalId } as LoyerDoc;
  },

  async deleteLoyer(loyerId: string): Promise<boolean> {
    const userId = auth.currentUser?.uid;
    const docId = userId ? `${userId}_loyer_${loyerId}` : loyerId;
    await deleteDoc(doc(db, 'loyers', docId));
    return true;
  },

  // ── Expenses — Firestore `expenses` collection ─────────────────────────────

  async fetchExpenses(userId: string): Promise<ExpenseDoc[]> {
    try {
      const q = query(collection(db, 'expenses'), where('ownerId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = data.companyId?.split('_company_');
        const originalCompanyId = idParts && idParts.length > 1 ? idParts[1] : data.companyId;
        return { ...data, id: d.id, companyId: originalCompanyId } as ExpenseDoc;
      });
    } catch (e) {
      console.error('fetchExpenses failed, returning local default:', e);
      return defaultDepenses;
    }
  },

  async saveExpense(userId: string, expenseData: Partial<ExpenseDoc> & { companyId: string }): Promise<ExpenseDoc> {
    assertCanWrite();
    const originalCompanyId = expenseData.companyId;
    const docCompanyId = `${userId}_company_${originalCompanyId}`;
    const data = {
      ...expenseData,
      companyId: docCompanyId,
      ownerId: userId,
      createdAt: expenseData.createdAt || new Date().toISOString(),
    };
    
    // Generate an ID if not provided
    const id = expenseData.id && String(expenseData.id).length > 6 && isNaN(Number(expenseData.id)) 
      ? String(expenseData.id) 
      : `exp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const entryData = {
      id: id,
      date: data.fecha || new Date().toISOString(),
      description: `Expense: ${data.fournisseur || 'Unknown'} - ${data.cat || 'General'}`,
      documentReference: id,
      createdAt: data.createdAt,
      ownerId: userId,
    };

    const totalAmount = data.total || 0;

    const linesData = [
      {
        id: `${id}-debit`,
        journalEntryId: id,
        accountId: "acc-expense", // Debiting expense account
        type: 'Debit',
        amount: totalAmount,
        ownerId: userId,
      },
      {
        id: `${id}-credit`,
        journalEntryId: id,
        accountId: "acc-bank", // Crediting bank account
        type: 'Credit',
        amount: totalAmount,
        ownerId: userId,
      }
    ];

    // Persist the flat document first — this is what fetchExpenses() reads back.
    // (The double-entry journal below is a secondary ledger record; without this
    // setDoc, the expense never actually survives a page reload.)
    await setDoc(doc(db, 'expenses', id), data);

    try {
      // Fix: guard against unauthenticated Firestore batch writes.
      if (!auth.currentUser) {
        throw new Error("User not authenticated — cannot write to journalEntries/journalLines");
      }
      await postJournalEntry(entryData, linesData);
      console.log(`Successfully converted flat expense to double-entry journal (ID: ${id})`);
    } catch (error: any) {
      console.error("Double-entry validation failed:", error.message);
      alert(`Transaction rejected: ${error.message}`);
      throw error;
    }

    return { id, ...data, companyId: originalCompanyId } as ExpenseDoc;
  },

  async deleteExpense(expenseId: string): Promise<boolean> {
    await deleteDoc(doc(db, 'expenses', String(expenseId)));
    return true;
  },

  // ── Invoices — Firestore `invoices` collection (revenue/ventes ledger) ─────

  async fetchInvoices(userId: string): Promise<InvoiceDoc[]> {
    try {
      const q = query(collection(db, 'invoices'), where('ownerId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = data.companyId?.split('_company_');
        const originalCompanyId = idParts && idParts.length > 1 ? idParts[1] : data.companyId;
        return { ...data, id: d.id, companyId: originalCompanyId } as InvoiceDoc;
      });
    } catch (e) {
      console.error('fetchInvoices failed, returning local default:', e);
      return [];
    }
  },

  async saveInvoice(userId: string, invoiceData: Partial<InvoiceDoc> & { companyId: string }): Promise<InvoiceDoc> {
    assertCanWrite();
    const originalCompanyId = invoiceData.companyId;
    const docCompanyId = `${userId}_company_${originalCompanyId}`;
    const data = {
      ...invoiceData,
      companyId: docCompanyId,
      ownerId: userId,
      createdAt: invoiceData.createdAt || new Date().toISOString(),
    };

    const id = invoiceData.id && String(invoiceData.id).length > 6 && isNaN(Number(invoiceData.id))
      ? String(invoiceData.id)
      : `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    await setDoc(doc(db, 'invoices', id), data);

    const entryData = {
      id,
      date: data.fecha || new Date().toISOString(),
      description: `Revenue: ${data.cliente || 'Unknown'} - ${data.cat || 'Ventes'}`,
      documentReference: id,
      createdAt: data.createdAt,
      ownerId: userId,
    };
    const totalAmount = data.total || 0;
    const linesData = [
      { id: `${id}-debit`, journalEntryId: id, accountId: 'acc-bank', type: 'Debit', amount: totalAmount, ownerId: userId },
      { id: `${id}-credit`, journalEntryId: id, accountId: 'acc-revenue', type: 'Credit', amount: totalAmount, ownerId: userId },
    ];

    try {
      if (!auth.currentUser) {
        throw new Error("User not authenticated — cannot write to journalEntries/journalLines");
      }
      await postJournalEntry(entryData, linesData);
      console.log(`Successfully converted flat invoice to double-entry journal (ID: ${id})`);
    } catch (error: any) {
      console.error("Double-entry validation failed:", error.message);
      throw error;
    }

    return { id, ...data, companyId: originalCompanyId } as InvoiceDoc;
  },

  async deleteInvoiceDoc(invoiceId: string): Promise<boolean> {
    await deleteDoc(doc(db, 'invoices', String(invoiceId)));
    return true;
  },

  // ── Invoices — simulated / Firestore (legacy) ──────────────────────────────

  /** @deprecated Use real Firestore invoice collection */
  async fetchInitialWorkspaces(): Promise<any[]> {
    await this.delay(300);
    return defaultWorkspaces;
  },

  /** @deprecated */
  async fetchInitialInvoices(): Promise<any[]> {
    await this.delay(300);
    return defaultHistorique;
  },

  /** @deprecated */
  async fetchInitialExpenses(): Promise<ExpenseDoc[]> {
    await this.delay(300);
    return defaultDepenses;
  },

  async createInvoice(invoiceData: any): Promise<any> {
    await this.delay(500);
    return { id: `FAC-${Math.floor(Math.random() * 10000)}`, ...invoiceData };
  },

  async updateInvoice(id: string, invoiceData: any): Promise<any> {
    await this.delay(500);
    return { id, ...invoiceData };
  },

  async deleteInvoice(id: string): Promise<boolean> {
    await this.delay(400);
    return true;
  },

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    await this.delay(800);
    console.log(`Email sent to ${to}`);
    return true;
  },

  // ── General Ledger ──────────────────────────────────────────────────────────

  async fetchJournalEntries(userId: string) {
    try {
      const entriesQuery = query(collection(db, 'journalEntries'), where('ownerId', '==', userId), orderBy('date', 'desc'));
      const linesQuery = query(collection(db, 'journalLines'), where('ownerId', '==', userId));

      // Two queries total (not one-per-entry): fetch every entry and every line
      // for this user in parallel, then group lines by journalEntryId in memory.
      const [entriesSnap, linesSnap] = await Promise.all([getDocs(entriesQuery), getDocs(linesQuery)]);

      const linesByEntryId = new Map<string, any[]>();
      linesSnap.docs.forEach((lineDoc) => {
        const line = lineDoc.data();
        const key = line.journalEntryId;
        if (!linesByEntryId.has(key)) linesByEntryId.set(key, []);
        linesByEntryId.get(key)!.push(line);
      });

      return entriesSnap.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
        lines: linesByEntryId.get(docSnap.id) ?? [],
      }));
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      throw error;
    }
  },

  // ── Beta Access Codes ────────────────────────────────────────────────────────

  /** Generates a single-use, email-bound beta access code. Superadmin-only (enforced by firestore.rules). */
  async generateBetaCode(email: string, validDays = 30): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — avoids ambiguous codes
    let suffix = '';
    for (let i = 0; i < 6; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    const code = `AC-${suffix}`;
    const data: BetaCodeDoc = {
      code,
      email: email.trim().toLowerCase(),
      status: 'unused',
      validDays,
      createdAt: new Date().toISOString(),
      createdBy: auth.currentUser?.email ?? '',
    };
    await setDoc(doc(db, 'betaCodes', code), data);
    return code;
  },

  /** Checks a code exists, is unused, and belongs to this email — before account creation. */
  async validateBetaCode(code: string, email: string): Promise<{ valid: boolean; reason?: string }> {
    const normalizedCode = code.trim().toUpperCase();
    const snap = await getDoc(doc(db, 'betaCodes', normalizedCode));
    if (!snap.exists()) return { valid: false, reason: 'Code introuvable.' };
    const data = snap.data() as BetaCodeDoc;
    if (data.status !== 'unused') return { valid: false, reason: 'Ce code a déjà été utilisé.' };
    if (data.email !== email.trim().toLowerCase()) return { valid: false, reason: "Ce code n'est pas associé à cette adresse courriel." };
    return { valid: true };
  },

  /**
   * Marks the code as redeemed and stamps the trial window onto `users/{uid}`.
   * Caller must already be signed in as the code's email.
   *
   * Uses `setDoc(..., { merge: true })` on the user doc rather than plain
   * `setDoc` — this runs concurrently with the `users/{uid}` profile-creation
   * write in App.tsx's onAuthStateChanged (both fire right after
   * createUserWithEmailAndPassword resolves), so whichever write lands second
   * must not blow away the other's fields.
   */
  async redeemBetaCode(code: string, uid: string): Promise<{ trialStartDate: string; trialValidDays: number }> {
    const normalizedCode = code.trim().toUpperCase();
    const codeRef = doc(db, 'betaCodes', normalizedCode);
    const snap = await getDoc(codeRef);
    if (!snap.exists()) throw new Error('Code introuvable.');
    const data = snap.data() as BetaCodeDoc;
    const trialStartDate = new Date().toISOString();
    await updateDoc(codeRef, {
      status: 'redeemed',
      redeemedAt: trialStartDate,
      redeemedByUid: uid,
    });
    await setDoc(doc(db, 'users', uid), {
      betaCodeRedeemed: normalizedCode,
      trialStartDate,
      trialValidDays: data.validDays,
    }, { merge: true });
    return { trialStartDate, trialValidDays: data.validDays };
  },

  /** Lists every generated code — for the admin "Codes Beta" tab. Enforced superadmin-only by firestore.rules' `allow list`. */
  async fetchBetaCodes(): Promise<BetaCodeDoc[]> {
    const snap = await getDocs(collection(db, 'betaCodes'));
    return snap.docs.map((d) => d.data() as BetaCodeDoc);
  },
};
