
import { db } from "@/lib/firebase-admin";
import Link from "next/link";

export default async function PreviewProposalPage({ params }: { params: { id: string } }) {
  const proposalSnapshot = await db.collection("proposals").doc(params.id).get();
  const proposal = { id: proposalSnapshot.id, ...proposalSnapshot.data() } as { id: string; title: string; content: string };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Preview Proposal</h1>
        <Link
          href={`/share/${params.id}`}
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
