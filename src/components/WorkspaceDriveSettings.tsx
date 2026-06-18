/**
 * WorkspaceDriveSettings.tsx
 * Per-company Google Drive connection panel.
 * Shows connection status, allows OAuth connect/disconnect per workspace.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HardDrive, CheckCircle2, AlertCircle, RefreshCw,
  Unlink, ExternalLink, FolderOpen, Loader2, Wifi, WifiOff,
} from 'lucide-react';
import {
  connectCompanyDrive,
  disconnectCompanyDrive,
  getCompanyDriveConfig,
  isCompanyDriveActive,
  DriveConfig,
} from '../lib/driveService';

interface WorkspaceDriveSettingsProps {
  companyId: string;
  companyName: string;
  companyEmail?: string; // hint email for OAuth (company's Google account)
  darkMode: boolean;
  onConnectionChange?: (connected: boolean, config: DriveConfig | null) => void;
}

export default function WorkspaceDriveSettings({
  companyId,
  companyName,
  companyEmail,
  darkMode,
  onConnectionChange,
}: WorkspaceDriveSettingsProps) {
  const [driveConfig, setDriveConfig] = useState<DriveConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const D = darkMode;

  useEffect(() => {
    loadDriveStatus();
  }, [companyId]);

  const loadDriveStatus = async () => {
    setLoading(true);
    const config = await getCompanyDriveConfig(companyId);
    setDriveConfig(config);
    setIsConnected(isCompanyDriveActive(companyId));
    setLoading(false);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    setSuccessMsg(null);

    await connectCompanyDrive(
      companyId,
      companyEmail,
      (config) => {
        setDriveConfig(config);
        setIsConnected(true);
        setIsConnecting(false);
        setSuccessMsg(`✅ Google Drive connecté · ${config.connectedEmail}`);
        onConnectionChange?.(true, config);
        setTimeout(() => setSuccessMsg(null), 5000);
      },
      (err) => {
        setError(err);
        setIsConnecting(false);
      }
    );
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    await disconnectCompanyDrive(companyId);
    setDriveConfig(null);
    setIsConnected(false);
    setIsDisconnecting(false);
    onConnectionChange?.(false, null);
  };

  const tokenExpired = driveConfig !== null && driveConfig.expiresAt === 0;
  const hasMetadata = driveConfig?.connectedEmail && driveConfig.connectedEmail !== '';

  if (loading) {
    return (
      <div className={`flex items-center gap-3 p-5 rounded-2xl border ${D ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
        <Loader2 size={16} className="animate-spin text-emerald-500" />
        <span className={`text-[11px] font-bold ${D ? 'text-zinc-400' : 'text-slate-500'}`}>
          Vérification de la connexion Drive...
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border ${D ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} overflow-hidden shadow-sm`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b flex items-center gap-3 ${D ? 'border-zinc-800 bg-zinc-950/50' : 'border-slate-100 bg-slate-50/50'}`}>
        <div className={`p-2 rounded-xl ${isConnected ? (D ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (D ? 'bg-zinc-800 text-zinc-500' : 'bg-slate-100 text-slate-400')}`}>
          <HardDrive size={16} />
        </div>
        <div className="flex-1">
          <p className="text-[12px] font-black">Google Drive — {companyName}</p>
          <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>
            Stockage cloud dédié à ce workspace
          </p>
        </div>
        {/* Status badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider ${isConnected
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : tokenExpired && hasMetadata
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
          {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
          {isConnected ? 'Connecté' : tokenExpired && hasMetadata ? 'Session expirée' : 'Non connecté'}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">

        {/* Connected state — show details */}
        {isConnected && driveConfig && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border ${D ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200'}`}>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">
                  Drive actif pour ce workspace
                </p>
                <div className={`space-y-1.5 text-[10px] ${D ? 'text-zinc-400' : 'text-slate-600'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-[8px] text-slate-400 w-20">Compte</span>
                    <span className="font-semibold">{driveConfig.connectedEmail}</span>
                  </div>
                  {driveConfig.folderId && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[8px] text-slate-400 w-20">Dossier</span>
                      <div className="flex items-center gap-1.5">
                        <FolderOpen size={11} className="text-amber-500" />
                        <span className="font-semibold">{driveConfig.folderName}</span>
                        <a
                          href={`https://drive.google.com/drive/folders/${driveConfig.folderId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  )}
                  {driveConfig.connectedAt && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[8px] text-slate-400 w-20">Connecté</span>
                      <span>{new Date(driveConfig.connectedAt).toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
                <p className={`text-[9px] mt-2 ${D ? 'text-emerald-500/60' : 'text-emerald-600/60'}`}>
                  📁 Tous les documents signés dans ce workspace seront automatiquement sauvegardés dans ce Drive.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Token expired — show reconnect */}
        {!isConnected && tokenExpired && hasMetadata && (
          <div className={`p-4 rounded-2xl border ${D ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400">
                  Session Drive expirée
                </p>
                <p className={`text-[10px] mt-1 ${D ? 'text-zinc-400' : 'text-slate-600'}`}>
                  Dernière connexion: <strong>{driveConfig?.connectedEmail}</strong>
                  <br />Les tokens Google expirent après 1 heure. Reconnectez pour reprendre l'upload automatique.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Not connected — explain */}
        {!isConnected && !hasMetadata && (
          <div className={`p-4 rounded-2xl border border-dashed ${D ? 'border-zinc-700 bg-zinc-900/50' : 'border-slate-200 bg-slate-50'}`}>
            <p className={`text-[11px] font-semibold ${D ? 'text-zinc-400' : 'text-slate-600'} leading-relaxed`}>
              Connectez le Google Drive dédié à <strong>{companyName}</strong>.<br />
              Choisissez le compte Google de cette entreprise dans la fenêtre qui s'ouvrira.
            </p>
            {companyEmail && (
              <p className={`text-[10px] mt-2 ${D ? 'text-zinc-500' : 'text-slate-400'}`}>
                💡 Compte suggéré: <strong>{companyEmail}</strong>
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
            <p className="text-[10px] font-bold text-rose-700">❌ {error}</p>
          </div>
        )}

        {/* Success */}
        <AnimatePresence>
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-[10px] font-bold text-emerald-700">{successMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
            >
              {isConnecting ? (
                <><Loader2 size={13} className="animate-spin" /><span>Connexion en cours...</span></>
              ) : (
                <><HardDrive size={13} /><span>{tokenExpired && hasMetadata ? 'Reconnecter Google Drive' : 'Connecter Google Drive'}</span></>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${D ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                <RefreshCw size={12} />
                <span>Renouveler</span>
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all"
              >
                {isDisconnecting ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
                <span>Déconnecter</span>
              </button>
            </>
          )}
        </div>

        {/* Info footer */}
        <p className={`text-[8.5px] ${D ? 'text-zinc-600' : 'text-slate-400'} leading-relaxed`}>
          🔒 Les tokens OAuth sont stockés en mémoire uniquement (session). AutoCompt ne conserve jamais vos identifiants Google. Seul l'email et l'ID du dossier sont sauvegardés dans Firestore.
        </p>
      </div>
    </div>
  );
}
