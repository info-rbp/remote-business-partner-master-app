import Link from 'next/link';
import { listContacts } from '@/lib/crm/repo';

export const dynamic = 'force-dynamic';

export default async function ContactsPage({ searchParams }: { searchParams: { search?: string } }) {
  const contacts = await listContacts({ search: searchParams.search, limit: 50 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Contacts</h1>
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
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Company</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {contacts.map((contact) => (
              <tr key={contact.id}>
                <td className="px-4 py-2 text-white">{contact.name}</td>
                <td className="px-4 py-2 text-gray-300">{contact.email}</td>
                <td className="px-4 py-2 text-blue-300">{contact.companyId ?? '—'}</td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={3}>No contacts found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
