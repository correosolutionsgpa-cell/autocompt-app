/**
 * PortefeuilleClientView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Gestionnaires
 * Module: Portefeuille par Propriétaire-Client
 *
 * Vue complète du portefeuille d'un propriétaire-client :
 *   • Liste de tous ses immeubles (PropertyDoc avec fideicommisClientId)
 *   • Par immeuble : unités/portes, loyers du mois, dépenses, solde net
 *   • KPIs globaux du client : revenus totaux, taux d'occupation, honoraires dus
 *   • Navigation rapide vers le livre comptable de chaque immeuble
 *   • Bouton "Nouveau dépôt" pré-rempli avec le client et l'immeuble
 *
 * Ce composant ferme le cycle gestionnaire :
 *   FideicommisClient → PropertyDoc → UnitDoc → LoyerDoc / ExpenseDoc
 *
 * Le "chrome" partagé (liste de clients, sélection, KPIs génériques, layout)
 * vient de ../shared/ClientPortfolioShell — voir ce fichier pour la partie
 * commune avec le portefeuille du Contable. Tout ce qui est spécifique à
 * l'immobilier (immeubles, unités, fidéicommis) reste ici, injecté via les
 * props fetchExtra/extraKpis/renderListBadges/renderDetailBody du shell.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  DoorOpen,
  TrendingUp,
  TrendingDown,
  Scale,
  Percent,
  ChevronRight,
  ChevronDown,
  Plus,
  FileText,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Home,
  BookOpen,
  Send,
  Lock,
  Loader2,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { dataService } from "../../lib/dataService";
import type {
  PropertyDoc,
  FideicommisClientDoc,
  FideicommisDepotDoc,
  FideicommisRetraitDoc,
  UnitDoc,
  StatementLinkDoc,
} from "../../lib/dataService";
import ClientPortfolioShell, {
  fmtCAD,
  type ClientPortfolioAggregate,
} from "../shared/ClientPortfolioShell";

// ── Relevé de Gestion: invite + seal panel ──────────────────────────────────────
// Narrow cross-company channel (see StatementLinkDoc/SealedStatementDoc in
// dataService.ts) — NOT the full-access collaborator system. A real component
// (not inline in renderDetailBody, which is a plain callback, not a
// component) so it can own its own fetch/loading state per selected client.
interface StatementLinkPanelProps {
  darkMode: boolean;
  client: FideicommisClientDoc;
  gestionnaireCompanyId: string;
  gestionnaireOwnerId: string;
  gestionnaireName: string;
  companyName: string;
  adminEmail: string;
  period: string;
  totals: { totalLoyers: number; totalDepenses: number; totalHonoraires: number; netRemis: number };
  propertyAddresses: string[];
}

/** Fire-and-forget notification — the pull model never depends on this
 *  succeeding (the owner can always find their data by checking "Mes
 *  relevés de gestion" directly), so a delivery failure here is logged,
 *  never surfaced as a blocking error to the gestionnaire. */
