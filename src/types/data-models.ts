/**
 * Comprehensive Data Models for SaaS Platform
 * Firestore-first schemas with RBAC, lifecycle workflows, and audit trails
 */

import { Timestamp, FieldValue } from 'firebase/firestore';

// ============================================================================
// CORE ENTITIES
// ============================================================================

export type UserRole = 'admin' | 'staff' | 'client' | 'public';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  orgId?: string; // Primary org pointer
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  emailVerified: boolean;
  disabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface Organization {
  id: string;
  name: string;
  displayName: string;
  domain?: string;
  logo?: string;
  industry?: string;
  size?: string;
  website?: string;
  abn?: string; // Australian Business Number
  address?: Address;
  primaryContactId?: string;
  status: 'active' | 'suspended' | 'archived';
  settings: OrgSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  auditRef?: string;
}

export interface OrgSettings {
  timezone: string;
  currency: string;
  fiscalYearStart: string; // MM-DD format
  defaultProposalTerms?: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
  };
  features: {
    aiEnabled: boolean;
    clientPortalEnabled: boolean;
    crmEnabled: boolean;
  };
}

export interface OrgMember {
  userId: string;
  orgId: string;
  role: UserRole;
  email: string;
  displayName?: string;
  clientId?: string; // If role is 'client', link to client entity
  projectIds?: string[]; // Client access to specific projects
  invitedBy: string;
  invitedAt: Timestamp;
  acceptedAt?: Timestamp;
  status: 'pending' | 'active' | 'suspended';
  permissions?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  auditRef?: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
}

// ============================================================================
// CRM ENTITIES
// ============================================================================

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'disqualified' | 'converted' | 'lost';
export type LeadSource = 'website' | 'referral' | 'linkedin' | 'email' | 'event' | 'other';

export interface Lead {
  id: string;
  orgId: string;
  source: LeadSource;
  sourceDetail?: string;
  serviceInterest: string[];
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  fitScore?: number; // 0-100
  status: LeadStatus;
  
  // Contact details
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  
  // Additional context
  message?: string;
  notes?: string;
  budget?: string;
  timeline?: string;
  
  // Assignment and follow-up
  assignedTo?: string;
  nextFollowUp?: Timestamp;
  lastContactedAt?: Timestamp;
  
  // Conversion tracking
  convertedToCompanyId?: string;
  convertedToContactId?: string;
  convertedToOpportunityId?: string;
  convertedAt?: Timestamp;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  linkedEntities?: LinkedEntity[];
  auditRef?: string;
}

export interface Company {
  id: string;
  orgId: string;
  name: string;
  abn?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'enterprise';
  website?: string;
  address?: Address;
  description?: string;
  
  // Key contacts
  primaryContactId?: string;
  keyContacts: CompanyContact[];
  
  // Relationship
  relationshipStatus: 'prospect' | 'active' | 'inactive' | 'past';
  lifetimeValue?: number;
  accountManager?: string;
  
  // Social and identifiers
  linkedInUrl?: string;
  tags?: string[];
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  linkedEntities?: LinkedEntity[];
  auditRef?: string;
}

export interface CompanyContact {
  contactId: string;
  role: string;
  isPrimary: boolean;
  decisionMaker?: boolean;
}

export interface Contact {
  id: string;
  orgId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  role?: string;
  
  // Company association
  linkedCompanyId?: string;
  linkedCompanyName?: string;
  
  // Engagement
  preferredContactMethod?: 'email' | 'phone' | 'sms' | 'linkedin';
  timezone?: string;
  notes?: string;
  tags?: string[];
  
  // Social
  linkedInUrl?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  linkedEntities?: LinkedEntity[];
  auditRef?: string;
}

export type OpportunityStage = 
  | 'lead' 
  | 'qualification' 
  | 'proposal' 
  | 'negotiation' 
  | 'won' 
  | 'lost' 
  | 'on-hold';

