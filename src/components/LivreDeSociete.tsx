import React, { useState } from 'react';
import { ArrowLeft, Briefcase, CheckCircle2, Clock, Download, PenTool, ChevronDown, FileSignature } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface LivreDeSocieteProps {
  darkMode?: boolean;
  onBack: () => void;
}

interface Resolution {
  id: string;
  title: string;
  date: string;
  status: "Signé & Archivé" | "En attente";
  summary: string;
}

export default function LivreDeSociete({ darkMode = false, onBack }: LivreDeSocieteProps) {
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);

  // This module has no real backend yet — it used to ship with 3 fabricated
  // example resolutions (including one naming real people, "Nomination des
  // dirigeants - Natalia & Fabiola", presented as "Signé & Archivé"), which
  // every account saw as if it were their own real corporate record. Found
  // 2026-08-11 when Natalia saw it on her brand-new account. Empty until a
  // real per-company resolutions store is built.
  const resolutions: Resolution[] = [];

  return (
    <div className={`w-full flex flex-col space-y-6 ${darkMode ? "text-zinc-100" : "text-slate-900"} max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in duration-500`}>
      {/* Header Livre de Société */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={`p-2 transition-colors rounded-xl ${darkMode ? "text-zinc-500 hover:text-white hover:bg-zinc-900" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"}`}
            >
              <ArrowLeft size={24} />
            </button>
            <h2 className="font-black uppercase italic tracking-tighter text-xl text-left">
              Livre de Société (Résolutions)
            </h2>
          </div>
          <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest bg-indigo-500/10 px-3 py-1.5 rounded-full italic self-start sm:self-auto">
            Voûte Corporative BYOS 🔒
          </span>
        </header>

        {/* List of resolutions */}
        {resolutions.length === 0 ? (
          <div className={`rounded-[32px] border p-10 text-center space-y-3 ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-slate-200"}`}>
            <div className={`inline-flex p-3 rounded-2xl ${darkMode ? "bg-indigo-900/30 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
              <Briefcase size={24} />
            </div>
            <p className={`text-sm font-bold ${darkMode ? "text-zinc-300" : "text-slate-700"}`}>
              Aucune résolution pour l'instant
            </p>
            <p className={`text-xs max-w-sm mx-auto ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
              Les résolutions corporatives (nomination des dirigeants, déclaration de dividendes, etc.) archivées ici apparaîtront dans cette liste.
            </p>
          </div>
        ) : (
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {resolutions.map((res) => {
              const isOpen = openAccordionId === res.id;
              
              return (
                <div key={res.id} className={`rounded-[32px] overflow-hidden transition-all duration-300 ${darkMode ? "bg-zinc-950 border border-zinc-800" : "bg-white border border-slate-200"} ${isOpen ? 'shadow-xl' : 'shadow-sm hover:shadow-md'}`}>
                  <button
                    onClick={() => setOpenAccordionId(isOpen ? null : res.id)}
                    className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-6 text-left transition-colors ${darkMode ? "hover:bg-zinc-900/80" : "hover:bg-slate-50/80"}`}
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-2">
                         <div className={`p-2.5 rounded-[16px] inline-flex items-center justify-center shrink-0 ${darkMode ? "bg-indigo-900/30 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                           <Briefcase size={20} />
                         </div>
                         <p className={`font-black text-base sm:text-lg tracking-tight uppercase italic ${darkMode ? "text-white" : "text-slate-900"}`}>
                           {res.title}
                         </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 sm:ml-16 mt-3 sm:mt-1">
                        <span className={`text-xs font-semibold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                          Créé le {res.date}
                        </span>
                        {res.status === 'Signé & Archivé' ? (
                          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                            <CheckCircle2 size={14} className="shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Signé & Archivé</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
                            <Clock size={14} className="shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-widest">En attente</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className={`mt-4 sm:mt-0 self-start sm:self-center p-3 rounded-full shrink-0 ${darkMode ? "bg-zinc-900 border border-zinc-800 text-zinc-400" : "bg-slate-50 border border-slate-100 text-slate-400"}`}
                    >
                      <ChevronDown size={20} />
                    </motion.div>
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                      >
                        <div className={`px-6 pb-7 pt-4 border-t sm:ml-16 ${darkMode ? "border-zinc-800/80" : "border-slate-100"}`}>
                          <p className={`text-sm leading-relaxed mb-6 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                            {res.summary}
                          </p>
                          
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <button className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-transform active:scale-95 ${darkMode ? "bg-indigo-500 border border-indigo-400 text-white hover:bg-indigo-600" : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-xl shadow-indigo-500/20"}`}>
                              <Download size={16} />
                              <span>Télécharger PDF</span>
                            </button>
                            
                            <button className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-transform active:scale-95 ${darkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"}`}>
                              <PenTool size={16} />
                              <span>Signer</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </AnimatePresence>
        </div>
        )}
      </div>
    );
}
