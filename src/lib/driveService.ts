/**
 * driveService.ts — Multi-Company Google Drive Service
 *
 * Architecture: Scenario A — each company has its own Google Account.
 * OAuth uses Google Identity Services (GIS) token model (client-side).
 * Access tokens (1h lifetime) are cached in Firestore per companyId.
 * Routing always follows the active workspace's authenticated token.
 */

import { db } from './firebase';
import { doc, getDoc, setDoc, deleteField, updateDoc } from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriveConfig {
  accessToken: string;
  folderId: string | null;
  folderName: string;
  connectedEmail: string;
  connectedAt: string;
  expiresAt: number; // epoch ms
}

export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const AUTOCOMPT_FOLDER_NAME = 'AutoCompt — DocuLegal';
const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // 55 min (GIS tokens last 60min)

// In-memory token cache (survives page navigation within session)
const tokenCache = new Map<string, DriveConfig>();

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

// ─── Core Service ─────────────────────────────────────────────────────────────

/**
 * Trigger Google OAuth for a specific company workspace.
 * The `hintEmail` pre-selects the company's Google account in the popup.
 */
export async function connectCompanyDrive(
  companyId: string,
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

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      hint: hintEmail || '',
      callback: async (response: any) => {
        if (response.error) {
          onError?.(response.error_description || response.error);
          return;
        }

        const accessToken: string = response.access_token;
        const expiresAt = Date.now() + TOKEN_LIFETIME_MS;

        // Get the connected Google account email via userinfo
        let connectedEmail = hintEmail || 'Compte Google';
        try {
          const infoResp = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (infoResp.ok) {
            const info = await infoResp.json();
            connectedEmail = info.email || connectedEmail;
          }
        } catch {}

        // Create or find the AutoCompt folder in this company's Drive
        const folderId = await createOrGetAutoComptFolder(accessToken);

        const config: DriveConfig = {
          accessToken,
          folderId,
          folderName: AUTOCOMPT_FOLDER_NAME,
          connectedEmail,
          connectedAt: new Date().toISOString(),
          expiresAt,
        };

        // Cache in memory
        tokenCache.set(companyId, config);

        // Persist to Firestore (token cached for session; Firestore for metadata)
        try {
          await setDoc(
            doc(db, 'companyDriveConfig', companyId),
            {
              folderId,
              folderName: AUTOCOMPT_FOLDER_NAME,
              connectedEmail,
              connectedAt: config.connectedAt,
              // NOTE: We do NOT persist the access_token to Firestore for security.
              // The token is kept in memory only for this session.
            },
            { merge: true }
          );
        } catch {
          // Firestore save failed — token still works for this session
        }

        onSuccess?.(config);
      },
    });

    tokenClient.requestAccessToken({ prompt: hintEmail ? '' : 'select_account' });
  } catch (err: any) {
    onError?.(err.message || 'OAuth initialization failed');
  }
}

/**
 * Get the cached Drive config for a company.
 * Returns null if not connected or token expired.
 */
export async function getCompanyDriveConfig(companyId: string): Promise<DriveConfig | null> {
  // Check in-memory cache first
  const cached = tokenCache.get(companyId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached;
  }

  // Check Firestore for metadata (no token — user needs to re-auth if token expired)
  try {
    const snap = await getDoc(doc(db, 'companyDriveConfig', companyId));
    if (snap.exists()) {
      const data = snap.data();
      // Return metadata without token — caller knows token is expired
      return {
        accessToken: '', // expired or not in this session
        folderId: data.folderId || null,
        folderName: data.folderName || AUTOCOMPT_FOLDER_NAME,
        connectedEmail: data.connectedEmail || '',
        connectedAt: data.connectedAt || '',
        expiresAt: 0, // indicates expired
      };
    }
  } catch {}

  return null;
}

/**
 * Check if a company Drive is connected AND has a valid token for this session.
 */
export function isCompanyDriveActive(companyId: string): boolean {
  const cached = tokenCache.get(companyId);
  return !!(cached && Date.now() < cached.expiresAt);
}

/**
 * Upload a PDF (base64) to the company's Drive folder.
 */
export async function uploadDocumentToDrive(
  companyId: string,
  pdfBase64: string,
  fileName: string,
): Promise<DriveUploadResult> {
  const config = tokenCache.get(companyId);
  if (!config || Date.now() >= config.expiresAt) {
    return { success: false, error: 'Drive non connecté ou token expiré. Veuillez reconnecter.' };
  }

  return uploadPDFToFolder(config.accessToken, config.folderId, pdfBase64, fileName);
}

/**
 * Disconnect Drive for a company (clears token + Firestore metadata).
 */
export async function disconnectCompanyDrive(companyId: string): Promise<void> {
  tokenCache.delete(companyId);
  try {
    await updateDoc(doc(db, 'companyDriveConfig', companyId), {
      connectedEmail: deleteField(),
      connectedAt: deleteField(),
      folderId: deleteField(),
    });
  } catch {}
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

async function createOrGetAutoComptFolder(accessToken: string): Promise<string | null> {
  try {
    // Search for existing AutoCompt folder
    const searchResp = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `name='${AUTOCOMPT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      )}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (searchResp.ok) {
      const data = await searchResp.json();
      if (data.files?.length > 0) {
        return data.files[0].id;
      }
    }

    // Create the folder
    const createResp = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: AUTOCOMPT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (createResp.ok) {
      const folder = await createResp.json();
      return folder.id;
    }
  } catch {}

  return null;
}

async function uploadPDFToFolder(
  accessToken: string,
  folderId: string | null,
  pdfBase64: string,
  fileName: string,
): Promise<DriveUploadResult> {
  try {
    const boundary = 'autocompt_boundary_' + Date.now();
    const metadata: Record<string, any> = {
      name: fileName,
      mimeType: 'application/pdf',
    };
    if (folderId) metadata.parents = [folderId];

    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: application/pdf',
      'Content-Transfer-Encoding: base64',
      '',
      pdfBase64,
      `--${boundary}--`,
    ].join('\r\n');

    const resp = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (resp.ok) {
      const file = await resp.json();
      return { success: true, fileId: file.id, webViewLink: file.webViewLink };
    }

    const err = await resp.text();
    return { success: false, error: `Drive API error ${resp.status}: ${err}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Upload failed' };
  }
}
