import React, { useState } from "react";
import { Building2, Save, FileText, Upload, Trash2, ShieldAlert, ArrowLeft, FileUp, Loader2, Sparkles, X, CheckCircle2, Users } from "lucide-react";
import { dataService } from "../lib/dataService";
import { auth, storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getCompanyDriveConfig, uploadDocumentToDrive } from "../lib/driveService";
import { extractPayrollDataFromDocument, type PayrollEmployeeRow } from "../lib/gemini";

interface HeuresPaieViewProps {
  paieRecords: any[];
  setPaieRecords: React.Dispatch<React.SetStateAction<any[]>>;
  darkMode: boolean;
  activeLang: "FR" | "ES" | "EN";
  currentCompany: { nombre: string; id: string; ownerId?: string } | null;
  playNotificationSound?: () => void;
  setVista: (v: string) => void;
  goBack: () => void;
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
  goBack,
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
      success: "Enregistrement sauvegardé et intégré au rapport général.",
      importTitle: "Importer un rapport de paie",
      importSubtitle: "Fourni par une entreprise externe (Nethris, Employeur D, etc.)",
      importCta: "Importer un rapport de paie",
      importUpload: "Sélectionner le rapport (PDF/JPG/PNG)",
      importExtract: "Extraire les données",
      importExtracting: "Extraction en cours...",
      importReview: "Vérifiez et corrigez les montants avant d'enregistrer",
      importEmployee: "Employé",
      importConfirm: "Confirmer et enregistrer",
      importSaving: "Enregistrement en cours...",
      importCancel: "Annuler",
      importBadge: "Provenant d'un tiers",
      importDisclaimer: "Ces montants proviennent d'un rapport externe — AutoCompt ne les a pas calculés. La responsabilité du calcul revient au fournisseur qui a produit ce rapport.",
      importNoRows: "Aucun employé détecté — vérifiez le document ou ajoutez une ligne manuellement.",
      importAddRow: "Ajouter une ligne",
      importSuccess: "Rapport de paie importé et intégré au registre.",
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
      success: "Registro guardado e integrado al reporte general.",
      importTitle: "Importar un reporte de nómina",
      importSubtitle: "Provisto por una empresa externa (Nethris, Employeur D, etc.)",
      importCta: "Importar un reporte de nómina",
      importUpload: "Seleccionar el reporte (PDF/JPG/PNG)",
      importExtract: "Extraer los datos",
      importExtracting: "Extrayendo...",
      importReview: "Revisa y corrige los montos antes de guardar",
      importEmployee: "Empleado",
      importConfirm: "Confirmar y guardar",
      importSaving: "Guardando...",
      importCancel: "Cancelar",
      importBadge: "Proviene de un tercero",
      importDisclaimer: "Estos montos vienen de un reporte externo — AutoCompt no los calculó. La responsabilidad del cálculo es del proveedor que generó este reporte.",
      importNoRows: "No se detectaron empleados — revisa el documento o agrega una línea manualmente.",
      importAddRow: "Agregar línea",
      importSuccess: "Reporte de nómina importado e integrado al registro.",
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
      success: "Record saved and integrated into the general report.",
      importTitle: "Import a payroll report",
      importSubtitle: "Provided by an external company (Nethris, Employeur D, etc.)",
      importCta: "Import a payroll report",
      importUpload: "Select the report (PDF/JPG/PNG)",
      importExtract: "Extract the data",
      importExtracting: "Extracting...",
      importReview: "Review and correct the amounts before saving",
      importEmployee: "Employee",
      importConfirm: "Confirm and save",
      importSaving: "Saving...",
      importCancel: "Cancel",
      importBadge: "From a third party",
      importDisclaimer: "These amounts come from an external report — AutoCompt did not calculate them. Responsibility for the calculation belongs to the provider who produced this report.",
      importNoRows: "No employees detected — check the document or add a row manually.",
      importAddRow: "Add a row",
      importSuccess: "Payroll report imported and integrated into the ledger.",
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
    success: "Enregistré avec succès.",
    importTitle: "Importer un rapport de paie",
    importSubtitle: "",
    importCta: "Importer un rapport de paie",
    importUpload: "Sélectionner le rapport",
    importExtract: "Extraire",
    importExtracting: "Extraction...",
    importReview: "Vérifiez avant d'enregistrer",
    importEmployee: "Employé",
    importConfirm: "Confirmer",
    importSaving: "Enregistrement...",
    importCancel: "Annuler",
    importBadge: "Provenant d'un tiers",
    importDisclaimer: "Ces montants proviennent d'un rapport externe — AutoCompt ne les a pas calculés.",
    importNoRows: "Aucun employé détecté.",
    importAddRow: "Ajouter une ligne",
    importSuccess: "Importé avec succès.",
  };

  const [description, setDescription] = useState("");
  const [brut, setBrut] = useState("");
  const [deductions, setDeductions] = useState("");
  const [net, setNet] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  // ── Import d'un rapport de paie externe ───────────────────────────────────
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [importPeriode, setImportPeriode] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<PayrollEmployeeRow[]>([]);
  const [isSavingImport, setIsSavingImport] = useState(false);

  const resetImportState = () => {
    setImportFile(null);
    setExtractError("");
    setImportPeriode(null);
    setImportRows([]);
    setIsExtracting(false);
    setIsSavingImport(false);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleExtractImport = async () => {
    if (!importFile) return;
    setIsExtracting(true);
    setExtractError("");
    try {
      const base64 = await fileToBase64(importFile);
      const result = await extractPayrollDataFromDocument(base64, importFile.type || "application/pdf");
      setImportPeriode(result.periode);
      setImportRows(result.employees.length > 0 ? result.employees : [{ nom: "", brut: 0, deductions: 0, net: 0 }]);
    } catch (err: any) {
      console.error("Payroll extraction failed:", err);
      setExtractError(err?.message || "Échec de l'extraction.");
    } finally {
      setIsExtracting(false);
    }
  };

  const updateImportRow = (index: number, field: keyof PayrollEmployeeRow, value: string) => {
    setImportRows((prev) => prev.map((row, i) => {
      if (i !== index) return row;
      if (field === "nom") return { ...row, nom: value };
      const num = parseFloat(value.replace(/[^0-9.-]+/g, "")) || 0;
      return { ...row, [field]: num };
    }));
  };

  const addImportRow = () => setImportRows((prev) => [...prev, { nom: "", brut: 0, deductions: 0, net: 0 }]);
  const removeImportRow = (index: number) => setImportRows((prev) => prev.filter((_, i) => i !== index));

  const handleConfirmImport = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !currentCompany) return;
    const validRows = importRows.filter((r) => r.nom.trim());
    if (validRows.length === 0) return;

    setIsSavingImport(true);
    try {
      // Prefer the company's connected Google Drive over AutoCompt Storage —
      // same precedence used everywhere else a document is archived.
      let sourceFileUrl = "";
      if (importFile) {
        const driveOwnerId = currentCompany.ownerId || uid;
        try {
          const driveStatus = await getCompanyDriveConfig(currentCompany.id, driveOwnerId);
          if (driveStatus?.connected) {
            const base64 = await fileToBase64(importFile);
            const driveResult = await uploadDocumentToDrive(
              currentCompany.id, driveOwnerId, base64, importFile.name,
              importFile.type || "application/pdf", currentCompany.nombre || "Entreprise", "Paie",
            );
            if (driveResult.success && driveResult.webViewLink) sourceFileUrl = driveResult.webViewLink;
          }
        } catch (err) {
          console.error("Payroll report upload to Drive failed (falling back to Storage):", err);
        }
        if (!sourceFileUrl) {
          try {
            const path = `payrollReports/${uid}/${Date.now()}_${importFile.name}`;
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, importFile);
            sourceFileUrl = await getDownloadURL(storageRef);
          } catch (err) {
            console.error("Payroll report upload to Storage failed (non-blocking):", err);
          }
        }
      }

      for (const row of validRows) {
        const rawRecord = {
          id: `import_${Date.now()}_${Math.floor(Math.random() * 1000)}_${row.nom.replace(/\s+/g, "_")}`,
          companyId: currentCompany.id,
          nom: row.nom,
          frequence: "Import",
          montantBase: row.brut,
          deductions: row.deductions,
          neto: row.net,
          statut: "Payé",
          date: new Date().toISOString().split("T")[0],
          fileUrl: sourceFileUrl,
          source: "rapport_externe" as const,
        };
        const saved = await dataService.savePayrollRecordWithJournal(uid, rawRecord);
        setPaieRecords((prev: any) => [saved, ...prev]);

        setAutonomeExpenses((prev: any) => [...prev, {
          id: `DEP-SAL-${Date.now()}-${row.nom.replace(/\s+/g, "_")}`,
          date: new Date().toLocaleDateString("fr-CA"),
          marchand: row.nom,
          category: "Salaires",
          subtotalNet: row.brut,
          tps: 0,
          tvq: 0,
          totalAmount: row.brut,
          concilie: true,
          fileUrl: sourceFileUrl || "#",
        }]);
      }

      if (playNotificationSound) playNotificationSound();
      alert(t.importSuccess);
      setShowImportModal(false);
      resetImportState();
    } catch (err) {
      console.error("Failed to save imported payroll report:", err);
      alert("Erreur lors de l'enregistrement du rapport de paie.");
    } finally {
      setIsSavingImport(false);
    }
  };

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

  const handleSave = async () => {
    if (!description || !brut) return;

    const uid = auth.currentUser?.uid;
    const companyId = currentCompany?.id || "1";

    const bVal = parseFloat(brut.replace(/[^0-9.-]+/g, "")) || 0;
    const dVal = parseFloat(deductions.replace(/[^0-9.-]+/g, "")) || 0;
    const nVal = parseFloat(net.replace(/[^0-9.-]+/g, "")) || 0;

    const rawRecord = {
      id: "",
      companyId,
      nom: description,
      frequence: "Manuel",
      montantBase: bVal,
      deductions: dVal,
      neto: nVal,
      statut: "Payé",
      date: new Date().toISOString().split("T")[0],
      fileUrl,
      source: "manuel" as const,
    };

    try {
      let savedRecord = rawRecord as any;
      if (uid) {
        // savePayrollRecordWithJournal (not the old savePaieRecord) so this
        // also posts to journalEntries/journalLines — otherwise manual
        // payroll entries never reached the Grand Livre/Balance/exports,
        // only the setAutonomeExpenses list below.
        savedRecord = await dataService.savePayrollRecordWithJournal(uid, rawRecord);
      }

      setPaieRecords((prev: any) => [savedRecord, ...prev]);

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
    } catch (err) {
      console.error("Failed to save payroll record:", err);
      alert("Erreur lors de l'enregistrement du salaire.");
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (confirm("Supprimer cet enregistrement ?")) {
      try {
        const uid = auth.currentUser?.uid;
        if (uid && typeof id === "string" && !id.startsWith("temp_") && !isNaN(Number(id)) === false) {
          // If it's a real Firebase key (string ID, not generated by Date.now() number)
          await dataService.deletePaieRecord(id);
        }
        setPaieRecords(paieRecords.filter(l => l.id !== id));
        if (playNotificationSound) playNotificationSound();
      } catch (err) {
        console.error("Failed to delete payroll record:", err);
        alert("Erreur lors de la suppression du salaire.");
      }
    }
  };

  return (
    <div className={`w-full flex flex-col space-y-6 ${darkMode ? "text-zinc-100" : "text-slate-900"} max-w-4xl mx-auto p-4 md:p-6`}>
      <button
        onClick={goBack}
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
        <button
          onClick={() => { resetImportState(); setShowImportModal(true); }}
          className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase italic tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0"
        >
          <FileUp size={16} />
          <span>{t.importCta}</span>
        </button>
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
                accept="application/pdf, image/jpeg, image/png, image/webp"
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
        
        {paieRecords.filter(r => r.frequence === "Manuel" || r.frequence === "Import").length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs italic">
            {t.noRecords}
          </div>
        ) : (
          <div className="space-y-3">
            {paieRecords.filter(r => r.frequence === "Manuel" || r.frequence === "Import").map((record) => (
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[11px] font-black uppercase tracking-widest">{record.nom}</h4>
                      {record.source === "rapport_externe" && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider ${darkMode ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30" : "bg-indigo-50 text-indigo-700 border border-indigo-200"}`}>
                          <Users size={9} />{t.importBadge}
                        </span>
                      )}
                    </div>
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60" onClick={() => { setShowImportModal(false); resetImportState(); }}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-[32px] border shadow-2xl space-y-5 ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black uppercase italic tracking-tighter flex items-center gap-2">
                  <FileUp size={18} className="text-indigo-500" />
                  {t.importTitle}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  {t.importSubtitle}
                </p>
              </div>
              <button onClick={() => { setShowImportModal(false); resetImportState(); }} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-900 shrink-0">
                <X size={16} />
              </button>
            </div>

            {importRows.length === 0 ? (
              <>
                <div className={`w-full flex items-center px-4 py-4 rounded-2xl border border-dashed ${darkMode ? "border-zinc-805 text-zinc-400" : "border-slate-300 text-slate-500"}`}>
                  <Upload size={16} className="mr-3 shrink-0" />
                  <input
                    type="file"
                    accept="application/pdf, image/jpeg, image/png, image/webp"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="text-[10px] w-full bg-transparent file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                </div>
                {extractError && (
                  <p className="text-[10px] font-bold text-rose-500">{extractError}</p>
                )}
                <button
                  onClick={handleExtractImport}
                  disabled={!importFile || isExtracting}
                  className={`w-full py-4 rounded-2xl text-xs font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2 ${(!importFile || isExtracting) ? "opacity-50 cursor-not-allowed" : "active:scale-95"} bg-indigo-600 hover:bg-indigo-700 text-white`}
                >
                  {isExtracting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  <span>{isExtracting ? t.importExtracting : t.importExtract}</span>
                </button>
              </>
            ) : (
              <>
                <div className={`p-3 rounded-2xl flex items-start gap-2.5 ${darkMode ? "bg-indigo-950/30 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
                  <Users size={16} className="shrink-0 mt-0.5" />
                  <p className="text-[9.5px] font-bold leading-relaxed">{t.importDisclaimer}</p>
                </div>

                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.importReview}</p>
                {importPeriode && (
                  <p className="text-[10px] font-bold text-slate-500">{importPeriode}</p>
                )}

                <div className="space-y-2">
                  {importRows.map((row, i) => (
                    <div key={i} className={`p-3 rounded-2xl border grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-2 items-center ${darkMode ? "bg-zinc-900/50 border-zinc-805" : "bg-slate-50/50 border-slate-100"}`}>
                      <input
                        type="text"
                        value={row.nom}
                        onChange={(e) => updateImportRow(i, "nom", e.target.value)}
                        placeholder={t.importEmployee}
                        className={`px-3 py-2.5 rounded-xl text-[10.5px] font-bold border outline-none bg-transparent ${darkMode ? "text-zinc-200 border-zinc-805" : "text-slate-900 border-slate-200"}`}
                      />
                      <input
                        type="number"
                        value={row.brut || ""}
                        onChange={(e) => updateImportRow(i, "brut", e.target.value)}
                        placeholder={t.brut}
                        className={`px-3 py-2.5 rounded-xl text-[10.5px] font-bold border outline-none bg-transparent ${darkMode ? "text-zinc-200 border-zinc-805" : "text-slate-900 border-slate-200"}`}
                      />
                      <input
                        type="number"
                        value={row.deductions || ""}
                        onChange={(e) => updateImportRow(i, "deductions", e.target.value)}
                        placeholder={t.deductions}
                        className={`px-3 py-2.5 rounded-xl text-[10.5px] font-bold border outline-none bg-transparent ${darkMode ? "text-zinc-200 border-zinc-805" : "text-slate-900 border-slate-200"}`}
                      />
                      <input
                        type="number"
                        value={row.net || ""}
                        onChange={(e) => updateImportRow(i, "net", e.target.value)}
                        placeholder={t.net}
                        className={`px-3 py-2.5 rounded-xl text-[10.5px] font-bold border outline-none bg-emerald-50/50 dark:bg-emerald-900/10 ${darkMode ? "text-emerald-400 border-zinc-805" : "text-emerald-700 border-slate-200"}`}
                      />
                      <button onClick={() => removeImportRow(i)} className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all justify-self-end sm:justify-self-auto">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addImportRow}
                  className={`w-full py-2.5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest border border-dashed transition-all ${darkMode ? "border-zinc-700 text-zinc-400 hover:bg-zinc-900" : "border-slate-300 text-slate-500 hover:bg-slate-50"}`}
                >
                  + {t.importAddRow}
                </button>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowImportModal(false); resetImportState(); }}
                    className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase italic tracking-widest transition-all ${darkMode ? "bg-zinc-900 text-zinc-400 border border-zinc-800" : "bg-slate-50 text-slate-500 border border-slate-200"}`}
                  >
                    {t.importCancel}
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={isSavingImport || importRows.every(r => !r.nom.trim())}
                    className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2 text-white ${(isSavingImport || importRows.every(r => !r.nom.trim())) ? "opacity-50 cursor-not-allowed bg-emerald-600" : "bg-[#059669] hover:bg-emerald-600 active:scale-95"}`}
                  >
                    {isSavingImport ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    <span>{isSavingImport ? t.importSaving : t.importConfirm}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
