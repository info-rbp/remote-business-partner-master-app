import { createActivityAction } from '@/app/(app)/crm/actions';

export default function CreateActivityForm({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  return (
    <form action={createActivityAction} className="bg-gray-800 p-4 rounded-lg space-y-3">
      <input type="hidden" name="linkedEntityType" value={entityType} />
      <input type="hidden" name="linkedEntityId" value={entityId} />
      <div>
        <label className="block text-sm text-gray-300 mb-1" htmlFor="subject">Subject</label>
        <input
          id="subject"
          name="subject"
          required
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-1" htmlFor="type">Type</label>
        <select
          id="type"
          name="type"
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
        >
          <option value="task">Task</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="meeting">Meeting</option>
        </select>
      </div>
      <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold">
        Create activity
      </button>
    </form>
  );
}
