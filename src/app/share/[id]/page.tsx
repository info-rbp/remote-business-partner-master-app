
import { db } from "@/lib/db";
import { DEFAULT_ORG_ID } from "@/lib/org";

export default async function ShareProposalPage({ params }: { params: { id: string } }) {
  const proposalSnapshot = await db.collection("proposals").doc(params.id).get().catch((error) => {
    console.warn("Unable to load shared proposal.", error);
    return null;
  });

  if (!proposalSnapshot || !proposalSnapshot.exists) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">Proposal Not Found</h1>
          <p className="text-gray-600 mt-2">The proposal you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  const proposal = proposalSnapshot.data() as { title: string; content: string };

  return (
    <div className="bg-gray-100 min-h-screen">
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow-md p-6 lg:p-8">
          <header className="mb-8 border-b pb-4">
            <h1 className="text-4xl font-bold text-gray-900">{proposal.title}</h1>
          </header>
          <div className="prose prose-lg max-w-none text-gray-800">
            {proposal.content}
          </div>
        </div>
      </main>
    </div>
  );
}
