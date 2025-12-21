/**
 * Phase 11: Operating Rhythm & Internal Management
 * Server-side helpers for summaries, dashboards, and decision tracking
 */

import { admin } from '@/lib/firebase-admin';
import { db } from '@/lib/db';
import type { OperatingSummary, WeeklyOperatingView, OperatingDecision, OperatingNotification } from '@/types/phase11-models';

// ============================================================================
// OPERATING SUMMARY GENERATION & MANAGEMENT
// ============================================================================

export async function createOperatingSummary(params: {
  orgId: string;
  type: 'weekly' | 'monthly' | 'quarterly';
  snapshot: OperatingSummary['snapshot'];
  generatedBy: string;
}): Promise<{ id: string }> {
  const now = admin.firestore.Timestamp.now() as any;
  const ref = db.collection(`orgs/${params.orgId}/operatingSummaries`).doc();

  // Calculate period dates
  const periodStart = new Date(now.toDate());
  const periodEnd = new Date(now.toDate());

  if (params.type === 'weekly') {
    periodStart.setDate(periodStart.getDate() - periodStart.getDay()); // Monday
    periodEnd.setDate(periodStart.getDate() + 6); // Sunday
  } else if (params.type === 'monthly') {
    periodStart.setDate(1);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(0);
  } else if (params.type === 'quarterly') {
    const q = Math.floor(periodStart.getMonth() / 3);
    periodStart.setMonth(q * 3, 1);
    periodEnd.setMonth((q + 1) * 3, 0);
  }

  const summary: OperatingSummary = {
    id: ref.id,
    orgId: params.orgId,
    type: params.type,
    periodStart: admin.firestore.Timestamp.fromDate(periodStart) as any,
    periodEnd: admin.firestore.Timestamp.fromDate(periodEnd) as any,
    generatedAt: now,
    generatedBy: 'system',
    generatedByUserId: params.generatedBy,
    snapshot: params.snapshot,
    highlights: [],
    concerns: [],
    decisionsRequired: [],
    actionsAgreed: [],
    createdAt: now,
    updatedAt: now,
    isFinalized: false,
  };

  await ref.set(summary);

  // Create notification that summary is ready
  await createNotification({
    orgId: params.orgId,
    notificationType: 'weekly_summary_ready',
    summaryId: ref.id,
    title: `${params.type.charAt(0).toUpperCase() + params.type.slice(1)} operating summary ready`,
    description: `A new ${params.type} summary has been generated and awaits your review.`,
    severity: 'info',
  });

  return { id: ref.id };
}

export async function updateOperatingSummary(params: {
  orgId: string;
  summaryId: string;
  highlights?: string[];
  concerns?: string[];
  decisionsRequired?: OperatingSummary['decisionsRequired'];
  actionsAgreed?: OperatingSummary['actionsAgreed'];
}): Promise<void> {
  const ref = db.doc(`orgs/${params.orgId}/operatingSummaries/${params.summaryId}`);
  const snap = await ref.get();
  const summary = snap.data() as OperatingSummary | undefined;

  if (!summary) throw new Error('Operating summary not found');
  if (summary.isFinalized) throw new Error('Cannot edit finalized summary');

  const updates: any = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  if (params.highlights) updates.highlights = params.highlights;
  if (params.concerns) updates.concerns = params.concerns;
  if (params.decisionsRequired) updates.decisionsRequired = params.decisionsRequired;
  if (params.actionsAgreed) updates.actionsAgreed = params.actionsAgreed;

  await ref.update(updates);
}