export interface Opportunity {
  id: string;
  orgId: string;
  name: string;
  companyId: string;
  companyName: string;
  primaryContactId: string;
  primaryContactName: string;
  
  // Deal details
  valueEstimate?: number;
  probability: number; // 0-100
  stage: OpportunityStage;
  expectedCloseDate?: Timestamp;
  
  // Proposal and project links
  linkedProposalId?: string;
  linkedProjectId?: string;
  
  // Sales process
  nextStep: string;
  nextStepDate?: Timestamp;
  owner: string;
  
  // Context
  description?: string;
  painPoints?: string[];
  competitorInfo?: string;
  decisionCriteria?: string[];
  
  // Outcome
  wonDate?: Timestamp;
  lostDate?: Timestamp;
  lostReason?: string;
  actualValue?: number;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  linkedEntities?: LinkedEntity[];
  auditRef?: string;
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'task' | 'note' | 'proposal-sent' | 'contract-signed';
export type ActivityStatus = 'pending' | 'completed' | 'cancelled' | 'overdue';

export interface Activity {
  id: string;
  orgId: string;
  type: ActivityType;
  subject: string;
  description?: string;
  
  // Scheduling
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  duration?: number; // minutes
  
  // Assignment
  owner: string;
  participants?: string[];
  
  // Status
  status: ActivityStatus;
  priority?: 'low' | 'medium' | 'high';
  
  // Linked entities
  linkedEntityType?: 'lead' | 'company' | 'contact' | 'opportunity' | 'proposal' | 'project';
  linkedEntityId?: string;
  linkedEntityName?: string;
  
  // Outcome
  outcome?: string;
  followUpRequired?: boolean;
  followUpDate?: Timestamp;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  auditRef?: string;
}

// ============================================================================
// PROPOSAL ENGINE
// ============================================================================

export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'converted' | 'archived';

export interface Proposal {
  id: string;
  orgId: string;
  title: string;
  version: number;
  status: ProposalStatus;
  
  // Client info
  clientId?: string;
  companyId?: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  
  // Proposal structure
  executiveSummary: string;
  diagnosis?: string;
  scope: string;
  methodology?: string;
  deliverables: ProposalDeliverable[];
  timeline: ProposalTimeline;
  pricing: ProposalPricing;
  assumptions?: string[];
  exclusions?: string[];
  acceptanceCriteria?: string[];
  nextSteps?: string[];
  
  // AI generation metadata
  aiGenerated?: boolean;
  aiPrompt?: string;
  sectionLocks?: ProposalSectionLocks;
  
  // Lifecycle tracking
  sentAt?: Timestamp;
  viewedAt?: Timestamp;
  acceptedAt?: Timestamp;
  declinedAt?: Timestamp;
  declineReason?: string;
  convertedAt?: Timestamp;
  convertedToProjectId?: string;
  
  // Sharing
  shareToken?: string;
  shareExpiry?: Timestamp;
  shareViewCount?: number;
  
  // Linked entities
  opportunityId?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  linkedEntities?: LinkedEntity[];
  auditRef?: string;
}

export interface ProposalDeliverable {
  id: string;
  name: string;
  description: string;
  milestoneId?: string;
  dueOffset?: number; // days from project start
}

export interface ProposalTimeline {
  estimatedDuration: number; // days
  startDate?: Timestamp;
  endDate?: Timestamp;
  milestones: ProposalMilestone[];
}

export interface ProposalMilestone {
  id: string;
  name: string;
  description?: string;
  dueOffset: number; // days from project start
  dependencies?: string[];
}

export interface ProposalPricing {
  currency: string;
  totalAmount: number;
  billingModel: 'fixed' | 'hourly' | 'milestone' | 'retainer' | 'custom';
  lineItems: PricingLineItem[];
  paymentTerms?: string;
  paymentSchedule?: PaymentSchedule[];
}

export interface PricingLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PaymentSchedule {
  id: string;
  name: string;
  amount: number;
  dueOffset: number; // days from project start or milestone
  linkedMilestoneId?: string;
  status?: 'pending' | 'paid' | 'overdue';
}

export interface ProposalSectionLocks {
  executiveSummary?: boolean;
  diagnosis?: boolean;
  scope?: boolean;
  methodology?: boolean;
  deliverables?: boolean;
  timeline?: boolean;
  pricing?: boolean;
}

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================

export type ProjectStatus = 
  | 'onboarding' 
  | 'in-progress' 
  | 'on-hold' 
  | 'at-risk' 
  | 'completed' 
  | 'cancelled';

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  
  // Client info
  clientId: string;
  companyId?: string;
  companyName: string;
  primaryContactId?: string;
  
