'use client';

import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions as getFirebaseFunctions, type Functions } from 'firebase/functions';
import { getToken as getAppCheckToken, initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';

let cachedConfig: FirebaseOptions | null = null;
let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
let cachedFunctions: Functions | null = null;
let cachedAppCheck: AppCheck | null = null;
let attemptedAppCheckInitialization = false;

function parseFirebaseConfig(): FirebaseOptions {
  if (cachedConfig) {
    return cachedConfig;
  }

  const firebaseConfigString = process.env.FIREBASE_WEBAPP_CONFIG
    ?? process.env.NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG
    ?? process.env.NEXT_PUBLIC_FIREBASE_CONFIG;

  if (firebaseConfigString) {
    try {
      cachedConfig = JSON.parse(firebaseConfigString) as FirebaseOptions;
      return cachedConfig;
    } catch {
      throw new Error('Failed to parse Firebase config JSON from environment variables.');
    }
  }

  const configFromEnv = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  const missingKeys = Object.entries(configFromEnv)
    .filter(([key, value]) => key !== 'measurementId' && !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    console.warn(`Missing Firebase configuration values: ${missingKeys.join(', ')}. Falling back to a local demo configuration.`);
    cachedConfig = {
      apiKey: 'demo-api-key',
      authDomain: 'demo.firebaseapp.com',
      projectId: 'demo-project',
      storageBucket: 'demo-project.appspot.com',
      messagingSenderId: 'demo-sender',
      appId: 'demo-app',
    };
    return cachedConfig;
  }

  cachedConfig = {
    apiKey: configFromEnv.apiKey!,
    authDomain: configFromEnv.authDomain!,
    projectId: configFromEnv.projectId!,
    storageBucket: configFromEnv.storageBucket!,
    messagingSenderId: configFromEnv.messagingSenderId!,
    appId: configFromEnv.appId!,
    ...(configFromEnv.measurementId ? { measurementId: configFromEnv.measurementId } : {}),
  };

  return cachedConfig;
}

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) {
    return cachedApp;
  }

  const config = parseFirebaseConfig();
  cachedApp = getApps().length ? getApp() : initializeApp(config);
  return cachedApp;
}

export function getDb(): Firestore {
  if (cachedDb) {
    return cachedDb;
  }

  cachedDb = getFirestore(getFirebaseApp());
  return cachedDb;
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }

  cachedAuth = getAuth(getFirebaseApp());
  return cachedAuth;
}

export function getFunctions(): Functions {
  if (cachedFunctions) {
    return cachedFunctions;
  }

  cachedFunctions = getFirebaseFunctions(getFirebaseApp(), 'us-central1');
  return cachedFunctions;
}

export function getAppCheck(): AppCheck | undefined {
  if (attemptedAppCheckInitialization) {
    return cachedAppCheck ?? undefined;
  }

  attemptedAppCheckInitialization = true;

  if (typeof window === 'undefined') {
    return undefined;
  }

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY ?? process.env.NEXT_PUBLIC_APP_CHECK_PUBLIC_KEY;

  if (!siteKey) {
    console.warn('App Check site key is not configured; App Check will not be enforced.');
    return undefined;
  }

  cachedAppCheck = initializeAppCheck(getFirebaseApp(), {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  return cachedAppCheck;
}

export async function getAuthTokens() {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User is not signed in.');
  }

  const appCheck = getAppCheck();
  if (!appCheck) {
    throw new Error('App Check has not been initialized in this environment.');
  }

  const [idToken, appCheckToken] = await Promise.all([
    user.getIdToken(),
    getAppCheckToken(appCheck),
  ]);

  return { idToken, appCheckToken: appCheckToken.token };
}
