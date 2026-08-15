/**
 * ComptableExportView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Écran d'exportation comptable destiné au comptable externe.
 *
 * Rapports générés (4 onglets, 4 PDF exportables):
 *   1. Journal Général          — liste chronologique de tous les asientos
 *   2. Grand Livre              — mouvements regroupés par compte
 *   3. Balance de Vérification  — totaux débits/crédits par compte
 *   4. Rapport TPS/TVQ          — taxes collectées et à remettre
 *
 * Source des données : Firestore `journalEntries` + `journalLines`
 * Aucune mutation Firestore — lecture seule.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import {
  BookOpen, BarChart2, Scale, Receipt, Download, Loader2,
  ChevronLeft, ChevronRight, CheckCircle2, AlertCircle,
  Calendar, Filter, RefreshCw, FileText, Percent, Hash, Mail,
  Building2, Plus, Trash2, Save, Info,
} from 'lucide-react';
import { dataService, type InvoiceDoc, type ExpenseDoc, type PropertyDoc, type CcaAssetDoc } from '../lib/dataService';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// §1 — Types
// ─────────────────────────────────────────────────────────────────────────────

interface JournalLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  type: 'Debit' | 'Credit';
  amount: number;
  ownerId: string;
}

interface JournalEntry {
  id: string;
  /** Untagged (predates the companyId tag added 2026-07-29) entries stay visible
   *  in every company rather than being hidden — see the filter in load() below. */
  companyId?: string;
  date: string;
  description: string;
  documentReference?: string;
  createdAt: string;
  ownerId: string;
  lines: JournalLine[];
  /** 'rapport_externe' = transcribed from a third-party payroll report (see
   *  savePayrollRecordWithJournal) — AutoCompt didn't calculate this amount.
   *  Surfaced as a visible marker in the Journal/Grand Livre for the account
   *  holder's own record-keeping/legal protection. */
  source?: string;
}

export interface ComptableExportViewProps {
  darkMode: boolean;
  companyId: string;
  companyName?: string;
  userProfile?: { nom?: string; neq?: string; tps?: string; tvq?: string; adresse?: string };
  /** Pré-remplit le destinataire du bouton "Envoyer par courriel" — optionnel,
   *  l'utilisateur peut toujours saisir/corriger l'adresse au moment d'envoyer. */
  comptableEmail?: string;
  /** Gates the DPA/Amortissement + T776/TP-128 tabs — Comptable profile only. */
  activeProfile?: string;
  /** This account's properties, already filtered to the active company —
   *  needed to let the comptable pick which building the DPA/T776 report is
   *  for (both are inherently per-building, unlike the other 6 tabs). */
  properties?: PropertyDoc[];
}

// ─────────────────────────────────────────────────────────────────────────────
// §2 — Plan comptable (accountId → label FR + code + type)
// ─────────────────────────────────────────────────────────────────────────────

const PLAN: Record<string, { label: string; type: 'actif'|'passif'|'revenu'|'charge'; code: string }> = {
  'acc-bank':                { label: 'Banque / Caisse',             type: 'actif',  code: '1010' },
  'acc-expense':             { label: 'Charges — Général',           type: 'charge', code: '5100' },
  'acc-revenue':             { label: 'Produits — Général',          type: 'revenu', code: '4100' },
  'acc-revenue-meuble':      { label: 'Produits — Location meublée', type: 'revenu', code: '4200' },
  'acc-frais-plateforme':    { label: 'Charges — Frais plateformes', type: 'charge', code: '5210' },
  'acc-expense-meuble':      { label: 'Charges — Location meublée', type: 'charge', code: '5220' },
  'acc-tps-payable':         { label: 'TPS à remettre (passif)',      type: 'passif', code: '2310' },
  'acc-tvq-payable':         { label: 'TVQ à remettre (passif)',      type: 'passif', code: '2320' },
  'acc-taxe-sejour-payable': { label: 'Taxe de séjour à remettre',   type: 'passif', code: '2330' },
  'acc-salaires':            { label: 'Salaires et charges sociales', type: 'charge', code: '5300' },
};

const aLabel = (id: string) => PLAN[id]?.label ?? id;
const aCode  = (id: string) => PLAN[id]?.code  ?? '—';

// ─────────────────────────────────────────────────────────────────────────────
// §3 — Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MFR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const fmtDate = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso.slice(0,10) : `${String(d.getDate()).padStart(2,'0')} ${MFR[d.getMonth()]} ${d.getFullYear()}`;
};
const fmtAmt = (n: number) => n.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const yr = new Date().getFullYear();
const DEFAULT_FROM = `${yr}-01-01`;
const DEFAULT_TO   = `${yr}-12-31`;

// ─────────────────────────────────────────────────────────────────────────────
// §4 — PDF helpers
// ─────────────────────────────────────────────────────────────────────────────

function pdfHdr(pdf: jsPDF, title: string, sub: string, co: string, rgb: [number,number,number]): number {
  const W=210,M=14;
  pdf.setFillColor(...rgb); pdf.rect(0,0,W,38,'F');
  pdf.setTextColor(255,255,255); pdf.setFont('Helvetica','bold');
  pdf.setFontSize(9); pdf.text('AutoCompt',M,10);
  pdf.setFontSize(15); pdf.text(title,M,22);
  pdf.setFont('Helvetica','normal'); pdf.setFontSize(8);
  pdf.text(`${co} · ${sub}`,M,31);
  pdf.text(`Généré le ${new Date().toLocaleDateString('fr-CA')}`,W-M,31,{align:'right'});
  pdf.setTextColor(30,41,59); return 48;
}
function pdfSec(pdf: jsPDF, txt: string, y: number, M=14): number {
  pdf.setFillColor(248,250,252); pdf.rect(M,y,182,7,'F');
  pdf.setFont('Helvetica','bold'); pdf.setFontSize(7); pdf.setTextColor(100,116,139);
  pdf.text(txt.toUpperCase(),M+2,y+4.5); pdf.setTextColor(30,41,59); return y+10;
}
function chkPg(pdf: jsPDF, y: number, need=12): number {
  if (y+need>280) { pdf.addPage(); return 20; } return y;
}

// ─────────────────────────────────────────────────────────────────────────────
// §5 — Component
// ─────────────────────────────────────────────────────────────────────────────

type TabId = 'journal'|'grandlivre'|'balance'|'tvq'|'gifi'|'sources'|'dpa'|'t776';
const PER = 25;
const SOURCE_NON_CLASSE = 'Non classé';

const TABS: { id: TabId; label: string; short: string; icon: React.ReactNode; ac: string; comptableOnly?: boolean }[] = [
  { id:'journal'    as TabId, label:'Journal Général',         short:'Journal',  icon:<BookOpen size={14}/>,  ac:'border-indigo-500 text-indigo-600'  },
  { id:'grandlivre' as TabId, label:'Grand Livre',             short:'G. Livre', icon:<BarChart2 size={14}/>, ac:'border-emerald-500 text-emerald-600' },
  { id:'balance'    as TabId, label:'Balance de Vérification', short:'Balance',  icon:<Scale size={14}/>,     ac:'border-amber-500 text-amber-600'     },
  { id:'tvq'        as TabId, label:'Rapport TPS / TVQ',       short:'TPS/TVQ',  icon:<Percent size={14}/>,   ac:'border-rose-500 text-rose-600'       },
  { id:'gifi'       as TabId, label:'Export GIFI',             short:'GIFI',     icon:<Hash size={14}/>,      ac:'border-slate-500 text-slate-600'     },
  { id:'sources'    as TabId, label:'Sources d\'Activité',     short:'Sources',  icon:<Filter size={14}/>,    ac:'border-teal-500 text-teal-600'       },
  // Comptable-only — les deux sont intrinsèquement par immeuble, contrairement
  // aux 6 onglets ci-dessus (voir le sélecteur d'immeuble affiché seulement
  // pour ces deux-là).
  { id:'dpa'        as TabId, label:'Amortissement (DPA)',     short:'DPA',      icon:<Building2 size={14}/>, ac:'border-orange-500 text-orange-600',  comptableOnly: true },
  { id:'t776'       as TabId, label:'Rapport T776 / TP-128',   short:'T776',     icon:<FileText size={14}/>,  ac:'border-cyan-500 text-cyan-600',      comptableOnly: true },
];

