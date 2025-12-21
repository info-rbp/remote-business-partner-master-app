
import { db } from '@/lib/db';
import { redirect } from "next/navigation";
import { verifyRequestIdentity } from '@/lib/identity-server';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export async function createProposal(formData: FormData) {
  'use server'
  const idToken = formData.get('idToken');
  const appCheckToken = formData.get('appCheckToken');
  const { uid, orgId } = await verifyRequestIdentity(
    typeof idToken === 'string' ? idToken : null,
    typeof appCheckToken === 'string' ? appCheckToken : null
  );

  const proposal = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
    status: 'draft',
    createdBy: uid,
    createdAt: new Date(),
  };

  const ref = await db.collection('orgs').doc(orgId).collection('proposals').add(proposal);

  // Write audit log for proposal creation
  try {
    await addDoc(collection(db, `orgs/${orgId}/auditLogs`), {
      orgId,
      eventType: 'proposal_created',
      eventDescription: `Proposal created: ${proposal.title}`,
      actor: uid,
      actorRole: 'staff',
      targetType: 'proposal',
      targetId: ref.id,
      targetName: proposal.title,
      metadata: {
        status: proposal.status,
      },
      timestamp: serverTimestamp(),
    });
  } catch (auditError) {
    console.error('Failed to write audit log:', auditError);
    // Don't fail the proposal creation if audit logging fails
  }

  redirect(`/proposals/${ref.id}/preview`);
}

export async function updateProposal(id: string, formData: FormData) {
  'use server'
  const idToken = formData.get('idToken');
  const appCheckToken = formData.get('appCheckToken');
  const { orgId } = await verifyRequestIdentity(
    typeof idToken === 'string' ? idToken : null,
    typeof appCheckToken === 'string' ? appCheckToken : null
  );

  const proposal = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
  };

  await db.collection('orgs').doc(orgId).collection('proposals').doc(id).update(proposal);

  redirect('/');
}
