import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Send, Loader2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../lib/firebase';

// ── PDF.js global shim ────────────────────────────────────────────────────────
declare global {
  interface Window { pdfjsLib: any; }
}

// ── Public types (also used by PublicSignaturePage) ───────────────────────────
export interface SignatureField {
  id: string;
  page: number;       // 1-indexed
  type: 'signature' | 'initials' | 'date' | 'name';
  xPct: number;       // % of page width
  yPct: number;       // % of page height
  wPct: number;       // % of page width
  hPct: number;       // % of page height
  required: boolean;
  label: string;
}

// ── Field definitions ─────────────────────────────────────────────────────────
const FIELD_DEFS: {
  type: SignatureField['type'];
  label: string;
  emoji: string;
  color: string;
  defaultW: number;
  defaultH: number;
}[] = [
  { type: 'signature', label: 'Signature',   emoji: '✍️', color: 'emerald', defaultW: 22, defaultH: 8  },
  { type: 'initials',  label: 'Initiales',   emoji: 'AB', color: 'blue',    defaultW: 10, defaultH: 6  },
  { type: 'date',      label: 'Date',         emoji: '📅', color: 'amber',   defaultW: 16, defaultH: 6  },
  { type: 'name',      label: 'Nom complet',  emoji: '👤', color: 'violet',  defaultW: 22, defaultH: 6  },
];

const COLORS: Record<string, { border: string; bg: string; text: string; badge: string; ring: string; tool: string }> = {
  emerald: {
    border: '#10b981', bg: 'rgba(16,185,129,0.12)', text: '#047857',
    badge: 'background:#10b981;color:#fff', ring: '#6ee7b7', tool: '#10b981',
  },
  blue: {
    border: '#3b82f6', bg: 'rgba(59,130,246,0.12)', text: '#1d4ed8',
    badge: 'background:#3b82f6;color:#fff', ring: '#93c5fd', tool: '#3b82f6',
  },
  amber: {
    border: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#92400e',
    badge: 'background:#f59e0b;color:#fff', ring: '#fcd34d', tool: '#f59e0b',
  },
  violet: {
    border: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', text: '#5b21b6',
    badge: 'background:#8b5cf6;color:#fff', ring: '#c4b5fd', tool: '#8b5cf6',
  },
};

interface DocuLegalPdfEditorProps {
  darkMode: boolean;
  pdfFile: File;
  docTitle: string;
  onClose: () => void;
  onSendForSignature: (
    fields: SignatureField[],
    pdfStorageUrl: string,
    signerName: string,
    signerEmail: string,
  ) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DocuLegalPdfEditor({
  darkMode, pdfFile, docTitle, onClose, onSendForSignature,
}: DocuLegalPdfEditorProps) {
  const dm = darkMode;

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1.2);
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [draggingType, setDraggingType] = useState<string | null>(null);
  // Which field type the user has "selected" in the toolbar for click-to-place
  const [clickPlaceType, setClickPlaceType] = useState<SignatureField['type'] | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  // Step 2 — signer info
  const [step, setStep] = useState<1 | 2>(1);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');

  // Refs — page containers & canvases
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const dragTypeRef = useRef<string | null>(null);

  // Move state ref (no re-render needed during drag)
  const moveRef = useRef<{
    id: string; x0: number; y0: number;
    origX: number; origY: number;
    pw: number; ph: number;
  } | null>(null);

