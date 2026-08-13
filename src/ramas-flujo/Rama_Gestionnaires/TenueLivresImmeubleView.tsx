/**
 * TenueLivresImmeubleView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Gestionnaires
 * Module: Tenue de Livres par Édifice
 *
 * Livre comptable d'UN SEUL édifice — conformité OACIQ pour un gestionnaire
 * immobilier avec plusieurs clients (un édifice = un livre indépendant, jamais
 * mélangé avec les autres édifices, même client ou pas).
 *
 *   • Revenus  = LoyerDoc (`loyers`) filtrés par buildingId — c'est la seule des
 *     trois sources de revenu de l'app (LoyerDoc / InvoiceDoc / FideicommisDepotDoc)
 *     alimentée de façon fiable avec un buildingId réel, résolu depuis allUnits
 *     par handleSaveLoyer dans App.tsx.
 *   • Dépenses = ExpenseDoc (`expenses`) filtrées par buildingId.
 *   • Relevé PDF calqué sur generateRelevePDF de CompteFideicommis.tsx.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import {
  ArrowLeft, Building2, TrendingUp, TrendingDown, Scale, Download,
  Loader2, Menu, DoorOpen,
} from "lucide-react";
import { auth } from "../../lib/firebase";
import { dataService } from "../../lib/dataService";
import type { PropertyDoc, UnitDoc, LoyerDoc, ExpenseDoc } from "../../lib/dataService";

// ── Currency / date helpers ─────────────────────────────────────────────────────
const fmtCAD = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);
const ym = (d?: string) => (d || "").slice(0, 7);

// ── PDF: Livre de l'édifice ──────────────────────────────────────────────────────
function generateBuildingLedgerPDF(
  building: PropertyDoc,
  loyers: LoyerDoc[],
  depenses: ExpenseDoc[],
  period: string,
  companyName: string
): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const indigo = [99, 102, 241] as [number, number, number];
  const [year, month] = period.split("-");
  const periodLabel = new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString("fr-CA", { month: "long", year: "numeric" });

  pdf.setFillColor(...indigo);
  pdf.rect(0, 0, W, 42, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(17);
  pdf.setFont("helvetica", "bold");
  pdf.text("TENUE DE LIVRES — ÉDIFICE", 14, 16);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Période : ${periodLabel.toUpperCase()}`, 14, 25);
  pdf.text(`Édifice : ${building.adresse}`, 14, 32);
  pdf.text(`Gestionnaire : ${companyName || ""}`, 14, 39);

  let y = 52;
  const section = (title: string) => {
    pdf.setFillColor(240, 242, 255);
    pdf.rect(14, y, W - 28, 7, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(70, 80, 180);
    pdf.text(title, 16, y + 5);
    y += 10;
  };
  const line = (label: string, amount: number, color: [number, number, number]) => {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(40, 40, 40);
    pdf.text(label, 16, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...color);
    pdf.text(fmtCAD(amount), W - 14, y, { align: "right" });
    pdf.setTextColor(40, 40, 40);
    pdf.setDrawColor(220, 220, 230);
    pdf.line(16, y + 2, W - 14, y + 2);
    y += 9;
  };
  const total = (label: string, amount: number, color: [number, number, number]) => {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...color);
    pdf.text(label, 16, y);
    pdf.text(fmtCAD(amount), W - 14, y, { align: "right" });
    y += 12;
  };

  section("REVENUS — LOYERS PERÇUS");
  let totalLoyers = 0;
  if (loyers.length === 0) {
    pdf.setFontSize(8); pdf.setTextColor(150, 150, 150);
    pdf.text("Aucun loyer enregistré pour cette période.", 16, y); y += 9;
  }
  loyers.forEach(l => {
    line(`${l.uniteAdresse} — ${l.locataire}`, l.loyer, [22, 101, 52]);
    totalLoyers += l.loyer;
  });
  total("TOTAL REVENUS", totalLoyers, [22, 101, 52]);

  section("DÉPENSES DE L'ÉDIFICE");
  let totalDepenses = 0;
  if (depenses.length === 0) {
    pdf.setFontSize(8); pdf.setTextColor(150, 150, 150);
    pdf.text("Aucune dépense enregistrée pour cette période.", 16, y); y += 9;
  }
  depenses.forEach(d => {
    line(`${d.fournisseur} (${d.cat})`, d.total, [180, 50, 50]);
    totalDepenses += d.total;
  });
  total("TOTAL DÉPENSES", totalDepenses, [180, 50, 50]);

  const net = totalLoyers - totalDepenses;
  pdf.setFillColor(230, 255, 240);
  pdf.roundedRect(14, y, W - 28, 16, 3, 3, "F");
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(22, 101, 52);
  pdf.text("RÉSULTAT NET DE L'ÉDIFICE", 20, y + 10);
  pdf.text(fmtCAD(net), W - 14, y + 10, { align: "right" });

  pdf.setFillColor(245, 245, 250);
  pdf.rect(0, 265, W, 32, "F");
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  pdf.text("Relevé généré automatiquement par AutoCompt · Gestionnaire Immobilier.", 14, 273);
  pdf.text("OACIQ — Conformité Loi sur le courtage immobilier (RLRQ, c C-73.2)", 14, 279);
  pdf.text(`Généré le ${new Date().toLocaleString("fr-CA")}`, 14, 285);

  return pdf;
}

// ── Props ──────────────────────────────────────────────────────────────────────
export interface TenueLivresImmeubleViewProps {
  darkMode: boolean;
  activeCompanyId: string;
  currentCompany: any;
  adminName: string;
  adminEmail: string;
  /** PropertyDoc.id of the building this ledger belongs to. */
  buildingId: string;
  setVista: (v: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  WorkspaceSidebar: React.ComponentType;
}