  // Project details
  startDate: Timestamp;
  endDate: Timestamp;
  actualStartDate?: Timestamp;
  actualEndDate?: Timestamp;
  
  // Budget
  budget?: number;
  actualCost?: number;
  currency?: string;
  
  // Team
  projectManager: string;
  teamMembers: string[];
  clientUsers: string[]; // User IDs with client role access
  
  // Milestones and deliverables
  milestones: ProjectMilestone[];
  deliverables: ProjectDeliverable[];
  
  // Proposal linkage
  sourceProposalId?: string;
  proposalSnapshot?: Partial<Proposal>;
  
  // Health and tracking
  healthStatus: 'green' | 'yellow' | 'red';
  progressPercentage: number;
  lastStatusUpdate?: Timestamp;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  linkedEntities?: LinkedEntity[];
  auditRef?: string;
}

export interface ProjectMilestone {
  id: string;
  name: string;
  description?: string;
  dueDate: Timestamp;
  completedAt?: Timestamp;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  dependencies?: string[];
  owner: string;
  deliverableIds?: string[];
}

export type DeliverableStatus = 
  | 'not-started' 
  | 'in-progress' 
  | 'review' 
  | 'client-review' 
  | 'approved' 
  | 'rejected' 
  | 'completed';

export interface ProjectDeliverable {
  id: string;
  name: string;
  description: string;
  status: DeliverableStatus;
  dueDate: Timestamp;
  completedAt?: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
  rejectedAt?: Timestamp;
  rejectionReason?: string;
  revisionCount?: number;
  maxRevisions?: number;
  milestoneId?: string;
  documentIds?: string[];
  owner: string;
}

// ============================================================================
// SCOPE CONTROL & RISKS
// ============================================================================

export type ChangeRequestStatus = 
  | 'draft' 
  | 'pending-review' 
  | 'approved' 
  | 'declined' 
  | 'implemented';

export interface ChangeRequest {
  id: string;
  orgId: string;
  projectId: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedByType: 'client' | 'staff';
  status: ChangeRequestStatus;
  
  // Impact analysis
  timeImpact?: number; // days
  costImpact?: number;
  timelineImpact?: string;
  scopeImpact: 'minor' | 'moderate' | 'major';
  
  // Review and decision
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  reviewNotes?: string;
  decision?: 'approve' | 'decline' | 'reprice';
  repriceAmount?: number;
  
  // Implementation
  implementedAt?: Timestamp;
  implementationNotes?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  linkedEntities?: LinkedEntity[];
  auditRef?: string;
}

export type RiskStatus = 'identified' | 'monitoring' | 'mitigating' | 'resolved' | 'occurred';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskLikelihood = 'unlikely' | 'possible' | 'likely' | 'certain';

export interface Risk {
  id: string;
  orgId: string;
  projectId?: string;
  proposalId?: string;
  title: string;
  description: string;
  category?: string;
  severity: RiskSeverity;
  likelihood: RiskLikelihood;
  status: RiskStatus;
  
  // Mitigation
  mitigation?: string;
  mitigationOwner?: string;
  mitigationDueDate?: Timestamp;
  
  // Impact
  impact?: string;
  occurredAt?: Timestamp;
  resolution?: string;
  resolvedAt?: Timestamp;
  
