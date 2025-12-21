/**
 * Phase 9: Proof, Reputation & Content Engine
 * Cloud Functions for outcome triggers, approval workflows, publishing, and audit logging
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

// ============================================================================
// TRIGGER: Project Completion → Outcome Capture Workflow
// ============================================================================

/**
 * When a project reaches "completed" status, trigger outcome capture reminder
 * This ensures outcomes are captured before project is archived
 */
export const onProjectCompletedPhase9 = onDocumentUpdated('orgs/{orgId}/projects/{projectId}', async (event) => {
  const { orgId, projectId } = event.params;
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;
  if (before.status === after.status || after.status !== 'completed') {
    return;
  }

  // Check if outcome has already been captured
  const outcomes = await db.collection(`orgs/${orgId}/projects/${projectId}/outcomes`).get();
  if (outcomes.size > 0) {
    return; // Outcome already captured
  }

  // Log outcome capture needed
  await db.collection(`orgs/${orgId}/projects/${projectId}/activity`).add({
    action: 'outcome_capture_needed',
    actorRole: 'system',
    entityType: 'project',
    entityId: projectId,
    metadata: {
      message: 'Project completed. Please submit outcome capture to enable proof generation.',
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // TODO: Send notification to project stakeholder
  // This could be implemented with SendGrid, Mailgun, or similar
  console.log(`Outcome capture reminder sent for project ${projectId} in org ${orgId}`);
});

// ============================================================================
// TRIGGER: Client Approval Request → Email Notification
// ============================================================================

/**
 * When client approval is requested, send approval email with preview token
 * Includes preview link and approval deadline
 */
export const onClientApprovalRequested = onDocumentCreated('orgs/{orgId}/proofApprovals/{approvalId}', async (event) => {
  const { orgId } = event.params;
  const approval = event.data?.data();

  if (!approval || approval.status !== 'pending') {
    return;
  }

  // Fetch proof details
  const proofSnap = await db.doc(`orgs/${orgId}/proof/${approval.proofId}`).get();
  const proof = proofSnap.data();
  if (!proof) return;

  // TODO: Send email via SendGrid, Mailgun, or Firebase Email Extension
  // Email should include:
  // - Proof preview (with previewToken)
  // - Approval deadline (previewExpiresAt)
  // - Approval link
  // - Instructions on attribution scope

  console.log(`Client approval email queued for ${approval.clientEmail}`);
  console.log(`Preview Token: ${approval.previewToken}`);
  console.log(`Expires: ${approval.previewExpiresAt}`);

  // Log notification activity
  await db.collection(`orgs/${orgId}`).doc('activities').collection('log').add({
    action: 'client_approval_email_sent',
    proofId: approval.proofId,
    clientEmail: approval.clientEmail,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// ============================================================================
// SCHEDULED: Check Approval Token Expiry (Monthly)
// ============================================================================

/**
 * Monthly job to check for expired approval tokens
 * Flags approvals that are past deadline without action
 */
export const checkProofApprovalExpiry = onSchedule('0 9 1 * *', async (context) => {
  const now = Timestamp.now();
  const orgsSnap = await db.collection('orgs').get();

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;
    const approvalsSnap = await db
      .collection(`orgs/${orgId}/proofApprovals`)
      .where('status', '==', 'pending')
      .where('previewExpiresAt', '<', now)
      .get();

    for (const approval of approvalsSnap.docs) {
      const data = approval.data();

      // Mark as expired
      await approval.ref.update({
        status: 'expired',
        expiredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Revert proof to draft and capture title for logging
      const proofRef = db.doc(`orgs/${orgId}/proof/${data.proofId}`);
      const proofSnap = await proofRef.get();
      const proof = proofSnap.data();

      await proofRef.update({
        status: 'draft',
        updatedAt: FieldValue.serverTimestamp(),
      });

      await db.collection('auditLogs').add({
        orgId,
        eventType: 'proof_approval_expired',
        eventDescription: `Approval expired for proof: "${proof?.title ?? data.proofId}"`,
        targetType: 'proof',
        targetId: data.proofId,
        targetName: proof?.title,
        timestamp: FieldValue.serverTimestamp(),
      });

      await db.collection(`orgs/${orgId}/proof/${data.proofId}/activity`).add({
        action: 'approval_expired',
        approvalId: approval.id,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(`Approval ${approval.id} expired for proof ${data.proofId}`);
    }
  }

  console.log('Checked proof approval expiry for all orgs');
});

// ============================================================================
// TRIGGER: Proof Published → Audit Log & Website Rebuild
// ============================================================================

/**
 * When proof is published, log the event and trigger website rebuild
 * This ensures proof appears on the public website
 */
export const onProofPublished = onDocumentUpdated('orgs/{orgId}/proof/{proofId}', async (event) => {
  const { orgId, proofId } = event.params;
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;
  if (before.status === 'published' || after.status !== 'published') {
    return;
  }

  // Stamp publication details
  await db.doc(`orgs/${orgId}/proof/${proofId}`).update({
    publishedAt: after.publishedAt ?? FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Create audit log entry
  await db.collection('auditLogs').add({
    orgId,
    eventType: 'proof_published',
    eventDescription: `Proof published: "${after.title}"`,
    targetType: 'proof',
    targetId: proofId,
    targetName: after.title,
    proofType: after.type,
    visibility: 'public',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    metadata: {
      serviceSuites: after.serviceSuites,
      industries: after.industries,
      anonymised: after.anonymised,
    },
  });

  // Activity trail on proof document
  await db.collection(`orgs/${orgId}/proof/${proofId}/activity`).add({
    action: 'published',
    timestamp: FieldValue.serverTimestamp(),
  });

  // TODO: Trigger website rebuild or refresh cache
  // This could call a webhook to the website to rebuild proof collection
  console.log(`Proof ${proofId} published: "${after.title}"`);
});

// ============================================================================
// TRIGGER: Proof Revoked/Unpublished → Audit Log & Website Update
// ============================================================================

/**
 * When proof is unpublished or approval is revoked, update website and audit log
 */
export const onProofApprovalRevoked = onDocumentUpdated('orgs/{orgId}/proofApprovals/{approvalId}', async (event) => {
  const { orgId } = event.params;
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;
  if (before.status === 'revoked' || after.status !== 'revoked') {
    return;
  }

  const proofRef = db.doc(`orgs/${orgId}/proof/${after.proofId}`);
  const proofSnap = await proofRef.get();
  const proof = proofSnap.data();

  const wasPublished = proof && proof.status === 'published';

  // If proof was published, unpublish it
  if (wasPublished) {
    await proofRef.update({
      status: 'approved',
      visibility: 'internal',
      updatedAt: FieldValue.serverTimestamp(),
    });

    // TODO: Trigger website update to remove proof
    console.log(`Proof ${after.proofId} unpublished due to revoked approval`);
  }

  // Audit log for revocation
  await db.collection('auditLogs').add({
    orgId,
    eventType: 'proof_approval_revoked',
    eventDescription: `Client revoked approval for: "${proof?.title ?? after.proofId}"`,
    targetType: 'proof',
    targetId: after.proofId,
    targetName: proof?.title,
    clientEmail: after.clientEmail,
    timestamp: FieldValue.serverTimestamp(),
    metadata: { wasPublished },
  });

  await db.collection(`orgs/${orgId}/proof/${after.proofId}/activity`).add({
    action: 'approval_revoked',
    createdAt: FieldValue.serverTimestamp(),
    metadata: { wasPublished },
  });
});

// ============================================================================
// TRIGGER: Proof Archived → Cleanup & Audit
// ============================================================================

/**
 * When proof is archived, clean up related records
 */
export const onProofArchived = onDocumentUpdated('orgs/{orgId}/proof/{proofId}', async (event) => {
  const { orgId, proofId } = event.params;
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;
  if (before.status === 'archived' || after.status !== 'archived') {
    return;
  }

  await db.doc(`orgs/${orgId}/proof/${proofId}`).update({
    archivedAt: after.archivedAt ?? FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Audit log
  await db.collection('auditLogs').add({
    orgId,
    eventType: 'proof_archived',
    eventDescription: `Proof archived: "${after.title}"`,
    targetType: 'proof',
    targetId: proofId,
    targetName: after.title,
    timestamp: FieldValue.serverTimestamp(),
  });

  await db.collection(`orgs/${orgId}/proof/${proofId}/activity`).add({
    action: 'archived',
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log(`Proof ${proofId} archived: "${after.title}"`);
});

// ============================================================================
// HELPER: Record Proof Usage Activity
// ============================================================================

/**
 * When proof is recorded as used (e.g., in proposal), log it
 */
export const onProofUsageRecorded = onDocumentCreated('orgs/{orgId}/proofUsage/{usageId}', async (event) => {
  const { orgId } = event.params;
  const usage = event.data?.data();

  if (!usage) return;

  // Activity log for proof usage
  await db.collection(`orgs/${orgId}/proof/${usage.proofId}/activity`).add({
    action: 'proof_used',
    usedIn: usage.usedIn,
    usedInId: usage.usedInId,
    createdBy: usage.createdBy,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Increment usage counters on proof asset (best-effort)
  try {
    await db.doc(`orgs/${orgId}/proof/${usage.proofId}`).update({
      usageCount: FieldValue.increment(1),
      lastUsedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn(`Unable to bump usage for proof ${usage.proofId}`, error);
  }

  console.log(`Proof ${usage.proofId} recorded as used in ${usage.usedIn}`);
});
