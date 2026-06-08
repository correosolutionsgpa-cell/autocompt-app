import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  Bell, 
  DollarSign, 
  History 
} from 'lucide-react';

export interface SyndicatCotisationsProps {
  setVista: (v: string) => void;
  darkMode: boolean;
}

interface PaymentHistory {
  id: string;
  month: string;
  amount: number;
  date: string;
  status: 'paye' | 'en_retard';
}

interface CondoUnit {
  id: string;
  unit: string;
  owner: string;
  amountDue: number;
  status: 'paye' | 'en_retard';
  history: PaymentHistory[];
}

export default function SyndicatCotisations({ setVista, darkMode }: SyndicatCotisationsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'mois_en_cours' | 'tous_les_mois'>('mois_en_cours');
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);

  // Mock data for demo purposes
  const [units] = useState<CondoUnit[]>([
    {
      id: '1',
      unit: 'Unité 101',
      owner: 'Jean Tremblay',
      amountDue: 250,
      status: 'paye',
      history: [
        { id: 'h1', month: 'Mai 2026', amount: 250, date: '01/05/2026', status: 'paye' },
        { id: 'h2', month: 'Avril 2026', amount: 250, date: '02/04/2026', status: 'paye' },
        { id: 'h3', month: 'Mars 2026', amount: 250, date: '01/03/2026', status: 'paye' },
      ],
    },
    {
      id: '2',
      unit: 'Unité 102',
      owner: 'Marie Dubois',
      amountDue: 300,
      status: 'en_retard',
      history: [
        { id: 'h4', month: 'Mai 2026', amount: 300, date: '-', status: 'en_retard' },
        { id: 'h5', month: 'Avril 2026', amount: 300, date: '05/04/2026', status: 'paye' },
        { id: 'h6', month: 'Mars 2026', amount: 300, date: '03/03/2026', status: 'paye' },
      ],
    },
    {
      id: '3',
      unit: 'Unité 201',
      owner: 'Luc Lavoie',
      amountDue: 250,
      status: 'paye',
      history: [
        { id: 'h7', month: 'Mai 2026', amount: 250, date: '02/05/2026', status: 'paye' },
        { id: 'h8', month: 'Avril 2026', amount: 250, date: '01/04/2026', status: 'paye' },
        { id: 'h9', month: 'Mars 2026', amount: 250, date: '01/03/2026', status: 'paye' },
      ],
    },
  ]);

  const filteredUnits = units.filter(unit => {
    const matchesSearch = 
      unit.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.owner.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedUnitId(prev => prev === id ? null : id);
  };

  return (
    <div className={`w-full max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500 ${darkMode ? "text-zinc-100" : "text-slate-900"}`}>
      {/* Back Navigation */}
      <button 
        onClick={() => setVista('dashboard')} 
        className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 transition-colors font-medium text-sm mb-6"
      >
        <ArrowLeft size={16} /> Retour au tableau de bord
      </button>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
          Gestion des Cotisations
        </h1>
        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">
          Suivi des paiements mensuels
        </p>
      </header>

      {/* Controls: Search and Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full pl-11 pr-4 py-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[24px] text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            placeholder="Rechercher une unité ou un copropriétaire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex bg-slate-100 dark:bg-zinc-900 p-1.5 rounded-[24px] border border-slate-200 dark:border-zinc-800 shrink-0">
          <button
            onClick={() => setFilterMode('mois_en_cours')}
            className={`px-6 py-2.5 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${
              filterMode === 'mois_en_cours'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Mois en cours
          </button>
          <button
            onClick={() => setFilterMode('tous_les_mois')}
            className={`px-6 py-2.5 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${
              filterMode === 'tous_les_mois'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Tous les mois
          </button>
        </div>
      </div>

      {/* The 'Gaveta' List (Accordion) */}
      <div className="space-y-4">
        {filteredUnits.length > 0 ? (
          filteredUnits.map((unit) => {
            const isExpanded = expandedUnitId === unit.id;

            return (
              <div 
                key={unit.id}
                className="bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm transition-all hover:border-emerald-200 dark:hover:border-emerald-900/50"
              >
                {/* Closed State (File Tab) */}
                <button
                  onClick={() => toggleExpand(unit.id)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors focus:outline-none"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        {unit.unit}
                      </h3>
                      <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 mt-0.5">
                        {unit.owner}
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:items-end">
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        {unit.amountDue.toFixed(2)} $
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                        Cotisation mensuelle
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {unit.status === 'paye' ? (
                      <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                        <CheckCircle2 size={14} className="shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Payé
                        </span>
                      </div>
                    ) : (
                      <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">
                        <AlertCircle size={14} className="shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          En retard
                        </span>
                      </div>
                    )}
                    
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
                    >
                      <ChevronDown size={18} />
                    </motion.div>
                  </div>
                </button>

                {/* Open State (Expanded) */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                          {/* Payment History */}
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                              <History size={14} /> Historique récent
                            </h4>
                            <div className="space-y-3">
                              {unit.history.map((record) => (
                                <div key={record.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50">
                                  <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                      {record.month}
                                    </p>
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-zinc-400">
                                      Date: {record.date}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                      {record.amount.toFixed(2)} $
                                    </p>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                                      record.status === 'paye' ? 'text-emerald-600' : 'text-rose-500'
                                    }`}>
                                      {record.status === 'paye' ? 'Reçu' : 'En attente'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col justify-center space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 md:mb-0">
                              Actions requises
                            </h4>
                            
                            <button className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[20px] font-black uppercase tracking-widest text-xs transition-colors shadow-lg shadow-emerald-600/20 active:scale-[0.98]">
                              <DollarSign size={16} /> Enregistrer un paiement
                            </button>
                            
                            <button className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-transparent border-2 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-600 rounded-[20px] font-black uppercase tracking-widest text-xs transition-colors active:scale-[0.98]">
                              <Bell size={16} /> Envoyer un rappel
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 px-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800">
            <p className="text-slate-500 dark:text-zinc-400 font-medium text-sm">
              Aucune unité trouvée pour "{searchQuery}".
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
