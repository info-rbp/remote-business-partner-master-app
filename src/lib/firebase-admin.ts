import admin from 'firebase-admin';

interface RawServiceAccount {
  project_id?: string;
  projectId?: string;
  client_email?: string;
  clientEmail?: string;
  private_key?: string;
  privateKey?: string;
}

type FirebaseAdminGlobals = typeof globalThis & {
  __firebaseAdminApp__?: admin.app.App;
  __firestore__?: admin.firestore.Firestore;
};

const globalFirebase = globalThis as FirebaseAdminGlobals;

function parseServiceAccount(): admin.ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT. Provide a JSON stringified service account or set FIREBASE_EMULATOR_HOST/FIRESTORE_EMULATOR_HOST to use the emulator locally.');
  }

  let parsed: RawServiceAccount;
  try {
    parsed = JSON.parse(raw) as RawServiceAccount;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON. Ensure it is a JSON stringified service account.');
  }

  const projectId = parsed.project_id ?? parsed.projectId ?? process.env.FIREBASE_PROJECT_ID;
  const clientEmail = parsed.client_email ?? parsed.clientEmail;
  const privateKey = (parsed.private_key ?? parsed.privateKey)?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing required fields (project_id, client_email, private_key).');
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  } satisfies admin.ServiceAccount;
}

function initializeFirebaseAdmin(): admin.app.App {
  if (globalFirebase.__firebaseAdminApp__) {
    return globalFirebase.__firebaseAdminApp__;
  }

import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Optional: you might also use getAuth, getStorage, etc later.
// import { getAuth } from "firebase-admin/auth";

let adminApp: App | undefined;

function initAdminApp(): App {
  // Reuse existing app if already initialized
  if (getApps().length) return getApps()[0]!;
  if (adminApp) return adminApp;

  const usingEmulator =
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.FIREBASE_STORAGE_EMULATOR_HOST;

  // 1) Emulator mode: no explicit credentials needed
  if (usingEmulator) {
    adminApp = initializeApp();
    return adminApp;
  }

  // 2) Explicit service account (local / CI) if provided
  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saRaw) {
    const serviceAccount = JSON.parse(saRaw);
    adminApp = initializeApp({ credential: cert(serviceAccount) });
    return adminApp;
  }

  // 3) Cloud Run / App Hosting: use Application Default Credentials
  // This works when the runtime has a service account with Firebase permissions.
  adminApp = initializeApp();
  return adminApp;
}

export const admin = {
  app: initAdminApp(),
  db: getFirestore(initAdminApp()),
};
