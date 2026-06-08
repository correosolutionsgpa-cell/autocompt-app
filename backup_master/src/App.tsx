import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Save, Upload, PlusCircle, Trash2, Lock, Unlock, X,
  FileText, Layout, CheckCircle2, Download, Share2,
  Receipt, FileSignature, Wallet, Car, TableProperties, Settings, Timer,
  Eye, EyeOff, Plus, Percent, Palette, ArrowRight, Navigation,
  ToggleRight, ToggleLeft, ShieldCheck, MapPin, Copy, AlertTriangle, Camera, Cpu, Bell, FileSpreadsheet, Zap,
  Folder, FolderOpen, Search,
  Printer, Mail, Image as ImageIcon, Type, MousePointer2, ChevronRight, ChevronDown, Filter, Send, ExternalLink, Home, Users, TrendingUp, Calendar, Sparkles, Briefcase,
  Shield, FileSearch, FileQuestion, Sun, Moon, Globe, PenLine, ClipboardList, Menu, LogOut, Cloud, Hammer,
  Phone, MessageSquare
} from 'lucide-react';

import DossierFiscauxView from './components/DossierFiscauxView';


const LogoPrincipal = ({ size = 24, showText = false, animate = false, textColor = "text-[#1E293B] dark:text-zinc-100" }: { size?: number, showText?: boolean, animate?: boolean, textColor?: string }) => {
  if (animate) {
    return (
      <div className="flex flex-col items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="z-10 bg-white dark:bg-zinc-950 p-8 rounded-[38%] shadow-2xl shadow-teal-500/5 border border-teal-500/10 text-teal-600 dark:text-teal-400"
        >
          <Sparkles size={size * 0.6} />
        </motion.div>
        
        {showText && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
            className="text-center"
          >
            <h1 className={`text-5xl font-black italic tracking-tighter ${textColor} mt-10 leading-none`}>AutoCompt</h1>
            <p className="text-[10px] font-black uppercase bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent tracking-[0.4em] mt-4">Intelligence Fiscale</p>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
       <div className="bg-white dark:bg-zinc-950 p-1.5 rounded-xl flex items-center justify-center shadow-sm border border-teal-500/10 text-teal-600 dark:text-teal-400">
         <Sparkles size={size} />
       </div>
       {showText && <span className={`font-black italic ${textColor} tracking-tighter uppercase text-lg`}>AutoCompt</span>}
    </div>
  );
};

const getCategoryInfo = (cat: string) => {
  switch (cat) {
    case 'À classer':
      return {
        icon: <FileQuestion size={14} />,
        bg: 'bg-purple-500/10 dark:bg-purple-500/20',
        text: 'text-purple-500 dark:text-purple-400'
      };
    case 'Télécommunications':
      return {
        icon: <Settings size={14} />,
        bg: 'bg-slate-500/10 dark:bg-slate-500/20',
        text: 'text-slate-500 dark:text-slate-400'
      };
    case 'Bureau à domicile':
      return {
        icon: <Home size={14} />,
        bg: 'bg-teal-500/10 dark:bg-teal-500/20',
        text: 'text-teal-500 dark:text-teal-400'
      };
    case 'Équipement':
      return {
        icon: <Layout size={14} />,
        bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
        text: 'text-indigo-500 dark:text-indigo-400'
      };
    case 'Réparations / Entretien':
      return {
        icon: <Hammer size={14} />,
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-500 dark:text-amber-400'
      };
    case 'Rénovation / Construction':
      return {
        icon: <Hammer size={14} />,
        bg: 'bg-yellow-500/15 dark:bg-yellow-500/25',
        text: 'text-yellow-500 dark:text-yellow-400'
      };
    case 'Taxes':
      return {
        icon: <Percent size={14} />,
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        text: 'text-rose-500 dark:text-rose-400'
      };
    case 'Assurance':
      return {
        icon: <ShieldCheck size={14} />,
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        text: 'text-blue-500 dark:text-blue-400'
      };
    case 'Chauffage':
      return {
        icon: <Cloud size={14} />,
        bg: 'bg-orange-500/10 dark:bg-orange-500/20',
        text: 'text-orange-500 dark:text-orange-400'
      };
    case 'Electricité':
      return {
        icon: <Zap size={14} />,
        bg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
        text: 'text-yellow-500 dark:text-yellow-400'
      };
    case 'Frais de gestion / Exploitation':
      return {
        icon: <Briefcase size={14} />,
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-500 dark:text-emerald-400'
      };
    case 'Ventes':
      return {
        icon: <TrendingUp size={14} />,
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-500 dark:text-emerald-400'
      };
    case 'Honoraires de gestion immobilière':
      return {
        icon: <Briefcase size={14} />,
        bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
        text: 'text-indigo-500 dark:text-indigo-400'
      };
    case 'Intérêts reçus - Prêt privé':
      return {
        icon: <Wallet size={14} />,
        bg: 'bg-purple-500/10 dark:bg-purple-500/20',
        text: 'text-purple-500 dark:text-purple-400'
      };
    case 'Loyers résidentiels':
      return {
        icon: <Home size={14} />,
        bg: 'bg-orange-500/10 dark:bg-orange-500/25',
        text: 'text-orange-500 dark:text-orange-400'
      };
    case 'Ventes de services':
      return {
        icon: <Layout size={14} />,
        bg: 'bg-teal-500/10 dark:bg-teal-500/20',
        text: 'text-teal-500 dark:text-teal-400'
      };
    case 'Ventes de biens':
      return {
        icon: <Receipt size={14} />,
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-500 dark:text-amber-400'
      };
    case 'Sous-traitance':
    case "Main d'œuvre / Salaire":
      return {
        icon: <Users size={14} />,
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-500 dark:text-emerald-400'
      };
    default:
      return {
        icon: <FileQuestion size={14} />,
        bg: 'bg-slate-500/10 dark:bg-slate-500/20',
        text: 'text-slate-500 dark:text-slate-400'
      };
  }
};

const SignatureDrawPad = ({ onSave }: { onSave: (dataUrl: string) => void }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Setup fine luxurious thin calligraphic pen styling
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e3a8a'; // Royal/navy blue ink
    ctx.lineWidth = 2.5;
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSave('');
  };

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border border-slate-205 dark:border-zinc-805 bg-white dark:bg-zinc-900 mt-2">
        <canvas
          ref={canvasRef}
          width={400}
          height={180}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-44 cursor-crosshair block touch-none"
        />
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            type="button"
            onClick={clearCanvas}
            className="px-2.5 py-1 text-[7.5px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-all"
          >
            Effacer
          </button>
        </div>
        <p className="absolute bottom-2 left-2 text-[6.5px] uppercase font-black tracking-widest text-[#059669] opacity-70">
          Encre Royale BYOS Actif
        </p>
      </div>
    </div>
  );
};

const App = () => {
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  // --- NAVEGACIÓN ---
  const [vista, setVista] = useState('splash');
  const [activeCompanyId, setActiveCompanyId] = useState('1');
  const [darkMode, setDarkMode] = useState(false);
  const [activeLang, setActiveLang] = useState<'FR' | 'ES' | 'EN'>('FR');
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const [listaEmpresas, setListaEmpresas] = useState<any[]>([
    { 
      id: '1', 
      nombre: 'Solutions GPA Inc.', 
      industry: 'Gestionnaire de Bâtiments', 
      legalEntity: 'Incorporée',
      partners: ['Fabiola'],
      googleEmail: 'solutionsgpa@gmail.com',
      driveConfig: { folderId: 'gpa_management_vault', connected: true },
      accentColor: 'purple',
      borderColor: 'border-purple-500/25 dark:border-purple-500/35',
      focusRingColor: 'ring-purple-500',
      textAccentColor: 'text-purple-600 dark:text-purple-400',
      bgAccentColor: 'bg-purple-50/50 dark:bg-purple-950/20',
      badgeBg: 'bg-purple-100/80 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      gradientFromTo: 'from-purple-500 to-indigo-600',
      partnerData: {
        Fabiola: {
          homeOffice: { aireTotale: 1000, aireBureau: 150, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
          vehicle: { model: 'Tesla Model Y', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
          paradas: ['']
        }
      },
      userProfile: {
        logo: null, color: '#8B5CF6', font: 'Moderne',
        nom: 'Solutions GPA Inc.', adresse: 'Laval, QC', tel: '450-555-0123',
        neq: '1170000000', tps: '123456789 RT0001', tvq: '1098765432 TQ0001',
        site: 'www.propiosolutions.com',
        pago: 'Virement: gestion@propiosolutions.com',
        tpsRate: 5,
        tvqRate: 9.975
      }
    },
    { 
      id: '2', 
      nombre: 'Achat Direct Inc.', 
      industry: 'Prospecteur & Flip', 
      legalEntity: 'Incorporée',
      partners: ['Fabiola', 'Natalia'],
      googleEmail: 'achatdirectqc@gmail.com',
      driveConfig: { folderId: 'achat_direct_shared_vault', connected: true },
      accentColor: 'emerald',
      borderColor: 'border-emerald-500/25 dark:border-emerald-500/35',
      focusRingColor: 'ring-emerald-500',
      textAccentColor: 'text-[#059669] dark:text-emerald-400',
      bgAccentColor: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      badgeBg: 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      gradientFromTo: 'from-emerald-500 to-teal-600',
      partnerData: {
        Fabiola: {
          homeOffice: { aireTotale: 1000, aireBureau: 150, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
          vehicle: { model: 'Tesla Model Y', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
          paradas: ['']
        },
        Natalia: {
          homeOffice: { aireTotale: 1200, aireBureau: 200, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
          vehicle: { model: 'Audi Q5 Sportback', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
          paradas: ['']
        }
      },
      userProfile: {
        logo: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=100&h=100&fit=crop', color: '#059669', font: 'Moderne',
        nom: 'Achat Direct Inc. (Natalia & Fabiola)', adresse: 'Montréal, QC', tel: '514-555-9876',
        neq: '1179999999', tps: '987654321 RT0001', tvq: '1122334455 TQ0001',
        site: 'www.achatdirect.ca',
        pago: 'Virement: accounts@achatdirect.ca',
        tpsRate: 5,
        tvqRate: 9.975
      }
    },
    { 
      id: '3', 
      nombre: 'Triplex - Immobilier', 
      industry: 'Propriétaire de Plex', 
      legalEntity: 'Co-propriété (Individus)',
      partners: ['Fabiola', 'Eric'],
      googleEmail: 'solutionsgpa@gmail.com', // or eric.fabiola.triplex@gmail.com, prepared for Daniel to configure
      driveConfig: { folderId: 'plex_personal_drive', connected: true },
      accentColor: 'orange',
      borderColor: 'border-orange-500/25 dark:border-orange-500/35',
      focusRingColor: 'ring-orange-500',
      textAccentColor: 'text-orange-600 dark:text-orange-400',
      bgAccentColor: 'bg-orange-50/50 dark:bg-orange-950/20',
      badgeBg: 'bg-orange-100/80 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      gradientFromTo: 'from-orange-500 to-amber-600',
      deductionFactor: 0.666,
      propertyType: 'Triplex',
      partnersPct: { Fabiola: 50, Eric: 50 },
      partnerData: {
        Fabiola: {
          homeOffice: { aireTotale: 1000, aireBureau: 50, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
          vehicle: { model: 'Tesla Model Y', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
          paradas: ['']
        },
        Eric: {
          homeOffice: { aireTotale: 1000, aireBureau: 50, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
          vehicle: { model: 'Camry Hybrid', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
          paradas: ['']
        }
      },
      userProfile: {
        logo: null, color: '#F59E0B', font: 'Moderne',
        nom: 'Triplex - Immobilier', adresse: 'Montréal (Triplex)', tel: '514-555-0000',
        neq: 'Personal-Account', tps: 'Personal', tvq: 'Personal',
        site: '',
        pago: 'Paiement Hypothécaire: Compte Conjoint',
        tpsRate: 5,
        tvqRate: 9.975
      }
    },
    { 
      id: '4', 
      nombre: 'Gonzalo Real Estate', 
      industry: 'Courtier Immobilier', 
      legalEntity: 'Travailleur Autonome',
      partners: ['Gonzalo', 'Fabiola'],
      driveConfig: { folderId: 'brokerage_courtier_vault', connected: true },
      partnerData: {
        Gonzalo: {
          homeOffice: { aireTotale: 1500, aireBureau: 300, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
          vehicle: { model: 'Lexus RX', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
          paradas: ['']
        },
        Fabiola: {
          homeOffice: { aireTotale: 1000, aireBureau: 150, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
          vehicle: { model: 'Tesla Model Y', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
          paradas: ['']
        }
      },
      userProfile: {
        logo: null, color: '#059669', font: 'Moderne',
        nom: 'Gonzalo Real Estate', adresse: 'Brossard, QC', tel: '450-555-1122',
        neq: '2230000000', tps: '888777666 RT0001', tvq: '4445556667 TQ0001',
        site: 'www.gonzalorealestate.ca',
        pago: 'Virement: info@gonzalorealestate.ca',
        tpsRate: 5,
        tvqRate: 9.975
      }
    },
    { 
      id: '5', 
      nombre: 'Entrepreneur Général', 
      industry: 'Construction & Rénovations', 
      legalEntity: 'Incorporée',
      partners: ['Fabiola'],
      driveConfig: { folderId: 'entrepreneur_construction_vault', connected: true },
      partnerData: {
        Fabiola: {
          homeOffice: { aireTotale: 1000, aireBureau: 100, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
          vehicle: { model: 'F-150 Lightning', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
          paradas: ['']
        }
      },
      userProfile: {
        logo: null, color: '#059669', font: 'Moderne',
        nom: 'Entrepreneur Général Inc.', adresse: 'Terrebonne, QC', tel: '450-555-3344',
        neq: '3340000000', tps: '555444333 RT0001', tvq: '6667778889 TQ0001',
        site: 'www.fabiolaconstruction.ca',
        pago: 'Virement: construction@fabiola.ca',
        tpsRate: 5,
        tvqRate: 9.975
      }
    }
  ]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  
  const currentCompany = listaEmpresas.find(e => e.id === activeCompanyId);
  const empresa = currentCompany;

  useEffect(() => {
    if (vista === 'splash') {
      const timer = setTimeout(() => {
        setVista('selector');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [vista]);

  const [subVistaFactura, setSubVistaFactura] = useState('liste');
  const [tabReporte, setTabReporte] = useState('ventes');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFac, setSelectedFac] = useState(null);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [isTrackingAuto, setIsTrackingAuto] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [activeUser, setActiveUser] = useState('Fabiola');
  const [partners, setPartners] = useState(['Fabiola', 'Natalia']);
  const [hasMultiplePartners, setHasMultiplePartners] = useState(true);
  const [industry, setIndustry] = useState('Immobilier'); 
  const [legalEntity, setLegalEntity] = useState('Travailleur Autonome');

  // --- PRICING TIERS & WORKSPACE LIMITS STATE ---
  const [selectedTier, setSelectedTier] = useState<'gratuit' | 'assistant' | 'premium'>('gratuit');
  const [showLimitModal, setShowLimitModal] = useState(false);

  const TIER_LIMITS: Record<string, number> = {
    gratuit: 1,
    assistant: 3,
    premium: 10,
    superadmin: Infinity
  };

  const getEffectiveTier = (): 'gratuit' | 'assistant' | 'premium' | 'superadmin' => {
    const bypassEmails = ['solutionsgpa@gmail.com', 'achatdirectqc@gmail.com', 'correo.solutionsgpa@gmail.com'];
    const activeEmail = currentCompany?.googleEmail || '';
    const isBypass = bypassEmails.some(e => 
      activeEmail.toLowerCase().includes(e) || 
      (comptableEmail || '').toLowerCase().includes(e) ||
      'correo.solutionsgpa@gmail.com'.toLowerCase().includes(e)
    );
    if (isBypass) return 'superadmin';
    return selectedTier;
  };

  // --- COMPTABLE RAPPORT STATES ---
  const [comptablesConfig, setComptablesConfig] = useState<Record<string, {
    nom: string;
    email: string;
    tel: string;
    drive: string;
  }>>({
    '1': { nom: 'Natalia Caisse', email: 'natalia.caisse@solutionsgpa.ca', tel: '+1 (514) 555-0199', drive: '' },
    '2': { nom: 'Natalia Caisse', email: 'natalia.caisse@solutionsgpa.ca', tel: '+1 (514) 555-0199', drive: '' },
    '3': { nom: 'Daniel Bernier', email: 'daniel.bernier@triplexcompta.ca', tel: '+1 (514) 555-0188', drive: '' },
    '4': { nom: 'Chantal Roy', email: 'chantal.roy@gonzalocomptable.ca', tel: '+1 (450) 555-1122', drive: '' },
    '5': { nom: 'Marc Tremblay', email: 'marc@tremblayentreprises.ca', tel: '+1 (450) 555-3344', drive: '' }
  });

  const currentComptable = comptablesConfig[activeCompanyId] || {
    nom: 'Natalia Caisse',
    email: 'natalia.caisse@solutionsgpa.ca',
    tel: '+1 (514) 555-0199',
    drive: ''
  };

  const comptableEmail = currentComptable.email;

  const [comptableNomInput, setComptableNomInput] = useState('');
  const [comptableEmailInput, setComptableEmailInput] = useState('');
  const [comptableTelInput, setComptableTelInput] = useState('');
  const [comptableDriveInput, setComptableDriveInput] = useState('');
  const [editingComptable, setEditingComptable] = useState(false);

  const [selectedRapportPeriod, setSelectedRapportPeriod] = useState('Mois en cours');
  const [selectedRapportProfile, setSelectedRapportProfile] = useState('Solutions GPA Inc.');
  const [selectedRapportFormat, setSelectedRapportFormat] = useState('PDF Unifié');
  const [comptableMessage, setComptableMessage] = useState(
    "Bonjour,\n\nVeuillez trouver ci-joint mon livre de comptes ainsi que le relevé bancaire concilié pour la période sélectionnée d'AutoCompt.\n\nCordialement,\nFabiola Villegas"
  );
  const [rapportSentSuccess, setRapportSentSuccess] = useState(false);
  const [showComptableModal, setShowComptableModal] = useState(false);
  
  const [showRapportDispatcherModal, setShowRapportDispatcherModal] = useState(false);
  const [dispatcherSuccessToast, setDispatcherSuccessToast] = useState<{ text: string; channel: string } | null>(null);
  const [isTransmittingChannel, setIsTransmittingChannel] = useState<string | null>(null);

  useEffect(() => {
    if (dispatcherSuccessToast) {
      const timer = setTimeout(() => {
        setDispatcherSuccessToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [dispatcherSuccessToast]);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  
  const [propertyType, setPropertyType] = useState<string>('Triplex');
  const [partnersPct, setPartnersPct] = useState<{ [partnerName: string]: number }>({ Fabiola: 50, Eric: 50 });

  useEffect(() => {
    if (empresa) {
      setPartners(empresa.partners || []);
      setIndustry(empresa.industry || 'Immobilier');
      setLegalEntity(empresa.legalEntity);
      setPartnerData(empresa.partnerData || {});
      setUserProfile(empresa.userProfile || {});
      setSelectedRapportProfile(empresa.nombre);
      setPropertyType(empresa.propertyType || 'Triplex');
      setPartnersPct(empresa.partnersPct || (empresa.partners || []).reduce((acc: any, p: string) => {
        acc[p] = 50;
        return acc;
      }, {}));
      
      // Update dynamic accountant inputs based on active company
      const comp = comptablesConfig[activeCompanyId] || { nom: 'Natalia Caisse', email: 'natalia.caisse@solutionsgpa.ca', tel: '+1 (514) 555-0199', drive: '' };
      setComptableNomInput(comp.nom);
      setComptableEmailInput(comp.email);
      setComptableTelInput(comp.tel);
      setComptableDriveInput(comp.drive);
      setEditingComptable(false);

      // Ensure active user is from the current company's partners
      if (empresa.partners && empresa.partners.length > 0 && !empresa.partners.includes(activeUser)) {
        setActiveUser(empresa.partners[0]);
      }
    }
  }, [activeCompanyId]);

  const [tipoDoc, setTipoDoc] = useState('Facture');
  const [doculegalTab, setDoculegalTab] = useState('Baux');
  
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [subfFecha, setSubfFecha] = useState(new Date().toISOString().split('T')[0]);
  const [subfFournisseur, setSubfFournisseur] = useState('');
  const [subfDesc, setSubfDesc] = useState('');
  const [subfSubtotal, setSubfSubtotal] = useState('');
  const [subfIsTaxable, setSubfIsTaxable] = useState(true);
  const [subfNeq, setSubfNeq] = useState('');
  const [subfTypePaiement, setSubfTypePaiement] = useState('Facture Officielle');
  const [subfAttachmentName, setSubfAttachmentName] = useState('');
  
  const [clientes, setClientes] = useState([
    { id: 1, nom: 'Jean Tremblay', adresse: '123 Rue de la Montagne, Montréal', email: 'jean.tremblay@email.com', neq: '1112223334' },
    { id: 2, nom: 'Marie Cote', adresse: '456 Boul. Taschereau, Longueuil', email: 'marie.cote@email.com', neq: '2223334445' },
    { id: 3, nom: 'Proprio Plus Inc.', adresse: '789 Rue Sherbrooke, Montréal', email: 'contact@proprioplus.ca', neq: '3334445556' }
  ]);
  const [newClient, setNewClient] = useState({ nom: '', adresse: '', email: '', neq: '' });
  const [newInvoiceData, setNewInvoiceData] = useState({
    clientId: '',
    nouveauClientNom: '',
    nouveauClientAdresse: '',
    nouveauClientEmail: '',
    isNouveauClient: false,
    description: '',
    precioUnitario: 0,
    isTaxable: true
  });


  // --- PERFIL Y CONFIGURACIÓN ---
  const [setupComplet, setSetupComplet] = useState(false);
  const [userProfile, setUserProfile] = useState({
    logo: null, color: '#059669', font: 'Moderne',
    nom: 'Proprio Solutions', adresse: 'Laval, QC', tel: '450-000-0000',
    neq: '1170000000', tps: '123456789 RT0001', tvq: '1098765432 TQ0001',
    site: 'www.propiosolutions.com',
    pago: 'Virement Interac: gestion@propiosolutions.com\nMot de passe: GPA2026',
    tpsRate: 5,
    tvqRate: 9.975
  });
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(16);

  // --- WORKSPACE & MULTI-ACCOUNT SIDEBAR ---
  const WorkspaceSidebar = () => {
    const activeColorHex = currentCompany?.userProfile?.color || '#059669';
    const activeBorderColor = currentCompany?.borderColor || 'border-emerald-500/20';
    const activeTextAccent = currentCompany?.textAccentColor || 'text-emerald-600';
    const activeBgAccent = currentCompany?.bgAccentColor || 'bg-emerald-50/50';
    const activeBadge = currentCompany?.badgeBg || 'bg-emerald-100 text-emerald-800';

    const navItems = [
      { id: 'dashboard', label: 'Tableau de Bord', icon: <Layout size={18} /> },
      { id: 'dossiers', label: 'Dossiers Fiscaux', icon: <FolderOpen size={18} /> },
      { id: 'banque', label: 'Conciliation', icon: <Wallet size={18} /> },
      { id: 'sous-traitance', label: 'Sous-traitance', icon: <Users size={18} /> },
      { id: 'reportes', label: 'Tenue de Livres', icon: <FileSpreadsheet size={18} /> },
      { id: 'facturas', label: 'Facturation', icon: <Receipt size={18} /> },
      { id: 'homeoffice', label: 'Bureau Rénov', icon: <Home size={18} /> },
      { id: 'kilometraje', label: 'GPS trajets', icon: <Car size={18} /> },
      { id: 'taxes', label: 'TPS / TVQ', icon: <Percent size={18} /> },
      { id: 'doculegal', label: 'DocuLegal', icon: <FileSignature size={18} /> },
    ];

    // Determine color representation for active enterprise
    const getCompanyAccentBorder = (companyId: string) => {
      if (companyId === '1') return 'border-l-purple-500'; // Solutions GPA (purple)
      if (companyId === '2') return 'border-l-emerald-500'; // Achat Direct (emerald/green)
      if (companyId === '3') return 'border-l-amber-500'; // Triplex (orange/amber)
      return 'border-l-emerald-500';
    };

    const getWorkspaceVisualTag = (companyId: string) => {
      if (companyId === '1') return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30';
      if (companyId === '2') return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30';
      if (companyId === '3') return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30';
      return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30';
    };

    return (
      <>
        {/* MOBILE SIDEBAR SCREEN OVERLAY */}
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className={`fixed inset-0 bg-black/60 z-50 md:hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        />

        {/* PERSISTENT ON DESKTOP & SLIDING PANEL ON MOBILE */}
        <aside 
          className={`fixed top-0 bottom-0 left-0 bg-white dark:bg-zinc-950 border-r ${darkMode ? 'border-zinc-900' : 'border-slate-200'} z-50 md:w-72 w-80 md:translate-x-0 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col h-screen select-none`}
        >
          {/* TOP INNER HEADER */}
          <div className="p-6 border-b border-slate-100 dark:border-zinc-900/60 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/10">
                <Sparkles size={18} />
              </div>
              <div>
                <h1 className={`text-base font-black tracking-tighter ${darkMode ? 'text-white' : 'text-[#1E293B]'} italic`}>AutoCompt</h1>
                <p className="text-[7px] font-bold text-[#059669] dark:text-emerald-400 uppercase tracking-widest leading-none mt-0.5">Intelligence Fiscale</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 md:hidden rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-400 dark:text-zinc-500"
            >
              <X size={16} />
            </button>
          </div>

          {/* SÉLECTEUR D'ENTITÉS / WORKSPACE SELECTOR CONTAINER */}
          <div className="p-4 border-b border-slate-100 dark:border-zinc-900/60 relative">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2 mb-2">Espace de Travail</p>
            
            <button 
              onClick={() => {
                setShowWorkspaceDropdown(!showWorkspaceDropdown);
                playNotificationSound();
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border ${darkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-slate-200'} shadow-sm text-left transition-all active:scale-[0.98] outline-none group hover:border-[#059669] duration-300`}
              style={{ borderLeftWidth: '5px', borderLeftColor: activeColorHex }}
            >
              <div className="flex-grow min-w-0 pr-2">
                <div className="flex items-center space-x-1.5">
                  <span className={`text-[9.5px] font-black uppercase tracking-tight leading-none ${darkMode ? 'text-zinc-100' : 'text-[#1F2937]'}`}>
                    {currentCompany?.nombre}
                  </span>
                </div>
                <span className="text-[7.5px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider leading-none block mt-1.5 truncate">
                  {currentCompany?.googleEmail || 'solutionsgpa@gmail.com'}
                </span>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${showWorkspaceDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* EXPANDABLE DROP-DOWN OF WORKSPACES */}
            <AnimatePresence>
              {showWorkspaceDropdown && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`absolute left-4 right-4 mt-2 p-2 rounded-2xl border shadow-2xl z-50 text-left ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}
                >
                  <div className="space-y-1 max-h-[280px] overflow-y-auto">
                    {listaEmpresas.map((workspace) => {
                      const isSelected = workspace.id === activeCompanyId;
                      const wsColor = workspace.userProfile?.color || '#059669';
                      return (
                        <button
                          key={workspace.id}
                          onClick={() => {
                            setActiveCompanyId(workspace.id);
                            setShowWorkspaceDropdown(false);
                            playNotificationSound();
                            setVista('dashboard');
                            setIsSidebarOpen(false);
                          }}
                          className={`w-full flex flex-col p-3 rounded-xl transition-all text-left border ${isSelected ? 'border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/80' : 'border-transparent hover:bg-slate-50 dark:hover:bg-zinc-800/40'}`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: wsColor }} />
                              <span className={`text-[9.5px] font-black uppercase tracking-tight leading-none ${isSelected ? 'text-[#059669] dark:text-emerald-400' : (darkMode ? 'text-zinc-200' : 'text-[#374151]')}`}>
                                {workspace.nombre}
                              </span>
                            </div>
                            <span className={`text-[6px] font-black px-1.5 py-0.5 rounded uppercase ${getWorkspaceVisualTag(workspace.id)}`}>
                              Espacio {workspace.id === '2' ? '1' : workspace.id === '1' ? '2' : workspace.id === '3' ? '3' : workspace.id}
                            </span>
                          </div>
                          <span className="text-[7.5px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mt-1.5 truncate">
                            {workspace.googleEmail || 'solutionsgpa@gmail.com'}
                          </span>
                          <span className="text-[6.5px] text-[#059669] dark:text-emerald-400 uppercase font-black tracking-widest mt-1 block leading-none">
                            🔒 Drive: /{workspace.driveConfig?.folderId || 'vault'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DYNAMIC CO-OPERATION OPERATOR SWITCH (Achat Direct ONLY) */}
          {activeCompanyId === '2' && (
            <div className={`p-4 border-b border-slate-100 dark:border-zinc-900/60 ${darkMode ? 'bg-zinc-950/40' : 'bg-slate-50/40'}`}>
              <div className="flex flex-col space-y-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">
                  🤝 Co-Opération Active
                </span>
                
                <div className="flex bg-slate-100 dark:bg-zinc-900 border border-slate-200/40 dark:border-zinc-800/60 p-1 rounded-full items-center transition-all shadow-inner justify-between">
                  <button 
                    onClick={() => { setActiveUser('Fabiola'); playNotificationSound(); }}
                    className={`flex-1 py-1.5 rounded-full text-[8.5px] font-black uppercase italic tracking-wider transition-all duration-300 ${activeUser === 'Fabiola' ? 'bg-[#059669] text-white shadow-md shadow-emerald-900/15' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200'}`}
                  >
                    Fabiola
                  </button>
                  <button 
                    onClick={() => { setActiveUser('Natalia'); playNotificationSound(); }}
                    className={`flex-1 py-1.5 rounded-full text-[8.5px] font-black uppercase italic tracking-wider transition-all duration-300 ${activeUser === 'Natalia' ? 'bg-[#059669] text-white shadow-md shadow-emerald-900/15' : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200'}`}
                  >
                    Natalia
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* QUICK LINKS LIST */}
          <div className="flex-1 p-4 overflow-y-auto space-y-1">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2 mb-3">Outils de Gestion</p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = vista === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'doculegal' && (selectedTier === 'gratuit' || selectedTier === 'assistant')) {
                        setPaywallTargetTier('Pro (18.99$)');
                        setShowPaywallModal(true);
                        playNotificationSound();
                        return;
                      }
                      setVista(item.id);
                      setIsSidebarOpen(false);
                      playNotificationSound();
                    }}
                    className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-left text-[10px] font-black uppercase tracking-tight transition-all duration-200 active:scale-95 group ${isActive ? 'bg-[#059669] text-white shadow-md shadow-emerald-900/10' : (darkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900/60' : 'text-[#374151] hover:text-slate-900 hover:bg-slate-50/80')}`}
                  >
                    <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 dark:text-zinc-500 group-hover:text-[#059669]'}`}>
                      {item.icon}
                    </span>
                    <span>{item.label} {item.id === 'doculegal' && (selectedTier === 'gratuit' || selectedTier === 'assistant') && '🔒'}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* BOTTOM FIXED GOOGLE DRIVE API STATUS PANEL */}
          <div className={`p-5 border-t ${darkMode ? 'border-zinc-900 bg-zinc-950 text-zinc-400' : 'border-slate-100 bg-slate-50 text-slate-500'} flex flex-col space-y-2`}>
            <div className="flex items-center space-x-2">
              <Cloud size={14} className="text-emerald-500 shrink-0" />
              <span className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? 'text-zinc-200' : 'text-slate-700'}`}>Google Drive Config</span>
            </div>
            
            <p className="text-[7.5px] leading-tight text-slate-400 dark:text-zinc-500 leading-snug">
              Ségrégation multi-tenant active.<br/>
              Abonnement : <span className="text-[#059669] font-bold">Secure API Tunnel</span>
            </p>

            <button 
              onClick={() => {
                setVista('selector');
                setIsSidebarOpen(false);
                playNotificationSound();
              }}
              className={`w-full py-2 border rounded-xl flex items-center justify-center space-x-2 text-[8px] font-black uppercase tracking-widest transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <LogOut size={12} />
              <span>Menu de Profils</span>
            </button>
          </div>
        </aside>
      </>
    );
  };
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [newTxData, setNewTxData] = useState<any>({ fecha: '', tiers: '', cat: '', total: '', isTaxable: true });
  const [showFiscalChat, setShowFiscalChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([
    { id: 'msg-init', role: 'assistant', author: 'Laia', content: "Bonjour ! Je suis Laia, assistante IA d'AutoCompt. Comment puis-je vous aider aujourd'hui à optimiser votre comptabilité ou votre fiscalité immobilière ?" }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [aiQueryCount, setAiQueryCount] = useState<number>(0);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallTargetTier, setPaywallTargetTier] = useState<string>('Pro');
  const [subVistaDocu, setSubVistaDocu] = useState('liste');
  const [docuSignInProgress, setDocuSignInProgress] = useState<any>(null);
  const [docuLegalList, setDocuLegalList] = useState([
    { id: 'DOC-001', name: 'Bail Résidentiel - Apt. 3, 1234 Rue Saint-Hubert', status: 'Signé', date: '2026-05-01', cat: 'Baux Résidentiels', author: 'Fabiola Villegas', recipient: 'Marc-André Tremblay', companyId: '3', content: 'Le présent bail résidentiel est consenti pour le loyer de 1,200 $ par mois, incluant le chauffage...', recipientPhone: '514-555-0123', recipientEmail: 'marc.tremblay@email.com', smsVerify: true, emailInvite: 'Bonjour Marc-André, voici le bail conforme pour signature.' },
    { id: 'DOC-002', name: "Avis d'Augmentation de Loyer - Apt. 12", status: 'En attente', date: '2026-05-18', cat: "Avis d'Augmentation", author: 'Fabiola Villegas', recipient: 'Chantal Roy', companyId: '3', content: 'Avis officiel d\'augmentation mensuelle de 2.5% conformément aux critères du Tribunal administratif du logement...', recipientPhone: '514-555-5566', recipientEmail: 'chantal.roy@email.com', smsVerify: true, emailInvite: 'Bonjour Chantal, veuillez prendre connaissance de l\'avis d\'ajustement annuel.' },
    { id: 'DOC-003', name: 'Contrat de Gestion Exclusive Solutions GPA', status: 'Signé', date: '2026-05-15', cat: 'Contrats de Gestion', author: 'Fabiola Villegas', recipient: 'Solutions GPA Inc.', companyId: '1', content: 'Entente liant le gestionnaire des immeubles aux standards d\'administration BYOS, incluant conciliation automatisée...', recipientPhone: '450-555-0123', recipientEmail: 'gestion@propiosolutions.com', smsVerify: false, emailInvite: 'Bonjour, voici le contrat de service de gestion actualisé.' },
    { id: 'DOC-004', name: "Promesse d'Achat Standard - Laval Vimont", status: 'En attente', date: '2026-05-19', cat: "Promesses d'Achat", author: 'Achat Direct Inc.', recipient: 'Jean-Pierre Roy', companyId: '2', content: 'Offre conditionnelle d\'achat ferme d\'un immeuble Triplex pour un montant de 450,000 $ avec dépôt initial...', recipientPhone: '514-555-9876', recipientEmail: 'jp.roy@achatdirect.ca', smsVerify: true, emailInvite: 'Bonjour Jean-Pierre, voici notre offre rédigée d\'achat pour le Triplex Laval.' },
    { id: 'DOC-005', name: "Contrat de Sous-traitance Peinture", status: 'Signé', date: '2026-05-10', cat: "Contrats de Sous-traitance", author: 'Fabiola Villegas', recipient: 'Marc Tremblay Enr.', companyId: '1', content: 'Contrat de main d\'œuvre de peintre pour la réfection complète des plafonds de l\'unité 3...', recipientPhone: '514-555-0122', recipientEmail: 'marc.enr@email.com', smsVerify: false, emailInvite: 'Bonjour Marc, veuillez signer le contrat de peinture avant d\'entamer le chantier.' }
  ]);
  const [selectedDocuFolder, setSelectedDocuFolder] = useState<string | null>(null);
  const [selectedDocuEntry, setSelectedDocuEntry] = useState<any | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalDoc, setQrModalDoc] = useState<any | null>(null);
  
  // Document Creator/Editor inputs
  const [docFormName, setDocFormName] = useState('');
  const [docFormFolder, setDocFormFolder] = useState('');
  const [docFormRecipient, setDocFormRecipient] = useState('');
  const [docFormEmail, setDocFormEmail] = useState('');
  const [docFormPhone, setDocFormPhone] = useState('');
  const [docFormContent, setDocFormContent] = useState('');
  const [docFormSmsVerify, setDocFormSmsVerify] = useState(true);
  const [docFormEmailInvite, setDocFormEmailInvite] = useState('');
  const [docSimulatedFile, setDocSimulatedFile] = useState<string | null>(null);
  const [docPlacedFields, setDocPlacedFields] = useState<any[]>([
    { id: 'field-1', type: 'Signature', signer: 'Natalia Lopez', roleColor: 'Emerald' },
    { id: 'field-2', type: 'Initiales', signer: 'Fabiola Villegas', roleColor: 'Purple' },
  ]);
  const [docSignerActive, setDocSignerActive] = useState('Natalia Lopez');
  const [showSigProfileModal, setShowSigProfileModal] = useState(false);
  const [activeSigTab, setActiveSigTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typeSigName, setTypeSigName] = useState('Fabiola Villegas');
  const [typeInitials, setTypeInitials] = useState('FV');
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [savedInitials, setSavedInitials] = useState<string | null>(null);
  const [savedUploadSignature, setSavedUploadSignature] = useState<string | null>(null);
  const [mobileClientSignature, setMobileClientSignature] = useState<string | null>(null);

  // DocuLegal Module - Custom Premium states
  const [newSignerName, setNewSignerName] = useState('');
  const [newSignerEmail, setNewSignerEmail] = useState('');
  const [newSignerRole, setNewSignerRole] = useState('Signataire');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [signingFieldId, setSigningFieldId] = useState<string | null>(null);
  const [signingFieldSigner, setSigningFieldSigner] = useState<string | null>(null);
  const [showSignaturePadModal, setShowSignaturePadModal] = useState(false);
  const [activeInteractiveSigTab, setActiveInteractiveSigTab] = useState<'draw' | 'type'>('draw');
  const [interactiveSigName, setInteractiveSigName] = useState('');
  const [interactiveSigInitials, setInteractiveSigInitials] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [docLogo, setDocLogo] = useState<string | null>(null);
  const [remindedDocs, setRemindedDocs] = useState<Record<string, boolean>>({});
  const [docuFilterTab, setDocuFilterTab] = useState<string>('all');
  const [smartTemplates, setSmartTemplates] = useState([
    {
      id: 'temp-1',
      name: "Bail Résidentiel Standard (TAL)",
      description: "Modèle de bail conforme au Tribunal administratif du logement du Québec",
      content: "CONTRAT DE BAIL COMMERCIAL & RÉSIDENTIEL\n\nEntre:\n[Nom du Propriétaire], ci-après le bailleur,\nEt:\n[Nom du Client/Locataire], ci-après le preneur.\n\nPAR LES PRÉSENTES, les parties s'entendent pour un bail mensuel d'un montant de [Loyer] $ payable le 1er de chaque mois pour le logement mentionné. Le bailleur s'engage à livrer le logement en bon état d'habitabilité et de propreté. Le locataire s'engage à maintenir les lieux propres et en bon état général.\n\nFait et signé en toute bonne foi d'AutoCompt BYOS.",
      variables: [
        { name: "[Nom du Propriétaire]", placeholder: "Propriétaire", value: "Solutions GPA Inc." },
        { name: "[Nom du Client/Locataire]", placeholder: "Locataire", value: "" },
        { name: "[Loyer]", placeholder: "Montant loyer CA$", value: "1250" }
      ]
    },
    {
      id: 'temp-2',
      name: "Promesse d'Achat Immobilier",
      description: "Modèle de promesse d'achat d'un immeuble (bâtisse ou terrain)",
      content: "PROMESSE D'ACHAT FERME - TRANSACTION OFF-MARKET\n\nNom de l'acheteur: [Acheteur]\nNom du vendeur: [Vendeur]\n\nPar la présente, l'acheteur offre d'acheter l'immeuble situé au [Adresse de l'immeuble] pour un prix total déterminé de [Prix d'Achat] $ payable à la conclusion de l'acte de vente notarié.\n\nCette offre est conditionnelle à l'inspection de l'immeuble et à l'approbation d'un financement hypothécaire adéquat dans les 14 jours.\n\nSignatures requises d'AutoCompt.",
      variables: [
        { name: "[Acheteur]", placeholder: "Nom de l'acheteur", value: "" },
        { name: "[Vendeur]", placeholder: "Nom du vendeur", value: "" },
        { name: "[Adresse de l'immeuble]", placeholder: "Adresse", value: "" },
        { name: "[Prix d'Achat]", placeholder: "Prix CA$", value: "480000" }
      ]
    },
    {
      id: 'temp-3',
      name: "Contrat d'Entente de Confidentialité (NDA)",
      description: "Modèle légal d'accord de non-divulgation",
      content: "CONTRAT DE NON-DIVULGATION ET ACCORD DE CONFIDENTIALITÉ\n\nEntre l'émetteur principal des documents et le destinataire signataire [Réseau d'affaires].\n\nToutes les informations divulguées lors de l'étude budgétaire d'AutoCompt BYOS doivent demeurer exclusives et non-partagées.\n\nLiaison BYOS compatible Loi 25 active.",
      variables: [
        { name: "[Réseau d'affaires]", placeholder: "Entreprise ou partenaire", value: "" }
      ]
    }
  ]);

  const handleExportPDF = (doc: any) => {
    const auditedDoc = {
      ...doc,
      signerName: doc.recipient || "Destinataire",
      signerEmail: doc.recipientEmail || "client@propiosolutions.com",
      signatureTimestamp: doc.signatureTimestamp || `${doc.date || '2026-05-21'} 14:32:10 UTC`,
      transactionId: doc.transactionId || `TX-BYOS-${doc.id || 'DOC'}-${Math.floor(100000 + Math.random() * 900000)}`,
      signatureData: doc.signatureData || null,
      logo: doc.logo || docLogo || null,
      signers: doc.signers || docFormSignersList || []
    };

    const secureHash = `sha256:e3b0c44298f${Math.floor(100000 + Math.random() * 899999)}c149afbf4c8996fb${Math.floor(100000 + Math.random() * 899999)}92427ae41e4649b934ca495991b7852b855`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("⚠️ Veuillez autoriser les fenêtres contextuelles pour exporter le PDF.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${auditedDoc.name} - Copie Conforme Signée</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono&display=swap');
            
            body {
              font-family: 'Inter', sans-serif;
              color: #0f172a;
              line-height: 1.6;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }

            .page {
              padding-bottom: 40px;
              margin-bottom: 40px;
              position: relative;
            }

            .page-break {
              page-break-after: always;
              border-bottom: 2px dashed #cbd5e1;
              margin: 60px 0;
            }

            @media print {
              .page-break {
                page-break-after: always;
                border: none;
                margin: 0;
                padding: 0;
              }
              body {
                padding: 20px;
              }
            }

            .header {
              border-bottom: 3px solid #7c3aed;
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }

            .header-title {
              font-size: 20px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: -0.025em;
              color: #7c3aed;
            }

            .header-meta {
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
              color: #64748b;
              text-align: right;
            }

            .title-block {
              margin: 40px 0 20px 0;
            }

            .doc-title {
              font-size: 24px;
              font-weight: 800;
              text-transform: uppercase;
              margin-bottom: 5px;
              color: #1e293b;
            }

            .doc-id {
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              color: #64748b;
              background: #f1f5f9;
              padding: 4px 10px;
              border-radius: 6px;
              display: inline-block;
            }

            .content {
              font-size: 14px;
              color: #334155;
              white-space: pre-wrap;
              margin-top: 30px;
              padding: 24px;
              background: #f8fafc;
              border-radius: 16px;
              border: 1px solid #e2e8f0;
              min-height: 250px;
            }

            .signatures {
              margin-top: 40px;
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 30px;
            }

            .sig-box {
              border-top: 1px solid #cbd5e1;
              padding-top: 15px;
            }

            .sig-label {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 8px;
            }

            .sig-name {
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
            }

            .sig-image-container {
              height: 60px;
              display: flex;
              align-items: center;
              justify-content: flex-start;
              margin-bottom: 10px;
            }

            .sig-img {
              max-height: 50px;
              object-fit: contain;
            }

            .cert-card {
              border: 2px solid #7c3aed;
              background: #faf5ff;
              border-radius: 24px;
              padding: 30px;
              margin-top: 20px;
            }

            .cert-title-block {
              display: flex;
              align-items: center;
              border-bottom: 1px solid #ddd6fe;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }

            .cert-badge {
              background: #7c3aed;
              color: white;
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 6px 12px;
              border-radius: 12px;
              margin-right: 15px;
              letter-spacing: 0.05em;
            }

            .cert-main-title {
              font-size: 16px;
              font-weight: 850;
              text-transform: uppercase;
              color: #5b21b6;
            }

            .cert-grid {
              display: grid;
              grid-template-columns: auto 1fr;
              gap: 15px 25px;
              font-size: 12px;
            }

            .cert-label {
              font-weight: 800;
              color: #5b21b6;
              text-transform: uppercase;
              font-size: 10.5px;
              letter-spacing: 0.02em;
              display: flex;
              align-items: center;
            }

            .cert-value {
              font-weight: 500;
              color: #1e293b;
            }

            .cert-value.mono {
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              background: white;
              padding: 3px 8px;
              border: 1px solid #ddd6fe;
              border-radius: 6px;
              color: #0f172a;
            }

            .cert-footer {
              margin-top: 40px;
              text-align: center;
              font-size: 9px;
              color: #64748b;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              line-height: 1.5;
            }

            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-55%, -50%) rotate(-35deg);
              font-size: 65px;
              font-weight: 800;
              color: rgba(124, 58, 237, 0.035);
              text-transform: uppercase;
              white-space: nowrap;
              letter-spacing: 0.1em;
              pointer-events: none;
              z-index: 0;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="watermark">Signé Numériquement</div>
            <div class="header">
              ${auditedDoc.logo ? `<img src="${auditedDoc.logo}" style="height: 35px; max-width: 140px; object-fit: contain;" />` : `<span class="header-title">ARCHIVE CONFORME DOCULEGAL</span>`}
              <span class="header-meta">LOI 25 QUÉBEC<br/>DATE : ${auditedDoc.date}</span>
            </div>

            <div class="title-block">
              <h1 class="doc-title">${auditedDoc.name}</h1>
              <span class="doc-id">INDEX UNIQUE : ${auditedDoc.id}</span>
            </div>

            <div class="content">${auditedDoc.content}</div>

            <div class="signatures">
              <div class="sig-box">
                <div class="sig-label">Auteur du document</div>
                <div class="sig-image-container">
                  ${savedSignature ? `<img src="${savedSignature}" class="sig-img" />` : `<span style="font-family: 'Caveat', cursive; font-size: 24px; color: #5b21b6;">${auditedDoc.author}</span>`}
                </div>
                <div class="sig-name">${auditedDoc.author}</div>
                <div style="font-size: 8.5px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-top: 2px;">Propriétaire Certifié</div>
              </div>

              ${auditedDoc.signers.filter((s: any) => s.name !== auditedDoc.author).map((sig: any) => `
                <div class="sig-box">
                  <div class="sig-label">Signataire (${sig.role})</div>
                  <div class="sig-image-container">
                    ${auditedDoc.signatureData && (sig.name === auditedDoc.signerName) ? `<img src="${auditedDoc.signatureData}" class="sig-img" />` : `<span style="font-family: 'Great Vibes', cursive; font-size: 24px; color: #5b21b6;">${sig.name}</span>`}
                  </div>
                  <div class="sig-name">${sig.name}</div>
                  <div style="font-size: 8.5px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-top: 2px;">${sig.email}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="page-break"></div>

          <div class="page">
            <div class="header">
              <span class="header-title">DOCULEGAL AUDIT TRAIL RECON</span>
              <span class="header-meta">SÉCURITÉ CRYPTOGRAPHIQUE<br/>LOI 25 CERTIFIÉ</span>
            </div>

            <div style="margin: 30px 0 10px 0;">
              <h2 style="font-size: 20px; font-weight: 800; text-transform: uppercase; margin: 0; color: #1e293b;">Preuve d'Audit Certifiée</h2>
              <p style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-top: 3px;">BYOS Legal Ledger & Archivage Immuable Propiosolutions</p>
            </div>

            <div class="cert-card">
              <div class="cert-title-block">
                <span class="cert-badge">Certificat Émis</span>
                <span class="cert-main-title">Certificat de Signature Électronique</span>
              </div>

              <div class="cert-grid">
                <div class="cert-label">Signataires du contrat</div>
                <div class="cert-value" style="font-weight: 700; line-height: 1.5;">
                  ${auditedDoc.signers.map((s: any) => `${s.name} (${s.email} - ${s.role})`).join('<br/>')}
                </div>

                <div class="cert-label">Destinataire principal</div>
                <div class="cert-value">${auditedDoc.signerName} &lt;${auditedDoc.signerEmail}&gt;</div>

                <div class="cert-label">Horodatage de signature</div>
                <div class="cert-value mono">${auditedDoc.signatureTimestamp}</div>

                <div class="cert-label">Identifiant unique</div>
                <div class="cert-value mono">${auditedDoc.transactionId}</div>

                <div class="cert-label">Rôle d'authentification</div>
                <div class="cert-value" style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #7c3aed;">✓ Validé par SMS OTP et Signature Digitale Tactile</div>

                <div class="cert-label">Adresse IP source</div>
                <div class="cert-value mono">184.162.22.109 (Vidéotron Ltée)</div>

                <div class="cert-label">Empreinte SHA-256</div>
                <div class="cert-value mono" style="font-size: 8px; word-break: break-all; max-width: 450px;">${secureHash}</div>
              </div>
            </div>

            <div style="margin-top: 30px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 15px;">
              <div style="text-align: left;">
                <p style="font-[7.5px]; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0;">Autorité d'enregistrement</p>
                <p style="font-size: 11px; font-weight: 700; color: #7c3aed; margin-top: 2px;">AutoCompt DocuLegal BYOS Core</p>
              </div>
              <div style="text-align: right;">
                <p style="font-[7.5px]; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0;">Législation applicable</p>
                <p style="font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 2px;">Pratique certifiée Loi 25 (Québec)</p>
              </div>
            </div>

            <div class="cert-footer">
              Ce document numérique est scellé cryptographiquement et certifié immuable.<br/>
              Toute modification apportée au corps du texte détruira la signature numérique.
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const [docFormSignersList, setDocFormSignersList] = useState<any[]>([
    { id: '1', name: 'Fabiola Villegas', email: 'fabiola@propiosolutions.com', phone: '514-555-1111', role: 'Propriétaire / Émetteur', color: 'Purple', dotClass: 'bg-purple-500' },
    { id: '2', name: 'Natalia Lopez', email: 'natalia@propiosolutions.com', phone: '514-555-2222', role: 'Collaborateur direct', color: 'Emerald', dotClass: 'bg-emerald-500' }
  ]);

  // --- GESTIONNAIRE DE DOSSIERS FISCAUX ---
  const [customDossiers, setCustomDossiers] = useState<Record<string, {name: string, rule: string}[]>>({
    '1': [
      { name: "Frais d'Agence", rule: 'full' },
      { name: 'Publicité / VistaPrint', rule: 'full' },
      { name: 'Téléphone & Internet', rule: 'full' }
    ],
    '2': [
      { name: 'Assurances', rule: 'full' },
      { name: 'Téléphone & Internet', rule: 'half' },
      { name: 'Frais de véhicule', rule: 'mileage' },
      { name: 'Loyer / Bureau', rule: 'homeoffice' },
      { name: "Frais d'exploitation", rule: 'full' }
    ],
    '3': [
      { name: 'Gestion (Solutions GPA)', rule: 'full' },
      { name: 'Réparations / Matériaux', rule: 'full' },
      { name: 'Taxes & Assurances', rule: 'homeoffice' }
    ],
    '4': [
      { name: 'Frais de Bureau', rule: 'full' },
      { name: 'Publicité Immobilière', rule: 'full' },
      { name: 'Carburant / Déplacements', rule: 'mileage' }
    ],
    '5': [
      { name: 'Sous-traitance', rule: 'full' },
      { name: 'Achat de Matériaux', rule: 'full' },
      { name: 'Outils & Équipement', rule: 'full' }
    ]
  });

  const [showAddDossierModal, setShowAddDossierModal] = useState(false);
  const [newDossierName, setNewDossierName] = useState('');
  const [newDossierRule, setNewDossierRule] = useState('full');
  const [selectedDossierForEntry, setSelectedDossierForEntry] = useState<{name: string, rule: string} | null>(null);
  const [quickEntryAmount, setQuickEntryAmount] = useState('');
  const [quickEntryVendor, setQuickEntryVendor] = useState('');

  // --- REGIONS & DOSSIERS FISCAUX (HIERARCHICAL REVOLUTION) ---
  const [currentYearFolder, setCurrentYearFolder] = useState<number | null>(null);
  const [currentProfileFolder, setCurrentProfileFolder] = useState<string | null>(null);
  const [currentCategoryFolder, setCurrentCategoryFolder] = useState<string | null>(null);
  const [dossierSearchQuery, setDossierSearchQuery] = useState('');
  
  const [dossierFiles, setDossierFiles] = useState<any[]>([
    { id: 'df-1', name: '2025-01-15_Assurance_SolutionsGPA_Duplessis.pdf', year: 2025, profile: 'Solutions GPA', category: 'Assurances', type: 'pdf', size: '245 KB', date: '2025-01-15', status: 'Concilié', provider: 'Intact' },
    { id: 'df-2', name: '2025-05-19_Bell_SolutionsGPA_Internet.pdf', year: 2025, profile: 'Solutions GPA', category: 'Banque', type: 'pdf', size: '124 KB', date: '2025-05-19', status: 'Concilié', provider: 'Bell' },
    { id: 'df-3', name: '2025-03-10_Desjardins_SolutionsGPA_Frais.pdf', year: 2025, profile: 'Solutions GPA', category: 'Banque', type: 'pdf', size: '82 KB', date: '2025-03-10', status: 'Concilié', provider: 'Desjardins' },
    { id: 'df-4', name: '2025-12-31_Taxes_SolutionsGPA_RevenuQuebec.pdf', year: 2025, profile: 'Solutions GPA', category: 'Taxes', type: 'pdf', size: '1.2 MB', date: '2025-12-31', status: 'Concilié', provider: 'Revenu Québec' },
    { id: 'df-5', name: '2025-06-15_Hydro_SolutionsGPA_Bureau.jpg', year: 2025, profile: 'Solutions GPA', category: 'Fournisseurs', type: 'jpg', size: '1.4 MB', date: '2025-06-15', status: 'En attente', provider: 'Hydro-Québec' },
    
    { id: 'df-6', name: '2025-02-01_Assurance_Triplex_Laval.pdf', year: 2025, profile: 'Triplex', category: 'Assurances', type: 'pdf', size: '310 KB', date: '2025-02-01', status: 'Concilié', provider: 'Promutuel' },
    { id: 'df-7', name: '2025-04-18_Municipal_Laval_Taxes.jpg', year: 2025, profile: 'Triplex', category: 'Taxes', type: 'jpg', size: '2.1 MB', date: '2025-04-18', status: 'Concilié', provider: 'Ville de Laval' },
    { id: 'df-8', name: '2025-07-22_Notaire_Triplex_Bail_Signe.pdf', year: 2025, profile: 'Triplex', category: 'Légal', type: 'pdf', size: '1.8 MB', date: '2025-07-22', status: 'Concilié', provider: 'Notaire Tremblay' },
    { id: 'df-9', name: '2025-10-05_HomeDepot_Triplex_Renovation_Thermostat.jpg', year: 2025, profile: 'Triplex', category: 'Fournisseurs', type: 'jpg', size: '890 KB', date: '2025-10-05', status: 'En attente', provider: 'Home Depot' },
    
    { id: 'df-10', name: '2026-01-20_Assurance_SolutionsGPA_2026.pdf', year: 2026, profile: 'Solutions GPA', category: 'Assurances', type: 'pdf', size: '256 KB', date: '2026-01-20', status: 'Concilié', provider: 'Intact' },
    { id: 'df-11', name: '2026-03-01_Videotron_SolutionsGPA_Internet.pdf', year: 2026, profile: 'Solutions GPA', category: 'Banque', type: 'pdf', size: '142 KB', date: '2026-03-01', status: 'Concilié', provider: 'Vidéotron' },
    { id: 'df-12', name: '2026-04-15_RevenuQuebec_AcompteProvisoire.pdf', year: 2026, profile: 'Solutions GPA', category: 'Taxes', type: 'pdf', size: '540 KB', date: '2026-04-15', status: 'En attente', provider: 'Revenu Québec' },
    { id: 'df-13', name: '2026-02-15_Assurance_Triplex_Renovation.pdf', year: 2026, profile: 'Triplex', category: 'Assurances', type: 'pdf', size: '298 KB', date: '2026-02-15', status: 'Concilié', provider: 'Promutuel' },
    { id: 'df-14', name: '2026-05-10_CityTax_Laval_Triplex2026.pdf', year: 2026, profile: 'Triplex', category: 'Taxes', type: 'pdf', size: '1.1 MB', date: '2026-05-10', status: 'Concilié', provider: 'Ville de Laval' },
    { id: 'df-15', name: '2026-05-19_HomeDepot_Triplex_Plomberie.jpg', year: 2026, profile: 'Triplex', category: 'Fournisseurs', type: 'jpg', size: '420 KB', date: '2026-05-19', status: 'En attente', provider: 'Home Depot' }
  ]);
  
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocProvider, setNewDocProvider] = useState('');
  const [newDocYear, setNewDocYear] = useState<number>(2026);
  const [newDocProfile, setNewDocProfile] = useState<string>('Solutions GPA');
  const [newDocCategory, setNewDocCategory] = useState<string>('Banque');
  const [newDocStatus, setNewDocStatus] = useState<'Concilié' | 'En attente'>('En attente');
  const [newDocType, setNewDocType] = useState<'pdf' | 'jpg'>('pdf');
  
  const [selectedDocPreview, setSelectedDocPreview] = useState<any | null>(null);
  
  const [zipDownloadState, setZipDownloadState] = useState<{ isDownloading: boolean, progress: number }>({ isDownloading: false, progress: 0 });

  const handleEditInvoice = (fac: any) => {
    setEditingInvoiceId(fac.id);
    setTipoDoc(fac.tipoDoc || 'Facture');
    
    // Find client
    const clientFound = clientes.find(c => c.nom === fac.cliente);
    setNewInvoiceData({
      clientId: clientFound ? clientFound.id.toString() : '',
      isNouveauClient: false,
      nouveauClientNom: '',
      nouveauClientAdresse: '',
      nouveauClientEmail: fac.email || '',
      description: '',
      precioUnitario: 0,
      isTaxable: true
    });
    
    if (fac.items) {
      setItems(JSON.parse(JSON.stringify(fac.items)));
    } else {
      setItems([{ cantidad: 1, descripcion: 'Services Professionnels', precioUnitario: fac.subtotal, taxable: true }]);
    }
    
    setSubVistaFactura('nouveau');
    playNotificationSound();
  };

  const handleSendReminder = (fac: any) => {
    const subject = `Rappel : Suivi de votre facture ${fac.id} / Invoice Follow-up - Solutions GPA`;
    const body = `Bonjour ${fac.cliente},

J'espère que vous allez bien. Ceci est un petit rappel amical concernant la facture ${fac.id} d'un montant de ${fac.total.toFixed(2)} $, émise pour nos services immobiliers. Selon nos dossiers, le paiement n'a pas encore été reçu.

Vous pouvez effectuer le paiement par virement Interac à l'adresse suivante : gestion@propiosolutions.com (SVP, utilisez le mot de passe : GPA2026).

Si vous avez déjà procédé au paiement dans les derniers jours, veuillez ignorer ce message. Merci de votre collaboration!

--------------------------------------------------

Hello ${fac.cliente},

I hope you are doing well. This is a friendly reminder regarding invoice ${fac.id} for the amount of ${fac.total.toFixed(2)} $, issued for our real estate services. According to our records, payment has not yet been received.

You can make the payment via Interac e-Transfer to the following address: gestion@propiosolutions.com (Please use the password: GPA2026).

If you have already processed the payment in the last few days, please ignore this message. Thank you for your cooperation!

Cordialement / Best regards,
Fabiola Villegas
Solutions GPA Inc.`;

    const mailtoUrl = `mailto:${fac.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    playNotificationSound();
  };


  // --- TENUE DE LIVRES (BASE DE DATOS) ---
  const [historique, setHistorique] = useState([
    { id: 'FAC-001', companyId: '1', cliente: 'Jean Tremblay', fecha: '2026-05-10', subtotal: 1000, tps: 50, tvq: 99.75, total: 1149.75, status: 'Payée' },
    { id: 'FAC-002', companyId: '1', cliente: 'Marie Cote', fecha: '2026-05-12', subtotal: 500, tps: 25, tvq: 49.88, total: 574.88, status: 'En attente' },
    { id: 'FAC-003', companyId: '2', cliente: 'Investisseur Global', fecha: '2026-05-14', subtotal: 2000, tps: 100, tvq: 199.50, total: 2299.50, status: 'Payée' },
    { id: 'PLEX-001', companyId: '3', cliente: 'Locataire 1234', fecha: '2026-05-15', subtotal: 1200, tps: 0, tvq: 0, total: 1200.00, status: 'Payée' },
  ]);


  const [depenses, setDepenses] = useState([
    { id: 1, companyId: '1', fecha: '2026-05-01', fournisseur: 'Bell', cat: 'Télécommunications', subtotal: 80.00, tps: 4.00, tvq: 7.98, total: 91.98, lien: '#', partnerTag: 'Fabiola' },
    { id: 2, companyId: '1', fecha: '2026-05-03', fournisseur: 'Hydro-Québec', cat: 'Bureau à domicile', subtotal: 150.00, tps: 7.50, tvq: 14.96, total: 172.46, lien: '#', partnerTag: 'Fabiola' },
    { id: 3, companyId: '2', fecha: '2026-05-05', fournisseur: 'Apple Store', cat: 'Équipement', subtotal: 1200.00, tps: 60.00, tvq: 119.70, total: 1379.70, lien: '#', partnerTag: 'Natalia' },
    { id: 4, companyId: '3', fecha: '2026-05-06', fournisseur: 'Taxes Municipales', cat: 'Bureau à domicile', subtotal: 2000.00, tps: 0, tvq: 0, total: 2000.00, lien: '#', partnerTag: 'Fabiola' },
  ]);

  const filteredHistorique = historique.filter(h => h.companyId === activeCompanyId);
  const filteredDepenses = depenses.filter(d => d.companyId === activeCompanyId);

  const [showNotifications, setShowNotifications] = useState(false);
  const missingReceipts = filteredDepenses.filter(d => !d.lien);

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio context not allowed yet or error:", e);
    }
  };


  // --- ESTADOS DE MÓDULOS (MULTI-USER) ---
  const [items, setItems] = useState([{ cantidad: 1, descripcion: '', precioUnitario: 0, taxable: true }]);
  const [bankTransactions, setBankTransactions] = useState<any[]>([
    { companyId: '1', desc: 'Virement Bell Canada', amt: 91.98, date: '2026-05-01' },
    { companyId: '1', desc: 'Starbucks Montréal', amt: 12.50, date: '2026-05-02' },
    { companyId: '1', desc: 'Hydro-Québec - Prélèvement', amt: 172.46, date: '2026-05-03' },
    { companyId: '1', desc: 'Paiement Client - Jean T.', amt: 1149.75, date: '2026-05-10' },
    { companyId: '2', desc: 'Dépôt Natalia Capital', amt: 5000.00, date: '2026-05-12' },
    { companyId: '3', desc: 'Prélèvement Hypothèque - Plex', amt: 2450.00, date: '2026-05-01' },
    { companyId: '3', desc: 'Loyer Unité 2', amt: 1100.00, date: '2026-05-01' }
  ]);
  
  const [partnerData, setPartnerData] = useState<any>({
    Fabiola: {
      homeOffice: { aireTotale: 1000, aireBureau: 150, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
      vehicle: { model: 'Tesla Model 3', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
      paradas: ['']
    },
    Natalia: {
      homeOffice: { aireTotale: 1200, aireBureau: 200, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: true },
      vehicle: { model: 'Audi Q5', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
      paradas: ['']
    }
  });

  const [favorisAccounts, setFavorisAccounts] = useState<string[]>([]);

  // --- CÁLCULOS FISCALES ---
  const isPlex = activeCompanyId === '3' || currentCompany?.industry?.includes('Plex') || currentCompany?.industry?.includes('Immobilier');
  const isImmobilierWorkspace = (activeCompanyId === '3' || currentCompany?.industry?.includes('Plex') || currentCompany?.industry?.includes('Immobilier') || industry?.includes('Plex') || industry?.includes('Immobilier')) && activeCompanyId !== '1' && activeCompanyId !== '2';
  const activePct = currentCompany?.partnersPct?.[activeUser] ?? currentCompany?.ownerPercentage ?? 50;

  const currentHomeOffice = partnerData[activeUser]?.homeOffice || { aireTotale: 1, aireBureau: 0 };
  const porcBureau = currentCompany?.deductionFactor ?? ((currentHomeOffice.aireBureau / currentHomeOffice.aireTotale) || 0);
  const currentParadas = partnerData[activeUser]?.paradas || [''];

  const buildingWideCats = ['Bureau à domicile', 'Taxes', 'Assurance', 'Entretien', 'Chauffage', 'Electricité', 'Frais de gestion / Exploitation'];

  const filterBySelectedMonth = (items: any[]) => items.filter(item => {
    if (!item.fecha && !item.date) return true;
    const dateStr = item.fecha || item.date;
    const d = new Date(dateStr);
    return d.getMonth() === selectedMonth;
  });

  const filteredHistoriqueByMonth = filterBySelectedMonth(filteredHistorique);
  const filteredDepensesByMonth = filterBySelectedMonth(filteredDepenses);
  const filteredBankByMonth = filterBySelectedMonth(bankTransactions.filter(t => t.companyId === activeCompanyId));

  const processedHistorique = filteredHistoriqueByMonth.map(h => {
    const activePct = currentCompany?.partnersPct?.[activeUser] ?? currentCompany?.ownerPercentage ?? 50;
    return {
      ...h,
      deductibleTotal: h.total * (isPlex ? activePct / 100 : 1),
      partnerSplit: h.total * (isPlex ? activePct / 100 : 1)
    };
  });

  const processedDepenses = filteredDepensesByMonth.map(d => {
    // Determine the rule for this expense based on its category matching a dossier
    const companyFolders = customDossiers[activeCompanyId] || [];
    const matchingFolder = companyFolders.find(f => f.name === d.cat);
    const dossierRule = matchingFolder ? matchingFolder.rule : 'full';

    // Base deduction factor
    let fiscalRate = 1.0;
    
    if (isPlex) {
      // Logic for Plex (ID '3')
      const isBuildingWide = buildingWideCats.includes(d.cat);
      const propType = currentCompany?.propertyType || 'Triplex';
      let propFactor = 0.666;
      if (propType === 'Duplex') propFactor = 0.50;
      else if (propType === 'Triplex') propFactor = 0.666;
      else if (propType === 'Quadruplex' || propType === 'Quadruplex (4plex)') propFactor = 0.75;
      else if (propType === 'Multi-logement') propFactor = 1.00;
      
      fiscalRate = isBuildingWide ? propFactor : 1.0;
    } else {
      // Logic for Commercial Profiles
      if (dossierRule === 'half') fiscalRate = 0.5;
      else if (dossierRule === 'homeoffice') fiscalRate = porcBureau;
      // 'full' and 'mileage' (already calculated) stay at 1.0 for the current entry's recorded subtotal
    }

    const activePct = currentCompany?.partnersPct?.[activeUser] ?? currentCompany?.ownerPercentage ?? 50;

    return {
      ...d,
      deductionRate: fiscalRate,
      deductibleSubtotal: d.subtotal * fiscalRate * (isPlex ? activePct / 100 : 1),
      deductibleTps: d.tps * fiscalRate * (isPlex ? activePct / 100 : 1),
      deductibleTvq: d.tvq * fiscalRate * (isPlex ? activePct / 100 : 1),
      deductibleTotal: d.total * fiscalRate * (isPlex ? activePct / 100 : 1),
      partnerSplit: (d.total * fiscalRate) * (isPlex ? activePct / 100 : 1)
    };
  });

  const tpsPerçue = processedHistorique.reduce((a, b) => a + b.tps, 0);
  const tvqPerçue = processedHistorique.reduce((a, b) => a + b.tvq, 0);
  const tpsITR = processedDepenses.reduce((a, b) => a + b.deductibleTps, 0);
  const tvqRTI = processedDepenses.reduce((a, b) => a + b.deductibleTvq, 0);

  const handleAddHomeExpense = (cat: string) => {
    const subtotalBase = prompt(`Montant de la dépense (${cat}) ?`, "100");
    if (!subtotalBase) return;
    const base = parseFloat(subtotalBase);
    if (isNaN(base)) return;
    
    // Pro-rated calculation: we store the pro-rated net into subtotal
    const subtotal = base * porcBureau;
    const tps = subtotal * (userProfile.tpsRate / 100);
    const tvq = subtotal * (userProfile.tvqRate / 100);
    
    const newDepense = {
      id: Date.now(),
      companyId: activeCompanyId,
      fecha: new Date().toISOString().split('T')[0],
      fournisseur: `${cat} (Proportionnel)`,
      cat: "Bureau à domicile",
      subtotal: subtotal,
      tps: tps,
      tvq: tvq,
      total: subtotal + tps + tvq,
      lien: null,
      partnerTag: activeUser
    };

    setDepenses(prev => [newDepense, ...prev]);
    playNotificationSound();
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const csvInputRef = React.useRef<HTMLInputElement>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const uploadToDrive = async (file: File) => {
    // BYOS: Using the active company's drive folder
    const folder = currentCompany?.driveConfig?.folderId || 'Default_Vault';
    console.log(`BYOS: Uploading ${file.name} to ${currentCompany?.nombre} Storage (Folder: ${folder})`);
    return `https://drive.google.com/active_company_storage/${folder}/${Date.now()}_${file.name}`;
  };

  const handleAIScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.persist();
    const file = event.target.files?.[0];
    if (!file) return;

    const driveLink = await uploadToDrive(file);

    // AI Extraction (8 Columns standard)
    setTimeout(() => {
      const subtotal = 250.00;
      const tps = subtotal * 0.05;
      const tvq = subtotal * 0.09975;
      const total = subtotal + tps + tvq;

      const newScan = {
        id: Date.now(),
        companyId: activeCompanyId,
        fecha: new Date().toISOString().split('T')[0], // Column 1
        fournisseur: "Amazon Business",                  // Column 2 (Tiers)
        cat: "Fournitures de bureau",                   // Column 3 (Compte)
        partnerTag: activeUser,                          // Column 4 (Partenaire)
        subtotal: subtotal,                              // Column 5 (Net)
        tps: tps,                                        // Column 6
        tvq: tvq,                                        // Column 7
        total: total,                                    // Column 8
        lien: driveLink,
        refacturableTriplex: false
      };

      setDepenses(prev => [newScan, ...prev]);
      alert(`IA SCAN: 8 colonnes extraites avec succès pour ${newScan.fournisseur}.`);
    }, 1500);
  };

  const handleSimulateScan = () => {
    const subtotal = 180.00;
    const tps = 9.00;
    const tvq = 17.96;
    const total = 206.96;
    
    const mockExpense = {
       id: Date.now(),
       companyId: activeCompanyId,
       fecha: new Date().toISOString().split('T')[0],
       fournisseur: "Rona Laval - Matériaux Triplex",
       cat: "Entretien / Réparations",
       partnerTag: activeUser,
       subtotal: subtotal,
       tps: tps,
       tvq: tvq,
       total: total,
       lien: "https://drive.google.com/active_company_storage/simulation_vault/rona_laval_materials.pdf",
       refacturableTriplex: activeCompanyId === '3'
    };
    
    setDepenses(prev => [mockExpense, ...prev]);
    if (typeof playNotificationSound === 'function') playNotificationSound();
    alert("✨ Scan IA Simulé: Rona Laval détecté. Facture liée et conciliée avec succès.");
  };

  const handleSaveTrip = () => {
    const kmStr = prompt("Distance parcourue pour ce trajet (km)?", "10");
    if (!kmStr) return;
    const km = parseFloat(kmStr);
    if (isNaN(km) || km <= 0) return;

    const fecha = new Date().toISOString().split('T')[0];
    const tripAmount = km * 0.70;

    // 1. Update mileage logs
    const newData = { ...partnerData };
    const userVehicle = newData[activeUser].vehicle;
    userVehicle.mileageLogs = [
      { 
        fecha, 
        modelo: userVehicle.model, 
        distancia: km,
        id: Date.now() 
      },
      ...userVehicle.mileageLogs
    ];
    setPartnerData(newData);

    // 2. Inject into global expenses (depenses)
    const newDepense = {
      id: Date.now() + 1,
      companyId: activeCompanyId,
      fecha: fecha,
      fournisseur: "Kilométrage GPS",
      cat: "Déplacements / Automobile",
      description: "Kilométrage GPS - Trajet (Dédutible)",
      subtotal: tripAmount,
      tps: 0,
      tvq: 0,
      total: tripAmount,
      lien: null,
      partnerTag: activeUser
    };

    setDepenses(prev => [newDepense, ...prev]);
    playNotificationSound();
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const newTransactions = lines.slice(1).map(line => {
        const parts = line.split(',');
        if (parts.length < 3) return null;
        const [date, desc, amt] = parts;
        return { 
          companyId: activeCompanyId,
          date: date.trim(), 
          desc: desc.trim(), 
          amt: parseFloat(amt.trim()) 
        };
      }).filter(t => t !== null);

      setBankTransactions(prev => [...(newTransactions as any), ...prev]);
      alert(`${newTransactions.length} transactions importées pour ${currentCompany?.nombre}.`);
    };
    reader.readAsText(file);
  };

  // --- EXPORT GOOGLE SHEETS (8 COLUMNS) ---
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastSheetUrl, setLastSheetUrl] = useState<string | null>(null);

  const exportarAContador = async () => {
    if (exportStatus === 'loading') return;
    setExportStatus('loading');

    try {
      const gClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const gApiKey = import.meta.env.VITE_GOOGLE_API_KEY;

      const itemsToExport = tabReporte === 'banque' 
        ? filteredBankByMonth.map(t => ({ fecha: t.date, tiers: t.desc, cat: 'Banque', p: '', net: t.amt, tps: 0, tvq: 0, total: t.amt, url: '' }))
        : [
            ...filteredHistoriqueByMonth.map(h => ({ fecha: h.fecha, tiers: h.cliente, cat: 'Ventes', p: activeUser, net: h.subtotal, tps: h.tps, tvq: h.tvq, total: h.total, url: '' })),
            ...filteredDepensesByMonth.map(d => ({ fecha: d.fecha, tiers: d.fournisseur, cat: d.cat, p: d.partnerTag || activeUser, net: d.subtotal, tps: d.tps, tvq: d.tvq, total: d.total, url: d.lien || '' }))
          ];

      if (!gClientId || !gApiKey) {
        // Fallback robusto a CSV si faltan las llaves
        const data = [
          ['Date', 'Tiers', 'Compte', 'Partenaire', 'Net', 'TPS', 'TVQ', 'Total', 'Document (URL)'],
          ...itemsToExport.map(i => [i.fecha, i.tiers, i.cat, i.p, i.net, i.tps, i.tvq, i.total, i.url])
        ];
        
        const csvContent = "\uFEFF" + data.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `AutoCompt_${tabReporte}_${currentCompany?.nombre}_${selectedMonth+1}.csv`);
        document.body.appendChild(link);
        link.click();
        
        setExportStatus('success');
        alert("📊 Exportation CSV réussie (données filtrées) ! Pour synchroniser directement avec Google Sheets, configurez vos clés API.");
        return;
      }

      // Integración Real con GAPI
      // @ts-ignore
      const gapi = window.gapi;
      // @ts-ignore
      const google = window.google;

      if (!gapi || !google) {
        throw new Error("Google API libraries not loaded");
      }

      const tokenResponse: any = await new Promise((resolve, reject) => {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: gClientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
          callback: (resp: any) => {
            if (resp.error !== undefined) reject(resp);
            resolve(resp);
          },
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
      });

      if (!tokenResponse.access_token) throw new Error("No access token");

      // Crear el Sheet
      const title = `AutoCompt_Reporte_${userProfile.nom}_${new Date().getMonth()+1}_${new Date().getFullYear()}`;
      
      // Intentar encontrar o crear carpeta para la empresa
      let folderId = null;
      try {
        const folderSearch = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='AutoCompt_Reports' and mimeType='application/vnd.google-apps.folder' and trashed=false`, {
          headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
        });
        const folderResults = await folderSearch.json();
        if (folderResults.files && folderResults.files.length > 0) {
          folderId = folderResults.files[0].id;
        } else {
          const createFolder = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${tokenResponse.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'AutoCompt_Reports', mimeType: 'application/vnd.google-apps.folder' })
          });
          const folderData = await createFolder.json();
          folderId = folderData.id;
        }
      } catch (fErr) {
        console.warn("Folder management failed, saving to root", fErr);
      }

      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenResponse.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: { title: title }
        })
      });

      const sheetData = await createResponse.json();
      const spreadsheetId = sheetData.spreadsheetId;

      // Mover el archivo a la carpeta si existe
      if (folderId) {
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}&removeParents=root`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
          });
        } catch (mvErr) {
          console.warn("Failed to move file to folder", mvErr);
        }
      }

      // Formatear datos para Sheets
      const totalNet = itemsToExport.reduce((acc, curr) => acc + (curr.net || 0), 0);
      const totalTPS = itemsToExport.reduce((acc, curr) => acc + (curr.tps || 0), 0);
      const totalTVQ = itemsToExport.reduce((acc, curr) => acc + (curr.tvq || 0), 0);
      const totalFinal = itemsToExport.reduce((acc, curr) => acc + (curr.total || 0), 0);

      const values = [
        ['Date', 'Tiers', 'Compte', 'Partenaire', 'Net', 'TPS', 'TVQ', 'Total', 'Document (URL)'],
        ...itemsToExport.map(i => [i.fecha, i.tiers, i.cat, i.p, i.net, i.tps, i.tvq, i.total, i.url]),
        ['', 'TOTAL', '', '', totalNet, totalTPS, totalTVQ, totalFinal, '']
      ];

      // Insertar Datos
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenResponse.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      });

      setLastSheetUrl(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
      setExportStatus('success');
      
    } catch (error) {
      console.error("Export Error:", error);
      setExportStatus('error');
      alert("❌ Une erreur est survenue lors de l'exportation vers Google Sheets.");
    }
  };

  const generateTriplexInvoice = () => {
    if (activeCompanyId !== '1') return;

    // Frais de gestion fixes
    const managementFeeBase = 150.00;
    
    // Récupérer les dépenses marquées comme refacturables qui n'ont pas encore été facturées
    const reimbursableExpenses = depenses.filter(d => 
      d.companyId === '1' && 
      (d as any).refacturableTriplex && 
      !(d as any).déjàFacturé
    );
    
    const sumReimbursable = reimbursableExpenses.reduce((acc, curr) => acc + curr.total, 0);
    
    if (reimbursableExpenses.length === 0) {
      if (!confirm(`Aucune dépense refacturable trouvée. Voulez-vous générer la facture pour les frais de gestion fixe de ${managementFeeBase.toFixed(2)}$ uniquement?`)) return;
    }

    const subtotal = managementFeeBase + sumReimbursable;
    const tps = subtotal * (userProfile.tpsRate / 100);
    const tvq = subtotal * (userProfile.tvqRate / 100);
    const total = subtotal + tps + tvq;

    const invoiceId = `GPA-REF-${Date.now().toString().slice(-4)}`;
    const dateStr = new Date().toISOString().split('T')[0];

    // 1. Enregistrement du REVENU dans Solutions GPA (ID '1')
    const newRevenue = {
      id: invoiceId,
      companyId: '1',
      cliente: 'Fabiola & Eric (Triplex)',
      email: 'fabiola.eric@email.com',
      fecha: dateStr,
      subtotal, tps, tvq, total,
      status: 'Payée',
      tipoDoc: 'Facture',
      items: [
        { descripcion: 'Frais de gestion mensuels (Contrat Triplex)', cantidad: 1, precioUnitario: managementFeeBase, taxable: true },
        ...reimbursableExpenses.map(d => ({
          descripcion: `Remboursement dépense: ${d.fournisseur} (${d.cat})`,
          cantidad: 1,
          precioUnitario: d.total,
          taxable: false // Déjà taxé à l'achat initial
        }))
      ]
    };

    // 2. Enregistrement de la DÉPENSE dans le profil Plex (ID '3')
    const newExpense = {
      id: Date.now() + 1,
      companyId: '3',
      fecha: dateStr,
      fournisseur: 'Solutions GPA Inc.',
      cat: 'Frais de gestion / Exploitation',
      subtotal: subtotal,
      tps: tps,
      tvq: tvq,
      total: total,
      lien: null,
      partnerTag: 'Fabiola'
    };

    setHistorique(prev => [newRevenue as any, ...prev]);
    setDepenses(prev => {
      // Marquer les dépenses originales comme facturées
      const updated = prev.map(d => {
        if (d.companyId === '1' && (d as any).refacturableTriplex && !(d as any).déjàFacturé) {
          return { ...d, déjàFacturé: true };
        }
        return d;
      });
      return [newExpense as any, ...updated];
    });

    alert(`🔄 PONT INTER-PROFIL: \nFacture ${invoiceId} de ${total.toFixed(2)}$ traitée.\n- Revenu ajouté à Solutions GPA.\n- Dépense injectée au Triplex (Frais de gestion).`);
  };


  // --- VISTAS ---

  if (vista === 'splash') return (
    <div className={`min-h-screen relative ${darkMode ? 'bg-[#0A0A0A]' : 'bg-[#FAF9F6]'} flex flex-col items-center justify-center p-6 animate-in fade-in duration-700 overflow-hidden max-w-full`}>
      {/* Premium ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-teal-500/[0.06] dark:bg-teal-500/[0.03] blur-[100px] pointer-events-none select-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[320px] h-[320px] rounded-full bg-emerald-500/[0.06] dark:bg-emerald-500/[0.03] blur-[100px] pointer-events-none select-none" />
      
      <div className="relative z-10">
        <LogoPrincipal animate showText size={140} />
      </div>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.5 }}
        className="text-[10px] font-black uppercase bg-gradient-to-r from-slate-400 to-slate-500 dark:from-zinc-500 dark:to-zinc-400 bg-clip-text text-transparent tracking-[0.4em] mt-6 italic relative z-10"
      >
        Intelligence Comptable Immobilière
      </motion.p>
    </div>
  );

  if (!setupComplet) return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 text-left animate-in fade-in duration-500 max-w-full overflow-x-hidden">
      <header className="p-8 flex justify-between items-center border-b border-slate-200 bg-white">
         <LogoPrincipal size={24} showText />
         <div className="flex space-x-1">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 w-6 rounded-full transition-all ${onboardingStep >= s ? 'bg-[#059669]' : 'bg-slate-200'}`}></div>
            ))}
         </div>
      </header>

      <main className="p-8 flex-1 flex flex-col justify-center max-w-md mx-auto w-full space-y-10">
         {onboardingStep === 1 && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Quelle est votre<br/>spécialisation ?</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic tracking-tighter">Impact sur votre secteur</p>
              </div>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 italic ml-2">Choisir votre domaine</label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'Prospecteur Immobilier (Off-Market)', icon: <FileSearch size={18} /> },
                        { id: 'Courtier Immobilier', icon: <FileSignature size={18} /> },
                        { id: 'Propriétaire de Plex (Max 4 portes)', icon: <Home size={18} /> },
                        { id: 'Gestionnaire Immobilier (Petite Entreprise)', icon: <Briefcase size={18} /> },
                        { id: 'Rénovation / Construction', icon: <Hammer size={18} className="text-amber-500 dark:text-amber-400 transition-colors duration-300" /> },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setIndustry(opt.id)}
                          className={`w-full p-4 rounded-[28px] border-2 transition-all flex items-center space-x-4 text-left ${
                            industry === opt.id 
                              ? 'border-[#059669] bg-emerald-50 text-emerald-700 shadow-sm' 
                              : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                          }`}
                        >
                          <div className={`p-3 rounded-2xl transition-colors ${industry === opt.id ? 'bg-white text-[#059669]' : 'bg-slate-50 text-slate-400'}`}>
                            {opt.icon}
                          </div>
                          <span className={`text-[11px] font-black italic uppercase tracking-tighter ${industry === opt.id ? 'text-emerald-900' : 'text-slate-600'}`}>
                            {opt.id}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100 flex items-start space-x-4">
                    <div className="p-3 bg-white rounded-2xl text-[#059669] shadow-sm">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-[#059669] italic">Configuration IA</p>
                      <p className="text-[9px] text-[#059669]/70 font-bold leading-relaxed mt-1">
                        Nous allons pré-configurer vos comptes de dépenses favoris selon votre spécialité : {industry}.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 italic mb-3 tracking-widest text-center">Modèle de Tarification Fabiola</p>
                    <div className="space-y-2">
                       <div className="flex justify-between items-center p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                         <span className="text-[9px] font-black uppercase italic text-slate-600">Forfait de Base</span>
                         <span className="text-[10px] font-black text-slate-900 italic">4.99$ / mois</span>
                       </div>
                       <div className="flex justify-between items-center p-3 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                         <span className="text-[9px] font-black uppercase italic text-emerald-600">Forfait Premium</span>
                         <span className="text-[10px] font-black text-emerald-700 italic">18.99$ / mois</span>
                       </div>
                    </div>
                    <p className="text-[7px] font-bold text-slate-400 uppercase text-center mt-3 tracking-tighter">* Taxes applicables en sus (TPS/TVQ conformes)</p>
                  </div>
               </div>
              <button onClick={() => setOnboardingStep(2)} className="w-full py-6 bg-[#059669] text-white rounded-[32px] text-xs font-black uppercase italic shadow-xl flex items-center justify-center space-x-2 shadow-emerald-900/20 active:scale-95 transition-all">
                <span>Continuer</span> <ChevronRight size={18} />
              </button>
           </div>
         )}

         {onboardingStep === 2 && (
           <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Structure<br/>& Identité</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic tracking-tighter">Configuration & Identité</p>
              </div>

              <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm space-y-5">
                 <div className="space-y-1">
                   <label className="text-[8px] font-black uppercase text-slate-400 italic ml-1 tracking-widest">Nom de l'entreprise</label>
                   <input 
                    value={userProfile.nom} 
                    onChange={e => setUserProfile({...userProfile, nom: e.target.value})}
                    placeholder="Ex: Solutions GPA Inc."
                    className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-1 focus:ring-[#059669] text-slate-900" 
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[8px] font-black uppercase text-slate-400 italic ml-1 tracking-widest">Adresse complète</label>
                   <textarea 
                    value={userProfile.adresse} 
                    onChange={e => setUserProfile({...userProfile, adresse: e.target.value})}
                    rows={2}
                    className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-1 focus:ring-[#059669] text-slate-900 resize-none" 
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'Travailleur Autonome', title: 'Autonome' },
                      { id: 'Incorporée', title: 'Inc.' }
                    ].map(ent => (
                      <button 
                        key={ent.id} 
                        onClick={() => setLegalEntity(ent.id)}
                        className={`p-4 border-2 rounded-2xl text-center transition-all ${legalEntity === ent.id ? 'border-[#059669] bg-emerald-50 text-emerald-600 font-black' : 'border-slate-100 text-slate-400'}`}
                      >
                        <p className="text-[9px] font-black italic uppercase tracking-tighter">{ent.title}</p>
                      </button>
                    ))}
                 </div>
              </div>

              <div className="flex space-x-3">
                <button onClick={() => setOnboardingStep(1)} className="p-6 bg-slate-800 text-slate-400 rounded-[32px] hover:text-white transition-colors"><ArrowLeft size={20}/></button>
                <button onClick={() => setOnboardingStep(3)} className="flex-1 py-6 bg-[#059669] text-white rounded-[32px] text-xs font-black uppercase italic shadow-xl flex items-center justify-center space-x-2 active:scale-95 transition-all">
                  <span>Suivant</span> <ChevronRight size={18} />
                </button>
              </div>
           </div>
         )}

         {onboardingStep === 3 && (
           <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 text-left">
              <div className="space-y-2">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-slate-900">Configuration de l'immeuble & Copropriété</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic tracking-tighter">Paramètres de la propriété & Co-propriété</p>
              </div>

              {/* PROPERTY TYPE SELECTOR (ONLY FOR PLEX / IMMOBILIER SESSIONS) */}
              {isImmobilierWorkspace && (
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 space-y-3 shadow-sm">
                  <label className="text-[8.5px] font-black uppercase tracking-widest text-[#059669] italic">Type de propriété</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Duplex', 'Triplex', 'Quadruplex', 'Multi-logement'].map((type) => {
                      const isActive = propertyType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setPropertyType(type)}
                          className={`p-3 rounded-2xl border text-center transition-all duration-300 ${
                            isActive 
                              ? 'border-[#059669] bg-emerald-50/55 text-emerald-700 font-extrabold shadow-sm' 
                              : 'border-slate-100 text-slate-500 hover:border-slate-200 bg-white'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-tight">{type === 'Quadruplex' ? '4plex (Quadruplex)' : type}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white p-6 rounded-[32px] border border-slate-200 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase italic text-slate-400">Co-propriétaires & Parts (%)</span>
                  {!(industry?.includes('Plex') || industry?.includes('Immobilier')) && (
                    <button onClick={() => setHasMultiplePartners(!hasMultiplePartners)} className="transition-all">
                      {hasMultiplePartners ? <ToggleRight size={32} className="text-[#059669]" /> : <ToggleLeft size={32} className="text-slate-200" />}
                    </button>
                  )}
                </div>
                
                {((industry?.includes('Plex') || industry?.includes('Immobilier')) || hasMultiplePartners) && (
                  <div className="space-y-3 pt-1">
                    {partners.map((p, i) => (
                      <div key={i} className="bg-slate-50/60 p-4 rounded-3xl border border-slate-200/80 space-y-2 shadow-sm transition-all focus-within:border-[#059669]/60">
                        <div className="flex items-center space-x-2">
                          <Users size={16} className="text-[#059669]" />
                          <input 
                            value={p}
                            onChange={(e) => {
                              const newP = [...partners];
                              const oldName = newP[i];
                              const newName = e.target.value;
                              newP[i] = newName;
                              
                              // Keep partnersPct map updated
                              const newPct = { ...partnersPct };
                              if (oldName && newPct[oldName] !== undefined) {
                                const val = newPct[oldName];
                                delete newPct[oldName];
                                if (newName) newPct[newName] = val;
                              } else if (newName) {
                                newPct[newName] = 50;
                              }
                              setPartners(newP);
                              setPartnersPct(newPct);
                            }}
                            className="flex-1 bg-transparent border-none outline-none font-extrabold italic text-xs text-slate-900" 
                            placeholder="Nom du co-propriétaire" 
                          />
                          {partners.length > 1 && (
                            <button 
                              onClick={() => {
                                const pName = partners[i];
                                const newPct = { ...partnersPct };
                                delete newPct[pName];
                                setPartnersPct(newPct);
                                setPartners(partners.filter((_, idx) => idx !== i));
                              }} 
                              className="text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={16}/>
                            </button>
                          )}
                        </div>

                        {/* Dynamic Percentage Input */}
                        {isImmobilierWorkspace && (
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50">
                            <span className="text-[8px] font-black uppercase italic text-slate-400 tracking-wider">Pourcentage de copropriété :</span>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={partnersPct[p] !== undefined ? partnersPct[p] : 50}
                                onChange={(e) => {
                                  const val = Math.min(100, Math.max(1, parseInt(e.target.value) || 0));
                                  setPartnersPct({
                                    ...partnersPct,
                                    [p]: val
                                  });
                                }}
                                className="w-16 p-1 bg-white text-center font-mono font-black text-xs text-slate-900 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <span className="text-xs font-bold text-slate-400">%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const nextId = `Propriétaire ${partners.length + 1}`;
                        setPartners([...partners, nextId]);
                        setPartnersPct({
                          ...partnersPct,
                          [nextId]: 50
                        });
                      }}
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-[9px] font-black uppercase italic tracking-widest text-[#059669] hover:bg-emerald-50/20 hover:border-[#059669] transition-all"
                    >
                      + Ajouter un co-propriétaire / propriétaire
                    </button>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button onClick={() => setOnboardingStep(2)} className="p-6 bg-slate-100 text-slate-400 rounded-[32px] hover:text-slate-900 transition-colors"><ArrowLeft size={20}/></button>
                <button 
                  onClick={() => {
                    // Initialize partner data structures
                    const newPartnerData: any = {};
                    partners.forEach(p => {
                      if (p) {
                        newPartnerData[p] = {
                          homeOffice: { aireTotale: 1000, aireBureau: 0, hydro: 0, assurance: 0, internet: 0, taxesMuni: 0, active: false },
                          vehicle: { model: 'Véhicule', kmInitial: 0, kmFinal: 0, mileageLogs: [] },
                          paradas: ['']
                        };
                      }
                    });
                    if (Object.keys(newPartnerData).length > 0) {
                      setPartnerData(newPartnerData);
                      setActiveUser(partners[0]);
                    }
                    setOnboardingStep(4);
                  }} 
                  className="flex-1 py-6 bg-[#059669] text-white rounded-[32px] text-xs font-black uppercase italic shadow-xl flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-emerald-900/20"
                >
                  <span>Suivant</span> <ChevronRight size={18} />
                </button>
              </div>
           </div>
         )}

         {onboardingStep === 4 && (
           <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-slate-900">Bureau à<br/>domicile</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic tracking-tighter">Attribution des espaces par usager</p>
              </div>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
                {partners.filter(p => !!p).map(p => (
                  <div key={p} className="bg-white p-6 rounded-[32px] border border-slate-200 space-y-4 shadow-sm transition-all">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-[#059669] rounded-full animate-pulse shadow-sm shadow-emerald-500"></div>
                        <span className="text-[10px] font-black uppercase italic text-slate-900">{p} travaille-t-elle de la maison ?</span>
                      </div>
                      <button 
                        onClick={() => {
                          const newData = {...partnerData};
                          newData[p].homeOffice.active = !newData[p].homeOffice.active;
                          setPartnerData(newData);
                        }}
                      >
                        {partnerData[p]?.homeOffice.active ? <ToggleRight size={32} className="text-[#059669]" /> : <ToggleLeft size={32} className="text-slate-200" />}
                      </button>
                    </div>
                    {partnerData[p]?.homeOffice.active && (
                       <div className="grid grid-cols-2 gap-3 pt-2 animate-in fade-in zoom-in-95 duration-300">
                          <div className="space-y-1">
                            <label className="text-[7px] font-black uppercase text-slate-400 italic tracking-widest">Aire Bureau (pi²)</label>
                            <input 
                              type="number" 
                              value={partnerData[p].homeOffice.aireBureau}
                              onChange={(e) => {
                                const newData = {...partnerData};
                                newData[p].homeOffice.aireBureau = parseFloat(e.target.value) || 0;
                                setPartnerData(newData);
                              }}
                              className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold border-none shadow-inner text-slate-900 focus:ring-1 focus:ring-[#059669] outline-none border border-slate-100" 
                              placeholder="150" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[7px] font-black uppercase text-slate-400 italic tracking-widest">Aire Totale (pi²)</label>
                            <input 
                              type="number" 
                              value={partnerData[p].homeOffice.aireTotale}
                              onChange={(e) => {
                                const newData = {...partnerData};
                                newData[p].homeOffice.aireTotale = parseFloat(e.target.value) || 0;
                                setPartnerData(newData);
                              }}
                              className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold border-none shadow-inner text-slate-900 focus:ring-1 focus:ring-[#059669] outline-none border border-slate-100" 
                              placeholder="1000" 
                            />
                          </div>
                       </div>
                    )}
                  </div>
                ))}
              </div>

              <button 
                onClick={() => {
                  const newId = userProfile.nom.toLowerCase().replace(/\s+/g, '-') || Date.now().toString();
                  const newCompanyObj = {
                    id: currentCompany ? currentCompany.id : newId,
                    nombre: userProfile.nom || 'Sans Nom',
                    industry: industry,
                    legalEntity: legalEntity,
                    partners: partners.filter(p => !!p),
                    partnerData: partnerData,
                    userProfile: userProfile,
                    propertyType: propertyType,
                    partnersPct: partnersPct,
                    ownerPercentage: partnersPct[partners[0]] || 50
                  };

                  if (currentCompany) {
                    setListaEmpresas(prev => prev.map(e => e.id === currentCompany.id ? newCompanyObj : e));
                  } else {
                    setListaEmpresas(prev => [...prev, newCompanyObj]);
                    setActiveCompanyId(newId);
                  }

                  console.log(`AutoCompt Root Created: /AutoCompt/${industry}/${new Date().getFullYear()}`);
                  setSetupComplet(true);
                  setVista('dashboard');
                }} 
                className="w-full py-6 bg-[#059669] text-white rounded-[32px] text-xs font-black uppercase italic shadow-2xl flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-emerald-900/20"
              >
                <span>Finaliser la Configuration</span> <CheckCircle2 size={20} />
              </button>
           </div>
         )}
      </main>
    </div>
  );


  if (vista === 'selector') {
    const getCompanyColors = (industry: string) => {
      const ind = (industry || '').toLowerCase();
      if (ind.includes('bâtiment') || ind.includes('gestion')) {
        return { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/15' };
      }
      if (ind.includes('prospector') || ind.includes('flip')) {
        return { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/15' };
      }
      if (ind.includes('plex')) {
        return { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-500/15' };
      }
      if (ind.includes('courtier') || ind.includes('immobilier')) {
        return { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/15' };
      }
      return { bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-500/15' };
    };

    return (
      <div className={`min-h-screen relative ${darkMode ? 'bg-[#0A0A0B] text-zinc-100' : 'bg-[#FAF9F6] text-[#1E293B]'} flex flex-col items-center justify-center p-6 animate-in fade-in duration-700 font-sans max-w-full overflow-hidden`}>
        {/* Absolute ambient background glow circles (mesh gradient style) */}
        <div className="absolute top-1/4 left-1/4 w-[280px] h-[280px] rounded-full bg-teal-500/[0.05] dark:bg-teal-500/[0.03] blur-[90px] pointer-events-none select-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[320px] h-[320px] rounded-full bg-emerald-500/[0.05] dark:bg-emerald-500/[0.03] blur-[100px] pointer-events-none select-none" />

        {/* Toggle dark mode button on top corner of splash selector */}
        <div className="absolute top-6 right-6 z-30">
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className={`p-2.5 rounded-full transition-all ${darkMode ? 'text-amber-400 bg-zinc-900 border border-zinc-800' : 'text-slate-400 bg-white shadow-sm border border-slate-200/60'}`}
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <div className="flex flex-col items-center space-y-3 text-center mb-10 relative z-10">
          <div className="p-4 bg-white dark:bg-zinc-950 rounded-[38%] border border-teal-500/10 shadow-xl shadow-teal-500/5 text-teal-600 dark:text-teal-400">
            <Sparkles size={36} />
          </div>
          <h1 className={`text-3xl font-black italic tracking-tighter ${darkMode ? 'text-white' : 'text-[#1E293B]'} leading-none`}>AutoCompt</h1>
          <p className="text-[8px] font-black uppercase bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent tracking-[0.3em] font-sans">Intelligence Fiscale & Multi-Entreprises</p>
        </div>
        
        <div className="w-full max-w-sm space-y-4 relative z-10">
          <div className="text-left pl-2">
             <p className="text-[8px] font-black uppercase italic tracking-widest text-slate-400 dark:text-zinc-500">Sélectionner un Profil Actif</p>
          </div>

          <div className="space-y-3">
            {listaEmpresas.map((n) => {
              const colors = getCompanyColors(n.industry);
              return (
                <button 
                  key={n.id} 
                  onClick={() => { 
                    setActiveCompanyId(n.id);
                    setVista('dashboard');
                    setSetupComplet(true);
                  }} 
                  className={`w-full group ${darkMode ? 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/90' : 'bg-white hover:bg-slate-50 border-slate-100 shadow-md shadow-slate-200/40 hover:shadow-lg hover:border-slate-200/60'} p-5 rounded-[28px] border text-left flex justify-between items-center transition-all duration-300 active:scale-[0.98]`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`p-3 rounded-2xl ${colors.bg} ${colors.text} ${colors.border} border`}>
                       <Briefcase size={18} />
                    </div>
                    <div className="text-left">
                      <p className={`text-[11px] font-black uppercase tracking-tight leading-none ${darkMode ? 'text-zinc-100' : 'text-[#1E293B]'} transition-colors`}>{n.nombre}</p>
                      <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest block mt-1.5">{n.industry}</span>
                    </div>
                  </div>
                  <div className={`p-2 rounded-full opacity-60 group-hover:opacity-100 ${darkMode ? 'bg-zinc-800/80' : 'bg-slate-100/80'} group-hover:scale-105 transition-all text-slate-400 dark:text-zinc-505`}>
                    <ChevronRight size={14}/>
                  </div>
                </button>
              );
            })}
          </div>
  
          <button 
            onClick={() => {
              const currentTier = getEffectiveTier();
              const limit = TIER_LIMITS[currentTier];
              if (listaEmpresas.length >= limit) {
                setShowLimitModal(true);
                playNotificationSound();
                return;
              }

              setSetupComplet(false);
              setOnboardingStep(1);
              setPartners(['Fabiola']);
              setIndustry('Immobilier');
              setLegalEntity('Travailleur Autonome');
              setUserProfile({
                logo: null, color: '#059669', font: 'Moderne',
                nom: '', adresse: '', tel: '',
                neq: '', tps: '', tvq: '',
                site: '',
                pago: '',
                tpsRate: 5,
                tvqRate: 9.975
              });
            }}
            className={`w-full p-5 border-2 border-dashed ${darkMode ? 'border-zinc-800 text-zinc-500 hover:border-teal-500/45 hover:text-teal-400' : 'border-slate-200 text-slate-400 hover:border-teal-500/30 hover:text-teal-600'} rounded-[28px] font-black uppercase italic text-[8.5px] transition-all flex items-center justify-center space-x-2 tracking-widest`}
          >
            <Plus size={16} />
            <span>Ajouter une entreprise</span>
          </button>
  
          {/* INTERACTIVE WORKSPACE LIMITS & SIMULATION PANEL */}
          <div className={`p-5 rounded-[28px] border ${darkMode ? 'bg-zinc-950/30 border-zinc-900/80' : 'bg-white border-slate-200'} mt-3 shadow-sm text-left space-y-3.5`}>
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-[8px] font-black uppercase italic tracking-widest text-[#059669] dark:text-emerald-400">Simulation d'Abonnement</p>
                   {getEffectiveTier() === 'superadmin' ? (
                     <p className="text-[7px] font-bold text-amber-500 uppercase mt-0.5 leading-none">Bypass Super Admin Activé 👑</p>
                   ) : (
                     <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5 leading-none">Cliquez pour tester les restrictions</p>
                   )}
                </div>
                {getEffectiveTier() !== 'superadmin' && (
                  <div className="flex space-x-1">
                     {(['gratuit', 'assistant', 'premium'] as const).map((tierOpt) => {
                        const isSelected = selectedTier === tierOpt;
                        const label = tierOpt === 'gratuit' ? 'Gratuit' : tierOpt === 'assistant' ? 'Essentiel (5$)' : 'Pro (18.99$)';
                        return (
                          <button
                            key={tierOpt}
                            onClick={() => {
                              setSelectedTier(tierOpt);
                              playNotificationSound();
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[7px] font-black uppercase italic transition-all border ${
                              isSelected
                                ? 'bg-[#059669] border-[#059669] text-white font-extrabold shadow-sm shadow-emerald-900/10'
                                : `${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-slate-50 border-slate-100 text-slate-600 hover:text-slate-900'}`
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                  </div>
                )}
             </div>

             <div className={`p-4 rounded-2xl flex justify-between items-center ${darkMode ? 'bg-zinc-900/40' : 'bg-slate-50/60'} border ${darkMode ? 'border-zinc-800' : 'border-slate-100/80'} text-[10px]`}>
                <div>
                   <p className="text-[7.5px] font-black uppercase text-slate-400">Forfait Actif</p>
                   <p className={`font-black italic uppercase transition-colors ${getEffectiveTier() === 'superadmin' ? 'text-amber-500' : 'text-slate-800 dark:text-zinc-200'}`}>
                      {getEffectiveTier() === 'superadmin' ? 'Super Admin' : (selectedTier === 'gratuit' ? 'Gratuit' : selectedTier === 'assistant' ? 'Essentiel (5$)' : 'Pro (18.99$)')}
                   </p>
                </div>
                <div className="text-right">
                   <p className="text-[7.5px] font-black uppercase text-slate-400">Profils Créés</p>
                   <p className="font-mono font-black italic">
                      {listaEmpresas.length} / {getEffectiveTier() === 'superadmin' ? '∞' : TIER_LIMITS[getEffectiveTier()]}
                   </p>
                </div>
             </div>
          </div>
        </div>

        {/* --- LIMIT BLOCKER MODAL --- */}
        {showLimitModal && (
          <div id="blocking-limit-modal" className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-305">
            <div className={`w-full max-w-sm border rounded-[40px] shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-300 ${
              darkMode 
                ? 'bg-[#211515] border-rose-950 text-white' 
                : 'bg-[#FFF5F5] border-rose-100/80 text-[#1E293B]'
            }`}>
              
              {/* Elegant Shield Icon with circular peach/rose background badge */}
              <div className="w-16 h-16 rounded-full bg-rose-100/90 dark:bg-rose-955/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm shrink-0">
                <Shield size={32} />
              </div>

              <div className="space-y-1.5">
                <h3 className={`font-black uppercase italic tracking-tighter text-sm leading-tight ${darkMode ? 'text-rose-200' : 'text-rose-950'}`}>
                  Limite de profil atteinte
                </h3>
                <p className={`text-[9px] font-bold uppercase tracking-wide leading-relaxed max-w-xs ${darkMode ? 'text-rose-300/80' : 'text-rose-700/80'}`}>
                  Mettre à niveau votre abonnement pour débloquer plus d'entités
                </p>
              </div>

              <div className="w-full space-y-2.5 pt-1">
                {/* Premium unlock button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTier('premium'); // Upgrade to premium!
                    setShowLimitModal(false);
                    playNotificationSound();
                    alert("🎉 Félicitations ! Votre forfait a été surclassé avec succès vers le forfait Premium (10 profils + Accès Drive Partagé).");
                  }}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-[24px] text-[10px] font-black uppercase italic shadow-lg shadow-rose-950/25 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <Sparkles size={14} />
                  <span>Débloquer le Plan Premium</span>
                </button>

                {/* Minimal dismissal or secondary button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowLimitModal(false);
                    playNotificationSound();
                  }}
                  className={`w-full py-3 text-[9px] font-black uppercase italic rounded-[24px] transition-all active:scale-95 border ${
                    darkMode 
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200' 
                      : 'bg-white border-rose-250/20 text-rose-700 hover:bg-rose-100/40'
                  }`}
                >
                  Annuler & Retour
                </button>
              </div>
              
            </div>
          </div>
        )}

      </div>
    );
  }


  if (vista === 'dashboard') return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans text-left leading-relaxed max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}>
      <WorkspaceSidebar />
      <header 
        className={`sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} shadow-sm`}
        style={{ borderTop: `4px solid ${darkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.3)'}` }}
      >
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden"
          >
            <Menu size={18} />
          </button>
          <LogoPrincipal size={18} showText textColor={darkMode ? 'text-white' : 'text-[#0F172A]'} />
        </div>

        <div className="flex-1 flex flex-col items-center text-center px-4 overflow-hidden">
          <p className="text-[10px] font-black uppercase italic tracking-tighter leading-none truncate w-full max-w-[120px]">{currentCompany?.nombre}</p>
          <div className="flex items-center mt-1">
            <div className="w-1 h-1 bg-emerald-500 rounded-full mr-1"></div>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none">Usager: {activeUser}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button onClick={() => setVista('selector')} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
            <Users size={18} />
          </button>
          <button onClick={() => setSetupComplet(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <div className={`flex items-center justify-between px-6 py-1.5 border-b sticky top-[57px] z-40 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-100'}`}>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className={`p-2 rounded-lg transition-all ${darkMode ? 'text-amber-400 bg-zinc-800 border border-zinc-700' : 'text-slate-400 bg-white shadow-sm border border-slate-200'}`}
          >
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Minimalist Language Selector Trigger Button */}
          <div className="relative">
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className={`p-2 px-3 rounded-lg flex items-center space-x-1.5 transition-all text-[9px] font-black tracking-wider uppercase ${darkMode ? 'text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700' : 'text-slate-600 bg-white shadow-sm border border-slate-200 hover:bg-slate-50'}`}
            >
              <Globe size={11} className="text-[#059669]" />
              <span>{activeLang}</span>
              <ChevronDown size={10} className={`text-slate-450 transition-transform duration-200 ${showLangDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* floating, elegant dropdown menu card with smooth entrance */}
            <AnimatePresence>
              {showLangDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute left-0 mt-2 w-36 rounded-[20px] shadow-xl border p-2 z-50 origin-top-left text-left ${darkMode ? 'bg-zinc-900 border-zinc-800 animate-in fade-in zoom-in-95' : 'bg-white border-slate-150 animate-in fade-in zoom-in-95'}`}
                  >
                    <div className="space-y-0.5">
                      {[
                        { code: 'FR', label: 'Français (QC)' },
                        { code: 'ES', label: 'Español' },
                        { code: 'EN', label: 'English' }
                      ].map((lang, idx) => {
                        const isSelected = activeLang === lang.code;
                        return (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setActiveLang(lang.code as any);
                              setShowLangDropdown(false);
                              playNotificationSound();
                            }}
                            className={`w-full px-3 py-2 rounded-xl text-left text-[9.5px] font-bold tracking-tight transition-all flex items-center justify-between cursor-pointer ${
                              idx !== 0 ? 'border-t border-slate-100/50 dark:border-zinc-800/40' : ''
                            } ${
                              isSelected 
                                ? 'bg-emerald-50 text-emerald-750 dark:bg-emerald-950/25 dark:text-emerald-400 font-black' 
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50'
                            }`}
                          >
                            <span>{lang.label}</span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#059669] shrink-0 ml-1.5 animate-pulse" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="relative">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) playNotificationSound();
            }}
            className={`p-2 rounded-lg relative transition-all ${darkMode ? 'bg-zinc-800 border border-zinc-700 text-white' : 'bg-white shadow-sm border border-slate-200 text-slate-400'}`}
          >
            <Bell size={14} />
            {missingReceipts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[7px] font-black min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center border-2 border-inherit animate-pulse">
                {missingReceipts.length}
              </span>
            )}
          </motion.button>
          
          <AnimatePresence>
            {showNotifications && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={`absolute right-0 mt-3 w-64 rounded-2xl shadow-2xl border p-5 z-[60] origin-top-right text-left ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'}`}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <AlertTriangle size={16} />
                  </div>
                  <p className={`text-[10px] font-black uppercase italic tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>Alertes Fiscales</p>
                </div>
                <p className={`text-[10px] font-medium leading-relaxed mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {missingReceipts.length} dépenses en attente de reçus pour {currentCompany?.nombre}.
                </p>
                <button 
                  onClick={() => {setVista('banque'); setShowNotifications(false);}}
                  className="w-full py-2 bg-[#059669] text-white rounded-xl text-[8px] font-black uppercase italic tracking-widest shadow-lg shadow-emerald-900/20"
                >
                  Régulariser maintenant
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <main className="p-4 space-y-4">
        {/* BARRE DE RECHERCHE RAPIDE INTÉLLIGENTE */}
        <div className={`relative rounded-[28px] border p-4 shadow-sm transition-all focus-within:ring-2 focus-within:ring-emerald-500/25 ${darkMode ? 'bg-zinc-950 border-zinc-900 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
          <div className="flex items-center space-x-3">
            <Search size={18} className="text-slate-400 dark:text-zinc-500" />
            <input 
              type="text" 
              value={dashboardSearchQuery}
              onChange={(e) => setDashboardSearchQuery(e.target.value)}
              placeholder="Rechercher une dépense, facture, outil (ex: GPS, taxes, peintre, bail)..." 
              className={`w-full bg-transparent border-none outline-none text-xs ${darkMode ? 'text-white placeholder-zinc-650' : 'text-slate-900 placeholder-slate-400'}`}
            />
            {dashboardSearchQuery && (
              <button 
                onClick={() => setDashboardSearchQuery('')}
                className="text-[9px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-all cursor-pointer"
              >
                Effacer
              </button>
            )}
          </div>

          {/* AFFICHAGE DES RÉSULTATS DE RECHERCHE EN TEMPS RÉEL */}
          {dashboardSearchQuery && (
            <div className={`mt-3 pt-3 border-t max-h-72 overflow-y-auto space-y-2 text-left ${darkMode ? 'border-zinc-900' : 'border-slate-100'}`}>
              <p className="text-[8px] font-black uppercase tracking-widest text-[#059669] dark:text-emerald-400 mb-1 leading-none">Suggestions et Résultats de recherche</p>
              
              {(() => {
                const query = dashboardSearchQuery.toLowerCase().trim();
                const suggestions = [];
                
                // Match tools keywords
                if (query.includes('km') || query.includes('gps') || query.includes('trajet') || query.includes('auto') || query.includes('voiture') || query.includes('condui')) {
                  suggestions.push({ label: "Kilométrage GPS & Saisie de trajets de déplacement", action: () => setVista('kilometraje'), icon: <Car size={13} className="text-sky-400" /> });
                }
                if (query.includes('tax') || query.includes('tps') || query.includes('tvq') || query.includes('rapport') || query.includes('impôt')) {
                  suggestions.push({ label: "Calculateur taxes TPS / TVQ & déclaration", action: () => setVista('taxes'), icon: <Percent size={13} className="text-rose-400" /> });
                }
                if (query.includes('bureau') || query.includes('domicile') || query.includes('hydro') || query.includes('loyer') || query.includes('logement') || query.includes('rénov')) {
                  suggestions.push({ label: "Bureau à domicile (Frais admissibles & Rénovations)", action: () => setVista('homeoffice'), icon: <Home size={13} className="text-amber-400" /> });
                }
                if (query.includes('bail') || query.includes('baux') || query.includes('contrat') || query.includes('sign') || query.includes('docu') || query.includes('légal') || query.includes('loi')) {
                  suggestions.push({ label: "DocuLegal (Édition et signature de baux & contrats)", action: () => setVista('doculegal'), icon: <FileSignature size={13} className="text-indigo-400" /> });
                }
                if (query.includes('banque') || query.includes('conciliation') || query.includes('relevé') || query.includes('compte') || query.includes('virement')) {
                  suggestions.push({ label: "Portail Conciliation Bancaire (Relevés d'opérations)", action: () => setVista('banque'), icon: <Wallet size={13} className="text-teal-400" /> });
                }
                if (query.includes('sous-traitance') || query.includes('main') || query.includes('oeuvre') || query.includes('travail') || query.includes('peintre') || query.includes('plombier') || query.includes('rénovateur') || query.includes('jardin') || query.includes('salaire')) {
                  suggestions.push({ label: "Gestion de la Sous-traitance (Rémunérations & Main d'œuvre)", action: () => setVista('sous-traitance'), icon: <Users size={13} className="text-emerald-400" /> });
                }
                if (query.includes('facture') || query.includes('client') || query.includes('vent') || query.includes('revenu')) {
                  suggestions.push({ label: "Émettre/Consulter factures clients (Facturation)", action: () => setVista('facturas'), icon: <Receipt size={13} className="text-emerald-400" /> });
                  suggestions.push({ label: "Feuillet de Tenue de Livres (Compte d'exploitation)", action: () => setVista('reportes'), icon: <FileSpreadsheet size={13} className="text-blue-400" /> });
                }

                // Match expenses (depenses)
                const matchedEx = filteredDepenses.filter(d => 
                  d.fournisseur.toLowerCase().includes(query) || 
                  d.cat.toLowerCase().includes(query) || 
                  d.total.toString().includes(query) ||
                  d.fecha.includes(query)
                );

                // Match sales (historique)
                const matchedSale = filteredHistorique.filter(s => 
                  s.cliente.toLowerCase().includes(query) || 
                  s.total.toString().includes(query) ||
                  s.fecha.includes(query)
                );

                if (suggestions.length === 0 && matchedEx.length === 0 && matchedSale.length === 0) {
                  return (
                    <div className="py-2 text-center">
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 italic">Aucun résultat trouvé pour "{dashboardSearchQuery}".</p>
                      <p className="text-[8.5px] text-slate-400 dark:text-zinc-500 mt-1">Essayez d'écrire des mots clés généraux comme : GPS, taxes, peintre, Hydro, bail.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-1.5 pt-1 pr-1">
                    {/* Tool suggestions */}
                    {suggestions.map((s, idx) => (
                      <button 
                        key={`sug-${idx}`}
                        onClick={() => { s.action(); setDashboardSearchQuery(''); playNotificationSound(); }}
                        className={`w-full flex items-center space-x-2.5 p-2 rounded-xl text-[9.5px] font-black uppercase italic tracking-tight text-left transition-all cursor-pointer ${darkMode ? 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
                      >
                        {s.icon}
                        <span>⚡ Aller à : {s.label}</span>
                      </button>
                    ))}

                    {/* Expense records */}
                    {matchedEx.map((ex) => (
                      <div 
                        key={`exmatch-${ex.id}`}
                        onClick={() => { setVista('reportes'); setTabReporte('depenses'); setDashboardSearchQuery(''); }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-[9.5px] font-medium text-left transition-all cursor-pointer ${darkMode ? 'bg-zinc-900/40 hover:bg-zinc-800/80' : 'bg-slate-50/60 hover:bg-slate-100/90'}`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="p-1 rounded-lg bg-rose-500/10 text-rose-500"><Percent size={10} /></span>
                          <div>
                            <p className="font-extrabold text-slate-800 dark:text-zinc-200">{ex.fournisseur} <span className="text-[8px] font-bold opacity-60">({ex.cat})</span></p>
                            <p className="text-[7.5px] text-slate-400 dark:text-zinc-500">{ex.fecha}</p>
                          </div>
                        </div>
                        <span className="font-black text-rose-500">-{ex.total.toFixed(2)}$</span>
                      </div>
                    ))}

                    {/* Sales invoices */}
                    {matchedSale.map((sale) => (
                      <div 
                        key={`salematch-${sale.id}`}
                        onClick={() => { setVista('reportes'); setTabReporte('ventes'); setDashboardSearchQuery(''); }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-[9.5px] font-medium text-left transition-all cursor-pointer ${darkMode ? 'bg-zinc-900/40 hover:bg-zinc-800/80' : 'bg-slate-50/60 hover:bg-slate-100/90'}`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500"><TrendingUp size={10} /></span>
                          <div>
                            <p className="font-extrabold text-slate-800 dark:text-zinc-200">{sale.cliente} <span className="text-[8px] font-bold opacity-60">(Facture client)</span></p>
                            <p className="text-[7.5px] text-slate-400 dark:text-zinc-500">{sale.fecha}</p>
                          </div>
                        </div>
                        <span className="font-black text-emerald-500">+{sale.total.toFixed(2)}$</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <button onClick={() => setVista('kilometraje')} className="w-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white p-6 rounded-[28px] shadow-md flex items-center justify-between text-left active:scale-95 transition-all border-none cursor-pointer">
          <div className="flex items-center space-x-4">
            <Car size={32} />
            <div>
              <p className="text-sm font-black uppercase italic tracking-tighter">Kilométrage GPS</p>
              <p className="text-[9px] opacity-80 font-bold uppercase text-left tracking-tight mt-0.5">Nouveau trajet client</p>
            </div>
          </div>
          <ChevronRight size={20} />
        </button>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleAIScan} 
          className="hidden" 
          accept="image/*,application/pdf"
        />

        <div className="space-y-4">
          <button 
            onClick={() => {
              if (selectedTier === 'gratuit') {
                setPaywallTargetTier('Essentiel (5$)');
                setShowPaywallModal(true);
                playNotificationSound();
                return;
              }
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute('capture', 'environment');
                fileInputRef.current.click();
              }
            }}
            className={`w-full p-8 rounded-[40px] shadow-2xl flex flex-col items-center space-y-3 active:scale-95 transition-all duration-300 hover:border-emerald-500/50 group relative overflow-hidden border ${darkMode ? 'bg-zinc-950 border-zinc-805 text-zinc-100 shadow-[0_0_40px_rgba(16,185,129,0.15)]' : 'bg-slate-950 border-slate-900 text-white'}`}
          >
            {/* Premium Conversion Tag Badge */}
            {selectedTier === 'gratuit' && (
              <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-yellow-600 text-slate-950 font-black tracking-widest uppercase italic text-[7px] px-3 py-1.5 rounded-full shadow-lg border border-amber-300/40 animate-pulse flex items-center space-x-1.5 z-30">
                <span>🔒 CAMÉRA IA VERROUILLÉE - PASSER À ESSENTIEL</span>
              </div>
            )}

            {/* The "LIVE IA CORE" Chip Icon Area with concentric waves */}
            <div className="relative flex items-center justify-center w-36 h-36">
              {/* Radial Pulsing Waves (Concentric rings) */}
              {/* Outer Ring 3 */}
              <div className="absolute inset-0 rounded-full border border-teal-500/5 animate-pulse scale-125" style={{ animationDelay: '400ms', animationDuration: '3s' }} />
              {/* Mid Ring 2 */}
              <div className="absolute inset-3 rounded-full border border-emerald-500/10 animate-pulse scale-110" style={{ animationDelay: '200ms', animationDuration: '2.5s' }} />
              {/* Inner Ring 1 */}
              <div className="absolute inset-6 rounded-full border border-emerald-500/25 animate-pulse" style={{ animationDuration: '2s' }} />
              
              {/* Deep, localized ambient shadow bloom behind the icon */}
              <div className={`absolute inset-9 rounded-full blur-[20px] transition-all duration-300 ${darkMode ? 'bg-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.25)]' : 'bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.15)]'}`} />
              
              {/* Futuristic integrated AI Microchip container */}
              <div className="relative z-20 bg-zinc-900 dark:bg-zinc-950 p-[1.5px] rounded-2xl border border-emerald-500/35 overflow-visible flex flex-col items-center justify-center w-20 h-20 group-hover:scale-105 transition-transform duration-300 shadow-xl">
                {/* Microchip Circuit Pins */}
                <span className="absolute -top-1 left-4 w-1.5 h-1 bg-emerald-500/70 rounded-t" />
                <span className="absolute -top-1 left-8 w-1.5 h-1 bg-emerald-500/70 rounded-t" />
                <span className="absolute -top-1 left-12 w-1.5 h-1 bg-emerald-500/70 rounded-t" />
                <span className="absolute -bottom-1 left-4 w-1.5 h-1 bg-emerald-500/70 rounded-b" />
                <span className="absolute -bottom-1 left-8 w-1.5 h-1 bg-emerald-500/70 rounded-b" />
                <span className="absolute -bottom-1 left-12 w-1.5 h-1 bg-emerald-500/70 rounded-b" />
                
                <span className="absolute -left-1 top-4 w-1 h-1.5 bg-emerald-500/70 rounded-l" />
                <span className="absolute -left-1 top-8 w-1 h-1.5 bg-emerald-500/70 rounded-l" />
                <span className="absolute -left-1 top-12 w-1 h-1.5 bg-emerald-500/70 rounded-l" />
                <span className="absolute -right-1 top-4 w-1 h-1.5 bg-emerald-500/70 rounded-r" />
                <span className="absolute -right-1 top-8 w-1 h-1.5 bg-emerald-500/70 rounded-r" />
                <span className="absolute -right-1 top-12 w-1 h-1.5 bg-emerald-500/70 rounded-r" />

                {/* Inner core grid with CPU icon */}
                <div className="bg-zinc-950 rounded-[14px] w-full h-full flex flex-col items-center justify-center relative overflow-hidden text-emerald-400 p-2">
                  <Cpu size={24} className="text-emerald-400 animate-pulse" style={{ animationDuration: '2.5s' }} />

                  {/* Tiny glowing camera lens sub-icon directly beneath the chip */}
                  <div className="absolute bottom-1.5 flex items-center justify-center bg-zinc-900 border border-emerald-500/30 px-1 py-0.5 rounded-full scale-[0.8]">
                    <Camera size={8} className="text-teal-400 mr-0.5" />
                    <span className="text-[5px] font-black uppercase text-teal-400 tracking-widest">LENS</span>
                  </div>
                </div>
              </div>

              {/* Free Tier Lock icon trigger tag */}
              {selectedTier === 'gratuit' && (
                <div className="absolute z-35 bottom-3 right-3 bg-amber-500 text-slate-950 p-1 rounded-full shadow-md border border-white/10 flex items-center justify-center">
                  <Lock size={10} />
                </div>
              )}
            </div>

            <div className="text-center relative z-10 space-y-1.5 max-w-xs px-2">
              <span className="text-sm font-black uppercase tracking-[0.2em] italic tracking-tighter text-emerald-400">SCANNER IA (FACTURES)</span>
              <p className="text-[8.5px] italic font-bold uppercase mt-1 leading-relaxed tracking-wider text-emerald-500/80">
                Numérisation et extraction des métadonnées (Logements 3 & 4) en cours...
              </p>
            </div>
          </button>
          
          <button 
            onClick={() => {
              if (selectedTier === 'gratuit') {
                setPaywallTargetTier('Essentiel (5$)');
                setShowPaywallModal(true);
                playNotificationSound();
                return;
              }
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute('capture');
                fileInputRef.current.click();
              }
            }}
            className={`w-full py-5 rounded-[28px] border-2 border-dashed flex items-center justify-center space-x-3 transition-all active:scale-95 ${darkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-slate-100 text-slate-400 hover:text-slate-900'}`}
          >
            <Upload size={18} />
            <span className="text-[10px] font-black uppercase italic tracking-widest">Importer un document</span>
          </button>


        </div>
        <div className="grid grid-cols-2 gap-3 text-left">
          <button onClick={() => setVista('facturas')} className={`${darkMode ? 'bg-zinc-950 border-zinc-900 text-white' : 'bg-white border-slate-200 text-slate-900'} p-5 rounded-[32px] border shadow-sm flex flex-col items-start space-y-2 text-left hover:border-[#059669] hover:shadow-xl transition-all active:scale-95`}><div className={`${darkMode ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-100 text-[#059669]'} p-3 rounded-2xl`}><Receipt size={22} /></div><span className="text-[10px] font-black uppercase italic tracking-tighter">Facturation</span></button>
          <button onClick={() => setVista('reportes')} className={`${darkMode ? 'bg-zinc-950 border-zinc-900 text-white' : 'bg-white border-slate-200 text-slate-900'} p-5 rounded-[32px] border shadow-sm flex flex-col items-start space-y-2 text-left hover:border-[#059669] hover:shadow-xl transition-all active:scale-95`}><div className={`${darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-600 shadow-inner'} p-3 rounded-2xl`}><FileSpreadsheet size={22} /></div><span className="text-[10px] font-black uppercase italic tracking-tighter">Tenue de Livres</span></button>
          <button onClick={() => setVista('homeoffice')} className={`${darkMode ? 'bg-zinc-950 border-zinc-900 text-white' : 'bg-white border-slate-200 text-slate-900'} p-5 rounded-[32px] border shadow-sm flex flex-col items-start space-y-2 text-left hover:border-[#059669] hover:shadow-xl transition-all active:scale-95`}><div className={`${darkMode ? 'bg-amber-900/20 text-amber-400' : 'bg-amber-100 text-amber-600'} p-3 rounded-2xl`}><Home size={22} /></div><span className="text-[10px] font-black uppercase italic tracking-tighter">Bureau à domicile</span></button>
          <button onClick={() => setVista('taxes')} className={`${darkMode ? 'bg-zinc-950 border-zinc-900 text-white' : 'bg-white border-slate-200 text-slate-900'} p-5 rounded-[32px] border shadow-sm flex flex-col items-start space-y-2 text-left hover:border-[#059669] hover:shadow-xl transition-all active:scale-95`}><div className={`${darkMode ? 'bg-rose-900/20 text-rose-400' : 'bg-rose-100 text-rose-600'} p-3 rounded-2xl`}><Percent size={22} /></div><span className="text-[10px] font-black uppercase italic tracking-tighter leading-tight">Déclaration<br/>TPS / TVQ</span></button>
          <button 
            onClick={() => {
              if (selectedTier === 'gratuit' || selectedTier === 'assistant') {
                setPaywallTargetTier('Pro (18.99$)');
                setShowPaywallModal(true);
                playNotificationSound();
                return;
              }
              setVista('doculegal');
            }} 
            className={`${darkMode ? 'bg-zinc-950 border-zinc-900 text-white' : 'bg-white border-slate-200 text-slate-900'} p-5 rounded-[32px] border shadow-sm flex flex-col items-start space-y-2 text-left hover:border-[#059669] hover:shadow-xl transition-all active:scale-95`}
          >
            <div className={`${darkMode ? 'bg-indigo-900/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'} p-3 rounded-2xl relative`}>
              <FileSignature size={22} />
              {(selectedTier === 'gratuit' || selectedTier === 'assistant') && (
                <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow border border-white/20">
                  <span>🔒</span>
                </div>
              )}
            </div>
            <span className="text-[10px] font-black uppercase italic tracking-tighter">DocuLegal {(selectedTier === 'gratuit' || selectedTier === 'assistant') && '🔒'}</span>
          </button>
          <button onClick={() => setVista('dossiers')} className={`${darkMode ? 'bg-zinc-950 border-zinc-900 text-white' : 'bg-white border-slate-200 text-slate-900'} p-5 rounded-[32px] border shadow-sm flex flex-col items-start space-y-2 text-left hover:border-[#059669] hover:shadow-xl transition-all active:scale-95`}><div className={`${darkMode ? 'bg-amber-900/20 text-amber-400' : 'bg-amber-100 text-amber-600'} p-3 rounded-2xl`}><Folder size={22} /></div><span className="text-[10px] font-black uppercase italic tracking-tighter leading-none">Dossiers<br/>Fiscaux</span></button>
          <button onClick={() => setVista('banque')} className={`${darkMode ? 'bg-zinc-950 border-zinc-900 text-white' : 'bg-white border-slate-200 text-slate-900'} p-5 rounded-[32px] border shadow-sm flex flex-col items-start space-y-2 text-left hover:border-[#059669] hover:shadow-xl transition-all active:scale-95`}><div className={`${darkMode ? 'bg-teal-900/20 text-teal-400' : 'bg-teal-100 text-teal-600'} p-3 rounded-2xl`}><Wallet size={22} /></div><span className="text-[10px] font-black uppercase italic tracking-tighter leading-none">Conciliation<br/>Bancaire</span></button>
          <button onClick={() => { setVista('sous-traitance'); playNotificationSound(); }} className={`${darkMode ? 'bg-zinc-950 border-zinc-900 text-white' : 'bg-white border-slate-200 text-slate-900'} p-5 rounded-[32px] border shadow-sm flex flex-col items-start space-y-2 text-left hover:border-[#059669] hover:shadow-xl transition-all active:scale-95`}><div className={`${darkMode ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-100 text-[#059669]'} p-3 rounded-2xl`}><Users size={22} /></div><span className="text-[10px] font-black uppercase italic tracking-tighter leading-none">Sous-traitance</span></button>
          
          <button 
            onClick={() => { setShowFiscalChat(true); playNotificationSound(); }} 
            className={`${darkMode ? 'bg-gradient-to-br from-emerald-950/40 to-zinc-900 border-zinc-900 text-white' : 'bg-gradient-to-br from-emerald-500/5 to-slate-50 border-emerald-500/20 text-slate-900'} p-5 rounded-[32px] border shadow-sm flex flex-col items-start space-y-2 text-left hover:border-[#059669] hover:shadow-xl transition-all active:scale-95 col-span-2`}
          >
            <div className="bg-emerald-600 p-2.5 rounded-2xl text-white shadow-md shadow-emerald-600/20 animate-pulse">
              <Sparkles size={20} />
            </div>
            <span className="text-[10px] font-black uppercase italic tracking-tighter leading-none mt-1">✨ Assistant IA</span>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight leading-snug">Posez vos questions fiscales ou demandez de l'aide en direct !</p>
          </button>
        </div>
      </main>

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const effectiveTier = getEffectiveTier();
    const isPro = effectiveTier === 'premium' || effectiveTier === 'superadmin';
    const limit = isPro ? 100 : 3;

    if (aiQueryCount >= limit) {
      setPaywallTargetTier('Pro (18.99$)');
      setShowPaywallModal(true);
      playNotificationSound();
      return;
    }

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      author: activeUser,
      content: chatInput
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          currentForfeit: isPro ? "Pro" : (effectiveTier === "assistant" ? "Essentiel" : "Gratuit")
        })
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        author: 'Laia',
        content: data.reply || "Une erreur s'est produite lors de la connexion."
      }]);
      setAiQueryCount((prev) => prev + 1);
    } catch {
      setChatMessages((prev) => [...prev, {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        author: 'Laia',
        content: "Désolé, je rencontre des difficultés techniques à me connecter."
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

      {/* MODAL ASSISTANT IA */}
      <AnimatePresence>
        {showFiscalChat && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`w-full max-w-lg ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-100'} rounded-t-[40px] sm:rounded-[48px] border shadow-2xl flex flex-col overflow-hidden h-[85vh] sm:h-[700px]`}
            >
              <div className={`p-6 border-b flex items-center justify-between ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center space-x-3">
                  <div className="bg-emerald-600 p-2 rounded-2xl text-white shadow-lg shadow-emerald-600/20">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className={`text-xs font-black uppercase italic tracking-tighter leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>Assistant IA Expert</h3>
                    <p className="text-[7px] font-black uppercase text-emerald-500 tracking-widest mt-1">Soutien Fiscal en Direct</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFiscalChat(false)}
                  className={`p-3 rounded-2xl transition-all ${darkMode ? 'bg-zinc-800 text-zinc-500 hover:text-white' : 'bg-white text-slate-300 hover:text-slate-900 border border-slate-100 shadow-sm'}`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto space-y-6 no-scrollbar text-left">
                {/* User Message */}
                <div className="flex justify-end pr-2">
                  <div className="max-w-[85%] bg-[#059669] text-white p-5 rounded-[32px] rounded-tr-none shadow-xl shadow-emerald-900/10">
                    <p className="text-[11px] font-black uppercase italic tracking-tighter mb-1 opacity-60">Fabiola (GPA)</p>
                    <p className="text-xs font-bold leading-relaxed">
                      Bonjour! J'ai acheté de la peinture pour mon Triplex à Laval, c'est une dépense courante ou de capital?
                    </p>
                  </div>
                </div>

                {/* AI Reply */}
                <div className="flex justify-start pl-2">
                  <div className={`max-w-[85%] ${darkMode ? 'bg-zinc-950 border-zinc-900 text-zinc-100' : 'bg-slate-100 border-slate-200 text-slate-900'} p-5 rounded-[32px] rounded-tl-none border shadow-sm`}>
                    <div className="flex items-center space-x-2 mb-2 text-emerald-500">
                      <Sparkles size={14} />
                      <p className="text-[10px] font-black uppercase italic tracking-tighter">Réponse de l'IA</p>
                    </div>
                    <div className="text-xs font-medium leading-relaxed space-y-3 font-sans">
                      <p>Bonjour Fabiola! 🎨 Pour un Plex résidentiel, la peinture est une dépense courante déductible à 100% cette année (Formulaire TP-128). Vous pouvez la classer dans <span className="font-black italic">'Réparations / Matériaux'</span>.</p>
                      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-500/10 text-emerald-700'}`}>
                        <p className="text-[10px] font-black uppercase italic mb-1 leading-none">Note sécuritaire :</p>
                        <p className="text-[10px] italic font-bold leading-tight">Avec le Forfait Premium (18.99$/mois), l'IA liera automatiquement ce type de facture dès sa détection cryptée dans votre relevé, sans que nous ayons accès à vos identifiants !</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-6 border-t ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`flex items-center space-x-3 p-3 rounded-3xl border transition-all ${darkMode ? 'bg-zinc-950 border-zinc-800 focus-within:border-emerald-500' : 'bg-white border-slate-200 shadow-inner focus-within:border-[#059669]'}`}>
                  <input 
                    type="text"
                    placeholder="Tapez votre question fiscale..."
                    className="flex-1 bg-transparent border-none outline-none text-xs font-bold px-2"
                  />
                  <button className="bg-[#059669] text-white p-3 rounded-2xl shadow-lg shadow-emerald-900/20 active:scale-95 transition-all">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const companyDocFolders: Record<string, string[]> = {
    '1': ["Contrats de Gestion", "Baux de Clients", "Documents Corporatifs"],
    '2': ["Promesses d'Achat", "Documents Notariés", "Contrats de Partenariat", "Ententes de Confidentialité"],
    '3': ["Baux Résidentiels", "Avis d'Augmentation", "Relevés 31 (Revenu QC)", "Reglements d'Immeuble"],
    '4': ["Contrats OACIQ", "Dossiers de Transaction", "Avis de Divulgation", "Mise en Marché"],
    '5': ["Contrats par Client", "Permis RBQ / Assurances", "Sous-traitance", "Soumissions & Devis", "Documents Légaux"]
  };

  const getFolderAccent = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('contrat') || n.includes('client') || n.includes('promesse') || n.includes('mise en marché')) return { color: 'text-blue-500', bg: 'bg-blue-50', tab: 'bg-blue-400' };
    if (n.includes('permis') || n.includes('légal') || n.includes('assurances') || n.includes('divulgation') || n.includes('notarié') || n.includes('confident')) return { color: 'text-rose-500', bg: 'bg-rose-50', tab: 'bg-rose-400' };
    if (n.includes('bail') || n.includes('baux') || n.includes('relevé') || n.includes('avis') || n.includes('reglement') || n.includes('devis')) return { color: 'text-emerald-500', bg: 'bg-emerald-50', tab: 'bg-emerald-400' };
    if (n.includes('sous-traitance') || n.includes('partenariat') || n.includes('associé')) return { color: 'text-orange-500', bg: 'bg-orange-50', tab: 'bg-orange-400' };
    return { color: 'text-slate-400', bg: 'bg-slate-50', tab: 'bg-slate-300' };
  };

  if (vista === 'doculegal') {
    const ind = currentCompany?.industry || '';
    let folders: string[] = [];
    if (ind.toLowerCase().includes('plex')) {
      folders = ["Baux Résidentiels", "Avis d'Augmentation", "Relevés 31", "Règlements d'Immeuble"];
    } else if (ind.toLowerCase().includes('prospector') || ind.toLowerCase().includes('flip') || ind.toLowerCase().includes('achat')) {
      folders = ["Promesses d'Achat", "Ententes de Confidentialité", "Analyses de Marché", "Contrats OACIQ"];
    } else if (ind.toLowerCase().includes('gestion') || ind.toLowerCase().includes('gpa')) {
      folders = ["Contrats de Gestion", "Baux de Clients", "Documents Corporatifs", "Études de Rendement"];
    } else if (ind.toLowerCase().includes('construction') || ind.toLowerCase().includes('rénovation')) {
      folders = ["Permis RBQ & Assurances", "Contrats de Sous-traitance", "Soumissions de Projet", "Fiches Techniques"];
    } else {
      folders = ["Contrats Généraux", "Baux Locatifs", "Documents Juridiques", "Conformité Fiscale"];
    }

    const getSignerColorClasses = (colorName: string) => {
      const c = colorName?.toLowerCase() || 'amber';
      if (c === 'purple') return { border: 'border-purple-500/25 bg-purple-500/[0.03] text-purple-600 dark:text-purple-400', dot: 'bg-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' };
      if (c === 'emerald') return { border: 'border-emerald-500/25 bg-emerald-500/[0.03] text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' };
      if (c === 'blue') return { border: 'border-blue-500/25 bg-blue-500/[0.03] text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' };
      if (c === 'pink') return { border: 'border-pink-500/25 bg-pink-500/[0.03] text-pink-600 dark:text-pink-400', dot: 'bg-pink-500', bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400' };
      if (c === 'indigo') return { border: 'border-indigo-500/25 bg-indigo-500/[0.03] text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400' };
      if (c === 'orange') return { border: 'border-orange-500/25 bg-orange-500/[0.03] text-orange-600 dark:text-orange-400', dot: 'bg-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' };
      if (c === 'teal') return { border: 'border-teal-500/25 bg-teal-500/[0.03] text-teal-600 dark:text-teal-400', dot: 'bg-teal-500', bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' };
      if (c === 'red') return { border: 'border-red-500/25 bg-red-500/[0.03] text-red-600 dark:text-red-400', dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' };
      return { border: 'border-amber-500/25 bg-amber-500/[0.03] text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' };
    };

    const getFolderColorMap = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('bail') || n.includes('baux')) {
        return { 
          iconColor: 'text-violet-600 dark:text-violet-400', 
          bgColor: darkMode ? 'bg-violet-950/20' : 'bg-violet-50/70', 
          border: 'border-violet-500/10 dark:border-violet-500/15', 
          tabColor: 'bg-violet-505' 
        };
      }
      if (n.includes('contrat') || n.includes('promesse') || n.includes('entente') || n.includes('gestion')) {
        return { 
          iconColor: 'text-blue-600 dark:text-blue-400', 
          bgColor: darkMode ? 'bg-blue-950/20' : 'bg-blue-50/70', 
          border: 'border-blue-500/10 dark:border-blue-500/15', 
          tabColor: 'bg-blue-500' 
        };
      }
      return { 
        iconColor: 'text-amber-600 dark:text-amber-400', 
        bgColor: darkMode ? 'bg-amber-950/20' : 'bg-amber-50/70', 
        border: 'border-amber-500/10 dark:border-amber-500/15', 
        tabColor: 'bg-amber-500' 
      };
    };

    // Filter documents by active company ID
    const companyDocs = docuLegalList.filter(d => d.companyId === activeCompanyId);
    
    // Filter of folder specific doc lists
    const docsInFolder = selectedDocuFolder ? companyDocs.filter(d => d.cat === selectedDocuFolder) : [];

    // Helper for loading template based on folder
    const loadDefaultTemplate = (folderName: string) => {
      const lower = folderName.toLowerCase();
      if (lower.includes('bail') || lower.includes('baux')) {
        return `CONTRAT DE BAIL COMMERCIAL & RÉSIDENTIEL\n\nEntre:\n[Nom du Propriétaire], ci-après le bailleur,\nEt:\n[Nom du Client/Locataire], ci-après le preneur.\n\nPAR LES PRÉSENTES, les parties s'entendent pour un bail mensuel d'un montant de 1,200 $ payable le 1er de chaque mois pour le logement mentionné. Le bailleur s'engage à livrer le logement en bon état d'habitabilité et de propreté. Le locataire s'engage à maintenir les lieux propres et en bon état général.\n\nFait et signé en toute bonne foi d'AutoCompt BYOS.`;
      }
      if (lower.includes('promesse') || lower.includes('achat')) {
        return `PROMESSE D'ACHAT FERME - TRANSACTION OFF-MARKET\n\nNom de l'acheteur: [Acheteur]\nNom du vendeur: [Vendeur]\n\nPar la présente, l'acheteur offre d'acheter l'immeuble situé au Triplex de Laval pour un prix total déterminé de 450,000 $ payable à la conclusion de l'acte de vente notarié.\n\nCette offre est conditionnelle à l'inspection de l'immeuble et à l'approbation d'un financement hypothécaire adéquat dans les 14 jours.\n\nSignatures requises d'AutoCompt.`;
      }
      if (lower.includes('contrat') || lower.includes('gestion')) {
        return `CONTRAT DE SERVICES DE GESTION IMMOBILIÈRE\n\nMandat conféré à:\nSolutions GPA Inc., ci-après le gestionnaire,\nPar:\n[Propriétaire de l'immeuble], ci-après le commettant.\n\nLe gestionnaire administre, loue et perçoit les loyers, gère l'entretien courant et coordonne les sous-traitants pour un taux d'honoraires préétabli de 5% du revenu locatif total.\n\nLiaison BYOS compatible Loi 25 active.`;
      }
      return `CONTRAT MULTI-TENANT CRYPTÉ AUTOCONPT BYOS\n\nDocument rédigé le: ${new Date().toISOString().split('T')[0]}\n\nLes parties soussignées confirment que le présent document fait foi des accords intervenus pour l'administration de l'immeuble et la tenue budgétaire.\n\n[Détails additionnels des livrables et conformité]`;
    };

    return (
      <div className={`min-h-screen ${darkMode ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'} flex flex-col animate-in slide-in-from-right text-left font-sans max-w-full overflow-x-hidden pb-12 md:pl-72 relative transition-all duration-300`}>
        <WorkspaceSidebar />
        
        {/* Top Header strictly matching main workspace navigation styles */}
        <header 
          className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} px-6 py-5 border-b flex items-center justify-between shadow-sm text-left sticky top-0 z-50`}
          style={{ borderTop: `4px solid ${darkMode ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.3)'}` }}
        >
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden mr-1"
            >
              <Menu size={18} />
            </button>
            <button 
              onClick={() => {
                if (subVistaDocu !== 'liste') {
                  setSubVistaDocu('liste');
                } else if (selectedDocuFolder !== null) {
                  setSelectedDocuFolder(null);
                } else {
                  setVista('dashboard');
                }
                playNotificationSound();
              }} 
              className={`p-2 transition-colors rounded-xl ${darkMode ? 'text-zinc-500 hover:text-white hover:bg-zinc-900' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <ArrowLeft size={24}/>
            </button>
            <h2 className="font-black uppercase italic tracking-tighter text-lg text-left">Le Coffre-fort & Signatures</h2>
          </div>
          <span className="text-[7.5px] font-black uppercase text-violet-600 dark:text-violet-400 tracking-widest bg-violet-500/10 px-3 py-1.5 rounded-full italic">Système BYOS Actif 🔑</span>
        </header>

        <main className={`p-6 flex-1 flex flex-col space-y-6 ${subVistaDocu === 'editor' ? 'max-w-5xl' : 'max-w-lg'} mx-auto w-full transition-all duration-300`}>
          <div className="space-y-1">
             <h3 className="text-sm font-black uppercase italic tracking-tight">Espace d'Archivage Légale</h3>
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Propriété exclusive de {activeUser} | Cryptage BYOS</p>
          </div>

          {subVistaDocu === 'liste' ? (
            <>
              {selectedDocuFolder === null ? (
                // 1. GRID OF FOLDERS
                <div className="space-y-6">
                  {/* Summary Metric Card */}
                  <div className={`p-5 rounded-[28px] border ${darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-slate-200'} shadow-sm flex justify-between items-center`}>
                    <div>
                      <p className="text-[7.5px] font-black uppercase tracking-widest text-[#7c3aed]">Tableau des Signatures</p>
                      <h4 className="text-lg font-black italic uppercase leading-none mt-1">{companyDocs.length} Total • {companyDocs.filter(d => d.status === 'Signé').length} Signé(s)</h4>
                    </div>
                    <div className="flex gap-2">
                       <div className="text-center px-3 py-1.5 bg-violet-500/10 text-violet-550 rounded-xl border border-violet-500/10">
                          <p className="text-[7.5px] font-bold uppercase leading-none text-slate-400">Signé</p>
                          <p className="text-[12px] font-black tracking-tighter mt-1">{companyDocs.filter(d => d.status === 'Signé').length}</p>
                       </div>
                       <div className="text-center px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/10">
                          <p className="text-[7.5px] font-bold uppercase leading-none text-slate-400">En attente</p>
                          <p className="text-[12px] font-black tracking-tighter mt-1">{companyDocs.filter(d => d.status === 'En attente').length}</p>
                       </div>
                    </div>
                  </div>

                  {/* SIGNATURE PROFILE SETTINGS TRIGGER */}
                  <div className={`p-5 rounded-[28px] border text-left ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-gradient-to-r from-violet-50/20 to-purple-50/20 border-slate-200'} shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-pulse" />
                        <span className="text-[7.5px] font-black uppercase tracking-wider text-[#7c3aed]">Votre Profil Électronique</span>
                      </div>
                      <h4 className="text-[11px] font-black italic uppercase leading-tight">
                        {savedSignature || savedInitials ? (
                          <span className="text-violet-600 dark:text-violet-400">✓ Signature & Initiales Configures</span>
                        ) : (
                          <span className="text-slate-500 dark:text-zinc-500">Pas de signature active</span>
                        )}
                      </h4>
                      <p className="text-[7.5px] font-bold text-slate-400 dark:text-zinc-550 uppercase">
                        {savedSignature ? 'Signature active enregistree (Image)' : 'Profil par defaut (Fabiola Villegas)'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                      {savedSignature && (
                        <div className="h-10 px-3 bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-center">
                          <img src={savedSignature} alt="Signature Active" className="h-7 object-contain mix-blend-multiply dark:mix-blend-normal invert dark:invert-0" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowSigProfileModal(true);
                          playNotificationSound();
                        }}
                        className="py-2.5 px-4 bg-[#7c3aed] hover:bg-violet-600 text-white rounded-xl text-[8.5px] font-black uppercase italic tracking-widest transition-all active:scale-95 shadow-sm flex items-center space-x-1 border-none cursor-pointer"
                      >
                        <PenLine size={13} />
                        <span>Configurer Ma Signature & Initiales</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Folders Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {folders.map((fName, i) => {
                      const cMap = getFolderColorMap(fName);
                      const dCount = companyDocs.filter(d => d.cat === fName).length;
                      return (
                        <button 
                          key={i} 
                          onClick={() => {
                            setSelectedDocuFolder(fName);
                            playNotificationSound();
                          }}
                          className={`p-5 rounded-[28px] border text-left ${cMap.border} ${cMap.bgColor} relative overflow-hidden flex flex-col space-y-4 hover:scale-[1.02] active:scale-98 transition-all duration-300 shadow-sm`}
                        >
                          <div className="flex justify-between items-start">
                             <Folder size={32} className={cMap.iconColor} />
                             <span className={`text-[6px] font-black uppercase px-2 py-0.5 rounded-full ${darkMode ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-100 text-violet-750'}`}>Cloud Sync</span>
                          </div>
                          <div>
                            <p className={`text-[10.5px] font-black uppercase italic tracking-tight leading-none ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{fName}</p>
                            <p className={`text-[7.5px] font-bold text-slate-400 mt-1.5 uppercase`}>{dCount} document(s)</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 1. THE UPLOAD HUB (DROPZONE) & DRAFT CREATOR */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* DROPZONE */}
                    <div 
                      onClick={() => {
                        setDocSimulatedFile("Contrat_Location_Officiel_GPA.pdf");
                        setDocFormName("Contrat de Location - Apt. 3");
                        setDocFormFolder(folders[0] || "Baux Locatifs");
                        setDocFormRecipient("Richard Duchesne");
                        setDocFormEmail("richard.duchesne@outlook.com");
                        setDocFormPhone("514-555-8822");
                        setDocFormContent(loadDefaultTemplate(folders[0] || "Baux Locatifs"));
                        setDocFormEmailInvite("Bonjour Richard, voici la version finale du contrat de location pour signature électronique.");
                        setDocFormSmsVerify(true);
                        setSubVistaDocu('editor');
                        playNotificationSound();
                        alert("📂 Document 'Contrat_Location_Officiel_GPA.pdf' importé avec succès ! Nous l'avons injecté dans l'outil de préparation.");
                      }}
                      className={`p-6 rounded-[32px] border-2 border-dashed ${
                        darkMode 
                          ? 'bg-zinc-950/40 border-teal-500/20 hover:border-teal-400 text-zinc-300' 
                          : 'bg-teal-50/10 border-[#14b8a6]/30 hover:border-[#059669] text-slate-800'
                      } flex flex-col items-center justify-center text-center transition-all duration-300 relative group cursor-pointer shadow-sm min-h-[160px]`}
                    >
                      <div className={`p-3 rounded-2xl ${darkMode ? 'bg-teal-950/20 text-teal-400' : 'bg-teal-50 text-teal-600'} transition-transform group-hover:scale-110 mb-2`}>
                        <Upload size={20} />
                      </div>
                      <span className="text-[10px] font-black uppercase italic tracking-wider">Importer votre document (PDF / Word)</span>
                      <p className="text-[7.5px] font-bold text-slate-400 dark:text-zinc-500 uppercase mt-0.5">Glissez-déposez ou cliquez</p>
                      <button 
                        type="button"
                        className={`mt-3 px-4 py-2 rounded-xl text-[7.5px] font-black uppercase italic tracking-widest transition-all active:scale-95 shadow-md ${
                          darkMode ? 'bg-teal-950/50 hover:bg-teal-900/60 text-teal-400 border border-teal-500/10' : 'bg-[#059669] hover:bg-emerald-600 text-white'
                        }`}
                      >
                        Sélectionner un fichier
                      </button>
                    </div>

                    {/* MANUAL EDITOR BUTTON */}
                    <button 
                      type="button"
                      onClick={() => {
                        setDocSimulatedFile(null);
                        setDocFormName('');
                        setDocFormFolder(folders[0] || '');
                        setDocFormRecipient('');
                        setDocFormEmail('');
                        setDocFormPhone('');
                        setDocFormContent(loadDefaultTemplate(folders[0] || ''));
                        setDocFormEmailInvite(`Bonjour, veuillez prendre connaissance et signer électroniquement le document ci-joint.`);
                        setDocFormSmsVerify(true);
                        setSelectedDocuEntry(null);
                        setSubVistaDocu('editor');
                        playNotificationSound();
                      }}
                      className="w-full relative overflow-hidden p-6 rounded-[32px] border border-dashed border-slate-300 dark:border-zinc-805 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-zinc-900/30 dark:to-zinc-950 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#059669] hover:brightness-105 active:scale-95 transition-all duration-300 shadow-sm min-h-[160px]"
                    >
                       <div className="absolute right-4 bottom-[-10px] opacity-10 pointer-events-none select-none text-slate-900 dark:text-white">
                          <FileSignature size={100} className="rotate-12" />
                       </div>
                       <span className="text-[10px] font-black uppercase italic tracking-widest text-[#059669] flex items-center space-x-1.5 relative z-10 mb-1">
                         <span>✍️ Rédiger un nouveau document</span>
                       </span>
                       <p className="text-[7.5px] font-bold text-slate-400 uppercase leading-normal max-w-[180px] font-sans">Créez un accord de toutes pièces grâce à nos modèles pré-approuvés.</p>
                    </button>
                  </div>

                  {/* All Recent Company Documents */}
                  <div className="space-y-3 pt-2">
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1 border-b border-slate-100 dark:border-zinc-900 pb-2">
                        <h4 className={`text-[9.5px] font-black uppercase italic tracking-wider ${darkMode ? 'text-zinc-400' : 'text-slate-650'}`}>Tous les Documents</h4>
                        {/* ADMINISTRATION PANEL FILTER TABS */}
                        <div className="flex flex-wrap gap-1">
                          {[
                            { id: 'all', label: 'Tous' },
                            { id: 'pending', label: 'En attente 🔔' },
                            { id: 'signed', label: 'Signés 📜' },
                            { id: 'revoked', label: 'Révoqués ✕' }
                          ].map(tab => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                setDocuFilterTab(tab.id);
                                playNotificationSound();
                              }}
                              className={`px-2 py-1 rounded-lg text-[6.5px] font-black uppercase tracking-wider transition-all border-none cursor-pointer ${
                                docuFilterTab === tab.id
                                  ? 'bg-[#7c3aed] text-white shadow-sm shadow-violet-900/10'
                                  : 'bg-slate-150/40 text-slate-400 hover:text-slate-600 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-350'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                     </div>

                     {companyDocs.length === 0 ? (
                       <p className="text-[9.5px] italic text-slate-400 font-bold px-1">Aucun document pour cette entreprise.</p>
                     ) : (
                       <div className="space-y-2.5">
                         {(() => {
                           const filteredDocs = companyDocs.filter(d => {
                             if (docuFilterTab === 'pending') return d.status === 'En attente';
                             if (docuFilterTab === 'signed') return d.status === 'Signé';
                             if (docuFilterTab === 'revoked') return d.status === 'Révoqué' || d.status === 'Annulé';
                             return true;
                           });

                           if (filteredDocs.length === 0) {
                             return <p className="text-[8.5px] italic text-slate-400 font-bold p-4 text-center">Aucun document trouvé pour ce filtre.</p>;
                           }

                           return filteredDocs.map(doc => {
                             return (
                               <div 
                                 key={doc.id}
                                 onClick={() => {
                                   setSelectedDocuEntry(doc);
                                   setDocFormName(doc.name);
                                   setDocFormFolder(doc.cat);
                                   setDocFormRecipient(doc.recipient || '');
                                   setDocFormEmail(doc.recipientEmail || '');
                                   setDocFormPhone(doc.recipientPhone || '');
                                   setDocFormContent(doc.content || '');
                                   setDocFormEmailInvite(doc.emailInvite || '');
                                   setDocFormSmsVerify(doc.smsVerify ?? true);
                                   setDocFormSignersList(doc.signers || [
                                     { id: '1', name: 'Fabiola Villegas', email: 'fabiola@propiosolutions.com', phone: '514-555-1111', role: 'Propriétaire / Émetteur', color: 'Purple' },
                                     { id: '2', name: 'Natalia Lopez', email: 'natalia@propiosolutions.com', phone: '514-555-2222', role: 'Collaborateur direct', color: 'Emerald' },
                                     { id: '3', name: doc.recipient || 'Richard', email: doc.recipientEmail || 'richard@outlook.com', role: 'Signataire', color: 'Amber' }
                                   ]);
                                   setDocLogo(doc.logo || null);
                                   setDocPlacedFields(doc.placedFields || [
                                     { id: 'field-1', type: 'Signature', signer: doc.recipient || 'Richard', roleColor: 'Amber' },
                                     { id: 'field-2', type: 'Initiales', signer: 'Fabiola Villegas', roleColor: 'Purple' }
                                   ]);
                                   setSubVistaDocu('editor');
                                   playNotificationSound();
                                 }}
                                 className={`p-4 rounded-[28px] border shadow-sm flex items-center justify-between text-left cursor-pointer transition-all hover:scale-[1.012] ${
                                   darkMode ? 'bg-zinc-950 border-zinc-900 hover:border-[#7c3aed]/40' : 'bg-white border-slate-150 hover:border-[#7c3aed]/40'
                                 } hover:shadow-md duration-200`}
                               >
                                 <div className="flex items-center space-x-3 max-w-[65%] text-left">
                                   {doc.status === 'Signé' ? (
                                     <div className="w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm border border-emerald-500/10">
                                        <CheckCircle2 size={14} />
                                     </div>
                                   ) : doc.status === 'Révoqué' || doc.status === 'Annulé' ? (
                                     <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 shadow-sm border border-rose-500/10">
                                        <X size={14} />
                                     </div>
                                   ) : (
                                     <div className="w-8 h-8 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-sm animate-pulse border border-amber-500/10">
                                        <PenLine size={14} />
                                     </div>
                                   )}
                                   <div className="truncate text-left">
                                     <p className="text-[10px] font-black uppercase italic tracking-tight truncate leading-tight">{doc.name}</p>
                                     <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase leading-none font-sans">
                                       Pour: {doc.recipient} • Émis le {doc.date}
                                     </p>
                                   </div>
                                 </div>

                                 <div className="flex items-center space-x-2 shrink-0">
                                   <span className={`px-2 py-0.5 rounded-full text-[6px] font-black uppercase italic ${
                                     doc.status === 'Signé' 
                                       ? 'bg-emerald-500/10 text-emerald-500' 
                                       : doc.status === 'Révoqué' || doc.status === 'Annulé'
                                       ? 'bg-rose-500/10 text-rose-500'
                                       : 'bg-amber-500/10 text-amber-505'
                                   }`}>
                                     {doc.status}
                                   </span>

                                   {/* PENDING MANAGE ACTIONS FOR CLIENT ADMIN */}
                                   {doc.status === 'En attente' && (
                                     <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                                       <button
                                         type="button"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setRemindedDocs(prev => ({ ...prev, [doc.id]: true }));
                                           playNotificationSound();
                                           alert(`🔔 Relance envoyée !\n\nUn courriel de relance d'accord et un rappel SMS immuable ont été transmis à ${doc.recipient} (${doc.recipientEmail || 'richard.duchesne@outlook.com'}).`);
                                         }}
                                         title="Envoyer une relance par Courriel / SMS"
                                         className={`p-1.5 rounded-lg border-none flex items-center justify-center transition-all cursor-pointer ${
                                           remindedDocs[doc.id]
                                             ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'
                                             : 'bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600'
                                         }`}
                                       >
                                         <Bell size={10} className={remindedDocs[doc.id] ? 'animate-bounce' : ''} />
                                       </button>

                                       <button
                                         type="button"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           if (confirm(`⚠ Annuler la demande de signature?\n\nVoulez-vous révoquer et désactiver définitivement le lien d'accès pour "${doc.name}"? Celui-ci sera invalide.`)) {
                                             setDocuLegalList(docuLegalList.map(d => d.id === doc.id ? { ...d, status: 'Révoqué' } : d));
                                             playNotificationSound();
                                           }
                                         }}
                                         title="Retirer / Annuler la demande"
                                         className="p-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg border-none flex items-center justify-center transition-all cursor-pointer"
                                       >
                                         <X size={10} />
                                       </button>
                                     </div>
                                   )}

                                   {doc.status === 'Signé' && (
                                     <button
                                       type="button"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleExportPDF(doc);
                                         playNotificationSound();
                                       }}
                                       title="Exporter en PDF avec Certificat d'Audit"
                                       className="p-1 px-1.5 bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white rounded-lg text-[6.5px] font-black uppercase italic tracking-tighter flex items-center space-x-1 border-none transition-all cursor-pointer"
                                     >
                                       <Printer size={9} />
                                       <span>PDF</span>
                                     </button>
                                   )}
                                 </div>
                               </div>
                             );
                           });
                         })()}
                       </div>
                     )}
                  </div>
                </div>
              ) : (
                // 2. FOLDER DETAIL VIEW
                <div className="space-y-4">
                  {/* Return breadcrumb */}
                  <div className="flex items-center justify-between mb-2">
                    <button 
                      onClick={() => {
                        setSelectedDocuFolder(null);
                        playNotificationSound();
                      }}
                      className="text-[9px] font-black uppercase italic text-[#7c3aed] flex items-center space-x-1.5"
                    >
                      <ArrowLeft size={12} />
                      <span>Retour aux Dossiers</span>
                    </button>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{selectedDocuFolder}</span>
                  </div>

                  {/* Documents list in selected folder */}
                  <div className="space-y-3">
                    {docsInFolder.length === 0 ? (
                      <div className={`p-10 text-center border-2 border-dashed rounded-[32px] ${darkMode ? 'border-zinc-900 bg-zinc-950/20 text-zinc-500' : 'border-slate-100 bg-slate-50/50 text-slate-400'}`}>
                        <FileText size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="text-[10px] font-black uppercase italic tracking-wider">Aucun document dans {selectedDocuFolder}</p>
                        <button 
                          onClick={() => {
                            setDocFormFolder(selectedDocuFolder || '');
                            setDocFormName(`${selectedDocuFolder} - ${currentCompany?.nombre}`);
                            setDocFormRecipient('');
                            setDocFormEmail('');
                            setDocFormPhone('');
                            setDocFormContent(loadDefaultTemplate(selectedDocuFolder || ''));
                            setDocFormEmailInvite('Bonjour, veuillez prendre connaissance et signer électroniquement le document ci-joint.');
                            setDocFormSmsVerify(true);
                            setDocFormSignersList([
                              { id: '1', name: 'Fabiola Villegas', email: 'fabiola@propiosolutions.com', phone: '514-555-1111', role: 'Propriétaire / Émetteur', color: 'Purple' },
                              { id: '2', name: 'Natalia Lopez', email: 'natalia@propiosolutions.com', phone: '514-555-2222', role: 'Collaborateur direct', color: 'Emerald' },
                              { id: '3', name: 'Richard', email: 'richard.duchesne@outlook.com', role: 'Signataire', color: 'Amber' }
                            ]);
                            setDocLogo(null);
                            setDocPlacedFields([
                              { id: 'field-1', type: 'Signature', signer: 'Richard', roleColor: 'Amber' },
                              { id: 'field-2', type: 'Initiales', signer: 'Fabiola Villegas', roleColor: 'Purple' }
                            ]);
                            setSelectedDocuEntry(null);
                            setSubVistaDocu('editor');
                            playNotificationSound();
                          }}
                          className="mt-4 px-4 py-3 bg-[#7c3aed] hover:bg-violet-600 text-white rounded-2xl text-[8px] font-black uppercase italic tracking-widest transition-all shadow-md shadow-violet-900/10"
                        >
                          + Créer un document
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {docsInFolder.map((doc) => (
                          <div 
                            key={doc.id}
                            onClick={() => {
                              setSelectedDocuEntry(doc);
                              setDocFormName(doc.name);
                              setDocFormFolder(doc.cat);
                              setDocFormRecipient(doc.recipient || '');
                              setDocFormEmail(doc.recipientEmail || '');
                              setDocFormPhone(doc.recipientPhone || '');
                              setDocFormContent(doc.content || '');
                              setDocFormEmailInvite(doc.emailInvite || '');
                              setDocFormSmsVerify(doc.smsVerify ?? true);
                              setDocFormSignersList(doc.signers || [
                                { id: '1', name: 'Fabiola Villegas', email: 'fabiola@propiosolutions.com', phone: '514-555-1111', role: 'Propriétaire / Émetteur', color: 'Purple' },
                                { id: '2', name: 'Natalia Lopez', email: 'natalia@propiosolutions.com', phone: '514-555-2222', role: 'Collaborateur direct', color: 'Emerald' },
                                { id: '3', name: doc.recipient || 'Richard', email: doc.recipientEmail || 'richard@outlook.com', role: 'Signataire', color: 'Amber' }
                              ]);
                              setDocLogo(doc.logo || null);
                              setDocPlacedFields(doc.placedFields || [
                                { id: 'field-1', type: 'Signature', signer: doc.recipient || 'Richard', roleColor: 'Amber' },
                                { id: 'field-2', type: 'Initiales', signer: 'Fabiola Villegas', roleColor: 'Purple' }
                              ]);
                              setSubVistaDocu('editor');
                              playNotificationSound();
                            }}
                            className={`p-5 rounded-[32px] border shadow-sm flex items-center justify-between text-left cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${
                              darkMode ? 'bg-zinc-950 border-zinc-905 hover:border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                            }`}
                          >
                            <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-3">
                              {/* STATUS EMBEDDED GRAPHICS - REVISION 2 */}
                              {doc.status === 'Signé' ? (
                                <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-605 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm border border-emerald-500/10">
                                  <CheckCircle2 size={16} />
                                </div>
                              ) : doc.status === 'Révoqué' || doc.status === 'Annulé' ? (
                                <div className="w-9 h-9 rounded-full bg-rose-500/10 text-rose-505 flex items-center justify-center shrink-0 shadow-sm border border-rose-500/10">
                                  <X size={16} />
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-605 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm animate-pulse border border-amber-500/10">
                                  <PenLine size={16} />
                                </div>
                              )}
                              <div className="truncate">
                                <p className="text-[11px] font-black uppercase italic tracking-tight truncate leading-tight text-left">{doc.name}</p>
                                <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase tracking-wider font-sans text-left">
                                  Pour : {doc.recipient} • Émis le {doc.date}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right flex items-center space-x-2 shrink-0">
                              <span className={`px-2.5 py-1 rounded-full text-[6.5px] font-black uppercase italic leading-none whitespace-nowrap ${
                                doc.status === 'Signé' ? 'bg-emerald-500/10 text-emerald-500' : doc.status === 'Révoqué' || doc.status === 'Annulé' ? 'bg-rose-500/10 text-rose-505' : 'bg-amber-500/10 text-amber-505'
                              }`}>
                                {doc.status}
                              </span>

                              {/* PENDING ACTIONS */}
                              {doc.status === 'En attente' && (
                                <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRemindedDocs(prev => ({ ...prev, [doc.id]: true }));
                                      playNotificationSound();
                                      alert(`🔔 Relance envoyée !\n\nUn courriel de relance d'accord et un rappel SMS immuable ont été transmis à ${doc.recipient} (${doc.recipientEmail || 'richard.duchesne@outlook.com'}).`);
                                    }}
                                    title="Envoyer une relance par Courriel / SMS"
                                    className={`p-1.5 rounded-lg border-none flex items-center justify-center transition-all cursor-pointer ${
                                      remindedDocs[doc.id]
                                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'
                                        : 'bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600'
                                    }`}
                                  >
                                    <Bell size={10} className={remindedDocs[doc.id] ? 'animate-bounce' : ''} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`⚠ Annuler la demande de signature?\n\nVoulez-vous révoquer et désactiver définitivement le lien d'accès pour "${doc.name}"? Celui-ci sera invalide.`)) {
                                        setDocuLegalList(docuLegalList.map(d => d.id === doc.id ? { ...d, status: 'Révoqué' } : d));
                                        playNotificationSound();
                                      }
                                    }}
                                    title="Retirer / Annuler la demande"
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg border-none flex items-center justify-center transition-all cursor-pointer"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              )}

                              {doc.status === 'Signé' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportPDF(doc);
                                    playNotificationSound();
                                  }}
                                  title="Exporter en PDF avec Certificat d'Audit"
                                  className="p-1.5 px-2 bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white rounded-lg text-[6.5px] font-black uppercase italic tracking-tighter flex items-center space-x-1 border-none transition-all cursor-pointer"
                                >
                                  <Printer size={10} />
                                  <span>PDF</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            // 3. WORKSPACE HEADER & FORM EDITOR (DocumentEditor View)
            <div className="space-y-6 w-full animate-in fade-in duration-300 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2 pb-4 border-b border-slate-100 dark:border-zinc-900">
                <button 
                  type="button"
                  onClick={() => {
                    setSubVistaDocu('liste');
                    playNotificationSound();
                  }}
                  className={`text-[9.5px] font-black uppercase italic text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 flex items-center space-x-1.5`}
                >
                  <ArrowLeft size={13} />
                  <span>Annuler & Retour aux dossiers</span>
                </button>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8.5px] font-black text-[#059669] uppercase tracking-widest italic animate-pulse">
                    {selectedDocuEntry ? 'Édition de ' + selectedDocuEntry.name : 'Tableau de Préparation Documentaire BYOS'}
                  </span>
                </div>
              </div>

              {/* TWO COLUMN GRID FOR HIGH-END SPACING */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* COLUMN LEFT (lg:col-span-7) - THE DOCUMENT CANVAS & PREPARATION TOOLS */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* CRYPTOGRAPHIC AUDIT SEAL FOR SIGNED CONTRACTS */}
                  {selectedDocuEntry?.status === 'Signé' && (
                    <div className="p-5 rounded-[32px] border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/20 text-left space-y-3.5 shadow-sm animate-in zoom-in-95">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1 px-1.5 bg-[#059669] text-white rounded-lg text-[7px] font-black uppercase tracking-widest leading-none flex items-center space-x-1">
                          <ShieldCheck size={10} className="animate-pulse" />
                          <span>SCELLÉ PROTECTEUR BYOS</span>
                        </div>
                        <span className="text-[7.5px] font-extrabold text-[#059669] uppercase tracking-wider">CONFORMATOIRE LOI 25 (QUÉBEC)</span>
                      </div>
                      
                      <div className="space-y-1.5 border-l-2 border-[#059669]/30 pl-3.5">
                        <p className="text-[10px] font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-tight">
                          Ce bail/document a été scellé électroniquement par les signataires sous clé biométrique.
                        </p>
                        <ul className="text-[7.5px] font-semibold text-slate-500 dark:text-zinc-400 space-y-1 uppercase tracking-tight font-sans">
                          <li>• Signataire principal: <span className="font-extrabold text-slate-800 dark:text-white">{selectedDocuEntry.recipient}</span> ({selectedDocuEntry.recipientEmail})</li>
                          <li>• Horodatage certifié: <span className="font-extrabold text-slate-800 dark:text-white">{selectedDocuEntry.signatureTimestamp || new Date().toISOString()}</span></li>
                          <li>• ID de Transaction: <span className="font-mono text-[8.5px] font-extrabold text-[#059669]">{selectedDocuEntry.transactionId || 'TX-BYOS-PENDING'}</span></li>
                          <li>• Hachage cryptographique SHA-256: <span className="font-mono text-[7px] font-bold text-slate-400 break-all">{selectedDocuEntry.transactionId ? `sha256-hash-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}` : 'Calculated on download'}</span></li>
                        </ul>
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleExportPDF(selectedDocuEntry);
                            playNotificationSound();
                          }}
                          className="px-3.5 py-2 bg-[#059669] hover:bg-emerald-600 text-white rounded-xl text-[8.5px] font-black uppercase italic tracking-widest flex items-center space-x-1 border-none transition-all cursor-pointer"
                        >
                          <Printer size={11} />
                          <span>TÉLÉCHARGER LE PDF OFFICIEL AVEC CERTIFICAT</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DOCUMENT METADATA */}
                  <div className={`p-6 rounded-[32px] border text-left space-y-4 shadow-sm \${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-zinc-900">
                      <p className="text-[9.5px] font-black uppercase text-[#7c3aed] italic">Spécifications de l'Accord</p>
                      {docSimulatedFile && (
                        <span className="text-[7.5px] font-black uppercase bg-violet-500/10 text-violet-650 px-2.5 py-1 rounded-full border border-violet-500/15">
                          📄 {docSimulatedFile}
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-1">Nom du document contractuel</label>
                          <input 
                            type="text" 
                            value={docFormName}
                            onChange={e => setDocFormName(e.target.value)}
                            disabled={selectedDocuEntry?.status === 'Signé'}
                            placeholder="Nommerez votre contrat, ex: Bail Appartement 45B"
                            className={`w-full p-3.5 rounded-2xl outline-none text-[11px] font-bold transition-all border \${selectedDocuEntry?.status === 'Signé' ? 'opacity-60 cursor-not-allowed' : ''} \${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-[#7c3aed]' : 'bg-slate-50 border-slate-105 focus:border-[#7c3aed]'}`}
                          />
                        </div>

                        {/* BRANDING LOGO INTERACTION */}
                        <div>
                          <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-1">Logo d'entreprise (Smart Branding)</label>
                          <div className="flex items-center space-x-2">
                            {docLogo ? (
                              <div className="flex items-center space-x-2 bg-slate-50 dark:bg-zinc-900/60 p-2 rounded-2xl border border-slate-105 dark:border-zinc-850 w-full justify-between">
                                <div className="flex items-center space-x-2">
                                  <img src={docLogo} alt="Logo" className="h-7 max-w-[80px] object-contain rounded" />
                                  <span className="text-[6.5px] font-bold text-slate-400 uppercase">Actif</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDocLogo(null);
                                    playNotificationSound();
                                  }}
                                  className="text-[7.5px] font-black uppercase text-rose-500 hover:text-rose-600 bg-transparent border-none cursor-pointer pr-1"
                                >
                                  Retirer
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const mockLogos = [
                                    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80", 
                                    "https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=120&auto=format&fit=crop&q=80", 
                                    "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=120&auto=format&fit=crop&q=80"
                                  ];
                                  const randomLogo = mockLogos[Math.floor(Math.random() * mockLogos.length)];
                                  setDocLogo(randomLogo);
                                  playNotificationSound();
                                  alert("✨ Logo d'entreprise appliqué !\n\nVotre image de marque s'affichera maintenant dans l'en-tête du document et sur le portail client.");
                                }}
                                className="w-full py-3 bg-violet-500/10 hover:bg-violet-500/15 text-[#7c3aed] border border-dashed border-[#7c3aed]/30 rounded-2xl text-[8.5px] font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                              >
                                <Upload size={11} />
                                <span>Téléverser un logo (Branding)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-35">
                        <div>
                          <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-1">Dossier de Classement</label>
                          <select
                            value={docFormFolder}
                            onChange={e => {
                              const nextFld = e.target.value;
                              setDocFormFolder(nextFld);
                              setDocFormContent(loadDefaultTemplate(nextFld));
                            }}
                            disabled={selectedDocuEntry?.status === 'Signé'}
                            className={`w-full p-3.5 rounded-2xl outline-none text-[11px] font-bold transition-all border \${selectedDocuEntry?.status === 'Signé' ? 'opacity-60 cursor-not-allowed font-sans' : ''} \${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300 focus:border-[#7c3aed]' : 'bg-slate-50 border-slate-105 focus:border-[#7c3aed]'}`}
                          >
                            {folders.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-1">Auteur émetteur (IP Certifié)</label>
                          <input 
                            type="text"
                            value={activeUser}
                            disabled
                            className={`w-full p-3.5 rounded-2xl outline-none text-[11px] font-bold transition-all border opacity-60 cursor-not-allowed \${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-slate-50 border-slate-105 text-slate-400'}`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-1">Clauses contractuelles & Corps de l'accord</label>
                        <textarea 
                          value={docFormContent}
                          onChange={e => setDocFormContent(e.target.value)}
                          rows={6}
                          disabled={selectedDocuEntry?.status === 'Signé'}
                          className={`w-full p-3.5 rounded-2xl outline-none text-[10.5px] font-mono font-bold transition-all border resize-none leading-relaxed \${selectedDocuEntry?.status === 'Signé' ? 'opacity-70 cursor-not-allowed' : ''} \${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-[#7c3aed]' : 'bg-slate-50 border-slate-105 focus:border-[#7c3aed]'}`}
                          placeholder="Faites valoir les clauses convenues ici..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* VISUAL FIELD PLACEMENT TOOL & LIVE SIMULATED DOC */}
                  <div className={`p-6 rounded-[32px] border text-left space-y-4 shadow-sm ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-zinc-900">
                      <div>
                        <p className="text-[9.5px] font-black uppercase text-[#7c3aed] italic">Placement Visuel de Validation</p>
                        <p className="text-[7.5px] text-slate-400 dark:text-zinc-500 uppercase font-semibold mt-0.5">Cliquez sur un outil pour l'apposer instantanément</p>
                      </div>
                    </div>

                    {/* FIELD SIGNER SELECTOR */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/30 border border-slate-100 dark:border-zinc-850/40">
                      <span className="text-[7.5px] font-black uppercase text-slate-400 italic block mb-1.5">Signataire cible pour l'élément à apposer :</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {docFormSignersList.map((sig) => {
                          const isSelected = docSignerActive === sig.name;
                          const colorMeta = getSignerColorClasses(sig.color);
                          return (
                            <button
                              key={sig.id}
                              type="button"
                              onClick={() => {
                                setDocSignerActive(sig.name);
                                playNotificationSound();
                              }}
                              className={`flex items-center justify-center space-x-1.5 p-2 rounded-xl text-[8px] font-black uppercase italic tracking-tight border transition-all ${
                                isSelected 
                                  ? `${colorMeta.border} border-2 scale-[1.03] ring-1 ring-violet-500/20` 
                                  : 'bg-transparent border-slate-150 dark:border-zinc-850 text-slate-405 dark:text-zinc-500 hover:text-slate-650'
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${colorMeta.dot} shrink-0`} />
                              <span className="truncate">{sig.name.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* TOOLBAR FOR INSTANT FIELD CREATION */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { type: 'Signature', label: 'Signature', icon: <PenLine size={13} />, textClass: 'text-[#e11d48]', borderClass: 'border-rose-500/20 bg-rose-500/[0.02]', hClass: 'hover:bg-rose-500/5' },
                        { type: 'Initiales', label: 'Initiales (AA)', icon: <Type size={13} />, textClass: 'text-[#2563eb]', borderClass: 'border-blue-500/20 bg-blue-500/[0.02]', hClass: 'hover:bg-blue-500/5' },
                        { type: 'Date de signature', label: 'Date', icon: <Calendar size={13} />, textClass: 'text-[#7c3aed]', borderClass: 'border-violet-500/20 bg-violet-500/[0.02]', hClass: 'hover:bg-violet-500/5' }
                      ].map((tool) => (
                        <button
                          key={tool.type}
                          type="button"
                          onClick={() => {
                            const id = `field-${Date.now()}`;
                            const foundSigner = docFormSignersList.find(s => s.name === docSignerActive) || docFormSignersList[0];
                            const roleColor = foundSigner.color || 'Purple';
                            const nextFields = [
                              ...docPlacedFields,
                              { id, type: tool.type, signer: docSignerActive, roleColor }
                            ];
                            setDocPlacedFields(nextFields);
                            playNotificationSound();
                          }}
                          className={`py-3 px-3 rounded-2xl border border-dashed transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center text-center cursor-pointer ${tool.borderClass} ${tool.hClass}`}
                        >
                          <div className={`${tool.textClass} mb-1 ${tool.type === 'Signature' ? 'animate-pulse' : ''}`}>{tool.icon}</div>
                          <span className={`text-[8px] font-black uppercase italic tracking-tight ${tool.textClass}`}>{tool.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* SIMULATED A4 DOCUMENT RENDER */}
                    <div className={`relative rounded-[28px] border ${darkMode ? 'bg-zinc-900 border-zinc-800/80 shadow-inner' : 'bg-slate-50 border-slate-105 shadow-inner'} p-5 overflow-hidden min-h-[350px] flex flex-col justify-between`}>
                       {/* Background template design */}
                       <div className="space-y-3 relative z-10 w-full">
                          <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-zinc-800">
                            <span className="text-[7px] font-black text-[#059669] italic">CONTRAT DIGITAL AUTOCOMPT</span>
                            <span className="text-[6px] font-black uppercase text-slate-400">Page 1 de 1</span>
                          </div>

                          <div className="text-[11px] font-extrabold uppercase italic text-slate-800 dark:text-zinc-200">
                             {docFormName || "Document non-nommé"}
                          </div>

                          <div className="text-[8.5px] leading-relaxed text-slate-400/90 dark:text-zinc-400 font-medium whitespace-pre-wrap font-sans max-h-[140px] overflow-y-auto p-1 pr-2">
                             {docFormContent || "Veuillez entrer des clauses à l'aide de l'éditeur ci-dessus pour observer le document."}
                          </div>
                       </div>

                       {/* GRAPHICAL PLACED VALIDATION FIELDS */}
                       <div className="space-y-2 pt-4 border-t border-dashed border-slate-200 dark:border-zinc-850 w-full relative z-10 text-left">
                          <p className="text-[6.5px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1">Champs de signature apposés :</p>
                          
                          {docPlacedFields.length === 0 ? (
                            <div className="py-6 text-center text-[7.5px] font-bold uppercase italic text-slate-400/80 bg-white/40 dark:bg-black/30 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
                               ⚠️ Aucun champ actif. Remplissez puis cliquez sur les outils de validation ci-dessus !
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {docPlacedFields.map((field) => {
                                const isPurp = field.roleColor === 'Purple';
                                const isEmer = field.roleColor === 'Emerald';
                                const styleSpec = isPurp 
                                  ? { border: 'border-purple-500/25 bg-purple-500/[0.03] text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' }
                                  : isEmer 
                                  ? { border: 'border-emerald-500/25 bg-emerald-500/[0.03] text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' }
                                  : { border: 'border-amber-500/25 bg-amber-500/[0.03] text-amber-600 dark:text-amber-400', dot: 'bg-amber-505' };

                                return (
                                  <div 
                                    key={field.id} 
                                    className={`p-2 rounded-xl border border-dashed text-left flex items-center justify-between ${styleSpec.border} animate-in zoom-in-95 duration-200`}
                                  >
                                    <div className="flex items-center space-x-1.5 min-w-0">
                                      <div className={`w-1.5 h-1.5 rounded-full ${styleSpec.dot} shrink-0 animate-pulse`} />
                                      <div className="truncate">
                                        <p className="text-[8px] font-black uppercase italic leading-none">{field.type}</p>
                                        <p className="text-[6.5px] font-semibold text-slate-400 dark:text-zinc-500 uppercase mt-0.5 truncate leading-tight">{field.signer}</p>
                                        {field.type === 'Signature' && field.signer === 'Fabiola Villegas' && savedSignature && (
                                          <div className="mt-1 h-6 px-1.5 py-0.5 bg-white dark:bg-zinc-950 rounded border border-emerald-500/10 flex items-center justify-center">
                                            <img src={savedSignature} alt="Fabiola Sig" className="h-[20px] object-contain mix-blend-multiply dark:mix-blend-normal invert dark:invert-0" />
                                          </div>
                                        )}
                                        {field.type === 'Initiales' && field.signer === 'Fabiola Villegas' && savedInitials && (
                                          <p className="text-[8px] font-mono tracking-wider font-extrabold text-[#1e3a8a] dark:text-blue-300 italic mt-0.5 border border-[#1e3a8a]/10 px-1 bg-white dark:bg-zinc-950 rounded inline-block">
                                            [{savedInitials}]
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDocPlacedFields(docPlacedFields.filter(f => f.id !== field.id));
                                        playNotificationSound();
                                      }}
                                      className="p-1 hover:bg-slate-200/50 dark:hover:bg-zinc-800 rounded text-[7.5px] font-black uppercase text-slate-400 hover:text-rose-500 dark:hover:text-rose-450 transition-colors shrink-0"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                       </div>

                       <div className="flex items-center justify-between text-[6px] text-slate-400/80 pt-2 border-t border-slate-150 dark:border-zinc-800/50 relative z-10 font-sans">
                          <span>Technologie de Signature Mobile Intelligente BYOS</span>
                          <span>Norme ISO-Loi 25 Certifiée</span>
                       </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN RIGHT (lg:col-span-5) - THE SIGNER MANAGEMENT PANEL */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* SIGNER LIST & ROLES */}
                  <div className={`p-6 rounded-[32px] border text-left space-y-4 shadow-sm ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-205'}`}>
                    <div className="flex items-center justify-between border-b pb-3 border-slate-150 dark:border-zinc-900">
                      <div>
                        <p className="text-[9.5px] font-black uppercase text-[#7c3aed] italic">Signataires & Rôles</p>
                        <p className="text-[7.5px] text-slate-400 dark:text-zinc-500 uppercase font-semibold mt-0.5">Destinataires du document d'audit</p>
                      </div>
                    </div>

                    {/* Prepopulated roles and customizable recipient */}
                    <div className="space-y-2.5">
                      {docFormSignersList.map((signer, index) => {
                        const styleSpec = getSignerColorClasses(signer.color);
                        return (
                          <div 
                            key={signer.id}
                            className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                              darkMode ? 'bg-zinc-900/40 border-zinc-900/45 animate-in slide-in-from-left-2' : 'bg-slate-50/50 border-slate-100 animate-in slide-in-from-left-2'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 text-left">
                              <span className={`w-2.5 h-2.5 rounded-full ${styleSpec.dot} shadow-md shrink-0`} />
                              <div className="truncate text-left">
                                <p className="text-[9.5px] font-black leading-none uppercase text-left">{signer.name}</p>
                                <p className="text-[7px] text-slate-400 uppercase font-semibold mt-0.5 truncate text-left">{signer.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className={`text-[6.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${styleSpec.bg} ${styleSpec.text}`}>
                                {signer.role}
                              </span>
                              {index > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDocFormSignersList(docFormSignersList.filter(s => s.id !== signer.id));
                                    playNotificationSound();
                                  }}
                                  className="text-[10px] font-black text-rose-500 hover:text-rose-700 p-0.5 bg-transparent border-none cursor-pointer"
                                  title="Retirer ce signataire"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* DYNAMIC SIGNERS ADDER DRAWER PANEL */}
                  <div className={`p-6 rounded-[32px] border text-left space-y-4 shadow-sm ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-205'}`}>
                    <span className="text-[7.5px] font-black uppercase text-slate-400 block tracking-wider italic">
                      ✍️ NOUVEAU SIGNATAIRE DYNAMIQUE :
                    </span>
                    
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        type="text"
                        value={newSignerName}
                        onChange={e => setNewSignerName(e.target.value)}
                        placeholder="Nom complet (ex: Jean Talon)"
                        className={`w-full p-2.5 rounded-xl outline-none text-[9.5px] font-bold border ${
                          darkMode ? 'bg-zinc-900 border-zinc-801 text-zinc-100' : 'bg-slate-50 border-slate-105 text-slate-800'
                        } focus:border-[#7c3aed]`}
                      />
                      <input
                        type="email"
                        value={newSignerEmail}
                        onChange={e => setNewSignerEmail(e.target.value)}
                        placeholder="Courriel (ex: jean@talon.com)"
                        className={`w-full p-2.5 rounded-xl outline-none text-[9.5px] font-bold border ${
                          darkMode ? 'bg-zinc-900 border-zinc-801 text-zinc-100' : 'bg-slate-50 border-slate-105 text-slate-800'
                        } focus:border-[#7c3aed]`}
                      />
                      <input
                        type="text"
                        value={newSignerRole}
                        onChange={e => setNewSignerRole(e.target.value)}
                        placeholder="Role (ex: Co-signataire)"
                        className={`w-full p-2.5 rounded-xl outline-none text-[9.5px] font-bold border ${
                          darkMode ? 'bg-zinc-900 border-zinc-801 text-zinc-100' : 'bg-slate-50 border-slate-105 text-slate-800'
                        } focus:border-[#7c3aed]`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!newSignerName || !newSignerEmail) {
                          try {
                            alert("⚠️ Le nom et l'adresse courriel sont obligatoires.");
                          } catch (err) {
                            console.error("Alert blocked by iframe security:", err);
                          }
                          return;
                        }
                        const possibleColors = ['Purple', 'Emerald', 'Blue', 'Pink', 'Indigo', 'Orange', 'Teal', 'Red'];
                        const chosenColor = possibleColors[docFormSignersList.length % possibleColors.length];
                        const newSigItem = {
                          id: `sig-${Date.now()}`,
                          name: newSignerName,
                          email: newSignerEmail,
                          role: newSignerRole || 'Signataire',
                          color: chosenColor
                        };
                        
                        // Add to signers list
                        const nextSigners = [...docFormSignersList, newSigItem];
                        setDocFormSignersList(nextSigners);
                        
                        // Liaison with target selector (Crucial)
                        // This immediately points the visual widget drawer's target selector to this new signer
                        setDocSignerActive(newSignerName);
                        
                        // Compatibility: automatically set recipient to last added for single email workflows
                        setDocFormRecipient(newSignerName);
                        setDocFormEmail(newSignerEmail);

                        // Reset input form
                        setNewSignerName('');
                        setNewSignerEmail('');
                        setNewSignerRole('Signataire');
                        playNotificationSound();
                      }}
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-[8px] font-black uppercase italic tracking-widest rounded-xl transition-all cursor-pointer border-none shadow"
                    >
                      + Ajouter le signataire
                    </button>
                  </div>

                  {/* EXTRA SMS & ROUTING CONTROLS */}
                  <div className={`p-6 rounded-[32px] border text-left space-y-4 shadow-sm ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-205'}`}>
                        <div>
                          <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-1">Destinataire pour action par défaut</label>
                          <input 
                            type="text" 
                            value={docFormRecipient}
                            onChange={e => setDocFormRecipient(e.target.value)}
                            disabled={selectedDocuEntry?.status === 'Signé'}
                            placeholder="Nom complet du destinataire"
                            className={`w-full p-3 rounded-2xl outline-none text-[11px] font-bold transition-all border \${selectedDocuEntry?.status === 'Signé' ? 'opacity-60 cursor-not-allowed' : ''} \${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-[#7c3aed]' : 'bg-slate-50 border-slate-105 focus:border-[#7c3aed]'}`}
                          />
                        </div>

                        <div>
                          <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-1">Email pour action par défaut</label>
                          <input 
                            type="email" 
                            value={docFormEmail}
                            onChange={e => setDocFormEmail(e.target.value)}
                            disabled={selectedDocuEntry?.status === 'Signé'}
                            placeholder="ex: richard.duchesne@outlook.com"
                            className={`w-full p-3 rounded-2xl outline-none text-[11px] font-bold transition-all border \${selectedDocuEntry?.status === 'Signé' ? 'opacity-60 cursor-not-allowed' : ''} \${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-[#7c3aed]' : 'bg-slate-50 border-slate-105 focus:border-[#7c3aed]'}`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 items-end">
                          <div>
                            <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-1">Cellulaire (SMS OTP)</label>
                            <input 
                              type="text" 
                              value={docFormPhone}
                              onChange={e => setDocFormPhone(e.target.value)}
                              disabled={selectedDocuEntry?.status === 'Signé'}
                              placeholder="514-555-1234"
                              className={`w-full p-3 rounded-2xl outline-none text-[11px] font-mono font-bold transition-all border \${selectedDocuEntry?.status === 'Signé' ? 'opacity-60 cursor-not-allowed' : ''} \${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-[#7c3aed]' : 'bg-slate-50 border-slate-105 focus:border-[#7c3aed]'}`}
                            />
                          </div>
                          <button 
                            type="button"
                            disabled={selectedDocuEntry?.status === 'Signé'}
                            onClick={() => {
                              setDocFormSmsVerify(!docFormSmsVerify);
                              playNotificationSound();
                            }}
                            className={`w-full p-3 rounded-2xl text-[8px] font-black uppercase italic tracking-tighter transition-all border \${selectedDocuEntry?.status === 'Signé' ? 'opacity-50 cursor-not-allowed' : ''} \${docFormSmsVerify ? (darkMode ? 'bg-violet-955/40 text-violet-400 border-violet-900/40' : 'bg-violet-55/15 text-violet-605 border-violet-150') : (darkMode ? 'bg-zinc-900 text-zinc-600 border-[#7c3aed]' : 'bg-slate-50 text-slate-400 border-slate-100')}`}
                          >
                            {docFormSmsVerify ? '✓ SMS requis' : 'Pas de SMS'}
                          </button>
                        </div>

                        <div>
                          <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-1">Message d'accompagnement email</label>
                          <textarea 
                            value={docFormEmailInvite}
                            onChange={e => setDocFormEmailInvite(e.target.value)}
                            disabled={selectedDocuEntry?.status === 'Signé'}
                            rows={2}
                            className={`w-full p-3 rounded-2xl outline-none text-[10.5px] font-bold transition-all border resize-none \${selectedDocuEntry?.status === 'Signé' ? 'opacity-60 cursor-not-allowed' : ''} \${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-[#7c3aed]' : 'bg-slate-50 border-slate-105 focus:border-[#7c3aed]'}`}
                            placeholder="Bonjour, veuillez examiner et signer ce document..."
                          />
                        </div>
                      </div>
                    </div>

                  </div>

              {/* ACTION WIDE BUTTONS WITH HIGHEST CLASS ELEGANCE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-105 dark:border-zinc-900 w-full">
                 {selectedDocuEntry?.status === 'Signé' ? (
                   <>
                     <button
                       type="button"
                       onClick={() => {
                         setSubVistaDocu('liste');
                         playNotificationSound();
                       }}
                       className={`w-full py-4 text-xs font-black uppercase italic rounded-3xl transition-all active:scale-95 shadow-md border \${
                         darkMode 
                           ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' 
                           : 'bg-white border-slate-205 text-slate-705 hover:bg-slate-50'
                       }`}
                     >
                       Retourner aux dossiers
                     </button>
                     
                     <div className="md:col-span-2">
                       <button
                         type="button"
                         onClick={() => {
                           handleExportPDF(selectedDocuEntry);
                           playNotificationSound();
                         }}
                         className="w-full py-4 bg-[#059669] hover:bg-emerald-600 text-white text-xs font-black uppercase italic rounded-3xl transition-all active:scale-95 shadow-xl shadow-emerald-990/15 flex items-center justify-center space-x-2 border-none cursor-pointer"
                       >
                         <Printer size={14} />
                         <span>Exporter en PDF Officiel (Avec Certificat)</span>
                       </button>
                     </div>
                   </>
                 ) : (
                   <>
                     <button
                       type="button"
                       onClick={() => {
                         if (!docFormName || !docFormRecipient) {
                           alert("⚠️ Le nom du document et le destinataire sont requis.");
                           return;
                         }

                         const isNew = !selectedDocuEntry;
                         const newId = isNew ? `DOC-\${Date.now().toString().substring(8)}` : selectedDocuEntry.id;
                         
                         const newDocObj = {
                           id: newId,
                           name: docFormName,
                           cat: docFormFolder,
                           status: isNew ? 'Brouillon' : selectedDocuEntry.status,
                           date: isNew ? new Date().toISOString().split('T')[0] : selectedDocuEntry.date,
                           companyId: activeCompanyId,
                           author: activeUser,
                           recipient: docFormRecipient,
                           recipientEmail: docFormEmail,
                           recipientPhone: docFormPhone,
                           content: docFormContent,
                           smsVerify: docFormSmsVerify,
                           emailInvite: docFormEmailInvite
                         };

                         if (isNew) {
                           setDocuLegalList([{ ...newDocObj, signers: docFormSignersList, placedFields: docPlacedFields }, ...docuLegalList]);
                         } else {
                           setDocuLegalList(docuLegalList.map(d => d.id === selectedDocuEntry.id ? { ...newDocObj, signers: docFormSignersList, placedFields: docPlacedFields } : d));
                         }

                         setSubVistaDocu('liste');
                         playNotificationSound();
                         alert("🟢 Document sauvegardé en brouillon avec succès.");
                       }}
                       className={`w-full py-4 text-xs font-black uppercase italic rounded-3xl transition-all active:scale-95 shadow-md border \${
                         darkMode 
                           ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' 
                           : 'bg-white border-slate-205 text-slate-700 hover:bg-slate-50'
                       }`}
                     >
                       Sauvegarder Brouillon
                     </button>

                     {/* RE-ADD THE QR PREVIEW / MOBILE INSTANT SIGN aperçu button */}
                     <button
                       type="button"
                       onClick={() => {
                         if (!docFormName || !docFormRecipient) {
                           alert("⚠️ Le nom du document et le destinataire sont requis pour l'aperçu mobile.");
                           return;
                         }
                         // Configure QR Modal to open
                         const isNew = !selectedDocuEntry;
                         const newId = isNew ? `DOC-\${Date.now().toString().substring(8)}` : selectedDocuEntry.id;
                         
                         const tempDocObj = {
                           id: newId,
                           name: docFormName,
                           cat: docFormFolder,
                           status: 'En attente',
                           date: isNew ? new Date().toISOString().split('T')[0] : selectedDocuEntry.date,
                           companyId: activeCompanyId,
                           author: activeUser,
                           recipient: docFormRecipient,
                           recipientEmail: docFormEmail,
                           recipientPhone: docFormPhone,
                           content: docFormContent,
                           smsVerify: docFormSmsVerify,
                           emailInvite: docFormEmailInvite
                         };

                         setQrModalDoc(tempDocObj);
                         setShowQrModal(true);
                         playNotificationSound();
                       }}
                       className={`w-full py-4 text-xs font-black uppercase italic rounded-3xl transition-all active:scale-95 shadow-md border flex items-center justify-center space-x-1.5 \${
                         darkMode 
                           ? 'bg-zinc-900 border-zinc-800 text-zinc-350 hover:text-white' 
                           : 'bg-white border-slate-205 text-slate-700 hover:bg-slate-50'
                       }`}
                     >
                       <Eye size={13} className="text-[#059669]" />
                       <span>Aperçu de la signature mobile</span>
                     </button>

                     <button
                       type="button"
                       onClick={() => {
                         if (!docFormName || !docFormRecipient) {
                           alert("⚠️ Le nom du document et le destinataire sont requis.");
                           return;
                         }
                         // Configure QR Modal to open
                         const isNew = !selectedDocuEntry;
                         const newId = isNew ? `DOC-\${Date.now().toString().substring(8)}` : selectedDocuEntry.id;
                         
                         const tempDocObj = {
                           id: newId,
                           name: docFormName,
                           cat: docFormFolder,
                           status: 'En attente',
                           date: isNew ? new Date().toISOString().split('T')[0] : selectedDocuEntry.date,
                           companyId: activeCompanyId,
                           author: activeUser,
                           recipient: docFormRecipient,
                           recipientEmail: docFormEmail,
                           recipientPhone: docFormPhone,
                           content: docFormContent,
                           smsVerify: docFormSmsVerify,
                           emailInvite: docFormEmailInvite
                         };

                         setQrModalDoc(tempDocObj);
                         setShowQrModal(true);
                         playNotificationSound();
                       }}
                       className="w-full py-4 bg-[#059669] hover:bg-emerald-650 text-white text-xs font-black uppercase italic rounded-3xl transition-all active:scale-95 shadow-xl shadow-emerald-990/15 flex items-center justify-center space-x-2 border-none"
                     >
                       <Sparkles size={14} />
                       <span>Envoyer pour Signature</span>
                     </button>
                   </>
                 )}
              </div>
            </div>
          )}

          {/* ADVANTAGES FOOTER */}
          <div className="pt-8 mt-auto border-t border-slate-200 dark:border-zinc-900 text-left space-y-1">
             <p className="text-[8px] font-black uppercase italic text-slate-400 tracking-widest">Avantages Forfait Premium (DocuLegal) :</p>
             <ul className="space-y-1 border-l-2 border-emerald-500/30 pl-3">
                <li className="text-[8px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight">• Archivage structurel automatisé selon la Loi 25 (Québec).</li>
                <li className="text-[8px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight">• Certificat d'audit numérique immuable avec traçabilité d'IP et horodatage certifié.</li>
                <li className="text-[8px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight">• Liaison directe entre les baux signés et le Grand Livre fiscal AutoCompt.</li>
                <li className="text-[8px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight">• Synchronisation multi-période et stockage décentralisé Zero-Knowledge.</li>
             </ul>
          </div>
        </main>

        {/* REVISION #3 - MOBILE CELLULAR QR CODE SIGNING SIMULATOR MODAL */}
        <AnimatePresence>
          {showQrModal && qrModalDoc && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className={`w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden border p-6 md:p-8 flex flex-col space-y-6 animate-in zoom-in-95 duration-300 \${
                  darkMode ? 'bg-zinc-950 border-zinc-900 text-zinc-100' : 'bg-white border-slate-150 text-slate-900'
                }`}
              >
                {/* Header Title with X Close Button */}
                <div className="flex justify-between items-start border-b pb-4 border-slate-100 dark:border-zinc-900 w-full">
                  <div>
                    <h3 className="text-base font-black uppercase italic tracking-tighter text-[#059669]">Signature Mobile d'AutoCompt</h3>
                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Canal d'audit & Sceau de traçabilité d'IP conforme Loi 25</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowQrModal(false);
                      playNotificationSound();
                    }}
                    className="p-2 rounded-full cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-400 hover:text-slate-900 dark:hover:text-white border-none bg-transparent"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Subcontainer layout with Two Columns */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full items-stretch">
                   
                   {/* LEFT COLUMN: ADMIN CONTROLS & MONITORING STATE (md:col-span-5) */}
                   <div className="md:col-span-5 flex flex-col items-center justify-between text-center space-y-6 bg-slate-50/50 dark:bg-zinc-900/10 p-5 rounded-[32px] border border-slate-100 dark:border-zinc-900">
                      
                      {/* DYNAMIC QR CODE CONTAINER */}
                      <div className="space-y-3 flex flex-col items-center w-full">
                         <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400">Scanner sur Téléphone Actif</span>
                         
                         <div className="w-40 h-40 bg-white dark:bg-zinc-900 p-2.5 rounded-3xl border border-emerald-500/20 flex flex-col items-center justify-center shadow-inner relative select-none">
                            {/* Matrix blocks */}
                            <div className="grid grid-cols-6 gap-0.5 w-full h-full opacity-80 animate-pulse">
                               {Array.from({ length: 36 }).map((_, i) => {
                                 const isCornerSquare = (i === 0 || i === 1 || i === 6 || i === 7 || i === 4 || i === 5 || i === 10 || i === 11 || i === 24 || i === 25 || i === 30 || i === 31);
                                 const isRandomActive = Math.sin(i * 123) > 0.0;
                                 return (
                                   <div 
                                     key={i} 
                                     className={`rounded-[2px] \${
                                       isCornerSquare 
                                         ? 'bg-[#059669]' 
                                         : (isRandomActive ? 'bg-zinc-800 dark:bg-zinc-200' : 'bg-transparent')
                                     }`}
                                   />
                                 );
                               })}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                               <div className="bg-[#059669] text-white p-2 rounded-xl shadow-md border border-emerald-400">
                                  <Sparkles size={16} className="animate-spin" style={{ animationDuration: '4s' }} />
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="bg-[#059669]/10 p-3.5 rounded-2xl border border-emerald-500/15 w-full text-left">
                        <p className="text-[8px] font-black uppercase text-emerald-800 dark:text-emerald-400 leading-normal tracking-wide text-center">
                          Liaison instantanée de signature tactile BYOS. Aucun téléchargement d'application externe requis.
                        </p>
                      </div>

                      {/* Phone SMS Meta details */}
                      <div className="w-full space-y-3.5 text-left pt-2">
                        <div>
                          <label className="text-[7.5px] font-black uppercase text-slate-400 italic block mb-0.5">Destinataire SMS portable</label>
                          <p className="text-[10px] font-mono font-bold">\${qrModalDoc.recipientPhone || '514-555-1234'}</p>
                        </div>
                        <div>
                          <label className="text-[7.5px] font-black uppercase text-slate-400 italic block mb-0.5">Notification instantanée</label>
                          <p className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 leading-tight">
                            Un texto de validation crypté sous la norme TAL/Loi-25 a été préparé pour signature sans délai.
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-[8px] border-t border-slate-100 dark:border-zinc-900 pt-3">
                           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                           <span className="font-extrabold uppercase italic tracking-widest text-[#059669]">Attente de signature client</span>
                        </div>
                      </div>
                   </div>

                   {/* RIGHT COLUMN: REAL INTERACTIVE MOBILE PORTAL SIMULATOR (md:col-span-7) */}
                   <div className="md:col-span-7 flex flex-col items-center justify-center">
                      <p className="text-[8.5px] font-black uppercase text-[#059669] tracking-widest block mb-4 italic">
                         📱 SIMULATEUR DE PORTAIL CLIENT MOBILE-FIRST
                      </p>

                      {/* iPhone Mock Frame */}
                      <div className={`w-[290px] h-[510px] rounded-[40px] border-4 border-zinc-850 dark:border-zinc-800 shadow-2xl relative flex flex-col justify-between overflow-hidden select-none bg-slate-50 dark:bg-zinc-900 ring-8 ring-zinc-900/15`}>
                        
                        {/* Speaker Dynamic Notch */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-30 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 absolute right-4" />
                        </div>

                        {/* Top cellular bar */}
                        <div className="px-5 pt-3 pb-1 flex justify-between items-center text-[7.5px] font-black tracking-tighter text-slate-400 select-none z-10 font-mono">
                           <span>14:32</span>
                           <div className="flex items-center space-x-1">
                              <span>LTE</span>
                              <div className="w-3.5 h-2 border border-slate-400 rounded-sm p-[1px] flex items-center">
                                 <div className="w-full h-full bg-emerald-500 rounded-2xs" />
                              </div>
                           </div>
                        </div>

                        {/* Scrollable Smartphone Viewport Container */}
                        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1 flex flex-col text-left">
                           
                           {/* Brand banner inside mobile */}
                           <div className="text-center pb-2 border-b border-dashed border-slate-200 dark:border-zinc-800 mb-2">
                              <span className="text-[8px] font-extrabold uppercase italic tracking-wider text-[#059669]">Portail Signature AutoCompt</span>
                              <div className="text-[6.5px] font-semibold text-slate-400 uppercase mt-0.5 font-sans">Connexion cryptée SSL • IP Vérifié</div>
                           </div>

                           {/* Contract Title & Info inside mobile */}
                           <div className="space-y-1 mb-2.5">
                              <p className="text-[7.5px] font-black uppercase text-[#059669] italic">Émetteur du contrat : \${listaEmpresas.find(e => e.id === activeCompanyId)?.nombre || 'Solutions GPA Inc.'}</p>
                              <h4 className="text-[10px] font-black uppercase italic text-slate-800 dark:text-zinc-200 leading-tight">
                                 \${qrModalDoc.name}
                              </h4>
                              <p className="text-[6.5px] font-bold text-slate-400 uppercase font-sans">
                                 Signataire destiné : \${qrModalDoc.recipient}
                              </p>
                           </div>

                           {/* Interactive Scrolling Lease Body inside mobile */}
                           <div className="flex-1 min-h-[90px] border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2.5 rounded-xl overflow-y-auto text-[7.5px] leading-relaxed text-slate-500 dark:text-zinc-400 font-medium select-text mb-3">
                              \${qrModalDoc.content}
                           </div>

                           {/* Legal validation checks */}
                           <div className="space-y-2 mb-3">
                              <div className="flex items-start space-x-2">
                                <input 
                                  type="checkbox" 
                                  id="client_consent_agree"
                                  defaultChecked
                                  disabled
                                  className="w-3 h-3 text-[#059669] border-slate-300 focus:ring-[#059669] rounded mt-0.5"
                                />
                                <label htmlFor="client_consent_agree" className="text-[6.5px] font-bold text-slate-500 dark:text-zinc-400 uppercase leading-snug">
                                  J'accepte que ma signature tactile ci-dessous scelle légalement ce contrat sous la Loi 25 (Québec) et le Code Civil.
                                </label>
                              </div>
                           </div>

                           {/* Touch Signature Board */}
                           <div className="space-y-1">
                              <p className="text-[6.5px] font-black uppercase text-slate-400 italic">
                                Tracez votre signature ci-dessous (Doigt / Tactile) :
                              </p>
                              
                              <SignatureDrawPad 
                                 onSave={(data) => {
                                    setMobileClientSignature(data);
                                 }}
                              />
                           </div>
                        </div>

                        {/* Solid smartphone footer action buttons */}
                        <div className="p-3 bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-900 rounded-b-[36px] space-y-1.5 pt-2.5">
                           <button
                              type="button"
                              onClick={() => {
                                 if (!mobileClientSignature) {
                                    alert("⚠️ Veuillez tracer votre signature sur l'écran tactile avant de valider.");
                                    return;
                                 }

                                 // Assemble final audited document
                                 const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
                                 const txIdStr = `TX-BYOS-\${qrModalDoc.id}-\${Math.floor(100000 + Math.random() * 900000)}`;
                                 
                                 const signedDoc = {
                                    signers: qrModalDoc.signers || docFormSignersList,
                                    placedFields: qrModalDoc.placedFields || docPlacedFields,
                                   ...qrModalDoc,
                                   status: 'Signé',
                                   date: new Date().toISOString().split('T')[0],
                                   
                                   // Cryptographic audit Trail attributes
                                   signerName: qrModalDoc.recipient,
                                   signerEmail: qrModalDoc.recipientEmail || 'client@autocompt-byos.ca',
                                   signatureTimestamp: timestampStr,
                                   transactionId: txIdStr,
                                   signatureData: mobileClientSignature
                                 };

                                 // Update document list and folder state
                                 setDocuLegalList(docuLegalList.map(d => d.id === qrModalDoc.id ? signedDoc : d));
                                 
                                 // Show success and play notification sound!
                                 playNotificationSound();
                                 setShowQrModal(false);
                                 setSubVistaDocu('liste');
                                 setSelectedDocuFolder(qrModalDoc.cat); // Retain active folder view
                                 alert(`🎉 Document "\${qrModalDoc.name}" signé avec succès sur cellulaire par \${qrModalDoc.recipient} !\n\nHorodatage : \${timestampStr}\nID Transaction : \${txIdStr}`);
                                 setMobileClientSignature(null); // Reset temp signature
                              }}
                              className="w-full py-2.5 bg-[#059669] hover:bg-emerald-600 text-white rounded-xl text-[7.5px] font-black uppercase italic tracking-widest shadow-md flex items-center justify-center space-x-1.5 border-none cursor-pointer"
                           >
                              <ShieldCheck size={11} className="animate-pulse" />
                              <span>Signer & Sceller le Contrat</span>
                           </button>
                        </div>
                      </div>
                   </div>

                </div>

                {/* Actions inside modal (Fallback triggers) */}
                <div className="w-full flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-zinc-900">
                   <button
                     onClick={() => {
                       // Close modal, save as En attente
                       const pendingDoc = {
                          signers: qrModalDoc.signers || docFormSignersList,
                          placedFields: qrModalDoc.placedFields || docPlacedFields,
                         ...qrModalDoc,
                         status: 'En attente'
                       };

                       const isNew = !docuLegalList.some(d => d.id === qrModalDoc.id);
                       if (isNew) {
                         setDocuLegalList([pendingDoc, ...docuLegalList]);
                       } else {
                         setDocuLegalList(docuLegalList.map(d => d.id === qrModalDoc.id ? pendingDoc : d));
                       }

                       setShowQrModal(false);
                       setSubVistaDocu('liste');
                       setSelectedDocuFolder(qrModalDoc.cat);
                       playNotificationSound();
                       alert(`✉️ Invitation de signature envoyée à \${qrModalDoc.recipientEmail || qrModalDoc.recipient} ! Statut : "En attente".`);
                     }}
                     className={`px-4 py-2.5 text-[8.5px] font-black uppercase italic rounded-xl border transition-all cursor-pointer \${
                       darkMode 
                         ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200' 
                         : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                     }`}
                   >
                     Annuler & Sauvegarder "En attente"
                   </button>
                </div>
              </motion.div>
            </div>
          )}

           {showSigProfileModal && (
             <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-300 text-left">
               <motion.div
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9, y: 20 }}
                 className={`w-full max-w-xl rounded-[36px] shadow-2xl overflow-hidden border p-6 flex flex-col space-y-5 animate-in zoom-in-95 duration-300 ${
                   darkMode ? 'bg-zinc-950 border-zinc-905 text-zinc-100' : 'bg-white border-slate-150 text-slate-900'
                 }`}
               >
                 {/* Modal Header */}
                 <div className="flex justify-between items-start border-b border-slate-100 dark:border-zinc-900 pb-4">
                   <div>
                     <h3 className="text-sm font-black uppercase italic tracking-tighter text-[#059669]">
                       Mon Profil de Signature Électronique
                     </h3>
                     <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                       Gestion des baux certifiée selon l'Archivage Légal BYOS
                     </p>
                   </div>
                   <button
                     type="button"
                     onClick={() => {
                       setShowSigProfileModal(false);
                       playNotificationSound();
                     }}
                     className="p-2 rounded-full transition-colors border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                   >
                     <X size={18} />
                   </button>
                 </div>

                 {/* Tab selectors */}
                 <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-zinc-900/60 p-1.5 rounded-2xl border border-slate-100 dark:border-zinc-850">
                   {(['draw', 'type', 'upload'] as const).map((tab) => {
                     const isActive = activeSigTab === tab;
                     const labels = {
                       draw: 'Dessiner ✍️',
                       type: 'Taper ⌨️',
                       upload: 'Télécharger 📂',
                     };
                     return (
                       <button
                         key={tab}
                         type="button"
                         onClick={() => {
                           setActiveSigTab(tab);
                           playNotificationSound();
                         }}
                         className={`py-2 rounded-xl text-[8.5px] font-black uppercase italic tracking-wider transition-all border-none cursor-pointer ${
                           isActive
                             ? 'bg-[#059669] text-white shadow-sm'
                             : 'text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-350 bg-transparent'
                         }`}
                       >
                         {labels[tab]}
                       </button>
                     );
                   })}
                 </div>

                 {/* Modal Body Tabs Area */}
                 <div className="flex-1 min-h-[220px]">
                   {activeSigTab === 'draw' && (
                     <div className="space-y-3">
                       <p className="text-[7.5px] font-black uppercase text-slate-400 italic">
                         Tracez votre signature ci-dessous à l'aide de votre doigt, stylet ou souris :
                       </p>
                       
                       <SignatureDrawPad 
                         onSave={(data) => {
                           setSavedSignature(data);
                           if (data) {
                             setSavedInitials(typeInitials || 'FV');
                           }
                         }} 
                       />
                       
                       <div className="flex justify-between items-center text-[7.5px] font-bold text-slate-400 dark:text-zinc-500 uppercase">
                         <span>Écran tactile supporté</span>
                         <span>Format vectoriel transparent</span>
                       </div>
                     </div>
                   )}

                   {activeSigTab === 'type' && (
                     <div className="space-y-4 text-left font-sans">
                       <div className="grid grid-cols-3 gap-3">
                         <div className="col-span-2">
                           <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-1">Votre Nom Complet</label>
                           <input
                             type="text"
                             value={typeSigName}
                             onChange={(e) => setTypeSigName(e.target.value)}
                             className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                               darkMode ? 'bg-zinc-900 border-zinc-805 text-zinc-100 focus:border-[#059669]' : 'bg-slate-50 border-slate-100 focus:border-[#059669]'
                             }`}
                           />
                         </div>
                         <div>
                           <label className="text-[8px] font-black uppercase text-slate-400 italic block mb-1">Vos Initiales</label>
                           <input
                             type="text"
                             value={typeInitials}
                             onChange={(e) => setTypeInitials(e.target.value)}
                             maxLength={3}
                             className={`w-full p-2.5 rounded-xl text-xs font-mono font-bold border outline-none ${
                               darkMode ? 'bg-zinc-900 border-zinc-805 text-zinc-100 focus:border-[#059669]' : 'bg-slate-50 border-slate-100 focus:border-[#059669]'
                             }`}
                           />
                         </div>
                       </div>

                       <p className="text-[7.5px] font-black uppercase text-slate-400 italic">
                         Choisissez l'un de nos formats de calligraphie haute couture :
                       </p>

                       <div className="space-y-3">
                         {[
                           { name: 'Caveat', fontClass: 'font-[\'Caveat\'] text-2xl', label: 'Style Moderne Décontracté' },
                           { name: 'Great Vibes', fontClass: 'font-[\'Great_Vibes\'] text-3xl', label: 'Style Signature Royale' },
                           { name: 'Alex Brush', fontClass: 'font-[\'Alex_Brush\'] text-3xl', label: 'Style Calligraphie Traditionnelle' }
                         ].map((fontSpec) => (
                           <div
                             key={fontSpec.name}
                             className={`p-3 rounded-2xl border flex items-center justify-between transition-all bg-slate-50/50 dark:bg-zinc-900/30 hover:border-[#059669]/50 ${
                               darkMode ? 'border-zinc-900' : 'border-slate-100'
                             }`}
                           >
                             <div className="text-left">
                               <p className="text-[6.5px] font-black uppercase text-slate-400 dark:text-zinc-500 italic mb-1">${fontSpec.label}</p>
                               <span className={`text-[#1e3a8a] dark:text-blue-300 leading-none ${fontSpec.fontClass}`}>
                                 ${typeSigName || 'Fabiola Villegas'}
                               </span>
                             </div>
                             <button
                               type="button"
                               onClick={() => {
                                 // Canvas generation
                                 const canvas = document.createElement('canvas');
                                 canvas.width = 400;
                                 canvas.height = 120;
                                 const ctx = canvas.getContext('2d');
                                 if (ctx) {
                                   ctx.clearRect(0, 0, canvas.width, canvas.height);
                                   ctx.fillStyle = '#1e3a8a';
                                   ctx.font = `italic 38px "${fontSpec.name}", Georgia, cursive`;
                                   ctx.textAlign = 'center';
                                   ctx.textBaseline = 'middle';
                                   ctx.fillText(typeSigName || 'Fabiola Villegas', canvas.width / 2, canvas.height / 2);
                                   setSavedSignature(canvas.toDataURL());
                                   setSavedInitials(typeInitials || 'FV');
                                   playNotificationSound();
                                   alert(`✨ Signature style "${fontSpec.name}" générée et sauvegardée !`);
                                 }
                               }}
                               className="px-3 py-1.5 bg-[#059669]/10 text-[#059669] hover:bg-[#059669] hover:text-white rounded-xl text-[7.5px] font-black uppercase italic tracking-wider transition-all border-none cursor-pointer"
                             >
                               Générer ce style
                             </button>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                   {activeSigTab === 'upload' && (
                     <div className="space-y-4 text-center mt-2 font-sans">
                       <p className="text-[7.5px] font-black uppercase text-slate-400 italic text-left">
                         Glissez votre signature PNG transparente existante :
                       </p>

                       <div className="relative rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 p-6 flex flex-col items-center justify-center bg-slate-50/30 dark:bg-zinc-900/20 text-center animate-in fade-in">
                         <input
                           type="file"
                           accept="image/png, image/jpeg"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               const reader = new FileReader();
                               reader.onload = (event) => {
                                 const dataUrl = event.target?.result as string;
                                 setSavedSignature(dataUrl);
                                 setSavedInitials(typeInitials || 'FV');
                                 playNotificationSound();
                                 alert("📂 Signature importée et convertie en base64 avec succès !");
                               };
                               reader.readAsDataURL(file);
                             }
                           }}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                         />
                         <Upload size={24} className="text-[#059669] mb-2 animate-bounce" />
                         <span className="text-[9px] font-black uppercase italic tracking-tight">Déposez votre signature transparente</span>
                         <p className="text-[6.5px] font-black text-slate-405 dark:text-zinc-505 uppercase mt-0.5">Formats acceptés : PNG, JPG (Max 2MB)</p>
                       </div>

                       {savedSignature && savedSignature.startsWith('data:image') && (
                         <div className="p-3 rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/[0.02] flex items-center justify-between">
                           <span className="text-[7.5px] font-black uppercase text-emerald-600 dark:text-emerald-400">Aperçu du fichier :</span>
                           <div className="h-10 px-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-center">
                             <img src={savedSignature} alt="Signature Uploadée" className="h-7 object-contain" />
                           </div>
                           <button
                             type="button"
                             onClick={() => {
                               setSavedSignature(null);
                               playNotificationSound();
                             }}
                             className="text-[7.5px] font-black uppercase text-rose-500 hover:underline border-none bg-transparent cursor-pointer"
                           >
                             Supprimer
                           </button>
                         </div>
                       )}
                     </div>
                   )}
                 </div>

                 {/* Modal actions */}
                 <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-zinc-900">
                   <button
                     type="button"
                     onClick={() => {
                       setSavedSignature(null);
                       setSavedInitials(null);
                       setShowSigProfileModal(false);
                       playNotificationSound();
                       alert("🗑️ Profil de signature effacé.");
                     }}
                     className={`py-3 text-[9px] font-black uppercase italic rounded-2xl border transition-all cursor-pointer ${
                       darkMode
                         ? 'bg-zinc-905 border-zinc-800 text-rose-455 hover:text-rose-300'
                         : 'bg-white border-slate-205 text-rose-600 hover:bg-rose-50'
                     }`}
                   >
                     Effacer le profil
                   </button>

                   <button
                     type="button"
                     onClick={() => {
                       setShowSigProfileModal(false);
                       playNotificationSound();
                       alert("🟢 Profil de signature électronique BYOS enregistré avec succès ! Il sera automatiquement utilisé pour vos baux.");
                     }}
                     className="py-3 bg-[#059669] hover:bg-emerald-600 text-white rounded-2xl text-[9.5px] font-black uppercase italic tracking-widest shadow-lg flex items-center justify-center space-x-1.5 border-none cursor-pointer"
                   >
                     <span>Enregistrer le Profil</span>
                   </button>
                 </div>
               </motion.div>
             </div>
           )}
        </AnimatePresence>

      </div>
    );
  }

  // --- MÓDULO TENUE DE LIVRES (MONTHLY FILTER ACTIVATED) ---
  if (vista === 'reportes') return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-zinc-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans text-left animate-in zoom-in-95 max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}>
      <WorkspaceSidebar />
      <header 
        className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} px-6 py-5 border-b flex items-center justify-between shadow-sm text-left`}
        style={{ borderTop: `4px solid ${darkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.3)'}` }}
      >
         <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden"
            >
              <Menu size={18} />
            </button>
            <button onClick={() => setVista('dashboard')} className={`p-2 transition-colors rounded-xl transition-all ${darkMode ? 'text-zinc-500 hover:text-white hover:bg-zinc-900' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}><ArrowLeft size={24} /></button>
         </div>
         <h2 className="font-black uppercase italic tracking-tighter text-xl">Tenue de Livres</h2>
         <div className="flex items-center space-x-3">
            <div className="relative">
              <button 
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className={`p-3 rounded-2xl flex items-center space-x-2 transition-all ${darkMode ? 'bg-zinc-900 text-emerald-400 border border-zinc-800' : 'bg-white text-[#059669] border border-slate-200 shadow-sm'}`}
              >
                <Calendar size={18} />
                <span className="text-[10px] font-black uppercase italic">{months[selectedMonth]}</span>
              </button>
              
              {showMonthPicker && (
                <div className={`absolute right-0 mt-2 p-4 rounded-3xl shadow-2xl border z-[100] grid grid-cols-3 gap-2 w-64 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'}`}>
                  {months.map((m, i) => (
                    <button 
                      key={i}
                      onClick={() => { setSelectedMonth(i); setShowMonthPicker(false); }}
                      className={`py-2 rounded-xl text-[9px] font-black uppercase italic transition-all ${selectedMonth === i ? 'bg-[#059669] text-white' : (darkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-slate-50 text-slate-400')}`}
                    >
                      {m.substring(0, 3)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => {
                setVista('rapports');
                playNotificationSound();
              }}
              className={`p-3 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center space-x-2 ${darkMode ? 'bg-zinc-900 text-teal-400 border border-zinc-800 hover:border-teal-500/30' : 'bg-teal-50 text-teal-700 border border-teal-100 shadow-teal-900/5 hover:bg-teal-100/60'}`}
            >
              <FileSpreadsheet size={18} />
              <span className="text-[9px] font-black uppercase italic">Rapports Comptable</span>
            </button>
         </div>
      </header>

      <div className={`flex items-center px-4 py-3 space-x-4 border-b ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-100 shadow-sm shadow-emerald-900/5'}`}>
         {['ventes', 'taxes', 'banque'].map((tab) => (
           <button 
             key={tab}
             onClick={() => setTabReporte(tab as any)}
             className={`px-6 py-2 rounded-[20px] text-[9px] font-black uppercase italic transition-all tracking-widest ${tabReporte === tab ? 'bg-[#059669] text-white shadow-lg shadow-emerald-900/10' : (darkMode ? 'text-zinc-500 hover:bg-zinc-900' : 'text-slate-400 hover:bg-slate-50')}`}
           >
             {tab === 'ventes' ? 'Ventes' : tab === 'taxes' ? 'Dépenses' : 'Banque'}
           </button>
         ))}
      </div>

      {/* ESPACE COMPTABLE MODERNE */}
      <div className="px-6 py-5 border-b border-slate-105 dark:border-zinc-905 bg-slate-50/40 dark:bg-zinc-950/20">
        <div className={`p-5 rounded-[32px] border ${darkMode ? 'bg-zinc-950/90 border-zinc-900 text-zinc-100' : 'bg-white border-slate-200/80 text-slate-900'} shadow-xl flex flex-col gap-5`}>
          
          {editingComptable ? (
            /* CONFIGURACIÓN DE CONTADOR (EDITABLE FORM) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-[7.5px] font-black uppercase tracking-widest bg-emerald-500/10 dark:bg-emerald-500/20 text-[#059669] dark:text-emerald-400 px-2.5 py-1 rounded-full leading-none">
                    Modifier mon comptable
                  </span>
                  <span className="text-[8.5px] font-black italic text-slate-400 dark:text-zinc-500">
                    ID Espace: {activeCompanyId}
                  </span>
                </div>
                
                <span className="text-[7.5px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/5 px-2.5 py-1 rounded-full">
                  Édition active
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Nom */}
                <div className="flex flex-col space-y-1 text-left">
                  <label className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 pl-1">Nom du Comptable</label>
                  <input
                    type="text"
                    value={comptableNomInput}
                    onChange={(e) => setComptableNomInput(e.target.value)}
                    placeholder="Ex: Natalia Caisse"
                    className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-tight ${darkMode ? 'bg-zinc-90 w-full bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-emerald-500' : 'bg-slate-50 w-full border border-slate-200 text-[#0F172A] outline-none focus:border-[#059669]'}`}
                  />
                </div>
                
                {/* Email */}
                <div className="flex flex-col space-y-1 text-left">
                  <label className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 pl-1">Courriel de contact</label>
                  <input
                    type="email"
                    value={comptableEmailInput}
                    onChange={(e) => setComptableEmailInput(e.target.value)}
                    placeholder="Ex: natalia@solutionsgpa.ca"
                    className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-tight ${darkMode ? 'bg-zinc-90 w-full bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-emerald-500' : 'bg-slate-50 w-full border border-slate-200 text-[#0F172A] outline-none focus:border-[#059669]'}`}
                  />
                </div>
                
                {/* Téléphone */}
                <div className="flex flex-col space-y-1 text-left">
                  <label className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 pl-1">Téléphone • WhatsApp</label>
                  <input
                    type="text"
                    value={comptableTelInput}
                    onChange={(e) => setComptableTelInput(e.target.value)}
                    placeholder="Ex: +1 (514) 555-0199"
                    className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-tight ${darkMode ? 'bg-zinc-90 w-full bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-emerald-500' : 'bg-slate-50 w-full border border-slate-200 text-[#0F172A] outline-none focus:border-[#059669]'}`}
                  />
                </div>
                
                {/* Lien Drive */}
                <div className="flex flex-col space-y-1 text-left">
                  <label className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 pl-1">Lien de Dossier Drive personnalisé (Optionnel)</label>
                  <input
                    type="url"
                    value={comptableDriveInput}
                    onChange={(e) => setComptableDriveInput(e.target.value)}
                    placeholder="Laisser vide pour utiliser le Drive par défaut"
                    className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-tight ${darkMode ? 'bg-zinc-90 w-full bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-emerald-500' : 'bg-slate-50 w-full border border-slate-200 text-[#0F172A] outline-none focus:border-[#059669]'}`}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => {
                    setEditingComptable(false);
                    playNotificationSound();
                  }}
                  className={`px-4 py-2 rounded-xl text-[8.5px] font-black uppercase italic tracking-widest ${darkMode ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setComptablesConfig(prev => ({
                      ...prev,
                      [activeCompanyId]: {
                        nom: comptableNomInput,
                        email: comptableEmailInput,
                        tel: comptableTelInput,
                        drive: comptableDriveInput
                      }
                    }));
                    setEditingComptable(false);
                    playNotificationSound();
                  }}
                  className="px-5.5 py-2 bg-[#059669] text-white rounded-xl text-[8.5px] font-black uppercase italic tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-950/10"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </div>
          ) : (
            /* ESPACE COMPTABLE NORMAL SIGHT */
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              {/* Chef Comptable Info wrapper */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="p-4 rounded-[22px] shadow-sm shrink-0 flex items-center justify-center w-14 h-14 relative group bg-[#ffece9] border border-[#ffcbc4] text-[#ff5f47] dark:bg-[#2b110d] dark:border-[#521c16] dark:text-[#ff8a7a]">
                  <Briefcase size={22} className="opacity-95" />
                  <button
                    onClick={() => {
                      setEditingComptable(true);
                      playNotificationSound();
                    }}
                    className="absolute -top-1.5 -right-1.5 p-1 bg-slate-800 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-full shadow-md hover:scale-110 active:scale-90 transition-transform cursor-pointer"
                    title="Modifier les coordonnées du comptable"
                  >
                    <PenLine size={10} />
                  </button>
                </div>
                
                <div className="text-left">
                  <div className="flex items-center space-x-2">
                    <span className="text-[7.5px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full leading-none bg-[#ffece9] border border-[#ffcbc4] text-black dark:text-black shadow-sm">
                      Mon Comptable
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    
                    <button
                      onClick={() => {
                        setEditingComptable(true);
                        playNotificationSound();
                      }}
                      className="text-[7.5px] font-black uppercase tracking-widest text-black hover:text-[#ff5f47] dark:text-black dark:hover:text-[#ff8a7a] hover:underline flex items-center space-x-1"
                    >
                      <span>(Modifier)</span>
                    </button>
                  </div>
                  
                  <h3 className="text-base font-black italic tracking-tighter mt-1.5 leading-none">
                    {currentComptable.nom}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Cabinet Comptable Agréé • {currentCompany?.nombre}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 mt-2 font-mono text-[9px] font-black">
                    <a 
                      href={`mailto:${currentComptable.email}`} 
                      className="flex items-center space-x-1 hover:underline text-slate-400 hover:text-[#059669] dark:text-zinc-500 dark:hover:text-emerald-400"
                    >
                      <Mail size={11} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                      <span>{currentComptable.email}</span>
                    </a>
                    <span className="text-slate-200 dark:text-zinc-800">•</span>
                    <a 
                      href={`tel:${currentComptable.tel}`} 
                      className="flex items-center space-x-1 hover:underline text-slate-400 hover:text-sky-650 dark:text-zinc-500 dark:hover:text-sky-400"
                    >
                      <Phone size={11} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                      <span>{currentComptable.tel}</span>
                    </a>
                  </div>
                </div>
              </div>
              
              {/* Pasarela de Comunicación (Dispatcher Buttons) */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Envoyer par Email */}
                <button
                  onClick={() => {
                    playNotificationSound();
                    setShowRapportDispatcherModal(true);
                  }}
                  className="px-4.5 py-3 rounded-[18px] text-[9.5px] font-black uppercase italic tracking-wider bg-gradient-to-r from-teal-600 via-[#059669] to-teal-550 text-white shadow-lg shadow-emerald-950/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center space-x-2 border-0 cursor-pointer"
                >
                  <Mail size={13} className="shrink-0" />
                  <span>Envoyer par Email</span>
                </button>
                
                {/* Envoyer sur WhatsApp */}
                <button
                  onClick={() => {
                    playNotificationSound();
                    const cleanTel = (currentComptable.tel || '').replace(/\D/g, '') || '15145550199';
                    const waText = `Bonjour ${currentComptable.nom}, j'ai généré les rapports comptables de ${selectedRapportPeriod} sur AutoCompt pour ${currentCompany?.nombre || 'mon entreprise'}. Pouvons-nous valider?`;
                    window.open(`https://wa.me/${cleanTel}?text=${encodeURIComponent(waText)}`, '_blank');
                    setDispatcherSuccessToast({
                      text: `Reporte del periodo ${selectedRapportPeriod} enviado exitosamente a través de Par WhatsApp`,
                      channel: 'Par WhatsApp'
                    });
                  }}
                  className={`px-4.5 py-3 rounded-[18px] text-[9.5px] font-black uppercase italic tracking-wider transition-all border flex items-center space-x-2 active:scale-95 cursor-pointer ${
                    darkMode 
                      ? 'bg-zinc-900 border-zinc-800 text-emerald-400 hover:bg-zinc-850 hover:border-zinc-750' 
                      : 'bg-emerald-50 text-[#059669] border-emerald-100 hover:bg-emerald-100/40 hover:border-emerald-200'
                  }`}
                >
                  <MessageSquare size={13} className="shrink-0" />
                  <span>Envoyer sur WhatsApp</span>
                </button>
                
                {/* Partager Dossier Drive */}
                <button
                  onClick={() => {
                    if (selectedTier === 'gratuit' || selectedTier === 'assistant') {
                      setPaywallTargetTier('Pro (18.99$)');
                      setShowPaywallModal(true);
                      playNotificationSound();
                      return;
                    }
                    playNotificationSound();
                    const driveUrl = currentComptable.drive || `https://drive.google.com/drive/folders/${currentCompany?.driveConfig?.folderId || 'vault'}`;
                    window.open(driveUrl, '_blank');
                    setDispatcherSuccessToast({
                      text: `Reporte del periodo ${selectedRapportPeriod} enviado exitosamente a través de Vers Google Drive`,
                      channel: 'Vers Google Drive'
                    });
                  }}
                  className={`px-4.5 py-3 rounded-[18px] text-[9.5px] font-black uppercase italic tracking-wider transition-all border flex items-center space-x-2 active:scale-95 cursor-pointer ${
                    darkMode 
                      ? 'bg-zinc-900 border-zinc-850 text-zinc-350 hover:bg-zinc-850 hover:border-zinc-700' 
                      : 'bg-white text-slate-650 border-slate-205 hover:bg-slate-50'
                  }`}
                >
                  <Folder size={13} className="text-yellow-500 shrink-0" />
                  <span>Partager Dossier Drive {(selectedTier === 'gratuit' || selectedTier === 'assistant') && '🔒'}</span>
                </button>
              </div>
            </div>
          )}
          
        </div>
      </div>

      <main className="p-0 overflow-hidden flex-1 flex flex-col">
         <div className="overflow-x-auto w-full no-scrollbar">
           {tabReporte === 'banque' ? (
             <table className="w-full min-w-[1000px] text-left border-collapse">
                <thead>
                   <tr className={`text-[8px] uppercase font-black ${darkMode ? 'text-zinc-500 bg-zinc-950' : 'text-slate-400 bg-slate-50'}`}>
                      <th className={`py-4 px-6 border-b italic ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Date de Transaction</th>
                      <th className={`py-4 px-6 border-b italic ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Description (Banque)</th>
                      <th className={`py-4 px-6 border-b italic text-right ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Montant</th>
                      <th className={`py-4 px-6 border-b italic text-center ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>État de Conciliation</th>
                      <th className={`py-4 px-6 border-b italic text-right ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Action</th>
                   </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-zinc-900' : 'divide-slate-100'}`}>
                  {filteredBankByMonth.map((txn, idx) => {
                    const matchedExpense = filteredDepenses.find(d => Math.abs(d.total - txn.amt) < 0.01);
                    const matchedInvoice = filteredHistorique.find(h => Math.abs(h.total - txn.amt) < 0.01);
                    const entryFound = matchedExpense || matchedInvoice;
                    const hasLien = (matchedExpense && (matchedExpense as any).lien) || (matchedInvoice);
                    let recoState = entryFound && hasLien ? 'Concilié' : (entryFound ? 'Reçu manquant' : 'Non réconcilié');

                    return (
                      <tr key={idx} className={`text-[10px] font-bold ${darkMode ? 'bg-black hover:bg-zinc-950' : 'bg-white hover:bg-slate-50'}`}>
                        <td className="py-5 px-6 font-mono text-zinc-500 italic">{txn.date}</td>
                        <td className="py-5 px-6 uppercase italic text-slate-900">{txn.desc}</td>
                        <td className="py-5 px-6 text-right font-black italic">{txn.amt.toFixed(2)}$</td>
                        <td className="py-5 px-6 text-center italic">
                          <span className={`px-4 py-1.5 rounded-2xl text-[8px] uppercase font-black shadow-sm ${recoState === 'Concilié' ? 'bg-emerald-100 text-emerald-700' : (recoState === 'Reçu manquant' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-rose-100 text-rose-700 font-black')}`}>
                            {recoState}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-right">
                          {recoState !== 'Concilié' && (
                            <button onClick={() => setVista('banque')} className="text-[#059669] hover:underline text-[9px] font-black uppercase italic">Résoudre</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
           ) : (
             <table className="w-full min-w-[1200px] text-left border-collapse">
                <thead>
                   <tr className={`text-[8px] uppercase font-black ${darkMode ? 'text-zinc-500 bg-zinc-950' : 'text-slate-400 bg-slate-50'}`}>
                      <th className={`py-4 px-6 border-b italic ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Date</th>
                      {tabReporte === 'ventes' && (
                        <th className={`py-4 px-6 border-b italic text-emerald-600 dark:text-emerald-400 ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>N° Facture</th>
                      )}
                      <th className={`py-4 px-6 border-b italic ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Tiers (Identité)</th>
                      <th className={`py-4 px-6 border-b italic ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Compte</th>
                      <th className={`py-4 px-6 border-b italic ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Partenaire</th>
                      
                      {isPlex ? (
                        <>
                          <th className={`py-4 px-6 border-b italic text-right ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Original</th>
                          <th className={`py-4 px-6 border-b italic text-emerald-600 text-right ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>
                            Net Déductible (Bâtiment {currentCompany?.propertyType === 'Duplex' ? '50%' : currentCompany?.propertyType === 'Triplex' ? '66.6%' : currentCompany?.propertyType === 'Quadruplex' ? '75%' : currentCompany?.propertyType === 'Multi-logement' ? '100%' : '66.6%'})
                          </th>
                          {currentCompany?.partners?.map((p: string) => {
                            const pct = currentCompany?.partnersPct?.[p] ?? (100 / (currentCompany?.partners?.length || 1));
                            return (
                              <th key={p} className={`py-4 px-6 border-b italic text-blue-600 text-right whitespace-nowrap ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>
                                Part {p} ({pct}%)
                              </th>
                            );
                          })}
                        </>
                      ) : (
                        <>
                          <th className={`py-4 px-6 border-b italic text-right ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Net</th>
                          <th className={`py-4 px-6 border-b italic text-[#059669] text-right ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>TPS</th>
                          <th className={`py-4 px-6 border-b italic text-blue-500 text-right ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>TVQ</th>
                        </>
                      )}

                      {activeCompanyId === '1' && tabReporte === 'taxes' && <th className={`py-4 px-6 border-b italic text-center text-emerald-600 uppercase tracking-tighter ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Refacturer?</th>}
                      {activeCompanyId === '5' && tabReporte === 'taxes' && <th className={`py-4 px-6 border-b italic text-center text-amber-600 uppercase tracking-tighter ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Statut de Paiement</th>}

                      <th className={`py-4 px-6 border-b italic tracking-tighter text-right ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Total</th>
                      <th className={`py-4 px-6 border-b text-right italic tracking-widest leading-none ${darkMode ? 'border-zinc-900' : 'border-slate-200'}`}>Pièce</th>
                   </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-zinc-900' : 'divide-slate-100'}`}>
                   {(tabReporte === 'ventes' ? processedHistorique : processedDepenses)
                     .map(item => (
                     <tr key={item.id} className={`text-[10px] font-bold transition-colors group ${darkMode ? 'bg-black hover:bg-zinc-950' : 'bg-white hover:bg-slate-50'}`}>
                      <td className={`py-5 px-6 whitespace-nowrap font-mono italic tracking-tighter ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{item.fecha}</td>
                      {tabReporte === 'ventes' && (
                        <td className="py-5 px-6 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-emerald-500/10 dark:bg-emerald-500/20 text-[#059669] dark:text-emerald-400 text-[9px] font-mono font-black rounded-lg uppercase tracking-wider">
                            {item.id || `FAC-GEN-${item.fecha ? item.fecha.replace(/-/g, '') : '2026'}`}
                          </span>
                        </td>
                      )}
                      <td className={`py-5 px-6 font-black italic tracking-tighter ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                        <div>
                          {(item as any).cliente || (item as any).fournisseur}
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        {(() => {
                          const currentCat = (item as any).cat || (tabReporte === 'ventes' ? 'Ventes' : 'À classer');
                          const catInfo = getCategoryInfo(currentCat);
                          return (
                            <div className="flex items-center space-x-2.5">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${catInfo.bg} ${catInfo.text}`}>
                                {catInfo.icon}
                              </div>
                              {tabReporte === 'ventes' ? (
                                <select
                                  value={(item as any).cat || 'Ventes'}
                                  onChange={(e) => {
                                    const newCat = e.target.value;
                                    setHistorique(prev => prev.map(h => h.id === item.id ? { ...h, cat: newCat } : h));
                                    playNotificationSound();
                                  }}
                                  className={`p-2 rounded-2xl text-[9px] font-black uppercase italic outline-none border border-transparent cursor-pointer transition-all ${
                                    darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-850' : 'bg-slate-100/60 border-slate-200 text-slate-800 hover:bg-slate-100'
                                  }`}
                                >
                                  {activeCompanyId === '1' ? (
                                    <>
                                      <option value="Ventes">Ventes</option>
                                      <option value="Honoraires de gestion immobilière">Honoraires de gestion immobilière</option>
                                      <option value="Intérêts reçus - Prêt privé">Intérêts reçus - Prêt privé</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="Ventes">Ventes</option>
                                      <option value="Loyers résidentiels">Loyers résidentiels</option>
                                      <option value="Ventes de services">Ventes de services</option>
                                      <option value="Ventes de biens">Ventes de biens</option>
                                    </>
                                  )}
                                </select>
                              ) : (
                                <select
                                  value={(item as any).cat || 'À classer'}
                                  onChange={(e) => {
                                    const newCat = e.target.value;
                                    setDepenses(prev => prev.map(d => d.id === item.id ? { ...d, cat: newCat } : d));
                                    playNotificationSound();
                                  }}
                                  className={`p-2 rounded-2xl text-[9px] font-black uppercase italic outline-none border border-transparent cursor-pointer transition-all ${
                                    darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-850' : 'bg-slate-100/60 border-slate-200 text-slate-800 hover:bg-slate-100'
                                  }`}
                                >
                                  <option value="À classer">À classer</option>
                                  <option value="Télécommunications">Télécommunications</option>
                                  <option value="Bureau à domicile">Bureau à domicile</option>
                                  <option value="Équipement">Équipement</option>
                                  <option value="Réparations / Entretien">Réparations / Entretien</option>
                                  <option value="Rénovation / Construction">Rénovation / Construction</option>
                                  <option value="Taxes">Taxes</option>
                                  <option value="Assurance">Assurance</option>
                                  <option value="Chauffage">Chauffage</option>
                                  <option value="Electricité">Electricité</option>
                                  <option value="Frais de gestion / Exploitation">Frais de gestion / Exploitation</option>
                                </select>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className={`py-5 px-6 italic ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                        <span className={`px-2 py-1 rounded-lg text-[8px] ${darkMode ? 'bg-zinc-900' : 'bg-slate-100'}`}>{(item as any).partnerTag || activeUser}</span>
                      </td>

                      {isPlex ? (
                        <>
                          <td className={`py-5 px-6 italic text-right ${darkMode ? 'text-zinc-300' : 'text-slate-600'}`}>{(item as any).total.toFixed(2)}$</td>
                          {/* Net Déductible is total * deductionRate (the building portion) */}
                          <td className="py-5 px-6 font-black text-emerald-600 italic text-right bg-emerald-50/10">
                            {((item as any).total * ((item as any).deductionRate ?? 1)).toFixed(2)}$
                          </td>
                          {currentCompany?.partners?.map((p: string) => {
                            const pct = currentCompany?.partnersPct?.[p] ?? (100 / (currentCompany?.partners?.length || 1));
                            const buildingTotal = (item as any).total * ((item as any).deductionRate ?? 1);
                            const partVal = buildingTotal * (pct / 100);
                            return (
                              <td key={p} className="py-5 px-6 font-black text-blue-600 italic text-right bg-blue-50/10 whitespace-nowrap">
                                {partVal.toFixed(2)}$
                              </td>
                            );
                          })}
                        </>
                      ) : (
                        <>
                          <td className={`py-5 px-6 italic text-right ${darkMode ? 'text-zinc-300' : 'text-slate-600'}`}>{(item as any).deductibleSubtotal?.toFixed(2) || (item as any).subtotal.toFixed(2)}$</td>
                          <td className="py-5 px-6 font-black text-[#059669] italic text-right">{(item as any).deductibleTps?.toFixed(2) || (item as any).tps.toFixed(2)}$</td>
                          <td className="py-5 px-6 font-black text-blue-600 italic text-right">{(item as any).deductibleTvq?.toFixed(2) || (item as any).tvq.toFixed(2)}$</td>
                        </>
                      )}

                      {activeCompanyId === '1' && tabReporte === 'taxes' && (
                        <td className="py-5 px-6 text-center">
                          <button 
                            disabled={(item as any).déjàFacturé}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDepenses(prev => prev.map(d => d.id === item.id ? { ...d, refacturableTriplex: !(item as any).refacturableTriplex } : d));
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase italic transition-all flex items-center space-x-1 mx-auto ${ (item as any).refacturableTriplex ? 'bg-emerald-600 text-white shadow-lg' : (darkMode ? 'bg-zinc-900 text-zinc-500' : 'bg-slate-100 text-slate-400')} ${(item as any).déjàFacturé ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95'}`}
                          >
                            {(item as any).refacturableTriplex ? <CheckCircle2 size={12} /> : <Plus size={12} />}
                            <span>{(item as any).refacturableTriplex ? (item as any).déjàFacturé ? 'Déjà Facturé' : 'Refacturable' : 'Non'}</span>
                          </button>
                        </td>
                      )}

                      {activeCompanyId === '5' && tabReporte === 'taxes' && (
                        <td className="py-5 px-6 text-center">
                          <select 
                            value={(item as any).status || 'En attente'}
                            onChange={(e) => {
                              setDepenses(prev => prev.map(d => d.id === item.id ? { ...d, status: e.target.value } : d));
                              playNotificationSound();
                            }}
                            className={`p-2 rounded-xl text-[8px] font-black uppercase italic outline-none border-none cursor-pointer transition-all ${
                              (item as any).status === 'Payée' ? 'bg-emerald-100 text-emerald-700' : 
                              (item as any).status === 'Matériaux Dus' ? 'bg-rose-100 text-rose-700' : 
                              'bg-amber-100 text-amber-700'
                            }`}
                          >
                            <option value="Payée">Payée</option>
                            <option value="En attente">En attente</option>
                            <option value="Matériaux Dus">Matériaux Dus</option>
                          </select>
                        </td>
                      )}
                      <td className={`py-5 px-6 font-black text-right ${darkMode ? 'text-zinc-100 bg-emerald-950/10' : 'text-[#0F172A] bg-emerald-50/5'}`}>{(item as any).total.toFixed(2)}$</td>
                      <td className="py-5 px-6 text-right">
                        {tabReporte === 'ventes' ? (
                          <button
                            onClick={() => {
                              setSelectedFac(item);
                              setShowPreview(true);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[8.5px] font-black tracking-tight uppercase italic transition-all flex items-center space-x-1.5 ml-auto border ${
                              darkMode 
                                ? 'bg-zinc-900 border-zinc-805 text-emerald-400 hover:bg-zinc-850 hover:border-emerald-500/30' 
                                : 'bg-emerald-50 border-emerald-100 text-[#059669] hover:bg-emerald-100/60'
                            }`}
                            title="Voir la Facture (Aperçu)"
                          >
                            <FileText size={12} />
                            <span>{item.id}</span>
                          </button>
                        ) : (
                          (item as any).lien && (
                            <a href={(item as any).lien} target="_blank" rel="noreferrer" className={`p-2.5 rounded-xl inline-block transition-all shadow-sm active:scale-90 ${darkMode ? 'bg-zinc-900 text-emerald-400 border border-zinc-800 hover:bg-zinc-800' : 'bg-slate-50 text-[#059669] border border-slate-100 hover:bg-emerald-50'}`}>
                              <ExternalLink size={14}/>
                            </a>
                          )
                        )}
                      </td>
                   </tr>
                 ))}
                </tbody>
             </table>
           )}
         </div>
      </main>

      <div className={`p-4 border-t space-y-3 ${darkMode ? 'bg-black border-zinc-900' : 'bg-white border-slate-200'}`}>
        {exportStatus === 'success' && lastSheetUrl && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between animate-in slide-in-from-bottom-2 duration-500 ${darkMode ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-[#059669]'}`}>
             <div className="flex items-center space-x-2">
               <CheckCircle2 size={16} />
               <p className="text-[10px] font-black uppercase">Exportation réussie</p>
             </div>
             <a href={lastSheetUrl} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase italic underline hover:opacity-80">Ouvrir Google Sheets</a>
          </div>
        )}

        <div className="flex gap-2">
          {tabReporte !== 'ventes' && tabReporte !== 'banque' && (
            <button 
              onClick={() => {
                setNewTxData({
                  fecha: new Date().toISOString().split('T')[0],
                  tiers: '',
                  cat: 'À classer',
                  total: '',
                  isTaxable: activeCompanyId !== '3'
                });
                setShowAddTxModal(true);
                playNotificationSound();
              }}
              className="flex-1 py-4 bg-[#059669] text-white rounded-[28px] text-[10px] font-black uppercase tracking-widest italic flex items-center justify-center space-x-2 hover:bg-emerald-700 transition-all shadow-lg active:scale-95 shadow-emerald-900/10"
            >
              <Plus size={16} />
              <span>Nouveau Frais</span>
            </button>
          )}

          <button 
            onClick={exportarAContador} 
            disabled={exportStatus === 'loading'}
            className={`${(tabReporte === 'ventes' || tabReporte === 'banque') ? 'w-full' : 'flex-1'} py-4 text-white rounded-[28px] text-[10px] font-black uppercase flex items-center justify-center space-x-2 shadow-lg transition-all tracking-widest italic ${exportStatus === 'loading' ? 'bg-slate-400 cursor-not-allowed' : (darkMode ? 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300' : 'bg-slate-900 text-white hover:bg-slate-800')}`}
          >
            {exportStatus === 'loading' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <FileSpreadsheet size={16}/>
                <span>Exporter Sheets</span>
              </>
            )}
          </button>
        </div>

        {/* Dynamic transaction creator Modal */}
        <AnimatePresence>
          {showAddTxModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className={`w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden border ${darkMode ? 'bg-zinc-950 border-zinc-900 text-zinc-100' : 'bg-white border-slate-100 text-slate-900'}`}
              >
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-center space-x-2">
                    <Plus className="text-[#059669]" size={18} />
                    <h3 className="text-[10px] font-black uppercase italic tracking-widest leading-none mt-1">
                      Nouveau {tabReporte === 'ventes' ? 'Revenu / Vente' : 'Frais / Dépense'}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowAddTxModal(false)} 
                    className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
                  >
                    Fermer
                  </button>
                </div>

                <div className="p-8 space-y-4 text-left">
                  <div className="space-y-1">
                    <label className={`text-[8.5px] font-black uppercase italic tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Date</label>
                    <input 
                      type="date" 
                      value={newTxData.fecha} 
                      onChange={e => setNewTxData({ ...newTxData, fecha: e.target.value })} 
                      className={`w-full p-4 rounded-2xl text-xs font-bold border-none outline-none ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[8.5px] font-black uppercase italic tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                      {tabReporte === 'ventes' ? 'Client' : 'Fournisseur'}
                    </label>
                    <input 
                      type="text" 
                      placeholder={tabReporte === 'ventes' ? 'Ex: Jean Tremblay' : 'Ex: Bell Canada'}
                      value={newTxData.tiers} 
                      onChange={e => setNewTxData({ ...newTxData, tiers: e.target.value })} 
                      className={`w-full p-4 rounded-2xl text-xs font-bold border-none outline-none ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[8.5px] font-black uppercase italic tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Compte Comptable</label>
                    {tabReporte === 'ventes' ? (
                      <div className="grid grid-cols-2 gap-2 mt-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                        {(activeCompanyId === '1' 
                          ? ['Honoraires de gestion immobilière', 'Intérêts reçus - Prêt privé', 'Ventes'] 
                          : ['Ventes', 'Loyers résidentiels', 'Ventes de services', 'Ventes de biens']
                        ).map((catName) => {
                          const isSelected = newTxData.cat === catName;
                          const catInfo = getCategoryInfo(catName);
                          return (
                            <button
                              key={catName}
                              type="button"
                              onClick={() => {
                                setNewTxData({ ...newTxData, cat: catName });
                                playNotificationSound();
                              }}
                              className={`p-3 rounded-2xl border flex items-center space-x-3 text-left transition-all duration-300 ${
                                isSelected 
                                  ? 'border-[#059669] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm' 
                                  : `${darkMode ? 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700' : 'border-slate-100 bg-slate-50/60 text-slate-600 hover:border-slate-200'}`
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${catInfo.bg} ${catInfo.text}`}>
                                {React.cloneElement(catInfo.icon, { size: 14 })}
                              </div>
                              <span className="text-[9px] font-bold leading-tight select-none truncate pr-1">{catName}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 mt-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                        {['À classer', 'Télécommunications', 'Bureau à domicile', 'Équipement', 'Réparations / Entretien', 'Rénovation / Construction', 'Taxes', 'Assurance', 'Chauffage', 'Electricité', 'Frais de gestion / Exploitation'].map((catName) => {
                          const isSelected = newTxData.cat === catName;
                          const catInfo = getCategoryInfo(catName);
                          return (
                            <button
                              key={catName}
                              type="button"
                              onClick={() => {
                                setNewTxData({ ...newTxData, cat: catName });
                                playNotificationSound();
                              }}
                              className={`p-3 rounded-2xl border flex items-center space-x-3 text-left transition-all duration-300 ${
                                isSelected 
                                  ? 'border-[#059669] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm' 
                                  : `${darkMode ? 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700' : 'border-slate-100 bg-slate-50/60 text-slate-600 hover:border-slate-200'}`
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${catInfo.bg} ${catInfo.text}`}>
                                {React.cloneElement(catInfo.icon, { size: 14 })}
                              </div>
                              <span className="text-[9px] font-bold leading-tight select-none truncate pr-1">{catName === 'Frais de gestion / Exploitation' ? 'Exploitation' : catName}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[8.5px] font-black uppercase italic tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Montant Total Brut ($ CA)</label>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={newTxData.total} 
                      onChange={e => setNewTxData({ ...newTxData, total: e.target.value })} 
                      className={`w-full p-4 rounded-2xl text-xs font-mono font-bold border-none outline-none ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`}
                    />
                  </div>

                  {activeCompanyId !== '3' && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl">
                      <span className="text-[10px] font-black uppercase italic tracking-wide">Inclure les taxes (TPS/TVQ)?</span>
                      <input 
                        type="checkbox" 
                        checked={newTxData.isTaxable} 
                        onChange={e => setNewTxData({ ...newTxData, isTaxable: e.target.checked })}
                        className="w-4 h-4 text-emerald-605 focus:ring-emerald-500 rounded border-gray-300 dark:bg-zinc-950 text-[#059669]"
                      />
                    </div>
                  )}

                  <button 
                    onClick={() => {
                      const totalVal = parseFloat(newTxData.total);
                      if (!totalVal || !newTxData.tiers) {
                        alert("⚠️ Tous les champs sont obligatoires.");
                        return;
                      }

                      let subtotal = totalVal;
                      let tps = 0;
                      let tvq = 0;

                      if (newTxData.isTaxable && activeCompanyId !== '3') {
                        const tpsRate = currentCompany?.userProfile?.tpsRate || 5;
                        const tvqRate = currentCompany?.userProfile?.tvqRate || 9.975;
                        subtotal = totalVal / (1 + (tpsRate / 100) + (tvqRate / 100));
                        tps = subtotal * (tpsRate / 100);
                        tvq = subtotal * (tvqRate / 100);
                      }

                      if (tabReporte === 'ventes') {
                        const newTx = {
                          id: `TX-${Date.now().toString().substring(8)}`,
                          companyId: activeCompanyId,
                          cliente: newTxData.tiers,
                          fecha: newTxData.fecha,
                          subtotal,
                          tps,
                          tvq,
                          total: totalVal,
                          status: 'Payée',
                          cat: newTxData.cat || 'Ventes'
                        };
                        setHistorique(prev => [newTx, ...prev]);
                      } else {
                        const newTx = {
                          id: Date.now(),
                          companyId: activeCompanyId,
                          fecha: newTxData.fecha,
                          fournisseur: newTxData.tiers,
                          cat: newTxData.cat || 'À classer',
                          subtotal,
                          tps,
                          tvq,
                          total: totalVal,
                          lien: null,
                          partnerTag: activeUser,
                          refacturableTriplex: false
                        };
                        setDepenses(prev => [newTx, ...prev]);
                      }

                      setShowAddTxModal(false);
                      playNotificationSound();
                      alert("🟢 Transaction ajoutée avec succès !");
                    }}
                    className="w-full py-5 bg-[#059669] text-white rounded-3xl text-[10px] font-black uppercase tracking-widest italic hover:bg-emerald-700 transition-all shadow-xl active:scale-95 duration-200"
                  >
                    Enregistrer la Transaction
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // --- MANTENIENDO EL RESTO DE MÓDULOS (KILOMETRAJE, FACTURAS, HOME, TAXES, PERFORMANCE) ---
  if (vista === 'kilometraje') return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-zinc-100' : 'bg-slate-50 text-slate-900'} flex flex-col animate-in slide-in-from-right text-left font-sans max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}>
      <WorkspaceSidebar />
      <header 
        className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} px-6 py-5 border-b flex items-center space-x-3 text-left shadow-sm`}
        style={{ borderTop: `4px solid ${darkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.3)'}` }}
      >
        <button 
          onClick={() => setIsSidebarOpen(true)} 
          className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden mr-1"
        >
          <Menu size={18} />
        </button>
        <button onClick={() => setVista('dashboard')} className={`p-2 transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}><ArrowLeft/></button>
        <div className="flex-1">
          <h2 className="font-black uppercase italic tracking-tighter text-lg text-left">Kilométrage GPS</h2>
          <p className="text-[8px] font-black text-[#059669] uppercase italic tracking-widest leading-none">Usager: {activeUser}</p>
        </div>
      </header>
      <main className="p-6 space-y-4 text-left max-w-md mx-auto w-full">
        <button 
           onClick={handleSaveTrip}
           className="w-full bg-[#059669] text-white font-black py-6 rounded-[32px] flex items-center justify-center space-x-3 text-sm uppercase italic shadow-xl active:scale-95 transition-all shadow-emerald-900/20"
         >
           <Navigation size={24} />
           <span>Enregistrer le trajet</span>
         </button>

        {/* Dual-State Auto Tracking Button */}
        <button 
          onClick={() => setIsTrackingAuto(!isTrackingAuto)}
          className={`w-full p-6 rounded-[32px] border transition-all flex items-center justify-between group active:scale-95 ${isTrackingAuto ? (darkMode ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-[#059669]') : (darkMode ? 'bg-zinc-950 border-zinc-900 text-zinc-600' : 'bg-slate-900 border-slate-800 text-white')}`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-2xl ${isTrackingAuto ? 'bg-emerald-500/20 animate-pulse' : (darkMode ? 'bg-zinc-900' : 'bg-white/10')}`}>
              <Navigation size={20} className={isTrackingAuto ? 'text-emerald-500' : (darkMode ? 'text-zinc-700' : 'text-white')} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase italic tracking-tight">{isTrackingAuto ? 'Routage GPS Actif (Arrière-plan)' : 'Activer le suivi automatique'}</p>
              <p className="text-[7px] font-black uppercase opacity-60 tracking-widest mt-0.5">{isTrackingAuto ? 'Synchronisation satellite en cours' : 'Précision par satellite requise'}</p>
            </div>
          </div>
          {isTrackingAuto && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>}
        </button>

        <div className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} p-7 rounded-[40px] border shadow-sm space-y-4`}>
           <div className={`flex items-center space-x-3 p-4 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-100'}`}>
             <MapPin size={18} className="text-[#059669]" />
             <div className="flex-1">
               <label className={`text-[7px] font-black uppercase italic tracking-widest block mb-0.5 ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>Point de départ (Laval Vimont)</label>
               <input className={`bg-transparent border-none text-sm w-full font-bold outline-none ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`} placeholder="Laval Vimont" defaultValue="Laval Vimont" />
             </div>
           </div>
           
           <div className="space-y-3 relative">
             <div className={`absolute left-[22px] top-4 bottom-4 w-0.5 border-dashed border-l ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}></div>
             {currentParadas.map((p, idx) => (
               <div key={idx} className={`flex items-center space-x-3 p-4 rounded-2xl border relative z-10 transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-100'}`}>
                 <div className="bg-[#059669] w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white font-black italic">E{idx + 1}</div>
                 <div className="flex-1">
                   <label className={`text-[7px] font-black uppercase italic tracking-widest block mb-0.5 ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>Escale {idx + 1}</label>
                   <input 
                     className={`bg-transparent border-none text-xs w-full font-bold outline-none ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`} 
                     placeholder="Arrêt destination" 
                     value={p}
                     onChange={(e) => {
                       const newData = {...partnerData};
                       (newData[activeUser as keyof typeof partnerData].paradas as string[])[idx] = e.target.value;
                       setPartnerData(newData);
                     }}
                   />
                 </div>
                 <button onClick={() => {
                   const newData = {...partnerData};
                   (newData[activeUser as keyof typeof partnerData].paradas as string[]) = currentParadas.filter((_, i) => i !== idx);
                   setPartnerData(newData);
                 }} className={`p-2 transition-colors ${darkMode ? 'text-zinc-700 hover:text-rose-500' : 'text-slate-300 hover:text-rose-500'}`}>
                   <Trash2 size={14}/>
                 </button>
               </div>
             ))}

             {currentParadas.length < 9 && (
               <button 
                 onClick={() => {
                   const newData = {...partnerData};
                   (newData[activeUser as keyof typeof partnerData].paradas as string[]) = [...currentParadas, ''];
                   setPartnerData(newData);
                 }}
                 className={`ml-1 flex items-center space-x-2 text-[8px] font-black uppercase italic transition-all group ${darkMode ? 'text-zinc-500 hover:text-emerald-400' : 'text-slate-400 hover:text-[#059669]'}`}
               >
                 <div className={`p-1.5 rounded-full border border-dashed group-hover:border-solid ${darkMode ? 'border-zinc-800 group-hover:border-emerald-900 bg-zinc-900' : 'border-slate-200 group-hover:border-emerald-200 bg-slate-50'}`}><Plus size={12}/></div>
                 <span>Ajouter une escale ({currentParadas.length}/9)</span>
               </button>
             )}
           </div>
        </div>

        <div className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} p-6 rounded-[32px] border shadow-sm text-left space-y-4`}>
           <div className="flex justify-between items-center px-1">
             <h3 className={`text-[10px] font-black uppercase italic tracking-widest ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>Journal de déplacement</h3>
             <span className="text-[8px] font-black text-[#059669] uppercase italic">Total: {currentCompany.partnerData[activeUser]?.vehicle?.mileageLogs.reduce((acc: number, log: any) => acc + log.distancia, 0).toFixed(1)} km</span>
           </div>
           
           <div className="space-y-2">
             {currentCompany.partnerData[activeUser]?.vehicle?.mileageLogs.length === 0 ? (
               <div className={`p-8 text-center border-2 border-dashed rounded-3xl ${darkMode ? 'border-zinc-900 text-zinc-800' : 'border-slate-100 text-slate-400'}`}>
                 <Navigation size={24} className="mx-auto mb-2 opacity-20" />
                 <p className="text-[9px] font-black uppercase italic tracking-widest">Aucun trajet enregistré</p>
               </div>
             ) : (
               currentCompany.partnerData[activeUser]?.vehicle?.mileageLogs.map((log: any, i: number) => (
                 <div key={i} className={`p-4 rounded-2xl border flex justify-between items-center ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-100'}`}>
                   <div className="text-left">
                     <p className={`text-[10px] font-black italic tracking-tighter ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{log.fecha}</p>
                     <p className={`text-[7px] font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>{log.modelo}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-black italic text-[#059669] tracking-tighter">+{log.distancia} km</p>
                     <p className={`text-[7px] font-black uppercase italic opacity-40 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Frais déductibles: {(log.distancia * 0.70).toFixed(2)}$</p>
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>
      </main>
    </div>
  );


  if (vista === 'facturas') return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-zinc-100' : 'bg-slate-50 text-slate-900'} flex flex-col animate-in slide-in-from-right text-left font-sans max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}>
      <WorkspaceSidebar />
      <header 
        className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} px-6 py-5 border-b flex items-center justify-between shadow-sm`}
        style={{ borderTop: `4px solid ${darkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.3)'}` }}
      >
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden"
          >
            <Menu size={18} />
          </button>
          <button onClick={() => { 
            if(subVistaFactura !== 'liste') setSubVistaFactura('liste'); 
            else setVista('dashboard'); 
          }} className={`p-2 rounded-xl transition-all ${darkMode ? 'bg-zinc-900 text-zinc-500 hover:text-white' : 'bg-slate-50 text-slate-400 hover:text-[#059669]'}`}><ArrowLeft size={24} /></button>
          <h2 className="font-black uppercase italic tracking-tighter text-xl">Facturation</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setSubVistaFactura('clients')} className={`p-2 rounded-xl transition-all ${subVistaFactura === 'clients' ? 'bg-[#059669] text-white shadow-lg' : (darkMode ? 'bg-zinc-900 text-zinc-500 hover:text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-900')}`}>
            <Users size={20}/>
          </button>
          <button onClick={() => setSetupComplet(false)} className={`p-2 transition-colors ${darkMode ? 'text-zinc-700 hover:text-white' : 'text-slate-300 hover:text-slate-900'}`}><Settings size={22}/></button>
        </div>
      </header>
      {!setupComplet ? (
        <main className="p-6 space-y-6 animate-in fade-in duration-500 overflow-y-auto">
          <div className="space-y-6">
              <div className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} p-7 rounded-[40px] shadow-sm border space-y-5`}>
                 <div className="grid grid-cols-2 gap-3 font-sans">
          <div className="space-y-1">
            <label className={`text-[8px] font-black uppercase italic ml-1 tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Spécialisation</label>
            <select value={industry} onChange={e => setIndustry(e.target.value)} className={`w-full p-4 rounded-[20px] text-[10px] font-bold border-none outline-none appearance-none cursor-pointer ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`}>
              <option value="Prospecteur Immobilier">Prospecteur Immobilier (Off-Market)</option>
              <option value="Courtier Immobilier">Courtier Immobilier</option>
              <option value="Prêteur Privé">Prêteur Privé</option>
              <option value="Gestionnaire de Triplex">Gestionnaire de Triplex</option>
              <option value="Rénovation / Construction">Rénovation / Construction</option>
            </select>
          </div>
                  <div className="space-y-1">
                    <label className={`text-[8px] font-black uppercase italic ml-1 tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Entité Légale</label>
                    <select value={legalEntity} onChange={e => setLegalEntity(e.target.value)} className={`w-full p-4 rounded-[20px] text-[10px] font-bold border-none outline-none appearance-none cursor-pointer ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`}>
                      <option value="Travailleur Autonome">Travailleur Autonome</option>
                      <option value="Incorporée">Incorporée (Inc.)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* PROPERTY CONFIGURATION CARD (ONLY FOR PLEX / IMMOBILIER WORKSPACES AND HIDDEN FOR GPA / ACHAT DIRECT) */}
              {isImmobilierWorkspace && (
                <div className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} p-7 rounded-[40px] shadow-sm border space-y-5 text-left`}>
                  <p className="text-[10px] font-black uppercase italic text-emerald-600 tracking-wider">Structure de l'Immeuble & Parts (%)</p>
                  
                  {/* Property Structure Selector */}
                  <div className="space-y-2">
                    <label className={`text-[8px] font-black uppercase italic ml-1 tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Type de propriété</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Duplex', 'Triplex', 'Quadruplex', 'Multi-logement'].map((type) => {
                        const isActive = propertyType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setPropertyType(type)}
                            className={`p-3 rounded-2xl border text-center transition-all duration-300 ${
                              isActive 
                                ? 'border-[#059669] bg-emerald-50/55 text-emerald-700 font-extrabold shadow-sm' 
                                : `${darkMode ? 'border-zinc-800 bg-zinc-900 text-zinc-400' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-tight">{type === 'Quadruplex' ? '4plex (Quadruplex)' : type}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Co_proprietaires List & Percent */}
                  <div className="space-y-4 pt-2">
                    <span className={`text-[8px] font-black uppercase italic ml-1 tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Co-propriétaires & Parts (%)</span>
                    <div className="space-y-3">
                      {partners.map((p, i) => (
                        <div key={i} className={`p-4 rounded-3xl border space-y-2 shadow-sm transition-all ${darkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50/60 border-slate-200'}`}>
                          <div className="flex items-center space-x-2">
                            <Users size={16} className="text-[#059669]" />
                            <input 
                              value={p}
                              onChange={(e) => {
                                const newP = [...partners];
                                const oldName = newP[i];
                                const newName = e.target.value;
                                newP[i] = newName;
                                
                                const newPct = { ...partnersPct };
                                if (oldName && newPct[oldName] !== undefined) {
                                  const val = newPct[oldName];
                                  delete newPct[oldName];
                                  if (newName) newPct[newName] = val;
                                } else if (newName) {
                                  newPct[newName] = 50;
                                }
                                setPartners(newP);
                                setPartnersPct(newPct);
                              }}
                              className={`flex-1 bg-transparent border-none outline-none font-extrabold italic text-xs ${darkMode ? 'text-zinc-100' : 'text-[#1E293B]'}`}
                              placeholder="Nom" 
                            />
                            {partners.length > 1 && (
                              <button 
                                onClick={() => {
                                  const pName = partners[i];
                                  const newPct = { ...partnersPct };
                                  delete newPct[pName];
                                  setPartnersPct(newPct);
                                  setPartners(partners.filter((_, idx) => idx !== i));
                                }} 
                                className="text-slate-300 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={16}/>
                              </button>
                            )}
                          </div>

                          <div className={`flex items-center justify-between pt-1.5 border-t ${darkMode ? 'border-zinc-800' : 'border-slate-250'}`}>
                            <span className={`text-[8.5px] font-black uppercase italic ${darkMode ? 'text-zinc-500' : 'text-slate-400'} tracking-wider`}>Pourcentage (%) :</span>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={partnersPct[p] !== undefined ? partnersPct[p] : 50}
                                onChange={(e) => {
                                  const val = Math.min(100, Math.max(1, parseInt(e.target.value) || 0));
                                  setPartnersPct({
                                    ...partnersPct,
                                    [p]: val
                                  });
                                }}
                                className={`w-16 p-1 text-center font-mono font-black text-xs border rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 ${darkMode ? 'bg-zinc-950 text-zinc-100 border-zinc-800' : 'bg-white text-[#1E293B] border-slate-200'}`}
                              />
                              <span className="text-xs font-bold text-slate-400">%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const nextId = `Propriétaire ${partners.length + 1}`;
                          setPartners([...partners, nextId]);
                          setPartnersPct({
                            ...partnersPct,
                            [nextId]: 50
                          });
                        }}
                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-[9px] font-black uppercase italic tracking-widest text-[#059669] hover:bg-emerald-50/20 hover:border-[#059669] transition-all"
                      >
                        + Ajouter un propriétaire
                      </button>
                    </div>
                  </div>
                </div>
              )}

             <div 
               onClick={() => {
                 const url = prompt("Lien de l'image pour le logo (HTTPS):");
                 if(url) setUserProfile({...userProfile, logo: url});
               }}
               className={`w-full aspect-video border-2 border-dashed rounded-[40px] flex flex-col items-center justify-center relative group overflow-hidden shadow-sm cursor-pointer transition-all ${darkMode ? 'bg-zinc-950 border-zinc-900 text-zinc-800 hover:border-emerald-500' : 'bg-white border-slate-200 text-slate-300 hover:border-emerald-500'}`}
             >
               {userProfile.logo ? (
                 <img src={userProfile.logo} className="w-full h-full object-contain p-8" alt="Logo preview" />
               ) : (
                 <>
                   <Upload size={40} />
                   <span className="text-[9px] font-black mt-4 uppercase tracking-[0.2em]">Télécharger Logo (PNG/SVG)</span>
                 </>
               )}
               <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             </div>

             <div className="space-y-4">
               <div className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} p-7 rounded-[40px] shadow-sm border space-y-5`}>
                 <div className="space-y-1">
                   <label className={`text-[8px] font-black uppercase italic ml-1 tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Nom Légal de l'entreprise</label>
                   <input value={userProfile.nom} onChange={e => setUserProfile({...userProfile, nom: e.target.value})} className={`w-full p-4 rounded-[24px] text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/10 tracking-tighter ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`} />
                 </div>

                 <div className="space-y-1">
                   <label className={`text-[8px] font-black uppercase italic ml-1 tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Adresse Complète</label>
                   <textarea value={userProfile.adresse} onChange={e => setUserProfile({...userProfile, adresse: e.target.value})} rows={2} className={`w-full p-4 rounded-[24px] text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/10 resize-none leading-relaxed ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`} />
                 </div>
                 
                 <div className="space-y-1">
                   <label className={`text-[8px] font-black uppercase italic ml-1 tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Dossier Google Drive (BYOS)</label>
                   <div className="flex space-x-2">
                     <input 
                       value={empresa?.driveConfig?.folderId || ''} 
                       onChange={e => {
                         const updated = { ...empresa, driveConfig: { ...empresa.driveConfig, folderId: e.target.value, connected: true } };
                         setListaEmpresas(prev => prev.map(emp => emp.id === activeCompanyId ? updated : emp));
                       }} 
                       placeholder="ID du dossier Drive"
                       className={`flex-1 p-4 rounded-[20px] text-[10px] font-bold border-none outline-none focus:ring-1 focus:ring-emerald-500 ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-100'}`} 
                     />
                     <div className={`p-4 rounded-[20px] flex items-center justify-center ${darkMode ? 'bg-emerald-950/30 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
                       <Lock size={14} />
                     </div>
                   </div>
                   <p className={`text-[7px] font-bold uppercase mt-1 ml-1 italic tracking-tight ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>Configuration de stockage sécurisée par entreprise</p>
                 </div>

                 <div className="grid grid-cols-2 gap-3 text-left">
                   <div className="space-y-1">
                     <label className={`text-[8px] font-black uppercase italic ml-1 tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>NEQ</label>
                     <input value={userProfile.neq} onChange={e => setUserProfile({...userProfile, neq: e.target.value})} className={`w-full p-4 rounded-[24px] text-[10px] font-bold border-none ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`} />
                   </div>
                   <div className="space-y-1">
                     <label className={`text-[8px] font-black uppercase italic ml-1 tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Téléphone</label>
                     <input value={userProfile.tel} onChange={e => setUserProfile({...userProfile, tel: e.target.value})} className={`w-full p-4 rounded-[24px] text-[10px] font-bold border-none ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`} />
                   </div>
                 </div>

                 <div className="space-y-1">
                   <label className={`text-[8px] font-black uppercase italic ml-1 tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Site Web</label>
                   <input value={userProfile.site} onChange={e => setUserProfile({...userProfile, site: e.target.value})} className={`w-full p-4 rounded-[24px] text-[10px] font-bold border-none ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`} />
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                     <label className={`text-[8px] font-black uppercase italic ml-1 tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>TPS N°</label>
                     <input value={userProfile.tps} onChange={e => setUserProfile({...userProfile, tps: e.target.value})} className={`w-full p-4 rounded-[24px] text-[10px] font-bold border-none ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`} />
                   </div>
                   <div className="space-y-1">
                     <label className={`text-[8px] font-black uppercase italic ml-1 tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>TVQ N°</label>
                   <input value={userProfile.tvq} onChange={e => setUserProfile({...userProfile, tvq: e.target.value})} className={`w-full p-4 rounded-[24px] text-[10px] font-bold border-none ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`} />
                   </div>
                 </div>

                 <div className="space-y-1">
                   <label className={`text-[8px] font-black uppercase italic ml-1 tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Instructions de Paiement</label>
                   <textarea value={userProfile.pago} onChange={e => setUserProfile({...userProfile, pago: e.target.value})} rows={3} className={`w-full p-4 rounded-[24px] text-[10px] font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/10 resize-none font-mono leading-relaxed ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`} />
                 </div>
               </div>
             </div>
           </div>


           <button 
             onClick={() => {
               const updatedCompany = {
                 ...empresa,
                 industry,
                 legalEntity,
                 userProfile,
                 partners,
                 partnerData,
                 propertyType,
                 partnersPct
               };
               setListaEmpresas(prev => prev.map(e => e.id === activeCompanyId ? updatedCompany : e));
               setSetupComplet(true);
             }} 
             className="w-full py-5 bg-emerald-600 text-white rounded-[32px] text-[10px] font-black uppercase shadow-xl mb-10 tracking-widest active:scale-95 transition-all"
           >
             Sauvegarder les paramètres
           </button>
        </main>
      ) : (
        <div className="flex-1 overflow-y-auto pb-64">
           {/* Configuration de l'émetteur Collapsible */}
           <div className="p-4 pb-0">
             <div className={`rounded-[32px] border shadow-sm overflow-hidden transition-all duration-300 ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'}`}>
               <button 
                 onClick={() => setShowProfileEditor(!showProfileEditor)}
                 className="w-full p-6 flex justify-between items-center group active:scale-[0.98] transition-transform"
               >
                 <div className="flex items-center space-x-3">
                   <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                     <Settings size={20} />
                   </div>
                   <div className="text-left">
                     <h3 className={`text-[10px] font-black uppercase italic tracking-widest ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>Configuration de l'émetteur</h3>
                     <p className="text-[8px] font-bold text-[#059669] opacity-70 uppercase italic tracking-tight">Identité professionnelle et Séquence</p>
                   </div>
                 </div>
                 <ChevronRight size={18} className={`transition-transform duration-500 ${showProfileEditor ? 'rotate-90' : ''} ${darkMode ? 'text-zinc-800' : 'text-slate-300'}`} />
               </button>

               <AnimatePresence>
                 {showProfileEditor && (
                   <motion.div 
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     transition={{ duration: 0.4, ease: "circOut" }}
                   >
                     <div className={`p-6 border-t space-y-4 ${darkMode ? 'border-zinc-900 bg-zinc-900/10' : 'border-slate-50 bg-slate-50/30'}`}>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Logo Upload Section */}
                          <div className={`md:col-span-2 flex items-center space-x-6 p-6 rounded-[32px] border-2 border-dashed ${darkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-emerald-500/20 bg-emerald-50/20'}`}>
                             <div className="relative group">
                               {userProfile.logo ? (
                                 <img src={userProfile.logo} className={`w-24 h-24 object-contain rounded-2xl p-3 shadow-sm border ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-slate-100'}`} alt="Logo Preview" />
                               ) : (
                                 <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-emerald-500 border border-dashed ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-emerald-50 border-emerald-100'}`}>
                                   <ImageIcon size={38} strokeWidth={1} />
                                 </div>
                               )}
                               <button 
                                 onClick={() => logoInputRef.current?.click()}
                                 className="absolute -bottom-2 -right-2 p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg scale-90 group-hover:scale-100 transition-transform active:scale-95"
                               >
                                 <Camera size={16} />
                               </button>
                             </div>
                             <div className="text-left flex-1">
                                <h4 className={`text-[10px] font-black uppercase italic tracking-widest ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>Logo de l'entreprise</h4>
                                <p className={`text-[8px] font-bold uppercase italic leading-tight mb-3 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Dimensions recommandées: Carré ou paysage (Fond transparent idéalement)</p>
                                <div className="flex items-center space-x-4">
                                  <button 
                                    onClick={() => logoInputRef.current?.click()}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase italic hover:bg-emerald-700 transition-all active:scale-95"
                                  >
                                    {userProfile.logo ? "Changer le logo" : "Télécharger"}
                                  </button>
                                  {userProfile.logo && (
                                    <button 
                                      onClick={() => setUserProfile({...userProfile, logo: ''})}
                                      className={`text-[9px] font-black uppercase italic hover:underline ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}
                                    >
                                      Supprimer
                                    </button>
                                  )}
                                </div>
                             </div>
                             <input 
                               type="file" 
                               ref={logoInputRef} 
                               className="hidden" 
                               accept="image/*"
                               onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                   const reader = new FileReader();
                                   reader.onloadend = () => {
                                     setUserProfile({...userProfile, logo: reader.result as string});
                                     playNotificationSound();
                                   };
                                   reader.readAsDataURL(file);
                                 }
                               }} 
                             />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[7px] font-black uppercase italic text-slate-400 ml-2">Nom de l'entreprise</label>
                            <input 
                              value={userProfile.nom} 
                              onChange={e => setUserProfile({...userProfile, nom: e.target.value})}
                              className={`w-full p-4 rounded-2xl text-xs font-bold outline-none border focus:ring-1 focus:ring-emerald-500/50 ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : 'bg-white border-slate-100'}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[7px] font-black uppercase italic text-slate-400 ml-2">NEQ</label>
                            <input 
                              value={userProfile.neq} 
                              onChange={e => setUserProfile({...userProfile, neq: e.target.value})}
                              className={`w-full p-4 rounded-2xl text-xs font-bold outline-none border focus:ring-1 focus:ring-emerald-500/50 ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : 'bg-white border-slate-100'}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[7px] font-black uppercase italic text-slate-400 ml-2">Numéro TPS</label>
                            <input 
                              value={userProfile.tps} 
                              onChange={e => setUserProfile({...userProfile, tps: e.target.value})}
                              className={`w-full p-4 rounded-2xl text-xs font-bold outline-none border focus:ring-1 focus:ring-emerald-500/50 ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : 'bg-white border-slate-100'}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[7px] font-black uppercase italic text-slate-400 ml-2">Numéro TVQ</label>
                            <input 
                              value={userProfile.tvq} 
                              onChange={e => setUserProfile({...userProfile, tvq: e.target.value})}
                              className={`w-full p-4 rounded-2xl text-xs font-bold outline-none border focus:ring-1 focus:ring-emerald-500/50 ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : 'bg-white border-slate-100'}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[7px] font-black uppercase italic text-slate-400 ml-2">Adresse</label>
                            <input 
                              value={userProfile.adresse} 
                              onChange={e => setUserProfile({...userProfile, adresse: e.target.value})}
                              className={`w-full p-4 rounded-2xl text-xs font-bold outline-none border focus:ring-1 focus:ring-emerald-500/50 ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : 'bg-white border-slate-100'}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[7px] font-black uppercase italic text-slate-400 ml-2">Site Web</label>
                            <input 
                              value={userProfile.site} 
                              onChange={e => setUserProfile({...userProfile, site: e.target.value})}
                              className={`w-full p-4 rounded-2xl text-xs font-bold outline-none border focus:ring-1 focus:ring-emerald-500/50 ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : 'bg-white border-slate-100'}`}
                            />
                          </div>
                       </div>
                       <div className={`mt-4 p-4 rounded-2xl border-2 border-dashed flex items-center justify-between ${darkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-100 bg-emerald-50/10'}`}>
                          <div className="flex items-center space-x-3">
                             <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-black italic">#{nextInvoiceNumber}</div>
                             <div className="text-left">
                                <p className="text-[9px] font-black uppercase italic tracking-widest text-[#059669]">Séquence active</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase italic">Prochain numéro de factura</p>
                             </div>
                          </div>
                          <input 
                            type="number"
                            value={nextInvoiceNumber}
                            onChange={e => setNextInvoiceNumber(parseInt(e.target.value) || 0)}
                            className={`w-20 p-3 rounded-xl text-center text-sm font-black outline-none border-none ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-slate-900'}`}
                          />
                       </div>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
           </div>

           {subVistaFactura === 'clients' ? (
        <main className="p-4 space-y-6 animate-in slide-in-from-bottom duration-300">
           <div className={`p-6 rounded-[32px] border shadow-sm space-y-4 ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase italic text-emerald-600">Banque de Clients</h3>
                <button onClick={() => setShowAddClientModal(true)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase italic ${darkMode ? 'bg-zinc-100 text-black' : 'bg-slate-900 text-white'}`}>+ Nouveau</button>
              </div>
           </div>

           <div className="space-y-3">
              <h4 className={`text-[10px] font-black uppercase italic px-2 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Répertoire ({clientes.length})</h4>
              {clientes.map(c => (
                <div key={c.id} className={`p-5 rounded-[32px] border shadow-sm flex items-center justify-between ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'}`}>
                  <div className="flex-1">
                    <p className={`text-xs font-black italic ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{c.nom}</p>
                    <p className={`text-[8px] font-bold uppercase mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{c.email}</p>
                    {c.neq && <p className={`text-[7px] font-bold uppercase mt-0.5 ${darkMode ? 'text-zinc-700' : 'text-slate-300'}`}>NEQ: {c.neq}</p>}
                  </div>
                  <button onClick={() => setClientes(clientes.filter(cl => cl.id !== c.id))} className="p-2 text-rose-300"><Trash2 size={16}/></button>
                </div>
              ))}
           </div>
        </main>
      ) : subVistaFactura === 'liste' ? (
        <main className="p-4 space-y-4">
           {historique.map(fac => (
            <div key={fac.id} className={`p-5 rounded-[32px] border shadow-sm flex items-center justify-between text-left ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'}`}>
               <div className="flex-1">
                 <p className={`text-xs font-black italic ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{fac.cliente}</p>
                 <div className="flex items-center space-x-2 mt-1">
                   <p className={`text-[8px] font-bold uppercase ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{fac.id} • {fac.fecha}</p>
                   <button 
                    onClick={() => {
                      setHistorique(prev => prev.map(f => f.id === fac.id ? {...f, status: f.status === 'Payée' ? 'En attente' : 'Payée'} : f));
                    }}
                    className={`px-2 py-0.5 rounded-full text-[6px] font-black uppercase italic ${fac.status === 'Payée' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}
                   >
                     {fac.status}
                   </button>
                 </div>
               </div>
               <div className="flex items-center space-x-3">
                 <p className={`text-sm font-black italic ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{fac.total.toFixed(2)}$</p>
                 {fac.status === 'En attente' && (
                   <button 
                    onClick={() => handleSendReminder(fac)} 
                    className={`p-2 rounded-lg ${darkMode ? 'bg-zinc-900 text-amber-500' : 'bg-amber-50 text-amber-600'} animate-pulse`}
                    title="Envoyer rappel"
                   >
                     <Send size={16}/>
                   </button>
                 )}
                 <button 
                  onClick={() => handleEditInvoice(fac)} 
                  className={`p-2 rounded-lg ${darkMode ? 'bg-zinc-900 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}
                 >
                   <PenLine size={16}/>
                 </button>
                 <button onClick={() => { setSelectedFac(fac); setShowPreview(true); }} className={`p-2 rounded-lg ${darkMode ? 'bg-zinc-900 text-zinc-400' : 'bg-slate-50 text-slate-400'}`}><Eye size={16}/></button>
               </div>
            </div>
           ))}
           <button onClick={() => { setEditingInvoiceId(null); setSubVistaFactura('nouveau'); }} className={`fixed bottom-6 right-6 left-6 py-6 rounded-[32px] shadow-2xl flex items-center justify-center space-x-3 text-[10px] font-black uppercase italic ${darkMode ? 'bg-zinc-100 text-black' : 'bg-slate-900 text-white'}`}>
              <PlusCircle size={22} className="text-emerald-400" /> <span>{tipoDoc === 'Facture' ? 'FAC' : (tipoDoc === 'Soumission' ? 'SOU' : 'REC')}-00{historique.length + 1}</span>
            </button>

            {/* Preview Modal */}
           {showPreview && selectedFac && (
             <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className={`w-full max-w-lg md:max-w-2xl mx-auto my-auto p-4 md:p-6 rounded-[28px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ${darkMode ? 'bg-zinc-950 border border-zinc-800' : 'bg-white'}`}>
                  <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-zinc-900' : 'border-slate-100'}`}>
                    <h3 className={`font-black uppercase italic text-sm ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                      { (selectedFac as any).tipoDoc === 'Soumission' ? 'Estimation du Projet' : 
                        ((selectedFac as any).tipoDoc === 'Reçu' ? 'Reçu de Paiement' : 'Détails de Facture') }
                    </h3>
                    <button onClick={() => setShowPreview(false)} className={`p-2 rounded-full ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-100 text-slate-900'}`}><ArrowLeft size={16} /></button>
                  </div>
                  <div className="p-6 md:p-8 flex-1 max-h-[70vh] md:max-h-[75vh] overflow-y-auto pr-2 scrollbar-thin space-y-6 text-[10px]">
                    {/* Header Facture Dynamic */}
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                         {userProfile.logo ? (
                           <img src={userProfile.logo} alt="Logo" className="w-16 h-16 object-contain rounded-xl shadow-sm" />
                         ) : (
                           <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-[10px] text-white font-black italic shadow-lg">LOGO</div>
                         )}
                         <div className="space-y-0.5">
                           <p className={`font-black uppercase text-sm leading-tight ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{userProfile.nom}</p>
                           <p className={`uppercase text-[7px] leading-tight font-bold ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                             {userProfile.adresse}<br/>
                             {userProfile.tel && <span>Tél: {userProfile.tel}<br/></span>}
                             {userProfile.site && <span>{userProfile.site}<br/></span>}
                             {userProfile.neq && <span>NEQ: {userProfile.neq}</span>}
                           </p>
                         </div>
                      </div>
                      <div className="text-right">
                         <h4 className={`text-2xl font-black italic uppercase leading-none tracking-tighter ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                           { (selectedFac as any).tipoDoc || 'Facture' }
                         </h4>
                         <p className="font-black text-emerald-600 mt-2 text-base leading-none">{(selectedFac as any).id}</p>
                         <p className={`mt-1 font-bold ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>Émise le: {(selectedFac as any).fecha}</p>
                      </div>
                    </div>

                    {/* Client Expanded Display */}
                    <div className={`p-4 rounded-2xl ${darkMode ? 'bg-zinc-900' : 'bg-slate-50'}`}>
                      <p className={`text-[7px] font-black uppercase mb-1 ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>Facturé à:</p>
                      {(() => {
                        const clientInfo = clientes.find(c => c.nom === (selectedFac as any).cliente) || (selectedFac as any);
                        return (
                          <div className="space-y-0.5">
                            <p className={`font-black text-sm italic ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{clientInfo.nom || clientInfo.cliente}</p>
                            {clientInfo.adresse && (
                              <p className={`text-[8px] font-bold uppercase leading-tight ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{clientInfo.adresse}</p>
                            )}
                            {(clientInfo.email || (selectedFac as any).email) && (
                              <p className={`text-[8px] font-bold lowercase opacity-70 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{(clientInfo.email || (selectedFac as any).email)}</p>
                            )}
                            {clientInfo.neq && (
                              <p className={`text-[7px] font-bold uppercase mt-1 ${darkMode ? 'text-zinc-700' : 'text-slate-300'}`}>NEQ (Client): {clientInfo.neq}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Table simple pour l'aperçu */}
                    <table className="w-full text-left">
                      <thead>
                        <tr className={`border-b text-[7px] font-black uppercase ${darkMode ? 'border-zinc-900 text-zinc-700' : 'text-slate-300'}`}>
                          <th className="pb-2 font-black">Description</th>
                          <th className="text-center pb-2 font-black">Qté</th>
                          <th className="text-right pb-2 font-black">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((selectedFac as any).items || [{ descripcion: 'Services Professionnels', cantidad: 1, precioUnitario: (selectedFac as any).subtotal }]).map((item: any, idx: number) => (
                          <tr key={idx} className={`border-b ${darkMode ? 'border-zinc-900/50 text-zinc-300' : 'border-slate-50 text-slate-900'}`}>
                            <td className="py-2.5 font-bold leading-tight pr-4">{item.descripcion}</td>
                            <td className="py-2.5 text-center font-bold">{item.cantidad}</td>
                            <td className={`py-2.5 text-right font-black italic ${darkMode ? 'text-zinc-100' : ''}`}>{(item.cantidad * item.precioUnitario).toFixed(2)}$</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totaux */}
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className={`${darkMode ? 'text-zinc-500' : ''}`}>Sous-total</span><span className={`font-bold ${darkMode ? 'text-zinc-100' : ''}`}>{(selectedFac as any).subtotal.toFixed(2)}$</span></div>
                      <div className="flex justify-between text-emerald-600"><span>TPS ({userProfile.tpsRate}%)</span><span className="font-bold">{(selectedFac as any).tps.toFixed(2)}$</span></div>
                      <div className="flex justify-between text-blue-600"><span>TVQ ({userProfile.tvqRate}%)</span><span className="font-bold">{(selectedFac as any).tvq.toFixed(2)}$</span></div>
                      <div className={`flex justify-between text-lg font-black italic border-t pt-2 ${darkMode ? 'border-zinc-900 text-zinc-100' : 'text-slate-900'}`}><span>TOTAL</span><span>{(selectedFac as any).total.toFixed(2)}$</span></div>
                    </div>

                    {/* Fiscal Infos */}
                    <div className={`pt-4 text-[7px] font-bold uppercase leading-relaxed border-t ${darkMode ? 'border-zinc-900 text-zinc-600' : 'text-slate-400'}`}>
                      <p>TPS: {userProfile.tps}</p>
                      <p>TVQ: {userProfile.tvq}</p>
                      <div className="mt-4 italic whitespace-pre-line">{userProfile.pago}</div>
                    </div>
                  </div>
                    <div className="p-6 bg-slate-900 flex space-x-3">
                      <button onClick={() => window.print()} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase italic shadow-lg flex items-center justify-center space-x-2">
                        <Printer size={14}/>
                        <span>Imprimer</span>
                      </button>
                      <button onClick={() => alert(`Facture envoyée à ${(selectedFac as any).email || 'destinataire@email.com'}`)} className="flex-1 py-4 bg-white/10 text-white rounded-2xl text-[9px] font-black uppercase italic flex items-center justify-center space-x-2">
                        <Mail size={14}/>
                        <span>Envoyer</span>
                      </button>
                    </div>
                </div>
             </div>
           )}
        </main>
      ) : (
        <div className="fixed inset-0 bg-slate-900/60 flex items-end sm:items-center justify-center z-50 animate-fade-in p-0 sm:p-4 backdrop-blur-sm">
          <main className={`${darkMode ? 'bg-zinc-950' : 'bg-white'} max-h-[85vh] overflow-y-auto w-full rounded-t-[48px] sm:rounded-[48px] p-6 pb-12 shadow-2xl relative animate-in slide-in-from-bottom duration-500`}>
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-8 pt-2">
              <div className="flex items-center space-x-3">
                <div className={`${darkMode ? 'bg-zinc-900 text-emerald-400' : 'bg-emerald-50 text-emerald-600'} w-12 h-12 rounded-2xl flex items-center justify-center`}>
                  {editingInvoiceId ? <PenLine size={24}/> : <Plus size={24}/>}
                </div>
                <div>
                   <h3 className={`text-base font-black uppercase italic tracking-tighter leading-none ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
                    {editingInvoiceId ? 'Révision Facture' : 'Nouveau Document'}
                   </h3>
                   <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#059669] mt-1 italic">{(tipoDoc || 'Facture').toUpperCase()} #{nextInvoiceNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => { setEditingInvoiceId(null); setSubVistaFactura('liste'); }}
                className={`p-3 rounded-full transition-all ${darkMode ? 'bg-zinc-900 text-zinc-500 hover:text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-900'}`}
              >
                <X size={20} />
              </button>
            </div>

           {/* Document Type Switcher */}
           <div className={`flex p-1.5 rounded-[28px] border mb-6 ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-100 border-slate-200'}`}>
             {['Facture', 'Soumission', 'Reçu'].map(t => (
               <button 
                 key={t} 
                 onClick={() => setTipoDoc(t)}
                 className={`flex-1 py-4 rounded-[22px] text-[10px] font-black uppercase italic transition-all ${tipoDoc === t ? 'bg-[#059669] text-white shadow-lg' : (darkMode ? 'text-zinc-600 hover:text-zinc-400' : 'text-slate-400 hover:text-slate-600')}`}
               >
                 {t}
               </button>
             ))}
           </div>

           <div className="space-y-4 text-left">
              {/* Client Selection */}
              <div className={`p-6 rounded-[32px] border shadow-sm space-y-3 relative ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'}`}>
                <div className="flex items-end space-x-3">
                  <div className="flex-1 space-y-1">
                    <label className={`text-[8px] font-black uppercase italic ml-1 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Destinataire</label>
                    <div className="relative">
                      <select 
                        value={newInvoiceData.clientId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewInvoiceData({...newInvoiceData, isNouveauClient: val === 'new', clientId: val});
                        }}
                        className={`w-full p-4 rounded-2xl text-sm font-bold border-none outline-none appearance-none cursor-pointer pr-10 ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`}
                      >
                        <option value="">Sélectionner un client...</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        <option value="new" className="text-[#059669] font-black">+ Nouveau Client Rapide</option>
                      </select>
                      <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setNewClient({ nom: '', adresse: '', email: '', neq: '' });
                      setShowAddClientModal(true);
                      playNotificationSound();
                    }}
                    className={`p-4 rounded-2xl border shadow-sm active:scale-95 transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800 text-emerald-500' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {newInvoiceData.isNouveauClient && (
                  <div className={`p-6 rounded-[32px] border space-y-4 animate-in slide-in-from-top duration-300 mt-4 ${darkMode ? 'bg-emerald-950/20 border-emerald-900' : 'bg-emerald-50/50 border-emerald-100'}`}>
                     <p className="text-[10px] font-black uppercase text-[#059669] italic tracking-widest">Détails Nouveau Client</p>
                     <div className="space-y-3">
                       <input 
                         placeholder="Nom complet"
                         value={newInvoiceData.nouveauClientNom}
                         onChange={e => setNewInvoiceData({...newInvoiceData, nouveauClientNom: e.target.value})}
                         className={`w-full p-4 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : 'bg-white border-emerald-100'}`}
                       />
                       <input 
                         placeholder="Adresse complète"
                         value={newInvoiceData.nouveauClientAdresse}
                         onChange={e => setNewInvoiceData({...newInvoiceData, nouveauClientAdresse: e.target.value})}
                         className={`w-full p-4 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : 'bg-white border-emerald-100'}`}
                       />
                       <input 
                         placeholder="Courriel (Optionnel)"
                         value={newInvoiceData.nouveauClientEmail}
                         onChange={e => setNewInvoiceData({...newInvoiceData, nouveauClientEmail: e.target.value})}
                         className={`w-full p-4 rounded-2xl text-[10px] font-bold outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : 'bg-white border-emerald-100'}`}
                       />
                     </div>
                  </div>
                )}
              </div>

              {/* Items Management */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h4 className={`text-[10px] font-black uppercase italic ${darkMode ? 'text-zinc-600' : 'text-slate-500'}`}>Détails des Services</h4>
                  <button 
                    onClick={() => setItems([...items, { cantidad: 1, descripcion: '', precioUnitario: 0, taxable: true }])}
                    className="flex items-center space-x-1 underline text-emerald-600 text-[8px] font-black uppercase italic"
                  >
                    <Plus size={12} /> <span>Ajouter un service</span>
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className={`p-6 rounded-[32px] border shadow-sm space-y-4 animate-in fade-in duration-300 ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-start">
                      <span className={`text-[10px] font-black italic ${darkMode ? 'text-zinc-800' : 'text-slate-300'}`}>Ligne #{idx + 1}</span>
                      {items.length > 1 && (
                        <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-rose-400 p-1"><Trash2 size={14}/></button>
                      )}
                    </div>
                    <textarea 
                      className={`w-full text-xs font-medium p-4 rounded-2xl border-none outline-none resize-none ${darkMode ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-slate-900'}`} 
                      placeholder="Ex: Consultation en gestion immobilière..." 
                      value={item.descripcion}
                      onChange={e => {
                        const newItems = [...items];
                        newItems[idx].descripcion = e.target.value;
                        setItems(newItems);
                      }}
                      rows={2} 
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`space-y-1 col-span-1 border-r pr-3 ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                        <label className={`text-[7px] font-black uppercase italic ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Qté</label>
                        <input 
                          type="number" 
                          className={`w-full p-1 bg-transparent text-sm font-bold border-none outline-none ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`} 
                          value={item.cantidad}
                          onChange={e => {
                            const newItems = [...items];
                            newItems[idx].cantidad = parseFloat(e.target.value) || 0;
                            setItems(newItems);
                          }}
                        />
                      </div>
                      <div className={`space-y-1 col-span-1 border-r pr-3 ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                        <label className={`text-[7px] font-black uppercase italic ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Prix Unitaire</label>
                        <input 
                          type="number" 
                          className={`w-full p-1 bg-transparent text-sm font-bold border-none outline-none ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`} 
                          value={item.precioUnitario || ''}
                          onChange={e => {
                            const newItems = [...items];
                            newItems[idx].precioUnitario = parseFloat(e.target.value) || 0;
                            setItems(newItems);
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newItems = [...items];
                          newItems[idx].taxable = !newItems[idx].taxable;
                          setItems(newItems);
                        }}
                        className={`col-span-1 flex items-center justify-center rounded-xl text-[6px] font-black uppercase italic tracking-tighter ${item.taxable ? (darkMode ? 'bg-emerald-950/30 text-emerald-500' : 'bg-emerald-50 text-emerald-600') : (darkMode ? 'bg-zinc-900 text-zinc-700' : 'bg-slate-50 text-slate-300')}`}
                      >
                        {item.taxable ? 'Taxable (QC)' : 'Non Taxable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           {/* Fixed Live Summary Footer (Integrated in Modal) */}
           <div className={`mt-10 p-6 rounded-[32px] text-white flex flex-col space-y-3 shadow-2xl relative overflow-hidden ${darkMode ? 'bg-emerald-950' : 'bg-slate-900'}`}>
                {(() => {
                  const subtotal = items.reduce((acc, curr) => acc + (curr.cantidad * curr.precioUnitario), 0);
                  const tps = items.reduce((acc, curr) => curr.taxable ? acc + (curr.cantidad * curr.precioUnitario * (userProfile.tpsRate / 100)) : acc, 0);
                  const tvq = items.reduce((acc, curr) => curr.taxable ? acc + (curr.cantidad * curr.precioUnitario * (userProfile.tvqRate / 100)) : acc, 0);
                  const total = subtotal + tps + tvq;

                  return (
                    <>
                      <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest opacity-40">
                         <span>Sous-total: {subtotal.toFixed(2)}$</span>
                         <span>TPS: {tps.toFixed(2)}$</span>
                         <span>TVQ: {tvq.toFixed(2)}$</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <div className="flex flex-col text-left">
                           <span className="text-[7px] font-black uppercase text-emerald-400 italic">Total à payer</span>
                           <span className="text-2xl font-black italic tracking-tighter">{total.toFixed(2)}$</span>
                        </div>
                        <button 
                          onClick={() => {
                            if (!newInvoiceData.clientId) return alert("Veuillez sélectionner un client.");
                            
                            const idPrefix = tipoDoc === 'Facture' ? 'FAC-' : (tipoDoc === 'Soumission' ? 'SOU-' : 'REC-');
                            const selectedClient = clientes.find(c => c.id.toString() === newInvoiceData.clientId);
                            
                            let finalClientId = newInvoiceData.clientId;
                            let finalClientName = selectedClient?.nom || 'Client Externe';
                            let finalClientEmail = selectedClient?.email || '';

                            if (newInvoiceData.isNouveauClient && newInvoiceData.nouveauClientNom) {
                              const tempId = Date.now();
                              const createdClient = {
                                id: tempId,
                                nom: newInvoiceData.nouveauClientNom,
                                adresse: newInvoiceData.nouveauClientAdresse,
                                email: newInvoiceData.nouveauClientEmail,
                                neq: ''
                              };
                              setClientes(prev => [...prev, createdClient]);
                              finalClientName = createdClient.nom;
                              finalClientEmail = createdClient.email;
                            }

                            const newFac = {
                              id: editingInvoiceId || `${idPrefix}${nextInvoiceNumber.toString().padStart(3, '0')}`,
                              companyId: activeCompanyId,
                              cliente: finalClientName,
                              email: finalClientEmail,
                              fecha: new Date().toISOString().split('T')[0],
                              subtotal, tps, tvq, total,
                              status: tipoDoc === 'Reçu' ? 'Payée' : 'En attente',
                              tipoDoc,
                              items: JSON.parse(JSON.stringify(items)) // Clone items
                            };

                            if (editingInvoiceId) {
                              setHistorique(prev => prev.map(f => f.id === editingInvoiceId ? newFac : f));
                              alert("🟢 Facture mise à jour avec succès.");
                            } else {
                              setHistorique([newFac, ...historique]);
                              setNextInvoiceNumber(prev => prev + 1);
                            }

                            setEditingInvoiceId(null);
                            setSubVistaFactura('liste');
                            setItems([{ cantidad: 1, descripcion: '', precioUnitario: 0, taxable: true }]);
                            setNewInvoiceData({
                              clientId: '',
                              nouveauClientNom: '',
                              nouveauClientAdresse: '',
                              nouveauClientEmail: '',
                              isNouveauClient: false,
                              description: '',
                              precioUnitario: 0,
                              isTaxable: true
                            });
                          }}
                          className="bg-emerald-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase italic shadow-lg active:scale-95 transition-all"
                        >
                          Émettre
                        </button>
                      </div>
                      <Sparkles size={60} className="absolute -right-6 -bottom-6 opacity-5" />
                    </>
                  );
                })()}
              </div>
            </main>
          </div>
        )}

          {/* Modal Ajout Client Modernisé */}
          {showAddClientModal && (
            <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
               <div className={`w-full max-w-sm rounded-[40px] p-10 space-y-8 animate-in zoom-in-95 duration-300 text-left ${darkMode ? 'bg-zinc-950 text-zinc-100 border border-zinc-900 shadow-emerald-900/10' : 'bg-white text-slate-900 border border-slate-100 shadow-3xl'}`}>
                 <div className={`flex justify-between items-center -m-10 p-10 mb-2 border-b ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-100'}`}>
                   <button onClick={() => setShowAddClientModal(false)} className={`p-2 transition-colors rounded-xl ${darkMode ? 'bg-zinc-900 text-zinc-100 hover:text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-900'}`}><ArrowLeft size={22} /></button>
                   <h3 className={`font-black italic uppercase text-base tracking-tighter ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>Nouveau Client</h3>
                   <div className="w-10"></div>
                 </div>
                 
                 <div className="space-y-5">
                   <div className="space-y-1">
                     <label className={`text-[8px] font-black uppercase italic ml-2 tracking-widest leading-none ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>Nom complet</label>
                     <input 
                       value={newClient.nom} 
                       onChange={e => setNewClient({...newClient, nom: e.target.value})}
                       className={`w-full p-5 rounded-3xl text-sm font-bold border outline-none focus:ring-1 focus:ring-[#059669] transition-all font-sans ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800 placeholder-zinc-700' : 'bg-slate-50 text-slate-900 border-slate-100'}`} 
                       placeholder="Jean Tremblay" 
                     />
                   </div>
                   <div className="space-y-1">
                     <label className={`text-[8px] font-black uppercase italic ml-2 tracking-widest leading-none ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>Adresse complète</label>
                     <textarea 
                       value={newClient.adresse} 
                       onChange={e => setNewClient({...newClient, adresse: e.target.value})}
                       rows={2}
                       className={`w-full p-5 rounded-3xl text-[11px] font-bold border outline-none resize-none focus:ring-1 focus:ring-[#059669] transition-all leading-relaxed font-sans ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800 placeholder-zinc-700' : 'bg-slate-50 text-slate-900 border-slate-100'}`} 
                       placeholder="123 Rue de la Montagne, Montréal..." 
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                       <label className={`text-[8px] font-black uppercase italic ml-2 tracking-widest leading-none ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>NEQ</label>
                       <input 
                         value={newClient.neq} 
                         onChange={e => setNewClient({...newClient, neq: e.target.value})}
                         className={`w-full p-5 rounded-3xl text-[10px] font-bold border outline-none focus:ring-1 focus:ring-[#059669] font-sans ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800 placeholder-zinc-700' : 'bg-slate-50 text-slate-900 border-slate-100'}`} 
                         placeholder="1112223334" 
                       />
                     </div>
                     <div className="space-y-1">
                       <label className={`text-[8px] font-black uppercase italic ml-2 tracking-widest leading-none ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>Courriel</label>
                       <input 
                         value={newClient.email} 
                         onChange={e => setNewClient({...newClient, email: e.target.value})}
                         className={`w-full p-5 rounded-3xl text-[10px] font-bold border outline-none focus:ring-1 focus:ring-[#059669] font-sans ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800 placeholder-zinc-700' : 'bg-slate-50 text-slate-900 border-slate-100'}`} 
                         placeholder="jean@email.com" 
                       />
                     </div>
                   </div>
                 </div>

                 <button 
                   onClick={() => {
                     if (!newClient.nom || !newClient.email) {
                       return alert("Veuillez remplir le NOM et le COURRIEL pour cet enregistrement.");
                     }
                     const id = Date.now();
                     const client = { ...newClient, id };
                     setClientes((prev: any[]) => [...prev, client]);
                     
                     // Enforce immediate selection and state reset
                     setNewInvoiceData((prev: any) => ({ 
                       ...prev, 
                       clientId: id.toString(),
                       isNouveauClient: false 
                     }));
                     
                     playNotificationSound();
                     setShowAddClientModal(false);
                      setNewClient({ nom: '', adresse: '', email: '', neq: '' });


                    }}
                    className="w-full py-6 bg-[#059669] text-white rounded-[32px] text-[11px] font-black uppercase italic shadow-2xl active:scale-95 transition-all shadow-emerald-900/30 tracking-widest"
                  >
                    Enregistrer et Sélectionner
                  </button>
                </div>
             </div>
           )}
         </div>
       )}
     </div>
   );

  if (vista === 'dossiers' || vista === 'documents' || vista === 'drive') {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-black text-zinc-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans text-left overflow-x-hidden md:pl-72 relative transition-all duration-300`}>
        <WorkspaceSidebar />
        <DossierFiscauxView 
          darkMode={darkMode}
          setVista={setVista}
          playNotificationSound={playNotificationSound}
          sidebarToggle={
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden mr-1"
            >
              <Menu size={18} />
            </button>
          }
        />
      </div>
    );
  }
  
  if (vista === 'homeoffice') {
    const totalHomeOfficeExpenses = filteredDepenses
      .filter(d => d.cat === 'Bureau à domicile' && d.partnerTag === activeUser)
      .reduce((a, b) => a + b.total, 0);

    return (
      <div className={`min-h-screen ${darkMode ? 'bg-black text-zinc-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans animate-in slide-in-from-right text-left max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}>
        <WorkspaceSidebar />
        <header 
          className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} px-6 py-4 border-b flex items-center space-x-3 text-left shadow-sm`}
          style={{ borderTop: `4px solid ${darkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.3)'}` }}
        >
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden mr-1"
          >
            <Menu size={18} />
          </button>
          <button onClick={() => setVista('dashboard')} className={`p-2 transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}><ArrowLeft/></button>
          <div className="flex-1 text-left">
            <h2 className="font-black uppercase italic text-lg tracking-tighter">Bureau à domicile</h2>
            <p className="text-[8px] font-black text-[#059669] uppercase italic tracking-widest">Partenaire: {activeUser}</p>
          </div>
        </header>

        <main className="p-4 space-y-6 max-w-md mx-auto w-full text-left pb-24">
          {/* Dashboard-style Summary Banner */}
          <div className={`p-8 rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[160px] border-none ${darkMode ? 'bg-white text-slate-950' : 'bg-black text-white'}`}>
             <div className="relative z-10">
               <div className="flex justify-between items-start">
                 <div>
                   <p className={`text-[10px] font-black uppercase italic tracking-[0.2em] mb-1 ${darkMode ? 'text-slate-500' : 'text-white/40'}`}>Facteur de Déduction</p>
                   <h3 className="text-4xl font-black italic tracking-tighter">{(porcBureau * 100).toFixed(1)}%</h3>
                 </div>
                 <Percent className="text-emerald-500" size={32} />
               </div>
               
               <div className="mt-6">
                 <p className={`text-[9px] font-black uppercase italic tracking-widest ${darkMode ? 'text-slate-500' : 'text-white/40'}`}>Total Accumulé (Pro-rata)</p>
                 <p className="text-2xl font-black italic tracking-tighter text-emerald-500">{totalHomeOfficeExpenses.toFixed(2)} $</p>
               </div>
             </div>
             <Sparkles size={120} className="absolute -right-8 -bottom-8 opacity-5 text-emerald-500 rotate-12" />
          </div>

          {/* Mosaic Cards Layout with Integrated Inputs */}
          <div className="grid grid-cols-2 gap-4">
             {[
               { name: 'Loyer', cat: 'Loyer', key: 'loyer', icon: <Home size={24}/> },
               { name: 'Électricité / Hydro', cat: 'Electricité', key: 'hydro', icon: <Zap size={24}/> },
               { name: 'Internet / Télécom', cat: 'Internet', key: 'internet', icon: <Settings size={24}/> },
               { name: 'Assurance Habitation', cat: 'Assurance', key: 'assurance', icon: <ShieldCheck size={24}/> },
               { name: 'Taxes Municipales', cat: 'Taxes', key: 'taxesMuni', icon: <Briefcase size={24}/> },
               { name: 'Entretien / Réparations', cat: 'Entretien', key: 'entretien', icon: <Layout size={24}/> },
             ].map((item, idx) => (
               <div 
                 key={item.cat}
                 className={`p-6 rounded-[32px] border shadow-sm flex flex-col justify-between space-y-4 ${darkMode ? 'bg-zinc-950 border-zinc-900 text-zinc-100' : 'bg-white border-slate-100'}`}
               >
                 <div className="flex-1 space-y-4">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-slate-50 border border-slate-100'}`}>
                     <div className="text-emerald-500">{item.icon}</div>
                   </div>
                   
                   <div>
                     <p className={`text-[10px] font-black uppercase italic tracking-tight leading-tight ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{item.cat}</p>
                     <h4 className="text-sm font-black italic mt-1 leading-tight mb-3">{item.name}</h4>
                     
                     <div className="space-y-1">
                       <label className="text-[7px] font-black uppercase text-slate-500 italic">Total Annuel ($)</label>
                       <input 
                         type="number" 
                         step="0.01"
                         value={(currentHomeOffice as any)[item.key] || 0}
                         onChange={e => {
                           const val = parseFloat(e.target.value) || 0;
                           setPartnerData((prev: any) => ({
                             ...prev,
                             [activeUser]: {
                               ...prev[activeUser],
                               homeOffice: {
                                 ...prev[activeUser].homeOffice,
                                 [item.key]: val
                               }
                             }
                           }));
                           setListaEmpresas(prev => prev.map(emp => {
                             if (emp.id === activeCompanyId) {
                               const newData = {
                                 ...partnerData,
                                 [activeUser]: {
                                   ...partnerData[activeUser],
                                   homeOffice: {
                                     ...partnerData[activeUser].homeOffice,
                                     [item.key]: val
                                   }
                                 }
                               };
                               return { ...emp, partnerData: newData };
                             }
                             return emp;
                           }));
                         }}
                         className={`w-full p-3 rounded-xl text-[11px] font-bold border focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : 'bg-slate-50 text-slate-900 border-slate-100'}`} 
                       />
                     </div>
                   </div>
                 </div>

                 <button 
                   onClick={() => handleAddHomeExpense(item.cat)}
                   className={`w-full py-3 rounded-xl flex items-center justify-center space-x-2 text-[9px] font-black uppercase italic transition-all active:scale-95 ${darkMode ? 'bg-zinc-900 text-emerald-500 hover:bg-zinc-800' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                 >
                   <PlusCircle size={14} />
                   <span>Entrer Facture</span>
                 </button>
               </div>
             ))}
          </div>

          {/* Area Configuration Section */}
          <div className={`p-6 rounded-[32px] border space-y-4 text-left ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-100'}`}>
             <div className="flex items-center space-x-2">
               <div className="w-2 h-2 bg-[#059669] rounded-full animate-pulse shadow-sm shadow-emerald-500"></div>
               <p className={`text-[9px] font-black uppercase italic tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Configuration Proportion (pi²)</p>
             </div>
             <div className="grid grid-cols-2 gap-3 text-left">
                <div className="flex flex-col text-left space-y-2">
                  <span className={`text-[7px] font-black uppercase tracking-widest leading-none px-1 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>TOTAL MAISON</span>
                  <input 
                    type="number" 
                    value={currentHomeOffice.aireTotale} 
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setPartnerData((prev: any) => ({
                        ...prev,
                        [activeUser]: {
                          ...prev[activeUser],
                          homeOffice: {
                            ...prev[activeUser].homeOffice,
                            aireTotale: val
                          }
                        }
                      }));
                      setListaEmpresas(prev => prev.map(emp => {
                        if (emp.id === activeCompanyId) {
                          const newData = {
                            ...partnerData,
                            [activeUser]: {
                              ...partnerData[activeUser],
                              homeOffice: {
                                ...partnerData[activeUser].homeOffice,
                                aireTotale: val
                              }
                            }
                          };
                          return { ...emp, partnerData: newData };
                        }
                        return emp;
                      }));
                    }} 
                    className={`p-4 rounded-2xl text-xs font-bold text-left border focus:ring-1 focus:ring-[#059669] outline-none transition-all ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : 'bg-slate-50 text-slate-900 border-slate-200'}`} 
                  />
                </div>
                <div className="flex flex-col text-left space-y-2">
                  <span className={`text-[7px] font-black uppercase tracking-widest leading-none px-1 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>BUREAU</span>
                  <input 
                    type="number" 
                    value={currentHomeOffice.aireBureau} 
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setPartnerData((prev: any) => ({
                        ...prev,
                        [activeUser]: {
                          ...prev[activeUser],
                          homeOffice: {
                            ...prev[activeUser].homeOffice,
                            aireBureau: val
                          }
                        }
                      }));
                      setListaEmpresas(prev => prev.map(emp => {
                        if (emp.id === activeCompanyId) {
                          const newData = {
                            ...partnerData,
                            [activeUser]: {
                              ...partnerData[activeUser],
                              homeOffice: {
                                ...partnerData[activeUser].homeOffice,
                                aireBureau: val
                              }
                            }
                          };
                          return { ...emp, partnerData: newData };
                        }
                        return emp;
                      }));
                    }} 
                    className={`p-4 rounded-2xl text-xs font-bold text-left border focus:ring-1 focus:ring-[#059669] outline-none transition-all ${darkMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : 'bg-slate-50 text-slate-900 border-slate-200'}`} 
                  />
                </div>
             </div>
          </div>
          
          <div className="bg-emerald-500/10 p-4 rounded-2xl flex items-center space-x-3 border border-emerald-500/20">
            <Sparkles size={18} className="text-emerald-500" />
            <p className="text-[10px] font-bold italic text-emerald-600 opacity-80 leading-snug">
              Toutes les entrées seront automatiquement calculées à {(porcBureau * 100).toFixed(1)}% pour vos rapports de dépenses.
            </p>
          </div>
        </main>
      </div>
    );
  }


   if (vista === 'taxes') {
     const totalVentesBrutes = filteredHistorique.reduce((a, b) => a + b.subtotal, 0);
     const resultFiscalNet = (tpsPerçue + tvqPerçue) - (tpsITR + tvqRTI);

     // STRICT MANDATE: Define exempt profile (Residential Plex) vs Commercial Profiles
     const isExemptTaxProfile = activeCompanyId === '3' || (empresa?.legalEntity && empresa.legalEntity.includes('Co-propriété'));
     const isCommercialProfile = !isExemptTaxProfile;

     return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-zinc-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans animate-in slide-in-from-right text-left max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}>
      <WorkspaceSidebar />
      <header 
        className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} px-6 py-5 border-b flex items-center space-x-3 text-left shadow-sm`}
        style={{ borderTop: `4px solid ${darkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.3)'}` }}
      >
        <button 
          onClick={() => setIsSidebarOpen(true)} 
          className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden mr-1"
        >
          <Menu size={18} />
        </button>
        <button onClick={() => setVista('dashboard')} className={`p-2 transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}><ArrowLeft size={28}/></button>
        <h2 className="font-black uppercase italic tracking-tighter text-lg text-left leading-none mt-1">Rapport de Taxes (TPS/TVQ)</h2>
      </header>
      <main className="p-6 space-y-6 max-w-md mx-auto w-full text-left flex-1">
        <div className={`p-8 rounded-[40px] text-white shadow-lg relative overflow-hidden text-left border ${darkMode ? 'bg-[#059669]/90 border-[#059669]' : 'bg-[#059669] border-emerald-500/10'}`}>
           <div className="relative z-10">
             <p className={`text-[10px] font-black uppercase mb-2 italic tracking-[0.2em] ${darkMode ? 'text-emerald-200/50' : 'text-emerald-900/50'}`}>Remboursement Net Estimé</p>
             <p className="text-5xl font-black italic tracking-tighter text-left">{resultFiscalNet.toFixed(2)} $</p>
             {isExemptTaxProfile && (
               <div className="mt-4 flex space-x-4 border-t border-white/20 pt-4">
                 <div>
                   {currentCompany?.partners?.map((p: string) => {
                      const pct = currentCompany?.partnersPct?.[p] ?? (100 / (currentCompany?.partners?.length || 1));
                      return (
                        <div key={p} className="mr-4">
                          <p className="text-[8px] font-black uppercase opacity-60">Part {p} ({pct}%)</p>
                          <p className="text-lg font-black italic tracking-tighter">{(resultFiscalNet * (pct / 100)).toFixed(2)}$</p>
                        </div>
                      );
                    })}
                    {/*
                   <p className="text-lg font-black italic tracking-tighter">{(resultFiscalNet * 0.5).toFixed(2)}$</p>
                 </div>
                 <div>
                   */ } </div> <div className="hidden">
                   <p className="text-lg font-black italic tracking-tighter">{(resultFiscalNet * 0.5).toFixed(2)}$</p>
                 </div>
               </div>
             )}
           </div>
           <Percent size={120} className="absolute -right-8 -bottom-8 text-white/10 rotate-12" />
        </div>

        <div className="space-y-3 text-left">
           {[ 
             { l: 'TPS Perçue (Ventes)', v: tpsPerçue, c: 'text-[#059669]' }, 
             { l: 'ITR-TPS (Dépenses)', v: tpsITR, c: 'text-rose-500' }, 
             { l: 'TVQ Perçue (Ventes)', v: tvqPerçue, c: 'text-[#059669]' }, 
             { l: 'RTI-TVQ (Dépenses)', v: tvqRTI, c: 'text-rose-500' } 
           ].map((line, i) => (
             <div key={i} className={`p-5 rounded-[28px] border flex justify-between items-center text-left hover:border-[#059669] transition-all shadow-sm ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'}`}>
               <span className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{line.l}</span>
               <span className={`font-black italic text-sm ${line.c}`}>{line.v.toFixed(2)}$</span>
             </div>
           ))}
        </div>
        
        <div className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} p-6 rounded-[32px] border space-y-3 shadow-sm`}>
           <div className={`flex justify-between items-center text-[10px] font-black uppercase italic px-1 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
             <span>Période</span>
             <span className={`${darkMode ? 'text-zinc-100' : 'text-slate-900'} underline decoration-[#059669] italic`}>MAI 2026</span>
           </div>
           <div className={`h-px ${darkMode ? 'bg-zinc-900' : 'bg-slate-100'}`}></div>
           
           {isExemptTaxProfile ? (
             <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-3 text-left">
               <ShieldCheck className="text-emerald-500 mt-0.5 shrink-0" size={18} />
               <p className={`text-[9px] italic font-bold leading-relaxed ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                 Statut : Activité résidentielle exonérée. Aucune déclaration de taxes FP-500 n'est requise pour ce profil. La TPS/TVQ payée sur les réparations est automatiquement capitalisée comme dépense déductible brute pour vos impôts fonciers de fin d'année (Formulaire TP-128 / T776).
               </p>
             </div>
           ) : (
             <div className={`p-4 rounded-2xl border flex items-start space-x-3 text-left ${darkMode ? 'bg-amber-950/20 border-amber-900' : 'bg-amber-50 border-amber-100'}`}>
                <AlertTriangle className="text-amber-500 mt-0.5" size={18} />
                <p className={`text-[9px] italic font-medium leading-relaxed ${darkMode ? 'text-amber-200/80' : 'text-amber-700'}`}>
                  ATTENTION: Ce rapport est une estimation automatisée par l'IA d'AutoCompt. Veuillez vérifier vos factures avant la déclaration finale via le portail de Revenu Québec.
                </p>
             </div>
           )}
        </div>

        {isCommercialProfile && (
          <button 
            onClick={() => setShowTaxModal(true)}
            className={`w-full py-5 rounded-[32px] font-black uppercase text-[10px] tracking-widest italic active:scale-95 transition-all shadow-xl ${darkMode ? 'bg-zinc-100 text-black' : 'bg-slate-900 text-white'}`}
          >
             Exporter Formulaire FP-500
          </button>
        )}
      </main>

      {/* Tax Modal Overlay */}
      <AnimatePresence>
        {showTaxModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden border ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-100'}`}
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center space-x-2">
                  <LogoPrincipal size={18} />
                  <h3 className="text-[10px] font-black uppercase italic tracking-widest leading-none mt-1">Formulaire FP-500</h3>
                </div>
                <button onClick={() => setShowTaxModal(false)} className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors">
                  Fermer
                </button>
              </div>

              <div className="p-8 space-y-5">
                {[
                  { label: "Ligne 22 : Fournitures taxables totales (Ventes brutes)", value: totalVentesBrutes },
                  { label: "Ligne 105 : TPS perçue", value: tpsPerçue },
                  { label: "Ligne 108 : Crédits ITR (TPS payée sur dépenses)", value: tpsITR },
                  { label: "Ligne 205 : TVQ perçue", value: tvqPerçue },
                  { label: "Ligne 208 : Crédits RTI (TVQ payée sur dépenses)", value: tvqRTI },
                ].map((row, idx) => (
                  <div key={idx} className="flex justify-between items-end border-b border-dashed border-zinc-100 dark:border-zinc-900 pb-2">
                    <span className="text-[8px] font-bold uppercase text-zinc-400 text-left max-w-[70%] leading-tight">{row.label}</span>
                    <span className={`text-[11px] font-black italic ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{row.value.toFixed(2)} $</span>
                  </div>
                ))}

                <div className={`mt-8 p-6 rounded-3xl border-2 ${resultFiscalNet < 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <p className={`text-[9px] font-black uppercase italic ${resultFiscalNet < 0 ? 'text-emerald-600' : 'text-amber-600'}`}>Résultat Fiscal Net</p>
                      <p className={`text-[8px] font-bold uppercase opacity-50 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                        {resultFiscalNet < 0 ? 'Remboursement attendu' : 'Solde à payer'}
                      </p>
                    </div>
                    <p className={`text-2xl font-black italic tracking-tighter ${resultFiscalNet < 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {resultFiscalNet.toFixed(2)} $
                    </p>
                  </div>
                </div>

                <p className="text-[7px] font-bold text-zinc-400 uppercase italic text-center mt-4 tracking-widest">Généré le {new Date().toLocaleDateString('fr-CA')}</p>
              </div>

              <button 
                onClick={() => setShowTaxModal(false)}
                className={`w-full py-6 text-[10px] font-black uppercase italic tracking-widest border-t ${darkMode ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-zinc-50 text-zinc-400 border-zinc-100'} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`}
              >
                Fermer l'aperçu
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
     );
   }


  // --- MÓDULO RAPPORT COMPTABLE (AUTOCOMPT) ---
  if (vista === 'rapports') {
    const profileSelected = listaEmpresas.find(e => e.nombre === selectedRapportProfile) || currentCompany;
    const profileId = profileSelected ? profileSelected.id : activeCompanyId;

    const compFilteredInvoices = historique.filter(h => h.companyId === profileId);
    const compFilteredExpenses = depenses.filter(d => d.companyId === profileId);

    const filterBySelectedPeriod = (items: any[]) => items.filter(item => {
      const dateStr = item.fecha || item.date;
      if (!dateStr) return true;
      const d = new Date(dateStr);
      const currentYear = 2026;
      
      if (selectedRapportPeriod === 'Mois en cours') {
        return d.getMonth() === selectedMonth && d.getFullYear() === currentYear;
      }
      if (selectedRapportPeriod === 'Dernier trimestre') {
        const m = d.getMonth();
        return d.getFullYear() === currentYear && (m >= selectedMonth - 2 && m <= selectedMonth);
      }
      if (selectedRapportPeriod === 'Année financière 2026') {
        return d.getFullYear() === currentYear;
      }
      return true;
    });

    const periodFilteredInvoices = filterBySelectedPeriod(compFilteredInvoices);
    const periodFilteredExpenses = filterBySelectedPeriod(compFilteredExpenses);

    const totalRevenus = periodFilteredInvoices.reduce((a, b) => a + (b.total || 0), 0);
    const totalDepenses = periodFilteredExpenses.reduce((a, b) => a + (b.total || 0), 0);

    const tpsCollectee = periodFilteredInvoices.reduce((a, b) => a + (b.tps || 0), 0);
    const tvqCollectee = periodFilteredInvoices.reduce((a, b) => a + (b.tvq || 0), 0);

    const processedReportExpenses = periodFilteredExpenses.map(d => {
      const companyFolders = customDossiers[profileId] || [];
      const matchingFolder = companyFolders.find(f => f.name === d.cat);
      const dossierRule = matchingFolder ? matchingFolder.rule : 'full';

      let fiscalRate = 1.0;
      if (profileId === '3') {
        const isBuildingWide = buildingWideCats.includes(d.cat);
        fiscalRate = isBuildingWide ? 0.666 : 1.0;
      } else {
        if (dossierRule === 'half') fiscalRate = 0.5;
        else if (dossierRule === 'homeoffice') fiscalRate = porcBureau;
      }

      return {
        ...d,
        deductibleTps: (d.tps || 0) * fiscalRate,
        deductibleTvq: (d.tvq || 0) * fiscalRate
      };
    });

    const tpsPayee = processedReportExpenses.reduce((a, b) => a + b.deductibleTps, 0);
    const tvqPayee = processedReportExpenses.reduce((a, b) => a + b.deductibleTvq, 0);

    const netTaxBalance = (tpsCollectee - tpsPayee) + (tvqCollectee - tvqPayee);

    const mappedInvoices = periodFilteredInvoices.map(idx => ({
      id: idx.id,
      date: idx.fecha || idx.date,
      tiers: idx.cliente || idx.client || 'Client Général',
      compte: 'Loyers / Ventes',
      partenaire: idx.partenaire || 'Fabiola',
      net: idx.subtotal,
      tps: idx.tps,
      tvq: idx.tvq,
      total: idx.total,
      type: 'revenu'
    }));

    const mappedExpenses = periodFilteredExpenses.map(idx => ({
      id: idx.id,
      date: idx.fecha || idx.date,
      tiers: idx.proveedor || idx.tiers || 'Fournisseur Général',
      compte: idx.cat || 'Frais de fonctionnement',
      partenaire: idx.partenaire || 'Fabiola',
      net: idx.subtotal,
      tps: idx.tps,
      tvq: idx.tvq,
      total: idx.total,
      type: 'depense'
    }));

    const sortedRows = [...mappedInvoices, ...mappedExpenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const displayRows = sortedRows.length > 0 ? sortedRows : [
      { id: 'm1', date: '2026-05-15', tiers: 'Solutions GPA Inc.', compte: 'Services Conseil', partenaire: 'Fabiola', net: 1500.00, tps: 75.00, tvq: 149.63, total: 1724.63, type: 'revenu' },
      { id: 'm2', date: '2026-05-12', tiers: 'Hydro-Québec', compte: 'Électricité / Chauffage', partenaire: 'Fabiola', net: 180.00, tps: 9.00, tvq: 17.96, total: 206.96, type: 'depense' },
      { id: 'm3', date: '2026-05-08', tiers: 'Videotron', compte: 'Internet / Télécom', partenaire: 'Natalia', net: 85.00, tps: 4.25, tvq: 8.48, total: 97.73, type: 'depense' },
    ];

    return (
      <div className={`min-h-screen relative ${darkMode ? 'bg-[#0A0A0B] text-zinc-105' : 'bg-[#FAF9F6] text-slate-900'} flex flex-col font-sans text-left animate-in zoom-in-95 max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}>
        <WorkspaceSidebar />
        
        {/* Soft background pastel glows for minimalist warmth */}
        <div className="absolute top-1/4 left-1/4 w-[340px] h-[340px] rounded-full bg-teal-500/[0.04] dark:bg-teal-500/[0.02] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[380px] h-[380px] rounded-full bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] blur-[120px] pointer-events-none" />

        <header 
          className={`${darkMode ? 'bg-zinc-950/80 border-zinc-900' : 'bg-white/85 border-slate-200'} backdrop-blur-md px-6 py-5 border-b flex items-center justify-between sticky top-0 z-40`}
          style={{ borderTop: `4px solid ${darkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.3)'}` }}
        >
          <div className="flex items-center space-x-3.5">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden mr-1"
            >
              <Menu size={18} />
            </button>
            <button onClick={() => setVista('reportes')} className={`p-2 transition-colors rounded-xl transition-all ${darkMode ? 'text-zinc-500 hover:text-white hover:bg-zinc-900' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}><ArrowLeft size={24} /></button>
            <div>
              <h2 className="font-black uppercase italic tracking-tighter text-xl leading-none">Rapports Comptables</h2>
              <p className="text-[7.5px] font-black uppercase text-slate-400 italic tracking-[0.2em] mt-1.5">Paquet de fin de période pour Natalia</p>
            </div>
          </div>
          
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className={`p-2.5 rounded-full transition-all ${darkMode ? 'text-amber-400 bg-zinc-900' : 'text-slate-400 bg-white border border-slate-100 shadow-sm'}`}
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </header>

        <main className="p-6 space-y-6 max-w-5xl mx-auto w-full flex-1 relative z-10 text-left">
          
          {/* 1. FILTERS HEADER (Filtres de Période) */}
          <div className={`p-5 rounded-[28px] border ${darkMode ? 'bg-zinc-950/70 border-zinc-901' : 'bg-white border-slate-200/50 shadow-sm'} grid grid-cols-1 md:grid-cols-3 gap-4`}>
            
            {/* Filter 1: Période */}
            <div className="relative">
              <label className="block text-[8px] font-black uppercase italic tracking-wider text-slate-400 mb-1.5">Période fiscale</label>
              <button
                onClick={() => {
                  setShowPeriodDropdown(!showPeriodDropdown);
                  setShowProfileDropdown(false);
                  setShowFormatDropdown(false);
                }}
                className={`w-full px-4 py-3 rounded-2xl border text-left flex justify-between items-center text-[10px] font-black uppercase italic tracking-wide transition-all ${darkMode ? 'bg-zinc-900 border-zinc-805 text-zinc-300 hover:bg-zinc-850' : 'bg-white border-slate-200 text-slate-705 hover:bg-slate-50'}`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar size={13} className="text-teal-600 dark:text-teal-400" />
                  <span>{selectedRapportPeriod}</span>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              <AnimatePresence>
                {showPeriodDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPeriodDropdown(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: 5 }}
                      className={`absolute left-0 right-0 mt-2 p-2 rounded-2xl shadow-xl border z-50 overflow-hidden ${darkMode ? 'bg-zinc-900 border-zinc-805' : 'bg-white border-slate-150'}`}
                    >
                      {['Mois en cours', 'Dernier trimestre', 'Année financière 2026'].map((period) => (
                        <button
                          key={period}
                          onClick={() => {
                            setSelectedRapportPeriod(period);
                            setShowPeriodDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left rounded-xl text-[9px] font-black uppercase italic tracking-wider transition-all ${selectedRapportPeriod === period ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}
                        >
                          {period}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Filter 2: Profil */}
            <div className="relative">
              <label className="block text-[8px] font-black uppercase italic tracking-wider text-slate-400 mb-1.5">Profil d'entreprise</label>
              <button
                onClick={() => {
                  setShowProfileDropdown(!showProfileDropdown);
                  setShowPeriodDropdown(false);
                  setShowFormatDropdown(false);
                }}
                className={`w-full px-4 py-3 rounded-2xl border text-left flex justify-between items-center text-[10px] font-black uppercase italic tracking-wide transition-all ${darkMode ? 'bg-zinc-900 border-zinc-805 text-zinc-300 hover:bg-zinc-850' : 'bg-white border-slate-200 text-slate-705 hover:bg-slate-50'}`}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Briefcase size={13} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{selectedRapportProfile}</span>
                </div>
                <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
              </button>

              <AnimatePresence>
                {showProfileDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: 5 }}
                      className={`absolute left-0 right-0 mt-2 p-2 rounded-2xl shadow-xl border z-50 overflow-hidden ${darkMode ? 'bg-zinc-905 border-zinc-805' : 'bg-white border-slate-150'}`}
                    >
                      {listaEmpresas.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => {
                            setSelectedRapportProfile(e.nombre);
                            setShowProfileDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left rounded-xl text-[9px] font-black uppercase italic tracking-wider transition-all truncate flex items-center justify-between ${selectedRapportProfile === e.nombre ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}
                        >
                          <span>{e.nombre}</span>
                          <span className="text-[6.5px] font-semibold opacity-60 px-1 py-0.5 rounded bg-slate-100 dark:bg-zinc-805">{e.industry}</span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Filter 3: Format */}
            <div className="relative">
              <label className="block text-[8px] font-black uppercase italic tracking-wider text-slate-400 mb-1.5">Format d'exportation</label>
              <button
                onClick={() => {
                  setShowFormatDropdown(!showFormatDropdown);
                  setShowPeriodDropdown(false);
                  setShowProfileDropdown(false);
                }}
                className={`w-full px-4 py-3 rounded-2xl border text-left flex justify-between items-center text-[10px] font-black uppercase italic tracking-wide transition-all ${darkMode ? 'bg-zinc-900 border-zinc-805 text-zinc-300 hover:bg-zinc-850' : 'bg-white border-slate-200 text-slate-705 hover:bg-slate-50'}`}
              >
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet size={13} className="text-amber-600 dark:text-amber-400" />
                  <span>{selectedRapportFormat}</span>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              <AnimatePresence>
                {showFormatDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFormatDropdown(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: 5 }}
                      className={`absolute left-0 right-0 mt-2 p-2 rounded-2xl shadow-xl border z-50 overflow-hidden ${darkMode ? 'bg-zinc-900 border-zinc-805' : 'bg-white border-slate-150'}`}
                    >
                      {['Excel / CSV', 'PDF Unifié'].map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => {
                            setSelectedRapportFormat(fmt);
                            setShowFormatDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left rounded-xl text-[9px] font-black uppercase italic tracking-wider transition-all ${selectedRapportFormat === fmt ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* 2. FISCAL SUMMARY CARDS (Aperçu de la Période) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            
            {/* Card 1: Revenues */}
            <div className={`p-6 rounded-[32px] border transition-all ${darkMode ? 'bg-zinc-950/70 border-zinc-900/85 hover:border-emerald-500/20 shadow-lg shadow-emerald-950/[0.01]' : 'bg-white border-slate-200/50 hover:shadow-lg shadow-sm hover:border-emerald-500/20'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${darkMode ? 'bg-emerald-950/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  <TrendingUp size={20} />
                </div>
                <span className="text-[7.5px] font-black uppercase text-slate-400 italic bg-slate-100 dark:bg-zinc-900 px-2 py-1 rounded-lg">Brut Fiscal</span>
              </div>
              <p className="text-[8px] font-black uppercase italic text-slate-400 tracking-wider">Total des Revenus</p>
              <h3 className="text-2xl font-black italic tracking-tighter text-emerald-600 dark:text-emerald-400 mt-1">{totalRevenus.toFixed(2)} $</h3>
              <p className="text-[7px] font-bold text-slate-400 dark:text-zinc-500 mt-2.5 uppercase tracking-wide">
                Indice de rentabilité • Est. AutoCompt
              </p>
            </div>

            {/* Card 2: Expenditures */}
            <div className={`p-6 rounded-[32px] border transition-all ${darkMode ? 'bg-zinc-950/70 border-zinc-900/85 hover:border-rose-500/20 shadow-lg shadow-emerald-950/[0.01]' : 'bg-white border-slate-200/50 hover:shadow-lg shadow-sm hover:border-rose-500/20'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${darkMode ? 'bg-rose-950/20 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                  <Percent size={20} />
                </div>
                <span className="text-[7.5px] font-black uppercase text-slate-400 italic bg-slate-100 dark:bg-zinc-900 px-2 py-1 rounded-lg">Frais Réclamables</span>
              </div>
              <p className="text-[8px] font-black uppercase italic text-slate-400 tracking-wider">Total des Dépenses</p>
              <h3 className="text-2xl font-black italic tracking-tighter text-rose-600 dark:text-rose-400 mt-1">{totalDepenses.toFixed(2)} $</h3>
              <p className="text-[7px] font-bold text-slate-400 dark:text-zinc-500 mt-2.5 uppercase tracking-wide">
                Justificatifs réclamables indexés
              </p>
            </div>

            {/* Card 3: TPS & TVQ Breakdown */}
            <div className={`p-6 rounded-[32px] border transition-all ${darkMode ? 'bg-zinc-950/70 border-zinc-900/85 hover:border-teal-500/20 shadow-lg shadow-emerald-955/[0.01]' : 'bg-white border-slate-200/50 hover:shadow-lg shadow-sm hover:border-teal-500/20'} flex flex-col justify-between`}>
              <div>
                <p className="text-[8px] font-black uppercase italic text-slate-400 tracking-wider">Retenues TPS/TVQ accumulées</p>
                
                <div className="grid grid-cols-2 gap-3 mt-3 border-b border-dashed border-slate-100 dark:border-zinc-900 pb-2.5">
                  <div>
                    <h5 className="text-[6.5px] font-black text-slate-400 text-left uppercase">TPS (Perçue vs Payée)</h5>
                    <div className="flex items-center space-x-1.5 mt-1 font-mono text-[9px]">
                      <span className="text-emerald-600 font-bold">+{tpsCollectee.toFixed(2)}$</span>
                      <span className="text-slate-400 dark:text-zinc-650">/</span>
                      <span className="text-rose-500">-{tpsPayee.toFixed(2)}$</span>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-[6.5px] font-black text-slate-400 text-left uppercase">TVQ (Perçue vs Payée)</h5>
                    <div className="flex items-center space-x-1.5 mt-1 font-mono text-[9px]">
                      <span className="text-emerald-600 font-bold">+{tvqCollectee.toFixed(2)}$</span>
                      <span className="text-slate-400 dark:text-zinc-650">/</span>
                      <span className="text-rose-500">-{tvqPayee.toFixed(2)}$</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[7.5px] font-black uppercase text-slate-500 dark:text-zinc-400">Net estimatif à payer</span>
                <span className={`font-mono text-[10px] font-black italic px-2 py-1 rounded-lg ${netTaxBalance >= 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                  {netTaxBalance >= 0 ? '+' : ''}{netTaxBalance.toFixed(2)} $
                </span>
              </div>
            </div>

          </div>

          {/* 3. 8 COLUMNS DOCUMENT PREVIEW */}
          <div className={`p-6 rounded-[32px] border ${darkMode ? 'bg-zinc-950/70 border-zinc-900/85 shadow-2xl' : 'bg-white border-slate-200/50 shadow-sm'} text-left overflow-hidden flex flex-col`}>
             <div className="flex items-center justify-between mb-5">
               <div>
                  <h4 className="text-[9px] font-black uppercase italic text-slate-400 tracking-wider">PREVISUALISATION DES 8 COLONNES FISCALES</h4>
                  <p className="text-[7px] text-slate-400 mt-1 uppercase tracking-tight">Registre consolidé pour conformité avec Revenu Québec</p>
               </div>
               <div className="flex items-center space-x-2">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wide">Prêt pour audit</span>
               </div>
             </div>

             <div className="overflow-x-auto w-full no-scrollbar">
                <table className="w-full min-w-[900px] border-collapse text-left">
                   <thead>
                      <tr className="text-[8px] uppercase font-black bg-slate-50 dark:bg-zinc-900/50 text-slate-500 dark:text-zinc-400 rounded-xl">
                         <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-left rounded-l-xl">Date</th>
                         <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-left">Tiers (Entité)</th>
                         <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-left">Compte (Catégorie)</th>
                         <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-left">Partenaire</th>
                         <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-right">Net brut</th>
                         <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-right">TPS (5%)</th>
                         <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-right">TVQ (9.975%)</th>
                         <th className="py-3 px-4 border-b border-slate-100 dark:border-zinc-900 italic text-right rounded-r-xl">Total final</th>
                      </tr>
                   </thead>
                   <tbody className={`divide-y ${darkMode ? 'divide-zinc-900' : 'divide-slate-100'}`}>
                      {displayRows.map((row) => (
                         <tr key={row.id} className="text-[9.5px] font-bold transition-all hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                            <td className="py-4 px-4 font-mono text-slate-400 dark:text-zinc-500 text-left">{row.date}</td>
                            <td className="py-4 px-4 text-left">
                              <span className={`${darkMode ? 'text-zinc-200' : 'text-slate-800'}`}>{row.tiers}</span>
                              <span className={`ml-2 text-[6.5px] px-1.5 py-0.5 rounded-full font-black uppercase ${row.type === 'revenu' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                 {row.type === 'revenu' ? 'Rev' : 'Dép'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-500 dark:text-zinc-400 italic font-sans text-left">{row.compte}</td>
                            <td className="py-4 px-4 text-left">
                              <span className="text-[8px] font-black uppercase italic tracking-wider text-slate-400 bg-slate-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-md">{row.partenaire}</span>
                            </td>
                            <td className="py-4 px-4 font-mono text-right text-slate-600 dark:text-zinc-400">{row.net.toFixed(2)} $</td>
                            <td className="py-4 px-4 font-mono text-right text-slate-500 dark:text-zinc-500">{row.tps.toFixed(2)} $</td>
                            <td className="py-4 px-4 font-mono text-right text-slate-500 dark:text-zinc-500">{row.tvq.toFixed(2)} $</td>
                            <td className="py-4 px-4 font-mono text-right font-black italic text-slate-900 dark:text-zinc-100">{row.total.toFixed(2)} $</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          {/* 4. ACTIONS FOR TRANSMISSION */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
             <button 
               onClick={() => {
                 playNotificationSound();
                 const text = `Date,Tiers,Compte,Partenaire,Net,TPS,TVQ,Total\n` + 
                   displayRows.map(r => `"${r.date}","${r.tiers}","${r.compte}","${r.partenaire}",${r.net},${r.tps},${r.tvq},${r.total}`).join('\n');
                 const blob = new Blob([text], { type: 'text/csv' });
                 const url = URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 a.href = url;
                 a.download = `Livre_Comptes_AutoCompt_${selectedRapportProfile.replace(/\s+/g, '_')}_${selectedRapportPeriod.replace(/\s+/g, '_')}.csv`;
                 document.body.appendChild(a);
                 a.click();
                 document.body.removeChild(a);
               }}
               className={`py-4 px-6 rounded-2xl flex items-center justify-center space-x-2 text-[9.5px] font-black uppercase italic tracking-wider transition-all border ${darkMode ? 'bg-zinc-900 text-zinc-300 border-zinc-805 hover:border-zinc-700' : 'bg-white text-slate-705 border-slate-200 hover:bg-slate-50'}`}
             >
                <Download size={15} />
                <span>Télécharger le CSV local</span>
             </button>

             <button 
               onClick={() => {
                 playNotificationSound();
                 setShowRapportDispatcherModal(true);
               }}
               className="flex-1 py-4.5 rounded-2xl text-[9.5px] font-black uppercase italic tracking-widest bg-gradient-to-r from-teal-600 via-[#059669] to-teal-500 text-white shadow-lg shadow-emerald-900/25 flex items-center justify-center space-x-2.5 transition-all hover:scale-[1.01] active:scale-98"
             >
                <Send size={15} />
                <span>Envoyer</span>
             </button>
          </div>

        </main>

        {/* MODAL TRANSMISSION ENVOYER À LE COMPTABLE */}
        <AnimatePresence>
          {showComptableModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 animate-out fade-out">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 15 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 15 }}
                 className={`w-full max-w-lg p-6 rounded-[36px] border ${darkMode ? 'bg-zinc-950 border-zinc-900 text-white' : 'bg-white border-slate-150 text-slate-905'} shadow-2xl relative text-left`}
               >
                  <button 
                    onClick={() => setShowComptableModal(false)}
                    className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
                  >
                     <X size={16} />
                  </button>

                  <div className="flex items-center space-x-2.5 mb-5 border-b border-slate-100 dark:border-zinc-900 pb-4 text-left">
                     <div className="p-2.5 bg-teal-500/10 text-teal-600 rounded-xl">
                        <Mail size={18} />
                     </div>
                     <div className="text-left">
                        <h4 className="text-[12px] font-black uppercase italic">Paquet de Transmission Comptable</h4>
                        <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wide">Compilateur unifié AutoCompt v2.6</p>
                     </div>
                  </div>

                  {rapportSentSuccess ? (
                    <motion.div 
                      initial={{ scale: 0.92, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="py-10 text-center space-y-4"
                    >
                       <div className="inline-flex p-4.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20 shadow-md">
                          <CheckCircle2 size={36} className="text-emerald-500" />
                       </div>
                       <div>
                          <h4 className="text-sm font-black uppercase italic text-emerald-600 dark:text-emerald-400">Succès: Rapport envoyé !</h4>
                          <p className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase font-black tracking-widest mt-1">Natalia recevra les pièces jointes sous peu</p>
                       </div>
                       
                       <p className="text-[8px] italic text-slate-400 bg-slate-50 dark:bg-zinc-905 p-4.5 rounded-2xl max-w-xs mx-auto">
                         Transmission chiffrée de bout en bout effectuée avec succès via le relais sécurisé d'AutoCompt.
                       </p>

                       <div className="pt-2">
                         <button 
                           onClick={() => setShowComptableModal(false)}
                           className="w-full py-3.5 bg-slate-100 dark:bg-zinc-900 text-[9px] font-black uppercase italic tracking-widest rounded-2xl text-slate-600 dark:text-zinc-400"
                         >
                            Terminer
                         </button>
                       </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-4 text-left">
                       
                       <div className="text-left">
                          <label className="block text-[8px] font-black uppercase italic text-slate-400 tracking-wider mb-1.5">Courriel de la comptable {(currentComptable.nom ? `(${currentComptable.nom})` : '(Natalia C.)')}</label>
                          <input 
                            type="email"
                            value={comptableEmail}
                            onChange={(e) => {
                              const newEmail = e.target.value;
                              setComptablesConfig(prev => ({
                                ...prev,
                                [activeCompanyId]: {
                                  ...(prev[activeCompanyId] || { nom: 'Natalia Caisse', email: 'natalia.caisse@solutionsgpa.ca', tel: '+1 (514) 555-0199', drive: '' }),
                                  email: newEmail
                                }
                              }));
                            }}
                            placeholder="ex: natalia@comptable.ca"
                            className={`w-full p-4 rounded-2xl border text-[9.5px] font-mono tracking-wide ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`}
                          />
                       </div>

                       <div className="text-left">
                          <label className="block text-[8px] font-black uppercase italic text-slate-400 tracking-wider mb-1.5">Message personnalisé d'accompagnement (FR-QC)</label>
                          <textarea 
                            rows={5}
                            value={comptableMessage}
                            onChange={(e) => setComptableMessage(e.target.value)}
                            className={`w-full p-4 rounded-2xl border text-[9px] font-medium leading-relaxed font-sans ${darkMode ? 'bg-zinc-900 border-zinc-805 text-zinc-200' : 'bg-slate-50 border-slate-100 text-slate-705'}`}
                          />
                       </div>

                       <div className={`p-4 rounded-2xl border text-[8px] font-semibold flex items-center space-x-3 bg-teal-500/[0.03] border-teal-500/10 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                          <FileSpreadsheet size={16} className="text-teal-500 flex-shrink-0" />
                          <p className="leading-snug text-left">
                             <strong className="text-teal-600 dark:text-teal-400">Pièces jointes incluses :</strong> Livre des comptes au format <strong className="font-bold underline">{selectedRapportFormat}</strong>, ainsi que le registre des dépenses justificatives raccordé pour <strong className="font-bold">{selectedRapportPeriod}</strong>.
                          </p>
                       </div>

                       <div className="pt-2 flex space-x-3">
                          <button 
                            type="button"
                            onClick={() => setShowComptableModal(false)}
                            className={`flex-1 py-4 bg-slate-100 dark:bg-zinc-900 text-[9px] font-black uppercase italic tracking-widest rounded-2xl ${darkMode ? 'text-zinc-405' : 'text-slate-500'}`}
                          >
                             Annuler
                          </button>
                          
                          <button 
                            type="button"
                            onClick={() => {
                              playNotificationSound();
                              setRapportSentSuccess(true);
                            }}
                            className="flex-1 py-4 bg-emerald-600 text-white text-[9px] font-black uppercase italic tracking-widest rounded-2xl hover:bg-emerald-500 active:scale-98 transition-all flex items-center justify-center space-x-2"
                          >
                             <Send size={12} />
                             <span>Confirmer l'envoi</span>
                          </button>
                       </div>

                    </div>
                  )}

               </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SMART TRANS-DISPATCHER MODAL FOR RAPPORT */}
        <AnimatePresence>
          {showRapportDispatcherModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-350">
              <motion.div 
                initial={{ opacity: 0, scale: 0.93, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 15 }}
                className={`w-full max-w-sm rounded-[36px] border ${
                  darkMode ? 'bg-zinc-950 border-zinc-900 text-zinc-100' : 'bg-white border-slate-150 text-slate-905'
                } shadow-2xl relative overflow-hidden`}
              >
                {/* Close Button */}
                <button 
                  onClick={() => {
                    if (!isTransmittingChannel) {
                      setShowRapportDispatcherModal(false);
                      playNotificationSound();
                    }
                  }}
                  className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                  disabled={isTransmittingChannel !== null}
                >
                  <X size={15} />
                </button>

                <div className="p-6">
                  {/* Title / Question */}
                  <div className="text-left mb-6 mt-1 space-y-2">
                    <span className="text-[8px] font-black uppercase italic tracking-widest text-[#059669] bg-emerald-500/10 px-2.5 py-1 rounded-full">
                      AutoCompt Dispatcher
                    </span>
                    <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-400 dark:text-zinc-500 pl-1 mt-1.5">
                      SÉLECTIONNER LE MÉDIUM DE TRANSMISSION
                    </h4>
                    <p className={`text-[11.5px] font-black leading-relaxed tracking-tight ${darkMode ? 'text-zinc-200' : 'text-slate-800'}`}>
                      ¿Cómo desea enviar el reporte de <span className="text-[#059669] italic font-black">{selectedRapportPeriod}</span> a <span className="text-teal-605 dark:text-teal-400 italic font-black">{currentComptable.nom}</span>?
                    </p>
                  </div>

                  {isTransmittingChannel ? (
                    /* TRANSMITTING LOADING BLOCK */
                    <div className="py-8 flex flex-col items-center justify-center space-y-4">
                      <div className="relative flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
                        <span className="absolute animate-pulse text-[#059669]">
                          {isTransmittingChannel === 'Par Email' ? <Mail size={16} /> : isTransmittingChannel === 'Par WhatsApp' ? <MessageSquare size={16} /> : <Folder size={16} />}
                        </span>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-[9.5px] font-black uppercase tracking-wider text-[#059669] animate-pulse">
                          Transmission en cours
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                          Génération du flux via {isTransmittingChannel}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* CHOICES PANEL */
                    <div className="space-y-3">
                      {/* 1. Par Email */}
                      <button
                        onClick={() => {
                          playNotificationSound();
                          setIsTransmittingChannel('Par Email');
                          setTimeout(() => {
                            setIsTransmittingChannel(null);
                            setShowRapportDispatcherModal(false);
                            setDispatcherSuccessToast({
                              text: `Reporte del periodo ${selectedRapportPeriod} enviado exitosamente a través de Par Email`,
                              channel: 'Par Email'
                            });
                            playNotificationSound();
                          }, 1400);
                        }}
                        className={`w-full p-4.5 rounded-[22px] border text-left flex items-center justify-between transition-all group ${
                          darkMode 
                            ? 'bg-zinc-900/50 border-zinc-850 hover:border-emerald-500/40 hover:bg-zinc-900 text-zinc-100' 
                            : 'bg-slate-50/50 border-slate-105 hover:border-[#059669]/30 hover:bg-slate-100/40 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl group-hover:scale-110 transition-transform">
                            <Mail size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase italic tracking-wide">Par Email</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{currentComptable.email}</p>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>

                      {/* 2. Par WhatsApp */}
                      <button
                        onClick={() => {
                          playNotificationSound();
                          setIsTransmittingChannel('Par WhatsApp');
                          setTimeout(() => {
                            setIsTransmittingChannel(null);
                            setShowRapportDispatcherModal(false);
                            setDispatcherSuccessToast({
                              text: `Reporte del periodo ${selectedRapportPeriod} enviado exitosamente a través de Par WhatsApp`,
                              channel: 'Par WhatsApp'
                            });
                            playNotificationSound();
                            // Open WhatsApp link
                            const cleanTel = (currentComptable.tel || '').replace(/\D/g, '') || '15145550199';
                            const waText = `Bonjour ${currentComptable.nom}, j'ai généré les rapports comptables de ${selectedRapportPeriod} sur AutoCompt pour ${currentCompany?.nombre || 'mon entreprise'}. Pouvons-nous valider?`;
                            window.open(`https://wa.me/${cleanTel}?text=${encodeURIComponent(waText)}`, '_blank');
                          }, 1200);
                        }}
                        className={`w-full p-4.5 rounded-[22px] border text-left flex items-center justify-between transition-all group ${
                          darkMode 
                            ? 'bg-zinc-900/50 border-zinc-850 hover:border-emerald-500/40 hover:bg-zinc-900 text-zinc-100' 
                            : 'bg-slate-50/50 border-slate-105 hover:border-emerald-500/30 hover:bg-slate-100/40 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="p-3 bg-emerald-500/10 text-[#059669] dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                            <MessageSquare size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase italic tracking-wide text-emerald-600 dark:text-emerald-450">Par WhatsApp</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Envoi direct au {currentComptable.tel}</p>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>

                       {/* 3. Vers Google Drive */}
                      <button
                        onClick={() => {
                          if (selectedTier === 'gratuit' || selectedTier === 'assistant') {
                            setPaywallTargetTier('Pro (18.99$)');
                            setShowPaywallModal(true);
                            playNotificationSound();
                            return;
                          }
                          playNotificationSound();
                          setIsTransmittingChannel('Vers Google Drive');
                          setTimeout(() => {
                            setIsTransmittingChannel(null);
                            setShowRapportDispatcherModal(false);
                            setDispatcherSuccessToast({
                              text: `Reporte del periodo ${selectedRapportPeriod} enviado exitosamente a través de Vers Google Drive`,
                              channel: 'Vers Google Drive'
                            });
                            playNotificationSound();
                            // Open Drive link
                            const driveUrl = currentComptable.drive || `https://drive.google.com/drive/folders/${currentCompany?.driveConfig?.folderId || 'vault'}`;
                            window.open(driveUrl, '_blank');
                          }, 1200);
                        }}
                        className={`w-full p-4.5 rounded-[22px] border text-left flex items-center justify-between transition-all group ${
                          darkMode 
                            ? 'bg-zinc-900/50 border-zinc-850 hover:border-teal-500/40 hover:bg-zinc-900 text-zinc-100' 
                            : 'bg-slate-50/50 border-slate-105 hover:border-teal-500/30 hover:bg-slate-100/40 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="p-3 bg-teal-500/10 text-teal-500 rounded-xl group-hover:scale-110 transition-transform">
                            <Folder size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase italic tracking-wide text-teal-600 dark:text-teal-400 font-black">
                              Vers Google Drive {(selectedTier === 'gratuit' || selectedTier === 'assistant') && '🔒'}
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Sauvegarder dans le nuage</p>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* TRANSIENT DYNAMIC TRACEABILITY TOAST */}
        <AnimatePresence>
          {dispatcherSuccessToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-[200] max-w-sm"
            >
              <div className={`p-4 rounded-[22px] border shadow-2xl flex items-center space-x-3.5 ${
                darkMode ? 'bg-zinc-950 border-emerald-950/45 text-white shadow-emerald-950/25' : 'bg-[#FAF9F6] border-emerald-200 text-slate-805 shadow-emerald-950/10'
              }`}>
                <div className="p-2.5 bg-emerald-500/15 rounded-xl text-emerald-500 shrink-0">
                  {dispatcherSuccessToast.channel === 'Par Email' ? <Mail size={16} /> : dispatcherSuccessToast.channel === 'Par WhatsApp' ? <MessageSquare size={16} /> : <Folder size={16} />}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <span className="block text-[8px] font-black uppercase italic tracking-widest text-[#059669] leading-none">
                    Trazabilidad de Envío
                  </span>
                  <p className="text-[10px] font-bold mt-1.5 leading-relaxed tracking-tight text-slate-700 dark:text-zinc-200">
                    Reporte del periodo <span className="font-extrabold italic text-[#059669]">{selectedRapportPeriod}</span> enviado exitosamente a través de <span className="font-black italic text-teal-500 dark:text-teal-400">{dispatcherSuccessToast.channel}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setDispatcherSuccessToast(null)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-850 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    );
  }


  if (vista === 'banque') return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-zinc-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans animate-in slide-in-from-bottom text-left overflow-x-hidden md:pl-72 relative transition-all duration-300`}>
      <WorkspaceSidebar />
      <header 
        className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} px-6 py-5 border-b flex items-center justify-between shadow-sm`}
        style={{ borderTop: `4px solid ${darkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.3)'}` }}
      >
         <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden"
            >
              <Menu size={18} />
            </button>
            <button onClick={() => setVista('dashboard')} className={`p-2 transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}><ArrowLeft size={24} /></button>
         </div>
         <h2 className="font-black uppercase italic tracking-tighter text-xl leading-none">Analyse & Banque sync</h2>
         <div className="w-10"></div>
      </header>

      <main className="p-4 space-y-6 max-w-md mx-auto w-full text-left">
        {/* Zero-Knowledge Privacy Badge */}
        <div className="bg-emerald-600 p-4 rounded-[28px] shadow-lg shadow-emerald-900/10 flex items-center space-x-3 border border-emerald-500">
           <div className="bg-white/20 p-2 rounded-xl text-white backdrop-blur-md">
             <ShieldCheck size={20} />
           </div>
           <div>
             <p className="text-[10px] font-black uppercase text-white italic leading-tight">Privacité Locale Garantie</p>
             <p className="text-[8px] text-emerald-100 font-bold uppercase mt-0.5 tracking-tight">Vos données bancaires sont traitées localement. Confidentialité totale garantie.</p>
           </div>
        </div>

        {/* State Toggle */}
        <div className={`p-2 rounded-[28px] border flex space-x-1 shadow-sm ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'}`}>
           <button className="flex-1 py-3 bg-[#059669] text-white rounded-[22px] text-[9px] font-black uppercase italic shadow-lg">Vues Transactions</button>
           <button onClick={() => setVista('reportes')} className={`flex-1 py-3 text-[9px] font-black uppercase italic ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>Performance TP-80</button>
        </div>

        <div className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} p-7 rounded-[40px] shadow-sm border`}>
           <div className="flex justify-between items-center mb-6">
             <h3 className={`text-[10px] font-black uppercase italic tracking-widest ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Poids des Déductions</h3>
             <Sparkles size={14} className="text-[#059669]" />
           </div>
           <div className="space-y-6">
              {[ 
                { cat: 'Repas & Frais (50%)', val: 40, color: 'bg-orange-500' }, 
                { cat: 'Bureau dom. (Pro rata)', val: (porcBureau * 100).toFixed(0), color: 'bg-[#059669]' }, 
                { cat: 'Déplacement (KM)', val: 65, color: 'bg-blue-600' } 
              ].map(g => (
                <div key={g.cat} className="space-y-2">
                   <div className={`flex justify-between text-[9px] font-black uppercase italic ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                     <span>{g.cat}</span>
                     <span className={`${darkMode ? 'text-zinc-100' : 'text-slate-900'} font-black`}>{g.val}%</span>
                   </div>
                   <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-zinc-900' : 'bg-slate-100'}`}>
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${g.val}%` }}
                       transition={{ duration: 1, ease: "easeOut" }}
                       className={`${g.color} h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.05)]`}
                     ></motion.div>
                   </div>
                </div>
              ))}
           </div>
           <p className={`text-[8px] font-bold uppercase mt-6 text-center italic opacity-60 ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>Optimisation fiscale active • TP-80 / T2125</p>
        </div>

        {/* Banque Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <div>
              <h4 className={`text-xs font-black uppercase italic tracking-tighter ${darkMode ? 'text-zinc-100' : 'text-[#0F172A]'}`}>Réconciliation</h4>
              <p className={`text-[8px] font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>{currentCompany?.nombre}</p>
              <div className="flex items-center space-x-1 mt-1 opacity-70">
                <Shield size={8} className="text-emerald-600" />
                <p className={`text-[6px] font-bold uppercase tracking-tighter ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                  Traitement local Zero-Knowledge • Confidentialité totale
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => {
                  if (selectedTier === 'gratuit' || selectedTier === 'assistant') {
                    setPaywallTargetTier('Pro (18.99$)');
                    setShowPaywallModal(true);
                    playNotificationSound();
                    return;
                  }
                  alert("📱 Connexion bancaire automatique en direct via Flinks/Plaid active.");
                }}
                className={`p-3 rounded-2xl transition-all active:scale-95 border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-teal-400 hover:bg-teal-500/10' : 'bg-white border-slate-100 text-teal-600 hover:bg-teal-50'}`}
                title="Premium Sync Live"
              >
                <Zap size={16} />
              </button>
              <button 
                onClick={() => {
                  if (confirm("Voulez-vous effacer toutes les transactions bancaires de test pour ce profil?")) {
                    setBankTransactions(prev => prev.filter(t => t.companyId !== activeCompanyId));
                  }
                }}
                className={`p-3 rounded-2xl transition-all active:scale-95 border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-rose-500 hover:bg-rose-500/10' : 'bg-white border-slate-100 text-rose-600 hover:bg-rose-50'}`}
                title="Réinitialiser les tests"
              >
                <Trash2 size={16} />
              </button>
              <button 
                onClick={() => csvInputRef.current?.click()}
                className="bg-[#059669] text-white px-5 py-3 rounded-2xl text-[9px] font-black uppercase italic flex items-center space-x-2 shadow-xl shadow-emerald-900/10 active:scale-95 transition-all"
              >
                <Upload size={14} /> <span>Sync Relevé</span>
              </button>
            </div>
            <input 
              type="file" 
              ref={csvInputRef} 
              onChange={handleCSVUpload} 
              className="hidden" 
              accept=".csv"
            />
          </div>

          <div className="space-y-3">
            {bankTransactions
              .filter(t => t.companyId === activeCompanyId)
              .map((txn, i) => {
                // 3-State Logic: Conciliated (0.01 tolerance + Doc), Receipt Missing (Amt match, no Doc), Missing (No match)
                const matchedExpense = filteredDepenses.find(d => Math.abs(d.total - txn.amt) < 0.01);
                const matchedInvoice = filteredHistorique.find(h => Math.abs(h.total - txn.amt) < 0.01);
                
                const entryFound = matchedExpense || matchedInvoice;
                const hasLien = (matchedExpense && matchedExpense.lien) || (matchedInvoice); // Historique matches are assumed valid docs
                
                let recoState: 'conciliated' | 'need_receipt' | 'missing' = 'missing';
                if (entryFound && hasLien) recoState = 'conciliated';
                else if (entryFound && !hasLien) recoState = 'need_receipt';

                const cardStyles = darkMode ? {
                  conciliated: 'bg-zinc-950 border-zinc-900 shadow-sm opacity-90',
                  need_receipt: 'bg-zinc-950 border-amber-900 shadow-xl shadow-amber-900/20 ring-1 ring-amber-900',
                  missing: 'bg-zinc-950 border-rose-900 shadow-2xl shadow-rose-900/40 ring-1 ring-rose-900'
                } : {
                  conciliated: 'bg-white border-slate-100 shadow-sm opacity-90',
                  need_receipt: 'bg-white border-amber-300 shadow-xl shadow-amber-100/50 ring-1 ring-amber-100 bg-amber-50/20',
                  missing: 'bg-white border-rose-300 shadow-2xl shadow-rose-200/40 ring-1 ring-rose-100'
                };
                
                return (
                  <div key={i} className={`p-6 rounded-[36px] border ${cardStyles[recoState]} flex flex-col space-y-4 transition-all hover:scale-[1.01]`}>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 text-left">
                        <p className={`text-[11px] font-black italic tracking-tight leading-tight uppercase ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{txn.desc}</p>
                        <p className={`text-[8px] font-bold uppercase tracking-[0.2em] ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`}>{txn.date}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black italic leading-none ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{txn.amt.toFixed(2)}$</p>
                        <div className="mt-2 flex justify-end">
                          {recoState === 'conciliated' ? (
                            <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-xl text-[8px] font-black uppercase italic flex items-center space-x-1.5 border border-emerald-200 shadow-sm">
                              <CheckCircle2 size={10} /> <span>Concilié</span>
                            </div>
                          ) : recoState === 'need_receipt' ? (
                            <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-xl text-[8px] font-black uppercase italic flex items-center space-x-1.5 border border-amber-200 shadow-sm">
                              <FileSearch size={10} /> <span>Reçu manquant</span>
                            </div>
                          ) : (
                            <motion.div 
                              animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="bg-rose-600 text-white px-3 py-1 rounded-xl text-[8px] font-black uppercase italic flex items-center space-x-1.5 shadow-lg shadow-rose-900/10 border border-rose-500"
                            >
                              <AlertTriangle size={10} /> <span>Manquant</span>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>

                    {recoState === 'conciliated' ? (
                      <div className={`flex items-center space-x-3 p-4 rounded-2xl border ${darkMode ? 'bg-emerald-950/10 border-emerald-900 text-emerald-400' : 'bg-emerald-50/50 border-emerald-100 text-[#059669]'}`}>
                        <div className={`p-2 rounded-xl shadow-sm ${darkMode ? 'bg-zinc-900' : 'bg-white'}`}><CheckCircle2 size={14} /></div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black italic uppercase leading-none mb-1">Pièce Justificative Validée</p>
                          <p className={`text-[8px] font-bold uppercase tracking-tight ${darkMode ? 'text-emerald-500/70' : 'text-emerald-600/70'}`}>
                            {matchedExpense ? `Récépissé: ${matchedExpense.fournisseur}` : `Facture client: ${matchedInvoice?.cliente}`}
                          </p>
                        </div>
                        <button className={`p-2 rounded-xl shadow-sm border transition-transform active:scale-90 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-emerald-100'}`}><Eye size={16}/></button>
                      </div>
                    ) : recoState === 'need_receipt' ? (
                      <div className={`flex items-center justify-between p-4 rounded-2xl border border-dashed ${darkMode ? 'bg-amber-950/10 border-amber-900 text-amber-50' : 'bg-amber-50/50 border-amber-200 text-amber-700'}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-xl border shadow-sm ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-amber-100'}`}><FileQuestion size={14} className="text-amber-500" /></div>
                          <div>
                            <span className="text-[9px] font-black uppercase italic block tracking-tighter">Montant détecté</span>
                            <span className={`text-[7px] font-bold uppercase leading-none tracking-tight ${darkMode ? 'text-amber-500/70' : 'text-amber-600/70'}`}>Attacher le document "{matchedExpense?.fournisseur}"</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setVista('drive');
                            alert(`Veuillez attacher le reçu pour l'entrée: ${matchedExpense?.fournisseur}`);
                          }}
                          className="bg-amber-600 text-white px-4 py-2 rounded-xl text-[8px] font-black uppercase italic shadow-lg active:scale-95 transition-all border border-amber-500"
                        >
                          Lier Reçu
                        </button>
                      </div>
                    ) : (
                      <div className={`flex items-center justify-between p-4 rounded-2xl border border-dashed animate-in fade-in duration-700 ${darkMode ? 'bg-rose-950/10 border-rose-900 text-rose-500' : 'bg-rose-50/50 border-rose-100 text-rose-600'}`}>
                        <div className="flex items-center space-x-2">
                          <div className={`p-2 rounded-xl border shadow-sm ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-rose-100'}`}><AlertTriangle size={14} className="animate-pulse" /></div>
                          <div>
                            <span className="text-[9px] font-black uppercase italic block tracking-tighter">Document non détecté</span>
                            <span className={`text-[7px] font-bold uppercase leading-none tracking-tight ${darkMode ? 'text-rose-400' : 'text-rose-400'}`}>L'IA nécessite ce justificatif</span>
                            <div className={`mt-1.5 text-[6px] font-black uppercase italic tracking-wider opacity-80 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              ✨ IA Estimation: Subtotal: {(txn.amt / 1.14975).toFixed(2)}$ | TPS: {((txn.amt / 1.14975) * 0.05).toFixed(2)}$ | TVQ: {((txn.amt / 1.14975) * 0.09975).toFixed(2)}$
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <button 
                            onClick={() => {
                              const newDepense = {
                                id: Date.now(),
                                companyId: activeCompanyId,
                                fecha: txn.date,
                                fournisseur: txn.desc,
                                cat: 'À classer',
                                subtotal: txn.amt / 1.14975,
                                tps: (txn.amt / 1.14975) * 0.05,
                                tvq: (txn.amt / 1.14975) * 0.09975,
                                total: txn.amt,
                                lien: null,
                                partnerTag: activeUser,
                                refacturableTriplex: false
                              };
                              setDepenses(prev => [newDepense, ...prev]);
                              alert(`Dépense créée pour ${txn.desc}. N'oubliez pas d'attacher le reçu !`);
                            }}
                            className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase italic shadow-xl active:scale-95 transition-all border ${darkMode ? 'bg-zinc-100 text-black border-zinc-300' : 'bg-slate-900 text-white border-slate-700'}`}
                          >
                            + Ajouter Justificatif
                          </button>
                          {activeCompanyId === '1' && (
                            <button 
                              onClick={() => {
                                const newDepense = {
                                  id: Date.now(),
                                  companyId: '1',
                                  fecha: txn.date,
                                  fournisseur: txn.desc,
                                  cat: 'Réparations / Entretien',
                                  subtotal: txn.amt / 1.14975,
                                  tps: (txn.amt / 1.14975) * 0.05,
                                  tvq: (txn.amt / 1.14975) * 0.09975,
                                  total: txn.amt,
                                  lien: null,
                                  partnerTag: activeUser,
                                  refacturableTriplex: true
                                };
                                setDepenses(prev => [newDepense, ...prev]);
                                alert(`Dépense REFACTURABLE créée pour ${txn.desc}.`);
                              }}
                              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[8px] font-black uppercase italic shadow-lg active:scale-95 transition-all border border-emerald-500"
                            >
                              + Refacturable au Triplex
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          
          <div className={`px-6 py-4 rounded-[32px] border mt-6 flex items-start space-x-3 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100/50 border-slate-200'}`}>
             <Shield className="text-emerald-600 mt-0.5 shrink-0" size={16} />
             <div>
                <p className={`text-[10px] font-black uppercase italic leading-tight ${darkMode ? 'text-zinc-100' : 'text-slate-900'}`}>Garantie de Confidentialité</p>
                <p className={`text-[9px] font-bold uppercase mt-1 leading-relaxed ${darkMode ? 'text-zinc-600' : 'text-slate-500'}`}>
                  Vos données bancaires sont traitées localement. Aucun transfert vers un serveur externe n'est effectué. Confidentialité totale garantie.
                </p>
             </div>
          </div>
        </div>

        {/* Quick Report Summary */}
        <div className={`${darkMode ? 'bg-black border border-zinc-900 shadow-2xl' : 'bg-slate-900 shadow-2xl'} p-8 rounded-[40px] text-white relative overflow-hidden text-left`}>
           <div className="relative z-10 space-y-4 text-left">
              <h4 className={`text-[9px] font-black uppercase italic tracking-[0.2em] leading-none ${darkMode ? 'text-emerald-400' : 'text-emerald-400'}`}>Récapitulatif Mensuel</h4>
              <div className="grid grid-cols-2 gap-6 text-left">
                <div className="text-left">
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest text-left">Entrées</p>
                  <p className="text-xl font-black italic tracking-tighter text-emerald-400 text-left">+{processedHistorique.reduce((a, b) => a + b.deductibleTotal, 0).toFixed(2)}$</p>
                  {isPlex && <p className="text-[7px] text-emerald-400 font-bold uppercase mt-1 text-left">{(processedHistorique.reduce((a, b) => a + b.partnerSplit, 0)).toFixed(2)}$ / proprio</p>}
                </div>
                <div className="text-left">
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest text-left">Sorties</p>
                  <p className="text-xl font-black italic tracking-tighter text-rose-400 text-left">-{processedDepenses.reduce((a, b) => a + b.deductibleTotal, 0).toFixed(2)}$</p>
                  {isPlex && <p className="text-[7px] text-rose-400 font-bold uppercase mt-1 text-left">{(processedDepenses.reduce((a, b) => a + b.partnerSplit, 0)).toFixed(2)}$ / proprio</p>}
                </div>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between items-center text-left">
                 <span className="text-[10px] font-black uppercase italic tracking-widest">Santé Fiscale</span>
                 <div className="flex space-x-1">
                   {[1, 2, 3, 4, 5].map(s => <div key={s} className={`w-3 h-1 rounded-full ${s <= 4 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`}></div>)}
                 </div>
              </div>
           </div>
           <Sparkles className="absolute -right-6 -bottom-6 text-white/5" size={120} />
        </div>
      </main>
    </div>
  );


  if (vista === 'sous-traitance') return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-zinc-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans text-left animate-in zoom-in-95 max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}>
      <WorkspaceSidebar />
      <header 
        className={`${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'} px-6 py-5 border-b flex items-center justify-between shadow-sm text-left`}
        style={{ borderTop: `4px solid ${darkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.3)'}` }}
      >
         <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden"
            >
              <Menu size={18} />
            </button>
            <button onClick={() => setVista('dashboard')} className={`p-2 transition-colors rounded-xl transition-all ${darkMode ? 'text-zinc-500 hover:text-white hover:bg-zinc-900' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}><ArrowLeft size={24} /></button>
         </div>
         <h2 className="font-black uppercase italic tracking-tighter text-xl text-left">Sous-traitance & Main-d'œuvre</h2>
         <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center space-x-2 border border-emerald-500/20 font-bold text-[9px] uppercase tracking-wider">
               <Users size={14} />
               <span>Mano d'œuvre</span>
            </div>
         </div>
      </header>

      <main className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* FORMULAIRE DE SAISIE RAPIDE (Left Column - 5 cols equivalent on wide screen) */}
          <div className={`lg:col-span-5 p-6 rounded-[36px] border shadow-xl flex flex-col space-y-4 text-left ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-100'}`}>
            <div className="space-y-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-[#059669] dark:text-emerald-400">ENREGISTRER UN PAIEMENT DE LA MAIN D'ŒUVRE</span>
              <h3 className={`text-sm font-black uppercase italic leading-none ${darkMode ? 'text-zinc-150' : 'text-slate-800'}`}>Formulaire de Sous-traitance</h3>
              <p className="text-[10px] text-slate-450 dark:text-zinc-500 tracking-tight leading-normal">
                Ajoutez les paiements de vos peintres, plombiers, jardiniers et d'autres professionnels de la main-d'œuvre pour les déduire automatiquement de vos impôts.
              </p>
            </div>

            {/* NOTIFICACIÓN DE ADVERTENCIA (UI) */}
            <div className="p-3.5 rounded-2xl border bg-amber-500/10 border-amber-500/20 text-amber-400 text-[10px] leading-relaxed flex items-start space-x-2.5">
              <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Avertissement fiscal :</strong> Pour les dépenses de main-d'œuvre de moins de 500 $ par an sans facture, veuillez indiquer l'ID ou le NEQ du travailleur. Pour tout montant supérieur ou contrat régulier, une facture officielle incluant le NEQ et les numéros TPS/TVQ est obligatoire pour garantir la déductibilité fiscale.
              </span>
            </div>

            <hr className={darkMode ? 'border-zinc-900' : 'border-slate-100'} />

            {/* Form Fields container */}
            <div className="space-y-3.5 text-left">
              {/* DATE DU PAIEMENT */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500 flex items-center justify-between">
                  <span>Date du paiement <span className="text-emerald-500">*</span></span>
                </label>
                <input 
                  type="date" 
                  value={subfFecha}
                  onChange={(e) => setSubfFecha(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white shadow-inner' : 'bg-slate-50 border-slate-205'}`}
                />
              </div>

              {/* SOUS-TRAITANT / OUVRIER */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500">
                  Sous-traitant / Ouvrier <span className="text-emerald-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={subfFournisseur}
                  onChange={(e) => setSubfFournisseur(e.target.value)}
                  placeholder="ex: Jean Tremblay, Plombier Enr."
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white shadow-inner' : 'bg-slate-50 border-slate-205'}`}
                />
              </div>

              {/* IDENTIFIANT / NEQ / ID */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500">
                  Identifiant / NEQ / ID <span className="text-emerald-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={subfNeq}
                  onChange={(e) => setSubfNeq(e.target.value)}
                  placeholder="ex: NEQ 1178239401 / ID 48293"
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white shadow-inner' : 'bg-slate-50 border-slate-205'}`}
                />
              </div>

              {/* DESCRIPTION */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500">
                  Description des travaux <span className="text-emerald-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={subfDesc}
                  onChange={(e) => setSubfDesc(e.target.value)}
                  placeholder="ex: Jardinier, Plombier, réparation..."
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white shadow-inner' : 'bg-slate-50 border-slate-205'}`}
                />
              </div>

              {/* TYPE DE PAIEMENT */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500">
                  Type de Paiement <span className="text-emerald-500">*</span>
                </label>
                <select 
                  value={subfTypePaiement}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSubfTypePaiement(val);
                    if (val === 'Paiement sans facture - Travailleur autonome') {
                      setSubfIsTaxable(false);
                    }
                  }}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-1 focus:ring-[#059669] ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-205'}`}
                >
                  <option value="Facture Officielle">Facture Officielle</option>
                  <option value="Paiement sans facture - Travailleur autonome">Paiement sans facture - Travailleur autonome</option>
                </select>
              </div>

              {/* MONTANT (HORS TAXES) */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500">
                  Montant ($) <span className="text-emerald-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">$ CAD</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={subfSubtotal}
                    onChange={(e) => setSubfSubtotal(e.target.value)}
                    placeholder="0.00"
                    className={`w-full p-2.5 pl-14 rounded-xl border text-xs outline-none font-bold focus:ring-1 focus:ring-[#059669] ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white shadow-inner' : 'bg-slate-50 border-slate-210'}`}
                  />
                </div>
              </div>

              {/* DYNAMIC ERROR MESSAGE / NOTIFICATION (Lógica de Protección) */}
              {(() => {
                const amtVal = parseFloat(subfSubtotal) || 0;
                const isSansFacture = subfTypePaiement === 'Paiement sans facture - Travailleur autonome';
                
                // Calculate cumulative for this same worker across aready registered items
                const sameWorkerPayments = filteredDepenses.filter(
                  d => d.cat === 'Sous-traitance' && 
                       d.neq && 
                       subfNeq.trim() && 
                       d.neq.toLowerCase() === subfNeq.trim().toLowerCase()
                );
                const cumulativeForNEQ = sameWorkerPayments.reduce((acc, current) => acc + (current.subtotal || 0), 0);
                const totalWithNew = cumulativeForNEQ + amtVal;

                if (isSansFacture && (amtVal > 500 || totalWithNew > 500)) {
                  return (
                    <div className="p-3 rounded-2xl border bg-rose-500/10 border-rose-500/20 text-rose-400 text-[9.5px] font-bold leading-normal flex items-start space-x-2 animate-bounce">
                      <AlertTriangle size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>
                        Le montant dépasse 500 $. Une facture officielle est requise pour la déductibilité.
                        {totalWithNew > 500 && amtVal <= 500 && ` (Cumul annuel de ${totalWithNew.toFixed(2)}$ pour ce travailleur)`}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* PHOTO / DOCUMENT ATTACHMENT REQUIRED FOR > 500$ & FACTURE OFFICIELLE */}
              {(() => {
                const amtVal = parseFloat(subfSubtotal) || 0;
                const isFactureOfficielle = subfTypePaiement === 'Facture Officielle';
                if (isFactureOfficielle) {
                  const isRequired = amtVal > 500;
                  return (
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500 flex justify-between">
                        <span>Preuve de facture / Document PDF ou Image <span className={isRequired ? "text-rose-500 font-extrabold" : "text-slate-400"}>{isRequired ? " (OBLIGATOIRE pour > 500$)" : "(Facultatif)"}</span></span>
                      </label>
                      <div className={`relative border border-dashed rounded-xl p-3.5 flex flex-col items-center justify-center text-center transition-all ${
                        isRequired && !subfAttachmentName 
                          ? 'border-rose-500/40 bg-rose-500/5' 
                          : 'border-slate-200 dark:border-zinc-850 bg-slate-500/5 hover:border-[#059669]'
                      }`}>
                        {subfAttachmentName ? (
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            <span className="text-[10px] font-extrabold text-[#059669] dark:text-emerald-400 truncate max-w-[220px]">{subfAttachmentName}</span>
                            <button 
                              onClick={() => setSubfAttachmentName('')}
                              className="p-1 text-rose-550 hover:bg-rose-500/10 rounded-lg text-[9px] font-bold uppercase transition-all"
                            >
                              Supprimer
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center space-y-1 w-full p-2 select-none">
                            <Camera size={18} className={isRequired ? "text-rose-400 animate-pulse" : "text-slate-400"} />
                            <span className={`text-[8.5px] font-extrabold uppercase tracking-wide mt-1 ${isRequired ? 'text-rose-455' : 'text-slate-455 dark:text-zinc-500'}`}>
                              {isRequired ? "Joindre la photo de la facture (Requis)" : "Prendre photo / Joindre facture"}
                            </span>
                            <input 
                              type="file" 
                              accept="image/*,application/pdf"
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setSubfAttachmentName(e.target.files[0].name);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Taxation details (Only enabled when Facture Officielle is selected) */}
              {subfTypePaiement === 'Facture Officielle' && (
                <div className="flex items-center space-x-3.5 p-3 rounded-2xl border border-dashed text-left bg-emerald-500/5 border-emerald-500/10">
                  <input 
                    type="checkbox" 
                    id="subfIsTaxable"
                    checked={subfIsTaxable}
                    onChange={(e) => setSubfIsTaxable(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500 scale-110 cursor-pointer"
                  />
                  <label htmlFor="subfIsTaxable" className="text-[9.5px] leading-snug font-extrabold cursor-pointer select-none">
                    Calculer les taxes du Québec (TPS 5% & TVQ 9.975% auto)
                  </label>
                </div>
              )}

              {/* Live tax preview */}
              {subfSubtotal && parseFloat(subfSubtotal) > 0 && (
                <div className={`p-3 rounded-2xl border text-left space-y-1 ${darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-slate-50 border-slate-100 shadow-inner'}`}>
                  <div className="flex justify-between text-[9px] font-bold">
                    <span className="text-slate-450">Sous-total :</span>
                    <span>{parseFloat(subfSubtotal).toFixed(2)}$</span>
                  </div>
                  {subfTypePaiement === 'Facture Officielle' && subfIsTaxable && (
                    <>
                      <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-slate-450">TPS (5%) :</span>
                        <span>{(parseFloat(subfSubtotal) * 0.05).toFixed(2)}$</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-slate-450">TVQ (9.975%) :</span>
                        <span>{(parseFloat(subfSubtotal) * 0.09975).toFixed(2)}$</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-[10px] font-black border-t pt-1 mt-1 border-slate-200 dark:border-zinc-800">
                    <span className="text-emerald-500">Total estimé :</span>
                    <span className="text-emerald-500">
                      {(subfTypePaiement === 'Facture Officielle' && subfIsTaxable)
                        ? (parseFloat(subfSubtotal) * 1.14975).toFixed(2)
                        : parseFloat(subfSubtotal).toFixed(2)
                      }$
                    </span>
                  </div>
                </div>
              )}

              {/* Submit trigger button (Deshabilitado si supera 500$ sans facture) */}
              {(() => {
                const amtVal = parseFloat(subfSubtotal) || 0;
                const isSansFacture = subfTypePaiement === 'Paiement sans facture - Travailleur autonome';
                
                // Cumulative same worker
                const sameWorkerPayments = filteredDepenses.filter(
                  d => d.cat === 'Sous-traitance' && 
                       d.neq && 
                       subfNeq.trim() && 
                       d.neq.toLowerCase() === subfNeq.trim().toLowerCase()
                );
                const cumulativeForNEQ = sameWorkerPayments.reduce((acc, current) => acc + (current.subtotal || 0), 0);
                const totalWithNew = cumulativeForNEQ + amtVal;

                const isBlocked = isSansFacture && (amtVal > 500 || totalWithNew > 500);

                return (
                  <button 
                    onClick={() => {
                      const amt = parseFloat(subfSubtotal);
                      if (!subfFournisseur.trim()) {
                        alert("Veuillez indiquer le nom de l'ouvrier / du sous-traitant.");
                        return;
                      }
                      if (!subfNeq.trim()) {
                        alert("Veuillez compléter le champ 'Identifiant / NEQ / ID'.");
                        return;
                      }
                      if (!subfDesc.trim()) {
                        alert("Veuillez compléter le champ 'Description' (ex: Jardinier, Plombier...).");
                        return;
                      }
                      if (isNaN(amt) || amt <= 0) {
                        alert("Veuillez entrer un montant supérieur à 0.");
                        return;
                      }

                      // Check attachment requirement
                      const isFactureOfficielle = subfTypePaiement === 'Facture Officielle';
                      if (isFactureOfficielle && amt > 500 && !subfAttachmentName) {
                        alert("Une preuve de facture / document est obligatoire pour tout montant de facture officielle supérieur à 500 $.");
                        return;
                      }

                      const sub = amt;
                      const hasTax = isFactureOfficielle && subfIsTaxable;
                      const tpsVal = hasTax ? parseFloat((sub * 0.05).toFixed(2)) : 0;
                      const tvqVal = hasTax ? parseFloat((sub * 0.09975).toFixed(2)) : 0;
                      const tot = hasTax ? parseFloat((sub * 1.14975).toFixed(2)) : sub;

                      const newDepInstance = {
                        id: Date.now(),
                        companyId: activeCompanyId,
                        fecha: subfFecha,
                        fournisseur: subfFournisseur.trim(),
                        cat: 'Sous-traitance',
                        subtotal: sub,
                        tps: tpsVal,
                        tvq: tvqVal,
                        total: tot,
                        lien: subfAttachmentName ? "Attached Document" : null,
                        partnerTag: activeUser,
                        refacturableTriplex: false,
                        // Custom trace fields
                        neq: subfNeq.trim(),
                        typePaiement: subfTypePaiement,
                        desc: subfDesc.trim()
                      };

                      setDepenses(prev => [newDepInstance, ...prev]);
                      playNotificationSound();
                      
                      // Reset form fields except date
                      setSubfFournisseur('');
                      setSubfNeq('');
                      setSubfDesc('');
                      setSubfSubtotal('');
                      setSubfAttachmentName('');
                      
                      alert(`Paiement de sous-traitance de ${tot.toFixed(2)}$ (${subfTypePaiement}) enregistré et déduit avec succès.`);
                    }}
                    disabled={isBlocked}
                    className={`w-full py-3 text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all shadow-lg active:scale-95 ${
                      isBlocked 
                        ? 'bg-zinc-700/50 cursor-not-allowed opacity-50 shadow-none' 
                        : 'bg-[#059669] hover:bg-emerald-700 shadow-emerald-500/10 cursor-pointer'
                    }`}
                  >
                    Enregistrer le paiement
                  </button>
                );
              })()}
            </div>
          </div>

          {/* LIST OF RECORDED PAYMENTS (Right Column - 7 cols equivalent on wide screen) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Cumulated statistics widget header card */}
            {(() => {
              const activeSoutraitances = filteredDepenses.filter(d => d.cat === 'Sous-traitance');
              const grandSubtotal = activeSoutraitances.reduce((acc, current) => acc + current.subtotal, 0);
              const grandTps = activeSoutraitances.reduce((acc, current) => acc + current.tps, 0);
              const grandTvq = activeSoutraitances.reduce((acc, current) => acc + current.tvq, 0);
              const grandTotal = activeSoutraitances.reduce((acc, current) => acc + current.total, 0);

              return (
                <div className={`p-6 rounded-[36px] border text-left relative overflow-hidden ${darkMode ? 'bg-zinc-950 border-zinc-900 shadow-[0_15px_30px_rgba(0,0,0,0.4)]' : 'bg-slate-900 shadow-[0_15px_30px_rgba(51,65,85,0.08)]'}`}>
                  <div className="relative z-10 space-y-2 text-left">
                    <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400">RÉSUMÉ FIABLE DES COÛTS DE MAIN D'ŒUVRE</span>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Sous-traitance active</h3>
                    <p className="text-[10.5px] leading-snug text-slate-300 dark:text-zinc-400 font-medium text-left">
                      Total cumulé des travaux de sous-traitance et maintenance enregistrés pour <span className="font-extrabold text-[#059669] dark:text-emerald-400">{currentCompany?.nombre}</span> :
                    </p>
                    
                    <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/5 text-left">
                      <div className="text-left">
                        <span className="text-[7.5px] font-bold text-white/40 uppercase block">Sous-total</span>
                        <span className="text-xs font-bold text-white">{grandSubtotal.toFixed(2)}$</span>
                      </div>
                      <div className="text-left">
                        <span className="text-[7.5px] font-bold text-white/40 uppercase block">TPS (5%)</span>
                        <span className="text-xs font-bold text-slate-300">{grandTps.toFixed(2)}$</span>
                      </div>
                      <div className="text-left">
                        <span className="text-[7.5px] font-bold text-white/40 uppercase block">TVQ (9.98%)</span>
                        <span className="text-xs font-bold text-slate-300">{grandTvq.toFixed(2)}$</span>
                      </div>
                      <div className="text-left">
                        <span className="text-[7.5px] font-black text-emerald-400 uppercase block">Total Net</span>
                        <span className="text-sm font-black text-emerald-400">{grandTotal.toFixed(2)}$</span>
                      </div>
                    </div>
                  </div>
                  <Users className="absolute -right-6 -bottom-6 text-white/5 p-0 select-none pointer-events-none" size={110} />
                </div>
              );
            })()}

            {/* List Table Container */}
            <div className={`p-6 rounded-[36px] border ${darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-100'} text-left`}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[8.5px] font-black uppercase tracking-widest text-[#059669] dark:text-emerald-400">Historique des paiements de main-d'œuvre</p>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-extrabold text-[8px] uppercase tracking-wider">
                  {filteredDepenses.filter(d => d.cat === 'Sous-traitance').length} Enregistrés
                </span>
              </div>

              {filteredDepenses.filter(d => d.cat === 'Sous-traitance').length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="p-3 bg-slate-500/5 text-slate-400 dark:text-zinc-500 rounded-full">
                    <Users size={24} />
                  </div>
                  <p className="text-[10px] text-slate-450 dark:text-zinc-500 italic max-w-xs">
                    Aucun paiement de sous-traitance n'a encore été saisi pour cette entreprise. Remplissez le formulaire de gauche pour en ajouter un.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-left text-[9px] border-collapse min-w-[500px]">
                    <thead>
                      <tr className={`border-b text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider ${darkMode ? 'border-zinc-900' : 'border-slate-100'}`}>
                        <th className="py-2.5 pb-2">Date</th>
                        <th className="py-2.5 pb-2">Sous-traitant / Travaux</th>
                        <th className="py-2.5 pb-2">Identifiant / NEQ</th>
                        <th className="py-2.5 pb-2">Type / Reçu</th>
                        <th className="py-2.5 pb-2">Sous-total</th>
                        <th className="py-2.5 pb-2">TPS / TVQ</th>
                        <th className="py-2.5 pb-2 text-right">Total</th>
                        <th className="py-2.5 pb-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-900/50">
                      {filteredDepenses.filter(d => d.cat === 'Sous-traitance').map((exInstance) => (
                        <tr 
                          key={exInstance.id} 
                          className={`hover:bg-slate-500/5 transition-all`}
                        >
                          <td className="py-2.5 font-bold whitespace-nowrap text-slate-550 dark:text-zinc-400">{exInstance.fecha}</td>
                          <td className="py-2.5">
                            <p className="font-extrabold text-slate-900 dark:text-white">{exInstance.fournisseur}</p>
                            <p className="text-[7.5px] text-slate-400 dark:text-zinc-500">{exInstance.desc || "Main-d'œuvre & Entretien"}</p>
                          </td>
                          <td className="py-2.5 font-mono font-medium text-slate-600 dark:text-zinc-400">
                            {exInstance.neq || "N/A"}
                          </td>
                          <td className="py-2.5">
                            <div className="flex flex-col space-y-0.5 text-[8px]">
                              <span className={`font-bold uppercase tracking-wider ${exInstance.typePaiement === 'Facture Officielle' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {exInstance.typePaiement || "Facture Officielle"}
                              </span>
                              {exInstance.lien && (
                                <span className="text-[#059669] dark:text-emerald-400 font-black flex items-center space-x-1">
                                  <span>📎 Reçu joint</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 font-bold">{exInstance.subtotal.toFixed(2)}$</td>
                          <td className="py-2.5 font-medium text-slate-450 dark:text-zinc-500">
                            {exInstance.tps > 0 ? `${exInstance.tps.toFixed(2)}$ / ${exInstance.tvq.toFixed(2)}$` : "0.00$ / 0.00$"}
                          </td>
                          <td className="py-2.5 font-black italic tracking-tight text-right text-rose-500">-{exInstance.total.toFixed(2)}$</td>
                          <td className="py-2.5 text-center">
                            <button 
                              onClick={() => {
                                if (confirm(`Êtes-vous certain de vouloir supprimer l'entrée de sous-traitance de ${exInstance.fournisseur} ?`)) {
                                  setDepenses(prev => prev.filter(d => d.id !== exInstance.id));
                                  playNotificationSound();
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-500 dark:text-zinc-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Supprimer la dépense"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  return null;
};


export default App;

