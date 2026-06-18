import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, AlertTriangle, Loader2, PenTool, X,
  ShieldCheck, FileText, Check, Stamp, Pen, Type,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// ─── Signature Font Options (DocuSign-style) ─────────────────────────────────

const FONT_OPTIONS = [
  { family: 'cursive',              label: 'Classique',   gFontParam: null },
  { family: 'Great Vibes',          label: 'Great Vibes', gFontParam: 'Great+Vibes' },
  { family: 'Monsieur La Doulaise', label: 'La Doulaise', gFontParam: 'Monsieur+La+Doulaise' },
  { family: 'Alex Brush',           label: 'Alex Brush',  gFontParam: 'Alex+Brush' },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignatureRequestDoc {
  docId: string;
  docTitle: string;
  docSummary: string;
  companyName: string;
  companyId?: string;          // Workspace ID — used for Drive routing
  adminName: string;
  adminEmail?: string;
  createdAt: string;
  status: 'pending' | 'signed';
  adminSignatureDataUrl?: string;
  adminSignedDate?: string;
  requiresInitials?: boolean;  // true for real estate / promesse d'achat
}

type InputMode = 'draw' | 'type';

interface PublicSignaturePageProps {
  token: string;
}

// ─── Reusable canvas drawing hook ────────────────────────────────────────────

function useDrawingCanvas(placeholder: string) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const resetCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(placeholder, canvasRef.current.width / 2, canvasRef.current.height / 2);
    setHasDrawn(false);
  }, [placeholder]);

  useEffect(() => { resetCanvas(); }, [resetCanvas]);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!hasDrawn) { ctx.clearRect(0, 0, canvas.width, canvas.height); setHasDrawn(true); }
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const continueDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  return { canvasRef, hasDrawn, resetCanvas, startDraw, continueDraw, stopDraw };
}

// ─── Off-screen font renderer ─────────────────────────────────────────────────

