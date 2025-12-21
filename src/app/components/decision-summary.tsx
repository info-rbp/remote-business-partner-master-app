'use client';

import React from 'react';
import { ProposalDeliverable, ProposalTimeline } from '@/types/data-models';

type DecisionSummaryProps = {
  proposalTitle: string;
  scope?: string;
  deliverables?: ProposalDeliverable[];
  timeline?: ProposalTimeline;
  nextSteps?: string[];
};

export function DecisionSummary({
  proposalTitle,
  scope,
  deliverables,
  timeline,
  nextSteps,
}: DecisionSummaryProps) {
  return (
    <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
      <h2 className="text-lg font-semibold text-blue-900 mb-4">What You're Agreeing To</h2>

      {/* Scope Summary */}
      {scope && (
        <div className="mb-4">
          <h3 className="font-medium text-blue-900 text-sm mb-2">Scope of Work</h3>
          <p className="text-sm text-blue-800 line-clamp-3">{scope}</p>
        </div>
      )}

      {/* Deliverables Summary */}
      {deliverables && deliverables.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium text-blue-900 text-sm mb-2">
            What You'll Receive ({deliverables.length} deliverable{deliverables.length !== 1 ? 's' : ''})
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            {deliverables.slice(0, 3).map((d) => (
              <li key={d.id} className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>{d.name}</span>
              </li>
            ))}
            {deliverables.length > 3 && (
              <li className="text-blue-700 italic">
                + {deliverables.length - 3} more deliverable{deliverables.length - 3 !== 1 ? 's' : ''}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Timeline Summary */}
      {timeline && (
        <div className="mb-4">
          <h3 className="font-medium text-blue-900 text-sm mb-2">Timeline</h3>
          <p className="text-sm text-blue-800">
            Estimated duration: <span className="font-medium">{timeline.estimatedDuration} days</span>
            {timeline.milestones && timeline.milestones.length > 0 && (
              <>
                {' '}
                with {timeline.milestones.length} major milestone
                {timeline.milestones.length !== 1 ? 's' : ''}
              </>
            )}
          </p>
        </div>
      )}

      {/* Next Steps */}
      {nextSteps && nextSteps.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium text-blue-900 text-sm mb-2">What Happens Next</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            {nextSteps.slice(0, 3).map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-4 p-3 bg-white border border-blue-100 rounded text-xs text-blue-700">
        <p>
          By accepting this proposal, you agree to the scope, pricing, timeline, and terms outlined above. Our team
          will follow up shortly to confirm next steps.
        </p>
      </div>
    </div>
  );
}
