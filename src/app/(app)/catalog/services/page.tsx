import Link from "next/link";
import {
  archiveServiceSuiteAction,
  restoreServiceSuiteAction,
} from "@/app/(app)/catalog/actions";
import { listServiceSuites } from "@/lib/catalog/repo";

export const dynamic = "force-dynamic";

const ORG_ID = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? "demo-org";

export default async function ServiceSuitesPage() {
  const suites = await listServiceSuites(ORG_ID);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-gray-500">Product Layer</p>
          <h1 className="text-3xl font-bold">Service Catalogue</h1>
          <p className="text-gray-400 mt-1">Create, manage, and seed proposals from service suites.</p>
        </div>
        <Link href="/catalog/services/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          New Service Suite
        </Link>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr className="text-left">
              <th className="p-3 text-sm font-semibold text-gray-300">Name</th>
              <th className="p-3 text-sm font-semibold text-gray-300">Status</th>
              <th className="p-3 text-sm font-semibold text-gray-300">Pricing</th>
              <th className="p-3 text-sm font-semibold text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suites.map((suite) => (
              <tr key={suite.id} className="border-t border-gray-700">
                <td className="p-3">
                  <div className="font-semibold text-gray-100">{suite.name}</div>
                  <div className="text-sm text-gray-400">{suite.description}</div>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      suite.status === "active" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-200"
                    }`}
                  >
                    {suite.status}
                  </span>
                </td>
                <td className="p-3 text-sm text-gray-300 capitalize">
                  {suite.pricingModel?.replace(/_/g, " ") ?? "Not set"}
                </td>
                <td className="p-3 text-sm text-gray-200 space-x-3">
                  <Link href={`/catalog/services/${suite.id}`} className="text-blue-400 hover:underline">
                    Edit
                  </Link>
                  <Link href={`/catalog/services/${suite.id}/seed`} className="text-blue-400 hover:underline">
                    Seed proposal
                  </Link>
                  {suite.status === "active" ? (
                    <form action={archiveServiceSuiteAction.bind(null, suite.id)} className="inline">
                      <button type="submit" className="text-red-400 hover:underline">
                        Archive
                      </button>
                    </form>
                  ) : (
                    <form action={restoreServiceSuiteAction.bind(null, suite.id)} className="inline">
                      <button type="submit" className="text-green-400 hover:underline">
                        Restore
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suites.length === 0 && <p className="text-gray-400 text-sm p-4">No service suites yet.</p>}
      </div>
    </div>
  );
}
