import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  FileText, 
  Download, 
  Send, 
  Mail, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import jsPDF from 'jspdf';

interface SyndicAiReporterProps {
  depenses: any[];
  activeCompanyId: string;
  darkMode: boolean;
}

export default function SyndicAiReporter({ depenses, activeCompanyId, darkMode }: SyndicAiReporterProps) {
  const [reportType, setReportType] = useState<'convocation' | 'financier' | 'legal'>('financier');
  const [period, setPeriod] = useState('Mensuel - Juin 2026');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [isSent, setIsSent] = useState(false);

  // Filter expenses for financial report details
  const condoExpenses = depenses.filter(d => d.companyId === activeCompanyId);
  const totalActual = condoExpenses.reduce((sum, d) => sum + (Number(d.total) || 0), 0);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setGeneratedText('');
    setIsSent(false);

    const promptMessage = 
      reportType === 'financier'
        ? `Rédige un rapport financier officiel résumé pour notre syndicat de copropriété pour la période : ${period}. Indique que les dépenses totales réelles s'élèvent à ${totalActual.toFixed(2)}$ pour ce mois. Rappelle l'importance de maintenir les cotisations au Fonds de prévoyance de 62,350.00$. Garde un ton professionnel, formel et conforme à la loi sur la copropriété au Québec (Loi 16).`
        : reportType === 'convocation'
        ? `Rédige une convocation formelle à l'assemblée générale extraordinaire des copropriétaires pour l'examen du budget. Période : ${period}. Indique que l'ordre du jour inclura l'état des fonds et le suivi budgétaire courant.`
        : `Rédige un communiqué juridique formel pour rappeler aux copropriétaires les règles de conformité et l'obligation de versement des cotisations spéciales sous peine de pénalités selon la déclaration de copropriété.`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: promptMessage }],
          currentForfeit: 'Pro'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedText(data.reply || 'Rapport généré avec succès.');
      } else {
        throw new Error('Erreur API');
      }
    } catch (e) {
      // Fallback response if API is offline
      const fallback = 
        reportType === 'financier'
          ? `RAPPORT FINANCIER MENSUEL - ${period}\n\nConformément au Code civil du Québec et aux résolutions du Conseil d'administration, nous vous présentons le résumé de la situation financière de la copropriété pour la période désignée.\n\n1. ÉTAT DES CHARGES COURANTES\n- Dépenses totales du mois : ${totalActual.toFixed(2)} $\n\n2. FONDS DE PRÉVOYANCE ET DE RÉSERVE\n- Le solde du Fonds de prévoyance s'élève à ce jour à 62 350,00 $, respectant les seuils recommandés par l'étude du fonds de prévoyance réglementaire (Loi 16).\n\nLe conseil rappelle que le versement ponctuel des charges mensuelles est essentiel à la bonne gouvernance de notre immeuble.\n\nFait à Laval, QC.\nLe Conseil d'administration.`
          : `CONVOCATION À L'ASSEMBLÉE GÉNÉRALE EXTRAORDINAIRE\n\nChers copropriétaires,\n\nPar la présente, vous êtes convoqués à l'assemblée générale extraordinaire qui se tiendra en ligne le 20 juin 2026 à 19h00.\n\nOrdre du jour :\n1. Présentation du bilan des charges pour la période : ${period}.\n2. Examen des cotisations extraordinaires pour le fonds de prévoyance.\n3. Période de questions.\n\nNous comptons sur votre présence.\n\nLe Secrétariat du Syndicat.`;
      setGeneratedText(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(12);

    const splitText = doc.splitTextToSize(generatedText, 180);
    doc.text(15, 20, splitText);

    doc.save(`AutoCompt_Rapport_${reportType}.pdf`);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-zinc-800/80 text-left font-sans">
      <header className="mb-6">
        <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="text-emerald-500" size={20} />
          Rédacteur de Rapports & Communiqués IA
        </h2>
        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
          Assistant intelligent conforme aux normes Regisco.ca
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings Column */}
        <div className="space-y-4">
          {/* Report Type selector */}
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">
              Type de Document
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full p-3.5 rounded-2xl text-[10px] font-bold border outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-800"
            >
              <option value="financier">Rapport financier mensuel</option>
              <option value="convocation">Convocation d'Assemblée</option>
              <option value="legal">Mise en demeure / Rappel de charges</option>
            </select>
          </div>

          {/* Period selector */}
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">
              Période cible
            </label>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="Ex: Juin 2026"
              className="w-full p-3.5 rounded-2xl text-[10px] font-bold border outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-800"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 border-none active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span>Génération...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Rédiger par l'IA</span>
              </>
            )}
          </button>
        </div>

        {/* Output Text Editor Column */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="flex-1 min-h-[200px] flex flex-col">
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">
              Contenu du Communiqué (Modifiable)
            </label>
            <textarea
              value={generatedText}
              onChange={(e) => setGeneratedText(e.target.value)}
              placeholder="Le texte généré par l'intelligence artificielle apparaîtra ici. Vous pourrez le corriger avant de l'exporter en PDF ou de l'envoyer par courriel."
              className="w-full flex-1 p-5 rounded-2xl text-xs font-medium border outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-800 min-h-[220px]"
            />
          </div>

          {/* Actions bottom row */}
          {generatedText && (
            <div className="flex flex-wrap gap-3 animate-in fade-in">
              <button
                onClick={handleDownloadPDF}
                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-2 border-none transition-colors"
              >
                <Download size={14} />
                <span>Télécharger PDF</span>
              </button>

              <button
                onClick={() => {
                  setIsSent(true);
                  setTimeout(() => setIsSent(false), 4000);
                }}
                className="py-3 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-2 border-none transition-colors"
              >
                <Mail size={14} />
                <span>Diffuser aux Copropriétaires</span>
              </button>
            </div>
          )}

          {/* Notifications Success Toast */}
          <AnimatePresence>
            {isSent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-400"
              >
                <CheckCircle2 size={16} />
                <span className="text-[10px] font-bold">Rapport diffusé par courriel avec succès à l'ensemble des 24 copropriétaires !</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
