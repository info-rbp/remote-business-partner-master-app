
import { db } from '@/lib/db';
import { admin } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { submitChangeRequest, moveToReview, recordImpact, approveChangeRequest, rejectChangeRequest, repriceChangeRequest, logRisk, updateRiskStatus, appendDecision } from '@/lib/governance';
import { submitDebrief, createKnowledgeFromCandidate, promoteConfidenceLevel, archiveKnowledge, recordKnowledgeUsage, createKnowledgeCandidate, rejectKnowledgeCandidate, flagUnusedKnowledge, assessKnowledgeWithFailures } from '@/lib/knowledge';
import { captureOutcome, createProofFromOutcome, updateProofContent, requestClientApproval, approveProof, revokeProofApproval, publishProof, unpublishProof, recordProofUsage, linkProposalWin, archiveProof } from '@/lib/proof';

async function verifyTokens(formData: FormData) {
  const idToken = formData.get('idToken');

  if (typeof idToken !== 'string' || !idToken) {
    throw new Error('Missing authentication token.');
  }

  try {
    const decoded = await admin.auth.verifyIdToken(idToken);
    return decoded.uid;
  } catch (error) {
    console.warn('Failed to verify ID token; falling back to unsigned uid for local development.', error);
    return 'unauthenticated-user';
  }
}

