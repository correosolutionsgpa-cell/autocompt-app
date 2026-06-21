/**
 * TeamAndCloudSettings.tsx
 *
 * Central hub for:
 *   A — Mon Profil / Mon Entreprise (identity + logo)
 *   B — Connexion Cloud (Google Drive · OneDrive · Dropbox)
 *   C — Gestion de l'Équipe (frictionless collaborator invites)
 *
 * Styling: dark midnight-blue glassmorphism matching the AutoCompt aesthetic.
 * Language: professional Quebec French throughout.
 */

import React, { useRef, useState } from "react";
import {
  Camera, Building2, Hash, HardHat,
  Cloud, Info, Mail, ChevronDown,
  Send, Users, Shield, CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── SVG brand icons (inline — no external dep needed) ───────────────────────

const GoogleDriveIcon = () => (
  <svg viewBox="0 0 87.3 78" className="w-4 h-4 shrink-0" aria-hidden>
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 52H0a7.3 7.3 0 003.3 6.5z" fill="#0066da" />
    <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L.95 45.5A7.3 7.3 0 000 52h27.5z" fill="#00ac47" />
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.35 58a7.3 7.3 0 000-6.5H59l5.85 12.35z" fill="#ea4335" />
    <path d="M43.65 25L57.4 0H29.9z" fill="#00832d" />
    <path d="M59 52H27.5l-13.75 24.8c1.35.8 2.9 1.2 4.5 1.2h50.8a7.6 7.6 0 004.5-1.2z" fill="#2684fc" />
    <path d="M73.4 26L59.65 3.3A7.27 7.27 0 0056.35 0H43.65L59 52h27.35a7.3 7.3 0 00-.95-6.5z" fill="#ffba00" />
  </svg>
);

const OneDriveIcon = () => (
  <svg viewBox="0 0 32 32" className="w-4 h-4 shrink-0" aria-hidden>
    <path d="M19.09 13.21a8 8 0 00-15.09 3.79A6 6 0 006 29h13.09z" fill="#0364b8" />
    <path d="M20.09 14.21a9 9 0 00-1 .06l-.06-.06A9 9 0 004 17A6 6 0 006 29h7.09z" fill="#0078d4" />
    <path d="M26.09 13.21A7.09 7.09 0 0019 20a6.91 6.91 0 00.09 1H26a5 5 0 000-10z" fill="#1490df" />
    <path d="M19.09 21H6A6 6 0 006 29h20a5 5 0 005-5 5 5 0 00-5-5H19.09a6.91 6.91 0 01-.09-1z" fill="#28a8e8" />
  </svg>
);

const DropboxIcon = () => (
  <svg viewBox="0 0 32 32" className="w-4 h-4 shrink-0" aria-hidden>
    <path d="M10 2L1 7.5l9 5.5-9 5.5 9 5.5 9-5.5-9-5.5 9-5.5L10 2zm12 0l-9 5.5 9 5.5 9-5.5L22 2zM1 23.5L10 29l9-5.5-9-5.5-9 5.5zm21 0L13 29l9-5.5 9 5.5-9-5.5z" fill="#0061ff" />
  </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface TeamAndCloudSettingsProps {
  darkMode?: boolean;
}

// ─── Role options ─────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "partenaire",  label: "Partenaire / Conjoint(e) (Accès complet)" },
  { value: "comptable",   label: "Comptable (Lecture seule & Extraction)"    },
  { value: "client",      label: "Client / Propriétaire (Rendement du bâtiment)" },
];

// ─── Cloud provider config ────────────────────────────────────────────────────

const CLOUD_PROVIDERS = [
  { id: "gdrive",   label: "Connecter Google Drive",        Icon: GoogleDriveIcon, gradient: "from-blue-600 to-green-500" },
  { id: "onedrive", label: "Connecter Microsoft OneDrive",  Icon: OneDriveIcon,    gradient: "from-blue-500 to-sky-400"   },
  { id: "dropbox",  label: "Connecter Dropbox",             Icon: DropboxIcon,     gradient: "from-blue-700 to-blue-500"  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function TeamAndCloudSettings({ darkMode = true }: TeamAndCloudSettingsProps) {
  const D = darkMode;

  // Section A state
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [neq, setNeq]                 = useState("");
  const [rbqLicence, setRbqLicence]   = useState("");
  const avatarInputRef                = useRef<HTMLInputElement>(null);

  // Section B state
  const [connectedCloud, setConnectedCloud] = useState<string | null>(null);
  const [showCloudInfo, setShowCloudInfo]   = useState(false);

  // Section C state
  const [inviteEmail, setInviteEmail]   = useState("");
  const [inviteRole, setInviteRole]     = useState(ROLE_OPTIONS[0].value);
  const [inviteSent, setInviteSent]     = useState(false);
  const [inviteError, setInviteError]   = useState("");

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
  };

  const handleCloudConnect = (id: string) => {
    // Placeholder — integrate real OAuth per provider
    setConnectedCloud(prev => prev === id ? null : id);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteError("Veuillez saisir une adresse courriel valide.");
      return;
    }
    // Placeholder — wire to real invite logic
    setInviteSent(true);
    setTimeout(() => {
      setInviteSent(false);
      setInviteEmail("");
      setInviteRole(ROLE_OPTIONS[0].value);
    }, 3500);
  };

  // ── Shared style helpers ─────────────────────────────────────────────────────

  const card = D
    ? "bg-[#0b1121]/80 border border-emerald-500/10 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.06)]"
    : "bg-white/90 border border-slate-200 backdrop-blur-xl shadow-sm";

  const sectionLabel = `text-[9px] font-black uppercase tracking-[0.18em] ${D ? "text-emerald-400/70" : "text-emerald-600/80"}`;

  const sectionHeading = `text-[15px] font-black ${D ? "text-white" : "text-slate-800"}`;

  const inputBase = `w-full rounded-xl px-4 py-3 text-[12px] font-semibold outline-none transition-all placeholder:font-normal ${
    D
      ? "bg-white/5 border border-white/8 text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:bg-emerald-500/5 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
      : "bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.10)]"
  }`;

  const divider = `border-t ${D ? "border-white/5" : "border-slate-100"}`;

  return (
    <div className={`min-h-screen ${D ? "bg-[#060c1a]" : "bg-slate-50"} p-4 sm:p-8`}>
      <div className="max-w-2xl mx-auto space-y-5">

        {/* ── Page header ────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Shield size={16} className="text-emerald-400" />
            </div>
            <p className={sectionLabel}>Paramètres & Équipe</p>
          </div>
          <h1 className={`text-[22px] font-black leading-tight ${D ? "text-white" : "text-slate-900"}`}>
            Identité, Nuage & Collaborateurs
          </h1>
          <p className={`text-[11px] mt-1 ${D ? "text-zinc-500" : "text-slate-500"}`}>
            Configurez votre profil, votre coffre-fort numérique et invitez vos partenaires en quelques secondes.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION A — Mon Profil / Mon Entreprise
        ══════════════════════════════════════════════════════════════════════ */}
        <div className={`rounded-2xl ${card} overflow-hidden`}>

          {/* Card header */}
          <div className={`px-6 py-4 border-b ${D ? "border-white/5" : "border-slate-100"} flex items-center gap-3`}>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Building2 size={14} className="text-blue-400" />
            </div>
            <div>
              <p className={sectionLabel}>Section A</p>
              <p className={sectionHeading}>Mon Profil / Mon Entreprise</p>
            </div>
          </div>

          <div className="px-6 py-6 space-y-5">
            {/* Avatar / logo upload */}
            <div className="flex items-center gap-5">
              <button
                onClick={() => avatarInputRef.current?.click()}
                className={`relative w-20 h-20 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all group flex-shrink-0 ${
                  D
                    ? "border-white/15 bg-white/4 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                    : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/40"
                }`}
                aria-label="Téléverser un logo ou une photo"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  <>
                    <Camera size={18} className={`${D ? "text-zinc-500 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-500"} transition-colors`} />
                    <span className={`text-[8px] font-bold uppercase tracking-wider text-center leading-tight ${D ? "text-zinc-600 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-500"} transition-colors`}>
                      Logo
                    </span>
                  </>
                )}
                {/* Glow overlay on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                aria-label="Fichier logo entreprise"
              />
              <div className="flex-1 space-y-1">
                <p className={`text-[12px] font-bold ${D ? "text-white" : "text-slate-700"}`}>
                  Logo ou photo de profil
                </p>
                <p className={`text-[10px] ${D ? "text-zinc-500" : "text-slate-500"} leading-relaxed`}>
                  Apparaît sur vos factures, contrats et rapports fiscaux.
                  <br />
                  Formats acceptés&nbsp;: JPG, PNG, WebP — max 2&nbsp;Mo.
                </p>
              </div>
            </div>

            <div className={divider} />

            {/* Primary name input */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold ${D ? "text-zinc-400" : "text-slate-500"}`}>
                Nom complet ou Nom de l'entreprise <span className="text-rose-400">*</span>
              </label>
              <input
                id="tcs-company-name"
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Ex&nbsp;: Immobilier Tremblay inc."
                className={inputBase}
                autoComplete="organization"
              />
            </div>

            {/* Secondary optional inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={`flex items-center gap-1.5 text-[10px] font-bold ${D ? "text-zinc-400" : "text-slate-500"}`}>
                  <Hash size={10} className={D ? "text-zinc-500" : "text-slate-400"} />
                  NEQ (Numéro d'entreprise du Québec)
                  <span className={`ml-auto text-[8px] font-normal ${D ? "text-zinc-600" : "text-slate-400"}`}>Optionnel</span>
                </label>
                <input
                  id="tcs-neq"
                  type="text"
                  value={neq}
                  onChange={e => setNeq(e.target.value)}
                  placeholder="Ex&nbsp;: 1234567890"
                  className={inputBase}
                  maxLength={10}
                  pattern="\d{10}"
                />
              </div>
              <div className="space-y-1.5">
                <label className={`flex items-center gap-1.5 text-[10px] font-bold ${D ? "text-zinc-400" : "text-slate-500"}`}>
                  <HardHat size={10} className={D ? "text-zinc-500" : "text-slate-400"} />
                  Numéro de licence RBQ
                  <span className={`ml-auto text-[8px] font-normal ${D ? "text-zinc-600" : "text-slate-400"}`}>Optionnel</span>
                </label>
                <input
                  id="tcs-rbq"
                  type="text"
                  value={rbqLicence}
                  onChange={e => setRbqLicence(e.target.value)}
                  placeholder="Ex&nbsp;: 5637-1234-01"
                  className={inputBase}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION B — Connexion Cloud
        ══════════════════════════════════════════════════════════════════════ */}
        <div className={`rounded-2xl ${card} overflow-hidden`}>

          {/* Card header */}
          <div className={`px-6 py-4 border-b ${D ? "border-white/5" : "border-slate-100"} flex items-center gap-3`}>
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <Cloud size={14} className="text-violet-400" />
            </div>
            <div className="flex-1">
              <p className={sectionLabel}>Section B</p>
              <p className={sectionHeading}>Connexion Cloud</p>
            </div>
          </div>

          <div className="px-6 py-6 space-y-5">
            {/* Subtitle */}
            <div className="flex items-start justify-between gap-3">
              <p className={`text-[11px] font-semibold ${D ? "text-zinc-400" : "text-slate-600"} leading-relaxed`}>
                Sélectionnez votre coffre-fort numérique
              </p>
              {/* Info toggle */}
              <button
                onClick={() => setShowCloudInfo(v => !v)}
                className={`shrink-0 p-1.5 rounded-lg transition-all ${
                  showCloudInfo
                    ? "bg-emerald-500/15 text-emerald-400"
                    : D
                    ? "text-zinc-600 hover:text-zinc-400 hover:bg-white/5"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                }`}
                aria-label="Afficher l'information sur la sécurité cloud"
              >
                <Info size={14} />
              </button>
            </div>

            {/* Security info banner */}
            {showCloudInfo && (
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                D
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-emerald-50 border-emerald-200"
              }`}>
                <Shield size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className={`text-[10px] leading-relaxed ${D ? "text-emerald-300/80" : "text-emerald-700"}`}>
                  Vos fichiers fiscaux restent 100&nbsp;% sécurisés dans votre propre nuage. AutoCompt agit comme un pont intelligent sans jamais séquestrer vos données.
                </p>
              </div>
            )}

            {/* Cloud provider buttons */}
            <div className="space-y-3">
              {CLOUD_PROVIDERS.map(({ id, label, Icon }) => {
                const connected = connectedCloud === id;
                return (
                  <button
                    key={id}
                    id={`tcs-cloud-${id}`}
                    onClick={() => handleCloudConnect(id)}
                    className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-xl border transition-all active:scale-[0.985] text-left ${
                      connected
                        ? D
                          ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-300"
                          : "bg-emerald-50 border-emerald-300 text-emerald-700"
                        : D
                        ? "bg-white/4 border-white/8 text-zinc-300 hover:bg-white/7 hover:border-white/15"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                    } shadow-sm`}
                    aria-pressed={connected}
                  >
                    <Icon />
                    <span className="flex-1 text-[11px] font-bold">{label}</span>
                    {connected && (
                      <span className={`flex items-center gap-1 text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        D ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      }`}>
                        <CheckCircle2 size={8} />
                        Connecté
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION C — Gestion de l'Équipe
        ══════════════════════════════════════════════════════════════════════ */}
        <div className={`rounded-2xl ${card} overflow-hidden`}>

          {/* Card header */}
          <div className={`px-6 py-4 border-b ${D ? "border-white/5" : "border-slate-100"} flex items-center gap-3`}>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Users size={14} className="text-amber-400" />
            </div>
            <div>
              <p className={sectionLabel}>Section C</p>
              <p className={sectionHeading}>Gestion de l'Équipe</p>
            </div>
          </div>

          <div className="px-6 py-6">
            <form onSubmit={handleInvite} className="space-y-4" noValidate>
              {/* Email input */}
              <div className="space-y-1.5">
                <label htmlFor="tcs-invite-email" className={`text-[10px] font-bold ${D ? "text-zinc-400" : "text-slate-500"}`}>
                  Adresse courriel du collaborateur
                </label>
                <div className="relative">
                  <Mail size={13} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${D ? "text-zinc-600" : "text-slate-400"} pointer-events-none`} />
                  <input
                    id="tcs-invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={e => { setInviteEmail(e.target.value); setInviteError(""); }}
                    placeholder="Courriel du collaborateur"
                    className={`${inputBase} pl-9`}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Role selector */}
              <div className="space-y-1.5">
                <label htmlFor="tcs-invite-role" className={`text-[10px] font-bold ${D ? "text-zinc-400" : "text-slate-500"}`}>
                  Rôle attribué
                </label>
                <div className="relative">
                  <select
                    id="tcs-invite-role"
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className={`${inputBase} appearance-none pr-9 cursor-pointer`}
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className={`absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${D ? "text-zinc-500" : "text-slate-400"}`} />
                </div>
              </div>

              {/* Validation error */}
              {inviteError && (
                <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${
                  D ? "bg-rose-500/8 border-rose-500/25" : "bg-rose-50 border-rose-200"
                }`}>
                  <AlertCircle size={12} className="text-rose-400 shrink-0" />
                  <p className="text-[10px] font-semibold text-rose-400">{inviteError}</p>
                </div>
              )}

              {/* Success state */}
              {inviteSent && (
                <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${
                  D ? "bg-emerald-500/8 border-emerald-500/25" : "bg-emerald-50 border-emerald-200"
                }`}>
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  <p className="text-[10px] font-semibold text-emerald-400">
                    Invitation envoyée avec succès&nbsp;!
                  </p>
                </div>
              )}

              {/* CTA button */}
              <button
                id="tcs-send-invite"
                type="submit"
                disabled={inviteSent}
                className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-[0.98] ${
                  inviteSent
                    ? D
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 cursor-default"
                      : "bg-emerald-50 border border-emerald-300 text-emerald-600 cursor-default"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-[0_4px_20px_rgba(16,185,129,0.30)] hover:shadow-[0_4px_28px_rgba(16,185,129,0.45)]"
                }`}
              >
                <Send size={13} />
                Envoyer l'invitation
              </button>

              {/* Micro-copy */}
              <p className={`text-[9.5px] text-center leading-relaxed ${D ? "text-zinc-600" : "text-slate-400"}`}>
                Le collaborateur recevra un lien sécurisé pour créer son propre mot de passe et configurer ses accès.
              </p>
            </form>
          </div>
        </div>

        {/* Footer spacer */}
        <div className="h-4" />
      </div>
    </div>
  );
}
