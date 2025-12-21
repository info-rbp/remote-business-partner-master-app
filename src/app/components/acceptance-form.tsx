'use client';

import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

type AcceptanceFormProps = {
  token: string;
  proposalTitle: string;
  snapshotVersion?: string;
};

export function AcceptanceForm({ token, proposalTitle, snapshotVersion }: AcceptanceFormProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || !confirm) {
      setError('Please fill in all required fields and confirm acceptance.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const acceptProposal = httpsCallable(functions, 'acceptProposal');
      const result = await acceptProposal({ token, name, role, confirm });
      
      if (result.data) {
        setSuccess(true);
        setName('');
        setRole('');
        setConfirm(false);
      }
    } catch (err: any) {
      console.error('Acceptance error:', err);
      setError(err.message || 'Failed to accept proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-2xl">✓</span>
          <div>
            <h3 className="font-semibold text-green-900">Proposal Accepted</h3>
            <p className="text-green-700 text-sm">Thank you, {name}. Your acceptance has been recorded and our team will be in touch shortly.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 border rounded-lg bg-gray-50">
      <h2 className="text-lg font-semibold mb-4">Accept This Proposal</h2>

      {!reviewed && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          Please review the entire proposal above before accepting.
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Your Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Your Role / Title <span className="text-red-500">*</span>
          </label>
          <input
            id="role"
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Project Manager, Director, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
              className="mt-1 w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              I have reviewed the entire proposal including scope, timeline, pricing, and terms.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              disabled={!reviewed}
              className="mt-1 w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
            <span className={`text-sm ${reviewed ? 'text-gray-700' : 'text-gray-400'}`}>
              I accept this proposal and agree to the terms outlined above. This constitutes a binding commercial agreement.
            </span>
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !reviewed || !confirm}
          className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Accepting...' : 'Accept Proposal'}
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-500 text-center">
        This acceptance will be recorded and logged for your records.
      </p>
    </form>
  );
}
