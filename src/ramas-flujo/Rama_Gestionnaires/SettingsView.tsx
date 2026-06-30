/**
 * SettingsView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Gestionnaires (Paramètres Système)
 * Extraído de: src/App.tsx (L18066–L18593) — Fase 11 del desmantelamiento modular
 *
 * Vista de configuration: profil entreprise Québec, profil administrateur,
 * préférences UX (langue, mode sombre, sons).
 * CERO estados propios — 100% presentacional via props tipadas.
 *
 * Iconos importados directamente — no pasan como props.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import sofiAvatar from "../../assets/sofi/sofimediocuerpoblanco.png";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Building2,
  Car,
  CheckCircle2,
  ChevronDown,
  Gauge,
  Hash,
  Mail,
  MapPin,
  Moon,
  Palette,
  Percent,
  Phone,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  User,
  Image as ImageIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SettingsViewProps {
  // Mode
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;

  // Profil entreprise
  userProfile: any;
  setUserProfile: (fn: any | ((prev: any) => any)) => void;

  // Profil administrateur
  adminName: string;
  setAdminName: (val: string) => void;
  adminRole: string;
  setAdminRole: (val: string) => void;
  adminPhoto: string;
  setAdminPhoto: (val: string) => void;
  adminPhone: string;
  setAdminPhone: (val: string) => void;
  adminEmail: string;
  setAdminEmail: (val: string) => void;

  // Langue
  activeLang: "FR" | "ES" | "EN";
  setActiveLang: (val: "FR" | "ES" | "EN") => void;

  // Sons
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;

  // Tour d'accueil
  showSettingsTour: boolean;
  setShowSettingsTour: (val: boolean) => void;

  // Fonctions utilitaires App
  playNotificationSound: () => void;

  // Navigation
  setVista: (vista: string) => void;

  // Composant App
  WorkspaceSidebar: React.ComponentType;
}

// ── Registre Véhicules — Single Source of Truth ──────────────────────────────
// Exported so KilometrageGPS can import the type for safe reading.
export interface RegisteredVehicle {
  id: string;
  marque: string;
  modele: string;
  annee: string;
  plaque: string;
  odometreInitial: number;
}

const VEHICLES_STORAGE_KEY = "autocompt_vehicles";

// ── Composant ─────────────────────────────────────────────────────────────────

const SettingsView: React.FC<SettingsViewProps> = ({
  darkMode,
  setDarkMode,
  userProfile,
  setUserProfile,
  adminName,
  setAdminName,
  adminRole,
  setAdminRole,
  adminPhoto,
  setAdminPhoto,
  adminPhone,
  setAdminPhone,
  adminEmail,
  setAdminEmail,
  activeLang,
  setActiveLang,
  soundEnabled,
  setSoundEnabled,
  showSettingsTour,
  setShowSettingsTour,
  playNotificationSound,
  setVista,
  WorkspaceSidebar,
}) => {
  // ── Registre Véhicules — état local persisté dans localStorage ───────────
  const [vehicles, setVehicles] = useState<RegisteredVehicle[]>(() => {
    try { return JSON.parse(localStorage.getItem(VEHICLES_STORAGE_KEY) || "[]"); }
    catch { return []; }
  });
  const [vehMarque, setVehMarque] = useState("");
  const [vehModele, setVehModele] = useState("");
  const [vehAnnee, setVehAnnee] = useState("");
  const [vehPlaque, setVehPlaque] = useState("");
  const [vehOdometre, setVehOdometre] = useState("");

  const handleAddVehicle = () => {
    const marque = vehMarque.trim();
    const modele = vehModele.trim();
    if (!marque || !modele) return;
    const newV: RegisteredVehicle = {
      id: Date.now().toString(),
      marque,
      modele,
      annee: vehAnnee.trim(),
      plaque: vehPlaque.trim().toUpperCase(),
      odometreInitial: parseFloat(vehOdometre) || 0,
    };
    const updated = [...vehicles, newV];
    setVehicles(updated);
    localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(updated));
    playNotificationSound();
    setVehMarque(""); setVehModele(""); setVehAnnee(""); setVehPlaque(""); setVehOdometre("");
  };

  const handleRemoveVehicle = (id: string) => {
    const updated = vehicles.filter(v => v.id !== id);
    setVehicles(updated);
    localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col font-sans transition-all duration-300 md:pl-72`}>
      {/* Background gradient blooms for premium look */}
      {darkMode && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-slate-650/10 blur-[100px]" />
          <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-indigo-650/10 blur-[100px]" />
        </div>
      )}
      <WorkspaceSidebar />
      <header className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} px-6 py-4 border-b shadow-sm sticky top-0 z-50 flex items-center justify-between`}>
        <div className="flex items-center space-x-3">
          <button onClick={() => setVista("dashboard")} className={`p-2 rounded-xl transition-colors ${darkMode ? "text-zinc-400 hover:bg-zinc-900 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
            <ArrowLeft size={20} />
          </button>
          <div className="text-left">
            <div className="flex items-center gap-1.5 text-[8.5px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
              <span>AutoCompt</span>
              <span>/</span>
              <span>Tableau de Bord</span>
              <span className="text-slate-550 font-bold">/ Paramètres</span>
            </div>
            <h1 className="font-black uppercase italic tracking-tighter text-base sm:text-lg mt-0.5">Paramètres</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className={`p-2 rounded-lg relative transition-all ${darkMode ? "bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800" : "bg-white shadow-sm border border-slate-200 text-slate-450 hover:bg-slate-50"}`}>
            <Bell size={14} />
          </button>

          <div className="flex items-center gap-2.5 bg-slate-50/50 dark:bg-zinc-900/40 p-1.5 pr-3 rounded-full border border-slate-150 dark:border-zinc-800 shadow-sm hover:border-slate-500/30 transition-all cursor-pointer">
            <img
              src={adminPhoto}
              alt={adminName}
              className="w-7 h-7 rounded-full border border-violet-500/20 object-cover shadow-sm"
            />
            <div className="text-left hidden sm:block">
              <div className="flex items-center gap-1 leading-none">
                <p className="text-[9px] font-black uppercase tracking-tight text-slate-900 dark:text-zinc-150">{adminName}</p>
                <ChevronDown size={8} className="text-slate-400" />
              </div>
              <p className="text-[7px] font-bold uppercase text-slate-500 tracking-wider mt-0.5 leading-none">{adminRole}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500">

        {/* ══════════════════════════════════════════════════════════════════
              Phase 4: Section — Profil d'Entreprise Québec
              Required for invoice conformity: logo, NEQ, TPS/TVQ, address.
              design_system_rules.md §2: 3D glass card anatomy.
          ══════════════════════════════════════════════════════════════════ */}
        <div className={`relative p-8 rounded-[32px] border overflow-hidden ${darkMode
          ? "bg-[#090D1A]/60 border-emerald-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl"
          : "bg-white border-emerald-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_30px_rgba(16,185,129,0.05)]"
          }`}>
          {/* Specular top highlight line (design_system_rules §2) */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500/70 via-cyan-500/40 to-transparent rounded-full pointer-events-none" />

          {/* Section heading */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800/60">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Building2 size={18} />
              </span>
              <span>Profil d&apos;Entreprise — Québec</span>
            </h2>
            {/* Compliance badge */}
            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Facturation conforme ✓
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ── Logo Upload ─────────────────────────────────────────── */}
            <div className="md:col-span-2 space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2 flex items-center gap-1.5">
                <ImageIcon size={11} className="text-emerald-500" />
                Upload de Logo
              </label>
              <div className={`flex items-start gap-4 p-4 rounded-2xl border ${darkMode ? "bg-zinc-950/50 border-zinc-800" : "bg-slate-50 border-slate-200"
                }`}>
                {/* Preview */}
                <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center shrink-0 overflow-hidden ${darkMode ? "border-zinc-700 bg-zinc-900" : "border-slate-200 bg-white"
                  }`}>
                  {userProfile.logo ? (
                    <img src={userProfile.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 size={22} className="text-slate-300 dark:text-zinc-700" />
                  )}
                </div>

                {/* Upload controls */}
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="settings-logo-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        setUserProfile((prev: any) => ({ ...prev, logo: dataUrl }));
                        playNotificationSound();
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label
                    htmlFor="settings-logo-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
                  >
                    <Upload size={11} />
                    Choisir un fichier (PNG, JPG, SVG)
                  </label>
                  {userProfile.logo && (
                    <button
                      onClick={() => setUserProfile((prev: any) => ({ ...prev, logo: null }))}
                      className="text-[9px] font-bold text-rose-400 hover:text-rose-600 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Supprimer
                    </button>
                  )}
                </div>

                {/* ── Phase 5: Sofi Logo-Assistant sticker + permanent tooltip ──────────────
                      Sits beside the upload control. Always visible (no hover required).
                      Exact Quebec-FR spec text per Phase 5 requirement.
                  ─────────────────────────────────────────────────────────────────────────── */}
                {/* ── S.O.F.I. Avatar Card ──────────────────────────────────
                      Unified branding with BureauDomicile S.O.F.I. Conseil banner.
                      Phase 5 spec text preserved inside the speech bubble.
                  ──────────────────────────────────────────────────── */}
                <div className="shrink-0 flex flex-col items-center gap-3">

                  {/* Avatar: emerald glassmorphism badge — matches BureauDomicile */}
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                    className="relative"
                  >
                    {/* Glow halo */}
                    <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-lg animate-pulse pointer-events-none" />

                    {/* S.O.F.I. circular face avatar */}
                    <img
                      src={sofiAvatar}
                      alt="S.O.F.I. — Assistante IA"
                      className="relative z-10 w-12 h-12 rounded-full object-cover object-top border-2 border-emerald-500 shadow-xl shadow-emerald-500/30"
                    />

                    {/* Live pulsing status dot */}
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-zinc-900" />
                    </span>
                  </motion.div>

                  {/* Speech bubble — emerald design system */}
                  <div
                    className={`relative rounded-[14px] border p-3 max-w-[178px] shadow-lg overflow-hidden ${darkMode
                      ? "bg-emerald-950/40 border-emerald-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-xl"
                      : "bg-emerald-50 border-emerald-200"
                      }`}
                  >
                    {/* Specular top line */}
                    <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-emerald-400/80 to-transparent pointer-events-none rounded-full" />
                    {/* Bubble tail pointing up toward sticker */}
                    <div
                      className={`absolute -top-[7px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-t border-l ${darkMode ? "bg-emerald-950/40 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
                        }`}
                    />

                    {/* Header row */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <p
                        className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-emerald-400" : "text-emerald-600"
                          }`}
                      >
                        💡 S.O.F.I. conseil
                      </p>
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                    </div>

                    <p
                      className={`text-[9.5px] font-medium leading-snug ${darkMode ? "text-zinc-200" : "text-slate-700"
                        }`}
                    >
                      N&apos;oubliez pas d&apos;ajouter votre logo&nbsp;! Pour un
                      résultat parfait sur vos factures, utilisez une image carrée
                      (ex&nbsp;: 500×500 px) d&apos;un maximum de 2&nbsp;Mo.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Nom de l'entreprise ─────────────────────────────────── */}
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2 flex items-center gap-1.5">
                <Building2 size={11} className="text-emerald-500" />
                Nom de l&apos;entreprise
              </label>
              <input
                id="settings-company-name"
                type="text"
                value={userProfile.nom || ""}
                onChange={(e) => {
                  setUserProfile((prev: any) => ({ ...prev, nom: e.target.value }));
                  localStorage.setItem("autocompt_company_nom", e.target.value);
                }}
                placeholder="Ex: Solutions GPA Inc."
                className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold transition-all focus:ring-2 focus:ring-emerald-500/30 ${darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300"
                  }`}
              />
            </div>

            {/* ── NEQ ─────────────────────────────────────────────────── */}
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2 flex items-center gap-1.5">
                <Hash size={11} className="text-cyan-500" />
                NEQ — Numéro d&apos;entreprise du Québec
              </label>
              <input
                id="settings-neq"
                type="text"
                value={userProfile.neq || ""}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                  setUserProfile((prev: any) => ({ ...prev, neq: val }));
                  localStorage.setItem("autocompt_company_neq", val);
                }}
                placeholder="10 chiffres — ex: 1170000000"
                maxLength={10}
                className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold tracking-widest transition-all focus:ring-2 focus:ring-cyan-500/30 ${darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300"
                  }`}
              />
            </div>

            {/* ── Numéro TPS ──────────────────────────────────────────── */}
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2 flex items-center gap-1.5">
                <Percent size={11} className="text-rose-500" />
                Numéro de TPS (Gouvernement du Canada)
              </label>
              <input
                id="settings-tps-number"
                type="text"
                value={userProfile.tps || ""}
                onChange={(e) => {
                  setUserProfile((prev: any) => ({ ...prev, tps: e.target.value }));
                  localStorage.setItem("autocompt_company_tps", e.target.value);
                }}
                placeholder="Ex: 123456789 RT0001"
                className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold tracking-widest transition-all focus:ring-2 focus:ring-rose-500/30 ${darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300"
                  }`}
              />
            </div>

            {/* ── Numéro TVQ ──────────────────────────────────────────── */}
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2 flex items-center gap-1.5">
                <Percent size={11} className="text-rose-400" />
                Numéro de TVQ (Revenu Québec)
              </label>
              <input
                id="settings-tvq-number"
                type="text"
                value={userProfile.tvq || ""}
                onChange={(e) => {
                  setUserProfile((prev: any) => ({ ...prev, tvq: e.target.value }));
                  localStorage.setItem("autocompt_company_tvq", e.target.value);
                }}
                placeholder="Ex: 1234567890 TQ0001"
                className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold tracking-widest transition-all focus:ring-2 focus:ring-rose-500/30 ${darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300"
                  }`}
              />
            </div>

            {/* ── Adresse professionnelle ─────────────────────────────── */}
            <div className="md:col-span-2 space-y-1 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2 flex items-center gap-1.5">
                <MapPin size={11} className="text-indigo-400" />
                Adresse professionnelle
              </label>
              <input
                id="settings-address"
                type="text"
                value={userProfile.adresse || ""}
                onChange={(e) => {
                  setUserProfile((prev: any) => ({ ...prev, adresse: e.target.value }));
                  localStorage.setItem("autocompt_company_adresse", e.target.value);
                }}
                placeholder="Ex: 1210 rue Maurice Cullen, Blainville, QC  J7C 0C1"
                className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold transition-all focus:ring-2 focus:ring-indigo-500/30 ${darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300"
                  }`}
              />
            </div>

            {/* ── Numéro de téléphone ──────────────────────────────── */}
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2 flex items-center gap-1.5">
                <Phone size={11} className="text-sky-500" />
                Numéro de téléphone
              </label>
              <input
                id="settings-phone"
                type="tel"
                value={userProfile.tel || ""}
                onChange={(e) => {
                  setUserProfile((prev: any) => ({ ...prev, tel: e.target.value }));
                  localStorage.setItem("autocompt_company_tel", e.target.value);
                }}
                placeholder="Ex: (450) 123-4567"
                className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold tracking-widest transition-all focus:ring-2 focus:ring-sky-500/30 ${darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300"
                  }`}
              />
            </div>

            {/* ── Courriel ─────────────────────────────────────────────── */}
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2 flex items-center gap-1.5">
                <Mail size={11} className="text-violet-500" />
                Courriel de facturation
              </label>
              <input
                id="settings-email"
                type="email"
                value={userProfile.pago || ""}
                onChange={(e) => {
                  setUserProfile((prev: any) => ({ ...prev, pago: e.target.value }));
                  localStorage.setItem("autocompt_company_email", e.target.value);
                }}
                placeholder="Ex: info@entreprise.com"
                className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold transition-all focus:ring-2 focus:ring-violet-500/30 ${darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300"
                  }`}
              />
            </div>

          </div>{/* /.grid */}

          {/* Save CTA */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                playNotificationSound();
                // Persist all fields — already saved field-by-field above,
                // this button provides an explicit user confirmation moment.
                if (showSettingsTour) {
                  setShowSettingsTour(false);
                  localStorage.setItem("autocompt_settings_tour_shown", "true");
                }
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border bg-gradient-to-r from-emerald-600/25 to-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:from-emerald-600/35 hover:to-emerald-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_0_20px_rgba(16,185,129,0.08)]"
            >
              <CheckCircle2 size={14} />
              Sauvegarder le profil
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
              Section: Véhicules d'Entreprise (Actifs)
              Single Source of Truth → alimenté automatiquement dans
              le module Kilométrage GPS. Clé localStorage: autocompt_vehicles
          ══════════════════════════════════════════════════════════════════ */}
        <div className={`relative p-8 rounded-[32px] border overflow-hidden ${darkMode
          ? "bg-[#090D1A]/60 border-indigo-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl"
          : "bg-white border-indigo-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_30px_rgba(99,102,241,0.05)]"
          }`}>
          {/* Specular top highlight — indigo accent */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500/70 via-violet-500/40 to-transparent rounded-full pointer-events-none" />

          {/* Section heading */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800/60">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Car size={18} />
              </span>
              <span>Véhicules d&apos;Entreprise</span>
            </h2>
            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${vehicles.length > 0
              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
              : darkMode ? "bg-zinc-900 text-zinc-500 border-zinc-800" : "bg-slate-100 text-slate-400 border-slate-200"
              }`}>
              {vehicles.length} actif{vehicles.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* S.O.F.I. conseil — intégration GPS */}
          <div className={`flex items-start gap-2.5 p-3 rounded-2xl border mb-6 ${darkMode ? "bg-indigo-950/30 border-indigo-500/15" : "bg-indigo-50 border-indigo-100"
            }`}>
            <Sparkles size={12} className="text-indigo-400 mt-0.5 shrink-0" />
            <p className={`text-[9.5px] font-medium leading-snug ${darkMode ? "text-zinc-300" : "text-slate-600"}`}>
              Les véhicules enregistrés ici sont reconnus automatiquement par le module{" "}
              <strong>Kilométrage GPS</strong>. Source unique de vérité&nbsp;—&nbsp;aucune ressaisie.
            </p>
          </div>

          {/* ── Formulaire d'ajout ──────────────────────────────────────────── */}
          <div className={`p-5 rounded-2xl border mb-6 ${darkMode ? "bg-zinc-950/50 border-zinc-800" : "bg-slate-50 border-slate-200"
            }`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4 flex items-center gap-1.5 pl-1">
              <Plus size={11} />
              Enregistrer un nouveau véhicule
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Marque */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">
                  Marque
                </label>
                <input
                  id="settings-vehicle-marque"
                  type="text"
                  value={vehMarque}
                  onChange={e => setVehMarque(e.target.value)}
                  placeholder="Ex&nbsp;: Toyota"
                  className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold transition-all focus:ring-2 focus:ring-indigo-500/30 ${darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700" : "bg-white border-slate-200 text-slate-900 placeholder-slate-300"
                    }`}
                />
              </div>
              {/* Modèle */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">
                  Modèle
                </label>
                <input
                  id="settings-vehicle-modele"
                  type="text"
                  value={vehModele}
                  onChange={e => setVehModele(e.target.value)}
                  placeholder="Ex&nbsp;: RAV4"
                  className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold transition-all focus:ring-2 focus:ring-indigo-500/30 ${darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700" : "bg-white border-slate-200 text-slate-900 placeholder-slate-300"
                    }`}
                />
              </div>
              {/* Année */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">
                  Année
                </label>
                <input
                  id="settings-vehicle-annee"
                  type="text"
                  value={vehAnnee}
                  onChange={e => setVehAnnee(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Ex&nbsp;: 2021"
                  maxLength={4}
                  className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold tracking-widest transition-all focus:ring-2 focus:ring-indigo-500/30 ${darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700" : "bg-white border-slate-200 text-slate-900 placeholder-slate-300"
                    }`}
                />
              </div>
              {/* Plaque */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">
                  Plaque d&apos;immatriculation
                </label>
                <input
                  id="settings-vehicle-plaque"
                  type="text"
                  value={vehPlaque}
                  onChange={e => setVehPlaque(e.target.value.toUpperCase())}
                  placeholder="Ex&nbsp;: ABC 1234"
                  className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold tracking-widest transition-all focus:ring-2 focus:ring-indigo-500/30 ${darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700" : "bg-white border-slate-200 text-slate-900 placeholder-slate-300"
                    }`}
                />
              </div>
              {/* Odomètre initial */}
              <div className="md:col-span-2 space-y-1 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2 flex items-center gap-1.5">
                  <Gauge size={11} className="text-indigo-400" />
                  Odomètre initial (km)
                </label>
                <input
                  id="settings-vehicle-odometer"
                  type="number"
                  value={vehOdometre}
                  onChange={e => setVehOdometre(e.target.value)}
                  placeholder="Ex&nbsp;: 45 000"
                  min={0}
                  className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold transition-all focus:ring-2 focus:ring-indigo-500/30 ${darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700" : "bg-white border-slate-200 text-slate-900 placeholder-slate-300"
                    }`}
                />
              </div>
            </div>

            {/* Add CTA */}
            <div className="mt-5 flex justify-end">
              <button
                id="settings-vehicle-add"
                onClick={handleAddVehicle}
                disabled={!vehMarque.trim() || !vehModele.trim()}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border bg-gradient-to-r from-indigo-600/25 to-indigo-500/15 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 hover:from-indigo-600/35 hover:to-indigo-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_0_20px_rgba(99,102,241,0.08)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus size={12} />
                Ajouter au registre
              </button>
            </div>
          </div>

          {/* ── Liste des véhicules enregistrés ────────────────────────────── */}
          {vehicles.length === 0 ? (
            <div className={`py-10 text-center border-2 border-dashed rounded-[24px] ${darkMode ? "border-zinc-800 text-zinc-600" : "border-slate-200 text-slate-400"
              }`}>
              <Car size={28} className="mx-auto mb-2.5 opacity-20" />
              <p className="text-[9px] font-black uppercase italic tracking-widest">Aucun véhicule enregistré</p>
              <p className="text-[8px] mt-1.5 opacity-50">Remplissez le formulaire ci-dessus pour commencer.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${darkMode
                    ? "bg-zinc-900/50 border-zinc-800 hover:border-indigo-500/30"
                    : "bg-slate-50 border-slate-200 hover:border-indigo-300"
                    }`}
                >
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
                    <Car size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-black truncate ${darkMode ? "text-zinc-100" : "text-slate-900"
                      }`}>
                      {[v.annee, v.marque, v.modele].filter(Boolean).join(" ")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {v.plaque && (
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${darkMode ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-white border-slate-200 text-slate-500"
                          }`}>
                          🪪&nbsp;{v.plaque}
                        </span>
                      )}
                      {v.odometreInitial > 0 && (
                        <span className={`text-[8px] font-bold flex items-center gap-1 ${darkMode ? "text-zinc-500" : "text-slate-400"
                          }`}>
                          <Gauge size={9} />
                          {v.odometreInitial.toLocaleString("fr-CA")} km départ
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveVehicle(v.id)}
                    aria-label={`Supprimer ${v.marque} ${v.modele}`}
                    className={`p-2 rounded-xl transition-all shrink-0 ${darkMode
                      ? "text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10"
                      : "text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                      }`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Profile Config */}
        <div className={`p-8 rounded-[32px] border ${darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white shadow-xl shadow-slate-200/40 border-slate-200"}`}>
          <h2 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center space-x-2 border-b pb-4 border-slate-100 dark:border-zinc-800">
            <User size={18} className="text-emerald-500" />
            <span>Profil de l'Administrateur</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">Nom Complet</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => {
                  setAdminName(e.target.value);
                  localStorage.setItem("autocompt_admin_name", e.target.value);
                }}
                className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">Rôle / Titre</label>
              <input
                type="text"
                value={adminRole}
                onChange={(e) => {
                  setAdminRole(e.target.value);
                  localStorage.setItem("autocompt_admin_role", e.target.value);
                }}
                className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">Numéro de Téléphone</label>
              <input
                type="text"
                value={adminPhone}
                onChange={(e) => {
                  setAdminPhone(e.target.value);
                  localStorage.setItem("autocompt_admin_phone", e.target.value);
                }}
                className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">Courriel de Contact</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => {
                  setAdminEmail(e.target.value);
                  localStorage.setItem("autocompt_admin_email", e.target.value);
                }}
                className={`w-full p-4 rounded-2xl border outline-none text-xs font-semibold ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
              />
            </div>

            <div className="space-y-1 text-left md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 pl-2">URL de la Photo de Profil</label>
              <div className="flex gap-4 items-center">
                <img src={adminPhoto} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-violet-500/20 shadow-md shrink-0" />
                <input
                  type="text"
                  value={adminPhoto}
                  onChange={(e) => {
                    setAdminPhoto(e.target.value);
                    localStorage.setItem("autocompt_admin_photo", e.target.value);
                  }}
                  className={`flex-1 p-4 rounded-2xl border outline-none text-xs font-semibold ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={`p-8 rounded-[32px] border ${darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white shadow-xl shadow-slate-200/40 border-slate-200"}`}>
          <h2 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center space-x-2 border-b pb-4 border-slate-100 dark:border-zinc-800">
            <Palette size={18} className="text-indigo-500" />
            <span>Expérience Utilisateur (UX)</span>
          </h2>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-950/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${soundEnabled ? "bg-indigo-500/10 text-indigo-500" : "bg-slate-500/10 text-slate-500"}`}>
                <Bell size={20} />
              </div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-wider mb-0.5">Activer les effets sonores</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sons de clics, notifications et alertes</p>
              </div>
            </div>

            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) {
                  try {
                    // Immediate test sound when turning on
                    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                    if (AudioCtx) {
                      const audioCtx = new AudioCtx();
                      const oscillator = audioCtx.createOscillator();
                      const gainNode = audioCtx.createGain();
                      oscillator.connect(gainNode);
                      gainNode.connect(audioCtx.destination);
                      oscillator.frequency.value = 880;
                      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
                      gainNode.gain.setTargetAtTime(0, audioCtx.currentTime + 0.05, 0.015);
                      oscillator.start();
                      oscillator.stop(audioCtx.currentTime + 0.1);
                    }
                  } catch (e) { }
                }
              }}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${darkMode ? "focus:ring-offset-black" : "focus:ring-offset-white"} ${soundEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-7' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between p-4 bg-slate-50/50 dark:bg-zinc-950/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${darkMode ? "bg-amber-500/10 text-amber-500" : "bg-slate-500/10 text-slate-500"}`}>
                {darkMode ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-wider mb-0.5">Mode Sombre</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inverser les couleurs de l'interface</p>
              </div>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${darkMode ? "focus:ring-offset-black bg-emerald-500" : "focus:ring-offset-white bg-slate-300"}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsView;