async function renderTextToDataUrl(
  text: string,
  fontFamily: string,
  width: number,
  height: number,
  fontSize: number,
): Promise<string> {
  if (fontFamily !== 'cursive') {
    await document.fonts.load(`${fontSize}px '${fontFamily}'`);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#059669';
  ctx.font = `${fontSize}px '${fontFamily}', cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  return canvas.toDataURL('image/png');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicSignaturePage({ token }: PublicSignaturePageProps) {
  const [loading, setLoading] = useState(true);
  const [docData, setDocData] = useState<SignatureRequestDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [emailDelivered, setEmailDelivered] = useState<{ admin: boolean; client: boolean } | null>(null);
  const [driveUploadResult, setDriveUploadResult] = useState<{ success: boolean; webViewLink?: string } | null>(null);

  // Signer identity
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');

  // Initials (paraphes — every page)
  const [initialMode, setInitialMode] = useState<InputMode>('type');
  const [typedInitials, setTypedInitials] = useState('');
  const [selectedInitialFont, setSelectedInitialFont] = useState(0);
  const sigInitials = useDrawingCanvas('Paraphes ici');

  // Full signature (final page)
  const [sigMode, setSigMode] = useState<InputMode>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [selectedSigFont, setSelectedSigFont] = useState(0);
  const sigFull = useDrawingCanvas('Dessinez votre signature ici');

  useEffect(() => {
    // Load Google Fonts
    const families = FONT_OPTIONS.filter(f => f.gFontParam).map(f => f.gFontParam).join('|');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const b64Data = urlParams.get('d');
        if (b64Data) {
          try {
            const standardB64 = b64Data.replace(/-/g, '+').replace(/_/g, '/')
              + '=='.slice(0, (4 - b64Data.length % 4) % 4);
            const parsed = JSON.parse(decodeURIComponent(escape(atob(standardB64)))) as SignatureRequestDoc;
            setDocData(parsed);
            if (parsed.status === 'signed') setAlreadySigned(true);
            try {
              const snap = await getDoc(doc(db, 'pendingSignatures', token));
              if (snap.exists()) {
                const fsData = snap.data() as SignatureRequestDoc;
                if (fsData.adminSignatureDataUrl) setDocData({ ...parsed, adminSignatureDataUrl: fsData.adminSignatureDataUrl });
                if (fsData.status === 'signed') setAlreadySigned(true);
              }
            } catch {}
            setLoading(false);
            return;
          } catch {}
        }
        const snap = await getDoc(doc(db, 'pendingSignatures', token));
        if (!snap.exists()) {
          setError("Ce lien de signature est invalide ou a expiré. Veuillez contacter l'expéditeur.");
          setLoading(false);
          return;
        }
        const data = snap.data() as SignatureRequestDoc;
        setDocData(data);
        if (data.status === 'signed') setAlreadySigned(true);
      } catch {
        setError("Ce lien de signature est invalide ou a expiré. Veuillez contacter l'expéditeur.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // Auto-fill initials from signer name
  useEffect(() => {
    if (signerName.trim() && !typedInitials) {
      const parts = signerName.trim().split(' ');
      const initials = parts.map(p => p[0]?.toUpperCase() || '').join('');
      setTypedInitials(initials.slice(0, 3));
    }
  }, [signerName]);

  // ── Sign handler ──────────────────────────────────────────────────────────────

  const handleSign = async () => {
    if (!docData) return;
    if (!signerName.trim()) { alert("Veuillez saisir votre nom complet."); return; }

    const needsInitials = !!(initialMode === 'draw' ? sigInitials.hasDrawn : typedInitials.trim());
    const hasSignature = sigMode === 'draw' ? sigFull.hasDrawn : typedSignature.trim().length > 0;

    if (!hasSignature) {
      alert("Veuillez compléter votre signature complète avant de valider.");
      return;
    }

    setIsSigning(true);
    try {
      const todayStr = new Date().toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

      // Render initials to data URL
      let initialsDataUrl = '';
      if (initialMode === 'draw' && sigInitials.canvasRef.current && sigInitials.hasDrawn) {
        initialsDataUrl = sigInitials.canvasRef.current.toDataURL('image/png');
      } else if (initialMode === 'type' && typedInitials.trim()) {
        initialsDataUrl = await renderTextToDataUrl(
          typedInitials.trim(), FONT_OPTIONS[selectedInitialFont].family, 200, 60, 36
        );
      }

      // Render full signature to data URL
      let sigDataUrl = '';
      let typedSigDataUrl = '';
      if (sigMode === 'draw' && sigFull.canvasRef.current && sigFull.hasDrawn) {
        sigDataUrl = sigFull.canvasRef.current.toDataURL('image/png');
      } else if (sigMode === 'type' && typedSignature.trim()) {
        typedSigDataUrl = await renderTextToDataUrl(
          typedSignature.trim(), FONT_OPTIONS[selectedSigFont].family, 560, 100, 52
        );
      }

      const pdfBase64 = generateBipartitePDF(docData, {
        name: signerName,
        email: signerEmail,
        date: `${todayStr} \xE0 ${timeStr}`,
        sigMode,
        sigDataUrl,
        typedSig: typedSignature,
        typedSigDataUrl,
        initialsDataUrl,
        initialsText: typedInitials,
      });

      try {
        await setDoc(doc(db, 'pendingSignatures', token), {
          ...docData, status: 'signed',
          clientSignerName: signerName,
          clientSignerEmail: signerEmail,
          clientSignedDate: `${todayStr} \xE0 ${timeStr}`,
          clientSignatureType: sigMode,
          clientHasInitials: needsInitials,
          clientSignedAt: new Date().toISOString(),
        });
      } catch {}

      let emailResult = { admin: false, client: false };
      if (pdfBase64) {
        try {
          const resp = await fetch('/api/save-signed-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfBase64,
              adminEmail: docData.adminEmail || '',
              clientEmail: signerEmail,
              clientName: signerName,
              docTitle: docData.docTitle,
              companyName: docData.companyName,
              token,
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            emailResult = { admin: data.results?.emailAdmin === true, client: data.results?.emailClient === true };
          }
        } catch {}
      }

      // ── Google Drive upload — routes to the active workspace's Drive folder ──
      // Uses the companyId from the document to look up the in-memory OAuth token.
      // Works immediately when admin signs on the same session (same browser).
      // Gracefully skips (no crash) if the client is on a different device.
      let driveResult: { success: boolean; webViewLink?: string } = { success: false };
      if (pdfBase64 && docData.companyId) {
        try {
          const { uploadDocumentToDrive } = await import('../lib/driveService');
          const safeTitle = (docData.docTitle || 'document').replace(/[^a-z0-9\-_]/gi, '_').slice(0, 40);
          const dateStr = new Date().toISOString().split('T')[0];
          const fileName = `DocuLegal_${safeTitle}_${dateStr}_BIPARTITE.pdf`;
          driveResult = await uploadDocumentToDrive(docData.companyId, pdfBase64, fileName);
        } catch {
          // Drive upload failure is non-blocking — email delivery is the primary channel
        }
      }
      setDriveUploadResult(driveResult);

      setEmailDelivered(emailResult);
      setIsDone(true);
    } catch (e) {
      alert("Erreur lors de la signature. Veuillez réessayer.");
      console.error(e);
    } finally {
      setIsSigning(false);
    }
  };

  // ── PDF Generator — Bipartite with initials on every page ─────────────────────

  const generateBipartitePDF = (
    data: SignatureRequestDoc,
    client: {
      name: string; email: string; date: string;
      sigMode: string; sigDataUrl: string; typedSig: string; typedSigDataUrl?: string;
      initialsDataUrl?: string; initialsText?: string;
    }
  ): string | null => {
    try {
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = 210, H = 297, M = 18;
      const green: [number, number, number] = [5, 150, 105];
      const PAGE_CONTENT_BOTTOM = 248; // Y limit before footer zone
      const FOOTER_H = 12;
      const INITIAL_STAMP_W = 30, INITIAL_STAMP_H = 12;
      const INITIAL_STAMP_X = W - M - INITIAL_STAMP_W;
      const INITIAL_STAMP_Y = H - FOOTER_H - INITIAL_STAMP_H - 3;

      let pageNum = 1;

      // ── Helpers ──────────────────────────────────────────────────────────────

      const sparkle = (cx: number, cy: number, r: number) => {
        pdf.setFillColor(255, 255, 255);
        const pts: [number, number][] = [];
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI / 4) * i - Math.PI / 2;
          const rad = i % 2 === 0 ? r : r * 0.38;
          pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
        }
        pdf.moveTo(pts[0][0], pts[0][1]);
        pts.slice(1).forEach(([x, y]) => pdf.lineTo(x, y));
        pdf.fill();
      };

      /**
       * Stamp initials in bottom-right corner of current page.
       * Oblogatoire (required) for every page of real estate documents in Québec.
       */
      const stampInitials = () => {
        // Dotted border box
        pdf.setDrawColor(green[0], green[1], green[2]);
        pdf.setLineWidth(0.3);
        pdf.setLineDashPattern([1.5, 1], 0);
        pdf.roundedRect(INITIAL_STAMP_X, INITIAL_STAMP_Y, INITIAL_STAMP_W, INITIAL_STAMP_H, 1.5, 1.5, 'D');
        pdf.setLineDashPattern([], 0);

        if (client.initialsDataUrl) {
          try {
            pdf.addImage(client.initialsDataUrl, 'PNG',
              INITIAL_STAMP_X + 1, INITIAL_STAMP_Y + 1,
              INITIAL_STAMP_W - 2, INITIAL_STAMP_H - 3
            );
          } catch {
            // fallback to text
            pdf.setFont('Times', 'italic');
            pdf.setFontSize(9);
            pdf.setTextColor(green[0], green[1], green[2]);
            pdf.text(client.initialsText || '—',
              INITIAL_STAMP_X + INITIAL_STAMP_W / 2,
              INITIAL_STAMP_Y + 7,
              { align: 'center' }
            );
          }
        } else {
          // No initials provided — show blank line
          pdf.setDrawColor(180, 180, 180);
          pdf.setLineWidth(0.2);
          pdf.line(INITIAL_STAMP_X + 3, INITIAL_STAMP_Y + 8, INITIAL_STAMP_X + INITIAL_STAMP_W - 3, INITIAL_STAMP_Y + 8);
        }

        // "Paraphes" label + page number
        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(5.5);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Paraphes · p.${pageNum}`,
          INITIAL_STAMP_X + INITIAL_STAMP_W / 2,
          INITIAL_STAMP_Y + INITIAL_STAMP_H + 2,
          { align: 'center' }
        );
        pdf.setTextColor(30, 41, 59);
      };

      const addPageHeader = (isFirst: boolean) => {
        if (isFirst) {
          // Full decorative header on page 1
          pdf.setFillColor(...green);
          pdf.rect(0, 0, W, 35, 'F');
          sparkle(M, 17, 7);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('Helvetica', 'bold');
          pdf.setFontSize(13);
          pdf.text(data.companyName.toUpperCase(), M + 12, 14);
          pdf.setFont('Helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.text('DOCUMENT SIGNÉ BIPARTITE — DOCULEGAL (AUTOCOMPT)', M + 12, 20);
          pdf.text(`Réf: ${token.slice(0, 16).toUpperCase()}`, W - M, 14, { align: 'right' });
          pdf.text(`Date: ${new Date().toLocaleDateString('fr-CA')}`, W - M, 20, { align: 'right' });
          pdf.setFillColor(209, 250, 229);
          pdf.roundedRect(M + 12, 24, 50, 7, 2, 2, 'F');
          pdf.setTextColor(5, 150, 105);
          pdf.setFont('Helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.text('✓  DOCUMENT SIGNÉ PAR LES DEUX PARTIES', M + 16, 28.5);
        } else {
          // Slim continuation header for subsequent pages
          pdf.setFillColor(...green);
          pdf.rect(0, 0, W, 10, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('Helvetica', 'normal');
          pdf.setFontSize(6.5);
          pdf.text(`${data.companyName.toUpperCase()} · ${data.docTitle} · Page ${pageNum}`, M, 6.5);
          pdf.text(`Réf: ${token.slice(0, 16).toUpperCase()}`, W - M, 6.5, { align: 'right' });
        }
      };

      const addPageFooter = () => {
        pdf.setFillColor(green[0], green[1], green[2]);
        pdf.rect(0, H - FOOTER_H, W, FOOTER_H, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.text('Document numérique certifié — DocuLegal by AutoCompt Canada', W / 2, H - FOOTER_H + 5, { align: 'center' });
      };

      // ── Page 1 — Title + Document Content ────────────────────────────────────

      addPageHeader(true);

      // Title block
      let y = 50;
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(data.docTitle, M, y);
      y += 7;
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(M, y, W - M, y);
      y += 8;

      // Document content — with automatic page breaks + initials stamp on each page
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      const contentLines = pdf.splitTextToSize(data.docSummary, W - M * 2);

      for (let i = 0; i < contentLines.length; i++) {
        if (y > PAGE_CONTENT_BOTTOM) {
          // Stamp initials on this page before turning it
          stampInitials();
          addPageFooter();
          pdf.addPage();
          pageNum++;
          addPageHeader(false);
          y = 18;
        }
        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(71, 85, 105);
        pdf.text(contentLines[i], M, y);
        y += 6;
      }

      // ── Signature Block ────────────────────────────────────────────────────────
      // Needs ~85mm height. Add new page if insufficient room.
      const SIG_BLOCK_H = 85;
      if (y + SIG_BLOCK_H > PAGE_CONTENT_BOTTOM) {
        stampInitials();
        addPageFooter();
        pdf.addPage();
        pageNum++;
        addPageHeader(false);
        y = 18;
      }

      y += 6;
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(M, y, W - M, y);
      y += 8;

      pdf.setTextColor(30, 41, 59);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('SIGNATURES ÉLECTRONIQUES DES DEUX PARTIES', M, y);
      y += 8;

      // Initials confirmation line (above signature boxes)
      if (client.initialsDataUrl) {
        pdf.setFillColor(240, 253, 244);
        pdf.setDrawColor(167, 243, 208);
        pdf.roundedRect(M, y, W - M * 2, 8, 2, 2, 'FD');
        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(5, 150, 105);
        pdf.text(
          `✓ Paraphes apposés sur chaque page par: ${client.name}  ·  Date: ${client.date}`,
          W / 2, y + 5, { align: 'center' }
        );
        y += 12;
      }

      // Admin box (left)
      const boxH = 52;
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(M, y, 82, boxH, 4, 4, 'FD');
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(green[0], green[1], green[2]);
      pdf.text('PARTIE 1 — ADMINISTRATEUR', M + 4, y + 7);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Signataire: ${data.adminName}`, M + 4, y + 14);
      pdf.text(`Entreprise: ${data.companyName}`, M + 4, y + 20);
      pdf.text(`Date: ${data.adminSignedDate || new Date().toLocaleDateString('fr-CA')}`, M + 4, y + 26);
      if (data.adminSignatureDataUrl) {
        try {
          pdf.addImage(data.adminSignatureDataUrl, 'PNG', M + 4, y + 28, 74, 20);
        } catch {
          pdf.setFont('Times', 'italic');
          pdf.setFontSize(16);
          pdf.setTextColor(green[0], green[1], green[2]);
          pdf.text(data.adminName, M + 41, y + 40, { align: 'center' });
        }
      } else {
        pdf.setFont('Times', 'italic');
        pdf.setFontSize(16);
        pdf.setTextColor(green[0], green[1], green[2]);
        pdf.text(data.adminName, M + 41, y + 40, { align: 'center' });
      }

      // Client box (right)
      const cx = W / 2 + 4;
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(cx, y, 82, boxH, 4, 4, 'FD');
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(green[0], green[1], green[2]);
      pdf.text('PARTIE 2 — SIGNATAIRE CLIENT', cx + 4, y + 7);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Signataire: ${client.name}`, cx + 4, y + 14);
      if (client.email) pdf.text(`Courriel: ${client.email}`, cx + 4, y + 20);
      pdf.text(`Date: ${client.date}`, cx + 4, y + 26);

      // Client signature visual
      if (client.sigMode === 'draw' && client.sigDataUrl) {
        try {
          pdf.addImage(client.sigDataUrl, 'PNG', cx + 4, y + 28, 74, 20);
        } catch {
          pdf.setFont('Times', 'italic'); pdf.setFontSize(16);
          pdf.setTextColor(green[0], green[1], green[2]);
          pdf.text(client.name, cx + 41, y + 40, { align: 'center' });
        }
      } else if (client.typedSigDataUrl) {
        try {
          pdf.addImage(client.typedSigDataUrl, 'PNG', cx + 4, y + 28, 74, 20);
        } catch {
          pdf.setFont('Times', 'italic'); pdf.setFontSize(16);
          pdf.setTextColor(green[0], green[1], green[2]);
          pdf.text(client.typedSig || client.name, cx + 41, y + 40, { align: 'center' });
        }
      } else {
        pdf.setFont('Times', 'italic'); pdf.setFontSize(16);
        pdf.setTextColor(green[0], green[1], green[2]);
        pdf.text(client.typedSig || client.name, cx + 41, y + 40, { align: 'center' });
      }

      y += boxH + 6;

      // Certification seal
      const sealH = 32;
      if (y + sealH + 18 > PAGE_CONTENT_BOTTOM) {
        stampInitials();
        addPageFooter();
        pdf.addPage();
        pageNum++;
        addPageHeader(false);
        y = 18;
      }

      pdf.setDrawColor(green[0], green[1], green[2]);
      pdf.setLineWidth(0.4);
      pdf.setLineDashPattern([2, 1], 0);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(M, y, W - M * 2, sealH, 'FD');
      pdf.setLineDashPattern([], 0);
      pdf.setFillColor(green[0], green[1], green[2]);
      sparkle(M + 8, y + 8, 4);
      pdf.setTextColor(green[0], green[1], green[2]);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.text('CERTIFICATION DOCULEGAL — DOCUMENT BIPARTITE VALIDÉ', M + 14, y + 8);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text('Ce document a été signé électroniquement par les deux parties via DocuLegal, une solution AutoCompt.', M + 4, y + 15);
      pdf.text("Il constitue une preuve légale d'engagement enregistrée dans les registres sécurisés d'AutoCompt.", M + 4, y + 20);
      pdf.text(`Paraphes sur ${pageNum} page(s) · Signature bipartite · Conforme aux exigences immobilières du Québec`, M + 4, y + 25);
      pdf.setFont('Courier', 'bold');
      pdf.setFontSize(6.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Token: ${token.slice(0, 32).toUpperCase()}`, M + 4, y + 30);

      // Stamp initials on LAST page and add footer
      stampInitials();
      addPageFooter();

      pdf.save('DocuLegal_Bipartite_Signé.pdf');

      try { return pdf.output('datauristring').split(',')[1]; }
      catch { return null; }
    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr);
      return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Rendering states
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
      <div className="text-center space-y-4">
        <Loader2 className="animate-spin text-emerald-500 mx-auto" size={36} />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Chargement du document...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-6">
      <div className="max-w-md text-center space-y-4">
        <AlertTriangle className="text-rose-500 mx-auto" size={40} />
        <h1 className="text-lg font-black uppercase italic tracking-tight text-slate-900">Lien Invalide</h1>
        <p className="text-sm text-slate-500 font-medium">{error}</p>
      </div>
    </div>
  );

  if (alreadySigned || isDone) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-6">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="text-emerald-600" size={40} />
        </div>
        <div>
          <h1 className="text-xl font-black uppercase italic tracking-tight text-slate-900">
            {isDone ? 'Document Signé avec Succès !' : 'Ce document a déjà été signé.'}
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-2">
            {isDone
              ? 'Le PDF certifié bipartite (paraphes + signature) a été téléchargé.'
              : "Ce lien a déjà été utilisé. Contactez l'expéditeur si nécessaire."}
          </p>
        </div>
        {isDone && (
          <div className="space-y-3">
            {/* PDF download confirmation */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-700 font-medium">
              📄 PDF bipartite certifié téléchargé · Initiales sur chaque page · Signature finale
            </div>

            {/* Google Drive status */}
            {driveUploadResult !== null && (
              <div className={`p-4 rounded-2xl text-sm border ${
                driveUploadResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <p className="font-black text-[9px] uppercase tracking-widest mb-1">
                  🗂️ Google Drive
                </p>
                {driveUploadResult.success ? (
                  <div className="flex items-center gap-2">
                    <span>✅</span>
                    <div>
                      <span className="font-semibold">Sauvegardé dans AutoCompt — DocuLegal</span>
                      {driveUploadResult.webViewLink && (
                        <a href={driveUploadResult.webViewLink} target="_blank" rel="noopener noreferrer"
                          className="ml-2 text-emerald-600 underline text-xs">
                          Ouvrir dans Drive ↗
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <span>⚠️ Upload Drive non effectué — le PDF a été livré par courriel.</span>
                )}
              </div>
            )}

            {/* Email delivery status */}
            {emailDelivered && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-sm space-y-1">
                <p className="font-black text-indigo-700 text-[9px] uppercase tracking-widest mb-2">📧 Livraison par courriel</p>
                <div className="flex items-center gap-2 text-indigo-700">
                  <span>{emailDelivered.admin ? '✅' : '⚠️'}</span>
                  <span className="text-sm font-medium">
                    {emailDelivered.admin ? `Copie envoyée à ${docData?.companyName}` : 'Email admin non envoyé — vérifiez RESEND_API_KEY'}
                  </span>
                </div>
                {signerEmail && (
                  <div className="flex items-center gap-2 text-indigo-700">
                    <span>{emailDelivered.client ? '✅' : '⚠️'}</span>
                    <span className="text-sm font-medium">
                      {emailDelivered.client ? `Copie envoyée à ${signerEmail}` : 'Email signataire non envoyé'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">
          <ShieldCheck size={12} /><span>Certifié par DocuLegal · AutoCompt</span>
        </div>
      </motion.div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Signature Form — main flow
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-xs">✦</span>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">DocuLegal · AutoCompt</p>
              <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Signature Électronique</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <ShieldCheck size={10} /><span>Connexion sécurisée</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-5">

        {/* Document card */}
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0"><FileText size={22} /></div>
            <div>
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">
                {docData?.companyName} · Demande de signature
              </p>
              <h1 className="font-black uppercase italic tracking-tight text-slate-900 text-base">{docData?.docTitle}</h1>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-600 font-medium leading-relaxed">
            {docData?.docSummary}
          </div>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            Envoyé par {docData?.adminName} · {docData?.companyName}
          </p>
        </div>

        {/* Signer identity */}
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500">1</div>
            <h2 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Votre Identité</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Nom complet *</label>
              <input type="text" value={signerName} onChange={e => setSignerName(e.target.value)}
                placeholder="Jean Tremblay"
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50" />
            </div>
            <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Courriel (optionnel)</label>
              <input type="email" value={signerEmail} onChange={e => setSignerEmail(e.target.value)}
                placeholder="jean@example.com"
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50" />
            </div>
          </div>
        </div>

        {/* ── SECTION 2: INITIALES ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-[24px] border-2 border-amber-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
                <Stamp size={12} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Initiales — Apposées sur chaque page
                </h2>
              </div>
            </div>
            <span className="text-[8px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 tracking-wider">
              Obligatoire · Immobilier QC
            </span>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl">
            <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
              📋 Pour les promesses d'achat et baux au Québec, vos initiales seront automatiquement apposées dans le coin inférieur droit de <strong>chaque page</strong> du document.
            </p>
          </div>

          {/* Draw / Type toggle for initials */}
          <div className="flex gap-2">
            {(['type', 'draw'] as InputMode[]).map(m => (
              <button key={m} onClick={() => setInitialMode(m)}
                className={`flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                  initialMode === m
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                {m === 'type' ? <><Type size={11} /> Saisir</> : <><Pen size={11} /> Dessiner</>}
              </button>
            ))}
          </div>

          {initialMode === 'type' ? (
            <div className="space-y-3">
              <div>
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Vos initiales (ex: J.T. ou JT)
                </label>
                <input type="text" maxLength={5} value={typedInitials}
                  onChange={e => setTypedInitials(e.target.value.toUpperCase())}
                  placeholder="J.T."
                  className="w-32 p-3 rounded-xl border border-slate-200 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-amber-400 bg-slate-50 uppercase tracking-widest" />
              </div>
              {typedInitials.trim() && (
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Font selector (compact chips for initials) */}
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Style des initiales</p>
                    <div className="grid grid-cols-2 gap-2">
                      {FONT_OPTIONS.map((font, idx) => (
                        <button key={font.family} onClick={() => setSelectedInitialFont(idx)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all ${
                            selectedInitialFont === idx
                              ? 'border-amber-400 bg-amber-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}>
                          <span style={{ fontFamily: `'${font.family}', cursive`, fontSize: '1.3rem', color: selectedInitialFont === idx ? '#d97706' : '#475569' }}>
                            {typedInitials}
                          </span>
                          <div className="flex items-center gap-1 ml-2">
                            <span className="text-[7px] font-black uppercase text-slate-400">{font.label}</span>
                            {selectedInitialFont === idx && <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center"><Check size={8} className="text-white" /></div>}
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Stamp preview */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="border-2 border-dashed border-amber-300 rounded-xl px-5 py-2 bg-amber-50 text-center">
                        <span style={{ fontFamily: `'${FONT_OPTIONS[selectedInitialFont].family}', cursive`, fontSize: '1.5rem', color: '#059669' }}>
                          {typedInitials}
                        </span>
                        <p className="text-[7px] text-amber-600 font-black uppercase tracking-wider mt-0.5">Paraphes · p.1</p>
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium">Aperçu de l'estampille qui apparaîtra en bas de chaque page</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Dessinez vos initiales</label>
              <canvas
                ref={sigInitials.canvasRef}
                width={300} height={90}
                className="w-full max-w-xs border border-slate-200 rounded-2xl bg-slate-50 cursor-crosshair touch-none"
                onMouseDown={sigInitials.startDraw}
                onMouseMove={sigInitials.continueDraw}
                onMouseUp={sigInitials.stopDraw}
                onMouseLeave={sigInitials.stopDraw}
                onTouchStart={sigInitials.startDraw}
                onTouchMove={sigInitials.continueDraw}
                onTouchEnd={sigInitials.stopDraw}
              />
              <button onClick={sigInitials.resetCanvas} className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 flex items-center gap-1">
                <X size={10} /> Recommencer
              </button>
            </div>
          )}
        </div>

        {/* ── SECTION 3: SIGNATURE COMPLÈTE ────────────────────────────────────── */}
        <div className="bg-white rounded-[24px] border-2 border-emerald-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
              <PenTool size={12} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Signature Complète — Page finale
              </h2>
            </div>
          </div>

          {/* Draw / Type toggle */}
          <div className="flex gap-2">
            {(['draw', 'type'] as InputMode[]).map(m => (
              <button key={m} onClick={() => { setSigMode(m); sigFull.resetCanvas(); }}
                className={`flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                  sigMode === m
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                {m === 'draw' ? <><Pen size={11} /> Dessiner</> : <><Type size={11} /> Saisir au clavier</>}
              </button>
            ))}
          </div>

          {sigMode === 'draw' ? (
            <div className="space-y-2">
              <canvas
                ref={sigFull.canvasRef}
                width={560} height={140}
                className="w-full border border-slate-200 rounded-2xl bg-slate-50 cursor-crosshair touch-none"
                onMouseDown={sigFull.startDraw}
                onMouseMove={sigFull.continueDraw}
                onMouseUp={sigFull.stopDraw}
                onMouseLeave={sigFull.stopDraw}
                onTouchStart={sigFull.startDraw}
                onTouchMove={sigFull.continueDraw}
                onTouchEnd={sigFull.stopDraw}
              />
              <button onClick={sigFull.resetCanvas} className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 flex items-center gap-1">
                <X size={10} /> Recommencer
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input type="text" value={typedSignature} onChange={e => setTypedSignature(e.target.value)}
                placeholder="Saisissez votre nom complet"
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50" />
              {typedSignature.trim() && (
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Choisissez votre style de signature</p>
                    <div className="grid grid-cols-1 gap-2">
                      {FONT_OPTIONS.map((font, idx) => (
                        <button key={font.family} onClick={() => setSelectedSigFont(idx)}
                          className={`flex items-center justify-between px-5 py-3.5 rounded-2xl border-2 transition-all ${
                            selectedSigFont === idx
                              ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}>
                          <span style={{ fontFamily: `'${font.family}', cursive`, fontSize: '1.5rem', color: selectedSigFont === idx ? '#059669' : '#334155' }}>
                            {typedSignature}
                          </span>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">{font.label}</span>
                            {selectedSigFont === idx && <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={10} className="text-white" /></div>}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl text-center mt-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Aperçu de votre signature</p>
                      <span style={{ fontFamily: `'${FONT_OPTIONS[selectedSigFont].family}', cursive`, fontSize: '2rem', color: '#059669', display: 'block', lineHeight: '1.2' }}>
                        {typedSignature}
                      </span>
                      <p className="text-[8px] text-slate-400 mt-2 font-medium">
                        Style: <strong>{FONT_OPTIONS[selectedSigFont].label}</strong> · Apparaîtra ainsi dans le PDF
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          )}
        </div>

        {/* Summary before signing */}
        {(sigInitials.hasDrawn || typedInitials.trim()) && (sigFull.hasDrawn || typedSignature.trim()) && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 mb-2">✅ Prêt à signer</p>
            <div className="flex gap-6 text-[10px] text-emerald-700 font-medium">
              <span>✦ Initiales: <strong>{typedInitials || 'Dessinées'}</strong> · Chaque page</span>
              <span>✦ Signature complète · Page finale</span>
            </div>
          </motion.div>
        )}

        {/* Legal notice */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 font-medium space-y-1">
          <p className="font-black uppercase tracking-wider text-[9px]">📋 Avis légal</p>
          <p>En cliquant sur "Signer et Valider", vous confirmez avoir lu et accepté les termes du document ci-dessus. La signature électronique bipartite (initiales + signature) est juridiquement contraignante conformément aux lois applicables au Québec.</p>
        </div>

        {/* Sign button */}
        <button
          onClick={handleSign}
          disabled={isSigning || !signerName.trim()}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.99] shadow-lg shadow-emerald-600/20"
        >
          {isSigning
            ? <><Loader2 className="animate-spin" size={18} /> Génération du PDF certifié...</>
            : <><PenTool size={18} /> Signer et Valider le Document</>
          }
        </button>

        <div className="flex items-center justify-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest pb-6">
          <ShieldCheck size={12} />
          <span>Certifié par DocuLegal · AutoCompt Canada</span>
        </div>
      </main>
    </div>
  );
}
