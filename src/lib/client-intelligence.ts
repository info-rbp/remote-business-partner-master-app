/**
 * Client Intelligence helpers
 * Generate and manage client-facing intelligence snapshots.
 */

import { db } from '@/lib/db';
import { admin } from '@/lib/firebase-admin';
import type { ClientIntelligenceSnapshot } from '@/types/phase13-models';

export async function generateClientIntelligenceSnapshot(params: {
  orgId: string;
  projectId: string;
  generatedBy: 'system' | 'staff';
}): Promise<{ id: string }>{
  const ref = db.collection(`orgs/${params.orgId}/projects/${params.projectId}/clientIntelligence`).doc();

  // Fetch project update and derive client-safe view
  const projectRef = db.doc(`orgs/${params.orgId}/projects/${params.projectId}`);
  const projectSnap = await projectRef.get();
  const project = projectSnap.data() || {};

  const updatesSnap = await db
    .collection(`orgs/${params.orgId}/projects/${params.projectId}/updates`)
    .where('published', '==', true)
    .orderBy('periodEnd', 'desc')
    .limit(1)
    .get();

  const latestUpdate = updatesSnap.docs[0]?.data() || {};

  // Build decisions required from deliverables awaiting approval and change requests awaiting client input
  const deliverablesSnap = await db.collection(`orgs/${params.orgId}/projects/${params.projectId}/deliverables`).get();
  const decisionsRequired: ClientIntelligenceSnapshot['decisionsRequired'] = deliverablesSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((d) => d.requiresClientApproval && ['submitted', 'in_review'].includes(d.status))
    .map((d) => ({
      decisionId: d.id,
      title: `Approve deliverable: ${d.title || d.name}`,
      description: d.clientSummary || 'Please review and approve this deliverable.',
      dueBy: d.dueDate,
    }));

  const changeReqSnap = await db.collection(`orgs/${params.orgId}/projects/${params.projectId}/changeRequests`).get();
  for (const cr of changeReqSnap.docs) {
    const data = cr.data() as any;
    if (data.source === 'client' && ['draft', 'pending'].includes(data.status)) {
      decisionsRequired.push({
        decisionId: cr.id,
        title: data.title || 'Confirm change request',
        description: data.description || 'Provide confirmation or additional information to proceed.',
        dueBy: data.requestedBy?.dueBy,
      });
    }
  }

  // Inputs required from onboarding or linked dependencies
  const inputsRequired: ClientIntelligenceSnapshot['inputsRequired'] = [];
  const requestsSnap = await db.collection(`orgs/${params.orgId}/projects/${params.projectId}/requests`).get();
  for (const r of requestsSnap.docs) {
    const data = r.data() as any;
    if (['open', 'assigned'].includes(data.status)) {
      inputsRequired.push({
        inputId: r.id,
        description: data.description || data.subject || 'Provide requested input',
        linkedDeliverableId: data.linkedDeliverableId,
        dueBy: data.dueDate,
      });
    }
  }

  const snapshot: Omit<ClientIntelligenceSnapshot, 'id'> = {
    orgId: params.orgId,
    projectId: params.projectId,
    generatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
    generatedBy: params.generatedBy,
    currentStateSummary: latestUpdate.summary || project.status || 'In progress',
    decisionsRequired,
    inputsRequired,
    nextSteps: Array.isArray(latestUpdate.nextSteps) ? latestUpdate.nextSteps : (latestUpdate.nextSteps ? [latestUpdate.nextSteps] : []),
    recentProgressSummary: latestUpdate.progressNarrative || latestUpdate.progress || undefined,
    published: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  await ref.set({ id: ref.id, ...snapshot });
  return { id: ref.id };
}

export async function publishClientIntelligenceSnapshot(params: { orgId: string; projectId: string; snapshotId: string; publish: boolean }) {
  const ref = db.doc(`orgs/${params.orgId}/projects/${params.projectId}/clientIntelligence/${params.snapshotId}`);
  await ref.update({ published: params.publish, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
}
