'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { getAuthTokens, getFirebaseAuth, getFunctions } from '@/lib/firebase-client';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import AuthForm from '@/app/components/auth-form';

type ProposalAction = (formData: FormData) => Promise<void>;

export default function NewProposalForm({ createProposalAction }: { createProposalAction: ProposalAction }) {
  const auth = useMemo(() => getFirebaseAuth(), []);
  const functions = useMemo(() => getFunctions(), []);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<{ idToken: string; appCheckToken: string } | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generateStatus, setGenerateStatus] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
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
  }, [auth]);

  const handleGenerate = async () => {
    if (!user) {
      setError('Please sign in to generate a proposal.');
      return;
    }
    if (!prompt) {
      setError('Please provide a prompt to generate a proposal.');
      return;
    }

    startGenerating(async () => {
      setGenerateStatus('Generating proposal draft...');
      setError(null);
      try {
        await getAuthTokens(); // ensures tokens are fresh
        const generateProposal = httpsCallable<{ prompt: string }, { proposalId: string }>(functions, 'generateProposal');
        const result = await generateProposal({ prompt });
        const proposalId = result.data.proposalId;
        setGenerateStatus('Draft generated successfully. Redirecting…');
        router.push(`/proposals/${proposalId}/preview`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate proposal.';
        setError(message);
        setGenerateStatus(null);
      }
    });
  };

  // Server Action is passed from the page and bound as the form action.
  // We rely on hidden inputs for tokens, which the server action will read.

  if (!user) {
    return (
      <div>
        <p className="text-gray-300 mb-4">You need to sign in to create a proposal.</p>
        <AuthForm />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-300">Signed in as <span className="font-semibold">{user.email ?? user.uid}</span></p>
        <button
          type="button"
          onClick={() => signOut(auth)}
          className="text-sm text-red-400 hover:text-red-300 underline"
        >
          Sign out
        </button>
      </div>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      <form action={createProposalAction} className="bg-gray-800 p-4 rounded-lg">
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
            required
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            disabled={!tokens}
          >
            Save Proposal
          </button>
        </div>
      </form>
      <div className="bg-gray-800 p-4 rounded-lg mt-6">
        <h2 className="text-xl font-bold mb-2">Generate with AI</h2>
        <p className="text-gray-400 mb-4">Provide a prompt and we will generate a proposal draft using the Cloud Function.</p>
        <textarea
          id="prompt"
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mb-4"
          placeholder="Describe the client and the proposal you need…"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {isGenerating ? 'Generating…' : 'Generate Proposal via Cloud Function'}
        </button>
        {generateStatus && <p className="text-gray-300 mt-2">{generateStatus}</p>}
      </div>
    </div>
  );
}
