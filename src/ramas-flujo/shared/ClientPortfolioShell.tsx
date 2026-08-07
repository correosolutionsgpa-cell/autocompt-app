/**
 * ClientPortfolioShell.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: shared (consumed by Rama_Gestionnaires and Rama_Comptables)
 *
 * Generic "one professional account, many clients, each with their own
 * ledger" shell — the shape shared by the gestionnaire's Portefeuille par
 * Client (property-owner clients) and the comptable's Portefeuille Clients
 * (generic small-business clients). Owns the parts that are the same for
 * both: fetching the client list, auto-computing revenue/expenses/balance
 * per client from the generic `expenses`/`invoices` collections (filtered by
 * the `clientId` FK), the client-list panel, the period selector, the KPI
 * card row, and all the loading/empty states.
 *
 * Profile-specific content (gestionnaire's buildings/units/fidéicommis
 * actions, or anything a future profile needs) is NOT known to this file —
 * it's injected via the `fetchExtra`/`extraKpis`/`renderDetailBody`/etc.
 * slots below, so a change to the shared list/KPI/layout logic here applies
 * to every consumer automatically, without touching their files.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Menu,
  Loader2,
  Mail,
  Phone,
} from "lucide-react";
import { auth } from "../../lib/firebase";
import { dataService } from "../../lib/dataService";
import type { ExpenseDoc, InvoiceDoc } from "../../lib/dataService";

// ── Currency formatter — exported so consumers' extraKpis/renderDetailBody
//    slots use the exact same formatting without redefining it. ───────────────
export const fmtCAD = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

// ── Generic client shape — every profile's client doc must be at least this ────
export interface ClientPortfolioBase {
  id: string;
  companyId: string;
  nom: string;
  email: string;
  telephone?: string;
  ownerId: string;
  createdAt: string;
}

/** A client enriched with the generic ledger totals + whatever profile-specific
 *  `extra` data was supplied. `TClient`'s own fields (e.g. gestionnaire's
 *  `tauxHonoraires`) stay directly accessible — only DERIVED/computed data
 *  that isn't a native client field belongs in `extra`. */
export type ClientPortfolioAggregate<
  TClient extends ClientPortfolioBase = ClientPortfolioBase,
  TExtra = {}
> = TClient & {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  nbTransactions: number;
  extra: TExtra;
};

export interface ClientPortfolioShellProps<
  TClient extends ClientPortfolioBase = ClientPortfolioBase,
  TExtra = {}
> {
  darkMode: boolean;
  activeCompanyId: string;
  setIsSidebarOpen: (open: boolean) => void;
  WorkspaceSidebar: React.ComponentType;
  setVista: (v: string) => void;
  /** Pre-selected client ID — e.g. navigated in from another screen. */
  preSelectedClientId?: string;

  title: string;
  subtitle: string;
  headerIcon: React.ReactNode;
  /** Back-arrow target. */
  backVista: string;
  /** Tailwind color name used for icons/accents — defaults to "indigo" (the
   *  color the gestionnaire portfolio already used). */
  accentColor?: string;

  /** How to fetch this profile's client list — different profiles use
   *  different Firestore collections/doc shapes (fideicommisClients vs
   *  bookkeepingClients), so this is the one piece the shell can't assume. */
  fetchClients: (uid: string, companyId: string) => Promise<TClient[]>;
  /** Optional profile-specific enrichment, keyed by client id — e.g.
   *  gestionnaire's buildings/units/fidéicommis totals. Left undefined for
   *  profiles with nothing extra to add (comptable). */
  fetchExtra?: (args: {
    uid: string;
    activeCompanyId: string;
    clients: TClient[];
    period: string;
  }) => Promise<Record<string, TExtra>>;
  /** Value used for clients `fetchExtra` didn't return anything for. */
  emptyExtra: TExtra;
  /** Hide the shell's generic Revenus/Dépenses/Solde KPI row — gestionnaire's
   *  real numbers come from fidéicommis deposits/withdrawals, a different
   *  data source than the generic expenses/invoices this shell aggregates,
   *  so it supplies its own KPIs via `extraKpis` instead and hides these. */
  hideGenericKpis?: boolean;
  /** Same idea as `hideGenericKpis`, but decided per-client instead of for
   *  the whole shell — e.g. a comptable's LINKED client's real numbers live
   *  under a different companyId entirely (never tagged with `clientId`),
   *  so the generic aggregate is always $0 and actively misleading for that
   *  one client, while an unlinked client's generic totals stay correct and
   *  should keep showing normally. */
  hideGenericKpisFor?: (agg: ClientPortfolioAggregate<TClient, TExtra>) => boolean;

  extraKpis?: (agg: ClientPortfolioAggregate<TClient, TExtra>) => Array<{
    label: string;
    value: string;
    icon: React.ReactNode;
    color: string;
  }>;
  renderListBadges?: (agg: ClientPortfolioAggregate<TClient, TExtra>) => React.ReactNode;
  renderHeaderBadge?: (agg: ClientPortfolioAggregate<TClient, TExtra>) => React.ReactNode;
  /** Main slot for everything below the header/KPI row — buildings for
   *  gestionnaire, a simple ledger link for comptable, etc. */
  renderDetailBody?: (agg: ClientPortfolioAggregate<TClient, TExtra>) => React.ReactNode;

  onAddClient: () => void;
}

