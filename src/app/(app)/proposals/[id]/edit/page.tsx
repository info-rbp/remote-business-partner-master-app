
import { db } from "@/lib/db";
import { updateProposal } from "@/app/(app)/proposals/actions";
import EditProposalForm from "./edit-proposal-form";

export default async function EditProposalPage({ params }: { params: { id: string } }) {
  const proposalSnapshot = await db.collection("proposals").doc(params.id).get().catch((error) => {
    console.warn("Unable to load proposal for editing.", error);
    return null;
  });

  if (!proposalSnapshot || !proposalSnapshot.exists) {
    return (
      <div className="text-gray-300">Proposal not found.</div>
    );
  }

  const proposal = { id: proposalSnapshot.id, ...proposalSnapshot.data() } as { id: string; title: string; content: string };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Edit Proposal</h1>
      <EditProposalForm
        proposalId={proposal.id}
        title={proposal.title}
        content={proposal.content}
        updateProposalAction={updateProposal}
      />
    </div>
  );
}
