import Link from 'next/link';
import { listCompanies } from '@/lib/crm/repo';

export const dynamic = 'force-dynamic';

export default async function CompaniesPage({ searchParams }: { searchParams: { search?: string } }) {
  const companies = await listCompanies({ search: searchParams.search, limit: 50 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Companies</h1>
        <form className="flex gap-2">
          <input
            name="search"
            defaultValue={searchParams.search ?? ''}
            placeholder="Search name"
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          />
          <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded">
            Search
          </button>
        </form>
      </div>
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-900 text-gray-300">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Industry</th>
              <th className="text-left px-4 py-2">Website</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {companies.map((company) => (
              <tr key={company.id}>
                <td className="px-4 py-2 text-white">{company.name}</td>
                <td className="px-4 py-2 text-gray-300">{company.industry ?? '—'}</td>
                <td className="px-4 py-2 text-blue-300">{company.website ?? '—'}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/crm/companies/${company.id}`} className="text-blue-400 hover:text-blue-200">Open</Link>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={4}>No companies found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
