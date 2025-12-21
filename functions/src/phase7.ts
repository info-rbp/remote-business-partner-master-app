import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentUpdated, onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

const db = admin.firestore();

function daysAgo(n: number) {
  return Date.now() - n * 86400000;
}

async function computeProjectRedFlags(orgId: string, projectId: string) {
  const now = Date.now();
  const flags: Array<{ id: string; level: 'info' | 'warning' | 'critical'; source: 'project' | 'milestone' | 'deliverable'; sourceId?: string; rule: string; message: string }> = [];

  // Milestones overdue
  const msSnap = await db.collection(`orgs/${orgId}/projects/${projectId}/milestones`).get();
  msSnap.forEach((doc) => {
    const d = doc.data();
    if (d.dueDate && d.status !== 'complete') {
      const dueMs = d.dueDate.toMillis?.() ?? 0;
      if (dueMs && dueMs < now) {
        flags.push({ id: `ms_overdue_${doc.id}`, level: 'warning', source: 'milestone', sourceId: doc.id, rule: 'milestone_overdue', message: `Milestone ${d.title} overdue` });
      }
    }
  });

  // Deliverable stuck: changes_requested many times (approx via version)
  const delSnap = await db.collection(`orgs/${orgId}/projects/${projectId}/deliverables`).get();
  delSnap.forEach((doc) => {
    const d = doc.data();
    const version = Number(d.version || 1);
    if (d.status === 'changes_requested' && version >= 3) {
      flags.push({ id: `deliverable_stuck_${doc.id}`, level: 'warning', source: 'deliverable', sourceId: doc.id, rule: 'deliverable_stuck', message: `Deliverable ${d.title} stuck in changes_requested` });
    }
  });

  // Client inactive: last client action older than X days
  const actSnap = await db.collection(`orgs/${orgId}/projects/${projectId}/activity`).where('actorRole', '==', 'client').orderBy('createdAt', 'desc').limit(1).get();
  const lastClientAction = actSnap.docs[0]?.data()?.createdAt?.toMillis?.() ?? 0;
  if (!lastClientAction || lastClientAction < daysAgo(7)) {
    flags.push({ id: `client_inactive`, level: 'info', source: 'project', rule: 'client_inactive', message: 'Client inactive for 7+ days' });
  }

  // Weekly update not published on schedule
  const updSnap = await db.collection(`orgs/${orgId}/projects/${projectId}/updates`).orderBy('periodEnd', 'desc').limit(1).get();
  const latestUpdate = updSnap.docs[0]?.data();
  const published = latestUpdate?.published;
  const periodEndMs = latestUpdate?.periodEnd?.toMillis?.() ?? 0;
  if (!published || periodEndMs < daysAgo(7)) {
    flags.push({ id: `update_missing`, level: 'info', source: 'project', rule: 'update_missing', message: 'Weekly update missing or stale' });
  }

  // Unresolved change requests accumulating
  const crSnap = await db.collection(`orgs/${orgId}/projects/${projectId}/changeRequests`).where('status', 'in', ['draft', 'under_review']).get();
  if (crSnap.size >= 3) {
    flags.push({ id: `unresolved_changes`, level: 'warning', source: 'project', rule: 'unresolved_changes', message: 'Multiple change requests pending resolution' });
  }

  // Write flags
  const batch = db.batch();
  for (const f of flags) {
    const ref = db.collection(`orgs/${orgId}/projects/${projectId}/redFlags`).doc(f.id);
    batch.set(ref, {
      id: f.id,
      orgId,
      projectId,
      level: f.level,
      source: f.source,
      sourceId: f.sourceId || null,
      rule: f.rule,
      message: f.message,
      detectedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();
}

export const checkRedFlags = onSchedule({ schedule: 'every 24 hours' }, async () => {
  const orgs = await db.collection('orgs').get();
  for (const orgDoc of orgs.docs) {
    const orgId = orgDoc.id;
    const projects = await db.collection(`orgs/${orgId}/projects`).get();
    for (const p of projects.docs) {
      await computeProjectRedFlags(orgId, p.id);
    }
  }
});

// Escalate Phase 6 client requests into change requests (auto-draft)
export const onClientRequestCreated = onDocumentCreated('orgs/{orgId}/projects/{projectId}/requests/{requestId}', async (event) => {
  const { orgId, projectId, requestId } = event.params;
  const data = event.data?.data();
  if (!data) return;
  const shouldEscalate = data.submittedBy === 'client' && data.type === 'request';
  if (!shouldEscalate) return;
  const crRef = db.collection(`orgs/${orgId}/projects/${projectId}/changeRequests`).doc();
  await crRef.set({
    id: crRef.id,
    orgId,
    projectId,
    title: `Client request ${requestId}`,
    description: data.description,
    source: 'client',
    linkedRequestId: requestId,
    status: 'draft',
    requestedBy: { userId: data.createdBy || 'client', role: 'client' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// Auto-suggest change request when deliverable revisions exceed threshold
export const onDeliverableUpdated = onDocumentUpdated('orgs/{orgId}/projects/{projectId}/deliverables/{deliverableId}', async (event) => {
  const { orgId, projectId, deliverableId } = event.params;
  const after = event.data?.after.data();
  const before = event.data?.before.data();
  if (!after || !before) return;
  const version = Number(after.version || 1);
  if (after.status === 'changes_requested' && version >= 3 && before.version !== after.version) {
    const crRef = db.collection(`orgs/${orgId}/projects/${projectId}/changeRequests`).doc();
    await crRef.set({
      id: crRef.id,
      orgId,
      projectId,
      title: `Revisions exceed threshold for ${deliverableId}`,
      description: `Auto-suggested change request due to repeated changes on deliverable ${deliverableId}`,
      source: 'internal',
      status: 'under_review',
      requestedBy: { userId: 'system', role: 'staff' },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});

// Audit: change requests
export const onChangeRequestWrite = onDocumentCreated('orgs/{orgId}/projects/{projectId}/changeRequests/{crId}', async (event) => {
  const { orgId, projectId, crId } = event.params;
  const data = event.data?.data();
  if (!data) return;
  await db.collection('auditLogs').add({
    orgId,
    eventType: 'change_request_created',
    eventDescription: `Change request created: ${data.title}`,
    actor: data.requestedBy?.userId || 'unknown',
    actorRole: data.requestedBy?.role || 'client',
    targetType: 'change_request',
    targetId: crId,
    targetName: data.title,
    metadata: { projectId },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// Audit: risks write
export const onRiskCreated = onDocumentCreated('orgs/{orgId}/projects/{projectId}/risks/{riskId}', async (event) => {
  const { orgId, projectId, riskId } = event.params;
  const data = event.data?.data();
  if (!data) return;
  await db.collection('auditLogs').add({
    orgId,
    eventType: 'risk_identified',
    eventDescription: `Risk logged: ${data.title}`,
    actor: data.ownerId || 'unknown',
    actorRole: 'staff',
    targetType: 'risk',
    targetId: riskId,
    targetName: data.title,
    metadata: { projectId, severity: data.severity },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// Audit: decisions append
export const onDecisionCreated = onDocumentCreated('orgs/{orgId}/projects/{projectId}/decisions/{decisionId}', async (event) => {
  const { orgId, projectId, decisionId } = event.params;
  const data = event.data?.data();
  if (!data) return;
  await db.collection('auditLogs').add({
    orgId,
    eventType: 'decision_logged',
    eventDescription: `Decision logged: ${data.title}`,
    actor: data.decidedBy || 'unknown',
    actorRole: 'staff',
    targetType: 'decision',
    targetId: decisionId,
    targetName: data.title,
    metadata: { projectId, relatedChangeRequestId: data.relatedChangeRequestId },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});
