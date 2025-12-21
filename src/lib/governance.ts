import { admin } from '@/lib/firebase-admin';
import { db } from '@/lib/db';
import type { UserRole } from '@/types/data-models';
import type { ChangeRequest7, ChangeRequest7Impact, Decision7, Risk7, Risk7Severity, RedFlag7 } from '@/types/data-models';

function ensureImpactComplete(impact?: ChangeRequest7Impact): boolean {
  if (!impact) return false;
  return (
    (impact.timeImpact !== undefined || impact.timelineImpact !== undefined) &&
    impact.costImpact !== undefined &&
    typeof impact.scopeImpact === 'string' && impact.scopeImpact.length > 0 &&
    typeof impact.assessedBy === 'string' && !!impact.assessedAt
  );
}

function deriveRiskSeverity(likelihood: Risk7['likelihood'], impact: Risk7['impact']): Risk7Severity {
  const map: Record<string, number> = { low: 1, medium: 2, high: 3 };
  const score = (map[likelihood] || 1) + (map[impact] || 1);
  return score >= 5 ? 'critical' : score >= 4 ? 'high' : score >= 3 ? 'medium' : 'low';
}

export async function submitChangeRequest(params: {
  orgId: string;
  projectId: string;
  userId: string;
  role: UserRole;
  title: string;
  description: string;
  source: 'client' | 'internal';
  linkedRequestId?: string;
}): Promise<{ id: string }>{
  const ref = db.collection(`orgs/${params.orgId}/projects/${params.projectId}/changeRequests`).doc();
  const cr: ChangeRequest7 = {
    id: ref.id,
    orgId: params.orgId,
    projectId: params.projectId,
    title: params.title,
    description: params.description,
    source: params.source,
    linkedRequestId: params.linkedRequestId,
    status: params.source === 'client' ? 'draft' : 'under_review',
    requestedBy: { userId: params.userId, role: params.role },
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };
  await ref.set(cr);
  await db.collection(`orgs/${params.orgId}/projects/${params.projectId}/activity`).add({
    actorId: params.userId,
    actorRole: params.role,
    action: 'change_request_submitted',
    entityType: 'project',
    entityId: params.projectId,
    metadata: { changeRequestId: ref.id, source: params.source },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
}

export async function moveToReview(orgId: string, projectId: string, changeRequestId: string, byUserId: string) {
  const docRef = db.doc(`orgs/${orgId}/projects/${projectId}/changeRequests/${changeRequestId}`);
  await docRef.update({
    status: 'under_review',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection(`orgs/${orgId}/projects/${projectId}/activity`).add({
    actorId: byUserId,
    actorRole: 'staff',
    action: 'change_request_in_review',
    entityType: 'project',
    entityId: projectId,
    metadata: { changeRequestId },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function recordImpact(orgId: string, projectId: string, changeRequestId: string, impact: ChangeRequest7Impact, byUserId: string) {
  impact.assessedBy = byUserId;
  impact.assessedAt = admin.firestore.FieldValue.serverTimestamp() as any;
  const docRef = db.doc(`orgs/${orgId}/projects/${projectId}/changeRequests/${changeRequestId}`);
  await docRef.update({ impact, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
}

export async function approveChangeRequest(orgId: string, projectId: string, changeRequestId: string, byUserId: string) {
  const docRef = db.doc(`orgs/${orgId}/projects/${projectId}/changeRequests/${changeRequestId}`);
  const snap = await docRef.get();
  const data = snap.data() as ChangeRequest7 | undefined;
  if (!data || !ensureImpactComplete(data.impact)) {
    throw new Error('Impact assessment required before approval.');
  }
  await docRef.update({ status: 'approved', updatedAt: admin.firestore.FieldValue.serverTimestamp(), decisionNotes: 'Approved by admin' });
}

export async function rejectChangeRequest(orgId: string, projectId: string, changeRequestId: string, rationale: string, byUserId: string) {
  const docRef = db.doc(`orgs/${orgId}/projects/${projectId}/changeRequests/${changeRequestId}`);
  await docRef.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp(), decisionNotes: rationale });
}

export async function repriceChangeRequest(orgId: string, projectId: string, changeRequestId: string, payload: { revisedCost: number; revisedTimelineDays?: number; revisedMilestones?: string[]; linkedProposalVersionId?: string }, byUserId: string) {
  const docRef = db.doc(`orgs/${orgId}/projects/${projectId}/changeRequests/${changeRequestId}`);
  const snap = await docRef.get();
  const data = snap.data() as ChangeRequest7 | undefined;
  if (!data || !ensureImpactComplete(data.impact)) {
    throw new Error('Impact assessment required before repricing.');
  }
  await docRef.update({ status: 'repriced', repricing: payload, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
}

export async function logRisk(params: {
  orgId: string; projectId: string; title: string; description: string; category: Risk7['category']; likelihood: Risk7['likelihood']; impact: Risk7['impact']; ownerId: string; createdBy: string;
}): Promise<{ id: string }>{
  const ref = db.collection(`orgs/${params.orgId}/projects/${params.projectId}/risks`).doc();
  const severity = deriveRiskSeverity(params.likelihood, params.impact);
  const risk: Risk7 = {
    id: ref.id,
    orgId: params.orgId,
    projectId: params.projectId,
    title: params.title,
    description: params.description,
    category: params.category,
    likelihood: params.likelihood,
    impact: params.impact,
    severity,
    mitigationPlan: '',
    ownerId: params.ownerId,
    status: 'open',
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };
  await ref.set(risk);
  return { id: ref.id };
}

export async function updateRiskStatus(orgId: string, projectId: string, riskId: string, status: Risk7['status']) {
  const docRef = db.doc(`orgs/${orgId}/projects/${projectId}/risks/${riskId}`);
  const update: any = { status, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  if (status === 'closed') update.closedAt = admin.firestore.FieldValue.serverTimestamp();
  await docRef.update(update);
}

export async function appendDecision(params: {
  orgId: string; projectId: string; title: string; context: string; optionsConsidered?: string[] | string; decisionOutcome: string; decisionType: Decision7['decisionType']; relatedChangeRequestId?: string; decidedBy: string;
}): Promise<{ id: string }>{
  const ref = db.collection(`orgs/${params.orgId}/projects/${params.projectId}/decisions`).doc();
  const decision: Decision7 = {
    id: ref.id,
    orgId: params.orgId,
    projectId: params.projectId,
    title: params.title,
    context: params.context,
    optionsConsidered: params.optionsConsidered,
    decisionOutcome: params.decisionOutcome,
    decisionType: params.decisionType,
    relatedChangeRequestId: params.relatedChangeRequestId,
    decidedBy: params.decidedBy,
    decidedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };
  await ref.set(decision);
  return { id: ref.id };
}

export async function upsertRedFlag(flag: Omit<RedFlag7, 'detectedAt'> & { detectedAt?: any }) {
  const ref = db.collection(`orgs/${flag.orgId}/projects/${flag.projectId}/redFlags`).doc(flag.id);
  await ref.set({ ...flag, detectedAt: flag.detectedAt ?? admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}
