
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Eye } from 'lucide-react';

interface Proposal {
  id: string;
  title: string;
  status: string;
}

export default function ProposalList({ initialProposals }: { initialProposals: Proposal[] }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredProposals = useMemo(() => {
    if (statusFilter === 'all') {
      return initialProposals;
    }
    return initialProposals.filter((p) => p.status === statusFilter);
  }, [initialProposals, statusFilter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Proposals</h1>
        <Link href="/proposals/new" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center">
          <Plus className="mr-2 h-4 w-4" /> New Proposal
        </Link>
      </div>
      <div className="mb-4">
        <label htmlFor="status-filter" className="mr-2">Filter by status:</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-700 text-white p-2 rounded"
        >
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="p-2">Title</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProposals.map((proposal) => (
              <tr key={proposal.id} className="border-b border-gray-700">
                <td className="p-2">{proposal.title}</td>
                <td className="p-2">{proposal.status}</td>
                <td className="p-2 flex items-center">
                  <Link href={`/proposals/${proposal.id}/edit`} className="text-blue-500 hover:underline mr-4 flex items-center">
                    <Pencil className="mr-1 h-4 w-4" /> Edit
                  </Link>
                  <Link href={`/proposals/${proposal.id}/preview`} className="text-blue-500 hover:underline flex items-center">
                    <Eye className="mr-1 h-4 w-4" /> Preview
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
