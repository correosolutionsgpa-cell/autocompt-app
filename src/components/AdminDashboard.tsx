import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Users, Search, Filter, Plus, Shield, Mail, Phone,
  MapPin, Globe, Building2, User, Edit3, Trash2, Check, X,
  PlusCircle, RefreshCw, ChevronDown, Download
} from 'lucide-react';

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface Client {
  id: string;
  type: 'Syndicat' | 'Investisseur';
  name: string;
  email: string;
  phone: string;
  address: string;
  language: 'FR' | 'EN' | 'ES';
  status: 'Actif' | 'Inactif';
  createdAt: string;
}

interface AdminDashboardProps {
  darkMode: boolean;
  onBack: () => void;
  adminName?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    type: 'Syndicat',
    name: 'Syndicat des Copropriétaires du 1420 Boulevard Saint-Laurent',
    email: 'syndicat1420@solutionsgpa.ca',
    phone: '(514) 555-0192',
    address: '1420 Blvd Saint-Laurent, Montréal, QC H2X 2S6',
    language: 'FR',
    status: 'Actif',
    createdAt: '2025-01-10'
  },
  {
    id: '2',
    type: 'Investisseur',
    name: 'Solutions GPA Inc. (Plex Portfolio)',
    email: 'jf.lemay@solutionsgpa.ca',
    phone: '(514) 555-0348',
    address: '3200 Chemin de la Côte-Sainte-Catherine, Montréal, QC H3T 1C1',
    language: 'FR',
    status: 'Actif',
    createdAt: '2025-02-15'
  },
  {
    id: '3',
    type: 'Syndicat',
    name: "Coseigneurie de l'Île-des-Sœurs",
    email: 'admin@coseigneurieids.com',
    phone: '(450) 555-0812',
    address: '500 Rue de la Rotonde, Verdun, QC H3E 1Z4',
    language: 'EN',
    status: 'Actif',
    createdAt: '2025-05-20'
  },
  {
    id: '4',
    type: 'Investisseur',
    name: 'Elena Rostova',
    email: 'elena.rostova@gmail.com',
    phone: '(438) 555-0923',
    address: '850 Rue Saint-Jacques, Montréal, QC H3C 1G7',
    language: 'ES',
    status: 'Actif',
    createdAt: '2025-11-01'
  },
  {
    id: '5',
    type: 'Syndicat',
    name: 'Condominiums du Vieux-Port Phase II',
    email: 'vieuxport2@gestioncondo.ca',
    phone: '(514) 555-0777',
    address: '220 Rue de la Commune O, Montréal, QC H2Y 4B2',
    language: 'FR',
    status: 'Inactif',
    createdAt: '2026-03-04'
  }
];

