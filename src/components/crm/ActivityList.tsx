import Link from 'next/link';
import type { Activity } from '@/lib/crm/types';

export default function ActivityList({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-gray-400">No activities.</p>;
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => {
        const overdue = activity.dueDate && activity.dueDate.toMillis() < Date.now();
        const dueSoon =
          activity.dueDate &&
          activity.dueDate.toMillis() >= Date.now() &&
          activity.dueDate.toMillis() <= Date.now() + 1000 * 60 * 60 * 48;
        return (
          <div key={activity.id} className="bg-gray-800 p-3 rounded border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{activity.type.toUpperCase()}</p>
                <p className="text-white font-semibold">{activity.subject}</p>
              </div>
              <Link href={`/crm/activities/${activity.id}`} className="text-blue-400 hover:text-blue-200 text-sm">
                View
              </Link>
            </div>
            <p className="text-gray-400 text-sm">
              Status: {activity.status} ·{' '}
              {activity.dueDate ? (
                <span className={overdue ? 'text-red-400' : dueSoon ? 'text-yellow-300' : 'text-gray-300'}>
                  Due {activity.dueDate.toDate().toLocaleString()}
                </span>
              ) : (
                'No due date'
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
