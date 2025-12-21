/**
 * Phase 11: Operating Rhythm & Internal Management
 * Cloud Functions for operating summaries, decision tracking, and notifications
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

// ============================================================================
// SCHEDULED: Weekly Operating Summary Generation
// ============================================================================

/**
 * Generate weekly operating summary every Monday at 8am
 * Aggregates pipeline, delivery, risk, and commercial metrics
 */
export const generateWeeklyOperatingSummary = onSchedule('0 8 * * MON', async (context) => {
  const orgsSnap = await db.collection('orgs').get();

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;

    // Calculate period (last 7 days)
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 7);
    const periodEnd = new Date(now);

    // Pipeline metrics
    const leadsSnap = await db
      .collection(`orgs/${orgId}/leads`)
      .where('createdAt', '>=', Timestamp.fromDate(periodStart))
      .get();

    const proposalsSnap = await db
      .collection(`orgs/${orgId}/proposals`)
      .where('status', '==', 'sent')
      .get();

    const acceptedProposalsSnap = await db
      .collection(`orgs/${orgId}/proposals`)
      .where('status', '==', 'accepted')
      .where('acceptedAt', '>=', Timestamp.fromDate(periodStart))
      .get();

    // Delivery metrics
    const activeProjectsSnap = await db
      .collection(`orgs/${orgId}/projects`)
      .where('status', 'in', ['active', 'in-progress'])
      .get();

    let milestonesDue = 0;
    let overdueMillestones = 0;
    let deliverablesAwaitingApproval = 0;

    for (const projectDoc of activeProjectsSnap.docs) {
      const projectId = projectDoc.id;

      // Count milestones
      const milestonesSnap = await db
        .collection(`orgs/${orgId}/projects/${projectId}/milestones`)
        .where('dueDate', '<=', Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000))
        .where('status', '!=', 'completed')
        .get();
      milestonesDue += milestonesSnap.size;

      const overdueMilestonesSnap = await db
        .collection(`orgs/${orgId}/projects/${projectId}/milestones`)
        .where('dueDate', '<', Timestamp.now())
        .where('status', '!=', 'completed')
        .get();
      overdueMillestones += overdueMilestonesSnap.size;

      // Count deliverables
      const deliverablesSnap = await db
        .collection(`orgs/${orgId}/projects/${projectId}/deliverables`)
        .where('status', '==', 'client-review')
        .get();
      deliverablesAwaitingApproval += deliverablesSnap.size;
    }

    // Risk metrics
    const openRisksSnap = await db.collection(`orgs/${orgId}/risks`).where('status', '==', 'open').get();

    let risksBySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    openRisksSnap.forEach((doc) => {
      const risk = doc.data();
      const severity = risk.severity || 'low';
      risksBySeverity[severity as keyof typeof risksBySeverity]++;
    });

    // Commercial metrics
    let projectsBelowMargin = 0;
    let totalMargin = 0;
    let marginCount = 0;

    for (const projectDoc of activeProjectsSnap.docs) {
      const projectId = projectDoc.id;
      const financialsSnap = await db
        .collection(`orgs/${orgId}/projects/${projectId}/financials`)
        .limit(1)
        .get();

      if (!financialsSnap.empty) {
        const financial = financialsSnap.docs[0].data();
        if (financial.margin?.estimatedPercent) {
          totalMargin += financial.margin.estimatedPercent;
          marginCount++;

          const settingsSnap = await db.doc(`orgs/${orgId}/settings/commercial`).get();
          const settings = settingsSnap.data();
          const weakMargin = settings?.marginThresholds?.weak || 15;

          if (financial.margin.estimatedPercent < weakMargin) {
            projectsBelowMargin++;
          }
        }
      }
    }

    const avgMargin = marginCount > 0 ? totalMargin / marginCount : 0;

    // Create operating summary
    const summaryRef = db.collection(`orgs/${orgId}/operatingSummaries`).doc();
    await summaryRef.set({
      id: summaryRef.id,
      orgId,
      type: 'weekly',
      periodStart: Timestamp.fromDate(periodStart),
      periodEnd: Timestamp.fromDate(periodEnd),
      generatedAt: Timestamp.now(),
      generatedBy: 'system',
      generatedByUserId: 'system',
      snapshot: {
        pipeline: {
          newLeads: leadsSnap.size,
          proposalsSent: proposalsSnap.size,
          proposalsAccepted: acceptedProposalsSnap.size,
        },
        delivery: {
          activeProjectsCount: activeProjectsSnap.size,
          milestoneDueThisWeek: milestonesDue,
          overdueMillestones: overdueMillestones,
          deliverablesAwaitingApproval: deliverablesAwaitingApproval,
        },
        risk: {
          openRisksCount: openRisksSnap.size,
          openRisksBySeverity: risksBySeverity,
        },
        commercial: {
          projectsBelowMarginThreshold: projectsBelowMargin,
          averageMarginPercent: avgMargin,
        },
      },
      highlights: [],
      concerns: [],
      decisionsRequired: [],
      actionsAgreed: [],
      isFinalized: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Create notification
    const notificationRef = db.collection(`orgs/${orgId}/operatingNotifications`).doc();
    await notificationRef.set({
      id: notificationRef.id,
      orgId,
      notificationType: 'weekly_summary_ready',
      summaryId: summaryRef.id,
      title: 'Weekly operating summary ready',
      description: 'Your weekly summary has been generated and awaits review.',
      severity: 'info',
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`Weekly operating summary generated for org ${orgId}`);
  }

  console.log('Weekly operating summaries generated for all orgs');
});

