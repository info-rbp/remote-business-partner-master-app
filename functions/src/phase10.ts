/**
 * Phase 10: Commercial Performance & Financial Intelligence
 * Cloud Functions for margin tracking, financial flags, and commercial alerts
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const { FieldValue } = admin.firestore;

// ============================================================================
// TRIGGER: Project → Financials Creation (auto-initialize)
// ============================================================================

/**
 * When a project is created from a proposal, auto-create financial record
 * Links to proposal for quoted value, pricing model, and service suites
 */
export const onProjectCreatedFinancials = onDocumentCreated('orgs/{orgId}/projects/{projectId}', async (event) => {
  const { orgId, projectId } = event.params;
  const project = event.data?.data();

  if (!project || !project.proposalId) {
    return; // No proposal linked, skip financial initialization
  }

  // Fetch proposal for financial details
  const proposalSnap = await db.doc(`orgs/${orgId}/proposals/${project.proposalId}`).get();
  const proposal = proposalSnap.data();

  if (!proposal) {
    console.warn(`Proposal ${project.proposalId} not found for project ${projectId}`);
    return;
  }

  // Check if financials already exist
  const existingFinancials = await db
    .collection(`orgs/${orgId}/projects/${projectId}/financials`)
    .limit(1)
    .get();

  if (!existingFinancials.empty) {
    return; // Financials already initialized
  }

  const financialRef = db.collection(`orgs/${orgId}/projects/${projectId}/financials`).doc();

  await financialRef.set({
    id: financialRef.id,
    orgId,
    projectId,
    proposalId: project.proposalId,
    serviceSuites: proposal.serviceSuites || [],
    proposalType: proposal.type,
    pricingModel: proposal.pricingModel || 'fixed',
    quotedValue: proposal.totalValue || proposal.pricing?.total || 0,
    depositAmount: proposal.pricing?.deposit,
    effort: {
      estimatedDays: proposal.timeline?.estimatedDays,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection(`orgs/${orgId}`).doc('activities').collection('log').add({
    action: 'engagement_financials_initialized',
    entityType: 'project',
    entityId: projectId,
    actor: 'system',
    timestamp: FieldValue.serverTimestamp(),
  });

  console.log(`Financial record initialized for project ${projectId}`);
});

// ============================================================================
// TRIGGER: Discount Applied → Flag Review Required
// ============================================================================

/**
 * When discount exceeds org threshold, flag for management review
 */
export const onDiscountApplied = onDocumentUpdated('orgs/{orgId}/projects/{projectId}/financials/{financialId}', async (event) => {
  const { orgId, projectId } = event.params;
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  const beforeDiscounts = before.discountsApplied || [];
  const afterDiscounts = after.discountsApplied || [];

  if (afterDiscounts.length <= beforeDiscounts.length) {
    return; // No new discount added
  }

  const latestDiscount = afterDiscounts[afterDiscounts.length - 1];
  
  // Fetch org settings for discount threshold
  const settingsSnap = await db.doc(`orgs/${orgId}/settings/commercial`).get();
  const settings = settingsSnap.data();
  const discountThreshold = settings?.discountApprovalThreshold || 15; // default 15%

  let discountPercent = 0;
  if (latestDiscount.type === 'percentage') {
    discountPercent = latestDiscount.amount;
  } else if (latestDiscount.type === 'fixed' && after.quotedValue) {
    discountPercent = (latestDiscount.amount / after.quotedValue) * 100;
  }

  if (discountPercent > discountThreshold) {
    // Create profitability flag
    const flagRef = db.collection(`orgs/${orgId}/projects/${projectId}/flags`).doc();
    await flagRef.set({
      id: flagRef.id,
      orgId,
      projectId,
      type: 'large_discount',
      severity: 'warning',
      title: `Discount exceeds ${discountThreshold}% threshold`,
      description: `A ${discountPercent.toFixed(1)}% discount was applied. Rationale: ${latestDiscount.rationale}`,
      detectedAt: FieldValue.serverTimestamp(),
      status: 'open',
      metadata: {
        discountPercent,
        discountAmount: latestDiscount.amount,
        approvedBy: latestDiscount.approvedBy,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`Large discount flag created for project ${projectId}: ${discountPercent}%`);
  }
});

// ============================================================================
// TRIGGER: Margin Estimation → Flag Low Margins
// ============================================================================

/**
 * When margin is estimated, check against org thresholds and flag weak engagements
 */
export const onMarginEstimated = onDocumentUpdated('orgs/{orgId}/projects/{projectId}/financials/{financialId}', async (event) => {
  const { orgId, projectId } = event.params;
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;
  if (!after.margin || before.margin?.estimatedPercent === after.margin?.estimatedPercent) {
    return; // No margin change
  }

  // Fetch org margin thresholds
  const settingsSnap = await db.doc(`orgs/${orgId}/settings/commercial`).get();
  const settings = settingsSnap.data();
  const weakMargin = settings?.marginThresholds?.weak || 15;
  const strongMargin = settings?.marginThresholds?.strong || 40;

  const marginPercent = after.margin.estimatedPercent;

  if (marginPercent < weakMargin) {
    // Create low margin flag
    const flagRef = db.collection(`orgs/${orgId}/projects/${projectId}/flags`).doc();
    await flagRef.set({
      id: flagRef.id,
      orgId,
      projectId,
      type: 'weak_margin',
      severity: 'high',
      title: `Margin below ${weakMargin}% threshold`,
      description: `Estimated margin is ${marginPercent.toFixed(1)}%, below the ${weakMargin}% weak threshold. Band: ${after.margin.band}`,
      detectedAt: FieldValue.serverTimestamp(),
      status: 'open',
      metadata: {
        marginPercent,
        marginBand: after.margin.band,
        quotedValue: after.quotedValue,
        estimatedCost: after.margin.estimatedCost,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`Weak margin flag created for project ${projectId}: ${marginPercent}%`);
  } else if (marginPercent >= strongMargin) {
    // Log strong margin for visibility
    await db.collection(`orgs/${orgId}/projects/${projectId}/activity`).add({
      action: 'strong_margin_detected',
      actorRole: 'system',
      entityType: 'project',
      entityId: projectId,
      metadata: {
        marginPercent,
        marginBand: after.margin.band,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  }
});

// ============================================================================
// TRIGGER: Time-to-Cash Slow → Flag
// ============================================================================

/**
 * When time-to-cash milestone exceeds norm, flag for attention
 */
export const onTimeToCashSlow = onDocumentUpdated('orgs/{orgId}/projects/{projectId}/financials/{financialId}', async (event) => {
  const { orgId, projectId } = event.params;
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  const tracking = after.cashTracking || {};
  const beforeTracking = before.cashTracking || {};

  // Check for proposal acceptance delay
  if (tracking.daysToAccept && !beforeTracking.daysToAccept) {
    const settingsSnap = await db.doc(`orgs/${orgId}/settings/commercial`).get();
    const settings = settingsSnap.data();
    const acceptNorm = settings?.timeToAcceptNorm || 14;

    if (tracking.daysToAccept > acceptNorm) {
      const flagRef = db.collection(`orgs/${orgId}/projects/${projectId}/flags`).doc();
      await flagRef.set({
        id: flagRef.id,
        orgId,
        projectId,
        type: 'slow_acceptance',
        severity: 'warning',
        title: `Proposal acceptance took ${tracking.daysToAccept} days`,
        description: `Client took ${tracking.daysToAccept} days to accept, exceeding ${acceptNorm}-day norm.`,
        detectedAt: FieldValue.serverTimestamp(),
        status: 'open',
        metadata: {
          daysToAccept: tracking.daysToAccept,
          norm: acceptNorm,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(`Slow acceptance flag created for project ${projectId}: ${tracking.daysToAccept} days`);
    }
  }

  // Check for deposit payment delay
  if (tracking.daysToDeposit && !beforeTracking.daysToDeposit) {
    const settingsSnap = await db.doc(`orgs/${orgId}/settings/commercial`).get();
    const settings = settingsSnap.data();
    const depositNorm = settings?.timeToDepositNorm || 7;

    if (tracking.daysToDeposit > depositNorm) {
      const flagRef = db.collection(`orgs/${orgId}/projects/${projectId}/flags`).doc();
      await flagRef.set({
        id: flagRef.id,
        orgId,
        projectId,
        type: 'slow_deposit',
        severity: 'high',
        title: `Deposit delayed ${tracking.daysToDeposit} days`,
        description: `Deposit took ${tracking.daysToDeposit} days to clear, exceeding ${depositNorm}-day norm.`,
        detectedAt: FieldValue.serverTimestamp(),
        status: 'open',
        metadata: {
          daysToDeposit: tracking.daysToDeposit,
          norm: depositNorm,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(`Slow deposit flag created for project ${projectId}: ${tracking.daysToDeposit} days`);
    }
  }
});

// ============================================================================
// SCHEDULED: Monthly Commercial Health Check
// ============================================================================

/**
 * Monthly check for commercial patterns and flag opportunities
 * Runs 1st of each month at 9am
 */
export const monthlyCommercialHealthCheck = onSchedule('0 9 1 * *', async (context) => {
  const orgsSnap = await db.collection('orgs').get();

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;

    // Fetch active projects with financials
    const projectsSnap = await db
      .collection(`orgs/${orgId}/projects`)
      .where('status', 'in', ['active', 'in-progress'])
      .get();

    let belowMarginCount = 0;
    let slowCashCount = 0;
    let totalMargin = 0;
    let marginCount = 0;

    for (const projectDoc of projectsSnap.docs) {
      const projectId = projectDoc.id;
      const financialsSnap = await db
        .collection(`orgs/${orgId}/projects/${projectId}/financials`)
        .limit(1)
        .get();

      if (financialsSnap.empty) continue;

      const financial = financialsSnap.docs[0].data();

      // Check margin
      if (financial.margin?.estimatedPercent) {
        totalMargin += financial.margin.estimatedPercent;
        marginCount++;

        const settingsSnap = await db.doc(`orgs/${orgId}/settings/commercial`).get();
        const settings = settingsSnap.data();
        const weakMargin = settings?.marginThresholds?.weak || 15;

        if (financial.margin.estimatedPercent < weakMargin) {
          belowMarginCount++;
        }
      }

      // Check cash tracking
      if (financial.cashTracking) {
        const settingsSnap = await db.doc(`orgs/${orgId}/settings/commercial`).get();
        const settings = settingsSnap.data();
        const acceptNorm = settings?.timeToAcceptNorm || 14;
        const depositNorm = settings?.timeToDepositNorm || 7;

        if (
          (financial.cashTracking.daysToAccept && financial.cashTracking.daysToAccept > acceptNorm) ||
          (financial.cashTracking.daysToDeposit && financial.cashTracking.daysToDeposit > depositNorm)
        ) {
          slowCashCount++;
        }
      }
    }

    const avgMargin = marginCount > 0 ? totalMargin / marginCount : 0;

    // Store monthly summary
    const summaryRef = db.collection(`orgs/${orgId}/commercialSummaries`).doc();
    await summaryRef.set({
      id: summaryRef.id,
      orgId,
      period: new Date().toISOString().slice(0, 7), // YYYY-MM
      activeProjectsCount: projectsSnap.size,
      belowMarginThresholdCount: belowMarginCount,
      slowCashFlagsCount: slowCashCount,
      averageMarginPercent: avgMargin,
      generatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`Commercial health check complete for org ${orgId}: ${projectsSnap.size} active projects, avg margin ${avgMargin.toFixed(1)}%`);
  }

  console.log('Monthly commercial health check completed for all orgs');
});