function ClientPortfolioShellInner<
  TClient extends ClientPortfolioBase,
  TExtra
>({
  darkMode,
  activeCompanyId,
  setIsSidebarOpen,
  WorkspaceSidebar,
  setVista,
  preSelectedClientId,
  title,
  subtitle,
  headerIcon,
  backVista,
  accentColor = "indigo",
  fetchClients,
  fetchExtra,
  emptyExtra,
  hideGenericKpis,
  hideGenericKpisFor,
  extraKpis,
  renderListBadges,
  renderHeaderBadge,
  renderDetailBody,
  onAddClient,
}: ClientPortfolioShellProps<TClient, TExtra>) {
  const [clients, setClients] = useState<TClient[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDoc[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([]);
  const [extraByClientId, setExtraByClientId] = useState<Record<string, TExtra>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [selectedClientId, setSelectedClientId] = useState<string>(preSelectedClientId || "");
  const [selectedPeriod, setSelectedPeriod] = useState(() => new Date().toISOString().slice(0, 7));

  const glass = darkMode
    ? "bg-slate-900/40 border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)]"
    : "bg-white border-slate-200 shadow-sm";

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeCompanyId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [clientList, expenseList, invoiceList] = await Promise.all([
        fetchClients(uid, activeCompanyId),
        dataService.fetchExpenses(uid),
        dataService.fetchInvoices(uid),
      ]);
      setClients(clientList);
      setExpenses(expenseList.filter((e) => e.companyId === activeCompanyId));
      setInvoices(invoiceList.filter((i) => i.companyId === activeCompanyId));

      if (fetchExtra) {
        const extra = await fetchExtra({ uid, activeCompanyId, clients: clientList, period: selectedPeriod });
        setExtraByClientId(extra);
      } else {
        setExtraByClientId({});
      }
    } catch (e) {
      console.error("[ClientPortfolioShell] load error:", e);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId, selectedPeriod]);

  useEffect(() => { load(); }, [load]);

  // Auto-select the first client once the list loads, unless one was
  // pre-selected or the user already picked one.
  useEffect(() => {
    if (!selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const aggregates: ClientPortfolioAggregate<TClient, TExtra>[] = clients.map((client) => {
    const clientExpenses = expenses.filter((e) => e.clientId === client.id);
    const clientInvoices = invoices.filter((i) => i.clientId === client.id);
    const totalRevenue = clientInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalExpenses = clientExpenses.reduce((s, e) => s + (e.total || 0), 0);
    return {
      ...client,
      totalRevenue,
      totalExpenses,
      balance: totalRevenue - totalExpenses,
      nbTransactions: clientExpenses.length + clientInvoices.length,
      extra: extraByClientId[client.id] ?? emptyExtra,
    };
  });

  const selected = aggregates.find((a) => a.id === selectedClientId);

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-slate-950" : "bg-slate-50"}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className={`text-${accentColor}-500 animate-spin`} />
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

      <header className={`${glass} px-6 py-4 border-b flex items-center gap-3 sticky top-0 z-40`}>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white md:hidden">
          <Menu size={18} />
        </button>
        <button onClick={() => setVista(backVista)} className={`p-2 transition-colors ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}>
          <ArrowLeft size={20} />
        </button>
        <div className={`p-2.5 rounded-2xl bg-${accentColor}-500/10 text-${accentColor}-500`}>
          {headerIcon}
        </div>
        <div className="flex-1">
          <h1 className="font-black uppercase italic tracking-tighter text-lg leading-none">{title}</h1>
          <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 text-${accentColor}-500`}>
            {subtitle}
          </p>
        </div>
        <input
          type="month"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className={`text-[10px] font-bold rounded-xl px-3 py-2 border outline-none ${darkMode ? "bg-zinc-900 border-zinc-700 text-zinc-200" : "bg-white border-slate-200"}`}
        />
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* ── Left panel: client list ───────────────────────────────────────── */}
        <div className={`w-72 shrink-0 border-r flex flex-col ${darkMode ? "border-zinc-800/60" : "border-slate-200"} hidden lg:flex`}>
          <div className={`px-4 py-3 border-b ${darkMode ? "border-zinc-800/60" : "border-slate-100"}`}>
            <p className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
              {clients.length} client(s)
            </p>
          </div>

          {clients.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Users size={32} className={darkMode ? "text-zinc-700" : "text-slate-200"} />
              <p className={`text-[10px] font-bold ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>
                Aucun client enregistré
              </p>
              <button
                onClick={onAddClient}
                className={`text-[9px] font-black uppercase tracking-widest text-${accentColor}-500 hover:text-${accentColor}-400 flex items-center gap-1`}
              >
                <Plus size={10} />Ajouter un client
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-2">
              {aggregates.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedClientId(a.id)}
                  className={`w-full px-4 py-4 flex items-start gap-3 text-left border-b transition-all ${darkMode ? "border-zinc-800/40" : "border-slate-50"} ${
                    selectedClientId === a.id
                      ? darkMode ? `bg-${accentColor}-900/20 border-l-2 border-l-${accentColor}-500` : `bg-${accentColor}-50 border-l-2 border-l-${accentColor}-500`
                      : darkMode ? "hover:bg-zinc-900/30" : "hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 ${darkMode ? "bg-zinc-800 text-zinc-300" : "bg-slate-100 text-slate-600"}`}>
                    {a.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black truncate">{a.nom}</p>
                    <p className={`text-[9px] font-medium ${darkMode ? "text-zinc-600" : "text-slate-400"} truncate`}>{a.email}</p>
                    {renderListBadges && (
                      <div className="flex items-center gap-2 mt-1.5">{renderListBadges(a)}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className={`p-4 border-t ${darkMode ? "border-zinc-800/60" : "border-slate-100"}`}>
            <button
              onClick={onAddClient}
              className={`w-full py-3 rounded-2xl bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all`}
            >
              <Plus size={12} />Nouveau client
            </button>
          </div>
        </div>

        {/* ── Right panel: selected client detail ──────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <div className="lg:hidden">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold outline-none ${darkMode ? "bg-zinc-900 border-zinc-700 text-zinc-100" : "bg-white border-slate-200"}`}
            >
              <option value="">— Sélectionner un client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>

          {!selected ? (
            <div className={`p-12 rounded-[28px] border flex flex-col items-center gap-4 text-center ${glass}`}>
              <Users size={40} className={darkMode ? "text-zinc-700" : "text-slate-200"} />
              <p className={`text-sm font-bold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                Sélectionnez un client pour voir son portefeuille
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Client header card */}
                <div className={`p-5 rounded-[28px] border ${glass}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 bg-${accentColor}-500/10 text-${accentColor}-500`}>
                      {selected.nom.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-black italic uppercase tracking-tighter">{selected.nom}</h2>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {selected.email && (
                          <a href={`mailto:${selected.email}`} className={`text-[10px] font-medium flex items-center gap-1 text-${accentColor}-${darkMode ? "400" : "600"}`}>
                            <Mail size={10} />{selected.email}
                          </a>
                        )}
                        {selected.telephone && (
                          <span className={`text-[10px] font-medium flex items-center gap-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                            <Phone size={10} />{selected.telephone}
                          </span>
                        )}
                        {renderHeaderBadge?.(selected)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI row */}
                {(() => {
                  const genericHidden = hideGenericKpis || !!hideGenericKpisFor?.(selected);
                  return (!genericHidden || extraKpis) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(!genericHidden ? [
                      { label: "Revenus", value: fmtCAD(selected.totalRevenue), icon: <TrendingUp size={16} /> as React.ReactNode, color: "emerald" },
                      { label: "Dépenses", value: fmtCAD(selected.totalExpenses), icon: <TrendingDown size={16} /> as React.ReactNode, color: "rose" },
                      { label: "Solde net", value: fmtCAD(selected.balance), icon: <Scale size={16} /> as React.ReactNode, color: accentColor },
                    ] : []).concat(extraKpis?.(selected) ?? []).map((kpi) => (
                      <div key={kpi.label} className={`p-4 rounded-[24px] border ${glass}`}>
                        <div className={`text-${kpi.color}-500 mb-2`}>{kpi.icon}</div>
                        <p className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-slate-400"}`}>{kpi.label}</p>
                        <p className={`text-base font-black tracking-tighter text-${kpi.color}-500 mt-0.5`}>{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                  );
                })()}

                {renderDetailBody?.(selected)}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}

// Cast needed because generic function components can't be typed directly as
// React.FC without losing their type parameters at call sites.
const ClientPortfolioShell = ClientPortfolioShellInner as <
  TClient extends ClientPortfolioBase = ClientPortfolioBase,
  TExtra = {}
>(
  props: ClientPortfolioShellProps<TClient, TExtra>
) => React.ReactElement;

export default ClientPortfolioShell;
