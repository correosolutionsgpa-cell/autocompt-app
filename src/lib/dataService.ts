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
  runTransaction,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';
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
  /** Which company/workspace manages this building. */
  companyId: string;
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
  // ── Gestionnaire Immobilier ──
  /** FK → FideicommisClientDoc.id
   *  Present only when this building belongs to a client managed by the
   *  gestionnaire. Null/absent for buildings owned directly by the account. */
  fideicommisClientId?: string;
  /** Denormalised display name for fast render without a join. */
  fideicommisClientName?: string;
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
  /** Which company/workspace this property belongs to — a property is managed BY one company (e.g. a Triplex managed through a property-management business), never shared across companies. */
  companyId: string;
  /** FK → BuildingLedger.id (links property to its fiscal ledger) */
  buildingId?: string;
  typeLocation: string;   // "Appartement/Maison" | "Immeuble à revenus" | etc.
  adresse: string;
  status: 'Actif' | 'Vacant' | 'Archivé';
  /** % of this property occupied by the owner themselves (0 for a fully-rented
   * building). When set, tax/insurance expenses filed against this property
   * are only logged as deductible for the remaining (100 − occupancyPct)% —
   * mirrors BuildingLedger.occupancyPct/deductiblePct for properties that
   * don't (yet) have a full BuildingLedger set up. Always user-confirmed,
   * never silently assumed — defaults to 0 (no reduction) until set. */
  occupancyPct?: number;
  ownerId: string;
  createdAt: string;
  // ── Gestionnaire Immobilier ──
  /** FK → FideicommisClientDoc.id
   *  Present only when this property belongs to a client managed by the
   *  gestionnaire. Null/absent for properties owned directly by the account. */
  fideicommisClientId?: string;
  /** Denormalised display name for fast render without a join. */
  fideicommisClientName?: string;
  // ── Comptable ──
  /** FK → BookkeepingClientDoc.id
   *  Present only when this property belongs to a client managed by a
   *  comptable (generic multi-client bookkeeping), as opposed to a
   *  propriétaire-client managed by the gestionnaire (fideicommisClientId
   *  above) — the two are mutually exclusive per property. */
  bookkeepingClientId?: string;
  /** Denormalised display name for fast render without a join. */
  bookkeepingClientName?: string;
}

// ── UnitDoc — Firestore `units` collection ────────────────────────────────────

/**
 * One rentable unit (porte) inside a building.
 * Independent collection — can be queried by buildingId.
 * Document ID: `{userId}_unit_{id}`
 */
export interface UnitDoc {
  id: string;
  /** Which company/workspace this unit belongs to — mirrors its parent PropertyDoc.companyId. */
  companyId: string;
  /** FK → BuildingLedger.id (or PropertyDoc.id for legacy data) */
  buildingId: string;
  /** Human-readable unit label, e.g. "Appt 1 (RDC)", "Habitation 3" */
  unitName: string;
  tenantName: string;
  monthlyRent: number;
  isActive: boolean;
  /** true = location touristique/courte durée (< 31 nuits) — soumise à la CITQ
   *  et à la taxe de séjour, suivie dans le module Meublé/Airbnb.
   *  false/absent (défaut) = bail résidentiel normal, même si réservé via une
   *  plateforme comme Airbnb pour des séjours de 32+ jours.
   *  Dérivé automatiquement de `dureeMinimaleJours` — jamais choisi à l'aveugle. */
  courteDuree?: boolean;
  /** Durée MINIMALE de location de cette unité, en jours/nuits — saisie par
   *  l'utilisateur, détermine courteDuree (< 31 → touristique, ≥ 31 → résidentiel). */
  dureeMinimaleJours?: number;
  // ── Relevé 31 (Revenu Québec) ──────────────────────────────────────────────
  /** Date d'entrée du locataire principal (YYYY-MM-DD) — requis pour produire
   *  le Relevé 31. Toujours saisi/confirmé par l'utilisateur, jamais présumé. */
  moveInDate?: string;
  /** Date de départ du locataire, si l'unité n'est plus occupée par lui. */
  moveOutDate?: string;
  /** Ce logement était-il la résidence principale du locataire au 31 décembre
   *  de l'année visée ? Condition d'admissibilité au crédit de solidarité —
   *  toujours confirmé par l'utilisateur, jamais présumé silencieusement. */
  residencePrincipale?: boolean;
  /** Occupants additionnels du logement, au-delà de `tenantName` (locataire
   *  principal) — le Relevé 31 exige de lister TOUS les occupants, pas
   *  seulement le signataire du bail. */
  occupantsSupplementaires?: string[];
  ownerId: string;
  createdAt: string;
}

// ── ExpenseDoc — Firestore `expenses` collection ──────────────────────────────

export interface ExpenseAuditLog {
  originalCat: string;
  newCat: string;
  confirmedBy: string;
  timestamp: string;
}

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
  /** Nivel de confianza de la categorización por IA */
  catConfidence?: 'high' | 'medium' | 'low';
  /** Historial de auditoría para revisión human-in-the-loop */
  auditLogs?: ExpenseAuditLog[];
  /** Receipt confirmed missing — set by disclaimer checkbox */
  noReceiptConfirmed?: boolean;
  /** FK → UnitDoc.id (optional, for property-linked expenses) */
  unitId?: string;
  /** FK → BuildingLedger.id (optional, for property-linked expenses) */
  buildingId?: string;
  /** FK → BookkeepingClientDoc.id — generic multi-client tag (comptable/
   *  gestionnaire profiles), distinct from fideicommisClientId. */
  clientId?: string;
  ownerId: string;
  createdAt: string;
}

// ── MeubleReservationDoc — Firestore `meubleReservations` collection ──────────
/**
 * Une réservation Airbnb / courte durée persistée en Firestore.
 * Document ID: `{userId}_meubleres_{id}`
 *
 * Comptabilité: le champ `modeGestion` détermine quel grand livre est alimenté.
 * - 'proprietaire' → livre de la compagnie courante (revenu + frais)
 * - 'gestionnaire' → CompteFidéicommis (passif fonds clients + honoraires)
 */
export interface MeubleReservationDoc {
  id: string;
  companyId: string;
  /** FK → UnitDoc.id (unité spécifique si multi-unités) */
  unitId?: string;
  /** FK → BuildingLedger.id */
  buildingId?: string;
  /** Mode comptable déterminé par le profil onboarding */
  modeGestion: 'proprietaire' | 'gestionnaire';
  /** Pour le mode gestionnaire: FK → FideicommisClientDoc.id */
  fideicommisClientId?: string;
  fideicommisClientName?: string;
  /** Taux d'honoraires du gestionnaire (%), lu depuis FideicommisClientDoc.tauxHonoraires
   *  au moment de la réservation — génère un retrait "honoraires" automatique. */
  commissionRatePercent?: number;
  guestName: string;
  checkIn: string;           // YYYY-MM-DD
  checkOut: string;          // YYYY-MM-DD
  nights: number;
  nightlyRate: number;
  platform: 'airbnb' | 'direct' | 'vrbo' | 'booking';
  platformFeePercent: number;
  /** Taux taxe de séjour appliqué (% — lu depuis userProfile.taxeSejourRegion) */
  taxeSejour: number;
  /** true = Airbnb/plateforme a remis la taxe de séjour directement au gouvernement.
   *  false = réservation directe, l'hôte doit la remettre lui-même. */
  taxeSejourRemisePlateforme: boolean;
  /** TPS collectée par l'hôte (seulement si inscrit TPS — userProfile.tps non vide) */
  tpsCollected?: number;
  /** TVQ collectée par l'hôte (seulement si inscrit TVQ — userProfile.tvq non vide) */
  tvqCollected?: number;
  /** Frais de plateforme déduits (platformFeePercent × gross) */
  platformFeeDeduit?: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
  /** true si le JournalEntry double-entrée a été généré avec succès */
  journalPosted: boolean;
  ownerId: string;
  createdAt: string;
}

// ── MeubleExpenseDoc — Firestore `meubleExpenses` collection ─────────────────
/**
 * Une dépense d'exploitation d'une location meublée (ménage, fournitures,
 * hydro, internet, etc.) — séparée des `ExpenseDoc` du Tenue de Livres
 * général car les catégories et la logique diffèrent (pas de TPS/TVQ ligne
 * par ligne, catégories propres à la courte durée).
 */
export interface MeubleExpenseDoc {
  id: string;
  companyId: string;
  date: string;              // YYYY-MM-DD
  category: string;          // ExpenseCategory du module Meublé (menage, hydro, etc.)
  description: string;
  amount: number;
  /** Lien Google Drive du reçu (si scanné par S.O.F.I. ou joint manuellement) */
  lien?: string;
  /** true si extrait par le scan IA — jamais auto-confirmé, juste un indicateur d'origine */
  aiScanned?: boolean;
  buildingId?: string;
  unitId?: string;
  ownerId: string;
  createdAt: string;
}

// ── MeubleUnitConfigDoc — Firestore `meubleUnitConfigs` collection ────────────
/**
 * Configuration fiscale et opérationnelle d'une unité meublée.
 * Stockée par (userId, companyId) — une config par workspace meublé.
 * Document ID: `{userId}_meubleconfig_{companyId}`
 *
 * NOTE: Les champs fiscaux (tps/tvq/taxeSejourRegion) sont lus depuis
 * userProfile (Paramètres) et dupliqués ici pour snapshot historique.
 */
