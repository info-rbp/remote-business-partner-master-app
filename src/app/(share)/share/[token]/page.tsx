import { db } from "@/lib/db";

type Proposal = { title: string; content: string };
type ProposalShare = { proposalId: string; token: string; expiresAt?: FirebaseFirestore.Timestamp; orgId: string };

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
          <div className="prose prose-lg max-w-none text-gray-800">{proposal.content}</div>
        </div>
      </main>
    </div>
  );
}
