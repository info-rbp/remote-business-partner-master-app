import 'server-only';

import crypto from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestore } from './firebase-admin';

type ActorRole = 'admin' | 'staff' | 'client' | 'system';
type EntityType = 'proposal' | 'client' | 'project' | 'file' | 'user' | 'auth';

export interface AuditLogEvent {
  orgId: string;
  actor: { uid: string; role: ActorRole; displayName?: string };
  action: string;
  entityType: EntityType;
  entityId: string;
  summary: string;
  before?: { ref: string; snapshotAt?: Timestamp };
  after?: { ref: string; snapshotAt?: Timestamp };
  metadata?: Record<string, any>;
  requestContext?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

function resolveRole(role: string): ActorRole {
  if (role === 'admin' || role === 'staff' || role === 'client' || role === 'system') {
    return role;
  }
  return 'staff';
}

export async function logAuditEvent(params: AuditLogEvent): Promise<void> {
  const {
    orgId,
    actor,
    action,
    entityType,
    entityId,
    summary,
    before,
    after,
    metadata,
    requestContext,
  } = params;

  const auditId = crypto.randomUUID();
  const firestore = getFirestore();

  const payload = {
    auditId,
    orgId,
    actor: {
      uid: actor.uid,
      role: resolveRole(actor.role),
      ...(actor.displayName ? { displayName: actor.displayName } : {}),
    },
    action,
    entityType,
    entityId,
    summary,
    ...(before ? { before } : {}),
    ...(after ? { after } : {}),
    ...(metadata ? { metadata } : {}),
    ...(requestContext?.ipAddress ? { ipAddress: requestContext.ipAddress } : {}),
    ...(requestContext?.userAgent ? { userAgent: requestContext.userAgent } : {}),
    createdAt: FieldValue.serverTimestamp(),
  };

  try {
    await firestore.collection('orgs').doc(orgId).collection('auditLogs').doc(auditId).set(payload, { merge: false });
  } catch (error) {
    console.error('Failed to persist audit log entry', {
      error,
      orgId,
      action,
      entityType,
      entityId,
    });
  }
}
