import admin from 'firebase-admin';

interface RawServiceAccount {
  project_id?: string;
  projectId?: string;
  client_email?: string;
  clientEmail?: string;
  private_key?: string;
  privateKey?: string;
}

function parseServiceAccount(): admin.ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT. Provide a JSON string or use the Firestore emulator via FIREBASE_EMULATOR_HOST.');
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
  if (admin.apps.length) {
    return admin.apps[0];
  }

  const emulatorHost = process.env.FIREBASE_EMULATOR_HOST;

  if (emulatorHost) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-project';
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? emulatorHost;

    return admin.initializeApp({ projectId });
  }

  const serviceAccount = parseServiceAccount();

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
}

function initializeFirestore() {
  const app = initializeFirebaseAdmin();
  const firestore = admin.firestore(app);

  if (process.env.FIREBASE_EMULATOR_HOST) {
    firestore.settings({ host: process.env.FIREBASE_EMULATOR_HOST, ssl: false });
  }

  return firestore;
}

export const db = initializeFirestore();
