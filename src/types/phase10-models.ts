/**
 * Phase 10: Commercial Performance & Financial Intelligence
 * Data models for engagement financials, pricing, margins, and commercial tracking
 * 
 * Core principle: Commercial truth beats precision.
 * Every project gets a comparable commercial footprint.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Discount record: structured tracking of all discounts
 * Rule: discounts always require rationale text
 */
export interface Discount {
  type: 'percentage' | 'fixed';
  amount: number; // percentage (0-100) or fixed amount
  rationale: string; // required - must explain why
  approvedBy?: string;
  appliedDate?: Timestamp;
}

/**
 * Effort tracking: estimated vs actual
 * Manual v1, system tracks later
 */
export interface EffortTracking {
  estimatedHours?: number;
  estimatedDays?: number;
  actualHours?: number;
  actualDays?: number;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

/**
 * Milestone value breakdown (optional, for complex projects)
 */
export interface MilestoneValue {
  milestoneId: string;
  milestoneName: string;
  value: number;
  paymentTerm?: string; // e.g., "on completion"
}

/**
 * Core entity: Engagement Financials
 * Attached to projects/{projectId}/financials
 * 
 * Rules:
 * - Snapshot on project close (immutable once closed)
 * - Never overwrite historical values
 * - Discounts always require rationale
 */
export interface EngagementFinancials {
  id: string;
  orgId: string;
  projectId: string;
  proposalId: string;

  // Pricing model
  serviceSuites: string[];
  proposalType?: string; // e.g., 'turnaround', 'growth', 'bid_support', 'optimization'
  pricingModel: 'fixed' | 'retainer' | 't&m' | 'hybrid';

  // Quoted values
  quotedValue: number; // total contract value
  depositAmount?: number;
  milestoneValues?: MilestoneValue[]; // optional, for phased work

  // Discounts and adjustments
  discountsApplied?: Discount[];
  additionalScopeValue?: number; // from approved change requests
  writeOffs?: number; // if any (e.g., scope we absorb)

  // Effort tracking
  effort: EffortTracking;

  // Time-to-Cash tracking
  cashTracking?: {
    proposalSentAt?: Timestamp;
    proposalAcceptedAt?: Timestamp;
    projectStartAt?: Timestamp;
    depositPaidAt?: Timestamp;
    finalPaymentPaidAt?: Timestamp;
    // Derived
    daysToAccept?: number;
    daysToStart?: number;
    daysToCash?: number;
    daysToFinalCash?: number;
  };

  // Calculated margins (derived, readonly after close)
  estimatedMarginValue?: number;
  estimatedMarginPercent?: number;
  marginBand?: 'strong' | 'acceptable' | 'weak' | 'loss';

  // Status snapshot at close
  statusSnapshot?: {
    projectStatus: string;
    deliverableStatus: string;
    risksAtClose: number;
    changesAtClose: number;
    clientSatisfaction?: 'very_positive' | 'positive' | 'neutral' | 'negative';
  };

  // Audit & timeline
  createdAt: Timestamp;
  updatedAt: Timestamp;
  closedAt?: Timestamp;
  finalisedBy?: string;
}

/**
 * Time-to-Cash tracking
 * Attached to proposals and projects
 * Used to spot where cash gets stuck
 */
export interface TimeToCash {
  // Proposal timeline
  proposalSentAt?: Timestamp;
  proposalAcceptedAt?: Timestamp;

  // Project timeline
  projectStartAt?: Timestamp;

  // Cash timeline (manual flags v1)
  depositPaidAt?: Timestamp; // manual checkbox
  finalPaymentPaidAt?: Timestamp; // manual checkbox

  // Derived metrics (recalculated)
  daysToAccept?: number; // sent → accepted
  daysToStart?: number; // accepted → start
  daysToCash?: number; // accepted → deposit
  daysToFinalCash?: number; // start → final payment

