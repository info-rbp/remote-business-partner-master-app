'use client';

/**
 * Authentication Hooks and Context
 * Provides user authentication state and role information
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getAuth, getDb } from '@/lib/firebase-client';
import { UserRole, OrgMember } from '@/types/data-models';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  orgId?: string;
  role: UserRole;
  clientId?: string;
  projectIds?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadUserRole = async (firebaseUser: FirebaseUser): Promise<AuthUser> => {
    try {
      const db = getDb();
      
      // Get user document to find org
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      const userData = userDoc.data();
      const orgId = userData?.orgId;

      if (!orgId) {
        // No org yet - probably first login
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          role: 'public',
        };
      }

      // Get member document to find role
      const memberDoc = await getDoc(doc(db, `orgs/${orgId}/members`, firebaseUser.uid));
      
      if (!memberDoc.exists()) {
        // User has org but no member record - error state
        throw new Error('User belongs to org but has no member record');
      }

      const memberData = memberDoc.data() as OrgMember;

      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || memberData.displayName || null,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        orgId,
        role: memberData.role,
        clientId: memberData.clientId,
        projectIds: memberData.projectIds,
      };
    } catch (err) {
      console.error('Error loading user role:', err);
      throw err;
    }
  };

  const refreshUser = async () => {
    const auth = getAuth();
    if (auth.currentUser) {
      try {
        const authUser = await loadUserRole(auth.currentUser);
        setUser(authUser);
      } catch (err) {
        setError(err as Error);
      }
    }
  };

  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const authUser = await loadUserRole(firebaseUser);
          setUser(authUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(err as Error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    const auth = getAuth();
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to require authentication
 */
export function useRequireAuth(redirectTo = '/login') {
  const { user, loading } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setShouldRedirect(true);
    }
  }, [user, loading]);

  return { user, loading, shouldRedirect, redirectTo };
}

/**
 * Hook to check role permissions
 */
export function useRole() {
  const { user } = useAuth();
  
  return {
    role: user?.role || 'public',
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'staff' || user?.role === 'admin',
    isClient: user?.role === 'client',
    isAuthenticated: !!user,
  };
}
