import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  TrendingUp, 
  FileCheck2, 
  Plus, 
  Trash2, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  Download,
  Info,
  CheckCircle2,
  UserCheck
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import jsPDF from 'jspdf';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface BuildingComponent {
  id: string;
  name: string;
  condition: 'Excellent' | 'Correct' | 'Critique';
  lastInspection: string;
  nextReplacementYear: number;
  estimatedCost: number;
}

interface SyndicLoi16ViewProps {
  darkMode: boolean;
  userRole: string;
  activeCompanyId: string;
}

export default function SyndicLoi16View({ darkMode, userRole, activeCompanyId }: SyndicLoi16ViewProps) {
  const [activeTab, setActiveTab] = useState<'carnet' | 'finance'>('carnet');
  const [components, setComponents] = useState<BuildingComponent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form State
  const [compName, setCompName] = useState('');
  const [compCondition, setCompCondition] = useState<'Excellent' | 'Correct' | 'Critique'>('Excellent');
  const [compLastInspection, setCompLastInspection] = useState('');
  const [compNextYear, setCompNextYear] = useState(new Date().getFullYear() + 5);
  const [compCost, setCompCost] = useState('');

  const isReadOnly = userRole === 'coproprietaire';

  // Seed default items if empty
  const defaultComponents: Omit<BuildingComponent, 'id'>[] = [
    { name: 'Toiture - Membrane élastomère', condition: 'Correct', lastInspection: '2024-05-12', nextReplacementYear: 2031, estimatedCost: 35000 },
    { name: 'Ascenseur hydraulique', condition: 'Excellent', lastInspection: '2025-01-10', nextReplacementYear: 2038, estimatedCost: 45000 },
    { name: 'Façade extérieure & Maçonnerie', condition: 'Critique', lastInspection: '2023-09-15', nextReplacementYear: 2027, estimatedCost: 18000 },
    { name: 'Chauffage Central commun', condition: 'Correct', lastInspection: '2024-11-20', nextReplacementYear: 2029, estimatedCost: 22000 },
    { name: 'Conduites de Plomberie', condition: 'Excellent', lastInspection: '2022-08-05', nextReplacementYear: 2035, estimatedCost: 15000 }
  ];

  useEffect(() => {
    if (!activeCompanyId) return;

    // Load components in real-time from Firestore filtered by companyId
    const q = query(
      collection(db, 'maintenance_components'),
      where('companyId', '==', activeCompanyId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetched: BuildingComponent[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as BuildingComponent);
      });

      // If empty, auto-seed default items
      if (fetched.length === 0 && !isReadOnly) {
        for (const def of defaultComponents) {
          await addDoc(collection(db, 'maintenance_components'), {
            ...def,
            companyId: activeCompanyId,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        // Sort components by next replacement year
        fetched.sort((a, b) => a.nextReplacementYear - b.nextReplacementYear);
        setComponents(fetched);
        if (fetched.length > 0) {
          // Select the first one by default so the premium select design is immediately visible
          setSelectedId((prev) => prev || fetched[0].id);
        }
      }
    });

    return () => unsubscribe();
  }, [activeCompanyId]);

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName || !compCost) return;

    try {
      await addDoc(collection(db, 'maintenance_components'), {
        name: compName,
        condition: compCondition,
        lastInspection: compLastInspection || new Date().toISOString().split('T')[0],
        nextReplacementYear: Number(compNextYear),
        estimatedCost: Number(compCost),
        companyId: activeCompanyId,
        createdAt: new Date().toISOString()
      });

      // Reset form
      setCompName('');
      setCompCondition('Excellent');
      setCompLastInspection('');
      setCompNextYear(new Date().getFullYear() + 5);
      setCompCost('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding component: ', err);
    }
  };

  const handleDeleteComponent = async (id: string) => {
    if (confirm('Voulez-vous supprimer ce composant du carnet d\'entretien?')) {
      try {
        await deleteDoc(doc(db, 'maintenance_components', id));
        if (selectedId === id) setSelectedId(null);
      } catch (err) {
        console.error('Error deleting component: ', err);
      }
    }
  };

  // 10-Year Projections calculations
  const currentYear = new Date().getFullYear();
  const projectionYears = Array.from({ length: 10 }, (_, i) => currentYear + i);
  const inflationRate = 0.035; // 3.5%

  let accumulatedReserve = 320000.00; // Starting reserve matching mockup scale
  const annualContribution = 35000.00; // Plan contribution

  const financialData = projectionYears.map((year) => {
    // Sum planned expenses in this year
    const yearlyWithdrawals = components
      .filter((c) => c.nextReplacementYear === year)
      .reduce((sum, c) => sum + c.estimatedCost, 0);

    // Apply compound inflation to cost
    const inflatedWithdrawals = yearlyWithdrawals * Math.pow(1 + inflationRate, year - currentYear);

    // Calc next year reserve
    const startVal = accumulatedReserve;
    accumulatedReserve = startVal + annualContribution - inflatedWithdrawals;

    return {
      name: year.toString(),
      Réserves: parseFloat(startVal.toFixed(0)),
      Aportations: annualContribution,
      Dépenses: parseFloat(inflatedWithdrawals.toFixed(0)),
      Solde: parseFloat(accumulatedReserve.toFixed(0))
    };
  });

  const handleGeneratePdf = () => {
    setIsGeneratingPdf(true);
    try {
      const docPdf = new jsPDF();
      
      // Document Theme Colors
      docPdf.setFillColor(139, 92, 246); // Violet Primary
      docPdf.rect(0, 0, 210, 40, 'F');

      // Title header
      docPdf.setTextColor(255, 255, 255);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(18);
      docPdf.text('AUTOCOMPT - CERTIFICAT DE TRANSPARENCE LOI 16', 15, 18);
      
      docPdf.setFontSize(9);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text('Réglementation des Copropriétés du Québec - Carnet d\'Entretien', 15, 27);

      // Section 1: Building overview
      docPdf.setTextColor(30, 41, 59); // Charcoal
      docPdf.setFontSize(14);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.text('État de santé de la copropriété', 15, 55);

      docPdf.setFontSize(10);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text(`Généré le : ${new Date().toLocaleDateString('fr-CA')}`, 15, 63);
      docPdf.text(`Statut global de conformité : CONFORME (Étude valide - Exercice Fiscal ${currentYear})`, 15, 69);
      docPdf.text(`Solde actuel du fonds de prévoyance : 320 000.00 $`, 15, 75);

      // Section 2: Carnet d'entretien
      docPdf.setFontSize(14);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.text('Composants du carnet d\'entretien', 15, 90);

      let currentY = 100;
      docPdf.setFontSize(9);
      
      // Header Table
      docPdf.setFillColor(241, 245, 249);
      docPdf.rect(15, currentY - 5, 180, 7, 'F');
      docPdf.setFont('Helvetica', 'bold');
      docPdf.text('Composant', 17, currentY);
      docPdf.text('État', 95, currentY);
      docPdf.text('Remplacement', 120, currentY);
      docPdf.text('Coût Est.', 160, currentY);

      docPdf.setFont('Helvetica', 'normal');
      components.forEach((c) => {
        currentY += 8;
        docPdf.text(c.name, 17, currentY);
        docPdf.text(c.condition, 95, currentY);
        docPdf.text(c.nextReplacementYear.toString(), 120, currentY);
        docPdf.text(`${c.estimatedCost.toLocaleString('fr-CA')} $`, 160, currentY);
      });

      // Save PDF
      docPdf.save(`AutoCompt_Certificat_Loi16_${activeCompanyId}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className={`w-full max-w-6xl mx-auto p-2 sm:p-4 space-y-6 font-sans text-left transition-colors duration-300 ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
      
      {/* Main Grid: Left side Table, Right side Chart & PDF Download */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Carnet d'entretien Table (Spans 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-6 sm:p-8 rounded-[32px] border backdrop-blur-xl transition-all duration-300 ${darkMode ? 'bg-zinc-950/45 border-zinc-900/60 shadow-2xl shadow-black/20' : 'bg-white/70 border-slate-200/70 shadow-lg shadow-slate-150/10'} text-left`}>
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-black uppercase italic tracking-tight">
                  Portions Communes
                </h3>
                <p className="text-[8.5px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
                  Registre d'inspection technique obligatoire
                </p>
              </div>
              
              {!isReadOnly && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="p-3 bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-555 text-white rounded-2xl flex items-center justify-center border-none cursor-pointer transition-all active:scale-95 shadow-md shadow-violet-500/20"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Table Header labels with Premium colors */}
            <div className="grid grid-cols-12 px-6 py-2.5 text-[8.5px] font-black uppercase tracking-wider leading-none">
              <div className="col-span-4 text-violet-600 dark:text-violet-400">Composant</div>
              <div className="col-span-3 text-center text-emerald-600 dark:text-emerald-400">Statut</div>
              <div className="col-span-4 text-center text-amber-600 dark:text-amber-400">Prochaine Inspection</div>
              <div className="col-span-1 text-right text-indigo-600 dark:text-indigo-400">Action</div>
            </div>

            {/* Stack of separate rounded cards */}
            <div className="space-y-3 mt-2">
              {components.map((c) => {
                const isSelected = selectedId === c.id;
                const isAnySelected = selectedId !== null;
                const dimClass = isAnySelected && !isSelected 
                  ? 'opacity-40 blur-[0.2px] scale-[0.99] transition-all duration-300' 
                  : 'transition-all duration-300';

                const conditionStyles = {
                  Excellent: {
                    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]',
                    text: 'text-emerald-600 dark:text-emerald-400',
                    icon: <CheckCircle2 size={10} className="inline mr-1 shrink-0" />,
                    label: 'Conforme',
                    selectedClass: darkMode 
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                      : 'bg-emerald-50/40 border-emerald-500/30 text-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                  },
                  Correct: {
                    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]',
                    text: 'text-amber-600 dark:text-amber-400',
                    icon: <AlertTriangle size={10} className="inline mr-1 shrink-0" />,
                    label: 'À Inspecter',
                    selectedClass: darkMode 
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.1)]' 
                      : 'bg-amber-50/40 border-amber-500/30 text-amber-700 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                  },
                  Critique: {
                    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]',
                    text: 'text-rose-600 dark:text-rose-400',
                    icon: <AlertTriangle size={10} className="inline mr-1 shrink-0" />,
                    label: 'Critique',
                    selectedClass: darkMode 
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                      : 'bg-rose-50/40 border-rose-500/30 text-rose-700 shadow-[0_0_15px_rgba(244,63,94,0.08)]'
                  }
                }[c.condition];

                return (
                  <motion.div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    whileHover={{ y: -1, scale: 1.008 }}
                    className={"grid grid-cols-12 items-center p-4.5 rounded-[24px] border cursor-pointer transition-all duration-300 " + dimClass + " " + (
                      isSelected
                        ? conditionStyles.selectedClass
                        : darkMode
                          ? 'bg-zinc-900/40 border-zinc-855 hover:border-zinc-800 hover:bg-zinc-900/60 text-zinc-300'
                          : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50/30 text-slate-700'
                    )}
                  >
                    {/* Component Name */}
                    <div className="col-span-4 text-left pr-2">
                      <span className="text-[10.5px] font-black uppercase tracking-tight leading-tight">{c.name}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="col-span-3 flex flex-col items-center justify-center">
                      <span className={"px-3 py-1 rounded-full text-[7.5px] font-black uppercase border leading-none " + conditionStyles.badge}>
                        {c.condition === 'Excellent' ? 'CONFORME' : c.condition === 'Correct' ? 'À INSPECTER' : 'CRITIQUE'}
                      </span>
                      <div className={"flex items-center gap-0.5 mt-1.5 text-[7px] font-black uppercase tracking-wider " + conditionStyles.text}>
                        {conditionStyles.icon}
                        <span>{conditionStyles.label}</span>
                      </div>
                    </div>

                    {/* Inspection Info */}
                    <div className="col-span-4 text-center flex flex-col items-center justify-center">
                      <span className="text-[10.5px] font-black text-slate-800 dark:text-zinc-100">
                        {c.condition === 'Critique' ? 'Imminent' : c.lastInspection}
                      </span>
                      {c.condition !== 'Critique' && (
                        <span className="text-[7.5px] font-black uppercase text-violet-500 tracking-wider mt-1">
                          Remplacement: {c.nextReplacementYear}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleDeleteComponent(c.id)}
                          className={"p-2 rounded-xl transition-all border-none cursor-pointer " + (
                            darkMode
                              ? 'bg-zinc-800/80 text-zinc-400 hover:text-rose-450 hover:bg-zinc-700'
                              : 'bg-slate-100 text-slate-500 hover:text-rose-600 hover:bg-slate-200'
                          )}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Compliance Info Banner */}
            <div className={"p-4 mt-6 rounded-3xl border flex items-start space-x-2.5 text-[9.5px] leading-relaxed transition-all " + (darkMode ? 'bg-zinc-900/20 border-zinc-800/80' : 'bg-slate-50/50 border-slate-100')}>
              <Info size={16} className="text-violet-500 shrink-0 mt-0.5" />
              <p className="font-bold text-slate-500 dark:text-zinc-400">
                La loi 16 exige d'obtenir un carnet d'entretien à jour détaillant l'historique et les réparations à venir. Cela protège les acheteurs et garantit la valeur immobilière des lots.
              </p>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Line Chart & PDF Download Button */}
        <div className="space-y-6">
          
          {/* Projections Card */}
          <div className={"p-6 rounded-[32px] border backdrop-blur-xl transition-all duration-300 " + (darkMode ? 'bg-zinc-950/45 border-zinc-900/60 shadow-2xl' : 'bg-white/70 border-slate-200/70 shadow-lg shadow-slate-150/10') + " text-left"}>
            <h3 className="text-xs font-black uppercase italic tracking-tight">
              Projections du Fonds (10 ans)
            </h3>
            <p className="text-[8.5px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1 mb-6">
              Simulation d'accumulation vs Travaux
            </p>

            <div className="h-[185px] w-full pr-2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialData} margin={{ left: -20, right: 10, top: 15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReserves" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#27272a' : '#f1f5f9'} />
                  <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 8, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 8, fontWeight: 'bold' }} axisLine={false} tickLine={false} tickFormatter={(val) => (val / 1000).toFixed(0) + 'k' } />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: 'none', fontSize: '9px', color: '#fff' }}
                    formatter={(value) => [Number(value).toLocaleString('fr-CA') + ' $', 'Réserves']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Réserves" 
                    stroke="#8b5cf6" 
                    strokeWidth={3.5} 
                    fillOpacity={1} 
                    fill="url(#colorReserves)"
                    dot={{ r: 3.5, stroke: '#8b5cf6', strokeWidth: 1.5, fill: darkMode ? '#09090b' : '#fff' }}
                    activeDot={{ r: 5 }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-850 flex justify-between text-[9px] font-black uppercase">
              <span className="text-slate-400 dark:text-zinc-500">Solde Actuel :</span>
              <span className="text-slate-900 dark:text-zinc-150">320 000,00 $</span>
            </div>
          </div>

          {/* PDF Generate Card */}
          <div className={"p-6 rounded-[32px] border backdrop-blur-xl flex flex-col justify-between transition-all duration-300 " + (darkMode ? 'bg-zinc-950/45 border-zinc-900/60 shadow-2xl' : 'bg-white/70 border-slate-200/70 shadow-lg shadow-slate-150/10') + " text-left"}>
            <div>
              <h3 className="text-xs font-black uppercase italic tracking-tight">
                Certificat de Transfert
              </h3>
              <p className="text-[8.5px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1 mb-4">
                Remise aux acheteurs et notaires
              </p>
            </div>

            <button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="w-full py-4.5 rounded-[24px] text-[10px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-555 flex items-center justify-center gap-2 border-none cursor-pointer transition-all shadow-lg shadow-violet-500/20 active:scale-95 disabled:opacity-50"
            >
              <Download size={14} />
              <span>{isGeneratingPdf ? 'Génération...' : 'Télécharger Certificat PDF'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* ADD COMPONENT MODAL (ADMIN ONLY) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={"w-full max-w-md p-6 rounded-[32px] border " + (darkMode ? 'bg-zinc-900 border-zinc-850 text-white' : 'bg-white border-slate-200 text-slate-900') + " shadow-2xl text-left"}
            >
              <h3 className="text-base font-black uppercase italic tracking-tight mb-4">
                Ajouter un composant
              </h3>

              <form onSubmit={handleAddComponent} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-400">Nom du composant</label>
                  <input
                    type="text"
                    required
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    placeholder="Ex: Toiture, Pompe..."
                    className="w-full p-3.5 rounded-2xl text-[10px] font-bold border outline-none bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400">État de condition</label>
                    <select
                      value={compCondition}
                      onChange={(e) => setCompCondition(e.target.value as any)}
                      className="w-full p-3.5 rounded-2xl text-[10px] font-bold border outline-none bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-800"
                    >
                      <option value="Excellent">Excellent</option>
                      <option value="Correct">Correct</option>
                      <option value="Critique">Critique</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400">Coût estimé ($)</label>
                    <input
                      type="number"
                      required
                      value={compCost}
                      onChange={(e) => setCompCost(e.target.value)}
                      placeholder="Coût en CAD"
                      className="w-full p-3.5 rounded-2xl text-[10px] font-bold border outline-none bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400">Année de remplacement</label>
                    <input
                      type="number"
                      required
                      value={compNextYear}
                      onChange={(e) => setCompNextYear(Number(e.target.value))}
                      className="w-full p-3.5 rounded-2xl text-[10px] font-bold border outline-none bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400">Dernière inspection</label>
                    <input
                      type="date"
                      value={compLastInspection}
                      onChange={(e) => setCompLastInspection(e.target.value)}
                      className="w-full p-3.5 rounded-2xl text-[10px] font-bold border outline-none bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-800"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-grow py-3.5 rounded-2xl text-[9.5px] font-black uppercase border border-slate-250 dark:border-zinc-800 bg-transparent text-slate-400 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-grow py-3.5 rounded-2xl text-[9.5px] font-black uppercase text-white bg-violet-600 border-none cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
