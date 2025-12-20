import Link from 'next/link';
import { listLeads } from '@/lib/crm/repo';
import LeadStatusBadge from '@/components/crm/LeadStatusBadge';

export const dynamic = 'force-dynamic';

export default async function LeadsPage({ searchParams }: { searchParams: { status?: string; search?: string } }) {
  const leads = await listLeads({
    status: searchParams.status as any,
    search: searchParams.search,
    limit: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Leads</h1>
        <form className="flex gap-2">
          <input
            name="search"
            defaultValue={searchParams.search ?? ''}
            placeholder="Search name"
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          />
          <select
            name="status"
            defaultValue={searchParams.status ?? ''}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          >
            <option value="">All</option>
            <option value="new">New</option>
            <option value="qualified">Qualified</option>
            <option value="disqualified">Disqualified</option>
            <option value="converted">Converted</option>
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
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Urgency</th>
              <th className="text-left px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-750">
                <td className="px-4 py-2 text-white">{lead.name}</td>
                <td className="px-4 py-2 text-gray-300">{lead.email}</td>
                <td className="px-4 py-2"><LeadStatusBadge status={lead.status} /></td>
                <td className="px-4 py-2 text-gray-300">{lead.urgency}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/crm/leads/${lead.id}`} className="text-blue-400 hover:text-blue-200">Open</Link>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={5}>No leads found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
