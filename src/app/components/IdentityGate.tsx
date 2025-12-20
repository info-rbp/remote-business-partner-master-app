'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { ensureOrgBootstrapped, getClientIdentity, type ClientIdentity } from '@/lib/identity-client';
import { getFirebaseAuth } from '@/lib/firebase-client';
import AuthForm from './auth-form';

interface IdentityContextValue extends Partial<ClientIdentity> {
  loading: boolean;
  error: string | null;
  user: User | null;
}

const IdentityContext = createContext<IdentityContextValue>({
  loading: true,
  error: null,
  user: null,
});

export function IdentityGate({ children }: { children: React.ReactNode }) {
  const auth = useMemo(() => getFirebaseAuth(), []);
  const [user, setUser] = useState<User | null>(null);
  const [identity, setIdentity] = useState<ClientIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIdentity(null);
      setError(null);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const existing = await getClientIdentity();
        if (existing) {
          setIdentity(existing);
        } else {
          const bootstrapped = await ensureOrgBootstrapped();
          setIdentity(bootstrapped);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load organization identity.';
        setError(message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <p className="text-gray-300 mb-4">Sign in to continue.</p>
        <AuthForm />
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-300">Loading organization…</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-400">
        <p className="mb-2">Unable to load your organization.</p>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="p-6 text-center text-red-400">
        <p className="mb-2">No organization identity found.</p>
      </div>
    );
  }

  return (
    <IdentityContext.Provider
      value={{
        ...identity,
        user,
        loading: false,
        error: null,
      }}
    >
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  return useContext(IdentityContext);
}
