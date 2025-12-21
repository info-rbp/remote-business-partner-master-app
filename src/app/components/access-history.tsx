'use client';

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface AccessLog {
  id: string;
  proposalId: string;
  eventType: string;
  timestamp: Date;
  accessorId?: string;
  accessorName?: string;
  accessorRole?: string;
  ip?: string;
  snapshotVersion?: string;
}

type AccessHistoryProps = {
  proposalId: string;
};

type AccessHistoryResponse = {
  history?: Array<
    Omit<AccessLog, 'timestamp'> & {
      timestamp: string | number | Date;
    }
  >;
  error?: string;
  message?: string;
};

export function AccessHistory({ proposalId }: AccessHistoryProps) {
  const [history, setHistory] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const functions = getFunctions();
        const getHistory = httpsCallable<{ proposalId: string }, AccessHistoryResponse>(
          functions,
          'getProposalAccessHistory'
        );
        const result = await getHistory({ proposalId });
        const data = result.data || {};

        if (Array.isArray(data.history)) {
          setHistory(
            data.history.map((log) => ({
              ...log,
              timestamp: new Date(log.timestamp),
            }))
          );
        } else if (data.error || data.message) {
          setError(data.error || data.message || 'Could not load access history');
        } else {
          setHistory([]);
        }
      } catch (err: any) {
        console.error('Error fetching access history:', err);
        setError('Could not load access history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [proposalId]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded text-center">
        <p className="text-sm text-gray-600">Loading access history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded border border-red-200">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded text-center">
        <p className="text-sm text-gray-600">No access logs yet</p>
      </div>
    );
  }

  const eventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      snapshot_viewed: 'Snapshot Viewed',
      share_link_viewed: 'Share Link Viewed',
      accepted: 'Proposal Accepted',
      declined: 'Proposal Declined',
      converted: 'Converted to Project',
      share_link_revoked: 'Share Link Revoked',
    };
    return labels[type] || type;
  };

  const eventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      snapshot_viewed: 'text-blue-600',
      share_link_viewed: 'text-purple-600',
      accepted: 'text-green-600',
      declined: 'text-red-600',
      converted: 'text-indigo-600',
      share_link_revoked: 'text-orange-600',
    };
    return colors[type] || 'text-gray-600';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Event</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Timestamp</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Accessor</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">IP Address</th>
          </tr>
        </thead>
        <tbody>
          {history.map((log) => (
            <tr key={log.id} className="border-b hover:bg-gray-50">
              <td className={`px-4 py-2 font-medium ${eventTypeColor(log.eventType)}`}>
                {eventTypeLabel(log.eventType)}
              </td>
              <td className="px-4 py-2 text-gray-600">{log.timestamp.toLocaleString()}</td>
              <td className="px-4 py-2 text-gray-600">
                {log.accessorName || log.accessorId || log.accessorRole || '—'}
              </td>
              <td className="px-4 py-2 text-gray-600 font-mono text-xs">{log.ip || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
