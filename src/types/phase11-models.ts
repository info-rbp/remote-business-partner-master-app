/**
 * Phase 11: Operating Rhythm & Internal Management
 * Data models for operating summaries, dashboards, and decision tracking
 * 
 * Core principle: Rhythm beats insight. Summaries are memory, dashboards are ephemeral.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Core entity: Operating Summary
 * Immutable once acknowledged, versions are never overwritten
 * 
 * Storage: orgs/{orgId}/operatingSummaries/{summaryId}
 */
export interface OperatingSummary {
  id: string;
  orgId: string;

  // Type and period
  type: 'weekly' | 'monthly' | 'quarterly';
  periodStart: Timestamp;
  periodEnd: Timestamp;

  // Generation
  generatedAt: Timestamp;
  generatedBy: 'system' | 'user';
  generatedByUserId: string;

  // Snapshot data (immutable once generated)
  snapshot: {
    // Pipeline metrics
    pipeline?: {
      newLeads: number;
      qualifiedOpportunities: number;
      proposalsSent: number;
      proposalsAccepted: number;
      totalActivePipelineValue: number;
      stalledOpportunitiesCount: number;
      dealsWaitingOnClientDays: Array<{
        proposalId: string;
        clientName: string;
        daysSinceUpdate: number;
      }>;
    };

    // Delivery metrics
    delivery?: {
      activeProjectsCount: number;
      milestoneDueThisWeek: number;
      overdueMillestones: number;
      deliverablesAwaitingApproval: number;
      missedWeeklyUpdates: number;
      riskCount: number;
      changeRequestsOpen: number;
    };

    // Risk & scope
    risk?: {
      openRisksCount: number;
      openRisksBySeverity: {
        critical: number;
        high: number;
        medium: number;
        low: number;
      };
      newChangeRequests: number;
      changeRequestsPendingApproval: number;
      escalatedRedFlags: number;
    };

    // Commercial
    commercial?: {
      projectsBelowMarginThreshold: number;
      slowTimeToCashFlags: number;
      newDiscountsApplied: number;
      engagementsTrendingWeak: number;
      totalQuotedValue: number;
      averageMarginPercent: number;
    };

    // Knowledge & proof
    knowledge?: {
      newKnowledgeItems: number;
      knowledgeCandidatesReviewed: number;
      proofAssetsPublished: number;
    };
  };

  // Human-editable annotations
  highlights: string[]; // what went well, key wins
  concerns: string[]; // what worries us, patterns to watch
  decisionsRequired: Array<{
    id: string;
    title: string;
    description: string;
    owner?: string;
    dueDate?: Timestamp;
    linkToDecisionLog?: string;
  }>;

  // Actions agreed upon
  actionsAgreed: Array<{
    id: string;
    description: string;
    owner: string;
    dueDate: Timestamp;
  }>;

  // Acknowledgement (immutable after this)
  acknowledgedAt?: Timestamp;
  acknowledgedBy?: string;

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isFinalized: boolean; // becomes true after acknowledgement
}

/**
 * Weekly Operating Dashboard view
 * This is the data structure for the Monday morning screen
 * Calculated/assembled on-demand, not stored
 */
export interface WeeklyOperatingView {
  orgId: string;
  generatedAt: Timestamp;

  // 1. Pipeline Snapshot
  pipelineSnapshot: {
    newLeads: number;
    qualifiedOpportunities: number;
    proposalsSent: number;
    proposalsAccepted: number;
    totalActivePipelineValue: number;
    highlights: {
      stalledDeals: number;
      dealsWaitingOnClient: Array<{
        proposalId: string;
        clientName: string;
        daysSinceUpdate: number;
      }>;
    };
  };

  // 2. Delivery Health
  deliverySnapshot: {
    activeProjects: number;
    milestonesDueThisWeek: number;
    overdueMillestones: number;
    deliverablesAwaitingApproval: number;
    missedUpdates: number;
  };

  // 3. Risk & Scope
  riskSnapshot: {
    openRisks: number;
    risksBySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    newChangeRequests: number;
    changeRequestsPending: number;
    escalatedRedFlags: number;
  };

  // 4. Commercial Signals
  commercialSignals: {
    projectsBelowMargin: number;
    slowCashFlags: number;
    newDiscounts: number;
    weakEngagements: number;
  };

  // 5. Decisions Required
  decisionsRequired: Array<{
    decisionId: string;
    title: string;
    daysOverdue: number;
    owner?: string;
  }>;
}

