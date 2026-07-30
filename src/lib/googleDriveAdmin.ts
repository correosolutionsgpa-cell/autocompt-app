/**
 * Server-only Google Drive helpers for the shared-company-Drive architecture.
 * Never import this from client code — it uses the OAuth Client Secret.
 *
 * Model: one company connects its Drive ONCE (authorization-code flow, offline
 * access) via /api/drive/connect. The resulting refresh token is stored server-side
 * in `driveCredentials`, keyed by the company's OWNER uid — not by whichever
 * collaborator happens to be logged in — so every collaborator invited to that
 * company uploads through the same Drive without ever seeing the token.
 */
import { getAdminDb } from './firebaseAdmin.js';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const AUTOCOMPT_ROOT_FOLDER_NAME = 'AutoCompt';

export function companyDocId(ownerId: string, companyId: string): string {
  return `${ownerId}_company_${companyId}`;
}

export function driveCredDocId(ownerId: string, companyId: string): string {
  return `${ownerId}_company_${companyId}`;
}

/** Confirms `uid` is either the owner or an invited collaborator on this company. */
export async function isAuthorizedForCompany(uid: string, ownerId: string, companyId: string): Promise<boolean> {
  if (uid === ownerId) return true;
  const db = getAdminDb();
  const snap = await db.collection('companies').doc(companyDocId(ownerId, companyId)).get();
  if (!snap.exists) return false;
  const collaboratorUIDs: string[] = snap.data()?.collaboratorUIDs || [];
  return collaboratorUIDs.includes(uid);
}

export interface TokenExchangeResult {
  accessToken: string;
  refreshToken: string | null; // only present on first consent
  expiresIn: number;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenExchangeResult> {
  const params = new URLSearchParams({
    code,
    client_id: process.env.VITE_GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Google token exchange failed: ${data.error_description || data.error || resp.status}`);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresIn: data.expires_in || 3600,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.VITE_GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    grant_type: 'refresh_token',
  });
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    // invalid_grant means the refresh token was revoked — caller must ask to reconnect.
    throw new Error(`Google token refresh failed: ${data.error_description || data.error || resp.status}`);
  }
  return data.access_token;
}

export async function getGoogleUserEmail(accessToken: string): Promise<string> {
  const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) return '';
  const data = await resp.json();
  return data.email || '';
}

export async function getOrCreateDriveFolderServer(
  folderName: string,
  parentId: string,
  accessToken: string,
): Promise<string> {
  const query = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const searchResp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (searchResp.ok) {
    const data = await searchResp.json();
    if (data.files?.length > 0) return data.files[0].id;
  }

  const createResp = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  if (!createResp.ok) {
    const err = await createResp.text();
    throw new Error(`Failed to create Drive folder "${folderName}": ${err}`);
  }
  const created = await createResp.json();
  return created.id;
}

/** Resolves /AutoCompt/[Année]/[Compagnie]/[Catégorie], creating any missing folder. */
export async function resolveCompanyDriveFolder(
  accessToken: string,
  companyName: string,
  category: string,
  year?: string,
): Promise<string> {
  const autoComptFolderId = await getOrCreateDriveFolderServer(AUTOCOMPT_ROOT_FOLDER_NAME, 'root', accessToken);
  const yearFolderId = await getOrCreateDriveFolderServer(year || new Date().getFullYear().toString(), autoComptFolderId, accessToken);
  const companyFolderId = await getOrCreateDriveFolderServer(companyName || 'Entreprise', yearFolderId, accessToken);
  return getOrCreateDriveFolderServer(category || 'Recibos', companyFolderId, accessToken);
}

export async function uploadBase64ToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  base64Data: string,
): Promise<{ id: string; webViewLink?: string }> {
  const boundary = 'autocompt_boundary_' + Date.now();
  const metadata = { name: fileName, mimeType: mimeType || 'application/octet-stream', parents: [folderId] };
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mimeType || 'application/octet-stream'}`,
    'Content-Transfer-Encoding: base64',
    '',
    base64Data,
    `--${boundary}--`,
  ].join('\r\n');

  const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Drive upload failed (${resp.status}): ${err}`);
  }
  const file = await resp.json();

  // A freshly uploaded file is only accessible to whichever Google account is
  // behind the stored refresh token — nobody else (the uploader viewing from a
  // different session, an invited collaborator, or the in-app "eye"/preview
  // icon) can open its link without this. Every viewer link in the app
  // (embedded /preview iframes) already assumes anyone holding the link can
  // open it, with no per-viewer Google identity check — this permission was
  // simply never granted. Best-effort: a failure here shouldn't fail the
  // whole upload, since the file is already saved either way.
  try {
    const permResp = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'anyone', role: 'reader' }),
    });
    if (!permResp.ok) {
      console.error(`[Drive] Failed to set public-read permission on file ${file.id}:`, await permResp.text());
    }
  } catch (permErr) {
    console.error(`[Drive] Error setting permission on file ${file.id}:`, permErr);
  }

  return file;
}
