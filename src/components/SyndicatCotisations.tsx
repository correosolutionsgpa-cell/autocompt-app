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
  History,
  X,
  Send,
  TrendingUp,
  Clock
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

  // Toast State
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals and Transaction States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<CondoUnit | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'interac' | 'cheque' | 'comptant'>('interac');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Reminders loading state
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  // Mock data for demo purposes (now reactive)
  const [units, setUnits] = useState<CondoUnit[]>([
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

  // Web Audio API Sound Generator
  const playSound = (type: 'cash' | 'swoop' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'cash') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now); // A5
        osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(587.33, now + 0.06); // D5

        gainNode.gain.setValueAtTime(0.04, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.12);
        osc2.start(now + 0.06);
        osc2.stop(now + 0.35);
      } else if (type === 'swoop') {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(850, now + 0.3);

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.03, now + 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95, now);
        gainNode.gain.setValueAtTime(0.04, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.warn("Sound play ignored", e);
    }
  };

  // Toast helper
  const triggerToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    if (type !== 'success') {
      playSound('error');
    }
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Calculations for KPI Summary
  const totalDueCurrentMonth = units.reduce((acc, u) => acc + u.amountDue, 0);
  
  const totalPaidCurrentMonth = units
    .filter(u => u.status === 'paye')
    .reduce((acc, u) => acc + u.amountDue, 0);

  const totalOutstandingCurrentMonth = units
    .filter(u => u.status === 'en_retard')
    .reduce((acc, u) => acc + u.amountDue, 0);

  const recoveryRate = totalDueCurrentMonth > 0 
    ? Math.round((totalPaidCurrentMonth / totalDueCurrentMonth) * 100) 
    : 0;

  // Search filter
  const filteredUnits = units.filter(unit => {
    const matchesSearch = 
      unit.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.owner.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedUnitId(prev => prev === id ? null : id);
  };

  // Register Transaction Payment
  const handleRegisterPayment = () => {
    if (!selectedUnit) return;
    if (paymentAmount <= 0) {
      triggerToast("Veuillez entrer un montant valide.", "error");
      return;
    }

    const todayStr = new Date().toLocaleDateString('fr-CA', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const monthStr = 'Mai 2026';

    setUnits(prev => prev.map(u => {
      if (u.id === selectedUnit.id) {
        // Build history verifications
        const cleanHistory = u.history.filter(h => h.month !== monthStr);
        const newHistoryRecord: PaymentHistory = {
          id: Math.random().toString(36).substr(2, 9),
          month: monthStr,
          amount: paymentAmount,
          date: todayStr,
          status: 'paye'
        };

        return {
          ...u,
          status: 'paye',
          history: [newHistoryRecord, ...cleanHistory]
        };
      }
      return u;
    }));

    setIsPaymentModalOpen(false);
    setSelectedUnit(null);
    playSound('cash');
    triggerToast(`Paiement de ${paymentAmount.toFixed(2)} $ enregistré pour ${selectedUnit.unit} !`, 'success');
  };

  // Send interactive reminder
  const handleSendReminder = (unit: CondoUnit) => {
    setSendingReminderId(unit.id);
    playSound('swoop');
    setTimeout(() => {
      setSendingReminderId(null);
      triggerToast(`Rappel de cotisation envoyé par courriel & SMS à ${unit.owner} !`, 'success');
    }, 1500);
  };

  return (
    <div className="relative font-sans text-left">
      {/* Toast popup */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] w-max max-w-sm px-6 py-4 rounded-[20px] shadow-2xl border flex items-center gap-3 backdrop-blur-md"
            style={{
              backgroundColor: toast.type === 'success' 
                ? (darkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(209, 250, 229, 0.9)')
                : (darkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(254, 226, 226, 0.9)'),
              borderColor: toast.type === 'success' ? '#10b981' : '#ef4444',
              color: toast.type === 'success' 
                ? (darkMode ? '#34d399' : '#065f46')
                : (darkMode ? '#fca5a5' : '#991b1b')
            }}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
            <span className="text-[10px] font-black uppercase tracking-wider">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`rounded-[32px] p-6 sm:p-8 shadow-sm ${darkMode ? "bg-zinc-900/40 border border-zinc-800" : "bg-white border border-slate-200"}`}>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white mt-0">
              Gestion des Cotisations
            </h1>
            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">
              Suivi et encaissement des charges de copropriété
            </p>
          </div>
        </div>

        {/* Dashboard Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className={`rounded-3xl p-6 border backdrop-blur-md ${darkMode ? "bg-zinc-950/80 border-zinc-900/60 shadow-[0_0_20px_rgba(16,185,129,0.02)]" : "bg-white border-slate-200/80 shadow-sm"}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-500" /> Total Collecté (Mai 2026)
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {totalPaidCurrentMonth.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
              </span>
              <span className="text-xs font-semibold text-slate-400 dark:text-zinc-650">/ {totalDueCurrentMonth} $</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-900 h-2 rounded-full mt-4 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${recoveryRate}%` }} />
            </div>
          </div>

          <div className={`rounded-3xl p-6 border backdrop-blur-md ${darkMode ? "bg-zinc-950/80 border-zinc-900/60 shadow-[0_0_20px_rgba(239,68,68,0.02)]" : "bg-white border-slate-200/80 shadow-sm"}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2 flex items-center gap-1.5">
              <AlertCircle size={12} className={totalOutstandingCurrentMonth > 0 ? "text-rose-500" : "text-slate-400"} /> Solde en Retard
            </p>
            <span className={`text-2xl font-black ${totalOutstandingCurrentMonth > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
              {totalOutstandingCurrentMonth.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
            </span>
            <p className="text-[9px] font-medium text-slate-400 dark:text-zinc-500 mt-4 leading-none">
              {units.filter(u => u.status === 'en_retard').length} copropriétaire(s) en souffrance
            </p>
          </div>

          <div className={`rounded-3xl p-6 border backdrop-blur-md ${darkMode ? "bg-zinc-950/80 border-zinc-900/60 shadow-[0_0_20px_rgba(20,184,166,0.02)]" : "bg-white border-slate-200/80 shadow-sm"}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2 flex items-center gap-1.5">
              <TrendingUp size={12} className="text-teal-500" /> Taux de Recouvrement
            </p>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{recoveryRate} %</span>
            <div className="w-full bg-slate-100 dark:bg-zinc-900 h-2 rounded-full mt-4 overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${recoveryRate}%` }} />
            </div>
          </div>
        </div>

        {/* Controls: Search and Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400 dark:text-zinc-500" />
            </div>
            <input
              type="text"
              className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-zinc-950/80 border border-slate-200/80 dark:border-zinc-900 rounded-[24px] text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-650 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
              placeholder="Rechercher une unité ou un copropriétaire..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex bg-slate-100 dark:bg-zinc-950 p-1.5 rounded-[24px] border border-slate-200/50 dark:border-zinc-900/80 shrink-0">
            <button
              onClick={() => setFilterMode('mois_en_cours')}
              className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                filterMode === 'mois_en_cours'
                  ? (darkMode ? 'bg-zinc-900 border border-zinc-800 text-white shadow-sm' : 'bg-white border border-slate-200/60 text-slate-900 shadow-sm')
                  : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-350 border border-transparent'
              }`}
            >
              Mois en cours
            </button>
            <button
              onClick={() => setFilterMode('tous_les_mois')}
              className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                filterMode === 'tous_les_mois'
                  ? (darkMode ? 'bg-zinc-900 border border-zinc-800 text-white shadow-sm' : 'bg-white border border-slate-200/60 text-slate-900 shadow-sm')
                  : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-350 border border-transparent'
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
              const isEnRetard = unit.status === 'en_retard';

              // Visual styles
              const cardClasses = isExpanded
                ? (isEnRetard 
                    ? (darkMode ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)] backdrop-blur-md" : "bg-amber-50/40 border-amber-500/30 shadow-md backdrop-blur-md")
                    : (darkMode ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)] backdrop-blur-md" : "bg-emerald-50/40 border-emerald-500/30 shadow-md backdrop-blur-md"))
                : (darkMode 
                    ? 'bg-zinc-950/80 border-zinc-900/80 hover:bg-zinc-900/40 hover:border-zinc-800 text-zinc-300' 
                    : 'bg-white border-slate-200/80 hover:bg-slate-50/50 hover:border-slate-350 text-slate-700');

              return (
                <div 
                  key={unit.id}
                  className={`rounded-[32px] overflow-hidden transition-all duration-300 border ${cardClasses} ${isExpanded ? 'shadow-xl' : 'shadow-sm hover:shadow-md'}`}
                >
                  <button
                    onClick={() => toggleExpand(unit.id)}
                    className={`w-full flex items-center justify-between p-6 sm:p-7 text-left transition-colors border-none bg-transparent cursor-pointer ${darkMode ? "hover:bg-zinc-900/20" : "hover:bg-slate-50/50"}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                      <div>
                        <h3 className={`font-black text-base sm:text-lg tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                          {unit.unit}
                        </h3>
                        <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 mt-0.5">
                          {unit.owner}
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:items-start leading-none">
                        <span className={`text-base font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
                          {unit.amountDue.toFixed(2)} $
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mt-1">
                          Cotisation mensuelle
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {unit.status === 'paye' ? (
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-550/10 border border-teal-100 dark:border-teal-500/20 text-teal-700 dark:text-emerald-450">
                          <CheckCircle2 size={12} className="shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Payé</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-550/10 border border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
                          <AlertCircle size={12} className="shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-widest">En retard</span>
                        </div>
                      )}
                      
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                        className={`p-2.5 rounded-full shrink-0 ${darkMode ? "bg-zinc-900 text-zinc-400" : "bg-slate-100 text-slate-400"}`}
                      >
                        <ChevronDown size={18} />
                      </motion.div>
                    </div>
                  </button>

                  {/* Open State (Expanded Content) */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                      >
                        <div className={`px-6 sm:px-7 pb-7 pt-4 border-t sm:ml-4 ${darkMode ? "border-zinc-900/60" : "border-slate-100"}`}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
                            {/* Payment History */}
                            <div>
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-4 flex items-center gap-1.5">
                                <History size={13} /> Historique récent
                              </h4>
                              <div className="space-y-3">
                                {unit.history.map((record) => (
                                  <div key={record.id} className={`flex items-center justify-between p-4 rounded-2xl border ${darkMode ? "bg-zinc-950/50 border-zinc-900" : "bg-slate-50/60 border-slate-200/50"}`}>
                                    <div>
                                      <p className={`text-xs font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                                        {record.month}
                                      </p>
                                      <p className="text-[9px] font-medium text-slate-450 dark:text-zinc-550 mt-1">
                                        Date: {record.date}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className={`text-xs font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
                                        {record.amount.toFixed(2)} $
                                      </p>
                                      <p className={`text-[8.5px] font-black uppercase tracking-widest mt-1 ${
                                        record.status === 'paye' ? 'text-teal-600 dark:text-teal-400' : 'text-amber-500'
                                      }`}>
                                        {record.status === 'paye' ? 'Reçu' : 'En attente'}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Actions Panel */}
                            <div className="flex flex-col justify-center space-y-4">
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2 leading-none">
                                Actions requises
                              </h4>
                              
                              <button 
                                onClick={() => {
                                  setSelectedUnit(unit);
                                  setPaymentAmount(unit.amountDue);
                                  setPaymentMethod('interac');
                                  setIsPaymentModalOpen(true);
                                }}
                                disabled={unit.status === 'paye'}
                                className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-[20px] font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98] border-none cursor-pointer ${
                                  unit.status === 'paye'
                                    ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-650 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                                }`}
                              >
                                <DollarSign size={16} /> Enregistrer un paiement
                              </button>
                              
                              <button 
                                onClick={() => handleSendReminder(unit)}
                                disabled={unit.status === 'paye' || sendingReminderId === unit.id}
                                className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-[20px] font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98] border-2 cursor-pointer ${
                                  unit.status === 'paye'
                                    ? 'border-slate-200/50 dark:border-zinc-800 text-zinc-400 dark:text-zinc-650 cursor-not-allowed bg-transparent'
                                    : sendingReminderId === unit.id
                                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                                      : 'border-slate-200 dark:border-zinc-850 text-slate-600 dark:text-zinc-350 hover:border-slate-350 dark:hover:border-zinc-700 bg-transparent'
                                }`}
                              >
                                {sendingReminderId === unit.id ? (
                                  <>
                                    <Send size={16} className="animate-pulse" />
                                    <span>Envoi en cours...</span>
                                  </>
                                ) : (
                                  <>
                                    <Bell size={16} />
                                    <span>Envoyer un rappel</span>
                                  </>
                                )}
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
            <div className="text-center py-16 px-6 bg-white dark:bg-zinc-950/80 rounded-[32px] border border-slate-200 dark:border-zinc-900">
              <p className="text-slate-400 dark:text-zinc-650 font-bold text-xs uppercase tracking-wider">
                Aucune unité trouvée pour "{searchQuery}".
              </p>
            </div>
          )}
        </div>
      </div>

      {/* TRANSACTION MODAL: REGISTER PAYMENT */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedUnit && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`w-full max-w-md rounded-[40px] border shadow-2xl p-6 sm:p-8 flex flex-col relative ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-100 text-slate-900"}`}
            >
              <button 
                onClick={() => { setIsPaymentModalOpen(false); setSelectedUnit(null); }}
                className={`absolute top-6 right-6 p-2 rounded-xl transition-all border-none bg-transparent cursor-pointer ${darkMode ? "text-zinc-500 hover:text-white hover:bg-zinc-900" : "text-slate-300 hover:text-slate-900 hover:bg-slate-50"}`}
              >
                <X size={20} />
              </button>

              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-emerald-500/10 text-emerald-500 p-2.5 rounded-2xl">
                  <DollarSign size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest leading-none">Enregistrer un Paiement</h3>
                  <p className="text-[8px] font-black uppercase text-emerald-500 tracking-wider mt-1.5 leading-none">
                    {selectedUnit.unit} - {selectedUnit.owner}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">Montant du Paiement ($)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold ${darkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">Mode de Paiement</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['interac', 'cheque', 'comptant'] as const).map((method) => {
                      const label = method === 'interac' ? 'Interac' : method === 'cheque' ? 'Chèque' : 'Espèces';
                      const isSelected = paymentMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border cursor-pointer ${
                            isSelected 
                              ? (darkMode ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-450' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700')
                              : (darkMode ? 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white' : 'bg-slate-50 border-slate-150 text-slate-500 hover:text-slate-700')
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setIsPaymentModalOpen(false); setSelectedUnit(null); }}
                    className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase italic tracking-widest transition-transform active:scale-95 border border-slate-200 dark:border-zinc-800 bg-transparent text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/40 cursor-pointer`}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleRegisterPayment}
                    className="flex-grow py-4 rounded-full text-[10px] font-black uppercase italic tracking-widest transition-transform active:scale-95 border-none bg-emerald-600 hover:bg-emerald-750 text-white shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
