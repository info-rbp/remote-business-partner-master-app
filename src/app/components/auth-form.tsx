'use client';

import { useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase-client';

export default function AuthForm() {
  const auth = useMemo(() => getFirebaseAuth(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailPasswordAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
          placeholder="you@example.com"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-red-400 mb-2">{error}</p>}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={handleEmailPasswordAuth}
          disabled={loading}
          className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Processing…' : mode === 'login' ? 'Sign In' : 'Register'}
        </button>
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="flex-1 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Processing…' : 'Sign in with Google'}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        className="text-blue-400 hover:underline text-sm"
      >
        {mode === 'login' ? "Don't have an account? Create one." : 'Already have an account? Sign in.'}
      </button>
    </div>
  );
}