export interface MeubleUnitConfigDoc {
  id: string;
  companyId: string;
  unitId?: string;
  name: string;
  address?: string;
  /** Snapshot du taux de taxe de séjour régional au moment de la config */
  taxeSejourDefault: number;
  /** true si inscrit aux fichiers TPS (userProfile.tps non vide) */
  registeredTPS: boolean;
  /** true si inscrit aux fichiers TVQ (userProfile.tvq non vide) */
  registeredTVQ: boolean;
  /** Numéro CITQ (Corporation de l'industrie touristique du Québec) */
  numeroCITQ?: string;
  /** Mode: propriétaire qui autogère vs gestionnaire pour un client tiers */
  modeGestion: 'proprietaire' | 'gestionnaire';
  /** FK → FideicommisClientDoc.id (mode gestionnaire seulement) */
  fideicommisClientId?: string;
  fideicommisClientName?: string;
  /** Taux de commission du gestionnaire (% des revenus bruts) */
  commissionGestionnaire?: number;
  platformFeeDefault: Partial<Record<'airbnb' | 'direct' | 'vrbo' | 'booking', number>>;
  ownerId: string;
  createdAt: string;
}

// ── LoyerDoc — Firestore `loyers` collection ─────────────────────────────────

export interface LoyerDoc {
  id: string;
  /** Which company/workspace this rent entry belongs to. */
  companyId: string;
  uniteAdresse: string;
  locataire: string;
  loyer: number;
  statut: 'Payé' | 'En retard' | 'En attente';
  /** FK → UnitDoc.id, resolved from allUnits when saved via App.tsx's handleSaveLoyer */
  unitId?: string;
  /** FK → PropertyDoc.id, resolved from allUnits when saved via App.tsx's handleSaveLoyer */
  buildingId?: string;
  date?: string;
  ownerId: string;
  createdAt: string;
}

// ── CondoUnitDoc — Firestore `condoUnits` collection (Síndico cotisations) ───
// Document ID: `{userId}_condounit_{id}`

export interface CondoUnitDoc {
  id: string;
  companyId: string;
  unit: string;             // "Unité 101"
  owner: string;             // "Jean Tremblay"
  amountDue: number;         // monthly cotisation amount
  status: 'paye' | 'en_retard';
  ownerId: string;
  createdAt: string;
}

// ── CotisationPaymentDoc — Firestore `cotisationPayments` collection ────────
// One record per month/payment, FK → CondoUnitDoc.id. Document ID: `{userId}_cotisationpay_{id}`

export interface CotisationPaymentDoc {
  id: string;
  companyId: string;
  unitId: string;
  month: string;             // "Mai 2026"
  amount: number;
  date: string;
  status: 'paye' | 'en_retard';
  ownerId: string;
  createdAt: string;
}

export interface CommunityPostDoc {
  id: string;
  companyId: string;
  authorName: string;
  authorRole: string;
  type: 'annonce' | 'incident';
  content: string;
  adminReply?: string;
  adminReplyAt?: string;
  ownerId: string;
  createdAt: string;
}

export interface LegalDocumentDoc {
  id: string;
  companyId: string;
  kind: 'contrat' | 'resolution';
  title: string;
  date: string;
  status: string;
  summary: string;
  provider: string;
  signedBy: string;
  signedDate: string;
  signatureType?: 'draw' | 'type';
  signatureDataUrl?: string;
  customDocUrl?: string;
  ownerId: string;
  createdAt: string;
}

/** One call to an AI provider (Gemini/Claude) — logged for cost tracking per profile. */
export interface AiUsageEventDoc {
  id: string;
  ownerId: string;
  userEmail?: string;
  profile: string;
  feature: string;
  createdAt: string;
}

/** One SaaS subscription invoice AutoCompt issues to a client — permanent
 *  record backing the sequential invoice numbering (SuperAdmin "Facturation"). */
export interface PlatformInvoiceDoc {
  id: string;
  invoiceNumber: string;
  invoiceSeq: number;
  userId: string;
  userEmail: string;
  userName: string;
  company: string;
  plan: string;
  subtotal: number;
  tps: number;
  tvq: number;
  total: number;
  issuedAt: string;
  issuedBy: string;
}

export interface BoardMember {
  name: string;
  role: string;
}

export interface SyndicSettingsDoc {
  companyId: string;
  buildingName: string;
  address: string;
  totalUnits: number;
  fiscalYearEnd: string;    // "31 décembre", etc.
  reserveFundPercent: number;
  boardMembers: BoardMember[];
  ownerId: string;
  updatedAt: string;
}

// ── CompanyInviteDoc — real partner-sharing invite flow ─────────────────────
// Doc id is deterministic: `{companyDocId}_invite_{invitedEmail}` — lets the
// Firestore rule check "does a pending invite exist for this email" with a
// direct `exists()` lookup instead of a query.
export interface CompanyInviteDoc {
  id: string;
  companyDocId: string;    // the `companies` collection's own (prefixed) doc id
  companyName: string;
  invitedEmail: string;
  invitedByUid: string;
  invitedByName: string;
  status: 'pending' | 'accepted';
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
  /** FK → BookkeepingClientDoc.id — generic multi-client tag (comptable/
   *  gestionnaire profiles), distinct from fideicommisClientId. */
  clientId?: string;
  ownerId: string;
  createdAt: string;
}

// ── DocTemplateDoc — Firestore `docTemplates` collection ─────────────────────
// The .docx file itself lives in Firebase Storage (docTemplates are metadata
// only — Firestore documents have a 1MB limit, unsuitable for file blobs).

export interface DocTemplateDoc {
  id: string;
  companyId: string;
  nombre: string;
  storagePath: string;
  campos: string[];
  /** {{#clause}}...{{/clause}} conditional sections detected in the .docx — shown as checkboxes when filling. */
  condiciones: string[];
  ownerId: string;
  createdAt: string;
}

/**
 * DocuLegal entry for Prospecteur/Investisseur/Flippeur/Gestionnaire (the
 * general-purpose lease/offer/subcontract e-signature flow — distinct from
 * Syndicat's contrat/resolution model in `legalDocuments`). Shape mirrors
 * the in-memory `docuLegalList` object App.tsx already builds, so no
 * client-side remapping is needed at the call sites.
 */
export interface DocuLegalEntryDoc {
  id: string;
  name: string;
  cat: string;
  status: string;
  date: string;
  companyId: string;
  author: string;
  recipient: string;
  recipientEmail?: string;
  recipientPhone?: string;
  content?: string;
  smsVerify?: boolean;
  emailInvite?: string;
  signers?: any[];
  placedFields?: any;
  // Populated once a signature completes.
  signerName?: string;
  signerEmail?: string;
  signatureTimestamp?: string;
  transactionId?: string;
  signatureData?: string;
  // Set when this entry was archived directly from an already-signed
  // photo/PDF (not produced via the e-signature editor) — a Drive link.
  fileUrl?: string;
  ownerId: string;
  createdAt: string;
}

// ── PaieRecordDoc — Firestore `paieRecords` collection (Payroll) ──────────────

export interface PaieRecordDoc {
  id: string;
  companyId: string;
  nom: string;
  frequence: string;
  montantBase: number;
  deductions: number;
  neto: number;
  statut: string;
  date: string;
  fileUrl?: string;
  ownerId: string;
  createdAt: string;
}

// ── PropertyDocumentDoc — Firestore `propertyDocuments` collection (Taxes & Assurances Docs) ──

export interface PropertyDocumentDoc {
  id: string;
  propertyId: string;
  /** Prefixed company doc id (`{ownerId}_company_{shortId}`) — lets invited
   * collaborators read these documents too, same pattern as every other
   * shared collection. Optional only for documents saved before this field existed. */
  companyId?: string;
  type: 'Municipales' | 'Scolaires' | 'Assurances';
  name: string;
  fileUrl: string; // Google Drive "/preview" link — the company's own Drive, not AutoCompt storage
  storagePath?: string; // legacy Firebase Storage path, empty for Drive-based uploads
  ownerId: string;
  uploadedAt: string;
}

// ── Fidéicommis — 4 Firestore collections (OACIQ compliance) ─────────────────
// §1 Note: These collections are SEPARATE from the operating account.
// All funds received on behalf of clients MUST pass through fidéicommis first.

/**
 * FideicommisClientDoc — `fideicommisClients` collection
 * One document per propriétaire-client managed by the gestionnaire.
 * Document ID: `{userId}_fidclient_{id}`
 */
export interface FideicommisClientDoc {
  id: string;
  companyId: string;
  /** Full name of the property owner (investisseur) */
  nom: string;
  email: string;
  telephone?: string;
  /** Address(es) of properties managed for this client */
  proprietes: string[];
  /** Taux d'honoraires de gestion (%) */
  tauxHonoraires: number;
  ownerId: string;
  createdAt: string;
}

/**
 * BookkeepingClientDoc — `bookkeepingClients` collection
 * One document per property-owning end-client whose books a comptable keeps
 * from a single AutoCompt account/company. AutoCompt is real-estate
 * accounting only (no generic/non-property business modules exist yet) —
 * every client here is ultimately a property owner; `typeEntite` captures
 * HOW they hold/manage that property, not an unrelated business sector.
 * Deliberately separate from FideicommisClientDoc above: no management-fee
 * %, no trust-account (fidéicommis) fields — those stay exclusive to the
 * gestionnaire's OACIQ trust-account model, since a comptable's client
 * manages their own trust relationship (or has none) rather than the
 * comptable holding funds on their behalf.
 * `companyId` is the RAW (unprefixed) activeCompanyId, same convention as
 * FideicommisClientDoc — NOT the `{userId}_company_` prefixed form used by
 * properties/units/expenses/invoices.
 * Document ID: `{userId}_bkclient_{id}`
 */
export type BookkeepingClientTypeEntite = 'autonome' | 'inc' | 'gestion_tierce';

export interface BookkeepingClientDoc {
  id: string;
  companyId: string;
  nom: string;
  email: string;
  telephone?: string;
  /** How this client holds/manages their property(-ies):
   *  'autonome' = propriétaire autogéré (self-managed individual owner)
   *  'inc' = société (INC) — property held through a corporation
   *  'gestion_tierce' = déjà sous l'administration d'un gestionnaire
   *  immobilier (comptable does the books for a property a Gestionnaire
   *  already manages day-to-day). */
  typeEntite?: BookkeepingClientTypeEntite;
  notes?: string;
  ownerId: string;
  createdAt: string;
}

