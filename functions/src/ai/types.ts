/**
 * AI Service Type Definitions
 * Comprehensive types for AI infrastructure and governance
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// PROMPT & SCHEMA REGISTRY
// ============================================================================

export type AIActionType = 
  | 'generate' 
  | 'regenerate' 
  | 'analyze' 
  | 'summarize' 
  | 'extract'
  | 'detect'
  | 'assess';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  actionType: AIActionType;
  version: string;
  template: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  systemPrompt?: string;
  constraints?: string[];
  examples?: Array<{
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  }>;
  metadata: {
    createdAt: Timestamp;
    createdBy: string;
    updatedAt: Timestamp;
    deprecated?: boolean;
    replacedBy?: string;
  };
}

export interface SchemaDefinition {
  id: string;
  name: string;
  version: string;
  schema: Record<string, unknown>; // JSON Schema
  description: string;
  entityType?: string;
  validationRules?: string[];
  metadata: {
    createdAt: Timestamp;
    createdBy: string;
    deprecated?: boolean;
  };
}

// ============================================================================
// AI EXECUTION LOG
// ============================================================================

export interface AIExecutionLog {
  id: string;
  orgId: string;
  entityType: string; // 'proposal', 'project', 'engagement', etc.
  entityId: string;
  actionType: AIActionType;
  promptId: string;
  promptVersion: string;
  schemaId: string;
  schemaVersion: string;
  
  // Execution context
  executedBy: string; // User ID
  executedByRole: string;
  executionTimestamp: Timestamp;
  durationMs: number;
  
  // Input/Output snapshots
  inputSnapshot: {
    storagePath?: string; // gs://bucket/path for large inputs
    sizeBytes: number;
    summary?: string;
    hash?: string;
  };
  
  outputSnapshot: {
    storagePath?: string; // gs://bucket/path for large outputs
    sizeBytes: number;
    summary?: string;
    hash?: string;
  };
  
  // Validation & quality
  validationStatus: 'passed' | 'failed' | 'partial';
  validationErrors?: string[];
  schemaCompliant: boolean;
  warnings?: string[];
  confidenceScore?: number; // 0-1
  
  // Model information
  modelName: string;
  modelVersion: string;
  temperature?: number;
  tokensUsed?: number;
  
  // Audit trail
  previousVersionRef?: string; // Reference to previous AI execution for this entity
  modifiedSections?: string[];
  humanReviewed?: boolean;
  humanReviewedBy?: string;
  humanReviewedAt?: Timestamp;
  
  // Metadata
  metadata?: Record<string, unknown>;
  tags?: string[];
}

// ============================================================================
// AI SERVICE REQUEST/RESPONSE INTERFACES
// ============================================================================

export interface BaseAIRequest {
  orgId: string;
  entityType: string;
  entityId: string;
  executedBy: string;
  executedByRole: string;
}

export interface BaseAIResponse {
  success: boolean;
  executionLogId: string;
  validationStatus: 'passed' | 'failed' | 'partial';
  warnings?: string[];
  errorMessage?: string;
}

// ============================================================================
// PROPOSAL GENERATION TYPES
// ============================================================================

export interface ProposalGenerationRequest extends BaseAIRequest {
  proposalId: string;
  discoveryAnswers: Record<string, unknown>;
  serviceTemplateId?: string;
  businessProfile: {
    name: string;
    industry?: string;
    services: string[];
    differentiators?: string[];
    methodology?: string[];
  };
  clientProfile: {
    companyName: string;
    industry?: string;
    challenges?: string[];
    goals?: string[];
  };
  historicalReferences?: Array<{
    type: 'proposal' | 'project' | 'case-study';
    id: string;
    relevanceScore: number;
  }>;
}

export interface ProposalGenerationResponse extends BaseAIResponse {
  generatedSections: {
    executiveSummary?: string;
    diagnosis?: string;
    scope?: string;
    methodology?: string;
    deliverables?: Array<{
      name: string;
      description: string;
      acceptanceCriteria?: string[];
    }>;
    timeline?: {
      estimatedDuration: number;
      milestones: Array<{
        name: string;
        description: string;
        dueOffset: number;
      }>;
    };
    assumptions?: string[];
    exclusions?: string[];
    acceptanceCriteria?: string[];
    nextSteps?: string[];
  };
  summary: {
    sectionsGenerated: string[];
    sectionsSkipped?: string[];
    qualityScore?: number;
  };
}

// ============================================================================
// SECTION REGENERATION TYPES
// ============================================================================

export interface SectionRegenerationRequest extends BaseAIRequest {
  proposalId: string;
  sectionKey: string;
  currentContent: string | Record<string, unknown>;
  instructions?: string;
  fullProposalContext: Record<string, unknown>;
  lockedSections: string[];
}

export interface SectionRegenerationResponse extends BaseAIResponse {
  sectionKey: string;
  newContent: string | Record<string, unknown>;
  changesSummary: string;
  preservedFields?: string[];
}

// ============================================================================
// RISK ANALYSIS TYPES
// ============================================================================

export interface ProposalRiskAnalysisRequest extends BaseAIRequest {
  proposalId: string;
  proposalData: {
    pricing?: {
      totalAmount?: number;
      currency?: string;
      model?: string;
    };
    scope?: string;
    timeline?: {
      estimatedDuration?: number;
      milestones?: unknown[];
    };
    deliverables?: unknown[];
  };
  historicalProposals?: Array<{
    id: string;
    outcome: string;
    metrics?: Record<string, unknown>;
  }>;
}

export interface ProposalRiskAnalysisResponse extends BaseAIResponse {
  riskFlags: Array<{
    category: 'pricing' | 'scope' | 'timeline' | 'deliverables' | 'resources';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    evidence?: string;
    suggestedAction?: string;
  }>;
  overallRiskScore: number; // 0-100
  confidenceScore: number; // 0-1
  suggestedAdjustments?: Array<{
    field: string;
    currentValue: string | number;
    suggestedValue: string | number;
    rationale: string;
  }>;
}

// ============================================================================
// ENGAGEMENT INTELLIGENCE TYPES
// ============================================================================

export interface EngagementSummaryRequest extends BaseAIRequest {
  projectId: string;
  projectData: {
    name: string;
    status: string;
    startDate: Timestamp;
    endDate?: Timestamp;
    milestones?: unknown[];
    deliverables?: unknown[];
  };
  recentUpdates: unknown[];
  recentRisks: unknown[];
  changeRequests: unknown[];
  clientInteractions: unknown[];
}

export interface EngagementSummaryResponse extends BaseAIResponse {
  summary: {
    executiveSummary: string;
    progressVsPlan: {
      status: 'on-track' | 'at-risk' | 'delayed';
      percentComplete: number;
      details: string;
    };
    majorRisks: Array<{
      title: string;
      impact: 'low' | 'medium' | 'high';
      description: string;
    }>;
    upcomingDecisions: Array<{
      title: string;
      deadline?: string;
      importance: 'low' | 'medium' | 'high';
      context: string;
    }>;
    clientSentiment?: 'positive' | 'neutral' | 'negative';
  };
}

// ============================================================================
// RISK DETECTION TYPES
// ============================================================================

export interface EngagementRiskDetectionRequest extends BaseAIRequest {
  projectId: string;
  signals: {
    missedMilestones: number;
    repeatedRevisions: number;
    delayedResponses: number;
    scopeChanges: number;
    decisionVelocity: number; // days
  };
  projectContext: Record<string, unknown>;
  historicalBaseline?: Record<string, unknown>;
}

export interface EngagementRiskDetectionResponse extends BaseAIResponse {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  detectedIssues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    evidence: string[];
  }>;
  recommendedMitigations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    rationale: string;
  }>;
}

// ============================================================================
// KNOWLEDGE EXTRACTION TYPES
// ============================================================================

export interface KnowledgeExtractionRequest extends BaseAIRequest {
  projectId: string;
  projectData: {
    name: string;
    outcomes: Record<string, unknown>;
    metrics?: Record<string, unknown>;
  };
  proposalData?: Record<string, unknown>;
  deliverables: unknown[];
  debriefNotes?: string;
  clientFeedback?: string;
}

export interface KnowledgeExtractionResponse extends BaseAIResponse {
  insights: Array<{
    type: 'pattern' | 'framework' | 'pitfall' | 'best-practice';
    title: string;
    description: string;
    applicability: string[];
    confidence: number; // 0-1
  }>;
  suggestedTags: string[];
  draftKnowledgeEntry: {
    title: string;
    summary: string;
    context: string;
    approach: string;
    outcome: string;
    lessonsLearned: string[];
  };
}

// ============================================================================
// CASE STUDY DRAFTING TYPES
// ============================================================================

export interface CaseStudyDraftRequest extends BaseAIRequest {
  projectId: string;
  projectOutcomes: {
    metrics: Record<string, unknown>;
    achievements: string[];
    feedback?: string;
  };
  clientQuotes?: string[];
  anonymize: boolean;
  targetAudience?: string;
}

export interface CaseStudyDraftResponse extends BaseAIResponse {
  draft: {
    title: string;
    tagline: string;
    challenge: string;
    approach: string;
    outcome: string;
    metrics: Array<{
      label: string;
      value: string;
      emphasis?: boolean;
    }>;
    testimonial?: string;
  };
  seoSuggestions: {
    keywords: string[];
    metaDescription: string;
    slug: string;
  };
}

// ============================================================================
// DECISION BRIEF TYPES
// ============================================================================

export interface DecisionBriefRequest extends BaseAIRequest {
  contextEntityType: string;
  contextEntityId: string;
  recentActivity: unknown[];
  risks: unknown[];
  financials?: Record<string, unknown>;
  options?: Array<{
    name: string;
    description: string;
    pros?: string[];
    cons?: string[];
  }>;
}

export interface DecisionBriefResponse extends BaseAIResponse {
  brief: {
    situation: string;
    options: Array<{
      name: string;
      description: string;
      pros: string[];
      cons: string[];
      risks: string[];
    }>;
    recommendation: {
      option: string;
      rationale: string;
      assumptions: string[];
    };
    risks: Array<{
      description: string;
      likelihood: 'low' | 'medium' | 'high';
      impact: 'low' | 'medium' | 'high';
      mitigation?: string;
    }>;
  };
}

// ============================================================================
// SCHEDULED REPORTING TYPES
// ============================================================================

export interface PipelineHealthReport {
  orgId: string;
  reportDate: Timestamp;
  metrics: {
    totalLeads: number;
    qualifiedLeads: number;
    activeProposals: number;
    acceptanceRate: number;
    averageDealSize: number;
    projectedRevenue: number;
  };
  risks: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  upcomingDecisions: Array<{
    context: string;
    deadline: string;
  }>;
}

export interface DeliveryHealthReport {
  orgId: string;
  reportDate: Timestamp;
  activeProjects: number;
  projectStatus: {
    onTrack: number;
    atRisk: number;
    delayed: number;
  };
  risks: Array<{
    projectId: string;
    projectName: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  upcomingMilestones: Array<{
    projectId: string;
    projectName: string;
    milestoneName: string;
    dueDate: Timestamp;
  }>;
}

// ============================================================================
// CLIENT-FACING TYPES
// ============================================================================

export interface ClientEngagementSummaryRequest {
  clientId: string;
  projectId: string;
  includeFields: string[]; // Whitelist of allowed fields
}

export interface ClientEngagementSummaryResponse {
  summary: {
    currentStatus: string;
    progressUpdate: string;
    completedItems: string[];
    upcomingItems: string[];
    requiredActions: Array<{
      title: string;
      description: string;
      deadline?: string;
    }>;
    changesSinceLastReview: string[];
  };
  // NO internal risks, pricing logic, or speculative advice
}
