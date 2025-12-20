import { notFound } from 'next/navigation';
import { getActivity } from '@/lib/crm/repo';
import { markActivityDoneAction } from '@/app/(app)/crm/actions';

export default async function ActivityDetailPage({ params }: { params: { id: string } }) {
  const activity = await getActivity(params.id);
  if (!activity) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">Activity</p>
      <h1 className="text-3xl font-bold">{activity.subject}</h1>
      <p className="text-gray-300">Type: {activity.type}</p>
      <p className="text-gray-300">Status: {activity.status}</p>
      <p className="text-gray-300">
        Due: {activity.dueDate ? activity.dueDate.toDate().toLocaleString() : 'No due date'}
      </p>
      <p className="text-gray-300">Linked to: {activity.linked.entityType} / {activity.linked.entityId}</p>
      <form action={async () => markActivityDoneAction(activity.id)}>
        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded">Mark done</button>
      </form>
    </div>
  );
}
export const dynamic = 'force-dynamic';
