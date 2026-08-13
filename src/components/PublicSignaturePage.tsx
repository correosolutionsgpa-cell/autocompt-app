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
  ownerId?: string;            // Company owner's uid — Drive is scoped to this
  adminName: string;
  adminEmail?: string;
  createdAt: string;
  status: 'pending' | 'signed';
  adminSignatureDataUrl?: string;
  adminSignedDate?: string;
  requiresInitials?: boolean;  // true for real estate / promesse d'achat
  customDocUrl?: string;       // Storage URL of a document generated from the admin's own Word template
  // DocuLegal PDF-import fields
  pdfStorageUrl?: string;      // Firebase Storage URL for the original PDF
  signatureFields?: Array<{    // Placed signature zones
    id: string;
    page: number;
    type: 'signature' | 'initials' | 'date' | 'name';
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
    required: boolean;
    label: string;
  }>;
  // Real multi-party document metadata (2+ named signers, none of them
  // "the account") — present only on documents created after 2026-08-12.
  // When set, the final certified PDF is compiled server-side once every
  // one of these has a 'signed' pendingSignatures doc, instead of this
  // signer generating their own incomplete 2-party PDF locally.
  signerIndex?: number;
  totalSigners?: number;
  allSigners?: Array<{ name: string; email: string }>;
}

type InputMode = 'draw' | 'type';

