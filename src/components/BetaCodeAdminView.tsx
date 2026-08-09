/**
 * BetaCodeAdminView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Écran délégué, à portée volontairement très étroite : génère des codes
 * bêta pour créer des comptes de test, rien d'autre. Conçu pour être donné
 * à un testeur externe SANS lui donner accès au Panneau d'Administration
 * complet (facturation, utilisateurs, DocuLegal, code source...).
 *
 * L'accès à cet écran est accordé par SuperAdmin, par compte, dans
 * SuperAdminPanel → Utilisateurs (`canGenerateBetaCodes` sur le doc Firestore
 * `users/{uid}` de la personne). Jamais self-service.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Ticket, Loader2, LogOut, ShieldAlert,
  CheckCircle2, Clock, Copy, Check, Mail,
} from 'lucide-react';
import { dataService, type BetaCodeDoc } from '../lib/dataService';
import { auth } from '../lib/firebase';

export interface BetaCodeAdminViewProps {
  darkMode: boolean;
  onBack: () => void;
  onLogout: () => void;
}

export default function BetaCodeAdminView({ darkMode, onBack, onLogout }: BetaCodeAdminViewProps) {
  const D = darkMode;
  const [email, setEmail] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codes, setCodes] = useState<BetaCodeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [sentFeedback, setSentFeedback] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    dataService.fetchBetaCodes()
      .then((c) => setCodes(c.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))))
      .catch(() => setError("Impossible de charger la liste des codes."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleGenerate = async () => {
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Entrez une adresse courriel valide.');
      return;
    }
    setGenerating(true);
    try {
      const code = await dataService.generateBetaCode(email.trim(), 30);
      setLastCode(code);
      setEmail('');
      load();
    } catch (e: any) {
      setError(e.message ?? 'Échec de génération du code.');
    }
    setGenerating(false);
  };

  const handleSendEmail = async (c: BetaCodeDoc) => {
    setSendingEmail(c.code);
    setSentFeedback(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch('/api/send-beta-code-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ recipientEmail: c.email, code: c.code, validDays: c.validDays }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || "Échec de l'envoi");
      setSentFeedback(`Code envoyé à ${c.email}.`);
    } catch (e: any) {
      setSentFeedback(`Échec de l'envoi : ${e.message}`);
    } finally {
      setSendingEmail(null);
      setTimeout(() => setSentFeedback(null), 4000);
    }
  };

  const card = `${D ? 'bg-zinc-900/70 border-zinc-800' : 'bg-white border-slate-200'} rounded-3xl border shadow-sm`;

  return (
    <div className={`min-h-screen ${D ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'} font-sans`}>
      <header className={`sticky top-0 z-10 ${D ? 'bg-zinc-950/95 border-zinc-900' : 'bg-white/95 border-slate-200'} border-b backdrop-blur-sm px-6 py-4 flex items-center justify-between`}
        style={{ borderTop: '3px solid #059669' }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={`p-2 rounded-xl transition-colors ${D ? 'hover:bg-zinc-900 text-zinc-500' : 'hover:bg-slate-100 text-slate-400'}`}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-black uppercase italic tracking-tight text-sm">Codes Bêta — Accès Testeur</h1>
            <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>Accès limité — génération de codes uniquement</p>
          </div>
        </div>
        <button onClick={onLogout} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${D ? 'text-zinc-500 hover:bg-zinc-900' : 'text-slate-400 hover:bg-slate-100'}`}>
          <LogOut size={14} /> Déconnexion
        </button>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-5">

        <div className={`flex items-start gap-3 p-4 rounded-2xl border ${D ? 'bg-amber-500/5 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            Cet accès sert uniquement à générer des codes bêta pour créer des comptes de test. Vous n'avez accès à aucune autre donnée d'AutoCompt (utilisateurs, facturation, documents). Si quelque chose semble cassé pendant vos tests, notez-le pour votre rapport — ne cherchez pas à le corriger vous-même.
          </p>
        </div>

        <div className={`${card} p-6`}>
          <h2 className="text-[11px] font-black uppercase tracking-wider mb-1">Générer un nouveau code</h2>
          <p className={`text-[10px] mb-4 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>
            Valide 30 jours, à usage unique, lié à un seul courriel — utilisez une adresse différente pour chaque compte de test que vous créez.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test-comptable@exemple.com"
              className={`flex-1 px-4 py-3 rounded-2xl text-[11px] font-semibold border outline-none focus:ring-1 focus:ring-emerald-500 ${D ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
            />
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Ticket size={13} />}
              Générer le code
            </button>
          </div>
          {error && <p className="text-[10px] font-bold text-rose-500 mt-3">{error}</p>}
          {lastCode && (
            <div className={`mt-4 p-4 rounded-2xl border flex items-center justify-between gap-3 ${D ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="font-mono font-black text-sm text-emerald-600">{lastCode}</span>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(lastCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors ${D ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'}`}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
          )}
        </div>

        <div className={`${card} overflow-hidden`}>
          <div className={`px-5 py-3 border-b flex items-center justify-between ${D ? 'border-zinc-800' : 'border-slate-100'}`}>
            <h3 className="text-[10px] font-black uppercase tracking-wider">Codes déjà générés</h3>
            {loading && <Loader2 size={13} className="animate-spin text-emerald-500" />}
          </div>
          {sentFeedback && (
            <p className={`px-5 py-2 text-[10px] font-bold ${sentFeedback.startsWith('Échec') ? 'text-rose-500' : 'text-emerald-500'}`}>{sentFeedback}</p>
          )}
          {!loading && codes.length === 0 && (
            <p className={`p-6 text-center text-[11px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>Aucun code généré pour l'instant.</p>
          )}
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {codes.map((c) => (
              <div key={c.code} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono font-black text-[12px]">{c.code}</p>
                  <p className={`text-[10px] ${D ? 'text-zinc-500' : 'text-slate-400'}`}>{c.email} · {c.validDays} jours</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                    c.status === 'redeemed'
                      ? (D ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                      : (D ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-500')
                  }`}>
                    {c.status === 'redeemed' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                    {c.status === 'redeemed' ? 'Utilisé' : 'Disponible'}
                  </span>
                  <button
                    onClick={() => handleSendEmail(c)}
                    disabled={sendingEmail !== null}
                    title={`Envoyer ce code par courriel à ${c.email}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 border ${
                      D ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {sendingEmail === c.code ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
