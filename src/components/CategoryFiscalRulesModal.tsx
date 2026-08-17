/**
 * CategoryFiscalRulesModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Configure les règles de déduction fiscale par catégorie de dépense
 * (full/half/mileage/homeoffice) — remplace `customDossiers`, une table
 * figée en dur dans App.tsx qu'aucun utilisateur ne pouvait éditer. Calqué
 * structurellement sur le modal "Configurer le budget" de
 * SyndicTransparencyDashboard.tsx (même pattern état/load/save).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader2, Info } from 'lucide-react';
import { auth } from '../lib/firebase';
import { dataService } from '../lib/dataService';
import type { CategoryFiscalRuleEntry, FiscalRule } from '../lib/fiscalRules';

const RULE_OPTIONS: { value: FiscalRule; label: string }[] = [
  { value: 'full', label: '100 % déductible' },
  { value: 'half', label: '50 % déductible' },
  { value: 'mileage', label: 'Selon kilométrage (véhicule)' },
  { value: 'homeoffice', label: 'Selon bureau à domicile' },
];

interface CategoryFiscalRulesModalProps {
  show: boolean;
  onClose: () => void;
  darkMode: boolean;
  activeCompanyId: string;
  rules: CategoryFiscalRuleEntry[];
  onSaved: (rules: CategoryFiscalRuleEntry[]) => void;
}

export default function CategoryFiscalRulesModal({
  show,
  onClose,
  darkMode,
  activeCompanyId,
  rules,
  onSaved,
}: CategoryFiscalRulesModalProps) {
  const [editRows, setEditRows] = useState<{ categoryName: string; rule: FiscalRule }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setEditRows(rules.length > 0 ? rules.map((r) => ({ ...r })) : [{ categoryName: '', rule: 'full' }]);
    }
  }, [show, rules]);

  if (!show) return null;

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeCompanyId) return;
    setIsSaving(true);
    try {
      const cleanRules = editRows.filter((r) => r.categoryName.trim());
      const saved = await dataService.saveCategoryFiscalRules(uid, {
        companyId: activeCompanyId,
        rules: cleanRules,
      });
      onSaved(saved.rules);
      onClose();
    } catch (e) {
      console.error('[CategoryFiscalRulesModal] saveCategoryFiscalRules failed:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[32px] border p-6 space-y-4 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-base font-black uppercase italic tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Règles fiscales des catégories
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500">
            <X size={18} />
          </button>
        </div>

        <div className={`p-3 rounded-2xl border flex items-start gap-2 text-[10px] font-medium leading-relaxed ${darkMode ? 'bg-indigo-900/10 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
          <Info size={13} className="shrink-0 mt-0.5" />
          <p>Associe chaque nom de catégorie de dépense (exactement comme saisi ailleurs dans l'app) à son taux de déduction fiscale. Utilisé pour calculer les TPS/TVQ déductibles dans Tenue de Livres et Rapport Comptable.</p>
        </div>

        <div className="space-y-2">
          {editRows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={row.categoryName}
                onChange={(e) => setEditRows((prev) => prev.map((r, ri) => (ri === i ? { ...r, categoryName: e.target.value } : r)))}
                placeholder="Nom de la catégorie"
                className={`flex-1 p-2.5 rounded-xl text-[11px] font-bold border outline-none ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
              <div className="flex gap-1 shrink-0">
                {RULE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => setEditRows((prev) => prev.map((r, ri) => (ri === i ? { ...r, rule: opt.value } : r)))}
                    className={`px-2 py-2 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all ${
                      row.rule === opt.value
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : darkMode ? 'border-zinc-800 text-zinc-500' : 'border-slate-200 text-slate-400'
                    }`}
                  >
                    {opt.value === 'full' ? '100%' : opt.value === 'half' ? '50%' : opt.value === 'mileage' ? '🚗' : '🏠'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setEditRows((prev) => prev.filter((_, ri) => ri !== i))}
                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setEditRows((prev) => [...prev, { categoryName: '', rule: 'full' }])}
            className={`w-full py-2.5 rounded-xl border border-dashed text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 ${darkMode ? 'border-zinc-700 text-zinc-500 hover:bg-zinc-900' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}
          >
            <Plus size={12} /> Ajouter une catégorie
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
