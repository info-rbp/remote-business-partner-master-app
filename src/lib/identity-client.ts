'use client';

import { httpsCallable } from 'firebase/functions';
import { getAuthTokens, getFirebaseAuth, getFunctions } from './firebase-client';

export interface ClientIdentity {
  orgId: string;
  role: string;
}

async function readClaims() {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;

  const result = await user.getIdTokenResult();
  const orgId = (result.claims.orgId ?? result.claims.orgid) as string | undefined;
  const role = result.claims.role as string | undefined;
  return orgId && role ? { orgId, role } : null;
}

export async function getClientIdentity(): Promise<ClientIdentity | null> {
  return readClaims();
}

export async function ensureOrgBootstrapped(): Promise<ClientIdentity> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User is not signed in.');
  }

  const existing = await readClaims();
  if (existing) {
    return existing;
  }

  const functions = getFunctions();
  const tokens = await getAuthTokens();
  const bootstrap = httpsCallable(functions, 'bootstrapOrg');
  await bootstrap({}, { headers: { 'X-Firebase-AppCheck': tokens.appCheckToken } as Record<string, string> });

  await user.getIdToken(true);
  const refreshed = await readClaims();

  if (!refreshed) {
    throw new Error('Unable to determine organization identity after bootstrap.');
  }

  return refreshed;
}