/**
 * FideicommisDepotDoc — `fideicommisDepots` collection
 * One deposit = one rent payment received on behalf of a client.
 * Document ID: `{userId}_fiddepot_{id}`
 */
export interface FideicommisDepotDoc {
  id: string;
  companyId: string;
  /** Sequential receipt number: YYYYMM-NNNN */
  numeroRecu: string;
  date: string;             // YYYY-MM-DD
  /** Name of the tenant who paid */
  locataireName: string;
  /** Civic address of the rented property */
  propertyAddress: string;
  /** Rental period covered: YYYY-MM-DD */
  periodeDebut: string;
  periodeFin: string;
  montant: number;
  modePaiement: 'chèque' | 'virement' | 'espèce' | 'carte' | 'autre';
  /** FK → FideicommisClientDoc.id */
  clientId: string;
  clientName: string;
  /** FK → BuildingLedger.id — which building this loyer comes from */
  buildingId?: string;
  /** Denormalised building address for display */
  buildingAddress?: string;
  /** FK → UnitDoc.id — which unit/porte specifically */
  unitId?: string;
  /** Denormalised unit name for display */
  unitName?: string;
  /** URL of the generated reçu PDF (Firebase Storage) */
  recuPdfUrl?: string;
  notes?: string;
  ownerId: string;
  createdAt: string;
}


/**
 * FideicommisRetraitDoc — `fideicommisRetraits` collection
 * One withdrawal from the fidéicommis account.
 * Document ID: `{userId}_fidretrait_{id}`
 */
export interface FideicommisRetraitDoc {
  id: string;
  companyId: string;
  date: string;             // YYYY-MM-DD
  beneficiaire: string;
  propertyAddress: string;
  montant: number;
  /** 'dépense' = expense paid on behalf | 'honoraires' = mgmt fees | 'remise_nette' = net remittance to owner */
  type: 'dépense' | 'honoraires' | 'remise_nette';
  description: string;
  /** FK → FideicommisClientDoc.id */
  clientId: string;
  clientName: string;
  notes?: string;
  ownerId: string;
  createdAt: string;
}

/**
 * FideicommisConciliationDoc — `fideicommisConciliations` collection
 * Monthly reconciliation record (OACIQ requirement: done every month).
 * Document ID: `{userId}_{companyId}_{YYYY-MM}`
 */
export interface FideicommisConciliationDoc {
  id: string;
  companyId: string;
  /** YYYY-MM format */
  period: string;
  /** Sum of all deposits that month (calculated) */
  totalDepots: number;
  /** Sum of all withdrawals that month (calculated) */
  totalRetraits: number;
  /** Opening balance (closing of previous month) */
  soldeOuverture: number;
  /** Calculated: soldeOuverture + totalDepots - totalRetraits */
  soldeAttendu: number;
  /** Actual bank balance entered by user */
  soldeBancaire: number;
  /** soldeAttendu - soldeBancaire (0 = balanced) */
  ecart: number;
  /** 'équilibré' | 'écart' */
  statut: 'équilibré' | 'écart';
  notes?: string;
  /** ISO timestamp of when the conciliation was completed */
  completedAt?: string;
  ownerId: string;
  createdAt: string;
}

/**
 * StatementLinkDoc — `statementLinks` collection
 * Narrow cross-company channel: connects a gestionnaire's FideicommisClientDoc
 * to the actual Firebase account of the delegated-management owner, so that
 * account can later read sealed statements addressed to it. Deliberately NOT
 * the companyInvites/collaboratorUIDs flow — that grants full access to a
 * whole company; this only ever unlocks the two collections below.
 * Document ID: `{gestionnaireCompanyId}_link_{fideicommisClientId}`
 */
export interface StatementLinkDoc {
  id: string;
  gestionnaireCompanyId: string;
  gestionnaireOwnerId: string;
  /** FK → FideicommisClientDoc.id */
  fideicommisClientId: string;
  /** Email the invite was sent to — matched against the accepting user's auth token email. */
  invitedEmail: string;
  status: 'pending' | 'accepted';
  /** Set only once accepted. */
  linkedOwnerUid?: string;
  /** Which of the owner's own companies this channel is tied to — chosen by
   *  them at accept time (they may run more than one company/workspace). */
  linkedOwnerCompanyId?: string;
  createdAt: string;
}

/**
 * SealedStatementDoc — `sealedStatements` collection
 * A "bank statement"-style periodic summary: once created, immutable
 * (enforced in firestore.rules — no update/delete allowed). Stores only the
 * computed totals, never the underlying FideicommisDepotDoc/RetraitDoc rows
 * — the owner never gets read access to the manager's raw trust-account
 * records, only this sealed summary.
 * Document ID: `{gestionnaireCompanyId}_stmt_{fideicommisClientId}_{period}`
 */
export interface SealedStatementDoc {
  id: string;
  gestionnaireCompanyId: string;
  fideicommisClientId: string;
  linkedOwnerUid: string;
  /** YYYY-MM */
  period: string;
  totalLoyers: number;
  totalDepenses: number;
  totalHonoraires: number;
  netRemis: number;
  /** Denormalised for display — which properties this period covers. */
  propertyAddresses: string[];
  gestionnaireName: string;
  companyName: string;
  sealedAt: string;
  sealedByUid: string;
}

// ── AiReportDoc — Firestore `aiReports` collection (SyndicAI generated reports) ──

