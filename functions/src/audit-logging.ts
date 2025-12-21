/**
 * Audit Logging Utilities
 * Provides helper functions to write audit logs to Firestore
 */

import * as admin from 'firebase-admin';

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

export type UserRole = 'admin' | 'staff' | 'client' | 'public';

export interface AuditLogData {
  orgId: string;
  eventType: AuditEventType;
  eventDescription: string;
  actor: string;
  actorEmail?: string;
  actorRole?: UserRole;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  changes?: Record<string, { before?: unknown; after?: unknown }>;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

const db = admin.firestore();

/**
 * Write an audit log entry to Firestore
 * Uses org-scoped auditLogs collection: orgs/{orgId}/auditLogs
 */
export async function writeAuditLog(logData: AuditLogData): Promise<string> {
  try {
    const docRef = await db.collection(`orgs/${logData.orgId}/auditLogs`).add({
      ...logData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`[Audit] ${logData.eventType}: ${logData.eventDescription}`);
    return docRef.id;
  } catch (error) {
    console.error('[Audit Log Error]', error);
    throw error;
  }
}

/**
 * Helper: Log proposal creation
 */
export async function logProposalCreated(params: {
  orgId: string;
  proposalId: string;
  proposalTitle: string;
  createdBy: string;
  createdByEmail?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  return writeAuditLog({
    orgId: params.orgId,
    eventType: 'proposal_created',
    eventDescription: `Proposal created: ${params.proposalTitle}`,
    actor: params.createdBy,
    actorEmail: params.createdByEmail,
    actorRole: 'staff',
    targetType: 'proposal',
    targetId: params.proposalId,
    targetName: params.proposalTitle,
    metadata: params.metadata,
  });
}

/**
 * Helper: Log proposal acceptance
 */
export async function logProposalAccepted(params: {
  orgId: string;
  proposalId: string;
  proposalTitle: string;
  acceptedBy: string;
  acceptedByEmail?: string;
  acceptedByRole?: UserRole;
  snapshotVersion?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  return writeAuditLog({
    orgId: params.orgId,
    eventType: 'proposal_accepted',
    eventDescription: `Proposal accepted: ${params.proposalTitle}`,
    actor: params.acceptedBy,
    actorEmail: params.acceptedByEmail,
    actorRole: params.acceptedByRole || 'client',
    targetType: 'proposal',
    targetId: params.proposalId,
    targetName: params.proposalTitle,
    ip: params.ip,
    metadata: {
      snapshotVersion: params.snapshotVersion,
      ...params.metadata,
    },
  });
}

/**
 * Helper: Log project creation
 */
export async function logProjectCreated(params: {
  orgId: string;
  projectId: string;
  projectName: string;
  createdBy: string;
  createdByEmail?: string;
  sourceProposalId?: string;
  clientId?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  return writeAuditLog({
    orgId: params.orgId,
    eventType: 'project_created',
    eventDescription: `Project created: ${params.projectName}`,
    actor: params.createdBy,
    actorEmail: params.createdByEmail,
    actorRole: 'staff',
    targetType: 'project',
    targetId: params.projectId,
    targetName: params.projectName,
    metadata: {
      sourceProposalId: params.sourceProposalId,
      clientId: params.clientId,
      ...params.metadata,
    },
  });
}

/**
 * Helper: Log member role change
 */
export async function logMemberRoleChanged(params: {
  orgId: string;
  memberId: string;
  memberEmail: string;
  memberName?: string;
  oldRole: UserRole;
  newRole: UserRole;
  changedBy: string;
  changedByEmail?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  return writeAuditLog({
    orgId: params.orgId,
    eventType: 'member_role_changed',
    eventDescription: `Member role changed from ${params.oldRole} to ${params.newRole}: ${params.memberEmail}`,
    actor: params.changedBy,
    actorEmail: params.changedByEmail,
    actorRole: 'admin',
    targetType: 'member',
    targetId: params.memberId,
    targetName: params.memberName || params.memberEmail,
    changes: {
      role: {
        before: params.oldRole,
        after: params.newRole,
      },
    },
    metadata: params.metadata,
  });
}

/**
 * Helper: Log share link creation
 */
export async function logShareLinkCreated(params: {
  orgId: string;
  proposalId: string;
  proposalTitle: string;
  token: string;
  expiresAt?: admin.firestore.Timestamp;
  createdBy: string;
  createdByEmail?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  return writeAuditLog({
    orgId: params.orgId,
    eventType: 'proposal_sent',
    eventDescription: `Share link created for proposal: ${params.proposalTitle}`,
    actor: params.createdBy,
    actorEmail: params.createdByEmail,
    actorRole: 'staff',
    targetType: 'proposal',
    targetId: params.proposalId,
    targetName: params.proposalTitle,
    metadata: {
      token: params.token,
      expiresAt: params.expiresAt,
      ...params.metadata,
    },
  });
}

/**
 * Helper: Log member invitation
 */
export async function logMemberInvited(params: {
  orgId: string;
  memberId: string;
  memberEmail: string;
  memberRole: UserRole;
  invitedBy: string;
  invitedByEmail?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  return writeAuditLog({
    orgId: params.orgId,
    eventType: 'member_invited',
    eventDescription: `Member invited with ${params.memberRole} role: ${params.memberEmail}`,
    actor: params.invitedBy,
    actorEmail: params.invitedByEmail,
    actorRole: 'admin',
    targetType: 'member',
    targetId: params.memberId,
    targetName: params.memberEmail,
    metadata: {
      role: params.memberRole,
      ...params.metadata,
    },
  });
}
