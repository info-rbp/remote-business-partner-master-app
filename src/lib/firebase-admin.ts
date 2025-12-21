
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as firestore from "firebase-admin/firestore";

let adminApp: App | undefined;

function initAdminApp(): App {
  if (getApps().length) return getApps()[0]!;
  if (adminApp) return adminApp;

  const usingEmulator =
  !!process.env.FIRESTORE_EMULATOR_HOST ||
  !!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  !!process.env.FIREBASE_STORAGE_EMULATOR_HOST;

  if (usingEmulator) {
    adminApp = initializeApp();
    return adminApp;
  }

  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saRaw) {
    const serviceAccount = JSON.parse(saRaw);
    adminApp = initializeApp({ credential: cert(serviceAccount) });
    return adminApp;
  }

  // Cloud Run / Firebase App Hosting: ADC
  adminApp = initializeApp();
  return adminApp;
}

export const admin = {
  app: initAdminApp(),
  db: getFirestore(initAdminApp()),
  auth: getAuth(initAdminApp()),
  firestore,
};

// Compatibility export for existing imports
export function getFirebaseAdminApp(): App {
  return admin.app;
}
