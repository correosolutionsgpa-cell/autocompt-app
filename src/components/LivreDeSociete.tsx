import React, { useEffect, useState } from 'react';
import { ArrowLeft, Briefcase, CheckCircle2, ChevronDown, Download, Loader2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { dataService, ResolutionDoc } from '../lib/dataService';
import { getCompanyDriveConfig, uploadDocumentToDrive } from '../lib/driveService';

export interface LivreDeSocieteProps {
  darkMode?: boolean;
  onBack: () => void;
  companyId: string; // raw (unprefixed) — same id used everywhere else in App.tsx
  ownerId: string; // the company OWNER's uid — may differ from the signed-in user for a collaborator
  companyName?: string;
  collaboratorCompanyDocIds?: string[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function LivreDeSociete({ darkMode = false, onBack, companyId, ownerId, companyName, collaboratorCompanyDocIds = [] }: LivreDeSocieteProps) {
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<ResolutionDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newSummary, setNewSummary] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setIsLoading(false); return; }
    dataService.fetchResolutions(uid, collaboratorCompanyDocIds)
      .then((docs) => setResolutions(docs.filter((r) => r.companyId === `${ownerId}_company_${companyId}`)))
      .finally(() => setIsLoading(false));
    // collaboratorCompanyDocIds intentionally omitted — its identity changes
    // every render (a new array from App.tsx), which would refetch forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, ownerId]);

  const resetAddForm = () => {
    setNewTitle('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewSummary('');
    setNewFile(null);
    setUploadError(null);
  };

  const handleAddResolution = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (!newTitle.trim()) { setUploadError('Le titre est requis.'); return; }
    if (!newFile) { setUploadError('Sélectionnez le document PDF de la résolution.'); return; }
    setIsUploading(true);
    setUploadError(null);
    try {
      const driveStatus = await getCompanyDriveConfig(companyId, ownerId);
      if (!driveStatus?.connected) {
        setUploadError("Le Google Drive de cette entreprise n'est pas connecté. Allez dans Paramètres → Google Drive pour le connecter, puis réessayez.");
        return;
      }
      const base64Data = await fileToBase64(newFile);
      const result = await uploadDocumentToDrive(
        companyId,
        ownerId,
        base64Data,
        newFile.name,
        newFile.type || 'application/pdf',
        companyName || 'Entreprise',
        'Documents Corporatifs',
      );
      if (!result.success) {
        setUploadError(result.error || 'Échec du téléversement vers Google Drive.');
        return;
      }
      const saved = await dataService.saveResolution(uid, {
        companyId: `${ownerId}_company_${companyId}`,
        title: newTitle.trim(),
        date: newDate,
        summary: newSummary.trim(),
        fileUrl: result.webViewLink || '',
      });
      setResolutions((prev) => [saved, ...prev]);
      setShowAddModal(false);
      resetAddForm();
    } catch (e: any) {
      console.error('handleAddResolution failed:', e);
      setUploadError(e?.message || 'Erreur lors de l’ajout de la résolution.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`w-full flex flex-col space-y-6 ${darkMode ? "text-zinc-100" : "text-slate-900"} max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in duration-500`}>
      {/* Header Livre de Société */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={`p-2 transition-colors rounded-xl ${darkMode ? "text-zinc-500 hover:text-white hover:bg-zinc-900" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"}`}
            >
              <ArrowLeft size={24} />
            </button>
            <h2 className="font-black uppercase italic tracking-tighter text-xl text-left">
              Livre de Société (Résolutions)
            </h2>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest bg-indigo-500/10 px-3 py-1.5 rounded-full italic">
              Voûte Corporative BYOS 🔒
            </span>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-full italic shadow-lg shadow-indigo-500/30 transition-colors"
            >
              <Plus size={14} /> Ajouter
            </button>
          </div>
        </header>

        {/* List of resolutions */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : resolutions.length === 0 ? (
          <div className={`rounded-[32px] border p-10 text-center space-y-3 ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-slate-200"}`}>
            <div className={`inline-flex p-3 rounded-2xl ${darkMode ? "bg-indigo-900/30 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
              <Briefcase size={24} />
            </div>
            <p className={`text-sm font-bold ${darkMode ? "text-zinc-300" : "text-slate-700"}`}>
              Aucune résolution pour l'instant
            </p>
            <p className={`text-xs max-w-sm mx-auto ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
              Les résolutions corporatives (nomination des dirigeants, déclaration de dividendes, etc.) archivées ici apparaîtront dans cette liste.
            </p>
          </div>
        ) : (
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {resolutions.map((res) => {
              const isOpen = openAccordionId === res.id;

              return (
                <div key={res.id} className={`rounded-[32px] overflow-hidden transition-all duration-300 ${darkMode ? "bg-zinc-950 border border-zinc-800" : "bg-white border border-slate-200"} ${isOpen ? 'shadow-xl' : 'shadow-sm hover:shadow-md'}`}>
                  <button
                    onClick={() => setOpenAccordionId(isOpen ? null : res.id)}
                    className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-6 text-left transition-colors ${darkMode ? "hover:bg-zinc-900/80" : "hover:bg-slate-50/80"}`}
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-2">
                         <div className={`p-2.5 rounded-[16px] inline-flex items-center justify-center shrink-0 ${darkMode ? "bg-indigo-900/30 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                           <Briefcase size={20} />
                         </div>
                         <p className={`font-black text-base sm:text-lg tracking-tight uppercase italic ${darkMode ? "text-white" : "text-slate-900"}`}>
                           {res.title}
                         </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 sm:ml-16 mt-3 sm:mt-1">
                        <span className={`text-xs font-semibold ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                          Créé le {res.date}
                        </span>
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                          <CheckCircle2 size={14} className="shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Archivé</span>
                        </div>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className={`mt-4 sm:mt-0 self-start sm:self-center p-3 rounded-full shrink-0 ${darkMode ? "bg-zinc-900 border border-zinc-800 text-zinc-400" : "bg-slate-50 border border-slate-100 text-slate-400"}`}
                    >
                      <ChevronDown size={20} />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                      >
                        <div className={`px-6 pb-7 pt-4 border-t sm:ml-16 ${darkMode ? "border-zinc-800/80" : "border-slate-100"}`}>
                          <p className={`text-sm leading-relaxed mb-6 ${darkMode ? "text-zinc-400" : "text-slate-600"}`}>
                            {res.summary || 'Aucun résumé fourni.'}
                          </p>

                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <a
                              href={res.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-transform active:scale-95 ${darkMode ? "bg-indigo-500 border border-indigo-400 text-white hover:bg-indigo-600" : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-xl shadow-indigo-500/20"}`}
                            >
                              <Download size={16} />
                              <span>Ouvrir le document</span>
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </AnimatePresence>
        </div>
        )}

        {/* Add resolution modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowAddModal(false); resetAddForm(); }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-md rounded-[32px] shadow-2xl border p-6 space-y-4 ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase italic tracking-tighter text-indigo-500">
                    Ajouter une résolution
                  </h3>
                  <button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Titre</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex : Nomination des dirigeants"
                    className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium border outline-none ${darkMode ? "bg-zinc-900 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`}
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Date de la résolution</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium border outline-none ${darkMode ? "bg-zinc-900 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`}
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Résumé (optionnel)</label>
                  <textarea
                    rows={3}
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    placeholder="Ex : Nomination de Natalia Ortelli et Fabiola Villegas à titre de présidentes."
                    className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium border outline-none resize-none ${darkMode ? "bg-zinc-900 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"}`}
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Document (PDF)</label>
                  <label
                    className={`flex items-center justify-center gap-2 w-full px-3 py-3 rounded-xl border border-dashed text-[10px] font-black uppercase tracking-wide cursor-pointer ${darkMode ? "border-zinc-700 text-zinc-400 hover:border-indigo-500" : "border-slate-300 text-slate-500 hover:border-indigo-400"}`}
                  >
                    {newFile ? newFile.name : 'Choisir un fichier PDF'}
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                {uploadError && (
                  <p className="text-[11px] font-bold text-rose-500">{uploadError}</p>
                )}

                <button
                  onClick={handleAddResolution}
                  disabled={isUploading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-full text-[11px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  {isUploading ? <><Loader2 size={14} className="animate-spin" /> Envoi en cours...</> : 'Archiver la résolution'}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
}
