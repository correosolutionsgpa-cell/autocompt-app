import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Users, TrendingUp, DollarSign, FileText, Shield,
  ChevronDown, ChevronRight, Search, Filter, Download, Send,
  CheckCircle2, XCircle, Clock, AlertTriangle, Zap, Star,
  BarChart2, PieChart as PieIcon, RefreshCw, Mail, Phone,
  Building2, Calendar, Plus, Eye, Ban, Edit3, Receipt,
  Sparkles, Globe, LogOut, Bell, Settings, Trash2, Loader2, AlertOctagon,
  Cloud, CloudOff, Unlock, Lock,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { dataService, type BetaCodeDoc, type PlatformInvoiceDoc } from '../lib/dataService';
import { autocomptLogoWhiteBase64 } from '../assets/brand/autocomptLogoWhiteBase64';
import { TRIAL_EXTENSION_FORM_URL } from './modals/TrialExpiredModal';
import { isSuperAdminEmail } from '../lib/superAdmin';

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = 'beta' | 'gratuit' | 'basique' | 'pro' | 'integral' | 'superadmin';
type UserStatus = 'active' | 'beta' | 'trial' | 'cancelled' | 'suspended';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  status: UserStatus;
  company: string;
  industry: string;
  since: string;
  lastActive?: string;
  mrr: number;
  docsSignedCount?: number;
  phone?: string;
  city?: string;
  createdAt?: string;
  trialStartDate?: string;
  trialValidDays?: number;
  /** Narrow delegated access to BetaCodeAdminView (generate/list beta codes
   *  only) — granted per-account here, never self-service. Does NOT imply
   *  any of SuperAdmin's other access. */
  canGenerateBetaCodes?: boolean;
  /** Manual per-account switch — false blocks that user from uploading
   *  anything to Google Drive app-wide (see uploadToDrive's guard in
   *  App.tsx), while leaving read/view access untouched. Undefined means
   *  enabled (default) — only accounts explicitly restricted here are
   *  affected, so nothing changes for existing users. Designed first as a
   *  manual SuperAdmin toggle; intended to later back an automatic rule for
   *  accounts that arrive via a comptable/gestionnaire invitation. */
  driveEnabled?: boolean;
  /** Beta plan normally locks every profile except the one chosen at
   *  onboarding (see the "profil verrouillé" upsell message) — a QA tester
   *  needs every profile open on one account instead of juggling a separate
   *  beta code per profile. Toggle here writes the full profile list to
   *  users/{uid}.unlockedProfiles, same field SettingsView already reads. */
  unlockedProfiles?: string[];
  /** Profile chosen at onboarding (users/{uid}.selectedProfile) — shown so
   *  Fabiola can see what each account actually uses without opening it. */
  selectedProfile?: string;
  /** Manual per-account switch — turns on the floating active-time counter
   *  (GlobalWorkHoursHost) for this account. Never tied to a specific person
   *  in code; any account can be flagged (e.g. a paid contractor). */
  trackWorkHours?: boolean;
}

const ALL_PROFILE_IDS = ["prospecteur", "investisseur", "flippeur", "gestionnaire", "syndicat", "comptable"];

const PROFILE_LABELS: Record<string, string> = {
  prospecteur: "Prospecteur Immobilier",
  investisseur: "Investisseur Immobilier",
  flippeur: "Flippeur Immobilier",
  gestionnaire: "Gestionnaire Immobilier",
  syndicat: "Syndicat de Copropriété",
  comptable: "Comptable",
};

interface OwnedCompany {
  id: string;
  nombre: string;
  companyProfile?: string;
}

interface SuperAdminPanelProps {
  darkMode: boolean;
  onBack: () => void;
  adminName?: string;
  adminEmail?: string;
}

// ─── Plan config ──────────────────────────────────────────────────────────────
const PLAN_CONFIG: Record<Plan, { label: string; color: string; bg: string; price: number }> = {
  beta:       { label: 'Bêta',     color: 'text-violet-600', bg: 'bg-violet-100',  price: 0 },
  gratuit:    { label: 'Gratuit',  color: 'text-slate-500',  bg: 'bg-slate-100',   price: 0 },
  basique:    { label: 'Basique',  color: 'text-blue-600',   bg: 'bg-blue-100',    price: 29 },
  pro:        { label: 'Pro',      color: 'text-emerald-600',bg: 'bg-emerald-100', price: 59 },
  integral:   { label: 'Intégral', color: 'text-amber-600',  bg: 'bg-amber-100',   price: 99 },
  superadmin: { label: 'Owner',    color: 'text-rose-600',   bg: 'bg-rose-100',    price: 0 },
};

/** Days left on a trial, or null if the user isn't on a dated trial (founder/paid/no trialStartDate). */
function trialDaysLeft(u: { trialStartDate?: string; trialValidDays?: number }): number | null {
  if (!u.trialStartDate) return null;
  const validDays = u.trialValidDays ?? 30;
  const daysElapsed = (Date.now() - new Date(u.trialStartDate).getTime()) / 86400000;
  return Math.max(0, Math.ceil(validDays - daysElapsed));
}

/** Relative "dernière connexion" label. lastActive is only stamped starting
 *  2026-08-19 — accounts that haven't logged in since have no value yet. */
