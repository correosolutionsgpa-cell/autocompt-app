/**
 * PortefeuilleClientsComptableView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Comptables
 * Module: Portefeuille Clients (comptable)
 *
 * Vue du portefeuille d'un comptable qui tient les livres de plusieurs
 * clients (petites entreprises génériques, pas nécessairement immobilier)
 * depuis un seul compte AutoCompt.
 *
 * Presque tout le chrome (liste de clients, KPIs revenus/dépenses/solde,
 * layout) vient de ../shared/ClientPortfolioShell, partagé avec le
 * portefeuille du Gestionnaire (Rama_Gestionnaires/PortefeuilleClientView).
 * Ce fichier n'ajoute que ce qui est propre au comptable : le formulaire
 * "Nouveau client", les propriétés d'un client (chacune avec son propre
 * livre indépendant — même principe que pour le Gestionnaire) et le lien
 * générique vers la Tenue de Livres pour les clients sans propriété.
 *
 * Propriétés: réutilise intégralement PropertyDoc/UnitDoc et
 * TenueLivresImmeubleView (le même système que Gestion Immobilière) via une
 * nouvelle FK `bookkeepingClientId` — PAS le module `gestion_immo` complet:
 * le comptable a seulement besoin d'un "bucket" de livre par propriété, pas
 * de gérer les locataires/loyers.
 *
 * MVP restant: le lien "Tenue de Livres" générique (pour un client SANS
 * propriété) ouvre la vue générale (vista "reportes") sans filtrer par
 * client — le filtrage dépend de l'étiquetage `clientId` sur les
 * dépenses/factures, pas encore branché dans leurs formulaires (tâche de
 * suivi séparée).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import { Briefcase, BookOpen, X, Home, Plus, Link2, Loader2, TrendingUp, TrendingDown, Scale, ShieldCheck } from "lucide-react";
import { auth } from "../../lib/firebase";
import { dataService } from "../../lib/dataService";
import type { BookkeepingClientDoc, BookkeepingClientTypeEntite, PropertyDoc } from "../../lib/dataService";
import ClientPortfolioShell, { type ClientPortfolioAggregate, fmtCAD } from "../shared/ClientPortfolioShell";

export interface PortefeuilleClientsComptableViewProps {
  darkMode: boolean;
  activeCompanyId: string;
  currentCompany: any;
  adminName: string;
  adminEmail: string;
  setSelectedLedgerBuildingId: (id: string) => void;
  setVista: (v: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  WorkspaceSidebar: React.ComponentType;
}

/** Lightweight — no units/tenants/rent tracking, just an address list, since
 *  the comptable only needs a ledger bucket per property, not to manage it. */
interface ComptableExtra {
  properties: PropertyDoc[];
  /** Present only once this client has been linked to their OWN real
   *  AutoCompt company (see BookkeepingClientDoc.linkedCompanyDocId) — real
   *  numbers read as a collaborator, not the comptable's internal records. */
  linked?: {
    companyDocId: string;
    revenue: number;
    expenses: number;
    balance: number;
    properties: PropertyDoc[];
  };
}

const emptyExtra: ComptableExtra = { properties: [] };

const TYPE_ENTITE_LABELS: Record<BookkeepingClientTypeEntite, string> = {
  autonome: "Propriétaire autogéré",
  inc: "Société (INC)",
  gestion_tierce: "Sous gestion d'un gestionnaire",
};

type Agg = ClientPortfolioAggregate<BookkeepingClientDoc, ComptableExtra>;

