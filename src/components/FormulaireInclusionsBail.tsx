import React, { useState } from 'react';
import { ShieldCheck, Zap, Globe, Layout, Sparkles } from 'lucide-react';

interface FormulaireInclusionsBailProps {
  darkMode?: boolean;
}

export default function FormulaireInclusionsBail({ darkMode = false }: FormulaireInclusionsBailProps) {
  const [inclusions, setInclusions] = useState({
    hydro: false,
    internet: false,
    furnitures: false,
    cleaning: false
  });

  const toggleInclusion = (key: keyof typeof inclusions) => {
    setInclusions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const services = [
    {
      key: 'hydro' as const,
      title: 'Électricité / Chauffage',
      subtitle: 'Hydro-Québec',
      icon: Zap,
      activeTextColor: 'text-emerald-600 dark:text-emerald-400',
      activeBgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
      activeBorderColor: 'border-emerald-200 dark:border-emerald-500/30',
      switchBg: 'bg-emerald-500'
    },
    {
      key: 'internet' as const,
      title: 'Télécommunications',
      subtitle: 'Internet haut débit',
      icon: Globe,
      activeTextColor: 'text-indigo-600 dark:text-indigo-400',
      activeBgColor: 'bg-indigo-50 dark:bg-indigo-500/10',
      activeBorderColor: 'border-indigo-200 dark:border-indigo-500/30',
      switchBg: 'bg-indigo-500'
    },
    {
      key: 'furnitures' as const,
      title: 'Meubles et Électroménagers',
      subtitle: 'Amortissement DPA',
      icon: Layout,
      activeTextColor: 'text-amber-600 dark:text-amber-400',
      activeBgColor: 'bg-amber-50 dark:bg-amber-500/10',
      activeBorderColor: 'border-amber-200 dark:border-amber-500/30',
      switchBg: 'bg-amber-500'
    },
    {
      key: 'cleaning' as const,
      title: 'Services d\'entretien',
      subtitle: 'Ménage entre séjours',
      icon: Sparkles,
      activeTextColor: 'text-teal-600 dark:text-teal-400',
      activeBgColor: 'bg-teal-50 dark:bg-teal-500/10',
      activeBorderColor: 'border-teal-200 dark:border-teal-500/30',
      switchBg: 'bg-teal-500'
    }
  ];

  return (
    <div className={`w-full max-w-2xl mx-auto rounded-[32px] p-6 sm:p-8 shadow-sm transition-colors duration-300 ${darkMode ? "bg-zinc-900/50 border border-zinc-800" : "bg-white border border-slate-200"}`}>
      
      {/* Title Header */}
      <h2 className={`text-lg font-black uppercase italic tracking-tighter mb-8 ${darkMode ? "text-white" : "text-slate-900"}`}>
        Inclusions & Services <span className="text-slate-400 dark:text-zinc-500 text-[10px] tracking-widest">(Déductibles)</span>
      </h2>

      {/* Services List */}
      <div className="space-y-4 mb-8">
        {services.map((service) => {
          const isActive = inclusions[service.key];
          const Icon = service.icon;

          return (
            <div 
              key={service.key}
              onClick={() => toggleInclusion(service.key)}
              className={`flex items-center justify-between p-5 rounded-[24px] cursor-pointer transition-all duration-300 border ${
                isActive 
                  ? `${service.activeBgColor} ${service.activeBorderColor} shadow-sm` 
                  : `${darkMode ? "bg-zinc-950/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50" : "bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-slate-100/50"}`
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl transition-colors duration-300 ${
                  isActive 
                    ? `bg-white dark:bg-black/20 shadow-sm ${service.activeTextColor}` 
                    : `${darkMode ? "bg-zinc-900 text-zinc-500" : "bg-white text-slate-400"} shadow-sm`
                }`}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className={`font-black text-sm transition-colors duration-300 ${
                    isActive 
                      ? service.activeTextColor 
                      : darkMode ? "text-zinc-300" : "text-slate-700"
                  }`}>
                    {service.title}
                  </h3>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 transition-colors duration-300 ${
                    isActive 
                      ? `opacity-80 ${service.activeTextColor}` 
                      : darkMode ? "text-zinc-600" : "text-slate-400"
                  }`}>
                    {service.subtitle}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                role="switch"
                aria-checked={isActive}
                type="button"
                className={`relative inline-flex h-[28px] w-[52px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-opacity-75 ${
                  isActive 
                    ? service.switchBg 
                    : darkMode ? "bg-zinc-800" : "bg-slate-200"
                }`}
              >
                <span className="sr-only">Toggle {service.title}</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                    isActive ? "translate-x-[24px]" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Fiscal Message Footer */}
      <div className={`flex items-start gap-3 p-4 rounded-2xl ${darkMode ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-emerald-50 border border-emerald-100"}`}>
        <div className={`mt-0.5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
          <ShieldCheck size={18} />
        </div>
        <p className={`text-xs font-medium leading-relaxed ${darkMode ? "text-emerald-200/80" : "text-emerald-800/80"}`}>
          Les services activés seront automatiquement classés comme <span className="font-bold">dépenses déductibles à 100%</span> lors de la numérisation des factures.
        </p>
      </div>

    </div>
  );
}
