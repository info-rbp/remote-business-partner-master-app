
import { createProposal } from "@/app/proposals/actions";
import NewProposalForm from "./new-proposal-form";

export default function NewProposalPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">New Proposal</h1>
      <NewProposalForm createProposalAction={createProposal} />
    </div>
  );
}
