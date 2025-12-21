'use client';

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface ShareLink {
  token: string;
  createdAt: Date;
  expiresAt: Date;
  active: boolean;
  revokedAt?: Date;
  revokedBy?: string;
  revokeReason?: string;
  snapshotVersion?: string;
}

type ShareLinksProps = {
  proposalId: string;
};

type ShareLinksResponse = {
  shareLinks?: Array<
    Omit<ShareLink, 'createdAt' | 'expiresAt' | 'revokedAt'> & {
      createdAt: string | number | Date;
      expiresAt: string | number | Date;
      revokedAt?: string | number | Date;
    }
  >;
  error?: string;
  message?: string;
};

export function ShareLinks({ proposalId }: ShareLinksProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks();
  }, [proposalId]);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const functions = getFunctions();
      const getLinks = httpsCallable<{ proposalId: string }, ShareLinksResponse>(
        functions,
        'getProposalShareLinks'
      );
      const result = await getLinks({ proposalId });
      const data = result.data || {};

      if (Array.isArray(data.shareLinks)) {
        setLinks(
          data.shareLinks.map((link) => ({
            ...link,
            createdAt: new Date(link.createdAt),
            expiresAt: new Date(link.expiresAt),
            revokedAt: link.revokedAt ? new Date(link.revokedAt) : undefined,
          }))
        );
      } else if (data.error || data.message) {
        setError(data.error || data.message || 'Could not load share links');
      } else {
        setLinks([]);
      }
    } catch (err: any) {
      console.error('Error fetching share links:', err);
      setError('Could not load share links');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (token: string) => {
    if (!confirm('Are you sure you want to revoke this share link? Clients will no longer be able to access it.')) {
      return;
    }

    setRevoking(token);
    setError(null);

    try {
      const functions = getFunctions();
      const revoke = httpsCallable(functions, 'revokeShareLink');
      await revoke({ token, reason: 'Manual revocation by staff' });

      // Refresh the list
      await fetchLinks();
    } catch (err: any) {
      console.error('Error revoking link:', err);
      setError(err.message || 'Failed to revoke share link');
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded text-center">
        <p className="text-sm text-gray-600">Loading share links...</p>
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

  if (!links || links.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded text-center">
        <p className="text-sm text-gray-600">No share links created yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {links.map((link) => {
        const now = new Date();
        const isExpired = link.expiresAt < now;
        const isRevoked = !link.active;

        return (
          <div
            key={link.token}
            className={`p-4 border rounded ${
              isRevoked ? 'bg-gray-50 border-gray-200' : isExpired ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-mono text-xs text-gray-600 break-all">{link.token}</p>
                <div className="flex gap-4 text-xs text-gray-600 mt-2">
                  <span>Created: {link.createdAt.toLocaleDateString()}</span>
                  <span>Expires: {link.expiresAt.toLocaleDateString()}</span>
                  {link.snapshotVersion && <span>Snapshot: {link.snapshotVersion.slice(0, 10)}...</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isRevoked && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">Revoked</span>
                )}
                {isExpired && !isRevoked && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Expired</span>
                )}
                {!isExpired && !isRevoked && (
                  <button
                    onClick={() => handleRevoke(link.token)}
                    disabled={revoking === link.token}
                    className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {revoking === link.token ? 'Revoking...' : 'Revoke'}
                  </button>
                )}
              </div>
            </div>
            {isRevoked && link.revokeReason && (
              <p className="text-xs text-gray-600 mt-2">
                Revoked {link.revokedAt && link.revokedAt.toLocaleString()}: {link.revokeReason}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
