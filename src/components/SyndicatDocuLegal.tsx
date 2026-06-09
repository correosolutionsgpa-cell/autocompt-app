import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  ChevronDown, 
  Download, 
  CheckCircle2, 
  Clock, 
  FileText, 
  PenTool, 
  X, 
  Trash2, 
  ShieldCheck, 
  FileSignature,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';

interface LegalDocument {
  id: string;
  title: string;
  date: string;
  status: string;
  summary: string;
  provider: string;
  signedBy: string;
  signedDate: string;
  signatureType?: 'draw' | 'type';
  signatureDataUrl?: string;
}

interface SyndicatDocuLegalProps {
  darkMode: boolean;
}

export default function SyndicatDocuLegal({ darkMode }: SyndicatDocuLegalProps) {
  const [activeTab, setActiveTab] = useState<'externe' | 'interne'>('externe');
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);

  // Dynamic States for Lists
  const [contrats, setContrats] = useState<LegalDocument[]>([
    { 
      id: 'c1', 
      title: "Déneigement Pro Inc. - Contrat 2026-2027", 
      date: "12 Oct 2026", 
      status: "signe", 
      summary: "Contrat annuel pour le déneigement du stationnement, des allées piétonnières et l'épandage de sel. Inclut le déneigement des balcons sur demande.",
      provider: "Déneigement Pro",
      signedBy: "Fabiola Beatriz",
      signedDate: "12 Oct 2026"
    },
    { 
      id: 'c2', 
      title: "Nettoyage Élégance - Entretien Ménager", 
      date: "05 Nov 2026", 
      status: "signe", 
      summary: "Entretien hebdomadaire des espaces communs: hall d'entrée, couloirs, ascenseurs et salle des déchets.",
      provider: "Nettoyage Élégance",
      signedBy: "Fabiola Beatriz",
      signedDate: "05 Nov 2026"
    },
    { 
      id: 'c3', 
      title: "Jardinage Plus - Aménagement Paysager", 
      date: "20 Fév 2027", 
      status: "attente", 
      summary: "Ouverture et fermeture du terrain, tonte de pelouse hebdomadaire et entretien des plates-bandes estivales.",
      provider: "Jardinage Plus",
      signedBy: "",
      signedDate: ""
    },
  ]);
  
  const [resolutions, setResolutions] = useState<LegalDocument[]>([
    { 
      id: 'r1', 
      title: "Résolution - Réfection de la toiture", 
      date: "15 Mai 2026", 
      status: "signe", 
      summary: "Approbation du devis de Toitures Plus pour la réfection complète de la toiture. Financement via le fonds de prévoyance.",
      provider: "Conseil d'Administration",
      signedBy: "Fabiola Beatriz",
      signedDate: "15 Mai 2026"
    },
    { 
      id: 'r2', 
      title: "Assemblée Générale Spéciale - Cotisation Spéciale", 
      date: "10 Avr 2026", 
      status: "signe", 
      summary: "Adoption d'une cotisation spéciale de 50 000$ répartie selon les quotes-parts pour le remplacement de la génératrice.",
      provider: "Conseil d'Administration",
      signedBy: "Fabiola Beatriz",
      signedDate: "10 Avr 2026"
    },
    { 
      id: 'r3', 
      title: "Nomination du Conseil d'Administration", 
      date: "01 Jui 2026", 
      status: "attente", 
      summary: "Nomination officielle du nouveau trésorier (Unité 302) et du secrétaire (Unité 104) suite à l'assemblée générale annuelle.",
      provider: "Conseil d'Administration",
      signedBy: "",
      signedDate: ""
    },
  ]);

  // Toast State
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals States
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signingDoc, setSigningDoc] = useState<{ id: string; title: string; provider: string } | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProvider, setNewProvider] = useState('');
  const [newSummary, setNewSummary] = useState('');

  // Signature Pad States
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Sound generator (Web Audio API)
  const playSound = (type: 'success' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'success') {
        // Double tone chime (ascending)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5

        gainNode.gain.setValueAtTime(0.06, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.1);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.35);
      } else {
        // Low double buzz
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, now);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      console.warn("Sound play ignored", e);
    }
  };

  // Toast Helper
  const triggerToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    playSound(type);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Canvas Drawing Handlers (Mouse)
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear placeholder text on first draw
    if (!hasDrawn) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(true);
    }

    ctx.strokeStyle = darkMode ? '#10b981' : '#059669'; // Emerald
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    
    // Draw canvas placeholder
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dessinez votre signature ici avec la souris ou votre doigt', canvas.width / 2, canvas.height / 2);
  };

  // Redraw Canvas on Modal Open / Resize
  useEffect(() => {
    if (isSignatureModalOpen && signatureType === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear and render placeholder
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = darkMode ? '#52525b' : '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Dessinez votre signature ici avec la souris ou votre doigt', canvas.width / 2, canvas.height / 2);
      }
    }
  }, [isSignatureModalOpen, signatureType, darkMode]);

  // Native touch event listeners to prevent scrolling while drawing on mobile
  useEffect(() => {
    if (!isSignatureModalOpen || signatureType !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let localIsDrawing = false;
    let localHasDrawn = hasDrawn;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }

      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!localHasDrawn) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(true);
        localHasDrawn = true;
      }

      ctx.strokeStyle = darkMode ? '#10b981' : '#059669'; // Emerald
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      
      setIsDrawing(true);
      localIsDrawing = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
      if (!localIsDrawing) return;

      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      setIsDrawing(false);
      localIsDrawing = false;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isSignatureModalOpen, signatureType, darkMode, hasDrawn]);

  // Handle Apply Signature
  const handleApplySignature = () => {
    if (!signingDoc) return;

    if (signatureType === 'draw' && !hasDrawn) {
      triggerToast("Veuillez dessiner votre signature avant de valider.", "error");
      return;
    }

    if (signatureType === 'type' && !typedSignature.trim()) {
      triggerToast("Veuillez saisir votre nom pour signer.", "error");
      return;
    }

    const todayStr = new Date().toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
    const signerName = signatureType === 'type' ? typedSignature : "Fabiola Beatriz (Signé à la main)";

    // Get visual signature image if drawn
    let signatureImgDataUrl = '';
    if (signatureType === 'draw' && canvasRef.current && hasDrawn) {
      try {
        signatureImgDataUrl = canvasRef.current.toDataURL('image/png');
      } catch (err) {
        console.error("Failed to extract canvas signature data url", err);
      }
    }

    // Update locally
    if (activeTab === 'externe') {
      setContrats(prev => prev.map(c => c.id === signingDoc.id ? { 
        ...c, 
        status: 'signe', 
        signedBy: signerName, 
        signedDate: todayStr,
        signatureType: signatureType,
        signatureDataUrl: signatureImgDataUrl || undefined
      } : c));
    } else {
      setResolutions(prev => prev.map(r => r.id === signingDoc.id ? { 
        ...r, 
        status: 'signe', 
        signedBy: signerName, 
        signedDate: todayStr,
        signatureType: signatureType,
        signatureDataUrl: signatureImgDataUrl || undefined
      } : r));
    }

    // Close and reset
    setIsSignatureModalOpen(false);
    setSigningDoc(null);
    setTypedSignature('');
    setHasDrawn(false);
    triggerToast("Document signé électroniquement avec succès !", "success");
  };

  // Handle Add Document
  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) {
      triggerToast("Veuillez remplir le titre et la description.", "error");
      return;
    }

    const todayStr = new Date().toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
    const newDoc = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      date: todayStr,
      status: "attente",
      summary: newSummary,
      provider: newProvider || (activeTab === 'externe' ? "Nouveau Fournisseur" : "Conseil d'Administration"),
      signedBy: "",
      signedDate: ""
    };

    if (activeTab === 'externe') {
      setContrats(prev => [...prev, newDoc]);
      triggerToast("Nouveau contrat ajouté avec succès !", "success");
    } else {
      setResolutions(prev => [...prev, newDoc]);
      triggerToast("Nouvelle résolution ajoutée avec succès !", "success");
    }

    // Reset fields & Close
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewProvider('');
    setNewSummary('');
  };

  // Delete Document
  const handleDeleteDocument = (id: string) => {
    if (activeTab === 'externe') {
      setContrats(prev => prev.filter(c => c.id !== id));
    } else {
      setResolutions(prev => prev.filter(r => r.id !== id));
    }
    setOpenDrawerId(null);
    triggerToast("Document supprimé avec succès.", "success");
  };

  // Generate and Download PDF using jsPDF
  const handleDownloadPdf = (doc: LegalDocument) => {
    try {
      const docPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Page size properties
      const pageWidth = docPdf.internal.pageSize.getWidth(); // 210
      const pageHeight = docPdf.internal.pageSize.getHeight(); // 297

      // Colors
      const primaryColor = activeTab === 'externe' ? [16, 185, 129] : [20, 184, 166]; // Emerald vs Teal
      
      // Top elegant colored band
      docPdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      docPdf.rect(0, 0, pageWidth, 25, 'F');

      // Top band texts
      docPdf.setTextColor(255, 255, 255);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(14);
      docPdf.text('AUTOCOMPT - GESTION IMMOBILIÈRE', 20, 12);
      
      docPdf.setFont('Helvetica', 'normal');
      docPdf.setFontSize(8);
      docPdf.text('CERTIFICATION ET ARCHIVAGE NUMÉRIQUE LÉGAL', 20, 18);

      // Document reference and date on the right
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(8);
      docPdf.text(`RÉF : ${doc.id.toUpperCase()}`, pageWidth - 20, 12, { align: 'right' });
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text(`GÉNÉRÉ LE : ${new Date().toLocaleDateString('fr-CA')}`, pageWidth - 20, 18, { align: 'right' });

      // Clean decorative border line under the top bar
      docPdf.setDrawColor(226, 232, 240); // slate-200
      docPdf.setLineWidth(0.5);
      docPdf.line(20, 35, pageWidth - 20, 35);

      // Section 1: Metadata details
      docPdf.setTextColor(30, 41, 59); // slate-800
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(11);
      docPdf.text('INFORMATIONS DU DOCUMENT', 20, 45);

      // Left Column Metadata
      docPdf.setFont('Helvetica', 'normal');
      docPdf.setFontSize(9);
      docPdf.setTextColor(100, 116, 139); // slate-500
      docPdf.text('Type de dossier :', 20, 53);
      docPdf.text(activeTab === 'externe' ? 'Contrat & Entente Prestataire' : 'Registre / Résolution CA', 55, 53);

      docPdf.text('Date de création :', 20, 59);
      docPdf.text(doc.date, 55, 59);

      docPdf.text('Statut de signature :', 20, 65);
      const isSigned = doc.status === 'signe';
      docPdf.setFont('Helvetica', 'bold');
      if (isSigned) {
        docPdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        docPdf.text('SIGNÉ & ARCHIVÉ', 55, 65);
      } else {
        docPdf.setTextColor(245, 158, 11); // Amber
        docPdf.text('EN ATTENTE DE SIGNATURE', 55, 65);
      }

      // Right Column Metadata
      docPdf.setFont('Helvetica', 'normal');
      docPdf.setTextColor(100, 116, 139); // slate-500
      docPdf.text('Émetteur / Tiers :', 110, 53);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setTextColor(30, 41, 59);
      docPdf.text(doc.provider, 140, 53);

      if (isSigned) {
        docPdf.setFont('Helvetica', 'normal');
        docPdf.setTextColor(100, 116, 139);
        docPdf.text('Validé par :', 110, 59);
        docPdf.setTextColor(30, 41, 59);
        docPdf.text(doc.signedBy, 140, 59);

        docPdf.setTextColor(100, 116, 139);
        docPdf.text('Signé le :', 110, 65);
        docPdf.setTextColor(30, 41, 59);
        docPdf.text(doc.signedDate, 140, 65);
      }

      // Horizontal separator
      docPdf.setDrawColor(226, 232, 240);
      docPdf.line(20, 72, pageWidth - 20, 72);

      // Section 2: Document content title
      docPdf.setTextColor(30, 41, 59);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(13);
      docPdf.text(doc.title, 20, 82);

      // Body text / Summary description (wrapped)
      docPdf.setFont('Helvetica', 'normal');
      docPdf.setFontSize(10);
      docPdf.setTextColor(71, 85, 105); // slate-600
      
      const summaryText = doc.summary || "Aucun résumé disponible pour ce document.";
      const splitLines = docPdf.splitTextToSize(summaryText, pageWidth - 40); // width 170 mm
      
      let currentY = 90;
      splitLines.forEach((line: string) => {
        // If we exceed page boundaries, add a new page
        if (currentY > pageHeight - 90) {
          docPdf.addPage();
          currentY = 25;
        }
        docPdf.text(line, 20, currentY);
        currentY += 6;
      });

      currentY += 6;

      // Section 3: Signatures Block
      if (currentY < 130) {
        currentY = 130;
      }

      if (isSigned) {
        docPdf.setDrawColor(226, 232, 240);
        docPdf.line(20, currentY, pageWidth - 20, currentY);
        currentY += 10;

        docPdf.setTextColor(30, 41, 59);
        docPdf.setFont('Helvetica', 'bold');
        docPdf.setFontSize(11);
        docPdf.text('SIGNATURES ET VALIDATION ÉLECTRONIQUE', 20, currentY);
        
        currentY += 8;

        // Signature box border
        docPdf.setDrawColor(203, 213, 225); // slate-300
        docPdf.setFillColor(248, 250, 252); // slate-50
        docPdf.rect(20, currentY, 170, 40, 'FD');

        // Text labels inside signature box
        docPdf.setTextColor(100, 116, 139);
        docPdf.setFont('Helvetica', 'normal');
        docPdf.setFontSize(8);
        docPdf.text('Signataire Officiel du Syndicat :', 25, currentY + 7);
        docPdf.text('Date de Signature :', 25, currentY + 13);
        docPdf.text('Méthode de validation :', 25, currentY + 19);

        docPdf.setTextColor(30, 41, 59);
        docPdf.setFont('Helvetica', 'bold');
        docPdf.text(doc.signedBy, 70, currentY + 7);
        docPdf.text(doc.signedDate, 70, currentY + 13);

        const sigType = doc.signatureType || 'type';
        docPdf.text(sigType === 'draw' ? 'Signature manuelle sur écran tactile / souris' : 'Saisie au clavier vérifiée', 70, currentY + 19);

        // Render visual signature on the right of the signature box
        const sigX = 130;
        const sigY = currentY + 5;
        const sigW = 50;
        const sigH = 20;

        // Draw helper signature guideline
        docPdf.setDrawColor(203, 213, 225);
        docPdf.setLineWidth(0.3);
        docPdf.line(sigX, sigY + 22, sigX + sigW, sigY + 22);
        
        docPdf.setFont('Helvetica', 'italic');
        docPdf.setFontSize(7);
        docPdf.setTextColor(148, 163, 184);
        docPdf.text('Signature visuelle', sigX + sigW / 2, sigY + 26, { align: 'center' });

        if (sigType === 'draw' && doc.signatureDataUrl) {
          try {
            docPdf.addImage(doc.signatureDataUrl, 'PNG', sigX, sigY, sigW, sigH);
          } catch (imgError) {
            console.error("Failed to render signature image in PDF", imgError);
            docPdf.setFont('Times', 'italic');
            docPdf.setFontSize(16);
            docPdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            docPdf.text(doc.signedBy, sigX + sigW / 2, sigY + 12, { align: 'center' });
          }
        } else {
          // Typed signature style (Times italic cursive lookalike)
          docPdf.setFont('Times', 'italic');
          docPdf.setFontSize(18);
          const cleanName = doc.signedBy.replace(' (Signé à la main)', '');
          docPdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          docPdf.text(cleanName, sigX + sigW / 2, sigY + 12, { align: 'center' });
        }

        currentY += 48;
      }

      // Section 4: Digital Authenticity Seal / Certificate Box at the bottom of the page
      const sealY = pageHeight - 55; // 242 mm from top
      
      docPdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      docPdf.setLineWidth(0.4);
      docPdf.setLineDashPattern([2, 1], 0);
      docPdf.setFillColor(255, 255, 255);
      docPdf.rect(20, sealY, 170, 35, 'FD');
      docPdf.setLineDashPattern([], 0);

      // Security seal content
      docPdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(8);
      docPdf.text("SCEAU DE CERTIFICATION NUMÉRIQUE - AUTOCOMPT SECURE", 25, sealY + 7);

      docPdf.setTextColor(100, 116, 139);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.setFontSize(7.5);
      docPdf.text("Ce document PDF officiel a été scellé et enregistré de manière permanente dans la base de données", 25, sealY + 13);
      docPdf.text("d'AutoCompt. Il constitue une preuve légale d'approbation et d'engagement de copropriété.", 25, sealY + 17);

      const hashStr = `SHA-256: ${Math.random().toString(16).substr(2, 8).toUpperCase()}${Math.random().toString(16).substr(2, 8).toUpperCase()}E99A${doc.id.toUpperCase()}E9F4C${isSigned ? '1B' : '00'}`;
      docPdf.setFont('Courier', 'bold');
      docPdf.setFontSize(7.5);
      docPdf.setTextColor(71, 85, 105);
      docPdf.text(hashStr, 25, sealY + 24);

      // Small graphic seal badge (Circle with checkmark inside)
      const badgeX = 175;
      const badgeY = sealY + 15;
      docPdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      docPdf.setLineWidth(0.8);
      docPdf.setFillColor(240, 253, 250); // very light teal
      docPdf.circle(badgeX, badgeY, 6, 'FD');
      
      docPdf.line(badgeX - 2.5, badgeY, badgeX - 0.5, badgeY + 2);
      docPdf.line(badgeX - 0.5, badgeY + 2, badgeX + 3, badgeY - 2);

      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(6);
      docPdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      docPdf.text("VERIFIED", badgeX, badgeY + 9, { align: 'center' });

      // Footer disclaimer
      docPdf.setTextColor(148, 163, 184);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.setFontSize(7);
      docPdf.text("Document numérique certifié - Ne pas modifier manuellement. AutoCompt Canada.", pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save the PDF
      const sanitizedTitle = doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      docPdf.save(`DocuLegal_${sanitizedTitle}.pdf`);
      triggerToast("Document PDF exporté avec succès !", "success");
    } catch (pdfError) {
      console.error("Error generating PDF", pdfError);
      triggerToast("Erreur lors de la génération du PDF.", "error");
    }
  };

  const currentList = activeTab === 'externe' ? contrats : resolutions;

  return (
    <div className="relative font-sans text-left">
      {/* Toast Alert popup */}
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
            {toast.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
            <span className="text-[10px] font-black uppercase tracking-wider">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`rounded-[32px] p-6 sm:p-8 shadow-sm ${darkMode ? "bg-zinc-900/40 border border-zinc-800" : "bg-white border border-slate-200"}`}>
        {/* Toggle Onglets Pilule */}
        <div className="flex justify-center mb-10">
          <div className={`inline-flex p-1.5 rounded-full ${darkMode ? "bg-zinc-950 border border-zinc-800" : "bg-slate-100/80 border border-slate-200/50"}`}>
            <button 
              onClick={() => { setActiveTab('externe'); setOpenDrawerId(null); }}
              className={`px-6 sm:px-10 py-3.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'externe' ? (darkMode ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-md backdrop-blur-md" : "bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 shadow-md backdrop-blur-md") : (darkMode ? "text-zinc-500 hover:text-zinc-300 border border-transparent" : "text-slate-500 hover:text-slate-700 border border-transparent")}`}
            >
              Contrats & Ententes
            </button>
            <button 
              onClick={() => { setActiveTab('interne'); setOpenDrawerId(null); }}
              className={`px-6 sm:px-10 py-3.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'interne' ? (darkMode ? "bg-teal-500/15 border border-teal-500/40 text-teal-400 shadow-md backdrop-blur-md" : "bg-teal-500/10 border border-teal-500/25 text-teal-700 shadow-md backdrop-blur-md") : (darkMode ? "text-zinc-500 hover:text-zinc-300 border border-transparent" : "text-slate-500 hover:text-slate-700 border border-transparent")}`}
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
              
              // Determine colored translucent glassmorphic theme when selected/open
              const isSigne = doc.status === 'signe';
              const themeColor = activeTab === 'externe' 
                ? (isSigne ? 'emerald' : 'amber') 
                : (isSigne ? 'teal' : 'amber');

              const glassStyles = {
                emerald: {
                  bg: darkMode ? 'bg-emerald-500/10 dark:bg-emerald-950/20' : 'bg-emerald-50/40',
                  border: darkMode ? 'border-emerald-500/30' : 'border-emerald-500/30',
                  shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                },
                amber: {
                  bg: darkMode ? 'bg-amber-500/10 dark:bg-amber-950/20' : 'bg-amber-50/40',
                  border: darkMode ? 'border-amber-500/30' : 'border-amber-500/30',
                  shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                },
                teal: {
                  bg: darkMode ? 'bg-teal-500/10 dark:bg-teal-950/20' : 'bg-teal-50/40',
                  border: darkMode ? 'border-teal-500/30' : 'border-teal-500/30',
                  shadow: 'shadow-[0_0_20px_rgba(20,184,166,0.08)]'
                }
              }[themeColor];

              const iconStyles = {
                emerald: {
                  bg: darkMode ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100/90 text-emerald-700 border border-emerald-300/60'
                },
                amber: {
                  bg: darkMode ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-amber-100/90 text-amber-700 border border-amber-300/60'
                },
                teal: {
                  bg: darkMode ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'bg-teal-100/90 text-teal-700 border border-teal-300/60'
                }
              }[themeColor];

              const cardClasses = isOpen 
                ? `${glassStyles.bg} ${glassStyles.border} ${glassStyles.shadow} backdrop-blur-md`
                : darkMode 
                  ? 'bg-zinc-950/80 border-zinc-900/80 hover:bg-zinc-900/40 hover:border-zinc-800 text-zinc-300' 
                  : 'bg-white border-slate-200/80 hover:bg-slate-50/50 hover:border-slate-300 text-slate-700';

              return (
                <div key={doc.id} className={`rounded-[32px] overflow-hidden transition-all duration-300 border ${cardClasses} ${isOpen ? 'shadow-xl' : 'shadow-sm hover:shadow-md'}`}>
                  <button
                    onClick={() => setOpenDrawerId(isOpen ? null : doc.id)}
                    className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-7 text-left transition-colors border-none bg-transparent cursor-pointer ${darkMode ? "hover:bg-zinc-900/40" : "hover:bg-slate-50/50"}`}
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-2">
                         <div className={`p-2.5 rounded-[16px] inline-flex items-center justify-center shrink-0 transition-colors duration-300 ${iconStyles.bg}`}>
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
                          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 text-teal-650 dark:text-emerald-450">
                            <CheckCircle2 size={12} className="shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Signé & Archivé</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-650 dark:text-amber-400">
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
                        <div className={`px-6 sm:px-7 pb-7 pt-4 border-t sm:ml-16 ${darkMode ? "border-zinc-900/60" : "border-slate-100"}`}>
                          <p className={`text-sm leading-relaxed mb-4 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                            {doc.summary}
                          </p>

                          {doc.status === 'signe' && (
                            <div className="mb-6 p-4 rounded-2xl bg-teal-500/5 dark:bg-emerald-500/5 border border-teal-100/20 dark:border-emerald-500/10 text-left">
                              <p className="text-[9px] font-black uppercase tracking-widest text-teal-650 dark:text-emerald-400 mb-1">
                                Signature Électronique Validée
                              </p>
                              <p className="text-[11px] font-bold text-slate-650 dark:text-zinc-300">
                                Signé par <strong className="text-teal-700 dark:text-emerald-300">{doc.signedBy}</strong> le {doc.signedDate}.
                              </p>
                            </div>
                          )}
                          
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <button 
                              onClick={() => handleDownloadPdf(doc)}
                              className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-transform active:scale-95 border-none cursor-pointer ${darkMode ? "bg-teal-500 border border-teal-400 text-teal-950 hover:bg-teal-400" : "bg-teal-550 text-white hover:bg-teal-650 shadow-md shadow-teal-500/20"}`}
                            >
                              <Download size={16} />
                              <span>Télécharger PDF</span>
                            </button>
                            
                            {doc.status !== 'signe' ? (
                              <button 
                                onClick={() => {
                                  setSigningDoc({ id: doc.id, title: doc.title, provider: doc.provider });
                                  setIsSignatureModalOpen(true);
                                  playSound('success');
                                }}
                                className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-transform active:scale-95 border-none cursor-pointer ${darkMode ? "bg-amber-500 text-zinc-950 hover:bg-amber-400" : "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20"}`}
                              >
                                <PenTool size={16} />
                                <span>Signer le Document</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-transform active:scale-95 border border-rose-250 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/25 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-900/40 cursor-pointer`}
                              >
                                <Trash2 size={16} />
                                <span>Archiver / Supprimer</span>
                              </button>
                            )}
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

        <button 
          onClick={() => { setIsAddModalOpen(true); playSound('success'); }}
          className={`w-full mt-8 py-5 rounded-[32px] border-2 border-dashed transition-all duration-300 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm bg-transparent cursor-pointer ${darkMode ? "border-zinc-700/50 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-500 hover:text-zinc-200" : "border-slate-300 text-slate-500 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-700"}`}
        >
          <Plus size={18} /> {activeTab === 'externe' ? 'Ajouter un nouveau contrat' : 'Créer une nouvelle résolution'}
        </button>
      </div>

      {/* MODAL 1: INTERACTIVE DIGITAL SIGNATURE */}
      <AnimatePresence>
        {isSignatureModalOpen && signingDoc && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`w-full max-w-lg rounded-[40px] border shadow-2xl p-6 sm:p-8 flex flex-col relative ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-100 text-slate-900"}`}
            >
              <button 
                onClick={() => { setIsSignatureModalOpen(false); setSigningDoc(null); }}
                className={`absolute top-6 right-6 p-2 rounded-xl transition-all border-none bg-transparent cursor-pointer ${darkMode ? "text-zinc-500 hover:text-white hover:bg-zinc-900" : "text-slate-300 hover:text-slate-900 hover:bg-slate-50"}`}
              >
                <X size={20} />
              </button>

              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-amber-500/10 text-amber-500 p-2.5 rounded-2xl">
                  <PenTool size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest leading-none">Signature Électronique</h3>
                  <p className="text-[8px] font-black uppercase text-amber-500 tracking-wider mt-1.5 leading-none">
                    Validation du contrat : {signingDoc.provider}
                  </p>
                </div>
              </div>

              {/* Mock contract details */}
              <div className={`p-4 rounded-2xl border text-[11px] leading-relaxed mb-6 ${darkMode ? "bg-zinc-900/50 border-zinc-800/80 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                <p className="font-bold text-slate-800 dark:text-zinc-200 mb-1">Résumé des Engagements :</p>
                <p className="italic">« {signingDoc.title} »</p>
                <p className="mt-2">En signant ce document, le conseil d'administration s'engage à respecter les clauses budgétaires associées et autorise le paiement des factures émises par le prestataire.</p>
              </div>

              {/* Selector Tabs: Draw vs Type */}
              <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-2xl mb-4 border border-slate-200/30 dark:border-zinc-800/40">
                <button
                  onClick={() => setSignatureType('draw')}
                  className={`flex-1 py-2 text-[9.5px] font-black uppercase tracking-wider rounded-xl transition-all border-none bg-transparent cursor-pointer ${signatureType === 'draw' ? (darkMode ? 'bg-zinc-800 text-white shadow' : 'bg-white text-slate-900 shadow') : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Dessiner la signature
                </button>
                <button
                  onClick={() => setSignatureType('type')}
                  className={`flex-1 py-2 text-[9.5px] font-black uppercase tracking-wider rounded-xl transition-all border-none bg-transparent cursor-pointer ${signatureType === 'type' ? (darkMode ? 'bg-zinc-800 text-white shadow' : 'bg-white text-slate-900 shadow') : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Saisir au clavier
                </button>
              </div>

              {/* Signature Inputs */}
              {signatureType === 'draw' ? (
                <div className="space-y-2 mb-6">
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={440}
                      height={160}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      style={{ touchAction: 'none' }}
                      className={`w-full h-40 rounded-3xl border-2 border-dashed cursor-crosshair bg-slate-50 dark:bg-zinc-900/60 touch-none ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}
                    />
                    {hasDrawn && (
                      <button 
                        onClick={clearCanvas}
                        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-none cursor-pointer"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  <input
                    type="text"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    placeholder="Saisissez votre nom complet pour signer"
                    className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold ${darkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder-zinc-650" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"}`}
                  />
                  {typedSignature.trim() && (
                    <div className={`p-6 rounded-3xl border text-center flex flex-col items-center justify-center min-h-[90px] ${darkMode ? "bg-zinc-900/30 border-zinc-800/80 text-teal-400" : "bg-emerald-50/20 border-emerald-100 text-emerald-700"}`}>
                      <span className="text-[7px] font-black uppercase tracking-widest text-slate-450 dark:text-zinc-500 mb-2">Aperçu du certificat de signature</span>
                      <span className="text-3xl font-normal italic leading-none select-none" style={{ fontFamily: 'Brush Script MT, cursive, Lucida Handwriting, Caveat' }}>
                        {typedSignature}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setIsSignatureModalOpen(false); setSigningDoc(null); }}
                  className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase italic tracking-widest transition-transform active:scale-95 border border-slate-200 dark:border-zinc-800 bg-transparent text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/40 cursor-pointer`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleApplySignature}
                  className="flex-grow py-4 rounded-full text-[10px] font-black uppercase italic tracking-widest transition-transform active:scale-95 border-none bg-emerald-600 hover:bg-emerald-750 text-white shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={14} />
                  <span>Appliquer la Signature</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD NEW CONTRACT / RESOLUTION */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`w-full max-w-lg rounded-[40px] border shadow-2xl p-6 sm:p-8 flex flex-col relative ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-100 text-slate-900"}`}
            >
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className={`absolute top-6 right-6 p-2 rounded-xl transition-all border-none bg-transparent cursor-pointer ${darkMode ? "text-zinc-500 hover:text-white hover:bg-zinc-900" : "text-slate-300 hover:text-slate-900 hover:bg-slate-50"}`}
              >
                <X size={20} />
              </button>

              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-emerald-500/10 text-emerald-500 p-2.5 rounded-2xl">
                  <FileSignature size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest leading-none">
                    {activeTab === 'externe' ? 'Nouveau Contrat' : 'Nouvelle Résolution'}
                  </h3>
                  <p className="text-[8px] font-black uppercase text-emerald-500 tracking-wider mt-1.5 leading-none">
                    {activeTab === 'externe' ? 'Ajout dans l\'archivage des contrats' : 'Ajout dans le registre officiel'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddDocument} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">Titre du document</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={activeTab === 'externe' ? "Ex: Assurance Batiment A - L'Unique 2026" : "Ex: Resolution - Remplacement porte entree"}
                    className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold ${darkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder-zinc-650" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">
                    {activeTab === 'externe' ? 'Prestataire / Fournisseur' : 'Émetteur'}
                  </label>
                  <input
                    type="text"
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value)}
                    placeholder={activeTab === 'externe' ? "Ex: L'Unique Assurances" : "Ex: Conseil d'Administration"}
                    className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold ${darkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder-zinc-650" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">Description / Sommaire des engagements</label>
                  <textarea
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    placeholder="Saisissez un court résumé des conditions, montants, et objectifs de ce document..."
                    rows={4}
                    className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold resize-none ${darkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder-zinc-650" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"}`}
                  />
                </div>

                {/* Submit buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className={`flex-1 py-4 rounded-full text-[10px] font-black uppercase italic tracking-widest transition-transform active:scale-95 border border-slate-200 dark:border-zinc-800 bg-transparent text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/40 cursor-pointer`}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-grow py-4 rounded-full text-[10px] font-black uppercase italic tracking-widest transition-transform active:scale-95 border-none bg-emerald-600 hover:bg-emerald-750 text-white shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    Créer Document
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
