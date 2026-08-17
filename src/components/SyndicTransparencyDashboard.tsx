import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertCircle,
  Settings2,
  Plus,
  Trash2,
  X,
  Save,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { auth } from '../lib/firebase';
import { dataService } from '../lib/dataService';

interface SyndicTransparencyDashboardProps {
  depenses: any[];
  activeCompanyId: string;
}

const DEFAULT_CATEGORIES = [
  { nom: 'Entretien', budget: 0 },
  { nom: 'Assurance', budget: 0 },
  { nom: 'Gestion', budget: 0 },
  { nom: 'Électricité', budget: 0 },
  { nom: 'Chauffage', budget: 0 },
  { nom: 'Travaux', budget: 0 },
];

export default function SyndicTransparencyDashboard({ depenses, activeCompanyId }: SyndicTransparencyDashboardProps) {
  const currentYear = new Date().getFullYear();

  // ── Budget annuel + fonds — configurable par le conseil d'administration,
  // remplace ce qui était figé en dur (voir SyndicBudgetDoc). ──
  const [isLoadingBudget, setIsLoadingBudget] = useState(true);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [categories, setCategories] = useState<{ nom: string; budget: number }[]>(DEFAULT_CATEGORIES);
  const [fondsPrevoyance, setFondsPrevoyance] = useState(0);
  const [fondsOperationInitial, setFondsOperationInitial] = useState(0);
  const [editForm, setEditForm] = useState<{ categories: { nom: string; budget: string }[]; fondsPrevoyance: string; fondsOperationInitial: string }>({
    categories: DEFAULT_CATEGORIES.map((c) => ({ nom: c.nom, budget: '' })),
    fondsPrevoyance: '',
    fondsOperationInitial: '',
  });

  const loadBudget = useCallback(async () => {
    if (!activeCompanyId) { setIsLoadingBudget(false); return; }
    setIsLoadingBudget(true);
    try {
      const saved = await dataService.fetchSyndicBudget(activeCompanyId, currentYear);
      if (saved) {
        setCategories(saved.categories);
        setFondsPrevoyance(saved.fondsPrevoyance);
        setFondsOperationInitial(saved.fondsOperationInitial);
      }
    } catch (e) {
      console.error('[SyndicTransparencyDashboard] fetchSyndicBudget failed:', e);
    } finally {
      setIsLoadingBudget(false);
    }
  }, [activeCompanyId, currentYear]);
  useEffect(() => { loadBudget(); }, [loadBudget]);

  const openBudgetModal = () => {
    setEditForm({
      categories: categories.map((c) => ({ nom: c.nom, budget: c.budget ? String(c.budget) : '' })),
      fondsPrevoyance: fondsPrevoyance ? String(fondsPrevoyance) : '',
      fondsOperationInitial: fondsOperationInitial ? String(fondsOperationInitial) : '',
    });
    setShowBudgetModal(true);
  };

  const handleSaveBudget = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeCompanyId) return;
    setIsSavingBudget(true);
    try {
      const cleanCategories = editForm.categories
        .filter((c) => c.nom.trim())
        .map((c) => ({ nom: c.nom.trim(), budget: parseFloat(c.budget) || 0 }));
      const saved = await dataService.saveSyndicBudget(uid, {
        companyId: activeCompanyId,
        year: currentYear,
        categories: cleanCategories,
        fondsPrevoyance: parseFloat(editForm.fondsPrevoyance) || 0,
        fondsOperationInitial: parseFloat(editForm.fondsOperationInitial) || 0,
      });
      setCategories(saved.categories);
      setFondsPrevoyance(saved.fondsPrevoyance);
      setFondsOperationInitial(saved.fondsOperationInitial);
      setShowBudgetModal(false);
    } catch (e) {
      console.error('[SyndicTransparencyDashboard] saveSyndicBudget failed:', e);
    } finally {
      setIsSavingBudget(false);
    }
  };

  // Filter expenses for this condo company
  const condoExpenses = depenses.filter(d => d.companyId === activeCompanyId);

  // Group by category to find actual spend — matches against whatever
  // category names the conseil configured, not a hardcoded list.
  const getActualSpend = (category: string) => {
    return condoExpenses
      .filter(d => (d.cat || d.category || '').toLowerCase().includes(category.toLowerCase()))
      .reduce((sum, d) => sum + (Number(d.total) || 0), 0);
  };

  // Budget vs Actual configuration — from real, configurable data
  const budgetData = categories.map((c) => ({
    name: c.nom,
    Budget: c.budget,
    Réel: parseFloat(getActualSpend(c.nom).toFixed(2)),
  }));

  const totalBudget = budgetData.reduce((sum, d) => sum + d.Budget, 0);
  const totalActual = budgetData.reduce((sum, d) => sum + d.Réel, 0);
  const totalFondsPrevoyance = fondsPrevoyance;
  const totalFondsOperation = fondsOperationInitial - totalActual;
  const isBudgetConfigured = categories.some((c) => c.budget > 0) || fondsPrevoyance > 0 || fondsOperationInitial > 0;

  return (
    <div className="w-full space-y-8 p-1 animate-in fade-in duration-500 font-sans">
      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fonds d'opération Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-xl shadow-emerald-500/5 border border-slate-100 dark:border-zinc-800/80 transition-all flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Building2 size={22} />
            </div>
            <span className="text-[9px] font-black uppercase bg-emerald-100/70 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full">
              Fonds Courant
            </span>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">
              Fonds d'opération
            </p>
            <div className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
              {totalFondsOperation.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
            </div>
            <p className="text-[10px] font-bold text-slate-500 mt-2">
              Pour les charges courantes de copropriété.
            </p>
          </div>
        </motion.div>

        {/* Fonds de prévoyance Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-xl shadow-emerald-500/5 border border-slate-100 dark:border-zinc-800/80 transition-all flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <PiggyBank size={22} />
            </div>
            <span className="text-[9px] font-black uppercase bg-indigo-100/70 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 px-2.5 py-1 rounded-full">
              Loi 16 / Réserve
            </span>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">
              Fonds de prévoyance
            </p>
            <div className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
              {totalFondsPrevoyance.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
            </div>
            <p className="text-[10px] font-bold text-slate-500 mt-2">
              Réserves réglementaires pour réparations majeures.
            </p>
          </div>
        </motion.div>

        {/* Efficacité Budgétaire Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-xl shadow-emerald-500/5 border border-slate-100 dark:border-zinc-800/80 transition-all flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3.5 rounded-2xl ${totalActual > totalBudget ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400'}`}>
              <TrendingUp size={22} />
            </div>
            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${totalActual > totalBudget ? 'bg-rose-100/70 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-teal-100/70 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'}`}>
              {totalActual > totalBudget ? 'Dépassement' : 'Sous contrôle'}
            </span>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">
              Dépenses Totales Réelles
            </p>
            <div className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
              {totalActual.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
            </div>
            <p className="text-[10px] font-bold text-slate-500 mt-2">
              Budget total planifié : {totalBudget.toLocaleString('fr-CA')} $
            </p>
          </div>
        </motion.div>
      </div>

      {/* Main Budget vs Actual Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-zinc-800/80 text-left">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
          <div>
            <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
              Suivi Budgétaire du Conseil
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mt-0.5">
              Comparatif Prévisions Budgétaires vs Dépenses Réelles
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-3 text-xs bg-slate-50 dark:bg-zinc-950 px-3.5 py-2 rounded-2xl border border-slate-100 dark:border-zinc-800">
              <Calendar size={14} className="text-slate-400" />
              <span className="font-bold text-slate-700 dark:text-zinc-300">Exercice Fiscal {currentYear}</span>
            </div>
            <button
              onClick={openBudgetModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"
            >
              <Settings2 size={13} /> Configurer le budget
            </button>
          </div>
        </div>

        {!isLoadingBudget && !isBudgetConfigured && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-2.5 text-left">
            <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
              Aucun budget configuré pour {currentYear} — les chiffres ci-dessous sont à 0 $. Cliquez « Configurer le budget » pour les remplir.
            </p>
          </div>
        )}

        {/* Recharts Bar Chart */}
        <div className="h-[320px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={budgetData}
              margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-zinc-800" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                axisLine={false}
                tickLine={false}
                unit=" $"
              />
              <Tooltip 
                cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }} 
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '16px',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              />
              <Bar dataKey="Budget" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={20} />
              <Bar dataKey="Réel" fill="#10b981" radius={[8, 8, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Warning/Alert Section for Board Transparency */}
      {totalActual > totalBudget && (
        <div className="p-5 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/40 rounded-3xl flex items-start space-x-3.5 text-left">
          <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-[10px] font-black uppercase text-rose-800 dark:text-rose-400 tracking-wider">
              Alerte de Dépassement Budgétaire
            </h4>
            <p className="text-[10px] text-rose-700/80 dark:text-rose-300/80 mt-1 leading-relaxed font-semibold">
              Les charges réelles cumulées dépassent le budget prévisionnel de l'exercice en cours de {(totalActual - totalBudget).toFixed(2)} $. Le conseil d'administration est invité à réévaluer les contrats d'entretien courant.
            </p>
          </div>
        </div>
      )}

      {/* Budget configuration modal — conseil d'administration only */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[32px] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                Configurer le budget {currentYear}
              </h3>
              <button onClick={() => setShowBudgetModal(false)} className="text-slate-400 hover:text-rose-500">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Postes budgétaires</p>
              {editForm.categories.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={c.nom}
                    onChange={(e) => setEditForm({ ...editForm, categories: editForm.categories.map((x, xi) => (xi === i ? { ...x, nom: e.target.value } : x)) })}
                    placeholder="Nom du poste"
                    className="flex-1 p-2.5 rounded-xl text-[11px] font-bold border outline-none bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    value={c.budget}
                    onChange={(e) => setEditForm({ ...editForm, categories: editForm.categories.map((x, xi) => (xi === i ? { ...x, budget: e.target.value } : x)) })}
                    placeholder="Budget ($)"
                    className="w-32 p-2.5 rounded-xl text-[11px] font-bold border outline-none bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={() => setEditForm({ ...editForm, categories: editForm.categories.filter((_, xi) => xi !== i) })}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEditForm({ ...editForm, categories: [...editForm.categories, { nom: '', budget: '' }] })}
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center justify-center gap-1.5"
              >
                <Plus size={12} /> Ajouter un poste
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed border-slate-200 dark:border-zinc-800">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Fonds de prévoyance ($)</label>
                <input
                  type="number"
                  value={editForm.fondsPrevoyance}
                  onChange={(e) => setEditForm({ ...editForm, fondsPrevoyance: e.target.value })}
                  className="w-full p-2.5 rounded-xl text-[11px] font-bold border outline-none bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Fonds d'opération — solde de départ ($)</label>
                <input
                  type="number"
                  value={editForm.fondsOperationInitial}
                  onChange={(e) => setEditForm({ ...editForm, fondsOperationInitial: e.target.value })}
                  className="w-full p-2.5 rounded-xl text-[11px] font-bold border outline-none bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={handleSaveBudget}
              disabled={isSavingBudget}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {isSavingBudget ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
