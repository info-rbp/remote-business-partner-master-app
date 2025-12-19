'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getFirebaseAdminApp } from '@/lib/firebase-admin';

async function verifyTokens(formData: FormData) {
  const idToken = formData.get('idToken');
  const appCheckToken = formData.get('appCheckToken');

  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing id token for proposal mutation.');
  }

  const app = getFirebaseAdminApp();

  if (appCheckToken && typeof appCheckToken === 'string') {
    await app.appCheck().verifyToken(appCheckToken);
  }

  const decoded = await app.auth().verifyIdToken(idToken);
  return decoded.uid;
}

export async function createProposal(formData: FormData) {
  const uid = await verifyTokens(formData);

  const proposal = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
    status: 'draft',
    createdBy: uid,
    createdAt: new Date(),
  };

  const ref = await db.collection('proposals').add(proposal);

  redirect(`/proposals/${ref.id}/preview`);
}

export async function updateProposal(id: string, formData: FormData) {
  await verifyTokens(formData);

  const proposal = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
  };

  await db.collection('proposals').doc(id).update(proposal);

  redirect('/');
}