function formatLastActive(lastActive?: string): string {
  if (!lastActive) return 'Jamais (avant le suivi)';
  const ms = Date.now() - new Date(lastActive).getTime();
  const minutes = ms / 60000;
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${Math.floor(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `Il y a ${Math.floor(hours)} h`;
  const days = hours / 24;
  if (days < 30) return `Il y a ${Math.floor(days)} j`;
  return new Date(lastActive).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "En ligne maintenant" — App.tsx pings lastActive every 90s while the tab
 *  stays open and visible; a gap under 3 min tolerates one missed heartbeat
 *  (e.g. a brief network hiccup) without falsely showing offline. */
function formatWorkHoursTotal(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

function isOnlineNow(lastActive?: string): boolean {
  if (!lastActive) return false;
  return Date.now() - new Date(lastActive).getTime() < 3 * 60 * 1000;
}

/**
 * Real `users/{uid}` docs never had `name`/`plan`/`status`/`company`/`mrr` —
 * this whole AdminUser shape was designed against a schema no signup path
 * ever actually wrote. Every count/filter here (`plan === 'beta'`,
 * `status === 'beta'`, revenue by plan...) silently matched ZERO real users
 * — Fabiola saw "0 en bêta" despite several real beta signups, because
 * their real fields (betaCodeRedeemed, trialStartDate, adminName) just have
 * different names. Derives the AdminUser fields from what real docs
 * actually contain, instead of trusting fields that were never written.
 */
function mapFirestoreUserToAdminUser(uid: string, data: any): AdminUser {
  const isSuperAdmin = isSuperAdminEmail(data?.email);
  const isBeta = !!data?.betaCodeRedeemed || !!data?.trialStartDate;
  const plan: Plan = data?.plan || (isSuperAdmin ? 'superadmin' : isBeta ? 'beta' : 'gratuit');
  const status: UserStatus = data?.status || (isSuperAdmin ? 'active' : isBeta ? 'beta' : 'active');
  return {
    id: uid,
    name: data?.name || data?.adminName || data?.email || 'Utilisateur',
    email: data?.email || '',
    plan,
    status,
    company: data?.company || '',
    industry: data?.industry || '',
    since: data?.since || (data?.createdAt ? String(data.createdAt).slice(0, 10) : ''),
    lastActive: data?.lastActive,
    mrr: typeof data?.mrr === 'number' ? data.mrr : 0,
    docsSignedCount: data?.docsSignedCount,
    phone: data?.phone,
    city: data?.city,
    createdAt: data?.createdAt,
    trialStartDate: data?.trialStartDate,
    trialValidDays: data?.trialValidDays,
    canGenerateBetaCodes: data?.canGenerateBetaCodes,
    driveEnabled: data?.driveEnabled,
    unlockedProfiles: data?.unlockedProfiles,
    selectedProfile: data?.selectedProfile,
    trackWorkHours: data?.trackWorkHours,
  };
}

const STATUS_CONFIG: Record<UserStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active:    { label: 'Actif',     color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={11} /> },
  beta:      { label: 'Bêta',      color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200',   icon: <Sparkles size={11} /> },
  trial:     { label: 'Essai',     color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',       icon: <Clock size={11} /> },
  cancelled: { label: 'Annulé',    color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200',       icon: <XCircle size={11} /> },
  suspended: { label: 'Suspendu',  color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200',   icon: <Ban size={11} /> },
};

// ─── Sample data (shown when Firestore is empty / loading) ───────────────────
const SAMPLE_USERS: AdminUser[] = [
  { id: '1', name: 'Fabiola Beatriz V.', email: 'correo.solutionsgpa@gmail.com', plan: 'superadmin', status: 'active', company: 'Solutions GPA Inc.', industry: 'Gestion Immobilière', since: '2025-01-01', mrr: 0, docsSignedCount: 14, city: 'Laval' },
  { id: '2', name: 'Natalia Ramos',      email: 'natalia@achatdirect.ca',        plan: 'pro',        status: 'active', company: 'AchatDirect',          industry: 'Prospection',          since: '2026-03-15', mrr: 59, docsSignedCount: 6,  city: 'Montréal' },
  { id: '3', name: 'Marc Tremblay',      email: 'marc@triplexmtl.ca',           plan: 'integral',   status: 'active', company: 'Triplex MTL',           industry: 'Plex',                 since: '2026-02-10', mrr: 99, docsSignedCount: 11, city: 'Montréal' },
  { id: '4', name: 'Sophie Gagnon',      email: 'sgagnon@renovpro.qc',          plan: 'basique',    status: 'trial',  company: 'RenovPro',              industry: 'Construction',         since: '2026-05-20', mrr: 0,  docsSignedCount: 2,  city: 'Québec' },
  { id: '5', name: 'Carlos Medina',      email: 'carlos@gpa-services.ca',       plan: 'beta',       status: 'beta',   company: 'GPA Services',          industry: 'Syndicat',             since: '2026-05-01', mrr: 0,  docsSignedCount: 0,  city: 'Laval' },
  { id: '6', name: 'Julie Leblanc',      email: 'jleblanc@immocorp.qc',         plan: 'pro',        status: 'active', company: 'ImmoCorp',              industry: 'Gestion Immobilière',  since: '2026-04-05', mrr: 59, docsSignedCount: 8,  city: 'Longueuil' },
  { id: '7', name: 'Ahmed Benali',       email: 'ahmed@plexinvest.ca',          plan: 'gratuit',    status: 'active', company: 'Plex Invest',           industry: 'Plex',                 since: '2026-05-28', mrr: 0,  docsSignedCount: 0,  city: 'Brossard' },
  { id: '8', name: 'Isabelle Roy',       email: 'iroy@syndicrose.ca',           plan: 'integral',   status: 'cancelled', company: 'Syndic Rose',        industry: 'Syndicat',             since: '2026-01-15', mrr: 0,  docsSignedCount: 3,  city: 'Verdun' },
];

// ─── Invoice PDF Generator ────────────────────────────────────────────────────
function generateInvoicePDF(user: AdminUser, invoiceNumber: string, adminName: string): jsPDF {
  // Real Firestore user docs don't always have `name`/`company` — jsPDF's
  // .text() throws on undefined, so every field drawn on the page needs a fallback.
  const safeName = user.name || user.email || 'Client';
  const safeCompany = user.company || '';
  const safeEmail = user.email || '';
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 18;
  const green: [number, number, number] = [5, 150, 105];
  const dark: [number, number, number] = [15, 23, 42];

  // Header
  pdf.setFillColor(...green);
  pdf.rect(0, 0, W, 38, 'F');
  // Rounded-square "squircle" frame around the logo, app-icon style — outline only.
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(M - 1.5, 5, 15, 15, 4, 4, 'S');
  pdf.addImage(autocomptLogoWhiteBase64, 'PNG', M - 0.7, 5.5, 13.4, 14);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('AutoCompt', M + 18, 18);
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('Plateforme de Gestion Immobilière & Comptabilité Québec', M, 25);
  pdf.text(`FACTURE N° ${invoiceNumber}`, W - M, 18, { align: 'right' });
  pdf.text(`Date: ${new Date().toLocaleDateString('fr-CA')}`, W - M, 25, { align: 'right' });

  // Bill to
  pdf.setTextColor(...dark);
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('FACTURÉ À:', M, 52);
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(safeName, M, 59);
  pdf.setFontSize(9);
  pdf.text(safeCompany, M, 65);
  pdf.text(safeEmail, M, 71);
  if (user.city) pdf.text(user.city + ', Québec, Canada', M, 77);

  // From
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('DE LA PART DE:', W / 2 + 10, 52);
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.text('Gestions Solutions G.PA INC.', W / 2 + 10, 58);
  pdf.setFontSize(7);
  pdf.text('1841 rue Le Royer, Laval (Québec) H7M2S4', W / 2 + 10, 63);
  pdf.text('NEQ: 1179999900', W / 2 + 10, 67);
  pdf.text('N° TPS/TVH: 75385 8620 RT 0001', W / 2 + 10, 71);
  pdf.text('N° TVQ: 12 3186 5353 TQ 0001', W / 2 + 10, 75);
  pdf.text('+1 514 659 7218 · correo.solutionsgpa@gmail.com', W / 2 + 10, 79);
  pdf.text('www.autocompt.ca', W / 2 + 10, 83);

  // Separator
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(M, 92, W - M, 92);

  // Table header
  pdf.setFillColor(248, 250, 252);
  pdf.rect(M, 96, W - M * 2, 9, 'F');
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('DESCRIPTION', M + 3, 102);
  pdf.text('PÉRIODE', 120, 102);
  pdf.text('MONTANT', W - M - 3, 102, { align: 'right' });

  // Table row
  const planConf = PLAN_CONFIG[user.plan] || PLAN_CONFIG.beta;
  const price = planConf.price;
  const monthName = new Date().toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...dark);
  pdf.text(`Abonnement AutoCompt ${planConf.label}`, M + 3, 113);
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Accès plateforme, DocuLegal, IA Sofi, Signature électronique', M + 3, 119);
  pdf.setTextColor(...dark);
  pdf.setFontSize(9);
  pdf.text(monthName, 120, 113);
  pdf.text(`${price.toFixed(2)} $`, W - M - 3, 113, { align: 'right' });

  pdf.setDrawColor(226, 232, 240);
  pdf.line(M, 125, W - M, 125);

  // Totals
  const tps = parseFloat((price * 0.05).toFixed(2));
  const tvq = parseFloat((price * 0.09975).toFixed(2));
  const total = price + tps + tvq;

  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Sous-total:', W - M - 40, 135);
  pdf.text(`${price.toFixed(2)} $`, W - M - 3, 135, { align: 'right' });
  pdf.text('TPS (5%):', W - M - 40, 142);
  pdf.text(`${tps.toFixed(2)} $`, W - M - 3, 142, { align: 'right' });
  pdf.text('TVQ (9.975%):', W - M - 40, 149);
  pdf.text(`${tvq.toFixed(2)} $`, W - M - 3, 149, { align: 'right' });

  pdf.setFillColor(...green);
  pdf.rect(W - M - 60, 154, 60 - M + M, 12, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('TOTAL DÛ:', W - M - 40, 162);
  pdf.text(`${total.toFixed(2)} $`, W - M - 3, 162, { align: 'right' });

  // Footer
  pdf.setFillColor(...green);
  pdf.rect(0, 277, W, 20, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('Merci de votre confiance. Paiement dû dans 30 jours. www.autocompt.ca', W / 2, 285, { align: 'center' });
  pdf.text('AutoCompt © Gestions Solutions G.PA INC. — NEQ: 1179999900 — TPS: 75385 8620 RT 0001 — TVQ: 12 3186 5353 TQ 0001', W / 2, 291, { align: 'center' });

  return pdf;
}

// ─── Filter dropdown — replaces the native <select> filters (AutoCompt's UI
// never uses the browser's own select styling; button + panel everywhere).
function FilterDropdown<T extends string>({
  value, options, onChange, darkMode,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  darkMode: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);
  const current = options.find(o => o.value === value);
  const D = darkMode;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition-colors ${
          D ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
        }`}
      >
        {current?.label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute z-20 mt-1.5 min-w-full w-max max-h-64 overflow-y-auto rounded-2xl border shadow-lg py-1 ${D ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                o.value === value
                  ? (D ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                  : (D ? 'text-zinc-300 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-50')
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminPanel({ darkMode, onBack, adminName = 'Fabiola Beatriz', adminEmail = '' }: SuperAdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'billing' | 'doculegal' | 'ia' | 'codes' | 'maintenance'>('overview');
  const [betaCodes, setBetaCodes] = useState<BetaCodeDoc[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [newCodeEmail, setNewCodeEmail] = useState('');
  const [generatingCode, setGeneratingCode] = useState<'trial' | 'extension' | null>(null);
  const [sendingCodeEmail, setSendingCodeEmail] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>(SAMPLE_USERS);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<Plan | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<UserStatus | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [invoiceUser, setInvoiceUser] = useState<AdminUser | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [aiEvents, setAiEvents] = useState<{ profile: string; feature: string; userEmail?: string; createdAt: string }[]>([]);
  const [loadingAiEvents, setLoadingAiEvents] = useState(false);
  const [moduleEvents, setModuleEvents] = useState<{ ownerId: string; vista: string; userEmail?: string; createdAt: string }[]>([]);
  const [loadingModuleEvents, setLoadingModuleEvents] = useState(false);
  const [platformInvoices, setPlatformInvoices] = useState<PlatformInvoiceDoc[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [companiesByOwner, setCompaniesByOwner] = useState<Record<string, OwnedCompany[]>>({});
  const [signedDocsByOwner, setSignedDocsByOwner] = useState<Record<string, { docTitle: string; url: string; createdAt: string }[]>>({});
  const [workHoursSecondsByOwner, setWorkHoursSecondsByOwner] = useState<Record<string, number>>({});
  const [expandedSignedOwner, setExpandedSignedOwner] = useState<string | null>(null);

  const D = darkMode;

  // Load from Firestore
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const snap = await getDocs(collection(db, 'users'));
        if (!snap.empty) {
          const loaded: AdminUser[] = snap.docs.map(d => mapFirestoreUserToAdminUser(d.id, d.data()));
          setUsers(loaded);
        }
        // else keep sample data
      } catch {
        // Firestore unavailable — show sample data
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, [refreshTick]);

  // Every company ever created, grouped by ownerId — including companies
  // created from a beta code Fabiola didn't personally generate (e.g. a
  // second company an already-activated account spun up on its own). Needs
  // firestore.rules' companies read to allow isSuperAdmin(); without that
  // this query silently returns only companies Fabiola herself owns.
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const snap = await getDocs(collection(db, 'companies'));
        const grouped: Record<string, OwnedCompany[]> = {};
        snap.docs.forEach(d => {
          const data = d.data();
          const ownerId = data?.ownerId;
          if (!ownerId) return;
          if (!grouped[ownerId]) grouped[ownerId] = [];
          grouped[ownerId].push({ id: d.id, nombre: data?.nombre || data?.companyName || '(sans nom)', companyProfile: data?.companyProfile });
        });
        setCompaniesByOwner(grouped);
      } catch {
        // Rules will reject this for non-superadmin accounts — fail silently.
      }
    };
    loadCompanies();
  }, [refreshTick]);

  // Real signed-document count (DocuLegal registry) — `docsSignedCount` on
  // AdminUser was read from users/{uid}.docsSignedCount, a field nothing in
  // the app ever writes (only present in SAMPLE_USERS demo data), so the
  // registry always showed 0 real signatures regardless of how many
  // contracts were actually signed. The real signed documents live in
  // `pendingSignatures` (status: 'signed'), keyed by the company owner's
  // uid via `ownerId` — see PublicSignaturePage.tsx. Docs created before
  // 2026-08-12 predate the ownerId field and are grouped under '' (shown
  // as "Compte inconnu (document créé avant août 2026)").
  useEffect(() => {
    const loadSignedDocs = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'pendingSignatures'), where('status', '==', 'signed')));
        const grouped: Record<string, { docTitle: string; url: string; createdAt: string }[]> = {};
        snap.docs.forEach(d => {
          const data = d.data();
          const ownerId = data?.ownerId || '';
          // Prefer the actual signed copy (persisted after Drive upload —
          // see PublicSignaturePage.tsx / finalize-signature-group); older
          // documents signed before that fix only have the original
          // (unsigned) document link, which is still better than nothing.
          const url = data?.signedPdfUrl || data?.customDocUrl || data?.pdfStorageUrl || '';
          if (!grouped[ownerId]) grouped[ownerId] = [];
          grouped[ownerId].push({ docTitle: data?.docTitle || 'Document sans titre', url, createdAt: data?.clientSignedAt || data?.createdAt || '' });
        });
        setSignedDocsByOwner(grouped);
      } catch {
        // Fails silently for non-superadmin accounts, same as the other panels.
      }
    };
    loadSignedDocs();
  }, [refreshTick]);

  // Total active-time (all days summed) per account flagged trackWorkHours —
  // see WorkHoursContext.tsx for how each doc gets ticked.
  useEffect(() => {
    const loadWorkHours = async () => {
      try {
        const snap = await getDocs(collection(db, 'workHoursLog'));
        const totals: Record<string, number> = {};
        snap.docs.forEach(d => {
          const data = d.data();
          const uid = data?.uid;
          if (!uid) return;
          totals[uid] = (totals[uid] || 0) + (data?.activeSeconds || 0);
        });
        setWorkHoursSecondsByOwner(totals);
      } catch {
        // Fails silently for non-superadmin accounts, same as the other panels.
      }
    };
    loadWorkHours();
  }, [refreshTick]);

  // Load AI usage events (only once the tab has been opened — `read` is
  // superadmin-gated by firestore.rules, cheap to skip until needed). Also
  // loaded on 'billing' since the financial summary there needs the cost total.
  useEffect(() => {
    if (activeTab !== 'ia' && activeTab !== 'billing') return;
    const loadAiEvents = async () => {
      setLoadingAiEvents(true);
      try {
        const snap = await getDocs(collection(db, 'aiUsageEvents'));
        setAiEvents(snap.docs.map(d => d.data() as { profile: string; feature: string; userEmail?: string; createdAt: string }));
      } catch {
        // Rules will reject this for non-superadmin accounts — fail silently.
      } finally {
        setLoadingAiEvents(false);
      }
    };
    loadAiEvents();
  }, [activeTab, refreshTick]);

  // Load module usage events (which screens accounts actually visit) — only
  // needed on 'ia' (top modules chart) and 'users' (per-account top modules
  // in the detail modal), same lazy-load reasoning as aiEvents above.
  useEffect(() => {
    if (activeTab !== 'ia' && activeTab !== 'users') return;
    const loadModuleEvents = async () => {
      setLoadingModuleEvents(true);
      try {
        const snap = await getDocs(collection(db, 'moduleUsageEvents'));
        setModuleEvents(snap.docs.map(d => d.data() as { ownerId: string; vista: string; userEmail?: string; createdAt: string }));
      } catch {
        // Rules will reject this for non-superadmin accounts — fail silently.
      } finally {
        setLoadingModuleEvents(false);
      }
    };
    loadModuleEvents();
  }, [activeTab, refreshTick]);

  // Load the platform invoice history (SuperAdmin-only, per firestore.rules).
  useEffect(() => {
    if (activeTab !== 'billing') return;
    const loadInvoices = async () => {
      setLoadingInvoices(true);
      try {
        setPlatformInvoices(await dataService.fetchPlatformInvoices());
      } catch {
        // Rules will reject this for non-superadmin accounts — fail silently.
      } finally {
        setLoadingInvoices(false);
      }
    };
    loadInvoices();
  }, [activeTab, refreshTick]);

  // Load beta access codes (only once the tab has been opened — `list` is
  // superadmin-gated by firestore.rules, cheap to skip until needed).
  useEffect(() => {
    if (activeTab !== 'codes') return;
    const loadCodes = async () => {
      setLoadingCodes(true);
      try {
        setBetaCodes(await dataService.fetchBetaCodes());
      } catch {
        // Rules will reject this for non-superadmin accounts — fail silently.
      } finally {
        setLoadingCodes(false);
      }
    };
    loadCodes();
  }, [activeTab, refreshTick]);

  const toast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  /**
   * Grants an extra free month after the client has filled the extension
   * questionnaire (TRIAL_EXTENSION_FORM_URL) — adds 30 days to their current
   * trialValidDays rather than resetting trialStartDate, so it stacks
   * correctly even if this is granted more than once.
   */
  const handleExtendTrial = async (u: AdminUser) => {
    const currentValidDays = u.trialValidDays ?? 30;
    const newValidDays = currentValidDays + 30;
    try {
      await updateDoc(doc(db, 'users', u.id), { trialValidDays: newValidDays });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, trialValidDays: newValidDays } : x));
      toast(`Mois gratuit additionnel accordé à ${u.email}.`);
    } catch (err: any) {
      toast(`Échec : ${err.message}`, 'error');
    }
  };

  /**
   * Grants or revokes the narrow "generate beta codes" delegated role for a
   * QA tester's account — the only thing it unlocks is BetaCodeAdminView.
   * Toggle off any time to revoke, no other side effect.
   */
  const handleToggleBetaCodeAccess = async (u: AdminUser) => {
    const next = !u.canGenerateBetaCodes;
    try {
      await updateDoc(doc(db, 'users', u.id), { canGenerateBetaCodes: next });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, canGenerateBetaCodes: next } : x));
      toast(next ? `Accès Codes Bêta accordé à ${u.email}.` : `Accès Codes Bêta retiré de ${u.email}.`);
    } catch (err: any) {
      toast(`Échec : ${err.message}`, 'error');
    }
  };

  /**
   * Manual per-account Drive switch — false blocks that user from uploading
   * anything to Google Drive app-wide (enforced in uploadToDrive, App.tsx),
   * read/view access is untouched. Undefined/true means enabled.
   */
  const handleToggleDriveAccess = async (u: AdminUser) => {
    const next = u.driveEnabled === false; // currently disabled → re-enable; otherwise disable
    try {
      await updateDoc(doc(db, 'users', u.id), { driveEnabled: next });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, driveEnabled: next } : x));
      toast(next ? `Accès Drive réactivé pour ${u.email}.` : `Accès Drive désactivé pour ${u.email}.`);
    } catch (err: any) {
      toast(`Échec : ${err.message}`, 'error');
    }
  };

  /** Turns the floating active-time counter on/off for one account (never
   *  hardcoded to a specific person — any account can be flagged this way). */
  const handleToggleWorkHoursTracking = async (u: AdminUser) => {
    const next = !u.trackWorkHours;
    try {
      await updateDoc(doc(db, 'users', u.id), { trackWorkHours: next });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, trackWorkHours: next } : x));
      toast(next ? `Comptage des heures activé pour ${u.email}.` : `Comptage des heures désactivé pour ${u.email}.`);
    } catch (err: any) {
      toast(`Échec : ${err.message}`, 'error');
    }
  };

  /** All-or-nothing toggle: unlocks every profile for QA testing, or reverts
   *  to the normal beta restriction (only the account's original profile). */
  const handleToggleAllProfilesUnlocked = async (u: AdminUser) => {
    const isFullyUnlocked = (u.unlockedProfiles?.length ?? 0) >= ALL_PROFILE_IDS.length;
    const next = isFullyUnlocked ? [] : ALL_PROFILE_IDS;
    try {
      await updateDoc(doc(db, 'users', u.id), { unlockedProfiles: next });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, unlockedProfiles: next } : x));
      toast(isFullyUnlocked ? `Profils reverrouillés pour ${u.email}.` : `Tous les profils débloqués pour ${u.email} (test).`);
    } catch (err: any) {
      toast(`Échec : ${err.message}`, 'error');
    }
  };

  const [sendingInvoice, setSendingInvoice] = useState(false);

  /**
   * Issues the next sequential invoice number, downloads the PDF, and —
   * only when explicitly asked — emails it to the client via the same
   * Resend pipeline already used for DocuLegal signed documents.
   */
  const handleGenerateInvoice = async (user: AdminUser, alsoEmail: boolean) => {
    setSendingInvoice(true);
    try {
      const planConf = PLAN_CONFIG[user.plan] || PLAN_CONFIG.beta;
      const price = planConf.price;
      const tps = parseFloat((price * 0.05).toFixed(2));
      const tvq = parseFloat((price * 0.09975).toFixed(2));
      const total = parseFloat((price + tps + tvq).toFixed(2));
      const invoice = await dataService.issuePlatformInvoice({
        userId: user.id,
        userEmail: user.email || '',
        userName: user.name || user.email || 'Client',
        company: user.company || '',
        plan: user.plan || 'beta',
        subtotal: price,
        tps,
        tvq,
        total,
        issuedBy: adminName || '',
      });
      const pdf = generateInvoicePDF(user, invoice.invoiceNumber, adminName);
      pdf.save(`Facture_AutoCompt_${(user.name || 'client').replace(/\s+/g, '_')}_${invoice.invoiceNumber}.pdf`);

      if (alsoEmail) {
        if (!user.email) {
          toast(`Facture ${invoice.invoiceNumber} générée, mais aucun courriel n'est associé à ${user.name || user.id} — envoi annulé.`, 'error');
        } else {
          const pdfBase64 = pdf.output('datauristring').split(',')[1];
          const resp = await fetch('/api/send-invoice-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfBase64,
              clientEmail: user.email,
              clientName: user.name || user.email || '',
              adminEmail,
              invoiceNumber: invoice.invoiceNumber,
              planLabel: planConf.label,
              total,
            }),
          });
          const result = await resp.json().catch(() => ({ success: false }));
          if (result.success) {
            toast(`Facture ${invoice.invoiceNumber} générée et envoyée à ${user.email} ✅`);
          } else {
            toast(`Facture ${invoice.invoiceNumber} générée, mais l'envoi par courriel a échoué.`, 'error');
          }
        }
      } else {
        toast(`Facture ${invoice.invoiceNumber} générée pour ${user.name} ✅`);
      }
    } catch (e) {
      toast('Erreur lors de la génération de la facture — réessayez.', 'error');
    } finally {
      setSendingInvoice(false);
      setInvoiceUser(null);
      setRefreshTick(t => t + 1);
    }
  };

  // Computed metrics
  const activeUsers = users.filter(u => u.status === 'active' || u.status === 'beta');
  const payingUsers = users.filter(u => u.mrr > 0);
  const mrr = users.reduce((sum, u) => sum + (u.mrr || 0), 0);
  const arr = mrr * 12;
  const betaUsers = users.filter(u => u.plan === 'beta' || u.status === 'beta');
  const cancelledUsers = users.filter(u => u.status === 'cancelled');
  const totalDocsSigned = Object.values(signedDocsByOwner).reduce((sum, docs) => sum + docs.length, 0);

  const planBreakdown = Object.entries(PLAN_CONFIG).map(([plan, conf]) => ({
    plan: plan as Plan,
    label: conf.label,
    count: users.filter(u => u.plan === plan).length,
    revenue: users.filter(u => u.plan === plan).reduce((s, u) => s + u.mrr, 0),
    color: conf.color,
    bg: conf.bg,
  })).filter(p => p.count > 0);

  // Filter users
  const filteredUsers = users.filter(u => {
    // Fields aren't guaranteed on every account (e.g. a doc created before
    // the email field was stamped on login) — matching against "" instead of
    // undefined avoids crashing the whole list the moment anyone types a
    // search query, which silently hid every user (not just the one with a
    // missing field) once it happened.
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery ||
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.company || "").toLowerCase().includes(q);
    const matchPlan = filterPlan === 'all' || u.plan === filterPlan;
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  }).sort((a, b) => {
    // Users whose trial is about to expire bubble to the top, so they're
    // never buried in the list when doing a quick daily follow-up check.
    const da = trialDaysLeft(a);
    const db_ = trialDaysLeft(b);
    if (da === null && db_ === null) return 0;
    if (da === null) return 1;
    if (db_ === null) return -1;
    return da - db_;
  });

  const card = `${D ? 'bg-zinc-900/70 border-zinc-800' : 'bg-white border-slate-200'} rounded-3xl border shadow-sm p-6`;

  // ── Tab: Overview ──────────────────────────────────────────────────────────
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Users size={20} />, label: 'Utilisateurs actifs', value: activeUsers.length.toString(), sub: `${betaUsers.length} en bêta`, color: 'indigo' },
          { icon: <TrendingUp size={20} />, label: 'MRR', value: `${mrr} $`, sub: `ARR: ${arr.toLocaleString()} $`, color: 'emerald' },
          { icon: <Star size={20} />, label: 'Abonnés payants', value: payingUsers.length.toString(), sub: `${cancelledUsers.length} annulés`, color: 'amber' },
          { icon: <FileText size={20} />, label: 'Docs signés (total)', value: totalDocsSigned.toString(), sub: 'Via DocuLegal', color: 'violet' },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={card}>
            <div className={`inline-flex p-2.5 rounded-2xl mb-3 ${
              kpi.color === 'indigo' ? (D ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') :
              kpi.color === 'emerald' ? (D ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') :
              kpi.color === 'amber' ? (D ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600') :
              (D ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600')
            }`}>{kpi.icon}</div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{kpi.label}</p>
            <p className="text-2xl font-black mt-1 tracking-tight">{kpi.value}</p>
            <p className={`text-[10px] font-medium mt-0.5 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Plan breakdown + Recent signups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan breakdown */}
        <div className={card}>
          <h3 className={`text-[10px] font-black uppercase tracking-widest mb-5 ${D ? 'text-zinc-400' : 'text-slate-400'}`}>Répartition par forfait</h3>
          <div className="space-y-3">
            {planBreakdown.map(p => (
              <div key={p.plan} className="flex items-center gap-3">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${p.bg} ${p.color}`}>{p.label}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(5, (p.count / users.length) * 100)}%` }} />
                </div>
                <span className={`text-[10px] font-bold w-6 text-right ${D ? 'text-zinc-300' : 'text-slate-700'}`}>{p.count}</span>
                {p.revenue > 0 && <span className="text-[9px] font-bold text-emerald-600">{p.revenue} $/m</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Top paying clients */}
        <div className={card}>
          <h3 className={`text-[10px] font-black uppercase tracking-widest mb-5 ${D ? 'text-zinc-400' : 'text-slate-400'}`}>Top clients payants</h3>
          <div className="space-y-3">
            {users.filter(u => u.mrr > 0).sort((a, b) => b.mrr - a.mrr).slice(0, 5).map((u, i) => (
              <div key={u.id} className="flex items-center gap-3">
                <span className={`text-[10px] font-black text-slate-400 w-4`}>{i + 1}</span>
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-black text-white">{(u.name || u.email || '?')[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-bold truncate ${D ? 'text-zinc-200' : 'text-slate-800'}`}>{u.name}</p>
                  <p className={`text-[9px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{u.company}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black text-emerald-600">{u.mrr} $</p>
                  <p className={`text-[8px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>/mois</p>
                </div>
                <button onClick={() => { setSelectedUser(u); setShowUserModal(true); }}
                  className={`p-1.5 rounded-lg ${D ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-slate-100 text-slate-400'} transition-colors`}>
                  <Eye size={13} />
                </button>
              </div>
            ))}
            {payingUsers.length === 0 && (
              <p className={`text-[11px] ${D ? 'text-zinc-500' : 'text-slate-400'} text-center py-4`}>
                Données en cours de chargement depuis Firestore...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className={card}>
        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${D ? 'text-zinc-400' : 'text-slate-400'}`}>Actions rapides</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { icon: <Mail size={14} />, label: 'Envoyer newsletter bêta', color: 'indigo' },
            { icon: <Receipt size={14} />, label: 'Générer toutes les factures', color: 'emerald' },
            { icon: <RefreshCw size={14} />, label: 'Rafraîchir données', color: 'slate', action: () => setRefreshTick(t => t + 1) },
            { icon: <Download size={14} />, label: 'Exporter CSV utilisateurs', color: 'violet' },
          ].map((a, i) => (
            <button key={i} onClick={a.action}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                a.color === 'indigo' ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200' :
                a.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' :
                a.color === 'violet' ? 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200' :
                D ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}>
              {a.icon}<span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Tab: Users ──────────────────────────────────────────────────────────────
  const UsersTab = () => (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className={`${card} !p-4 flex flex-wrap gap-3 items-center`}>
        <div className={`flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-2xl border ${D ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-50 border-slate-200'}`}>
          <Search size={14} className={D ? 'text-zinc-500' : 'text-slate-400'} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher utilisateur, email, entreprise..."
            className={`bg-transparent text-[11px] font-medium flex-1 outline-none ${D ? 'placeholder-zinc-600' : 'placeholder-slate-400'}`} />
        </div>
        <FilterDropdown<Plan | 'all'>
          value={filterPlan}
          onChange={setFilterPlan}
          darkMode={D}
          options={[{ value: 'all', label: 'Tous les forfaits' }, ...Object.entries(PLAN_CONFIG).map(([k, v]) => ({ value: k as Plan, label: v.label }))]}
        />
        <FilterDropdown<UserStatus | 'all'>
          value={filterStatus}
          onChange={setFilterStatus}
          darkMode={D}
          options={[{ value: 'all', label: 'Tous les statuts' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k as UserStatus, label: v.label }))]}
        />
        <span className={`text-[9px] font-bold ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{filteredUsers.length} résultats</span>
      </div>

      {/* Users table */}
      <div className={`${card} !p-0 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${D ? 'border-zinc-800 bg-zinc-950/50' : 'border-slate-100 bg-slate-50'}`}>
                {['Utilisateur', 'Entreprises créées', 'Profil actif', 'Forfait', 'Statut', 'Essai', 'Depuis', 'Dernière connexion', 'MRR', 'Actions'].map(h => (
                  <th key={h} className={`px-5 py-3.5 text-left text-[9px] font-black uppercase tracking-widest ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, i) => {
                const displayName = u.name || u.email || '(sans nom)';
                const planConf = PLAN_CONFIG[u.plan] || PLAN_CONFIG.beta;
                const statusConf = STATUS_CONFIG[u.status] || STATUS_CONFIG.trial;
                const mrr = u.mrr || 0;
                return (
                  <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className={`border-b last:border-0 ${D ? 'border-zinc-800/50 hover:bg-zinc-900/40' : 'border-slate-50 hover:bg-slate-50/80'} transition-colors`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                            <span className="text-[10px] font-black text-white">{displayName[0].toUpperCase()}</span>
                          </div>
                          {isOnlineNow(u.lastActive) && (
                            <span title="En ligne maintenant" className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 ${D ? 'border-zinc-950' : 'border-white'}`} />
                          )}
                        </div>
                        <div>
                          <p className={`text-[11px] font-bold flex items-center gap-1.5 ${D ? 'text-zinc-200' : 'text-slate-800'}`}>
                            {displayName}
                            {isOnlineNow(u.lastActive) && <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500">● En ligne</span>}
                          </p>
                          <p className={`text-[9px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{u.email}</p>
                          <p className={`text-[9px] ${u.phone ? (D ? 'text-emerald-500' : 'text-emerald-600') : (D ? 'text-zinc-600' : 'text-slate-300')}`}>
                            {u.phone || 'Téléphone non vérifié'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {(() => {
                        const owned = companiesByOwner[u.id] || [];
                        if (owned.length === 0) {
                          return <p className={`text-[10px] ${D ? 'text-zinc-600' : 'text-slate-300'}`}>Aucune</p>;
                        }
                        return (
                          <div className="space-y-0.5">
                            {owned.map(c => (
                              <p key={c.id} className={`text-[10px] font-semibold ${D ? 'text-zinc-300' : 'text-slate-700'}`}>
                                {c.nombre}{c.companyProfile ? <span className={D ? 'text-zinc-500' : 'text-slate-400'}> · {PROFILE_LABELS[c.companyProfile] || c.companyProfile}</span> : null}
                              </p>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className={`text-[10px] font-semibold ${D ? 'text-zinc-300' : 'text-slate-700'}`}>
                        {(u.selectedProfile && PROFILE_LABELS[u.selectedProfile]) || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${planConf.bg} ${planConf.color}`}>
                        {planConf.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[9px] font-bold flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg border ${statusConf.bg} ${statusConf.color}`}>
                        {statusConf.icon}{statusConf.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {(() => {
                        const daysLeft = trialDaysLeft(u);
                        if (daysLeft === null) return <span className={`text-[10px] ${D ? 'text-zinc-600' : 'text-slate-300'}`}>—</span>;
                        const soon = daysLeft <= 5;
                        return (
                          <div className="space-y-1">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg w-fit block ${soon ? (D ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-700') : (D ? 'text-zinc-400' : 'text-slate-500')}`}>
                              {daysLeft} j restants
                            </span>
                            {soon && (
                              <button
                                onClick={() => handleExtendTrial(u)}
                                title="Accorder un mois gratuit additionnel"
                                className={`text-[8px] font-black uppercase tracking-wider underline ${D ? 'text-emerald-400' : 'text-emerald-600'}`}
                              >
                                +30 jours
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className={`text-[10px] font-semibold ${D ? 'text-zinc-400' : 'text-slate-600'}`}>
                        {u.since || u.createdAt
                          ? new Date(u.since || u.createdAt).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className={`text-[10px] font-semibold ${D ? 'text-zinc-400' : 'text-slate-600'}`}>
                        {formatLastActive(u.lastActive)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className={`text-[11px] font-black ${mrr > 0 ? 'text-emerald-600' : (D ? 'text-zinc-600' : 'text-slate-400')}`}>
                        {mrr > 0 ? `${mrr} $` : '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setSelectedUser(u); setShowUserModal(true); }}
                          title="Voir détails"
                          className={`p-1.5 rounded-lg transition-colors ${D ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                          <Eye size={13} />
                        </button>
                        <button onClick={() => { setInvoiceUser(u); }}
                          title="Générer facture"
                          className={`p-1.5 rounded-lg transition-colors ${D ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                          <Receipt size={13} />
                        </button>
                        <button onClick={() => handleToggleBetaCodeAccess(u)}
                          title={u.canGenerateBetaCodes ? "Retirer l'accès Codes Bêta (testeur)" : "Donner l'accès Codes Bêta (testeur) — génération de codes uniquement"}
                          className={`p-1.5 rounded-lg transition-colors ${u.canGenerateBetaCodes
                            ? (D ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
                            : (D ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-400')}`}>
                          <Sparkles size={13} />
                        </button>
                        <button onClick={() => handleToggleDriveAccess(u)}
                          title={u.driveEnabled === false ? "Réactiver l'accès Drive (peut de nouveau y sauvegarder)" : "Désactiver l'accès Drive (lecture seule — ne pourra plus rien y sauvegarder)"}
                          className={`p-1.5 rounded-lg transition-colors ${u.driveEnabled === false
                            ? (D ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-100 text-rose-600')
                            : (D ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-400')}`}>
                          {u.driveEnabled === false ? <CloudOff size={13} /> : <Cloud size={13} />}
                        </button>
                        <button onClick={() => handleToggleAllProfilesUnlocked(u)}
                          title={(u.unlockedProfiles?.length ?? 0) >= ALL_PROFILE_IDS.length ? "Reverrouiller les profils (retour au plan bêta normal)" : "Débloquer tous les profils sur ce compte (pour un testeur QA)"}
                          className={`p-1.5 rounded-lg transition-colors ${(u.unlockedProfiles?.length ?? 0) >= ALL_PROFILE_IDS.length
                            ? (D ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-100 text-indigo-600')
                            : (D ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-400')}`}>
                          {(u.unlockedProfiles?.length ?? 0) >= ALL_PROFILE_IDS.length ? <Unlock size={13} /> : <Lock size={13} />}
                        </button>
                        <button onClick={() => handleToggleWorkHoursTracking(u)}
                          title={u.trackWorkHours ? "Désactiver le comptage des heures actives" : "Activer le comptage des heures actives sur ce compte"}
                          className={`p-1.5 rounded-lg transition-colors ${u.trackWorkHours
                            ? (D ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-600')
                            : (D ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-400')}`}>
                          <Clock size={13} />
                        </button>
                        <button
                          title="Envoyer le courriel de prolongation (mois gratuit)"
                          onClick={() => {
                            const subject = "Obtenez 1 mois gratuit sur AutoCompt 🎁 (Votre avis est précieux)";
                            const body = `Bonjour ${displayName},

Votre période d'essai avec AutoCompt tire bientôt à sa fin. On espère que vous avez déjà pu constater à quel point l'automatisation de vos finances peut vous faire sauver un temps précieux au quotidien.

Notre but avec AutoCompt est simple : vous livrer une comptabilité tellement bien classée et avec tous les reçus en ordre, que les honoraires de votre comptable en fin d'année seront considérablement réduits.

Pour continuer à améliorer la plateforme, on a besoin de votre opinion. Prenez 2 minutes pour répondre à ce court sondage et on ajoutera 1 mois d'accès 100% gratuit à votre compte, en guise de remerciement.

${TRIAL_EXTENSION_FORM_URL}

Merci de nous aider à bâtir le meilleur outil pour vous !`;
                            window.open(`mailto:${u.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${D ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                          <Mail size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── Tab: Billing ────────────────────────────────────────────────────────────
  const BillingTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'MRR Total', value: `${mrr} $`, sub: 'Ce mois-ci', icon: <DollarSign size={18} />, color: 'emerald' },
          { label: 'ARR Projeté', value: `${(mrr * 12).toLocaleString()} $`, sub: 'Annuel estimé', icon: <TrendingUp size={18} />, color: 'indigo' },
          { label: 'Abonnés payants', value: payingUsers.length, sub: `Sur ${users.length} total`, icon: <Users size={18} />, color: 'amber' },
        ].map((m, i) => (
          <div key={i} className={card}>
            <div className={`inline-flex p-2.5 rounded-2xl mb-3 ${
              m.color === 'emerald' ? (D ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') :
              m.color === 'indigo' ? (D ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') :
              (D ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')
            }`}>{m.icon}</div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{m.label}</p>
            <p className="text-2xl font-black mt-1">{m.value}</p>
            <p className={`text-[10px] font-medium mt-0.5 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Invoice generator */}
      <div className={card}>
        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-5 ${D ? 'text-zinc-400' : 'text-slate-400'}`}>
          💳 Générateur de factures
        </h3>
        <div className="space-y-3">
          {users.filter(u => u.mrr > 0 || u.status !== 'cancelled').map(u => {
            const planConf = PLAN_CONFIG[u.plan] || PLAN_CONFIG.beta;
            return (
              <div key={u.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${D ? 'border-zinc-800 bg-zinc-900/40' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-[12px] font-bold ${D ? 'text-zinc-200' : 'text-slate-800'}`}>{u.name}</p>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${planConf.bg} ${planConf.color}`}>{planConf.label}</span>
                  </div>
                  <p className={`text-[10px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{u.email} · {u.company}</p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-[13px] font-black text-emerald-600">{planConf.price.toFixed(2)} $</p>
                  <p className={`text-[9px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>+ taxes</p>
                </div>
                <button
                  onClick={() => setInvoiceUser(u)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95">
                  <Download size={13} />
                  <span>Facture PDF</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial summary: revenue issued vs. estimated AI cost */}
      <div className={card}>
        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-5 ${D ? 'text-zinc-400' : 'text-slate-400'}`}>
          📊 Résumé — Facturé vs. Coût IA estimé
        </h3>
        {(() => {
          const totalInvoiced = platformInvoices.reduce((s, i) => s + (i.total || 0), 0);
          const totalAiCost = aiEvents.length * EST_COST_PER_SCAN_USD;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl ${D ? 'bg-zinc-900/40' : 'bg-slate-50/50'}`}>
                <p className={`text-[9px] font-black uppercase ${D ? 'text-zinc-500' : 'text-slate-400'}`}>Total facturé</p>
                <p className="text-xl font-black text-emerald-600 mt-1">{totalInvoiced.toFixed(2)} $</p>
              </div>
              <div className={`p-4 rounded-2xl ${D ? 'bg-zinc-900/40' : 'bg-slate-50/50'}`}>
                <p className={`text-[9px] font-black uppercase ${D ? 'text-zinc-500' : 'text-slate-400'}`}>Coût IA estimé</p>
                <p className="text-xl font-black text-amber-600 mt-1">${totalAiCost.toFixed(3)} USD</p>
              </div>
              <div className={`p-4 rounded-2xl ${D ? 'bg-zinc-900/40' : 'bg-slate-50/50'}`}>
                <p className={`text-[9px] font-black uppercase ${D ? 'text-zinc-500' : 'text-slate-400'}`}>Factures émises</p>
                <p className="text-xl font-black mt-1">{platformInvoices.length}</p>
              </div>
            </div>
          );
        })()}
        <p className={`text-[10px] mt-4 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>
          "Facturé" ≠ "encaissé" — ceci reflète les factures générées, pas les paiements réellement reçus. À croiser avec votre comptable pour la comptabilité officielle.
        </p>
      </div>

      {/* Invoice history — audit trail for the accountant */}
      <div className={card}>
        <div className="flex items-center justify-between mb-5">
          <h3 className={`text-[10px] font-black uppercase tracking-widest ${D ? 'text-zinc-400' : 'text-slate-400'}`}>
            🧾 Historique des factures
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setRefreshTick(t => t + 1)} className={`p-2 rounded-lg ${D ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}>
              <RefreshCw size={14} className={loadingInvoices ? 'animate-spin' : ''} />
            </button>
            {platformInvoices.length > 0 && (
              <button
                onClick={() => {
                  const headers = ['Numéro', 'Date', 'Client', 'Courriel', 'Compagnie', 'Plan', 'Sous-total', 'TPS', 'TVQ', 'Total', 'Émise par'];
                  const rows = platformInvoices.map(inv => [
                    inv.invoiceNumber,
                    new Date(inv.issuedAt).toLocaleDateString('fr-CA'),
                    inv.userName,
                    inv.userEmail,
                    inv.company,
                    inv.plan,
                    inv.subtotal.toFixed(2),
                    inv.tps.toFixed(2),
                    inv.tvq.toFixed(2),
                    inv.total.toFixed(2),
                    inv.issuedBy,
                  ]);
                  const csv = [headers, ...rows]
                    .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
                    .join('\r\n');
                  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Factures_AutoCompt_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all">
                <Download size={12} />
                <span>Exporter CSV</span>
              </button>
            )}
          </div>
        </div>

        {loadingInvoices && platformInvoices.length === 0 && (
          <p className={`text-[11px] ${D ? 'text-zinc-500' : 'text-slate-400'} text-center py-6`}>Chargement…</p>
        )}
        {!loadingInvoices && platformInvoices.length === 0 && (
          <p className={`text-[11px] ${D ? 'text-zinc-500' : 'text-slate-400'} text-center py-6`}>
            Aucune facture émise pour l'instant — le registre se remplit à chaque "Facture PDF" généré ci-dessus.
          </p>
        )}
        <div className="space-y-2">
          {platformInvoices.map(inv => (
            <div key={inv.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl ${D ? 'bg-zinc-900/30' : 'bg-slate-50/50'}`}>
              <span className={`text-[10px] font-mono font-black ${D ? 'text-zinc-400' : 'text-slate-500'}`}>{inv.invoiceNumber}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-bold truncate ${D ? 'text-zinc-200' : 'text-slate-800'}`}>{inv.userName || inv.userEmail}</p>
                <p className={`text-[9px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{new Date(inv.issuedAt).toLocaleDateString('fr-CA')} · {inv.plan}</p>
              </div>
              <span className="text-[12px] font-black text-emerald-600">{inv.total.toFixed(2)} $</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Tab: DocuLegal registry ─────────────────────────────────────────────────
  const DocuLegalTab = () => (
    <div className={card}>
      <h3 className={`text-[10px] font-black uppercase tracking-widest mb-5 ${D ? 'text-zinc-400' : 'text-slate-400'}`}>
        📋 Registre DocuLegal — Documents signés
      </h3>
      <div className="space-y-3">
        {Object.entries(signedDocsByOwner).sort((a, b) => b[1].length - a[1].length).map(([ownerId, docs]) => {
          const u = users.find(usr => usr.id === ownerId);
          const label = ownerId === '' ? 'Compte inconnu (document créé avant août 2026)' : (u?.name || u?.email || ownerId);
          const sub = ownerId === '' ? '' : (u ? ((companiesByOwner[ownerId] || []).map(c => c.nombre).join(', ') || u.email) : '');
          const isOpen = expandedSignedOwner === ownerId;
          return (
            <div key={ownerId || 'inconnu'} className={`rounded-2xl border overflow-hidden ${D ? 'border-zinc-800 bg-zinc-900/30' : 'border-slate-100 bg-slate-50/50'}`}>
              <button
                type="button"
                onClick={() => setExpandedSignedOwner(isOpen ? null : ownerId)}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-white">{label[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-bold truncate ${D ? 'text-zinc-200' : 'text-slate-800'}`}>{label}</p>
                  {sub && <p className={`text-[10px] truncate ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{sub}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1.5 rounded-xl ${D ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-700'} text-center`}>
                    <p className="text-[16px] font-black">{docs.length}</p>
                    <p className={`text-[8px] font-bold uppercase tracking-wider`}>docs signés</p>
                  </div>
                  <ChevronDown size={14} className={`shrink-0 transition-transform ${D ? 'text-zinc-500' : 'text-slate-400'} ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isOpen && (
                <div className={`px-4 pb-4 space-y-1.5 border-t ${D ? 'border-zinc-800' : 'border-slate-100'}`}>
                  {docs.map((doc, i) => (
                    <div key={i} className={`flex items-center justify-between gap-3 px-3 py-2 mt-1.5 rounded-xl ${D ? 'bg-zinc-900/50' : 'bg-white'}`}>
                      <div className="min-w-0">
                        <p className={`text-[11px] font-semibold truncate ${D ? 'text-zinc-300' : 'text-slate-700'}`}>{doc.docTitle}</p>
                        {doc.createdAt && <p className={`text-[9px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{new Date(doc.createdAt).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                      </div>
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${D ? 'bg-teal-500/15 text-teal-400 hover:bg-teal-500/25' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
                          <Eye size={11} /> Voir
                        </a>
                      ) : (
                        <span className={`shrink-0 text-[9px] font-bold ${D ? 'text-zinc-600' : 'text-slate-300'}`}>Lien indisponible</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {Object.keys(signedDocsByOwner).length === 0 && (
          <p className={`text-[11px] ${D ? 'text-zinc-500' : 'text-slate-400'} text-center py-6`}>
            Aucun document signé pour l'instant.
          </p>
        )}
        <div className={`mt-4 p-4 rounded-2xl ${D ? 'bg-zinc-900/50 border-zinc-800' : 'bg-emerald-50/50 border-emerald-100'} border text-center`}>
          <p className={`text-[11px] font-bold ${D ? 'text-zinc-400' : 'text-emerald-700'}`}>
            Total: <strong>{totalDocsSigned}</strong> documents signés via DocuLegal · Registre en temps réel depuis Firestore
          </p>
        </div>
      </div>
    </div>
  );

  // ── Tab: AI usage — cost tracking per profile ───────────────────────────────
  // (Reuses the module-level PROFILE_LABELS declared with AdminUser above —
  // used to declare a second, narrower copy here that silently shadowed it
  // and was missing "comptable".)
  // Gemini 2.5 Flash rate ($0.30 / $2.50 per 1M tokens) × an average receipt
  // scan (~1500 input tokens for the image + prompt, ~200 output tokens).
  // Rough estimate only — no real token count is logged per call.
  const EST_COST_PER_SCAN_USD = 0.00095;

  const IaUsageTab = () => {
    const byProfile = Object.entries(
      aiEvents.reduce((acc, e) => {
        acc[e.profile] = (acc[e.profile] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1]);

    const byUser = Object.entries(
      aiEvents.reduce((acc, e) => {
        const key = e.userEmail || '—';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const total = aiEvents.length;

    const byModule = Object.entries(
      moduleEvents.reduce((acc, e) => {
        acc[e.vista] = (acc[e.vista] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const moduleTotal = moduleEvents.length;

    return (
      <div className="space-y-5">
        <div className={card}>
          <div className="flex items-center justify-between mb-5">
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${D ? 'text-zinc-400' : 'text-slate-400'}`}>
              📊 Modules les plus utilisés — toutes les visites d'écran
            </h3>
            <button onClick={() => setRefreshTick(t => t + 1)} className={`p-2 rounded-lg ${D ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}>
              <RefreshCw size={14} className={loadingModuleEvents ? 'animate-spin' : ''} />
            </button>
          </div>
          {moduleTotal === 0 && !loadingModuleEvents && (
            <p className={`text-[11px] ${D ? 'text-zinc-500' : 'text-slate-400'} text-center py-6`}>
              Aucune visite enregistrée pour l'instant — le suivi a démarré le 19 août 2026, seules les visites depuis cette date apparaissent ici.
            </p>
          )}
          {moduleTotal > 0 && (
            <div className="space-y-2">
              {byModule.map(([mVista, count]) => (
                <div key={mVista} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${D ? 'bg-zinc-900/30' : 'bg-slate-50/50'}`}>
                  <span className={`text-[11px] font-semibold flex-1 truncate ${D ? 'text-zinc-300' : 'text-slate-700'}`}>{mVista}</span>
                  <div className={`h-1.5 rounded-full flex-1 max-w-[160px] overflow-hidden ${D ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.max(4, (count / byModule[0][1]) * 100)}%` }} />
                  </div>
                  <span className={`text-[10px] font-black shrink-0 ${D ? 'text-zinc-400' : 'text-slate-500'}`}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={card}>
          <div className="flex items-center justify-between mb-5">
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${D ? 'text-zinc-400' : 'text-slate-400'}`}>
              ⚡ Usage IA — Coût par profil (S.O.F.I. scan)
            </h3>
            <button onClick={() => setRefreshTick(t => t + 1)} className={`p-2 rounded-lg ${D ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}>
              <RefreshCw size={14} className={loadingAiEvents ? 'animate-spin' : ''} />
            </button>
          </div>

          {total === 0 && !loadingAiEvents && (
            <p className={`text-[11px] ${D ? 'text-zinc-500' : 'text-slate-400'} text-center py-6`}>
              Aucun scan enregistré pour l'instant — le compteur démarre dès le premier scan de facture.
            </p>
          )}

          {total > 0 && (
            <>
              <div className="space-y-3 mb-5">
                {byProfile.map(([profile, count]) => (
                  <div key={profile} className={`flex items-center gap-4 p-4 rounded-2xl border ${D ? 'border-zinc-800 bg-zinc-900/30' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex-1">
                      <p className={`text-[12px] font-bold ${D ? 'text-zinc-200' : 'text-slate-800'}`}>{PROFILE_LABELS[profile] || profile}</p>
                      <p className={`text-[10px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{((count / total) * 100).toFixed(0)}% des scans</p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl ${D ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'} text-center`}>
                      <p className="text-[16px] font-black">{count}</p>
                      <p className="text-[8px] font-bold uppercase tracking-wider">scans</p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl ${D ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'} text-center`}>
                      <p className="text-[13px] font-black">${(count * EST_COST_PER_SCAN_USD).toFixed(3)}</p>
                      <p className="text-[8px] font-bold uppercase tracking-wider">coût est.</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`p-4 rounded-2xl ${D ? 'bg-zinc-900/50 border-zinc-800' : 'bg-amber-50/50 border-amber-100'} border text-center`}>
                <p className={`text-[11px] font-bold ${D ? 'text-zinc-400' : 'text-amber-700'}`}>
                  Total: <strong>{total}</strong> scans · coût estimé <strong>${(total * EST_COST_PER_SCAN_USD).toFixed(3)}</strong> USD (Gemini 2.5 Flash) · estimation basée sur un scan moyen, pas sur les tokens réels
                </p>
              </div>
            </>
          )}
        </div>

        {byUser.length > 0 && (
          <div className={card}>
            <h3 className={`text-[10px] font-black uppercase tracking-widest mb-5 ${D ? 'text-zinc-400' : 'text-slate-400'}`}>
              👤 Coût IA par utilisateur — utile pour calibrer vos forfaits
            </h3>
            <div className="space-y-2">
              {byUser.map(([email, count]) => (
                <div key={email} className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl ${D ? 'bg-zinc-900/30' : 'bg-slate-50/50'}`}>
                  <span className={`text-[11px] truncate ${D ? 'text-zinc-300' : 'text-slate-700'}`}>{email}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{count} scans</span>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${D ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                      ${(count * EST_COST_PER_SCAN_USD).toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className={`text-[9px] mt-4 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>
              Estimation basée sur un scan moyen (Gemini 2.5 Flash), pas sur les tokens réels de chaque appel — utilisez comme ordre de grandeur, pas comme facturation exacte.
            </p>
          </div>
        )}
      </div>
    );
  };

  // ── Tab: Beta access codes ──────────────────────────────────────────────────
  const handleGenerateCode = async (kind: 'trial' | 'extension') => {
    const email = newCodeEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast('Entrez une adresse courriel valide.', 'error');
      return;
    }
    setGeneratingCode(kind);
    try {
      const code = await dataService.generateBetaCode(email, 30);
      toast(`Code généré pour ${email} : ${code}`);
      setNewCodeEmail('');
      setBetaCodes(await dataService.fetchBetaCodes());
    } catch (err: any) {
      toast(`Échec de génération : ${err.message}`, 'error');
    } finally {
      setGeneratingCode(null);
    }
  };

  const handleSendCodeEmail = async (c: BetaCodeDoc) => {
    setSendingCodeEmail(c.code);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch('/api/send-beta-code-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ recipientEmail: c.email, code: c.code, validDays: c.validDays }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || 'Échec de l\'envoi');
      toast(`Code envoyé par courriel à ${c.email}.`);
    } catch (err: any) {
      toast(`Échec de l'envoi : ${err.message}`, 'error');
    } finally {
      setSendingCodeEmail(null);
    }
  };

  const handleDeleteCode = async (c: BetaCodeDoc) => {
    if (!confirm(`Supprimer le code ${c.code} (${c.email}) ? Cette action est irréversible — n'affecte pas le compte qui l'a déjà utilisé.`)) return;
    setDeletingCode(c.code);
    try {
      await dataService.deleteBetaCode(c.code);
      setBetaCodes((prev) => prev.filter((x) => x.code !== c.code));
      toast(`Code ${c.code} supprimé.`);
    } catch (err: any) {
      toast(`Échec de la suppression : ${err.message}`, 'error');
    } finally {
      setDeletingCode(null);
    }
  };

  const CodesTab = () => (
    <div className="space-y-6">
      <div className={card}>
        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-5 ${D ? 'text-zinc-400' : 'text-slate-400'}`}>
          🎟️ Générer un code d'accès bêta
        </h3>
        <p className={`text-[10px] mb-4 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>
          Chaque code est valide 30 jours, à usage unique, et associé à une seule adresse courriel — le client doit l'entrer avant de pouvoir créer son compte.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={newCodeEmail}
            onChange={(e) => setNewCodeEmail(e.target.value)}
            placeholder="client@exemple.com"
            className={`flex-1 px-4 py-3 rounded-2xl text-[11px] font-semibold border outline-none focus:ring-1 focus:ring-emerald-500 ${
              D ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
          <button
            onClick={() => handleGenerateCode('trial')}
            disabled={generatingCode !== null}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap"
          >
            {generatingCode === 'trial' ? 'Génération…' : 'Code 30 jours'}
          </button>
          <button
            onClick={() => handleGenerateCode('extension')}
            disabled={generatingCode !== null}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap border ${
              D ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            } disabled:opacity-50`}
          >
            {generatingCode === 'extension' ? 'Génération…' : "Code d'extension"}
          </button>
        </div>
      </div>

      <div className={card}>
        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-5 ${D ? 'text-zinc-400' : 'text-slate-400'}`}>
          Codes déjà générés {loadingCodes && '· chargement…'}
        </h3>
        {betaCodes.length === 0 ? (
          <p className={`text-[11px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>Aucun code généré pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {betaCodes.map((c) => (
              <div key={c.code} className={`flex items-center gap-4 p-3.5 rounded-2xl border ${D ? 'border-zinc-800 bg-zinc-900/30' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-black tracking-widest ${D ? 'text-zinc-200' : 'text-slate-800'}`}>{c.code}</p>
                  <p className={`text-[10px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{c.email} · {c.validDays} jours</p>
                </div>
                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${
                  c.status === 'redeemed'
                    ? (D ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                    : (D ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700')
                }`}>
                  {c.status === 'redeemed' ? 'Utilisé' : 'Disponible'}
                </span>
                <button
                  onClick={() => handleSendCodeEmail(c)}
                  disabled={sendingCodeEmail !== null}
                  title={`Envoyer ce code par courriel à ${c.email}`}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 border ${
                    D ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {sendingCodeEmail === c.code ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                  {sendingCodeEmail === c.code ? 'Envoi…' : 'Envoyer'}
                </button>
                <button
                  onClick={() => handleDeleteCode(c)}
                  disabled={deletingCode !== null}
                  title={`Supprimer le code ${c.code}`}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 border ${
                    D ? 'border-rose-900/40 text-rose-400 hover:bg-rose-950/40' : 'border-rose-200 text-rose-500 hover:bg-rose-50'
                  }`}
                >
                  {deletingCode === c.code ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Maintenance — Grand Livre ghost cleanup ─────────────────────────────────
  // saveExpense/saveInvoice mirror every save into journalEntries/journalLines
  // (double-entry ledger), but deleteExpense/deleteInvoiceDoc used to only
  // delete the source doc — the mirror was left behind forever. Fixed going
  // forward (see dataService.ts), but everything deleted BEFORE that fix
  // stayed orphaned with no delete button anywhere in the app. This scans
  // (read-only) and deletes (only on explicit click + confirm) — scoped to
  // whichever account is currently signed in, same isOwnerDoc() rule as
  // every other delete in the app; SuperAdmin gets no special bypass here.
  const [orphanScan, setOrphanScan] = useState<null | { total: number; orphans: Array<{ id: string; description: string; date: string }> }>(null);
  const [scanningOrphans, setScanningOrphans] = useState(false);
  const [deletingOrphans, setDeletingOrphans] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  const handleScanOrphans = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setScanningOrphans(true);
    setOrphanScan(null);
    try {
      const [entriesSnap, expensesSnap, invoicesSnap] = await Promise.all([
        getDocs(query(collection(db, 'journalEntries'), where('ownerId', '==', uid))),
        getDocs(query(collection(db, 'expenses'), where('ownerId', '==', uid))),
        getDocs(query(collection(db, 'invoices'), where('ownerId', '==', uid))),
      ]);
      const expenseIds = new Set(expensesSnap.docs.map((d) => d.id));
      const invoiceIds = new Set(invoicesSnap.docs.map((d) => d.id));
      const orphans = entriesSnap.docs
        .filter((d) => !expenseIds.has(d.id) && !invoiceIds.has(d.id))
        .map((d) => ({ id: d.id, description: (d.data().description as string) || '', date: (d.data().date as string) || '' }));
      setOrphanScan({ total: entriesSnap.size, orphans });
    } catch (e) {
      console.error('[MaintenanceTab] scan error:', e);
      toast("Échec de l'analyse.", 'error');
    } finally {
      setScanningOrphans(false);
    }
  };

  const handleDeleteOrphans = async () => {
    if (!orphanScan || orphanScan.orphans.length === 0) return;
    if (!confirm(`Supprimer définitivement ${orphanScan.orphans.length} entrées fantômes du Grand Livre ? Cette action est irréversible.`)) return;
    setDeletingOrphans(true);
    setDeleteProgress(0);
    const items = orphanScan.orphans;
    const chunkSize = 25;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      await Promise.all(chunk.flatMap((o) => [
        deleteDoc(doc(db, 'journalEntries', o.id)).catch(() => {}),
        deleteDoc(doc(db, 'journalLines', `${o.id}-debit`)).catch(() => {}),
        deleteDoc(doc(db, 'journalLines', `${o.id}-credit`)).catch(() => {}),
      ]));
      setDeleteProgress((p) => p + chunk.length);
    }
    setDeletingOrphans(false);
    toast(`${items.length} entrées fantômes supprimées.`);
    setOrphanScan(null);
  };

  const MaintenanceTab = () => (
    <div className="space-y-6">
      <div className={card}>
        <div className="flex items-center gap-2 mb-2">
          <AlertOctagon size={16} className="text-amber-500" />
          <h3 className={`text-[10px] font-black uppercase tracking-widest ${D ? 'text-zinc-400' : 'text-slate-400'}`}>Grand Livre — Nettoyage des fantômes</h3>
        </div>
        <p className={`text-[10.5px] leading-relaxed mb-4 ${D ? 'text-zinc-500' : 'text-slate-500'}`}>
          Détecte les entrées du Grand Livre dont la facture/dépense d'origine a déjà été supprimée — sans ce nettoyage, elles restent visibles pour toujours. Analyse en lecture seule ; rien n'est supprimé sans confirmation explicite. Portée : uniquement les données du compte avec lequel vous êtes connectée en ce moment.
        </p>
        <button
          onClick={handleScanOrphans}
          disabled={scanningOrphans}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-700 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
        >
          {scanningOrphans ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          Analyser (lecture seule)
        </button>

        {orphanScan && (
          <div className="mt-4 space-y-3">
            <div className={`p-3 rounded-xl border text-[11px] ${D ? 'bg-zinc-900/40 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
              {orphanScan.total} entrée(s) au total · <strong>{orphanScan.orphans.length} fantôme(s)</strong> détecté(s).
            </div>
            {orphanScan.orphans.length > 0 && (
              <>
                <div className={`max-h-56 overflow-y-auto space-y-1 rounded-xl border p-2 ${D ? 'border-zinc-800' : 'border-slate-200'}`}>
                  {orphanScan.orphans.slice(0, 50).map((o) => (
                    <div key={o.id} className={`text-[10px] px-2 py-1 rounded-lg truncate ${D ? 'bg-zinc-900/40 text-zinc-400' : 'bg-slate-50 text-slate-500'}`}>
                      {o.date} · {o.description}
                    </div>
                  ))}
                  {orphanScan.orphans.length > 50 && (
                    <p className="text-[9px] text-center text-slate-400 pt-1">+ {orphanScan.orphans.length - 50} autre(s)…</p>
                  )}
                </div>
                <button
                  onClick={handleDeleteOrphans}
                  disabled={deletingOrphans}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                >
                  {deletingOrphans ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  {deletingOrphans ? `Suppression… ${deleteProgress}/${orphanScan.orphans.length}` : `Supprimer les ${orphanScan.orphans.length} fantômes`}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ── User detail modal ───────────────────────────────────────────────────────
  const UserModal = () => {
    if (!selectedUser) return null;
    const planConf = PLAN_CONFIG[selectedUser.plan] || PLAN_CONFIG.beta;
    const statusConf = STATUS_CONFIG[selectedUser.status] || STATUS_CONFIG.trial;
    return (
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowUserModal(false)}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className={`${D ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} border rounded-3xl shadow-2xl p-8 max-w-md w-full`}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <span className="text-xl font-black text-white">{(selectedUser.name || selectedUser.email || '?')[0]}</span>
            </div>
            <div>
              <h2 className="text-lg font-black">{selectedUser.name}</h2>
              <p className={`text-[10px] font-bold ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{selectedUser.email}</p>
            </div>
            <button onClick={() => setShowUserModal(false)} className={`ml-auto p-2 rounded-xl ${D ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-slate-100 text-slate-400'}`}>
              ✕
            </button>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Profil actif', value: (selectedUser.selectedProfile && PROFILE_LABELS[selectedUser.selectedProfile]) || '—' },
              {
                label: 'Entreprises créées',
                value: (companiesByOwner[selectedUser.id] || []).length === 0
                  ? 'Aucune'
                  : (companiesByOwner[selectedUser.id] || []).map(c => c.nombre + (c.companyProfile ? ` (${PROFILE_LABELS[c.companyProfile] || c.companyProfile})` : '')).join(', '),
              },
              { label: 'Ville', value: selectedUser.city || '—' },
              { label: 'Membre depuis', value: new Date(selectedUser.since).toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' }) },
              { label: 'Dernière connexion', value: isOnlineNow(selectedUser.lastActive) ? '🟢 En ligne maintenant' : formatLastActive(selectedUser.lastActive) },
              {
                label: 'Modules les plus utilisés',
                value: (() => {
                  const top = Object.entries(
                    moduleEvents.filter(e => e.ownerId === selectedUser.id).reduce((acc, e) => {
                      acc[e.vista] = (acc[e.vista] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1]).slice(0, 3);
                  return top.length === 0 ? 'Aucune donnée' : top.map(([v, c]) => `${v} (${c})`).join(', ');
                })(),
              },
              { label: 'Docs signés', value: `${(signedDocsByOwner[selectedUser.id] || []).length}` },
              ...(selectedUser.trackWorkHours ? [{
                label: 'Heures de travail (total)',
                value: formatWorkHoursTotal(workHoursSecondsByOwner[selectedUser.id] || 0),
              }] : []),
            ].map(r => (
              <div key={r.label} className={`flex justify-between items-center py-2 border-b ${D ? 'border-zinc-800' : 'border-slate-100'}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{r.label}</span>
                <span className={`text-[12px] font-semibold ${D ? 'text-zinc-200' : 'text-slate-700'}`}>{r.value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${D ? 'text-zinc-500' : 'text-slate-400'}`}>Forfait</span>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${planConf.bg} ${planConf.color}`}>{planConf.label}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${D ? 'text-zinc-500' : 'text-slate-400'}`}>Statut</span>
              <span className={`text-[10px] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${statusConf.bg} ${statusConf.color}`}>
                {statusConf.icon}{statusConf.label}
              </span>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { window.open(`mailto:${selectedUser.email}`); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all">
              <Mail size={14} /><span>Contacter</span>
            </button>
            <button onClick={() => {
              const invNum = `AC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
              generateInvoicePDF(selectedUser, invNum, adminName);
              toast(`Facture générée ✅`);
            }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${D ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Receipt size={14} /><span>Facture PDF</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const TABS = [
    { id: 'overview',  label: 'Vue d\'ensemble', icon: <BarChart2 size={14} /> },
    { id: 'users',     label: 'Utilisateurs',    icon: <Users size={14} /> },
    { id: 'billing',   label: 'Facturation',      icon: <DollarSign size={14} /> },
    { id: 'doculegal', label: 'DocuLegal',        icon: <FileText size={14} /> },
    { id: 'ia',        label: 'Usage IA',         icon: <Zap size={14} /> },
    { id: 'codes',     label: 'Codes Bêta',       icon: <Sparkles size={14} /> },
    { id: 'maintenance', label: 'Maintenance',    icon: <Trash2 size={14} /> },
  ] as const;

  return (
    <div className={`min-h-screen ${D ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'} font-sans transition-all duration-300`}>

      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[300] px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 ${
              notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}>
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {notification.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={`sticky top-0 z-50 ${D ? 'bg-zinc-950/95 border-zinc-900' : 'bg-white/95 border-slate-200'} border-b backdrop-blur-sm px-6 py-4 flex items-center justify-between`}
        style={{ borderTop: '3px solid #059669' }}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className={`p-2 rounded-xl transition-colors ${D ? 'hover:bg-zinc-900 text-zinc-500' : 'hover:bg-slate-100 text-slate-400'}`}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Shield size={14} className="text-white" />
              </div>
              <h1 className="font-black uppercase italic tracking-tight text-base">Super Admin · AutoCompt</h1>
            </div>
            <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>
              Accès propriétaire · {adminName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setRefreshTick(t => t + 1)}
            title="Rafraîchir"
            className={`p-2 rounded-xl transition-colors ${D ? 'hover:bg-zinc-900 text-zinc-500' : 'hover:bg-slate-100 text-slate-400'}`}>
            <RefreshCw size={16} className={loadingUsers ? 'animate-spin' : ''} />
          </button>
          <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl border ${D ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest">MRR {mrr} $/mois</span>
          </div>
        </div>
      </header>

      {/* Tab navigation — on narrow screens most tabs (Codes Bêta included) sit
          past the visible width; the right-edge fade is the only hint that
          the bar scrolls horizontally, so it's not silently missed. */}
      <div className={`relative ${D ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-100'} border-b px-6`}>
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : `border-transparent ${D ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'}`
              }`}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div className={`pointer-events-none absolute top-0 right-0 h-full w-10 sm:hidden bg-gradient-to-l ${D ? 'from-zinc-950' : 'from-white'} to-transparent`} />
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {/* Called as plain functions (not JSX components) — these Tab consts are
                redefined on every render since they close over local state, so
                rendering them as <XTab /> makes React see a new component type each
                keystroke and remount the whole subtree, killing input focus. Calling
                them directly embeds their JSX into this component's own render
                output instead, so no remount happens. */}
            {activeTab === 'overview'  && OverviewTab()}
            {activeTab === 'users'     && UsersTab()}
            {activeTab === 'billing'   && BillingTab()}
            {activeTab === 'doculegal' && DocuLegalTab()}
            {activeTab === 'ia'        && IaUsageTab()}
            {activeTab === 'codes'     && CodesTab()}
            {activeTab === 'maintenance' && MaintenanceTab()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showUserModal && <UserModal />}
      </AnimatePresence>

      {/* Invoice confirm modal */}
      <AnimatePresence>
        {invoiceUser && (
          <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={() => setInvoiceUser(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className={`${D ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} border rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center`}
              onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Receipt size={28} className="text-emerald-600" />
              </div>
              <h2 className="font-black text-lg mb-2">Générer la facture</h2>
              <p className={`text-sm mb-1 ${D ? 'text-zinc-400' : 'text-slate-600'}`}>
                {invoiceUser.name} — {invoiceUser.company}
              </p>
              <p className="text-2xl font-black text-emerald-600 my-3">
                {((PLAN_CONFIG[invoiceUser.plan] || PLAN_CONFIG.beta).price * 1.14975).toFixed(2)} $
                <span className={`text-[10px] font-bold ml-1 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>TTC</span>
              </p>
              {invoiceUser.email && (
                <p className={`text-[10px] mb-3 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>
                  Sera envoyée à : <strong>{invoiceUser.email}</strong>
                </p>
              )}
              <div className="flex flex-col gap-2 mt-2">
                <button
                  disabled={sendingInvoice}
                  onClick={() => handleGenerateInvoice(invoiceUser, true)}
                  className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all">
                  <Mail size={13} />
                  <span>{sendingInvoice ? 'Envoi…' : 'Télécharger + Envoyer au client'}</span>
                </button>
                <button
                  disabled={sendingInvoice}
                  onClick={() => handleGenerateInvoice(invoiceUser, false)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all disabled:opacity-50 ${D ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <Download size={13} />
                  <span>Télécharger seulement</span>
                </button>
                <button
                  disabled={sendingInvoice}
                  onClick={() => setInvoiceUser(null)}
                  className={`py-2 text-[10px] font-bold uppercase disabled:opacity-50 ${D ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'}`}>
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
