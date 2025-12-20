'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { getDb } from '@/lib/firebase-client';
import { useIdentity } from '@/app/components/IdentityGate';
import ProposalList from './proposal-list';

interface Proposal {
  id: string;
  title: string;
  status: string;
}

export default function ProposalsPageClient() {
  const { orgId, loading } = useIdentity();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!orgId) return;
      setFetching(true);
      setError(null);

      try {
        const db = getDb();
        const proposalsRef = collection(db, 'orgs', orgId, 'proposals');
        const snapshot = await getDocs(query(proposalsRef));
        setProposals(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Proposal, 'id'>) })));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load proposals.';
        setError(message);
      } finally {
        setFetching(false);
      }
    };

    load();
  }, [orgId]);

  const content = useMemo(() => {
    if (loading || fetching) {
      return <div className="text-gray-300">Loading proposals…</div>;
    }

    if (error) {
      return <div className="text-red-400">{error}</div>;
    }

    return <ProposalList initialProposals={proposals} />;
  }, [error, fetching, loading, proposals]);

  return <div>{content}</div>;
}
