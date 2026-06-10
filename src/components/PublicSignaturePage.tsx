import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Loader2, PenTool, X, ShieldCheck, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface SignatureRequestDoc {
  docId: string;
  docTitle: string;
  docSummary: string;
  companyName: string;
  adminName: string;
  adminEmail?: string;
  createdAt: string;
  status: 'pending' | 'signed';
  adminSignatureDataUrl?: string;
  adminSignedDate?: string;
}

interface PublicSignaturePageProps {
  token: string;
}

export default function PublicSignaturePage({ token }: PublicSignaturePageProps) {
  const [loading, setLoading] = useState(true);
  const [docData, setDocData] = useState<SignatureRequestDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);

  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [emailDelivered, setEmailDelivered] = useState<{ admin: boolean; client: boolean } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // PRIMARY: read data embedded in URL (?d=base64) — no auth required
        const urlParams = new URLSearchParams(window.location.search);
        const b64Data = urlParams.get('d');

        if (b64Data) {
          try {
            // Restore URL-safe base64 back to standard base64
            const standardB64 = b64Data
              .replace(/-/g, '+')
              .replace(/_/g, '/')
              + '=='.slice(0, (4 - b64Data.length % 4) % 4);

            const parsed = JSON.parse(decodeURIComponent(escape(atob(standardB64)))) as SignatureRequestDoc;
            setDocData(parsed);
            if (parsed.status === 'signed') setAlreadySigned(true);

            // Try to enrich with admin signature image from Firestore (non-blocking)
            try {
              const docRef = doc(db, 'pendingSignatures', token);
              const snap = await getDoc(docRef);
              if (snap.exists()) {
                const fsData = snap.data() as SignatureRequestDoc;
                if (fsData.adminSignatureDataUrl) {
                  setDocData({ ...parsed, adminSignatureDataUrl: fsData.adminSignatureDataUrl });
                }
                if (fsData.status === 'signed') setAlreadySigned(true);
              }
            } catch {
              // Firestore enrichment is optional — URL data is sufficient
            }

            setLoading(false);
            return;
          } catch {
            // b64 parsing failed, fall through to Firestore
          }
        }


        // FALLBACK: try Firestore (requires auth rules allowing public read)
        const docRef = doc(db, 'pendingSignatures', token);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          setError("Ce lien de signature est invalide ou a expiré. Veuillez contacter l'expéditeur.");
          setLoading(false);
          return;
        }
        const data = snap.data() as SignatureRequestDoc;
        setDocData(data);
        if (data.status === 'signed') setAlreadySigned(true);
      } catch (e) {
        setError("Ce lien de signature est invalide ou a expiré. Veuillez contacter l'expéditeur.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);


  useEffect(() => {
    if (!canvasRef.current || signatureType !== 'draw') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dessinez votre signature ici', canvas.width / 2, canvas.height / 2);
  }, [signatureType]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!hasDrawn) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(true);
    }
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const drawLine = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dessinez votre signature ici', canvasRef.current.width / 2, canvasRef.current.height / 2);
    setHasDrawn(false);
  };

  const handleSign = async () => {
    if (!docData) return;
    if (!signerName.trim()) {
      alert("Veuillez saisir votre nom complet pour valider la signature.");
      return;
    }
    if (signatureType === 'draw' && !hasDrawn) {
      alert("Veuillez dessiner votre signature avant de valider.");
      return;
    }
    if (signatureType === 'type' && !typedSignature.trim()) {
      alert("Veuillez saisir votre nom dans le champ de signature.");
      return;
    }

    setIsSigning(true);
    try {
      const todayStr = new Date().toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

      let clientSigDataUrl = '';
      if (signatureType === 'draw' && canvasRef.current) {
        clientSigDataUrl = canvasRef.current.toDataURL('image/png');
      }

      // Generate the final certified PDF with both signatures (returns base64 too)
      const pdfBase64 = generateBipartitePDF(docData, {
        name: signerName,
        email: signerEmail,
        date: `${todayStr} \xE0 ${timeStr}`,
        signatureType,
        sigDataUrl: clientSigDataUrl,
        typedSig: typedSignature,
      });

      // Try to save to Firestore (non-blocking, for audit trail)
      try {
        await setDoc(doc(db, 'pendingSignatures', token), {
          ...docData,
          status: 'signed',
          clientSignerName: signerName,
          clientSignerEmail: signerEmail,
          clientSignedDate: `${todayStr} \xE0 ${timeStr}`,
          clientSignatureType: signatureType,
          clientSignedAt: new Date().toISOString(),
        });
      } catch {
        // Firestore write may fail if auth rules block it — email delivery is primary
      }

      // Send PDF to both parties via server (email + Drive when configured)
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
            emailResult = {
              admin: data.results?.emailAdmin === true,
              client: data.results?.emailClient === true,
            };
          }
        } catch {
          // Server may not be running in production static — PDF download is the fallback
        }
      }

      setEmailDelivered(emailResult);
      setIsDone(true);
    } catch (e) {
      alert("Erreur lors de la signature. Veuillez r\xE9essayer.");
    } finally {
      setIsSigning(false);
    }
  };


  // Returns base64 string of PDF for server delivery (also triggers local download)
  const generateBipartitePDF = (data: SignatureRequestDoc, client: {
    name: string; email: string; date: string;
    signatureType: string; sigDataUrl: string; typedSig: string;
  }): string | null => {
    try {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 18;
    const green: [number, number, number] = [5, 150, 105];

    // Draw sparkle logo helper
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
      pdf.closePath();
      pdf.fill();
    };

    // Header
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

    // Status badge
    pdf.setFillColor(209, 250, 229);
    pdf.roundedRect(M + 12, 24, 50, 7, 2, 2, 'F');
    pdf.setTextColor(5, 150, 105);
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('✓  DOCUMENT SIGNÉ PAR LES DEUX PARTIES', M + 16, 28.5);

    // Document title
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(data.docTitle, M, 50);

    // Separator
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);
    pdf.line(M, 55, W - M, 55);

    // Summary
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(71, 85, 105);
    const lines = pdf.splitTextToSize(data.docSummary, W - M * 2);
    pdf.text(lines, M, 63);

    // Signatures block
    const sigY = 140;
    pdf.setDrawColor(226, 232, 240);
    pdf.line(M, sigY - 5, W - M, sigY - 5);

    pdf.setTextColor(30, 41, 59);
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('SIGNATURES ÉLECTRONIQUES DES DEUX PARTIES', M, sigY + 2);

    // Admin signature box (left)
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(M, sigY + 8, 82, 50, 4, 4, 'FD');
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(green[0], green[1], green[2]);
    pdf.text('PARTIE 1 — ADMINISTRATEUR', M + 4, sigY + 15);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(`Signataire: ${data.adminName}`, M + 4, sigY + 22);
    pdf.text(`Entreprise: ${data.companyName}`, M + 4, sigY + 28);
    pdf.text(`Date: ${data.adminSignedDate || new Date().toLocaleDateString('fr-CA')}`, M + 4, sigY + 34);
    // Admin signature visual
    if (data.adminSignatureDataUrl) {
      try {
        pdf.addImage(data.adminSignatureDataUrl, 'PNG', M + 4, sigY + 36, 74, 18);
      } catch {
        pdf.setFont('Times', 'italic');
        pdf.setFontSize(16);
        pdf.setTextColor(green[0], green[1], green[2]);
        pdf.text(data.adminName, M + 41, sigY + 46, { align: 'center' });
      }
    } else {
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(16);
      pdf.setTextColor(green[0], green[1], green[2]);
      pdf.text(data.adminName, M + 41, sigY + 46, { align: 'center' });
    }

    // Client signature box (right)
    const cx = W / 2 + 4;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(cx, sigY + 8, 82, 50, 4, 4, 'FD');
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(green[0], green[1], green[2]);
    pdf.text('PARTIE 2 — SIGNATAIRE CLIENT', cx + 4, sigY + 15);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(`Signataire: ${client.name}`, cx + 4, sigY + 22);
    if (client.email) pdf.text(`Courriel: ${client.email}`, cx + 4, sigY + 28);
    pdf.text(`Date: ${client.date}`, cx + 4, sigY + 34);
    // Client signature visual
    if (client.signatureType === 'draw' && client.sigDataUrl) {
      try {
        pdf.addImage(client.sigDataUrl, 'PNG', cx + 4, sigY + 36, 74, 18);
      } catch {
        pdf.setFont('Times', 'italic');
        pdf.setFontSize(16);
        pdf.setTextColor(green[0], green[1], green[2]);
        pdf.text(client.name, cx + 41, sigY + 46, { align: 'center' });
      }
    } else {
      pdf.setFont('Times', 'italic');
      pdf.setFontSize(16);
      pdf.setTextColor(green[0], green[1], green[2]);
      pdf.text(client.typedSig || client.name, cx + 41, sigY + 46, { align: 'center' });
    }

    // Seal
    const sealY = H - 58;
    pdf.setDrawColor(green[0], green[1], green[2]);
    pdf.setLineWidth(0.4);
    pdf.setLineDashPattern([2, 1], 0);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(M, sealY, W - M * 2, 32, 'FD');
    pdf.setLineDashPattern([], 0);
    pdf.setFillColor(green[0], green[1], green[2]);
    sparkle(M + 8, sealY + 8, 4);
    pdf.setTextColor(green[0], green[1], green[2]);
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.text('CERTIFICATION DOCULEGAL — DOCUMENT BIPARTITE VALIDÉ', M + 14, sealY + 8);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text('Ce document a été signé électroniquement par les deux parties via DocuLegal, une solution AutoCompt.', M + 4, sealY + 15);
    pdf.text('Il constitue une preuve légale d\'engagement enregistrée dans les registres sécurisés d\'AutoCompt.', M + 4, sealY + 20);
    const hashStr = `Token: ${token.slice(0, 32).toUpperCase()}`;
    pdf.setFont('Courier', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(hashStr, M + 4, sealY + 27);

    // Footer
    pdf.setFillColor(green[0], green[1], green[2]);
    pdf.rect(0, H - 12, W, 12, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.text('Document numérique certifié — DocuLegal by AutoCompt Canada', W / 2, H - 6.5, { align: 'center' });

    pdf.save(`DocuLegal_Bipartite_Sign\xE9.pdf`);

    // Return base64 for server-side email delivery
    try {
      return pdf.output('datauristring').split(',')[1];
    } catch {
      return null;
    }
    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr);
      return null;
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-emerald-500 mx-auto" size={36} />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Chargement du document...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-6">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="text-rose-500 mx-auto" size={40} />
          <h1 className="text-lg font-black uppercase italic tracking-tight text-slate-900">Lien Invalide</h1>
          <p className="text-sm text-slate-500 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  // ── Already signed ──
  if (alreadySigned || isDone) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="text-emerald-600" size={40} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tight text-slate-900">
              {isDone ? 'Document Signé avec Succès !' : 'Ce document a déjà été signé.'}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-2">
              {isDone
                ? 'Le PDF certifié bipartite a été téléchargé. Vous pouvez fermer cette fenêtre.'
                : 'Ce lien de signature a déjà été utilisé. Veuillez contacter l\'expéditeur si vous avez des questions.'}
            </p>
          </div>
          {isDone && (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-700 font-medium">
                📄 Le PDF bipartite certifié a été téléchargé sur votre appareil.
              </div>
              {emailDelivered && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-sm space-y-1">
                  <p className="font-black text-indigo-700 text-[9px] uppercase tracking-widest mb-2">📧 Livraison par courriel</p>
                  <div className="flex items-center gap-2 text-indigo-700">
                    <span>{emailDelivered.admin ? '✅' : '⚠️'}</span>
                    <span className="text-sm font-medium">
                      {emailDelivered.admin
                        ? `Copie envoyée à l'administrateur (${docData?.companyName})`
                        : "Email admin non envoyé — vérifiez la configuration RESEND_API_KEY"}
                    </span>
                  </div>
                  {signerEmail && (
                    <div className="flex items-center gap-2 text-indigo-700">
                      <span>{emailDelivered.client ? '✅' : '⚠️'}</span>
                      <span className="text-sm font-medium">
                        {emailDelivered.client
                          ? `Copie envoyée à ${signerEmail}`
                          : 'Email signataire non envoyé'}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500">
                Le document a été archivé dans le registre sécurisé de {docData?.companyName}.
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <ShieldCheck size={12} />
            <span>Certifié par DocuLegal · AutoCompt</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Signature form ──
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
            <ShieldCheck size={10} />
            <span>Connexion sécurisée</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Document card */}
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <FileText size={22} />
            </div>
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
          <h2 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Votre Identité</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Nom complet *</label>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Jean Tremblay"
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Courriel (optionnel)</label>
              <input
                type="email"
                value={signerEmail}
                onChange={e => setSignerEmail(e.target.value)}
                placeholder="jean@example.com"
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Signature pad */}
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Votre Signature</h2>
          <div className="flex gap-2">
            {(['draw', 'type'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setSignatureType(t); setHasDrawn(false); }}
                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                  signatureType === t
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {t === 'draw' ? '✏️ Dessiner' : '⌨️ Saisir'}
              </button>
            ))}
          </div>

          {signatureType === 'draw' ? (
            <div className="space-y-2">
              <canvas
                ref={canvasRef}
                width={560}
                height={140}
                className="w-full border border-slate-200 rounded-2xl bg-slate-50 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={drawLine}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <button onClick={clearCanvas} className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 flex items-center gap-1">
                <X size={10} /> Recommencer
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={typedSignature}
                onChange={e => setTypedSignature(e.target.value)}
                placeholder="Saisissez votre nom complet"
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              />
              {typedSignature.trim() && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="font-[cursive] italic text-2xl text-emerald-600">{typedSignature}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legal notice */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 font-medium space-y-1">
          <p className="font-black uppercase tracking-wider text-[9px]">📋 Avis légal</p>
          <p>En cliquant sur "Signer et Valider", vous confirmez avoir lu et accepté les termes du document ci-dessus. Cette signature électronique est juridiquement contraignante conformément aux lois applicables au Québec.</p>
        </div>

        {/* Sign button */}
        <button
          onClick={handleSign}
          disabled={isSigning || !signerName.trim()}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.99]"
        >
          {isSigning ? (
            <><Loader2 className="animate-spin" size={18} /> Enregistrement en cours...</>
          ) : (
            <><PenTool size={18} /> Signer et Valider le Document</>
          )}
        </button>

        <div className="flex items-center justify-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest pb-6">
          <ShieldCheck size={12} />
          <span>Certifié par DocuLegal · AutoCompt Canada</span>
        </div>
      </main>
    </div>
  );
}
