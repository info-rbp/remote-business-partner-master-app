
import { db } from "@/lib/db";
import { DEFAULT_ORG_ID } from "@/lib/org";
import { updateProposal } from "@/app/proposals/actions";
import EditProposalForm from "./edit-proposal-form";

export default async function EditProposalPage({ params }: { params: { id: string } }) {
  const proposalSnapshot = await db.collection("orgs").doc(DEFAULT_ORG_ID).collection("proposals").doc(params.id).get().catch((error) => {
    console.warn('Failed to load proposal for editing.', { error, proposalId: params.id });
    return null;
  });

  if (!proposalSnapshot?.exists) {
    return <p className="text-red-400">Unable to load the requested proposal.</p>;
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