export interface AiReportDoc {
  id: string;
  companyId: string;
  type: string; // 'financier' | 'convocation' | 'legal' | 'inspection' | 'budget'
  period: string;
  text: string;
  ownerId: string;
  generatedAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// §2 — SEED DATA
// ══════════════════════════════════════════════════════════════════════════════

export const defaultWorkspaces = [
  {
    id: '1',
    nombre: 'Solutions GPA Inc.',
    industry: 'Gestionnaire de Bâtiments',
    // Which dashboard shell this company opens into. This was previously
    // hardcoded by id ("1"/"2" → Syndic, "3" → Plex, "4"/"5" unhandled) — an
    // explicit field per company is the source of truth now.
    dashboardMode: 'Syndic' as const,
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
    dashboardMode: 'Plex' as const,
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
    dashboardMode: 'Plex' as const,
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
    dashboardMode: 'Plex' as const,
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
    dashboardMode: 'Plex' as const,
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
// Seeded as belonging to company "1" (Solutions GPA Inc.) — the Triplex is an
// asset managed through that property-management business, not its own company.
export const defaultPropertiesSeed: PropertyDoc[] = [
  {
    id: 'prop_1',
    companyId: '1',
    buildingId: 'building_triplex_main',
    typeLocation: 'Appartement/Maison',
    adresse: '123 Rue Principale, Montréal, QC',
    status: 'Actif',
    ownerId: '',
    createdAt: '',
  },
  {
    id: 'prop_2',
    companyId: '1',
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
  { id: 'unit_1', companyId: '1', buildingId: 'building_triplex_main', unitName: 'Appt 1 (RDC)',   tenantName: 'Jean Tremblay', monthlyRent: 1200, isActive: true,  ownerId: '', createdAt: '' },
  { id: 'unit_2', companyId: '1', buildingId: 'building_triplex_main', unitName: 'Appt 2 (Étage)', tenantName: 'Marie Dubois',  monthlyRent: 950,  isActive: false, ownerId: '', createdAt: '' },
  { id: 'unit_3', companyId: '1', buildingId: 'building_triplex_main', unitName: 'Habitation 1',   tenantName: 'Alice Roy',     monthlyRent: 450,  isActive: true,  ownerId: '', createdAt: '' },
  { id: 'unit_4', companyId: '1', buildingId: 'building_triplex_main', unitName: 'Habitation 2',   tenantName: 'Marc Coté',     monthlyRent: 400,  isActive: false, ownerId: '', createdAt: '' },
  { id: 'unit_5', companyId: '1', buildingId: 'building_triplex_main', unitName: 'Habitation 3',   tenantName: 'Julie Martin',  monthlyRent: 425,  isActive: true,  ownerId: '', createdAt: '' },
  { id: 'unit_6', companyId: '1', buildingId: 'building_triplex_main', unitName: 'Habitation 4',   tenantName: 'Luc Lavoie',    monthlyRent: 450,  isActive: true,  ownerId: '', createdAt: '' },
];

export const defaultLoyersSeed: LoyerDoc[] = [
  { id: 'loyer_1', companyId: '1', uniteAdresse: 'Appt 1 (RDC) - 123 Rue Principale',   locataire: 'Jean Tremblay', loyer: 1200, statut: 'Payé',      ownerId: '', createdAt: '' },
  { id: 'loyer_2', companyId: '1', uniteAdresse: 'Appt 2 (Étage) - 123 Rue Principale', locataire: 'Marie Dubois',  loyer: 950,  statut: 'En retard', ownerId: '', createdAt: '' },
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

/** Strips the `{userId}_company_` prefix off a stored companyId, for display/comparison against `activeCompanyId`. */
function unprefixCompanyId(companyId: string | undefined): string {
  if (!companyId) return '';
  const parts = companyId.split('_company_');
  return parts.length > 1 ? parts[1] : companyId;
}

/**
 * Fetches every doc in `collectionName` the user can see: their own (by
 * ownerId) plus any doc belonging to a company they've been added to as a
 * collaborator (by companyId — since those docs' ownerId is the ORIGINAL
 * owner, not the collaborator). `collaboratorCompanyDocIds` is the list of
 * `_companyDocId`s from `fetchWorkspaces` where `ownerId !== userId`.
 * Mirrors the owned+collaborator merge pattern already used by fetchWorkspaces.
 */
async function fetchOwnedAndShared(
  collectionName: string,
  userId: string,
  collaboratorCompanyDocIds: string[] = []
): Promise<QueryDocumentSnapshot[]> {
  const ownedQ = query(collection(db, collectionName), where('ownerId', '==', userId));
  const queries = [getDocs(ownedQ)];
  for (const companyDocId of collaboratorCompanyDocIds) {
    queries.push(getDocs(query(collection(db, collectionName), where('companyId', '==', companyDocId))));
  }
  const snaps = await Promise.all(queries);
  const seen = new Set<string>();
  const docs: QueryDocumentSnapshot[] = [];
  for (const snap of snaps) {
    for (const d of snap.docs) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      docs.push(d);
    }
  }
  return docs;
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
      await setDoc(doc(db, 'companies', docId), { ...comp, id: docId, ownerId: userId, collaboratorUIDs: [], createdAt: new Date().toISOString() });
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
      const docCompanyId = `${userId}_company_${prop.companyId}`;
      await setDoc(doc(db, 'properties', docId), { ...prop, id: docId, companyId: docCompanyId, ownerId: userId, createdAt: new Date().toISOString() });
    }

    for (const unit of defaultUnitsSeed) {
      const docId = `${userId}_unit_${unit.id}`;
      const docCompanyId = `${userId}_company_${unit.companyId}`;
      await setDoc(doc(db, 'units', docId), { ...unit, id: docId, companyId: docCompanyId, ownerId: userId, createdAt: new Date().toISOString() });
    }

    for (const loyer of defaultLoyersSeed) {
      const docId = `${userId}_loyer_${loyer.id}`;
      const docCompanyId = `${userId}_company_${loyer.companyId}`;
      await setDoc(doc(db, 'loyers', docId), { ...loyer, id: docId, companyId: docCompanyId, ownerId: userId, createdAt: new Date().toISOString() });
    }
  },

  // ── Workspaces / Companies ─────────────────────────────────────────────────

  async fetchWorkspaces(userId: string): Promise<any[]> {
    try {
      // Companies the user owns, plus companies they've been added to as a
      // collaborator (e.g. a business partner invited into a shared company).
      // Firestore has no OR-across-fields query, so this runs as two queries
      // merged client-side, deduped by doc id (a user can't be both on the
      // same doc, but this guards against it anyway).
      const ownedQ = query(collection(db, 'companies'), where('ownerId', '==', userId));
      const collabQ = query(collection(db, 'companies'), where('collaboratorUIDs', 'array-contains', userId));
      const [ownedSnap, collabSnap] = await Promise.all([getDocs(ownedQ), getDocs(collabQ)]);

      const seen = new Set<string>();
      const results: any[] = [];
      for (const d of [...ownedSnap.docs, ...collabSnap.docs]) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        const data = d.data();
        const idParts = d.id.split('_company_');
        // `_companyDocId` (the raw prefixed Firestore doc id) lets callers
        // identify which accessible companies are shared (ownerId !== userId)
        // so they can fetch that company's records by companyId instead of
        // by ownerId — see `fetchOwnedAndShared` below.
        results.push({ ...data, id: idParts.length > 1 ? idParts[1] : d.id, _companyDocId: d.id });
      }
      return results;
    } catch (e) {
      // Used to fall back to `defaultWorkspaces` — Fabiola's own real company
      // names/NEQ/TPS-TVQ numbers — on ANY error, including the transient
      // "Missing or insufficient permissions" race a brand-new account can
      // hit before its Firestore token fully propagates (see getIdToken(true)
      // above in App.tsx's onAuthStateChanged). That fallback then got
      // auto-saved back to Firestore by the userProfile hydration effect,
      // silently creating a company literally named "Solutions GPA Inc." for
      // real beta testers — found 2026-08-01 testing a real beta signup.
      console.error('fetchWorkspaces failed:', e);
      return [];
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

  // ── Company invites — real partner-sharing flow ─────────────────────────────

  /** Owner invites a partner by email to collaborate on one of their companies. */
  async createCompanyInvite(
    invitedByUid: string,
    invitedByName: string,
    companyDocId: string,
    companyName: string,
    invitedEmail: string
  ): Promise<CompanyInviteDoc> {
    assertCanWrite();
    const normalizedEmail = invitedEmail.trim().toLowerCase();
    const docId = `${companyDocId}_invite_${normalizedEmail}`;
    const data: CompanyInviteDoc = {
      id: docId,
      companyDocId,
      companyName,
      invitedEmail: normalizedEmail,
      invitedByUid,
      invitedByName,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'companyInvites', docId), data);
    return data;
  },

  /** Invites waiting for the currently signed-in user's email — checked once at login. */
  async fetchPendingInvitesForEmail(email: string): Promise<CompanyInviteDoc[]> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const q = query(
        collection(db, 'companyInvites'),
        where('invitedEmail', '==', normalizedEmail),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as CompanyInviteDoc);
    } catch (e) {
      console.error('fetchPendingInvitesForEmail failed:', e);
      return [];
    }
  },

  /**
   * Accepts a pending invite: adds the current user to the company's
   * collaboratorUIDs (allowed by the `isAcceptingOwnInvite` Firestore rule,
   * which checks this exact invite doc is 'pending' before permitting it),
   * then marks the invite 'accepted'.
   */
  async acceptCompanyInvite(userId: string, invite: CompanyInviteDoc): Promise<void> {
    const companyRef = doc(db, 'companies', invite.companyDocId);
    const companySnap = await getDoc(companyRef);
    const existingUIDs: string[] = companySnap.exists() ? (companySnap.data().collaboratorUIDs || []) : [];
    if (!existingUIDs.includes(userId)) {
      await updateDoc(companyRef, { collaboratorUIDs: [...existingUIDs, userId] });
    }
    await updateDoc(doc(db, 'companyInvites', invite.id), { status: 'accepted' });
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
    const docCompanyId = `${userId}_company_${building.companyId}`;
    const data: BuildingLedger = {
      ...building,
      companyId: docCompanyId,
      deductiblePct: 100 - building.occupancyPct,   // enforce invariant
      ownerId: userId,
      createdAt: now,
    };
    await setDoc(doc(db, 'buildings', docId), data);
    return { ...data, companyId: building.companyId };
  },

