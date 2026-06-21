/**
 * MissingReceiptDisclaimerModal.tsx
 *
 * Legal shield displayed when a user attempts to log a business expense
 * without uploading a supporting receipt.
 *
 * The "Enregistrer quand même" CTA is hard-gated behind a mandatory
 * acknowledgement checkbox — fully disabled until checked.
 *
 * Usage:
 *   <MissingReceiptDisclaimerModal
 *     isOpen={showDisclaimerModal}
 *     onCancel={() => setShowDisclaimerModal(false)}
 *     onConfirm={() => { handleSaveExpense(); setShowDisclaimerModal(false); }}
 *     darkMode={darkMode}
 *   />
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, FileX, ShieldAlert, X } from "lucide-react";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MissingReceiptDisclaimerModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Called when user clicks "Annuler" or the backdrop */
  onCancel: () => void;
  /** Called when user has checked the box AND clicks "Enregistrer quand même" */
  onConfirm: () => void;
  /** Inherit app-level dark mode */
  darkMode?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MissingReceiptDisclaimerModal({
  isOpen,
  onCancel,
  onConfirm,
  darkMode = true,
}: MissingReceiptDisclaimerModalProps) {
  const [isRiskAssumed, setIsRiskAssumed] = useState(false);

  // Reset checkbox every time the modal opens so state doesn't leak
  useEffect(() => {
    if (isOpen) setIsRiskAssumed(false);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  const D = darkMode;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disclaimer-title"
          aria-describedby="disclaimer-body"
        >
          {/* ── Backdrop ─────────────────────────────────────────────────── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
            aria-hidden="true"
          />

          {/* ── Modal panel ──────────────────────────────────────────────── */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.93, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full max-w-md rounded-2xl overflow-hidden
              ${D
                ? "bg-[#0b1121]/95 border border-amber-500/20 shadow-[0_0_0_1px_rgba(245,158,11,0.08),0_24px_64px_rgba(0,0,0,0.70)] backdrop-blur-2xl"
                : "bg-white border border-amber-300/60 shadow-2xl"
              }`}
          >
            {/* Amber glow strip at top */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-600/0 via-amber-500 to-amber-600/0" />

            {/* Close ✕ */}
            <button
              onClick={onCancel}
              aria-label="Fermer"
              className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors z-10
                ${D
                  ? "text-zinc-600 hover:text-zinc-300 hover:bg-white/5"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}
            >
              <X size={15} />
            </button>

            {/* ── Header ───────────────────────────────────────────────── */}
            <div className={`px-6 pt-7 pb-5 border-b ${D ? "border-white/[0.06]" : "border-amber-100"}`}>
              <div className="flex items-start gap-4">
                {/* Warning icon cluster */}
                <div className={`relative shrink-0 mt-0.5`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center
                    ${D
                      ? "bg-amber-500/10 border border-amber-500/25"
                      : "bg-amber-50 border border-amber-300/60"}`}>
                    <AlertTriangle size={20} className="text-amber-400" />
                  </div>
                  {/* Pulse ring */}
                  <span className="absolute inset-0 rounded-xl animate-ping opacity-20 bg-amber-400 pointer-events-none" />
                </div>

                <div className="flex-1 pr-6">
                  {/* Surtitle */}
                  <p className="text-[8.5px] font-black uppercase tracking-[0.18em] text-amber-500/80 mb-1">
                    Avertissement fiscal
                  </p>
                  {/* Title */}
                  <h2
                    id="disclaimer-title"
                    className={`text-[17px] font-black tracking-tight leading-tight ${D ? "text-white" : "text-slate-900"}`}
                  >
                    Dépense sans reçu
                  </h2>
                </div>
              </div>
            </div>

            {/* ── Body ─────────────────────────────────────────────────── */}
            <div className="px-6 py-5 space-y-5">

              {/* ARC / Revenu Québec disclaimer box */}
              <div className={`flex gap-3 p-4 rounded-xl border
                ${D
                  ? "bg-amber-500/[0.06] border-amber-500/20"
                  : "bg-amber-50 border-amber-200"}`}>
                <ShieldAlert size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <p
                  id="disclaimer-body"
                  className={`text-[11px] leading-[1.65] ${D ? "text-zinc-300" : "text-slate-700"}`}
                >
                  <span className="font-bold text-amber-400">Attention.</span>{" "}
                  L'Agence du revenu du Canada (ARC) et Revenu Québec exigent des pièces
                  justificatives pour toute déduction d'entreprise. En déclarant cette dépense
                  sans reçu, vous assumez l'entière responsabilité en cas d'audit fiscal.
                </p>
              </div>

              {/* Receipt-not-found icon row */}
              <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border
                ${D
                  ? "bg-white/[0.025] border-white/[0.06]"
                  : "bg-slate-50 border-slate-200"}`}>
                <FileX size={13} className={D ? "text-zinc-600" : "text-slate-400"} />
                <p className={`text-[9.5px] ${D ? "text-zinc-500" : "text-slate-500"}`}>
                  Aucune pièce jointe détectée pour cette dépense.
                </p>
              </div>

              {/* ── Mandatory checkbox ──────────────────────────────────── */}
              <label
                htmlFor="mrd-risk-checkbox"
                className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer select-none transition-all
                  ${isRiskAssumed
                    ? D
                      ? "bg-amber-500/[0.08] border-amber-500/35"
                      : "bg-amber-50 border-amber-300"
                    : D
                    ? "bg-white/[0.025] border-white/[0.07] hover:border-white/[0.12]"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
              >
                {/* Custom checkbox */}
                <div className="relative shrink-0 mt-0.5">
                  <input
                    id="mrd-risk-checkbox"
                    type="checkbox"
                    checked={isRiskAssumed}
                    onChange={e => setIsRiskAssumed(e.target.checked)}
                    className="sr-only"
                    aria-label="Je comprends et j'assume le risque"
                  />
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                    ${isRiskAssumed
                      ? "bg-amber-500 border-amber-500"
                      : D
                      ? "bg-transparent border-zinc-600"
                      : "bg-white border-slate-300"}`}>
                    {isRiskAssumed && (
                      <svg viewBox="0 0 12 10" className="w-3 h-3 fill-none stroke-white stroke-[2.5] stroke-linecap-round stroke-linejoin-round">
                        <polyline points="1.5,5 4.5,8 10.5,1" />
                      </svg>
                    )}
                  </div>
                </div>

                <span className={`text-[11px] font-semibold leading-snug ${
                  isRiskAssumed
                    ? D ? "text-amber-300" : "text-amber-700"
                    : D ? "text-zinc-400" : "text-slate-600"
                }`}>
                  Je comprends et j'assume le risque
                </span>
              </label>

              {/* ── Action buttons ──────────────────────────────────────── */}
              <div className="flex gap-3 pt-1">

                {/* Cancel */}
                <button
                  id="mrd-cancel"
                  onClick={onCancel}
                  className={`flex-1 py-3 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all active:scale-95
                    ${D
                      ? "bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200"
                      : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"}`}
                >
                  Annuler
                </button>

                {/* Save anyway — gated on checkbox */}
                <button
                  id="mrd-confirm"
                  onClick={() => { if (isRiskAssumed) onConfirm(); }}
                  disabled={!isRiskAssumed}
                  aria-disabled={!isRiskAssumed}
                  className={`flex-1 py-3 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all
                    ${isRiskAssumed
                      ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-[0_4px_20px_rgba(245,158,11,0.30)] hover:shadow-[0_4px_28px_rgba(245,158,11,0.45)] active:scale-95 cursor-pointer"
                      : D
                      ? "bg-white/[0.03] border border-white/[0.06] text-zinc-700 cursor-not-allowed"
                      : "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                >
                  Enregistrer quand même
                </button>
              </div>

              {/* Legal micro-copy */}
              <p className={`text-center text-[8.5px] leading-relaxed ${D ? "text-zinc-700" : "text-slate-400"}`}>
                Cette action sera consignée dans le journal d'audit AutoCompt.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