// Race a promise against a timeout instead of letting a slow/hung network
// call (email delivery, Drive upload) spin the "signing" state forever. The
// signature itself is already written to Firestore before either of these
// run, so a timeout here just means "best-effort delivery didn't confirm in
// time" — never lost data. Found 2026-08-12: a real mobile signer got stuck
// on an infinite spinner after drawing their signature.
function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(onTimeout), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); })
      .catch(() => { clearTimeout(timer); resolve(onTimeout); });
  });
}

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

  // The canvas's internal drawing buffer (width/height attributes, e.g.
  // 560x140) doesn't always match its on-screen CSS size — it's stretched
  // to fit the container (w-full). Mapping a raw clientX/clientY offset
  // straight onto the buffer without correcting for that ratio draws the
  // stroke at the wrong spot, worse the narrower the screen — this is what
  // made a stylus signature land above the actual pen tip. Found
  // 2026-08-12: Fabiola signing with a stylus on her phone.
  const toCanvasPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

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
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    const p = toCanvasPoint(canvas, clientX, clientY);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setIsDrawing(true);
  };

  const continueDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
    const p = toCanvasPoint(canvasRef.current, clientX, clientY);
    ctx.lineTo(p.x, p.y);
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
  // Real multi-party documents (2+ named signers): set once this signer's
  // own signature is recorded, telling them whether everyone else is done
  // too (final PDF sent to all) or they're still waiting on others.
  const [groupSignResult, setGroupSignResult] = useState<{ allSigned: boolean; signedCount: number; totalSigners: number } | null>(null);

  // Signer identity
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');

  // Saved signature state
  const [savedSig, setSavedSig] = useState<{ dataUrl: string; sigType: string; fontFamily?: string } | null>(null);
  const [savedSigLoaded, setSavedSigLoaded] = useState(false);
  const [useSavedSig, setUseSavedSig] = useState(false);
  const [saveSigForNextTime, setSaveSigForNextTime] = useState(true);

  // Legal consent & audit trail
  const [hasConsented, setHasConsented] = useState(false);
  const [auditLinkOpenedAt, setAuditLinkOpenedAt] = useState('');
  const [auditIp, setAuditIp] = useState('');

  // Whether the signer has actually opened the source document. When there's
  // a separate file to view (customDocUrl — e.g. an uploaded PDF), signing
  // used to be possible without ever opening it — found 2026-08-12 when a
  // real recipient had no way to read what they were signing at all. There's
  // nothing separate to open when the full text is already shown inline
  // (docSummary-only documents), so this starts true in that case.
  const [hasViewedDoc, setHasViewedDoc] = useState(false);

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

  // ── Click-to-sign directly on the real document ─────────────────────────
  // When the sender uploaded a PDF and placed exact signature/initials/
  // date/name zones on it (DocuLegalPdfEditor), the signer should see and
  // fill THOSE exact zones on the real document — like DocuSign — instead
  // of a generic "draw your signature" form disconnected from the actual
  // paper. Requested 2026-08-12: "colocar el documento en el momento de la
  // firma y que la persona vea donde esta colocando la firma, igual que las
  // otras aplicaciones de firma". Falls back to the old generic form for
  // documents with no underlying PDF (the plain-text "Rédiger un nouveau
  // document" path has nothing to overlay onto).
  const usesRealPdfSigning = !!(docData?.pdfStorageUrl && docData?.signatureFields && docData.signatureFields.length > 0);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPdfPages, setNumPdfPages] = useState(0);
  const [pdfViewerLoading, setPdfViewerLoading] = useState(true);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const pdfPageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pdfCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // fieldId -> what the signer put there (image for signature/initials,
  // plain text for date/name) — this is what gets persisted and, once every
  // signer for the document is done, burned onto the real PDF server-side.
  const [fieldValues, setFieldValues] = useState<Record<string, { type: string; dataUrl?: string; text?: string }>>({});
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activeFieldMode, setActiveFieldMode] = useState<InputMode>('draw');
  const [activeFieldTypedText, setActiveFieldTypedText] = useState('');
  const [activeFieldFont, setActiveFieldFont] = useState(0);
  const activeFieldCanvas = useDrawingCanvas('Signez ici');

  useEffect(() => {
    if (!usesRealPdfSigning || !docData?.pdfStorageUrl) return;
    let cancelled = false;
    const load = async () => {
      setPdfViewerLoading(true);
      setPdfLoadError(false);
      try {
        const w = window as any;
        if (!w.pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            s.onload = () => resolve();
            s.onerror = reject;
            document.head.appendChild(s);
          });
          w.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        // Routed through our own server, not fetched directly from Storage —
        // the bucket has no CORS config for cross-origin browser fetch(), so
        // a direct fetch() here failed silently (no error, just an empty
        // viewer showing "0/4 zones" with nothing to click). Found
        // 2026-08-12. Server-to-server requests aren't subject to CORS.
        const resp = await fetch(`/api/proxy-pdf?url=${encodeURIComponent(docData.pdfStorageUrl!)}`);
        if (!resp.ok) throw new Error(`proxy-pdf ${resp.status}`);
        const buf = await resp.arrayBuffer();
        if (cancelled) return;
        const pdf = await w.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) return;
        setPdfDoc(pdf);
        setNumPdfPages(pdf.numPages);
        setHasViewedDoc(true);
      } catch (e) {
        console.error('[PublicSignaturePage] PDF load error:', e);
        if (!cancelled) setPdfLoadError(true);
      } finally {
        if (!cancelled) setPdfViewerLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usesRealPdfSigning, docData?.pdfStorageUrl]);

  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    const render = async () => {
      for (let i = 1; i <= numPdfPages; i++) {
        if (cancelled) return;
        try {
          const page = await pdfDoc.getPage(i);
          const vp = page.getViewport({ scale: 1.5 });
          const canvas = pdfCanvasRefs.current[i - 1];
          if (!canvas || cancelled) continue;
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.style.width = `${vp.width / 1.5}px`;
          canvas.style.height = `${vp.height / 1.5}px`;
          const ctx = canvas.getContext('2d');
          if (ctx && !cancelled) await page.render({ canvasContext: ctx, viewport: vp }).promise;
        } catch { /* can fail on unmount — ignore */ }
      }
    };
    render();
    return () => { cancelled = true; };
  }, [pdfDoc, numPdfPages]);

  const openField = (fieldId: string, fieldType: string) => {
    if (fieldType === 'date') {
      // Nothing to draw or type — just confirm today's date.
      const todayLabel = new Date().toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' });
      setFieldValues((p) => ({ ...p, [fieldId]: { type: 'date', text: todayLabel } }));
      return;
    }
    setActiveFieldId(fieldId);
    setActiveFieldMode(fieldType === 'signature' ? 'draw' : 'type');
    setActiveFieldTypedText(fieldType === 'name' ? signerName : '');
    activeFieldCanvas.resetCanvas();
  };

  const confirmActiveField = async () => {
    if (!activeFieldId || !docData?.signatureFields) return;
    const field = docData.signatureFields.find((f) => f.id === activeFieldId);
    if (!field) return;
    if (field.type === 'name') {
      if (!activeFieldTypedText.trim()) { alert('Veuillez saisir un nom.'); return; }
      setFieldValues((p) => ({ ...p, [activeFieldId]: { type: 'name', text: activeFieldTypedText.trim() } }));
      setActiveFieldId(null);
      return;
    }
    // signature / initials
    let dataUrl = '';
    if (activeFieldMode === 'draw') {
      if (!activeFieldCanvas.hasDrawn || !activeFieldCanvas.canvasRef.current) {
        alert('Veuillez dessiner avant de valider.');
        return;
      }
      dataUrl = activeFieldCanvas.canvasRef.current.toDataURL('image/png');
    } else {
      if (!activeFieldTypedText.trim()) { alert('Veuillez saisir du texte.'); return; }
      dataUrl = await renderTextToDataUrl(
        activeFieldTypedText.trim(), FONT_OPTIONS[activeFieldFont].family,
        field.type === 'signature' ? 560 : 200,
        field.type === 'signature' ? 100 : 60,
        field.type === 'signature' ? 52 : 36,
      );
    }
    setFieldValues((p) => ({ ...p, [activeFieldId]: { type: field.type, dataUrl } }));
    setActiveFieldId(null);
  };

  useEffect(() => {
    // Load Google Fonts. The css2 endpoint needs a SEPARATE family= param
    // per font — pipe-joining them into one param (the old css1 syntax) is
    // invalid here and silently loads none of them, so every signature
    // style fell back to the same default cursive font. Found 2026-08-12:
    // Fabiola saw all 4 "styles" render identically.
    const families = FONT_OPTIONS
      .filter(f => f.gFontParam)
      .map(f => `family=${f.gFontParam}`)
      .join('&');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
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

  // ── Record link-open event (IP + timestamp) for audit trail ─────────────────
  useEffect(() => {
    if (!docData || alreadySigned) return;
    const openedAt = new Date().toISOString();
    setAuditLinkOpenedAt(openedAt);
    // Prefill signer email if invitation was sent to a specific address
    if ((docData as any).invitationSentTo && !signerEmail) {
      setSignerEmail((docData as any).invitationSentTo);
    }
    // Fetch IP (best-effort, non-blocking)
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(d => {
        setAuditIp(d.ip || '');
        // Persist link-open event to Firestore
        setDoc(doc(db, 'pendingSignatures', token), {
          linkOpenedAt: openedAt,
          linkOpenedIp: d.ip || 'unknown',
          linkOpenedUA: navigator.userAgent.slice(0, 200),
        }, { merge: true }).catch(() => {});
      })
      .catch(() => {
        // IP fetch failed — still record the timestamp
        setDoc(doc(db, 'pendingSignatures', token), {
          linkOpenedAt: openedAt,
          linkOpenedIp: 'unknown',
          linkOpenedUA: navigator.userAgent.slice(0, 200),
        }, { merge: true }).catch(() => {});
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!docData]);

  // Auto-fill initials from signer name
  useEffect(() => {
    if (signerName.trim() && !typedInitials) {
      const parts = signerName.trim().split(' ');
      const initials = parts.map(p => p[0]?.toUpperCase() || '').join('');
      setTypedInitials(initials.slice(0, 3));
    }
  }, [signerName]);

  // ── Saved signature detection (by email) ───────────────────────────────────
  useEffect(() => {
    if (!signerEmail.includes('@')) { setSavedSig(null); setSavedSigLoaded(false); return; }
    const key = `sig_${signerEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    let cancelled = false;
    getDoc(doc(db, 'savedSignatures', key)).then(snap => {
      if (cancelled) return;
      if (snap.exists()) {
        const d = snap.data();
        setSavedSig({ dataUrl: d.sigDataUrl, sigType: d.sigType, fontFamily: d.fontFamily });
        setUseSavedSig(true);
      } else {
        setSavedSig(null);
        setUseSavedSig(false);
      }
      setSavedSigLoaded(true);
    }).catch(() => setSavedSigLoaded(true));
    return () => { cancelled = true; };
  }, [signerEmail]);

  // ── Sign handler ──────────────────────────────────────────────────────────────

  const handleSign = async () => {
    if (!docData) return;
    if (!signerName.trim()) { alert("Veuillez saisir votre nom complet."); return; }

    if (!hasConsented) {
      alert("Vous devez cocher la case de consentement électronique avant de signer.");
      return;
    }

    // ── Click-to-sign-on-the-document flow ──────────────────────────────────
    if (usesRealPdfSigning) {
      const requiredFields = (docData.signatureFields || []).filter((f) => f.required);
      const missing = requiredFields.filter((f) => !fieldValues[f.id]);
      if (missing.length > 0) {
        alert(`Il reste ${missing.length} champ${missing.length > 1 ? 's' : ''} à remplir sur le document avant de pouvoir signer.`);
        return;
      }
      setIsSigning(true);
      try {
        const todayStr = new Date().toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
        try {
          await setDoc(doc(db, 'pendingSignatures', token), {
            ...docData, status: 'signed',
            clientSignerName: signerName,
            clientSignerEmail: signerEmail,
            clientSignedDate: `${todayStr} \xE0 ${timeStr}`,
            clientSignedAt: new Date().toISOString(),
            fieldValues,
            auditConsentGiven: true,
            auditConsentAt: new Date().toISOString(),
            auditLinkOpenedAt,
            auditSignIp: auditIp || 'unknown',
            auditSignUA: navigator.userAgent.slice(0, 200),
          });
        } catch {}

        let groupResult: { allSigned: boolean; signedCount: number; totalSigners: number } = {
          allSigned: false, signedCount: 1, totalSigners: docData.totalSigners || 1,
        };
        try {
          const resp = await withTimeout(
            fetch('/api/finalize-signature-group', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ docId: docData.docId, token }),
            }),
            25000,
            null,
          );
          if (resp?.ok) {
            const data = await resp.json();
            groupResult = {
              allSigned: !!data.allSigned,
              signedCount: data.signedCount ?? groupResult.signedCount,
              totalSigners: data.totalSigners ?? groupResult.totalSigners,
            };
          }
        } catch {}
        setGroupSignResult(groupResult);
        setIsDone(true);
      } catch (e) {
        alert('Erreur lors de la signature. Veuillez réessayer.');
        console.error(e);
      } finally {
        setIsSigning(false);
      }
      return;
    }

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

      const finalSigDataUrl = sigMode === 'draw' ? sigDataUrl : typedSigDataUrl;

      // A real multi-party document (2+ named signers, none of them "the
      // account") can't be certified from any ONE signer's browser — nobody
      // here has the OTHER signers' signature images. The old template
      // always rendered a fixed "Partie 1 = the sending account" / "Partie
      // 2 = this signer" PDF regardless, so a genuine 2-person contract only
      // ever showed ONE real signature per copy, with the account's own
      // email standing in — unsigned — for the other party. Found
      // 2026-08-12: Fabiola's real 2-signer contract did exactly this.
      // Instead: persist THIS signer's own signature image, then ask the
      // server to check whether every signer for this docId is done; once
      // they all are, the server compiles and sends ONE true multi-party
      // PDF to everyone. See /api/finalize-signature-group in server.ts.
      const isMultiParty = (docData.totalSigners ?? 1) > 1;

      try {
        await setDoc(doc(db, 'pendingSignatures', token), {
          ...docData, status: 'signed',
          clientSignerName: signerName,
          clientSignerEmail: signerEmail,
          clientSignedDate: `${todayStr} \xE0 ${timeStr}`,
          clientSignatureType: sigMode,
          clientHasInitials: needsInitials,
          clientSignedAt: new Date().toISOString(),
          clientSignatureDataUrl: finalSigDataUrl || '',
          clientInitialsDataUrl: initialsDataUrl || '',
          // ── Audit trail (legal non-repudiation) ─────────────────────────
          auditConsentGiven: true,
          auditConsentAt: new Date().toISOString(),
          auditLinkOpenedAt,
          auditSignIp: auditIp || 'unknown',
          auditSignUA: navigator.userAgent.slice(0, 200),
        });
      } catch {}

      // ── Persist signature for next time ──────────────────────────────────
      if (saveSigForNextTime && signerEmail.includes('@') && finalSigDataUrl) {
        const key = `sig_${signerEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        try {
          await setDoc(doc(db, 'savedSignatures', key), {
            email: signerEmail,
            sigDataUrl: finalSigDataUrl,
            sigType: sigMode,
            fontFamily: sigMode === 'type' ? FONT_OPTIONS[selectedSigFont].family : undefined,
            savedAt: new Date().toISOString(),
            usedCount: 1,
          });
        } catch {}
      }

      if (isMultiParty) {
        let groupResult: { allSigned: boolean; signedCount: number; totalSigners: number } = {
          allSigned: false, signedCount: 1, totalSigners: docData.totalSigners || 1,
        };
        try {
          const resp = await withTimeout(
            fetch('/api/finalize-signature-group', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ docId: docData.docId, token }),
            }),
            25000,
            null,
          );
          if (resp?.ok) {
            const data = await resp.json();
            groupResult = {
              allSigned: !!data.allSigned,
              signedCount: data.signedCount ?? groupResult.signedCount,
              totalSigners: data.totalSigners ?? groupResult.totalSigners,
            };
          }
        } catch {}
        setGroupSignResult(groupResult);
        setIsDone(true);
        setIsSigning(false);
        return;
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

      let emailResult = { admin: false, client: false };
      if (pdfBase64) {
        try {
          const resp = await withTimeout(
            fetch('/api/save-signed-document', {
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
            }),
            20000,
            null,
          );
          if (resp?.ok) {
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
      if (pdfBase64 && docData.companyId && docData.ownerId) {
        try {
          const { uploadDocumentToDrivePublic } = await import('../lib/driveService');
          const safeTitle = (docData.docTitle || 'document').replace(/[^a-z0-9\-_]/gi, '_').slice(0, 40);
          const dateStr = new Date().toISOString().split('T')[0];
          const fileName = `DocuLegal_${safeTitle}_${dateStr}_BIPARTITE.pdf`;
          driveResult = await withTimeout(
            uploadDocumentToDrivePublic(
              docData.companyId, docData.ownerId, pdfBase64, fileName, 'application/pdf',
              docData.companyName, 'DocuLegal', token,
            ),
            20000,
            { success: false },
          );
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

      // Reference link to the fully-formatted original document, when this
      // signature request was generated from a custom uploaded template.
      if (data.customDocUrl) {
        pdf.setFont('Helvetica', 'italic');
        pdf.setFontSize(8);
        pdf.setTextColor(79, 70, 229);
        pdf.textWithLink('Document original (format complet) : voir la pièce jointe transmise par courriel', M, y, { url: data.customDocUrl });
        y += 7;
      }

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
            {isDone
              ? (groupSignResult ? (groupSignResult.allSigned ? 'Document Signé par Toutes les Parties !' : 'Votre Signature est Enregistrée !') : 'Document Signé avec Succès !')
              : 'Ce document a déjà été signé.'}
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-2">
            {isDone
              ? (groupSignResult
                  ? (groupSignResult.allSigned
                      ? `Les ${groupSignResult.totalSigners} signataires ont terminé — le PDF final avec toutes les signatures a été envoyé à tout le monde par courriel.`
                      : `${groupSignResult.signedCount} sur ${groupSignResult.totalSigners} signataires ont signé. Vous recevrez le PDF final par courriel dès que tout le monde aura terminé.`)
                  : 'Le PDF certifié bipartite (paraphes + signature) a été téléchargé.')
              : "Ce lien a déjà été utilisé. Contactez l'expéditeur si nécessaire."}
          </p>
        </div>
        {isDone && groupSignResult && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-sm text-indigo-700 font-medium">
            {groupSignResult.allSigned ? '✅' : '⏳'} {groupSignResult.signedCount} / {groupSignResult.totalSigners} signatures reçues
          </div>
        )}
        {isDone && !groupSignResult && (
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

        {/* ── Step tracker — replaces the old decorative "Progression" box,
             which listed placed PDF fields but never actually tracked
             anything real. This reflects genuine state instead. ──────────── */}
        {(() => {
          const needsDocView = !!docData?.customDocUrl;
          const steps = [
            { label: 'Document', done: !needsDocView || hasViewedDoc },
            { label: 'Identité', done: !!signerName.trim() },
            { label: 'Initiales', done: initialMode === 'draw' ? sigInitials.hasDrawn : !!typedInitials.trim() },
            { label: 'Signature', done: sigMode === 'draw' ? sigFull.hasDrawn : !!typedSignature.trim() },
            { label: 'Confirmer', done: hasConsented },
          ];
          return (
            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between">
                {steps.map((s, i) => (
                  <React.Fragment key={s.label}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                        s.done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {s.done ? <Check size={13} /> : i + 1}
                      </div>
                      <span className={`text-[7.5px] font-black uppercase tracking-wider ${s.done ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 -mt-4 ${steps[i + 1].done || s.done ? 'bg-emerald-300' : 'bg-slate-100'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Document card */}
        <div className={`bg-white rounded-[24px] border-2 shadow-sm p-6 space-y-4 ${
          docData?.customDocUrl && !hasViewedDoc ? 'border-indigo-300' : 'border-slate-200'
        }`}>
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
          {/* When the document renders inline below (usesRealPdfSigning),
              there's no separate tab to open — skip this link entirely. */}
          {docData?.customDocUrl && !usesRealPdfSigning && (
            <>
              <a
                href={docData.customDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setHasViewedDoc(true)}
                className={`flex items-center justify-center gap-2 py-4 px-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                  hasViewedDoc
                    ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-700'
                    : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 animate-pulse'
                }`}
              >
                {hasViewedDoc ? <><Check size={14} /> Document ouvert — vous pouvez continuer</> : <><FileText size={14} /> Ouvrir et lire le document avant de signer</>}
              </a>
              {!hasViewedDoc && (
                <p className="text-[9px] text-indigo-600 font-bold text-center">
                  ← S'ouvre dans un nouvel onglet. Une fois la lecture terminée, revenez à CET onglet-ci pour continuer.
                </p>
              )}
            </>
          )}
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

        {/* ── Click-to-sign directly on the real document ──────────────────── */}
        {usesRealPdfSigning && (
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500">2</div>
              <h2 className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Cliquez sur chaque zone du document pour la remplir
              </h2>
            </div>
            {pdfViewerLoading ? (
              <div className="flex items-center justify-center gap-3 py-16">
                <Loader2 className="animate-spin text-emerald-500" size={24} />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chargement du document...</span>
              </div>
            ) : pdfLoadError ? (
              <div className="p-5 bg-rose-50 border-2 border-rose-200 rounded-2xl text-center space-y-3">
                <AlertTriangle className="text-rose-500 mx-auto" size={24} />
                <p className="text-sm font-bold text-rose-700">Impossible d'afficher le document ici.</p>
                {docData?.customDocUrl && (
                  <a
                    href={docData.customDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setHasViewedDoc(true)}
                    className="inline-flex items-center gap-2 py-3 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-widest"
                  >
                    <FileText size={14} /> Ouvrir le document dans un nouvel onglet
                  </a>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 px-2">
                <div className="flex flex-col items-center gap-8 py-2">
                  {Array.from({ length: numPdfPages }, (_, i) => i).map((pi) => {
                    const pageFields = (docData?.signatureFields || []).filter((f) => f.page === pi + 1);
                    return (
                      <div key={pi} className="relative">
                        <p className="absolute -top-5 left-0 text-[8px] font-black uppercase tracking-widest text-slate-400">
                          Page {pi + 1} / {numPdfPages}
                        </p>
                        <div ref={(el) => { pdfPageRefs.current[pi] = el; }} className="relative shadow-xl rounded overflow-hidden">
                          <canvas ref={(el) => { pdfCanvasRefs.current[pi] = el; }} style={{ display: 'block' }} />
                          {pageFields.map((f) => {
                            const value = fieldValues[f.id];
                            const isDone = !!value;
                            const typeLabel: Record<string, string> = { signature: 'Signature', initials: 'Initiales', date: 'Date', name: 'Nom complet' };
                            const typeIcon: Record<string, React.ReactElement> = {
                              signature: <PenTool size={12} />, initials: <Type size={12} />, date: <Stamp size={12} />, name: <Type size={12} />,
                            };
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => openField(f.id, f.type)}
                                className={`absolute flex items-center justify-center rounded-md border-2 transition-all ${
                                  isDone
                                    ? 'border-emerald-500 bg-emerald-50/90'
                                    : 'border-indigo-500 bg-indigo-50/80 animate-pulse hover:bg-indigo-100'
                                }`}
                                style={{ left: `${f.xPct}%`, top: `${f.yPct}%`, width: `${f.wPct}%`, height: `${f.hPct}%` }}
                              >
                                {isDone && value?.dataUrl ? (
                                  <img src={value.dataUrl} alt={typeLabel[f.type]} className="max-h-full max-w-full object-contain" />
                                ) : isDone && value?.text ? (
                                  <span className="text-emerald-700 font-bold text-[10px] truncate px-1">{value.text}</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-indigo-700 text-[8px] font-black uppercase tracking-wider px-1 truncate">
                                    {typeIcon[f.type]} {typeLabel[f.type]}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="text-[9px] text-slate-400 font-medium text-center">
              {Object.keys(fieldValues).length} / {(docData?.signatureFields || []).length} zones remplies — cliquez sur les cases indigo clignotantes
            </p>
          </div>
        )}

        {/* ── Field-fill modal ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {activeFieldId && docData?.signatureFields && (() => {
            const field = docData.signatureFields.find((f) => f.id === activeFieldId);
            if (!field) return null;
            return (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4"
                onClick={() => setActiveFieldId(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-[24px] p-6 w-full max-w-md space-y-4 max-h-[85vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-black uppercase italic text-slate-900 text-sm">
                      {field.type === 'signature' ? 'Votre signature' : field.type === 'initials' ? 'Vos initiales' : 'Nom complet'}
                    </h3>
                    <button onClick={() => setActiveFieldId(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                  </div>

                  {field.type === 'name' ? (
                    <input
                      type="text" autoFocus value={activeFieldTypedText}
                      onChange={(e) => setActiveFieldTypedText(e.target.value)}
                      placeholder="Nom complet"
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                    />
                  ) : (
                    <>
                      <div className="flex gap-2">
                        {(['draw', 'type'] as InputMode[]).map((m) => (
                          <button key={m} onClick={() => setActiveFieldMode(m)}
                            className={`flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                              activeFieldMode === m ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}>
                            {m === 'draw' ? <><Pen size={11} /> Dessiner</> : <><Type size={11} /> Saisir</>}
                          </button>
                        ))}
                      </div>
                      {activeFieldMode === 'draw' ? (
                        <div className="space-y-2">
                          <canvas
                            ref={activeFieldCanvas.canvasRef}
                            width={field.type === 'signature' ? 560 : 300} height={field.type === 'signature' ? 140 : 90}
                            className="w-full border border-slate-200 rounded-2xl bg-slate-50 cursor-crosshair touch-none"
                            onMouseDown={activeFieldCanvas.startDraw} onMouseMove={activeFieldCanvas.continueDraw}
                            onMouseUp={activeFieldCanvas.stopDraw} onMouseLeave={activeFieldCanvas.stopDraw}
                            onTouchStart={activeFieldCanvas.startDraw} onTouchMove={activeFieldCanvas.continueDraw} onTouchEnd={activeFieldCanvas.stopDraw}
                          />
                          <button onClick={activeFieldCanvas.resetCanvas} className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500">
                            <X size={10} className="inline" /> Recommencer
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text" autoFocus value={activeFieldTypedText}
                            onChange={(e) => setActiveFieldTypedText(e.target.value)}
                            placeholder={field.type === 'signature' ? 'Votre nom' : 'Ex: J.T.'}
                            className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                          />
                          {activeFieldTypedText.trim() && (
                            <div className="grid grid-cols-2 gap-2">
                              {FONT_OPTIONS.map((font, idx) => (
                                <button key={font.family} onClick={() => setActiveFieldFont(idx)}
                                  className={`px-3 py-2.5 rounded-xl border-2 text-center transition-all ${activeFieldFont === idx ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                                  <span style={{ fontFamily: `'${font.family}', cursive`, fontSize: '1.2rem', color: activeFieldFont === idx ? '#059669' : '#334155' }}>
                                    {activeFieldTypedText}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <button
                    onClick={confirmActiveField}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Valider ce champ
                  </button>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* ── Saved Signature Banner ───────────────────────────────────────── */}
        {!usesRealPdfSigning && savedSig && savedSigLoaded && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-[24px] border-2 border-emerald-300 shadow-sm p-5 space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <span className="text-[10px]">✦</span>
                </div>
                <h2 className="text-[9px] font-black uppercase tracking-widest text-emerald-700">
                  Signature enregistrée détectée
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <img
                    src={savedSig.dataUrl}
                    alt="Signature enregistrée"
                    className="h-12 object-contain mx-auto"
                  />
                  <p className="text-[8px] text-emerald-600 font-black uppercase tracking-widest text-center mt-1">Votre signature enregistrée</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setUseSavedSig(true)}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border-2 ${
                      useSavedSig
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200'
                        : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {useSavedSig ? <>✓ Utilisée</> : <>Utiliser cette signature</>}
                  </button>
                  <button
                    onClick={() => setUseSavedSig(false)}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border-2 ${
                      !useSavedSig
                        ? 'bg-slate-700 border-slate-700 text-white'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    Signer autrement
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {!usesRealPdfSigning && (
        <>
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

        {/* Save-for-next-time toggle (shown when user has typed their signature) */}
        {signerEmail.includes('@') && !savedSig && (sigFull.hasDrawn || typedSignature.trim()) && (
          <label className="flex items-center gap-3 cursor-pointer px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <input
              type="checkbox"
              checked={saveSigForNextTime}
              onChange={e => setSaveSigForNextTime(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-700">Sauvegarder ma signature pour la prochaine fois</p>
              <p className="text-[8px] text-slate-400 font-medium">Elle sera reconnue automatiquement via votre courriel</p>
            </div>
          </label>
        )}
        </>
        )}

        {/* ── Mandatory Legal Consent Checkbox ─────────────────────────────── */}
        <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-2xl border-2 transition-all ${
          hasConsented
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-amber-300 bg-amber-50'
        }`}>
          <input
            type="checkbox"
            checked={hasConsented}
            onChange={e => setHasConsented(e.target.checked)}
            className="w-5 h-5 accent-emerald-600 rounded mt-0.5 shrink-0"
          />
          <div>
            <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${hasConsented ? 'text-emerald-800' : 'text-amber-800'}`}>
              ⚖️ Consentement électronique obligatoire
            </p>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Je confirme avoir reçu l&apos;invitation à signer et j&apos;ai lu le document ci-dessus.
              Je consens à apposer ma signature électronique, laquelle constitue un engagement légalement contraignant
              conformément à la <strong>LCCJTI du Québec</strong> et au <strong>Code civil, art. 2827</strong>.
            </p>
            {!hasConsented && (
              <p className="text-[9px] text-amber-700 font-bold mt-1.5">← Veuillez cocher cette case pour continuer</p>
            )}
          </div>
        </label>

        {/* Sign button */}
        {/* Disabling this button on unmet conditions used to mean a click did
            NOTHING at all — not even an explanatory alert, since a disabled
            button never fires onClick in the first place. Found 2026-08-12:
            Fabiola clicked it after skipping the "open document" step and
            saw zero reaction, no error, nothing. Now only the actual
            in-flight submission disables it; every other missing condition
            (name, consent, document not yet opened, signature not drawn —
            handleSign already checks the last three) always gives a clear
            alert on click instead of silently doing nothing. */}
        <button
          onClick={() => {
            if (docData?.customDocUrl && !hasViewedDoc) {
              alert("Veuillez d'abord ouvrir et lire le document avant de signer (bouton plus haut sur cette page).");
              return;
            }
            handleSign();
          }}
          disabled={isSigning}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.99] shadow-lg shadow-emerald-600/20"
        >
          {isSigning
            ? <><Loader2 className="animate-spin" size={18} /> Génération du PDF certifié...</>
            : <><PenTool size={18} /> Réviser et Signer</>
          }
        </button>
        {docData?.customDocUrl && !hasViewedDoc && (
          <p className="text-[9px] text-indigo-600 font-bold text-center -mt-3">
            ← Ouvrez d'abord le document ci-dessus, sinon ce bouton vous le rappellera
          </p>
        )}

        <div className="flex items-center justify-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest pb-6">
          <ShieldCheck size={12} />
          <span>Certifié par DocuLegal · AutoCompt Canada</span>
        </div>
      </main>
    </div>
  );
}
