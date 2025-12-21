import { db } from '@/lib/db';
import crypto from 'node:crypto';

export type ProposalContent = {
  title: string;
  executiveSummary?: string;
  diagnosis?: string;
  scope?: string;
  methodology?: string;
  deliverables?: Array<{ name: string; description: string; acceptanceCriteria?: string[] }>;
  timeline?: { estimatedDuration?: number; milestones?: Array<{ name: string; description: string; dueOffset?: number; dueDate?: any }> };
  pricing?: { currency?: string; totalAmount?: number; lineItems?: Array<{ name: string; amount: number; notes?: string }> };
  assumptions?: string[];
  exclusions?: string[];
  acceptanceCriteria?: string[];
  nextSteps?: string[];
  terms?: string;
  content?: string; // fallback for existing simple proposals
  [key: string]: any;
};

export type BrandingSnapshot = {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  footerText?: string;
};

export type ProposalSnapshot = {
  version: string; // ISO timestamp version
  createdAt: FirebaseFirestore.Timestamp;
  proposalId: string;
  content: ProposalContent;
  pricing?: ProposalContent['pricing'];
  milestones?: ProposalContent['timeline'];
  branding?: BrandingSnapshot;
  terms?: string;
  checksum: string; // sha256 of content+branding+terms
};

export function calcChecksum(data: any): string {
  const json = JSON.stringify(data);
  return crypto.createHash('sha256').update(json).digest('hex');
}

export async function createSnapshot(proposalId: string, branding?: BrandingSnapshot): Promise<ProposalSnapshot> {
  const proposalDoc = await db.collection('proposals').doc(proposalId).get();
  if (!proposalDoc.exists) throw new Error('Proposal not found');
  const proposal = proposalDoc.data() as ProposalContent;

  const frozenContent: ProposalContent = {
    title: proposal.title,
    executiveSummary: proposal.executiveSummary,
    diagnosis: proposal.diagnosis,
    scope: proposal.scope,
    methodology: proposal.methodology,
    deliverables: proposal.deliverables || [],
    timeline: proposal.timeline,
    pricing: proposal.pricing,
    assumptions: proposal.assumptions || [],
    exclusions: proposal.exclusions || [],
    acceptanceCriteria: proposal.acceptanceCriteria || [],
    nextSteps: proposal.nextSteps || [],
    terms: proposal.terms,
    content: proposal.content,
  };

  const now = Date.now();
  const version = new Date(now).toISOString();
  const checksum = calcChecksum({ content: frozenContent, branding });

  const snapshot: ProposalSnapshot = {
    version,
    createdAt: (await import('firebase-admin/firestore')).Timestamp.fromMillis(now),
    proposalId,
    content: frozenContent,
    pricing: frozenContent.pricing,
    milestones: frozenContent.timeline,
    branding,
    terms: frozenContent.terms,
    checksum,
  };

  const ref = db.collection(`proposals/${proposalId}/snapshots`).doc(version);
  await ref.set(snapshot);

  // Mark proposal locked and reference current snapshot
  await db.collection('proposals').doc(proposalId).set(
    {
      status: 'sent',
      locked: true,
      currentSnapshotVersion: version,
      updatedAt: (await import('firebase-admin/firestore')).Timestamp.now(),
    },
    { merge: true }
  );

  return snapshot;
}

export async function getLatestSnapshot(proposalId: string): Promise<ProposalSnapshot | null> {
  const snaps = await db.collection(`proposals/${proposalId}/snapshots`).orderBy('createdAt', 'desc').limit(1).get();
  if (snaps.empty) return null;
  return snaps.docs[0].data() as ProposalSnapshot;
}
