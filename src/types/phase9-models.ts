/**
 * Phase 9: Proof, Reputation & Content Engine Data Models
 * Structured proof asset capture, approval, and publishing
 */

import { Timestamp } from 'firebase/firestore';

export type ProofType9 = 'case_study' | 'testimonial' | 'outcome_snapshot';
export type ProofStatus = 'draft' | 'pending_client_approval' | 'approved' | 'published' | 'archived';
export type ProofVisibility = 'public' | 'private' | 'internal';
export type AttributionType = 'named' | 'role_only' | 'anonymised';

// orgs/{orgId}/proof/{proofId}
export interface ProofAsset9 {
  id: string;
  orgId: string;
  type: ProofType9;
  title: string;
  status: ProofStatus;
  visibility: ProofVisibility;
  anonymised: boolean;
  
  // Links
  clientId?: string;
  projectId?: string;
  
  // Tags for reuse
  serviceSuites?: string[];
  industries?: string[];
  
  // Structured content
  metrics?: Array<{
    label: string;
    value: string;
    beforeValue?: string; // for before/after
  }>;
  
  narrative?: {
    challenge?: string;
    approach?: string;
    outcome?: string;
  };
  
  clientQuote?: string;
  
  // Attribution
  attribution?: {
    clientName?: string;
    clientRole?: string;
    type: AttributionType;
  };
  
  // Approval & publication
  approvedByClientAt?: Timestamp;
  approvalScope?: string[]; // e.g., ['website', 'proposals', 'social']
  approvalRequestToken?: string; // for client approval link
  
  publishedAt?: Timestamp;
  
  // Performance tracking
  usageCount?: number;
  lastUsedAt?: Timestamp;
  linkedWins?: Array<{ proposalId: string; winDate: Timestamp }>;
  
  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archivedAt?: Timestamp;
}

// projects/{projectId}/outcomes/{outcomeId}
// Captured at project completion, feeds proof creation
export interface OutcomeCapture9 {
  id: string;
  orgId: string;
  projectId: string;
  
  // Outcomes achieved (structured)
  outcomesAchieved?: string[];
  
  // Metrics (before/after)
  metrics?: Array<{
    label: string;
    beforeValue?: string;
    afterValue?: string;
    unit?: string;
  }>;
  
  // Unexpected wins or failures
  unexpectedWins?: string[];
  unexpectedChallenges?: string[];
  
  // Client feedback
  clientFeedbackNotes?: string;
  clientSentiment?: 'very_positive' | 'positive' | 'neutral' | 'negative';
  
  // Proof suitability
  suitableForCaseStudy?: boolean;
  suitableForTestimonial?: boolean;
  
  // Metadata
  submittedBy: string;
  submittedAt: Timestamp;
  createdAt: Timestamp;
}

// orgs/{orgId}/proofApprovals/{approvalId}
// Track client approvals
export interface ProofApproval9 {
  id: string;
  orgId: string;
  proofId: string;
  clientId: string;
  clientEmail?: string;
  
  status: 'pending' | 'approved' | 'changes_requested' | 'revoked';
  
  previewToken: string; // unique token for client approval link
  previewExpiresAt: Timestamp;
  
  approvedAt?: Timestamp;
  revokedAt?: Timestamp;
  
  approvalScope?: string[]; // where client allows use
  
  changesRequested?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// orgs/{orgId}/proofUsage/{usageId}
// Track where proof is used
export interface ProofUsage9 {
  id: string;
  orgId: string;
  proofId: string;
  usedIn: 'website' | 'proposal' | 'email' | 'social';
  usedInId?: string; // e.g., proposalId
  createdBy: string;
  createdAt: Timestamp;
}

// Optional: Proof performance summary (for reporting)
export interface ProofPerformance {
  orgId: string;
  proofId: string;
  title: string;
  type: ProofType9;
  usageCount: number;
  lastUsedAt?: Timestamp;
  linkedWinsCount: number;
  serviceSuites?: string[];
  industries?: string[];
  publishedAt?: Timestamp;
}
