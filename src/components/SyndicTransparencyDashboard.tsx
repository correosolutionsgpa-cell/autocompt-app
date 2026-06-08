import React from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  PiggyBank, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  AlertCircle
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

interface SyndicTransparencyDashboardProps {
  depenses: any[];
  activeCompanyId: string;
}

export default function SyndicTransparencyDashboard({ depenses, activeCompanyId }: SyndicTransparencyDashboardProps) {
  // Filter expenses for this condo company
  const condoExpenses = depenses.filter(d => d.companyId === activeCompanyId);

  // Group by category to find actual spend
  const getActualSpend = (category: string) => {
    return condoExpenses
      .filter(d => (d.cat || d.category || '').toLowerCase().includes(category.toLowerCase()))
      .reduce((sum, d) => sum + (Number(d.total) || 0), 0);
  };

  // Budget vs Actual configuration
  const budgetData = [
    { name: 'Entretien', Budget: 6500, Réel: parseFloat(getActualSpend('entretien').toFixed(2)) },
    { name: 'Assurance', Budget: 3800, Réel: parseFloat(getActualSpend('assurance').toFixed(2)) },
    { name: 'Gestion', Budget: 2500, Réel: parseFloat(getActualSpend('gestion').toFixed(2)) },
    { name: 'Électricité', Budget: 1800, Réel: parseFloat(getActualSpend('electric').toFixed(2)) },
    { name: 'Chauffage', Budget: 4200, Réel: parseFloat(getActualSpend('chauffage').toFixed(2)) },
    { name: 'Travaux', Budget: 15000, Réel: parseFloat(getActualSpend('renov').toFixed(2)) }
  ];

  const totalBudget = budgetData.reduce((sum, d) => sum + d.Budget, 0);
  const totalActual = budgetData.reduce((sum, d) => sum + d.Réel, 0);
  const totalFondsPrevoyance = 62350.00;
  const totalFondsOperation = 14500.00 - totalActual;

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
          <div className="flex items-center space-x-3 text-xs bg-slate-50 dark:bg-zinc-950 px-3.5 py-2 rounded-2xl border border-slate-100 dark:border-zinc-800">
            <Calendar size={14} className="text-slate-400" />
            <span className="font-bold text-slate-700 dark:text-zinc-300">Exercice Fiscal 2026</span>
          </div>
        </div>

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
    </div>
  );
}