  /**
   * Fetch all BuildingLedgers for a user.
   */
  async fetchBuildings(userId: string): Promise<BuildingLedger[]> {
    try {
      const q = query(collection(db, 'buildings'), where('ownerId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data() as BuildingLedger;
        return { ...data, companyId: unprefixCompanyId(data.companyId) };
      });
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

  async fetchProperties(userId: string, collaboratorCompanyDocIds: string[] = []): Promise<PropertyDoc[]> {
    try {
      const docs = await fetchOwnedAndShared('properties', userId, collaboratorCompanyDocIds);
      return docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_prop_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id, companyId: unprefixCompanyId(data.companyId) } as PropertyDoc;
      });
    } catch (e) {
      // See fetchWorkspaces above — a hardcoded demo-data fallback on error
      // is not safe for a shared production function; return empty instead.
      console.error('fetchProperties failed:', e);
      return [];
    }
  },

  async saveProperty(userId: string, propertyData: Omit<PropertyDoc, 'ownerId' | 'createdAt'>): Promise<PropertyDoc> {
    assertCanWrite();
    const originalId = propertyData.id || `prop_${Date.now()}`;
    const docId = `${userId}_prop_${originalId}`;
    const docCompanyId = `${userId}_company_${propertyData.companyId}`;
    const data: PropertyDoc = {
      ...propertyData,
      id: docId,
      companyId: docCompanyId,
      ownerId: userId,
      createdAt: new Date().toISOString(),   // service generates timestamp (not in Omit)
    };
    await setDoc(doc(db, 'properties', docId), data);
    return { ...data, id: originalId, companyId: propertyData.companyId };
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
    const docCompanyId = `${userId}_company_${unit.companyId}`;
    const data: UnitDoc = {
      ...unit,
      id: originalId,
      companyId: docCompanyId,
      ownerId: userId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'units', docId), { ...data, id: docId });
    return { ...data, companyId: unit.companyId };
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
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id, companyId: unprefixCompanyId(data.companyId) } as UnitDoc;
      });
    } catch (e) {
      console.error(`fetchUnitsByBuilding(${buildingId}) failed:`, e);
      return [];
    }
  },

  /**
   * Fetch all units for a user across all buildings.
   */
  async fetchAllUnits(userId: string, collaboratorCompanyDocIds: string[] = []): Promise<UnitDoc[]> {
    try {
      const docs = await fetchOwnedAndShared('units', userId, collaboratorCompanyDocIds);
      return docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_unit_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id, companyId: unprefixCompanyId(data.companyId) } as UnitDoc;
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

  async fetchLoyers(userId: string, collaboratorCompanyDocIds: string[] = []): Promise<LoyerDoc[]> {
    try {
      const docs = await fetchOwnedAndShared('loyers', userId, collaboratorCompanyDocIds);
      return docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_loyer_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id, companyId: unprefixCompanyId(data.companyId) } as LoyerDoc;
      });
    } catch (e) {
      // See fetchWorkspaces above — no hardcoded demo-data fallback on error.
      console.error('fetchLoyers failed:', e);
      return [];
    }
  },

  async saveLoyer(userId: string, loyerData: Partial<LoyerDoc> & { id?: string }): Promise<LoyerDoc> {
    assertCanWrite();
    const originalId = loyerData.id || `loyer_${Date.now()}`;
    const docId = `${userId}_loyer_${originalId}`;
    const docCompanyId = loyerData.companyId ? `${userId}_company_${loyerData.companyId}` : undefined;
    const data = { ...loyerData, id: docId, companyId: docCompanyId, ownerId: userId, createdAt: loyerData.createdAt || new Date().toISOString() };
    
    const entryData = {
      id: docId,
      companyId: loyerData.companyId,
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

    return { ...data, id: originalId, companyId: loyerData.companyId } as LoyerDoc;
  },

  async deleteLoyer(loyerId: string): Promise<boolean> {
    const userId = auth.currentUser?.uid;
    const docId = userId ? `${userId}_loyer_${loyerId}` : loyerId;
    await deleteDoc(doc(db, 'loyers', docId));
    return true;
  },

  // ── Condo units & cotisation payments — Síndico "Gestion des Cotisations" ──

  async fetchCondoUnits(userId: string, companyId: string): Promise<CondoUnitDoc[]> {
    try {
      const docCompanyId = `${userId}_company_${companyId}`;
      const q = query(collection(db, 'condoUnits'), where('ownerId', '==', userId), where('companyId', '==', docCompanyId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_condounit_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id, companyId } as CondoUnitDoc;
      });
    } catch (e) {
      console.error('fetchCondoUnits failed:', e);
      return [];
    }
  },

  async saveCondoUnit(userId: string, unitData: Omit<CondoUnitDoc, 'ownerId' | 'createdAt'>): Promise<CondoUnitDoc> {
    assertCanWrite();
    const originalId = unitData.id || `unit_${Date.now()}`;
    const docId = `${userId}_condounit_${originalId}`;
    const docCompanyId = `${userId}_company_${unitData.companyId}`;
    const data: CondoUnitDoc = {
      ...unitData,
      id: docId,
      companyId: docCompanyId,
      ownerId: userId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'condoUnits', docId), data);
    return { ...data, id: originalId, companyId: unitData.companyId };
  },

  async deleteCondoUnit(unitId: string): Promise<boolean> {
    const userId = auth.currentUser?.uid;
    const docId = userId ? `${userId}_condounit_${unitId}` : unitId;
    await deleteDoc(doc(db, 'condoUnits', docId));
    return true;
  },

  async fetchCotisationPayments(userId: string, companyId: string): Promise<CotisationPaymentDoc[]> {
    try {
      const docCompanyId = `${userId}_company_${companyId}`;
      const q = query(collection(db, 'cotisationPayments'), where('ownerId', '==', userId), where('companyId', '==', docCompanyId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_cotisationpay_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id, companyId } as CotisationPaymentDoc;
      });
    } catch (e) {
      console.error('fetchCotisationPayments failed:', e);
      return [];
    }
  },

  async saveCotisationPayment(userId: string, paymentData: Omit<CotisationPaymentDoc, 'ownerId' | 'createdAt'>): Promise<CotisationPaymentDoc> {
    assertCanWrite();
    const originalId = paymentData.id || `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const docId = `${userId}_cotisationpay_${originalId}`;
    const docCompanyId = `${userId}_company_${paymentData.companyId}`;
    const data: CotisationPaymentDoc = {
      ...paymentData,
      id: docId,
      companyId: docCompanyId,
      ownerId: userId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'cotisationPayments', docId), data);
    return { ...data, id: originalId, companyId: paymentData.companyId };
  },

  // ── Community posts — Síndico "Mur de Communication" ────────────────────────

  async fetchCommunityPosts(userId: string, companyId: string): Promise<CommunityPostDoc[]> {
    try {
      const docCompanyId = `${userId}_company_${companyId}`;
      const q = query(collection(db, 'communityPosts'), where('ownerId', '==', userId), where('companyId', '==', docCompanyId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_communitypost_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id, companyId } as CommunityPostDoc;
      });
    } catch (e) {
      console.error('fetchCommunityPosts failed:', e);
      return [];
    }
  },

  async saveCommunityPost(userId: string, postData: Omit<CommunityPostDoc, 'ownerId' | 'createdAt'> & { createdAt?: string }): Promise<CommunityPostDoc> {
    assertCanWrite();
    const originalId = postData.id || `post_${Date.now()}`;
    const docId = `${userId}_communitypost_${originalId}`;
    const docCompanyId = `${userId}_company_${postData.companyId}`;
    const data: CommunityPostDoc = {
      ...postData,
      id: docId,
      companyId: docCompanyId,
      ownerId: userId,
      createdAt: postData.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'communityPosts', docId), data);
    return { ...data, id: originalId, companyId: postData.companyId };
  },

  // ── Legal documents — Síndico "Contrats & Résolutions" (DocuLegal) ──────────

  async fetchLegalDocuments(userId: string, companyId: string): Promise<LegalDocumentDoc[]> {
    try {
      const docCompanyId = `${userId}_company_${companyId}`;
      const q = query(collection(db, 'legalDocuments'), where('ownerId', '==', userId), where('companyId', '==', docCompanyId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_legaldoc_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id, companyId } as LegalDocumentDoc;
      });
    } catch (e) {
      console.error('fetchLegalDocuments failed:', e);
      return [];
    }
  },

  async saveLegalDocument(userId: string, docData: Omit<LegalDocumentDoc, 'ownerId' | 'createdAt'> & { createdAt?: string }): Promise<LegalDocumentDoc> {
    assertCanWrite();
    const originalId = docData.id || `legaldoc_${Date.now()}`;
    const docId = `${userId}_legaldoc_${originalId}`;
    const docCompanyId = `${userId}_company_${docData.companyId}`;
    const data: LegalDocumentDoc = {
      ...docData,
      id: docId,
      companyId: docCompanyId,
      ownerId: userId,
      createdAt: docData.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'legalDocuments', docId), data);
    return { ...data, id: originalId, companyId: docData.companyId };
  },

  async deleteLegalDocument(userId: string, id: string): Promise<void> {
    assertCanWrite();
    await deleteDoc(doc(db, 'legalDocuments', `${userId}_legaldoc_${id}`));
  },

  // ── AI usage events — cost tracking per profile (SuperAdmin "Usage IA") ─────

  /**
   * Fire-and-forget log of one AI call (e.g. a receipt scan). Never throws —
   * a logging failure must not block the feature that triggered it.
   */
  async logAiUsageEvent(userId: string, data: { profile: string; feature: string; userEmail?: string }): Promise<void> {
    try {
      await addDoc(collection(db, 'aiUsageEvents'), {
        ownerId: userId,
        userEmail: data.userEmail || '',
        profile: data.profile,
        feature: data.feature,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('logAiUsageEvent failed (non-blocking):', e);
    }
  },

  // ── Platform invoices — sequential numbering (SuperAdmin "Facturation") ────

  /**
   * Atomically claims the next sequential invoice number (AC-00001, AC-00002, …)
   * and persists a permanent record of the invoice. Uses a Firestore
   * transaction on `counters/platformInvoiceNumber` so two admins clicking
   * "Générer facture" at the same instant never get the same number.
   */
  async issuePlatformInvoice(data: Omit<PlatformInvoiceDoc, 'id' | 'invoiceNumber' | 'invoiceSeq' | 'issuedAt'>): Promise<PlatformInvoiceDoc> {
    const counterRef = doc(db, 'counters', 'platformInvoiceNumber');
    const seq = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      const current = snap.exists() ? (snap.data().value || 0) : 0;
      const next = current + 1;
      tx.set(counterRef, { value: next }, { merge: true });
      return next;
    });
    const invoiceNumber = `AC-${String(seq).padStart(5, '0')}`;
    const docId = `platforminvoice_${seq}`;
    const record: PlatformInvoiceDoc = {
      ...data,
      id: docId,
      invoiceNumber,
      invoiceSeq: seq,
      issuedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'platformInvoices', docId), record);
    return record;
  },

  /** Full invoice history, newest first — for the SuperAdmin registry/audit trail. */
  async fetchPlatformInvoices(): Promise<PlatformInvoiceDoc[]> {
    try {
      const q = query(collection(db, 'platformInvoices'), orderBy('invoiceSeq', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as PlatformInvoiceDoc);
    } catch (e) {
      console.error('fetchPlatformInvoices failed:', e);
      return [];
    }
  },

  // ── Syndic settings — one config doc per company (Paramètres Syndicat) ──────

  async fetchSyndicSettings(userId: string, companyId: string): Promise<SyndicSettingsDoc | null> {
    try {
      const docId = `${userId}_company_${companyId}`;
      const snap = await getDoc(doc(db, 'syndicSettings', docId));
      if (!snap.exists()) return null;
      return { ...snap.data(), companyId } as SyndicSettingsDoc;
    } catch (e) {
      console.error('fetchSyndicSettings failed:', e);
      return null;
    }
  },

  async saveSyndicSettings(userId: string, settings: Omit<SyndicSettingsDoc, 'ownerId' | 'updatedAt'>): Promise<SyndicSettingsDoc> {
    assertCanWrite();
    const docId = `${userId}_company_${settings.companyId}`;
    const docCompanyId = `${userId}_company_${settings.companyId}`;
    const data: SyndicSettingsDoc = {
      ...settings,
      companyId: docCompanyId,
      ownerId: userId,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'syndicSettings', docId), data);
    return { ...data, companyId: settings.companyId };
  },

  // ── Expenses — Firestore `expenses` collection ─────────────────────────────

  async fetchExpenses(userId: string, collaboratorCompanyDocIds: string[] = []): Promise<ExpenseDoc[]> {
    try {
      const docs = await fetchOwnedAndShared('expenses', userId, collaboratorCompanyDocIds);
      return docs.map((d) => {
        const data = d.data();
        const idParts = data.companyId?.split('_company_');
        const originalCompanyId = idParts && idParts.length > 1 ? idParts[1] : data.companyId;
        return { ...data, id: d.id, companyId: originalCompanyId } as ExpenseDoc;
      });
    } catch (e) {
      // See fetchWorkspaces above — no hardcoded demo-data fallback on error.
      console.error('fetchExpenses failed:', e);
      return [];
    }
  },

  async saveExpense(userId: string, expenseData: Partial<ExpenseDoc> & { companyId: string }): Promise<ExpenseDoc> {
    assertCanWrite();
    const originalCompanyId = expenseData.companyId;
    const docCompanyId = `${userId}_company_${originalCompanyId}`;
    const data: any = {
      ...expenseData,
      companyId: docCompanyId,
      ownerId: userId,
      createdAt: expenseData.createdAt || new Date().toISOString(),
    };
    // Optional fields (buildingId, unitId, etc.) are sometimes passed as explicit
    // `undefined` by callers when a selection is cleared. Firestore's setDoc
    // rejects any field with an undefined value — strip them here so the write
    // never fails silently (see saveMeubleReservation for the same fix).
    Object.keys(data).forEach((k) => {
      if (data[k] === undefined) delete data[k];
    });

    // Derive a STABLE, per-user document id from whatever id the caller passed in
    // (a raw numeric client-side timestamp on first save, or this same prefixed id
    // on every later save as the OCR pipeline fills in more data). Reusing the same
    // id across a scan's create → Drive-upload → OCR-finalize stages means every
    // stage's setDoc lands on the SAME Firestore document instead of minting a new
    // one each time — previously `isNaN(Number(...))` rejected numeric ids outright,
    // so every stage of every scan created its own orphaned duplicate document.
    const rawId = expenseData.id != null && String(expenseData.id).trim() !== ''
      ? String(expenseData.id)
      : `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const id = rawId.startsWith(`${userId}_expense_`) ? rawId : `${userId}_expense_${rawId}`;

    const entryData = {
      id: id,
      companyId: originalCompanyId,
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

  async fetchInvoices(userId: string, collaboratorCompanyDocIds: string[] = []): Promise<InvoiceDoc[]> {
    try {
      const docs = await fetchOwnedAndShared('invoices', userId, collaboratorCompanyDocIds);
      return docs.map((d) => {
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
      companyId: originalCompanyId,
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

  // ── Document templates — Firestore `docTemplates` + Storage (DocuLegal) ────

  async fetchDocTemplates(userId: string, collaboratorCompanyDocIds: string[] = []): Promise<DocTemplateDoc[]> {
    try {
      const docs = await fetchOwnedAndShared('docTemplates', userId, collaboratorCompanyDocIds);
      return docs.map((d) => ({ ...(d.data() as DocTemplateDoc), id: d.id }));
    } catch (e) {
      console.error('fetchDocTemplates failed:', e);
      return [];
    }
  },

  /** Uploads the raw .docx to Storage and saves its metadata (name + detected fields/conditions) to Firestore. */
  async saveDocTemplate(
    userId: string,
    companyId: string,
    nombre: string,
    campos: string[],
    docxFile: File | Blob,
    condiciones: string[] = []
  ): Promise<DocTemplateDoc> {
    assertCanWrite();
    const templateId = `tpl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const storagePath = `templates/${userId}/${templateId}.docx`;
    await uploadBytes(ref(storage, storagePath), docxFile);

    const data: DocTemplateDoc = {
      id: templateId,
      companyId,
      nombre,
      storagePath,
      campos,
      condiciones,
      ownerId: userId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'docTemplates', templateId), data);
    return data;
  },

  /** Downloads a saved template's raw .docx bytes from Storage, for filling client-side. */
  async fetchTemplateFile(storagePath: string): Promise<ArrayBuffer> {
    return getBytes(ref(storage, storagePath));
  },

  // ── DocuLegal entries — Prospecteur/Investisseur/Flippeur/Gestionnaire ──────
  // Firestore doc id is `{userId}_doculegal_{entry.id}` — the client-generated
  // entry.id (e.g. "DOC-12345") alone isn't unique enough across accounts to
  // trust as a shared collection's primary key, so it's prefixed on write and
  // stripped back off on read, same convention as `legalDocuments`.

  async fetchDocuLegalDocs(userId: string, collaboratorCompanyDocIds: string[] = []): Promise<DocuLegalEntryDoc[]> {
    try {
      const docs = await fetchOwnedAndShared('docuLegalDocs', userId, collaboratorCompanyDocIds);
      return docs.map((d) => {
        const data = d.data() as DocuLegalEntryDoc;
        const idParts = d.id.split('_doculegal_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id };
      });
    } catch (e) {
      console.error('fetchDocuLegalDocs failed:', e);
      return [];
    }
  },

  /** Upsert — same entry.id is reused for drafts, pending, and signed states as the entry progresses. */
  async saveDocuLegalDoc(userId: string, entry: Omit<DocuLegalEntryDoc, 'ownerId' | 'createdAt'> & { createdAt?: string }): Promise<DocuLegalEntryDoc> {
    assertCanWrite();
    const docId = `${userId}_doculegal_${entry.id}`;
    const data: DocuLegalEntryDoc = {
      ...entry,
      ownerId: userId,
      createdAt: entry.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'docuLegalDocs', docId), data);
    return data;
  },

  async deleteDocTemplate(templateId: string, storagePath: string): Promise<boolean> {
    await deleteDoc(doc(db, 'docTemplates', templateId));
    try {
      await deleteObject(ref(storage, storagePath));
    } catch (e) {
      console.error('deleteDocTemplate: Storage file deletion failed (Firestore doc already removed):', e);
    }
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

  // ── Heures & Paie (Payroll) ────────────────────────────────────────────────

  async fetchPaieRecords(userId: string, companyId: string): Promise<PaieRecordDoc[]> {
    try {
      const docCompanyId = `${userId}_company_${companyId}`;
      const q = query(
        collection(db, 'paieRecords'),
        where('ownerId', '==', userId),
        where('companyId', '==', docCompanyId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_paie_');
        return {
          ...data,
          id: idParts.length > 1 ? idParts[1] : d.id,
          companyId,
        } as PaieRecordDoc;
      });
    } catch (e) {
      console.error('fetchPaieRecords failed:', e);
      return [];
    }
  },

  async savePaieRecord(
    userId: string,
    recordData: Omit<PaieRecordDoc, 'ownerId' | 'createdAt'>
  ): Promise<PaieRecordDoc> {
    assertCanWrite();
    const originalId = recordData.id || `paie_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const docId = `${userId}_paie_${originalId}`;
    const docCompanyId = `${userId}_company_${recordData.companyId}`;
    const data: PaieRecordDoc = {
      ...recordData,
      id: docId,
      companyId: docCompanyId,
      ownerId: userId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'paieRecords', docId), data);
    return { ...data, id: originalId, companyId: recordData.companyId };
  },

  async deletePaieRecord(recordId: string): Promise<boolean> {
    const userId = auth.currentUser?.uid;
    const docId = userId ? `${userId}_paie_${recordId}` : recordId;
    await deleteDoc(doc(db, 'paieRecords', docId));
    return true;
  },

  // ── Taxes & Assurances Documents ───────────────────────────────────────────

  async fetchPropertyDocuments(userId: string, propertyId: string): Promise<PropertyDocumentDoc[]> {
    try {
      const q = query(
        collection(db, 'propertyDocuments'),
        where('ownerId', '==', userId),
        where('propertyId', '==', propertyId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_propdoc_');
        return {
          ...data,
          id: idParts.length > 1 ? idParts[1] : d.id,
        } as PropertyDocumentDoc;
      });
    } catch (e) {
      console.error('fetchPropertyDocuments failed:', e);
      return [];
    }
  },

  async savePropertyDocument(
    userId: string,
    docData: Omit<PropertyDocumentDoc, 'ownerId' | 'uploadedAt'>
  ): Promise<PropertyDocumentDoc> {
    assertCanWrite();
    const originalId = docData.id || `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const docId = `${userId}_propdoc_${originalId}`;
    const data: PropertyDocumentDoc = {
      ...docData,
      id: docId,
      ownerId: userId,
      uploadedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'propertyDocuments', docId), data);
    return { ...data, id: originalId };
  },

  async deletePropertyDocument(docId: string, storagePath?: string): Promise<boolean> {
    const userId = auth.currentUser?.uid;
    const dbId = userId ? `${userId}_propdoc_${docId}` : docId;
    await deleteDoc(doc(db, 'propertyDocuments', dbId));
    if (storagePath) {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch (e) {
        console.error('deletePropertyDocument: Storage file deletion failed:', e);
      }
    }
    return true;
  },

  // ── AI Reports (SyndicAI) ──────────────────────────────────────────────────

  async fetchAiReports(userId: string, companyId: string): Promise<AiReportDoc[]> {
    try {
      const docCompanyId = `${userId}_company_${companyId}`;
      const q = query(
        collection(db, 'aiReports'),
        where('ownerId', '==', userId),
        where('companyId', '==', docCompanyId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_aireport_');
        return {
          ...data,
          id: idParts.length > 1 ? idParts[1] : d.id,
          companyId,
        } as AiReportDoc;
      });
    } catch (e) {
      console.error('fetchAiReports failed:', e);
      return [];
    }
  },

  async saveAiReport(
    userId: string,
    reportData: Omit<AiReportDoc, 'ownerId' | 'generatedAt'>
  ): Promise<AiReportDoc> {
    assertCanWrite();
    const originalId = reportData.id || `rep_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const docId = `${userId}_aireport_${originalId}`;
    const docCompanyId = `${userId}_company_${reportData.companyId}`;
    const data: AiReportDoc = {
      ...reportData,
      id: docId,
      companyId: docCompanyId,
      ownerId: userId,
      generatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'aiReports', docId), data);
    return { ...data, id: originalId, companyId: reportData.companyId };
  },

  async deleteAiReport(reportId: string): Promise<boolean> {
    const userId = auth.currentUser?.uid;
    const docId = userId ? `${userId}_aireport_${reportId}` : reportId;
    await deleteDoc(doc(db, 'aiReports', docId));
    return true;
  },

  // ── Location Meublée / Airbnb ──────────────────────────────────────────────

  /**
   * Persist a short-term rental reservation and post the correct
   * double-entry journal based on modeGestion.
   *
   * Tax model: `gross` (nights × nightlyRate) is always the pure rental price.
   * The taxe de séjour is an amount charged ON TOP of the rental price.
   * - If a platform (Airbnb/VRBO/Booking) collects & remits it, that money
   *   never touches the host's bank or books at all — it is not computed here.
   * - If the host must self-remit (direct bookings), the host collects
   *   gross + taxeSejourAmount from the guest, and owes taxeSejourAmount to
   *   Revenu Québec — recorded as a liability (acc-taxe-sejour-payable), never
   *   silently netted out of the deposit.
   *
   * Mode 'proprietaire': posts to the company's own grand livre —
   *   Debit Banque (+ Frais plateforme) / Credit Revenu-Location
   *   (+ TPS/TVQ payables si inscrit, + Taxe de séjour payable si auto-remise)
   * Mode 'gestionnaire': does NOT use generic journal accounts (there is no
   *   "acc-fideicommis-*" ledger read anywhere in the app). Instead it writes
   *   directly to the same `fideicommisDepots` collection the Compte en
   *   Fidéicommis screen (CompteFideicommis.tsx) reads, so the reservation
   *   actually shows up in that OACIQ trust registry. TPS/TVQ and honoraires
   *   du gestionnaire are NOT calculated here — the registration numbers and
   *   commission rate belong to the client-owner, not to this reservation, and
   *   should be entered manually via the Fidéicommis "Retraits" tab until a
   *   client-selection UI exists for meublé units.
   */
  async saveMeubleReservation(
    userId: string,
    res: Omit<MeubleReservationDoc, 'ownerId' | 'createdAt'>
  ): Promise<MeubleReservationDoc> {
    assertCanWrite();
    const originalId = res.id || `meubleres_${Date.now()}`;
    const docId = `${userId}_meubleres_${originalId}`;
    const docCompanyId = `${userId}_company_${res.companyId}`;
    const now = new Date().toISOString();

    const gross = res.nights * res.nightlyRate;
    const platformFee = gross * (res.platformFeePercent / 100);
    const taxeSejourAmount = gross * (res.taxeSejour / 100);
    // Only a liability on the host's own books if the host — not the platform — must remit it
    const taxeSejourLiability = res.taxeSejourRemisePlateforme ? 0 : taxeSejourAmount;

    const tpsAmt = res.tpsCollected ?? 0;
    const tvqAmt = res.tvqCollected ?? 0;

    const data: MeubleReservationDoc = {
      ...res,
      id: docId,
      companyId: docCompanyId,
      platformFeeDeduit: platformFee,
      journalPosted: false,
      ownerId: userId,
      createdAt: now,
    };
    // Optional fields (buildingId, unitId, fideicommisClientId, notes, etc.) are
    // frequently passed as explicit `undefined` by callers when nothing was
    // selected. Firestore's setDoc rejects any field with an undefined value —
    // strip them here so the write never fails silently for the common case.
    Object.keys(data).forEach((k) => {
      if ((data as any)[k] === undefined) delete (data as any)[k];
    });

    // Persist the reservation document first
    await setDoc(doc(db, 'meubleReservations', docId), data);

    if (auth.currentUser) {
      try {
        if (res.modeGestion === 'gestionnaire') {
          // === GESTIONNAIRE MODE: real OACIQ trust-account integration ===
          // IMPORTANT: fideicommisDepots/fideicommisRetraits use the RAW companyId
          // (activeCompanyId), NOT the `${userId}_company_${id}` prefix used by
          // meubleReservations — CompteFideicommis.tsx queries on the raw value.
          const depotId = `${userId}_fiddepot_${docId}`;
          const depotDoc = {
            id: depotId,
            companyId: res.companyId,
            numeroRecu: `MEU-${Date.now().toString().slice(-8)}`,
            date: now.slice(0, 10),
            locataireName: res.guestName,
            propertyAddress: 'Location meublée courte durée',
            periodeDebut: res.checkIn,
            periodeFin: res.checkOut,
            montant: gross,
            modePaiement: 'virement' as const,
            clientId: res.fideicommisClientId || '',
            clientName: res.fideicommisClientName || 'Client non spécifié',
            notes: `Réservation ${res.platform} — ${res.nights} nuit(s) à ${res.nightlyRate}$/nuit. Frais plateforme: ${platformFee.toFixed(2)}$.`,
            ownerId: userId,
            createdAt: now,
          };
          await setDoc(doc(db, 'fideicommisDepots', depotId), depotDoc);

          // Honoraires de gestion (commission) — only if a rate was supplied
          // (looked up from the selected FideicommisClientDoc.tauxHonoraires).
          if (res.commissionRatePercent && res.commissionRatePercent > 0) {
            const honorairesAmount = gross * (res.commissionRatePercent / 100);
            const retraitId = `${userId}_fidretrait_${docId}`;
            const retraitDoc = {
              id: retraitId,
              companyId: res.companyId,
              date: now.slice(0, 10),
              beneficiaire: 'Honoraires de gestion',
              propertyAddress: 'Location meublée courte durée',
              montant: honorairesAmount,
              type: 'honoraires' as const,
              description: `Honoraires (${res.commissionRatePercent}%) — Réservation ${res.platform}, ${res.guestName} (${res.checkIn} → ${res.checkOut})`,
              clientId: res.fideicommisClientId || '',
              clientName: res.fideicommisClientName || 'Client non spécifié',
              notes: '',
              ownerId: userId,
              createdAt: now,
            };
            await setDoc(doc(db, 'fideicommisRetraits', retraitId), retraitDoc);
          }
        } else {
          // === PROPRIÉTAIRE MODE: post to the company's own grand livre ===
          const entryId = `${docId}-journal`;
          const entryData = {
            id: entryId,
            companyId: res.companyId,
            date: now,
            description: `Location meublée — ${res.guestName} (${res.platform}) · ${res.checkIn} → ${res.checkOut}`,
            documentReference: docId,
            createdAt: now,
            ownerId: userId,
          };

          const revenueNet = gross - tpsAmt - tvqAmt;
          // Cash landed in the bank: gross rent + tax collected for remittance, minus the platform's cut.
          // Algebraically equals revenueNet + tpsAmt + tvqAmt + taxeSejourLiability, so debits == credits below.
          const cashIn = gross + taxeSejourLiability - platformFee;

          const linesData: any[] = [
            { id: `${entryId}-d1`, journalEntryId: entryId, accountId: 'acc-bank', type: 'Debit', amount: cashIn, ownerId: userId },
          ];
          if (platformFee > 0) {
            linesData.push({ id: `${entryId}-d2`, journalEntryId: entryId, accountId: 'acc-frais-plateforme', type: 'Debit', amount: platformFee, ownerId: userId });
          }
          linesData.push({ id: `${entryId}-c1`, journalEntryId: entryId, accountId: 'acc-revenue-meuble', type: 'Credit', amount: revenueNet, ownerId: userId });
          if (tpsAmt > 0) {
            linesData.push({ id: `${entryId}-c2`, journalEntryId: entryId, accountId: 'acc-tps-payable', type: 'Credit', amount: tpsAmt, ownerId: userId });
          }
          if (tvqAmt > 0) {
            linesData.push({ id: `${entryId}-c3`, journalEntryId: entryId, accountId: 'acc-tvq-payable', type: 'Credit', amount: tvqAmt, ownerId: userId });
          }
          if (taxeSejourLiability > 0) {
            linesData.push({ id: `${entryId}-c4`, journalEntryId: entryId, accountId: 'acc-taxe-sejour-payable', type: 'Credit', amount: taxeSejourLiability, ownerId: userId });
          }

          await postJournalEntry(entryData, linesData);
        }

        // Mark as posted
        await setDoc(doc(db, 'meubleReservations', docId), { journalPosted: true }, { merge: true });
        data.journalPosted = true;
      } catch (err: any) {
        console.warn('[MeubleReservation] Journal/dépôt posting failed (reservation still saved):', err.message);
      }
    }

    return { ...data, id: originalId, companyId: res.companyId };
  },

  async fetchMeubleReservations(
    userId: string,
    companyId: string
  ): Promise<MeubleReservationDoc[]> {
    try {
      const docCompanyId = `${userId}_company_${companyId}`;
      const q = query(
        collection(db, 'meubleReservations'),
        where('ownerId', '==', userId),
        where('companyId', '==', docCompanyId),
        orderBy('checkIn', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data() as MeubleReservationDoc;
        const idParts = d.id.split('_meubleres_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id, companyId };
      });
    } catch (e) {
      console.error('fetchMeubleReservations failed:', e);
      return [];
    }
  },

  async deleteMeubleReservation(userId: string, resId: string): Promise<void> {
    const docId = `${userId}_meubleres_${resId}`;
    await deleteDoc(doc(db, 'meubleReservations', docId));
  },

  async saveMeubleExpense(
    userId: string,
    expense: Omit<MeubleExpenseDoc, 'ownerId' | 'createdAt'>
  ): Promise<MeubleExpenseDoc> {
    assertCanWrite();
    const originalId = expense.id || `meubleexp_${Date.now()}`;
    const docId = `${userId}_meubleexp_${originalId}`;
    const docCompanyId = `${userId}_company_${expense.companyId}`;
    const data: any = {
      ...expense,
      id: docId,
      companyId: docCompanyId,
      ownerId: userId,
      createdAt: new Date().toISOString(),
    };
    // Optional fields (lien, buildingId, unitId) come through as explicit
    // `undefined` whenever nothing was selected — Firestore rejects those.
    Object.keys(data).forEach((k) => {
      if (data[k] === undefined) delete data[k];
    });
    await setDoc(doc(db, 'meubleExpenses', docId), data);
    return { ...data, id: originalId, companyId: expense.companyId };
  },

  async fetchMeubleExpenses(
    userId: string,
    companyId: string
  ): Promise<MeubleExpenseDoc[]> {
    try {
      const docCompanyId = `${userId}_company_${companyId}`;
      const q = query(
        collection(db, 'meubleExpenses'),
        where('ownerId', '==', userId),
        where('companyId', '==', docCompanyId),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        const idParts = d.id.split('_meubleexp_');
        return { ...data, id: idParts.length > 1 ? idParts[1] : d.id, companyId } as MeubleExpenseDoc;
      });
    } catch (e) {
      console.error('fetchMeubleExpenses failed:', e);
      return [];
    }
  },

  async deleteMeubleExpense(userId: string, expId: string): Promise<void> {
    const docId = `${userId}_meubleexp_${expId}`;
    await deleteDoc(doc(db, 'meubleExpenses', docId));
  },

  /**
   * Fetch the property-owner clients (fideicommisClients) available for the
   * gestionnaire to select as "propriétaire de ce logement" when booking a
   * meublé reservation. Same collection/query shape as CompteFideicommis.tsx —
   * NOTE: uses the RAW companyId (activeCompanyId), not the meublé-prefixed one.
   */
  async fetchFideicommisClients(
    userId: string,
    companyId: string
  ): Promise<FideicommisClientDoc[]> {
    try {
      const q = query(
        collection(db, 'fideicommisClients'),
        where('companyId', '==', companyId),
        where('ownerId', '==', userId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as FideicommisClientDoc);
    } catch (e) {
      console.error('fetchFideicommisClients failed:', e);
      return [];
    }
  },

  // ── Relevé de Gestion — narrow statement channel between a gestionnaire
  //    and a delegated-management owner's OWN account (potentially a
  //    different Firebase user entirely). See StatementLinkDoc/
  //    SealedStatementDoc above and firestore.rules for the access model. ──

  /** Deterministic id lookup — no query needed to check if a client is already linked. */
  async fetchStatementLinkForClient(gestionnaireCompanyId: string, fideicommisClientId: string): Promise<StatementLinkDoc | null> {
    try {
      const docId = `${gestionnaireCompanyId}_link_${fideicommisClientId}`;
      const snap = await getDoc(doc(db, 'statementLinks', docId));
      return snap.exists() ? (snap.data() as StatementLinkDoc) : null;
    } catch (e) {
      console.error('fetchStatementLinkForClient failed:', e);
      return null;
    }
  },

  async createStatementLink(
    gestionnaireOwnerId: string,
    gestionnaireCompanyId: string,
    fideicommisClient: FideicommisClientDoc
  ): Promise<StatementLinkDoc> {
    assertCanWrite();
    const docId = `${gestionnaireCompanyId}_link_${fideicommisClient.id}`;
    const data: StatementLinkDoc = {
      id: docId,
      gestionnaireCompanyId,
      gestionnaireOwnerId,
      fideicommisClientId: fideicommisClient.id,
      invitedEmail: fideicommisClient.email.trim().toLowerCase(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'statementLinks', docId), data);
    return data;
  },

  /** Invitations waiting for the currently signed-in user's email — checked once at login, same pattern as fetchPendingInvitesForEmail. */
  async fetchPendingStatementLinksForEmail(email: string): Promise<StatementLinkDoc[]> {
    try {
      const q = query(
        collection(db, 'statementLinks'),
        where('invitedEmail', '==', email.trim().toLowerCase()),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as StatementLinkDoc);
    } catch (e) {
      console.error('fetchPendingStatementLinksForEmail failed:', e);
      return [];
    }
  },

  /** Owner accepts: picks which of THEIR OWN companies this channel is for. */
  async acceptStatementLink(uid: string, link: StatementLinkDoc, ownerCompanyId: string): Promise<void> {
    await updateDoc(doc(db, 'statementLinks', link.id), {
      status: 'accepted',
      linkedOwnerUid: uid,
      linkedOwnerCompanyId: ownerCompanyId,
    });
  },

  async fetchAcceptedStatementLinks(uid: string): Promise<StatementLinkDoc[]> {
    try {
      const q = query(
        collection(db, 'statementLinks'),
        where('linkedOwnerUid', '==', uid),
        where('status', '==', 'accepted')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as StatementLinkDoc);
    } catch (e) {
      console.error('fetchAcceptedStatementLinks failed:', e);
      return [];
    }
  },

  /** Seals a period's already-computed totals — immutable once written (enforced in firestore.rules). */
  async sealStatement(
    sealedByUid: string,
    data: Omit<SealedStatementDoc, 'id' | 'sealedAt' | 'sealedByUid'>
  ): Promise<SealedStatementDoc> {
    assertCanWrite();
    const docId = `${data.gestionnaireCompanyId}_stmt_${data.fideicommisClientId}_${data.period}`;
    const full: SealedStatementDoc = {
      ...data,
      id: docId,
      sealedAt: new Date().toISOString(),
      sealedByUid,
    };
    await setDoc(doc(db, 'sealedStatements', docId), full);
    return full;
  },

  /** Deterministic id lookup — lets the gestionnaire's UI know a period is already sealed (and thus immutable) before attempting to re-seal it. */
  async fetchSealedStatementForPeriod(gestionnaireCompanyId: string, fideicommisClientId: string, period: string): Promise<SealedStatementDoc | null> {
    try {
      const docId = `${gestionnaireCompanyId}_stmt_${fideicommisClientId}_${period}`;
      const snap = await getDoc(doc(db, 'sealedStatements', docId));
      return snap.exists() ? (snap.data() as SealedStatementDoc) : null;
    } catch (e) {
      console.error('fetchSealedStatementForPeriod failed:', e);
      return null;
    }
  },

  /** All statements sealed for this owner, across every linked gestionnaire — newest period first. */
  async fetchSealedStatements(uid: string): Promise<SealedStatementDoc[]> {
    try {
      const q = query(collection(db, 'sealedStatements'), where('linkedOwnerUid', '==', uid));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as SealedStatementDoc).sort((a, b) => b.period.localeCompare(a.period));
    } catch (e) {
      console.error('fetchSealedStatements failed:', e);
      return [];
    }
  },

  // ── Generic multi-client bookkeeping (comptable, and any profile with
  //    non-real-estate clients) — `bookkeepingClients` collection. Kept
  //    entirely separate from fideicommisClients above (real-estate/trust-
  //    account specific). Same RAW-companyId convention as fideicommisClients. ──

  async fetchClients(userId: string, companyId: string): Promise<BookkeepingClientDoc[]> {
    try {
      const q = query(
        collection(db, 'bookkeepingClients'),
        where('companyId', '==', companyId),
        where('ownerId', '==', userId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as BookkeepingClientDoc);
    } catch (e) {
      console.error('fetchClients failed:', e);
      return [];
    }
  },

  async saveClient(
    userId: string,
    clientData: Partial<BookkeepingClientDoc> & { companyId: string; nom: string }
  ): Promise<BookkeepingClientDoc> {
    assertCanWrite();
    const id = clientData.id || `${userId}_bkclient_${Date.now()}`;
    const data: any = {
      ...clientData,
      id,
      ownerId: userId,
      createdAt: clientData.createdAt || new Date().toISOString(),
    };
    // Firestore's setDoc rejects any field with an explicit undefined value
    // (e.g. an empty optional form field) — strip them before writing, same
    // fix already applied to saveExpense/saveMeubleReservation.
    Object.keys(data).forEach((k) => {
      if (data[k] === undefined) delete data[k];
    });
    await setDoc(doc(db, 'bookkeepingClients', id), data, { merge: true });
    return data as BookkeepingClientDoc;
  },

  async deleteClient(clientId: string): Promise<boolean> {
    await deleteDoc(doc(db, 'bookkeepingClients', String(clientId)));
    return true;
  },

  /**
   * Thin client-side filters over the already-fetched expense/invoice lists
   * (fetchExpenses/fetchInvoices already return unprefixed companyId) — this
   * mirrors the exact filter pattern PortefeuilleClientView already uses for
   * fideicommisClientId, so no new Firestore query or composite index is
   * introduced. Intended for a single client's drill-down view; a portfolio
   * screen showing ALL clients at once should call fetchExpenses/fetchInvoices
   * once and reduce in memory instead of calling these in a loop.
   */
  async fetchExpensesForClient(userId: string, companyId: string, clientId: string): Promise<ExpenseDoc[]> {
    const all = await this.fetchExpenses(userId);
    return all.filter((e) => e.companyId === companyId && e.clientId === clientId);
  },

  async fetchInvoicesForClient(userId: string, companyId: string, clientId: string): Promise<InvoiceDoc[]> {
    const all = await this.fetchInvoices(userId);
    return all.filter((inv) => inv.companyId === companyId && inv.clientId === clientId);
  },

  /**
   * Upsert the meublé unit configuration for a workspace.
   * Called when the user updates CITQ, commission rate, or modeGestion.
   */
  async saveMeubleUnitConfig(
    userId: string,
    config: Omit<MeubleUnitConfigDoc, 'ownerId' | 'createdAt'>
  ): Promise<MeubleUnitConfigDoc> {
    assertCanWrite();
    const docId = `${userId}_meubleconfig_${config.companyId}`;
    const docCompanyId = `${userId}_company_${config.companyId}`;
    const data: MeubleUnitConfigDoc = {
      ...config,
      id: docId,
      companyId: docCompanyId,
      ownerId: userId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'meubleUnitConfigs', docId), data, { merge: true });
    return { ...data, companyId: config.companyId };
  },

  async fetchMeubleUnitConfig(
    userId: string,
    companyId: string
  ): Promise<MeubleUnitConfigDoc | null> {
    try {
      const docId = `${userId}_meubleconfig_${companyId}`;
      const snap = await getDoc(doc(db, 'meubleUnitConfigs', docId));
      if (!snap.exists()) return null;
      const data = snap.data() as MeubleUnitConfigDoc;
      return { ...data, companyId };
    } catch (e) {
      console.error('fetchMeubleUnitConfig failed:', e);
      return null;
    }
  },
};
