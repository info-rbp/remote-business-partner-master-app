import { db } from "@/lib/db";
import { ProposalRenderer } from "@/app/components/proposal-renderer";
import { AcceptanceForm } from "@/app/components/acceptance-form";
import { DecisionSummary } from "@/app/components/decision-summary";

type Proposal = {
  title: string;
  content?: string;
  scope?: any;
  deliverables?: any;
  timeline?: any;
  pricing?: any;
};
type ProposalShare = { 
  proposalId: string; 
  token: string; 
  expiresAt?: FirebaseFirestore.Timestamp; 
  orgId: string;
  snapshotVersion?: string;
};

function ShareNotFound({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800">Link Unavailable</h1>
        <p className="text-gray-600 mt-2">{message}</p>
      </div>
    </div>
  );
}

export default async function SharePage({ params }: { params: { token: string } }) {
  const shareSnapshot = await db.collection("proposalShares").doc(params.token).get().catch((error) => {
    console.warn("Unable to load proposal share.", error);
    return null;
  });

  if (!shareSnapshot || !shareSnapshot.exists) {
    return <ShareNotFound message="The share link you followed is invalid or has been removed." />;
  }

  const shareData = shareSnapshot.data() as ProposalShare | undefined;
  const expiresAt = shareData?.expiresAt?.toDate();
  const now = new Date();

  if (
    !shareData?.proposalId ||
    !shareData?.token ||
    shareData.token !== params.token ||
    !expiresAt ||
    expiresAt.getTime() <= now.getTime() ||
    !shareData.orgId
  ) {
    return <ShareNotFound message="This share link has expired or is no longer available." />;
  }

  const proposalSnapshot = await db
    .collection("orgs")
    .doc(shareData.orgId)
    .collection("proposals")
    .doc(shareData.proposalId)
    .get()
    .catch((error) => {
    console.warn("Unable to load proposal for share.", error);
    return null;
  });

  if (!proposalSnapshot || !proposalSnapshot.exists) {
    return <ShareNotFound message="The proposal associated with this share link could not be found." />;
  }

  const proposal = proposalSnapshot.data() as Proposal | undefined;

  // Load snapshot (immutable)
  const version = shareData.snapshotVersion || proposalSnapshot.data()?.currentSnapshotVersion;
  const snapDoc = version
    ? await db.collection(`proposals/${shareData.proposalId}/snapshots`).doc(version).get().catch(() => null)
    : null;
  const snapshot = snapDoc?.exists ? (snapDoc.data() as any) : null;

  if (!proposal) {
    return <ShareNotFound message="The proposal associated with this share link could not be found." />;
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow-md p-6 lg:p-8">
          <header className="mb-8 border-b pb-4">
            <h1 className="text-4xl font-bold text-gray-900">{proposal.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Link valid until {expiresAt.toLocaleString()}</p>
          </header>
          <ProposalRenderer
            title={snapshot?.content?.title || proposal.title}
            executiveSummary={snapshot?.content?.executiveSummary}
            diagnosis={snapshot?.content?.diagnosis}
            scope={snapshot?.content?.scope}
            methodology={snapshot?.content?.methodology}
            deliverables={snapshot?.content?.deliverables}
            timeline={snapshot?.content?.timeline}
            pricing={snapshot?.content?.pricing}
            assumptions={snapshot?.content?.assumptions}
            exclusions={snapshot?.content?.exclusions}
            acceptanceCriteria={snapshot?.content?.acceptanceCriteria}
            nextSteps={snapshot?.content?.nextSteps}
            terms={snapshot?.content?.terms}
            content={snapshot?.content?.content}
            branding={snapshot?.branding}
          />

          {/* Phase 5.6 - Decision Summary */}
          <DecisionSummary
            proposalTitle={proposal.title}
            scope={snapshot?.content?.scope || proposal.scope}
            deliverables={snapshot?.content?.deliverables}
            timeline={snapshot?.content?.timeline}
            nextSteps={snapshot?.content?.nextSteps}
          />

          <div className="mt-12 pt-8 border-t">
            <AcceptanceForm
              token={params.token}
              proposalTitle={proposal.title}
              snapshotVersion={version}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
