import { notFound } from 'next/navigation';
import StageBadge from '@/components/crm/StageBadge';
import { getOpportunity, listActivities } from '@/lib/crm/repo';
import { updateOpportunityAction } from '@/app/(app)/crm/actions';
import ActivityList from '@/components/crm/ActivityList';
import CreateActivityForm from '@/components/crm/CreateActivityForm';

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const opportunity = await getOpportunity(params.id);
  if (!opportunity) {
    notFound();
  }

  const activities = await listActivities({ entityType: 'opportunity', entityId: opportunity.id, status: 'open', limit: 20 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">Opportunity</p>
          <h1 className="text-3xl font-bold">{opportunity.notes ?? 'Opportunity'}</h1>
          <p className="text-gray-300">Company: {opportunity.companyId}</p>
        </div>
        <StageBadge stage={opportunity.stage} />
      </div>

      <section className="bg-gray-800 p-4 rounded-lg space-y-3">
        <h2 className="text-xl font-bold">Update</h2>
        <form action={async (formData) => updateOpportunityAction(opportunity.id, {
          stage: (formData.get('stage') as any) ?? opportunity.stage,
          probability: formData.get('probability') ? Number(formData.get('probability')) : opportunity.probability,
          valueEstimate: formData.get('valueEstimate') ? Number(formData.get('valueEstimate')) : opportunity.valueEstimate,
        })} className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select name="stage" defaultValue={opportunity.stage} className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white">
            <option value="discovery">Discovery</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          <input
            name="probability"
            type="number"
            min={0}
            max={100}
            defaultValue={opportunity.probability ?? ''}
            placeholder="Probability"
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          />
          <input
            name="valueEstimate"
            type="number"
            defaultValue={opportunity.valueEstimate ?? ''}
            placeholder="Value"
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded">Save</button>
        </form>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-bold mb-2">Open activities</h3>
          <ActivityList activities={activities} />
        </div>
        <div>
          <h3 className="text-lg font-bold mb-2">Add activity</h3>
          <CreateActivityForm entityType="opportunity" entityId={opportunity.id} />
        </div>
      </section>
    </div>
  );
}
export const dynamic = 'force-dynamic';
