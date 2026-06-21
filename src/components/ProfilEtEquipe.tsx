/**
 * ProfilEtEquipe.tsx
 *
 * Central settings hub for AutoCompt:
 *   A — Mon Profil / Mon Entreprise
 *   B — Connexion Cloud (Storage Sovereignty)
 *   C — Gestion de l'Équipe (invites + active members)
 *
 * Style: midnight-blue glassmorphism · emerald accents · Tailwind CSS
 * Language: professional Quebec French throughout
 */

import React, { useRef, useState } from "react";
import {
  Camera, Building2, Hash, HardHat,
  Cloud, Info, Mail, ChevronDown,
  Send, Users, Shield, CheckCircle2,
  AlertCircle, UserX, Crown, BookOpen, BarChart3,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ─── Inline SVG brand icons ───────────────────────────────────────────────────

const GoogleDriveIcon = () => (
  <svg viewBox="0 0 87.3 78" className="w-[18px] h-[18px] shrink-0" aria-hidden>
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 52H0a7.3 7.3 0 003.3 6.5z" fill="#0066da"/>
    <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L.95 45.5A7.3 7.3 0 000 52h27.5z" fill="#00ac47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.35 58a7.3 7.3 0 000-6.5H59l5.85 12.35z" fill="#ea4335"/>
    <path d="M43.65 25L57.4 0H29.9z" fill="#00832d"/>
    <path d="M59 52H27.5l-13.75 24.8c1.35.8 2.9 1.2 4.5 1.2h50.8a7.6 7.6 0 004.5-1.2z" fill="#2684fc"/>
    <path d="M73.4 26L59.65 3.3A7.27 7.27 0 0056.35 0H43.65L59 52h27.35a7.3 7.3 0 00-.95-6.5z" fill="#ffba00"/>
  </svg>
);

const OneDriveIcon = () => (
  <svg viewBox="0 0 32 32" className="w-[18px] h-[18px] shrink-0" aria-hidden>
    <path d="M19.09 13.21a8 8 0 00-15.09 3.79A6 6 0 006 29h13.09z" fill="#0364b8"/>
    <path d="M20.09 14.21a9 9 0 00-1 .06l-.06-.06A9 9 0 004 17A6 6 0 006 29h7.09z" fill="#0078d4"/>
    <path d="M26.09 13.21A7.09 7.09 0 0019 20a6.91 6.91 0 00.09 1H26a5 5 0 000-10z" fill="#1490df"/>
    <path d="M19.09 21H6A6 6 0 006 29h20a5 5 0 005-5 5 5 0 00-5-5H19.09a6.91 6.91 0 01-.09-1z" fill="#28a8e8"/>
  </svg>
);

const DropboxIcon = () => (
  <svg viewBox="0 0 32 32" className="w-[18px] h-[18px] shrink-0" aria-hidden>
    <path d="M10 2L1 7.5l9 5.5-9 5.5 9 5.5 9-5.5-9-5.5 9-5.5L10 2zm12 0l-9 5.5 9 5.5 9-5.5L22 2zM1 23.5L10 29l9-5.5-9-5.5-9 5.5zm21 0L13 29l9-5.5 9 5.5-9-5.5z" fill="#0061ff"/>
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveMember {
  id: string;
  email: string;
  role: string;
  roleKey: string;
  initials: string;
  joinedAt: string;
}

interface ProfilEtEquipeProps {
  darkMode?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "partenaire", label: "Partenaire / Conjoint(e) (Accès complet)",          Icon: Crown,     color: "text-amber-400"   },
  { value: "comptable",  label: "Comptable (Lecture seule & Extraction)",             Icon: BookOpen,  color: "text-blue-400"    },
  { value: "client",     label: "Client / Propriétaire (Rendement du bâtiment)",      Icon: BarChart3, color: "text-violet-400"  },
];

const CLOUD_PROVIDERS = [
  { id: "gdrive",   label: "Connecter Google Drive",       Icon: GoogleDriveIcon, hoverGlow: "hover:shadow-[0_0_20px_rgba(66,133,244,0.20)]"  },
  { id: "onedrive", label: "Connecter Microsoft OneDrive", Icon: OneDriveIcon,    hoverGlow: "hover:shadow-[0_0_20px_rgba(0,120,212,0.20)]"   },
  { id: "dropbox",  label: "Connecter Dropbox",            Icon: DropboxIcon,     hoverGlow: "hover:shadow-[0_0_20px_rgba(0,97,255,0.20)]"    },
];

const DUMMY_MEMBERS: ActiveMember[] = [
  { id: "m1", email: "marie.tremblay@example.com", role: "Comptable (Lecture seule & Extraction)",        roleKey: "comptable",  initials: "MT", joinedAt: "12 juin 2026"   },
  { id: "m2", email: "jean.lapointe@gmail.com",    role: "Partenaire / Conjoint(e) (Accès complet)",      roleKey: "partenaire", initials: "JL", joinedAt: "3 juin 2026"    },
];

const ROLE_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  partenaire: Crown,
  comptable:  BookOpen,
  client:     BarChart3,
};

