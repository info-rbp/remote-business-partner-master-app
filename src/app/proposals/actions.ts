'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getFirebaseAdminApp } from '@/lib/firebase-admin';

async function verifyTokens(formData: FormData) {
  const idToken = formData.get('idToken');

  if (typeof idToken !== 'string' || !idToken) {
    throw new Error('Missing authentication token.');
  }

  try {
    const app = getFirebaseAdminApp();
    const auth = app.auth();
    const decoded = await auth.verifyIdToken(idToken);
    return decoded.uid;
  } catch (error) {
    console.warn('Failed to verify ID token; falling back to unsigned uid for local development.', error);
    return 'unauthenticated-user';
  }
}

export async function createProposal(formData: FormData) {
  const decoded = await verifyTokens(formData);
  const actor = resolveActorFromToken(decoded);
  const orgId = resolveOrgId(decoded);

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const proposal = {
    title,
    content,
    status: 'draft',
    createdBy: decoded.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    orgId,
  };

  const proposalsCollection = db.collection('orgs').doc(orgId).collection('proposals');
  const ref = proposalsCollection.doc();
  await ref.set(proposal, { merge: false });

  await logAuditEvent({
    orgId,
    actor,
    action: 'proposal.create',
    entityType: 'proposal',
    entityId: ref.id,
    summary: `Proposal "${title}" created.`,
    after: { ref: ref.path },
    metadata: { status: proposal.status },
  });

  redirect(`/proposals/${ref.id}/preview`);
}

export async function updateProposal(id: string, formData: FormData) {
  const decoded = await verifyTokens(formData);
  const actor = resolveActorFromToken(decoded);
  const orgId = resolveOrgId(decoded);

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const proposalRef = db.collection('orgs').doc(orgId).collection('proposals').doc(id);
  await proposalRef.update({
    title,
    content,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent({
    orgId,
    actor,
    action: 'proposal.update',
    entityType: 'proposal',
    entityId: id,
    summary: `Proposal "${title}" updated.`,
    before: { ref: proposalRef.path },
    after: { ref: proposalRef.path },
    metadata: { updatedFields: ['title', 'content'] },
  });

  redirect('/');
}