// ============================================================================
// SCHEDULED: Check Unacknowledged Summaries
// ============================================================================

/**
 * Daily check for summaries older than 3 days without acknowledgement
 * Sends reminder notifications
 */
export const checkUnacknowledgedSummaries = onSchedule('0 9 * * *', async (context) => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const orgsSnap = await db.collection('orgs').get();

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;

    const unacknowledgedSnap = await db
      .collection(`orgs/${orgId}/operatingSummaries`)
      .where('isFinalized', '==', false)
      .where('createdAt', '<', Timestamp.fromDate(threeDaysAgo))
      .get();

    for (const summaryDoc of unacknowledgedSnap.docs) {
      const summary = summaryDoc.data();

      // Check if reminder already sent
      const existingReminderSnap = await db
        .collection(`orgs/${orgId}/operatingNotifications`)
        .where('notificationType', '==', 'summary_unacknowledged')
        .where('summaryId', '==', summary.id)
        .where('dismissedAt', '==', null)
        .limit(1)
        .get();

      if (existingReminderSnap.empty) {
        const notificationRef = db.collection(`orgs/${orgId}/operatingNotifications`).doc();
        await notificationRef.set({
          id: notificationRef.id,
          orgId,
          notificationType: 'summary_unacknowledged',
          summaryId: summary.id,
          title: `${summary.type} summary unacknowledged`,
          description: `The ${summary.type} summary from ${summary.generatedAt.toDate().toDateString()} is awaiting acknowledgement.`,
          severity: 'warning',
          createdAt: FieldValue.serverTimestamp(),
        });

        console.log(`Reminder sent for unacknowledged summary ${summary.id}`);
      }
    }
  }

  console.log('Checked unacknowledged summaries for all orgs');
});

// ============================================================================
// SCHEDULED: Check Overdue Decisions
// ============================================================================

/**
 * Daily check for decisions past due date
 * Escalates to notifications
 */