// ── Component ─────────────────────────────────────────────────────────────────
const TenueLivresImmeubleView: React.FC<TenueLivresImmeubleViewProps> = ({
  darkMode,
  activeCompanyId,
  currentCompany,
  buildingId,
  setVista,
  setIsSidebarOpen,
  WorkspaceSidebar,
}) => {
  const [building, setBuilding] = useState<PropertyDoc | null>(null);
  const [units, setUnits] = useState<UnitDoc[]>([]);
  const [loyers, setLoyers] = useState<LoyerDoc[]>([]);
  const [depenses, setDepenses] = useState<ExpenseDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(() => new Date().toISOString().slice(0, 7));

  const glass = darkMode
    ? "bg-slate-900/40 border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)]"
    : "bg-white border-slate-200 shadow-sm";

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !buildingId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [props, allUnits, allLoyers, allExpenses, meubleRes, meubleExp] = await Promise.all([
        dataService.fetchProperties(uid),
        dataService.fetchAllUnits(uid),
        dataService.fetchLoyers(uid),
        dataService.fetchExpenses(uid),
        dataService.fetchMeubleReservations(uid, activeCompanyId).catch(() => []),
        dataService.fetchMeubleExpenses(uid, activeCompanyId).catch(() => []),
      ]);
      setBuilding(props.find(p => p.id === buildingId) || null);
      setUnits(allUnits.filter(u => u.buildingId === buildingId));

      // Meublé/Airbnb reservations & expenses tagged with this building were
      // never included here — a gestionnaire managing a short-term-rental
      // building never saw that revenue/expense in the building's own
      // ledger. Adapted into LoyerDoc/ExpenseDoc-compatible shapes so the
      // rest of this view's calculations don't need to know the difference.
      // Found via Meublé module audit, 2026-08-13.
      const meubleLoyers: LoyerDoc[] = meubleRes
        .filter((r) => r.buildingId === buildingId)
        .map((r) => ({
          id: r.id,
          companyId: r.companyId,
          uniteAdresse: "Meublé/Airbnb",
          locataire: `${r.guestName} (${r.platform})`,
          loyer: r.nights * r.nightlyRate,
          statut: "Payé" as const,
          unitId: r.unitId,
          buildingId: r.buildingId,
          date: r.checkIn,
          ownerId: uid,
          createdAt: r.checkIn,
        }));
      const meubleDepenses: ExpenseDoc[] = meubleExp
        .filter((e) => e.buildingId === buildingId)
        .map((e) => ({
          id: e.id,
          companyId: e.companyId,
          fecha: e.date,
          fournisseur: "Meublé/Airbnb",
          cat: e.category,
          subtotal: e.amount,
          tps: 0,
          tvq: 0,
          total: e.amount,
          lien: e.lien || null,
          partnerTag: "",
          ownerId: uid,
          createdAt: e.createdAt,
        }));

      setLoyers([...allLoyers.filter(l => l.buildingId === buildingId), ...meubleLoyers]);
      setDepenses([...allExpenses.filter(d => d.buildingId === buildingId), ...meubleDepenses]);
    } catch (e) {
      console.error("[TenueLivresImmeuble] load error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, activeCompanyId]);

  useEffect(() => { load(); }, [load]);

  const periodLoyers = loyers.filter(l => ym(l.date) === selectedPeriod);
  const periodDepenses = depenses.filter(d => ym(d.fecha) === selectedPeriod);
  const totalLoyers = periodLoyers.reduce((s, l) => s + (l.loyer || 0), 0);
  const totalDepenses = periodDepenses.reduce((s, d) => s + (d.total || 0), 0);
  const net = totalLoyers - totalDepenses;

  const handleDownload = () => {
    if (!building) return;
    const pdf = generateBuildingLedgerPDF(building, periodLoyers, periodDepenses, selectedPeriod, currentCompany?.nombre);
    pdf.save(`Livre-${building.adresse.replace(/\s+/g, "-")}-${selectedPeriod}.pdf`);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-slate-950" : "bg-slate-50"}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="text-indigo-500 animate-spin" />
          <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
            Chargement du livre…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col font-sans md:pl-72`}>
      <WorkspaceSidebar />

      <header className={`${glass} px-6 py-4 border-b flex items-center gap-3 sticky top-0 z-40`}>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white md:hidden">
          <Menu size={18} />
        </button>
        <button onClick={() => setVista("portefeuille_client")} className={`p-2 transition-colors ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}>
          <ArrowLeft size={20} />
        </button>
        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
          <Building2 size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-black uppercase italic tracking-tighter text-lg leading-none truncate">
            {building?.adresse || "Édifice"}
          </h1>
          <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
            Tenue de livres — livre indépendant de cet édifice
          </p>
        </div>
        <input
          type="month"
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          className={`text-[10px] font-bold rounded-xl px-3 py-2 border outline-none ${darkMode ? "bg-zinc-900 border-zinc-700 text-zinc-200" : "bg-white border-slate-200"}`}
        />
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-3xl w-full mx-auto">
        {!building ? (
          <div className={`p-12 rounded-[28px] border flex flex-col items-center gap-4 text-center ${glass}`}>
            <Building2 size={40} className={darkMode ? "text-zinc-700" : "text-slate-200"} />
            <p className={`text-sm font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
              Édifice introuvable.
            </p>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className={`p-4 rounded-[24px] border ${glass}`}>
                <div className="text-emerald-500 mb-2"><TrendingUp size={16} /></div>
                <p className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Revenus (loyers)</p>
                <p className="text-base font-black tracking-tighter text-emerald-500 mt-0.5">{fmtCAD(totalLoyers)}</p>
              </div>
              <div className={`p-4 rounded-[24px] border ${glass}`}>
                <div className="text-rose-500 mb-2"><TrendingDown size={16} /></div>
                <p className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Dépenses</p>
                <p className="text-base font-black tracking-tighter text-rose-500 mt-0.5">{fmtCAD(totalDepenses)}</p>
              </div>
              <div className={`p-4 rounded-[24px] border ${glass}`}>
                <div className="text-indigo-500 mb-2"><Scale size={16} /></div>
                <p className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Résultat net</p>
                <p className="text-base font-black tracking-tighter text-indigo-500 mt-0.5">{fmtCAD(net)}</p>
              </div>
            </div>

            {/* Units summary */}
            {units.length > 0 && (
              <div className={`p-4 rounded-[24px] border flex items-center gap-4 ${glass}`}>
                <DoorOpen size={18} className="text-indigo-500 shrink-0" />
                <p className={`text-[10px] font-bold ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                  {units.length} unité(s) enregistrée(s) dans cet édifice
                </p>
              </div>
            )}

            {/* Download */}
            <button
              onClick={handleDownload}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <Download size={13} />Télécharger le livre (PDF) — {selectedPeriod}
            </button>

            {/* Revenus list */}
            <div>
              <h3 className={`text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                Revenus — Loyers perçus ({periodLoyers.length})
              </h3>
              {periodLoyers.length === 0 ? (
                <div className={`p-6 rounded-[20px] border text-center ${glass}`}>
                  <p className={`text-[10px] font-medium italic ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Aucun loyer enregistré pour cette période.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {periodLoyers.map(l => (
                    <div key={l.id} className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-[11px] ${darkMode ? "bg-zinc-900/40" : "bg-slate-50"}`}>
                      <span className="font-bold truncate">{l.uniteAdresse} — {l.locataire}</span>
                      <span className="font-black text-emerald-500 shrink-0 ml-2">{fmtCAD(l.loyer)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dépenses list */}
            <div>
              <h3 className={`text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                Dépenses de l'édifice ({periodDepenses.length})
              </h3>
              {periodDepenses.length === 0 ? (
                <div className={`p-6 rounded-[20px] border text-center ${glass}`}>
                  <p className={`text-[10px] font-medium italic ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Aucune dépense enregistrée pour cette période.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {periodDepenses.map(d => (
                    <div key={d.id} className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-[11px] ${darkMode ? "bg-zinc-900/40" : "bg-slate-50"}`}>
                      <span className="font-bold truncate">{d.fournisseur} <span className={darkMode ? "text-zinc-600" : "text-slate-400"}>({d.cat})</span></span>
                      <span className="font-black text-rose-500 shrink-0 ml-2">{fmtCAD(d.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default TenueLivresImmeubleView;
