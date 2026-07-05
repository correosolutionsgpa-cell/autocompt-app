import React, { useState, useEffect } from "react";
import { ArrowLeft, Building2, MapPin, Search, Plus, FileText, ChevronRight, Calculator, CheckCircle2, ShieldCheck, Download, FolderOpen, Loader2, Trash2, Upload } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { dataService, type PropertyDoc, type PropertyDocumentDoc } from "../lib/dataService";
import { auth, storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface Propriete extends PropertyDoc {
  documentsCount: number;
}

export const TaxesAssurancesView = ({ 
  darkMode, 
  setVista,
  setDepenses,
  companyId,
  playNotificationSound,
  setDispatcherSuccessToast
}: { 
  darkMode: boolean; 
  setVista: (v: string) => void;
  setDepenses?: React.Dispatch<React.SetStateAction<any[]>>;
  companyId?: string;
  playNotificationSound?: () => void;
  setDispatcherSuccessToast?: React.Dispatch<React.SetStateAction<any>>;
}) => {
  const [selectedPropriete, setSelectedPropriete] = useState<Propriete | null>(null);
  const [activeTab, setActiveTab] = useState<"Municipales" | "Scolaires" | "Assurances">("Municipales");
  const [showAddPropModal, setShowAddPropModal] = useState(false);
  const [newPropAddress, setNewPropAddress] = useState("");
  
  const [proprietes, setProprietes] = useState<Propriete[]>([]);
  const [documents, setDocuments] = useState<PropertyDocumentDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Load properties on mount / companyId change
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !companyId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    dataService.fetchProperties(uid)
      .then(async (realProps) => {
        // Filter properties by active workspace companyId
        const filtered = realProps.filter(p => p.companyId === companyId);
        
        // Fetch document counts for each property
        const propsWithCounts = await Promise.all(filtered.map(async (p) => {
          const docs = await dataService.fetchPropertyDocuments(uid, p.id);
          return {
            ...p,
            documentsCount: docs.length
          };
        }));
        setProprietes(propsWithCounts);
      })
      .catch((err) => console.error("fetchProperties failed:", err))
      .finally(() => setIsLoading(false));
  }, [companyId]);

  // Load documents for selected property
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !selectedPropriete) {
      setDocuments([]);
      return;
    }
    dataService.fetchPropertyDocuments(uid, selectedPropriete.id)
      .then((docs) => setDocuments(docs))
      .catch((err) => console.error("fetchPropertyDocuments failed:", err));
  }, [selectedPropriete]);

  const handleAddPropriete = async () => {
    if (!newPropAddress.trim()) return;
    const uid = auth.currentUser?.uid;
    const compId = companyId || "1";

    try {
      if (!uid) {
        // Offline/Mock fallback
        const mockProp: Propriete = {
          id: `mock_${Date.now()}`,
          companyId: compId,
          typeLocation: "Appartement/Maison",
          adresse: newPropAddress.trim(),
          status: 'Actif',
          documentsCount: 0,
          ownerId: "",
          createdAt: new Date().toISOString()
        };
        setProprietes(prev => [...prev, mockProp]);
        setNewPropAddress("");
        setShowAddPropModal(false);
        return;
      }

      const saved = await dataService.saveProperty(uid, {
        id: "",
        companyId: compId,
        typeLocation: "Appartement/Maison",
        adresse: newPropAddress.trim(),
        status: 'Actif',
      });
      setProprietes(prev => [...prev, { ...saved, documentsCount: 0 }]);
      setNewPropAddress("");
      setShowAddPropModal(false);
      if (playNotificationSound) playNotificationSound();
    } catch (err) {
      console.error("Failed to add property:", err);
      alert("Erreur lors de la création de la propriété.");
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPropriete) return;
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert("Session non active. Impossible d'importer le document.");
      return;
    }

    setIsUploading(true);
    try {
      const storagePath = `properties/${selectedPropriete.id}/${activeTab}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      const savedDoc = await dataService.savePropertyDocument(uid, {
        id: "",
        propertyId: selectedPropriete.id,
        type: activeTab,
        name: file.name,
        fileUrl,
        storagePath,
      });

      setDocuments(prev => [savedDoc, ...prev]);

      // Update property documentsCount locally
      setProprietes(prev => prev.map(p => 
        p.id === selectedPropriete.id 
          ? { ...p, documentsCount: p.documentsCount + 1 }
          : p
      ));

      if (playNotificationSound) playNotificationSound();
      if (setDispatcherSuccessToast) {
        setDispatcherSuccessToast({
          text: "Document importé",
          channel: "Taxes & Assurances",
          customMessage: `Le document ${file.name} a été enregistré avec succès.`,
        });
      }
    } catch (err) {
      console.error("File upload failed:", err);
      alert("Erreur lors du téléversement du fichier.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, storagePath: string) => {
    if (!confirm("Voulez-vous supprimer ce document ?")) return;
    try {
      await dataService.deletePropertyDocument(docId, storagePath);
      setDocuments(prev => prev.filter(d => d.id !== docId));

      // Update property documentsCount locally
      setProprietes(prev => prev.map(p => 
        p.id === selectedPropriete?.id 
          ? { ...p, documentsCount: Math.max(0, p.documentsCount - 1) }
          : p
      ));

      if (playNotificationSound) playNotificationSound();
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert("Erreur lors de la suppression du document.");
    }
  };

  const FOLDER_COLORS = [
    {
      tabColor: "bg-emerald-500",
      bgIconLight: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
      bgIconDark: "bg-emerald-900/20 text-emerald-500 group-hover:bg-emerald-900/40",
      textLight: "text-emerald-600/70",
      textDark: "text-emerald-500/70",
      hoverBorderLight: "hover:border-emerald-500/50",
      hoverBorderDark: "hover:border-emerald-500/50",
    },
    {
      tabColor: "bg-blue-500",
      bgIconLight: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
      bgIconDark: "bg-blue-900/20 text-blue-500 group-hover:bg-blue-900/40",
      textLight: "text-blue-600/70",
      textDark: "text-blue-500/70",
      hoverBorderLight: "hover:border-blue-500/50",
      hoverBorderDark: "hover:border-blue-500/50",
    },
    {
      tabColor: "bg-amber-500",
      bgIconLight: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
      bgIconDark: "bg-amber-900/20 text-amber-500 group-hover:bg-amber-900/40",
      textLight: "text-amber-600/70",
      textDark: "text-amber-500/70",
      hoverBorderLight: "hover:border-amber-500/50",
      hoverBorderDark: "hover:border-amber-500/50",
    },
    {
      tabColor: "bg-purple-500",
      bgIconLight: "bg-purple-50 text-purple-600 group-hover:bg-purple-100",
      bgIconDark: "bg-purple-900/20 text-purple-500 group-hover:bg-purple-900/40",
      textLight: "text-purple-600/70",
      textDark: "text-purple-500/70",
      hoverBorderLight: "hover:border-purple-500/50",
      hoverBorderDark: "hover:border-purple-500/50",
    },
    {
      tabColor: "bg-rose-500",
      bgIconLight: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
      bgIconDark: "bg-rose-900/20 text-rose-500 group-hover:bg-rose-900/40",
      textLight: "text-rose-600/70",
      textDark: "text-rose-500/70",
      hoverBorderLight: "hover:border-rose-500/50",
      hoverBorderDark: "hover:border-rose-500/50",
    },
    {
      tabColor: "bg-cyan-500",
      bgIconLight: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100",
      bgIconDark: "bg-cyan-900/20 text-cyan-500 group-hover:bg-cyan-900/40",
      textLight: "text-cyan-600/70",
      textDark: "text-cyan-500/70",
      hoverBorderLight: "hover:border-cyan-500/50",
      hoverBorderDark: "hover:border-cyan-500/50",
    }
  ];

  const renderFolderGrid = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {proprietes.map((prop, idx) => {
          const theme = FOLDER_COLORS[idx % FOLDER_COLORS.length];
          return (
          <button
            key={prop.id}
            onClick={() => setSelectedPropriete(prop)}
            className={`relative p-6 rounded-[32px] border ${
              darkMode 
                ? "bg-zinc-950 border-zinc-900 " + theme.hoverBorderDark
                : "bg-white border-slate-200 " + theme.hoverBorderLight
            } shadow-sm group hover:shadow-xl transition-all duration-300 transform active:scale-95 text-left flex flex-col justify-between min-h-[160px] cursor-pointer`}
          >
            {/* Decorative folder tab visual */}
            <div className={`absolute top-0 right-10 w-24 h-3 rounded-b-xl opacity-20 ${theme.tabColor}`}></div>

            <div className="flex items-start justify-between">
              <div className={`p-4 rounded-2xl ${darkMode ? theme.bgIconDark : theme.bgIconLight} transition-colors`}>
                <FolderOpen size={28} />
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                darkMode ? "bg-zinc-900 text-slate-400" : "bg-slate-100 text-slate-500"
              }`}>
                <FileText size={12} />
                <span>{prop.documentsCount} docs</span>
              </div>
            </div>
            
            <div className="mt-6 flex flex-col items-start">
              <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-1 ${darkMode ? theme.textDark : theme.textLight}`}>
                <MapPin size={12} />
                Propriété
              </div>
              <h3 className={`text-lg font-black tracking-tight line-clamp-1 ${darkMode ? "text-white" : "text-slate-900"}`}>
                {prop.adresse}
              </h3>
            </div>
          </button>
        )})}

        {/* Button Add Folder */}
        <button
          onClick={() => setShowAddPropModal(true)}
          className={`relative p-6 rounded-[32px] border ${
            darkMode 
              ? "bg-zinc-950 border-zinc-900 text-white" 
              : "bg-white border-slate-200 text-slate-900"
          } shadow-sm group hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 transform active:scale-95 text-left flex flex-col justify-between min-h-[160px] cursor-pointer`}
        >
          <div className="flex items-start justify-between">
            <div className={`p-4 rounded-2xl ${darkMode ? "bg-slate-800 text-slate-400 group-hover:bg-emerald-900/20 group-hover:text-emerald-500" : "bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600"} transition-colors`}>
              <Plus size={28} />
            </div>
          </div>
          
          <div className="mt-6 flex flex-col items-start">
            <h3 className={`text-lg font-black tracking-tight ${darkMode ? "text-slate-400 group-hover:text-white" : "text-slate-500 group-hover:text-slate-900"} transition-colors`}>
              Ajouter
            </h3>
            <span className={`text-xs font-bold uppercase tracking-widest mt-1 ${darkMode ? "text-zinc-600 group-hover:text-emerald-500/70" : "text-slate-400 group-hover:text-emerald-600/70"} transition-colors`}>
              Nouvelle Propriété
            </span>
          </div>
        </button>
      </div>
    );
  };

  const renderDetailView = () => {
    const activeDocs = documents.filter(d => d.type === activeTab);

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className={`p-6 sm:p-8 rounded-[32px] border shadow-sm ${darkMode ? "bg-zinc-950 border-zinc-900" : "bg-white border-slate-100"} flex flex-col space-y-8`}>
          
          {/* Header Propriété */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${darkMode ? "bg-emerald-900/20 text-emerald-500" : "bg-emerald-100 text-emerald-600"}`}>
                <Building2 size={32} />
              </div>
              <div>
                <h3 className={`text-2xl font-black tracking-tighter ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {selectedPropriete?.adresse}
                </h3>
                <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${darkMode ? "text-emerald-500" : "text-emerald-600"}`}>
                  Gestion des relevés officiels
                </p>
              </div>
            </div>

            {/* Upload Area Button */}
            <div className="relative">
              <label className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 cursor-pointer transition-all duration-150">
                {isUploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Importation...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Importer un document</span>
                  </>
                )}
                <input
                  type="file"
                  onChange={handleUploadFile}
                  accept="application/pdf, image/jpeg, image/png, image/webp"
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Colorful Category Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
               onClick={() => setActiveTab("Municipales")}
               className={`flex flex-col items-start p-6 rounded-[32px] border shadow-sm hover:shadow-xl transition-all active:scale-95 ${darkMode ? "bg-zinc-950 border-zinc-900 text-white" : "bg-white border-slate-200 text-slate-900"} ${activeTab === "Municipales" ? (darkMode ? "border-emerald-500/50 ring-1 ring-emerald-500/30" : "border-emerald-500/50 ring-1 ring-emerald-500/30") : ""}`}
            >
               <div className={`p-4 rounded-2xl mb-4 ${activeTab === "Municipales" ? (darkMode ? "bg-emerald-900/40 text-emerald-500" : "bg-emerald-100 text-emerald-600") : (darkMode ? "bg-zinc-900 text-zinc-500" : "bg-slate-50 text-slate-400 group-hover:text-emerald-500")} transition-colors`}>
                 <Building2 size={24} />
               </div>
               <div className="text-left w-full">
                 <span className={`block text-[11px] font-black uppercase tracking-widest leading-tight ${activeTab === "Municipales" ? "" : (darkMode ? "text-zinc-400" : "text-slate-500")}`}>
                   Taxes
                   <br />
                   Municipales
                 </span>
               </div>
            </button>
            
            <button
               onClick={() => setActiveTab("Scolaires")}
               className={`flex flex-col items-start p-6 rounded-[32px] border shadow-sm hover:shadow-xl transition-all active:scale-95 ${darkMode ? "bg-zinc-950 border-zinc-900 text-white" : "bg-white border-slate-200 text-slate-900"} ${activeTab === "Scolaires" ? (darkMode ? "border-blue-500/50 ring-1 ring-blue-500/30" : "border-blue-500/50 ring-1 ring-blue-500/30") : ""}`}
            >
               <div className={`p-4 rounded-2xl mb-4 ${activeTab === "Scolaires" ? (darkMode ? "bg-blue-900/40 text-blue-500" : "bg-blue-100 text-blue-600") : (darkMode ? "bg-zinc-900 text-zinc-500" : "bg-slate-50 text-slate-400 group-hover:text-blue-500")} transition-colors`}>
                 <Calculator size={24} />
               </div>
               <div className="text-left w-full">
                 <span className={`block text-[11px] font-black uppercase tracking-widest leading-tight ${activeTab === "Scolaires" ? "" : (darkMode ? "text-zinc-400" : "text-slate-500")}`}>
                   Taxes
                   <br />
                   Scolaires
                 </span>
               </div>
            </button>

            <button
               onClick={() => setActiveTab("Assurances")}
               className={`flex flex-col items-start p-6 rounded-[32px] border shadow-sm hover:shadow-xl transition-all active:scale-95 ${darkMode ? "bg-zinc-950 border-zinc-900 text-white" : "bg-white border-slate-200 text-slate-900"} ${activeTab === "Assurances" ? (darkMode ? "border-amber-500/50 ring-1 ring-amber-500/30" : "border-amber-500/50 ring-1 ring-amber-500/30") : ""}`}
            >
               <div className={`p-4 rounded-2xl mb-4 ${activeTab === "Assurances" ? (darkMode ? "bg-amber-900/40 text-amber-500" : "bg-amber-100 text-amber-600") : (darkMode ? "bg-zinc-900 text-zinc-500" : "bg-slate-50 text-slate-400 group-hover:text-amber-500")} transition-colors`}>
                 <ShieldCheck size={24} />
               </div>
               <div className="text-left w-full">
                 <span className={`block text-[11px] font-black uppercase tracking-widest leading-tight ${activeTab === "Assurances" ? "" : (darkMode ? "text-zinc-400" : "text-slate-500")}`}>
                   Polices
                   <br />
                   d'Assurances
                 </span>
               </div>
            </button>
          </div>

          {/* List of Documents */}
          {activeDocs.length === 0 ? (
            <div className={`flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed ${darkMode ? "border-zinc-800 bg-zinc-900/20" : "border-slate-200 bg-slate-50"} min-h-[300px]`}>
               <div className={`mb-4 ${darkMode ? "text-zinc-600" : "text-slate-300"}`}>
                  {activeTab === "Assurances" ? <ShieldCheck size={64} /> : <Calculator size={64} />}
               </div>
               <p className={`text-sm font-bold max-w-sm mx-auto ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                 Aucun document enregistré pour 
                 <span className={`block mt-2 font-black uppercase tracking-widest ${darkMode ? "text-white" : "text-slate-900"}`}>
                    {activeTab === "Assurances" ? "les assurances" : `les taxes ${activeTab.toLowerCase()}`}
                 </span>
               </p>
               <p className={`text-[10px] uppercase font-bold tracking-widest mt-4 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}>
                 Utilisez le bouton ci-dessus pour importer.
               </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                    darkMode ? "bg-zinc-900/50 border-zinc-800 text-white" : "bg-slate-50/50 border-slate-100 text-slate-900"
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className={`p-2.5 rounded-xl ${darkMode ? "bg-zinc-800 text-emerald-400" : "bg-white text-emerald-600 border border-slate-200"} shrink-0`}>
                      <FileText size={18} />
                    </div>
                    <div className="truncate text-left">
                      <p className="text-xs font-black uppercase tracking-tight truncate max-w-md">{doc.name}</p>
                      <p className={`text-[9px] font-bold text-slate-400 mt-0.5`}>
                        Importé le {new Date(doc.uploadedAt).toLocaleDateString("fr-CA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2 rounded-xl border ${
                        darkMode ? "border-zinc-850 hover:bg-zinc-800 text-zinc-300" : "border-slate-200 hover:bg-slate-100 text-slate-600"
                      } transition-colors`}
                    >
                      <Download size={14} />
                    </a>
                    <button
                      onClick={() => handleDeleteDocument(doc.id, doc.storagePath)}
                      className={`p-2 rounded-xl border ${
                        darkMode ? "border-zinc-850 hover:bg-rose-950 text-rose-400" : "border-slate-200 hover:bg-rose-50 text-rose-600"
                      } transition-colors`}
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

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col h-full overflow-hidden">
      <header className="flex items-center space-x-3 mb-6 shrink-0 pt-2">
        <button
          onClick={() => {
            if (selectedPropriete) {
              setSelectedPropriete(null); // Regresar al nivel de carpetas
            } else {
              setVista("dashboard"); // Regresar al dashboard
            }
          }}
          className={`p-2 transition-all rounded-full ${
            darkMode ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-slate-400 hover:text-slate-900 hover:bg-slate-200"
          } active:scale-95`}
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className={`text-xl sm:text-2xl font-black uppercase italic tracking-tighter ${darkMode ? "text-white" : "text-slate-900"}`}>
            Taxes Foncières & Assurances
          </h1>
          <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5 ${darkMode ? "text-emerald-500" : "text-emerald-600"}`}>
            {selectedPropriete ? (
              <>
                <span>Portfolio</span>
                <ChevronRight size={10} />
                <span className="text-slate-400">{selectedPropriete.adresse}</span>
              </>
            ) : (
              "Dossiers propriétaires"
            )}
          </p>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar pr-2">
         {selectedPropriete ? renderDetailView() : renderFolderGrid()}
      </div>

      {showAddPropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddPropModal(false)} />
          <div className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl ${darkMode ? "bg-zinc-900 border border-zinc-800" : "bg-white border border-slate-200"}`}>
            <h3 className={`text-xl font-black italic tracking-tighter uppercase mb-4 ${darkMode ? "text-white" : "text-slate-900"}`}>
              Nouvelle Propriété
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 shadow-sm ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
                  Adresse
                </label>
                <input
                  type="text"
                  placeholder="Ex: 100 Rue de la Gare"
                  value={newPropAddress}
                  onChange={(e) => setNewPropAddress(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddPropModal(false)}
                  className={`flex-1 p-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
                    darkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddPropriete}
                  disabled={!newPropAddress.trim()}
                  className="flex-1 p-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxesAssurancesView;