  // Metadata
  identifiedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  linkedEntities?: LinkedEntity[];
  auditRef?: string;
}

// ============================================================================
// KNOWLEDGE CAPITAL & PROOF
// ============================================================================

export type KnowledgeType = 'playbook' | 'template' | 'framework' | 'checklist' | 'lesson';

export interface Knowledge {
  id: string;
  orgId: string;
  type: KnowledgeType;
  title: string;
  description: string;
  content: string;
  category?: string;
  tags?: string[];
  
  // Usage and effectiveness
  usageCount?: number;
  rating?: number;
  lastUsed?: Timestamp;
  
  // Versioning
  version: number;
  parentId?: string;
  
  // Access control
  visibility: 'internal' | 'team' | 'restricted';
  
  // Source
  sourceProjectId?: string;
  capturedBy?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  auditRef?: string;
}

export interface ProjectDebrief {
  id: string;
  orgId: string;
  projectId: string;
  projectName: string;
  completedAt: Timestamp;
  
  // Retrospective
  whatWorkedWell: string[];
  whatCouldImprove: string[];
  lessonsLearned: string[];
  avoidList: string[];
  
  // Reusable assets
  reusableAssets: DebriefAsset[];
  knowledgeArticlesCreated?: string[];
  
  // Participants
  participants: string[];
  facilitator: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface DebriefAsset {
  type: 'template' | 'code' | 'document' | 'process';
  name: string;
  description: string;
  location?: string;
  knowledgeId?: string;
}

export type ProofType = 'case-study' | 'testimonial' | 'metric' | 'reference';

export interface Proof {
  id: string;
  orgId: string;
  type: ProofType;
  title: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  
  // Project linkage
  projectId?: string;
  projectName?: string;
  clientId?: string;
  clientName?: string;
  companyName?: string;
  
  // Content
  content: ProofContent;
  
  // Publication
  publishedAt?: Timestamp;
  expiryDate?: Timestamp;
  visibility: 'public' | 'restricted' | 'private';
  
  // Approval
  clientApproval?: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp;
  
  // Usage
  viewCount?: number;
  shareCount?: number;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  tags?: string[];
}

export interface ProofContent {
  summary?: string;
  challenge?: string;
  solution?: string;
  results?: string;
  testimonial?: string;
  metrics?: ProofMetric[];
  images?: string[];
  videoUrl?: string;
}

export interface ProofMetric {
  label: string;
  value: string;
  improvement?: string;
}

export interface ReviewRequest {
  id: string;
  orgId: string;
  projectId: string;
  clientId: string;
  contactEmail: string;
  status: 'pending' | 'completed' | 'declined' | 'expired';
  
  // Content
  requestMessage?: string;
  rating?: number;
  review?: string;
  publicPermission?: boolean;
  
  // Tracking
  sentAt: Timestamp;
  respondedAt?: Timestamp;
  expiryDate: Timestamp;
  reminderSentAt?: Timestamp;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// ============================================================================
// GOVERNANCE & AUDITABILITY
// ============================================================================

export interface Decision {
  id: string;
  orgId: string;
  projectId?: string;
  proposalId?: string;
  title: string;
  description: string;
  decision: string;
  rationale: string;
  
  // Decision makers
  decidedBy: string;
  approvedBy?: string[];
  consultedWith?: string[];
  
  // Impact
  impact: 'low' | 'medium' | 'high';
  category?: string;
  
  // Linked artifacts
  linkedDeliverableIds?: string[];
  linkedDocumentIds?: string[];
  
  // Metadata
  decidedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  linkedEntities?: LinkedEntity[];
  auditRef?: string;
}

export interface Document {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  type: string;
  category?: string;
  
  // Storage
  storagePath: string;
  fileSize: number;
  mimeType: string;
  checksum?: string;
  
  // Versioning
  version: number;
  parentVersionId?: string;
  versionHistory?: DocumentVersion[];
  
  // Access control
  visibility: 'internal' | 'client' | 'public';
  clientId?: string;
  
