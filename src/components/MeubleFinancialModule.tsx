/**
 * MeubleFinancialModule.tsx
 * Complete financial module for short-term rentals (Airbnb / Direct bookings).
 * 4 tabs: Calendrier, Revenus Plateformes, Dépenses, Rapport Fiscal
 *
 * Architecture: Lecture du profil fiscal depuis userProfile (Paramètres).
 * Aucune saisie redondante. Tenue de livres adaptée selon modeGestion:
 *   'proprietaire' → revenu direct dans le grand livre de la compagnie
 *   'gestionnaire'  → fidéicommis + honoraires de gestion
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, DollarSign, Receipt, BarChart2, Plus, Trash2,
  Download, Home, Wifi, Zap, Sparkles, Settings, ChevronLeft,
  ChevronRight, X, TrendingUp, TrendingDown, Info,
  Percent, Star, Check, AlertCircle, ShieldCheck, Building2, Loader2,
  Upload, FileSpreadsheet,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { dataService, type FideicommisClientDoc, type PropertyDoc, type UnitDoc } from '../lib/dataService';
import { auth } from '../lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'airbnb' | 'direct' | 'vrbo' | 'booking';
type ExpenseCategory =
  | 'menage' | 'hydro' | 'internet' | 'fournitures' | 'assurance'
  | 'taxe_sejour' | 'entretien' | 'frais_plateforme' | 'autre';

interface Reservation {
  id: string;
  guestName: string;
  checkIn: string;  // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  nightlyRate: number;
  platform: Platform;
  platformFeePercent: number;
  taxeSejour: number;   // %
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
  /** Si présent: réservation gérée en fidéicommis pour ce client-propriétaire */
  fideicommisClientId?: string;
  fideicommisClientName?: string;
  /** FK → PropertyDoc.id (Gestion Immobilière) — l'immeuble auquel appartient cette réservation */
  buildingId?: string;
  /** FK → UnitDoc.id — l'unité spécifique (porte) */
  unitId?: string;
  /** Étiquette d'affichage de l'unité (dénormalisé pour rendu rapide) */
  unitName?: string;
}

interface MeubleExpense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  reservationId?: string; // linked to specific reservation
}

interface UnitConfig {
  name: string;
  address: string;
  taxeSejourDefault: number; // %
  platformFeeDefault: Record<Platform, number>;
}

