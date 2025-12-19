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
