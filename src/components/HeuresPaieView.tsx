import React, { useState } from "react";
import { Building2, Save, FileText, Upload, Trash2, ShieldAlert, ArrowLeft } from "lucide-react";

interface HeuresPaieViewProps {
  paieRecords: any[];
  setPaieRecords: React.Dispatch<React.SetStateAction<any[]>>;
  darkMode: boolean;
  activeLang: "FR" | "ES" | "EN";
  currentCompany: { nombre: string; id: string } | null;
  playNotificationSound?: () => void;
  setVista: (v: string) => void;
  setAutonomeExpenses: React.Dispatch<React.SetStateAction<any[]>>;
}

export const HeuresPaieView: React.FC<HeuresPaieViewProps> = ({
  paieRecords,
  setPaieRecords,
  darkMode,
  activeLang,
  currentCompany,
  playNotificationSound,
  setVista,
  setAutonomeExpenses
}) => {
  const t = {
    FR: {
      title: "Livre des Registres",
      subtitle: "Saisie manuelle des paiements",
      description: "Description (ex: Chèque #1234, Semaine 22)",
      brut: "Salaire Brut ($)",
      deductions: "Déductions (Manuel) ($)",
      net: "Salaire Net ($)",
      attach: "Joindre un document (PDF/JPG)",
      save: "Enregistrer la paie",
      warning: "Module de suivi des paiements. Les calculs doivent être effectués par votre comptable ou un logiciel spécialisé.",
      history: "Historique des enregistrements",
      noRecords: "Aucun enregistrement.",
      success: "Enregistrement sauvegardé et intégré au rapport général."
    },
    ES: {
      title: "Libro de Registros",
      subtitle: "Entrada manual de pagos",
      description: "Descripción (ej: Cheque #1234, Semana 22)",
      brut: "Salario Bruto ($)",
      deductions: "Deducciones (Manual) ($)",
      net: "Salario Neto ($)",
      attach: "Adjuntar comprobante (PDF/JPG)",
      save: "Guardar registro",
      warning: "Módulo de seguimiento de pagos. Los cálculos deben ser realizados por su contador o un software especializado.",
      history: "Historial de registros",
      noRecords: "No hay registros.",
      success: "Registro guardado e integrado al reporte general."
    },
    EN: {
      title: "Logbook",
      subtitle: "Manual payment entry",
      description: "Description (e.g. Check #1234, Week 22)",
      brut: "Gross Salary ($)",
      deductions: "Deductions (Manual) ($)",
      net: "Net Salary ($)",
      attach: "Attach document (PDF/JPG)",
      save: "Save record",
      warning: "Payment tracking module. Calculations must be performed by your accountant or specialized software.",
      history: "Record history",
      noRecords: "No records found.",
      success: "Record saved and integrated into the general report."
    }
  }[activeLang] || {
    title: "Libro de Registros",
    subtitle: "Saisie manuelle des paiements",
    description: "Description",
    brut: "Salaire Brut ($)",
    deductions: "Déductions ($)",
    net: "Salaire Net ($)",
    attach: "Joindre",
    save: "Guardar",
    warning: "Module de suivi des paiements. Les calculs doivent être effectués par votre comptable ou un logiciel spécialisé.",
    history: "Historique des enregistrements",
    noRecords: "Aucun enregistrement.",
    success: "Enregistré avec succès."
  };

  const [description, setDescription] = useState("");
  const [brut, setBrut] = useState("");
  const [deductions, setDeductions] = useState("");
  const [net, setNet] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  const handleBrutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBrut(val);
    updateNet(val, deductions);
  };

  const handleDeductionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDeductions(val);
    updateNet(brut, val);
  };

  const updateNet = (b: string, d: string) => {
    const bVal = parseFloat(b.replace(/[^0-9.-]+/g, "")) || 0;
    const dVal = parseFloat(d.replace(/[^0-9.-]+/g, "")) || 0;
    if (bVal || dVal) {
      setNet((bVal - dVal).toFixed(2));
    } else {
      setNet("");
    }
  };

  const handleSave = () => {
    if (!description || !brut) return;

    const bVal = parseFloat(brut.replace(/[^0-9.-]+/g, "")) || 0;
    const dVal = parseFloat(deductions.replace(/[^0-9.-]+/g, "")) || 0;
    const nVal = parseFloat(net.replace(/[^0-9.-]+/g, "")) || 0;

    const newRecord = {
      id: Date.now(),
      nom: description,
      frequence: "Manuel",
      montantBase: bVal,
      deductions: dVal,
      neto: nVal,
      statut: "Payé",
      date: new Date().toISOString().split("T")[0],
      fileUrl
    };

    setPaieRecords((prev: any) => [newRecord, ...prev]);

    // Integration to autonomous expenses (8-column general report)
    const newExpense = {
      id: `DEP-SAL-${Date.now()}`,
      date: new Date().toLocaleDateString("fr-CA"),
      marchand: description,
      category: "Salaires", // Under the category 'Salaires'
      subtotalNet: bVal,
      tps: 0,
      tvq: 0,
      totalAmount: bVal, // Bruto represents total expense to company
      concilie: true,
      fileUrl: fileUrl || "#"
    };

    setAutonomeExpenses((prev: any) => [...prev, newExpense]);

    if (playNotificationSound) playNotificationSound();
    alert(t.success);

    setDescription("");
    setBrut("");
    setDeductions("");
    setNet("");
    setFileUrl("");
  };

  const handleDeleteLog = (id: string) => {
    if (confirm("Supprimer cet enregistrement ?")) {
      setPaieRecords(paieRecords.filter(l => l.id !== id));
      if (playNotificationSound) playNotificationSound();
    }
  };

  return (
    <div className={`w-full flex flex-col space-y-6 ${darkMode ? "text-zinc-100" : "text-slate-900"} max-w-4xl mx-auto p-4 md:p-6`}>
      <button 
        onClick={() => setVista('dashboard')} 
        className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors font-medium text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour au tableau de bord
      </button>
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter flex items-center space-x-2">
            <span className="p-2 bg-emerald-500/10 text-[#059669] rounded-2xl flex items-center justify-center">
              <Building2 size={24} />
            </span>
            <span>{t.title}</span>
          </h2>
          <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
            {t.subtitle} • {currentCompany?.nombre}
          </p>
        </div>
      </div>

      {/* Manual Entry Form */}
      <div className={`p-6 rounded-[32px] border shadow-sm ${darkMode ? "bg-zinc-950 border-zinc-900" : "bg-white border-slate-200"}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 md:col-span-2">
            <label className="text-[10px] font-black uppercase italic text-slate-400 pl-1">
              {t.description}
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Salaire de Jean..."
              className={`w-full px-4 py-3.5 rounded-2xl text-xs font-bold border outline-none bg-transparent ${
                darkMode ? "text-zinc-200 border-zinc-805" : "text-slate-900 border-slate-200"
              }`}
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase italic text-slate-400 pl-1">
              {t.brut}
            </label>
            <input
              type="number"
              value={brut}
              onChange={handleBrutChange}
              placeholder="0.00"
              className={`w-full px-4 py-3.5 rounded-2xl text-xs font-bold border outline-none bg-transparent ${
                darkMode ? "text-zinc-200 border-zinc-805" : "text-slate-900 border-slate-200"
              }`}
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase italic text-slate-400 pl-1">
              {t.deductions}
            </label>
            <input
              type="number"
              value={deductions}
              onChange={handleDeductionsChange}
              placeholder="0.00"
              className={`w-full px-4 py-3.5 rounded-2xl text-xs font-bold border outline-none bg-transparent ${
                darkMode ? "text-zinc-200 border-zinc-805" : "text-slate-900 border-slate-200"
              }`}
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase italic text-slate-400 pl-1">
              {t.net}
            </label>
            <input
              type="number"
              value={net}
              onChange={e => setNet(e.target.value)}
              placeholder="0.00"
              className={`w-full px-4 py-3.5 rounded-2xl text-xs font-bold border outline-none bg-emerald-50/50 dark:bg-emerald-900/10 ${
                darkMode ? "text-emerald-400 border-zinc-805" : "text-emerald-700 border-slate-200"
              }`}
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase italic text-slate-400 pl-1">
              {t.attach}
            </label>
            <div className={`w-full flex items-center px-4 py-3.5 rounded-2xl border border-dashed ${
              darkMode ? "border-zinc-805 text-zinc-400" : "border-slate-300 text-slate-500"
            }`}>
              <Upload size={16} className="mr-3" />
              <input 
                type="file" 
                onChange={(e) => setFileUrl(e.target.files?.[0]?.name || "")}
                className="text-[10px] w-full bg-transparent file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" 
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!description || !brut}
            className={`px-8 py-4 bg-[#059669] hover:bg-emerald-600 text-white rounded-2xl text-xs uppercase font-black tracking-widest transition-all shadow-md active:scale-95 flex items-center space-x-2 ${(!description || !brut) ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Save size={16} />
            <span>{t.save}</span>
          </button>
        </div>

        {/* Legal Warning */}
        <div className={`mt-8 p-4 rounded-2xl flex items-start gap-3 ${darkMode ? "bg-rose-950/20 text-rose-400" : "bg-rose-50 text-rose-600"}`}>
          <ShieldAlert size={20} className="shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed">
            {t.warning}
          </p>
        </div>
      </div>

      {/* History List */}
      <div className={`p-6 rounded-[32px] border shadow-sm space-y-4 ${darkMode ? "bg-zinc-950 border-zinc-900" : "bg-white border-slate-200"}`}>
        <h3 className="text-xs font-black uppercase tracking-widest border-b pb-4 mb-4 dark:border-zinc-800 border-slate-100">
          {t.history}
        </h3>
        
        {paieRecords.filter(r => r.frequence === "Manuel").length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs italic">
            {t.noRecords}
          </div>
        ) : (
          <div className="space-y-3">
            {paieRecords.filter(r => r.frequence === "Manuel").map((record) => (
              <div 
                key={record.id} 
                className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  darkMode ? "bg-zinc-900/50 border-zinc-805" : "bg-slate-50/50 border-slate-100"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${darkMode ? "bg-zinc-800 text-emerald-400" : "bg-white text-emerald-600 border border-slate-200"}`}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest">{record.nom}</h4>
                    <p className="text-[9px] font-bold text-slate-400 mt-1">{record.date}</p>
                  </div>
                </div>

                <div className="flex flex-wrap md:flex-nowrap items-center gap-6">
                  <div className="text-left">
                    <p className="text-[8px] uppercase font-black text-slate-400">{t.brut}</p>
                    <p className="text-sm font-black text-slate-700 dark:text-zinc-300">
                      {(record.montantBase || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] uppercase font-black text-slate-400">{t.deductions}</p>
                    <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                      {(record.deductions && typeof record.deductions === 'number' ? record.deductions : (record.deducciones || 0)).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                    </p>
                  </div>
                  <div className="text-left border-l pl-4 dark:border-zinc-800">
                    <p className="text-[8px] uppercase font-black text-slate-400">{t.net}</p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {(record.neto || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteLog(record.id)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all ml-auto md:ml-4"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
