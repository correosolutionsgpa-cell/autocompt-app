/**
 * MesRelevesGestion.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * "Mes relevés de gestion" — owner-side (Investisseur delegated-management)
 * counterpart to the invite/seal panel in PortefeuilleClientView.tsx
 * (Rama_Gestionnaires). Bank-statement model: the owner logs in and PULLS
 * their sealed statements on demand — no live notification/chat, nothing
 * pushed. See StatementLinkDoc/SealedStatementDoc in dataService.ts and
 * firestore.rules for the narrow, per-document access model (this account
 * never gets read access to the manager's raw books, only these sealed
 * summaries).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, FileDown, Loader2, Mail, CheckCircle2, Menu, Inbox } from "lucide-react";
import { auth } from "../lib/firebase";
import { dataService } from "../lib/dataService";
import type { StatementLinkDoc, SealedStatementDoc } from "../lib/dataService";
import { generateSealedStatementPDF } from "../lib/releveGestionPdf";

export interface MesRelevesGestionProps {
  darkMode: boolean;
  setVista: (v: string) => void;
  playNotificationSound?: () => void;
  sidebarToggle?: React.ReactNode;
  WorkspaceSidebar: React.ComponentType;
  adminName: string;
  /** The user's own companies — needed so they can pick which one a new invitation is for. */
  listaEmpresas: { id: string; nombre: string }[];
}

const MesRelevesGestion: React.FC<MesRelevesGestionProps> = ({
  darkMode, setVista, playNotificationSound, sidebarToggle, WorkspaceSidebar, adminName, listaEmpresas,
}) => {
  const [pendingLinks, setPendingLinks] = useState<StatementLinkDoc[]>([]);
  const [statements, setStatements] = useState<SealedStatementDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingLinkId, setAcceptingLinkId] = useState<string | null>(null);
  const [chosenCompanyId, setChosenCompanyId] = useState<string>(listaEmpresas[0]?.id || "");

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    const email = auth.currentUser?.email;
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    try {
      const [pending, sealed] = await Promise.all([
        email ? dataService.fetchPendingStatementLinksForEmail(email) : Promise.resolve([]),
        dataService.fetchSealedStatements(uid),
      ]);
      setPendingLinks(pending);
      setStatements(sealed);
    } catch (e) {
      console.error("[MesRelevesGestion] load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (link: StatementLinkDoc) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !chosenCompanyId) return;
    setAcceptingLinkId(link.id);
    try {
      await dataService.acceptStatementLink(uid, link, chosenCompanyId);
      playNotificationSound?.();
      await load();
    } catch (e) {
      console.error("[MesRelevesGestion] acceptStatementLink error:", e);
    } finally {
      setAcceptingLinkId(null);
    }
  };

  const handleDownload = (statement: SealedStatementDoc) => {
    const pdf = generateSealedStatementPDF(statement, adminName);
    pdf.save(`Releve_Gestion_${statement.period}.pdf`);
    playNotificationSound?.();
  };

  const glass = darkMode
    ? "bg-slate-900/40 border-white/[0.08] backdrop-blur-md"
    : "bg-white border-slate-200 shadow-sm";

  return (
    <div className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col font-sans md:pl-72`}>
      <WorkspaceSidebar />

      <header className={`${glass} px-6 py-4 border-b flex items-center gap-3 sticky top-0 z-40`}>
        {sidebarToggle || (
          <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white md:hidden">
            <Menu size={18} />
          </button>
        )}
        <button onClick={() => setVista("dossiers")} className={`p-2 transition-colors ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}>
          <ArrowLeft size={20} />
        </button>
        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
          <FileDown size={20} />
        </div>
        <div className="flex-1">
          <h1 className="font-black uppercase italic tracking-tighter text-lg leading-none">Mes relevés de gestion</h1>
          <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
            Reçus de votre gestionnaire — comme un relevé bancaire
          </p>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 size={20} className="animate-spin mr-2" /><span className="text-[11px] font-bold uppercase tracking-widest">Chargement…</span>
          </div>
        ) : (
          <>
            {pendingLinks.map((link) => (
              <div key={link.id} className={`p-5 rounded-[24px] border ${darkMode ? "bg-amber-900/10 border-amber-500/30" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-start gap-3 mb-3">
                  <Mail size={16} className={darkMode ? "text-amber-400 mt-0.5" : "text-amber-600 mt-0.5"} />
                  <p className={`text-[12px] font-bold ${darkMode ? "text-amber-300" : "text-amber-800"}`}>
                    Une gestora vous invite à consulter vos relevés de gestion via AutoCompt.
                  </p>
                </div>
                {listaEmpresas.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Pour quelle entreprise ?</label>
                    <select
                      value={chosenCompanyId}
                      onChange={(e) => setChosenCompanyId(e.target.value)}
                      className={`px-3 py-2 rounded-xl text-[11px] font-bold border outline-none ${darkMode ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-slate-200"}`}
                    >
                      {listaEmpresas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <button
                      onClick={() => handleAccept(link)}
                      disabled={acceptingLinkId === link.id || !chosenCompanyId}
                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-all"
                    >
                      {acceptingLinkId === link.id ? "…" : "Accepter"}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {statements.length === 0 && pendingLinks.length === 0 ? (
              <div className={`p-12 rounded-[28px] border flex flex-col items-center gap-3 text-center ${glass}`}>
                <Inbox size={36} className={darkMode ? "text-zinc-700" : "text-slate-200"} />
                <p className={`text-sm font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                  Aucun relevé pour l'instant — ils apparaîtront ici dès que votre gestionnaire en scellera un.
                </p>
              </div>
            ) : (
              statements.map((s) => (
                <div key={s.id} className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${glass}`}>
                  <div className="min-w-0">
                    <p className="text-[12px] font-black truncate">{s.period} — {s.companyName || s.gestionnaireName}</p>
                    <p className={`text-[9px] font-medium flex items-center gap-1 mt-0.5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                      <CheckCircle2 size={10} />Scellé le {new Date(s.sealedAt).toLocaleDateString("fr-CA")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(s)}
                    className={`shrink-0 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${darkMode ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}
                  >
                    <FileDown size={11} />PDF
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default MesRelevesGestion;
