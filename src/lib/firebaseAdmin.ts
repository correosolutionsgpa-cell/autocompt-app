/**
 * Server-only Firebase Admin SDK — never import this from client code (src/App.tsx,
 * components, etc.). It reads FIREBASE_SERVICE_ACCOUNT_KEY, which must never be
 * prefixed with VITE_ or it would be bundled into the browser build.
 */
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let app: App;
let db: Firestore;
let authAdmin: Auth;

function getAdminApp(): App {
  if (!app) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set in environment variables.');
    }
    const serviceAccount = JSON.parse(raw);
    app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
  }
  return app;
}

export function getAdminDb(): Firestore {
  if (!db) {
    // This project uses the named Firestore database "autocompt-main", not "(default)".
    db = getFirestore(getAdminApp(), 'autocompt-main');
  }
  return db;
}

export function getAdminAuth(): Auth {
  if (!authAdmin) {
    authAdmin = getAuth(getAdminApp());
  }
  return authAdmin;
}

/** Verifies the Firebase ID token from an `Authorization: Bearer <token>` header. Returns the uid, or null if missing/invalid. */
export async function verifyRequestAuth(authHeader: string | undefined): Promise<{ uid: string; email: string | null } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice('Bearer '.length);
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email || null };
  } catch {
    return null;
  }
}
