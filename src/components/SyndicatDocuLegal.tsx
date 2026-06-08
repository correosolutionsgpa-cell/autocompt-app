import React, { useState } from 'react';
import { Plus, ChevronDown, Download, CheckCircle2, Clock, FileText, PenTool } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SyndicatDocuLegalProps {
  darkMode: boolean;
}

export default function SyndicatDocuLegal({ darkMode }: SyndicatDocuLegalProps) {
  const [activeTab, setActiveTab] = useState<'externe' | 'interne'>('externe');
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);

  const contrats = [
    { 
      id: 'c1', 
      title: "Déneigement Pro Inc. - Contrat 2026-2027", 
      date: "12 Oct 2026", 
      status: "signe", 
      summary: "Contrat annuel pour le déneigement du stationnement, des allées piétonnières et l'épandage de sel. Inclut le déneigement des balcons sur demande.",
      provider: "Déneigement Pro"
    },
    { 
      id: 'c2', 
      title: "Nettoyage Élégance - Entretien Ménager", 
      date: "05 Nov 2026", 
      status: "signe", 
      summary: "Entretien hebdomadaire des espaces communs: hall d'entrée, couloirs, ascenseurs et salle des déchets.",
      provider: "Nettoyage Élégance"
    },
    { 
      id: 'c3', 
      title: "Jardinage Plus - Aménagement Paysager", 
      date: "20 Fév 2027", 
      status: "attente", 
      summary: "Ouverture et fermeture du terrain, tonte de pelouse hebdomadaire et entretien des plates-bandes estivales.",
      provider: "Jardinage Plus"
    },
  ];
  
  const resolutions = [
    { 
      id: 'r1', 
      title: "Résolution - Réfection de la toiture", 
      date: "15 Mai 2026", 
      status: "signe", 
      summary: "Approbation du devis de Toitures Plus pour la réfection complète de la toiture. Financement via le fonds de prévoyance." 
    },
    { 
      id: 'r2', 
      title: "Assemblée Générale Spéciale - Cotisation Spéciale", 
      date: "10 Avr 2026", 
      status: "signe", 
      summary: "Adoption d'une cotisation spéciale de 50 000$ répartie selon les quotes-parts pour le remplacement de la génératrice." 
    },
    { 
      id: 'r3', 
      title: "Nomination du Conseil d'Administration", 
      date: "01 Jui 2026", 
      status: "attente", 
      summary: "Nomination officielle du nouveau trésorier (Unité 302) et du secrétaire (Unité 104) suite à l'assemblée générale annuelle." 
    },
  ];

  const currentList = activeTab === 'externe' ? contrats : resolutions;

  return (
    <div className={`rounded-[32px] p-6 sm:p-8 shadow-sm ${darkMode ? "bg-zinc-900/40 border border-zinc-800" : "bg-white border border-slate-200"}`}>
      
      {/* Toggle Onglets Pilule */}
      <div className="flex justify-center mb-10">
        <div className={`inline-flex p-1.5 rounded-full ${darkMode ? "bg-zinc-950 border border-zinc-800" : "bg-slate-100/80 border border-slate-200/50"}`}>
          <button 
            onClick={() => { setActiveTab('externe'); setOpenDrawerId(null); }}
            className={`px-6 sm:px-10 py-3.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'externe' ? (darkMode ? "bg-zinc-800 text-white shadow-md shadow-black/20" : "bg-white text-emerald-600 shadow-md shadow-emerald-900/5") : (darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-700")}`}
          >
            Contrats & Ententes
          </button>
          <button 
            onClick={() => { setActiveTab('interne'); setOpenDrawerId(null); }}
            className={`px-6 sm:px-10 py-3.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'interne' ? (darkMode ? "bg-zinc-800 text-white shadow-md shadow-black/20" : "bg-white text-teal-600 shadow-md shadow-teal-900/5") : (darkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-700")}`}
          >
            Registre de la Copropriété
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {currentList.map((doc) => {
            const isOpen = openDrawerId === doc.id;
            
            return (
              <div key={doc.id} className={`rounded-[32px] overflow-hidden transition-all duration-300 ${darkMode ? "bg-zinc-950 border border-zinc-800" : "bg-white border border-slate-200"} ${isOpen ? 'shadow-xl' : 'shadow-sm hover:shadow-md'}`}>
                <button
                  onClick={() => setOpenDrawerId(isOpen ? null : doc.id)}
                  className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-7 text-left transition-colors ${darkMode ? "hover:bg-zinc-900/80" : "hover:bg-slate-50/80"}`}
                >
                  <div className="flex-1 pr-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-2">
                       <div className={`p-2.5 rounded-[16px] inline-flex items-center justify-center shrink-0 ${darkMode ? "bg-zinc-900 text-zinc-400" : "bg-slate-100 text-slate-500"}`}>
                         <FileText size={20} />
                       </div>
                       <p className={`font-black text-base sm:text-lg tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                         {doc.title}
                       </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 sm:ml-16">
                      <span className={`text-xs font-semibold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                        Ajouté le {doc.date}
                      </span>
                      {doc.status === 'signe' ? (
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 text-teal-600 dark:text-teal-400">
                          <CheckCircle2 size={12} className="shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Signé & Archivé</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400">
                          <Clock size={12} className="shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-widest">En attente</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className={`mt-4 sm:mt-0 self-start sm:self-center p-3 rounded-full shrink-0 ${darkMode ? "bg-zinc-900 text-zinc-400" : "bg-slate-100 text-slate-400"}`}
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
                      <div className={`px-6 sm:px-7 pb-7 pt-4 border-t sm:ml-16 ${darkMode ? "border-zinc-800/80" : "border-slate-100"}`}>
                        <p className={`text-sm leading-relaxed mb-6 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                          {doc.summary}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <button className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-transform active:scale-95 ${darkMode ? "bg-teal-500 border border-teal-400 text-teal-950 hover:bg-teal-400" : "bg-teal-500 text-white hover:bg-teal-600 shadow-md shadow-teal-500/20"}`}>
                            <Download size={16} />
                            <span>Télécharger PDF</span>
                          </button>
                          
                          <button className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-transform active:scale-95 ${darkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"}`}>
                            <PenTool size={16} />
                            <span>Demander Signature</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <button className={`w-full mt-8 py-5 rounded-[32px] border-2 border-dashed transition-all duration-300 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm ${darkMode ? "border-zinc-700/50 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-500 hover:text-zinc-200" : "border-slate-300 text-slate-500 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-700"}`}>
        <Plus size={18} /> {activeTab === 'externe' ? 'Ajouter un nouveau contrat' : 'Créer une nouvelle résolution'}
      </button>
    </div>
  );
}
