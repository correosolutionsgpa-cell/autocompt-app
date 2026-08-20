/**
 * StyledSelect.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in replacement for the native <select> — AutoCompt's UI never uses the
 * browser's own select styling, only a button + panel look. Values are always
 * strings (like a real <select>); callers coerce numeric/typed values the
 * same way they already do for the native element (+e.target.value etc).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface StyledSelectOption {
  value: string;
  label: string;
  /** Optional group header (mirrors native <optgroup>) — a small uppercase
   *  label is rendered once, right before the first option of each new
   *  group encountered in list order. */
  group?: string;
}

interface StyledSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: StyledSelectOption[];
  darkMode?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function StyledSelect({
  value, onChange, options, darkMode, placeholder = 'Sélectionner…', className, disabled,
}: StyledSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const D = !!darkMode;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={className || `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          D ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-750' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
      >
        <span className={`truncate ${!current ? (D ? 'text-zinc-500' : 'text-slate-400') : ''}`}>{current?.label || placeholder}</span>
        <ChevronDown size={13} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <div className={`absolute z-30 mt-1.5 min-w-full w-max max-w-[min(90vw,24rem)] max-h-64 overflow-y-auto rounded-xl border shadow-lg py-1 ${
          D ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
        }`}>
          {options.length === 0 && (
            <p className={`px-3.5 py-2 text-[10px] font-bold ${D ? 'text-zinc-600' : 'text-slate-300'}`}>Aucune option</p>
          )}
          {options.map((o, i) => (
            <React.Fragment key={o.value}>
              {o.group && o.group !== options[i - 1]?.group && (
                <p className={`px-3.5 pt-2 pb-1 text-[9px] font-black uppercase tracking-widest ${D ? 'text-zinc-600' : 'text-slate-400'}`}>{o.group}</p>
              )}
              <button
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2 text-[11px] font-semibold transition-colors ${
                  o.value === value
                    ? (D ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                    : (D ? 'text-zinc-300 hover:bg-zinc-800' : 'text-slate-700 hover:bg-slate-50')
                }`}
              >
                {o.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
