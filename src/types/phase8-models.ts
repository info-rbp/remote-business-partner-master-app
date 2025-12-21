/**
 * Phase 8: Knowledge Capture & Reuse Data Models
 * Structured insight capture, AI-assisted extraction (supervised), and reuse
 */

import { Timestamp } from 'firebase/firestore';

export type KnowledgeType8 = 'playbook' | 'framework' | 'pattern' | 'diagnostic' | 'caution';
export type KnowledgeConfidence = 'draft' | 'validated' | 'proven';

// orgs/{orgId}/knowledge/{knowledgeId}
export interface KnowledgeItem8 {
  id: string;
  orgId: string;
  title: string;
  type: KnowledgeType8;
  summary: string; // 1-2 paragraph human-readable
  detailedContent: {
    whatThisIs?: string;
    whenToUseIt?: string;
    whenNotToUseIt?: string;
    signals?: string[];
    steps?: string[];
    examples?: string[];
    caveats?: string[];
  };
  serviceSuites?: string[]; // e.g., 'Rapid Response', 'Stabilise & Recover'
  industries?: string[];
  proposalTypes?: string[]; // e.g., 'turnaround', 'growth', 'bid support'
  sourceProjects?: string[]; // projectIds
  confidenceLevel: KnowledgeConfidence; // starts as draft
  createdBy: string;
  reviewedBy?: string; // who validated it
  approvedAt?: Timestamp; // when promoted from draft
  usageCount?: number;
  lastUsedAt?: Timestamp;
  linkedOutcomes?: Array<{ projectId: string; outcome: 'success' | 'failure' | 'partial' }>;
  archivedAt?: Timestamp; // soft delete
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// projects/{projectId}/debriefs/{debriefId}
export interface Debrief8 {
  id: string;
  orgId: string;
  projectId: string;
  whatWorked: string; // free-text reflection
  whatDidNotWork: string;
  unexpectedIssues?: string;
  patternsObserved?: string;
  frameworksUsed?: string[];
  clientBehavioursWorthNoting?: string;
  wouldDoDifferentlyNextTime?: string;
  reusableInsights?: string; // raw human input
  submittedBy: string;
  submittedAt: Timestamp;
  extractedCandidateIds?: string[]; // links to AI-generated candidates
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// orgs/{orgId}/knowledgeCandidates/{candidateId}
// AI-generated candidates awaiting human review
export interface KnowledgeCandidate8 {
  id: string;
  orgId: string;
  sourceDebriefId?: string;
  sourceProjectId?: string;
  title: string;
  type: KnowledgeType8;
  summary: string;
  detailedContent?: Record<string, any>;
  suggestedTags?: {
    serviceSuites?: string[];
    industries?: string[];
    proposalTypes?: string[];
  };
  confidenceSuggestion: 'draft'; // always draft from AI
  generatedBy: 'ai' | 'human';
  status: 'pending-review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  approvedKnowledgeId?: string; // if promoted to KnowledgeItem8
  createdAt: Timestamp;
}

// orgs/{orgId}/knowledgeUsage/{usageId}
// Track where knowledge is applied
export interface KnowledgeUsage8 {
  id: string;
  orgId: string;
  knowledgeId: string;
  usedIn: 'proposal' | 'project' | 'deliverable' | 'decision';
  usedInId: string; // proposalId | projectId | deliverableId | decisionId
  usageType: 'reference' | 'adapted' | 'quoted';
  createdBy: string;
  createdAt: Timestamp;
}

// Optional: Health monitoring snapshot
export interface KnowledgeHealthCheck {
  orgId: string;
  knowledgeId: string;
  knowledgeTitle: string;
  unusedForDaysThreshold: number; // e.g., 90
  flaggedForReview: boolean;
  associatedFailures?: string[]; // projectIds
  suggestedAction?: string; // 'review' | 'consolidate' | 'archive'
  checkRunAt: Timestamp;
}
