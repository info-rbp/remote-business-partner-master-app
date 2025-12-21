'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getDb } from '@/lib/firebase-client';
import { Proposal } from '@/types/data-models';
import { FileText, Clock, DollarSign, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

export default function PortalSharePage() {
  const params = useParams();
  const token = params.token as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadProposal = async () => {
      try {
        const db = getDb();
        
        // Search across all orgs for a proposal with this share token
        // Note: This is a simplified implementation. In production, you might want to:
        // 1. Use a cloud function to validate the token
        // 2. Have a dedicated share links collection at the root level
        // 3. Implement proper token expiry checking
        
        // For now, we'll search in a specific org (this would need the orgId)
        // This is a limitation that should be addressed in production
        setError('Share link functionality requires additional implementation for cross-org token lookup. Please use the main portal with authentication.');
        setLoading(false);
        
      } catch (err) {
        console.error('Error loading shared content:', err);
        setError('Failed to load shared content. The link may be invalid or expired.');
        setLoading(false);
      }
    };

    loadProposal();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl p-8">
          <div className="h-8 bg-gray-700 rounded w-1/2"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="bg-red-900 border border-red-700 rounded-lg p-6 max-w-lg text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Unable to Load Content</h2>
          <p className="text-red-200 mb-4">{error}</p>
          <div className="bg-red-800 rounded p-4 text-left text-sm text-red-100">
            <p className="font-semibold mb-2">Implementation Note:</p>
            <p>
              To enable public share links, implement:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Root-level shareLinks collection in Firestore</li>
              <li>Cloud function to validate and serve shared content</li>
              <li>Token expiry validation</li>
              <li>View count tracking</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-lg text-center">
          <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Content Not Found</h2>
          <p className="text-gray-400">
            This share link may have expired or been removed.
          </p>
        </div>
      </div>
    );
  }

  // This would render the actual proposal content
  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-8">
        <div className="bg-gray-800 rounded-lg p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">{proposal.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Version {proposal.version}
              </span>
              <span className="flex items-center capitalize">
                <Clock className="h-4 w-4 mr-1" />
                {proposal.status}
              </span>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">Executive Summary</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{proposal.executiveSummary}</p>
          </div>

          {/* Scope */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">Scope of Work</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{proposal.scope}</p>
          </div>

          {/* Pricing */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Investment</h2>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Amount</span>
              <span className="text-2xl font-bold text-white">
                {proposal.pricing.currency} {proposal.pricing.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
