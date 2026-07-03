import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Users, TrendingUp, DollarSign, FileText, Shield,
  ChevronDown, ChevronRight, Search, Filter, Download, Send,
  CheckCircle2, XCircle, Clock, AlertTriangle, Zap, Star,
  BarChart2, PieChart as PieIcon, RefreshCw, Mail, Phone,
  Building2, Calendar, Plus, Eye, Ban, Edit3, Receipt,
  Sparkles, Globe, LogOut, Bell, Settings,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { dataService, type BetaCodeDoc } from '../lib/dataService';

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
function generateInvoicePDF(user: AdminUser, invoiceNumber: string, adminName: string) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 18;
  const green: [number, number, number] = [5, 150, 105];
  const dark: [number, number, number] = [15, 23, 42];

  // Header
  pdf.setFillColor(...green);
  pdf.rect(0, 0, W, 38, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('AutoCompt', M, 18);
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
  pdf.text(user.name, M, 59);
  pdf.setFontSize(9);
  pdf.text(user.company, M, 65);
  pdf.text(user.email, M, 71);
  if (user.city) pdf.text(user.city + ', Québec, Canada', M, 77);

  // From
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('DE LA PART DE:', W / 2 + 10, 52);
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Solutions GPA Inc.', W / 2 + 10, 59);
  pdf.setFontSize(9);
  pdf.text(adminName, W / 2 + 10, 65);
  pdf.text('Laval, Québec, Canada', W / 2 + 10, 71);
  pdf.text('autocompt-app.vercel.app', W / 2 + 10, 77);

  // Separator
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(M, 85, W - M, 85);

  // Table header
  pdf.setFillColor(248, 250, 252);
  pdf.rect(M, 89, W - M * 2, 9, 'F');
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('DESCRIPTION', M + 3, 95);
  pdf.text('PÉRIODE', 120, 95);
  pdf.text('MONTANT', W - M - 3, 95, { align: 'right' });

  // Table row
  const planConf = PLAN_CONFIG[user.plan];
  const price = planConf.price;
  const monthName = new Date().toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...dark);
  pdf.text(`Abonnement AutoCompt ${planConf.label}`, M + 3, 106);
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Accès plateforme, DocuLegal, IA Sofi, Signature électronique', M + 3, 112);
  pdf.setTextColor(...dark);
  pdf.setFontSize(9);
  pdf.text(monthName, 120, 106);
  pdf.text(`${price.toFixed(2)} $`, W - M - 3, 106, { align: 'right' });

  pdf.setDrawColor(226, 232, 240);
  pdf.line(M, 118, W - M, 118);

  // Totals
  const tps = parseFloat((price * 0.05).toFixed(2));
  const tvq = parseFloat((price * 0.09975).toFixed(2));
  const total = price + tps + tvq;

  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Sous-total:', W - M - 40, 128);
  pdf.text(`${price.toFixed(2)} $`, W - M - 3, 128, { align: 'right' });
  pdf.text('TPS (5%):', W - M - 40, 135);
  pdf.text(`${tps.toFixed(2)} $`, W - M - 3, 135, { align: 'right' });
  pdf.text('TVQ (9.975%):', W - M - 40, 142);
  pdf.text(`${tvq.toFixed(2)} $`, W - M - 3, 142, { align: 'right' });

  pdf.setFillColor(...green);
  pdf.rect(W - M - 60, 147, 60 - M + M, 12, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('TOTAL DÛ:', W - M - 40, 155);
  pdf.text(`${total.toFixed(2)} $`, W - M - 3, 155, { align: 'right' });

  // Footer
  pdf.setFillColor(...green);
  pdf.rect(0, 277, W, 20, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('Merci de votre confiance. Paiement dû dans 30 jours. autocompt-app.vercel.app', W / 2, 285, { align: 'center' });
  pdf.text('AutoCompt © Solutions GPA Inc. — NAS/TPS: en cours d\'enregistrement', W / 2, 291, { align: 'center' });

  pdf.save(`Facture_AutoCompt_${user.name.replace(/\s+/g, '_')}_${invoiceNumber}.pdf`);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminPanel({ darkMode, onBack, adminName = 'Fabiola Beatriz', adminEmail = '' }: SuperAdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'billing' | 'doculegal' | 'codes' | 'settings'>('overview');
  const [betaCodes, setBetaCodes] = useState<BetaCodeDoc[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [newCodeEmail, setNewCodeEmail] = useState('');
  const [generatingCode, setGeneratingCode] = useState<'trial' | 'extension' | null>(null);
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

  const D = darkMode;

  // Load from Firestore
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const snap = await getDocs(collection(db, 'users'));
        if (!snap.empty) {
          const loaded: AdminUser[] = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<AdminUser, 'id'>),
          }));
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

  // Computed metrics
  const activeUsers = users.filter(u => u.status === 'active' || u.status === 'beta');
  const payingUsers = users.filter(u => u.mrr > 0);
  const mrr = users.reduce((sum, u) => sum + (u.mrr || 0), 0);
  const arr = mrr * 12;
  const betaUsers = users.filter(u => u.plan === 'beta' || u.status === 'beta');
  const cancelledUsers = users.filter(u => u.status === 'cancelled');
  const totalDocsSigned = users.reduce((sum, u) => sum + (u.docsSignedCount || 0), 0);

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
    const matchSearch = !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPlan = filterPlan === 'all' || u.plan === filterPlan;
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchSearch && matchPlan && matchStatus;
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
                  <span className="text-[9px] font-black text-white">{u.name[0]}</span>
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
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value as Plan | 'all')}
          className={`px-3 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-wider outline-none ${D ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          <option value="all">Tous les forfaits</option>
          {Object.entries(PLAN_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as UserStatus | 'all')}
          className={`px-3 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-wider outline-none ${D ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span className={`text-[9px] font-bold ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{filteredUsers.length} résultats</span>
      </div>

      {/* Users table */}
      <div className={`${card} !p-0 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${D ? 'border-zinc-800 bg-zinc-950/50' : 'border-slate-100 bg-slate-50'}`}>
                {['Utilisateur', 'Entreprise', 'Forfait', 'Statut', 'Depuis', 'MRR', 'Actions'].map(h => (
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
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-white">{displayName[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p className={`text-[11px] font-bold ${D ? 'text-zinc-200' : 'text-slate-800'}`}>{displayName}</p>
                          <p className={`text-[9px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{u.email}</p>
                          <p className={`text-[9px] ${u.phone ? (D ? 'text-emerald-500' : 'text-emerald-600') : (D ? 'text-zinc-600' : 'text-slate-300')}`}>
                            {u.phone || 'Téléphone non vérifié'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className={`text-[11px] font-semibold ${D ? 'text-zinc-300' : 'text-slate-700'}`}>{u.company || '—'}</p>
                      <p className={`text-[9px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{u.industry}</p>
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
                      <p className={`text-[10px] font-semibold ${D ? 'text-zinc-400' : 'text-slate-600'}`}>
                        {u.since || u.createdAt
                          ? new Date(u.since || u.createdAt).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
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
                        <button
                          title="Envoyer email"
                          onClick={() => { window.open(`mailto:${u.email}?subject=AutoCompt%20—%20Votre%20abonnement&body=Bonjour%20${encodeURIComponent(displayName)},`); }}
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
            const planConf = PLAN_CONFIG[u.plan];
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
                  onClick={() => {
                    const invNum = `AC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
                    generateInvoicePDF(u, invNum, adminName);
                    toast(`Facture générée pour ${u.name} ✅`);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95">
                  <Download size={13} />
                  <span>Facture PDF</span>
                </button>
              </div>
            );
          })}
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
        {users.filter(u => (u.docsSignedCount || 0) > 0).map(u => (
          <div key={u.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${D ? 'border-zinc-800 bg-zinc-900/30' : 'border-slate-100 bg-slate-50/50'}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black text-white">{u.name[0]}</span>
            </div>
            <div className="flex-1">
              <p className={`text-[12px] font-bold ${D ? 'text-zinc-200' : 'text-slate-800'}`}>{u.name}</p>
              <p className={`text-[10px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{u.company}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-xl ${D ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-700'} text-center`}>
                <p className="text-[16px] font-black">{u.docsSignedCount}</p>
                <p className={`text-[8px] font-bold uppercase tracking-wider`}>docs signés</p>
              </div>
            </div>
          </div>
        ))}
        <div className={`mt-4 p-4 rounded-2xl ${D ? 'bg-zinc-900/50 border-zinc-800' : 'bg-emerald-50/50 border-emerald-100'} border text-center`}>
          <p className={`text-[11px] font-bold ${D ? 'text-zinc-400' : 'text-emerald-700'}`}>
            Total: <strong>{totalDocsSigned}</strong> documents signés via DocuLegal · Registre en temps réel depuis Firestore
          </p>
        </div>
      </div>
    </div>
  );

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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── User detail modal ───────────────────────────────────────────────────────
  const UserModal = () => {
    if (!selectedUser) return null;
    const planConf = PLAN_CONFIG[selectedUser.plan];
    const statusConf = STATUS_CONFIG[selectedUser.status];
    return (
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowUserModal(false)}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className={`${D ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} border rounded-3xl shadow-2xl p-8 max-w-md w-full`}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <span className="text-xl font-black text-white">{selectedUser.name[0]}</span>
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
              { label: 'Entreprise', value: selectedUser.company },
              { label: 'Secteur', value: selectedUser.industry },
              { label: 'Ville', value: selectedUser.city || '—' },
              { label: 'Membre depuis', value: new Date(selectedUser.since).toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' }) },
              { label: 'Docs signés', value: `${selectedUser.docsSignedCount || 0}` },
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
    { id: 'codes',     label: 'Codes Bêta',       icon: <Sparkles size={14} /> },
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

      {/* Tab navigation */}
      <div className={`${D ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-100'} border-b px-6`}>
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
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {activeTab === 'overview'  && <OverviewTab />}
            {activeTab === 'users'     && <UsersTab />}
            {activeTab === 'billing'   && <BillingTab />}
            {activeTab === 'doculegal' && <DocuLegalTab />}
            {activeTab === 'codes'     && <CodesTab />}
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
                {(PLAN_CONFIG[invoiceUser.plan].price * 1.14975).toFixed(2)} $
                <span className={`text-[10px] font-bold ml-1 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>TTC</span>
              </p>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setInvoiceUser(null)}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all ${D ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  Annuler
                </button>
                <button onClick={() => {
                  const invNum = `AC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
                  generateInvoicePDF(invoiceUser, invNum, adminName);
                  toast(`Facture PDF générée pour ${invoiceUser.name} ✅`);
                  setInvoiceUser(null);
                }}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all">
                  Télécharger PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
