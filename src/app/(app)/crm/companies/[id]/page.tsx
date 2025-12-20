import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCompany, listContacts, listOpportunities } from '@/lib/crm/repo';
import StageBadge from '@/components/crm/StageBadge';

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const company = await getCompany(params.id);
  if (!company) {
    notFound();
  }

  const contacts = await listContacts({ companyId: company.id, limit: 50 });
  const opportunities = await listOpportunities({ companyId: company.id, limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">Company</p>
          <h1 className="text-3xl font-bold">{company.name}</h1>
          {company.website && <p className="text-blue-300">{company.website}</p>}
        </div>
      </div>

      <section className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-3">Contacts</h2>
        <ul className="divide-y divide-gray-700">
          {contacts.map((contact) => (
            <li key={contact.id} className="py-2 flex justify-between">
              <div>
                <p className="text-white font-semibold">{contact.name}</p>
                <p className="text-gray-300 text-sm">{contact.email}</p>
              </div>
              <Link href={`/crm/contacts`} className="text-blue-400 hover:text-blue-200 text-sm">Contacts</Link>
            </li>
          ))}
          {contacts.length === 0 && <li className="py-2 text-gray-400">No contacts.</li>}
        </ul>
      </section>

      <section className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-3">Opportunities</h2>
        <ul className="divide-y divide-gray-700">
          {opportunities.map((op) => (
            <li key={op.id} className="py-2 flex justify-between items-center">
              <div>
                <p className="text-white font-semibold">{op.notes ?? 'Opportunity'}</p>
                <p className="text-gray-300 text-sm">Value: {op.valueEstimate ?? '—'}</p>
              </div>
              <div className="flex items-center gap-3">
                <StageBadge stage={op.stage} />
                <Link href={`/crm/opportunities/${op.id}`} className="text-blue-400 hover:text-blue-200 text-sm">Open</Link>
              </div>
            </li>
          ))}
          {opportunities.length === 0 && <li className="py-2 text-gray-400">No opportunities.</li>}
        </ul>
      </section>
    </div>
  );
}
export const dynamic = 'force-dynamic';
