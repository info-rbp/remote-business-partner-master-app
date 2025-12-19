import { initializeApp, getApps, getApp, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFunctions, type Functions } from 'firebase/functions';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck, getToken as getAppCheckToken } from 'firebase/app-check';

const firebaseConfigString = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
  ?? process.env.NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG
  ?? process.env.FIREBASE_WEBAPP_CONFIG;

if (!firebaseConfigString) {
  throw new Error('NEXT_PUBLIC_FIREBASE_CONFIG or FIREBASE_WEBAPP_CONFIG environment variable is required.');
}

const firebaseConfig = JSON.parse(firebaseConfigString) as FirebaseOptions;

let firebaseApp: FirebaseApp;
let appCheck: AppCheck | undefined;
let auth: Auth | undefined;
let functions: Functions | undefined;
let db: Firestore | undefined;

function getFirebaseApp() {
  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  return firebaseApp;
}

function getAppCheck() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  if (appCheck) {
    return appCheck;
  }

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY ?? process.env.NEXT_PUBLIC_APP_CHECK_PUBLIC_KEY;

  if (!siteKey) {
    console.warn('App Check site key is not configured; App Check will not be enforced.');
    return undefined;
  }

  appCheck = initializeAppCheck(getFirebaseApp(), {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  return appCheck;
}

export function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }

  return auth;
}

export function getFirebaseFunctions() {
  if (!functions) {
    functions = getFunctions(getFirebaseApp(), 'us-central1');
  }

  return functions;
}

export function getDb() {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }

  return db;
}

export async function getAuthTokens() {
  const appCheck = getAppCheck();
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User is not signed in.');
  }

  if (!appCheck) {
    throw new Error('App Check has not been initialized in this environment.');
  }

  const [idToken, appCheckToken] = await Promise.all([
    user.getIdToken(),
    getAppCheckToken(appCheck),
  ]);

  return { idToken, appCheckToken: appCheckToken.token };
}
