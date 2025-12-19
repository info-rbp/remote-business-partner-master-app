
import { db } from '@/lib/db';
import { DEFAULT_ORG_ID } from '@/lib/org';
import ProposalList from './proposal-list';

async function getProposals() {
  try {
    const snapshot = await db.collection('orgs').doc(DEFAULT_ORG_ID).collection('proposals').get();
    const proposals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return proposals as { id: string; title: string; status: string }[];
  } catch (error) {
    console.warn('Unable to load proposals from Firestore; returning an empty list.', { error });
    return [];
  }
}

export default async function ProposalsPage() {
  const proposals = await getProposals();

  return <ProposalList initialProposals={proposals} />;
}
