
import { db } from '@/lib/firebase-admin';
import ProposalList from './proposal-list';

async function getProposals() {
  const snapshot = await db.collection('proposals').get();
  const proposals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return proposals as { id: string; title: string; status: string }[];
}

export default async function ProposalsPage() {
  const proposals = await getProposals();

  return <ProposalList initialProposals={proposals} />;
}
