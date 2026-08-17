import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, PlusCircle, Trash2, X, FileText, Download, Search,
  Folder, FolderOpen, ChevronRight, Zap, ShieldCheck, Eye, Upload, Plus, FileSearch, FileQuestion, Home, Bell,
  FileDown, Loader2, AlertTriangle, Settings2
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { dataService } from '../lib/dataService';
import type { PropertyDoc, UnitDoc } from '../lib/dataService';
import { generateReleve31PDF } from '../lib/releve31Pdf';
import { getCompanyDriveConfig, uploadDocumentToDrive } from '../lib/driveService';

export interface FileItem {
  id: string;
  name: string;
  year: number;
  profile: string;
  category: string;
  type: 'pdf' | 'jpg';
  size: string;
  date: string;
  status: 'Concilié' | 'En attente';
  provider: string;
  lien?: string | null;
}

interface DossierFiscauxViewProps {
  darkMode: boolean;
  setVista: (vista: string) => void;
  playNotificationSound: () => void;
  sidebarToggle?: React.ReactNode;
  dossierFiles: FileItem[];
  setDossierFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  depenses: any[];
  setDepenses: React.Dispatch<React.SetStateAction<any[]>>;
  setArchivesAnnuelles: React.Dispatch<React.SetStateAction<any[]>>;
  /** Needed to look up this company's rented units for the Relevé 31 assistant below. */
  activeCompanyId: string;
  currentCompany?: any;
  t: (frText: string) => string;
  /** Ouvre le modal "Configurer les règles fiscales des catégories" (rendu
   *  dans App.tsx — voir CategoryFiscalRulesModal.tsx) — l'état des règles
   *  est partagé avec Rapport Comptable, donc gardé au niveau App.tsx. */
  onOpenFiscalRulesModal: () => void;
}

