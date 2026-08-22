import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, History, Loader2, Wallet } from 'lucide-react';
import { auth } from '../lib/firebase';
import { dataService, type CondoUnitDoc, type CotisationPaymentDoc } from '../lib/dataService';

export interface CondoOwnerCotisationViewProps {
  darkMode: boolean;
  companyDocId: string;
  companyName: string;
  goBack: () => void;
  WorkspaceSidebar: React.ComponentType;
}

/**
 * Read-only "Ma Cotisation" for a linked Syndicat unit owner
 * (dataService.acceptCondoOwnerInvite) — deliberately NOT SyndicatCotisations,
 * which lists every unit's owner name/balance/history. This only ever fetches
 * the signed-in user's own unit via fetchMyCondoUnit/fetchMyCotisationPayments,
 * which firestore.rules further restricts to docs where linkedUid matches
 * their own uid. No edit/delete/payment/reminder actions — those stay
 * board-only.
 */
export default function CondoOwnerCotisationView({ darkMode, companyDocId, companyName, goBack, WorkspaceSidebar }: CondoOwnerCotisationViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [unit, setUnit] = useState<CondoUnitDoc | null>(null);
  const [payments, setPayments] = useState<CotisationPaymentDoc[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !companyDocId) { setIsLoading(false); return; }
    dataService.fetchMyCondoUnit(uid, companyDocId)
      .then((myUnit) => {
        setUnit(myUnit);
        if (myUnit) {
          return dataService.fetchMyCotisationPayments(uid, myUnit.id).then(setPayments);
        }
      })
      .catch((err) => console.error('Failed to load my condo unit:', err))
      .finally(() => setIsLoading(false));
  }, [companyDocId]);

  return (
    <div className={`min-h-screen ${darkMode ? "bg-transparent text-white" : "bg-slate-50 text-slate-900"} flex flex-col font-sans transition-all duration-300 md:pl-72`}>
      <WorkspaceSidebar />

      <header className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] backdrop-blur-md" : "bg-white border-slate-200"} px-6 py-4 border-b shadow-sm sticky top-0 z-50 flex items-center gap-3`}>
        <button
          onClick={goBack}
          className={`p-2 rounded-xl transition-colors ${darkMode ? "text-zinc-400 hover:bg-zinc-900 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-left">
          <div className="flex items-center gap-1.5 text-[8.5px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
            <span>AutoCompt</span><span>/</span><span className="text-amber-500 font-bold">Ma Cotisation</span>
          </div>
          <h1 className="font-black uppercase italic tracking-tighter text-base sm:text-lg mt-0.5">Ma Cotisation</h1>
        </div>
      </header>

      <main className="flex-1 w-full p-4 sm:p-6 max-w-2xl mx-auto">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400 dark:text-zinc-500">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Chargement...</span>
          </div>
        )}

        {!isLoading && !unit && (
          <div className="text-center py-16 px-6 bg-white dark:bg-zinc-950/80 rounded-[32px] border border-dashed border-slate-200 dark:border-zinc-900">
            <p className="text-slate-400 dark:text-zinc-650 font-bold text-xs uppercase tracking-wider">
              Aucune unité liée à votre compte pour {companyName}. Contactez le conseil d'administration.
            </p>
          </div>
        )}

        {!isLoading && unit && (
          <div className="space-y-6">
            <div className={`rounded-[32px] p-6 sm:p-8 border shadow-sm ${darkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-white border-slate-200"}`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tighter">{unit.unit}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{companyName}</p>
                </div>
                {unit.status === 'paye' ? (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 text-teal-700 dark:text-emerald-400">
                    <CheckCircle2 size={12} /><span className="text-[10px] font-black uppercase tracking-widest">Payé</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
                    <AlertCircle size={12} /><span className="text-[10px] font-black uppercase tracking-widest">En retard</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500 mb-1.5">
                <Wallet size={13} />
                <p className="text-[9px] font-black uppercase tracking-widest">Cotisation mensuelle</p>
              </div>
              <p className={`text-3xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{unit.amountDue.toFixed(2)} $</p>
            </div>

            <div className={`rounded-[32px] p-6 sm:p-8 border shadow-sm ${darkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-white border-slate-200"}`}>
              <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-4 flex items-center gap-1.5">
                <History size={13} /> Historique de mes paiements
              </h3>
              {payments.length === 0 ? (
                <p className="text-slate-400 dark:text-zinc-650 font-bold text-xs uppercase tracking-wider text-center py-6">
                  Aucun paiement enregistré pour l'instant.
                </p>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border ${darkMode ? "bg-zinc-950/50 border-zinc-900" : "bg-slate-50/60 border-slate-200/50"}`}>
                      <div>
                        <p className={`text-xs font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{p.month}</p>
                        <p className="text-[9px] font-medium text-slate-450 dark:text-zinc-550 mt-1">Date : {p.date}</p>
                      </div>
                      <p className={`text-xs font-black ${darkMode ? "text-white" : "text-slate-900"}`}>{p.amount.toFixed(2)} $</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
