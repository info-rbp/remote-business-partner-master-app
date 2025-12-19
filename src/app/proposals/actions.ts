'use server';

import { redirect } from 'next/navigation';
import { FieldValue } from 'firebase-admin/firestore';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { db, getFirebaseAdminApp } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit-log';
import { resolveActorFromToken, resolveOrgId } from '@/lib/org';

async function verifyTokens(formData: FormData): Promise<DecodedIdToken> {
  const idToken = formData.get('idToken');
  const appCheckToken = formData.get('appCheckToken');

  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing ID token for proposal operation.');
  }

  const adminApp = getFirebaseAdminApp();
  const auth = adminApp.auth();
  const decoded = await auth.verifyIdToken(idToken);

  if (appCheckToken && typeof appCheckToken === 'string') {
    try {
      await adminApp.appCheck().verifyToken(appCheckToken);
    } catch (error) {
      console.warn('App Check verification failed; proceeding with ID token only.', { error });
    }
  }

  return decoded;
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
