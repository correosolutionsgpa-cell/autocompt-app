/**
 * ReceiptPreviewModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Carpeta: src/components/modals/
 * Extraído de: src/App.tsx (L15517–L15592) — Fase 14 del desmantelamiento modular
 *
 * Modal de prévisualisation de pièces justificatives (reçus, PDF, images).
 * Purement présentationnel — CERO estados propios, CERO lógica de negocio.
 * Se muestra cuando `receiptPreviewUrl` es non-null.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReceiptPreviewModalProps {
  darkMode: boolean;
  receiptPreviewUrl: string | null;
  receiptPreviewName: string;
  setReceiptPreviewUrl: (url: string | null) => void;
  setReceiptPreviewName: (name: string) => void;
}

// ── Composant ─────────────────────────────────────────────────────────────────

const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  darkMode,
  receiptPreviewUrl,
  receiptPreviewName,
  setReceiptPreviewUrl,
  setReceiptPreviewName,
}) => {
  if (!receiptPreviewUrl) return null;

  const handleClose = () => {
    setReceiptPreviewUrl(null);
    setReceiptPreviewName("");
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        className={`w-full max-w-lg p-6 rounded-[32px] border shadow-2xl flex flex-col justify-between animate-in zoom-in-95 duration-300 ${darkMode
            ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md"
            : "bg-white border-slate-200"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-4 mb-4">
          <div className="text-left w-full min-w-0 pr-4">
            <span className="text-[7px] font-black uppercase tracking-[0.25em] text-[#059669] block">
              Aperçu Pièce Justificative
            </span>
            <h3
              className={`text-xs font-black uppercase italic tracking-tight truncate mt-0.5 ${darkMode ? "text-zinc-100" : "text-slate-900"
                }`}
            >
              {receiptPreviewName}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className={`p-2 rounded-full transition-all cursor-pointer shrink-0 ${darkMode
                ? "bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="flex-1 overflow-auto max-h-[55vh] flex items-center justify-center rounded-2xl bg-zinc-900/5 dark:bg-transparent/25 p-2 mb-5 border border-slate-150 dark:border-zinc-900/40">
          {receiptPreviewUrl.endsWith(".pdf") ? (
            <iframe
              src={receiptPreviewUrl}
              className="w-full h-[50vh] rounded-xl border-none"
              title="Document PDF"
            />
          ) : (
            <img
              src={receiptPreviewUrl}
              alt="Reçu scanné"
              className="max-h-[50vh] max-w-full rounded-xl object-contain shadow-lg"
              referrerPolicy="no-referrer"
              onError={() => {
                console.warn("Could not load receipt preview directly");
              }}
            />
          )}
        </div>

        {/* Footer action button */}
        <button
          type="button"
          onClick={handleClose}
          className={`w-full py-3.5 text-[9px] font-black uppercase tracking-widest italic rounded-[18px] transition-all cursor-pointer active:scale-95 ${darkMode
              ? "bg-zinc-900 text-zinc-100 hover:bg-zinc-800 border border-zinc-800"
              : "bg-slate-900 text-white hover:bg-[#111827]"
            }`}
        >
          Fermer l&apos;aperçu
        </button>
      </div>
    </div>
  );
};

export default ReceiptPreviewModal;
