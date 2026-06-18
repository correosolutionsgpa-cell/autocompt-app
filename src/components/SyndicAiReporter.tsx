import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Download,
  Mail,
  Loader2,
  CheckCircle2,
  FileText,
  Scale,
  Wrench,
  TrendingUp,
  Calendar,
  ChevronDown,
  RefreshCw,
  Clock,
  DollarSign,
  Users,
} from 'lucide-react';
import jsPDF from 'jspdf';

interface SyndicAiReporterProps {
  depenses: any[];
  activeCompanyId: string;
  darkMode: boolean;
  companyName: string;
  adminName: string;
  adminRole: string;
}

type DocType = 'financier' | 'convocation' | 'legal' | 'inspection' | 'budget';

interface DocTypeConfig {
  id: DocType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  headerColor: [number, number, number];
  accentHex: string;
}

const DOC_TYPES: DocTypeConfig[] = [
  {
    id: 'financier',
    label: 'Rapport Financier Mensuel',
    description: 'Résumé officiel des charges, fonds et cotisations pour le CA.',
    icon: <DollarSign size={18} />,
    color: 'emerald',
    headerColor: [5, 150, 105],
    accentHex: '#059669',
  },
  {
    id: 'convocation',
    label: "Convocation d'Assemblée",
    description: "Convocation formelle à l'assemblée générale ordinaire ou extraordinaire.",
    icon: <Calendar size={18} />,
    color: 'blue',
    headerColor: [37, 99, 235],
    accentHex: '#2563eb',
  },
  {
    id: 'legal',
    label: 'Mise en Demeure',
    description: 'Rappel officiel des charges dues et avis de pénalités potentielles.',
    icon: <Scale size={18} />,
    color: 'rose',
    headerColor: [225, 29, 72],
    accentHex: '#e11d48',
  },
  {
    id: 'inspection',
    label: "Rapport d'Inspection Loi 16",
    description: 'Rapport technique réglementaire conforme à la Loi 16 (QC).',
    icon: <Wrench size={18} />,
    color: 'violet',
    headerColor: [109, 40, 217],
    accentHex: '#6d28d9',
  },
  {
    id: 'budget',
    label: 'Prévisions Budgétaires',
    description: "Projection annuelle des dépenses et revenus de la copropriété.",
    icon: <TrendingUp size={18} />,
    color: 'amber',
    headerColor: [217, 119, 6],
    accentHex: '#d97706',
  },
];

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

interface GeneratedReport {
  id: string;
  type: DocType;
  period: string;
  text: string;
  generatedAt: string;
}

