
import { createProposal } from "@/app/proposals/actions";

export default function NewProposalPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">New Proposal</h1>
      <form action={createProposal} className="bg-gray-800 p-4 rounded-lg">
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
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