  // ── Load PDF.js from CDN then load file ───────────────────────────────────
  useEffect(() => {
    const loadPdf = async () => {
      try {
        if (!window.pdfjsLib) {
          await new Promise<void>((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            s.onload = () => res();
            s.onerror = rej;
            document.head.appendChild(s);
          });
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        const buf = await pdfFile.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
      } catch (e) {
        console.error('[DocuLegalPdfEditor] PDF load error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadPdf();
  }, [pdfFile]);

  // ── Re-render pages on PDF load or zoom change ────────────────────────────
  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    const render = async () => {
      for (let i = 1; i <= numPages; i++) {
        if (cancelled) return;
        try {
          const page = await pdfDoc.getPage(i);
          const vp = page.getViewport({ scale: zoom * 1.5 }); // 1.5x for crisp HiDPI
          const canvas = canvasRefs.current[i - 1];
          if (!canvas || cancelled) continue;
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.style.width = `${vp.width / 1.5}px`;
          canvas.style.height = `${vp.height / 1.5}px`;
          const ctx = canvas.getContext('2d');
          if (ctx && !cancelled) await page.render({ canvasContext: ctx, viewport: vp }).promise;
        } catch { /* page render can fail on unmount — ignore */ }
      }
    };
    render();
    return () => { cancelled = true; };
  }, [pdfDoc, zoom, numPages]);

  // ── Global mouse move / up for field dragging ─────────────────────────────
  const onGlobalMouseMove = useCallback((e: MouseEvent) => {
    const m = moveRef.current;
    if (!m) return;
    const dxPct = ((e.clientX - m.x0) / m.pw) * 100;
    const dyPct = ((e.clientY - m.y0) / m.ph) * 100;
    setFields(prev => prev.map(f =>
      f.id === m.id
        ? {
            ...f,
            xPct: Math.max(0, Math.min(100 - f.wPct, m.origX + dxPct)),
            yPct: Math.max(0, Math.min(100 - f.hPct, m.origY + dyPct)),
          }
        : f,
    ));
  }, []);

  const onGlobalMouseUp = useCallback(() => { moveRef.current = null; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
  }, [onGlobalMouseMove, onGlobalMouseUp]);

  // ── Keyboard: Delete selected field, Escape to deselect ──────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          setFields(p => p.filter(f => f.id !== selectedId));
          setSelectedId(null);
        }
      }
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId]);

  // ── Click-to-place on canvas ──────────────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    if (!clickPlaceType) return;
    const def = FIELD_DEFS.find(d => d.type === clickPlaceType);
    if (!def) return;
    const container = pageRefs.current[pageIndex];
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const newField: SignatureField = {
      id: `${clickPlaceType}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      page: pageIndex + 1,
      type: clickPlaceType,
      xPct: Math.max(0, Math.min(100 - def.defaultW, xPct - def.defaultW / 2)),
      yPct: Math.max(0, Math.min(100 - def.defaultH, yPct - def.defaultH / 2)),
      wPct: def.defaultW,
      hPct: def.defaultH,
      required: true,
      label: def.label,
    };
    setFields(p => [...p, newField]);
    setSelectedId(newField.id);
    setShowInstructions(false);
    // Don't reset clickPlaceType — user probably wants to place multiple
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, pageIndex: number) => {
    e.preventDefault();
    const type = dragTypeRef.current as SignatureField['type'] | null;
    if (!type) return;
    const def = FIELD_DEFS.find(d => d.type === type);
    if (!def) return;
    const container = pageRefs.current[pageIndex];
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const newField: SignatureField = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      page: pageIndex + 1,
      type,
      xPct: Math.max(0, Math.min(100 - def.defaultW, xPct - def.defaultW / 2)),
      yPct: Math.max(0, Math.min(100 - def.defaultH, yPct - def.defaultH / 2)),
      wPct: def.defaultW,
      hPct: def.defaultH,
      required: true,
      label: def.label,
    };
    setFields(p => [...p, newField]);
    setSelectedId(newField.id);
    dragTypeRef.current = null;
    setDraggingType(null);
  };

  // ── Start moving an existing field ────────────────────────────────────────
  const startMove = (e: React.MouseEvent, field: SignatureField, pageIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const container = pageRefs.current[pageIndex];
    if (!container) return;
    const rect = container.getBoundingClientRect();
    moveRef.current = {
      id: field.id,
      x0: e.clientX, y0: e.clientY,
      origX: field.xPct, origY: field.yPct,
      pw: rect.width, ph: rect.height,
    };
    setSelectedId(field.id);
  };

  // ── Click-to-place: register on field add ─────────────────────────────────
  // (see handleCanvasClick below which is the real click handler)
  const handleSend = async () => {
    if (fields.length === 0 || !signerEmail.includes('@') || !signerName.trim()) return;
    const uid = auth.currentUser?.uid;
    if (!uid) { alert('Session requise pour envoyer un document.'); return; }
    setIsUploading(true);
    try {
      const buf = await pdfFile.arrayBuffer();
      const safeName = encodeURIComponent(pdfFile.name.replace(/\s+/g, '_'));
      const path = `docuLegalPdfs/${uid}/${Date.now()}_${safeName}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, new Uint8Array(buf), { contentType: 'application/pdf' });
      const url = await getDownloadURL(sRef);
      onSendForSignature(fields, url, signerName.trim(), signerEmail.trim());
    } catch (e: any) {
      console.error('[DocuLegalPdfEditor] Upload error:', e);
      const code = e?.code || '';
      const msg = code === 'storage/unauthorized'
        ? 'Accès refusé au stockage Firebase. Les règles storage.rules doivent être déployées (firebase deploy --only storage).'
        : code === 'storage/unknown' || code === 'storage/object-not-found'
          ? `Erreur Firebase Storage (${code}). Vérifiez la connexion et les règles.`
          : `Erreur lors du téléversement : ${e?.message || code || 'inconnue'}`;
      alert(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[300] flex"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", background: dm ? '#09090b' : '#f1f5f9' }}
    >
      {/* ─── Left sidebar / toolbar ────────────────────────────────────────── */}
      <aside
        className="w-60 shrink-0 flex flex-col overflow-hidden"
        style={{
          background: dm ? '#18181b' : '#ffffff',
          borderRight: dm ? '1px solid #27272a' : '1px solid #e2e8f0',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: dm ? '1px solid #27272a' : '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: dm ? '#52525b' : '#94a3b8', marginBottom: 2 }}>
                DocuLegal — Éditeur de signature
              </p>
              <p style={{ fontSize: 12, fontWeight: 900, color: dm ? '#f4f4f5' : '#0f172a', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {docTitle || pdfFile.name}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: dm ? '#71717a' : '#94a3b8' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Zoom */}
        <div style={{ padding: '12px 16px', borderBottom: dm ? '1px solid #27272a' : '1px solid #f1f5f9' }}>
          <p style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: dm ? '#52525b' : '#94a3b8', marginBottom: 8 }}>
            Zoom — {Math.round(zoom * 100)}%
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setZoom(z => Math.max(0.4, parseFloat((z - 0.2).toFixed(1))))}
              style={{ flex: 1, padding: '6px 0', borderRadius: 10, border: dm ? '1px solid #27272a' : '1px solid #e2e8f0', background: dm ? '#27272a' : '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'center', color: dm ? '#a1a1aa' : '#64748b' }}
            >
              <ZoomOut size={13} />
            </button>
            <button
              onClick={() => setZoom(1.2)}
              style={{ padding: '6px 8px', borderRadius: 10, border: dm ? '1px solid #27272a' : '1px solid #e2e8f0', background: dm ? '#27272a' : '#f8fafc', cursor: 'pointer', fontSize: 8, fontWeight: 900, color: dm ? '#a1a1aa' : '#64748b' }}
            >
              100%
            </button>
            <button
              onClick={() => setZoom(z => Math.min(2.5, parseFloat((z + 0.2).toFixed(1))))}
              style={{ flex: 1, padding: '6px 0', borderRadius: 10, border: dm ? '1px solid #27272a' : '1px solid #e2e8f0', background: dm ? '#27272a' : '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'center', color: dm ? '#a1a1aa' : '#64748b' }}
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>

        {/* Field palette */}
        <div style={{ padding: '12px 16px', borderBottom: dm ? '1px solid #27272a' : '1px solid #f1f5f9' }}>
          <p style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6366f1', marginBottom: 2 }}>
            Étape 1 — Choisir un champ
          </p>
          <p style={{ fontSize: 9, color: dm ? '#71717a' : '#64748b', marginBottom: 10, lineHeight: 1.4 }}>
            <strong>Cliquez</strong> sur un type ci-dessous, puis <strong>cliquez sur le PDF</strong> pour le placer. Ou glissez-déposez directement.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {FIELD_DEFS.map(def => {
              const c = COLORS[def.color];
              const isActive = draggingType === def.type || clickPlaceType === def.type;
              return (
                <div
                  key={def.type}
                  draggable
                  onDragStart={() => { dragTypeRef.current = def.type; setDraggingType(def.type); }}
                  onDragEnd={() => { dragTypeRef.current = null; setDraggingType(null); }}
                  onClick={() => {
                    setClickPlaceType(prev => prev === def.type ? null : def.type as SignatureField['type']);
                    setShowInstructions(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 12,
                    cursor: 'pointer',
                    userSelect: 'none',
                    border: isActive ? `2px solid ${c.border}` : dm ? '1.5px solid #27272a' : '1.5px solid #e2e8f0',
                    background: isActive ? c.bg : dm ? '#27272a' : '#f8fafc',
                    boxShadow: isActive ? `0 0 0 3px ${c.ring}40` : 'none',
                    opacity: 1,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 6px', borderRadius: 6, background: c.border, color: '#fff' }}>
                    {def.emoji}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: dm ? '#d4d4d8' : '#475569', flex: 1 }}>
                    {def.label}
                  </span>
                  {isActive
                    ? <span style={{ fontSize: 8, fontWeight: 900, color: c.text, background: c.bg, padding: '2px 6px', borderRadius: 99, border: `1px solid ${c.border}` }}>Sélectionné</span>
                    : <GripVertical size={11} style={{ color: dm ? '#52525b' : '#cbd5e1' }} />}
                </div>
              );
            })}
          </div>
          {clickPlaceType && (
            <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 10, background: '#6366f120', border: '1px solid #6366f140', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>👆</span>
              <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 700, margin: 0 }}>
                Cliquez n'importe où sur le PDF pour placer le champ
              </p>
            </div>
          )}
        </div>

        {/* Placed fields list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {fields.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 16 }}>
              <p style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: dm ? '#3f3f46' : '#cbd5e1' }}>
                Aucun champ placé
              </p>
              <p style={{ fontSize: 8, color: dm ? '#3f3f46' : '#cbd5e1', marginTop: 4 }}>
                Glissez depuis la liste ci-dessus
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: fields.length > 0 ? '#6366f1' : (dm ? '#3f3f46' : '#cbd5e1'), marginBottom: 8 }}>
            Étape 2 — {fields.length} champ{fields.length > 1 ? 's' : ''} placé{fields.length > 1 ? 's' : ''}
          </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {fields.map(f => {
                  const def = FIELD_DEFS.find(d => d.type === f.type)!;
                  const c = COLORS[def.color];
                  const isSel = selectedId === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setSelectedId(f.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 8px', borderRadius: 10, cursor: 'pointer',
                        background: isSel ? (dm ? '#27272a' : '#f1f5f9') : 'transparent',
                        border: isSel ? (dm ? '1px solid #3f3f46' : '1px solid #e2e8f0') : '1px solid transparent',
                      }}
                    >
                      <span style={{ fontSize: 8, fontWeight: 900, padding: '2px 4px', borderRadius: 4, background: c.border, color: '#fff' }}>
                        {def.emoji}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 700, flex: 1, color: dm ? '#a1a1aa' : '#64748b' }}>
                        {def.label} — p.{f.page}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setFields(p => p.filter(ff => ff.id !== f.id));
                          if (selectedId === f.id) setSelectedId(null);
                        }}
                        style={{ padding: 2, border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}
                      >
                        <X size={9} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: '12px 16px', borderTop: dm ? '1px solid #27272a' : '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {step === 1 ? (
            // ─ Step 1: continuer button
            <>
              <div title={fields.length === 0 ? 'Placez d\'abord au moins 1 champ de signature sur le document' : ''}>
                <button
                  onClick={() => { if (fields.length > 0) setStep(2); }}
                  disabled={fields.length === 0}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 16, border: 'none',
                    background: fields.length === 0 ? (dm ? '#27272a' : '#e2e8f0') : '#6366f1',
                    color: fields.length === 0 ? (dm ? '#52525b' : '#94a3b8') : '#fff',
                    fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
                    letterSpacing: '0.1em', cursor: fields.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    boxShadow: fields.length > 0 ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {fields.length === 0
                    ? '← Placez un champ d\'abord'
                    : `Continuer — ${fields.length} champ${fields.length > 1 ? 's' : ''} →`}
                </button>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 16,
                  border: dm ? '1px solid #27272a' : '1px solid #e2e8f0',
                  background: 'transparent', color: dm ? '#71717a' : '#94a3b8',
                  fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
                  letterSpacing: '0.1em', cursor: 'pointer',
                }}
              >
                Annuler
              </button>
            </>
          ) : (
            // ─ Step 2: signer name + email + send
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: dm ? '#71717a' : '#94a3b8', padding: 0, fontSize: 16 }}
                >
                  ←
                </button>
                <p style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#10b981', margin: 0 }}>
                  Étape 3 — Infos du signataire
                </p>
              </div>

              {/* Signer name */}
              <div>
                <label style={{ display: 'block', fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: dm ? '#71717a' : '#94a3b8', marginBottom: 4 }}>
                  Nom complet du signataire *
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  placeholder="Ex: Jean Tremblay"
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 12,
                    border: dm ? '1px solid #3f3f46' : '1px solid #e2e8f0',
                    background: dm ? '#18181b' : '#f8fafc',
                    color: dm ? '#f4f4f5' : '#0f172a',
                    fontSize: 12, fontWeight: 600, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Signer email */}
              <div>
                <label style={{ display: 'block', fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: dm ? '#71717a' : '#94a3b8', marginBottom: 4 }}>
                  Email du signataire *
                </label>
                <input
                  type="email"
                  value={signerEmail}
                  onChange={e => setSignerEmail(e.target.value)}
                  placeholder="jean@exemple.com"
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 12,
                    border: dm ? '1px solid #3f3f46' : '1px solid #e2e8f0',
                    background: dm ? '#18181b' : '#f8fafc',
                    color: dm ? '#f4f4f5' : '#0f172a',
                    fontSize: 12, fontWeight: 600, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: 8, color: dm ? '#52525b' : '#94a3b8', marginTop: 4 }}>
                  Le signataire recevra un email avec le lien de signature. L’acceptation de signer
                  par email constitue une preuve légale.
                </p>
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={isUploading || !signerEmail.includes('@') || !signerName.trim()}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 16, border: 'none',
                  background: (isUploading || !signerEmail.includes('@') || !signerName.trim())
                    ? (dm ? '#27272a' : '#e2e8f0')
                    : '#059669',
                  color: (isUploading || !signerEmail.includes('@') || !signerName.trim())
                    ? (dm ? '#52525b' : '#94a3b8') : '#fff',
                  fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: (isUploading || !signerEmail.includes('@') || !signerName.trim()) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: (signerEmail.includes('@') && signerName.trim()) ? '0 4px 14px rgba(5,150,105,0.25)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {isUploading
                  ? <><Loader2 size={13} className="animate-spin" />Envoi en cours...</>
                  : <><Send size={13} />Envoyer pour Signature</>}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ─── PDF canvas area ───────────────────────────────────────────────── */}
      <div
        style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', background: dm ? '#09090b' : '#dde4ee' }}
        onClick={() => setSelectedId(null)}
      >
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <Loader2 style={{ color: '#10b981', animation: 'spin 1s linear infinite' }} size={32} />
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: dm ? '#52525b' : '#94a3b8' }}>
              Chargement du PDF...
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', gap: 40 }}>
            {Array.from({ length: numPages }, (_, i) => i).map(pi => {
              const pageFields = fields.filter(f => f.page === pi + 1);
              return (
                <div key={pi} style={{ position: 'relative' }}>
                  {/* Page label */}
                  <p style={{
                    position: 'absolute', top: -22, left: 0,
                    fontSize: 8, fontWeight: 900, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: dm ? '#52525b' : '#94a3b8',
                  }}>
                    Page {pi + 1} / {numPages}
                  </p>

                  {/* Drop zone wrapper */}
                  <div
                    ref={el => { pageRefs.current[pi] = el; }}
                    onClick={e => { e.stopPropagation(); handleCanvasClick(e, pi); }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, pi)}
                    style={{
                      position: 'relative',
                      boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
                      borderRadius: 4,
                      overflow: 'hidden',
                      cursor: clickPlaceType ? 'crosshair' : 'default',
                      outline: clickPlaceType ? '3px solid #6366f1' : 'none',
                      outlineOffset: 2,
                    }}
                  >
                    <canvas ref={el => { canvasRefs.current[pi] = el; }} style={{ display: 'block' }} />

                    {/* First-page onboarding overlay — shown when no fields placed yet */}
                    {pi === 0 && fields.length === 0 && !isLoading && showInstructions && (
                      <div
                        style={{
                          position: 'absolute', inset: 0,
                          background: 'rgba(99,102,241,0.08)',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          gap: 12, pointerEvents: 'none',
                        }}
                      >
                        <div style={{
                          padding: '20px 28px', borderRadius: 20,
                          background: dm ? 'rgba(9,9,11,0.9)' : 'rgba(255,255,255,0.92)',
                          border: '2px dashed #6366f1',
                          textAlign: 'center', maxWidth: 320,
                          backdropFilter: 'blur(8px)',
                        }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>✍️</div>
                          <p style={{ fontSize: 13, fontWeight: 900, color: '#6366f1', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                            Ajoutez des zones de signature
                          </p>
                          <p style={{ fontSize: 11, color: dm ? '#a1a1aa' : '#64748b', margin: 0, lineHeight: 1.5 }}>
                            Dans le panneau gauche :<br/>
                            <strong>1.</strong> Cliquez sur un type de champ<br/>
                            <strong>2.</strong> Cliquez ici où vous voulez le placer
                          </p>
                          <p style={{ fontSize: 9, color: '#6366f180', margin: '8px 0 0', fontStyle: 'italic' }}>
                            Ou glissez-déposez directement sur le PDF
                          </p>
                        </div>
                      </div>
                    )}

                    {pageFields.map(f => {
                      const def = FIELD_DEFS.find(d => d.type === f.type)!;
                      const c = COLORS[def.color];
                      const isSel = selectedId === f.id;
                      return (
                        <div
                          key={f.id}
                          onClick={e => { e.stopPropagation(); setSelectedId(f.id); }}
                          onMouseDown={e => startMove(e, f, pi)}
                          style={{
                            position: 'absolute',
                            left: `${f.xPct}%`, top: `${f.yPct}%`,
                            width: `${f.wPct}%`, height: `${f.hPct}%`,
                            border: `2px ${isSel ? 'solid' : 'dashed'} ${c.border}`,
                            background: c.bg,
                            borderRadius: 6,
                            cursor: 'move',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            userSelect: 'none',
                            boxShadow: isSel ? `0 0 0 3px ${c.ring}40` : undefined,
                            transition: 'box-shadow 0.15s',
                            overflow: 'hidden',
                          }}
                        >
                          <span style={{
                            fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
                            letterSpacing: '0.06em', color: c.text,
                            pointerEvents: 'none', overflow: 'hidden',
                            whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                            padding: '0 4px',
                          }}>
                            {def.emoji} {def.label}
                          </span>

                          {/* Delete button (shown when selected) */}
                          {isSel && (
                            <button
                              onMouseDown={e => e.stopPropagation()}
                              onClick={e => {
                                e.stopPropagation();
                                setFields(p => p.filter(ff => ff.id !== f.id));
                                setSelectedId(null);
                              }}
                              style={{
                                position: 'absolute', top: -10, right: -10,
                                width: 20, height: 20, borderRadius: '50%',
                                background: '#ef4444', border: '2px solid #fff',
                                color: '#fff', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                                zIndex: 10,
                              }}
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
