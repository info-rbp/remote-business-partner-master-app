
import { db } from '@/lib/db';
import ProposalList from './proposal-list';

async function getProposals() {
  try {
    const snapshot = await db.collection('proposals').get();
    const proposals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return proposals as { id: string; title: string; status: string }[];
  } catch (error) {
    console.warn('Unable to load proposals; returning empty list.', error);
    return [];
  }
}

export default async function ProposalsPage() {
  const proposals = await getProposals();

  return <ProposalList initialProposals={proposals} />;
}
