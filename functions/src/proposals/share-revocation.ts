import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Phase 5.7 - Share Link Revocation
 * Allows staff to disable or revoke share links
 */

export interface ProposalShare {
  proposalId: string;
  token: string;
  expiresAt: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  createdBy: string;
  active: boolean;
  revokedAt?: admin.firestore.Timestamp;
  revokedBy?: string;
  revokeReason?: string;
  snapshotVersion?: string;
}

/**
 * Revoke a share link by token
 */
export const revokeShareLink = functions.https.onCall(async (request) => {
  const { token, reason } = request.data;

  if (!token) {
    throw new functions.https.HttpsError('invalid-argument', 'token is required');
  }

  // Get the share link
  const shareDoc = await db.collection('proposalShares').doc(token).get();
  if (!shareDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Share link not found');
  }

  const shareData = shareDoc.data() as ProposalShare;

  // Verify authorization: user must be staff from the same org
  const proposalDoc = await db.collection('proposals').doc(shareData.proposalId).get();
  if (!proposalDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Proposal not found');
  }

  const orgId = proposalDoc.data()?.orgId;
  const orgMember = await db
    .collection('orgMembers')
    .where('orgId', '==', orgId)
    .where('userId', '==', request.auth?.uid)
    .where('role', 'in', ['admin', 'staff'])
    .get();

  if (orgMember.empty && request.auth?.uid !== proposalDoc.data()?.createdBy) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized to revoke this share link');
  }

  // Update the share link
  await db.collection('proposalShares').doc(token).update({
    active: false,
    revokedAt: admin.firestore.Timestamp.now(),
    revokedBy: request.auth?.uid,
    revokeReason: reason || 'Manual revocation',
  });

  // Log the revocation
  await db.collection('proposalAccessLog').add({
    proposalId: shareData.proposalId,
    orgId,
    eventType: 'share_link_revoked',
    timestamp: admin.firestore.Timestamp.now(),
    accessorId: request.auth?.uid,
    accessorRole: 'staff',
    token,
    metadata: { reason },
  });

  return { success: true, message: 'Share link revoked' };
});

/**
 * Get all share links for a proposal (staff only)
 */
export const getProposalShareLinks = functions.https.onCall(async (request) => {
  const { proposalId } = request.data;

  if (!proposalId) {
    throw new functions.https.HttpsError('invalid-argument', 'proposalId is required');
  }

  const proposalDoc = await db.collection('proposals').doc(proposalId).get();
  if (!proposalDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Proposal not found');
  }

  const orgId = proposalDoc.data()?.orgId;

  // Verify authorization
  const orgMember = await db
    .collection('orgMembers')
    .where('orgId', '==', orgId)
    .where('userId', '==', request.auth?.uid)
    .where('role', 'in', ['admin', 'staff'])
    .get();

  if (orgMember.empty && request.auth?.uid !== proposalDoc.data()?.createdBy) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  // Get all share links for this proposal
  const shares = await db
    .collection('proposalShares')
    .where('proposalId', '==', proposalId)
    .orderBy('createdAt', 'desc')
    .get();

  return {
    shareLinks: shares.docs.map((doc) => {
      const data = doc.data() as ProposalShare;
      return {
        token: doc.id,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt.toDate(),
        active: data.active,
        revokedAt: data.revokedAt?.toDate(),
        revokedBy: data.revokedBy,
        revokeReason: data.revokeReason,
        snapshotVersion: data.snapshotVersion,
      };
    }),
  };
});
