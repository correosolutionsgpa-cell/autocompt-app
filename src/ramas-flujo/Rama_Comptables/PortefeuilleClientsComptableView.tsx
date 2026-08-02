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
 * "Nouveau client" et le lien vers la Tenue de Livres.
 *
 * MVP: le lien "Tenue de Livres" ouvre la vue générale (vista "reportes")
 * sans filtrer par client — le filtrage par client dépend de l'étiquetage
 * des dépenses/factures avec `clientId`, qui n'est pas encore branché dans
 * les formulaires de dépenses/factures (tâche de suivi séparée).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import { Briefcase, BookOpen, X } from "lucide-react";
import { auth } from "../../lib/firebase";
import { dataService } from "../../lib/dataService";
import type { BookkeepingClientDoc } from "../../lib/dataService";
import ClientPortfolioShell, { type ClientPortfolioAggregate } from "../shared/ClientPortfolioShell";

export interface PortefeuilleClientsComptableViewProps {
  darkMode: boolean;
  activeCompanyId: string;
  currentCompany: any;
  adminName: string;
  adminEmail: string;
  setVista: (v: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  WorkspaceSidebar: React.ComponentType;
}

type Agg = ClientPortfolioAggregate<BookkeepingClientDoc, {}>;

const PortefeuilleClientsComptableView: React.FC<PortefeuilleClientsComptableViewProps> = ({
  darkMode,
  activeCompanyId,
  setVista,
  setIsSidebarOpen,
  WorkspaceSidebar,
}) => {
  const [reloadKey, setReloadKey] = useState(0);
  const [showClientForm, setShowClientForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clientForm, setClientForm] = useState({ nom: "", email: "", telephone: "", secteurActivite: "" });

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
        secteurActivite: clientForm.secteurActivite.trim() || undefined,
      });
      setShowClientForm(false);
      setClientForm({ nom: "", email: "", telephone: "", secteurActivite: "" });
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

  return (
    <>
      <ClientPortfolioShell<BookkeepingClientDoc, {}>
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
        emptyExtra={{}}
        onAddClient={() => setShowClientForm(true)}
        renderListBadges={(a: Agg) => (
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${darkMode ? "bg-zinc-800 text-zinc-500" : "bg-slate-100 text-slate-500"}`}>
            {a.nbTransactions} transaction(s)
          </span>
        )}
        renderDetailBody={(a: Agg) => (
          <button
            onClick={() => setVista("reportes")}
            className={`w-full sm:w-auto flex items-center gap-2 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${darkMode ? "border-blue-700/40 text-blue-400 hover:bg-blue-900/20" : "border-blue-200 text-blue-600 hover:bg-blue-50"}`}
          >
            <BookOpen size={14} />Aller à la Tenue de Livres de {a.nom}
          </button>
        )}
      />

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
              <input
                type="text"
                value={clientForm.secteurActivite}
                onChange={(e) => setClientForm({ ...clientForm, secteurActivite: e.target.value })}
                placeholder="Secteur d'activité (ex: Restaurant)"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${darkMode ? "bg-zinc-950/50 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"}`}
              />
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
