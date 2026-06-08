import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, PlusCircle, Trash2, X, FileText, Download, Search,
  Folder, FolderOpen, ChevronRight, Zap, ShieldCheck, Eye, Upload, Plus, FileSearch, FileQuestion, Home, Bell
} from 'lucide-react';

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
  setArchivesAnnuelles
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

  const handleCloturerAnnee = () => {
    // 1. Génération du CSV
    const headers = ['Date', 'Catégorie', 'Propriété/Projet', 'Fournisseur/Description', 'Montant'];
    const csvRows = [headers.join(',')];

    depenses.forEach(d => {
      // Nettoyage et préparation des données pour le CSV (gestion des virgules, guillemets)
      const date = d.date || '';
      const categorie = d.categorie || d.category || '';
      const propriete = d.adresse || d.propertyId || d.projet || '';
      const description = d.professionnel || d.marchand || d.description || '';
      const montant = d.montant !== undefined ? d.montant : (d.totalAmount !== undefined ? d.totalAmount : 0);

      const row = [
        `"${date}"`,
        `"${categorie}"`,
        `"${propriete}"`,
        `"${description.replace(/"/g, '""')}"`, // Échapper les guillemets existants
        `"${montant}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    // Ajout du BOM (Byte Order Mark) pour forcer Excel à lire en UTF-8
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Téléchargement programmé
    const link = document.createElement('a');
    link.href = url;
    link.download = 'AutoCompt_Export_Annuel_2026.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // archiving logic
    const nouveauArchive = {
      id: `archive-${Date.now()}`,
      dateArchivage: new Date().toISOString(),
      annee: 2026,
      depensesArchivees: [...depenses],
      dossierFilesArchives: [...dossierFiles]
    };
    
    // add to global archives
    setArchivesAnnuelles(prev => [...prev, nouveauArchive]);
    
    // reset current state
    setDepenses([]);
    setDossierFiles([]);
    
    // notify and close
    setShowClotureModal(false);
    playNotificationSound();
    
    // toast
    setClotureToast(true);
    setTimeout(() => {
      setClotureToast(false);
    }, 4000);
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
            onClick={() => setShowClotureModal(true)}
            id="button-dossier-cloture"
            className="bg-orange-500 text-white px-5 py-2.5 rounded-full text-[9px] font-black uppercase italic shadow-lg active:scale-95 hover:scale-102 transition-all flex items-center space-x-1.5"
          >
            <span className="text-[12px] leading-none mb-0.5">🔒</span>
            <span>Clôturer l'année 2026</span>
          </button>
          <button 
            onClick={() => setShowAddDocModal(true)}
            id="button-dossier-add-document"
            className="bg-[#059669] text-white px-5 py-2.5 rounded-full text-[9px] font-black uppercase italic shadow-lg active:scale-95 hover:scale-102 transition-all flex items-center space-x-1.5"
          >
            <Plus size={14} strokeWidth={3} />
            <span>IMPORTER DOCUMENT</span>
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
              <strong>⚠️ Rappel Important :</strong> N'oubliez pas de produire et transmettre les <strong>Relevés 31</strong> à vos locataires avant le 28 février.
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
                  <span>Tout Télécharger (.ZIP)</span>
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
              <span>Dossiers</span>
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
                Êtes-vous sûr de vouloir clôturer l'année comptable ? Cette action archivera toutes vos dépenses et reçus actuels dans un dossier historique, et remettra votre Tenue de livres à zéro pour la nouvelle année.
              </p>
              
              <div className="flex items-center space-x-4 w-full">
                <button 
                  onClick={() => setShowClotureModal(false)}
                  className={`flex-1 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all ${darkMode ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Annuler
                </button>
                <button 
                  onClick={handleCloturerAnnee}
                  className="flex-1 py-4 rounded-[24px] bg-orange-500 text-white text-xs font-black uppercase tracking-widest hover:bg-orange-600 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all"
                >
                  Confirmer
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
                        {selectedDocPreview.lien.includes('.pdf') ? (
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
                <h4 className="text-sm font-black italic uppercase tracking-tight">Nouvelle année prête</h4>
                <p className="text-[11px] font-bold mt-1 text-emerald-100 leading-tight">
                  ✨ L'année a été clôturée et archivée avec succès. Vos registres sont prêts pour la nouvelle année.
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
