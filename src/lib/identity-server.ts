import { getAppCheck } from 'firebase-admin/app-check';
import { admin } from './firebase-admin';

export interface VerifiedIdentity {
  uid: string;
  orgId: string;
  role: string;
}

export async function verifyRequestIdentity(idToken: string | null, appCheckToken: string | null): Promise<VerifiedIdentity> {
  if (!idToken) {
    throw new Error('Missing ID token.');
  }

  if (!appCheckToken) {
    throw new Error('Missing App Check token.');
  }

  const decoded = await admin.auth.verifyIdToken(idToken, true);

  try {
    const appCheck = getAppCheck(admin.app);
    await appCheck.verifyToken(appCheckToken);
  } catch {
    throw new Error('Invalid App Check token.');
  }

  const orgId = (decoded.orgId ?? decoded.orgid) as string | undefined;
  const role = decoded.role as string | undefined;

  if (!orgId || !role) {
    throw new Error('User does not have organization claims.');
  }

  return { uid: decoded.uid, orgId, role };
}
