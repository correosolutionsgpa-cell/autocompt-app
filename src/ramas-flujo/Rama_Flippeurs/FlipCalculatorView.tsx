/**
 * FlipCalculatorView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Flippeurs
 * Module: Calculateur de Flip (profils Flippeur ET Prospecteur — RBAC
 * "flip_calculator". Un prospecteur n'assigne pas seulement des promesses/
 * cessions, il peut aussi acheter-rénover-revendre lui-même, tout comme
 * un flippeur — pas exclusif à un seul profil.)
 *
 * Suivi d'un projet d'achat-rénovation-revente. Le coût total du projet a
 * TROIS composantes, toutes nécessaires pour un profit réel (pas juste
 * "prix de vente moins prix d'achat"), corrigé 2026-08-13 par Fabiola:
 *   1. Frais d'acquisition — notaire, taxe de mutation ("bienvenue"),
 *      inspection... saisis en un seul montant sur le projet (fraisAchat).
 *   2. Frais de possession — TOUT ce qui est dépensé pendant que le bien est
 *      détenu : rénovation, taxes foncières, assurances, intérêts
 *      hypothécaires/de financement, électricité, entretien. Lus directement
 *      depuis les dépenses déjà enregistrées dans Tenue de Livres (n'importe
 *      quelle catégorie), associées à l'adresse du projet — PAS limité à la
 *      rénovation seule.
 *   3. Frais de disposition — commission d'agent, notaire à la vente...
 *      saisis en un seul montant à la vente (fraisRevente).
 *
 * Délibérément PAS un second endroit pour saisir les dépenses de possession —
 * le formulaire rapide ici écrit dans la MÊME collection `expenses` que le
 * reste de l'app (via setDepenses, le setter qui synchronise déjà Firestore),
 * donc tout ce qui est loggé ici apparaît aussi dans Tenue de Livres, Grand
 * Livre et les déclarations TPS/TVQ — pas un silo séparé.
 *
 * Avertissement Anti-Flip : la règle fédérale de l'ARC (en vigueur depuis
 * 2023) impose une imposition à 100% comme revenu d'entreprise (aucune
 * exemption résidence principale) pour un bien détenu moins de 12 mois.
 * Le calcul ici (365 jours) est une approximation indicative, pas un avis
 * fiscal — la règle a ses propres exceptions (décès, divorce, perte
 * d'emploi...) qu'AutoCompt ne peut pas évaluer automatiquement.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Menu, Hammer, Plus, X, Loader2, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Trash2, Edit3, Receipt, Home,
} from "lucide-react";
import { auth } from "../../lib/firebase";
import { dataService } from "../../lib/dataService";
import type { FlipProjectDoc, ExpenseDoc } from "../../lib/dataService";

// Same category strings as the main "Validation IA" expense form (App.tsx)
// so an expense logged here reads identically everywhere else in the app.
// "Capital remboursé" is deliberately excluded from HOLDING_CATEGORIES — a
// mortgage principal paydown isn't a cost of the flip, it's equity.
const HOLDING_CATEGORIES = [
  "Réparations et entretien",
  "Assurances",
  "Intérêts hypothécaires",
  "Intérêts de financement",
  "Électricité / Chauffage",
  "Taxes foncières et scolaires",
  "Autre",
];
const EXCLUDED_FROM_PROJECT_COST = "Capital remboursé (non déductible)";

const fmtCAD = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n || 0);

const daysBetween = (a: string, b: string) => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

export interface FlipCalculatorViewProps {
  darkMode: boolean;
  activeCompanyId: string;
  currentCompany: any;
  setVista: (v: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  WorkspaceSidebar: React.ComponentType;
  depenses: ExpenseDoc[];
  setDepenses: (value: ExpenseDoc[] | ((prev: ExpenseDoc[]) => ExpenseDoc[])) => void;
  activeUser: string;
  playNotificationSound?: () => void;
}

const emptyForm = {
  adresse: "", dateAchat: new Date().toISOString().slice(0, 10), prixAchat: "",
  fraisAchat: "", prixReventeEstime: "", notes: "",
};

const emptySellForm = { prixReventeReel: "", dateRevente: new Date().toISOString().slice(0, 10), fraisRevente: "" };

const emptyExpenseForm = { date: new Date().toISOString().slice(0, 10), description: "", montant: "", cat: HOLDING_CATEGORIES[0] };

const FlipCalculatorView: React.FC<FlipCalculatorViewProps> = ({
  darkMode, activeCompanyId, currentCompany, setVista, setIsSidebarOpen, WorkspaceSidebar,
  depenses, setDepenses, activeUser, playNotificationSound,
}) => {
  const [projects, setProjects] = useState<FlipProjectDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [sellForm, setSellForm] = useState(emptySellForm);
  const [expenseProjectId, setExpenseProjectId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);

  const glass = darkMode
    ? "bg-slate-900/40 border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)]"
    : "bg-white border-slate-200 shadow-sm";
  const inputCls = `w-full p-3 rounded-2xl text-[12px] font-bold border outline-none ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200"}`;

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeCompanyId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      setProjects(await dataService.fetchFlipProjects(uid, activeCompanyId));
    } catch (e) {
      console.error("[FlipCalculator] load error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId]);
  useEffect(() => { load(); }, [load]);

  // Every expense tagged to this address counts toward the project's cost —
  // rénovation, taxes, assurances, intérêts, entretien, all of it — not just
  // renovation. Only a principal paydown is excluded (see constant above).
  const projectExpensesFor = (adresse: string) =>
    depenses.filter((d) => d.cat !== EXCLUDED_FROM_PROJECT_COST && d.companyId === activeCompanyId && (d as any).propertyAddress === adresse);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  const handleSaveProject = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (!form.adresse.trim() || !form.prixAchat) {
      alert("L'adresse et le prix d'achat sont obligatoires.");
      return;
    }
    setIsSaving(true);
    try {
      const existing = editingId ? projects.find((p) => p.id === editingId) : null;
      const saved = await dataService.saveFlipProject(uid, {
        id: editingId || `flip_${Date.now()}`,
        companyId: activeCompanyId,
        adresse: form.adresse.trim(),
        dateAchat: form.dateAchat,
        prixAchat: parseFloat(form.prixAchat) || 0,
        fraisAchat: form.fraisAchat ? parseFloat(form.fraisAchat) : undefined,
        prixReventeEstime: form.prixReventeEstime ? parseFloat(form.prixReventeEstime) : undefined,
        notes: form.notes || undefined,
        statut: existing?.statut || "en_cours",
        prixReventeReel: existing?.prixReventeReel,
        dateRevente: existing?.dateRevente,
        fraisRevente: existing?.fraisRevente,
      });
      setProjects((prev) => editingId ? prev.map((p) => (p.id === editingId ? saved : p)) : [saved, ...prev]);
      resetForm();
      playNotificationSound?.();
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement : " + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (p: FlipProjectDoc) => {
    setForm({
      adresse: p.adresse, dateAchat: p.dateAchat, prixAchat: String(p.prixAchat),
      fraisAchat: p.fraisAchat ? String(p.fraisAchat) : "", prixReventeEstime: p.prixReventeEstime ? String(p.prixReventeEstime) : "",
      notes: p.notes || "",
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (p: FlipProjectDoc) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (!window.confirm(`Supprimer le projet "${p.adresse}" ? Les dépenses déjà enregistrées dans Tenue de Livres pour cette adresse ne seront PAS supprimées.`)) return;
    try {
      await dataService.deleteFlipProject(uid, p.id);
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + (err?.message || err));
    }
  };

  const handleMarkSold = async (p: FlipProjectDoc) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !sellForm.prixReventeReel) { alert("Le prix de revente réel est requis."); return; }
    setIsSaving(true);
    try {
      const saved = await dataService.saveFlipProject(uid, {
        ...p,
        statut: "vendu",
        prixReventeReel: parseFloat(sellForm.prixReventeReel) || 0,
        dateRevente: sellForm.dateRevente,
        fraisRevente: sellForm.fraisRevente ? parseFloat(sellForm.fraisRevente) : undefined,
      });
      setProjects((prev) => prev.map((x) => (x.id === p.id ? saved : x)));
      setSellingId(null);
      setSellForm(emptySellForm);
      playNotificationSound?.();
    } catch (err: any) {
      alert("Erreur : " + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExpense = (p: FlipProjectDoc) => {
    const montant = parseFloat(expenseForm.montant);
    if (!montant || montant <= 0) { alert("Veuillez indiquer un montant."); return; }
    const uid = auth.currentUser?.uid;
    const newExpense: any = {
      id: Date.now(),
      companyId: activeCompanyId,
      fecha: expenseForm.date,
      fournisseur: expenseForm.description || `${expenseForm.cat} — ${p.adresse}`,
      cat: expenseForm.cat,
      subtotal: montant,
      tps: 0,
      tvq: 0,
      total: montant,
      lien: null,
      partnerTag: activeUser,
      isManual: true,
      propertyAddress: p.adresse,
      ownerId: uid,
    };
    setDepenses((prev) => [newExpense, ...prev]);
    setExpenseProjectId(null);
    setExpenseForm(emptyExpenseForm);
    playNotificationSound?.();
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-slate-950" : "bg-slate-50"}`}>
        <Loader2 size={32} className="text-indigo-500 animate-spin" />
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
        <button onClick={() => setVista("dashboard")} className={`p-2 transition-colors ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}>
          <ArrowLeft size={20} />
        </button>
        <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
          <Hammer size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-black uppercase italic tracking-tighter text-lg leading-none truncate">
            Calculateur de Flip
          </h1>
          <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${darkMode ? "text-amber-400" : "text-amber-600"}`}>
            Budget, revente et profit par projet
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-wider shadow-lg"
        >
          <Plus size={13} /> Nouveau projet
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-3xl w-full mx-auto">
        {projects.length === 0 && !showForm && (
          <div className={`p-12 rounded-[28px] border flex flex-col items-center gap-4 text-center ${glass}`}>
            <Hammer size={40} className={darkMode ? "text-zinc-700" : "text-slate-200"} />
            <p className={`text-sm font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
              Aucun projet de flip pour l'instant.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-wider"
            >
              Créer votre premier projet
            </button>
          </div>
        )}

        {/* ── New/Edit project form ─────────────────────────────────────────── */}
        {showForm && (
          <div className={`p-5 rounded-[24px] border space-y-3 ${glass}`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest">
                {editingId ? "Modifier le projet" : "Nouveau projet de flip"}
              </p>
              <button onClick={resetForm} className="text-slate-400 hover:text-rose-500"><X size={16} /></button>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Adresse de la propriété</label>
              <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="123 Rue Exemple, Montréal" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Date d'achat</label>
                <input type="date" value={form.dateAchat} onChange={(e) => setForm({ ...form, dateAchat: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Prix d'achat ($)</label>
                <input type="number" value={form.prixAchat} onChange={(e) => setForm({ ...form, prixAchat: e.target.value })} placeholder="0.00" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Frais d'achat ($) <span className="normal-case font-medium">— notaire, taxe de mutation...</span></label>
                <input type="number" value={form.fraisAchat} onChange={(e) => setForm({ ...form, fraisAchat: e.target.value })} placeholder="0.00" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Prix de revente estimé ($)</label>
                <input type="number" value={form.prixReventeEstime} onChange={(e) => setForm({ ...form, prixReventeEstime: e.target.value })} placeholder="0.00" className={inputCls} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Notes (optionnel)</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
            </div>
            <button
              onClick={handleSaveProject}
              disabled={isSaving}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider"
            >
              {isSaving ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Créer le projet"}
            </button>
          </div>
        )}

        {/* ── Project cards ──────────────────────────────────────────────────── */}
        {projects.map((p) => {
          const projectExp = projectExpensesFor(p.adresse);
          const projectExpTotal = projectExp.reduce((s, d) => s + (d.total || 0), 0);
          const prixRevente = p.statut === "vendu" ? (p.prixReventeReel || 0) : (p.prixReventeEstime || 0);
          const profit = prixRevente - p.prixAchat - (p.fraisAchat || 0) - projectExpTotal - (p.fraisRevente || 0);
          const margeSurAchat = p.prixAchat > 0 ? (profit / p.prixAchat) * 100 : 0;
          const endDate = p.statut === "vendu" && p.dateRevente ? p.dateRevente : new Date().toISOString().slice(0, 10);
          const joursDetenus = daysBetween(p.dateAchat, endDate);
          const isAntiFlip = joursDetenus < 365;
          const profitable = profit >= 0;

          return (
            <div key={p.id} className={`rounded-[24px] border overflow-hidden ${glass}`}>
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0 mt-0.5"><Home size={14} /></div>
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate">{p.adresse}</p>
                      <p className="text-[8.5px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                        Acheté le {new Date(p.dateAchat).toLocaleDateString("fr-CA")} · {joursDetenus} jours {p.statut === "vendu" ? "(détenus)" : "(en cours)"}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${p.statut === "vendu" ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500"}`}>
                    {p.statut === "vendu" ? "Vendu" : "En cours"}
                  </span>
                </div>

                {isAntiFlip && (
                  <div className={`flex items-start gap-2 p-3 rounded-xl border ${darkMode ? "bg-rose-500/10 border-rose-500/20" : "bg-rose-50 border-rose-200"}`} title="Approximation à 365 jours — la règle ARC a ses propres exceptions (décès, divorce, perte d'emploi...) qu'AutoCompt ne peut pas évaluer automatiquement.">
                    <AlertTriangle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[9.5px] font-bold text-rose-500 leading-relaxed">
                      Règle Anti-Flip (ARC) : détention {p.statut === "vendu" ? "de" : "estimée à"} moins de 12 mois — le profit serait imposé à 100% comme revenu d'entreprise, sans exemption résidence principale. Confirmez avec votre comptable.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className={`p-3 rounded-2xl border ${glass}`}>
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Acquisition (achat + frais)</p>
                    <p className="text-[13px] font-black mt-0.5">{fmtCAD(p.prixAchat + (p.fraisAchat || 0))}</p>
                  </div>
                  <div className={`p-3 rounded-2xl border ${glass}`}>
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Possession (réel)</p>
                    <p className="text-[13px] font-black mt-0.5">{fmtCAD(projectExpTotal)}</p>
                    <p className="text-[7px] font-bold text-slate-400 mt-0.5">{projectExp.length} dépense(s) liée(s) — rénov., taxes, assurances, intérêts...</p>
                  </div>
                  <div className={`p-3 rounded-2xl border ${glass}`}>
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">
                      Disposition — {p.statut === "vendu" ? "revente réelle" : "revente estimée"}
                    </p>
                    <p className="text-[13px] font-black mt-0.5">{fmtCAD(prixRevente)}</p>
                    {!!p.fraisRevente && <p className="text-[7px] font-bold text-slate-400 mt-0.5">Net de {fmtCAD(p.fraisRevente)} de frais</p>}
                  </div>
                  <div className={`p-3 rounded-2xl border ${profitable ? "border-emerald-500/30" : "border-rose-500/30"} ${glass}`}>
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      {profitable ? <TrendingUp size={9} className="text-emerald-500" /> : <TrendingDown size={9} className="text-rose-500" />}
                      Profit {p.statut !== "vendu" && "(estimé)"}
                    </p>
                    <p className={`text-[13px] font-black mt-0.5 ${profitable ? "text-emerald-500" : "text-rose-500"}`}>
                      {fmtCAD(profit)} <span className="text-[9px] font-bold">({margeSurAchat.toFixed(1)}%)</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button onClick={() => { setExpenseProjectId(p.id); setExpenseForm(emptyExpenseForm); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all">
                    <Receipt size={11} /> + Dépense de possession
                  </button>
                  {p.statut !== "vendu" && (
                    <button onClick={() => { setSellingId(p.id); setSellForm(emptySellForm); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all">
                      <CheckCircle2 size={11} /> Marquer comme vendu
                    </button>
                  )}
                  <button onClick={() => handleEdit(p)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-400 hover:bg-slate-500 hover:text-white transition-all">
                    <Edit3 size={11} /> Modifier
                  </button>
                  <button onClick={() => handleDelete(p)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                    <Trash2 size={11} /> Supprimer
                  </button>
                </div>

                {/* Quick holding-cost expense form — reno, taxes, insurance, interest... */}
                {expenseProjectId === p.id && (
                  <div className={`p-4 rounded-2xl border space-y-2.5 ${darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                      Enregistré dans Tenue de Livres, lié à cette adresse
                    </p>
                    <select value={expenseForm.cat} onChange={(e) => setExpenseForm({ ...expenseForm, cat: e.target.value })} className={inputCls}>
                      {HOLDING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2.5">
                      <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} className={inputCls} />
                      <input type="number" placeholder="Montant total ($)" value={expenseForm.montant} onChange={(e) => setExpenseForm({ ...expenseForm, montant: e.target.value })} className={inputCls} />
                    </div>
                    <input placeholder="Description (ex: Plomberie, Toiture...)" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className={inputCls} />
                    <div className="flex gap-2">
                      <button onClick={() => handleAddExpense(p)} className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider">
                        Enregistrer la dépense
                      </button>
                      <button onClick={() => setExpenseProjectId(null)} className="px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-800">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Mark-as-sold form */}
                {sellingId === p.id && (
                  <div className={`p-4 rounded-2xl border space-y-2.5 ${darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Prix de revente réel ($)</label>
                        <input type="number" value={sellForm.prixReventeReel} onChange={(e) => setSellForm({ ...sellForm, prixReventeReel: e.target.value })} className={inputCls} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Date de vente</label>
                        <input type="date" value={sellForm.dateRevente} onChange={(e) => setSellForm({ ...sellForm, dateRevente: e.target.value })} className={inputCls} />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">Frais de revente ($) — commission, notaire...</label>
                        <input type="number" value={sellForm.fraisRevente} onChange={(e) => setSellForm({ ...sellForm, fraisRevente: e.target.value })} className={inputCls} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleMarkSold(p)} disabled={isSaving} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl text-[9px] font-black uppercase tracking-wider">
                        Confirmer la vente
                      </button>
                      <button onClick={() => setSellingId(null)} className="px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-800">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default FlipCalculatorView;