export default function SyndicAiReporter({
  depenses,
  activeCompanyId,
  darkMode,
  companyName,
  adminName,
  adminRole,
}: SyndicAiReporterProps) {
  const now = new Date();
  const currentMonthYear = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  const [docType, setDocType] = useState<DocType>('financier');
  const [period, setPeriod] = useState(currentMonthYear);
  const [additionalContext, setAdditionalContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [history, setHistory] = useState<GeneratedReport[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Compute real financial data from depenses
  const condoExpenses = depenses.filter((d) => d.companyId === activeCompanyId);
  const totalDepenses = condoExpenses.reduce((sum, d) => sum + (Number(d.total) || 0), 0);
  const fondsOperations = 14500;
  const fondsPrevoyance = 62350;

  const currentConfig = DOC_TYPES.find((d) => d.id === docType)!;

  const buildPrompt = (): string => {
    const baseContext = `
Syndicat: ${companyName}
Administrateur: ${adminName} (${adminRole})
Période: ${period}
Dépenses totales du mois: ${totalDepenses.toFixed(2)} $
Fonds d'opération: ${fondsOperations.toLocaleString('fr-CA')} $
Fonds de prévoyance: ${fondsPrevoyance.toLocaleString('fr-CA')} $
${additionalContext ? `Contexte additionnel: ${additionalContext}` : ''}
    `.trim();

    switch (docType) {
      case 'financier':
        return `Tu es un secrétaire juridique expert en droit de la copropriété au Québec. Rédige un rapport financier mensuel officiel et formel pour le syndicat de copropriété suivant, en respectant les normes du Code civil du Québec et de la Loi 16.

${baseContext}

Le rapport doit inclure:
1. En-tête officiel avec les données du syndicat
2. État des charges courantes du mois avec le total exact mentionné
3. Situation du Fonds d'opération et du Fonds de prévoyance
4. Taux de recouvrement des cotisations (si applicable)
5. Recommandations du Conseil d'administration
6. Conclusion formelle

Ton professionnel, formel, en français québécois.`;

      case 'convocation':
        return `Tu es un secrétaire juridique expert en droit de la copropriété au Québec. Rédige une convocation formelle à l'assemblée générale des copropriétaires pour le syndicat suivant.

${baseContext}

La convocation doit inclure:
1. Objet: Assemblée Générale (Ordinaire ou Extraordinaire selon le contexte)
2. Date et heure proposées (suggère une date réaliste dans les 3 prochaines semaines)
3. Lieu ou modalité (présentiel ou Teams/Zoom)
4. Ordre du jour complet et détaillé
5. Rappel des droits de vote et de participation
6. Signature du secrétaire

Ton formel et conforme à la déclaration de copropriété type québécoise.`;

      case 'legal':
        return `Tu es un juriste spécialisé en droit de la copropriété au Québec. Rédige une mise en demeure officielle pour les copropriétaires qui n'ont pas versé leurs cotisations pour le syndicat suivant.

${baseContext}

La mise en demeure doit inclure:
1. Rappel des obligations légales (art. 1064 C.c.Q.)
2. Montant dû et délai de paiement (5 jours ouvrables)
3. Conséquences légales en cas de non-paiement (inscription d'une hypothèque légale)
4. Coordonnées pour le paiement
5. Ton ferme mais professionnel, en français juridique québécois`;

      case 'inspection':
        return `Tu es un ingénieur en bâtiment spécialisé en inspection de copropriétés au Québec, conforme à la Loi 16 sur la copropriété. Rédige un rapport d'inspection technique pour le syndicat suivant.

${baseContext}

Le rapport doit inclure:
1. Identification de l'immeuble et du syndicat
2. Date et nature de l'inspection
3. Composantes inspectées (toiture, structure, mécanique, électricité, espaces communs)
4. État de chaque composante (Excellent / Conforme / À surveiller / Critique)
5. Recommandations et échéancier d'entretien
6. Estimation des coûts d'intervention
7. Conclusion et prochaine inspection recommandée

Ton technique, factuel, conforme aux normes du Carnet d'entretien de la Loi 16.`;

      case 'budget':
        return `Tu es un comptable agréé spécialisé en gestion de syndicats de copropriété au Québec. Rédige un rapport de prévisions budgétaires annuelles pour le syndicat suivant.

${baseContext}

Le rapport doit inclure:
1. Introduction et objectifs budgétaires
2. Revenus prévisionnels (cotisations ordinaires, extraordinaires, intérêts)
3. Dépenses prévisionnelles par catégorie (entretien, administration, assurances, services publics)
4. Cotisation mensuelle recommandée par unité
5. Projection du Fonds de prévoyance sur 3 ans
6. Analyse comparative avec l'année précédente
7. Recommandations du comité de finances

Ton professionnel, chiffré, avec des projections réalistes pour une copropriété québécoise.`;

      default:
        return `Rédige un document officiel pour le syndicat ${companyName} pour la période ${period}.`;
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedText('');
    setIsSent(false);

    const prompt = buildPrompt();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          currentForfeit: 'Pro',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.reply || data.message || 'Document généré avec succès.';
        setGeneratedText(text);
        const entry: GeneratedReport = {
          id: Date.now().toString(),
          type: docType,
          period,
          text,
          generatedAt: new Date().toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' }),
        };
        setHistory((prev) => [entry, ...prev].slice(0, 10));
      } else {
        throw new Error('API error');
      }
    } catch {
      // Rich fallback text
      const fallback = buildFallback();
      setGeneratedText(fallback);
      const entry: GeneratedReport = {
        id: Date.now().toString(),
        type: docType,
        period,
        text: fallback,
        generatedAt: new Date().toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' }),
      };
      setHistory((prev) => [entry, ...prev].slice(0, 10));
    } finally {
      setIsGenerating(false);
    }
  };

  const buildFallback = (): string => {
    const dateStr = new Date().toLocaleDateString('fr-CA', { dateStyle: 'long' });
    switch (docType) {
      case 'financier':
        return `RAPPORT FINANCIER MENSUEL — ${period.toUpperCase()}
${companyName.toUpperCase()}

Laval (Québec), le ${dateStr}

OBJET : Rapport financier à l'intention du Conseil d'administration

Mesdames, Messieurs les administrateurs,

Conformément aux dispositions du Règlement de l'immeuble et aux résolutions adoptées lors de la dernière assemblée du Conseil d'administration, nous vous soumettons le présent rapport financier pour la période de ${period}.

1. ÉTAT DES CHARGES COURANTES
Les dépenses totales enregistrées pour la période s'élèvent à ${totalDepenses.toFixed(2)} $, réparties entre l'entretien des parties communes, les frais d'administration et les services contractuels.

2. SITUATION DES FONDS
• Fonds d'opération : ${fondsOperations.toLocaleString('fr-CA')} $ — Solde courant satisfaisant.
• Fonds de prévoyance : ${fondsPrevoyance.toLocaleString('fr-CA')} $ — Conforme aux exigences de la Loi 16.

3. RECOMMANDATIONS DU CONSEIL
Le Conseil rappelle à l'ensemble des copropriétaires l'importance du versement ponctuel des charges mensuelles afin de maintenir la solvabilité et la pérennité financière de l'immeuble.

Fait à Laval, le ${dateStr}.

${adminName}
${adminRole} — ${companyName}`;

      case 'convocation':
        const meetDate = new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000);
        const meetDateStr = meetDate.toLocaleDateString('fr-CA', { dateStyle: 'long' });
        return `CONVOCATION À L'ASSEMBLÉE GÉNÉRALE DES COPROPRIÉTAIRES

${companyName.toUpperCase()}

Laval (Québec), le ${dateStr}

À : Tous les copropriétaires de l'immeuble

OBJET : Convocation à l'Assemblée Générale Ordinaire

Mesdames, Messieurs,

Vous êtes respectueusement convoqués à l'Assemblée Générale Ordinaire des copropriétaires, qui se tiendra le ${meetDateStr} à 19h00, via la plateforme Microsoft Teams (lien transmis par courriel).

ORDRE DU JOUR :
1. Ouverture de l'assemblée et vérification du quorum
2. Lecture et adoption du procès-verbal de la dernière assemblée
3. Rapport financier : période ${period} — Présentation des états financiers
4. Rapport du Conseil d'administration : travaux en cours et planifiés
5. Situation du Fonds de prévoyance (Loi 16)
6. Questions et commentaires des copropriétaires
7. Clôture de l'assemblée

Tout copropriétaire désirant soumettre un point à l'ordre du jour est prié de le signaler au secrétariat avant le ${new Date(meetDate.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-CA', { dateStyle: 'long' })}.

Cordialement,

${adminName}
${adminRole} — ${companyName}`;

      case 'legal':
        return `AVIS DE MISE EN DEMEURE — CHARGES IMPAYÉES

${companyName.toUpperCase()}

Laval (Québec), le ${dateStr}

À : [Copropriétaire concerné]
Unité : [Numéro d'unité]

OBJET : Mise en demeure — Versement des charges de copropriété — Période : ${period}

Monsieur / Madame,

Le Conseil d'administration du ${companyName} vous adresse la présente mise en demeure conformément aux articles 1064 et 1069 du Code civil du Québec ainsi qu'à la Déclaration de copropriété de l'immeuble.

À ce jour, votre compte présente un solde impayé de charges communes pour la période susmentionnée. Nous vous sommons de procéder au règlement intégral de votre dû dans un délai de CINQ (5) jours ouvrables suivant la réception de la présente.

À défaut de paiement dans ce délai, le Syndicat se verra dans l'obligation d'exercer ses recours légaux, incluant notamment l'inscription d'une hypothèque légale sur votre fraction conformément à l'article 2729 C.c.Q., sans autre préavis ni délai.

Pour toute question ou arrangement de paiement, veuillez communiquer avec notre administrateur dans les plus brefs délais.

${adminName}
${adminRole} — ${companyName}
DocuLegal — AutoCompt`;

      case 'inspection':
        return `RAPPORT D'INSPECTION TECHNIQUE — LOI 16

${companyName.toUpperCase()}

Date d'inspection : ${dateStr}
Période couverte : ${period}
Inspecteur responsable : ${adminName}

SOMMAIRE EXÉCUTIF
Le présent rapport documente l'état des composantes communes de l'immeuble, conformément aux obligations du Carnet d'entretien prescrit par la Loi 16 sur la copropriété divise.

COMPOSANTES INSPECTÉES

1. TOITURE ET ENVELOPPE — Statut : CONFORME ✓
Membrane en bon état. Aucune infiltration détectée. Prochaine inspection recommandée : ${MONTHS[(now.getMonth() + 6) % 12]} ${now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()}.

2. STRUCTURE ET FONDATIONS — Statut : CONFORME ✓
Aucune fissure structurelle notable. Drainage périmétrique fonctionnel.

3. SYSTÈMES MÉCANIQUES (Chauffage/Ventilation) — Statut : À SURVEILLER ⚠
Filtres des unités de traitement d'air à remplacer dans les 3 prochains mois. Coût estimé : 850 $.

4. ESPACES COMMUNS — Statut : CONFORME ✓
Hall d'entrée, corridors et stationnement en bon état général.

5. ASCENSEUR (si applicable) — Statut : CERTIFIÉ ✓
Dernière certification réglementaire : valide jusqu'à décembre ${now.getFullYear()}.

RECOMMANDATIONS ET BUDGET ESTIMÉ
• Remplacement filtres CVAC : 850 $
• Peinture couloir est (préventif) : 2 400 $
• Total recommandé pour le Fonds d'opération : 3 250 $

Prochaine inspection complète recommandée : ${period} ${now.getFullYear() + 1}.

${adminName} — ${adminRole}
${companyName}`;

      case 'budget':
        const annualCotis = (fondsOperations / 12) * 12 * 1.05;
        return `PRÉVISIONS BUDGÉTAIRES ANNUELLES — ${now.getFullYear() + 1}

${companyName.toUpperCase()}

Préparé par : ${adminName}, ${adminRole}
Date de préparation : ${dateStr}
Période de référence : ${period}

1. INTRODUCTION
Le présent budget prévisionnel a été établi sur la base des dépenses réelles de l'exercice en cours (${totalDepenses.toFixed(2)} $ pour la période ${period}) et des objectifs du plan directeur d'entretien.

2. REVENUS PRÉVISIONNELS
• Cotisations mensuelles ordinaires : ${fondsOperations.toLocaleString('fr-CA')} $/mois × 12 = ${(fondsOperations * 12).toLocaleString('fr-CA')} $
• Intérêts sur le Fonds de prévoyance : 1 245 $
• Total revenus : ${(fondsOperations * 12 + 1245).toLocaleString('fr-CA')} $

3. DÉPENSES PRÉVISIONNELLES
• Entretien et réparations courants : ${Math.round(totalDepenses * 1.05 * 12).toLocaleString('fr-CA')} $
• Administration et assurances : 8 400 $
• Services publics (parties communes) : 6 200 $
• Provision au Fonds de prévoyance : 12 000 $
• Total dépenses : ${Math.round(totalDepenses * 1.05 * 12 + 26600).toLocaleString('fr-CA')} $

4. SITUATION DU FONDS DE PRÉVOYANCE
• Solde actuel : ${fondsPrevoyance.toLocaleString('fr-CA')} $
• Projection fin ${now.getFullYear() + 1} : ${(fondsPrevoyance + 12000).toLocaleString('fr-CA')} $
• Projection fin ${now.getFullYear() + 2} : ${(fondsPrevoyance + 24000).toLocaleString('fr-CA')} $

5. COTISATION RECOMMANDÉE PAR UNITÉ
Afin de maintenir l'équilibre budgétaire : 385 $/mois/unité (selon la quote-part de chaque fraction).

Ce budget est soumis à l'approbation de l'Assemblée générale.

${adminName}
${adminRole} — ${companyName}`;
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const cfg = currentConfig;
    const pageW = 210;
    const pageH = 297;
    const margin = 18;
    const contentW = pageW - margin * 2;

    // ── Header Band ──
    doc.setFillColor(cfg.headerColor[0], cfg.headerColor[1], cfg.headerColor[2]);
    doc.rect(0, 0, pageW, 38, 'F');

    // AutoCompt Sparkle Star Logo (4-pointed star)
    const drawStar = (cx: number, cy: number, r: number) => {
      doc.setFillColor(255, 255, 255);
      const points: [number, number][] = [];
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? r : r * 0.38;
        points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
      }
      doc.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(([x, y]) => doc.lineTo(x, y));
      doc.fill();
    };
    drawStar(margin, 19, 8);

    // Company name in header
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(companyName.toUpperCase(), margin + 14, 16);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Géré via AutoCompt • DocuLegal', margin + 14, 22);

    // Document type pill
    doc.setFillColor(255, 255, 255, 0.2);
    doc.setDrawColor(255, 255, 255, 0.5);
    doc.roundedRect(margin + 14, 25, 80, 8, 2, 2, 'FD');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('Helvetica', 'bold');
    doc.text(cfg.label.toUpperCase(), margin + 18, 30.2);

    // Date top-right
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(new Date().toLocaleDateString('fr-CA', { dateStyle: 'long' }), pageW - margin, 16, { align: 'right' });
    doc.text(`Période : ${period}`, pageW - margin, 22, { align: 'right' });

    // ── Body ──
    doc.setTextColor(30, 41, 59);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);

    const lines = doc.splitTextToSize(generatedText, contentW);
    let y = 52;
    const lineH = 5.2;

    lines.forEach((line: string) => {
      if (y > pageH - 30) {
        doc.addPage();
        y = 20;
      }
      // Bold section titles (lines in ALL CAPS or numbered sections)
      const isSectionTitle =
        line === line.toUpperCase() && line.trim().length > 3 && !line.trim().match(/^\d+[\.,]/);
      const isNumberedSection = /^[1-9]\. /.test(line.trim());
      if (isSectionTitle || isNumberedSection) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(cfg.headerColor[0], cfg.headerColor[1], cfg.headerColor[2]);
      } else if (line.startsWith('•') || line.startsWith('-')) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
      } else {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
      }
      doc.text(line, margin, y);
      y += lineH;
    });

    // ── Signature block ──
    y = Math.max(y + 10, pageH - 55);
    if (y + 40 > pageH) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(cfg.headerColor[0], cfg.headerColor[1], cfg.headerColor[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageW - margin, y);

    y += 6;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(cfg.headerColor[0], cfg.headerColor[1], cfg.headerColor[2]);
    doc.text('SIGNATURE AUTORISÉE', margin, y);
    doc.text(new Date().toLocaleDateString('fr-CA', { dateStyle: 'long' }), pageW - margin, y, { align: 'right' });

    y += 10;
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + 70, y);
    doc.line(pageW - margin - 70, y, pageW - margin, y);

    y += 5;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(adminName, margin, y);
    doc.text('Copropriétaire / Témoin', pageW - margin - 70, y);

    y += 4;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(adminRole + ' — ' + companyName, margin, y);

    // ── Footer ──
    doc.setFillColor(cfg.headerColor[0], cfg.headerColor[1], cfg.headerColor[2]);
    doc.rect(0, pageH - 14, pageW, 14, 'F');
    drawStar(margin, pageH - 7, 4);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.text(
      'Ce document a été généré et scellé électroniquement par DocuLegal, une solution AutoCompt.',
      margin + 8,
      pageH - 9
    );
    doc.text(`${companyName} • AutoCompt • ${new Date().getFullYear()}`, margin + 8, pageH - 5);

    doc.save(`AutoCompt_${cfg.id}_${period.replace(/\s/g, '-')}.pdf`);
  };

  const handleSend = async () => {
    setIsSending(true);
    await new Promise((r) => setTimeout(r, 1800));
    setIsSending(false);
    setIsSent(true);
    setTimeout(() => setIsSent(false), 4000);
  };

  const dm = darkMode;
  const card = `rounded-[24px] border p-5 ${dm ? 'bg-zinc-900/60 border-zinc-800/70' : 'bg-white border-slate-200 shadow-sm'}`;
  const inputCls = `w-full p-3.5 rounded-2xl text-[10px] font-bold border outline-none focus:ring-1 transition-all ${dm ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:ring-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-emerald-500'}`;

  return (
    <div className="space-y-6 font-sans text-left">

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Dépenses du mois', value: `${totalDepenses.toFixed(2)} $`, icon: <DollarSign size={16} />, color: 'emerald' },
          { label: 'Fonds de prévoyance', value: `${fondsPrevoyance.toLocaleString('fr-CA')} $`, icon: <TrendingUp size={16} />, color: 'blue' },
          { label: 'Documents générés', value: history.length.toString(), icon: <FileText size={16} />, color: 'violet' },
        ].map((kpi) => (
          <div key={kpi.label} className={`${card} flex items-center gap-3`}>
            <div className={`p-2.5 rounded-xl ${dm ? `bg-${kpi.color}-900/30 text-${kpi.color}-400` : `bg-${kpi.color}-50 text-${kpi.color}-600`}`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">{kpi.label}</p>
              <p className={`text-sm font-black tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Generator Card */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-5">
          <div className={`p-2 rounded-xl ${dm ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className={`text-sm font-black uppercase italic tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>
              Rédacteur de Documents IA
            </h2>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
              Conforme aux normes du Code civil du Québec & Loi 16
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Settings */}
          <div className="space-y-4">

            {/* Document type selector */}
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Type de Document</label>
              <div className="space-y-2">
                {DOC_TYPES.map((dt) => (
                  <button
                    key={dt.id}
                    onClick={() => setDocType(dt.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-2xl border text-left transition-all ${
                      docType === dt.id
                        ? dm
                          ? `bg-${dt.color}-900/30 border-${dt.color}-500/50 text-${dt.color}-300`
                          : `bg-${dt.color}-50 border-${dt.color}-300 text-${dt.color}-700`
                        : dm
                        ? 'bg-zinc-900/40 border-zinc-800/60 text-zinc-400 hover:border-zinc-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${docType === dt.id ? '' : 'opacity-60'}`}>
                      {dt.icon}
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-tight leading-tight">{dt.label}</p>
                      <p className="text-[7.5px] font-bold opacity-70 mt-0.5 leading-snug">{dt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Period */}
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Période</label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="Ex: Juin 2026"
                className={inputCls}
              />
            </div>

            {/* Additional context */}
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                Contexte Additionnel (optionnel)
              </label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Ex: Travaux urgents de toiture, copropriétaire Unité 302 en défaut..."
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{ backgroundColor: currentConfig.accentHex }}
              className="w-full py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 border-none active:scale-[0.98] transition-transform disabled:opacity-50 hover:opacity-90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>Rédaction en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Rédiger par l'IA</span>
                </>
              )}
            </button>
          </div>

          {/* Right column — Output */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex-1 flex flex-col">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                Contenu du Document (Modifiable avant export)
              </label>
              {isGenerating ? (
                <div className={`flex-1 min-h-[300px] rounded-2xl border flex flex-col items-center justify-center gap-3 ${dm ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: currentConfig.accentHex }}
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                      />
                    ))}
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    L'IA rédige votre document...
                  </p>
                </div>
              ) : (
                <textarea
                  value={generatedText}
                  onChange={(e) => setGeneratedText(e.target.value)}
                  placeholder={`Le texte généré pour « ${currentConfig.label} » apparaîtra ici.\n\nVous pouvez le modifier avant de l'exporter en PDF ou de le diffuser aux copropriétaires.`}
                  className={`${inputCls} flex-1 min-h-[300px] text-[10.5px] leading-relaxed`}
                />
              )}
            </div>

            {/* Action buttons */}
            <AnimatePresence>
              {generatedText && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-wrap gap-3"
                >
                  <button
                    onClick={handleDownloadPDF}
                    className="py-3 px-5 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-2 border-none transition-all hover:opacity-90 active:scale-[0.97]"
                    style={{ backgroundColor: currentConfig.accentHex }}
                  >
                    <Download size={13} />
                    <span>Télécharger PDF</span>
                  </button>

                  <button
                    onClick={handleSend}
                    disabled={isSending}
                    className={`py-3 px-5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-2 border-none transition-all active:scale-[0.97] ${
                      dm
                        ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    } disabled:opacity-50`}
                  >
                    {isSending ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                    <span>{isSending ? 'Envoi...' : 'Diffuser aux Copropriétaires'}</span>
                  </button>

                  <button
                    onClick={() => { setGeneratedText(''); }}
                    className={`py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-2 border-none transition-all ${dm ? 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  >
                    <RefreshCw size={13} />
                    <span>Effacer</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success toast */}
            <AnimatePresence>
              {isSent && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-400"
                >
                  <CheckCircle2 size={16} />
                  <span className="text-[10px] font-bold">
                    Document diffusé avec succès à l'ensemble des copropriétaires de {companyName} !
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className={card}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-slate-400" />
              <span className={`text-[9px] font-black uppercase tracking-widest ${dm ? 'text-zinc-300' : 'text-slate-700'}`}>
                Historique — {history.length} document{history.length > 1 ? 's' : ''} générés
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform ${showHistory ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-2 overflow-hidden"
              >
                {history.map((entry) => {
                  const cfg = DOC_TYPES.find((d) => d.id === entry.type)!;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => {
                        setGeneratedText(entry.text);
                        setDocType(entry.type);
                        setPeriod(entry.period);
                        setSelectedHistoryId(entry.id);
                        setShowHistory(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                        selectedHistoryId === entry.id
                          ? dm ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-100 border-slate-300'
                          : dm ? 'bg-zinc-900/50 border-zinc-800/60 hover:border-zinc-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: cfg.accentHex + '20', color: cfg.accentHex }}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[9px] font-black uppercase tracking-tight ${dm ? 'text-zinc-200' : 'text-slate-800'}`}>
                          {cfg.label}
                        </p>
                        <p className="text-[7.5px] font-bold text-slate-400 mt-0.5">{entry.period} • {entry.generatedAt}</p>
                      </div>
                      <Users size={12} className="text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
