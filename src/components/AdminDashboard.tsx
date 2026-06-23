import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, Users, Search, Plus, Shield, Mail, Phone,
  MapPin, Globe, Building2, User, Edit3, Trash2, Check, X,
  PlusCircle, RefreshCw, ChevronDown, DollarSign, TrendingUp,
  ArrowUpRight, ArrowDownRight, Briefcase, Hammer, FileSearch,
  Tag, Copy, Eye, Pause, Play, MessageSquare, Bell
} from 'lucide-react';

// ─── Types and Interfaces ──────────────────────────────────────────────────
export type ClientRole = 
  | 'Syndicat de copropriété' 
  | 'Investisseur Immobilier' 
  | 'Flipper Immobilier' 
  | 'Gestionnaire Immobilier' 
  | 'Prospecteur Immobilier';

export interface Client {
  id: string;
  type: ClientRole;
  name: string;
  email: string;
  phone: string;
  address: string;
  language: 'FR' | 'EN' | 'ES';
  status: 'Actif' | 'Suspendu' | 'En retard';
  createdAt: string;
  tokensUsed: number;
  tokenLimit: number;
}

interface AdminDashboardProps {
  darkMode: boolean;
  onBack: () => void;
  adminName?: string;
}

// ─── Custom Dropdown Select Component (NO native select tags, supports glassmorphism) ──
interface CustomSelectProps<T> {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (val: T) => void;
  darkMode: boolean;
  fullWidth?: boolean;
}

function CustomSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  darkMode,
  fullWidth = false
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative text-left ${fullWidth ? 'w-full' : 'w-full md:w-56'}`}>
      <span className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
        {label}
      </span>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
            darkMode 
              ? 'bg-white/10 backdrop-blur-md border-white/10 text-emerald-400 hover:bg-white/15 shadow-black/10' 
              : 'bg-white border-[#1b2b1b]/10 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption?.icon}
            {selectedOption?.label}
          </span>
          <ChevronDown size={14} className={`transform transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <>
          {/* Transparent full-screen overlay for click-away */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={`absolute left-0 mt-2 w-full rounded-xl shadow-xl border z-50 overflow-hidden py-1 transition-all ${
              darkMode 
                ? 'bg-black/90 backdrop-blur-md border-white/10 text-zinc-300 shadow-black/40' 
                : 'bg-white border-[#1b2b1b]/10 text-slate-700 shadow-slate-200/50'
            }`}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-4 py-2.5 text-left text-xs transition-colors ${
                  opt.value === value
                    ? darkMode ? 'bg-emerald-950/30 text-emerald-400 font-bold' : 'bg-emerald-50 text-emerald-800 font-bold'
                    : darkMode ? 'hover:bg-zinc-800/80 text-zinc-200' : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                {opt.icon}
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Initial Mock Data ────────────────────────────────────────────────────────
const INITIAL_CLIENTS: Client[] = [
  {
    id: '1',
    type: 'Syndicat de copropriété',
    name: 'Syndicat des Copropriétaires du 1420 Boulevard Saint-Laurent',
    email: 'syndicat1420@solutionsgpa.ca',
    phone: '(514) 555-0192',
    address: '1420 Blvd Saint-Laurent, Montréal, QC H2X 2S6',
    language: 'FR',
    status: 'Actif',
    createdAt: '2025-01-10',
    tokensUsed: 15200,
    tokenLimit: 50000
  },
  {
    id: '2',
    type: 'Investisseur Immobilier',
    name: 'Solutions GPA Inc. (Plex Portfolio)',
    email: 'jf.lemay@solutionsgpa.ca',
    phone: '(514) 555-0348',
    address: '3200 Chemin de la Côte-Sainte-Catherine, Montréal, QC H3T 1C1',
    language: 'FR',
    status: 'Actif',
    createdAt: '2025-02-15',
    tokensUsed: 48900,
    tokenLimit: 50000
  },
  {
    id: '3',
    type: 'Flipper Immobilier',
    name: 'Rehab & Flip MTL (Pierre Dubé)',
    email: 'info@rehabflipmtl.ca',
    phone: '(450) 555-0918',
    address: '1850 Rue Saint-Denis, Montréal, QC H2X 3K7',
    language: 'FR',
    status: 'En retard',
    createdAt: '2025-03-22',
    tokensUsed: 12100,
    tokenLimit: 30000
  },
  {
    id: '4',
    type: 'Gestionnaire Immobilier',
    name: 'Constance Valois (Valois Condos)',
    email: 'c.valois@valoiscondos.com',
    phone: '(514) 555-0422',
    address: '1000 Rue de la Gauchetière O, Montréal, QC H3B 4W5',
    language: 'EN',
    status: 'Suspendu',
    createdAt: '2025-05-18',
    tokensUsed: 5000,
    tokenLimit: 10000
  },
  {
    id: '5',
    type: 'Prospecteur Immobilier',
    name: 'Achat Direct Prospecting (Natalia Ramos)',
    email: 'natalia.ramos@achatdirect.ca',
    phone: '(438) 555-0219',
    address: '450 Rue Saint-Jacques, Montréal, QC H2Y 1S1',
    language: 'ES',
    status: 'Actif',
    createdAt: '2025-08-30',
    tokensUsed: 8900,
    tokenLimit: 25000
  },
  {
    id: '6',
    type: 'Syndicat de copropriété',
    name: "Coseigneurie de l'Île-des-Sœurs",
    email: 'admin@coseigneurieids.com',
    phone: '(450) 555-0812',
    address: '500 Rue de la Rotonde, Verdun, QC H3E 1Z4',
    language: 'EN',
    status: 'Suspendu',
    createdAt: '2025-11-12',
    tokensUsed: 15000,
    tokenLimit: 15000
  }
];

export default function AdminDashboard({ darkMode, onBack, adminName = 'Fabiola Beatriz' }: AdminDashboardProps) {
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Filter States
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [langFilter, setLangFilter] = useState<string>('all');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Private Client Promo Code State
  const [promoStatus, setPromoStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    setPromoStatus('idle');
  }, [editingClient?.id]);

  // Global messaging state
  const [hasUnread, setHasUnread] = useState(true);

  useEffect(() => {
    // Soft "ding" sound on mount for notification simulation
    new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
  }, []);

  // Promo Code State
  const [generatedPromoCode, setGeneratedPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('20');
  const [promoDuration, setPromoDuration] = useState('6_months');
  const [promoCopied, setPromoCopied] = useState(false);

  // Add Form State
  const [newClient, setNewClient] = useState<Omit<Client, 'id' | 'createdAt'>>({
    type: 'Syndicat de copropriété',
    name: '',
    email: '',
    phone: '',
    address: '',
    language: 'FR',
    status: 'Actif',
    tokensUsed: 0,
    tokenLimit: 50000
  });

  // Role details mapping for colors/icons (matching platform's SofiOnboarding glass styles)
  const roleConfig: Record<ClientRole, { bgLight: string; bgDark: string; textLight: string; textDark: string; borderLight: string; borderDark: string; icon: React.ReactNode }> = {
    'Syndicat de copropriété': {
      bgLight: 'bg-purple-50',
      bgDark: 'dark:bg-purple-500/10 dark:backdrop-blur-md',
      textLight: 'text-purple-700',
      textDark: 'dark:text-purple-300',
      borderLight: 'border-purple-100',
      borderDark: 'dark:border-purple-500/30',
      icon: <Users size={12} />
    },
    'Investisseur Immobilier': {
      bgLight: 'bg-emerald-50',
      bgDark: 'dark:bg-emerald-500/10 dark:backdrop-blur-md',
      textLight: 'text-emerald-700',
      textDark: 'dark:text-emerald-300',
      borderLight: 'border-emerald-100',
      borderDark: 'dark:border-emerald-500/30',
      icon: <Building2 size={12} />
    },
    'Flipper Immobilier': {
      bgLight: 'bg-amber-50',
      bgDark: 'dark:bg-amber-500/10 dark:backdrop-blur-md',
      textLight: 'text-amber-700',
      textDark: 'dark:text-amber-300',
      borderLight: 'border-amber-100',
      borderDark: 'dark:border-amber-500/30',
      icon: <Hammer size={12} />
    },
    'Gestionnaire Immobilier': {
      bgLight: 'bg-indigo-50',
      bgDark: 'dark:bg-indigo-500/10 dark:backdrop-blur-md',
      textLight: 'text-indigo-700',
      textDark: 'dark:text-indigo-300',
      borderLight: 'border-indigo-100',
      borderDark: 'dark:border-indigo-500/30',
      icon: <Briefcase size={12} />
    },
    'Prospecteur Immobilier': {
      bgLight: 'bg-cyan-50',
      bgDark: 'dark:bg-cyan-500/10 dark:backdrop-blur-md',
      textLight: 'text-cyan-700',
      textDark: 'dark:text-cyan-300',
      borderLight: 'border-cyan-100',
      borderDark: 'dark:border-cyan-500/30',
      icon: <FileSearch size={12} />
    }
  };

  // Mock Financial Statistics
  const financialStats = useMemo(() => {
    return {
      mrr: 14850.00,
      mrrChange: '+12.4%',
      totalSales: 42940.00,
      salesChange: '+8.2%',
      operationalCost: 6200.00,
      costChange: '-2.1%',
      ltv: 245000.00,
      ltvChange: '+15.0%'
    };
  }, []);

  // Clients stats
  const clientStats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.status === 'Actif').length;
    return { total, active };
  }, [clients]);

  // Dropdown list options
  const filterTypeOptions = [
    { value: 'all', label: 'Tous les profils' },
    { value: 'Syndicat de copropriété', label: 'Syndicat de copropriété', icon: <Users size={12} className="text-purple-500" /> },
    { value: 'Investisseur Immobilier', label: 'Investisseur Immobilier', icon: <Building2 size={12} className="text-emerald-500" /> },
    { value: 'Flipper Immobilier', label: 'Flipper Immobilier', icon: <Hammer size={12} className="text-amber-500" /> },
    { value: 'Gestionnaire Immobilier', label: 'Gestionnaire Immobilier', icon: <Briefcase size={12} className="text-indigo-500" /> },
    { value: 'Prospecteur Immobilier', label: 'Prospecteur Immobilier', icon: <FileSearch size={12} className="text-cyan-500" /> }
  ];

  const filterLangOptions = [
    { value: 'all', label: 'Toutes les langues' },
    { value: 'FR', label: 'Français (FR)', icon: <span className="text-xs">🇫🇷</span> },
    { value: 'EN', label: 'English (EN)', icon: <span className="text-xs">🇬🇧</span> },
    { value: 'ES', label: 'Español (ES)', icon: <span className="text-xs">🇪🇸</span> }
  ];

  const modalTypeOptions = [
    { value: 'Syndicat de copropriété', label: 'Syndicat de copropriété', icon: <Users size={12} className="text-purple-500" /> },
    { value: 'Investisseur Immobilier', label: 'Investisseur Immobilier', icon: <Building2 size={12} className="text-emerald-500" /> },
    { value: 'Flipper Immobilier', label: 'Flipper Immobilier', icon: <Hammer size={12} className="text-amber-500" /> },
    { value: 'Gestionnaire Immobilier', label: 'Gestionnaire Immobilier', icon: <Briefcase size={12} className="text-indigo-500" /> },
    { value: 'Prospecteur Immobilier', label: 'Prospecteur Immobilier', icon: <FileSearch size={12} className="text-cyan-500" /> }
  ];

  const modalLangOptions = [
    { value: 'FR', label: 'Français (FR)', icon: <span className="text-xs">🇫🇷</span> },
    { value: 'EN', label: 'English (EN)', icon: <span className="text-xs">🇬🇧</span> },
    { value: 'ES', label: 'Español (ES)', icon: <span className="text-xs">🇪🇸</span> }
  ];

  const modalStatusOptions = [
    { value: 'Actif', label: 'Actif' },
    { value: 'Suspendu', label: 'Suspendu' },
    { value: 'En retard', label: 'En retard' }
  ];

  // Promo Code Custom select options
  const promoDiscountOptions = [
    { value: '10', label: '10 % de réduction' },
    { value: '20', label: '20 % de réduction' },
    { value: '50', label: '50 % de réduction' },
    { value: '100', label: '100 % (Gratuit)' }
  ];

  const promoDurationOptions = [
    { value: '1_month', label: '1 mois' },
    { value: '6_months', label: '6 mois' },
    { value: 'lifetime', label: 'À vie' }
  ];

  // Filtering Logic
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.includes(searchQuery);
      
      const matchesType = typeFilter === 'all' || client.type === typeFilter;
      const matchesLang = langFilter === 'all' || client.language === langFilter;

      return matchesSearch && matchesType && matchesLang;
    });
  }, [clients, searchQuery, typeFilter, langFilter]);

  // Handlers
  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.email) {
      alert('Veuillez remplir les champs obligatoires.');
      return;
    }
    const created: Client = {
      ...newClient,
      id: String(Date.now()),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setClients(prev => [created, ...prev]);
    setIsAddOpen(false);
    // Reset Form
    setNewClient({
      type: 'Syndicat de copropriété',
      name: '',
      email: '',
      phone: '',
      address: '',
      language: 'FR',
      status: 'Actif',
      tokensUsed: 0,
      tokenLimit: 50000
    });
  };

  const handleSendPrivatePromo = () => {
    setPromoStatus('loading');
    setTimeout(() => {
      setPromoStatus('success');
    }, 1000);
  };

  const handleUpdateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editingClient.name || !editingClient.email) return;
    setClients(prev => prev.map(c => c.id === editingClient.id ? editingClient : c));
    setEditingClient(null);
  };

  const handleDeleteClient = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce client ?')) {
      setClients(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleGeneratePromo = (e: React.FormEvent) => {
    e.preventDefault();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = `GPA-${promoDiscount}-`;
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPromoCode(code);
    setPromoCopied(false);
  };

  const handleCopyPromo = () => {
    navigator.clipboard.writeText(generatedPromoCode);
    setPromoCopied(true);
    setTimeout(() => setPromoCopied(false), 2000);
  };

  const renderLanguageFlag = (lang: 'FR' | 'EN' | 'ES') => {
    switch (lang) {
      case 'FR': return <span className="inline-flex items-center gap-1.5"><span className="text-base">🇫🇷</span> <span className="text-[10px] font-bold">FR</span></span>;
      case 'EN': return <span className="inline-flex items-center gap-1.5"><span className="text-base">🇬🇧</span> <span className="text-[10px] font-bold">EN</span></span>;
      case 'ES': return <span className="inline-flex items-center gap-1.5"><span className="text-base">🇪🇸</span> <span className="text-[10px] font-bold">ES</span></span>;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#0b0f0b] text-[#e2ede2]' : 'bg-[#f7faf7] text-[#1b2b1b]'} font-sans antialiased transition-all duration-300 pb-16`}>
      
      {/* Brand Border Glow */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 shadow-sm" />

      {/* Sticky Header Banner */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${darkMode ? 'bg-[#0b0f0b]/90 border-emerald-950/40' : 'bg-white/90 border-[#1b2b1b]/10'} px-6 py-4`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className={`p-2.5 rounded-xl transition-all active:scale-95 ${darkMode ? 'bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
              title="Retour au tableau de bord"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Shield size={16} className="text-white" />
                </div>
                <h1 className="font-extrabold tracking-tight text-lg md:text-xl">
                  Gestions Solutions GPA Inc.
                </h1>
              </div>
              <p className={`text-[10px] uppercase font-bold tracking-widest mt-0.5 ${darkMode ? 'text-emerald-500/70' : 'text-emerald-700/70'}`}>
                Control Center · Client Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 2. PROMO CODE BUTTON */}
            <button
              onClick={() => {
                setGeneratedPromoCode('');
                setIsPromoOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold tracking-wide transition-all active:scale-95 shadow-md shadow-emerald-500/10 border border-emerald-500/35"
            >
              <Tag size={15} />
              <span>Générer un code promo</span>
            </button>

            <button
              onClick={() => setIsAddOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all active:scale-95 shadow-md ${
                darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <Plus size={15} />
              <span>Nouveau Client</span>
            </button>

            <button
              onClick={() => {
                alert("Ouverture du tiroir de support client / Notifications");
                setHasUnread(false);
              }}
              className={`relative p-2 rounded-xl transition-all active:scale-95 shadow-md border ${
                darkMode 
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Notifications / Support client"
            >
              <Bell size={15} />
              {hasUnread && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#0b0f0b] animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        
        {/* 1. FINANCIAL OVERVIEW & 5. DARK MODE GLASSMORPHISM Summary Cards */}
        <section className="space-y-3">
          <h2 className={`text-[11px] font-black uppercase tracking-widest ${darkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
            Aperçu Financier
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: MRR */}
            <div className={`p-5 rounded-2xl border transition-all ${
              darkMode 
                ? 'bg-white/10 backdrop-blur-md border-white/10 shadow-lg shadow-black/40 text-[#e2ede2]' 
                : 'bg-white border-[#1b2b1b]/5 shadow-sm text-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-slate-400'}`}>
                  MRR (Recettes Récurrentes)
                </span>
                <div className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-500/10 text-emerald-350' : 'bg-emerald-50 text-emerald-600'}`}>
                  <TrendingUp size={14} />
                </div>
              </div>
              <p className="text-2xl font-black tracking-tight">
                {financialStats.mrr.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[10px] font-bold">
                <span className="text-emerald-500 flex items-center">
                  <ArrowUpRight size={12} /> {financialStats.mrrChange}
                </span>
                <span className={darkMode ? 'text-zinc-500' : 'text-slate-400'}>vs mois dernier</span>
              </div>
            </div>

            {/* Card 2: Total Revenue */}
            <div className={`p-5 rounded-2xl border transition-all ${
              darkMode 
                ? 'bg-white/10 backdrop-blur-md border-white/10 shadow-lg shadow-black/40 text-[#e2ede2]' 
                : 'bg-white border-[#1b2b1b]/5 shadow-sm text-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-slate-400'}`}>
                  Total Vendu ce Mois
                </span>
                <div className={`p-2 rounded-lg ${darkMode ? 'bg-teal-500/10 text-teal-350' : 'bg-teal-50 text-teal-600'}`}>
                  <DollarSign size={14} />
                </div>
              </div>
              <p className="text-2xl font-black tracking-tight">
                {financialStats.totalSales.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[10px] font-bold">
                <span className="text-emerald-500 flex items-center">
                  <ArrowUpRight size={12} /> {financialStats.salesChange}
                </span>
                <span className={darkMode ? 'text-zinc-500' : 'text-slate-400'}>vs mois dernier</span>
              </div>
            </div>

            {/* Card 3: Operational Costs */}
            <div className={`p-5 rounded-2xl border transition-all ${
              darkMode 
                ? 'bg-white/10 backdrop-blur-md border-white/10 shadow-lg shadow-black/40 text-[#e2ede2]' 
                : 'bg-white border-[#1b2b1b]/5 shadow-sm text-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-slate-400'}`}>
                  Dépenses Opérationnelles
                </span>
                <div className={`p-2 rounded-lg ${darkMode ? 'bg-rose-500/10 text-rose-350' : 'bg-rose-50 text-rose-600'}`}>
                  <ArrowDownRight size={14} />
                </div>
              </div>
              <p className="text-2xl font-black tracking-tight">
                {financialStats.operationalCost.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[10px] font-bold">
                <span className="text-emerald-500 flex items-center">
                  {financialStats.costChange}
                </span>
                <span className={darkMode ? 'text-zinc-500' : 'text-slate-400'}>optimisé</span>
              </div>
            </div>

            {/* Card 4: Lifetime Value */}
            <div className={`p-5 rounded-2xl border transition-all ${
              darkMode 
                ? 'bg-white/10 backdrop-blur-md border-white/10 shadow-lg shadow-black/40 text-[#e2ede2]' 
                : 'bg-white border-[#1b2b1b]/5 shadow-sm text-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-slate-400'}`}>
                  Valeur Vie Client (LTV)
                </span>
                <div className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-500/10 text-emerald-350' : 'bg-emerald-50 text-emerald-600'}`}>
                  <Users size={14} />
                </div>
              </div>
              <p className="text-2xl font-black tracking-tight">
                {financialStats.ltv.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
              </p>
              <div className="flex items-center gap-1 mt-2 text-[10px] font-bold">
                <span className="text-emerald-500 flex items-center">
                  <ArrowUpRight size={12} /> {financialStats.ltvChange}
                </span>
                <span className={darkMode ? 'text-zinc-500' : 'text-slate-400'}>médiane</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. CUSTOM FILTERS SECTION (NO NATIVE SELECTS & 5. DARK MODE GLASSMORPHISM dropdown buttons) */}
        <section className={`p-4 rounded-2xl border ${
          darkMode 
            ? 'bg-white/10 backdrop-blur-md border-white/10 shadow-lg' 
            : 'bg-white border-[#1b2b1b]/5 shadow-sm'
        } flex flex-col md:flex-row gap-4 items-end justify-between`}>
          
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
            {/* Search Input */}
            <div className="w-full md:w-80">
              <span className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                Recherche rapide
              </span>
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${
                darkMode 
                  ? 'bg-black/20 border-white/10 text-zinc-300' 
                  : 'bg-[#f7faf7] border-[#1b2b1b]/10'
              }`}>
                <Search size={15} className={darkMode ? 'text-zinc-650' : 'text-slate-455'} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom, email, ville..." 
                  className="bg-transparent text-xs font-semibold flex-1 outline-none placeholder-slate-455 dark:placeholder-zinc-600 text-current"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Custom select for Profile Type Filter */}
            <CustomSelect
              label="Type de Profil"
              value={typeFilter}
              options={filterTypeOptions}
              onChange={setTypeFilter}
              darkMode={darkMode}
            />

            {/* Custom select for Language Filter */}
            <CustomSelect
              label="Langue préférée"
              value={langFilter}
              options={filterLangOptions}
              onChange={setLangFilter}
              darkMode={darkMode}
            />
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
            <span className={darkMode ? 'text-zinc-550' : 'text-slate-400'}>
              Affiché: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{filteredClients.length}</strong> / {clientStats.total} clients
            </span>
            {(typeFilter !== 'all' || langFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setLangFilter('all');
                  setSearchQuery('');
                }}
                className={`p-2 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 ${
                  darkMode ? 'bg-zinc-900 border-zinc-850 hover:bg-zinc-800 text-zinc-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <RefreshCw size={11} />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>
        </section>

        {/* 6. DATA TABLE */}
        <section className={`border rounded-2xl overflow-hidden shadow-sm ${
          darkMode 
            ? 'bg-[#111811]/90 border-emerald-950/30' 
            : 'bg-white border-[#1b2b1b]/5'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-emerald-950/30 bg-[#0f150f]' : 'border-slate-100 bg-[#f9fbf9]'}`}>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Nom / Client</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Type de Profil</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider text-center ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Statut</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Consommation Tokens</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider text-right ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b2b1b]/5 dark:divide-emerald-950/20">
                {filteredClients.map((client) => {
                  const conf = roleConfig[client.type];
                  return (
                    <tr 
                      key={client.id}
                      className={`transition-colors ${darkMode ? 'hover:bg-emerald-950/10' : 'hover:bg-emerald-50/20'}`}
                    >
                      {/* Name / Client */}
                      <td className="px-6 py-4">
                        <div 
                          onClick={() => setEditingClient(client)}
                          className={`font-bold text-xs max-w-xs md:max-w-sm truncate cursor-pointer transition-all hover:underline ${
                            darkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-700 hover:text-emerald-600'
                          }`}
                          title={client.name}
                        >
                          {client.name}
                        </div>
                        <div className={`text-[9px] mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                          Inscrit: {client.createdAt}
                        </div>
                      </td>

                      {/* Profil Type Badges */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                          darkMode ? `${conf.bgDark} ${conf.textDark} ${conf.borderDark}` : `${conf.bgLight} ${conf.textLight} ${conf.borderLight}`
                        }`}>
                          {conf.icon}
                          {client.type}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          client.status === 'Actif'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : client.status === 'En retard'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}>
                          {client.status}
                        </span>
                      </td>

                      {/* Token Consumption */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
                            <span className={darkMode ? 'text-zinc-400' : 'text-slate-600'}>
                              {client.tokensUsed.toLocaleString('fr-CA')} / {client.tokenLimit.toLocaleString('fr-CA')}
                            </span>
                            <span className={`text-[9px] font-bold ${client.tokensUsed / client.tokenLimit > 0.8 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {Math.round((client.tokensUsed / client.tokenLimit) * 100)}%
                            </span>
                          </div>
                          <div className={`w-28 h-1 rounded-full overflow-hidden ${darkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                            <div 
                              className={`h-full rounded-full ${client.tokensUsed / client.tokenLimit > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (client.tokensUsed / client.tokenLimit) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingClient(client)}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-zinc-800 text-emerald-400' : 'hover:bg-slate-100 text-emerald-700'}`}
                            title="Voir/Éditer les détails"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => alert(`Connexion en tant que client : ${client.name}`)}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-zinc-800 text-blue-400' : 'hover:bg-slate-100 text-blue-750'}`}
                            title="Connexion en tant que client"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => alert(`Ouverture de la messagerie interne pour : ${client.name}`)}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-zinc-800 text-purple-400' : 'hover:bg-slate-100 text-purple-700'}`}
                            title="Message Interne"
                          >
                            <MessageSquare size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Users size={32} className={`mb-3 ${darkMode ? 'text-zinc-700' : 'text-slate-355'}`} />
                        <p className="font-bold text-sm">Aucun client ne correspond</p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                          Veuillez adapter vos filtres de recherche.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* PROMO CODE GENERATION MODAL */}
      {isPromoOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
            darkMode ? 'bg-zinc-950 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-gradient-to-r from-emerald-950/20 to-teal-950/20">
              <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <Tag className="text-emerald-500" size={16} />
                <span>Générer un Code Promo</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsPromoOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGeneratePromo} className="p-6 space-y-5">
              <div className="space-y-4">
                {/* Discount Select */}
                <CustomSelect
                  label="Valeur du Rabais"
                  value={promoDiscount}
                  options={promoDiscountOptions}
                  onChange={setPromoDiscount}
                  darkMode={darkMode}
                  fullWidth
                />

                {/* Duration Select */}
                <CustomSelect
                  label="Durée de validité"
                  value={promoDuration}
                  options={promoDurationOptions}
                  onChange={setPromoDuration}
                  darkMode={darkMode}
                  fullWidth
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  Générer le Code
                </button>
              </div>

              {generatedPromoCode && (
                <div className={`p-4 rounded-xl border flex items-center justify-between mt-4 ${
                  darkMode ? 'bg-white/10 border-white/10 text-white' : 'bg-emerald-50/50 border-emerald-100 text-emerald-850'
                }`}>
                  <div>
                    <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">
                      CODE PRÊT À TRANSMETTRE
                    </span>
                    <strong className="text-base tracking-widest font-extrabold">{generatedPromoCode}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPromo}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-90 ${
                      promoCopied 
                        ? 'bg-emerald-600 text-white' 
                        : darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-350' : 'bg-white hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {promoCopied ? <Check size={11} /> : <Copy size={11} />}
                    <span>{promoCopied ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPromoOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${
                    darkMode ? 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  Fermer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CLIENT MODAL (USING CUSTOM SELECTS THROUGHOUT) */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${darkMode ? 'bg-zinc-950 border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-gradient-to-r from-emerald-950/20 to-teal-950/20">
              <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="text-emerald-500" size={16} />
                <span>Nouveau Client</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Custom Select for Role Type */}
                <CustomSelect
                  label="Type de Profil *"
                  value={newClient.type}
                  options={modalTypeOptions}
                  onChange={val => setNewClient(prev => ({ ...prev, type: val as ClientRole }))}
                  darkMode={darkMode}
                  fullWidth
                />

                {/* Custom Select for Language */}
                <CustomSelect
                  label="Langue *"
                  value={newClient.language}
                  options={modalLangOptions}
                  onChange={val => setNewClient(prev => ({ ...prev, language: val as 'FR' | 'EN' | 'ES' }))}
                  darkMode={darkMode}
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                  Nom Complet ou Nom du Syndicat *
                </label>
                <input
                  type="text"
                  required
                  value={newClient.name}
                  onChange={e => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Syndicat du 1420 Saint-Laurent"
                  className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none ${darkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                    Adresse Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newClient.email}
                    onChange={e => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="exemple@solutionsgpa.ca"
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none ${darkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={newClient.phone}
                    onChange={e => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(514) 555-0100"
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none ${darkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                  Adresse physique complète
                </label>
                <input
                  type="text"
                  value={newClient.address}
                  onChange={e => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Rue Principale, Montréal, QC"
                  className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none ${darkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${darkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Ajouter le client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLIENT MODAL (USING CUSTOM SELECTS THROUGHOUT) */}
      {editingClient && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${darkMode ? 'bg-zinc-950 border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-gradient-to-r from-emerald-950/20 to-teal-950/20">
              <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="text-emerald-500" size={16} />
                <span>Modifier le client</span>
              </h3>
              <button 
                type="button"
                onClick={() => setEditingClient(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Custom Select for Role Type */}
                <CustomSelect
                  label="Type de Profil *"
                  value={editingClient.type}
                  options={modalTypeOptions}
                  onChange={val => setEditingClient(prev => prev ? ({ ...prev, type: val as ClientRole }) : null)}
                  darkMode={darkMode}
                  fullWidth
                />

                {/* Custom Select for Language */}
                <CustomSelect
                  label="Langue *"
                  value={editingClient.language}
                  options={modalLangOptions}
                  onChange={val => setEditingClient(prev => prev ? ({ ...prev, language: val as 'FR' | 'EN' | 'ES' }) : null)}
                  darkMode={darkMode}
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                  Nom Complet ou Nom du Syndicat *
                </label>
                <input
                  type="text"
                  required
                  value={editingClient.name}
                  onChange={e => setEditingClient(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none ${darkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                    Adresse Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={editingClient.email}
                    onChange={e => setEditingClient(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none ${darkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={editingClient.phone}
                    onChange={e => setEditingClient(prev => prev ? ({ ...prev, phone: e.target.value }) : null)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none ${darkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                  Adresse physique complète
                </label>
                <input
                  type="text"
                  value={editingClient.address}
                  onChange={e => setEditingClient(prev => prev ? ({ ...prev, address: e.target.value }) : null)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none ${darkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Custom Select for Status */}
                <CustomSelect
                  label="Statut"
                  value={editingClient.status}
                  options={modalStatusOptions}
                  onChange={val => setEditingClient(prev => prev ? ({ ...prev, status: val as 'Actif' | 'Suspendu' | 'En retard' }) : null)}
                  darkMode={darkMode}
                  fullWidth
                />
              </div>

              {/* Promotions & Réductions Section */}
              <hr className={darkMode ? 'border-white/10' : 'border-slate-200'} />
              <div className={`p-4 rounded-xl border ${
                darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
              } space-y-3`}>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-550">
                  Promotions & Réductions
                </h4>
                <p className={`text-[11px] font-medium leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-slate-650'}`}>
                  Générez un code promo privé à usage unique pour ce client. Il sera automatiquement envoyé par messagerie interne.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={promoStatus === 'loading'}
                    onClick={handleSendPrivatePromo}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                  >
                    {promoStatus === 'loading' ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Génération...</span>
                      </>
                    ) : (
                      <span>Générer et envoyer un code privé</span>
                    )}
                  </button>
                  {promoStatus === 'success' && (
                    <p className="text-emerald-600 text-sm mt-2 font-medium text-center">
                      Code à usage unique envoyé par messagerie interne !
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${darkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
