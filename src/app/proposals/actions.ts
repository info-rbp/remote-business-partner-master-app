'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

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
