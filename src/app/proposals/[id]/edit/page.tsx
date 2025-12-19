
import { db } from "@/lib/db";
import { updateProposal } from "@/app/proposals/actions";

export default async function EditProposalPage({ params }: { params: { id: string } }) {
  const proposalSnapshot = await db.collection("proposals").doc(params.id).get();
  const proposal = { id: proposalSnapshot.id, ...proposalSnapshot.data() } as { id: string; title: string; content: string };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Edit Proposal</h1>
      <form action={updateProposal.bind(null, proposal.id)} className="bg-gray-800 p-4 rounded-lg">
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            defaultValue={proposal.title}
            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
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
            defaultValue={proposal.content}
            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Save Proposal
          </button>
        </div>
      </form>
    </div>
  );
}
