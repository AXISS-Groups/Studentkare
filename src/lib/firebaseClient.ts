/**
 * StudentKare — Firebase client (lazy, SuperAdmin-configurable).
 * Config comes from GET /api/config/public. If firebase npm package is
 * missing or config disabled, init is a no-op returning null.
 */

export interface FirebasePublicConfig {
  enabled: boolean;
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

let firebaseApp: any = null;
let firebaseAuth: any = null;
let firebaseDb: any = null;

export async function initFirebase(c: Partial<FirebasePublicConfig>) {
  if (!c?.enabled || !c?.apiKey || !c?.projectId || !c?.appId) return null;
  if (firebaseApp) return firebaseApp;
  try {
    // @ts-ignore
    const appMod: any = await import('firebase/app').catch(() => null);
    if (!appMod) return null;
    const { initializeApp, getApps } = appMod;
    const config = {
      apiKey: c.apiKey,
      authDomain: c.authDomain,
      projectId: c.projectId,
      messagingSenderId: c.messagingSenderId,
      appId: c.appId,
    };
    firebaseApp = getApps?.().length ? getApps()[0] : initializeApp(config);
    try {
      // @ts-ignore
      const authMod: any = await import('firebase/auth').catch(() => null);
      firebaseAuth = authMod?.getAuth?.(firebaseApp) ?? null;
    } catch { /* auth optional */ }
    try {
      // @ts-ignore
      const fsMod: any = await import('firebase/firestore').catch(() => null);
      firebaseDb = fsMod?.getFirestore?.(firebaseApp) ?? null;
    } catch { /* firestore optional */ }
    return firebaseApp;
  } catch {
    return null;
  }
}

export function getFirebaseApp() {
  return firebaseApp;
}
export function getFirebaseAuth() {
  return firebaseAuth;
}
export function getFirebaseDb() {
  return firebaseDb;
}
