import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Phase 5.7 - Access Logging
 * Logs proposal access events for audit trail and governance
 */

export interface AccessLogEntry {
  id: string;
  proposalId: string;
  orgId: string;
  eventType: 'snapshot_viewed' | 'share_link_viewed' | 'accepted' | 'declined' | 'converted';
  timestamp: admin.firestore.Timestamp;
  ip?: string;
  userAgent?: string;
  accessorId?: string;
  accessorName?: string;
  accessorRole?: 'staff' | 'client' | 'public';
  token?: string; // Share token if applicable
  snapshotVersion?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a proposal access event (called from both server and client)
 * This is a callable function for client-side logging
 */
export const logProposalAccess = functions.https.onCall(async (request) => {
  const { proposalId, eventType, ip, userAgent, snapshotVersion, metadata } = request.data;

  if (!proposalId || !eventType) {
    throw new functions.https.HttpsError('invalid-argument', 'proposalId and eventType are required');
  }

  // Validate access
  const proposalDoc = await db.collection('proposals').doc(proposalId).get();
  if (!proposalDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Proposal not found');
  }

  const logEntry: AccessLogEntry = {
    id: db.collection('proposalAccessLog').doc().id,
    proposalId,
    orgId: proposalDoc.data()?.orgId || 'unknown',
    eventType,
    timestamp: admin.firestore.Timestamp.now(),
    ip,
    userAgent,
    accessorId: request.auth?.uid,
    accessorRole: 'client',
    snapshotVersion,
    metadata,
  };

  await db.collection('proposalAccessLog').doc(logEntry.id).set(logEntry);

  return { success: true, logId: logEntry.id };
});

/**
 * Server-side function to log access (called from Cloud Functions)
 */
export async function logAccess(
  proposalId: string,
  orgId: string,
  eventType: AccessLogEntry['eventType'],
  accessorId?: string,
  accessorName?: string,
  snapshotVersion?: string,
  ip?: string,
  userAgent?: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const logEntry: AccessLogEntry = {
    id: db.collection('proposalAccessLog').doc().id,
    proposalId,
    orgId,
    eventType,
    timestamp: admin.firestore.Timestamp.now(),
    ip,
    userAgent,
    accessorId,
    accessorName,
    accessorRole: accessorId ? 'staff' : 'public',
    snapshotVersion,
    metadata,
  };

  await db.collection('proposalAccessLog').doc(logEntry.id).set(logEntry);
  return logEntry.id;
}

/**
 * Get access history for a proposal
 */
export const getProposalAccessHistory = functions.https.onCall(async (request) => {
  const { proposalId } = request.data;

  if (!proposalId) {
    throw new functions.https.HttpsError('invalid-argument', 'proposalId is required');
  }

  // Verify access
  const proposalDoc = await db.collection('proposals').doc(proposalId).get();
  if (!proposalDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Proposal not found');
  }

  const orgId = proposalDoc.data()?.orgId;

  // Only staff from same org can view
  const orgMember = await db.collection('orgMembers').where('orgId', '==', orgId).where('userId', '==', request.auth?.uid).get();
  if (orgMember.empty && request.auth?.uid !== proposalDoc.data()?.createdBy) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  const logs = await db
    .collection('proposalAccessLog')
    .where('proposalId', '==', proposalId)
    .orderBy('timestamp', 'desc')
    .limit(100)
    .get();

  return {
    history: logs.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
    })),
  };
});