const notifyReleveGestion = async (payload: {
  to: string; type: "invitation" | "nouveau_releve"; clientName?: string;
  gestionnaireName: string; companyName?: string; period?: string; adminEmail?: string;
}) => {
  try {
    await fetch("/api/send-releve-gestion-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("[StatementLinkPanel] notification email failed:", e);
  }
};

const StatementLinkPanel: React.FC<StatementLinkPanelProps> = ({
  darkMode, client, gestionnaireCompanyId, gestionnaireOwnerId, gestionnaireName, companyName, adminEmail, period, totals, propertyAddresses,
}) => {
  const [link, setLink] = useState<StatementLinkDoc | null | undefined>(undefined); // undefined = loading
  const [alreadySealed, setAlreadySealed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLink(undefined);
    setAlreadySealed(false);
    dataService.fetchStatementLinkForClient(gestionnaireCompanyId, client.id).then((l) => {
      if (!cancelled) setLink(l);
    });
    dataService.fetchSealedStatementForPeriod(gestionnaireCompanyId, client.id, period).then((s) => {
      if (!cancelled) setAlreadySealed(!!s);
    });
    return () => { cancelled = true; };
  }, [gestionnaireCompanyId, client.id, period]);

  const handleInvite = async () => {
    setBusy(true);
    try {
      const created = await dataService.createStatementLink(gestionnaireOwnerId, gestionnaireCompanyId, client);
      setLink(created);
      notifyReleveGestion({
        to: created.invitedEmail, type: "invitation", clientName: client.nom,
        gestionnaireName, companyName, adminEmail,
      });
    } catch (e) {
      console.error("[StatementLinkPanel] createStatementLink error:", e);
    } finally {
      setBusy(false);
    }
  };

  const handleSeal = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !link?.linkedOwnerUid) return;
    setBusy(true);
    try {
      await dataService.sealStatement(uid, {
        gestionnaireCompanyId,
        fideicommisClientId: client.id,
        linkedOwnerUid: link.linkedOwnerUid,
        period,
        propertyAddresses,
        gestionnaireName,
        companyName,
        ...totals,
      });
      setAlreadySealed(true);
      notifyReleveGestion({
        to: link.invitedEmail, type: "nouveau_releve", clientName: client.nom,
        gestionnaireName, companyName, period, adminEmail,
      });
    } catch (e) {
      console.error("[StatementLinkPanel] sealStatement error:", e);
    } finally {
      setBusy(false);
    }
  };

  const box = darkMode ? "bg-slate-900/40 border-white/[0.08]" : "bg-white border-slate-200";

  return (
    <div className={`p-4 rounded-[24px] border ${box}`}>
      <div className="flex items-center gap-2 mb-2">
        <Send size={14} className="text-indigo-500" />
        <h3 className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>Relevé de Gestion</h3>
      </div>

      {link === undefined ? (
        <div className="flex items-center gap-2 py-2 text-slate-400"><Loader2 size={14} className="animate-spin" /><span className="text-[10px] font-bold uppercase">Chargement…</span></div>
      ) : !link ? (
        <div className="space-y-2">
          <p className={`text-[11px] font-medium ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
            Invitez {client.nom} à consulter ses relevés de gestion depuis son propre compte AutoCompt — comme un relevé bancaire, il ira les chercher lui-même, sans accès à vos autres données.
          </p>
          <button
            onClick={handleInvite}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-all"
          >
            {busy ? "Envoi…" : "Inviter ce client à consulter ses relevés"}
          </button>
        </div>
      ) : link.status === "pending" ? (
        <p className={`text-[11px] font-bold flex items-center gap-2 ${darkMode ? "text-amber-400" : "text-amber-600"}`}>
          <Lock size={12} />Invitation envoyée à {link.invitedEmail} — en attente d'acceptation.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`text-[11px] font-medium ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
            Client lié — peut consulter ses relevés scellés depuis son compte.
          </p>
          <button
            onClick={handleSeal}
            disabled={busy || alreadySealed}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${alreadySealed ? "bg-emerald-500/10 text-emerald-600 cursor-default" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
          >
            {alreadySealed ? "✓ Relevé déjà scellé pour cette période" : busy ? "Scellement…" : `Sceller le relevé de ${period}`}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Props ──────────────────────────────────────────────────────────────────────
export interface PortefeuilleClientViewProps {
  darkMode: boolean;
  activeCompanyId: string;
  currentCompany: any;
  adminName: string;
  adminEmail: string;
  /** Pre-selected client ID — passed when navigating from fidéicommis */
  preSelectedClientId?: string;
  /** Sets which building's ledger to open when navigating to "tenue_livres_immeuble" */
  setSelectedLedgerBuildingId: (id: string) => void;
  setVista: (v: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  WorkspaceSidebar: React.ComponentType;
}

interface BuildingWithStats extends PropertyDoc {
  units: UnitDoc[];
  loyersMois: number;
  depensesMois: number;
  nbActives: number;
}

/** Gestionnaire-specific data the shell doesn't know about — computed by
 *  `fetchExtra` below and rendered via extraKpis/renderListBadges/renderDetailBody. */
interface GestionnaireExtra {
  buildings: BuildingWithStats[];
  totalLoyers: number;
  totalDepenses: number;
  totalHonoraires: number;
  netRemis: number;
  nbUnites: number;
  nbUniteActives: number;
  /** The period these totals were computed for — carried alongside since
   *  renderDetailBody only receives the aggregate, not the shell's internal
   *  selectedPeriod state, and StatementLinkPanel needs it to seal the
   *  correct period. */
  period: string;
}

const emptyExtra: GestionnaireExtra = {
  buildings: [], totalLoyers: 0, totalDepenses: 0, totalHonoraires: 0, netRemis: 0, nbUnites: 0, nbUniteActives: 0, period: "",
};

// ── Component ─────────────────────────────────────────────────────────────────
const PortefeuilleClientView: React.FC<PortefeuilleClientViewProps> = ({
  darkMode,
  activeCompanyId,
  currentCompany,
  adminName,
  adminEmail,
  preSelectedClientId,
  setSelectedLedgerBuildingId,
  setVista,
  setIsSidebarOpen,
  WorkspaceSidebar,
}) => {
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({});
  const toggleBuilding = (bId: string) =>
    setExpandedBuildings((prev) => ({ ...prev, [bId]: !prev[bId] }));

  const glass = darkMode
    ? "bg-slate-900/40 border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)]"
    : "bg-white border-slate-200 shadow-sm";

  // ── Profile-specific data fetch: buildings/units/fidéicommis deposits &
  //    withdrawals, aggregated per client. Same logic as before the shared-
  //    shell extraction — the client list itself is now fetched by the shell
  //    via `fetchClients` below. ──────────────────────────────────────────────
  const fetchExtra = async ({
    uid,
    activeCompanyId: companyId,
    clients,
    period,
  }: {
    uid: string;
    activeCompanyId: string;
    clients: FideicommisClientDoc[];
    period: string;
  }): Promise<Record<string, GestionnaireExtra>> => {
    const [props, uSnap, dSnap, rSnap] = await Promise.all([
      // Buildings live in Gestion Immobilière's `properties` collection
      // (PropertyDoc), not the legacy `buildings`/BuildingLedger collection —
      // see fetchProperties for the id/companyId unprefixing it handles.
      dataService.fetchProperties(uid),
      getDocs(query(collection(db, "units"), where("ownerId", "==", uid))),
      getDocs(query(collection(db, "fideicommisDepots"), where("companyId", "==", companyId), where("ownerId", "==", uid))),
      getDocs(query(collection(db, "fideicommisRetraits"), where("companyId", "==", companyId), where("ownerId", "==", uid))),
    ]);
    const buildings = props.filter((p) => p.companyId === companyId);
    const units = uSnap.docs.map((d) => d.data() as UnitDoc);
    const depots = dSnap.docs.map((d) => d.data() as FideicommisDepotDoc);
    const retraits = rSnap.docs.map((d) => d.data() as FideicommisRetraitDoc);

    const result: Record<string, GestionnaireExtra> = {};
    for (const client of clients) {
      const clientBuildings = buildings.filter((b) => b.fideicommisClientId === client.id);
      const bWithStats: BuildingWithStats[] = clientBuildings.map((b) => {
        const bUnits = units.filter((u) => u.buildingId === b.id);
        const bDepots = depots.filter((d) => d.buildingId === b.id && d.date.startsWith(period));
        const bRetraits = retraits.filter((r) => r.clientId === client.id && r.date.startsWith(period));
        return {
          ...b,
          units: bUnits,
          loyersMois: bDepots.reduce((s, d) => s + d.montant, 0),
          depensesMois: bRetraits.filter((r) => r.type === "dépense").reduce((s, r) => s + r.montant, 0),
          nbActives: bUnits.filter((u) => u.isActive).length,
        };
      });

      const allDepots = depots.filter((d) => d.clientId === client.id);
      const allRetraits = retraits.filter((r) => r.clientId === client.id);
      const totalLoyers = allDepots.reduce((s, d) => s + d.montant, 0);
      const totalDepenses = allRetraits.filter((r) => r.type === "dépense").reduce((s, r) => s + r.montant, 0);
      const totalHonoraires = totalLoyers * (client.tauxHonoraires / 100);
      const netRemis = totalLoyers - totalDepenses - totalHonoraires;
      const allUnits = units.filter((u) => clientBuildings.some((b) => b.id === u.buildingId));

      result[client.id] = {
        buildings: bWithStats,
        totalLoyers,
        totalDepenses,
        totalHonoraires,
        netRemis,
        nbUnites: allUnits.length,
        nbUniteActives: allUnits.filter((u) => u.isActive).length,
        period,
      };
    }
    return result;
  };

  type Agg = ClientPortfolioAggregate<FideicommisClientDoc, GestionnaireExtra>;

  return (
    <ClientPortfolioShell<FideicommisClientDoc, GestionnaireExtra>
      darkMode={darkMode}
      activeCompanyId={activeCompanyId}
      setIsSidebarOpen={setIsSidebarOpen}
      WorkspaceSidebar={WorkspaceSidebar}
      setVista={setVista}
      preSelectedClientId={preSelectedClientId}
      title="Portefeuille par Client"
      subtitle="Tenue de livres par propriétaire-client"
      headerIcon={<Building2 size={20} />}
      backVista="fideicommis"
      accentColor="indigo"
      fetchClients={dataService.fetchFideicommisClients}
      fetchExtra={fetchExtra}
      emptyExtra={emptyExtra}
      hideGenericKpis
      onAddClient={() => setVista("fideicommis")}
      renderListBadges={(a: Agg) => (
        <>
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${darkMode ? "bg-zinc-800 text-zinc-500" : "bg-slate-100 text-slate-500"}`}>
            {a.extra.buildings.length} immeuble(s)
          </span>
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${darkMode ? "bg-zinc-800 text-zinc-500" : "bg-slate-100 text-slate-500"}`}>
            {a.extra.nbUniteActives}/{a.extra.nbUnites} portes
          </span>
        </>
      )}
      renderHeaderBadge={(a: Agg) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${darkMode ? "bg-indigo-900/20 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
          <Percent size={9} />{a.tauxHonoraires}% honoraires
        </span>
      )}
      extraKpis={(a: Agg) => [
        { label: "Loyers perçus (total)", value: fmtCAD(a.extra.totalLoyers), icon: <TrendingUp size={16} />, color: "emerald" },
        { label: "Dépenses payées", value: fmtCAD(a.extra.totalDepenses), icon: <TrendingDown size={16} />, color: "rose" },
        { label: `Honoraires (${a.tauxHonoraires}%)`, value: fmtCAD(a.extra.totalHonoraires), icon: <Percent size={16} />, color: "violet" },
        { label: "Net remis au propriétaire", value: fmtCAD(a.extra.netRemis), icon: <Scale size={16} />, color: "indigo" },
      ]}
      renderDetailBody={(a: Agg) => (
        <>
          <StatementLinkPanel
            darkMode={darkMode}
            client={a}
            gestionnaireCompanyId={activeCompanyId}
            gestionnaireOwnerId={auth.currentUser?.uid || ""}
            gestionnaireName={adminName}
            companyName={currentCompany?.nombre || ""}
            adminEmail={adminEmail}
            period={a.extra.period}
            totals={{ totalLoyers: a.extra.totalLoyers, totalDepenses: a.extra.totalDepenses, totalHonoraires: a.extra.totalHonoraires, netRemis: a.extra.netRemis }}
            propertyAddresses={a.extra.buildings.map((b) => b.adresse)}
          />

          {/* Occupation rate */}
          {a.extra.nbUnites > 0 && (
            <div className={`p-4 rounded-[24px] border flex items-center gap-4 ${glass}`}>
              <DoorOpen size={18} className="text-indigo-500 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Taux d'occupation</span>
                  <span className="text-[12px] font-black text-indigo-500">
                    {a.extra.nbUniteActives}/{a.extra.nbUnites} portes louées
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${darkMode ? "bg-zinc-800" : "bg-slate-100"}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                    style={{ width: `${(a.extra.nbUniteActives / a.extra.nbUnites) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-[18px] font-black text-indigo-500 shrink-0">
                {Math.round((a.extra.nbUniteActives / a.extra.nbUnites) * 100)}%
              </span>
            </div>
          )}

          {/* Buildings section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                Immeubles ({a.extra.buildings.length})
              </h3>
              <button
                onClick={() => setVista("plex")}
                className="text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
              >
                <Plus size={10} />Ajouter un immeuble
              </button>
            </div>

            {a.extra.buildings.length === 0 ? (
              <div className={`p-8 rounded-[24px] border flex flex-col items-center gap-3 text-center ${glass}`}>
                <Building2 size={32} className={darkMode ? "text-zinc-700" : "text-slate-200"} />
                <div>
                  <p className={`text-sm font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    Aucun immeuble assigné à ce client
                  </p>
                  <p className={`text-[10px] mt-1 ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
                    Lors de l'ajout d'un immeuble dans Gestion Immobilière,<br />sélectionnez ce propriétaire dans le champ "Propriétaire-client".
                  </p>
                </div>
                <button
                  onClick={() => setVista("plex")}
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Building2 size={11} />Aller à Gestion Immobilière
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {a.extra.buildings.map((building) => (
                  <div key={building.id} className={`rounded-[24px] border overflow-hidden ${glass}`}>
                    <button
                      onClick={() => toggleBuilding(building.id)}
                      className={`w-full p-4 flex items-center gap-3 text-left transition-all ${darkMode ? "hover:bg-zinc-800/30" : "hover:bg-slate-50"}`}
                    >
                      <div className={`p-2 rounded-xl ${darkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"}`}>
                        <Home size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black truncate">{building.adresse}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[8px] font-bold ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
                            {building.typeLocation}
                          </span>
                          <span className={`text-[8px] font-bold ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
                            · {building.units.length} unité(s)
                          </span>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-4 mr-3">
                        <div className="text-right">
                          <p className={`text-[8px] font-bold uppercase ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Loyers</p>
                          <p className="text-[13px] font-black text-emerald-500">{fmtCAD(building.loyersMois)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-[8px] font-bold uppercase ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Portes louées</p>
                          <p className="text-[13px] font-black text-indigo-500">{building.nbActives}/{building.units.length}</p>
                        </div>
                      </div>
                      {expandedBuildings[building.id]
                        ? <ChevronDown size={16} className="text-indigo-400 shrink-0" />
                        : <ChevronRight size={16} className={darkMode ? "text-zinc-600 shrink-0" : "text-slate-300 shrink-0"} />}
                    </button>

                    <AnimatePresence>
                      {expandedBuildings[building.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className={`border-t px-4 pb-4 pt-3 ${darkMode ? "border-zinc-800/60" : "border-slate-100"}`}>
                            {building.units.length === 0 ? (
                              <p className={`text-[10px] font-medium italic ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
                                Aucune unité enregistrée pour cet immeuble.
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                <div className={`grid grid-cols-4 gap-2 px-2 mb-2 text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
                                  <span>Unité</span>
                                  <span>Locataire</span>
                                  <span className="text-right">Loyer/mois</span>
                                  <span className="text-right">Statut</span>
                                </div>
                                {building.units.map((unit) => (
                                  <div
                                    key={unit.id}
                                    className={`grid grid-cols-4 gap-2 px-3 py-2.5 rounded-xl text-[11px] ${darkMode ? "bg-zinc-900/40" : "bg-slate-50"}`}
                                  >
                                    <span className="font-bold truncate">{unit.unitName}</span>
                                    <span className={`truncate ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>{unit.tenantName || "—"}</span>
                                    <span className="text-right font-bold text-emerald-500">{fmtCAD(unit.monthlyRent)}</span>
                                    <div className="flex justify-end">
                                      {unit.isActive ? (
                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">Actif</span>
                                      ) : (
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${darkMode ? "bg-zinc-800 text-zinc-500" : "bg-slate-100 text-slate-400"}`}>Vacant</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-2 mt-3 flex-wrap">
                              <button
                                onClick={() => setVista("rapport_comptable")}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${darkMode ? "border-zinc-700 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400" : "border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600"}`}
                              >
                                <ExternalLink size={10} />Livre comptable
                              </button>
                              <button
                                onClick={() => { setSelectedLedgerBuildingId(building.id); setVista("tenue_livres_immeuble"); }}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${darkMode ? "border-indigo-700/40 text-indigo-400 hover:bg-indigo-900/20" : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"}`}
                              >
                                <BookOpen size={10} />Tenue de livres
                              </button>
                              <button
                                onClick={() => setVista("depots_fideicommis")}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${darkMode ? "border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/20" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}
                              >
                                <Plus size={10} />Nouveau dépôt
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>

          {a.extra.buildings.length === 0 && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${darkMode ? "bg-amber-900/10 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium">
                <strong>Aucun immeuble lié à ce client.</strong> Pour créer un lien, allez dans{" "}
                <button onClick={() => setVista("plex")} className="underline font-bold">Gestion Immobilière</button>,
                ajoutez ou éditez un immeuble, et sélectionnez <em>{a.nom}</em> dans le champ "Propriétaire-client".
              </p>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-6">
            {[
              { icon: <FileText size={16} />, label: "Mandat de gestion", sub: "OACIQ", vista: "mandat_gestion", color: "indigo" },
              { icon: <Scale size={16} />, label: "Fidéicommis", sub: "Dépôts & retraits", vista: "fideicommis", color: "violet" },
              { icon: <CheckCircle2 size={16} />, label: "Relevé mensuel", sub: "Générer & envoyer", vista: "fideicommis", color: "emerald" },
            ].map((act) => (
              <button
                key={act.label}
                onClick={() => setVista(act.vista)}
                className={`p-4 rounded-[24px] border flex flex-col items-start gap-2 text-left transition-all hover:border-${act.color}-400/50 ${glass}`}
              >
                <div className={`text-${act.color}-500`}>{act.icon}</div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest block">{act.label}</span>
                  <span className={`text-[8px] font-bold ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>{act.sub}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    />
  );
};

export default PortefeuilleClientView;
