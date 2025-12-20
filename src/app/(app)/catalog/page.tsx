import Link from "next/link";
import { listServiceSuites, getBusinessProfile } from "@/lib/catalog/repo";
import { ServiceSuiteCard } from "@/components/catalog/ServiceSuiteCard";

export const dynamic = "force-dynamic";

const ORG_ID = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? "demo-org";

export default async function CatalogHomePage() {
  const [suites, profile] = await Promise.all([
    listServiceSuites(ORG_ID, { limit: 5 }),
    getBusinessProfile(ORG_ID),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-gray-500">Product Layer</p>
          <h1 className="text-3xl font-bold">Catalogue</h1>
          <p className="text-gray-400 mt-1">
            Business profile, service suites, and templates to seed proposals and projects.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/catalog/business" className="bg-gray-800 text-gray-100 px-4 py-2 rounded border border-gray-700">
            Business Profile
          </Link>
          <Link href="/catalog/services" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Service Catalogue
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-sm">Business profile</p>
          <p className="text-2xl font-semibold">
            {profile?.profile.businessName ?? "Not set"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Click through to edit brand, terms, and proof.</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-sm">Service suites</p>
          <p className="text-2xl font-semibold">{suites.length}</p>
          <p className="text-xs text-gray-500 mt-1">Active suites available for proposal seeding.</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-sm">Org ID</p>
          <p className="text-2xl font-semibold">{ORG_ID}</p>
          <p className="text-xs text-gray-500 mt-1">Configured via NEXT_PUBLIC_DEMO_ORG_ID.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent service suites</h2>
          <Link href="/catalog/services/new" className="text-blue-400 hover:underline text-sm">
            Create suite
          </Link>
        </div>
        {suites.length === 0 ? (
          <p className="text-gray-400 text-sm">No suites yet. Create your first service package.</p>
        ) : (
          <div className="space-y-3">
            {suites.map((suite) => (
              <ServiceSuiteCard key={suite.id} suite={suite} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