export default function AdminDashboard({ darkMode, onBack, adminName = 'Fabiola Beatriz' }: AdminDashboardProps) {
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Syndicat' | 'Investisseur'>('all');
  const [langFilter, setLangFilter] = useState<'all' | 'FR' | 'EN' | 'ES'>('all');
  
  // New Client Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClient, setNewClient] = useState<Omit<Client, 'id' | 'createdAt'>>({
    type: 'Syndicat',
    name: '',
    email: '',
    phone: '',
    address: '',
    language: 'FR',
    status: 'Actif'
  });

  // Edit Mode state
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const total = clients.length;
    const syndicats = clients.filter(c => c.type === 'Syndicat').length;
    const investisseurs = clients.filter(c => c.type === 'Investisseur').length;
    const actifs = clients.filter(c => c.status === 'Actif').length;
    return { total, syndicats, investisseurs, actifs };
  }, [clients]);

  // Filtered client list
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
    setIsModalOpen(false);
    // Reset form
    setNewClient({
      type: 'Syndicat',
      name: '',
      email: '',
      phone: '',
      address: '',
      language: 'FR',
      status: 'Actif'
    });
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

  // Language display helper
  const renderLanguageFlag = (lang: 'FR' | 'EN' | 'ES') => {
    switch (lang) {
      case 'FR': return <span className="inline-flex items-center gap-1"><span className="text-base">🇫🇷</span> <span className="text-[10px] font-black">FR</span></span>;
      case 'EN': return <span className="inline-flex items-center gap-1"><span className="text-base">🇬🇧</span> <span className="text-[10px] font-black">EN</span></span>;
      case 'ES': return <span className="inline-flex items-center gap-1"><span className="text-base">🇪🇸</span> <span className="text-[10px] font-black">ES</span></span>;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#0b0f0b] text-[#e2ede2]' : 'bg-[#f7faf7] text-[#1b2b1b]'} font-sans antialiased transition-all duration-300 pb-16`}>
      
      {/* Upper Brand Glow Border */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 shadow-sm" />

      {/* Main Header Banner */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${darkMode ? 'bg-[#0b0f0b]/90 border-emerald-950/40' : 'bg-white/90 border-[#1b2b1b]/10'} px-6 py-4 transition-colors`}>
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
                Control Center · Responsable: {adminName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold tracking-wide transition-all active:scale-95 shadow-md shadow-emerald-500/10"
            >
              <Plus size={15} />
              <span>Nouveau Client</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-6">
        
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Clients', value: stats.total, icon: <Users size={20} />, color: 'emerald' },
            { label: 'Syndicats', value: stats.syndicats, icon: <Building2 size={20} />, color: 'teal' },
            { label: 'Investisseurs', value: stats.investisseurs, icon: <User size={20} />, color: 'green' },
            { label: 'Clients Actifs', value: stats.actifs, icon: <Check size={20} />, color: 'emerald' },
          ].map((stat, idx) => (
            <div 
              key={idx}
              className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#111811]/90 border-emerald-950/30' : 'bg-white border-[#1b2b1b]/5'} shadow-sm relative overflow-hidden`}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full filter blur-3xl opacity-10 bg-emerald-500`} />
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    {stat.label}
                  </span>
                  <p className="text-2xl font-black mt-1 tracking-tight">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-emerald-950/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Search Bar */}
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#111811]/90 border-emerald-950/30' : 'bg-white border-[#1b2b1b]/5'} flex flex-col md:flex-row gap-3 items-center justify-between`}>
          
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border w-full md:max-w-md ${darkMode ? 'bg-zinc-950/40 border-emerald-950/30 text-zinc-300' : 'bg-[#f7faf7] border-[#1b2b1b]/10'}`}>
            <Search size={16} className={darkMode ? 'text-zinc-600' : 'text-slate-400'} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, email, adresse, téléphone..." 
              className="bg-transparent text-xs font-medium flex-1 outline-none placeholder-slate-400 dark:placeholder-zinc-600"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter selectors */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className={`px-3 py-2 rounded-xl border text-[11px] font-bold outline-none cursor-pointer ${darkMode ? 'bg-[#111811] border-emerald-950/40 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}
            >
              <option value="all">Tous les types</option>
              <option value="Syndicat">Syndicats</option>
              <option value="Investisseur">Investisseurs</option>
            </select>

            {/* Language Filter */}
            <select
              value={langFilter}
              onChange={e => setLangFilter(e.target.value as any)}
              className={`px-3 py-2 rounded-xl border text-[11px] font-bold outline-none cursor-pointer ${darkMode ? 'bg-[#111811] border-emerald-950/40 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}
            >
              <option value="all">Toutes les langues</option>
              <option value="FR">Français (FR)</option>
              <option value="EN">English (EN)</option>
              <option value="ES">Español (ES)</option>
            </select>
            
            {/* Reset Button */}
            {(typeFilter !== 'all' || langFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setLangFilter('all');
                  setSearchQuery('');
                }}
                className={`p-2 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}
              >
                <RefreshCw size={12} />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>

        </div>

        {/* Clean, Modern Data Table */}
        <div className={`border rounded-2xl overflow-hidden shadow-sm ${darkMode ? 'bg-[#111811]/90 border-emerald-950/30' : 'bg-white border-[#1b2b1b]/5'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-emerald-950/30 bg-[#0f150f]' : 'border-slate-100 bg-[#f9fbf9]'}`}>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Type</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Nom / Syndicat</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Contact & Email</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Téléphone</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Adresse Physique</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Langue</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider text-center ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Statut</th>
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider text-right ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b2b1b]/5 dark:divide-emerald-950/20">
                {filteredClients.map((client) => (
                  <tr 
                    key={client.id}
                    className={`transition-colors ${darkMode ? 'hover:bg-emerald-950/10' : 'hover:bg-emerald-50/20'}`}
                  >
                    {/* Client Type Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                        client.type === 'Syndicat' 
                          ? (darkMode ? 'bg-teal-950/40 text-teal-400 border border-teal-900/30' : 'bg-teal-50 text-teal-700 border border-teal-100')
                          : (darkMode ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')
                      }`}>
                        {client.type === 'Syndicat' ? <Building2 size={10} /> : <User size={10} />}
                        {client.type}
                      </span>
                    </td>

                    {/* Full Name */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-xs max-w-xs md:max-w-sm truncate" title={client.name}>
                        {client.name}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                        Créé le: {client.createdAt}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Mail size={12} className={darkMode ? 'text-emerald-500/50' : 'text-emerald-600/50'} />
                        <a href={`mailto:${client.email}`} className="hover:underline font-semibold text-emerald-600 dark:text-emerald-400">
                          {client.email}
                        </a>
                      </div>
                    </td>

                    {/* Phone Number */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className={darkMode ? 'text-zinc-600' : 'text-slate-400'} />
                        <span>{client.phone}</span>
                      </div>
                    </td>

                    {/* Physical Address */}
                    <td className="px-6 py-4 max-w-xs">
                      <div className="flex items-start gap-1.5 text-xs">
                        <MapPin size={13} className={`shrink-0 mt-0.5 ${darkMode ? 'text-zinc-600' : 'text-slate-400'}`} />
                        <span className="leading-tight font-medium" title={client.address}>
                          {client.address}
                        </span>
                      </div>
                    </td>

                    {/* Language Preference */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderLanguageFlag(client.language)}
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                        client.status === 'Actif'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {client.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingClient(client)}
                          className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-zinc-800 text-emerald-400' : 'hover:bg-slate-100 text-emerald-700'}`}
                          title="Modifier"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-rose-950/20 text-rose-400' : 'hover:bg-rose-50 text-rose-600'}`}
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Users size={32} className={`mb-3 ${darkMode ? 'text-zinc-700' : 'text-slate-300'}`} />
                        <p className="font-bold text-sm">Aucun client trouvé</p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                          Modifiez vos critères de recherche ou filtres.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* CREATE NEW CLIENT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${darkMode ? 'bg-[#0f140f] border-emerald-950/60' : 'bg-white border-slate-200'}`}
            >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-emerald-950/40 flex justify-between items-center bg-gradient-to-r from-emerald-950/20 to-teal-950/20">
                <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                  <PlusCircle className="text-emerald-500" size={16} />
                  <span>Ajouter un nouveau client</span>
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddClient} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                      Type de client *
                    </label>
                    <select
                      value={newClient.type}
                      onChange={e => setNewClient(prev => ({ ...prev, type: e.target.value as any }))}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-zinc-950 border-emerald-950/40 text-white' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <option value="Syndicat">Syndicat</option>
                      <option value="Investisseur">Investisseur</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                      Langue préférée
                    </label>
                    <select
                      value={newClient.language}
                      onChange={e => setNewClient(prev => ({ ...prev, language: e.target.value as any }))}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-zinc-950 border-emerald-950/40 text-white' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <option value="FR">Français (FR)</option>
                      <option value="EN">English (EN)</option>
                      <option value="ES">Español (ES)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                    Nom complet / Syndicat *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClient.name}
                    onChange={e => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Syndicat du 1420 Saint-Laurent ou Jean Dupont"
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-zinc-950 border-emerald-950/40 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                      Adresse Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={newClient.email}
                      onChange={e => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="nom@exemple.com"
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-zinc-950 border-emerald-950/40 text-white' : 'bg-slate-50 border-slate-200'}`}
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
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-zinc-950 border-emerald-950/40 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                    Adresse physique
                  </label>
                  <input
                    type="text"
                    value={newClient.address}
                    onChange={e => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Numéro, rue, ville, code postal"
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-zinc-950 border-emerald-950/40 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-emerald-950/40">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${darkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    Créer le client
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT CLIENT MODAL */}
      <AnimatePresence>
        {editingClient && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${darkMode ? 'bg-[#0f140f] border-emerald-950/60' : 'bg-white border-slate-200'}`}
            >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-emerald-950/40 flex justify-between items-center bg-gradient-to-r from-emerald-950/20 to-teal-950/20">
                <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                  <Edit3 className="text-emerald-500" size={16} />
                  <span>Modifier le client</span>
                </h3>
                <button 
                  onClick={() => setEditingClient(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUpdateClient} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                      Type de client *
                    </label>
                    <select
                      value={editingClient.type}
                      onChange={e => setEditingClient(prev => prev ? ({ ...prev, type: e.target.value as any }) : null)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-zinc-950 border-emerald-950/40 text-white' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <option value="Syndicat">Syndicat</option>
                      <option value="Investisseur">Investisseur</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                      Langue préférée
                    </label>
                    <select
                      value={editingClient.language}
                      onChange={e => setEditingClient(prev => prev ? ({ ...prev, language: e.target.value as any }) : null)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-zinc-950 border-emerald-950/40 text-white' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <option value="FR">Français (FR)</option>
                      <option value="EN">English (EN)</option>
                      <option value="ES">Español (ES)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                    Nom complet / Syndicat *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingClient.name}
                    onChange={e => setEditingClient(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-zinc-950 border-emerald-950/40 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                      Adresse Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={editingClient.email}
                      onChange={e => setEditingClient(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-zinc-950 border-emerald-950/40 text-white' : 'bg-slate-50 border-slate-200'}`}
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
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-zinc-950 border-emerald-950/40 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                    Adresse physique
                  </label>
                  <input
                    type="text"
                    value={editingClient.address}
                    onChange={e => setEditingClient(prev => prev ? ({ ...prev, address: e.target.value }) : null)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-zinc-950 border-emerald-950/40 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400 dark:text-zinc-500">
                      Statut
                    </label>
                    <select
                      value={editingClient.status}
                      onChange={e => setEditingClient(prev => prev ? ({ ...prev, status: e.target.value as any }) : null)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-zinc-950 border-emerald-950/40 text-white' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <option value="Actif">Actif</option>
                      <option value="Inactif">Inactif</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-emerald-950/40">
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