const ROLE_COLORS: Record<string, string> = {
  partenaire: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  comptable:  "text-blue-400  bg-blue-400/10  border-blue-400/20",
  client:     "text-violet-400 bg-violet-400/10 border-violet-400/20",
};

const INITIALS_PALETTES = [
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfilEtEquipe({ darkMode = true }: ProfilEtEquipeProps) {
  const D = darkMode;

  // Section A
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [neq, setNeq]                 = useState("");
  const [rbq, setRbq]                 = useState("");
  const fileRef                       = useRef<HTMLInputElement>(null);

  // Section B
  const [connectedCloud, setConnectedCloud] = useState<string | null>(null);
  const [showInfo, setShowInfo]             = useState(false);

  // Section C
  const [email, setEmail]           = useState("");
  const [role, setRole]             = useState(ROLE_OPTIONS[0].value);
  const [members, setMembers]       = useState<ActiveMember[]>(DUMMY_MEMBERS);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteErr, setInviteErr]   = useState("");
  const [revoking, setRevoking]     = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setAvatarUrl(URL.createObjectURL(f));
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteErr("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteErr("Veuillez saisir une adresse courriel valide.");
      return;
    }
    const roleObj = ROLE_OPTIONS.find(r => r.value === role)!;
    const initials = email.slice(0, 2).toUpperCase();
    const newMember: ActiveMember = {
      id:       `m${Date.now()}`,
      email:    email.trim(),
      role:     roleObj.label,
      roleKey:  roleObj.value,
      initials,
      joinedAt: new Date().toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" }),
    };
    setInviteSent(true);
    setTimeout(() => {
      setMembers(prev => [newMember, ...prev]);
      setInviteSent(false);
      setEmail("");
      setRole(ROLE_OPTIONS[0].value);
    }, 1800);
  };

  const handleRevoke = (id: string) => {
    setRevoking(id);
    setTimeout(() => {
      setMembers(prev => prev.filter(m => m.id !== id));
      setRevoking(null);
    }, 900);
  };

  // ── Style helpers ──────────────────────────────────────────────────────────

  const glass = D
    ? "bg-slate-900/70 border border-white/[0.07] backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
    : "bg-white/80 border border-slate-200 backdrop-blur-xl shadow-md";

  const cardHeader = D
    ? "border-b border-white/[0.06] bg-slate-900/40"
    : "border-b border-slate-100 bg-slate-50/60";

  const label = `text-[9.5px] font-black uppercase tracking-[0.16em] ${D ? "text-emerald-400/60" : "text-emerald-600/70"}`;

  const heading = `text-[15px] font-black ${D ? "text-white" : "text-slate-800"}`;

  const inputCls = `w-full rounded-xl px-4 py-3 text-[12px] font-semibold outline-none transition-all
    placeholder:font-normal
    ${D
      ? "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:bg-emerald-500/[0.04] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
      : "bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.10)]"}`;

  const divider = `border-t ${D ? "border-white/[0.06]" : "border-slate-100"}`;

  return (
    <div className={`min-h-screen ${D ? "bg-[#070d1e]" : "bg-slate-50"} p-4 sm:p-8`}>
      <div className="max-w-[680px] mx-auto space-y-6">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Sparkles size={14} className="text-emerald-400" />
            </div>
            <p className={label}>Paramètres du Compte</p>
          </div>
          <h1 className={`text-[24px] font-black tracking-tight ${D ? "text-white" : "text-slate-900"}`}>
            Profil & Équipe
          </h1>
          <p className={`text-[11px] mt-1 leading-relaxed ${D ? "text-slate-500" : "text-slate-500"}`}>
            Gérez votre identité professionnelle, votre stockage cloud souverain et vos collaborateurs.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            A — Mon Profil / Mon Entreprise
        ══════════════════════════════════════════════════════════════════ */}
        <div className={`rounded-2xl overflow-hidden ${glass}`}>

          <div className={`px-6 py-4 ${cardHeader} flex items-center gap-3`}>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0">
              <Building2 size={14} className="text-blue-400" />
            </div>
            <div>
              <p className={label}>Section A</p>
              <p className={heading}>Mon Profil / Mon Entreprise</p>
            </div>
          </div>

          <div className="px-6 py-6 space-y-5">

            {/* Avatar row */}
            <div className="flex items-center gap-5">
              <button
                onClick={() => fileRef.current?.click()}
                aria-label="Téléverser un logo ou une photo"
                className={`relative w-[78px] h-[78px] rounded-full border-2 border-dashed flex-shrink-0
                  flex flex-col items-center justify-center gap-1 transition-all group
                  ${D
                    ? "border-white/15 bg-white/[0.03] hover:border-emerald-500/50 hover:bg-emerald-500/[0.04]"
                    : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50"}`}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Logo" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <>
                    <Camera size={17} className={`transition-colors ${D ? "text-slate-600 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-500"}`} />
                    <span className={`text-[7.5px] font-black uppercase tracking-wider text-center ${D ? "text-slate-600 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-500"} transition-colors`}>
                      Logo
                    </span>
                  </>
                )}
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />

              <div>
                <p className={`text-[12px] font-bold ${D ? "text-white" : "text-slate-700"}`}>Logo ou photo de profil</p>
                <p className={`text-[10px] mt-0.5 leading-relaxed ${D ? "text-slate-500" : "text-slate-500"}`}>
                  Apparaît sur vos factures, contrats et rapports.
                  <br />JPG, PNG ou WebP · max&nbsp;2&nbsp;Mo.
                </p>
                {avatarUrl && (
                  <button onClick={() => setAvatarUrl(null)} className={`mt-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${D ? "text-rose-400/70 hover:text-rose-400" : "text-rose-400 hover:text-rose-600"}`}>
                    Supprimer
                  </button>
                )}
              </div>
            </div>

            <div className={divider} />

            {/* Primary name */}
            <div className="space-y-1.5">
              <label htmlFor="pe-name" className={`text-[10px] font-bold ${D ? "text-slate-400" : "text-slate-500"}`}>
                Nom complet ou Nom légal de l'entreprise <span className="text-rose-400">*</span>
              </label>
              <input
                id="pe-name"
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Ex : Immobilier Tremblay inc."
                className={inputCls}
                autoComplete="organization"
              />
            </div>

            {/* Secondary optional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="pe-neq" className={`flex items-center gap-1.5 text-[10px] font-bold ${D ? "text-slate-400" : "text-slate-500"}`}>
                  <Hash size={9} />
                  NEQ (Numéro d'entreprise du Québec)
                  <span className={`ml-auto text-[8px] font-normal ${D ? "text-slate-600" : "text-slate-400"}`}>Optionnel</span>
                </label>
                <input id="pe-neq" type="text" value={neq} onChange={e => setNeq(e.target.value)} placeholder="Ex : 1234567890" maxLength={10} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="pe-rbq" className={`flex items-center gap-1.5 text-[10px] font-bold ${D ? "text-slate-400" : "text-slate-500"}`}>
                  <HardHat size={9} />
                  Numéro de licence RBQ
                  <span className={`ml-auto text-[8px] font-normal ${D ? "text-slate-600" : "text-slate-400"}`}>Optionnel</span>
                </label>
                <input id="pe-rbq" type="text" value={rbq} onChange={e => setRbq(e.target.value)} placeholder="Ex : 5637-1234-01" className={inputCls} />
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end pt-1">
              <button className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-[0_4px_16px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_24px_rgba(16,185,129,0.40)] transition-all active:scale-95">
                Enregistrer le profil
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            B — Connexion Cloud
        ══════════════════════════════════════════════════════════════════ */}
        <div className={`rounded-2xl overflow-hidden ${glass}`}>

          <div className={`px-6 py-4 ${cardHeader} flex items-center gap-3`}>
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 shrink-0">
              <Cloud size={14} className="text-violet-400" />
            </div>
            <div className="flex-1">
              <p className={label}>Section B</p>
              <p className={heading}>Connexion Cloud</p>
            </div>
            <button
              onClick={() => setShowInfo(v => !v)}
              aria-label="Afficher les informations de sécurité"
              className={`p-1.5 rounded-lg transition-all ${showInfo ? "bg-emerald-500/15 text-emerald-400" : D ? "text-slate-600 hover:text-slate-400 hover:bg-white/5" : "text-slate-400 hover:bg-slate-100"}`}
            >
              <Info size={14} />
            </button>
          </div>

          <div className="px-6 py-6 space-y-4">
            <p className={`text-[11px] font-semibold ${D ? "text-slate-400" : "text-slate-600"}`}>
              Sélectionnez votre coffre-fort numérique
            </p>

            {/* Security info banner */}
            <AnimatePresence>
              {showInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className={`flex items-start gap-3 p-4 rounded-xl border ${D ? "bg-emerald-500/[0.06] border-emerald-500/20" : "bg-emerald-50 border-emerald-200"}`}>
                    <Shield size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                    <p className={`text-[10px] leading-relaxed ${D ? "text-emerald-300/80" : "text-emerald-700"}`}>
                      Vos fichiers fiscaux restent 100&nbsp;% sécurisés dans votre propre nuage. AutoCompt agit comme un pont intelligent sans jamais séquestrer vos données.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Provider buttons */}
            <div className="space-y-3">
              {CLOUD_PROVIDERS.map(({ id, label: provLabel, Icon, hoverGlow }) => {
                const active = connectedCloud === id;
                return (
                  <button
                    key={id}
                    id={`pe-cloud-${id}`}
                    onClick={() => setConnectedCloud(prev => prev === id ? null : id)}
                    aria-pressed={active}
                    className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-xl border transition-all active:scale-[0.985] text-left ${hoverGlow}
                      ${active
                        ? D
                          ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-300"
                          : "bg-emerald-50 border-emerald-300 text-emerald-700"
                        : D
                        ? "bg-white/[0.03] border-white/[0.08] text-slate-300 hover:bg-white/[0.06] hover:border-white/[0.15]"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <Icon />
                    <span className="flex-1 text-[11px] font-bold">{provLabel}</span>
                    {active && (
                      <span className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${D ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"}`}>
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

        {/* ══════════════════════════════════════════════════════════════════
            C — Gestion de l'Équipe
        ══════════════════════════════════════════════════════════════════ */}
        <div className={`rounded-2xl overflow-hidden ${glass}`}>

          <div className={`px-6 py-4 ${cardHeader} flex items-center gap-3`}>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
              <Users size={14} className="text-amber-400" />
            </div>
            <div>
              <p className={label}>Section C</p>
              <p className={heading}>Gestion de l'Équipe</p>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">

            {/* ── Invite form ───────────────────────────────────────────── */}
            <form onSubmit={handleInvite} noValidate className="space-y-4">

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="pe-invite-email" className={`text-[10px] font-bold ${D ? "text-slate-400" : "text-slate-500"}`}>
                  Adresse courriel du collaborateur
                </label>
                <div className="relative">
                  <Mail size={12} className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${D ? "text-slate-600" : "text-slate-400"}`} />
                  <input
                    id="pe-invite-email"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setInviteErr(""); }}
                    placeholder="Courriel du collaborateur"
                    className={`${inputCls} pl-9`}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label htmlFor="pe-invite-role" className={`text-[10px] font-bold ${D ? "text-slate-400" : "text-slate-500"}`}>
                  Rôle attribué
                </label>
                <div className="relative">
                  <select
                    id="pe-invite-role"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className={`${inputCls} appearance-none pr-9 cursor-pointer`}
                  >
                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={12} className={`absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${D ? "text-slate-500" : "text-slate-400"}`} />
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {inviteErr && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${D ? "bg-rose-500/[0.08] border-rose-500/25" : "bg-rose-50 border-rose-200"}`}>
                    <AlertCircle size={12} className="text-rose-400 shrink-0" />
                    <p className="text-[10px] font-semibold text-rose-400">{inviteErr}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success */}
              <AnimatePresence>
                {inviteSent && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${D ? "bg-emerald-500/[0.08] border-emerald-500/25" : "bg-emerald-50 border-emerald-200"}`}>
                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    <p className="text-[10px] font-semibold text-emerald-400">Invitation envoyée avec succès&nbsp;!</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CTA */}
              <button
                id="pe-send-invite"
                type="submit"
                disabled={inviteSent}
                className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-[0.98]
                  ${inviteSent
                    ? D ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400/60 cursor-default" : "bg-emerald-50 border border-emerald-200 text-emerald-400 cursor-default"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-[0_4px_20px_rgba(16,185,129,0.28)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.42)]"}`}
              >
                <Send size={13} />
                Envoyer l'invitation
              </button>

              {/* Micro-copy */}
              <p className={`text-center text-[9.5px] leading-relaxed ${D ? "text-slate-600" : "text-slate-400"}`}>
                Le collaborateur recevra un lien sécurisé pour créer son propre mot de passe et configurer ses accès.
              </p>
            </form>

            {/* ── Active Members ────────────────────────────────────────── */}
            {members.length > 0 && (
              <>
                <div className={divider} />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${D ? "text-slate-500" : "text-slate-400"}`}>
                      Membres Actifs
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black border ${D ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                      {members.length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <AnimatePresence>
                      {members.map((m, idx) => {
                        const RoleIcon = ROLE_ICONS[m.roleKey] ?? Users;
                        const roleColorCls = ROLE_COLORS[m.roleKey] ?? "text-slate-400 bg-slate-400/10 border-slate-400/20";
                        const avatarGrad = INITIALS_PALETTES[idx % INITIALS_PALETTES.length];
                        const isRevoking = revoking === m.id;

                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: isRevoking ? 0.4 : 1, x: 0 }}
                            exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0, padding: 0 }}
                            transition={{ duration: 0.25 }}
                            className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-colors ${D ? "bg-white/[0.025] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}
                          >
                            {/* Initials avatar */}
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center shrink-0`}>
                              <span className="text-[11px] font-black text-white">{m.initials}</span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-bold truncate ${D ? "text-white" : "text-slate-800"}`}>{m.email}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider ${roleColorCls}`}>
                                  <RoleIcon size={7} />
                                  {m.roleKey === "partenaire" ? "Partenaire" : m.roleKey === "comptable" ? "Comptable" : "Client"}
                                </span>
                                <span className={`text-[8.5px] ${D ? "text-slate-600" : "text-slate-400"}`}>
                                  · depuis le {m.joinedAt}
                                </span>
                              </div>
                            </div>

                            {/* Revoke button */}
                            <button
                              onClick={() => handleRevoke(m.id)}
                              disabled={isRevoking}
                              aria-label={`Révoquer l'accès de ${m.email}`}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all active:scale-95
                                ${D
                                  ? "border-rose-500/25 text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/40"
                                  : "border-rose-200 text-rose-400 hover:bg-rose-50 hover:border-rose-300"}`}
                            >
                              <UserX size={10} />
                              {isRevoking ? "..." : "Révoquer"}
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </>
            )}

            {members.length === 0 && (
              <div className={`flex flex-col items-center gap-2 py-6 rounded-xl border border-dashed ${D ? "border-white/10" : "border-slate-200"}`}>
                <Users size={24} className={D ? "text-slate-700" : "text-slate-300"} />
                <p className={`text-[10px] font-semibold ${D ? "text-slate-600" : "text-slate-400"}`}>
                  Aucun membre actif pour l'instant.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
