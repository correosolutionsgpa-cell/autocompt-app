/**
 * FiscalDeadlinesModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Configure les échéances fiscales (TPS/TVQ, impôt sur le revenu) saisies
 * manuellement — remplace un avis figé en dur ("dans 5 jours") dans
 * Tenue de Livres. Calqué structurellement sur CategoryFiscalRulesModal.tsx.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Info } from 'lucide-react';
import { auth } from '../lib/firebase';
import { dataService } from '../lib/dataService';
import type { FiscalDeadlineDoc } from '../lib/dataService';

const TYPE_OPTIONS: { value: FiscalDeadlineDoc['type']; label: string }[] = [
  { value: 'tps_tvq', label: 'TPS/TVQ' },
  { value: 'impot_revenu', label: "Impôt sur le revenu" },
  { value: 'autre', label: 'Autre' },
];

const RECURRENCE_OPTIONS: { value: FiscalDeadlineDoc['recurrence']; label: string }[] = [
  { value: 'aucune', label: 'Aucune' },
  { value: 'mensuelle', label: 'Mensuelle' },
  { value: 'trimestrielle', label: 'Trimestrielle' },
  { value: 'annuelle', label: 'Annuelle' },
];

interface FiscalDeadlinesModalProps {
  show: boolean;
  onClose: () => void;
  darkMode: boolean;
  activeCompanyId: string;
  deadlines: FiscalDeadlineDoc[];
  onSaved: (deadline: FiscalDeadlineDoc) => void;
  onDeleted: (id: string) => void;
}

export default function FiscalDeadlinesModal({
  show,
  onClose,
  darkMode,
  activeCompanyId,
  deadlines,
  onSaved,
  onDeleted,
}: FiscalDeadlinesModalProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<FiscalDeadlineDoc['type']>('tps_tvq');
  const [newDueDate, setNewDueDate] = useState('');
  const [newRecurrence, setNewRecurrence] = useState<FiscalDeadlineDoc['recurrence']>('aucune');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setNewLabel('');
      setNewType('tps_tvq');
      setNewDueDate('');
      setNewRecurrence('aucune');
    }
  }, [show]);

  if (!show) return null;

  const handleAdd = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeCompanyId || !newLabel.trim() || !newDueDate) return;
    setIsSaving(true);
    try {
      const saved = await dataService.saveFiscalDeadline(uid, {
        companyId: activeCompanyId,
        type: newType,
        label: newLabel.trim(),
        dueDate: newDueDate,
        recurrence: newRecurrence,
      });
      onSaved(saved);
      setNewLabel('');
      setNewDueDate('');
      setNewRecurrence('aucune');
    } catch (e) {
      console.error('[FiscalDeadlinesModal] saveFiscalDeadline failed:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await dataService.deleteFiscalDeadline(id);
      onDeleted(id);
    } catch (e) {
      console.error('[FiscalDeadlinesModal] deleteFiscalDeadline failed:', e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[32px] border p-6 space-y-4 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-base font-black uppercase italic tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Échéances fiscales
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500">
            <X size={18} />
          </button>
        </div>

        <div className={`p-3 rounded-2xl border flex items-start gap-2 text-[10px] font-medium leading-relaxed ${darkMode ? 'bg-indigo-900/10 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
          <Info size={13} className="shrink-0 mt-0.5" />
          <p>Entrez vous-même chaque date exacte (la vôtre ou celle donnée par votre comptable) — AutoCompt ne calcule aucune règle fiscale, il compte seulement les jours et vous avertit.</p>
        </div>

        {deadlines.length > 0 && (
          <div className="space-y-2">
            {deadlines.map((d) => (
              <div key={d.id} className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${darkMode ? 'border-zinc-800 bg-zinc-900/20' : 'border-slate-100 bg-slate-50'}`}>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold truncate">{d.label}</p>
                  <p className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    {d.dueDate} · {TYPE_OPTIONS.find((t) => t.value === d.type)?.label} · {RECURRENCE_OPTIONS.find((r) => r.value === d.recurrence)?.label}
                  </p>
                </div>
                <button
                  disabled={deletingId === d.id}
                  onClick={() => handleDelete(d.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 shrink-0 disabled:opacity-50"
                >
                  {deletingId === d.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={`h-px ${darkMode ? 'bg-zinc-800' : 'bg-slate-100'}`} />

        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ajouter une échéance</p>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Ex: Déclaration TPS/TVQ T3 2026"
            className={`w-full p-2.5 rounded-xl text-[11px] font-bold border outline-none ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
          />
          <div className="flex gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNewType(opt.value)}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                  newType === opt.value ? 'bg-indigo-600 text-white border-indigo-600' : darkMode ? 'border-zinc-800 text-zinc-500' : 'border-slate-200 text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className={`w-full p-2.5 rounded-xl text-[11px] font-bold border outline-none ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
          />
          <div className="flex gap-2">
            {RECURRENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNewRecurrence(opt.value)}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                  newRecurrence === opt.value ? 'bg-indigo-600 text-white border-indigo-600' : darkMode ? 'border-zinc-800 text-zinc-500' : 'border-slate-200 text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleAdd}
            disabled={isSaving || !newLabel.trim() || !newDueDate}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
