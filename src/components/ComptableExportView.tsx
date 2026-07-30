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
  Calendar, Filter, RefreshCw, FileText, Percent,
} from 'lucide-react';
import { dataService } from '../lib/dataService';
import { auth } from '../lib/firebase';

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
}

export interface ComptableExportViewProps {
  darkMode: boolean;
  companyId: string;
  companyName?: string;
  userProfile?: { nom?: string; neq?: string; tps?: string; tvq?: string; adresse?: string };
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
  'acc-tps-payable':         { label: 'TPS à remettre (passif)',      type: 'passif', code: '2310' },
  'acc-tvq-payable':         { label: 'TVQ à remettre (passif)',      type: 'passif', code: '2320' },
  'acc-taxe-sejour-payable': { label: 'Taxe de séjour à remettre',   type: 'passif', code: '2330' },
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

type TabId = 'journal'|'grandlivre'|'balance'|'tvq';
const PER = 25;

const TABS = [
  { id:'journal'    as TabId, label:'Journal Général',         short:'Journal',  icon:<BookOpen size={14}/>,  ac:'border-indigo-500 text-indigo-600'  },
  { id:'grandlivre' as TabId, label:'Grand Livre',             short:'G. Livre', icon:<BarChart2 size={14}/>, ac:'border-emerald-500 text-emerald-600' },
  { id:'balance'    as TabId, label:'Balance de Vérification', short:'Balance',  icon:<Scale size={14}/>,     ac:'border-amber-500 text-amber-600'     },
  { id:'tvq'        as TabId, label:'Rapport TPS / TVQ',       short:'TPS/TVQ',  icon:<Percent size={14}/>,   ac:'border-rose-500 text-rose-600'       },
];

export default function ComptableExportView({
  darkMode, companyId, companyName='Mon Entreprise', userProfile,
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

  const jTot = Math.max(1,Math.ceil(filt.length/PER));
  const jPaged = filt.slice((jp-1)*PER, jp*PER);
  const glTot  = Math.max(1,Math.ceil(allLns.length/PER));

  // ── PDF exports ───────────────────────────────────────────────────────────
  const co = userProfile?.nom ?? companyName;

  const expJournal = () => {
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
    pdf.save(`Journal_General_${dfrom}_${dto}.pdf`);
  };

  const expGrandLivre = () => {
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
    pdf.save(`Grand_Livre_${dfrom}_${dto}.pdf`);
  };

  const expBalance = () => {
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
    pdf.save(`Balance_Verification_${dto}.pdf`);
  };

  const expTVQ = () => {
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
    pdf.save(`Rapport_TPS_TVQ_${dfrom}_${dto}.pdf`);
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
  const JournalTab=()=>(
    <div className="space-y-3">
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
                  <td className={`px-4 py-2 max-w-[240px] truncate ${D?'text-zinc-300':'text-slate-700'}`}>{entry.description}</td>
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

  // ── Render ────────────────────────────────────────────────────────────────
  const expFn: Record<TabId,()=>void> = {journal:expJournal, grandlivre:expGrandLivre, balance:expBalance, tvq:expTVQ};
  const expLbl: Record<TabId,string>  = {journal:'Journal PDF', grandlivre:'Grand Livre PDF', balance:'Balance PDF', tvq:'TPS/TVQ PDF'};

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
          <button onClick={expFn[tab]} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
            <Download size={13}/>{expLbl[tab]}
          </button>
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

      {/* ── Error ── */}
      {err&&<div className={`p-4 rounded-2xl border flex items-center gap-2 text-[11px] ${D?'bg-rose-500/10 border-rose-500/30 text-rose-400':'bg-rose-50 border-rose-200 text-rose-700'}`}><AlertCircle size={14}/><span>{err}</span></div>}

      {/* ── Loading ── */}
      {loading&&<div className="flex items-center justify-center py-12 gap-3"><Loader2 size={22} className="animate-spin text-indigo-500"/><span className={`text-[12px] font-bold ${D?'text-zinc-400':'text-slate-500'}`}>Chargement du journal…</span></div>}

      {!loading&&(
        <>
          {/* ── Tabs ── */}
          <div className={`flex gap-0.5 border-b ${D?'border-zinc-800':'border-slate-200'} overflow-x-auto`}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${tab===t.id?t.ac:`border-transparent ${D?'text-zinc-500 hover:text-zinc-300':'text-slate-400 hover:text-slate-600'}`}`}>
                {t.icon}<span className="hidden sm:inline">{t.label}</span><span className="sm:hidden">{t.short}</span>
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.12}}>
              {tab==='journal'    &&<JournalTab/>}
              {tab==='grandlivre' &&<GrandLivreTab/>}
              {tab==='balance'    &&<BalanceTab/>}
              {tab==='tvq'        &&<TVQTab/>}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
