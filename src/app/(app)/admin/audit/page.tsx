'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, query, getDocs, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase-client';
import { AuditLog, AuditEventType } from '@/types/data-models';
import { FileText, Shield, User, Calendar, Filter, AlertCircle } from 'lucide-react';

export default function AdminAuditPage() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [maxResults, setMaxResults] = useState(50);

  useEffect(() => {
    if (!user?.orgId) return;

    // Check if user is admin
    if (user.role !== 'admin') {
      setError('Access denied: Admin role required');
      setLoading(false);
      return;
    }

    const loadAuditLogs = async () => {
      setLoading(true);
      try {
        const db = getDb();
        const auditRef = collection(db, `orgs/${user.orgId}/auditLogs`);
        
        // Build query with optional filters
        let q = query(auditRef, orderBy('timestamp', 'desc'), limit(maxResults));
        
        if (filterEventType !== 'all') {
          q = query(
            auditRef,
            where('eventType', '==', filterEventType),
            orderBy('timestamp', 'desc'),
            limit(maxResults)
          );
        }

        const snapshot = await getDocs(q);
        const logsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as AuditLog[];

        setAuditLogs(logsData);
      } catch (err) {
        console.error('Error loading audit logs:', err);
        setError('Failed to load audit logs. Note: Audit logging may not be fully implemented yet.');
      } finally {
        setLoading(false);
      }
    };

    loadAuditLogs();
  }, [user, filterEventType, maxResults]);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('user') || eventType.includes('member')) {
      return <User className="h-5 w-5 text-blue-600" />;
    }
    if (eventType.includes('proposal') || eventType.includes('project')) {
      return <FileText className="h-5 w-5 text-green-600" />;
    }
    if (eventType.includes('role') || eventType.includes('org')) {
      return <Shield className="h-5 w-5 text-purple-600" />;
    }
    return <Calendar className="h-5 w-5 text-gray-600" />;
  };

  const getEventBadge = (eventType: string) => {
    if (eventType.includes('created')) return 'bg-green-100 text-green-800';
    if (eventType.includes('updated') || eventType.includes('changed')) return 'bg-blue-100 text-blue-800';
    if (eventType.includes('deleted') || eventType.includes('removed')) return 'bg-red-100 text-red-800';
    if (eventType.includes('approved')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const eventTypes: AuditEventType[] = [
    'user_created',
    'user_updated',
    'user_deleted',
    'org_created',
    'org_updated',
    'member_invited',
    'member_role_changed',
    'member_removed',
    'proposal_created',
    'proposal_sent',
    'proposal_accepted',
    'proposal_status_changed',
    'project_created',
    'project_updated',
    'project_status_changed',
    'deliverable_approved',
    'deliverable_rejected',
    'change_request_created',
    'change_request_approved',
    'risk_identified',
    'risk_status_changed',
    'document_uploaded',
    'document_approved',
    'decision_logged',
  ];

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">Audit Logs Not Available</p>
            <p className="text-yellow-700 text-sm mt-1">{error}</p>
            <p className="text-yellow-700 text-sm mt-2">
              To enable audit logging, implement writes to the auditLogs collection in server actions and cloud functions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-600 mt-2">Track all system events and user actions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                id="eventType"
                value={filterEventType}
                onChange={(e) => setFilterEventType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Events</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="maxResults" className="block text-sm font-medium text-gray-700 mb-1">
                Max Results
              </label>
              <select
                id="maxResults"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      {auditLogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No audit logs found</h3>
          <p className="text-gray-600 mb-4">
            {filterEventType !== 'all' 
              ? 'Try changing the filter to see more results.'
              : 'Audit logs will appear here once actions are tracked.'}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-2xl mx-auto mt-6">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Implementation Note</h4>
            <p className="text-sm text-blue-800">
              To populate audit logs, add writes to the <code className="bg-blue-100 px-1 rounded">auditLogs</code> collection 
              in your server actions and cloud functions whenever important events occur (proposals created, roles changed, etc.).
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">{getEventIcon(log.eventType)}</div>
                      <div className="ml-3">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEventBadge(log.eventType)}`}>
                            {log.eventType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 mt-1">{log.eventDescription}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.actorEmail || log.actor}</div>
                    {log.actorRole && (
                      <div className="text-xs text-gray-500 capitalize">{log.actorRole}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.targetName ? (
                      <div>
                        <div className="text-sm text-gray-900">{log.targetName}</div>
                        {log.targetType && (
                          <div className="text-xs text-gray-500 capitalize">{log.targetType}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTimestamp(log.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