/**
 * Monthly summary - pattern recognition
 * Shows trends, not just snapshots
 */
export interface MonthlySummaryData {
  periodMonth: string; // YYYY-MM
  
  // Trends
  pipelineTrend: 'up' | 'down' | 'stagnant';
  pipelineTrendPercent: number;
  
  winLossByServiceSuite: Array<{
    serviceSuite: string;
    wins: number;
    losses: number;
    winRate: number;
  }>;

  // Delivery patterns
  deliveryRiskTrend: string; // "stable" | "increasing" | "decreasing"
  scopeChangeFrequency: number; // count of change requests
  averageScopeChangeValue: number;

  // Commercial patterns
  marginTrend: number; // average margin percent
  discountTrend: number; // number of discounts this month
  averageDiscountPercent: number;

  // Knowledge & proof
  proofAssetsCreated: number;
  proofAssetsPublished: number;
  knowledgeItemsAdded: number;

  // Prompted fields (filled by admin)
  bestPerformer?: string; // service/team/project that excelled
  marginErosionSpot?: string; // where did we lose money
  repeatedRiskPattern?: string; // what keeps happening
  operationalFrictionPoint?: string; // what slowed us down
}

/**
 * Quarterly summary - strategic thinking
 * Hard-coded prompts to force deep thinking
 */
export interface QuarterlySummaryData {
  periodQuarter: string; // Q1-Q4 2024

  // Service mix changes
  servicesSold: string[];
  servicesMixChange: Array<{
    serviceSuite: string;
    percentOfRevenue: number;
    trend: 'growing' | 'stable' | 'shrinking';
  }>;

  // Client maturity trends
  topClientsByRevenue: Array<{
    clientId: string;
    clientName: string;
    revenue: number;
    marginPercent: number;
  }>;

  repeatedHighMarginServiceSuite: string[];
  repeatedLowMarginServiceSuite: string[];

  // Pricing effectiveness
  averageProposalAcceptanceRate: number; // percent
  averageMarginByProposalType: Array<{
    proposalType: string;
    marginPercent: number;
  }>;

  // Repeated themes
  repeatedRisks: string[]; // top 5 risk types seen
  repeatedScopeIssues: string; // description of scope creep patterns
  repeatedClientFriction: string; // what types of clients cause headaches

  // Knowledge & proof
  proofAssetsPublished: number;
  knowledgeItemsCreated: number;
  casesStudiesFromDelivery: number;

  // Prompted strategic responses (filled by admin - required)
  whatToStopSelling: string; // hard question
  whatToDoubleDownOn: string; // opportunity to lean in
  whichClientTypesNoLongerFit: string; // maturity/culture mismatch
  operationalFrictionToResolve: string; // recurring bottlenecks
  pricingAdjustmentNeeded?: string; // where do we need to raise prices
  serviceDefinitionUpdates?: string; // what needs to change about how we deliver

  // Decision outcomes from this quarter
  strategicDecisionsMade: Array<{
    decision: string;
    rationale: string;
    implementationDate: Timestamp;
  }>;
}

/**
 * Decision Log entry (linked from Operating Summaries)
 * Keeps decisions visible across summaries until resolved
 */
export interface OperatingDecision {
  id: string;
  orgId: string;

  title: string;
  description: string;
  context?: string; // why this decision

  owner: string;
  createdAt: Timestamp;
  dueDate?: Timestamp;

  status: 'open' | 'in_progress' | 'resolved' | 'deferred';

  linkedSummaries: string[]; // operating summary IDs this decision appears in
  linkedToDecisionLog?: string; // reference to Phase 7 Decision Log if applicable

  resolution?: {
    resolvedAt: Timestamp;
    resolvedBy: string;
    outcome: string;
  };

  updatedAt: Timestamp;
}

/**
 * Notification for operating rhythm (keeps the system moving)
 */
export interface OperatingNotification {
  id: string;
  orgId: string;

  notificationType:
    | 'weekly_summary_ready'
    | 'summary_unacknowledged'
    | 'monthly_review_due'
    | 'quarterly_review_overdue'
    | 'decision_unresolved';

  summaryId?: string;
  decisionId?: string;

  title: string;
  description: string;

  severity: 'info' | 'warning' | 'urgent';
  actionUrl?: string;

  createdAt: Timestamp;
  dismissedAt?: Timestamp;
  dismissedBy?: string;

  snoozedUntil?: Timestamp; // can snooze, but returns
}
