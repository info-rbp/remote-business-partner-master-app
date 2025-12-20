import Link from "next/link";
import { seedProposalFromSuiteAction } from "@/app/(app)/catalog/actions";
import { getServiceSuite } from "@/lib/catalog/repo";

export const dynamic = "force-dynamic";

const ORG_ID = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? "demo-org";

export default async function SeedProposalPage({ params }: { params: { id: string } }) {
  const suite = await getServiceSuite(ORG_ID, params.id);
  if (!suite) {
    return <div className="text-gray-300">Service suite not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-gray-500">Product Layer</p>
          <h1 className="text-3xl font-bold">Seed Proposal</h1>
          <p className="text-gray-400 mt-1">
            Generate a draft proposal using the suite template and business profile.
          </p>
        </div>
        <Link href={`/catalog/services/${suite.suite.id}`} className="text-blue-400 hover:underline">
          Back to suite
        </Link>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{suite.suite.name}</h2>
            <p className="text-gray-400 text-sm">{suite.suite.description}</p>
          </div>
          <span className="px-2 py-1 rounded text-xs bg-gray-900 text-gray-300">Slug: {suite.suite.slug}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-400">Deliverables</p>
            <p className="text-2xl font-semibold">{suite.defaultDeliverables.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Milestones</p>
            <p className="text-2xl font-semibold">{suite.defaultMilestones.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Discovery Questions</p>
            <p className="text-2xl font-semibold">{suite.discoveryQuestions.length}</p>
          </div>
        </div>

        <form action={seedProposalFromSuiteAction.bind(null, suite.suite.id)} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Proposal Title (optional)</label>
            <input
              name="title"
              className="w-full bg-gray-900 text-white p-2 rounded"
              placeholder={`${suite.suite.name} Proposal`}
            />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Create Proposal
          </button>
        </form>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Preview</h3>
          <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
            {suite.defaultDeliverables.slice(0, 4).map((d, index) => (
              <li key={`${d.id ?? index}`}>{d.title}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
