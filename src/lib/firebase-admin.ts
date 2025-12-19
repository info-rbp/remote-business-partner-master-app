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
const DEFAULT_EMULATOR_HOST = 'localhost:8080';

function resolveEmulatorHost(): string | undefined {
  const explicitHost = process.env.FIREBASE_EMULATOR_HOST ?? process.env.FIRESTORE_EMULATOR_HOST;
  if (explicitHost) {
    return explicitHost;
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.warn(
      `FIREBASE_SERVICE_ACCOUNT is not set; defaulting to the Firestore emulator at ${DEFAULT_EMULATOR_HOST}. ` +
      'Provide FIREBASE_SERVICE_ACCOUNT in production environments.',
    );
    process.env.FIREBASE_EMULATOR_HOST = DEFAULT_EMULATOR_HOST;
    process.env.FIRESTORE_EMULATOR_HOST = DEFAULT_EMULATOR_HOST;
    process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID ?? 'demo-project';
    return DEFAULT_EMULATOR_HOST;
  }

  return undefined;
}

function parseServiceAccount(): admin.ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const emulatorHost = resolveEmulatorHost();

  if (!raw) {
    const emulatorHint = emulatorHost
      ? 'Falling back to the Firestore emulator because FIREBASE_SERVICE_ACCOUNT is not set.'
      : 'Missing FIREBASE_SERVICE_ACCOUNT. Provide a JSON stringified service account or set FIREBASE_EMULATOR_HOST/FIRESTORE_EMULATOR_HOST to use the emulator locally.';

    throw new Error(emulatorHint);
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

  const emulatorHost = resolveEmulatorHost();

  if (emulatorHost) {
    const projectId = process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID ?? 'demo-project';
    process.env.FIREBASE_EMULATOR_HOST = process.env.FIREBASE_EMULATOR_HOST ?? emulatorHost;
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? emulatorHost;
    process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT ?? projectId;

    globalFirebase.__firebaseAdminApp__ = admin.initializeApp({ projectId });
    return globalFirebase.__firebaseAdminApp__;
  }

  const serviceAccount = parseServiceAccount();

  globalFirebase.__firebaseAdminApp__ = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });

  return globalFirebase.__firebaseAdminApp__;
}

function initializeFirestore(): admin.firestore.Firestore {
  if (globalFirebase.__firestore__) {
    return globalFirebase.__firestore__;
  }

  const firestore = admin.firestore(initializeFirebaseAdmin());
  const emulatorHost = resolveEmulatorHost();

  if (emulatorHost) {
    firestore.settings({ host: emulatorHost, ssl: false });
  }

  globalFirebase.__firestore__ = firestore;
  return firestore;
}

export function getFirebaseAdminApp(): admin.app.App {
  return initializeFirebaseAdmin();
}

export function getFirestore(): admin.firestore.Firestore {
  return initializeFirestore();
}

export const db = initializeFirestore();
