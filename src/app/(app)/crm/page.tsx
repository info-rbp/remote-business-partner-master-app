import Link from 'next/link';
import { listLeads, listCompanies, listOpportunities, listActivities } from '@/lib/crm/repo';

export default async function CrmHomePage() {
  const [leads, companies, opportunities, activities] = await Promise.all([
    listLeads({ limit: 5 }),
    listCompanies({ limit: 5 }),
    listOpportunities({ limit: 5 }),
    listActivities({ status: 'open', limit: 5 }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">CRM</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="Leads" value={leads.length} href="/crm/leads" />
        <SummaryCard title="Companies" value={companies.length} href="/crm/companies" />
        <SummaryCard title="Opportunities" value={opportunities.length} href="/crm/opportunities" />
      </div>
      <section className="bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Recent leads</h2>
          <Link href="/crm/leads" className="text-blue-400 hover:text-blue-200 text-sm">View all</Link>
        </div>
        <ul className="divide-y divide-gray-700">
          {leads.map((lead) => (
            <li key={lead.id} className="py-2 flex justify-between">
              <div>
                <p className="text-white font-semibold">{lead.name}</p>
                <p className="text-gray-400 text-sm">{lead.email}</p>
              </div>
              <Link href={`/crm/leads/${lead.id}`} className="text-blue-400 hover:text-blue-200 text-sm">Open</Link>
            </li>
          ))}
          {leads.length === 0 && <li className="py-2 text-gray-400">No leads yet.</li>}
        </ul>
      </section>
      <section className="bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Open activities</h2>
          <Link href="/crm/activities" className="text-blue-400 hover:text-blue-200 text-sm">View all</Link>
        </div>
        <ul className="divide-y divide-gray-700">
          {activities.map((activity) => (
            <li key={activity.id} className="py-2 flex justify-between">
              <div>
                <p className="text-white font-semibold">{activity.subject}</p>
                <p className="text-gray-400 text-sm">{activity.type}</p>
              </div>
              <Link href={`/crm/activities/${activity.id}`} className="text-blue-400 hover:text-blue-200 text-sm">Open</Link>
            </li>
          ))}
          {activities.length === 0 && <li className="py-2 text-gray-400">No activities.</li>}
        </ul>
      </section>
    </div>
  );
}

function SummaryCard({ title, value, href }: { title: string; value: number; href: string }) {
  return (
    <Link href={href} className="bg-gray-800 p-4 rounded-lg block hover:border-blue-400 border border-transparent">
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </Link>
  );
}
export const dynamic = 'force-dynamic';
