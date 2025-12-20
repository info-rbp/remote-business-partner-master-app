import Link from 'next/link';
import { Timestamp } from 'firebase-admin/firestore';
import { listActivities } from '@/lib/crm/repo';
import ActivityList from '@/components/crm/ActivityList';
import { markActivityDoneAction } from '@/app/(app)/crm/actions';

export default async function ActivitiesPage() {
  const dueSoon = Timestamp.fromMillis(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const activities = await listActivities({ status: 'open', dueBefore: dueSoon, limit: 50 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Activities</h1>
      </div>
      <ActivityList activities={activities} />
      <div className="space-y-2">
        {activities.map((activity) => (
          <form key={activity.id} action={async () => markActivityDoneAction(activity.id)}>
            <button className="text-sm text-green-300 hover:text-green-100 underline" type="submit">
              Mark {activity.subject} done
            </button>
          </form>
        ))}
      </div>
      <Link href="/crm" className="text-blue-400 hover:text-blue-200 text-sm">Back to CRM</Link>
    </div>
  );
}
export const dynamic = 'force-dynamic';