  updatedAt?: Timestamp;
}

/**
 * Margin estimation (v1 = directional, not perfect)
 * 
 * Formula:
 * estimatedMargin = (quotedValue + additionalScopeValue - discounts - writeOffs)
 *                   - (actualEffort × internalDayRate)
 */
export interface MarginEstimate {
  // Inputs
  quotedValue: number;
  additionalScopeValue?: number;
  totalDiscounts?: number;
  writeOffs?: number;
  actualDays?: number;
  internalDayRate: number;

  // Outputs
  estimatedMarginValue: number;
  estimatedMarginPercent: number;
  marginBand: 'strong' | 'acceptable' | 'weak' | 'loss';

  // Confidence
  isEstimate: boolean;
  lastCalculated: Timestamp;
}

/**
 * Internal org configuration for commercial calculations
 * One per org, configurable by admin
 */
export interface CommercialOrgSettings {
  id: string;
  orgId: string;

  // Internal rate for margin calculations
  internalDayRate: number; // $ per day

  // Margin thresholds (v1)
  marginThresholds: {
    strongMin: number; // e.g., 45%
    acceptableMin: number; // e.g., 30%
    weakMin: number; // e.g., 0%
  };

  // Time-to-cash norms (days, for flagging)
  timeToAcceptNorm: number; // if proposal takes longer, flag
  timeToCashNorm: number; // if deposit delayed beyond this, flag

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Commercial pattern (v1 = manual, feeds AI later)
 * Used to identify pricing trends and operational insights
 * 
 * Storage: orgs/{orgId}/commercialPatterns/{patternId}
 */
export interface CommercialPattern {
  id: string;
  orgId: string;

  description: string; // e.g., "Small tech clients consistently underpay for discovery"
  
  indicators: string[]; // e.g., ["service_type:discovery", "client_size:startup", "result:margin_weak"]
  
  examples: {
    projectId: string;
    projectName: string;
    margin?: number;
  }[];

  patternType: 'consistently_strong' | 'consistently_weak' | 'mispriced' | 'scope_creep' | 'wrong_fit';
  
  confidenceLevel: 'low' | 'medium' | 'high'; // based on number of examples
  
  suggestedAction?: string; // e.g., "increase discovery scope pricing by 20%"
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  discoveredBy: string;
}

/**
 * Profitability flag (v1 rules)
 * Used to surface emerging engagement issues
 * 
 * Rules:
 * - Margin below threshold
 * - Effort exceeds estimate by X%
 * - Excessive approved scope vs original value
 * - Repeated change requests without repricing
 * - Long time-to-cash vs norm
 */
export interface ProfitabilityFlag {
  id: string;
  orgId: string;
  projectId: string;

  flagType: 'margin_weak' | 'effort_overrun' | 'scope_excessive' | 'changes_unpriced' | 'cash_slow';
  
  severity: 'warning' | 'critical';
  
  description: string; // plain language explanation
  
  detectedValue: number; // e.g., actual margin percentage
  thresholdValue: number; // e.g., acceptable margin minimum
  
  isActive: boolean;
  
  acknowledgedAt?: Timestamp;
  acknowledgedBy?: string;
  acknowledgementNote?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Discount summary (for analytics)
 * Aggregate view of discounting patterns
 */
export interface DiscountSummary {
  orgId: string;
  
  // By client
  byClient: {
    clientId: string;
    clientName: string;
    totalDiscounted: number;
    frequencyCount: number;
    averageDiscountPercent?: number;
  }[];

  // By service suite
  byServiceSuite: {
    serviceSuite: string;
    totalDiscounted: number;
    frequencyCount: number;
    averageDiscountPercent?: number;
  }[];

  // By proposal type
  byProposalType: {
    proposalType: string;
    totalDiscounted: number;
    frequencyCount: number;
    averageDiscountPercent?: number;
  }[];

  // Patterns
  patterns: {
    repeatedClientsDiscounted: string[]; // client IDs discounted multiple times
    noRationaleDiscounts: number; // count of discounts without rationale
  };

  generatedAt: Timestamp;
}
