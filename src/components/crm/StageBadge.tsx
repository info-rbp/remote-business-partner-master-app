import type { OpportunityStage } from '@/lib/crm/types';

const STAGE_STYLES: Record<OpportunityStage, string> = {
  discovery: 'bg-gray-800 text-gray-200',
  proposal: 'bg-blue-900 text-blue-200',
  negotiation: 'bg-yellow-900 text-yellow-200',
  won: 'bg-green-900 text-green-200',
  lost: 'bg-red-900 text-red-200',
};

export default function StageBadge({ stage }: { stage: OpportunityStage }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${STAGE_STYLES[stage]}`}>
      {stage.toUpperCase()}
    </span>
  );
}