  // Entity linking
  entityType?: 'proposal' | 'project' | 'company' | 'client';
  entityId?: string;
  
  // Approval workflow
  requiresApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Timestamp;
  approvalNotes?: string;
  
  // Metadata
  uploadedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tags?: string[];
  linkedEntities?: LinkedEntity[];
  auditRef?: string;
}

export interface DocumentVersion {
  version: number;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: Timestamp;
  changeDescription?: string;
  fileSize: number;
  checksum?: string;
}

export type AuditEventType = 
  | 'user_created' 
  | 'user_updated' 
  | 'user_deleted'
  | 'org_created' 
  | 'org_updated'
  | 'member_invited' 
  | 'member_role_changed' 
  | 'member_removed'
  | 'proposal_created' 
  | 'proposal_sent' 
  | 'proposal_accepted' 
  | 'proposal_status_changed'
  | 'project_created' 
  | 'project_updated' 
  | 'project_status_changed'
  | 'deliverable_approved' 
  | 'deliverable_rejected'
  | 'change_request_created' 
  | 'change_request_approved'
  | 'risk_identified' 
  | 'risk_status_changed'
  | 'document_uploaded' 
  | 'document_approved'
  | 'decision_logged';

export interface AuditLog {
  id: string;
  orgId: string;
  eventType: AuditEventType;
  eventDescription: string;
  
  // Who, what, when
  actor: string;
  actorEmail?: string;
  actorRole?: UserRole;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  
  // Changes
  changes?: Record<string, { before?: unknown; after?: unknown }>;
  metadata?: Record<string, unknown>;
  
  // Context
  ip?: string;
  userAgent?: string;
  
  // Timestamp
  timestamp: Timestamp;
}

// ============================================================================
// OPERATIONAL DASHBOARDS
// ============================================================================

export interface DashboardMetrics {
  orgId: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  
  // Pipeline
  pipeline: {
    totalLeads: number;
    qualifiedLeads: number;
    activeOpportunities: number;
    pipelineValue: number;
    conversionRate: number;
    avgDealSize: number;
  };
  
  // Delivery
  delivery: {
    activeProjects: number;
    projectsOnTrack: number;
    projectsAtRisk: number;
    avgProjectHealth: number;
    overdueDeliverables: number;
    upcomingMilestones: number;
  };
  
  // Cash
  cash: {
    revenue: number;
    projectedRevenue: number;
    outstandingInvoices: number;
    avgPaymentDays: number;
  };
  
  // Capacity
  capacity: {
    totalStaff: number;
    utilization: number;
    availableHours: number;
    allocatedHours: number;
  };
  
  // Generated at
  generatedAt: Timestamp;
}

// ============================================================================
// CLIENT SELF-SERVICE
// ============================================================================

export interface ClientRequest {
  id: string;
  orgId: string;
  projectId: string;
  clientId: string;
  type: 'question' | 'change' | 'issue' | 'feedback';
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'assigned' | 'in-progress' | 'resolved' | 'closed';
  
  // Assignment
  assignedTo?: string;
  assignedAt?: Timestamp;
  
  // Resolution
  resolvedAt?: Timestamp;
  resolution?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface ProjectStatusReport {
  id: string;
  orgId: string;
  projectId: string;
  weekEnding: Timestamp;
  
  // Status summary
  overallStatus: 'green' | 'yellow' | 'red';
  progressPercentage: number;
  
  // What changed
  accomplishments: string[];
  upcomingWork: string[];
  
  // Issues and risks
  blockers: string[];
  risks: string[];
  
  // Decisions needed
  decisionsNeeded: Decision[];
  
  // Metrics
  milestonesCompleted: number;
  deliverablesCompleted: number;
  
  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  sentToClient?: boolean;
  sentAt?: Timestamp;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface LinkedEntity {
  type: string;
  id: string;
  name?: string;
}

export type ServerTimestamp = FieldValue | Timestamp;
