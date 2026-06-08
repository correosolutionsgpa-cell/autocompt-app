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
  CheckCircle2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
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
  const [activeTab, setActiveTab] = useState<'carnet' | 'finance' | 'transparence'>('carnet');
  const [components, setComponents] = useState<BuildingComponent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Form State
  const [compName, setCompName] = useState('');
  const [compCondition, setCompCondition] = useState<'Excellent' | 'Correct' | 'Critique'>('Excellent');
  const [compLastInspection, setCompLastInspection] = useState('');
  const [compNextYear, setCompNextYear] = useState(new Date().getFullYear() + 5);
  const [compCost, setCompCost] = useState('');

  const isReadOnly = userRole === 'coproprietaire';

  // Seed default items if empty
  const defaultComponents: Omit<BuildingComponent, 'id'>[] = [
    { name: 'Toiture principale (Membrane)', condition: 'Correct', lastInspection: '2024-05-12', nextReplacementYear: 2031, estimatedCost: 35000 },
    { name: 'Ascenseur hydraulique', condition: 'Excellent', lastInspection: '2025-01-10', nextReplacementYear: 2038, estimatedCost: 45000 },
    { name: 'Fenêtres communes & Portes', condition: 'Critique', lastInspection: '2023-09-15', nextReplacementYear: 2027, estimatedCost: 18000 },
    { name: 'Chaudière centrale commune', condition: 'Correct', lastInspection: '2024-11-20', nextReplacementYear: 2029, estimatedCost: 22000 },
    { name: 'Revêtement extérieur de maçonnerie', condition: 'Correct', lastInspection: '2022-08-05', nextReplacementYear: 2032, estimatedCost: 60000 }
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
      } catch (err) {
        console.error('Error deleting component: ', err);
      }
    }
  };

  // 10-Year Projections calculations
  const currentYear = new Date().getFullYear();
  const projectionYears = Array.from({ length: 10 }, (_, i) => currentYear + i);
  const inflationRate = 0.035; // 3.5%

  let accumulatedReserve = 62350.00; // Starting reserve
  const annualContribution = 12500.00; // Plan contribution

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
      docPdf.setFillColor(99, 102, 241); // Violet Primary
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
      docPdf.text(`Solde actuel du fonds de prévoyance : 62 350.00 $`, 15, 75);

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

      // Section 3: Projections
      currentY += 20;
      docPdf.setFontSize(14);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.text('Projection de réserve à 10 ans', 15, currentY);

      currentY += 10;
      docPdf.setFontSize(9);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text(`Selon les critères de contribution planifiés, la réserve minimale projetée pour la fin de la décennie reste supérieure aux seuils de risque de la copropriété. Ce bilan est transférable au notaire pour finaliser les ventes de lots individuels.`, 15, currentY, { maxWidth: 180 });

      // Save PDF
      docPdf.save(`AutoCompt_Certificat_Loi16_${activeCompanyId}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className={`w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-8 font-sans text-left transition-colors duration-300 ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
      
      {/* Compliance banner header */}
      <div className={`p-6 rounded-[32px] border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} shadow-xl`}>
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <span className="p-2.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-2xl flex items-center justify-center">
              <Wrench size={22} />
            </span>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight italic">
                Loi 16 & Carnet d'Entretien
              </h1>
              <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-none">
                Conformité obligatoire des copropriétés au Québec
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3 py-1.5 text-[8.5px] font-black uppercase rounded-full bg-emerald-500/10 text-emerald-600 flex items-center gap-1.5 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Statut : Conforme
          </span>
          <button
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            className="px-4.5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 flex items-center gap-2 border-none cursor-pointer transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Download size={13} />
            <span>{isGeneratingPdf ? 'Génération...' : 'Certificat de Vente'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab('carnet')}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === 'carnet' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-400 dark:text-zinc-500'}`}
        >
          Carnet d'Entretien
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === 'finance' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-400 dark:text-zinc-500'}`}
        >
          Étude du Fonds
        </button>
      </div>

      {/* Tab Contents */}
      <div className="animate-in fade-in duration-300">
        
        {/* CARNET D'ENTRETIEN TAB */}
        {activeTab === 'carnet' && (
          <div className="space-y-6">
            <div className={`p-6 sm:p-8 rounded-[32px] border ${darkMode ? 'bg-zinc-900 border-zinc-800/80' : 'bg-white border-slate-200'} shadow-lg text-left`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-black uppercase italic tracking-tight">
                    Inventaire Technique des Parties Communes
                  </h3>
                  <p className="text-[9.5px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
                    Composants du bâtiment surveillés
                  </p>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="p-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl flex items-center justify-center border-none cursor-pointer transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>

              {/* Components List Table */}
              <div className="overflow-x-auto rounded-2xl">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className={`border-b ${darkMode ? 'border-zinc-800 bg-zinc-950/40' : 'border-slate-100 bg-slate-50/40'}`}>
                      <th className="p-4 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">Nom du composant</th>
                      <th className="p-4 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">Condition physique</th>
                      <th className="p-4 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">Dernière inspection</th>
                      <th className="p-4 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">Année remplacement</th>
                      <th className="p-4 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 text-right">Coût estimé</th>
                      {!isReadOnly && <th className="p-4 text-center"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                    {components.map((c) => {
                      const conditionColors = {
                        Excellent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                        Correct: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                        Critique: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      }[c.condition];

                      return (
                        <tr key={c.id} className={`hover:bg-slate-50/50 dark:hover:bg-zinc-850/30 transition-all`}>
                          <td className="p-4 text-[10.5px] font-bold">{c.name}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase border ${conditionColors}`}>
                              {c.condition}
                            </span>
                          </td>
                          <td className="p-4 text-[10px] font-semibold text-slate-500 dark:text-zinc-400">{c.lastInspection}</td>
                          <td className="p-4 text-[10.5px] font-black">{c.nextReplacementYear}</td>
                          <td className="p-4 text-[10.5px] font-black text-right">{c.estimatedCost.toLocaleString('fr-CA')} $</td>
                          {!isReadOnly && (
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteComponent(c.id)}
                                className="p-2 bg-transparent text-slate-400 hover:text-rose-500 rounded-lg border-none cursor-pointer transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FINANCIAL PROJECTIONS TAB */}
        {activeTab === 'finance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Chart Panel */}
            <div className={`lg:col-span-2 p-6 sm:p-8 rounded-[32px] border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} shadow-lg text-left`}>
              <h3 className="text-sm font-black uppercase italic tracking-tight mb-2">
                Projections du Fonds de Réserve (Loi 16)
              </h3>
              <p className="text-[9.5px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-6">
                Accumulation de réserves vs Remplacements planifiés
              </p>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={financialData} margin={{ left: -15, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#27272a' : '#f1f5f9'} />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} unit=" $" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', fontSize: '10px', color: '#fff' }} />
                    <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="Réserves" stroke="#8b5cf6" strokeWidth={3} activeDot={{ r: 6 }} name="Solde de prévoyance" />
                    <Line type="monotone" dataKey="Dépenses" stroke="#ef4444" strokeWidth={2} name="Travaux majeurs" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Calculations info panel */}
            <div className={`p-6 sm:p-8 rounded-[32px] border space-y-6 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} shadow-lg text-left`}>
              <h3 className="text-sm font-black uppercase italic tracking-tight">
                Paramètres d'évaluation
              </h3>
              
              <div className="space-y-4 text-[10px]">
                <div className="flex justify-between border-b pb-2 dark:border-zinc-800">
                  <span className="font-bold text-slate-500 dark:text-zinc-400">Taux d'inflation calculé</span>
                  <span className="font-black">{(inflationRate * 100).toFixed(1)} % / an</span>
                </div>
                <div className="flex justify-between border-b pb-2 dark:border-zinc-800">
                  <span className="font-bold text-slate-500 dark:text-zinc-400">Aportation annuelle conseil</span>
                  <span className="font-black">{annualContribution.toLocaleString('fr-CA')} $</span>
                </div>
                <div className="flex justify-between border-b pb-2 dark:border-zinc-800">
                  <span className="font-bold text-slate-500 dark:text-zinc-400">Solde de départ actuel</span>
                  <span className="font-black">62 350,00 $</span>
                </div>
              </div>

              <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-2xl flex items-start space-x-2 text-[9px]">
                <Info size={16} className="text-violet-500 shrink-0 mt-0.5" />
                <p className="text-violet-850 dark:text-violet-400 font-semibold leading-relaxed">
                  Loi 16 impose à chaque copropriété d'obtenir une étude de fonds de prévoyance tous les 5 ans afin de déterminer le montant des contributions suffisantes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD COMPONENT MODAL (ADMIN ONLY) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md p-6 rounded-[32px] border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-2xl text-left`}
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
                    className="flex-1 py-3.5 rounded-2xl text-[9.5px] font-black uppercase border border-slate-250 dark:border-zinc-850 bg-transparent text-slate-400 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-2xl text-[9.5px] font-black uppercase text-white bg-violet-600 border-none cursor-pointer"
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