export async function acknowledgeOperatingSummary(params: {
  orgId: string;
  summaryId: string;
  acknowledgedBy: string;
}): Promise<void> {
  const ref = db.doc(`orgs/${params.orgId}/operatingSummaries/${params.summaryId}`);
  const snap = await ref.get();
  const summary = snap.data() as OperatingSummary | undefined;

  if (!summary) throw new Error('Operating summary not found');

  // Finalize: summary becomes immutable
  await ref.update({
    acknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
    acknowledgedBy: params.acknowledgedBy,
    isFinalized: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Link decisions to decision log
  for (const decision of summary.decisionsRequired) {
    const decisionRef = db.collection(`orgs/${params.orgId}/operatingDecisions`).doc();
    await decisionRef.set({
      id: decisionRef.id,
      orgId: params.orgId,
      title: decision.title,
      description: decision.description,
      owner: decision.owner,
      dueDate: decision.dueDate,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      linkedSummaries: [params.summaryId],
      status: 'open',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as OperatingDecision);
  }

  // Audit log
  await db.collection(`orgs/${params.orgId}`).doc('activities').collection('log').add({
    action: 'operating_summary_acknowledged',
    summaryType: summary.type,
    summaryId: params.summaryId,
    actor: params.acknowledgedBy,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ============================================================================
// OPERATING DECISIONS - Track decisions across summaries
// ============================================================================

export async function createOperatingDecision(params: {
  orgId: string;
  title: string;
  description: string;
  context?: string;
  owner: string;
  dueDate?: Date;
  linkedSummaries?: string[];
}): Promise<{ id: string }> {
  const ref = db.collection(`orgs/${params.orgId}/operatingDecisions`).doc();

  const decision: OperatingDecision = {
    id: ref.id,
    orgId: params.orgId,
    title: params.title,
    description: params.description,
    context: params.context,
    owner: params.owner,
    dueDate: params.dueDate ? admin.firestore.Timestamp.fromDate(params.dueDate) as any : undefined,
    status: 'open',
    linkedSummaries: params.linkedSummaries || [],
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  await ref.set(decision);

  return { id: ref.id };
}

export async function updateDecisionStatus(params: {
  orgId: string;
  decisionId: string;
  status: 'open' | 'in_progress' | 'resolved' | 'deferred';
  resolutionNote?: string;
  resolvedBy?: string;
}): Promise<void> {
  const ref = db.doc(`orgs/${params.orgId}/operatingDecisions/${params.decisionId}`);

  const updates: any = {
    status: params.status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (params.status === 'resolved' && params.resolutionNote) {
    updates.resolution = {
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      resolvedBy: params.resolvedBy,
      outcome: params.resolutionNote,
    };
  }

  await ref.update(updates);

  // Remove from next unacknowledged summary if resolved
  if (params.status === 'resolved') {
    const summary = await db
      .collection(`orgs/${params.orgId}/operatingSummaries`)
      .where('isFinalized', '==', false)
      .limit(1)
      .get();

    if (!summary.empty) {
      const summaryDoc = summary.docs[0];
      const data = summaryDoc.data() as OperatingSummary;
      const updatedDecisions = data.decisionsRequired.filter((d) => d.id !== params.decisionId);

      await summaryDoc.ref.update({
        decisionsRequired: updatedDecisions,
      });
    }
  }
}

// ============================================================================
// NOTIFICATIONS - Keep the rhythm moving
// ============================================================================

export async function createNotification(params: {
  orgId: string;
  notificationType: OperatingNotification['notificationType'];
  summaryId?: string;
  decisionId?: string;
  title: string;
  description: string;
  severity?: 'info' | 'warning' | 'urgent';
  actionUrl?: string;
}): Promise<{ id: string }> {
  const ref = db.collection(`orgs/${params.orgId}/operatingNotifications`).doc();

  const notification: OperatingNotification = {
    id: ref.id,
    orgId: params.orgId,
    notificationType: params.notificationType,
    summaryId: params.summaryId,
    decisionId: params.decisionId,
    title: params.title,
    description: params.description,
    severity: params.severity || 'info',
    actionUrl: params.actionUrl,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  await ref.set(notification);

  return { id: ref.id };
}

export async function dismissNotification(params: {
  orgId: string;
  notificationId: string;
  dismissedBy: string;
}): Promise<void> {
  await db.doc(`orgs/${params.orgId}/operatingNotifications/${params.notificationId}`).update({
    dismissedAt: admin.firestore.FieldValue.serverTimestamp(),
    dismissedBy: params.dismissedBy,
  });
}

export async function snoozeNotification(params: {
  orgId: string;
  notificationId: string;
  snoozeUntil: Date;
}): Promise<void> {
  await db.doc(`orgs/${params.orgId}/operatingNotifications/${params.notificationId}`).update({
    snoozedUntil: admin.firestore.Timestamp.fromDate(params.snoozeUntil) as any,
  });
}

// ============================================================================
// CHECK FOR UNACKNOWLEDGED SUMMARIES (Scheduled)
// ============================================================================

export async function checkUnacknowledgedSummaries(orgId: string): Promise<void> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const unacknowledged = await db
    .collection(`orgs/${orgId}/operatingSummaries`)
    .where('isFinalized', '==', false)
    .where('createdAt', '<', admin.firestore.Timestamp.fromDate(threeDaysAgo) as any)
    .get();

  for (const doc of unacknowledged.docs) {
    const summary = doc.data() as OperatingSummary;

    // Check if we already created a reminder
    const existingReminder = await db
      .collection(`orgs/${orgId}/operatingNotifications`)
      .where('notificationType', '==', 'summary_unacknowledged')
      .where('summaryId', '==', summary.id)
      .where('dismissedAt', '==', null)
      .limit(1)
      .get();

    if (existingReminder.empty) {
      await createNotification({
        orgId,
        notificationType: 'summary_unacknowledged',
        summaryId: summary.id,
        title: `${summary.type} summary unacknowledged`,
        description: `The ${summary.type} summary from ${summary.generatedAt.toDate().toDateString()} is awaiting acknowledgement.`,
        severity: 'warning',
      });
    }
  }
}

export async function checkUnresolvedDecisions(orgId: string): Promise<void> {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const unresolved = await db
    .collection(`orgs/${orgId}/operatingDecisions`)
    .where('status', '==', 'open')
    .where('dueDate', '<', admin.firestore.Timestamp.fromDate(twoWeeksAgo) as any)
    .get();

  for (const doc of unresolved.docs) {
    const decision = doc.data() as OperatingDecision;

    // Check if reminder already created
    const existingReminder = await db
      .collection(`orgs/${orgId}/operatingNotifications`)
      .where('notificationType', '==', 'decision_unresolved')
      .where('decisionId', '==', decision.id)
      .where('dismissedAt', '==', null)
      .limit(1)
      .get();

    if (existingReminder.empty) {
      await createNotification({
        orgId,
        notificationType: 'decision_unresolved',
        decisionId: decision.id,
        title: `Decision overdue: ${decision.title}`,
        description: `This decision was due on ${decision.dueDate?.toDate().toDateString()}`,
        severity: 'warning',
      });
    }
  }
}
