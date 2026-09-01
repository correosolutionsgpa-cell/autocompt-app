import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/**
 * Reusable "container transform" card — a compact preview that morphs into a
 * fullscreen panel on tap, instead of the panel appearing as a separate
 * overlay. Uses Framer Motion's shared layoutId so the SAME element visually
 * grows from its card position to fill the screen (the effect Fabiola
 * referenced from a Bible app's "verset du jour" card, 2026-08-31) — not a
 * generic modal fade-in.
 *
 * Deliberately content-agnostic: `compact` is always visible (the part worth
 * seeing at a glance without tapping — e.g. date/amount/status), `children`
 * is the detail content only shown once expanded (the part that makes a list
 * of these feel like a long "sausage" when every card shows everything at
 * once). Callers keep full control of their own state/handlers — this
 * component only owns whether it's open, nothing about what's inside.
 */
export default function ExpandableCard({
  cardId,
  isExpanded,
  onExpand,
  onCollapse,
  darkMode,
  cardClassName = "",
  compact,
  children,
}: {
  cardId: string;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  darkMode: boolean;
  /** Extra classes for the card's border/background — status-color coding
   *  (e.g. amber for "need_receipt") stays with the caller, not baked in here. */
  cardClassName?: string;
  compact: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <motion.div
        layoutId={cardId}
        onClick={onExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onExpand(); }}
        className={`p-6 rounded-[36px] border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${cardClassName}`}
      >
        {compact}
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCollapse}
            className="fixed inset-0 z-[300] flex items-start sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              layoutId={cardId}
              onClick={(e) => e.stopPropagation()}
              className={`w-full sm:max-w-lg max-h-full sm:max-h-[85vh] overflow-y-auto rounded-none sm:rounded-[36px] border p-6 space-y-4 ${cardClassName}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">{compact}</div>
                <button
                  onClick={onCollapse}
                  className={`shrink-0 p-2 rounded-xl border transition-transform active:scale-90 ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-300" : "bg-white border-slate-200 text-slate-600"}`}
                  title="Fermer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">{children}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
