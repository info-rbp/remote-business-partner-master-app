import type { LeadStatus } from '@/lib/crm/types';

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-blue-900 text-blue-200',
  qualified: 'bg-green-900 text-green-200',
  disqualified: 'bg-red-900 text-red-200',
  converted: 'bg-purple-900 text-purple-200',
};

export default function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}