const PortefeuilleClientsComptableView: React.FC<PortefeuilleClientsComptableViewProps> = ({
  darkMode,
  activeCompanyId,
  setSelectedLedgerBuildingId,
  setVista,
  setIsSidebarOpen,
  WorkspaceSidebar,
}) => {
  const [reloadKey, setReloadKey] = useState(0);
  const [showClientForm, setShowClientForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clientForm, setClientForm] = useState<{ nom: string; email: string; telephone: string; typeEntite: BookkeepingClientTypeEntite | "" }>({ nom: "", email: "", telephone: "", typeEntite: "" });

  // Which client's "Ajouter une propriété" mini-form is open (client id, or "" = closed).
  const [propertyFormClientId, setPropertyFormClientId] = useState("");
  const [propertyForm, setPropertyForm] = useState({ adresse: "", typeLocation: "Logement entier" });

  // Which client's "Lier à un compte client existant" modal is open (client, or null = closed).
  const [linkingClient, setLinkingClient] = useState<Agg | null>(null);
  const [collaboratorCompanies, setCollaboratorCompanies] = useState<any[]>([]);
  const [loadingCollab, setLoadingCollab] = useState(false);
  const [selectedLinkDocId, setSelectedLinkDocId] = useState("");

  const handleOpenLinkModal = async (client: Agg) => {
    setLinkingClient(client);
    setSelectedLinkDocId(client.linkedCompanyDocId || "");
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoadingCollab(true);
    try {
      setCollaboratorCompanies(await dataService.fetchCollaboratorCompanies(uid));
    } catch (e) {
      console.error("[PortefeuilleClientsComptableView] fetchCollaboratorCompanies error:", e);
    } finally {
      setLoadingCollab(false);
    }
  };

  const handleConfirmLink = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !linkingClient || !selectedLinkDocId) return;
    const company = collaboratorCompanies.find((c) => c._companyDocId === selectedLinkDocId);
    setIsSaving(true);
    try {
      await dataService.saveClient(uid, {
        id: linkingClient.id,
        companyId: linkingClient.companyId,
        nom: linkingClient.nom,
        linkedCompanyDocId: selectedLinkDocId,
        linkedCompanyName: company?.nombre || company?.nom || "",
      });
      setLinkingClient(null);
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error("[PortefeuilleClientsComptableView] link client error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlink = async (client: Agg) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setIsSaving(true);
    try {
      // setDoc({merge:true}) never removes a field that's merely absent from
      // the payload — saveClient strips `undefined` keys before writing, so
      // sending undefined here would silently leave the old link in place.
      // Empty strings write through normally and every check in this file
      // already treats an empty linkedCompanyDocId as "not linked".
      await dataService.saveClient(uid, {
        id: client.id,
        companyId: client.companyId,
        nom: client.nom,
        linkedCompanyDocId: "",
        linkedCompanyName: "",
      });
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error("[PortefeuilleClientsComptableView] unlink client error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClient = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !clientForm.nom.trim() || !activeCompanyId) return;
    setIsSaving(true);
    try {
      await dataService.saveClient(uid, {
        companyId: activeCompanyId,
        nom: clientForm.nom.trim(),
        email: clientForm.email.trim(),
        telephone: clientForm.telephone.trim() || undefined,
        typeEntite: clientForm.typeEntite || undefined,
      });
      setShowClientForm(false);
      setClientForm({ nom: "", email: "", telephone: "", typeEntite: "" });
      // ClientPortfolioShell fetches on mount/activeCompanyId change — bump a
      // key to force it to re-fetch after adding a client, same effect as a
      // route change without actually navigating away.
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error("[PortefeuilleClientsComptableView] save client error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProperty = async (client: Agg) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !propertyForm.adresse.trim() || !activeCompanyId) return;
    setIsSaving(true);
    try {
      const saved = await dataService.saveProperty(uid, {
        id: `prop_${Date.now()}`,
        companyId: activeCompanyId,
        typeLocation: propertyForm.typeLocation,
        adresse: propertyForm.adresse.trim(),
        status: "Actif",
        bookkeepingClientId: client.id,
        bookkeepingClientName: client.nom,
      });
      // Same "always create a placeholder unit" convention GestionPlex.tsx
      // uses when a property is created — TenueLivresImmeubleView expects a
      // units array to exist, even if empty of real tenant data for now.
      await dataService.saveUnit(uid, {
        id: `unit_${Date.now()}`,
        companyId: activeCompanyId,
        buildingId: saved.id,
        unitName: "Unité principale",
        tenantName: "",
        monthlyRent: 0,
        isActive: false,
      });
      setPropertyFormClientId("");
      setPropertyForm({ adresse: "", typeLocation: "Logement entier" });
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error("[PortefeuilleClientsComptableView] save property error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchExtra = async ({
    uid,
    activeCompanyId: companyId,
    clients,
  }: {
    uid: string;
    activeCompanyId: string;
    clients: BookkeepingClientDoc[];
    period: string;
  }): Promise<Record<string, ComptableExtra>> => {
    const props = await dataService.fetchProperties(uid);
    const companyProps = props.filter((p) => p.companyId === companyId);
    const result: Record<string, ComptableExtra> = {};
    for (const client of clients) {
      result[client.id] = {
        properties: companyProps.filter((p) => p.bookkeepingClientId === client.id),
      };
    }

    // Linked clients — real data read as a collaborator on their OWN
    // company, via the exact same collaboratorCompanyDocIds plumbing
    // fetchProperties/fetchExpenses/fetchInvoices already support for
    // shared workspaces. Fetched one linked client at a time (not batched
    // together) because fetchExpenses/fetchInvoices UNPREFIX companyId back
    // to the short per-account id (e.g. "1") in their return value — two
    // different linked accounts can both use "1", so attributing a batched
    // result back to the right client afterward would be ambiguous. Each
    // per-client Firestore query is still precisely scoped by the real
    // doc id, so this is correct, just not merged into one round trip.
    const linkedClients = clients.filter((c) => !!c.linkedCompanyDocId);
    if (linkedClients.length > 0) {
      await Promise.all(linkedClients.map(async (client) => {
        const docId = client.linkedCompanyDocId!;
        const [lProps, lExp, lInv] = await Promise.all([
          dataService.fetchProperties(uid, [docId]),
          dataService.fetchExpenses(uid, [docId]),
          dataService.fetchInvoices(uid, [docId]),
        ]);
        const revenue = lInv.reduce((s, i) => s + (i.total || 0), 0);
        const expenses = lExp.reduce((s, e) => s + (e.total || 0), 0);
        result[client.id] = {
          ...result[client.id],
          linked: { companyDocId: docId, revenue, expenses, balance: revenue - expenses, properties: lProps },
        };
      }));
    }

    return result;
  };

  return (
    <>
      <ClientPortfolioShell<BookkeepingClientDoc, ComptableExtra>
        key={reloadKey}
        darkMode={darkMode}
        activeCompanyId={activeCompanyId}
        setIsSidebarOpen={setIsSidebarOpen}
        WorkspaceSidebar={WorkspaceSidebar}
        setVista={setVista}
        title="Portefeuille Clients"
        subtitle="Tenue de livres par client"
        headerIcon={<Briefcase size={20} />}
        backVista="dashboard"
        accentColor="blue"
        fetchClients={dataService.fetchClients}
        fetchExtra={fetchExtra}
        emptyExtra={emptyExtra}
        onAddClient={() => setShowClientForm(true)}
        hideGenericKpisFor={(a: Agg) => !!a.extra.linked}
        extraKpis={(a: Agg) => a.extra.linked ? [
          { label: "Revenus (compte lié)", value: fmtCAD(a.extra.linked.revenue), icon: <TrendingUp size={16} />, color: "emerald" },
          { label: "Dépenses (compte lié)", value: fmtCAD(a.extra.linked.expenses), icon: <TrendingDown size={16} />, color: "rose" },
          { label: "Solde net (compte lié)", value: fmtCAD(a.extra.linked.balance), icon: <Scale size={16} />, color: "blue" },
        ] : []}
        renderHeaderBadge={(a: Agg) => (
          <>
            {a.typeEntite && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${darkMode ? "bg-blue-900/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                {TYPE_ENTITE_LABELS[a.typeEntite]}
              </span>
            )}
            {a.extra.linked ? (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${darkMode ? "bg-emerald-900/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                <ShieldCheck size={10} />Compte lié — données réelles
              </span>
            ) : (
              <button
                onClick={() => handleOpenLinkModal(a)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${darkMode ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
              >
                <Link2 size={10} />Lier à un compte client existant
              </button>
            )}
          </>
        )}
        renderListBadges={(a: Agg) => (
          <>
            {a.extra.linked && (
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${darkMode ? "bg-emerald-900/20 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                <ShieldCheck size={8} />Compte lié
              </span>
            )}
            {a.extra.properties.length > 0 && (
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${darkMode ? "bg-zinc-800 text-zinc-500" : "bg-slate-100 text-slate-500"}`}>
                {a.extra.properties.length} propriété(s)
              </span>
            )}
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${darkMode ? "bg-zinc-800 text-zinc-500" : "bg-slate-100 text-slate-500"}`}>
              {a.nbTransactions} transaction(s)
            </span>
          </>
        )}
        renderDetailBody={(a: Agg) => (
          <>
            {a.extra.linked && (
              <div className={`p-4 rounded-2xl border space-y-2 ${darkMode ? "bg-emerald-900/10 border-emerald-800/30" : "bg-emerald-50/50 border-emerald-200"}`}>
                <div className="flex items-center justify-between">
                  <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                    <ShieldCheck size={11} />Compte client lié — {a.linkedCompanyName || "compte réel"}
                  </p>
                  <button
                    onClick={() => handleUnlink(a)}
                    className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500 hover:text-rose-400" : "text-slate-400 hover:text-rose-600"}`}
                  >
                    Délier
                  </button>
                </div>
                {a.extra.linked.properties.length > 0 && (
                  <div className="space-y-1.5">
                    {a.extra.linked.properties.map((p) => (
                      <div key={p.id} className={`flex items-center gap-2 text-[11px] ${darkMode ? "text-zinc-300" : "text-slate-700"}`}>
                        <Home size={11} className={darkMode ? "text-zinc-500" : "text-slate-400"} />
                        <span className="truncate">{p.adresse}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                  Propriétés internes ({a.extra.properties.length})
                </h3>
                <button
                  onClick={() => setPropertyFormClientId(propertyFormClientId === a.id ? "" : a.id)}
                  className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 flex items-center gap-1"
                >
                  <Plus size={10} />Ajouter une propriété
                </button>
              </div>

              {a.extra.properties.length > 0 && (
                <div className="space-y-2 mb-3">
                  {a.extra.properties.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl border ${darkMode ? "bg-slate-900/40 border-white/[0.08]" : "bg-white border-slate-200"}`}
                    >
                      <div className={`p-2 rounded-xl ${darkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"}`}>
                        <Home size={14} />
                      </div>
                      <p className="flex-1 min-w-0 text-[12px] font-bold truncate">{p.adresse}</p>
                      <button
                        onClick={() => { setSelectedLedgerBuildingId(p.id); setVista("tenue_livres_immeuble"); }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${darkMode ? "border-blue-700/40 text-blue-400 hover:bg-blue-900/20" : "border-blue-200 text-blue-600 hover:bg-blue-50"}`}
                      >
                        <BookOpen size={10} />Ouvrir le livre
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {propertyFormClientId === a.id && (
                <div className={`p-4 rounded-2xl border space-y-2.5 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                  <input
                    type="text"
                    value={propertyForm.adresse}
                    onChange={(e) => setPropertyForm({ ...propertyForm, adresse: e.target.value })}
                    placeholder="Adresse de la propriété *"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${darkMode ? "bg-zinc-950/50 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
                  />
                  <select
                    value={propertyForm.typeLocation}
                    onChange={(e) => setPropertyForm({ ...propertyForm, typeLocation: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${darkMode ? "bg-zinc-950/50 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
                  >
                    <option value="Logement entier">Logement entier</option>
                    <option value="Immeuble à revenus">Immeuble à revenus</option>
                    <option value="Chalet">Chalet</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                  <button
                    disabled={!propertyForm.adresse.trim() || isSaving}
                    onClick={() => handleSaveProperty(a)}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    {isSaving ? "Enregistrement..." : "Ajouter la propriété"}
                  </button>
                </div>
              )}
            </div>

            {a.extra.properties.length === 0 && (
              <button
                onClick={() => setVista("reportes")}
                className={`w-full sm:w-auto flex items-center gap-2 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${darkMode ? "border-blue-700/40 text-blue-400 hover:bg-blue-900/20" : "border-blue-200 text-blue-600 hover:bg-blue-50"}`}
              >
                <BookOpen size={14} />Aller à la Tenue de Livres de {a.nom}
              </button>
            )}
          </>
        )}
      />

      {linkingClient && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60"
          onClick={() => !isSaving && setLinkingClient(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md p-6 rounded-[28px] border shadow-2xl ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Link2 size={16} className="text-blue-500" />
                Lier {linkingClient.nom}
              </h3>
              <button onClick={() => setLinkingClient(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <p className={`text-[11px] leading-relaxed mb-4 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
              Demandez à votre client, depuis sa propre entreprise, d'aller dans son menu d'espace de travail → <strong>« Inviter un associé »</strong> → et d'entrer votre courriel de compte AutoCompt. Une fois qu'il a accepté (à sa prochaine connexion), son entreprise apparaîtra ci-dessous.
            </p>

            {loadingCollab ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-blue-500" />
              </div>
            ) : collaboratorCompanies.length === 0 ? (
              <p className={`text-[11px] text-center py-6 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                Aucune entreprise partagée avec vous pour l'instant.
              </p>
            ) : (
              <select
                value={selectedLinkDocId}
                onChange={(e) => setSelectedLinkDocId(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none mb-4 ${darkMode ? "bg-zinc-950/50 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`}
              >
                <option value="">— Sélectionner l'entreprise du client —</option>
                {collaboratorCompanies.map((c) => (
                  <option key={c._companyDocId} value={c._companyDocId}>{c.nombre || c.nom || c._companyDocId}</option>
                ))}
              </select>
            )}

            <button
              disabled={!selectedLinkDocId || isSaving}
              onClick={handleConfirmLink}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest transition-all"
            >
              {isSaving ? "Enregistrement..." : "Lier ce compte"}
            </button>
          </div>
        </div>
      )}

      {showClientForm && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60"
          onClick={() => !isSaving && setShowClientForm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm p-6 rounded-[28px] border shadow-2xl ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Briefcase size={16} className="text-blue-500" />
                Nouveau client
              </h3>
              <button onClick={() => setShowClientForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={clientForm.nom}
                onChange={(e) => setClientForm({ ...clientForm, nom: e.target.value })}
                placeholder="Nom de l'entreprise ou du client *"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${darkMode ? "bg-zinc-950/50 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`}
              />
              <input
                type="email"
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                placeholder="Courriel"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${darkMode ? "bg-zinc-950/50 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`}
              />
              <input
                type="tel"
                value={clientForm.telephone}
                onChange={(e) => setClientForm({ ...clientForm, telephone: e.target.value })}
                placeholder="Téléphone"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${darkMode ? "bg-zinc-950/50 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`}
              />
              <select
                value={clientForm.typeEntite}
                onChange={(e) => setClientForm({ ...clientForm, typeEntite: e.target.value as BookkeepingClientTypeEntite | "" })}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${darkMode ? "bg-zinc-950/50 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`}
              >
                <option value="">Type de client (optionnel)</option>
                <option value="autonome">Propriétaire autogéré</option>
                <option value="inc">Société (INC)</option>
                <option value="gestion_tierce">Déjà sous gestion d'un gestionnaire immobilier</option>
              </select>
            </div>

            <button
              disabled={!clientForm.nom.trim() || isSaving}
              onClick={handleSaveClient}
              className="w-full mt-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest transition-all"
            >
              {isSaving ? "Enregistrement..." : "Ajouter le client"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PortefeuilleClientsComptableView;
