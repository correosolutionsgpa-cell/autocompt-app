/**
 * PortefeuilleClientView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Gestionnaires
 * Module: Portefeuille par Propriétaire-Client
 *
 * Vue complète du portefeuille d'un propriétaire-client :
 *   • Liste de tous ses immeubles (BuildingLedger avec fideicommisClientId)
 *   • Par immeuble : unités/portes, loyers du mois, dépenses, solde net
 *   • KPIs globaux du client : revenus totaux, taux d'occupation, honoraires dus
 *   • Navigation rapide vers le livre comptable de chaque immeuble
 *   • Bouton "Nouveau dépôt" pré-rempli avec le client et l'immeuble
 *
 * Ce composant ferme le cycle gestionnaire :
 *   FideicommisClient → BuildingLedger → UnitDoc → LoyerDoc / ExpenseDoc
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Users,
  DoorOpen,
  TrendingUp,
  TrendingDown,
  Scale,
  ChevronRight,
  ChevronDown,
  Plus,
  Menu,
  Loader2,
  Mail,
  Phone,
  Percent,
  FileText,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Home,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import type {
  BuildingLedger,
  FideicommisClientDoc,
  FideicommisDepotDoc,
  FideicommisRetraitDoc,
  UnitDoc,
} from "../../lib/dataService";

// ── Currency formatter ─────────────────────────────────────────────────────────
const fmtCAD = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

// ── Props ──────────────────────────────────────────────────────────────────────
export interface PortefeuilleClientViewProps {
  darkMode: boolean;
  activeCompanyId: string;
  currentCompany: any;
  adminName: string;
  adminEmail: string;
  /** Pre-selected client ID — passed when navigating from fidéicommis */
  preSelectedClientId?: string;
  setVista: (v: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  WorkspaceSidebar: React.ComponentType;
}

// ── Client + Buildings composite ───────────────────────────────────────────────
interface ClientPortefeuille extends FideicommisClientDoc {
  buildings: BuildingWithStats[];
  totalLoyers: number;
  totalDepenses: number;
  totalHonoraires: number;
  netRemis: number;
  nbUnites: number;
  nbUniteActives: number;
}

interface BuildingWithStats extends BuildingLedger {
  units: UnitDoc[];
  loyersMois: number;
  depensesMois: number;
  nbActives: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
const PortefeuilleClientView: React.FC<PortefeuilleClientViewProps> = ({
  darkMode,
  activeCompanyId,
  currentCompany,
  adminName,
  adminEmail,
  preSelectedClientId,
  setVista,
  setIsSidebarOpen,
  WorkspaceSidebar,
}) => {
  const [clients, setClients] = useState<FideicommisClientDoc[]>([]);
  const [buildings, setBuildings] = useState<BuildingLedger[]>([]);
  const [units, setUnits] = useState<UnitDoc[]>([]);
  const [depots, setDepots] = useState<FideicommisDepotDoc[]>([]);
  const [retraits, setRetraits] = useState<FideicommisRetraitDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedClientId, setSelectedClientId] = useState<string>(preSelectedClientId || "");
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({});
  const [selectedPeriod, setSelectedPeriod] = useState(() => new Date().toISOString().slice(0, 7));

  // Styles
  const glass = darkMode
    ? "bg-slate-900/40 border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)]"
    : "bg-white border-slate-200 shadow-sm";

  // ── Load all data ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeCompanyId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [cSnap, bSnap, uSnap, dSnap, rSnap] = await Promise.all([
        getDocs(query(collection(db, "fideicommisClients"), where("companyId", "==", activeCompanyId), where("ownerId", "==", uid))),
        getDocs(query(collection(db, "buildings"), where("ownerId", "==", uid))),
        getDocs(query(collection(db, "units"), where("ownerId", "==", uid))),
        getDocs(query(collection(db, "fideicommisDepots"), where("companyId", "==", activeCompanyId), where("ownerId", "==", uid))),
        getDocs(query(collection(db, "fideicommisRetraits"), where("companyId", "==", activeCompanyId), where("ownerId", "==", uid))),
      ]);
      setClients(cSnap.docs.map(d => d.data() as FideicommisClientDoc));
      setBuildings(bSnap.docs.map(d => d.data() as BuildingLedger));
      setUnits(uSnap.docs.map(d => d.data() as UnitDoc));
      setDepots(dSnap.docs.map(d => d.data() as FideicommisDepotDoc));
      setRetraits(rSnap.docs.map(d => d.data() as FideicommisRetraitDoc));
    } catch (e) {
      console.error("[Portefeuille] load error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => { load(); }, [load]);

  // ── Auto-expand first client ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  // ── Compute portefeuilles ────────────────────────────────────────────────────
  const portefeuilles: ClientPortefeuille[] = clients.map(client => {
    const clientBuildings = buildings.filter(b => b.fideicommisClientId === client.id);

    const bWithStats: BuildingWithStats[] = clientBuildings.map(b => {
      const bUnits = units.filter(u => u.buildingId === b.id);
      const bDepots = depots.filter(d => d.buildingId === b.id && d.date.startsWith(selectedPeriod));
      const bRetraits = retraits.filter(r => r.clientId === client.id && r.date.startsWith(selectedPeriod));
      return {
        ...b,
        units: bUnits,
        loyersMois: bDepots.reduce((s, d) => s + d.montant, 0),
        depensesMois: bRetraits.filter(r => r.type === "dépense").reduce((s, r) => s + r.montant, 0),
        nbActives: bUnits.filter(u => u.isActive).length,
      };
    });

    const allDepots = depots.filter(d => d.clientId === client.id);
    const allRetraits = retraits.filter(r => r.clientId === client.id);
    const totalLoyers = allDepots.reduce((s, d) => s + d.montant, 0);
    const totalDepenses = allRetraits.filter(r => r.type === "dépense").reduce((s, r) => s + r.montant, 0);
    const totalHonoraires = totalLoyers * (client.tauxHonoraires / 100);
    const netRemis = totalLoyers - totalDepenses - totalHonoraires;
    const allUnits = units.filter(u => clientBuildings.some(b => b.id === u.buildingId));

    return {
      ...client,
      buildings: bWithStats,
      totalLoyers,
      totalDepenses,
      totalHonoraires,
      netRemis,
      nbUnites: allUnits.length,
      nbUniteActives: allUnits.filter(u => u.isActive).length,
    };
  });

  const selectedPortefeuille = portefeuilles.find(p => p.id === selectedClientId);

  const toggleBuilding = (bId: string) =>
    setExpandedBuildings(prev => ({ ...prev, [bId]: !prev[bId] }));

  // ── Render ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-slate-950" : "bg-slate-50"}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="text-indigo-500 animate-spin" />
          <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
            Chargement des portefeuilles…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col font-sans md:pl-72`}>
      <WorkspaceSidebar />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className={`${glass} px-6 py-4 border-b flex items-center gap-3 sticky top-0 z-40`}>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white md:hidden">
          <Menu size={18} />
        </button>
        <button onClick={() => setVista("fideicommis")} className={`p-2 transition-colors ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}>
          <ArrowLeft size={20} />
        </button>
        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
          <Building2 size={20} />
        </div>
        <div className="flex-1">
          <h1 className="font-black uppercase italic tracking-tighter text-lg leading-none">Portefeuille par Client</h1>
          <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
            Tenue de livres par propriétaire-client
          </p>
        </div>
        {/* Period selector */}
        <input
          type="month"
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          className={`text-[10px] font-bold rounded-xl px-3 py-2 border outline-none ${darkMode ? "bg-zinc-900 border-zinc-700 text-zinc-200" : "bg-white border-slate-200"}`}
        />
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* ── Left panel: client list ───────────────────────────────────────── */}
        <div className={`w-72 shrink-0 border-r flex flex-col ${darkMode ? "border-zinc-800/60" : "border-slate-200"} hidden lg:flex`}>
          <div className={`px-4 py-3 border-b ${darkMode ? "border-zinc-800/60" : "border-slate-100"}`}>
            <p className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
              {clients.length} propriétaire(s)-client(s)
            </p>
          </div>

          {clients.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Users size={32} className={darkMode ? "text-zinc-700" : "text-slate-200"} />
              <p className={`text-[10px] font-bold ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
                Aucun client enregistré
              </p>
              <button
                onClick={() => setVista("fideicommis")}
                className="text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
              >
                <Plus size={10} />Ajouter un client
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-2">
              {portefeuilles.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedClientId(p.id)}
                  className={`w-full px-4 py-4 flex items-start gap-3 text-left border-b transition-all ${darkMode ? "border-zinc-800/40" : "border-slate-50"} ${
                    selectedClientId === p.id
                      ? darkMode ? "bg-indigo-900/20 border-l-2 border-l-indigo-500" : "bg-indigo-50 border-l-2 border-l-indigo-500"
                      : darkMode ? "hover:bg-zinc-900/30" : "hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 ${darkMode ? "bg-zinc-800 text-zinc-300" : "bg-slate-100 text-slate-600"}`}>
                    {p.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black truncate">{p.nom}</p>
                    <p className={`text-[9px] font-medium ${darkMode ? "text-zinc-600" : "text-slate-400"} truncate`}>{p.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${darkMode ? "bg-zinc-800 text-zinc-500" : "bg-slate-100 text-slate-500"}`}>
                        {p.buildings.length} immeuble(s)
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${darkMode ? "bg-zinc-800 text-zinc-500" : "bg-slate-100 text-slate-500"}`}>
                        {p.nbUniteActives}/{p.nbUnites} portes
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className={`p-4 border-t ${darkMode ? "border-zinc-800/60" : "border-slate-100"}`}>
            <button
              onClick={() => setVista("fideicommis")}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={12} />Nouveau client
            </button>
          </div>
        </div>

        {/* ── Right panel: selected client detail ──────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">

          {/* Mobile client selector */}
          <div className="lg:hidden">
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold outline-none ${darkMode ? "bg-zinc-900 border-zinc-700 text-zinc-100" : "bg-white border-slate-200"}`}
            >
              <option value="">— Sélectionner un client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>

          {!selectedPortefeuille ? (
            <div className={`p-12 rounded-[28px] border flex flex-col items-center gap-4 text-center ${glass}`}>
              <Building2 size={40} className={darkMode ? "text-zinc-700" : "text-slate-200"} />
              <p className={`text-sm font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                Sélectionnez un propriétaire-client pour voir son portefeuille
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedPortefeuille.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Client header card */}
                <div className={`p-5 rounded-[28px] border ${glass}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 bg-indigo-500/10 text-indigo-500`}>
                      {selectedPortefeuille.nom.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-black italic uppercase tracking-tighter">{selectedPortefeuille.nom}</h2>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {selectedPortefeuille.email && (
                          <a href={`mailto:${selectedPortefeuille.email}`} className={`text-[10px] font-medium flex items-center gap-1 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                            <Mail size={10} />{selectedPortefeuille.email}
                          </a>
                        )}
                        {selectedPortefeuille.telephone && (
                          <span className={`text-[10px] font-medium flex items-center gap-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                            <Phone size={10} />{selectedPortefeuille.telephone}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${darkMode ? "bg-indigo-900/20 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                          <Percent size={9} />{selectedPortefeuille.tauxHonoraires}% honoraires
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setVista("mandat_gestion")}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${darkMode ? "border-zinc-700 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400" : "border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600"}`}
                      >
                        <FileText size={12} />Mandat
                      </button>
                    </div>
                  </div>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Loyers perçus (total)",
                      value: fmtCAD(selectedPortefeuille.totalLoyers),
                      icon: <TrendingUp size={16} />,
                      color: "emerald",
                    },
                    {
                      label: "Dépenses payées",
                      value: fmtCAD(selectedPortefeuille.totalDepenses),
                      icon: <TrendingDown size={16} />,
                      color: "rose",
                    },
                    {
                      label: `Honoraires (${selectedPortefeuille.tauxHonoraires}%)`,
                      value: fmtCAD(selectedPortefeuille.totalHonoraires),
                      icon: <Percent size={16} />,
                      color: "violet",
                    },
                    {
                      label: "Net remis au propriétaire",
                      value: fmtCAD(selectedPortefeuille.netRemis),
                      icon: <Scale size={16} />,
                      color: "indigo",
                    },
                  ].map(kpi => (
                    <div key={kpi.label} className={`p-4 rounded-[24px] border ${glass}`}>
                      <div className={`text-${kpi.color}-500 mb-2`}>{kpi.icon}</div>
                      <p className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>{kpi.label}</p>
                      <p className={`text-base font-black tracking-tighter text-${kpi.color}-500 mt-0.5`}>{kpi.value}</p>
                    </div>
                  ))}
                </div>

                {/* Occupation rate */}
                {selectedPortefeuille.nbUnites > 0 && (
                  <div className={`p-4 rounded-[24px] border flex items-center gap-4 ${glass}`}>
                    <DoorOpen size={18} className="text-indigo-500 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>Taux d'occupation</span>
                        <span className="text-[12px] font-black text-indigo-500">
                          {selectedPortefeuille.nbUniteActives}/{selectedPortefeuille.nbUnites} portes louées
                        </span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${darkMode ? "bg-zinc-800" : "bg-slate-100"}`}>
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                          style={{ width: `${(selectedPortefeuille.nbUniteActives / selectedPortefeuille.nbUnites) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[18px] font-black text-indigo-500 shrink-0">
                      {Math.round((selectedPortefeuille.nbUniteActives / selectedPortefeuille.nbUnites) * 100)}%
                    </span>
                  </div>
                )}

                {/* Buildings section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                      Immeubles ({selectedPortefeuille.buildings.length})
                    </h3>
                    <button
                      onClick={() => setVista("gestion_immo")}
                      className="text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                    >
                      <Plus size={10} />Ajouter un immeuble
                    </button>
                  </div>

                  {selectedPortefeuille.buildings.length === 0 ? (
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
                        onClick={() => setVista("gestion_immo")}
                        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                      >
                        <Building2 size={11} />Aller à Gestion Immobilière
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedPortefeuille.buildings.map(building => (
                        <div key={building.id} className={`rounded-[24px] border overflow-hidden ${glass}`}>
                          {/* Building header */}
                          <button
                            onClick={() => toggleBuilding(building.id)}
                            className={`w-full p-4 flex items-center gap-3 text-left transition-all ${darkMode ? "hover:bg-zinc-800/30" : "hover:bg-slate-50"}`}
                          >
                            <div className={`p-2 rounded-xl ${darkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"}`}>
                              <Home size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-black truncate">{building.address}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[8px] font-bold ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
                                  {building.type === "full_rental" ? "Entièrement locatif" : building.type === "owner_occupied" ? "Propriétaire occupant" : "Mixte"}
                                </span>
                                <span className={`text-[8px] font-bold ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
                                  · {building.units.length} unité(s)
                                </span>
                              </div>
                            </div>
                            {/* Month KPIs */}
                            <div className="hidden sm:flex items-center gap-4 mr-3">
                              <div className="text-right">
                                <p className={`text-[8px] font-bold uppercase ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>Loyers {selectedPeriod}</p>
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

                          {/* Building expanded: units */}
                          <AnimatePresence>
                            {expandedBuildings[building.id] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className={`border-t px-4 pb-4 pt-3 ${darkMode ? "border-zinc-800/60" : "border-slate-100"}`}>
                                  {/* Units table */}
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
                                      {building.units.map(unit => (
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

                                  {/* Building actions */}
                                  <div className="flex gap-2 mt-3 flex-wrap">
                                    <button
                                      onClick={() => setVista("rapport_comptable")}
                                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${darkMode ? "border-zinc-700 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400" : "border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600"}`}
                                    >
                                      <ExternalLink size={10} />Livre comptable
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

                {/* No buildings assigned warning */}
                {selectedPortefeuille.buildings.length === 0 && (
                  <div className={`p-4 rounded-2xl border flex items-start gap-3 ${darkMode ? "bg-amber-900/10 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <p className="text-[11px] font-medium">
                      <strong>Aucun immeuble lié à ce client.</strong> Pour créer un lien, allez dans{" "}
                      <button onClick={() => setVista("gestion_immo")} className="underline font-bold">Gestion Immobilière</button>,
                      ajoutez ou éditez un immeuble, et sélectionnez <em>{selectedPortefeuille.nom}</em> dans le champ "Propriétaire-client".
                    </p>
                  </div>
                )}

                {/* Quick actions */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-6">
                  {[
                    { icon: <FileText size={16} />, label: "Mandat de gestion", sub: "OACIQ", vista: "mandat_gestion", color: "indigo" },
                    { icon: <Scale size={16} />, label: "Fidéicommis", sub: "Dépôts & retraits", vista: "fideicommis", color: "violet" },
                    { icon: <CheckCircle2 size={16} />, label: "Relevé mensuel", sub: "Générer & envoyer", vista: "fideicommis", color: "emerald" },
                  ].map(a => (
                    <button
                      key={a.label}
                      onClick={() => setVista(a.vista)}
                      className={`p-4 rounded-[24px] border flex flex-col items-start gap-2 text-left transition-all hover:border-${a.color}-400/50 ${glass}`}
                    >
                      <div className={`text-${a.color}-500`}>{a.icon}</div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest block">{a.label}</span>
                        <span className={`text-[8px] font-bold ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>{a.sub}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
};

export default PortefeuilleClientView;