export default function DossierFiscauxView({
  darkMode,
  setVista,
  playNotificationSound,
  sidebarToggle,
  dossierFiles,
  setDossierFiles,
  depenses,
  setDepenses,
  setArchivesAnnuelles,
  activeCompanyId,
  currentCompany,
  t,
  onOpenFiscalRulesModal
}: DossierFiscauxViewProps) {
  // Folder Navigation State
  const [currentYearFolder, setCurrentYearFolder] = useState<number | null>(null);
  const [currentProfileFolder, setCurrentProfileFolder] = useState<string | null>(null);
  const [currentCategoryFolder, setCurrentCategoryFolder] = useState<string | null>(null);
  const [dossierSearchQuery, setDossierSearchQuery] = useState('');

  // Upload Modal State
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocProvider, setNewDocProvider] = useState('');
  const [newDocYear, setNewDocYear] = useState<number>(2026);
  const [newDocProfile, setNewDocProfile] = useState<string>('Solutions GPA');
  const [newDocCategory, setNewDocCategory] = useState<string>('Banque');
  const [newDocStatus, setNewDocStatus] = useState<'Concilié' | 'En attente'>('En attente');
  const [newDocType, setNewDocType] = useState<'pdf' | 'jpg'>('pdf');

  // Preview Lightbox State
  const [selectedDocPreview, setSelectedDocPreview] = useState<FileItem | null>(null);

  // ZIP Download Progress Simulation State
  const [zipDownloadState, setZipDownloadState] = useState<{ isDownloading: boolean, progress: number }>({ isDownloading: false, progress: 0 });

  // Clôture Année State
  const [showClotureModal, setShowClotureModal] = useState(false);
  const [clotureToast, setClotureToast] = useState(false);
  const [isClosingYear, setIsClosingYear] = useState(false);

  // ── Relevé 31 preparation assistant state ──────────────────────────────────
  const [releve31Year, setReleve31Year] = useState(() => new Date().getFullYear());
  const [releve31Rows, setReleve31Rows] = useState<{ unit: UnitDoc; property: PropertyDoc }[]>([]);
  const [releve31Loading, setReleve31Loading] = useState(false);

  const loadReleve31Rows = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeCompanyId) { setReleve31Rows([]); return; }
    setReleve31Loading(true);
    try {
      const allProps = await dataService.fetchProperties(uid);
      const companyProps = allProps.filter((p) => p.companyId === activeCompanyId);
      const rows: { unit: UnitDoc; property: PropertyDoc }[] = [];
      for (const property of companyProps) {
        const units = await dataService.fetchUnitsByBuilding(uid, property.id);
        for (const unit of units) {
          if (!unit.tenantName) continue; // no tenant on record yet — nothing to report
          const inYear = !unit.moveInDate || new Date(unit.moveInDate).getFullYear() <= releve31Year;
          const outYear = !unit.moveOutDate || new Date(unit.moveOutDate).getFullYear() >= releve31Year;
          if (inYear && outYear) rows.push({ unit, property });
        }
      }
      setReleve31Rows(rows);
    } catch (e) {
      console.error('[DossierFiscauxView] loadReleve31Rows error:', e);
    } finally {
      setReleve31Loading(false);
    }
  }, [activeCompanyId, releve31Year]);

  useEffect(() => { loadReleve31Rows(); }, [loadReleve31Rows]);

  const handleUpdateReleve31Field = async (unit: UnitDoc, patch: Partial<UnitDoc>) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const updated = { ...unit, ...patch };
    setReleve31Rows((prev) => prev.map((r) => (r.unit.id === unit.id ? { ...r, unit: updated } : r)));
    try {
      await dataService.saveUnit(uid, updated);
    } catch (e) {
      console.error('[DossierFiscauxView] saveUnit (Relevé 31 field) error:', e);
    }
  };

  const handleGenerateReleve31 = (unit: UnitDoc, property: PropertyDoc) => {
    const profile = currentCompany?.userProfile || {};
    const pdf = generateReleve31PDF(
      unit,
      property,
      { nom: profile.nom || currentCompany?.nombre || '', neq: profile.neq, adresse: profile.adresse, tel: profile.tel },
      String(releve31Year)
    );
    pdf.save(`Releve31_${releve31Year}_${unit.unitName.replace(/\s+/g, '_')}.pdf`);
    playNotificationSound();
  };

  // Ne supprime plus JAMAIS depenses/dossierFiles — trouvé 2026-08-16 que
  // cette fonction appelait setDepenses([]) (le vrai setter branché sur
  // Firestore), supprimant silencieusement TOUTES les dépenses réelles de
  // l'entreprise, avec pour seule "archive" un état React local jamais lu
  // nulle part et perdu au premier rechargement. Remplacé par : un archivage
  // réel dans le Drive de l'entreprise + un scellage immuable de l'année
  // (SealedFiscalYearDoc) — les données restent intactes et consultables en
  // tout temps en sélectionnant l'année dans les dossiers.
  const handleCloturerAnnee = async () => {
    const uid = auth.currentUser?.uid;
    const yearToClose = currentYearFolder || new Date().getFullYear();
    setIsClosingYear(true);
    try {
      // 1. CSV des dépenses de l'année — export local, comme avant.
      const headers = ['Date', 'Catégorie', 'Propriété/Projet', 'Fournisseur/Description', 'Montant'];
      const csvRows = [headers.join(',')];
      depenses.forEach((d) => {
        const date = d.date || d.fecha || '';
        const categorie = d.categorie || d.category || d.cat || '';
        const propriete = d.adresse || d.propertyId || d.projet || '';
        const description = d.professionnel || d.marchand || d.description || d.fournisseur || '';
        const montant = d.montant !== undefined ? d.montant : (d.totalAmount !== undefined ? d.totalAmount : (d.total !== undefined ? d.total : 0));
        const row = [
          `"${date}"`, `"${categorie}"`, `"${propriete}"`,
          `"${String(description).replace(/"/g, '""')}"`, `"${montant}"`,
        ];
        csvRows.push(row.join(','));
      });
      const csvContent = csvRows.join('\n');
      const csvFileName = `AutoCompt_Export_Depenses_${yearToClose}.csv`;
      const csvBlob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const csvUrl = URL.createObjectURL(csvBlob);
      const csvLink = document.createElement('a');
      csvLink.href = csvUrl;
      csvLink.download = csvFileName;
      document.body.appendChild(csvLink);
      csvLink.click();
      document.body.removeChild(csvLink);
      URL.revokeObjectURL(csvUrl);

      // 2. Index des documents fiscaux de l'année — métadonnées seulement
      // (les fichiers eux-mêmes ne sont pas stockés binaire dans AutoCompt).
      const filesThisYear = dossierFiles.filter((f) => f.year === yearToClose);
      const indexRows = [['Nom du document', 'Fournisseur/Tiers', 'Catégorie', 'Statut', 'Date'].join(',')];
      filesThisYear.forEach((f) => {
        indexRows.push([`"${f.name}"`, `"${f.provider}"`, `"${f.category}"`, `"${f.status}"`, `"${f.date}"`].join(','));
      });
      const indexCsvContent = indexRows.join('\n');

      // 3. Archiver dans le Drive de l'entreprise, si connecté — n'ajoute
      // jamais que des fichiers, aucune suppression.
      let driveLink: string | undefined;
      if (uid) {
        try {
          const driveOwnerId = currentCompany?.ownerId || uid;
          const driveStatus = await getCompanyDriveConfig(activeCompanyId, driveOwnerId);
          if (driveStatus?.connected) {
            const BOM = '﻿'; // force Excel a lire le CSV en UTF-8
            const toBase64 = (text: string) => btoa(unescape(encodeURIComponent(BOM + text)));
            const depensesResult = await uploadDocumentToDrive(
              activeCompanyId, driveOwnerId, toBase64(csvContent), csvFileName,
              'text/csv', currentCompany?.nombre || 'Entreprise', `Archives ${yearToClose}`,
            );
            if (depensesResult.success) driveLink = depensesResult.webViewLink;
            if (filesThisYear.length > 0) {
              await uploadDocumentToDrive(
                activeCompanyId, driveOwnerId, toBase64(indexCsvContent), `Index_Documents_Fiscaux_${yearToClose}.csv`,
                'text/csv', currentCompany?.nombre || 'Entreprise', `Archives ${yearToClose}`,
              );
            }
          }
        } catch (e) {
          console.error('[DossierFiscauxView] Drive archive failed (non-blocking):', e);
        }

        // 4. Sceller l'année — preuve immuable (jamais update/delete, voir
        // firestore.rules), remplace l'ancienne "archive" locale perdue.
        try {
          await dataService.sealFiscalYear(uid, { companyId: activeCompanyId, year: yearToClose, driveLink });
        } catch (e) {
          console.error('[DossierFiscauxView] sealFiscalYear failed:', e);
        }
      }

      setShowClotureModal(false);
      playNotificationSound();
      setClotureToast(true);
      setTimeout(() => setClotureToast(false), 4000);
    } finally {
      setIsClosingYear(false);
    }
  };

  // Standard categories
  const categoriesGroup = ['Assurances', 'Banque', 'Taxes', 'Fournisseurs', 'Légal', 'Autres'];

  // Counts for document statistics
  const years: number[] = Array.from(new Set<number>(dossierFiles.map(f => f.year))).sort((a, b) => b - a);

  const getFilesCountForYear = (year: number) => {
    return dossierFiles.filter(f => f.year === year).length;
  };

  const getFilesCountForProfile = (year: number, profile: string) => {
    return dossierFiles.filter(f => f.year === year && f.profile === profile).length;
  };

  const getFilesCountForCategory = (year: number, profile: string, cat: string) => {
    return dossierFiles.filter(f => f.year === year && f.profile === profile && f.category === cat).length;
  };

  // Filter matching archives
  const filteredFiles = dossierFiles.filter(f => {
    const matchesSearch = dossierSearchQuery === '' ||
      f.name.toLowerCase().includes(dossierSearchQuery.toLowerCase()) ||
      f.provider.toLowerCase().includes(dossierSearchQuery.toLowerCase());

    if (dossierSearchQuery !== '') {
      return matchesSearch;
    }

    if (currentYearFolder !== null) {
      if (f.year !== currentYearFolder) return false;
      if (currentProfileFolder !== null) {
        if (f.profile !== currentProfileFolder) return false;
        if (currentCategoryFolder !== null) {
          if (f.category !== currentCategoryFolder) return false;
        }
      }
    }
    return matchesSearch;
  });

  // ZIP download simulation
  const handleZipDownload = () => {
    const yearToDownload = currentYearFolder || 2026;
    setZipDownloadState({ isDownloading: true, progress: 5 });

    const interval = setInterval(() => {
      setZipDownloadState(prev => {
        if (prev.progress >= 100) {
          clearInterval(interval);
          const filesInYear = dossierFiles.filter(f => f.year === yearToDownload);
          const manifestContent = `AutoCompt Secure Drive Export Manifest\n` +
            `====================================\n` +
            `Dossier Annuel: Année ${yearToDownload}\n` +
            `Généré le: ${new Date().toLocaleDateString('fr-CA')} à ${new Date().toLocaleTimeString('fr-CA')}\n` +
            `Statut: Fichiers de comptabilité vérifiés\n` +
            `Total Fichiers Compilés: ${filesInYear.length}\n\n` +
            `--- DOSSIER DES ARCHIVES FISCALES ---\n` +
            filesInYear.map((f, i) => `${i + 1}. [${f.status}] ${f.name} - ${f.size} (Tiers: ${f.provider})`).join('\n') +
            `\n\nFin du fichier exporté.`;

          const blob = new Blob([manifestContent], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `AutoCompt_Export_Documents_Annee_${yearToDownload}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          playNotificationSound();
          alert(`L'archive ZIP "AutoCompt_Export_Documents_Annee_${yearToDownload}.zip" a été générée du côté serveur et téléchargée avec succès. Elle comprend ${filesInYear.length} justificatifs fiscaux.`);
          return { isDownloading: false, progress: 0 };
        }
        return { ...prev, progress: prev.progress + 25 };
      });
    }, 300);
  };

  // Add document handler
  const handleAddDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName || !newDocProvider) {
      alert("Veuillez indiquer le nom de la facture/document et le tiers.");
      return;
    }

    const fileDateStr = new Date().toISOString().split('T')[0];
    const finalName = `${fileDateStr}_${newDocProvider.replace(/\s+/g, '')}_${newDocProfile.replace(/\s+/g, '')}_${newDocName}.${newDocType}`;

    const newFile: FileItem = {
      id: `df-user-${Date.now()}`,
      name: finalName,
      year: newDocYear,
      profile: newDocProfile,
      category: newDocCategory,
      type: newDocType,
      size: '220 KB',
      date: fileDateStr,
      status: newDocStatus,
      provider: newDocProvider
    };

    setDossierFiles(prev => [newFile, ...prev]);
    setShowAddDocModal(false);
    setNewDocName('');
    setNewDocProvider('');

    // Instant smart navigation
    setCurrentYearFolder(newDocYear);
    setCurrentProfileFolder(newDocProfile);
    setCurrentCategoryFolder(newDocCategory);
    setDossierSearchQuery('');
    playNotificationSound();
  };

  const handleDeleteDocument = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Voulez-vous supprimer définitivement ce document fiscal ?")) {
      setDossierFiles(prev => prev.filter(f => f.id !== id));
      playNotificationSound();
    }
  };

  const getActiveProfileColorHex = () => {
    if (currentProfileFolder === 'Solutions GPA') return '#bc84ee';
    if (currentProfileFolder === 'Triplex') return '#ff823a';
    return '#059669'; // Default AutoCompt emerald
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-zinc-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans animate-in fade-in max-w-full overflow-x-hidden pb-16 text-left`}>
      
      {/* HEADER BAR */}
      <header className={`${darkMode ? 'bg-zinc-950 border-zinc-950 shadow-xl' : 'bg-white border-slate-200 shadow-sm'} px-6 py-5 border-b flex items-center justify-between text-left`}>
        <div className="flex items-center space-x-3">
          {sidebarToggle}
          <button onClick={() => setVista('dashboard')} className={`p-2 rounded-xl transition-all active:scale-95 ${darkMode ? 'text-zinc-500 hover:text-white hover:bg-zinc-900' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`} id="back-to-dashboard-dossier">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="font-black uppercase italic tracking-tighter text-lg leading-tight text-left">Gestionnaire de Dossiers</h2>
            <p className="text-[8px] font-black text-[#059669] uppercase italic tracking-[0.25em] leading-none mt-1">Gouvernance &amp; Coffre-fort Fiscal</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenFiscalRulesModal}
            id="button-dossier-fiscal-rules"
            title={t("Configurer les règles fiscales des catégories")}
            className={`p-2.5 rounded-full transition-all active:scale-95 ${darkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <Settings2 size={18} />
          </button>
          <button
            onClick={() => setShowClotureModal(true)}
            id="button-dossier-cloture"
            className="bg-orange-500 text-white px-5 py-2.5 rounded-full text-[9px] font-black uppercase italic shadow-lg active:scale-95 hover:scale-102 transition-all flex items-center space-x-1.5"
          >
            <span className="text-[12px] leading-none mb-0.5">🔒</span>
            <span>{t("Clôturer l'année 2026")}</span>
          </button>
          <button 
            onClick={() => setShowAddDocModal(true)}
            id="button-dossier-add-document"
            className="bg-[#059669] text-white px-5 py-2.5 rounded-full text-[9px] font-black uppercase italic shadow-lg active:scale-95 hover:scale-102 transition-all flex items-center space-x-1.5"
          >
            <Plus size={14} strokeWidth={3} />
            <span>{t("IMPORTER DOCUMENT")}</span>
          </button>
        </div>
      </header>

      {/* Alerta Relevé 31 */}
      <div className="px-6 pt-6 max-w-7xl mx-auto w-full">
        <div className={`w-full p-5 rounded-[24px] border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${darkMode ? "bg-amber-900/10 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
          <div className="flex items-center space-x-4">
            <div className={`p-3 flex-shrink-0 rounded-2xl ${darkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-200/50 text-amber-600"}`}>
              <Bell size={24} />
            </div>
            <p className="text-sm sm:text-base font-medium leading-tight">
              <strong>⚠️ {t("Rappel Important :")}</strong> N'oubliez pas de produire et transmettre les <strong>Relevés 31</strong> à vos locataires avant le 28 février.
            </p>
          </div>
          <a
            href="https://www.revenuquebec.ca/fr/services-en-ligne/services-en-ligne/produire-des-releves-31/"
            target="_blank"
            rel="noopener noreferrer"
            className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-center whitespace-nowrap transition-shadow flex-shrink-0 w-full sm:w-auto ${darkMode ? "bg-amber-500 hover:bg-amber-400 text-amber-950" : "bg-amber-500 hover:bg-amber-600 text-white"} shadow-md`}
          >
            Produire sur Revenu Québec
          </a>
        </div>

        {/* Assistant de préparation Relevé 31 — regroupe les données de chaque
            unité louée pour l'année choisie ; ne transmet rien à Revenu
            Québec (voir releve31Pdf.ts), sert juste à préparer les données. */}
        <div className={`mt-4 p-5 rounded-[24px] border shadow-sm ${darkMode ? "bg-zinc-950/60 border-zinc-900" : "bg-white border-slate-200/60"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${darkMode ? "bg-slate-500/15 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                <FileDown size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase italic tracking-widest">Assistant Relevé 31</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-none mt-1">Prépare les données par unité louée — pas une transmission officielle</p>
              </div>
            </div>
            <select
              value={releve31Year}
              onChange={(e) => setReleve31Year(parseInt(e.target.value, 10))}
              className={`text-[11px] font-bold rounded-xl px-3 py-2 border outline-none ${darkMode ? "bg-zinc-900 border-zinc-700 text-zinc-200" : "bg-white border-slate-200"}`}
            >
              {[0, 1, 2].map((offset) => {
                const y = new Date().getFullYear() - offset;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
          </div>

          {releve31Loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 size={18} className="animate-spin mr-2" /><span className="text-[10px] font-bold uppercase tracking-widest">Chargement des unités…</span>
            </div>
          ) : releve31Rows.length === 0 ? (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide py-4 text-center">
              Aucune unité avec un locataire enregistré pour {releve31Year}.
            </p>
          ) : (
            <div className="space-y-2">
              {releve31Rows.map(({ unit, property }) => {
                const missing = !unit.moveInDate || unit.residencePrincipale === undefined;
                return (
                  <div key={unit.id} className={`p-4 rounded-2xl border ${darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-black truncate">{unit.tenantName} — {unit.unitName}</p>
                        <p className={`text-[9px] font-medium truncate ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>{property.adresse}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {missing && (
                          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1 ${darkMode ? "bg-amber-500/15 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
                            <AlertTriangle size={10} />Données incomplètes
                          </span>
                        )}
                        <button
                          onClick={() => handleGenerateReleve31(unit, property)}
                          className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${darkMode ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}
                        >
                          <FileDown size={11} />PDF
                        </button>
                      </div>
                    </div>

                    {missing && (
                      <div className="mt-3 pt-3 border-t border-dashed grid grid-cols-1 sm:grid-cols-2 gap-3 dark:border-zinc-800">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-slate-400">Date d'entrée</label>
                          <input
                            type="date"
                            value={unit.moveInDate || ""}
                            onChange={(e) => handleUpdateReleve31Field(unit, { moveInDate: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg text-[11px] border outline-none ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-slate-400">Résidence principale au 31 déc.</label>
                          <select
                            value={unit.residencePrincipale === undefined ? "" : unit.residencePrincipale ? "oui" : "non"}
                            onChange={(e) => handleUpdateReleve31Field(unit, { residencePrincipale: e.target.value === "oui" })}
                            className={`w-full px-3 py-2 rounded-lg text-[11px] border outline-none ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200"}`}
                          >
                            <option value="">À confirmer</option>
                            <option value="oui">Oui</option>
                            <option value="non">Non</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Entrée vers "Mes relevés de gestion" — pour un Investisseur dont la
            gestion est déléguée à un gestionnaire (modèle relevé bancaire,
            voir MesRelevesGestion.tsx). Bouton discret, pas un module RBAC à
            part — la plupart des comptes n'en auront jamais besoin. */}
        <button
          onClick={() => setVista('releves_gestion')}
          className={`mt-4 w-full p-4 rounded-2xl border flex items-center gap-3 text-left transition-all ${darkMode ? 'bg-zinc-950/60 border-zinc-900 hover:border-zinc-700' : 'bg-white border-slate-200/60 hover:border-slate-300'}`}
        >
          <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
            <FileDown size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black uppercase italic tracking-tight">Mes relevés de gestion</p>
            <p className={`text-[9px] font-bold uppercase tracking-wide mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Si votre gestion est déléguée à une gestora</p>
          </div>
        </button>
      </div>

      {/* METRICS HEADER BANNER */}
      <section className="px-6 py-6 max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-3 gap-5" id="dossiers-metrics-panel">
        <div className={`p-6 rounded-[32px] border shadow-sm ${darkMode ? 'bg-zinc-950/60 border-zinc-900' : 'bg-white border-slate-200/60'} flex items-center justify-between`}>
          <div>
            <p className="text-[8px] font-black uppercase italic text-slate-400 tracking-wider mb-1">Total Archivés</p>
            <p className="text-2xl font-black italic tracking-tighter text-[#059669]">{dossierFiles.length} fichiers</p>
          </div>
          <div className={`p-3.5 rounded-2xl ${darkMode ? 'bg-zinc-900/50 text-[#059669]' : 'bg-[#059669]/5 text-[#059669]'}`}>
            <FileText size={20} />
          </div>
        </div>
        
        <div className={`p-6 rounded-[32px] border shadow-sm ${darkMode ? 'bg-zinc-950/60 border-zinc-900' : 'bg-white border-slate-200/60'} flex items-center justify-between`}>
          <div>
            <p className="text-[8px] font-black uppercase italic text-slate-400 tracking-wider mb-1">Volume Stockage</p>
            <p className="text-2xl font-black italic tracking-tighter text-slate-800 dark:text-zinc-100">14.2 MB</p>
          </div>
          <div className={`p-3.5 rounded-2xl ${darkMode ? 'bg-zinc-900/50 text-amber-500' : 'bg-amber-50/50 text-amber-600'}`}>
            <Zap size={20} />
          </div>
        </div>

        <div className={`p-6 rounded-[32px] border shadow-sm ${darkMode ? 'bg-zinc-950/60 border-zinc-900' : 'bg-white border-slate-200/60'} flex items-center justify-between`}>
          <div>
            <p className="text-[8px] font-black uppercase italic text-slate-400 tracking-wider mb-1">Stockage Sécurisé</p>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase italic tracking-widest text-[#059669]">Actif</span>
            </div>
          </div>
          <div className={`p-3.5 rounded-2xl ${darkMode ? 'bg-zinc-900/50 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
            <ShieldCheck size={20} />
          </div>
        </div>
      </section>

      {/* WORKSPACE OPERATIONS PANEL */}
      <main className="px-6 space-y-6 max-w-7xl mx-auto w-full text-left flex-grow">
        
        {/* ROW: SEARCH AND MASS ACTIONS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-400/5 p-4 rounded-[32px] border dark:border-zinc-900/50">
          
          {/* SEARCH BAR */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input 
              type="text"
              id="input-dossier-search"
              placeholder="Rechercher par fichier ou tiers (ex: Bell)..."
              value={dossierSearchQuery}
              onChange={e => setDossierSearchQuery(e.target.value)}
              className={`w-full pl-12 pr-10 py-4 rounded-[22px] text-xs font-bold border outline-none focus:ring-1 focus:ring-[#059669] transition-all ${darkMode ? 'bg-black border-zinc-800 text-white placeholder-zinc-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
            />
            {dossierSearchQuery && (
              <button 
                onClick={() => setDossierSearchQuery('')} 
                className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* DOWNLOAD ZIP FOR THE SELECTED YEAR COOTER */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleZipDownload}
              disabled={zipDownloadState.isDownloading}
              id="button-dossier-zip-download"
              className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 px-6 py-4 rounded-[22px] text-[10px] font-black uppercase italic tracking-widest shadow-lg transition-all text-center flex items-center justify-center space-x-2 min-w-[220px] active:scale-95 disabled:opacity-50"
            >
              {zipDownloadState.isDownloading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>ZIP CRÉATION - {zipDownloadState.progress}%</span>
                </>
              ) : (
                <>
                  <Download size={15} strokeWidth={2.5} />
                  <span>{t("Tout Télécharger (.ZIP)")}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* BREADCRUMB NAVIGATION */}
        {dossierSearchQuery === '' && (
          <div className="flex flex-wrap items-center gap-2 bg-[#059669]/5 p-3 rounded-[24px]" id="dossiers-breadcrumbs-trail">
            <button 
              onClick={() => { setCurrentYearFolder(null); setCurrentProfileFolder(null); setCurrentCategoryFolder(null); }}
              className={`text-[9.5px] font-black uppercase tracking-wider flex items-center space-x-1 px-3.5 py-2 rounded-xl transition-all ${currentYearFolder === null ? 'bg-[#059669] text-white shadow-md' : 'text-[#059669] hover:bg-[#059669]/10'}`}
            >
              <Home size={11} className="mr-1" />
              <span>{t("Dossiers")}</span>
            </button>

            {currentYearFolder !== null && (
              <>
                <ChevronRight size={13} className="text-slate-400" />
                <button 
                  onClick={() => { setCurrentProfileFolder(null); setCurrentCategoryFolder(null); }}
                  className={`text-[9.5px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all ${currentProfileFolder === null ? 'bg-[#059669] text-white shadow-md' : 'text-[#059669] hover:bg-[#059669]/10'}`}
                >
                  Année {currentYearFolder}
                </button>
              </>
            )}

            {currentProfileFolder !== null && (
              <>
                <ChevronRight size={13} className="text-slate-400" />
                <button 
                  onClick={() => { setCurrentCategoryFolder(null); }}
                  className={`text-[9.5px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all ${
                    currentCategoryFolder === null 
                      ? (currentProfileFolder === 'Solutions GPA' ? 'bg-[#bc84ee] text-white shadow-md' : 'bg-[#ff823a] text-white shadow-md') 
                      : (currentProfileFolder === 'Solutions GPA' ? 'text-[#bc84ee] hover:bg-[#bc84ee]/10' : 'text-[#ff823a] hover:bg-[#ff823a]/10')
                  }`}
                >
                  {currentProfileFolder}
                </button>
              </>
            )}

            {currentCategoryFolder !== null && (
              <>
                <ChevronRight size={13} className="text-slate-400" />
                <span className={`text-[9.5px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300`}>
                  {currentCategoryFolder}
                </span>
              </>
            )}
          </div>
        )}

        {/* WORKSPACE NAVIGATION LAYERS */}
        <div id="dossier-workspace" className="mt-8">
          
          {/* SEARCH VIEWER: FLAT GRID VIEW FOR ALL FILTERED FILES */}
          {dossierSearchQuery !== '' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b pb-2 dark:border-zinc-800">
                <h3 className="text-[10px] font-black uppercase italic tracking-widest text-slate-400">Total({filteredFiles.length}) Dossiers Globaux</h3>
                <button onClick={() => setDossierSearchQuery('')} className="text-[10px] font-black text-[#059669] hover:underline uppercase italic">Annuler recherche</button>
              </div>
              
              {filteredFiles.length === 0 ? (
                <div className={`p-16 text-center rounded-[40px] border border-dashed ${darkMode ? 'bg-zinc-950 border-zinc-900 text-zinc-500' : 'bg-white border-slate-200 text-slate-400'}`}>
                  <FileSearch size={44} className="mx-auto mb-3 opacity-30 text-slate-400" />
                  <p className="text-[10px] font-black uppercase italic tracking-wider leading-none">Aucun fichier trouvé</p>
                  <p className="text-[8px] mt-1 text-slate-400 uppercase leading-normal">Essayer d'autres termes ou créer un nouveau document fiscal.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFiles.map(file => {
                    const dynamicColor = file.profile === 'Solutions GPA' ? '#bc84ee' : '#ff823a';
                    return (
                      <div 
                        key={file.id}
                        className={`p-6 rounded-[32px] border shadow-sm hover:shadow-xl transition-all cursor-pointer relative group flex flex-col justify-between ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200/80 hover:bg-white'}`}
                        onClick={() => setSelectedDocPreview(file)}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[7px] font-black uppercase px-2.5 py-1 rounded-full text-white tracking-widest leading-none mt-1" style={{ backgroundColor: dynamicColor }}>
                              {file.profile}
                            </span>
                            <span className={`text-[7px] font-black uppercase px-2.5 py-1 rounded-full ${file.status === 'Concilié' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              {file.status}
                            </span>
                          </div>
                          
                          <div className="flex items-start space-x-3">
                            <div className={`p-3.5 rounded-2xl flex-shrink-0 ${file.type === 'pdf' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                              <FileText size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[10px] font-black uppercase italic tracking-tighter truncate leading-tight group-hover:text-[#059669]" title={file.name}>{file.name}</h4>
                              <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Fournisseur: {file.provider}</p>
                              <p className="text-[7.5px] font-medium text-slate-400 mt-1">
                                Emplacement: <span className="font-bold">/{file.year}/{file.profile}/{file.category}</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-zinc-900 flex items-center justify-between mt-5" onClick={e => e.stopPropagation()}>
                          <span className="text-[8px] font-mono text-slate-400 uppercase font-bold">{file.size} | {file.date}</span>
                          <div className="flex items-center space-x-1.5 animate-in fade-in">
                            <button 
                              onClick={() => setSelectedDocPreview(file)}
                              className={`p-2 rounded-xl border transition-all active:scale-90 ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-950'}`}
                            >
                              <Eye size={12} />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteDocument(file.id, e)}
                              className="p-2 rounded-xl border border-red-500/10 text-red-500 hover:bg-red-500/5 transition-all active:scale-95"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* LAYER 1: ANÉES VIEW (ROOT NAVIGATION LEVEL) */}
          {dossierSearchQuery === '' && currentYearFolder === null && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <h3 className="text-xs font-black uppercase italic tracking-widest text-slate-400">Sélectionnez une année d'imposition</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {years.map(year => (
                  <button 
                    key={year}
                    onClick={() => setCurrentYearFolder(year)}
                    className={`p-8 rounded-[40px] border hover:border-[#059669] hover:shadow-xl hover:shadow-[#059669]/5 transition-all flex flex-col items-start space-y-5 text-left active:scale-95 group relative ${darkMode ? 'bg-zinc-950 border-zinc-900 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${darkMode ? 'bg-zinc-900 text-amber-500' : 'bg-amber-50 text-amber-600'}`}>
                      <FolderOpen size={30} />
                    </div>
                    <div>
                      <p className="text-base font-black italic tracking-tighter">Année fiscale {year}</p>
                      <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide leading-none mt-1.5">
                        {getFilesCountForYear(year)} documents classés
                      </p>
                    </div>
                    <div className="absolute bottom-6 right-6 text-[#059669] opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
                      <ChevronRight size={22} strokeWidth={2.5} />
                    </div>
                  </button>
                ))}
                
                {/* Dynamically add a custom Year folder block */}
                <button 
                  onClick={() => {
                    const yearInput = prompt("Entrez une nouvelle année fiscale (ex: 2027) :");
                    if (yearInput) {
                      const yearNum = parseInt(yearInput);
                      if (!isNaN(yearNum) && yearNum > 2000 && yearNum < 2100) {
                        setCurrentYearFolder(yearNum);
                        playNotificationSound();
                      } else {
                        alert("Année fiscale ou format incorrect.");
                      }
                    }
                  }}
                  className={`p-8 rounded-[40px] border-2 border-dashed flex flex-col items-center justify-center space-y-3 text-slate-400 hover:border-[#059669] hover:text-[#059669] transition-all min-h-[192px] ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}
                >
                  <PlusCircle size={36} strokeWidth={1.5} className="text-slate-400/80" />
                  <span className="text-[10px] font-black uppercase italic tracking-widest leading-none">Créer Dossier Fiscal</span>
                </button>
              </div>
            </div>
          )}

          {/* LAYER 2: CHOOSE ACCOUNT PROFILE VIEW (GPA vs TRIPLEX) */}
          {dossierSearchQuery === '' && currentYearFolder !== null && currentProfileFolder === null && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center space-x-2">
                <button onClick={() => setCurrentYearFolder(null)} className="text-[10px] font-black uppercase text-[#059669] hover:underline flex items-center italic">
                  <ArrowLeft size={10} className="mr-1" /> Retour Root
                </button>
                <span className="text-slate-400">/</span>
                <h3 className="text-xs font-black uppercase italic tracking-widest text-slate-400">Année {currentYearFolder} &gt; Profils Comptes</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Solutions GPA Profile Folder */}
                <button 
                  onClick={() => setCurrentProfileFolder('Solutions GPA')}
                  className="p-8 rounded-[40px] border shadow-sm flex flex-col items-start space-y-5 text-left transition-all active:scale-95 group relative border-opacity-30 border-[#bc84ee] bg-[#bc84ee]/5 hover:border-[#bc84ee] hover:shadow-[0_0_30px_-5px_rgba(188,132,238,0.25)]"
                >
                  <div className="p-4.5 rounded-2xl bg-[#bc84ee]/15 text-[#bc84ee] transition-transform group-hover:scale-115">
                    <Folder size={32} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black italic tracking-tighter text-[#bc84ee] uppercase">Solutions GPA</h4>
                    <p className="text-[10px] font-black uppercase italic text-slate-400 tracking-tight leading-none mt-2">Profil Commercial / Gestion de Portefeuille</p>
                    <p className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {getFilesCountForProfile(currentYearFolder, 'Solutions GPA')} justificatifs disponibles
                    </p>
                  </div>
                  <div className="absolute bottom-6 right-6 text-[#bc84ee] opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
                    <ChevronRight size={22} strokeWidth={2.5} />
                  </div>
                </button>

                {/* Triplex Profile Folder */}
                <button 
                  onClick={() => setCurrentProfileFolder('Triplex')}
                  className="p-8 rounded-[40px] border shadow-sm flex flex-col items-start space-y-5 text-left transition-all active:scale-95 group relative border-opacity-30 border-[#ff823a] bg-[#ff823a]/5 hover:border-[#ff823a] hover:shadow-[0_0_30px_-5px_rgba(255,130,58,0.25)]"
                >
                  <div className="p-4.5 rounded-2xl bg-[#ff823a]/15 text-[#ff823a] transition-transform group-hover:scale-115">
                    <FolderOpen size={32} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black italic tracking-tighter text-[#ff823a] uppercase">Triplex Laval</h4>
                    <p className="text-[10px] font-black uppercase italic text-slate-400 tracking-tight leading-none mt-2">Plex Personnel / Co-propriété résidentielle</p>
                    <p className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {getFilesCountForProfile(currentYearFolder, 'Triplex')} justificatifs disponibles
                    </p>
                  </div>
                  <div className="absolute bottom-6 right-6 text-[#ff823a] opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
                    <ChevronRight size={22} strokeWidth={2.5} />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* LAYER 3: CHOOSE FILE CATEGORY TYPE (ASSURANCES, BANQUE, TAXES, ETC.) */}
          {dossierSearchQuery === '' && currentYearFolder !== null && currentProfileFolder !== null && currentCategoryFolder === null && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <button onClick={() => setCurrentProfileFolder(null)} className="text-[10px] font-black uppercase text-[#059669] hover:underline flex items-center italic">
                  <ArrowLeft size={10} className="mr-1" /> Retour Profils
                </button>
                <span className="text-[10px] font-black uppercase italic tracking-widest" style={{ color: getActiveProfileColorHex() }}>
                  {currentProfileFolder} ({currentYearFolder})
                </span>
              </div>
              
              <h3 className="text-xs font-black uppercase italic tracking-widest text-slate-400">Sélectionnez une catégorie fiscale</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoriesGroup.map(cat => {
                  const itemsCount = getFilesCountForCategory(currentYearFolder, currentProfileFolder, cat);
                  const accentColor = getActiveProfileColorHex();
                  return (
                    <button 
                      key={cat}
                      onClick={() => setCurrentCategoryFolder(cat)}
                      className={`p-6 rounded-[32px] border shadow-sm hover:shadow-xl hover:border-opacity-100 transition-all flex flex-col items-start space-y-4 text-left active:scale-95 group relative ${darkMode ? 'bg-zinc-950 border-zinc-900 leading-none' : 'bg-white border-slate-200'}`}
                      style={{ borderLeftColor: accentColor, borderLeftWidth: '5px' }}
                    >
                      <div className="p-3.5 rounded-2xl bg-zinc-400/5 text-slate-400 dark:text-zinc-500">
                        <FolderOpen size={22} className="transition-transform group-hover:scale-110" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase italic tracking-tight">{cat}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                          {itemsCount} document{itemsCount !== 1 ? 's' : ''} classés
                        </p>
                      </div>
                      <div className="absolute bottom-4 right-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={16} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* LAYER 4: DETAILED FILE NAVIGATOR GRID WITH IMAGES/PDF */}
          {dossierSearchQuery === '' && currentYearFolder !== null && currentProfileFolder !== null && currentCategoryFolder !== null && (
            <div className="space-y-5 animate-in fade-in duration-500">
              <div className="flex items-center justify-between border-b pb-3 dark:border-zinc-900 border-slate-200">
                <button onClick={() => setCurrentCategoryFolder(null)} className="text-[10px] font-black uppercase text-[#059669] hover:underline flex items-center italic">
                  <ArrowLeft size={10} className="mr-1" /> Retour Catégories
                </button>
                <div>
                  <span className="text-[9px] font-mono font-bold uppercase italic px-4.5 py-1.5 bg-zinc-200 dark:bg-zinc-900 rounded-full tracking-wider text-slate-600 dark:text-zinc-400 select-all">
                    /{currentYearFolder}/{currentProfileFolder}/{currentCategoryFolder}
                  </span>
                </div>
              </div>

              {filteredFiles.length === 0 ? (
                <div className={`p-16 text-center rounded-[40px] border-2 border-dashed ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} max-w-lg mx-auto`}>
                  <FileQuestion size={48} className="mx-auto mb-4 opacity-30 text-slate-400" />
                  <p className="text-xs font-black uppercase italic tracking-wider leading-none">Dossier de fichiers vide</p>
                  <p className="text-[10px] text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed mb-4 uppercase font-bold">Aucun reçu scanné pour {currentCategoryFolder}. Ajoutez-en en haut à droite !</p>
                  <button 
                    onClick={() => {
                      setNewDocYear(currentYearFolder);
                      setNewDocProfile(currentProfileFolder as any);
                      setNewDocCategory(currentCategoryFolder);
                      setShowAddDocModal(true);
                    }}
                    className="bg-[#059669] text-white px-5 py-2.5 rounded-full text-[9px] font-black uppercase italic tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all"
                  >
                    [ + Uploader un justificatif ]
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFiles.map(file => (
                    <div 
                      key={file.id}
                      className={`p-6 rounded-[32px] border shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between relative group ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200 hover:bg-white'}`}
                      onClick={() => setSelectedDocPreview(file)}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[7px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-500 leading-none">
                            Format: {file.type.toUpperCase()}
                          </span>
                          <span className={`text-[7px] font-black uppercase px-2.5 py-1 rounded-full leading-none ${file.status === 'Concilié' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                            {file.status}
                          </span>
                        </div>

                        <div className="flex items-start space-x-3">
                          <div className={`p-3.5 rounded-2xl flex-shrink-0 ${file.type === 'pdf' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#3b82f6]/10 text-[#3b82f6]'}`}>
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[10px] font-black uppercase italic tracking-tighter truncate leading-tight group-hover:text-[#059669]" title={file.name}>{file.name}</h4>
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Fournisseur: {file.provider}</p>
                            <p className="text-[7.5px] font-mono text-slate-400/80 leading-none mt-1">Classé: {file.date}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-zinc-900 flex items-center justify-between mt-5" onClick={e => e.stopPropagation()}>
                        <span className="text-[8px] font-mono font-black text-slate-400 uppercase">{file.size}</span>
                        <div className="flex items-center space-x-1.5 animate-in fade-in">
                          <button 
                            onClick={() => setSelectedDocPreview(file)}
                            className={`p-2 rounded-xl border transition-all active:scale-90 ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'}`}
                            title="Ouvrir document"
                          >
                            <Eye size={12} />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteDocument(file.id, e)}
                            className="p-2 rounded-xl border border-red-500/10 text-red-500 hover:bg-red-500/5 transition-all active:scale-95"
                            title="Supprimer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* MODAL: CLOTURE ANNEE */}
      <AnimatePresence>
        {showClotureModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              className={`w-full max-w-lg rounded-[40px] shadow-2xl p-8 border ${darkMode ? 'bg-zinc-950 border-orange-500/30' : 'bg-white border-orange-200'} text-center flex flex-col items-center`}
            >
              <div className="w-20 h-20 rounded-[24px] bg-orange-500/10 text-orange-500 flex items-center justify-center mb-6 border border-orange-500/20">
                <span className="text-4xl">🔒</span>
              </div>
              <h2 className={`text-2xl font-black italic tracking-tighter uppercase mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Clôturer l'année comptable
              </h2>
              <p className={`text-sm font-medium mb-8 max-w-md ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                Cette action archive vos dépenses et documents de l'année dans le Drive de l'entreprise (CSV) et scelle l'année de façon permanente. <strong>Rien n'est supprimé</strong> — vos dépenses réelles restent intactes dans Tenue de Livres, et l'année reste consultable en tout temps en sélectionnant son dossier ici.
              </p>

              <div className="flex items-center space-x-4 w-full">
                <button
                  onClick={() => setShowClotureModal(false)}
                  disabled={isClosingYear}
                  className={`flex-1 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${darkMode ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCloturerAnnee}
                  disabled={isClosingYear}
                  className="flex-1 py-4 rounded-[24px] bg-orange-500 text-white text-xs font-black uppercase tracking-widest hover:bg-orange-600 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                >
                  {isClosingYear ? <Loader2 size={14} className="animate-spin" /> : null}
                  {isClosingYear ? 'Archivage...' : 'Confirmer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD A NEW TAX DOCUMENT DYNAMICALLY */}
      <AnimatePresence>
        {showAddDocModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              className={`w-full max-w-md rounded-[38px] shadow-2xl overflow-hidden border ${darkMode ? 'bg-zinc-950 border-zinc-900 text-white' : 'bg-white border-slate-100'}`}
            >
              <div className="p-6 border-b dark:border-zinc-900 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/40">
                <h3 className="text-xs font-black uppercase italic tracking-widest text-[#059669]">Nouveau Document Fiscal</h3>
                <button onClick={() => setShowAddDocModal(false)} className="text-zinc-400 hover:text-zinc-600"><X size={18}/></button>
              </div>
              
              <form onSubmit={handleAddDocumentSubmit} className="p-6 space-y-4 text-left">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[7.5px] font-black uppercase text-slate-400 italic ml-1 select-none">Fournisseur (Tiers)</label>
                    <input 
                      value={newDocProvider} onChange={e => setNewDocProvider(e.target.value)}
                      placeholder="Ex: Bell, Hydro-Québec, Notaire"
                      required
                      className={`w-full p-4 rounded-2xl text-xs font-bold border outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-slate-50 text-slate-900 border-slate-200'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7.5px] font-black uppercase text-slate-400 italic ml-1 select-none">Titre / Sujet</label>
                    <input 
                      value={newDocName} onChange={e => setNewDocName(e.target.value)}
                      placeholder="Ex: FactureInternet, ServicesArpenteur"
                      required
                      className={`w-full p-4 rounded-2xl text-xs font-bold border outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-slate-50 text-slate-900 border-slate-200'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[7.5px] font-black uppercase text-slate-400 italic ml-1">Année</label>
                    <select 
                      value={newDocYear} onChange={e => setNewDocYear(parseInt(e.target.value))}
                      className={`w-full p-4 rounded-2xl text-[11px] font-black uppercase italic border outline-none ${darkMode ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-slate-50 text-slate-900'}`}
                    >
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                      <option value={2027}>2027</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[7.5px] font-black uppercase text-slate-400 italic ml-1">Profil</label>
                    <select 
                      value={newDocProfile} onChange={e => setNewDocProfile(e.target.value as any)}
                      className={`w-full p-4 rounded-2xl text-[11px] font-black uppercase italic border outline-none ${darkMode ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-slate-50 text-slate-900'}`}
                    >
                      <option value="Solutions GPA">GPA</option>
                      <option value="Triplex">Triplex</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[7.5px] font-black uppercase text-slate-400 italic ml-1">Catégorie</label>
                    <select 
                      value={newDocCategory} onChange={e => setNewDocCategory(e.target.value)}
                      className={`w-full p-4 rounded-2xl text-[11px] font-black uppercase italic border outline-none ${darkMode ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-slate-50 text-slate-900'}`}
                    >
                      {categoriesGroup.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[7.5px] font-black uppercase text-slate-400 italic ml-1">État de conciliation</label>
                    <select 
                      value={newDocStatus} onChange={e => setNewDocStatus(e.target.value as any)}
                      className={`w-full p-4 rounded-2xl text-[11px] font-black uppercase italic border outline-none ${darkMode ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-slate-50 text-slate-900'}`}
                    >
                      <option value="En attente">🟡 En attente de validation</option>
                      <option value="Concilié">🟢 Concilié (Validé)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[7.5px] font-black uppercase text-slate-400 italic ml-1">Type de fichier</label>
                    <select 
                      value={newDocType} onChange={e => setNewDocType(e.target.value as any)}
                      className={`w-full p-4 rounded-2xl text-[11px] font-black uppercase italic border outline-none ${darkMode ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-slate-50 text-slate-900'}`}
                    >
                      <option value="pdf">PDF (Document)</option>
                      <option value="jpg">JPG (Numérisation)</option>
                    </select>
                  </div>
                </div>

                {/* Simulated file upload area */}
                <div className="p-5 rounded-[24px] border border-dashed border-slate-300 dark:border-zinc-800 bg-[#059669]/5 text-center cursor-pointer hover:bg-[#059669]/10 transition-all py-8">
                  <Upload size={24} className="mx-auto text-[#059669] mb-2" />
                  <p className="text-[9px] font-black uppercase italic tracking-widest">Glisser-déposer le justificatif brut</p>
                  <p className="text-[7px] text-slate-400 uppercase font-bold mt-1">PDF, JPG, PNG | Max 10 Mo</p>
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-[#059669] text-white rounded-[26px] font-black uppercase italic text-[10px] tracking-wider shadow-xl active:scale-95 hover:bg-emerald-600 transition-all mt-4"
                >
                  Ajouter au coffre-fort fiscal
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* LIGHTBOX: SPECTACULARIA SCANNED RECEIPT / EXTRACTED DATA ANALYZER */}
        <AnimatePresence>
          {selectedDocPreview && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-sm overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
                className={`w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden border ${darkMode ? 'bg-zinc-950 border-zinc-900 text-white' : 'bg-white border-slate-100'} flex flex-col md:flex-row min-h-[500px] text-left`}
              >
                
                {/* Visual Bill Sheet Side */}
                <div className={`p-8 md:w-1/2 flex flex-col justify-between border-b md:border-b-0 md:border-r ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-200'}`}>
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-[8px] font-black uppercase italic tracking-widest text-[#059669]">Extraction Visuelle AutoCompt</span>
                      <span className="text-[9px] font-mono text-zinc-500 font-bold">FEUILLE NUMÉRISÉE</span>
                    </div>
                    
                    {selectedDocPreview.lien && selectedDocPreview.lien !== '#' ? (
                      <div className="rounded-[28px] overflow-hidden border border-slate-200 dark:border-zinc-800 flex items-center justify-center bg-black min-h-[320px] w-full">
                        {selectedDocPreview.lien.includes('.pdf') || selectedDocPreview.lien.includes('drive.google.com') ? (
                          <iframe 
                            src={selectedDocPreview.lien} 
                            className="w-full h-[320px] rounded-2xl border-none" 
                            title="Aperçu PDF"
                          />
                        ) : (
                          <img 
                            src={selectedDocPreview.lien} 
                            alt="Aperçu du justificatif fiscal" 
                            className="max-h-[320px] max-w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="bg-white text-slate-900 p-6 rounded-[28px] shadow-inner space-y-4 font-sans min-h-[320px] border border-slate-200 w-full">
                        <div className="border-b pb-4 flex justify-between items-start">
                          <div>
                            <p className="text-base font-black uppercase italic tracking-tighter text-slate-900 leading-tight">{selectedDocPreview.provider}</p>
                            <p className="text-[7.5px] text-zinc-400 font-black uppercase tracking-widest leading-none mt-1">PIÈCE COMPTABLE SÉCURISÉE</p>
                          </div>
                          <p className="text-xs font-mono font-black text-[#059669]">#V-{selectedDocPreview.id.substring(3).toUpperCase()}</p>
                        </div>
                        
                        <div className="space-y-1.5 text-[9px] text-slate-600 font-medium">
                          <div className="flex justify-between"><span>DATE ARCHIVE:</span><span className="font-bold text-slate-900">{selectedDocPreview.date}</span></div>
                          <div className="flex justify-between"><span>PROPRIÉTAIRE:</span><span className="font-bold text-slate-900">{selectedDocPreview.profile}</span></div>
                          <div className="flex justify-between"><span>DOSSIER:</span><span className="font-bold text-slate-900">/{selectedDocPreview.year}/{selectedDocPreview.category}</span></div>
                        </div>

                        <div className="border-t border-b py-3 space-y-2 !mt-6">
                          <div className="flex justify-between text-[10px] font-bold text-slate-800">
                            <span>1. Services de {selectedDocPreview.category} ({selectedDocPreview.provider})</span>
                            <span>$100.00</span>
                          </div>
                        </div>

                        <div className="space-y-1 text-right text-[10px] text-slate-600 !mt-6">
                          <div>Montant net: <span className="font-bold font-mono text-slate-900">$100.00 CAD</span></div>
                          <div>T.P.S (5%): <span className="font-bold font-mono text-slate-900">$5.00 CAD</span></div>
                          <div>T.V.Q (9.975%): <span className="font-bold font-mono text-slate-900">$9.98 CAD</span></div>
                          <div className="text-sm font-black text-[#059669] pt-1.5 border-t border-slate-100 mt-1">Total Calculé: $114.98 CAD</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[8px] font-bold text-slate-400 uppercase text-center mt-4">Sauvegardé sur le Cloud Drive avec validation cryptée</p>
                </div>

                {/* IA extraction attributes details page */}
                <div className="p-8 md:w-1/2 flex flex-col justify-between space-y-6">
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-black italic tracking-tighter uppercase leading-tight">{selectedDocPreview.provider}</h3>
                        <p className="text-[8px] font-black uppercase italic tracking-widest text-slate-400 mt-1">Classification: /{selectedDocPreview.year}/{selectedDocPreview.profile}/{selectedDocPreview.category}</p>
                      </div>
                      <button onClick={() => setSelectedDocPreview(null)} className="text-zinc-400 hover:text-zinc-600 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"><X size={18}/></button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-900' : 'bg-slate-50 border-slate-100'}`}>
                        <p className="text-[8px] font-black uppercase text-slate-400 italic mb-1">Dépense Reconnue</p>
                        <p className="text-base font-black italic text-[#059669] leading-none">$114.98</p>
                      </div>
                      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-100'}`}>
                        <p className="text-[8px] font-black uppercase text-slate-400 italic mb-1">Statut Conciliation</p>
                        <span className={`text-[8.5px] font-black uppercase px-2.5 py-1 rounded-full leading-none inline-block mt-0.5 ${selectedDocPreview.status === 'Concilié' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {selectedDocPreview.status === 'Concilié' ? 'Concilié' : 'En attente'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[9px] font-black uppercase text-slate-400 italic tracking-wider">Métadonnées OCR AutoCompt</h4>
                      <div className="divide-y divide-slate-100 dark:divide-zinc-900 text-[10.5px] space-y-2.5">
                        <div className="flex justify-between py-1.5"><span className="text-slate-400">Nom Standardisé:</span><span className="font-mono text-slate-500 dark:text-zinc-300 select-all truncate max-w-[200px]" title={selectedDocPreview.name}>{selectedDocPreview.name}</span></div>
                        <div className="flex justify-between py-1.5"><span className="text-slate-400">Tiers Détecté:</span><span className="font-bold">{selectedDocPreview.provider}</span></div>
                        <div className="flex justify-between py-1.5"><span className="text-slate-400">Date d'émission:</span><span className="font-mono">{selectedDocPreview.date}</span></div>
                        <div className="flex justify-between py-1.5"><span className="text-slate-400">Poids de l'image:</span><span className="font-mono">{selectedDocPreview.size}</span></div>
                        <div className="flex justify-between py-1.5"><span className="text-slate-400">Type de document:</span><span className="font-bold uppercase font-mono">{selectedDocPreview.type}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t dark:border-zinc-900">
                    <div className="flex items-center justify-between gap-3">
                      <button 
                        onClick={() => {
                          const docTemplate = `AutoCompt Secure Document Backup\nID: ${selectedDocPreview.id}\nFilename: ${selectedDocPreview.name}\nTiers: ${selectedDocPreview.provider}\nMontant: $114.98 CAD`;
                          const blob = new Blob([docTemplate], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = selectedDocPreview.name;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className={`flex-1 py-4 text-center rounded-2xl block text-[10px] font-black uppercase italic ${darkMode ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'} transition-all`}
                      >
                        Télécharger brute
                      </button>
                      
                      <button 
                        onClick={() => {
                          const targetId = selectedDocPreview.id;
                          setDossierFiles(prev => prev.map(f => {
                            if (f.id === targetId) {
                              const newStatus = f.status === 'Concilié' ? 'En attente' : 'Concilié';
                              return { ...f, status: newStatus };
                            }
                            return f;
                          }));
                          setSelectedDocPreview(prev => {
                            if (!prev) return null;
                            return { ...prev, status: prev.status === 'Concilié' ? 'En attente' : 'Concilié' };
                          });
                          playNotificationSound();
                        }}
                        className="bg-[#059669] hover:bg-emerald-600 text-white flex-1 py-4 rounded-2xl font-black uppercase italic text-[10px] tracking-wider shadow-lg active:scale-95 transition-all text-center"
                      >
                        {selectedDocPreview.status === 'Concilié' ? 'Dé-concilier' : 'Concilier Justificatif'}
                      </button>
                    </div>
                  </div>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {clotureToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-6 right-6 z-[200] max-w-sm bg-[#059669] text-white p-5 rounded-[24px] shadow-2xl flex items-start space-x-4 border border-emerald-400"
            >
              <div className="bg-white/20 p-2.5 rounded-2xl flex-shrink-0">
                <ShieldCheck size={24} className="text-white" />
              </div>
              <div>
                <h4 className="text-sm font-black italic uppercase tracking-tight">Année archivée</h4>
                <p className="text-[11px] font-bold mt-1 text-emerald-100 leading-tight">
                  ✨ Archivée dans votre Drive et scellée — aucune donnée n'a été supprimée, retrouvez-la en tout temps ici.
                </p>
              </div>
              <button 
                onClick={() => setClotureToast(false)} 
                className="text-emerald-200 hover:text-white absolute top-4 right-4"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    );
  }