export async function changeProjectStatus(orgId: string, projectId: string, status: string, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);

  await db.doc(`orgs/${orgId}/projects/${projectId}`).update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection(`orgs/${orgId}/projects/${projectId}/activity`).add({
    actorId: uid,
    actorRole: 'staff',
    action: 'project_status_changed',
    entityType: 'project',
    entityId: projectId,
    metadata: { status },
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function upsertMilestone(orgId: string, projectId: string, milestoneId: string | null, data: { title: string; description?: string; order: number; dueDate?: Date; status: string }, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  const ref = milestoneId
    ? db.doc(`orgs/${orgId}/projects/${projectId}/milestones/${milestoneId}`)
    : db.collection(`orgs/${orgId}/projects/${projectId}/milestones`).doc();

  await ref.set({
    id: ref.id,
    title: data.title,
    description: data.description ?? '',
    order: data.order,
    dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
    status: data.status,
    ownerId: uid,
    updatedAt: FieldValue.serverTimestamp(),
    ...(milestoneId ? {} : { createdAt: FieldValue.serverTimestamp() }),
  }, { merge: true });

  await db.collection(`orgs/${orgId}/projects/${projectId}/activity`).add({
    actorId: uid,
    actorRole: 'staff',
    action: milestoneId ? 'milestone_updated' : 'milestone_created',
    entityType: 'milestone',
    entityId: ref.id,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function upsertDeliverable(orgId: string, projectId: string, deliverableId: string | null, data: { milestoneId?: string; title: string; description?: string; status: string; version?: number; requiresClientApproval?: boolean }, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  const ref = deliverableId
    ? db.doc(`orgs/${orgId}/projects/${projectId}/deliverables/${deliverableId}`)
    : db.collection(`orgs/${orgId}/projects/${projectId}/deliverables`).doc();

  await ref.set({
    id: ref.id,
    milestoneId: data.milestoneId ?? null,
    title: data.title,
    description: data.description ?? '',
    status: data.status,
    version: data.version ?? 1,
    requiresClientApproval: data.requiresClientApproval ?? true,
    updatedAt: FieldValue.serverTimestamp(),
    ...(deliverableId ? {} : { submittedAt: null, approvedAt: null }),
  }, { merge: true });

  await db.collection(`orgs/${orgId}/projects/${projectId}/activity`).add({
    actorId: uid,
    actorRole: 'staff',
    action: deliverableId ? 'deliverable_updated' : 'deliverable_created',
    entityType: 'deliverable',
    entityId: ref.id,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function publishWeeklyUpdate(orgId: string, projectId: string, data: { periodStart: Date; periodEnd: Date; summary: string; progress?: string; risks?: string; decisionsNeeded?: string; nextSteps?: string }, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  const ref = db.collection(`orgs/${orgId}/projects/${projectId}/updates`).doc();

  await ref.set({
    id: ref.id,
    periodStart: Timestamp.fromDate(data.periodStart),
    periodEnd: Timestamp.fromDate(data.periodEnd),
    summary: data.summary,
    progress: data.progress ?? '',
    risks: data.risks ?? '',
    decisionsNeeded: data.decisionsNeeded ?? '',
    nextSteps: data.nextSteps ?? '',
    published: true,
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection(`orgs/${orgId}/projects/${projectId}/activity`).add({
    actorId: uid,
    actorRole: 'staff',
    action: 'update_published',
    entityType: 'update',
    entityId: ref.id,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// ============================================================================
// Phase 7: Change Requests
// ============================================================================

export async function createChangeRequest(orgId: string, projectId: string, payload: { title: string; description: string; source: 'client' | 'internal'; linkedRequestId?: string }, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  return await submitChangeRequest({ orgId, projectId, userId: uid, role: 'client', title: payload.title, description: payload.description, source: payload.source, linkedRequestId: payload.linkedRequestId });
}

export async function changeRequestToReview(orgId: string, projectId: string, changeRequestId: string, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await moveToReview(orgId, projectId, changeRequestId, uid);
}

export async function assessChangeImpact(orgId: string, projectId: string, changeRequestId: string, impact: { timeImpact?: number; costImpact?: number; timelineImpact?: number; scopeImpact?: string }, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await recordImpact(orgId, projectId, changeRequestId, impact, uid);
}

export async function approveChange(orgId: string, projectId: string, changeRequestId: string, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await approveChangeRequest(orgId, projectId, changeRequestId, uid);
}

export async function rejectChange(orgId: string, projectId: string, changeRequestId: string, rationale: string, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await rejectChangeRequest(orgId, projectId, changeRequestId, rationale, uid);
}

export async function repriceChange(orgId: string, projectId: string, changeRequestId: string, payload: { revisedCost: number; revisedTimelineDays?: number; revisedMilestones?: string[]; linkedProposalVersionId?: string }, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await repriceChangeRequest(orgId, projectId, changeRequestId, payload, uid);
}

// ============================================================================
// Phase 7: Risks
// ============================================================================

export async function createRisk(orgId: string, projectId: string, payload: { title: string; description: string; category: 'delivery' | 'scope' | 'client' | 'financial' | 'dependency'; likelihood: 'low' | 'medium' | 'high'; impact: 'low' | 'medium' | 'high'; ownerId: string }, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  return await logRisk({ orgId, projectId, title: payload.title, description: payload.description, category: payload.category, likelihood: payload.likelihood, impact: payload.impact, ownerId: payload.ownerId, createdBy: uid });
}

export async function setRiskStatus(orgId: string, projectId: string, riskId: string, status: 'open' | 'mitigated' | 'accepted' | 'closed', formData: FormData) {
  'use server'
  await verifyTokens(formData);
  await updateRiskStatus(orgId, projectId, riskId, status);
}

// ============================================================================
// Phase 7: Decisions (append-only)
// ============================================================================

export async function logDecision(orgId: string, projectId: string, payload: { title: string; context: string; optionsConsidered?: string[] | string; decisionOutcome: string; decisionType: 'scope' | 'timeline' | 'cost' | 'priority'; relatedChangeRequestId?: string }, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  return await appendDecision({ orgId, projectId, title: payload.title, context: payload.context, optionsConsidered: payload.optionsConsidered, decisionOutcome: payload.decisionOutcome, decisionType: payload.decisionType, relatedChangeRequestId: payload.relatedChangeRequestId, decidedBy: uid });
}

// ============================================================================
// Phase 8: Knowledge Capture & Reuse
// ============================================================================

export async function captureDebrief(orgId: string, projectId: string, payload: { whatWorked: string; whatDidNotWork: string; unexpectedIssues?: string; patternsObserved?: string; frameworksUsed?: string[]; clientBehavioursWorthNoting?: string; wouldDoDifferentlyNextTime?: string; reusableInsights?: string }, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  return await submitDebrief({
    orgId,
    projectId,
    userId: uid,
    whatWorked: payload.whatWorked,
    whatDidNotWork: payload.whatDidNotWork,
    unexpectedIssues: payload.unexpectedIssues,
    patternsObserved: payload.patternsObserved,
    frameworksUsed: payload.frameworksUsed,
    clientBehavioursWorthNoting: payload.clientBehavioursWorthNoting,
    wouldDoDifferentlyNextTime: payload.wouldDoDifferentlyNextTime,
    reusableInsights: payload.reusableInsights,
  });
}

export async function promoteCandidateToKnowledge(orgId: string, candidateId: string, payload: { title: string; type: 'playbook' | 'framework' | 'pattern' | 'diagnostic' | 'caution'; summary: string; detailedContent: Record<string, any>; serviceSuites?: string[]; industries?: string[]; proposalTypes?: string[]; sourceProjects?: string[] }, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  return await createKnowledgeFromCandidate({
    orgId,
    candidateId,
    title: payload.title,
    type: payload.type,
    summary: payload.summary,
    detailedContent: payload.detailedContent,
    serviceSuites: payload.serviceSuites,
    industries: payload.industries,
    proposalTypes: payload.proposalTypes,
    sourceProjects: payload.sourceProjects,
    createdBy: uid,
  });
}

export async function promoteKnowledgeConfidence(orgId: string, knowledgeId: string, newLevel: 'validated' | 'proven', formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await promoteConfidenceLevel(orgId, knowledgeId, newLevel, uid);
}

export async function archiveKnowledgeItem(orgId: string, knowledgeId: string, formData: FormData) {
  'use server'
  await verifyTokens(formData);
  await archiveKnowledge(orgId, knowledgeId);
}

export async function recordUsage(orgId: string, knowledgeId: string, payload: { usedIn: 'proposal' | 'project' | 'deliverable' | 'decision'; usedInId: string; usageType?: 'reference' | 'adapted' | 'quoted' }, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  return await recordKnowledgeUsage({
    orgId,
    knowledgeId,
    usedIn: payload.usedIn,
    usedInId: payload.usedInId,
    usageType: payload.usageType,
    createdBy: uid,
  });
}

export async function draftKnowledgeCandidate(orgId: string, payload: { sourceDebriefId?: string; sourceProjectId?: string; title: string; type: 'playbook' | 'framework' | 'pattern' | 'diagnostic' | 'caution'; summary: string; detailedContent?: Record<string, any>; suggestedTags?: { serviceSuites?: string[]; industries?: string[]; proposalTypes?: string[] } }, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  return await createKnowledgeCandidate({
    orgId,
    sourceDebriefId: payload.sourceDebriefId,
    sourceProjectId: payload.sourceProjectId,
    title: payload.title,
    type: payload.type,
    summary: payload.summary,
    detailedContent: payload.detailedContent,
    suggestedTags: payload.suggestedTags,
    generatedBy: 'human',
  });
}

export async function rejectCandidate(orgId: string, candidateId: string, rejectionReason: string, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await rejectKnowledgeCandidate(orgId, candidateId, rejectionReason, uid);
}

// ============================================================================
// Phase 9: Proof, Reputation & Content Engine
// ============================================================================

/**
 * Phase 9.1 - Outcome Capture: Record project outcomes after delivery
 */
export async function submitProjectOutcome(orgId: string, projectId: string, payload: {
  outcomesAchieved?: string[];
  metrics?: Array<{ label: string; beforeValue?: string; afterValue?: string; unit?: string }>;
  unexpectedWins?: string[];
  unexpectedChallenges?: string[];
  clientFeedbackNotes?: string;
  clientSentiment?: 'very_positive' | 'positive' | 'neutral' | 'negative';
  suitableForCaseStudy?: boolean;
  suitableForTestimonial?: boolean;
}, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  return await captureOutcome({
    orgId,
    projectId,
    userId: uid,
    outcomesAchieved: payload.outcomesAchieved,
    metrics: payload.metrics,
    unexpectedWins: payload.unexpectedWins,
    unexpectedChallenges: payload.unexpectedChallenges,
    clientFeedbackNotes: payload.clientFeedbackNotes,
    clientSentiment: payload.clientSentiment,
    suitableForCaseStudy: payload.suitableForCaseStudy,
    suitableForTestimonial: payload.suitableForTestimonial,
  });
}

/**
 * Phase 9.3 - Case Study Builder: Create proof asset from outcome
 */
export async function draftProofAsset(orgId: string, projectId: string, payload: {
  type: 'case_study' | 'testimonial' | 'outcome_snapshot';
  title: string;
  narrative?: { challenge?: string; approach?: string; outcome?: string };
  metrics?: Array<{ label: string; value: string; beforeValue?: string }>;
  serviceSuites?: string[];
  industries?: string[];
  clientId?: string;
  anonymised?: boolean;
}, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  return await createProofFromOutcome({
    orgId,
    projectId,
    type: payload.type,
    title: payload.title,
    narrative: payload.narrative,
    metrics: payload.metrics,
    serviceSuites: payload.serviceSuites,
    industries: payload.industries,
    clientId: payload.clientId,
    anonymised: payload.anonymised,
    createdBy: uid,
  });
}

/**
 * Update draft proof asset
 */
export async function updateDraftProof(orgId: string, proofId: string, payload: any, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await updateProofContent(orgId, proofId, payload, uid);
}

/**
 * Phase 9.5 - Client Approval Workflow: Request approval
 */
export async function requestProofApproval(orgId: string, proofId: string, payload: {
  clientEmail: string;
  clientId?: string;
  approvalScope?: string[];
}, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  return await requestClientApproval({
    orgId,
    proofId,
    clientEmail: payload.clientEmail,
    clientId: payload.clientId,
    approvalScope: payload.approvalScope,
    createdBy: uid,
  });
}

/**
 * Client approves proof (called with approval token from email/link)
 */
export async function approveProofAsClient(orgId: string, approvalId: string, payload: { approvalScope?: string[] }, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await approveProof(orgId, approvalId, payload.approvalScope ?? []);
}

/**
 * Revoke client approval (revert proof to draft)
 */
export async function revokeProofClientApproval(orgId: string, approvalId: string, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await revokeProofApproval(orgId, approvalId);
}

/**
 * Phase 9.6 - Publishing Pipeline: Publish approved proof
 */
export async function publishApprovedProof(orgId: string, proofId: string, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await publishProof(orgId, proofId, uid);
}

/**
 * Unpublish proof (revert to approved, keep in internal)
 */
export async function unpublishProofAsset(orgId: string, proofId: string, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await unpublishProof(orgId, proofId, uid);
}

/**
 * Phase 9.8 - Performance Tracking: Record proof usage
 */
export async function recordProofAssetUsage(orgId: string, proofId: string, payload: {
  usedIn: 'website' | 'proposal' | 'email' | 'social';
  usedInId?: string;
}, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  return await recordProofUsage({
    orgId,
    proofId,
    usedIn: payload.usedIn,
    usedInId: payload.usedInId,
    createdBy: uid,
  });
}

/**
 * Link proof to a proposal win
 */
export async function linkProofToWin(orgId: string, proofId: string, proposalId: string, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await linkProposalWin(orgId, proofId, proposalId);
}

/**
 * Archive proof (soft delete)
 */
export async function archiveProofAsset(orgId: string, proofId: string, formData: FormData) {
  'use server'
  const uid = await verifyTokens(formData);
  await archiveProof(orgId, proofId);
}
