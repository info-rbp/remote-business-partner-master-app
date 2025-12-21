/**
 * Server-side authentication utilities
 * For use in Server Components and Server Actions
 */

import { cookies } from 'next/headers';
import { admin } from '@/lib/firebase-admin';
import { UserRole, OrgMember } from '@/types/data-models';

export interface ServerAuthUser {
  uid: string;
  email?: string;
  orgId?: string;
  role: UserRole;
  clientId?: string;
  projectIds?: string[];
}

/**
 * Get authenticated user from server-side request
 */
export async function getServerAuth(): Promise<ServerAuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return null;
    }

    // Verify session cookie
    const decodedClaims = await admin.auth.verifySessionCookie(sessionCookie, true);
    
    // Get user's org and role
    const userDoc = await admin.db.collection('users').doc(decodedClaims.uid).get();
    const userData = userDoc.data();
    const orgId = userData?.orgId;

    if (!orgId) {
      return {
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        role: 'public',
      };
    }

    // Get member info
    const memberDoc = await admin.db.collection(`orgs/${orgId}/members`).doc(decodedClaims.uid).get();
    
    if (!memberDoc.exists) {
      return {
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        orgId,
        role: 'public',
      };
    }

    const memberData = memberDoc.data() as OrgMember;

    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email,
      orgId,
      role: memberData.role,
      clientId: memberData.clientId,
      projectIds: memberData.projectIds,
    };
  } catch (error) {
    console.error('Server auth error:', error);
    return null;
  }
}

/**
 * Require authentication in server component
 */
export async function requireAuth(): Promise<ServerAuthUser> {
  const user = await getServerAuth();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

/**
 * Require specific role
 */
export async function requireRole(requiredRole: UserRole): Promise<ServerAuthUser> {
  const user = await requireAuth();
  
  const roleHierarchy: Record<UserRole, number> = {
    public: 0,
    client: 1,
    staff: 2,
    admin: 3,
  };
  
  if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
    throw new Error('Forbidden: Insufficient permissions');
  }
  
  return user;
}

/**
 * Check if user is admin
 */
export async function requireAdmin(): Promise<ServerAuthUser> {
  return requireRole('admin');
}

/**
 * Check if user is staff or admin
 */
export async function requireStaff(): Promise<ServerAuthUser> {
  return requireRole('staff');
}

/**
 * Verify ID token from client
 */
export async function verifyIdToken(token: string): Promise<{ uid: string; email?: string }> {
  try {
    const decodedToken = await admin.auth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    throw new Error('Invalid authentication token');
  }
}

/**
 * Create session cookie for user
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
  
  const sessionCookie = await admin.auth.createSessionCookie(idToken, {
    expiresIn,
  });
  
  return sessionCookie;
}
