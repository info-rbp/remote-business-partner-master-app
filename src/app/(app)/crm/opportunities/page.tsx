import Link from 'next/link';
import { listOpportunities } from '@/lib/crm/repo';
import StageBadge from '@/components/crm/StageBadge';

export const dynamic = 'force-dynamic';

export default async function OpportunitiesPage({ searchParams }: { searchParams: { stage?: string } }) {
  const opportunities = await listOpportunities({ stage: searchParams.stage as any, limit: 50 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Opportunities</h1>
        <form className="flex gap-2">
          <select
            name="stage"
            defaultValue={searchParams.stage ?? ''}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          >
            <option value="">All stages</option>
            <option value="discovery">Discovery</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded">
            Filter
          </button>
        </form>
      </div>
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-900 text-gray-300">
            <tr>
              <th className="text-left px-4 py-2">Company</th>
              <th className="text-left px-4 py-2">Value</th>
              <th className="text-left px-4 py-2">Stage</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {opportunities.map((op) => (
              <tr key={op.id}>
                <td className="px-4 py-2 text-white">{op.companyId}</td>
                <td className="px-4 py-2 text-gray-300">{op.valueEstimate ?? '—'}</td>
                <td className="px-4 py-2"><StageBadge stage={op.stage} /></td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/crm/opportunities/${op.id}`} className="text-blue-400 hover:text-blue-200">Open</Link>
                </td>
              </tr>
            ))}
            {opportunities.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={4}>No opportunities found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
