/**
 * Phase 10: Commercial Performance & Financial Intelligence
 * Server-side helpers for engagement financials, margin estimation, and commercial tracking
 */

import { admin } from '@/lib/firebase-admin';
import { db } from '@/lib/db';
import type { EngagementFinancials, CommercialOrgSettings, ProfitabilityFlag, CommercialPattern } from '@/types/phase10-models';

// ============================================================================
// ENGAGEMENT FINANCIALS - Core commercial snapshot
// ============================================================================

export async function createEngagementFinancials(params: {
  orgId: string;
  projectId: string;
  proposalId: string;
  serviceSuites: string[];
  proposalType?: string;
  pricingModel: 'fixed' | 'retainer' | 't&m' | 'hybrid';
  quotedValue: number;
  depositAmount?: number;
  estimatedDays?: number;
  createdBy: string;
}): Promise<{ id: string }> {
  const ref = db.collection(`orgs/${params.orgId}/projects/${params.projectId}/financials`).doc();

  const financials: EngagementFinancials = {
    id: ref.id,
    orgId: params.orgId,
    projectId: params.projectId,
    proposalId: params.proposalId,
    serviceSuites: params.serviceSuites,
    proposalType: params.proposalType,
    pricingModel: params.pricingModel,
    quotedValue: params.quotedValue,
    depositAmount: params.depositAmount,
    effort: {
      estimatedDays: params.estimatedDays,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  await ref.set(financials);

  await db.collection(`orgs/${params.orgId}`).doc('activities').collection('log').add({
    action: 'engagement_financials_created',
    entityType: 'project',
    entityId: params.projectId,
    actor: params.createdBy,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { id: ref.id };
}

export async function addDiscount(params: {
  orgId: string;
  projectId: string;
  type: 'percentage' | 'fixed';
  amount: number;
  rationale: string;
  appliedBy: string;
}): Promise<void> {
  if (!params.rationale || params.rationale.trim().length === 0) {
    throw new Error('Discount rationale is required');
  }

  const ref = db.doc(`orgs/${params.orgId}/projects/${params.projectId}/financials`);
  const snap = await ref.get();
  const financials = snap.data() as EngagementFinancials | undefined;

  if (!financials) throw new Error('Financial record not found');

  const discounts = financials.discountsApplied || [];
  discounts.push({
    type: params.type,
    amount: params.amount,
    rationale: params.rationale,
    approvedBy: params.appliedBy,
    appliedDate: admin.firestore.FieldValue.serverTimestamp() as any,
  });

  await ref.update({
    discountsApplied: discounts,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Audit log
  await db.collection(`orgs/${params.orgId}`).doc('activities').collection('log').add({
    action: 'discount_applied',
    entityType: 'project',
    entityId: params.projectId,
    metadata: {
      discountType: params.type,
      amount: params.amount,
      rationale: params.rationale,
    },
    actor: params.appliedBy,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function recordActualEffort(params: {
  orgId: string;
  projectId: string;
  actualDays?: number;
  actualHours?: number;
  recordedBy: string;
}): Promise<void> {
  const ref = db.doc(`orgs/${params.orgId}/projects/${params.projectId}/financials`);
  const snap = await ref.get();
  const financials = snap.data() as EngagementFinancials | undefined;

  if (!financials) throw new Error('Financial record not found');

  await ref.update({
    effort: {
      ...financials.effort,
      actualDays: params.actualDays,
      actualHours: params.actualHours,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: params.recordedBy,
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function recordAdditionalScope(params: {
  orgId: string;
  projectId: string;
  additionalValue: number;
  changeRequestIds: string[];
  recordedBy: string;
}): Promise<void> {
  const ref = db.doc(`orgs/${params.orgId}/projects/${params.projectId}/financials`);
  const snap = await ref.get();
  const financials = snap.data() as EngagementFinancials | undefined;

  if (!financials) throw new Error('Financial record not found');

  const currentAdditional = financials.additionalScopeValue || 0;

  await ref.update({
    additionalScopeValue: currentAdditional + params.additionalValue,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection(`orgs/${params.orgId}`).doc('activities').collection('log').add({
    action: 'additional_scope_recorded',
    entityType: 'project',
    entityId: params.projectId,
    metadata: {
      additionalValue: params.additionalValue,
      changeRequestIds: params.changeRequestIds,
    },
    actor: params.recordedBy,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ============================================================================
// TIME-TO-CASH TRACKING - Simple, brutal, useful
// ============================================================================

export async function recordProposalSent(params: {
  orgId: string;
  projectId: string;
  recordedBy: string;
}): Promise<void> {
  const ref = db.doc(`orgs/${params.orgId}/projects/${params.projectId}/financials`);
  const snap = await ref.get();
  const financials = snap.data() as EngagementFinancials | undefined;

  if (!financials) throw new Error('Financial record not found');

  await ref.update({
    cashTracking: {
      ...financials.cashTracking,
      proposalSentAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function recordProposalAccepted(params: {
  orgId: string;
  projectId: string;
  recordedBy: string;
}): Promise<void> {
  const ref = db.doc(`orgs/${params.orgId}/projects/${params.projectId}/financials`);
  const snap = await ref.get();
  const financials = snap.data() as EngagementFinancials | undefined;

  if (!financials) throw new Error('Financial record not found');

  const tracking = financials.cashTracking || {};
  const daysToAccept = tracking.proposalSentAt
    ? Math.floor((Date.now() - tracking.proposalSentAt.toMillis()) / (1000 * 60 * 60 * 24))
    : undefined;

  await ref.update({
    cashTracking: {
      ...tracking,
      proposalAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      daysToAccept,
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Check for time-to-cash flag
  const settingsSnap = await db.doc(`orgs/${params.orgId}/settings/commercial`).get();
  const settings = settingsSnap.data() as CommercialOrgSettings | undefined;

  if (settings && daysToAccept && daysToAccept > settings.timeToAcceptNorm) {
    // Flag slow proposal acceptance
    const flagRef = db.collection(`orgs/${params.orgId}/projects/${params.projectId}/flags`).doc();
    await flagRef.set({
      id: flagRef.id,
      orgId: params.orgId,
      projectId: params.projectId,
      flagType: 'cash_slow',
      severity: 'warning',
      description: `Proposal acceptance took ${daysToAccept} days (norm: ${settings.timeToAcceptNorm})`,
      detectedValue: daysToAccept,
      thresholdValue: settings.timeToAcceptNorm,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

export async function recordProjectStart(params: {
  orgId: string;
  projectId: string;
  recordedBy: string;
}): Promise<void> {
  const ref = db.doc(`orgs/${params.orgId}/projects/${params.projectId}/financials`);
  const snap = await ref.get();
  const financials = snap.data() as EngagementFinancials | undefined;

  if (!financials) throw new Error('Financial record not found');

  const tracking = financials.cashTracking || {};
  const daysToStart = tracking.proposalAcceptedAt
    ? Math.floor((Date.now() - tracking.proposalAcceptedAt.toMillis()) / (1000 * 60 * 60 * 24))
    : undefined;

  await ref.update({
    cashTracking: {
      ...tracking,
      projectStartAt: admin.firestore.FieldValue.serverTimestamp(),
      daysToStart,
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function recordDepositPaid(params: {
  orgId: string;
  projectId: string;
  recordedBy: string;
}): Promise<void> {
  const ref = db.doc(`orgs/${params.orgId}/projects/${params.projectId}/financials`);
  const snap = await ref.get();
  const financials = snap.data() as EngagementFinancials | undefined;

  if (!financials) throw new Error('Financial record not found');

  const tracking = financials.cashTracking || {};
  const daysToCash = tracking.proposalAcceptedAt
    ? Math.floor((Date.now() - tracking.proposalAcceptedAt.toMillis()) / (1000 * 60 * 60 * 24))
    : undefined;

  await ref.update({
    cashTracking: {
      ...tracking,
      depositPaidAt: admin.firestore.FieldValue.serverTimestamp(),
      daysToCash,
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Check for slow cash flag
  const settingsSnap = await db.doc(`orgs/${params.orgId}/settings/commercial`).get();
  const settings = settingsSnap.data() as CommercialOrgSettings | undefined;

  if (settings && daysToCash && daysToCash > settings.timeToCashNorm) {
    const flagRef = db.collection(`orgs/${params.orgId}/projects/${params.projectId}/flags`).doc();
    await flagRef.set({
      id: flagRef.id,
      orgId: params.orgId,
      projectId: params.projectId,
      flagType: 'cash_slow',
      severity: 'warning',
      description: `Deposit received after ${daysToCash} days (norm: ${settings.timeToCashNorm})`,
      detectedValue: daysToCash,
      thresholdValue: settings.timeToCashNorm,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

export async function recordFinalPaymentPaid(params: {
  orgId: string;
  projectId: string;
  recordedBy: string;
}): Promise<void> {
  const ref = db.doc(`orgs/${params.orgId}/projects/${params.projectId}/financials`);
  const snap = await ref.get();
  const financials = snap.data() as EngagementFinancials | undefined;

  if (!financials) throw new Error('Financial record not found');

  const tracking = financials.cashTracking || {};
  const daysToFinalCash = tracking.projectStartAt
    ? Math.floor((Date.now() - tracking.projectStartAt.toMillis()) / (1000 * 60 * 60 * 24))
    : undefined;

  await ref.update({
    cashTracking: {
      ...tracking,
      finalPaymentPaidAt: admin.firestore.FieldValue.serverTimestamp(),
      daysToFinalCash,
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ============================================================================

export async function estimateMargin(params: {
  orgId: string;
  financials: EngagementFinancials;
  internalDayRate: number;
  marginThresholds?: { strongMin: number; acceptableMin: number; weakMin: number };
}): Promise<{ marginValue: number; marginPercent: number; marginBand: string }> {
  const discountTotal = (params.financials.discountsApplied || []).reduce((sum, d) => {
    if (d.type === 'percentage') {
      return sum + (params.financials.quotedValue * d.amount) / 100;
    }
    return sum + d.amount;
  }, 0);

  const writeoffs = params.financials.writeOffs || 0;
  const additionalScope = params.financials.additionalScopeValue || 0;

  const revenue = params.financials.quotedValue + additionalScope - discountTotal - writeoffs;

  const actualDays = params.financials.effort.actualDays || params.financials.effort.estimatedDays || 0;
  const costs = actualDays * params.internalDayRate;

  const marginValue = revenue - costs;
  const marginPercent = revenue > 0 ? (marginValue / revenue) * 100 : 0;

  const thresholds = params.marginThresholds || {
    strongMin: 45,
    acceptableMin: 30,
    weakMin: 0,
  };

  let marginBand: 'strong' | 'acceptable' | 'weak' | 'loss';
  if (marginPercent >= thresholds.strongMin) marginBand = 'strong';
  else if (marginPercent >= thresholds.acceptableMin) marginBand = 'acceptable';
  else if (marginPercent >= thresholds.weakMin) marginBand = 'weak';
  else marginBand = 'loss';

  return { marginValue, marginPercent, marginBand };
}

export async function finalizeFinancials(params: {
  orgId: string;
  projectId: string;
  actualDays: number;
  actualHours?: number;
  finalizedBy: string;
}): Promise<void> {
  const ref = db.doc(`orgs/${params.orgId}/projects/${params.projectId}/financials`);
  const snap = await ref.get();
  const financials = snap.data() as EngagementFinancials | undefined;

  if (!financials) throw new Error('Financial record not found');

  // Get org settings for internal day rate
  const settingsSnap = await db.doc(`orgs/${params.orgId}/settings/commercial`).get();
  const settings = settingsSnap.data() as CommercialOrgSettings | undefined;
  const internalDayRate = settings?.internalDayRate || 1000; // default

  // Calculate margin
  const margin = await estimateMargin({
    orgId: params.orgId,
    financials,
    internalDayRate,
    marginThresholds: settings?.marginThresholds,
  });

  // Finalize
  await ref.update({
    effort: {
      ...financials.effort,
      actualDays: params.actualDays,
      actualHours: params.actualHours,
    },
    estimatedMarginValue: margin.marginValue,
    estimatedMarginPercent: margin.marginPercent,
    marginBand: margin.marginBand,
    closedAt: admin.firestore.FieldValue.serverTimestamp(),
    finalisedBy: params.finalizedBy,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update project status
  await db.doc(`orgs/${params.orgId}/projects/${params.projectId}`).update({
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection(`orgs/${params.orgId}`).doc('activities').collection('log').add({
    action: 'financials_finalized',
    entityType: 'project',
    entityId: params.projectId,
    metadata: {
      marginValue: margin.marginValue,
      marginPercent: margin.marginPercent,
      marginBand: margin.marginBand,
    },
    actor: params.finalizedBy,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ============================================================================
// PROFITABILITY FLAGS - Early warning system
// ============================================================================

export async function checkAndCreateFlags(params: {
  orgId: string;
  projectId: string;
  financials: EngagementFinancials;
  settings: CommercialOrgSettings;
}): Promise<void> {
  const flags: Partial<ProfitabilityFlag>[] = [];

  // Flag 1: Margin below threshold
  if (params.financials.estimatedMarginPercent !== undefined) {
    const threshold = params.settings.marginThresholds.weakMin;
    if (params.financials.estimatedMarginPercent < threshold) {
      flags.push({
        orgId: params.orgId,
        projectId: params.projectId,
        flagType: 'margin_weak',
        severity: params.financials.estimatedMarginPercent < 0 ? 'critical' : 'warning',
        description: `Margin is ${params.financials.estimatedMarginPercent.toFixed(1)}%, below minimum ${threshold}%`,
        detectedValue: params.financials.estimatedMarginPercent,
        thresholdValue: threshold,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
      });
    }
  }

  // Flag 2: Effort overrun
  if (params.financials.effort.actualDays && params.financials.effort.estimatedDays) {
    const overrun = ((params.financials.effort.actualDays - params.financials.effort.estimatedDays) / params.financials.effort.estimatedDays) * 100;
    if (overrun > 20) {
      flags.push({
        orgId: params.orgId,
        projectId: params.projectId,
        flagType: 'effort_overrun',
        severity: overrun > 50 ? 'critical' : 'warning',
        description: `Effort is ${overrun.toFixed(0)}% over estimate (${params.financials.effort.actualDays} vs ${params.financials.effort.estimatedDays} days)`,
        detectedValue: overrun,
        thresholdValue: 20,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
      });
    }
  }

  // Flag 3: Excessive scope change
  if (params.financials.additionalScopeValue) {
    const scopeRatio = params.financials.additionalScopeValue / params.financials.quotedValue;
    if (scopeRatio > 0.3) {
      flags.push({
        orgId: params.orgId,
        projectId: params.projectId,
        flagType: 'scope_excessive',
        severity: scopeRatio > 0.5 ? 'critical' : 'warning',
        description: `Additional scope is ${(scopeRatio * 100).toFixed(0)}% of original quote`,
        detectedValue: scopeRatio * 100,
        thresholdValue: 30,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
      });
    }
  }

  // Write flags
  for (const flag of flags) {
    const ref = db.collection(`orgs/${params.orgId}/projects/${params.projectId}/flags`).doc();
    await ref.set({
      id: ref.id,
      ...flag,
    });
  }
}

export async function acknowledgeFlag(params: {
  orgId: string;
  projectId: string;
  flagId: string;
  acknowledgedBy: string;
  note?: string;
}): Promise<void> {
  await db.doc(`orgs/${params.orgId}/projects/${params.projectId}/flags/${params.flagId}`).update({
    isActive: false,
    acknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
    acknowledgedBy: params.acknowledgedBy,
    acknowledgementNote: params.note,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ============================================================================
// COMMERCIAL PATTERNS - Pricing insights (v1 = manual)
// ============================================================================

export async function createPattern(params: {
  orgId: string;
  description: string;
  indicators: string[];
  patternType: 'consistently_strong' | 'consistently_weak' | 'mispriced' | 'scope_creep' | 'wrong_fit';
  examples: { projectId: string; projectName: string; margin?: number }[];
  discoveredBy: string;
}): Promise<{ id: string }> {
  const ref = db.collection(`orgs/${params.orgId}/commercialPatterns`).doc();

  const pattern: CommercialPattern = {
    id: ref.id,
    orgId: params.orgId,
    description: params.description,
    indicators: params.indicators,
    examples: params.examples,
    patternType: params.patternType,
    confidenceLevel: params.examples.length >= 5 ? 'high' : params.examples.length >= 3 ? 'medium' : 'low',
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
    discoveredBy: params.discoveredBy,
  };

  await ref.set(pattern);

  return { id: ref.id };
}

// ============================================================================
// ORG SETTINGS - Configuration for commercial calculations
// ============================================================================

export async function getOrCreateOrgSettings(orgId: string): Promise<CommercialOrgSettings> {
  const ref = db.doc(`orgs/${orgId}/settings/commercial`);
  const snap = await ref.get();

  if (snap.exists) {
    return snap.data() as CommercialOrgSettings;
  }

  // Create defaults
  const settings: CommercialOrgSettings = {
    id: 'commercial',
    orgId,
    internalDayRate: 1000,
    marginThresholds: {
      strongMin: 45,
      acceptableMin: 30,
      weakMin: 0,
    },
    timeToAcceptNorm: 14,
    timeToCashNorm: 30,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  await ref.set(settings);
  return settings;
}

export async function updateOrgSettings(params: {
  orgId: string;
  internalDayRate?: number;
  marginThresholds?: { strongMin?: number; acceptableMin?: number; weakMin?: number };
  timeToAcceptNorm?: number;
  timeToCashNorm?: number;
}): Promise<void> {
  const ref = db.doc(`orgs/${params.orgId}/settings/commercial`);
  const snap = await ref.get();

  if (!snap.exists) {
    await getOrCreateOrgSettings(params.orgId);
  }

  const updates: any = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (params.internalDayRate !== undefined) updates.internalDayRate = params.internalDayRate;
  if (params.marginThresholds) {
    updates.marginThresholds = {
      ...snap.data()?.marginThresholds,
      ...params.marginThresholds,
    };
  }
  if (params.timeToAcceptNorm !== undefined) updates.timeToAcceptNorm = params.timeToAcceptNorm;
  if (params.timeToCashNorm !== undefined) updates.timeToCashNorm = params.timeToCashNorm;

  await ref.update(updates);
}
