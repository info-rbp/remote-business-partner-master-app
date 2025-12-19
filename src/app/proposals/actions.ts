'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export async function createProposal(formData: FormData) {
  const proposal = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
    status: 'draft',
    createdAt: new Date(),
  };

  await db.collection('proposals').add(proposal);

  redirect('/');
}

export async function updateProposal(id: string, formData: FormData) {
  const proposal = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
  };

  await db.collection('proposals').doc(id).update(proposal);

  redirect('/');
}
