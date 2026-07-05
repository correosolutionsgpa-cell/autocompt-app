/**
 * SyndicSettingsPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Paramètres spécifiques au Syndicat de Copropriété (config de l'immeuble),
 * rendu à l'intérieur de SettingsView.tsx uniquement en mode Syndic.
 * Composant autocontenu (fetch/save propres) — persistance Firestore réelle
 * via la collection `syndicSettings` (un doc par entreprise).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from "react";
import { Building2, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { auth } from "../lib/firebase";
import { dataService, type BoardMember } from "../lib/dataService";

export interface SyndicSettingsPanelProps {
  darkMode: boolean;
  companyId: string;
}

const SyndicSettingsPanel: React.FC<SyndicSettingsPanelProps> = ({ darkMode, companyId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [buildingName, setBuildingName] = useState("");
  const [address, setAddress] = useState("");
  const [totalUnits, setTotalUnits] = useState("");
  const [fiscalYearEnd, setFiscalYearEnd] = useState("31 décembre");
  const [reserveFundPercent, setReserveFundPercent] = useState("5");
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !companyId) {
      setIsLoading(false);
      return;
    }
    dataService
      .fetchSyndicSettings(uid, companyId)
      .then((settings) => {
        if (settings) {
          setBuildingName(settings.buildingName);
          setAddress(settings.address);
          setTotalUnits(String(settings.totalUnits));
          setFiscalYearEnd(settings.fiscalYearEnd);
          setReserveFundPercent(String(settings.reserveFundPercent));
          setBoardMembers(settings.boardMembers || []);
        }
      })
      .catch((err) => console.error("Failed to load syndic settings:", err))
      .finally(() => setIsLoading(false));
  }, [companyId]);

  const handleAddMember = () => {
    setBoardMembers((prev) => [...prev, { name: "", role: "" }]);
  };

  const handleMemberChange = (index: number, field: keyof BoardMember, value: string) => {
    setBoardMembers((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const handleRemoveMember = (index: number) => {
    setBoardMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !companyId || isSaving) return;
    setIsSaving(true);
    try {
      await dataService.saveSyndicSettings(uid, {
        companyId,
        buildingName: buildingName.trim(),
        address: address.trim(),
        totalUnits: Number(totalUnits) || 0,
        fiscalYearEnd,
        reserveFundPercent: Number(reserveFundPercent) || 0,
        boardMembers: boardMembers.filter((m) => m.name.trim() || m.role.trim()),
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save syndic settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${
    darkMode ? "bg-zinc-950/50 border-zinc-800 text-white" : "bg-slate-50 border-slate-200"
  }`;
  const labelClass = "text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2";

  return (
    <div
      className={`relative p-8 rounded-[32px] border overflow-hidden ${
        darkMode
          ? "bg-[#090D1A]/60 border-indigo-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl"
          : "bg-white border-indigo-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_30px_rgba(99,102,241,0.05)]"
      }`}
    >
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500/70 via-violet-500/40 to-transparent rounded-full pointer-events-none" />

      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800/60">
        <h2 className="text-sm font-black uppercase tracking-widest flex items-center space-x-2">
          <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Building2 size={18} />
          </span>
          <span>Paramètres de la Copropriété</span>
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 text-left">
              <label className={labelClass}>Nom de l'immeuble</label>
              <input
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder="Ex: Condos Le Marquis"
                className={inputClass}
              />
            </div>
            <div className="space-y-2 text-left">
              <label className={labelClass}>Adresse</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: 123 rue Principale, Montréal, QC"
                className={inputClass}
              />
            </div>
            <div className="space-y-2 text-left">
              <label className={labelClass}>Nombre d'unités</label>
              <input
                type="number"
                value={totalUnits}
                onChange={(e) => setTotalUnits(e.target.value)}
                placeholder="Ex: 24"
                className={inputClass}
              />
            </div>
            <div className="space-y-2 text-left">
              <label className={labelClass}>Fin d'exercice fiscal</label>
              <input
                value={fiscalYearEnd}
                onChange={(e) => setFiscalYearEnd(e.target.value)}
                placeholder="Ex: 31 décembre"
                className={inputClass}
              />
            </div>
            <div className="space-y-2 text-left">
              <label className={labelClass}>Fonds de prévoyance (% des cotisations)</label>
              <input
                type="number"
                value={reserveFundPercent}
                onChange={(e) => setReserveFundPercent(e.target.value)}
                placeholder="Ex: 5"
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Conseil d'Administration</label>
              <button
                onClick={handleAddMember}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600"
              >
                <Plus size={14} /> Ajouter un membre
              </button>
            </div>
            {boardMembers.length === 0 && (
              <p className={`text-xs ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                Aucun membre enregistré.
              </p>
            )}
            {boardMembers.map((member, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={member.name}
                  onChange={(e) => handleMemberChange(index, "name", e.target.value)}
                  placeholder="Nom"
                  className={`flex-1 ${inputClass}`}
                />
                <input
                  value={member.role}
                  onChange={(e) => handleMemberChange(index, "role", e.target.value)}
                  placeholder="Rôle (Président, Trésorier...)"
                  className={`flex-1 ${inputClass}`}
                />
                <button
                  onClick={() => handleRemoveMember(index)}
                  className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : justSaved ? (
                <CheckCircle2 size={14} />
              ) : null}
              {justSaved ? "Enregistré" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyndicSettingsPanel;
