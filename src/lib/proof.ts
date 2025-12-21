/**
 * Phase 9: Proof, Reputation & Content Engine
 * Server-side helpers for outcome capture, proof creation, approval, and publishing
 */

import { admin } from '@/lib/firebase-admin';
import { db } from '@/lib/db';
import type { UserRole } from '@/types/data-models';
import type {
  ProofAsset9,
  OutcomeCapture9,
  ProofApproval9,
  ProofUsage9,
  ProofType9,
  AttributionType,
} from '@/types/phase9-models';

// ============================================================================
// OUTCOME CAPTURE (Phase 9.2)
// ============================================================================

export async function captureOutcome(params: {
  orgId: string;
  projectId: string;
  userId: string;
  outcomesAchieved?: string[];
  metrics?: Array<{ label: string; beforeValue?: string; afterValue?: string; unit?: string }>;
  unexpectedWins?: string[];
  unexpectedChallenges?: string[];
  clientFeedbackNotes?: string;
  clientSentiment?: 'very_positive' | 'positive' | 'neutral' | 'negative';
  suitableForCaseStudy?: boolean;
  suitableForTestimonial?: boolean;
}): Promise<{ id: string }> {
  const ref = db.collection(`orgs/${params.orgId}/projects/${params.projectId}/outcomes`).doc();
  const outcome: OutcomeCapture9 = {
    id: ref.id,
    orgId: params.orgId,
    projectId: params.projectId,
    outcomesAchieved: params.outcomesAchieved,
    metrics: params.metrics,
    unexpectedWins: params.unexpectedWins,
    unexpectedChallenges: params.unexpectedChallenges,
    clientFeedbackNotes: params.clientFeedbackNotes,
    clientSentiment: params.clientSentiment,
    suitableForCaseStudy: params.suitableForCaseStudy,
    suitableForTestimonial: params.suitableForTestimonial,
    submittedBy: params.userId,
    submittedAt: admin.firestore.FieldValue.serverTimestamp() as any,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };
  await ref.set(outcome);
  await db.collection(`orgs/${params.orgId}/projects/${params.projectId}/activity`).add({
    actorId: params.userId,
    actorRole: 'staff',
    action: 'outcome_captured',
    entityType: 'project',
    entityId: params.projectId,
    metadata: { outcomeId: ref.id },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
}

// ============================================================================
// PROOF ASSET CREATION (Phase 9.3 Case Study Builder)
// ============================================================================

export async function createProofFromOutcome(params: {
  orgId: string;
  projectId: string;
  outcomeId?: string;
  type: ProofType9;
  title: string;
  narrative?: { challenge?: string; approach?: string; outcome?: string };
  metrics?: Array<{ label: string; value: string; beforeValue?: string }>;
  serviceSuites?: string[];
  industries?: string[];
  clientId?: string;
  anonymised?: boolean;
  createdBy: string;
}): Promise<{ id: string }> {
  const ref = db.collection(`orgs/${params.orgId}/proof`).doc();
  const proof: ProofAsset9 = {
    id: ref.id,
    orgId: params.orgId,
    type: params.type,
    title: params.title,
    status: 'draft',
    visibility: 'internal',
    anonymised: params.anonymised ?? false,
    clientId: params.clientId,
    projectId: params.projectId,
    serviceSuites: params.serviceSuites,
    industries: params.industries,
    narrative: params.narrative,
    metrics: params.metrics,
    usageCount: 0,
    createdBy: params.createdBy,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };
  await ref.set(proof);
  return { id: ref.id };
}

// ============================================================================
// PROOF UPDATES & EDITS
// ============================================================================

export async function updateProofContent(
  orgId: string,
  proofId: string,
  updates: Partial<ProofAsset9>,
  byUserId: string
) {
  const ref = db.doc(`orgs/${orgId}/proof/${proofId}`);
  await ref.update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ============================================================================
// CLIENT APPROVAL WORKFLOW (Phase 9.5)
// ============================================================================

export async function requestClientApproval(params: {
  orgId: string;
  proofId: string;
  clientEmail: string;
  clientId?: string;
  approvalScope?: string[]; // e.g., ['website', 'proposals']
  createdBy: string;
}): Promise<{ approvalId: string; approvalToken: string }> {
  const ref = db.collection(`orgs/${params.orgId}/proofApprovals`).doc();
  const approvalToken = `approval_${ref.id}_${Math.random().toString(36).substr(2, 9)}`;
  const approval: ProofApproval9 = {
    id: ref.id,
    orgId: params.orgId,
    proofId: params.proofId,
    clientId: params.clientId || '',
    clientEmail: params.clientEmail,
    status: 'pending',
    previewToken: approvalToken,
    previewExpiresAt: admin.firestore.Timestamp.fromMillis(
      Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    ) as any,
    approvalScope: params.approvalScope,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };
  await ref.set(approval);
  
  // Update proof status
  await db.doc(`orgs/${params.orgId}/proof/${params.proofId}`).update({
    status: 'pending_client_approval',
    approvalRequestToken: approvalToken,
  });

  return { approvalId: ref.id, approvalToken };
}

export async function approveProof(
  orgId: string,
  approvalId: string,
  approvalScope: string[]
) {
  const approvalRef = db.doc(`orgs/${orgId}/proofApprovals/${approvalId}`);
  const approvalSnap = await approvalRef.get();
  const approval = approvalSnap.data() as ProofApproval9 | undefined;
  if (!approval) throw new Error('Approval not found');

  await approvalRef.update({
    status: 'approved',
    approvalScope,
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update proof status
  await db.doc(`orgs/${orgId}/proof/${approval.proofId}`).update({
    status: 'approved',
    approvedByClientAt: admin.firestore.FieldValue.serverTimestamp(),
    approvalScope,
  });
}

export async function revokeProofApproval(orgId: string, approvalId: string) {
  const approvalRef = db.doc(`orgs/${orgId}/proofApprovals/${approvalId}`);
  const approvalSnap = await approvalRef.get();
  const approval = approvalSnap.data() as ProofApproval9 | undefined;
  if (!approval) throw new Error('Approval not found');

  await approvalRef.update({
    status: 'revoked',
    revokedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Unpublish proof if published
  const proofRef = db.doc(`orgs/${orgId}/proof/${approval.proofId}`);
  const proofSnap = await proofRef.get();
  const proof = proofSnap.data() as ProofAsset9 | undefined;
  if (proof?.status === 'published') {
    await proofRef.update({
      status: 'approved', // revert to approved but not published
      publishedAt: null,
    });
  }
}

// ============================================================================
// PUBLISHING (Phase 9.6)
// ============================================================================

export async function publishProof(orgId: string, proofId: string, byUserId: string) {
  const ref = db.doc(`orgs/${orgId}/proof/${proofId}`);
  const snap = await ref.get();
  const proof = snap.data() as ProofAsset9 | undefined;
  if (!proof) throw new Error('Proof not found');
  if (proof.status !== 'approved') {
    throw new Error('Only approved proof can be published');
  }

  await ref.update({
    status: 'published',
    visibility: 'public',
    publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function unpublishProof(orgId: string, proofId: string, byUserId: string) {
  const ref = db.doc(`orgs/${orgId}/proof/${proofId}`);
  await ref.update({
    status: 'approved', // revert to approved
    visibility: 'internal',
    publishedAt: null,
  });
}

// ============================================================================
// PERFORMANCE TRACKING (Phase 9.8)
// ============================================================================

export async function recordProofUsage(params: {
  orgId: string;
  proofId: string;
  usedIn: 'website' | 'proposal' | 'email' | 'social';
  usedInId?: string;
  createdBy: string;
}): Promise<{ id: string }> {
  const ref = db.collection(`orgs/${params.orgId}/proofUsage`).doc();
  const usage: ProofUsage9 = {
    id: ref.id,
    orgId: params.orgId,
    proofId: params.proofId,
    usedIn: params.usedIn,
    usedInId: params.usedInId,
    createdBy: params.createdBy,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };
  await ref.set(usage);

  // Update proof metrics
  const proofRef = db.doc(`orgs/${params.orgId}/proof/${params.proofId}`);
  await proofRef.update({
    usageCount: admin.firestore.FieldValue.increment(1),
    lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { id: ref.id };
}

export async function linkProposalWin(
  orgId: string,
  proofId: string,
  proposalId: string
) {
  const ref = db.doc(`orgs/${orgId}/proof/${proofId}`);
  const snap = await ref.get();
  const proof = snap.data() as ProofAsset9 | undefined;
  if (!proof) throw new Error('Proof not found');

  const wins = proof.linkedWins || [];
  wins.push({
    proposalId,
    winDate: admin.firestore.FieldValue.serverTimestamp() as any,
  });

  await ref.update({ linkedWins: wins });
}

// ============================================================================
// ARCHIVAL & CLEANUP
// ============================================================================

export async function archiveProof(orgId: string, proofId: string) {
  const ref = db.doc(`orgs/${orgId}/proof/${proofId}`);
  await ref.update({
    status: 'archived',
    archivedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
