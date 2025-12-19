#!/usr/bin/env node

const admin = require('firebase-admin');

const DEV_PROJECT_ID = process.env.FIREBASE_DEV_PROJECT_ID || 'dealflow-ai-agency-dev';
const PROD_PROJECT_ID = process.env.FIREBASE_PROD_PROJECT_ID || 'dealflow-ai-agency';

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  } catch (error) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT. Ensure it is valid JSON.');
    throw error;
  }
}

function initializeAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const envProjectId = process.env.GCLOUD_PROJECT
    || process.env.FIREBASE_PROJECT_ID
    || (process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : undefined)
    || DEV_PROJECT_ID;

  const serviceAccount = parseServiceAccount();
  const credential = serviceAccount
    ? admin.credential.cert(serviceAccount)
    : admin.credential.applicationDefault();

  return admin.initializeApp({
    credential,
    projectId: envProjectId,
  });
}

async function seed() {
  const app = initializeAdmin();
  const db = admin.firestore(app);
  const projectId = app.options.projectId || DEV_PROJECT_ID;

  if (projectId === PROD_PROJECT_ID) {
    console.error('Refusing to seed because the active project matches the PROD project ID.');
    process.exit(1);
  }

  if (projectId !== DEV_PROJECT_ID) {
    console.warn(`Seeding against non-standard project id: ${projectId}. Expected dev project id: ${DEV_PROJECT_ID}.`);
  }

  const orgId = 'demo-agency-org';
  const adminUserId = 'demo-staff-admin';
  const clientId = 'demo-client';
  const proposalId = 'demo-proposal';
  const auditId = 'seed-run';

  const now = admin.firestore.FieldValue.serverTimestamp();

  const orgRef = db.collection('orgs').doc(orgId);
  const memberRef = orgRef.collection('members').doc(adminUserId);
  const clientRef = orgRef.collection('clients').doc(clientId);
  const proposalRef = orgRef.collection('proposals').doc(proposalId);
  const auditRef = orgRef.collection('auditLogs').doc(auditId);

  const batch = db.batch();

  batch.set(
    orgRef,
    {
      name: 'DealFlow AI Demo Agency',
      status: 'active',
      plan: 'dev',
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  batch.set(
    memberRef,
    {
      role: 'admin',
      email: 'dev-admin@example.com',
      displayName: 'Dev Admin',
      joinedAt: now,
      lastActiveAt: now,
    },
    { merge: true },
  );

  batch.set(
    clientRef,
    {
      name: 'Acme Test Client',
      industry: 'SaaS',
      contactEmail: 'client@example.com',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  batch.set(
    proposalRef,
    {
      clientId,
      title: 'Discovery & Strategy Proposal',
      summary: 'A starter proposal demonstrating remote business partner recommendations.',
      amount: 15000,
      currency: 'USD',
      status: 'draft',
      createdBy: adminUserId,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  batch.set(
    auditRef,
    {
      action: 'seed:dev',
      details: 'Seed script executed for development environment.',
      actor: adminUserId,
      triggeredAt: now,
    },
    { merge: true },
  );

  await batch.commit();
  console.log(`Seed data written to project ${projectId}.`);
}

seed().then(() => {
  console.log('Development seed completed successfully.');
  process.exit(0);
}).catch((error) => {
  console.error('Failed to seed development data:', error);
  process.exit(1);
});