interface MeubleFinancialModuleProps {
  darkMode: boolean;
  companyId: string;
  companyName?: string;
  unitName?: string;
  /** Profil fiscal lu depuis Paramètres — pas saisi à nouveau ici */
  userProfile?: {
    tps?: string;
    tvq?: string;
    tpsRate?: number;
    tvqRate?: number;
    taxeSejourRegion?: number;
    numeroCITQ?: string;
  };
  /** true si le compte actif a le profil Gestionnaire Immobilier (RBAC "fideicommis") —
   *  affiche le sélecteur de client permettant de mettre une réservation en fidéicommis. */
  isGestionnaire?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS: Record<Platform, { label: string; color: string; bg: string; feePercent: number; logo: string }> = {
  airbnb:  { label: 'Airbnb',          color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200',    feePercent: 3,   logo: '🏡' },
  direct:  { label: 'Direct',          color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200', feePercent: 0, logo: '🤝' },
  vrbo:    { label: 'VRBO',            color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',    feePercent: 5,   logo: '🏠' },
  booking: { label: 'Booking.com',     color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200',feePercent: 15,  logo: '📱' },
};

const EXPENSE_CATS: Record<ExpenseCategory, { label: string; icon: React.ReactNode; color: string }> = {
  menage:           { label: 'Ménage / Nettoyage',         icon: <Sparkles size={13} />,   color: 'text-violet-600' },
  hydro:            { label: 'Hydro-Québec',               icon: <Zap size={13} />,         color: 'text-yellow-600' },
  internet:         { label: 'Internet / WiFi',            icon: <Wifi size={13} />,         color: 'text-blue-600' },
  fournitures:      { label: 'Fournitures & Linge',        icon: <Home size={13} />,         color: 'text-amber-600' },
  assurance:        { label: 'Assurance court terme',      icon: <Check size={13} />,        color: 'text-emerald-600' },
  taxe_sejour:      { label: 'Taxe de séjour',             icon: <Percent size={13} />,      color: 'text-slate-600' },
  entretien:        { label: 'Entretien & Réparations',    icon: <Settings size={13} />,     color: 'text-orange-600' },
  frais_plateforme: { label: 'Frais de plateforme',        icon: <Star size={13} />,         color: 'text-rose-600' },
  autre:            { label: 'Autre',                      icon: <Receipt size={13} />,      color: 'text-slate-500' },
};

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 10);
const nightsBetween = (ci: string, co: string) => {
  const d1 = new Date(ci), d2 = new Date(co);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
};

// ─── CSV import helpers (Airbnb / Vrbo / Booking.com transaction exports) ─────

/** Minimal RFC4180-ish CSV parser — handles quoted fields containing commas/newlines. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip, \n handles the line break */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

/** Best-effort date parser: accepts ISO, "Jan 5, 2026", "01/05/2026", etc. */
function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Guesses which CSV column matches a field by scanning header names for keywords. */
function guessColumn(headers: string[], keywords: string[]): number | null {
  const lower = headers.map(h => h.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex(h => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return null;
}

interface CsvColumnMap {
  guest: number | null;
  checkIn: number | null;
  checkOut: number | null;
  amount: number | null;
  amountIsTotal: boolean; // true = "Montant total du séjour", false = "Tarif par nuit"
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MeubleFinancialModule({
  darkMode,
  companyId,
  companyName = 'Mon Logement',
  unitName = 'Unité Meublée',
  userProfile,
  isGestionnaire = false,
}: MeubleFinancialModuleProps) {
  // Derived fiscal parameters from userProfile (single source of truth)
  const registeredTPS = !!(userProfile?.tps && userProfile.tps.trim().length > 3);
  const registeredTVQ = !!(userProfile?.tvq && userProfile.tvq.trim().length > 3);
  const taxeSejourRegion = userProfile?.taxeSejourRegion ?? 3.5;
  const numeroCITQ = userProfile?.numeroCITQ || '';
  const tpsRate = userProfile?.tpsRate ?? 5;
  const tvqRate = userProfile?.tvqRate ?? 9.975;
  const D = darkMode;
  const now = new Date();
  const [tab, setTab] = useState<'calendrier' | 'revenus' | 'depenses' | 'rapport'>('calendrier');
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  // ─── State: Reservations (loaded from Firestore, seed shown while loading) ──
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingRes, setLoadingRes] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Property-owner clients available for fidéicommis assignment (gestionnaire profile only)
  const [fideicommisClients, setFideicommisClients] = useState<FideicommisClientDoc[]>([]);
  // ─── State: Buildings + Units (Gestion Immobilière) ──────────────────────────
  const [buildings, setBuildings] = useState<PropertyDoc[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [availableUnits, setAvailableUnits] = useState<UnitDoc[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  // For CSV import
  const [csvBuildingId, setCsvBuildingId] = useState<string>('');
  const [csvUnitId, setCsvUnitId] = useState<string>('');
  const [csvAvailableUnits, setCsvAvailableUnits] = useState<UnitDoc[]>([]);

  // Load existing reservations from Firebase on mount
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId || !companyId) {
      setLoadingRes(false);
      return;
    }
    dataService.fetchMeubleReservations(userId, companyId)
      .then((docs) => {
        if (docs.length > 0) {
          setReservations(docs.map(d => ({
            id: d.id,
            guestName: d.guestName,
            checkIn: d.checkIn,
            checkOut: d.checkOut,
            nights: d.nights,
            nightlyRate: d.nightlyRate,
            platform: d.platform,
            platformFeePercent: d.platformFeePercent,
            taxeSejour: d.taxeSejour,
            status: d.status,
            notes: d.notes,
            fideicommisClientId: d.fideicommisClientId,
            fideicommisClientName: d.fideicommisClientName,
            buildingId: d.buildingId,
            unitId: d.unitId,
          })));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingRes(false));
  }, [companyId]);

  // Load buildings for the current user — reuses the SAME `properties` collection
  // as Gestion Immobilière (GestionPlex.tsx), not BuildingLedger (a separate
  // fiscal-proration entity used only by Taxes & Assurances) — otherwise this
  // selector would never show the user's actual registered rental properties.
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    dataService.fetchProperties(userId)
      .then((allProperties) => {
        // Filter to properties belonging to this workspace
        const ws = allProperties.filter(p => p.companyId === companyId);
        setBuildings(ws);
      })
      .catch(console.error);
  }, [companyId]);

  // Load units whenever the selected building changes (reservation form)
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId || !selectedBuildingId) {
      setAvailableUnits([]);
      setSelectedUnitId('');
      return;
    }
    // Only units flagged "courte durée" belong in the Meublé/Airbnb book — a
    // unit rented for 32+ day stays (even via Airbnb as a booking channel) is
    // a regular bail résidentiel and stays out of this short-term ledger.
    dataService.fetchUnitsByBuilding(userId, selectedBuildingId)
      .then((units) => setAvailableUnits(units.filter(u => u.courteDuree)))
      .catch(console.error);
  }, [selectedBuildingId]);

  // Load units for CSV import when building changes
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId || !csvBuildingId) {
      setCsvAvailableUnits([]);
      setCsvUnitId('');
      return;
    }
    dataService.fetchUnitsByBuilding(userId, csvBuildingId)
      .then((units) => setCsvAvailableUnits(units.filter(u => u.courteDuree)))
      .catch(console.error);
  }, [csvBuildingId]);

  // Load the gestionnaire's property-owner clients (for the fidéicommis picker)
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!isGestionnaire || !userId || !companyId) {
      setFideicommisClients([]);
      return;
    }
    dataService.fetchFideicommisClients(userId, companyId)
      .then(setFideicommisClients)
      .catch(console.error);
  }, [isGestionnaire, companyId]);


  const [expenses, setExpenses] = useState<MeubleExpense[]>([
    { id: genId(), date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, category: 'hydro', description: 'Hydro-Québec', amount: 85 },
    { id: genId(), date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, category: 'internet', description: 'Bell Fibe', amount: 75 },
    { id: genId(), date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-05`, category: 'menage', description: 'Nettoyage entre réservations', amount: 60 },
    { id: genId(), date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-15`, category: 'menage', description: 'Nettoyage entre réservations', amount: 60 },
  ]);
  const [unitConfig, setUnitConfig] = useState<UnitConfig>({
    name: unitName, address: '',
    taxeSejourDefault: taxeSejourRegion,
    platformFeeDefault: { airbnb: 3, direct: 0, vrbo: 5, booking: 15 },
  });

  // New reservation form
  const [showResForm, setShowResForm] = useState(false);
  const [newRes, setNewRes] = useState<Partial<Reservation>>({ platform: 'airbnb', status: 'confirmed', taxeSejour: taxeSejourRegion, platformFeePercent: 3 });

  // ── CSV import (Airbnb / Vrbo / Booking.com transaction exports) ──────────
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvPlatform, setCsvPlatform] = useState<Platform>('airbnb');
  const [csvClientId, setCsvClientId] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvMap, setCsvMap] = useState<CsvColumnMap>({ guest: null, checkIn: null, checkOut: null, amount: null, amountIsTotal: true });
  const [csvIncluded, setCsvIncluded] = useState<boolean[]>([]);
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  const resetCsvState = () => {
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvIncluded([]);
    setCsvMap({ guest: null, checkIn: null, checkOut: null, amount: null, amountIsTotal: true });
  };

  const handleCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        alert('Le fichier CSV semble vide ou invalide.');
        return;
      }
      const headers = parsed[0];
      const rows = parsed.slice(1);
      setCsvHeaders(headers);
      setCsvRows(rows);
      setCsvIncluded(rows.map(() => true));
      setCsvMap({
        guest: guessColumn(headers, ['guest', 'voyageur', 'client', 'name']),
        checkIn: guessColumn(headers, ['start date', 'check-in', 'checkin', 'arriv', 'début']),
        checkOut: guessColumn(headers, ['end date', 'check-out', 'checkout', 'départ', 'fin']),
        amount: guessColumn(headers, ['gross earnings', 'earnings', 'payout', 'amount', 'montant', 'total']),
        amountIsTotal: true,
      });
    };
    reader.readAsText(file);
  };

  // Live preview of parsed rows under the current column mapping
  const csvPreview = useMemo(() => {
    return csvRows.map((row) => {
      const guestName = csvMap.guest !== null ? (row[csvMap.guest] || '').trim() : '';
      const checkIn = csvMap.checkIn !== null ? normalizeDate(row[csvMap.checkIn]) : null;
      const checkOut = csvMap.checkOut !== null ? normalizeDate(row[csvMap.checkOut]) : null;
      const amountRaw = csvMap.amount !== null ? row[csvMap.amount] : '';
      const amount = parseFloat((amountRaw || '').replace(/[^0-9.-]/g, ''));
      const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
      const nightlyRate = csvMap.amountIsTotal
        ? (nights > 0 && !isNaN(amount) ? amount / nights : 0)
        : (!isNaN(amount) ? amount : 0);
      const valid = !!guestName && !!checkIn && !!checkOut && nights > 0 && nightlyRate > 0;
      return { guestName, checkIn, checkOut, nights, nightlyRate, valid };
    });
  }, [csvRows, csvMap]);

  const csvValidCount = csvPreview.filter((r, i) => r.valid && csvIncluded[i]).length;

  const runCsvImport = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    setIsImportingCsv(true);
    const selectedClient = csvClientId ? fideicommisClients.find(c => c.id === csvClientId) : undefined;
    const modeGestion: 'proprietaire' | 'gestionnaire' = selectedClient ? 'gestionnaire' : 'proprietaire';
    const platFee = PLATFORMS[csvPlatform].feePercent;
    const taxeSejourRemisePlateforme = csvPlatform !== 'direct';
    let successCount = 0;

    for (let idx = 0; idx < csvPreview.length; idx++) {
      if (!csvIncluded[idx] || !csvPreview[idx].valid) continue;
      const row = csvPreview[idx];
      const localId = genId();
      const gross = row.nights * row.nightlyRate;
      const tpsAmt = !selectedClient && registeredTPS ? parseFloat((gross * tpsRate / 100).toFixed(2)) : 0;
      const tvqAmt = !selectedClient && registeredTVQ ? parseFloat((gross * tvqRate / 100).toFixed(2)) : 0;
      const csvSelUnit = csvAvailableUnits.find(u => u.id === csvUnitId);
      const localRes: Reservation = {
        id: localId,
        guestName: row.guestName,
        checkIn: row.checkIn!,
        checkOut: row.checkOut!,
        nights: row.nights,
        nightlyRate: row.nightlyRate,
        platform: csvPlatform,
        platformFeePercent: platFee,
        taxeSejour: taxeSejourRegion,
        status: 'confirmed',
        fideicommisClientId: selectedClient?.id,
        fideicommisClientName: selectedClient?.nom,
        buildingId: csvBuildingId || undefined,
        unitId: csvUnitId || undefined,
        unitName: csvSelUnit?.unitName,
      };
      setReservations(prev => [...prev, localRes]);
      try {
        await dataService.saveMeubleReservation(userId, {
          id: localId,
          companyId,
          modeGestion,
          fideicommisClientId: selectedClient?.id,
          fideicommisClientName: selectedClient?.nom,
          commissionRatePercent: selectedClient?.tauxHonoraires,
          buildingId: localRes.buildingId,
          unitId: localRes.unitId,
          guestName: localRes.guestName,
          checkIn: localRes.checkIn,
          checkOut: localRes.checkOut,
          nights: localRes.nights,
          nightlyRate: localRes.nightlyRate,
          platform: localRes.platform,
          platformFeePercent: localRes.platformFeePercent,
          taxeSejour: localRes.taxeSejour,
          taxeSejourRemisePlateforme,
          tpsCollected: tpsAmt,
          tvqCollected: tvqAmt,
          status: localRes.status,
          notes: `Importé depuis CSV ${PLATFORMS[csvPlatform].label}`,
          journalPosted: false,
        });
        successCount++;
      } catch (err) {
        console.error('[CSV import] échec ligne', idx, err);
      }
    }

    setIsImportingCsv(false);
    setShowCsvImport(false);
    resetCsvState();
    setCsvBuildingId('');
    setCsvUnitId('');
    alert(`${successCount} réservation(s) importée(s) avec succès.`);
  };

  // New expense form
  const [showExpForm, setShowExpForm] = useState(false);
  const [newExp, setNewExp] = useState<Partial<MeubleExpense>>({ category: 'menage' });

  // Report period filter
  const [reportMonth, setReportMonth] = useState(now.getMonth());
  const [reportYear, setReportYear] = useState(now.getFullYear());

  // ── Computed metrics ─────────────────────────────────────────────────────────

  const currentMonthRes = useMemo(() =>
    reservations.filter(r => {
      const d = new Date(r.checkIn);
      return d.getMonth() === calMonth && d.getFullYear() === calYear && r.status !== 'cancelled';
    }), [reservations, calMonth, calYear]);

  const reportRes = useMemo(() =>
    reservations.filter(r => {
      const d = new Date(r.checkIn);
      return d.getMonth() === reportMonth && d.getFullYear() === reportYear && r.status !== 'cancelled';
    }), [reservations, reportMonth, reportYear]);

  const reportExp = useMemo(() =>
    expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === reportMonth && d.getFullYear() === reportYear;
    }), [expenses, reportMonth, reportYear]);

  const grossRevenue = reportRes.reduce((s, r) => s + r.nights * r.nightlyRate, 0);
  const platformFees = reportRes.reduce((s, r) => s + r.nights * r.nightlyRate * (r.platformFeePercent / 100), 0);
  const taxeSejourTotal = reportRes.reduce((s, r) => s + r.nights * r.nightlyRate * (r.taxeSejour / 100), 0);
  const netRevenue = grossRevenue - platformFees - taxeSejourTotal;
  const totalExpenses = reportExp.reduce((s, e) => s + e.amount, 0);
  const netProfit = netRevenue - totalExpenses;
  const daysInMonth = new Date(reportYear, reportMonth + 1, 0).getDate();
  const occupiedDays = reportRes.reduce((s, r) => s + r.nights, 0);
  const occupancyRate = Math.min(100, Math.round((occupiedDays / daysInMonth) * 100));

  // ── Calendar helpers ──────────────────────────────────────────────────────────

  const getCalDays = () => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInM = new Date(calYear, calMonth + 1, 0).getDate();
    const days: (number | null)[] = Array(offset).fill(null);
    for (let i = 1; i <= daysInM; i++) days.push(i);
    return days;
  };

  const getReservationForDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reservations.find(r => {
      if (r.status === 'cancelled') return false;
      return dateStr >= r.checkIn && dateStr < r.checkOut;
    });
  };

  const isCheckIn = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reservations.some(r => r.checkIn === dateStr && r.status !== 'cancelled');
  };

  const isCheckOut = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reservations.some(r => r.checkOut === dateStr && r.status !== 'cancelled');
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const addReservation = async () => {
    if (!newRes.guestName || !newRes.checkIn || !newRes.checkOut) return;
    const nights = nightsBetween(newRes.checkIn!, newRes.checkOut!);
    const platform = newRes.platform || 'airbnb';
    const platFee = PLATFORMS[platform].feePercent;
    const gross = (newRes.nightlyRate || 100) * nights;

    // If a client was picked, this reservation is managed in fidéicommis on their
    // behalf — the client's own TPS/TVQ registration (not this account's) would
    // apply, so we don't compute those here (see saveMeubleReservation docstring).
    const selectedClient = newRes.fideicommisClientId
      ? fideicommisClients.find(c => c.id === newRes.fideicommisClientId)
      : undefined;
    const modeGestion: 'proprietaire' | 'gestionnaire' = selectedClient ? 'gestionnaire' : 'proprietaire';

    // Determine tax amounts if registered (propriétaire mode only)
    const tpsAmt = !selectedClient && registeredTPS ? parseFloat((gross * tpsRate / 100).toFixed(2)) : 0;
    const tvqAmt = !selectedClient && registeredTVQ ? parseFloat((gross * tvqRate / 100).toFixed(2)) : 0;

    // Platform remits taxe de séjour automatically for Airbnb/VRBO/Booking
    const taxeSejourRemisePlateforme = platform !== 'direct';

    const localId = genId();
    const selUnit = availableUnits.find(u => u.id === selectedUnitId);
    const localRes: Reservation = {
      id: localId,
      guestName: newRes.guestName!,
      checkIn: newRes.checkIn!,
      checkOut: newRes.checkOut!,
      nights,
      nightlyRate: newRes.nightlyRate || 100,
      platform,
      platformFeePercent: newRes.platformFeePercent ?? platFee,
      taxeSejour: newRes.taxeSejour ?? taxeSejourRegion,
      status: newRes.status || 'confirmed',
      notes: newRes.notes,
      fideicommisClientId: selectedClient?.id,
      fideicommisClientName: selectedClient?.nom,
      buildingId: selectedBuildingId || undefined,
      unitId: selectedUnitId || undefined,
      unitName: selUnit?.unitName,
    };

    // Optimistic update — show in UI immediately
    setReservations(prev => [...prev, localRes]);
    setNewRes({ platform: 'airbnb', status: 'confirmed', taxeSejour: taxeSejourRegion, platformFeePercent: 3 });
    setSelectedBuildingId('');
    setSelectedUnitId('');
    setShowResForm(false);

    // Persist to Firebase + post journal entry / dépôt fidéicommis (async, non-blocking for UX)
    const userId = auth.currentUser?.uid;
    if (userId) {
      setIsSaving(true);
      try {
        await dataService.saveMeubleReservation(userId, {
          id: localId,
          companyId,
          modeGestion,
          fideicommisClientId: selectedClient?.id,
          fideicommisClientName: selectedClient?.nom,
          commissionRatePercent: selectedClient?.tauxHonoraires,
          buildingId: localRes.buildingId,
          unitId: localRes.unitId,
          guestName: localRes.guestName,
          checkIn: localRes.checkIn,
          checkOut: localRes.checkOut,
          nights: localRes.nights,
          nightlyRate: localRes.nightlyRate,
          platform: localRes.platform,
          platformFeePercent: localRes.platformFeePercent,
          taxeSejour: localRes.taxeSejour,
          taxeSejourRemisePlateforme,
          tpsCollected: tpsAmt,
          tvqCollected: tvqAmt,
          status: localRes.status,
          notes: localRes.notes,
          journalPosted: false,
        });
      } catch (err: any) {
        console.error('[MeubleModule] Save failed:', err.message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const addExpense = () => {
    if (!newExp.amount || !newExp.date) return;
    setExpenses(prev => [...prev, {
      id: genId(),
      date: newExp.date!,
      category: newExp.category || 'autre',
      description: newExp.description || EXPENSE_CATS[newExp.category || 'autre'].label,
      amount: newExp.amount!,
    }]);
    setNewExp({ category: 'menage' });
    setShowExpForm(false);
  };

  const deleteReservation = (id: string) => setReservations(prev => prev.filter(r => r.id !== id));
  const deleteExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));

  // ── Export PDF ────────────────────────────────────────────────────────────────

  const exportRapportPDF = () => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, M = 18;
    const green: [number,number,number] = [5,150,105];

    pdf.setFillColor(...green);
    pdf.rect(0, 0, W, 34, 'F');
    pdf.setTextColor(255,255,255);
    pdf.setFont('Helvetica','bold');
    pdf.setFontSize(16);
    pdf.text('AutoCompt — Rapport Meublé / Airbnb', M, 15);
    pdf.setFontSize(9);
    pdf.setFont('Helvetica','normal');
    pdf.text(`${unitConfig.name} · ${MONTHS_FR[reportMonth]} ${reportYear}`, M, 23);
    pdf.text(`Généré le ${new Date().toLocaleDateString('fr-CA')}`, W - M, 23, { align: 'right' });

    let y = 45;
    const row = (label: string, value: string, bold = false) => {
      pdf.setFont('Helvetica', bold ? 'bold' : 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(30,41,59);
      pdf.text(label, M, y);
      pdf.text(value, W - M, y, { align: 'right' });
      y += 7;
    };
    const section = (title: string) => {
      y += 3;
      pdf.setFillColor(248,250,252);
      pdf.rect(M, y - 4, W - M*2, 9, 'F');
      pdf.setFont('Helvetica','bold');
      pdf.setFontSize(8);
      pdf.setTextColor(100,116,139);
      pdf.text(title.toUpperCase(), M + 2, y + 1.5);
      y += 9;
    };

    section('Occupation');
    row('Nuits occupées', `${occupiedDays} / ${daysInMonth}`);
    row("Taux d'occupation", `${occupancyRate} %`);
    row('Réservations', `${reportRes.length}`);

    section('Revenus');
    row('Revenus bruts', `${grossRevenue.toFixed(2)} $`);
    row('Frais de plateforme', `- ${platformFees.toFixed(2)} $`);
    row('Taxe de séjour collectée', `- ${taxeSejourTotal.toFixed(2)} $`);
    row('Revenus nets', `${netRevenue.toFixed(2)} $`, true);

    section('Dépenses');
    reportExp.forEach(e => {
      row(EXPENSE_CATS[e.category].label, `${e.amount.toFixed(2)} $`);
    });
    row('Total dépenses', `${totalExpenses.toFixed(2)} $`, true);

    section('Résultat net');
    pdf.setFont('Helvetica','bold');
    pdf.setFontSize(13);
    const netProfitColor = netProfit >= 0 ? [5, 150, 105] : [220, 38, 38];
    pdf.setTextColor(netProfitColor[0], netProfitColor[1], netProfitColor[2]);
    pdf.text(`Bénéfice net: ${netProfit.toFixed(2)} $`, W/2, y + 4, { align: 'center' });

    pdf.save(`Rapport_Meuble_${MONTHS_FR[reportMonth]}_${reportYear}.pdf`);
  };

  // ── Shared styles ─────────────────────────────────────────────────────────────
  const card = `${D ? 'bg-zinc-900/70 border-zinc-800' : 'bg-white border-slate-200'} rounded-3xl border shadow-sm`;
  const input = `w-full px-3 py-2 rounded-xl border text-[11px] outline-none transition-colors ${D ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'}`;
  const label = `block text-[9px] font-black uppercase tracking-wider mb-1 ${D ? 'text-zinc-500' : 'text-slate-400'}`;

  const TABS = [
    { id: 'calendrier', label: 'Calendrier', icon: <Calendar size={13} /> },
    { id: 'revenus',    label: 'Revenus',    icon: <DollarSign size={13} /> },
    { id: 'depenses',   label: 'Dépenses',   icon: <Receipt size={13} /> },
    { id: 'rapport',    label: 'Rapport',    icon: <BarChart2 size={13} /> },
  ] as const;

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: Calendrier
  // ─────────────────────────────────────────────────────────────────────────────
  const CalendrierTab = () => (
    <div className="space-y-5">
      {/* Month nav + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }}
            className={`p-2 rounded-xl ${D ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'} transition-colors`}>
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-black">{MONTHS_FR[calMonth]} {calYear}</h2>
          <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }}
            className={`p-2 rounded-xl ${D ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'} transition-colors`}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCsvImport(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border ${D ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Upload size={13} /><span>Importer CSV</span>
          </button>
          <button onClick={() => setShowResForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95">
            <Plus size={13} /><span>Nouvelle réservation</span>
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Nuits occupées', value: `${currentMonthRes.reduce((s,r)=>s+r.nights,0)}`, color: 'emerald' },
          { label: 'Revenus bruts', value: `${currentMonthRes.reduce((s,r)=>s+r.nights*r.nightlyRate,0).toFixed(0)} $`, color: 'indigo' },
          { label: 'Réservations', value: currentMonthRes.length.toString(), color: 'amber' },
        ].map((s,i) => (
          <div key={i} className={`${card} p-4 text-center`}>
            <p className={`text-xl font-black ${s.color === 'emerald' ? 'text-emerald-600' : s.color === 'indigo' ? 'text-indigo-600' : 'text-amber-600'}`}>{s.value}</p>
            <p className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`${card} p-5`}>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_FR.map(d => (
            <div key={d} className={`text-center text-[8px] font-black uppercase tracking-wider py-1 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {getCalDays().map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const res = getReservationForDay(day);
            const checkIn = isCheckIn(day);
            const checkOut = isCheckOut(day);
            const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();

            return (
              <div key={day} className={`relative h-10 rounded-xl flex items-center justify-center text-[11px] font-bold transition-all ${
                res
                  ? `${PLATFORMS[res.platform].bg} ${PLATFORMS[res.platform].color} border`
                  : isToday
                  ? 'bg-emerald-600 text-white'
                  : D ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-50'
              }`}>
                {checkIn && <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-current opacity-60" />}
                {day}
                {checkOut && <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-current opacity-60" />}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
          {Object.entries(PLATFORMS).map(([k, p]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${p.bg} ${p.color}`}>{p.logo} {p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reservation list */}
      <div className="space-y-2">
        {currentMonthRes.length === 0 && (
          <div className={`${card} p-6 text-center`}>
            <p className={`text-[12px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>Aucune réservation ce mois-ci.</p>
          </div>
        )}
        {currentMonthRes.map(r => {
          const platConf = PLATFORMS[r.platform];
          const gross = r.nights * r.nightlyRate;
          const fees = gross * (r.platformFeePercent / 100);
          const net = gross - fees - gross * (r.taxeSejour / 100);
          return (
            <div key={r.id} className={`${card} p-4 flex items-center gap-4`}>
              <div className={`text-xl`}>{platConf.logo}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-[12px] font-bold ${D ? 'text-zinc-200' : 'text-slate-800'}`}>{r.guestName}</p>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border ${platConf.bg} ${platConf.color}`}>{platConf.label}</span>
                  {r.fideicommisClientName && (
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border ${D ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
                      <Building2 size={8} className="inline mr-0.5" />{r.fideicommisClientName}
                    </span>
                  )}
                  {r.unitName && (
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border ${D ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                      🚪 {r.unitName}
                    </span>
                  )}
                </div>
                <p className={`text-[10px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>
                  {new Date(r.checkIn).toLocaleDateString('fr-CA', { day:'2-digit', month:'short' })} →{' '}
                  {new Date(r.checkOut).toLocaleDateString('fr-CA', { day:'2-digit', month:'short' })} · {r.nights} nuits · {r.nightlyRate} $/nuit
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-black text-emerald-600">{net.toFixed(0)} $</p>
                <p className={`text-[9px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>net · brut {gross.toFixed(0)} $</p>
              </div>
              <button onClick={() => deleteReservation(r.id)} className={`p-1.5 rounded-lg ${D ? 'hover:bg-zinc-800 text-zinc-600' : 'hover:bg-slate-100 text-slate-300'} transition-colors`}>
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: Revenus
  // ─────────────────────────────────────────────────────────────────────────────
  const RevenusTab = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Revenus bruts', value: grossRevenue, icon: <TrendingUp size={16}/>, color: 'emerald', neg: false },
          { label: 'Frais plateformes', value: platformFees, icon: <Percent size={16}/>, color: 'rose', neg: true },
          { label: 'Taxe de séjour', value: taxeSejourTotal, icon: <Receipt size={16}/>, color: 'amber', neg: true },
          { label: 'Revenus nets', value: netRevenue, icon: <DollarSign size={16}/>, color: 'indigo', neg: false },
        ].map((m,i) => (
          <div key={i} className={`${card} p-5`}>
            <div className={`inline-flex p-2 rounded-xl mb-3 ${
              m.color==='emerald' ? (D?'bg-emerald-500/10 text-emerald-400':'bg-emerald-50 text-emerald-600') :
              m.color==='rose' ? (D?'bg-rose-500/10 text-rose-400':'bg-rose-50 text-rose-600') :
              m.color==='amber' ? (D?'bg-amber-500/10 text-amber-400':'bg-amber-50 text-amber-600') :
              (D?'bg-indigo-500/10 text-indigo-400':'bg-indigo-50 text-indigo-600')
            }`}>{m.icon}</div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${D?'text-zinc-500':'text-slate-400'}`}>{m.label}</p>
            <p className={`text-2xl font-black mt-1 ${m.neg ? 'text-rose-500' : (i===3?'text-indigo-600':'text-emerald-600')}`}>
              {m.neg && m.value > 0 ? '-' : ''}{m.value.toFixed(2)} $
            </p>
          </div>
        ))}
      </div>

      {/* By platform breakdown */}
      <div className={`${card} p-6`}>
        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-5 ${D?'text-zinc-400':'text-slate-400'}`}>Répartition par plateforme</h3>
        <div className="space-y-4">
          {(Object.keys(PLATFORMS) as Platform[]).map(plat => {
            const platRes = reportRes.filter(r => r.platform === plat);
            if (platRes.length === 0) return null;
            const platGross = platRes.reduce((s,r) => s + r.nights*r.nightlyRate, 0);
            const platFees = platRes.reduce((s,r) => s + r.nights*r.nightlyRate*(r.platformFeePercent/100), 0);
            const platNet = platGross - platFees;
            const conf = PLATFORMS[plat];
            return (
              <div key={plat} className={`p-4 rounded-2xl border ${conf.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{conf.logo}</span>
                    <span className={`text-[11px] font-black ${conf.color}`}>{conf.label}</span>
                    <span className={`text-[8px] font-bold ${conf.color} opacity-60`}>{platRes.length} rés. · {conf.feePercent}% frais</span>
                  </div>
                  <div className="text-right">
                    <p className={`text-[13px] font-black ${conf.color}`}>{platNet.toFixed(2)} $ net</p>
                    <p className={`text-[9px] ${conf.color} opacity-70`}>brut: {platGross.toFixed(2)} $</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-white/50 overflow-hidden">
                  <div className="h-full bg-current rounded-full" style={{ width: `${Math.max(10,(platGross/Math.max(grossRevenue,1))*100)}%`, opacity: 0.4 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: Dépenses
  // ─────────────────────────────────────────────────────────────────────────────
  const DepensesTab = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className={`${card} px-4 py-2 flex items-center gap-2`}>
          <TrendingDown size={14} className="text-rose-500" />
          <span className={`text-[11px] font-bold ${D?'text-zinc-300':'text-slate-700'}`}>Total ce mois: <strong className="text-rose-600">{totalExpenses.toFixed(2)} $</strong></span>
        </div>
        <button onClick={() => setShowExpForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95">
          <Plus size={13}/><span>Ajouter dépense</span>
        </button>
      </div>

      {/* By category */}
      <div className={`${card} p-5`}>
        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${D?'text-zinc-400':'text-slate-400'}`}>Par catégorie</h3>
        <div className="space-y-2">
          {(Object.keys(EXPENSE_CATS) as ExpenseCategory[]).map(cat => {
            const catTotal = reportExp.filter(e => e.category === cat).reduce((s,e) => s+e.amount, 0);
            if (catTotal === 0) return null;
            const catConf = EXPENSE_CATS[cat];
            return (
              <div key={cat} className="flex items-center gap-3">
                <span className={`${catConf.color}`}>{catConf.icon}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-rose-400 rounded-full" style={{ width: `${Math.max(5,(catTotal/Math.max(totalExpenses,1))*100)}%` }} />
                </div>
                <span className={`text-[10px] font-semibold w-32 ${D?'text-zinc-400':'text-slate-600'}`}>{catConf.label}</span>
                <span className="text-[11px] font-black text-rose-600 w-20 text-right">{catTotal.toFixed(2)} $</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expense list */}
      <div className="space-y-2">
        {reportExp.map(e => {
          const catConf = EXPENSE_CATS[e.category];
          return (
            <div key={e.id} className={`${card} p-4 flex items-center gap-4`}>
              <div className={`p-2 rounded-xl ${D?'bg-zinc-800':'bg-slate-100'} ${catConf.color}`}>{catConf.icon}</div>
              <div className="flex-1">
                <p className={`text-[11px] font-bold ${D?'text-zinc-200':'text-slate-800'}`}>{e.description}</p>
                <p className={`text-[9px] ${D?'text-zinc-500':'text-slate-400'}`}>{new Date(e.date).toLocaleDateString('fr-CA')} · {catConf.label}</p>
              </div>
              <p className="text-[13px] font-black text-rose-600">{e.amount.toFixed(2)} $</p>
              <button onClick={() => deleteExpense(e.id)} className={`p-1.5 rounded-lg ${D?'hover:bg-zinc-800 text-zinc-600':'hover:bg-slate-100 text-slate-300'}`}>
                <Trash2 size={13}/>
              </button>
            </div>
          );
        })}
        {reportExp.length === 0 && (
          <div className={`${card} p-6 text-center`}>
            <p className={`text-[12px] ${D?'text-zinc-500':'text-slate-400'}`}>Aucune dépense ce mois-ci.</p>
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: Rapport
  // ─────────────────────────────────────────────────────────────────────────────
  const RapportTab = () => (
    <div className="space-y-5">
      {/* Period selector */}
      <div className={`${card} p-4 flex items-center gap-4 flex-wrap`}>
        <select value={reportMonth} onChange={e => setReportMonth(+e.target.value)}
          className={`px-3 py-2 rounded-xl border text-[11px] font-bold outline-none ${D?'bg-zinc-800 border-zinc-700 text-zinc-200':'bg-white border-slate-200'}`}>
          {MONTHS_FR.map((m,i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={reportYear} onChange={e => setReportYear(+e.target.value)}
          className={`px-3 py-2 rounded-xl border text-[11px] font-bold outline-none ${D?'bg-zinc-800 border-zinc-700 text-zinc-200':'bg-white border-slate-200'}`}>
          {[reportYear-1, reportYear, reportYear+1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={exportRapportPDF}
          className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95">
          <Download size={13}/><span>Exporter PDF</span>
        </button>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Taux d'occupation", value: `${occupancyRate}%`, sub: `${occupiedDays}/${daysInMonth} nuits`, color: 'violet' },
          { label: 'Revenus bruts', value: `${grossRevenue.toFixed(0)} $`, sub: `${reportRes.length} réservations`, color: 'emerald' },
          { label: 'Revenus nets', value: `${netRevenue.toFixed(0)} $`, sub: `après frais & taxes`, color: 'indigo' },
          { label: 'Bénéfice net', value: `${netProfit.toFixed(0)} $`, sub: `après toutes dépenses`, color: netProfit >= 0 ? 'emerald' : 'rose' },
        ].map((k,i) => (
          <div key={i} className={`${card} p-5 text-center`}>
            <p className={`text-xl font-black ${k.color==='violet'?'text-violet-600':k.color==='emerald'?'text-emerald-600':k.color==='indigo'?'text-indigo-600':'text-rose-600'}`}>{k.value}</p>
            <p className={`text-[9px] font-black uppercase tracking-wider mt-1 ${D?'text-zinc-400':'text-slate-400'}`}>{k.label}</p>
            <p className={`text-[9px] ${D?'text-zinc-500':'text-slate-400'}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Detailed breakdown */}
      <div className={`${card} p-6 space-y-3`}>
        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${D?'text-zinc-400':'text-slate-400'}`}>Compte de résultat — {MONTHS_FR[reportMonth]} {reportYear}</h3>
        {[
          { label: 'Revenus bruts totaux', value: grossRevenue, bold: false, color: '' },
          { label: `Frais plateformes (Airbnb ${PLATFORMS.airbnb.feePercent}%, etc.)`, value: -platformFees, bold: false, color: 'text-rose-500' },
          { label: `Taxe de séjour collectée (${unitConfig.taxeSejourDefault}%)`, value: -taxeSejourTotal, bold: false, color: 'text-rose-500' },
          { label: 'Revenus nets', value: netRevenue, bold: true, color: 'text-indigo-600' },
          { label: 'Total dépenses d\'exploitation', value: -totalExpenses, bold: false, color: 'text-rose-500' },
          { label: 'BÉNÉFICE NET', value: netProfit, bold: true, color: netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600' },
        ].map((row, i) => (
          <div key={i} className={`flex justify-between items-center py-2 ${i < 5 ? `border-b ${D?'border-zinc-800':'border-slate-100'}` : ''} ${row.bold ? 'pt-3' : ''}`}>
            <span className={`text-[11px] ${row.bold ? 'font-black' : 'font-medium'} ${D?'text-zinc-300':'text-slate-600'}`}>{row.label}</span>
            <span className={`text-[13px] ${row.bold ? 'font-black text-lg' : 'font-semibold'} ${row.color || (D?'text-zinc-200':'text-slate-800')}`}>
              {row.value >= 0 ? '+' : ''}{row.value.toFixed(2)} $
            </span>
          </div>
        ))}
      </div>

      {/* Config taxe de séjour */}
      <div className={`${card} p-5`}>
        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${D?'text-zinc-400':'text-slate-400'}`}>
          ⚙️ Configuration — Taxe de séjour
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className={label}>Taux par défaut (%)</label>
            <input type="number" step="0.1" min="0" max="20" value={unitConfig.taxeSejourDefault}
              onChange={e => setUnitConfig(c => ({...c, taxeSejourDefault: +e.target.value}))}
              className={`${input} w-32`} />
          </div>
          <div className={`text-[10px] ${D?'text-zinc-500':'text-slate-400'} max-w-xs`}>
            <Info size={12} className="inline mr-1 text-blue-500" />
            Montréal: 3.5% · Québec: variable · Modifiez par unité si nécessaire
          </div>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Bandeau conformité Revenu Québec ─────────────────────────────── */}
      <div className={`rounded-2xl border px-4 py-3 flex flex-wrap items-center gap-3 ${
        D ? 'bg-zinc-900/70 border-zinc-800' : 'bg-white border-slate-200'
      }`}>
        {/* Mode gestion badge */}
        {isGestionnaire ? (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
            D ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
          }`}>
            <Building2 size={10} />
            Compte Gestionnaire — {fideicommisClients.length} client{fideicommisClients.length !== 1 ? 's' : ''} fidéicommis
          </div>
        ) : (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
            D ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <Home size={10} />
            Propriétaire Direct
          </div>
        )}

        {/* CITQ status */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
          numeroCITQ
            ? (D ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
            : (D ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700')
        }`}>
          {numeroCITQ ? <ShieldCheck size={10} /> : <AlertCircle size={10} />}
          {numeroCITQ ? `CITQ #${numeroCITQ}` : 'CITQ requis — voir Paramètres'}
        </div>

        {/* TPS/TVQ status */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
          registeredTPS
            ? (D ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
            : (D ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-400')
        }`}>
          <Percent size={10} />
          {registeredTPS ? 'TPS/TVQ inscrits' : 'Non inscrit TPS/TVQ'}
        </div>

        {/* Taxe séjour info */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
          D ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <Star size={10} />
          Taxe séjour: {taxeSejourRegion}%
        </div>

        {/* Saving spinner */}
        {isSaving && (
          <div className="ml-auto flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-500">
            <Loader2 size={12} className="animate-spin" />
            Enregistrement dans le grand livre…
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className={`flex gap-1 border-b ${D?'border-zinc-800':'border-slate-200'} overflow-x-auto`}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              tab === t.id
                ? 'border-emerald-500 text-emerald-600'
                : `border-transparent ${D?'text-zinc-500 hover:text-zinc-300':'text-slate-400 hover:text-slate-600'}`
            }`}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
          {tab === 'calendrier' && <CalendrierTab />}
          {tab === 'revenus'    && <RevenusTab />}
          {tab === 'depenses'   && <DepensesTab />}
          {tab === 'rapport'    && <RapportTab />}
        </motion.div>
      </AnimatePresence>

      {/* Modal: New Reservation */}
      <AnimatePresence>
        {showResForm && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowResForm(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className={`${D?'bg-zinc-900 border-zinc-800':'bg-white border-slate-200'} border rounded-3xl shadow-2xl p-7 w-full max-w-md`}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-base">Nouvelle réservation</h2>
                <button onClick={() => setShowResForm(false)} className={`p-2 rounded-xl ${D?'hover:bg-zinc-800 text-zinc-500':'hover:bg-slate-100 text-slate-400'}`}><X size={16}/></button>
              </div>
              <div className="space-y-3">
                {isGestionnaire && fideicommisClients.length === 0 && (
                  <div className={`p-3 rounded-xl text-[10px] ${D ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                    <Info size={12} className="inline mr-1" />
                    Aucun client fidéicommis enregistré — ajoutez-en un dans « Compte en Fidéicommis » pour pouvoir gérer des unités meublées pour vos clients.
                  </div>
                )}
                {isGestionnaire && fideicommisClients.length > 0 && (
                  <div>
                    <label className={label}>Propriétaire du logement</label>
                    <select className={input} value={newRes.fideicommisClientId || ''} onChange={e => setNewRes(r => ({ ...r, fideicommisClientId: e.target.value || undefined }))}>
                      <option value="">Moi-même (compte courant)</option>
                      {fideicommisClients.map(c => (
                        <option key={c.id} value={c.id}>{c.nom} — honoraires {c.tauxHonoraires}%</option>
                      ))}
                    </select>
                    {newRes.fideicommisClientId && (
                      <p className={`text-[9px] mt-1 ${D ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        <Building2 size={10} className="inline mr-1" />
                        Cette réservation sera déposée en fidéicommis pour ce client — vos honoraires seront retirés automatiquement.
                      </p>
                    )}
                  </div>
                )}
                {/* ── Sélecteur d'immeuble / unité (Gestion Immobilière) ── */}
                {buildings.length > 0 && (
                  <div>
                    <label className={label}>Immeuble (optionnel)</label>
                    <select className={input} value={selectedBuildingId}
                      onChange={e => { setSelectedBuildingId(e.target.value); setSelectedUnitId(''); }}>
                      <option value="">— Aucun immeuble lié —</option>
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.adresse}</option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedBuildingId && availableUnits.length > 0 && (
                  <div>
                    <label className={label}>Unité / Porte</label>
                    <select className={input} value={selectedUnitId} onChange={e => setSelectedUnitId(e.target.value)}>
                      <option value="">— Toutes les unités —</option>
                      {availableUnits.map(u => (
                        <option key={u.id} value={u.id}>{u.unitName}{u.tenantName ? ` · ${u.tenantName}` : ''}</option>
                      ))}
                    </select>
                    {selectedUnitId && (
                      <p className={`text-[9px] mt-1 text-emerald-600`}>🚪 Cette réservation sera enregistrée dans le livre de l'immeuble sélectionné.</p>
                    )}
                  </div>
                )}
                {selectedBuildingId && availableUnits.length === 0 && (
                  <p className={`text-[9px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>
                    Aucune unité « courte durée » pour cet immeuble — activez l'interrupteur sur l'unité concernée dans Gestion Immobilière.
                  </p>
                )}
                <div><label className={label}>Nom du voyageur</label>
                  <input className={input} placeholder="Marie Dupont" value={newRes.guestName||''} onChange={e => setNewRes(r=>({...r, guestName: e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>Arrivée</label>
                    <input type="date" className={input} value={newRes.checkIn||''} onChange={e => setNewRes(r=>({...r, checkIn: e.target.value}))} /></div>
                  <div><label className={label}>Départ</label>
                    <input type="date" className={input} value={newRes.checkOut||''} onChange={e => setNewRes(r=>({...r, checkOut: e.target.value}))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>Tarif / nuit ($)</label>
                    <input type="number" className={input} value={newRes.nightlyRate||''} onChange={e => setNewRes(r=>({...r, nightlyRate: +e.target.value}))} /></div>
                  <div><label className={label}>Plateforme</label>
                    <select className={input} value={newRes.platform||'airbnb'} onChange={e => {
                      const plat = e.target.value as Platform;
                      setNewRes(r=>({...r, platform: plat, platformFeePercent: PLATFORMS[plat].feePercent}));
                    }}>
                      {(Object.entries(PLATFORMS) as [Platform, any][]).map(([k,v]) => <option key={k} value={k}>{v.logo} {v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>Frais plateforme (%)</label>
                    <input type="number" step="0.1" className={input} value={newRes.platformFeePercent ?? PLATFORMS[newRes.platform||'airbnb'].feePercent} onChange={e => setNewRes(r=>({...r, platformFeePercent: +e.target.value}))} /></div>
                  <div><label className={label}>Taxe de séjour (%)</label>
                    <input type="number" step="0.1" className={input} value={newRes.taxeSejour ?? unitConfig.taxeSejourDefault} onChange={e => setNewRes(r=>({...r, taxeSejour: +e.target.value}))} /></div>
                </div>
                {newRes.checkIn && newRes.checkOut && (
                  <div className={`p-3 rounded-xl ${D?'bg-emerald-500/10':'bg-emerald-50'} border border-emerald-200 text-center`}>
                    <p className="text-[11px] font-bold text-emerald-700">
                      {nightsBetween(newRes.checkIn, newRes.checkOut)} nuits ·{' '}
                      Brut: {((newRes.nightlyRate||0) * nightsBetween(newRes.checkIn, newRes.checkOut)).toFixed(0)} $ ·{' '}
                      Net: {((newRes.nightlyRate||0) * nightsBetween(newRes.checkIn, newRes.checkOut) * (1 - ((newRes.platformFeePercent??3)/100) - ((newRes.taxeSejour??3.5)/100))).toFixed(0)} $
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowResForm(false)} className={`flex-1 py-3 rounded-2xl border text-[10px] font-black uppercase transition-all ${D?'border-zinc-700 text-zinc-400':'border-slate-200 text-slate-500'}`}>Annuler</button>
                <button onClick={addReservation} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase transition-all">Ajouter</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: New Expense */}
      <AnimatePresence>
        {showExpForm && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowExpForm(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className={`${D?'bg-zinc-900 border-zinc-800':'bg-white border-slate-200'} border rounded-3xl shadow-2xl p-7 w-full max-w-sm`}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-base">Nouvelle dépense</h2>
                <button onClick={() => setShowExpForm(false)} className={`p-2 rounded-xl ${D?'hover:bg-zinc-800 text-zinc-500':'hover:bg-slate-100 text-slate-400'}`}><X size={16}/></button>
              </div>
              <div className="space-y-3">
                <div><label className={label}>Catégorie</label>
                  <select className={input} value={newExp.category||'menage'} onChange={e => setNewExp(x=>({...x, category: e.target.value as ExpenseCategory, description: EXPENSE_CATS[e.target.value as ExpenseCategory].label}))}>
                    {(Object.entries(EXPENSE_CATS) as [ExpenseCategory, any][]).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select></div>
                <div><label className={label}>Description</label>
                  <input className={input} value={newExp.description||''} onChange={e => setNewExp(x=>({...x, description: e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>Montant ($)</label>
                    <input type="number" className={input} value={newExp.amount||''} onChange={e => setNewExp(x=>({...x, amount: +e.target.value}))} /></div>
                  <div><label className={label}>Date</label>
                    <input type="date" className={input} value={newExp.date||''} onChange={e => setNewExp(x=>({...x, date: e.target.value}))} /></div>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowExpForm(false)} className={`flex-1 py-3 rounded-2xl border text-[10px] font-black uppercase ${D?'border-zinc-700 text-zinc-400':'border-slate-200 text-slate-500'}`}>Annuler</button>
                <button onClick={addExpense} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase">Ajouter</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: CSV Import (Airbnb / Vrbo / Booking.com) */}
      <AnimatePresence>
        {showCsvImport && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setShowCsvImport(false); resetCsvState(); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className={`${D?'bg-zinc-900 border-zinc-800':'bg-white border-slate-200'} border rounded-3xl shadow-2xl p-7 w-full max-w-2xl max-h-[85vh] overflow-y-auto`}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-base flex items-center gap-2"><FileSpreadsheet size={18} className="text-emerald-600" />Importer des réservations (CSV)</h2>
                <button onClick={() => { setShowCsvImport(false); resetCsvState(); }} className={`p-2 rounded-xl ${D?'hover:bg-zinc-800 text-zinc-500':'hover:bg-slate-100 text-slate-400'}`}><X size={16}/></button>
              </div>

              {csvHeaders.length === 0 ? (
                <div className="space-y-4">
                  <div className={`p-3 rounded-xl text-[10px] leading-relaxed ${D ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-50 text-slate-500'}`}>
                    <Info size={12} className="inline mr-1 text-blue-500" />
                    Téléchargez d'abord le fichier depuis votre plateforme: <strong>Airbnb</strong> → Revenus → Transactions historiques → Exporter le CSV. <strong>Vrbo</strong> / <strong>Booking.com</strong> → section Réservations/Extranet → Exporter.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>Plateforme</label>
                      <select className={input} value={csvPlatform} onChange={e => setCsvPlatform(e.target.value as Platform)}>
                        {(Object.entries(PLATFORMS) as [Platform, any][]).filter(([k]) => k !== 'direct').map(([k,v]) => <option key={k} value={k}>{v.logo} {v.label}</option>)}
                      </select>
                    </div>
                    {isGestionnaire && (
                      <div><label className={label}>Propriétaire du logement</label>
                        <select className={input} value={csvClientId} onChange={e => setCsvClientId(e.target.value)}>
                          <option value="">Moi-même (compte courant)</option>
                          {fideicommisClients.map(c => <option key={c.id} value={c.id}>{c.nom} — honoraires {c.tauxHonoraires}%</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  {buildings.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={label}>Immeuble (optionnel)</label>
                        <select className={input} value={csvBuildingId}
                          onChange={e => { setCsvBuildingId(e.target.value); setCsvUnitId(''); }}>
                          <option value="">— Aucun immeuble —</option>
                          {buildings.map(b => <option key={b.id} value={b.id}>{b.adresse}</option>)}
                        </select>
                      </div>
                      {csvBuildingId && csvAvailableUnits.length > 0 && (
                        <div>
                          <label className={label}>Unité / Porte</label>
                          <select className={input} value={csvUnitId} onChange={e => setCsvUnitId(e.target.value)}>
                            <option value="">— Toutes —</option>
                            {csvAvailableUnits.map(u => <option key={u.id} value={u.id}>{u.unitName}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  <label className={`flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${D ? 'border-zinc-700 hover:bg-zinc-800' : 'border-slate-300 hover:bg-slate-50'}`}>
                    <Upload size={22} className={D ? 'text-zinc-500' : 'text-slate-400'} />
                    <span className={`text-[10px] font-black uppercase tracking-wider ${D ? 'text-zinc-400' : 'text-slate-500'}`}>Choisir le fichier CSV</span>
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }} />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Column mapping */}
                  <div className={`p-4 rounded-2xl ${D ? 'bg-zinc-800/60' : 'bg-slate-50'}`}>
                    <h3 className={`text-[9px] font-black uppercase tracking-widest mb-3 ${D?'text-zinc-400':'text-slate-400'}`}>Correspondance des colonnes — vérifiez avant d'importer</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={label}>Nom du voyageur</label>
                        <select className={input} value={csvMap.guest ?? ''} onChange={e => setCsvMap(m => ({...m, guest: e.target.value === '' ? null : +e.target.value}))}>
                          <option value="">— Aucune —</option>
                          {csvHeaders.map((h,i) => <option key={i} value={i}>{h}</option>)}
                        </select></div>
                      <div><label className={label}>Montant</label>
                        <select className={input} value={csvMap.amount ?? ''} onChange={e => setCsvMap(m => ({...m, amount: e.target.value === '' ? null : +e.target.value}))}>
                          <option value="">— Aucune —</option>
                          {csvHeaders.map((h,i) => <option key={i} value={i}>{h}</option>)}
                        </select></div>
                      <div><label className={label}>Date d'arrivée</label>
                        <select className={input} value={csvMap.checkIn ?? ''} onChange={e => setCsvMap(m => ({...m, checkIn: e.target.value === '' ? null : +e.target.value}))}>
                          <option value="">— Aucune —</option>
                          {csvHeaders.map((h,i) => <option key={i} value={i}>{h}</option>)}
                        </select></div>
                      <div><label className={label}>Date de départ</label>
                        <select className={input} value={csvMap.checkOut ?? ''} onChange={e => setCsvMap(m => ({...m, checkOut: e.target.value === '' ? null : +e.target.value}))}>
                          <option value="">— Aucune —</option>
                          {csvHeaders.map((h,i) => <option key={i} value={i}>{h}</option>)}
                        </select></div>
                    </div>
                    <label className="flex items-center gap-2 mt-3 cursor-pointer">
                      <input type="checkbox" checked={csvMap.amountIsTotal} onChange={e => setCsvMap(m => ({...m, amountIsTotal: e.target.checked}))} />
                      <span className={`text-[10px] font-semibold ${D?'text-zinc-400':'text-slate-500'}`}>Le montant est le total du séjour (décoché = tarif par nuit)</span>
                    </label>
                  </div>

                  {/* Preview table */}
                  <div className={`rounded-2xl border overflow-hidden ${D ? 'border-zinc-800' : 'border-slate-200'}`}>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-[10px]">
                        <thead className={`sticky top-0 ${D ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                          <tr>
                            <th className="p-2 text-left w-8"></th>
                            <th className="p-2 text-left">Voyageur</th>
                            <th className="p-2 text-left">Arrivée</th>
                            <th className="p-2 text-left">Départ</th>
                            <th className="p-2 text-right">Nuits</th>
                            <th className="p-2 text-right">Tarif/nuit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.map((r, i) => (
                            <tr key={i} className={`border-t ${D ? 'border-zinc-800' : 'border-slate-100'} ${!r.valid ? (D ? 'bg-rose-500/10' : 'bg-rose-50') : ''}`}>
                              <td className="p-2">
                                <input type="checkbox" checked={csvIncluded[i] ?? true} disabled={!r.valid}
                                  onChange={e => setCsvIncluded(prev => prev.map((v,idx) => idx===i ? e.target.checked : v))} />
                              </td>
                              <td className="p-2">{r.guestName || <span className="text-rose-500">manquant</span>}</td>
                              <td className="p-2">{r.checkIn || <span className="text-rose-500">invalide</span>}</td>
                              <td className="p-2">{r.checkOut || <span className="text-rose-500">invalide</span>}</td>
                              <td className="p-2 text-right">{r.nights || '—'}</td>
                              <td className="p-2 text-right">{r.nightlyRate ? r.nightlyRate.toFixed(2) + ' $' : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className={`text-[10px] ${D?'text-zinc-500':'text-slate-400'}`}>
                    {csvValidCount} réservation(s) valide(s) et sélectionnée(s) sur {csvPreview.length} ligne(s) lues. Les lignes en rouge ont une correspondance de colonne incorrecte — ajustez les menus ci-dessus.
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button onClick={() => { setShowCsvImport(false); resetCsvState(); }} className={`flex-1 py-3 rounded-2xl border text-[10px] font-black uppercase ${D?'border-zinc-700 text-zinc-400':'border-slate-200 text-slate-500'}`}>Annuler</button>
                {csvHeaders.length > 0 && (
                  <button onClick={runCsvImport} disabled={csvValidCount === 0 || isImportingCsv}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2">
                    {isImportingCsv ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Importer {csvValidCount > 0 ? csvValidCount : ''} réservation{csvValidCount !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
