/**
 * Phase 13: Client Self-Service Intelligence
 * Functions to generate and manage client intelligence snapshots.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Manual generation by staff/admin
export const generateClientIntelligence = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');
  const { orgId, projectId } = request.data;
  if (!orgId || !projectId) throw new HttpsError('invalid-argument', 'orgId and projectId required');

  const memberDoc = await db.collection(`orgs/${orgId}/members`).doc(request.auth.uid).get();
  if (!memberDoc.exists || !['admin', 'staff'].includes(memberDoc.data()?.role)) {
    throw new HttpsError('permission-denied', 'Staff only');
  }

  const ref = db.collection(`orgs/${orgId}/projects/${projectId}/clientIntelligence`).doc();

  // Reuse server-side derivation implemented here (avoid frontend mutation)
  const projectRef = db.doc(`orgs/${orgId}/projects/${projectId}`);
  const projectSnap = await projectRef.get();
  const project = projectSnap.data() || {};

  const updatesSnap = await db
    .collection(`orgs/${orgId}/projects/${projectId}/updates`)
    .where('published', '==', true)
    .orderBy('periodEnd', 'desc')
    .limit(1)
    .get();
  const latestUpdate = updatesSnap.docs[0]?.data() || {};

  const deliverablesSnap = await db.collection(`orgs/${orgId}/projects/${projectId}/deliverables`).get();
  const decisionsRequired = deliverablesSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((d) => d.requiresClientApproval && ['submitted', 'in_review'].includes(d.status))
    .map((d) => ({
      decisionId: d.id,
      title: `Approve deliverable: ${d.title || d.name}`,
      description: d.clientSummary || 'Please review and approve this deliverable.',
      dueBy: d.dueDate,
    }));

  const requestsSnap = await db.collection(`orgs/${orgId}/projects/${projectId}/requests`).get();
  const inputsRequired = requestsSnap.docs
    .map((r) => ({ id: r.id, ...(r.data() as any) }))
    .filter((r) => ['open', 'assigned'].includes(r.status))
    .map((r) => ({
      inputId: r.id,
      description: r.description || r.subject || 'Provide requested input',
      linkedDeliverableId: r.linkedDeliverableId,
      dueBy: r.dueDate,
    }));

  const snapshot = {
    id: ref.id,
    orgId,
    projectId,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    generatedBy: 'staff',
    currentStateSummary: latestUpdate.summary || project.status || 'In progress',
    decisionsRequired,
    inputsRequired,
    nextSteps: Array.isArray(latestUpdate.nextSteps) ? latestUpdate.nextSteps : (latestUpdate.nextSteps ? [latestUpdate.nextSteps] : []),
    recentProgressSummary: latestUpdate.progressNarrative || latestUpdate.progress || undefined,
    published: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ref.set(snapshot);

  await db.collection(`orgs/${orgId}/auditLogs`).add({
    orgId,
    eventType: 'client_intelligence_generated',
    eventDescription: `Client intelligence snapshot created for project ${projectId}`,
    actor: request.auth.uid,
    targetType: 'project',
    targetId: projectId,
    metadata: { snapshotId: ref.id },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { snapshotId: ref.id };
});

// Auto-generate when a weekly update is published
export const onUpdatePublishedGenerateClientIntelligence = onDocumentUpdated('orgs/{orgId}/projects/{projectId}/updates/{updateId}', async (event) => {
  const { orgId, projectId } = event.params as any;
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;
  const wasPublished = !!before.published;
  const isPublished = !!after.published;
  if (!wasPublished && isPublished) {
    const ref = db.collection(`orgs/${orgId}/projects/${projectId}/clientIntelligence`).doc();
    const snapshot = {
      id: ref.id,
      orgId,
      projectId,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedBy: 'system',
      currentStateSummary: after.summary || 'Update published',
      decisionsRequired: [],
      inputsRequired: [],
      nextSteps: Array.isArray(after.nextSteps) ? after.nextSteps : (after.nextSteps ? [after.nextSteps] : []),
      recentProgressSummary: after.progressNarrative || after.progress || undefined,
      published: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(snapshot);
    await db.collection(`orgs/${orgId}/auditLogs`).add({
      orgId,
      eventType: 'client_intelligence_generated',
      eventDescription: `Auto-generated client intelligence snapshot from update ${event.params.updateId}`,
      actor: 'system',
      targetType: 'project',
      targetId: projectId,
      metadata: { snapshotId: ref.id },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});
