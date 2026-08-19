import { AnimatePresence, motion } from "framer-motion";
import { Users, X } from "lucide-react";
import { usePendingInvites } from "../lib/PendingInvitesContext";

/**
 * Renders the "invitation en attente" modal at the document root (mounted
 * once in main.tsx, alongside <App />), so it appears no matter which
 * `vista` is active — same reason as GlobalToastHost. Was silent auto-accept
 * on every login before this (found 2026-08-18 via Daniel's QA report) —
 * the invitee never got a chance to say no.
 */
export function GlobalPendingInvitesHost() {
  const { pendingInvites, actioningIds, acceptInvite, declineInvite, setPendingInvites } = usePendingInvites();

  if (pendingInvites.length === 0) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60"
        onClick={() => setPendingInvites([])}
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm p-6 rounded-[28px] border shadow-2xl bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Users size={16} className="text-indigo-500" />
              Invitation{pendingInvites.length > 1 ? "s" : ""} en attente
            </h3>
            <button onClick={() => setPendingInvites([])} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {pendingInvites.map((invite) => {
              const isActioning = actioningIds.has(invite.id);
              return (
                <div
                  key={invite.id}
                  className="p-4 rounded-2xl border bg-slate-50 border-slate-200 dark:bg-zinc-950/50 dark:border-zinc-800"
                >
                  <p className="text-xs mb-3">
                    <strong>{invite.invitedByName || invite.invitedEmail}</strong> vous invite à rejoindre{" "}
                    <strong>{invite.companyName}</strong> en tant que collaborateur·rice.
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={isActioning}
                      onClick={() => declineInvite(invite)}
                      className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 disabled:opacity-50 font-black uppercase tracking-wider text-[10px]"
                    >
                      Refuser
                    </button>
                    <button
                      disabled={isActioning}
                      onClick={() => acceptInvite(invite)}
                      className="flex-1 py-2 bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-wider text-[10px]"
                    >
                      {isActioning ? "..." : "Accepter"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default GlobalPendingInvitesHost;
