'use client';

import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Proposal } from '@/types/data-models';

type ConvertToProjectProps = {
  proposal: Proposal;
  onSuccess?: () => void;
};

interface ReadinessCheck {
  name: string;
  passed: boolean;
  message: string;
}

export function ConvertToProject({ proposal, onSuccess }: ConvertToProjectProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Perform readiness checks
  const checks: ReadinessCheck[] = [
    {
      name: 'Proposal Accepted',
      passed: proposal.status === 'accepted',
      message: 'Client must have accepted the proposal first',
    },
    {
      name: 'Pricing Complete',
      passed: !!(proposal.pricing?.totalAmount && proposal.pricing?.currency),
      message: 'Total amount and currency must be set',
    },
    {
      name: 'Milestones Defined',
      passed: !!(proposal.timeline?.milestones && proposal.timeline.milestones.length > 0),
      message: 'At least one milestone must be defined',
    },
    {
      name: 'Deliverables Defined',
      passed: !!(proposal.deliverables && proposal.deliverables.length > 0),
      message: 'At least one deliverable must be defined',
    },
    {
      name: 'Duration Set',
      passed: !!(proposal.timeline?.estimatedDuration && proposal.timeline.estimatedDuration > 0),
      message: 'Estimated duration must be greater than zero',
    },
    {
      name: 'Scope Defined',
      passed: !!(proposal.scope && proposal.scope.trim().length > 0),
      message: 'Scope description must not be empty',
    },
  ];

  const allChecksPassed = checks.every((c) => c.passed);

  const handleConvert = async () => {
    if (!allChecksPassed) {
      setError('Please address all readiness checks before converting.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const convertFn = httpsCallable(functions, 'convertProposalToProject');
      const result = await convertFn({ proposalId: proposal.id, orgId: proposal.orgId });

      if (result.data) {
        onSuccess?.();
      }
    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err.message || 'Failed to convert proposal to project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg bg-indigo-50 border-indigo-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-indigo-900">Convert to Project</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-indigo-600 hover:text-indigo-900 underline"
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {showDetails && (
        <div className="mb-4 space-y-2">
          {checks.map((check, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className={`text-lg ${check.passed ? 'text-green-600' : 'text-red-600'}`}>
                {check.passed ? '✓' : '✗'}
              </span>
              <div>
                <p className={`font-medium ${check.passed ? 'text-green-900' : 'text-red-900'}`}>
                  {check.name}
                </p>
                {!check.passed && <p className="text-xs text-red-700">{check.message}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!allChecksPassed && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <p className="font-medium">Readiness Check Failed</p>
          <p className="text-xs mt-1">
            {checks.filter((c) => !c.passed).length} check{checks.filter((c) => !c.passed).length !== 1 ? 's' : ''} must be addressed
            before converting.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleConvert}
        disabled={loading || !allChecksPassed}
        className={`w-full px-4 py-2 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
          allChecksPassed
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
        }`}
      >
        {loading ? 'Converting...' : 'Convert to Project'}
      </button>

      <p className="mt-3 text-xs text-indigo-700">
        Converting will create a project in the delivery system and trigger project initialization.
      </p>
    </div>
  );
}
