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
import StyledSelect from "./ui/StyledSelect";
import { ArrowLeft, FileDown, Loader2, Mail, CheckCircle2, Menu, Inbox, Send, Clock, XCircle, Plus, Paperclip, X } from "lucide-react";
import { auth } from "../lib/firebase";
import { dataService } from "../lib/dataService";
import type { StatementLinkDoc, SealedStatementDoc, SharedLedgerEntryDoc, SharedLedgerPendingItemDoc } from "../lib/dataService";
import { generateSealedStatementPDF } from "../lib/releveGestionPdf";

const fmtCAD = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

export interface MesRelevesGestionProps {
  darkMode: boolean;
  setVista: (v: string) => void;
  goBack: () => void;
  playNotificationSound?: () => void;
  sidebarToggle?: React.ReactNode;
  WorkspaceSidebar: React.ComponentType;
  adminName: string;
  /** The user's own companies — needed so they can pick which one a new invitation is for. */
  listaEmpresas: { id: string; nombre: string }[];
}

const MesRelevesGestion: React.FC<MesRelevesGestionProps> = ({
  darkMode, setVista, goBack, playNotificationSound, sidebarToggle, WorkspaceSidebar, adminName, listaEmpresas,
}) => {
  const [pendingLinks, setPendingLinks] = useState<StatementLinkDoc[]>([]);
  const [statements, setStatements] = useState<SealedStatementDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingLinkId, setAcceptingLinkId] = useState<string | null>(null);
  const [chosenCompanyId, setChosenCompanyId] = useState<string>(listaEmpresas[0]?.id || "");

  // ── Registre partagé en direct — extension au-delà des relevés scellés
  //    périodiques (voir SharedLedgerReviewPanel côté gestionnaire pour le
  //    même canal, vu de l'autre côté). ──────────────────────────────────────
  const [acceptedLinks, setAcceptedLinks] = useState<StatementLinkDoc[]>([]);
  const [sharedEntries, setSharedEntries] = useState<SharedLedgerEntryDoc[]>([]);
  const [myPendingItems, setMyPendingItems] = useState<SharedLedgerPendingItemDoc[]>([]);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitLinkId, setSubmitLinkId] = useState("");
  const [submitForm, setSubmitForm] = useState({ date: new Date().toISOString().slice(0, 10), description: "", amount: "" });
  const [submitting, setSubmitting] = useState(false);
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [compressingReceipt, setCompressingReceipt] = useState(false);
  const [mirroredEntryIds, setMirroredEntryIds] = useState<Set<string>>(new Set());
  const [acceptingEntryId, setAcceptingEntryId] = useState<string | null>(null);
  const [acceptEntryError, setAcceptEntryError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    const email = auth.currentUser?.email;
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    try {
      const [pending, sealed, accepted, entries, myItems] = await Promise.all([
        email ? dataService.fetchPendingStatementLinksForEmail(email) : Promise.resolve([]),
        dataService.fetchSealedStatements(uid),
        dataService.fetchAcceptedStatementLinksForOwner(uid),
        dataService.fetchSharedLedgerEntriesForOwner(uid),
        dataService.fetchPendingItemsForOwner(uid),
      ]);
      setPendingLinks(pending);
      setStatements(sealed);
      setAcceptedLinks(accepted);
      setSharedEntries(entries);
      setMyPendingItems(myItems);
      if (!submitLinkId && accepted.length > 0) setSubmitLinkId(accepted[0].id);

      // Which mirrored entries already exist as real records in the owner's
      // own book(s) — a link can be tied to more than one of the owner's
      // companies, so this checks every distinct linkedOwnerCompanyId once.
      const companyIds = Array.from(new Set(accepted.map((l) => l.linkedOwnerCompanyId).filter((c): c is string => !!c)));
      if (companyIds.length > 0) {
        const sets = await Promise.all(companyIds.map((cid) => dataService.fetchMirroredEntryIds(uid, cid)));
        setMirroredEntryIds(new Set(sets.flatMap((s) => Array.from(s))));
      }
    } catch (e) {
      console.error("[MesRelevesGestion] load error:", e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleReceiptFile = (file: File) => {
    setCompressingReceipt(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Stocké directement sur le document Firestore (limite 1 Mo) — on
        // redimensionne côté client pour rester bien en dessous tout en
        // gardant le texte du reçu lisible (voir même motif pour le logo
        // dans SettingsView.tsx, avec une dimension max plus grande ici).
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setReceiptDataUrl(rawDataUrl);
          setCompressingReceipt(false);
          return;
        }
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setReceiptDataUrl(canvas.toDataURL("image/jpeg", 0.72));
        setCompressingReceipt(false);
      };
      img.onerror = () => setCompressingReceipt(false);
      img.src = rawDataUrl;
    };
    reader.onerror = () => setCompressingReceipt(false);
    reader.readAsDataURL(file);
    setReceiptFileName(file.name);
  };

  const handleSubmitDocument = async () => {
    const uid = auth.currentUser?.uid;
    const link = acceptedLinks.find((l) => l.id === submitLinkId);
    if (!uid || !link || !link.linkedOwnerUid || !submitForm.description.trim() || !submitForm.amount) return;
    setSubmitting(true);
    try {
      await dataService.submitSharedLedgerPendingItem(uid, {
        statementLinkId: link.id,
        gestionnaireCompanyId: link.gestionnaireCompanyId,
        gestionnaireOwnerId: link.gestionnaireOwnerId,
        fideicommisClientId: link.fideicommisClientId,
        linkedOwnerUid: link.linkedOwnerUid,
        date: submitForm.date,
        description: submitForm.description.trim(),
        amount: parseFloat(submitForm.amount),
        ...(receiptDataUrl ? { receiptUrl: receiptDataUrl } : {}),
      });
      setShowSubmitForm(false);
      setSubmitForm({ date: new Date().toISOString().slice(0, 10), description: "", amount: "" });
      setReceiptDataUrl(null);
      setReceiptFileName(null);
      playNotificationSound?.();
      await load();
    } catch (e) {
      console.error("[MesRelevesGestion] submitSharedLedgerPendingItem error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptEntry = async (entry: SharedLedgerEntryDoc) => {
    const uid = auth.currentUser?.uid;
    const link = acceptedLinks.find((l) => l.id === entry.statementLinkId);
    if (!uid || !link?.linkedOwnerCompanyId) return;
    setAcceptingEntryId(entry.id);
    setAcceptEntryError(null);
    try {
      await dataService.acceptSharedLedgerEntryIntoOwnBook(uid, entry, link.linkedOwnerCompanyId);
      setMirroredEntryIds((prev) => new Set(prev).add(entry.id));
      playNotificationSound?.();
    } catch (e: any) {
      // Reusing saveExpense/saveInvoice means this inherits the SAME access
      // gate as every other write in the app (assertCanWrite) — an expired
      // trial surfaces here as this exact error, same as everywhere else.
      setAcceptEntryError(
        e?.message === "TRIAL_EXPIRED"
          ? "Votre accès AutoCompt est expiré — vous pouvez toujours consulter ce registre, mais l'enregistrer dans votre propre comptabilité nécessite un accès actif."
          : "Échec de l'enregistrement. Réessayez."
      );
    } finally {
      setAcceptingEntryId(null);
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
        <button onClick={goBack} className={`p-2 transition-colors ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}>
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
                    <StyledSelect
                      darkMode={darkMode}
                      value={chosenCompanyId}
                      onChange={setChosenCompanyId}
                      options={listaEmpresas.map((c) => ({ value: c.id, label: c.nombre }))}
                    />
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

            {acceptedLinks.length > 0 && (
              <div className={`p-5 rounded-[24px] border space-y-3 ${glass}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Inbox size={16} className="text-indigo-500" />
                    <h2 className="text-[11px] font-black uppercase tracking-widest">Registre partagé en direct</h2>
                  </div>
                  <button
                    onClick={() => setShowSubmitForm((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white transition-all"
                  >
                    <Plus size={11} />Soumettre un document
                  </button>
                </div>

                {showSubmitForm && (
                  <div className={`p-4 rounded-2xl border space-y-2.5 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                    {acceptedLinks.length > 1 && (
                      <StyledSelect
                        darkMode={darkMode}
                        value={submitLinkId}
                        onChange={setSubmitLinkId}
                        options={acceptedLinks.map((l) => ({ value: l.id, label: l.gestionnaireCompanyId }))}
                      />
                    )}
                    <input
                      type="date"
                      value={submitForm.date}
                      onChange={(e) => setSubmitForm({ ...submitForm, date: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${darkMode ? "bg-zinc-950/50 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
                    />
                    <input
                      type="text"
                      value={submitForm.description}
                      onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })}
                      placeholder="Description *"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${darkMode ? "bg-zinc-950/50 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
                    />
                    <input
                      type="number"
                      value={submitForm.amount}
                      onChange={(e) => setSubmitForm({ ...submitForm, amount: e.target.value })}
                      placeholder="Montant ($) *"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${darkMode ? "bg-zinc-950/50 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
                    />

                    {receiptDataUrl ? (
                      <div className={`flex items-center gap-3 p-2.5 rounded-xl border ${darkMode ? "bg-zinc-950/50 border-zinc-800" : "bg-white border-slate-200"}`}>
                        <img src={receiptDataUrl} alt="Reçu" className="w-11 h-11 rounded-lg object-cover shrink-0 border border-black/10" />
                        <span className={`flex-1 text-[10px] font-bold truncate ${darkMode ? "text-zinc-300" : "text-slate-600"}`}>{receiptFileName || "Pièce jointe"}</span>
                        <button
                          onClick={() => { setReceiptDataUrl(null); setReceiptFileName(null); }}
                          className={`shrink-0 p-1.5 rounded-lg ${darkMode ? "text-zinc-500 hover:text-white hover:bg-zinc-800" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"}`}
                          title="Retirer la pièce jointe"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <label className={`flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-dashed text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${darkMode ? "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200" : "border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700"}`}>
                        {compressingReceipt ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
                        {compressingReceipt ? "Traitement…" : "Joindre une photo du reçu"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={compressingReceipt}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleReceiptFile(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}

                    <button
                      disabled={!submitForm.description.trim() || !submitForm.amount || submitting || compressingReceipt}
                      onClick={handleSubmitDocument}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                    >
                      <Send size={11} />{submitting ? "Envoi…" : "Envoyer à mon gestionnaire"}
                    </button>
                  </div>
                )}

                {myPendingItems.length > 0 && (
                  <div className="space-y-1.5">
                    <p className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Mes envois</p>
                    {myPendingItems.slice(0, 6).map((item) => (
                      <div key={item.id} className={`flex items-center justify-between gap-2 text-[10px] px-3 py-2 rounded-xl ${darkMode ? "bg-zinc-900/40" : "bg-slate-50"}`}>
                        <span className="truncate flex items-center gap-1.5">
                          {item.receiptUrl && <Paperclip size={10} className={darkMode ? "text-zinc-500" : "text-slate-400"} />}
                          {item.date} · {item.description} · {fmtCAD(item.amount)}
                        </span>
                        {item.status === "pending" && <span className="flex items-center gap-1 text-amber-500 shrink-0"><Clock size={10} />En attente</span>}
                        {item.status === "approved" && <span className="flex items-center gap-1 text-emerald-500 shrink-0"><CheckCircle2 size={10} />Approuvé</span>}
                        {item.status === "rejected" && <span className="flex items-center gap-1 text-rose-500 shrink-0"><XCircle size={10} />Rejeté</span>}
                      </div>
                    ))}
                  </div>
                )}

                {acceptEntryError && (
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 px-1">{acceptEntryError}</p>
                )}
                {sharedEntries.length === 0 ? (
                  <p className={`text-[11px] font-medium ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Aucun mouvement partagé par votre gestionnaire pour l'instant.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {sharedEntries.slice(0, 8).map((e) => {
                      const link = acceptedLinks.find((l) => l.id === e.statementLinkId);
                      const alreadyAccepted = mirroredEntryIds.has(e.id);
                      return (
                        <div key={e.id} className={`flex items-center justify-between gap-2 text-[10px] px-3 py-2 rounded-xl ${darkMode ? "bg-zinc-900/40" : "bg-slate-50"}`}>
                          <span className="truncate">{e.date} · {e.description}{e.buildingAddress ? ` · ${e.buildingAddress}` : ""}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`font-bold ${e.direction === "revenue" ? "text-emerald-500" : "text-rose-500"}`}>{fmtCAD(e.amount)}</span>
                            {link?.linkedOwnerCompanyId && (
                              alreadyAccepted ? (
                                <span className="flex items-center gap-1 text-emerald-500" title="Déjà dans votre comptabilité">
                                  <CheckCircle2 size={11} />
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleAcceptEntry(e)}
                                  disabled={acceptingEntryId === e.id}
                                  title="Enregistrer ce mouvement dans ma propre comptabilité — évite de le retaper"
                                  className="px-2 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50 transition-all"
                                >
                                  {acceptingEntryId === e.id ? "…" : "Accepter"}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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
