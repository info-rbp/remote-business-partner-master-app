import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logProposalAccepted } from '../audit-logging';

const db = admin.firestore();

export const acceptProposal = onCall(async (request) => {
  const { token, name, role, confirm } = request.data || {};
  const ip = request.rawRequest?.headers['x-forwarded-for'] || request.rawRequest?.ip;

  if (!token || !name || !role || !confirm) {
    throw new HttpsError('invalid-argument', 'token, name, role, and confirm are required');
  }

  // Lookup share token
  const shareDoc = await db.collection('proposalShares').doc(token).get();
  if (!shareDoc.exists) throw new HttpsError('not-found', 'Share link not found');
  const share = shareDoc.data() as any;

  // Load proposal + snapshot
  const proposalRef = db.collection('proposals').doc(share.proposalId);
  const proposalDoc = await proposalRef.get();
  if (!proposalDoc.exists) throw new HttpsError('not-found', 'Proposal not found');
  const proposal = proposalDoc.data() as any;

  const version = share.snapshotVersion || proposal.currentSnapshotVersion;
  if (!version) throw new HttpsError('failed-precondition', 'No snapshot version available');

  const snapDoc = await db.collection(`proposals/${share.proposalId}/snapshots`).doc(version).get();
  if (!snapDoc.exists) throw new HttpsError('not-found', 'Snapshot not found');

  // Create acceptance record
  const acceptedAt = admin.firestore.FieldValue.serverTimestamp();
  const acceptanceRef = db.collection(`proposals/${share.proposalId}/acceptances`).doc();

  await acceptanceRef.set({
    token,
    name,
    role,
    ip: Array.isArray(ip) ? ip[0] : ip,
    acceptedAt,
    snapshotVersion: version,
  });

  // Update proposal status
  await proposalRef.set({
    status: 'accepted',
    acceptedAt,
    acceptedByName: name,
    acceptedByRole: role,
    lastShareToken: token,
  }, { merge: true });

  // Write audit log using utility
  await logProposalAccepted({
    orgId: proposal.orgId || 'unknown',
    proposalId: share.proposalId,
    proposalTitle: proposal.title,
    acceptedBy: name,
    acceptedByRole: 'client',
    snapshotVersion: version,
    ip: Array.isArray(ip) ? ip[0] : ip,
    metadata: { token },
  });

  // Notify internal (basic log; hook integration here)
  await db.collection('alerts').add({
    type: 'proposal-accepted',
    severity: 'info',
    orgId: proposal.orgId || 'unknown',
    proposalId: share.proposalId,
    message: `Proposal accepted by ${name}`,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'open',
  });

  return { success: true, snapshotVersion: version };
});