export const checkOverdueDecisions = onSchedule('0 10 * * *', async (context) => {
  const now = Timestamp.now();
  const orgsSnap = await db.collection('orgs').get();

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;

    const overdueDecisionsSnap = await db
      .collection(`orgs/${orgId}/operatingDecisions`)
      .where('status', '==', 'open')
      .where('dueDate', '<', now)
      .get();

    for (const decisionDoc of overdueDecisionsSnap.docs) {
      const decision = decisionDoc.data();

      // Check if notification already exists
      const existingNotificationSnap = await db
        .collection(`orgs/${orgId}/operatingNotifications`)
        .where('notificationType', '==', 'decision_overdue')
        .where('decisionId', '==', decision.id)
        .where('dismissedAt', '==', null)
        .limit(1)
        .get();

      if (existingNotificationSnap.empty) {
        const notificationRef = db.collection(`orgs/${orgId}/operatingNotifications`).doc();
        await notificationRef.set({
          id: notificationRef.id,
          orgId,
          notificationType: 'decision_overdue',
          decisionId: decision.id,
          title: `Decision overdue: ${decision.title}`,
          description: `Decision "${decision.title}" was due ${decision.dueDate.toDate().toDateString()} and requires attention.`,
          severity: 'high',
          actionUrl: `/decisions/${decision.id}`,
          createdAt: FieldValue.serverTimestamp(),
        });

        console.log(`Overdue decision notification created for decision ${decision.id}`);
      }
    }
  }

  console.log('Checked overdue decisions for all orgs');
});

// ============================================================================
// TRIGGER: Operating Summary Acknowledged → Spawn Decisions
// ============================================================================

/**
 * When summary is acknowledged, create decision entries for tracking
 */
export const onOperatingSummaryAcknowledged = onDocumentUpdated('orgs/{orgId}/operatingSummaries/{summaryId}', async (event) => {
  const { orgId, summaryId } = event.params;
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;
  if (before.isFinalized || !after.isFinalized) {
    return; // Not a new acknowledgement
  }

  // Create decisions from decisionsRequired
  const decisionsRequired = after.decisionsRequired || [];

  for (const decision of decisionsRequired) {
    const decisionRef = db.collection(`orgs/${orgId}/operatingDecisions`).doc();
    await decisionRef.set({
      id: decisionRef.id,
      orgId,
      title: decision.title,
      description: decision.description,
      owner: decision.owner,
      dueDate: decision.dueDate,
      status: 'open',
      linkedSummaries: [summaryId],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`Decision ${decisionRef.id} created from summary ${summaryId}`);
  }

  // Create activity log
  await db.collection(`orgs/${orgId}`).doc('activities').collection('log').add({
    action: 'operating_summary_acknowledged',
    summaryType: after.type,
    summaryId: summaryId,
    actor: after.acknowledgedBy,
    timestamp: FieldValue.serverTimestamp(),
  });
});

// ============================================================================
// TRIGGER: Decision Status Changed → Notification
// ============================================================================

/**
 * When decision is resolved or deferred, notify owner and stakeholders
 */
export const onDecisionStatusChanged = onDocumentUpdated('orgs/{orgId}/operatingDecisions/{decisionId}', async (event) => {
  const { orgId, decisionId } = event.params;
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;
  if (before.status === after.status) {
    return; // No status change
  }

  if (after.status === 'resolved') {
    // Create resolution notification
    const notificationRef = db.collection(`orgs/${orgId}/operatingNotifications`).doc();
    await notificationRef.set({
      id: notificationRef.id,
      orgId,
      notificationType: 'decision_resolved',
      decisionId: decisionId,
      title: `Decision resolved: ${after.title}`,
      description: `Decision "${after.title}" has been resolved.`,
      severity: 'info',
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`Resolution notification created for decision ${decisionId}`);
  } else if (after.status === 'deferred') {
    // Log deferral
    await db.collection(`orgs/${orgId}`).doc('activities').collection('log').add({
      action: 'decision_deferred',
      decisionId: decisionId,
      decisionTitle: after.title,
      timestamp: FieldValue.serverTimestamp(),
    });

    console.log(`Decision ${decisionId} deferred`);
  }
});
