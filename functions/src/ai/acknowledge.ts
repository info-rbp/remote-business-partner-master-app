/**
 * Callable to acknowledge AI outputs (Phase 12.7)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const acknowledgeAiOutput = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');
  const { orgId, executionId } = request.data || {};
  if (!orgId || !executionId) throw new HttpsError('invalid-argument', 'orgId and executionId required');

  const memberDoc = await db.collection(`orgs/${orgId}/members`).doc(request.auth.uid).get();
  if (!memberDoc.exists || !['admin','staff'].includes(memberDoc.data()?.role)) {
    throw new HttpsError('permission-denied', 'Staff/admin only');
  }

  const ref = db.doc(`orgs/${orgId}/aiExecutions/${executionId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Execution log not found');

  await ref.update({
    humanReviewed: true,
    humanReviewedBy: request.auth.uid,
    humanReviewedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { acknowledged: true };
});
