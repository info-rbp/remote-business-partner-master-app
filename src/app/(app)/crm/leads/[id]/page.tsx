import { notFound } from 'next/navigation';
import Link from 'next/link';
import LeadStatusBadge from '@/components/crm/LeadStatusBadge';
import { listActivities, getLead } from '@/lib/crm/repo';
import { updateLeadFitScore, updateLeadStatus } from '@/app/(app)/crm/actions';
import LeadConvertForm from '@/components/crm/LeadConvertForm';
import ActivityList from '@/components/crm/ActivityList';
import CreateActivityForm from '@/components/crm/CreateActivityForm';

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) {
    notFound();
  }

  const activities = await listActivities({ entityType: 'lead', entityId: lead.id, status: 'open', limit: 20 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">Lead</p>
          <h1 className="text-3xl font-bold">{lead.name}</h1>
          <p className="text-gray-300">{lead.email}</p>
          {lead.companyName && <p className="text-gray-400 text-sm">{lead.companyName}</p>}
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>

      <section className="bg-gray-800 p-4 rounded-lg space-y-3">
        <h2 className="text-xl font-bold">Triage</h2>
        <form action={async () => updateLeadStatus(lead.id, 'qualified')} className="flex gap-2">
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded">Qualify</button>
        </form>
        <form action={async () => updateLeadStatus(lead.id, 'disqualified')} className="flex gap-2">
          <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded">Disqualify</button>
        </form>
        <form action={async (formData) => updateLeadFitScore(lead.id, Number(formData.get('fitScore') ?? 0))} className="flex items-center gap-2">
          <label className="text-sm text-gray-300" htmlFor="fitScore">Fit score</label>
          <input
            id="fitScore"
            name="fitScore"
            type="number"
            min={0}
            max={100}
            defaultValue={lead.fitScore ?? 0}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white w-24"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded">Save</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Convert</h2>
        <LeadConvertForm leadId={lead.id} leadName={lead.name} leadEmail={lead.email} leadCompany={lead.companyName} />
        {lead.convertedCompanyId && (
          <div className="text-gray-300 space-x-4">
            <Link href={`/crm/companies/${lead.convertedCompanyId}`} className="text-blue-400 hover:text-blue-200">View company</Link>
            {lead.convertedOpportunityId && (
              <Link href={`/crm/opportunities/${lead.convertedOpportunityId}`} className="text-blue-400 hover:text-blue-200">View opportunity</Link>
            )}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-bold mb-2">Open activities</h3>
          <ActivityList activities={activities} />
        </div>
        <div>
          <h3 className="text-lg font-bold mb-2">Add activity</h3>
          <CreateActivityForm entityType="lead" entityId={lead.id} />
        </div>
      </section>
    </div>
  );
}
export const dynamic = 'force-dynamic';
