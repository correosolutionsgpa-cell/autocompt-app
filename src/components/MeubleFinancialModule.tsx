/**
 * MeubleFinancialModule.tsx
 * Complete financial module for short-term rentals (Airbnb / Direct bookings).
 * 4 tabs: Calendrier, Revenus Plateformes, Dépenses, Rapport Fiscal
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, DollarSign, Receipt, BarChart2, Plus, Trash2,
  Download, Home, Wifi, Zap, Sparkles, Settings, ChevronLeft,
  ChevronRight, X, TrendingUp, TrendingDown, Info,
  Percent, Star, Check, AlertCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function MeubleFinancialModule({
  darkMode, companyId, companyName = 'Mon Logement', unitName = 'Unité Meublée'
}: MeubleFinancialModuleProps) {
  const D = darkMode;
  const now = new Date();
  const [tab, setTab] = useState<'calendrier' | 'revenus' | 'depenses' | 'rapport'>('calendrier');
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [reservations, setReservations] = useState<Reservation[]>([
    {
      id: genId(), guestName: 'Marie Dupont', checkIn: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-05`,
      checkOut: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-09`,
      nights: 4, nightlyRate: 120, platform: 'airbnb', platformFeePercent: 3, taxeSejour: 3.5, status: 'confirmed',
    },
    {
      id: genId(), guestName: 'Jean Martin', checkIn: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-15`,
      checkOut: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-18`,
      nights: 3, nightlyRate: 135, platform: 'direct', platformFeePercent: 0, taxeSejour: 3.5, status: 'confirmed',
    },
  ]);
  const [expenses, setExpenses] = useState<MeubleExpense[]>([
    { id: genId(), date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, category: 'hydro', description: 'Hydro-Québec', amount: 85 },
    { id: genId(), date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, category: 'internet', description: 'Bell Fibe', amount: 75 },
    { id: genId(), date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-05`, category: 'menage', description: 'Nettoyage entre réservations', amount: 60 },
    { id: genId(), date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-15`, category: 'menage', description: 'Nettoyage entre réservations', amount: 60 },
  ]);
  const [unitConfig, setUnitConfig] = useState<UnitConfig>({
    name: unitName, address: '',
    taxeSejourDefault: 3.5,
    platformFeeDefault: { airbnb: 3, direct: 0, vrbo: 5, booking: 15 },
  });

  // New reservation form
  const [showResForm, setShowResForm] = useState(false);
  const [newRes, setNewRes] = useState<Partial<Reservation>>({ platform: 'airbnb', status: 'confirmed', taxeSejour: 3.5, platformFeePercent: 3 });

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

  const addReservation = () => {
    if (!newRes.guestName || !newRes.checkIn || !newRes.checkOut) return;
    const nights = nightsBetween(newRes.checkIn!, newRes.checkOut!);
    const platFee = PLATFORMS[newRes.platform || 'airbnb'].feePercent;
    setReservations(prev => [...prev, {
      id: genId(),
      guestName: newRes.guestName!,
      checkIn: newRes.checkIn!,
      checkOut: newRes.checkOut!,
      nights,
      nightlyRate: newRes.nightlyRate || 100,
      platform: newRes.platform || 'airbnb',
      platformFeePercent: newRes.platformFeePercent ?? platFee,
      taxeSejour: newRes.taxeSejour ?? unitConfig.taxeSejourDefault,
      status: newRes.status || 'confirmed',
      notes: newRes.notes,
    }]);
    setNewRes({ platform: 'airbnb', status: 'confirmed', taxeSejour: unitConfig.taxeSejourDefault, platformFeePercent: 3 });
    setShowResForm(false);
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
        <button onClick={() => setShowResForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95">
          <Plus size={13} /><span>Nouvelle réservation</span>
        </button>
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
    </div>
  );
}
