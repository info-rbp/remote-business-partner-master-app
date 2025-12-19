'use client';

import { useEffect, useState, useTransition } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, getAuthTokens } from '@/lib/firebase-client';
import AuthForm from '@/app/components/auth-form';

type UpdateAction = (id: string, formData: FormData) => Promise<void>;

export default function EditProposalForm({
  proposalId,
  title,
  content,
  updateProposalAction,
}: {
  proposalId: string;
  title: string;
  content: string;
  updateProposalAction: UpdateAction;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<{ idToken: string; appCheckToken: string } | null>(null);
  const [pendingAction, startAction] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const authTokens = await getAuthTokens();
          setTokens(authTokens);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to retrieve auth tokens.';
          setError(message);
        }
      } else {
        setTokens(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (formData: FormData) => {
    if (!tokens) {
      setError('Unable to fetch authentication tokens. Check App Check configuration.');
      return;
    }

    startAction(() => updateProposalAction(proposalId, formData));
  };

  if (!user) {
    return (
      <div>
        <p className="text-gray-300 mb-4">Sign in to edit this proposal.</p>
        <AuthForm />
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="bg-gray-800 p-4 rounded-lg">
      {error && <p className="text-red-400 mb-2">{error}</p>}
      <input type="hidden" name="idToken" value={tokens?.idToken ?? ''} />
      <input type="hidden" name="appCheckToken" value={tokens?.appCheckToken ?? ''} />
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          defaultValue={title}
          className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
          required
        />
      </div>
      <div className="mb-4">
        <label htmlFor="content" className="block text-sm font-medium mb-1">
          Content
        </label>
        <textarea
          id="content"
          name="content"
          rows={8}
          defaultValue={content}
          className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
          required
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          disabled={pendingAction || !tokens}
        >
          {pendingAction ? 'Saving…' : 'Save Proposal'}
        </button>
      </div>
    </form>
  );
}
