import React from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  PiggyBank, 
  FileText, 
  CheckCircle2, 
  Download,
  AlertCircle,
  FileSignature
} from 'lucide-react';

interface CoproprietairePortalProps {
  darkMode: boolean;
}

export default function CoproprietairePortal({ darkMode }: CoproprietairePortalProps) {
  // Mock co-owner database records
  const myPayments = [
    { period: 'Mai 2026', amount: 250.00, status: 'Payé', date: '2026-05-01' },
    { period: 'Avril 2026', amount: 250.00, status: 'Payé', date: '2026-04-01' },
    { period: 'Mars 2026', amount: 250.00, status: 'Payé', date: '2026-03-01' },
    { period: 'Février 2026', amount: 250.00, status: 'Payé', date: '2026-02-02' }
  ];

  const assemblyDocuments = [
    { title: 'Procès-Verbal - Assemblée Générale Annuelle 2025.pdf', date: '2025-11-14', size: '2.4 MB' },
    { title: 'Budget Prévisionnel Cumulé 2026.pdf', date: '2026-01-05', size: '1.1 MB' },
    { title: 'Règlement Intérieur d\'Immeuble - Amendement Piscine.pdf', date: '2026-03-12', size: '840 KB' }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-8 font-sans text-left">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
          Espace Copropriétaire
        </h1>
        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">
          Portail Lecture Seule • Transparence & Gouvernance
        </p>
      </header>

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-xl border border-slate-100 dark:border-zinc-800/80">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[8.5px] font-black uppercase bg-emerald-100/60 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">
              À jour
            </span>
          </div>
          <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
            Mes Cotisations
          </p>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            250,00 $ / mois
          </div>
          <p className="text-[9px] font-bold text-slate-500 mt-1">
            Prochain prélèvement automatique : 1er Juillet 2026.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-xl border border-slate-100 dark:border-zinc-800/80">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl w-max mb-4">
            <Building2 size={20} />
          </div>
          <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
            Fonds de prévoyance commun
          </p>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            62 350,00 $
          </div>
          <p className="text-[9px] font-bold text-slate-500 mt-1">
            Dernière mise à jour : il y a 2 jours.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-xl border border-slate-100 dark:border-zinc-800/80">
          <div className="p-3 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl w-max mb-4">
            <PiggyBank size={20} />
          </div>
          <p className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
            Fonds d'opération commun
          </p>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            14 500,00 $
          </div>
          <p className="text-[9px] font-bold text-slate-500 mt-1">
            Réservé aux charges courantes de l'immeuble.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Document list card */}
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-zinc-800/80">
          <h3 className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="text-indigo-600 dark:text-indigo-400" size={16} />
            Documents officiels du syndicat
          </h3>
          <div className="space-y-3">
            {assemblyDocuments.map((doc, i) => (
              <div
                key={i}
                className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${darkMode ? 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'}`}
              >
                <div className="text-left space-y-0.5">
                  <p className={`text-[10px] font-black leading-tight ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                    {doc.title}
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                    Publié le {doc.date} • {doc.size}
                  </p>
                </div>
                <button
                  onClick={() => alert(`Téléchargement de ${doc.title}`)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 rounded-xl transition-colors border-none text-slate-600 dark:text-zinc-400 cursor-pointer"
                >
                  <Download size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* History of payments */}
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-zinc-800/80">
          <h3 className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileSignature className="text-emerald-500" size={16} />
            Historique personnel des versements
          </h3>
          <div className="space-y-3">
            {myPayments.map((p, i) => (
              <div
                key={i}
                className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${darkMode ? 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'}`}
              >
                <div className="text-left">
                  <p className={`text-[10px] font-black uppercase ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                    {p.period}
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                    Payé le {p.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    +{p.amount.toFixed(2)} $
                  </p>
                  <span className="inline-block px-2 py-0.5 text-[6.5px] font-black uppercase bg-emerald-500/10 text-emerald-600 rounded-full mt-0.5">
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
