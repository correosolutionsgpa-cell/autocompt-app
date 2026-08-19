import React, { createContext, useContext, useState } from "react";
import { auth } from "./firebase";
import { dataService, type CompanyInviteDoc } from "./dataService";

interface PendingInvitesContextValue {
  pendingInvites: CompanyInviteDoc[];
  setPendingInvites: (invites: CompanyInviteDoc[]) => void;
  actioningIds: Set<string>;
  acceptInvite: (invite: CompanyInviteDoc) => Promise<void>;
  declineInvite: (invite: CompanyInviteDoc) => Promise<void>;
  /** Bumped after a successful accept — App.tsx watches this to refresh its
   *  own workspace list (`listaEmpresas`), since that state lives inside
   *  App.tsx and this provider sits above it. */
  lastAcceptedAt: number;
}

const PendingInvitesContext = createContext<PendingInvitesContextValue | null>(null);

/**
 * Lives above <App /> so the invite-review modal is visible regardless of
 * which `vista` is active — same reason as ToastProvider (see
 * ToastContext.tsx): App.tsx renders 37+ distinct early-return screens with
 * no shared wrapper. Was silent auto-accept on every login before this
 * (found 2026-08-18 via Daniel's QA report) — the invitee never got a
 * chance to say no.
 */
export function PendingInvitesProvider({ children }: { children: React.ReactNode }) {
  const [pendingInvites, setPendingInvites] = useState<CompanyInviteDoc[]>([]);
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());
  const [lastAcceptedAt, setLastAcceptedAt] = useState(0);

  const acceptInvite = async (invite: CompanyInviteDoc) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setActioningIds((prev) => new Set(prev).add(invite.id));
    try {
      await dataService.acceptCompanyInvite(uid, invite);
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));
      setLastAcceptedAt(Date.now());
    } catch (err) {
      console.error("Failed to accept invite:", err);
      alert("Erreur lors de l'acceptation de l'invitation.");
    } finally {
      setActioningIds((prev) => { const next = new Set(prev); next.delete(invite.id); return next; });
    }
  };

  const declineInvite = async (invite: CompanyInviteDoc) => {
    setActioningIds((prev) => new Set(prev).add(invite.id));
    try {
      await dataService.declineCompanyInvite(invite);
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      console.error("Failed to decline invite:", err);
      alert("Erreur lors du refus de l'invitation.");
    } finally {
      setActioningIds((prev) => { const next = new Set(prev); next.delete(invite.id); return next; });
    }
  };

  return (
    <PendingInvitesContext.Provider
      value={{ pendingInvites, setPendingInvites, actioningIds, acceptInvite, declineInvite, lastAcceptedAt }}
    >
      {children}
    </PendingInvitesContext.Provider>
  );
}

export function usePendingInvites(): PendingInvitesContextValue {
  const ctx = useContext(PendingInvitesContext);
  if (!ctx) throw new Error("usePendingInvites must be used within a PendingInvitesProvider");
  return ctx;
}
