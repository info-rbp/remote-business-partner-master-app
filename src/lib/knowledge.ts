/**
 * Phase 8: Knowledge Capture, Extraction, Review, and Reuse
 * Server-side helpers for structured insight management
 */

import { admin } from '@/lib/firebase-admin';
import { db } from '@/lib/db';
import type { UserRole } from '@/types/data-models';
import type {
  KnowledgeItem8,
  KnowledgeConfidence,
  Debrief8,
  KnowledgeCandidate8,
  KnowledgeUsage8,
  KnowledgeHealthCheck,
} from '@/types/phase8-models';

// ============================================================================
// DEBRIEF CAPTURE
// ============================================================================

export async function submitDebrief(params: {
  orgId: string;
  projectId: string;
  userId: string;
  whatWorked: string;
  whatDidNotWork: string;
  unexpectedIssues?: string;
  patternsObserved?: string;
  frameworksUsed?: string[];
  clientBehavioursWorthNoting?: string;
  wouldDoDifferentlyNextTime?: string;
  reusableInsights?: string;
}): Promise<{ id: string }> {
  const ref = db.collection(`orgs/${params.orgId}/projects/${params.projectId}/debriefs`).doc();
  const debrief: Debrief8 = {
    id: ref.id,
    orgId: params.orgId,
    projectId: params.projectId,
    whatWorked: params.whatWorked,
    whatDidNotWork: params.whatDidNotWork,
    unexpectedIssues: params.unexpectedIssues,
    patternsObserved: params.patternsObserved,
    frameworksUsed: params.frameworksUsed,
    clientBehavioursWorthNoting: params.clientBehavioursWorthNoting,
    wouldDoDifferentlyNextTime: params.wouldDoDifferentlyNextTime,
    reusableInsights: params.reusableInsights,
    submittedBy: params.userId,
    submittedAt: admin.firestore.FieldValue.serverTimestamp() as any,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };
  await ref.set(debrief);
  await db.collection(`orgs/${params.orgId}/projects/${params.projectId}/activity`).add({
    actorId: params.userId,
    actorRole: 'staff',
    action: 'debrief_submitted',
    entityType: 'project',
    entityId: params.projectId,
    metadata: { debriefId: ref.id },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
}

// ============================================================================
// KNOWLEDGE CREATION & MANAGEMENT
// ============================================================================

export async function createKnowledgeFromCandidate(params: {
  orgId: string;
  candidateId: string;
  title: string;
  type: KnowledgeItem8['type'];
  summary: string;
  detailedContent: KnowledgeItem8['detailedContent'];
  serviceSuites?: string[];
  industries?: string[];
  proposalTypes?: string[];
  sourceProjects?: string[];
  createdBy: string;
  sourceDebriefId?: string;
}): Promise<{ id: string }> {
  const ref = db.collection(`orgs/${params.orgId}/knowledge`).doc();
  const knowledge: KnowledgeItem8 = {
    id: ref.id,
    orgId: params.orgId,
    title: params.title,
    type: params.type,
    summary: params.summary,
    detailedContent: params.detailedContent,
    serviceSuites: params.serviceSuites,
    industries: params.industries,
    proposalTypes: params.proposalTypes,
    sourceProjects: params.sourceProjects,
    confidenceLevel: 'draft',
    createdBy: params.createdBy,
    usageCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };
  await ref.set(knowledge);
  const candidateRef = db.doc(`orgs/${params.orgId}/knowledgeCandidates/${params.candidateId}`);
  await candidateRef.update({ approvedKnowledgeId: ref.id, status: 'approved' });
  return { id: ref.id };
}

export async function promoteConfidenceLevel(
  orgId: string,
  knowledgeId: string,
  newLevel: Exclude<KnowledgeConfidence, 'draft'>,
  byUserId: string
) {
  const ref = db.doc(`orgs/${orgId}/knowledge/${knowledgeId}`);
  const snap = await ref.get();
  const current = snap.data() as KnowledgeItem8 | undefined;
  if (!current) throw new Error('Knowledge not found');
  const hierarchy = { draft: 0, validated: 1, proven: 2 };
  if (hierarchy[newLevel] <= hierarchy[current.confidenceLevel]) {
    throw new Error('Confidence level can only increase');
  }
  await ref.update({
    confidenceLevel: newLevel,
    reviewedBy: byUserId,
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function archiveKnowledge(orgId: string, knowledgeId: string) {
  const ref = db.doc(`orgs/${orgId}/knowledge/${knowledgeId}`);
  await ref.update({
    archivedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ============================================================================
// KNOWLEDGE USAGE TRACKING
// ============================================================================

export async function recordKnowledgeUsage(params: {
  orgId: string;
  knowledgeId: string;
  usedIn: 'proposal' | 'project' | 'deliverable' | 'decision';
  usedInId: string;
  usageType?: 'reference' | 'adapted' | 'quoted';
  createdBy: string;
}): Promise<{ id: string }> {
  const ref = db.collection(`orgs/${params.orgId}/knowledgeUsage`).doc();
  const usage: KnowledgeUsage8 = {
    id: ref.id,
    orgId: params.orgId,
    knowledgeId: params.knowledgeId,
    usedIn: params.usedIn,
    usedInId: params.usedInId,
    usageType: params.usageType ?? 'reference',
    createdBy: params.createdBy,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };
  await ref.set(usage);
  // Update knowledgeItem usageCount
  const kRef = db.doc(`orgs/${params.orgId}/knowledge/${params.knowledgeId}`);
  await kRef.update({
    usageCount: admin.firestore.FieldValue.increment(1),
    lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
}

// ============================================================================
// KNOWLEDGE CANDIDATES (AI-generated, awaiting review)
// ============================================================================

export async function createKnowledgeCandidate(params: {
  orgId: string;
  sourceDebriefId?: string;
  sourceProjectId?: string;
  title: string;
  type: KnowledgeItem8['type'];
  summary: string;
  detailedContent?: Record<string, any>;
  suggestedTags?: {
    serviceSuites?: string[];
    industries?: string[];
    proposalTypes?: string[];
  };
  generatedBy: 'ai' | 'human';
}): Promise<{ id: string }> {
  const ref = db.collection(`orgs/${params.orgId}/knowledgeCandidates`).doc();
  const candidate: KnowledgeCandidate8 = {
    id: ref.id,
    orgId: params.orgId,
    sourceDebriefId: params.sourceDebriefId,
    sourceProjectId: params.sourceProjectId,
    title: params.title,
    type: params.type,
    summary: params.summary,
    detailedContent: params.detailedContent,
    suggestedTags: params.suggestedTags,
    confidenceSuggestion: 'draft',
    generatedBy: params.generatedBy,
    status: 'pending-review',
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };
  await ref.set(candidate);
  return { id: ref.id };
}

export async function rejectKnowledgeCandidate(
  orgId: string,
  candidateId: string,
  rejectionReason: string,
  byUserId: string
) {
  const ref = db.doc(`orgs/${orgId}/knowledgeCandidates/${candidateId}`);
  await ref.update({
    status: 'rejected',
    rejectionReason,
    reviewedBy: byUserId,
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ============================================================================
// HEALTH MONITORING
// ============================================================================

export async function flagUnusedKnowledge(
  orgId: string,
  knowledgeId: string,
  daysThreshold: number = 90
): Promise<KnowledgeHealthCheck | null> {
  const ref = db.doc(`orgs/${orgId}/knowledge/${knowledgeId}`);
  const snap = await ref.get();
  const data = snap.data() as KnowledgeItem8 | undefined;
  if (!data || data.archivedAt) return null;
  const lastUsed = data.lastUsedAt?.toMillis?.() ?? 0;
  const now = Date.now();
  const daysSinceUsed = (now - lastUsed) / (1000 * 60 * 60 * 24);
  if (daysSinceUsed > daysThreshold) {
    return {
      orgId,
      knowledgeId,
      knowledgeTitle: data.title,
      unusedForDaysThreshold: daysThreshold,
      flaggedForReview: true,
      suggestedAction: 'review',
      checkRunAt: admin.firestore.FieldValue.serverTimestamp() as any,
    };
  }
  return null;
}

export async function assessKnowledgeWithFailures(
  orgId: string,
  knowledgeId: string,
  failedProjectIds: string[] = []
): Promise<KnowledgeHealthCheck> {
  const ref = db.doc(`orgs/${orgId}/knowledge/${knowledgeId}`);
  const snap = await ref.get();
  const data = snap.data() as KnowledgeItem8 | undefined;
  if (!data) throw new Error('Knowledge not found');
  return {
    orgId,
    knowledgeId,
    knowledgeTitle: data.title,
    unusedForDaysThreshold: 90,
    flaggedForReview: failedProjectIds.length > 0,
    associatedFailures: failedProjectIds.length > 0 ? failedProjectIds : undefined,
    suggestedAction: failedProjectIds.length > 0 ? 'review' : undefined,
    checkRunAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };
}
