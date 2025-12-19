
import { db } from "@/lib/db";
import { DEFAULT_ORG_ID } from "@/lib/org";
import admin from "firebase-admin";
import Link from "next/link";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";

type Proposal = { id: string; title: string; content: string };
type ProposalShare = {
  proposalId: string;
  token: string;
  expiresAt?: FirebaseFirestore.Timestamp;
  createdAt?: FirebaseFirestore.Timestamp;
};

const SHARE_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

async function getProposal(proposalId: string): Promise<Proposal | null> {
  const snapshot = await db.collection("orgs").doc(DEFAULT_ORG_ID).collection("proposals").doc(proposalId).get().catch((error) => {
    console.warn('Failed to load proposal for preview.', { error, proposalId });
    return null;
  });

  if (!snapshot?.exists) {
    return null;
  }

  const data = snapshot.data() as Omit<Proposal, "id"> | undefined;
  if (!data) return null;

  return { id: snapshot.id, ...data };
}

async function getActiveShareToken(proposalId: string): Promise<ProposalShare> {
  const existingSharesSnapshot = await db.collection("orgs").doc(DEFAULT_ORG_ID).collection("proposalShares").where("proposalId", "==", proposalId).get().catch((error) => {
    console.warn('Failed to load existing proposal shares.', { error, proposalId });
    return null;
  });
  const now = Date.now();

  let activeShare: ProposalShare | null = null;

  existingSharesSnapshot?.forEach((doc) => {
    const data = doc.data() as ProposalShare;
    const expiresAtMillis = data.expiresAt?.toMillis() ?? 0;

    if (expiresAtMillis > now) {
      if (!activeShare || (activeShare.expiresAt?.toMillis() ?? 0) < expiresAtMillis) {
        activeShare = { ...data, token: data.token || doc.id };
      }
    }
  });

  if (activeShare) return activeShare;

  const token = randomBytes(16).toString("hex");
  const expiresAt = admin.firestore.Timestamp.fromMillis(now + SHARE_TOKEN_TTL_MS);
  const createdAt = admin.firestore.Timestamp.fromMillis(now);
  const newShare: ProposalShare = { proposalId, token, expiresAt, createdAt };

  await db.collection("orgs").doc(DEFAULT_ORG_ID).collection("proposalShares").doc(token).set(newShare).catch((error) => {
    console.warn('Failed to write new proposal share.', { error, proposalId, token });
  });

  return newShare;
}

export default async function PreviewProposalPage({ params }: { params: { id: string } }) {
  const proposal = await getProposal(params.id);
  const headerValues = await headers();
  const host = headerValues.get("host");
  const forwardedProtocol = headerValues.get("x-forwarded-proto");

  if (!proposal) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">Proposal Not Found</h1>
          <p className="text-gray-600 mt-2">The proposal you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  const share = await getActiveShareToken(params.id);
  const sharePath = `/share/${share.token}`;
  const shareUrl = host ? `${forwardedProtocol ?? "http"}://${host}${sharePath}` : sharePath;

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
            <Link href={sharePath} className="text-blue-400 underline break-all" prefetch={false}>
              {shareUrl}
            </Link>
          </p>
        </div>
        <Link
          href={sharePath}
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
    </div>
  );
}
