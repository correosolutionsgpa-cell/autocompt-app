/**
 * driveService.ts — Multi-Company Google Drive Service
 *
 * Architecture: each COMPANY has its own Google Drive, connected ONCE by its
 * owner via the authorization-code flow (offline access). The resulting
 * refresh token is exchanged and stored server-side (/api/drive/connect) —
 * never in the browser — so any collaborator invited to the company can
 * upload through the same shared Drive, not just whoever connected it.
 *
 * The Firestore doc id is scoped by the company's OWNER uid (`ownerId`), not
 * the currently signed-in user, so the doc resolves to the same place for
 * every collaborator: `{ownerId}_company_{companyId}`.
 */

import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

function driveConfigDocId(ownerId: string, companyId: string): string {
  return `${ownerId}_company_${companyId}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriveConfig {
  folderId: string | null;
  folderName: string;
  connectedEmail: string;
  connectedAt: string;
  connected: boolean;
}

export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
  reconnectRequired?: boolean;
}

// ─── GIS Loader ───────────────────────────────────────────────────────────────

let gisLoaded = false;

function loadGIS(): Promise<void> {
  if (gisLoaded || (window as any).google?.accounts?.oauth2) {
    gisLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => { gisLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

async function authHeader(): Promise<Record<string, string>> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Utilisateur non authentifié.');
  return { Authorization: `Bearer ${idToken}` };
}

// ─── Core Service ─────────────────────────────────────────────────────────────

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/**
 * Connect (or reconnect) a company's Drive permanently. Opens a Google consent
 * popup requesting a one-time authorization code, which the server exchanges
 * for a refresh token it stores itself — the browser never sees it.
 */
export async function connectCompanyDrive(
  companyId: string,
  ownerId: string,
  hintEmail?: string,
  onSuccess?: (config: DriveConfig) => void,
  onError?: (error: string) => void,
): Promise<void> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    onError?.('VITE_GOOGLE_CLIENT_ID not configured. Add it to your environment variables.');
    return;
  }

  try {
    await loadGIS();
    const google = (window as any).google;
    const redirectUri = window.location.origin;

    const codeClient = google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      ux_mode: 'popup',
      login_hint: hintEmail || undefined,
      callback: async (response: any) => {
        if (response.error) {
          onError?.(response.error_description || response.error);
          return;
        }
        try {
          const headers = await authHeader();
          const resp = await fetch('/api/drive/connect', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: response.code, companyId, ownerId, redirectUri }),
          });
          const data = await resp.json();
          if (!resp.ok || !data.success) {
            onError?.(data.error || `Échec de connexion (${resp.status})`);
            return;
          }
          onSuccess?.({
            folderId: data.folderId,
            folderName: data.folderName,
            connectedEmail: data.connectedEmail,
            connectedAt: data.connectedAt,
            connected: true,
          });
        } catch (err: any) {
          onError?.(err.message || 'Échec de connexion au serveur AutoCompt');
        }
      },
    });

    codeClient.requestCode();
  } catch (err: any) {
    onError?.(err.message || 'OAuth initialization failed');
  }
}

/**
 * Get the Drive connection status for a company. Any collaborator can read
 * this metadata (never the token itself) via the standard Firestore rules.
 */
export async function getCompanyDriveConfig(companyId: string, ownerId: string): Promise<DriveConfig | null> {
  const docId = driveConfigDocId(ownerId, companyId);
  try {
    const snap = await getDoc(doc(db, 'companyDriveConfig', docId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      folderId: data.folderId || null,
      folderName: data.folderName || 'AutoCompt',
      connectedEmail: data.connectedEmail || '',
      connectedAt: data.connectedAt || '',
      connected: !!data.connected && !!data.connectedEmail,
    };
  } catch {
    return null;
  }
}

/**
 * Upload a base64 file (PDF or image) to the company's shared Drive.
 * Works for the owner AND any invited collaborator — the server refreshes
 * the stored token itself, no per-browser session token needed.
 */
export async function uploadDocumentToDrive(
  companyId: string,
  ownerId: string,
  base64Data: string,
  fileName: string,
  mimeType: string,
  companyName: string,
  category: string = 'Recibos',
): Promise<DriveUploadResult> {
  try {
    const headers = await authHeader();
    const resp = await fetch('/api/drive/upload', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, ownerId, fileName, mimeType, base64Data, companyName, category }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      return {
        success: false,
        error: data.message || data.error || `Échec du téléversement (${resp.status})`,
        reconnectRequired: data.error === 'reconnect_required' || data.error === 'not_connected',
      };
    }
    return { success: true, fileId: data.fileId, webViewLink: data.webViewLink };
  } catch (err: any) {
    return { success: false, error: err.message || 'Échec du téléversement' };
  }
}

/**
 * Upload from the PUBLIC signature page — the external signer has no Firebase
 * Auth session. Trust is anchored to the unique signing `token` instead; the
 * server checks it against the matching `pendingSignatures` doc server-side.
 */
export async function uploadDocumentToDrivePublic(
  companyId: string,
  ownerId: string,
  base64Data: string,
  fileName: string,
  mimeType: string,
  companyName: string,
  category: string,
  token: string,
): Promise<DriveUploadResult> {
  try {
    const resp = await fetch('/api/drive/upload-public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, ownerId, fileName, mimeType, base64Data, companyName, category, token }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      return { success: false, error: data.error || `Échec du téléversement (${resp.status})` };
    }
    return { success: true, fileId: data.fileId, webViewLink: data.webViewLink };
  } catch (err: any) {
    return { success: false, error: err.message || 'Échec du téléversement' };
  }
}

/** Disconnect Drive for a company. Owner-only — revokes access for every collaborator. */
export async function disconnectCompanyDrive(companyId: string, ownerId: string): Promise<void> {
  try {
    const headers = await authHeader();
    await fetch('/api/drive/disconnect', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, ownerId }),
    });
  } catch {
    // best-effort — UI will re-check status on next load
  }
}
