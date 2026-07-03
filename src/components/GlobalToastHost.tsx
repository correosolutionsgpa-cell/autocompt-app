import { AnimatePresence, motion } from "framer-motion";
import { Mail, MessageSquare, X } from "lucide-react";
import { useToast } from "../lib/ToastContext";

/**
 * Renders the dispatcher/traceability toast at the document root (mounted once
 * in main.tsx, alongside <App />), so it appears no matter which `vista` is
 * active — unlike its previous home inside RapportComptable.tsx, which was
 * only mounted while viewing that one report.
 */
export function GlobalToastHost() {
  const { dispatcherSuccessToast, setDispatcherSuccessToast } = useToast();

  return (
    <AnimatePresence>
      {dispatcherSuccessToast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-[200] max-w-sm"
        >
          <div
            className={`p-4 rounded-[22px] border shadow-2xl flex items-center space-x-3.5 ${
              dispatcherSuccessToast.channel === "Tenue de Livres"
                ? "bg-[#FAF9F6] border-amber-300 text-slate-805 shadow-amber-950/10 dark:bg-zinc-950 dark:border-amber-950/45 dark:text-white dark:shadow-amber-950/25"
                : "bg-[#FAF9F6] border-emerald-200 text-slate-805 shadow-emerald-950/10 dark:bg-zinc-950 dark:border-emerald-950/45 dark:text-white dark:shadow-emerald-950/25"
            }`}
          >
            {dispatcherSuccessToast.channel === "Tenue de Livres" ? (
              <img
                src="/sofi/Estado_de__Error___Advertencia.jpeg"
                alt="S.O.F.I. — état d'erreur"
                className="w-11 h-11 rounded-xl object-cover shrink-0"
              />
            ) : dispatcherSuccessToast.channel === "Par Email" ? (
              <div className="p-2.5 bg-emerald-500/15 rounded-xl text-emerald-500 shrink-0">
                <Mail size={16} />
              </div>
            ) : dispatcherSuccessToast.channel === "Par WhatsApp" ? (
              <div className="p-2.5 bg-emerald-500/15 rounded-xl text-emerald-500 shrink-0">
                <MessageSquare size={16} />
              </div>
            ) : (
              <img
                src="/sofi/La_pose__Sofi_con_exito.jpeg"
                alt="S.O.F.I. — état de succès"
                className="w-11 h-11 rounded-xl object-cover shrink-0"
              />
            )}
            <div className="text-left flex-1 min-w-0">
              <span
                className={`block text-[8px] font-black uppercase italic tracking-widest leading-none ${
                  dispatcherSuccessToast.channel === "Tenue de Livres" ? "text-amber-600 dark:text-amber-400" : "text-[#059669]"
                }`}
              >
                {dispatcherSuccessToast.channel === "Tenue de Livres"
                  ? "S.O.F.I. — Alerte"
                  : dispatcherSuccessToast.customMessage
                  ? "IA Document Scanner"
                  : "Trazabilidad de Envío"}
              </span>
              <p className="text-[10px] font-bold mt-1.5 leading-relaxed tracking-tight text-slate-700 dark:text-zinc-200">
                {dispatcherSuccessToast.customMessage ?? dispatcherSuccessToast.text}
              </p>
              {dispatcherSuccessToast.actionText && dispatcherSuccessToast.onAction && (
                <button
                  onClick={() => {
                    dispatcherSuccessToast.onAction!();
                    setDispatcherSuccessToast(null);
                  }}
                  className="mt-2 text-[9px] font-black uppercase italic underline text-[#059669] hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                >
                  {dispatcherSuccessToast.actionText}
                </button>
              )}
            </div>
            <button
              onClick={() => setDispatcherSuccessToast(null)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-850 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default GlobalToastHost;
