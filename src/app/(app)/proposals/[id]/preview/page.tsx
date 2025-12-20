'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, setDoc, Timestamp, where } from "firebase/firestore";
import { DocumentVault } from "@/app/components/document-vault";
import { getDb } from "@/lib/firebase-client";
import { useIdentity } from "@/app/components/IdentityGate";

type Proposal = { id: string; title: string; content: string };
type ProposalShare = {
  proposalId: string;
  token: string;
  expiresAt?: Timestamp;
  createdAt?: Timestamp;
  orgId: string;
};

const SHARE_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function generateToken() {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().replace(/-/g, "");
    }
    if (typeof crypto.getRandomValues === "function") {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    }
  }
  return Math.random().toString(16).slice(2);
}

export default function PreviewProposalPage({ params }: { params: { id: string } }) {
  const { orgId } = useIdentity();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [share, setShare] = useState<ProposalShare | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!orgId) return;
      const db = getDb();
      const proposalRef = doc(db, "orgs", orgId, "proposals", params.id);
      const proposalSnap = await getDoc(proposalRef);

      if (!proposalSnap.exists()) {
        setError("Proposal not found");
        setProposal(null);
        return;
      }

      const data = proposalSnap.data() as Omit<Proposal, "id">;
      setProposal({ id: proposalSnap.id, ...data });
    };

    load().catch((err) => {
      const message = err instanceof Error ? err.message : "Unable to load proposal.";
      setError(message);
    });
  }, [orgId, params.id]);

  useEffect(() => {
    const loadShare = async () => {
      if (!orgId) return;
      const db = getDb();
      const sharesRef = collection(db, "proposalShares");
      const now = Timestamp.now();
      const existing = await getDocs(
        query(sharesRef, where("proposalId", "==", params.id), where("orgId", "==", orgId), where("expiresAt", ">", now))
      );

      let latest: ProposalShare | null = null;
      existing.forEach((docSnap) => {
        const data = docSnap.data() as ProposalShare;
        if (!latest || (latest.expiresAt?.toMillis() ?? 0) < (data.expiresAt?.toMillis() ?? 0)) {
          latest = data;
        }
      });

      if (latest) {
        setShare(latest);
        return;
      }

      const token = generateToken();
      const expiresAt = Timestamp.fromMillis(Date.now() + SHARE_TOKEN_TTL_MS);
      const createdAt = Timestamp.now();
      const newShare: ProposalShare = { proposalId: params.id, token, expiresAt, createdAt, orgId };
      await setDoc(doc(sharesRef, token), newShare);
      setShare(newShare);
    };

    loadShare().catch((err) => {
      const message = err instanceof Error ? err.message : "Unable to generate share link.";
      setError(message);
    });
  }, [orgId, params.id]);

  const shareUrl = useMemo(() => {
    if (!share) return null;
    if (typeof window === "undefined") return `/share/${share.token}`;
    const origin = window.location.origin;
    return `${origin}/share/${share.token}`;
  }, [share]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-100">Proposal Not Available</h1>
          <p className="text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!proposal || !share || !orgId) {
    return <div className="text-gray-300">Loading…</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold">Preview Proposal</h1>
          <p className="text-sm text-gray-400">
            Share link expires on{" "}
            <span className="font-semibold text-gray-200">
              {share.expiresAt?.toDate().toLocaleString() ?? "N/A"}
            </span>
          </p>
          <p className="text-sm text-gray-400">
            Share link:{" "}
            <Link href={`/share/${share.token}`} className="text-blue-400 underline break-all" prefetch={false}>
              {shareUrl ?? `/share/${share.token}`}
            </Link>
          </p>
        </div>
        <Link
          href={`/share/${share.token}`}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          prefetch={false}
        >
          Share
        </Link>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">{proposal.title}</h2>
        <p className="text-gray-400">{proposal.content}</p>
      </div>
      <DocumentVault
        orgId={orgId}
        entityType="proposal"
        entityId={proposal.id}
        title="Proposal Attachments"
        allowUploads
        defaultVisibility="internal"
        defaultCategory="attachments"
      />
    </div>
  );
}