export default function ComptableExportView({
  darkMode, companyId, companyName='Mon Entreprise', userProfile, comptableEmail,
  activeProfile, properties = [],
}: ComptableExportViewProps) {
  const D = darkMode;
  const [entries, setEntries]   = useState<JournalEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [err,     setErr]       = useState<string|null>(null);
  const [tab,     setTab]       = useState<TabId>('journal');
  const [dfrom,   setDfrom]     = useState(DEFAULT_FROM);
  const [dto,     setDto]       = useState(DEFAULT_TO);
  const [facc,    setFacc]      = useState('');
  const [jp,      setJp]        = useState(1);
  const [glp,     setGlp]       = useState(1);
  const [gifiCodes, setGifiCodes]     = useState<Record<string,string>>({});
  const [gifiSaving, setGifiSaving]   = useState(false);
  const [gifiSavedMsg, setGifiSavedMsg] = useState<string|null>(null);

  // ── Numéros de compte Sage 50 (mapping, une seule fois par dossier) ────────
  const [sageCodes, setSageCodes]         = useState<Record<string,string>>({});
  const [sageSaving, setSageSaving]       = useState(false);
  const [sageSavedMsg, setSageSavedMsg]   = useState<string|null>(null);
  const [showSageMapping, setShowSageMapping] = useState(false);

  // ── DPA + T776/TP-128 (Comptable only) — both are per-building ─────────────
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [fiscalYear, setFiscalYear] = useState(String(yr));
  const [ccaAssets, setCcaAssets] = useState<CcaAssetDoc[]>([]);
  const [loadingCca, setLoadingCca] = useState(false);
  const [savingCcaId, setSavingCcaId] = useState('');
  const [buildingExpenses, setBuildingExpenses] = useState<ExpenseDoc[]>([]);
  const [buildingInvoices, setBuildingInvoices] = useState<InvoiceDoc[]>([]);
  const [loadingBuildingData, setLoadingBuildingData] = useState(false);

  const isComptable = activeProfile === 'comptable';
  const visibleTabs = TABS.filter(t => !t.comptableOnly || isComptable);

  // Default to this company's only/first property once the list loads.
  useEffect(() => {
    if (!selectedBuildingId && properties.length > 0) {
      setSelectedBuildingId(properties[0].buildingId || properties[0].id);
    }
  }, [properties, selectedBuildingId]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !selectedBuildingId || !(tab === 'dpa' || tab === 't776')) return;
    setLoadingCca(true);
    dataService.fetchCcaAssets(uid, selectedBuildingId)
      .then(all => setCcaAssets(all.filter(a => a.fiscalYear === fiscalYear)))
      .catch(e => console.error('fetchCcaAssets failed:', e))
      .finally(() => setLoadingCca(false));
  }, [selectedBuildingId, fiscalYear, tab]);

  // T776 needs raw revenue/expense docs (with buildingId) — the journal
  // entries loaded above for the other 6 tabs don't carry buildingId at all,
  // so this is a dedicated fetch, filtered client-side to this one building
  // and fiscal year. DPA also needs it now, to surface this year's expenses
  // tagged natureDepense="capitale" as a reference for "Ajouts cette année".
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !selectedBuildingId || !(tab === 't776' || tab === 'dpa')) return;
    setLoadingBuildingData(true);
    Promise.all([dataService.fetchExpenses(uid), dataService.fetchInvoices(uid)])
      .then(([exp, inv]) => {
        const inYear = (d: string) => (d || '').startsWith(fiscalYear);
        setBuildingExpenses(exp.filter(e => e.buildingId === selectedBuildingId && inYear(e.fecha)));
        setBuildingInvoices(inv.filter(i => i.buildingId === selectedBuildingId && inYear(i.fecha)));
      })
      .catch(e => console.error('T776 data fetch failed:', e))
      .finally(() => setLoadingBuildingData(false));
  }, [selectedBuildingId, fiscalYear, tab]);

  // ── Load GIFI mapping ────────────────────────────────────────────────────
  // Codes are never machine-guessed — the accountant assigns them once here
  // and they persist per company, same "AI suggests nothing, human confirms
  // everything" rule this app follows for every fiscally-sensitive value.
  useEffect(() => {
    if (!companyId) return;
    getDoc(doc(db, 'gifiMappings', companyId))
      .then(snap => { if (snap.exists()) setGifiCodes((snap.data().codes as Record<string,string>) || {}); })
      .catch(() => {});
  }, [companyId]);

  const saveGifiCodes = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setGifiSaving(true);
    try {
      await setDoc(doc(db, 'gifiMappings', companyId), {
        ownerId: uid, companyId, codes: gifiCodes, updatedAt: new Date().toISOString(),
      });
      setGifiSavedMsg('Codes enregistrés.');
      setTimeout(() => setGifiSavedMsg(null), 3000);
    } catch (e: any) {
      alert(e.message ?? 'Erreur lors de l\'enregistrement des codes GIFI.');
    }
    setGifiSaving(false);
  };

  // ── Load / save — mapping des numéros de compte Sage 50 ─────────────────────
  useEffect(() => {
    if (!companyId) return;
    getDoc(doc(db, 'sageMappings', companyId))
      .then(snap => { if (snap.exists()) setSageCodes((snap.data().codes as Record<string,string>) || {}); })
      .catch(() => {});
  }, [companyId]);

  const saveSageCodes = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSageSaving(true);
    try {
      await setDoc(doc(db, 'sageMappings', companyId), {
        ownerId: uid, companyId, codes: sageCodes, updatedAt: new Date().toISOString(),
      });
      setSageSavedMsg('Numéros enregistrés.');
      setTimeout(() => setSageSavedMsg(null), 3000);
    } catch (e: any) {
      alert(e.message ?? 'Erreur lors de l\'enregistrement des numéros de compte Sage 50.');
    }
    setSageSaving(false);
  };

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    setLoading(true); setErr(null);
    dataService.fetchJournalEntries(uid)
      .then((r: any) => {
        const all = r as JournalEntry[];
        // Scope to the active company — untagged legacy entries stay visible
        // everywhere (they predate the companyId tag) so no real data disappears.
        setEntries(all.filter((e) => !e.companyId || e.companyId === companyId));
      })
      .catch((e: any) => setErr(e.message ?? 'Erreur chargement.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [companyId]);

  // ── Load — Sources d'Activité (indépendant de journalEntries) ──────────────
  // historique/depenses ne sont jamais passés en props à ce composant — il
  // faut les lire directement, comme App.tsx le fait à la connexion.
  const [invoicesData, setInvoicesData] = useState<InvoiceDoc[]>([]);
  const [expensesData, setExpensesData] = useState<ExpenseDoc[]>([]);
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !companyId) return;
    Promise.all([dataService.fetchInvoices(uid), dataService.fetchExpenses(uid)])
      .then(([inv, exp]) => {
        setInvoicesData(inv.filter((h) => h.companyId === companyId));
        setExpensesData(exp.filter((d) => d.companyId === companyId));
      })
      .catch((e) => console.error('Sources tab load failed:', e));
  }, [companyId]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const filt = useMemo(() =>
    entries.filter(e => { const d=e.date?.slice(0,10)??''; return d>=dfrom && d<=dto; }),
  [entries, dfrom, dto]);

  interface GlA { accountId:string; lines:Array<{entry:JournalEntry;line:JournalLine}>; td:number; tc:number; solde:number }
  const gl = useMemo<GlA[]>(() => {
    const m = new Map<string,GlA>();
    filt.forEach(e => (e.lines??[]).forEach(l => {
      if (!m.has(l.accountId)) m.set(l.accountId,{accountId:l.accountId,lines:[],td:0,tc:0,solde:0});
      const a = m.get(l.accountId)!; a.lines.push({entry:e,line:l});
      l.type==='Debit' ? a.td+=l.amount : a.tc+=l.amount;
    }));
    m.forEach(a => a.solde=a.td-a.tc);
    return Array.from(m.values()).sort((a,b)=>aCode(a.accountId).localeCompare(aCode(b.accountId)));
  }, [filt]);

  const allIds  = useMemo(()=>gl.map(a=>a.accountId), [gl]);
  const filtGl  = useMemo(()=>facc?gl.filter(a=>a.accountId===facc):gl, [gl,facc]);
  const allLns  = useMemo(()=>filtGl.flatMap(a=>a.lines.map(l=>({...l,aid:a.accountId}))), [filtGl]);

  const bal = useMemo(()=>gl.map(a=>({accountId:a.accountId,td:a.td,tc:a.tc,solde:a.solde})), [gl]);
  const bTot = useMemo(()=>{
    const td=bal.reduce((s,l)=>s+l.td,0), tc=bal.reduce((s,l)=>s+l.tc,0);
    return {td,tc,ok:Math.abs(td-tc)<0.01};
  }, [bal]);

  const tvqD = useMemo(()=>{
    let tps=0,tvq=0,ts=0;
    filt.forEach(e=>(e.lines??[]).forEach(l=>{
      if (l.type!=='Credit') return;
      if (l.accountId==='acc-tps-payable') tps+=l.amount;
      if (l.accountId==='acc-tvq-payable') tvq+=l.amount;
      if (l.accountId==='acc-taxe-sejour-payable') ts+=l.amount;
    }));
    return {tps,tvq,ts,tot:tps+tvq+ts};
  }, [filt]);

  // ── Sources d'Activité — regroupe revenus/dépenses par sourceRevenu ────────
  // Exclut ce qui a un buildingId : appartient au livre d'un client/édifice
  // géré (voir TenueLivresImmeubleView), pas à l'activité propre du compte —
  // même principe que le filtre appliqué au Tenue de Livres général.
  interface SourceGroup { source: string; revenus: InvoiceDoc[]; depenses: ExpenseDoc[]; totalRevenus: number; totalDepenses: number; net: number }
  const sourcesGrouped = useMemo<SourceGroup[]>(() => {
    const inRange = (fecha?: string) => { const d = (fecha || '').slice(0, 10); return d >= dfrom && d <= dto; };
    const m = new Map<string, SourceGroup>();
    const ensure = (source: string) => {
      if (!m.has(source)) m.set(source, { source, revenus: [], depenses: [], totalRevenus: 0, totalDepenses: 0, net: 0 });
      return m.get(source)!;
    };
    invoicesData.filter((h) => !h.buildingId && inRange(h.fecha)).forEach((h) => {
      const g = ensure(h.sourceRevenu || SOURCE_NON_CLASSE);
      g.revenus.push(h); g.totalRevenus += h.total || 0;
    });
    expensesData.filter((d) => !d.buildingId && inRange(d.fecha)).forEach((d) => {
      const g = ensure(d.sourceRevenu || SOURCE_NON_CLASSE);
      g.depenses.push(d); g.totalDepenses += d.total || 0;
    });
    m.forEach((g) => { g.net = g.totalRevenus - g.totalDepenses; });
    return Array.from(m.values()).sort((a, b) => a.source === SOURCE_NON_CLASSE ? 1 : b.source === SOURCE_NON_CLASSE ? -1 : a.source.localeCompare(b.source));
  }, [invoicesData, expensesData, dfrom, dto]);

  const jTot = Math.max(1,Math.ceil(filt.length/PER));
  const jPaged = filt.slice((jp-1)*PER, jp*PER);
  const glTot  = Math.max(1,Math.ceil(allLns.length/PER));

  // ── PDF exports ───────────────────────────────────────────────────────────
  // Each `buildXPdf`/`buildXCsv` only constructs the file — `expX` downloads
  // it, `sendCurrentTabByEmail` (below) attaches the same content to a real
  // email instead. One source of truth for what the file actually contains.
  const co = userProfile?.nom ?? companyName;

  const buildJournalPdf = (): jsPDF => {
    const pdf=new jsPDF({unit:'mm',format:'a4'}); const M=14,W=210;
    let y=pdfHdr(pdf,'Journal Général',`${dfrom} au ${dto}`,co,[79,70,229]);
    filt.forEach(e=>{
      y=chkPg(pdf,y,20+(e.lines?.length??0)*6);
      y=pdfSec(pdf,`${fmtDate(e.date)}  ·  ${e.description}`,y,M);
      if(e.documentReference){
        pdf.setFont('Helvetica','italic');pdf.setFontSize(7);pdf.setTextColor(100,116,139);
        pdf.text(`Réf: ${e.documentReference}`,M+2,y);pdf.setTextColor(30,41,59);y+=5;
      }
      pdf.setFont('Helvetica','bold');pdf.setFontSize(7);
      pdf.text('Compte',M+2,y);pdf.text('Débit ($)',W-M-28,y,{align:'right'});pdf.text('Crédit ($)',W-M,y,{align:'right'});y+=4;
      pdf.setFont('Helvetica','normal');
      (e.lines??[]).forEach(l=>{
        y=chkPg(pdf,y,6);pdf.setFontSize(7.5);
        pdf.text(`${aCode(l.accountId)} — ${aLabel(l.accountId)}`,M+4,y);
        if(l.type==='Debit'){pdf.setTextColor(37,99,235);pdf.text(fmtAmt(l.amount),W-M-28,y,{align:'right'});pdf.setTextColor(30,41,59);pdf.text('—',W-M,y,{align:'right'});}
        else{pdf.text('—',W-M-28,y,{align:'right'});pdf.setTextColor(5,150,105);pdf.text(fmtAmt(l.amount),W-M,y,{align:'right'});pdf.setTextColor(30,41,59);}
        y+=5.5;
      });
      pdf.setDrawColor(226,232,240);pdf.line(M,y,W-M,y);y+=5;
    });
    return pdf;
  };
  const journalPdfFilename = () => `Journal_General_${dfrom}_${dto}.pdf`;
  const expJournal = () => buildJournalPdf().save(journalPdfFilename());

  // Format "journal universel" — colonnes reconnues par l'import générique
  // d'écritures de la plupart des logiciels de tenue de livres (QuickBooks,
  // Xero, Acomba...) : une ligne par mouvement, pas de mise en forme PDF.
  // Contrairement à l'export GIFI, aucune donnée saisie par l'utilisateur
  // n'est nécessaire ici — c'est déjà le journal réel, prêt à importer.
  const buildJournalCsv = (): string => {
    const rows = [['Date', 'Code Compte', 'Nom du Compte', 'Description', 'Référence', 'Débit ($)', 'Crédit ($)']];
    filt.forEach(e => (e.lines ?? []).forEach(l => {
      rows.push([
        fmtDate(e.date), aCode(l.accountId), aLabel(l.accountId), e.description, e.documentReference || '',
        l.type === 'Debit' ? l.amount.toFixed(2) : '', l.type === 'Credit' ? l.amount.toFixed(2) : '',
      ]);
    }));
    return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  };
  const journalCsvFilename = () => `Journal_General_${dfrom}_${dto}.csv`;
  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const expJournalCSV = () => downloadCsv(buildJournalCsv(), journalCsvFilename());

  // Format spécifique à l'import "Écritures du journal général" de Sage 50
  // Canada — plus strict que le format universel ci-dessus : une colonne
  // Montant unique (positif = débit, négatif = crédit, pas deux colonnes
  // séparées), un numéro de compte qui doit correspondre exactement au plan
  // comptable Sage 50 du client (jamais deviné — voir sageCodes), et le
  // nombre de lignes de l'écriture répété sur chaque ligne ("Number of
  // Distributions"), qui indique à Sage combien de lignes regrouper.
  // Colonnes confirmées via la documentation officielle Sage 50 (Import/Export
  // Fields — General Journal).
  const sageDate = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  };
  const buildSageCsv = (): string | null => {
    const missing = allIds.filter(id => !(sageCodes[id] || '').trim());
    if (missing.length > 0) {
      alert(`Numéros de compte Sage 50 manquants pour: ${missing.map(m => aLabel(m)).join(', ')}.\nAssignez-les ci-dessous avant d'exporter (une seule fois par dossier).`);
      setShowSageMapping(true);
      return null;
    }
    const rows: string[][] = [[
      'Date', 'Reference', 'Date Cleared in Bank Rec', 'Number of Distributions', 'G/L Account',
      'Description', 'Amount', 'Job ID', 'Used for Reimbursable Expense', 'Consolidated Transaction',
      'Recur Number', 'Recur Frequency',
    ]];
    filt.forEach(e => {
      const lines = e.lines ?? [];
      const n = String(lines.length);
      lines.forEach(l => {
        const amt = l.type === 'Debit' ? l.amount : -l.amount;
        rows.push([
          sageDate(e.date), (e.documentReference || '').slice(0, 20), '', n,
          sageCodes[l.accountId] || '', (e.description || '').slice(0, 160), amt.toFixed(2),
          '', 'False', 'False', '0', '0',
        ]);
      });
    });
    return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  };
  const sageCsvFilename = () => `Journal_Sage50_${dfrom}_${dto}.csv`;
  const expSageCSV = () => {
    const csv = buildSageCsv();
    if (csv) downloadCsv(csv, sageCsvFilename());
  };

  const buildGrandLivrePdf = (): jsPDF => {
    const pdf=new jsPDF({unit:'mm',format:'a4'});const M=14,W=210;
    let y=pdfHdr(pdf,'Grand Livre',`${dfrom} au ${dto}`,co,[5,150,105]);
    filtGl.forEach(acct=>{
      y=chkPg(pdf,y,20);
      pdf.setFillColor(240,253,244);pdf.rect(M,y,182,8,'F');
      pdf.setFont('Helvetica','bold');pdf.setFontSize(8.5);pdf.setTextColor(5,150,105);
      pdf.text(`${aCode(acct.accountId)} — ${aLabel(acct.accountId)}`,M+2,y+5.5);pdf.setTextColor(30,41,59);y+=11;
      pdf.setFont('Helvetica','bold');pdf.setFontSize(7);
      pdf.text('Date',M+2,y);pdf.text('Libellé',M+22,y);pdf.text('Débit ($)',W-M-28,y,{align:'right'});pdf.text('Crédit ($)',W-M,y,{align:'right'});y+=4;
      acct.lines.forEach(({entry,line})=>{
        y=chkPg(pdf,y,6);pdf.setFont('Helvetica','normal');pdf.setFontSize(7.5);
        pdf.text(fmtDate(entry.date),M+2,y);
        pdf.text(entry.description.length>52?entry.description.slice(0,52)+'…':entry.description,M+22,y);
        if(line.type==='Debit'){pdf.setTextColor(37,99,235);pdf.text(fmtAmt(line.amount),W-M-28,y,{align:'right'});pdf.setTextColor(30,41,59);pdf.text('—',W-M,y,{align:'right'});}
        else{pdf.text('—',W-M-28,y,{align:'right'});pdf.setTextColor(5,150,105);pdf.text(fmtAmt(line.amount),W-M,y,{align:'right'});pdf.setTextColor(30,41,59);}
        y+=5.5;
      });
      y=chkPg(pdf,y,10);pdf.setDrawColor(226,232,240);pdf.line(M,y,W-M,y);y+=3;
      pdf.setFont('Helvetica','bold');pdf.setFontSize(7.5);pdf.text('Solde',M+2,y);
      pdf.setTextColor(37,99,235);pdf.text(fmtAmt(acct.td),W-M-28,y,{align:'right'});
      pdf.setTextColor(5,150,105);pdf.text(fmtAmt(acct.tc),W-M,y,{align:'right'});pdf.setTextColor(30,41,59);y+=10;
    });
    return pdf;
  };
  const grandLivrePdfFilename = () => `Grand_Livre_${dfrom}_${dto}.pdf`;
  const expGrandLivre = () => buildGrandLivrePdf().save(grandLivrePdfFilename());

  const buildBalancePdf = (): jsPDF => {
    const pdf=new jsPDF({unit:'mm',format:'a4'});const M=14,W=210;
    let y=pdfHdr(pdf,'Balance de Vérification',`au ${dto}`,co,[217,119,6]);
    y=pdfSec(pdf,'Comptes',y,M);
    pdf.setFont('Helvetica','bold');pdf.setFontSize(7.5);
    pdf.text('Code',M+2,y);pdf.text('Compte',M+16,y);
    pdf.text('Débits ($)',W-M-42,y,{align:'right'});pdf.text('Crédits ($)',W-M,y,{align:'right'});y+=5;
    pdf.setDrawColor(226,232,240);pdf.line(M,y,W-M,y);y+=3;
    bal.forEach(b=>{
      y=chkPg(pdf,y,6);pdf.setFont('Helvetica','normal');pdf.setFontSize(7.5);
      pdf.setTextColor(100,116,139);pdf.text(aCode(b.accountId),M+2,y);
      pdf.setTextColor(30,41,59);pdf.text(aLabel(b.accountId),M+16,y);
      pdf.setTextColor(37,99,235);pdf.text(fmtAmt(b.td),W-M-42,y,{align:'right'});
      pdf.setTextColor(5,150,105);pdf.text(fmtAmt(b.tc),W-M,y,{align:'right'});
      pdf.setTextColor(30,41,59);y+=5.5;
    });
    y+=3;pdf.setDrawColor(30,41,59);pdf.setLineWidth(0.4);pdf.line(M,y,W-M,y);y+=4;
    pdf.setFont('Helvetica','bold');pdf.setFontSize(9);pdf.text('TOTAUX',M+2,y);
    pdf.setTextColor(37,99,235);pdf.text(fmtAmt(bTot.td),W-M-42,y,{align:'right'});
    pdf.setTextColor(5,150,105);pdf.text(fmtAmt(bTot.tc),W-M,y,{align:'right'});pdf.setTextColor(30,41,59);y+=8;
    pdf.setFontSize(8.5);pdf.setFont('Helvetica','bold');
    if(bTot.ok){pdf.setTextColor(5,150,105);pdf.text('✓ Balance équilibrée — débits = crédits',M+2,y);}
    else{pdf.setTextColor(220,38,38);pdf.text(`⚠ Écart: ${fmtAmt(Math.abs(bTot.td-bTot.tc))} $`,M+2,y);}
    return pdf;
  };
  const balancePdfFilename = () => `Balance_Verification_${dto}.pdf`;
  const expBalance = () => buildBalancePdf().save(balancePdfFilename());

  const buildTVQPdf = (): jsPDF => {
    const pdf=new jsPDF({unit:'mm',format:'a4'});const M=14,W=210;
    let y=pdfHdr(pdf,'Rapport TPS / TVQ',`${dfrom} au ${dto}`,co,[225,29,72]);
    if(userProfile?.tps||userProfile?.tvq){
      y=pdfSec(pdf,'Numéros de taxe',y,M);pdf.setFont('Helvetica','normal');pdf.setFontSize(8.5);
      if(userProfile.tps){pdf.text(`TPS: ${userProfile.tps}`,M+2,y);y+=6;}
      if(userProfile.tvq){pdf.text(`TVQ: ${userProfile.tvq}`,M+2,y);y+=6;}
      y+=4;
    }
    y=pdfSec(pdf,`Période: ${dfrom} → ${dto}`,y,M);
    [{l:"TPS collectée (ARC)",a:tvqD.tps},{l:"TVQ collectée (Revenu QC)",a:tvqD.tvq},{l:"Taxe de séjour",a:tvqD.ts}].forEach(({l,a})=>{
      pdf.setFont('Helvetica','normal');pdf.setFontSize(8.5);pdf.setTextColor(30,41,59);pdf.text(l,M+2,y);
      pdf.setFont('Helvetica','bold');pdf.setTextColor(a>0?220:100,a>0?38:116,a>0?38:139);
      pdf.text(`${fmtAmt(a)} $`,W-M,y,{align:'right'});pdf.setTextColor(30,41,59);y+=9;
    });
    y+=3;pdf.setDrawColor(30,41,59);pdf.setLineWidth(0.4);pdf.line(M,y,W-M,y);y+=5;
    pdf.setFont('Helvetica','bold');pdf.setFontSize(11);pdf.text('TOTAL À REMETTRE',M+2,y);
    pdf.setTextColor(220,38,38);pdf.text(`${fmtAmt(tvqD.tot)} $`,W-M,y,{align:'right'});
    return pdf;
  };
  const tvqPdfFilename = () => `Rapport_TPS_TVQ_${dfrom}_${dto}.pdf`;
  const expTVQ = () => buildTVQPdf().save(tvqPdfFilename());

  // Returns null (with an alert) when a used account is still missing its
  // code — same guard whether the file is being downloaded or emailed.
  const buildGifiCsv = (): string | null => {
    const missing = bal.filter(b => !(gifiCodes[b.accountId] || '').trim());
    if (missing.length > 0) {
      alert(`Codes GIFI manquants pour: ${missing.map(m => aLabel(m.accountId)).join(', ')}.\nAssignez-les dans l'onglet Export GIFI avant d'exporter.`);
      return null;
    }
    const rows = [['Code GIFI', 'Compte AutoCompt', 'Type', 'Débits ($)', 'Crédits ($)', 'Solde ($)']];
    bal.forEach(b => rows.push([
      gifiCodes[b.accountId], aLabel(b.accountId), PLAN[b.accountId]?.type ?? '',
      b.td.toFixed(2), b.tc.toFixed(2), b.solde.toFixed(2),
    ]));
    return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  };
  const gifiCsvFilename = () => `Export_GIFI_${dfrom}_${dto}.csv`;
  const expGIFI = () => {
    const csv = buildGifiCsv();
    if (csv) downloadCsv(csv, gifiCsvFilename());
  };

  const buildSourcesPdf = (): jsPDF => {
    const pdf=new jsPDF({unit:'mm',format:'a4'});const M=14,W=210;
    let y=pdfHdr(pdf,"Sources d'Activité",`${dfrom} au ${dto}`,co,[13,148,136]);
    sourcesGrouped.forEach(g=>{
      y=chkPg(pdf,y,24);
      pdf.setFillColor(240,253,250);pdf.rect(M,y,182,8,'F');
      pdf.setFont('Helvetica','bold');pdf.setFontSize(8.5);pdf.setTextColor(13,148,136);
      pdf.text(g.source,M+2,y+5.5);pdf.setTextColor(30,41,59);y+=11;
      pdf.setFont('Helvetica','bold');pdf.setFontSize(7.5);
      pdf.text('Total revenus',M+2,y);pdf.setTextColor(5,150,105);pdf.text(fmtAmt(g.totalRevenus),M+70,y,{align:'right'});pdf.setTextColor(30,41,59);y+=5.5;
      pdf.text('Total dépenses',M+2,y);pdf.setTextColor(220,38,38);pdf.text(fmtAmt(g.totalDepenses),M+70,y,{align:'right'});pdf.setTextColor(30,41,59);y+=5.5;
      pdf.setDrawColor(226,232,240);pdf.line(M,y,M+70,y);y+=4.5;
      pdf.setFont('Helvetica','bold');pdf.text('Résultat net',M+2,y);
      pdf.setTextColor(...(g.net>=0?[5,150,105]:[220,38,38]) as [number,number,number]);
      pdf.text(fmtAmt(g.net),M+70,y,{align:'right'});pdf.setTextColor(30,41,59);y+=10;
    });
    return pdf;
  };
  const sourcesPdfFilename = () => `Sources_Activite_${dfrom}_${dto}.pdf`;
  const expSources = () => buildSourcesPdf().save(sourcesPdfFilename());

  const buildSourcesCsv = (): string => {
    const rows = [['Source', 'Date', 'Type', 'Tiers', 'Montant ($)']];
    sourcesGrouped.forEach(g => {
      g.revenus.forEach(h => rows.push([g.source, fmtDate(h.fecha), 'Revenu', h.cliente || '', (h.total || 0).toFixed(2)]));
      g.depenses.forEach(d => rows.push([g.source, fmtDate(d.fecha), 'Dépense', d.fournisseur || '', (d.total || 0).toFixed(2)]));
    });
    return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  };
  const sourcesCsvFilename = () => `Sources_Activite_${dfrom}_${dto}.csv`;
  const expSourcesCSV = () => downloadCsv(buildSourcesCsv(), sourcesCsvFilename());

  // ── Envoyer par courriel ─────────────────────────────────────────────────
  // Même contenu que le téléchargement, mais expédié directement via Resend
  // au lieu d'être remis à l'utilisateur pour qu'il le transfère lui-même.
  const [sendingEmail, setSendingEmail] = useState(false);
  const utf8ToBase64 = (str: string): string => btoa(unescape(encodeURIComponent(str)));
  const sendCurrentTabByEmail = async () => {
    let attachment: { filename: string; content: string } | null = null;
    if (tab === 'journal') attachment = { filename: journalPdfFilename(), content: buildJournalPdf().output('datauristring').split(',')[1] };
    else if (tab === 'grandlivre') attachment = { filename: grandLivrePdfFilename(), content: buildGrandLivrePdf().output('datauristring').split(',')[1] };
    else if (tab === 'balance') attachment = { filename: balancePdfFilename(), content: buildBalancePdf().output('datauristring').split(',')[1] };
    else if (tab === 'tvq') attachment = { filename: tvqPdfFilename(), content: buildTVQPdf().output('datauristring').split(',')[1] };
    else if (tab === 'gifi') { const csv = buildGifiCsv(); if (csv) attachment = { filename: gifiCsvFilename(), content: utf8ToBase64(csv) }; }
    else if (tab === 'sources') attachment = { filename: sourcesPdfFilename(), content: buildSourcesPdf().output('datauristring').split(',')[1] };
    else if (tab === 't776') attachment = { filename: t776PdfFilename(), content: buildT776Pdf().output('datauristring').split(',')[1] };
    if (!attachment) return;

    const recipient = window.prompt('Envoyer ce rapport à quel courriel ?', comptableEmail || '');
    if (!recipient) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setSendingEmail(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch('/api/send-report-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          recipientEmail: recipient, companyName: co, reportLabel: expLbl[tab],
          replyToEmail: auth.currentUser?.email, attachments: [attachment],
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || "Échec de l'envoi.");
      alert(`Courriel envoyé à ${recipient}.`);
    } catch (e: any) {
      alert(e.message ?? "Erreur lors de l'envoi du courriel.");
    }
    setSendingEmail(false);
  };

  // ── Style tokens ──────────────────────────────────────────────────────────
  const card = `${D?'bg-zinc-900/70 border-zinc-800':'bg-white border-slate-200'} rounded-3xl border shadow-sm`;
  const inp  = `px-3 py-2 rounded-xl border text-[11px] outline-none ${D?'bg-zinc-800 border-zinc-700 text-zinc-200':'bg-slate-50 border-slate-200 text-slate-800'}`;
  const lbl  = `block text-[9px] font-black uppercase tracking-wider mb-1 ${D?'text-zinc-500':'text-slate-400'}`;
  const bk   = (c:string)=>`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border ${
    c==='emerald'?(D?'bg-emerald-500/10 border-emerald-500/30 text-emerald-400':'bg-emerald-50 border-emerald-200 text-emerald-700'):
    c==='rose'   ?(D?'bg-rose-500/10 border-rose-500/30 text-rose-400':'bg-rose-50 border-rose-200 text-rose-700'):
    c==='indigo' ?(D?'bg-indigo-500/10 border-indigo-500/30 text-indigo-400':'bg-indigo-50 border-indigo-200 text-indigo-700'):
    (D?'bg-amber-500/10 border-amber-500/30 text-amber-400':'bg-amber-50 border-amber-200 text-amber-700')}`;

  // ── Paginator ─────────────────────────────────────────────────────────────
  const Pager=({page,total,set}:{page:number;total:number;set:(p:number)=>void})=>(
    <div className="flex items-center gap-2 justify-center mt-4">
      <button disabled={page<=1} onClick={()=>set(page-1)} className={`p-1.5 rounded-xl disabled:opacity-30 ${D?'hover:bg-zinc-800 text-zinc-400':'hover:bg-slate-100 text-slate-500'}`}><ChevronLeft size={14}/></button>
      <span className={`text-[10px] font-bold ${D?'text-zinc-400':'text-slate-500'}`}>Page {page} / {total}</span>
      <button disabled={page>=total} onClick={()=>set(page+1)} className={`p-1.5 rounded-xl disabled:opacity-30 ${D?'hover:bg-zinc-800 text-zinc-400':'hover:bg-slate-100 text-slate-500'}`}><ChevronRight size={14}/></button>
    </div>
  );

  // ── TAB: Journal ──────────────────────────────────────────────────────────
  const SageMappingPanel = () => {
    const missingCount = allIds.filter(id => !(sageCodes[id] || '').trim()).length;
    return (
      <div className={`${card} p-4 space-y-4`}>
        <div className="flex items-start gap-3">
          <AlertCircle size={16} className="text-orange-500 mt-0.5 shrink-0"/>
          <p className={`text-[10.5px] leading-relaxed ${D?'text-zinc-400':'text-slate-600'}`}>
            À faire une seule fois par dossier : associez chaque compte AutoCompt utilisé ci-dessous à son numéro dans le plan comptable Sage 50 de {co}. Une fois enregistrés, l'export « Journal .csv (Sage 50) » est prêt à importer directement dans Sage 50 (Fichier → Importer/Exporter → Importer → Écritures du journal général) — plus besoin de ressaisir les montants ligne par ligne.
          </p>
        </div>
        {missingCount > 0 && (
          <div className={`p-3 rounded-xl border text-[10px] font-bold ${D?'bg-rose-500/10 border-rose-500/30 text-rose-400':'bg-rose-50 border-rose-200 text-rose-700'}`}>
            ⚠ {missingCount} compte(s) utilisé(s) cette période n'ont pas encore de numéro Sage 50 — l'export sera bloqué tant qu'ils ne le sont pas.
          </div>
        )}
        {allIds.length === 0 ? (
          <p className={`text-[11px] italic ${D?'text-zinc-500':'text-slate-400'}`}>Aucun compte utilisé dans cette période.</p>
        ) : (
          <div className={`overflow-hidden rounded-xl border ${D?'border-zinc-800':'border-slate-100'}`}>
            <table className="w-full text-[10px]">
              <thead><tr className={D?'bg-zinc-800/60':'bg-slate-50'}>
                {['Compte AutoCompt','Numéro de compte Sage 50'].map(h=>(
                  <th key={h} className={`px-4 py-2.5 text-[8px] font-black uppercase text-left ${D?'text-zinc-400':'text-slate-400'}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {allIds.map(id => (
                  <tr key={id} className={`border-t ${D?'border-zinc-800':'border-slate-100'}`}>
                    <td className={`px-4 py-2 font-semibold ${D?'text-zinc-200':'text-slate-700'}`}>
                      <span className={`text-[8px] font-black mr-1.5 ${D?'text-zinc-600':'text-slate-400'}`}>{aCode(id)}</span>{aLabel(id)}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={sageCodes[id] || ''}
                        onChange={e => setSageCodes(prev => ({ ...prev, [id]: e.target.value }))}
                        placeholder="Ex: 5010"
                        className={`${inp} w-28 font-mono`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button onClick={saveSageCodes} disabled={sageSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95">
            {sageSaving ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>}
            <span>Enregistrer les numéros</span>
          </button>
          {sageSavedMsg && <span className="text-[10px] font-bold text-emerald-600">{sageSavedMsg}</span>}
        </div>
      </div>
    );
  };

  const JournalTab=()=>(
    <div className="space-y-3">
      {showSageMapping && <SageMappingPanel/>}
      {jPaged.length===0&&(
        <div className={`${card} p-8 text-center`}>
          <FileText size={32} className={`mx-auto mb-3 ${D?'text-zinc-600':'text-slate-300'}`}/>
          <p className={`text-[12px] font-bold ${D?'text-zinc-500':'text-slate-400'}`}>Aucun asiento dans cette période.</p>
        </div>
      )}
      {jPaged.map(entry=>{
        const td=(entry.lines??[]).filter(l=>l.type==='Debit').reduce((s,l)=>s+l.amount,0);
        const tc=(entry.lines??[]).filter(l=>l.type==='Credit').reduce((s,l)=>s+l.amount,0);
        const ok=Math.abs(td-tc)<0.01;
        return (
          <div key={entry.id} className={`${card} p-4`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-black ${D?'text-zinc-500':'text-slate-400'}`}><Calendar size={9} className="inline mr-0.5"/>{fmtDate(entry.date)}</span>
                  {ok
                    ?<span className={bk('emerald')}><CheckCircle2 size={8} className="inline mr-0.5"/>Équilibré</span>
                    :<span className={bk('rose')}><AlertCircle size={8} className="inline mr-0.5"/>Déséquilibré</span>
                  }
                  {/* Traçabilité pour la protection légale du client — voir
                      savePayrollRecordWithJournal : AutoCompt n'a pas calculé
                      ce montant, il provient d'un rapport de paie externe. */}
                  {entry.source==='rapport_externe'&&<span className={bk('indigo')}>Provenant d'un tiers</span>}
                </div>
                <p className={`text-[11px] font-bold mt-1 truncate ${D?'text-zinc-200':'text-slate-800'}`}>{entry.description}</p>
                {entry.documentReference&&<p className={`text-[9px] mt-0.5 font-mono ${D?'text-zinc-600':'text-slate-400'}`}><FileText size={8} className="inline mr-0.5"/>Réf: {entry.documentReference}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[13px] font-black text-indigo-600">{fmtAmt(td)} $</p>
                <p className={`text-[8px] ${D?'text-zinc-500':'text-slate-400'}`}>total asiento</p>
              </div>
            </div>
            <div className={`rounded-xl overflow-hidden border ${D?'border-zinc-800':'border-slate-100'}`}>
              <table className="w-full text-[10px]">
                <thead><tr className={D?'bg-zinc-800/60':'bg-slate-50'}>
                  {['Compte','Débit ($)','Crédit ($)'].map((h,i)=><th key={h} className={`px-3 py-1.5 text-[8px] font-black uppercase ${D?'text-zinc-500':'text-slate-400'} ${i>0?'text-right':'text-left'}`}>{h}</th>)}
                </tr></thead>
                <tbody>{(entry.lines??[]).map((line,li)=>(
                  <tr key={li} className={`border-t ${D?'border-zinc-800':'border-slate-100'}`}>
                    <td className={`px-3 py-1.5 ${D?'text-zinc-300':'text-slate-700'}`}>
                      <span className={`text-[8px] font-black mr-1 ${D?'text-zinc-600':'text-slate-400'}`}>{aCode(line.accountId)}</span>{aLabel(line.accountId)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold text-indigo-600">{line.type==='Debit'?fmtAmt(line.amount):'—'}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-600">{line.type==='Credit'?fmtAmt(line.amount):'—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        );
      })}
      {filt.length>PER&&<Pager page={jp} total={jTot} set={p=>{setJp(p);window.scrollTo(0,0);}}/>}
    </div>
  );

  // ── TAB: Grand Livre ──────────────────────────────────────────────────────
  const GrandLivreTab=()=>(
    <div className="space-y-4">
      <div className={`${card} p-4 flex items-center gap-3 flex-wrap`}>
        <Filter size={14} className={D?'text-zinc-500':'text-slate-400'}/>
        <select value={facc} onChange={e=>{setFacc(e.target.value);setGlp(1);}} className={`${inp} min-w-[220px]`}>
          <option value="">— Tous les comptes —</option>
          {allIds.map(id=><option key={id} value={id}>{aCode(id)} — {aLabel(id)}</option>)}
        </select>
        <span className={`text-[10px] ${D?'text-zinc-500':'text-slate-400'}`}>{allLns.length} mouvement(s)</span>
      </div>
      {filtGl.length===0&&<div className={`${card} p-8 text-center`}><p className={`text-[12px] ${D?'text-zinc-500':'text-slate-400'}`}>Aucun mouvement dans cette période.</p></div>}
      {filtGl.map(acct=>(
        <div key={acct.accountId} className={card}>
          <div className={`px-5 py-3 flex items-center justify-between rounded-t-3xl ${D?'bg-emerald-500/5 border-b border-emerald-500/10':'bg-emerald-50 border-b border-emerald-100'}`}>
            <div>
              <span className={`text-[8px] font-black mr-2 ${D?'text-emerald-600':'text-emerald-500'}`}>{aCode(acct.accountId)}</span>
              <span className={`text-[12px] font-black ${D?'text-emerald-400':'text-emerald-700'}`}>{aLabel(acct.accountId)}</span>
            </div>
            <div className="flex items-center gap-4">
              {[{l:'Débits',v:acct.td,c:'text-indigo-600'},{l:'Crédits',v:acct.tc,c:'text-emerald-600'},{l:'Solde',v:acct.solde,c:acct.solde>=0?'text-indigo-600':'text-rose-600'}].map(m=>(
                <div key={m.l} className="text-right"><p className={`text-[9px] font-black uppercase ${D?'text-zinc-500':'text-slate-400'}`}>{m.l}</p><p className={`text-[12px] font-black ${m.c}`}>{fmtAmt(m.v)} $</p></div>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead><tr className={D?'bg-zinc-800/40':'bg-slate-50'}>
                {['Date','Description','Débit ($)','Crédit ($)'].map((h,i)=><th key={h} className={`px-4 py-2 text-[8px] font-black uppercase ${D?'text-zinc-500':'text-slate-400'} ${i>=2?'text-right':'text-left'}`}>{h}</th>)}
              </tr></thead>
              <tbody>{acct.lines.map(({entry,line},li)=>(
                <tr key={li} className={`border-t ${D?'border-zinc-800':'border-slate-100'}`}>
                  <td className={`px-4 py-2 whitespace-nowrap ${D?'text-zinc-400':'text-slate-500'}`}>{fmtDate(entry.date)}</td>
                  <td className={`px-4 py-2 max-w-[240px] truncate ${D?'text-zinc-300':'text-slate-700'}`}>
                    {entry.description}
                    {entry.source==='rapport_externe'&&<span className={`${bk('indigo')} ml-1.5 whitespace-nowrap`}>Tiers</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-indigo-600">{line.type==='Debit'?fmtAmt(line.amount):''}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600">{line.type==='Credit'?fmtAmt(line.amount):''}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ))}
      {allLns.length>PER&&<Pager page={glp} total={glTot} set={setGlp}/>}
    </div>
  );

  // ── TAB: Balance ──────────────────────────────────────────────────────────
  const BalanceTab=()=>(
    <div className="space-y-4">
      <div className={`${card} p-4 flex items-center gap-4 flex-wrap`}>
        {bTot.ok
          ?<div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 size={20}/><span className="font-black text-sm">Balance équilibrée</span></div>
          :<div className="flex items-center gap-2 text-rose-600"><AlertCircle size={20}/><span className="font-black text-sm">Écart détecté</span></div>
        }
        <div className="ml-auto flex items-center gap-6">
          {[{l:'Total Débits',v:bTot.td,c:'text-indigo-600'},{l:'Total Crédits',v:bTot.tc,c:'text-emerald-600'}].map(m=>(
            <div key={m.l} className="text-right"><p className={`text-[8px] font-black uppercase ${D?'text-zinc-500':'text-slate-400'}`}>{m.l}</p><p className={`text-[15px] font-black ${m.c}`}>{fmtAmt(m.v)} $</p></div>
          ))}
        </div>
      </div>
      <div className={`${card} overflow-hidden`}>
        <table className="w-full text-[10px]">
          <thead><tr className={D?'bg-zinc-800/60':'bg-slate-50'}>
            {['Code','Compte','Type','Total Débits ($)','Total Crédits ($)','Solde ($)'].map((h,i)=>(
              <th key={h} className={`px-4 py-2.5 text-[8px] font-black uppercase ${D?'text-zinc-400':'text-slate-400'} ${i>=3?'text-right':'text-left'}`}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {bal.map((b,i)=>{
              const meta=PLAN[b.accountId];
              return (
                <tr key={i} className={`border-t ${D?'border-zinc-800':'border-slate-100'}`}>
                  <td className={`px-4 py-2 font-mono ${D?'text-zinc-500':'text-slate-400'}`}>{aCode(b.accountId)}</td>
                  <td className={`px-4 py-2 font-semibold ${D?'text-zinc-200':'text-slate-700'}`}>{aLabel(b.accountId)}</td>
                  <td className="px-4 py-2"><span className={bk(meta?.type==='actif'?'indigo':meta?.type==='passif'?'amber':meta?.type==='revenu'?'emerald':'rose')}>{meta?.type??'—'}</span></td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-indigo-600">{fmtAmt(b.td)}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600">{fmtAmt(b.tc)}</td>
                  <td className={`px-4 py-2 text-right font-mono font-black ${b.solde>=0?'text-indigo-600':'text-rose-600'}`}>{fmtAmt(b.solde)}</td>
                </tr>
              );
            })}
            <tr className={`border-t-2 ${D?'border-zinc-600':'border-slate-300'} ${D?'bg-zinc-800/60':'bg-slate-50'}`}>
              <td colSpan={3} className={`px-4 py-3 font-black text-[11px] ${D?'text-zinc-200':'text-slate-700'}`}>TOTAUX</td>
              <td className="px-4 py-3 text-right font-mono font-black text-indigo-700 text-[11px]">{fmtAmt(bTot.td)}</td>
              <td className="px-4 py-3 text-right font-mono font-black text-emerald-700 text-[11px]">{fmtAmt(bTot.tc)}</td>
              <td className={`px-4 py-3 text-right font-mono font-black text-[11px] ${bTot.ok?'text-emerald-600':'text-rose-600'}`}>{fmtAmt(Math.abs(bTot.td-bTot.tc))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── TAB: TPS/TVQ ──────────────────────────────────────────────────────────
  const TVQTab=()=>{
    const txe=filt.filter(e=>(e.lines??[]).some(l=>['acc-tps-payable','acc-tvq-payable','acc-taxe-sejour-payable'].includes(l.accountId)&&l.type==='Credit'));
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {label:'TPS à remettre (ARC)',    amount:tvqD.tps, color:'rose',   icon:<Percent size={16}/>},
            {label:'TVQ à remettre (Rev. QC)', amount:tvqD.tvq, color:'rose',  icon:<Percent size={16}/>},
            {label:'Taxe de séjour',           amount:tvqD.ts,  color:'amber', icon:<Receipt size={16}/>},
            {label:'Total obligations',        amount:tvqD.tot, color:'indigo',icon:<Scale size={16}/>},
          ].map((m,i)=>(
            <div key={i} className={`${card} p-4`}>
              <div className={`inline-flex p-2 rounded-xl mb-2 ${
                m.color==='rose'  ?(D?'bg-rose-500/10 text-rose-400':'bg-rose-50 text-rose-600'):
                m.color==='amber' ?(D?'bg-amber-500/10 text-amber-400':'bg-amber-50 text-amber-600'):
                (D?'bg-indigo-500/10 text-indigo-400':'bg-indigo-50 text-indigo-600')}`}>{m.icon}</div>
              <p className={`text-[9px] font-black uppercase tracking-widest ${D?'text-zinc-500':'text-slate-400'}`}>{m.label}</p>
              <p className={`text-xl font-black mt-0.5 ${m.amount>0?'text-rose-600':'text-emerald-600'}`}>{fmtAmt(m.amount)} $</p>
            </div>
          ))}
        </div>
        {(userProfile?.tps||userProfile?.tvq)&&(
          <div className={`${card} p-4 flex items-center gap-6 flex-wrap`}>
            {userProfile.tps&&<div><p className={`text-[8px] font-black uppercase ${D?'text-zinc-500':'text-slate-400'}`}>Numéro TPS (ARC)</p><p className={`text-[11px] font-bold font-mono ${D?'text-zinc-200':'text-slate-700'}`}>{userProfile.tps}</p></div>}
            {userProfile.tvq&&<div><p className={`text-[8px] font-black uppercase ${D?'text-zinc-500':'text-slate-400'}`}>Numéro TVQ (Revenu QC)</p><p className={`text-[11px] font-bold font-mono ${D?'text-zinc-200':'text-slate-700'}`}>{userProfile.tvq}</p></div>}
          </div>
        )}
        <div className={card}>
          <div className={`px-5 py-3 border-b ${D?'border-zinc-800':'border-slate-100'}`}>
            <h3 className={`text-[10px] font-black uppercase ${D?'text-zinc-400':'text-slate-400'}`}>Transactions avec taxes — {txe.length} entrée(s)</h3>
          </div>
          {txe.length===0
            ?<div className="p-8 text-center"><p className={`text-[11px] ${D?'text-zinc-500':'text-slate-400'}`}>Aucune transaction avec taxe dans cette période.</p></div>
            :(
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead><tr className={D?'bg-zinc-800/40':'bg-slate-50'}>
                    {['Date','Description','TPS ($)','TVQ ($)','T. Séjour ($)','Total ($)'].map((h,i)=>(
                      <th key={h} className={`px-4 py-2 text-[8px] font-black uppercase ${D?'text-zinc-500':'text-slate-400'} ${i>=2?'text-right':'text-left'}`}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{txe.map(entry=>{
                    const et=(entry.lines??[]).filter(l=>l.accountId==='acc-tps-payable'&&l.type==='Credit').reduce((s,l)=>s+l.amount,0);
                    const ev=(entry.lines??[]).filter(l=>l.accountId==='acc-tvq-payable'&&l.type==='Credit').reduce((s,l)=>s+l.amount,0);
                    const es=(entry.lines??[]).filter(l=>l.accountId==='acc-taxe-sejour-payable'&&l.type==='Credit').reduce((s,l)=>s+l.amount,0);
                    return (
                      <tr key={entry.id} className={`border-t ${D?'border-zinc-800':'border-slate-100'}`}>
                        <td className={`px-4 py-2 whitespace-nowrap ${D?'text-zinc-400':'text-slate-500'}`}>{fmtDate(entry.date)}</td>
                        <td className={`px-4 py-2 max-w-[200px] truncate ${D?'text-zinc-300':'text-slate-700'}`}>{entry.description}</td>
                        <td className="px-4 py-2 text-right font-mono text-rose-600">{et>0?fmtAmt(et):'—'}</td>
                        <td className="px-4 py-2 text-right font-mono text-rose-600">{ev>0?fmtAmt(ev):'—'}</td>
                        <td className="px-4 py-2 text-right font-mono text-amber-600">{es>0?fmtAmt(es):'—'}</td>
                        <td className="px-4 py-2 text-right font-mono font-black text-rose-700">{fmtAmt(et+ev+es)}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>
    );
  };

  // ── TAB: GIFI ─────────────────────────────────────────────────────────────
  const GifiTab = () => {
    const missingCount = bal.filter(b => !(gifiCodes[b.accountId] || '').trim()).length;
    return (
      <div className="space-y-4">
        <div className={`${card} p-4 flex items-start gap-3 ${D?'bg-amber-500/5':'bg-amber-50/50'}`}>
          <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0"/>
          <p className={`text-[10.5px] leading-relaxed ${D?'text-zinc-400':'text-slate-600'}`}>
            AutoCompt ne devine jamais un code GIFI — assignez-les vous-même (idéalement avec votre comptable) une seule fois ci-dessous. Ils sont enregistrés pour ce dossier et réutilisés à chaque export futur. Référence: index des codes GIFI/IGCF de l'ARC.
          </p>
        </div>
        {missingCount > 0 && (
          <div className={`p-3 rounded-xl border text-[10px] font-bold ${D?'bg-rose-500/10 border-rose-500/30 text-rose-400':'bg-rose-50 border-rose-200 text-rose-700'}`}>
            ⚠ {missingCount} compte(s) utilisé(s) cette période n'ont pas encore de code GIFI assigné — l'export sera bloqué tant qu'ils ne le sont pas.
          </div>
        )}
        <div className={`${card} overflow-hidden`}>
          <table className="w-full text-[10px]">
            <thead><tr className={D?'bg-zinc-800/60':'bg-slate-50'}>
              {['Compte AutoCompt','Type','Code GIFI'].map(h=>(
                <th key={h} className={`px-4 py-2.5 text-[8px] font-black uppercase text-left ${D?'text-zinc-400':'text-slate-400'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {Object.keys(PLAN).map(id => {
                const meta = PLAN[id];
                return (
                  <tr key={id} className={`border-t ${D?'border-zinc-800':'border-slate-100'}`}>
                    <td className={`px-4 py-2 font-semibold ${D?'text-zinc-200':'text-slate-700'}`}>
                      <span className={`text-[8px] font-black mr-1.5 ${D?'text-zinc-600':'text-slate-400'}`}>{meta.code}</span>{meta.label}
                    </td>
                    <td className="px-4 py-2">
                      <span className={bk(meta.type==='actif'?'indigo':meta.type==='passif'?'amber':meta.type==='revenu'?'emerald':'rose')}>{meta.type}</span>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={gifiCodes[id] || ''}
                        onChange={e => setGifiCodes(prev => ({ ...prev, [id]: e.target.value }))}
                        placeholder="Ex: 1001"
                        className={`${inp} w-28 font-mono`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveGifiCodes} disabled={gifiSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95">
            {gifiSaving ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>}
            <span>Enregistrer les codes</span>
          </button>
          {gifiSavedMsg && <span className="text-[10px] font-bold text-emerald-600">{gifiSavedMsg}</span>}
        </div>
      </div>
    );
  };

  // ── TAB: Sources d'Activité ─────────────────────────────────────────────────
  const SourcesTab = () => (
    <div className="space-y-4">
      <div className={`${card} p-4 flex items-start gap-3 ${D?'bg-teal-500/5':'bg-teal-50/50'}`}>
        <Filter size={16} className="text-teal-500 mt-0.5 shrink-0"/>
        <p className={`text-[10.5px] leading-relaxed ${D?'text-zinc-400':'text-slate-600'}`}>
          Regroupe les revenus et dépenses par activité (Gestion immobilière, Dividendes, AutoCompt, Prêts privés...) — exclut tout ce qui appartient au livre d'un client/édifice géré séparément. Toute entrée sans source assignée apparaît sous « {SOURCE_NON_CLASSE} », jamais cachée.
        </p>
      </div>
      {sourcesGrouped.length===0 ? (
        <div className={`${card} p-8 text-center`}>
          <Filter size={32} className={`mx-auto mb-3 ${D?'text-zinc-600':'text-slate-300'}`}/>
          <p className={`text-[12px] font-bold ${D?'text-zinc-500':'text-slate-400'}`}>Aucun revenu/dépense propre à ce compte pour cette période.</p>
        </div>
      ) : sourcesGrouped.map(g => (
        <div key={g.source} className={`${card} p-4`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h4 className={`text-[12px] font-black ${D?'text-zinc-200':'text-slate-800'}`}>{g.source}</h4>
            <span className={bk(g.net>=0?'emerald':'rose')}>{g.net>=0?'Net positif':'Net négatif'}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className={`text-[8px] font-black uppercase ${D?'text-zinc-500':'text-slate-400'}`}>Revenus ({g.revenus.length})</p>
              <p className="text-[13px] font-black text-emerald-600">{fmtAmt(g.totalRevenus)} $</p>
            </div>
            <div>
              <p className={`text-[8px] font-black uppercase ${D?'text-zinc-500':'text-slate-400'}`}>Dépenses ({g.depenses.length})</p>
              <p className="text-[13px] font-black text-rose-600">{fmtAmt(g.totalDepenses)} $</p>
            </div>
            <div>
              <p className={`text-[8px] font-black uppercase ${D?'text-zinc-500':'text-slate-400'}`}>Résultat net</p>
              <p className={`text-[13px] font-black ${g.net>=0?'text-emerald-600':'text-rose-600'}`}>{fmtAmt(g.net)} $</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ── DPA (Amortissement) — Comptable only ────────────────────────────────────
  const CCA_PRESETS = [
    { label: 'Classe 1 — Bâtiment (4%)',                ratePct: 4 },
    { label: 'Classe 8 — Mobilier et équipement (20%)', ratePct: 20 },
    { label: 'Classe 10 — Véhicule (30%)',              ratePct: 30 },
    { label: 'Autre (taux manuel)',                     ratePct: 0 },
  ];

  const ccaMax = (a: CcaAssetDoc) => {
    const net = a.additionsThisYear - a.dispositionsThisYear;
    // Règle de la demi-année : seule la moitié des ajouts nets de l'année
    // entre dans la base de calcul du taux, cette année-là.
    const base = a.openingUCC + net / 2;
    return Math.max(0, Math.round(base * (a.ratePct / 100) * 100) / 100);
  };
  const ccaClosingUCC = (a: CcaAssetDoc) =>
    a.openingUCC + a.additionsThisYear - a.dispositionsThisYear - a.claimedThisYear;
  const totalCcaClaimed = ccaAssets.reduce((s, a) => s + (a.claimedThisYear || 0), 0);

  const handleAddCcaRow = () => {
    const preset = CCA_PRESETS[0];
    const draft: CcaAssetDoc = {
      id: `${selectedBuildingId}_cca_new_${Date.now()}`,
      companyId, buildingId: selectedBuildingId, fiscalYear,
      ccaClass: preset.label, ratePct: preset.ratePct, description: '',
      openingUCC: 0, additionsThisYear: 0, dispositionsThisYear: 0, claimedThisYear: 0,
      ownerId: '', createdAt: new Date().toISOString(),
    };
    setCcaAssets(prev => [...prev, draft]);
  };
  const updateCcaRow = (id: string, patch: Partial<CcaAssetDoc>) =>
    setCcaAssets(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  const handleSaveCcaRow = async (a: CcaAssetDoc) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSavingCcaId(a.id);
    try {
      const saved = await dataService.saveCcaAsset(uid, a);
      setCcaAssets(prev => prev.map(x => x.id === a.id ? saved : x));
    } catch (e) { console.error('saveCcaAsset failed:', e); }
    setSavingCcaId('');
  };
  const handleDeleteCcaRow = async (a: CcaAssetDoc) => {
    if (!confirm(`Supprimer « ${a.description || a.ccaClass} » ?`)) return;
    try {
      if (a.ownerId) await dataService.deleteCcaAsset(a.id);
      setCcaAssets(prev => prev.filter(x => x.id !== a.id));
    } catch (e) { console.error('deleteCcaAsset failed:', e); }
  };

  // ── Repères DPA — alimentés par le propriétaire (Gestionnaire/Investisseur),
  // jamais appliqués automatiquement ici : la répartition terrain/bâtiment
  // (PropertyDoc.valeurTerrain/valeurBatiment) et les dépenses marquées
  // "Amélioration capitale" (ExpenseDoc.natureDepense) cette année-ci ne
  // sont que des suggestions — le comptable clique explicitement pour les
  // reprendre dans une ligne DPA. ──
  const selectedPropertyForDpa = properties.find(p => (p.buildingId || p.id) === selectedBuildingId);
  const capitalExpensesForBuilding = buildingExpenses.filter(e => e.natureDepense === 'capitale');
  const capitalExpensesTotal = capitalExpensesForBuilding.reduce((s, e) => s + (e.total || 0), 0);

  const DpaTab = () => (
    <div className="space-y-4">
      <div className={`${card} p-4 flex items-start gap-3 ${D?'bg-orange-500/5':'bg-orange-50/50'}`}>
        <Info size={16} className="text-orange-500 mt-0.5 shrink-0"/>
        <p className={`text-[10.5px] leading-relaxed ${D?'text-zinc-400':'text-slate-600'}`}>
          La DPA est <strong>facultative</strong> — « CCA maximale » n'est qu'un plafond de référence, jamais réclamé automatiquement. Le montant « Réclamé cette année » reste toujours votre choix : le maximiser n'est pas toujours optimal (ex. déclenche une récupération, ou gaspille de la marge une année à faible revenu). Outil de calcul, pas un avis fiscal — vérifiez indépendamment.
        </p>
      </div>
      {(selectedPropertyForDpa?.valeurTerrain != null || selectedPropertyForDpa?.valeurBatiment != null || capitalExpensesTotal > 0) && (
        <div className={`${card} p-4 space-y-3`}>
          <p className={`text-[9px] font-black uppercase tracking-widest ${D?'text-zinc-500':'text-slate-400'}`}>Repères — saisis par le propriétaire, à reprendre manuellement ci-dessous si pertinent</p>
          {(selectedPropertyForDpa?.valeurTerrain != null || selectedPropertyForDpa?.valeurBatiment != null) && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10.5px]">
              <span className={D?'text-zinc-400':'text-slate-600'}>Coût du terrain : <strong>{fmtAmt(selectedPropertyForDpa?.valeurTerrain || 0)} $</strong> <span className="opacity-60">(non amortissable)</span></span>
              <span className={D?'text-zinc-400':'text-slate-600'}>Coût du bâtiment : <strong>{fmtAmt(selectedPropertyForDpa?.valeurBatiment || 0)} $</strong> <span className="opacity-60">(base DPA)</span></span>
            </div>
          )}
          {capitalExpensesTotal > 0 && (
            <div className="pt-2 border-t border-dashed border-slate-200 dark:border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={`text-[10.5px] ${D?'text-zinc-400':'text-slate-600'}`}>Dépenses marquées « Amélioration capitale » — {fiscalYear} ({capitalExpensesForBuilding.length})</span>
                <strong className="text-[11px] text-orange-500">{fmtAmt(capitalExpensesTotal)} $</strong>
              </div>
              <ul className="space-y-0.5">
                {capitalExpensesForBuilding.map(e => (
                  <li key={e.id} className={`text-[9.5px] flex justify-between ${D?'text-zinc-500':'text-slate-400'}`}>
                    <span>{e.fecha} — {e.fournisseur}</span><span>{fmtAmt(e.total || 0)} $</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {loadingCca ? (
        <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-orange-500"/></div>
      ) : (
        <>
          {ccaAssets.map(a => (
            <div key={a.id} className={`${card} p-4 space-y-3`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Description</label>
                  <input type="text" value={a.description} onChange={e=>updateCcaRow(a.id,{description:e.target.value})} placeholder="Ex: Bâtiment principal" className={`${inp} w-full`}/>
                </div>
                <div>
                  <label className={lbl}>Catégorie DPA</label>
                  <select value={a.ccaClass} onChange={e=>{
                    const preset = CCA_PRESETS.find(p=>p.label===e.target.value);
                    updateCcaRow(a.id,{ccaClass:e.target.value, ratePct: preset ? preset.ratePct : a.ratePct});
                  }} className={`${inp} w-full`}>
                    {CCA_PRESETS.map(p=><option key={p.label} value={p.label}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className={lbl}>Taux (%)</label>
                  <input type="number" value={a.ratePct} onChange={e=>updateCcaRow(a.id,{ratePct:parseFloat(e.target.value)||0})} className={`${inp} w-full`}/>
                </div>
                <div>
                  <label className={lbl}>UCC début d'année ($)</label>
                  <input type="number" value={a.openingUCC} onChange={e=>updateCcaRow(a.id,{openingUCC:parseFloat(e.target.value)||0})} className={`${inp} w-full`}/>
                </div>
                <div>
                  <label className={lbl}>Ajouts cette année ($)</label>
                  <input type="number" value={a.additionsThisYear} onChange={e=>updateCcaRow(a.id,{additionsThisYear:parseFloat(e.target.value)||0})} className={`${inp} w-full`}/>
                  {capitalExpensesTotal > 0 && (
                    <button
                      type="button"
                      onClick={()=>updateCcaRow(a.id,{additionsThisYear: capitalExpensesTotal})}
                      className="mt-1 text-[8px] font-bold uppercase tracking-wider text-orange-500 hover:text-orange-600 text-left"
                    >
                      ↳ Suggérer {fmtAmt(capitalExpensesTotal)} $ (dépenses capitales)
                    </button>
                  )}
                </div>
                <div>
                  <label className={lbl}>Dispositions ($)</label>
                  <input type="number" value={a.dispositionsThisYear} onChange={e=>updateCcaRow(a.id,{dispositionsThisYear:parseFloat(e.target.value)||0})} className={`${inp} w-full`}/>
                </div>
                <div>
                  <label className={lbl}>Réclamé cette année ($)</label>
                  <input type="number" value={a.claimedThisYear} onChange={e=>updateCcaRow(a.id,{claimedThisYear:parseFloat(e.target.value)||0})} className={`${inp} w-full border-orange-400`}/>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-dashed border-slate-200 dark:border-zinc-800">
                <div className="flex gap-4 text-[10px]">
                  <span className={D?'text-zinc-500':'text-slate-400'}>CCA maximale (référence) : <strong className="text-orange-500">{fmtAmt(ccaMax(a))} $</strong></span>
                  <span className={D?'text-zinc-500':'text-slate-400'}>UCC fin d'année : <strong className={D?'text-zinc-300':'text-slate-700'}>{fmtAmt(ccaClosingUCC(a))} $</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>handleSaveCcaRow(a)} disabled={savingCcaId===a.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 disabled:opacity-50">
                    {savingCcaId===a.id?<Loader2 size={11} className="animate-spin"/>:<Save size={11}/>}Enregistrer
                  </button>
                  <button onClick={()=>handleDeleteCcaRow(a)} className={`p-1.5 rounded-xl ${D?'text-zinc-500 hover:text-rose-400':'text-slate-400 hover:text-rose-600'}`}><Trash2 size={13}/></button>
                </div>
              </div>
            </div>
          ))}
          <button onClick={handleAddCcaRow} disabled={!selectedBuildingId} className={`w-full py-3 rounded-2xl border border-dashed text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${D?'border-zinc-700 text-zinc-400 hover:bg-zinc-800':'border-slate-300 text-slate-500 hover:bg-slate-50'}`}>
            <Plus size={13}/>Ajouter une catégorie DPA
          </button>
          {ccaAssets.length>0 && (
            <div className={`${card} p-4 flex items-center justify-between`}>
              <span className={`text-[10px] font-black uppercase ${D?'text-zinc-400':'text-slate-500'}`}>Total DPA réclamée — {fiscalYear}</span>
              <span className="text-[16px] font-black text-orange-600">{fmtAmt(totalCcaClaimed)} $</span>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── T776 / TP-128 (Comptable only) ──────────────────────────────────────────
  // Standard CRA T776/Revenu Québec TP-128 line groupings — mapped from the
  // SAME category labels already used in the expense-entry form (Gestion
  // Plex/App.tsx), never a second, separately-maintained category list.
  const T776_GROUPS: { label: string; cats: string[] }[] = [
    { label: 'Assurances', cats: ['Assurances'] },
    { label: 'Intérêts et frais bancaires', cats: ['Intérêts hypothécaires', 'Intérêts de financement'] },
    { label: 'Frais de bureau', cats: ['Fournitures de bureau'] },
    { label: 'Honoraires professionnels', cats: ['Honoraires professionnels'] },
    { label: 'Frais de gestion et publicité', cats: ['Frais de gestion / Marketing'] },
    { label: 'Réparations et entretien', cats: ['Réparations et entretien'] },
    { label: 'Taxes foncières', cats: ['Taxes foncières et scolaires'] },
    { label: 'Services publics (électricité, chauffage)', cats: ['Électricité / Chauffage'] },
    { label: 'Frais de véhicule à moteur', cats: ['Essence / Carburant', 'Entretien Véhicule', 'Assurance auto', 'Déplacements / Automobile', 'Immatriculation / Permis'] },
    { label: 'Autres dépenses', cats: ['Autre'] },
  ];
  const NON_DEDUCTIBLE_CATS = ['Capital remboursé (non déductible)'];

  const t776Revenue = buildingInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const t776Rows = T776_GROUPS.map(g => ({
    label: g.label,
    amount: buildingExpenses.filter(e => g.cats.includes(e.cat)).reduce((s, e) => s + (e.total || 0), 0),
  }));
  const t776UnmappedTotal = buildingExpenses
    .filter(e => !NON_DEDUCTIBLE_CATS.includes(e.cat) && !T776_GROUPS.some(g => g.cats.includes(e.cat)))
    .reduce((s, e) => s + (e.total || 0), 0);
  const t776NonDeductibleTotal = buildingExpenses.filter(e => NON_DEDUCTIBLE_CATS.includes(e.cat)).reduce((s, e) => s + (e.total || 0), 0);
  const t776TotalExpenses = t776Rows.reduce((s, r) => s + r.amount, 0) + t776UnmappedTotal;
  const t776NetBeforeCca = t776Revenue - t776TotalExpenses;
  const t776NetAfterCca = t776NetBeforeCca - totalCcaClaimed;
  const selectedProperty = properties.find(p => (p.buildingId || p.id) === selectedBuildingId);

  const buildT776Pdf = (): jsPDF => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' }); const M = 14, W = 210;
    let y = pdfHdr(pdf, 'Rapport T776 / TP-128', `Année ${fiscalYear} — ${selectedProperty?.adresse || 'Immeuble'}`, co, [8, 145, 178]);
    y = pdfSec(pdf, 'Revenus', y, M);
    pdf.setFont('Helvetica', 'normal'); pdf.setFontSize(8.5);
    pdf.text('Revenus de location bruts', M + 2, y); pdf.text(`${fmtAmt(t776Revenue)} $`, W - M, y, { align: 'right' }); y += 8;
    y = pdfSec(pdf, 'Dépenses', y, M);
    t776Rows.forEach(r => {
      y = chkPg(pdf, y, 6); pdf.setFont('Helvetica', 'normal'); pdf.setFontSize(8);
      pdf.text(r.label, M + 2, y); pdf.text(`${fmtAmt(r.amount)} $`, W - M, y, { align: 'right' }); y += 5.5;
    });
    if (t776UnmappedTotal > 0) {
      pdf.text('Autres dépenses non catégorisées', M + 2, y); pdf.text(`${fmtAmt(t776UnmappedTotal)} $`, W - M, y, { align: 'right' }); y += 5.5;
    }
    pdf.setDrawColor(226, 232, 240); pdf.line(M, y, W - M, y); y += 5;
    pdf.setFont('Helvetica', 'bold'); pdf.setFontSize(8.5);
    pdf.text('Total des dépenses', M + 2, y); pdf.text(`${fmtAmt(t776TotalExpenses)} $`, W - M, y, { align: 'right' }); y += 8;
    pdf.text('Revenu net avant DPA', M + 2, y); pdf.text(`${fmtAmt(t776NetBeforeCca)} $`, W - M, y, { align: 'right' }); y += 6;
    pdf.setFont('Helvetica', 'normal'); pdf.setFontSize(8);
    pdf.text('Déduction pour amortissement (DPA) réclamée', M + 2, y); pdf.text(`${fmtAmt(totalCcaClaimed)} $`, W - M, y, { align: 'right' }); y += 8;
    pdf.setDrawColor(148, 163, 184); pdf.line(M, y, W - M, y); y += 5;
    pdf.setFont('Helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(8, 145, 178);
    pdf.text('Revenu net après DPA', M + 2, y); pdf.text(`${fmtAmt(t776NetAfterCca)} $`, W - M, y, { align: 'right' }); pdf.setTextColor(30, 41, 59); y += 10;
    if (t776NonDeductibleTotal > 0) {
      pdf.setFont('Helvetica', 'italic'); pdf.setFontSize(7); pdf.setTextColor(100, 116, 139);
      pdf.text(`Note — remboursement de capital exclu (non déductible) : ${fmtAmt(t776NonDeductibleTotal)} $`, M + 2, y);
      pdf.setTextColor(30, 41, 59);
    }
    return pdf;
  };
  const t776PdfFilename = () => `T776_TP128_${(selectedProperty?.adresse||'Immeuble').replace(/[^a-zA-Z0-9]+/g,'_')}_${fiscalYear}.pdf`;
  const expT776 = () => buildT776Pdf().save(t776PdfFilename());

  const T776Tab = () => (
    <div className="space-y-4">
      <div className={`${card} p-4 flex items-start gap-3 ${D?'bg-cyan-500/5':'bg-cyan-50/50'}`}>
        <Info size={16} className="text-cyan-500 mt-0.5 shrink-0"/>
        <p className={`text-[10.5px] leading-relaxed ${D?'text-zinc-400':'text-slate-600'}`}>
          Regroupé selon les catégories standards du formulaire T776 (fédéral) / TP-128 (Québec), à partir des dépenses déjà catégorisées de cet immeuble pour {fiscalYear}. La DPA reprend le total réclamé dans l'onglet Amortissement. Prêt à transcrire ou joindre — vérifiez toujours avant de produire.
        </p>
      </div>
      {loadingBuildingData ? (
        <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-cyan-500"/></div>
      ) : (
        <div className={`${card} overflow-hidden`}>
          <div className={`p-4 ${D?'bg-zinc-900':'bg-slate-50'} flex items-center justify-between`}>
            <span className={`text-[10px] font-black uppercase ${D?'text-zinc-400':'text-slate-500'}`}>Revenus de location bruts</span>
            <span className="text-[14px] font-black text-emerald-600">{fmtAmt(t776Revenue)} $</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {t776Rows.map(r => (
              <div key={r.label} className="px-4 py-2.5 flex items-center justify-between text-[11px]">
                <span className={D?'text-zinc-400':'text-slate-600'}>{r.label}</span>
                <span className={`font-bold ${D?'text-zinc-200':'text-slate-800'}`}>{fmtAmt(r.amount)} $</span>
              </div>
            ))}
            {t776UnmappedTotal > 0 && (
              <div className="px-4 py-2.5 flex items-center justify-between text-[11px]">
                <span className={D?'text-zinc-400':'text-slate-600'}>Autres dépenses non catégorisées</span>
                <span className={`font-bold ${D?'text-zinc-200':'text-slate-800'}`}>{fmtAmt(t776UnmappedTotal)} $</span>
              </div>
            )}
          </div>
          <div className={`p-4 space-y-2 border-t ${D?'border-zinc-800':'border-slate-100'}`}>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className={D?'text-zinc-300':'text-slate-700'}>Total des dépenses</span>
              <span className="text-rose-600">{fmtAmt(t776TotalExpenses)} $</span>
            </div>
            <div className="flex items-center justify-between text-[12px] font-black">
              <span className={D?'text-zinc-200':'text-slate-800'}>Revenu net avant DPA</span>
              <span>{fmtAmt(t776NetBeforeCca)} $</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className={D?'text-zinc-400':'text-slate-600'}>DPA réclamée</span>
              <span className="text-orange-600">− {fmtAmt(totalCcaClaimed)} $</span>
            </div>
            <div className={`flex items-center justify-between text-[15px] font-black pt-2 border-t ${D?'border-zinc-800':'border-slate-100'}`}>
              <span className={D?'text-zinc-100':'text-slate-900'}>Revenu net après DPA</span>
              <span className="text-cyan-600">{fmtAmt(t776NetAfterCca)} $</span>
            </div>
            {t776NonDeductibleTotal > 0 && (
              <p className={`text-[9px] italic pt-1 ${D?'text-zinc-600':'text-slate-400'}`}>Remboursement de capital exclu (non déductible) : {fmtAmt(t776NonDeductibleTotal)} $</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const expFn: Record<TabId,()=>void> = {journal:expJournal, grandlivre:expGrandLivre, balance:expBalance, tvq:expTVQ, gifi:expGIFI, sources:expSources, dpa:()=>{}, t776:expT776};
  const expLbl: Record<TabId,string>  = {journal:'Journal PDF', grandlivre:'Grand Livre PDF', balance:'Balance PDF', tvq:'TPS/TVQ PDF', gifi:'Export GIFI (.csv)', sources:'Sources PDF', dpa:'', t776:'Rapport T776 PDF'};

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className={`text-xl font-black ${D?'text-zinc-100':'text-slate-800'}`}>Tenue de Livres — Exportation Comptable</h1>
          <p className={`text-[11px] mt-0.5 ${D?'text-zinc-500':'text-slate-400'}`}>Journal Général · Grand Livre · Balance de Vérification · TPS/TVQ</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className={`p-2 rounded-xl border transition-all ${D?'border-zinc-700 hover:bg-zinc-800 text-zinc-400':'border-slate-200 hover:bg-slate-50 text-slate-500'}`}>
            <RefreshCw size={14} className={loading?'animate-spin':''}/>
          </button>
          {tab !== 'dpa' && (
            <button onClick={expFn[tab]} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
              <Download size={13}/>{expLbl[tab]}
            </button>
          )}
          {/* Format universel prêt à importer dans QuickBooks/Xero/Acomba —
              distinct du PDF (lecture humaine) et du GIFI (déclaration fiscale). */}
          {tab==='journal' && (
            <button onClick={expJournalCSV} title="Format universel pour import dans un logiciel de tenue de livres (QuickBooks, Xero, Acomba...)" className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border ${D?'border-zinc-700 hover:bg-zinc-800 text-zinc-300':'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
              <Download size={13}/>Journal .csv (comptabilité)
            </button>
          )}
          {tab==='journal' && (
            <button onClick={expSageCSV} title="Format compatible avec l'importation d'écritures dans Sage 50 Comptabilité (Fichier → Importer/Exporter → Importer)" className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border ${D?'border-zinc-700 hover:bg-zinc-800 text-zinc-300':'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
              <Download size={13}/>Journal .csv (Sage 50)
            </button>
          )}
          {tab==='journal' && (
            <button onClick={()=>setShowSageMapping(v=>!v)} title="Associer les comptes AutoCompt aux numéros de compte Sage 50" className={`p-2.5 rounded-2xl border transition-all active:scale-95 ${showSageMapping?(D?'border-orange-500/40 bg-orange-500/10 text-orange-400':'border-orange-200 bg-orange-50 text-orange-600'):(D?'border-zinc-700 hover:bg-zinc-800 text-zinc-400':'border-slate-200 hover:bg-slate-50 text-slate-500')}`}>
              <Hash size={13}/>
            </button>
          )}
          {tab==='sources' && (
            <button onClick={expSourcesCSV} title="Détail ligne par ligne, format .csv" className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border ${D?'border-zinc-700 hover:bg-zinc-800 text-zinc-300':'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
              <Download size={13}/>Sources .csv (détail)
            </button>
          )}
          {tab !== 'dpa' && (
            <button onClick={sendCurrentTabByEmail} disabled={sendingEmail} title="Envoyer ce rapport par courriel — vraiment expédié, pas simulé" className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-60">
              {sendingEmail ? <Loader2 size={13} className="animate-spin"/> : <Mail size={13}/>}
              Envoyer par courriel
            </button>
          )}
        </div>
      </div>

      {/* ── Date filter ── */}
      <div className={`${card} p-4 flex items-center gap-4 flex-wrap`}>
        <Calendar size={14} className={D?'text-zinc-500':'text-slate-400'}/>
        <div><label className={lbl}>Période — du</label><input type="date" value={dfrom} onChange={e=>{setDfrom(e.target.value);setJp(1);setGlp(1);}} className={inp}/></div>
        <div><label className={lbl}>au</label><input type="date" value={dto} onChange={e=>{setDto(e.target.value);setJp(1);setGlp(1);}} className={inp}/></div>
        <div className="ml-auto text-right">
          <p className={`text-[9px] font-black uppercase ${D?'text-zinc-500':'text-slate-400'}`}>Asientos</p>
          <p className={`text-[16px] font-black ${D?'text-zinc-200':'text-slate-700'}`}>{filt.length}</p>
        </div>
      </div>

      {/* ── Building/year selector — DPA + T776 are inherently per-building,
           unlike the other 6 tabs (company-wide). ── */}
      {isComptable && (tab==='dpa'||tab==='t776') && (
        <div className={`${card} p-4 flex items-center gap-4 flex-wrap`}>
          <Building2 size={14} className={D?'text-zinc-500':'text-slate-400'}/>
          <div>
            <label className={lbl}>Immeuble</label>
            {properties.length === 0 ? (
              <p className={`text-[11px] italic ${D?'text-zinc-500':'text-slate-400'}`}>Aucun immeuble enregistré pour ce client.</p>
            ) : (
              <select value={selectedBuildingId} onChange={e=>setSelectedBuildingId(e.target.value)} className={inp}>
                {properties.map(p=>(
                  <option key={p.buildingId||p.id} value={p.buildingId||p.id}>{p.adresse}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className={lbl}>Année d'imposition</label>
            <input type="number" value={fiscalYear} onChange={e=>setFiscalYear(e.target.value)} className={inp} style={{width:90}}/>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {err&&<div className={`p-4 rounded-2xl border flex items-center gap-2 text-[11px] ${D?'bg-rose-500/10 border-rose-500/30 text-rose-400':'bg-rose-50 border-rose-200 text-rose-700'}`}><AlertCircle size={14}/><span>{err}</span></div>}

      {/* ── Loading ── */}
      {loading&&<div className="flex items-center justify-center py-12 gap-3"><Loader2 size={22} className="animate-spin text-indigo-500"/><span className={`text-[12px] font-bold ${D?'text-zinc-400':'text-slate-500'}`}>Chargement du journal…</span></div>}

      {!loading&&(
        <>
          {/* ── Tabs ── */}
          <div className={`flex gap-0.5 border-b ${D?'border-zinc-800':'border-slate-200'} overflow-x-auto`}>
            {visibleTabs.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${tab===t.id?t.ac:`border-transparent ${D?'text-zinc-500 hover:text-zinc-300':'text-slate-400 hover:text-slate-600'}`}`}>
                {t.icon}<span className="hidden sm:inline">{t.label}</span><span className="sm:hidden">{t.short}</span>
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.12}}>
              {/* Called as plain functions, not <XTab/> — each was defined
                  as a nested component inside this render body, so a new
                  function reference (and thus a new React "type") got
                  created on every re-render, forcing React to fully
                  unmount/remount the whole subtree each time. Invisible for
                  read-only tabs, but it meant the GIFI code inputs lost
                  focus after every single keystroke (gifiCodes state
                  update -> parent re-render -> GifiTab redefined -> input
                  remounted). Found via Daniel's report 2026-08-13. */}
              {tab==='journal'    && JournalTab()}
              {tab==='grandlivre' && GrandLivreTab()}
              {tab==='balance'    && BalanceTab()}
              {tab==='tvq'        && TVQTab()}
              {tab==='gifi'       && GifiTab()}
              {tab==='sources'    && SourcesTab()}
              {tab==='dpa'        && isComptable && DpaTab()}
              {tab==='t776'       && isComptable && T776Tab()}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
