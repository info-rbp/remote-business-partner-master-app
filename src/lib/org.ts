import 'server-only';

import type { DecodedIdToken } from 'firebase-admin/auth';

export type OrgActorRole = 'admin' | 'staff' | 'client' | 'system';

export const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID ?? 'demo-org';

export function resolveOrgId(claims?: Partial<DecodedIdToken> | null): string {
  const claimValue = claims?.orgId;
  if (typeof claimValue === 'string' && claimValue.trim().length > 0) {
    return claimValue;
  }
  return DEFAULT_ORG_ID;
}

export function resolveActorFromToken(token: DecodedIdToken): { uid: string; role: OrgActorRole; displayName?: string } {
  const roleClaim = token.role;
  const role: OrgActorRole = roleClaim === 'admin' || roleClaim === 'client' || roleClaim === 'system' ? roleClaim : 'staff';
  const displayName = token.name ?? token.email;

  return {
    uid: token.uid,
    role,
    ...(displayName ? { displayName } : {}),
  };
}
