import { saveBusinessProfile } from "@/app/(app)/catalog/actions";
import { getBusinessProfile } from "@/lib/catalog/repo";

export const dynamic = "force-dynamic";

const ORG_ID = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? "demo-org";

export default async function BusinessProfilePage() {
  const profileDoc = await getBusinessProfile(ORG_ID);
  const profile = profileDoc?.profile;
  const brand = profileDoc?.brandKit;
  const terms = profileDoc?.terms;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-gray-500">Product Layer</p>
        <h1 className="text-3xl font-bold">Business Profile</h1>
        <p className="text-gray-400 mt-1">
          Org-level profile, brand kit, and standard terms used to seed proposals and projects.
        </p>
      </div>

      <form action={saveBusinessProfile} className="space-y-6">
        <section className="bg-gray-800 p-4 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">Business Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Business Name</label>
              <input
                name="businessName"
                defaultValue={profile?.businessName ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="DealFlow AI"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Legal Name</label>
              <input
                name="legalName"
                defaultValue={profile?.legalName ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="DealFlow AI Pty Ltd"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">ABN</label>
              <input
                name="abn"
                defaultValue={profile?.abn ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="00 000 000 000"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Website</label>
              <input
                name="website"
                defaultValue={profile?.website ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="https://dealflow.ai"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Contact Email</label>
              <input
                name="contactEmail"
                defaultValue={profile?.contactEmail ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="hello@dealflow.ai"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Phone</label>
              <input
                name="phone"
                defaultValue={profile?.phone ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="+61 400 000 000"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Address</label>
              <input
                name="address"
                defaultValue={profile?.address ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="123 Street, City"
              />
            </div>
          </div>
        </section>

        <section className="bg-gray-800 p-4 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">Positioning & Proof</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Positioning Copy</label>
              <textarea
                name="positioningCopy"
                defaultValue={profile?.positioningCopy ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                rows={3}
                placeholder="We help revenue teams ship reliable proposals fast."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Expertise Areas (comma separated)</label>
              <input
                name="expertiseAreas"
                defaultValue={profile?.expertiseAreas?.join(", ") ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="B2B SaaS, Product marketing, GTM"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Proof Snippets (one per line)</label>
              <textarea
                name="proofSnippets"
                defaultValue={profile?.proofSnippets?.join("\n") ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                rows={4}
                placeholder="- 30% faster proposal turnaround..."
              />
            </div>
          </div>
        </section>

        <section className="bg-gray-800 p-4 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">Brand Kit</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Logo URL</label>
              <input
                name="logoUrl"
                defaultValue={brand?.logoUrl ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Font Family</label>
              <input
                name="fontFamily"
                defaultValue={brand?.fontFamily ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="Inter, sans-serif"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Primary Color</label>
              <input
                name="primaryColor"
                defaultValue={brand?.primaryColor ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="#0EA5E9"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Secondary Color</label>
              <input
                name="secondaryColor"
                defaultValue={brand?.secondaryColor ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="#1E293B"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Accent Color</label>
              <input
                name="accentColor"
                defaultValue={brand?.accentColor ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="#F97316"
              />
            </div>
          </div>
        </section>

        <section className="bg-gray-800 p-4 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">Standard Terms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Payment Terms</label>
              <textarea
                name="paymentTerms"
                defaultValue={terms?.paymentTerms ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Cancellation Terms</label>
              <textarea
                name="cancellationTerms"
                defaultValue={terms?.cancellationTerms ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Confidentiality</label>
              <textarea
                name="confidentiality"
                defaultValue={terms?.confidentiality ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Liability</label>
              <textarea
                name="liability"
                defaultValue={terms?.liability ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Warranty</label>
              <textarea
                name="warranty"
                defaultValue={terms?.warranty ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">IP Ownership</label>
              <textarea
                name="ipOwnership"
                defaultValue={terms?.ipOwnership ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-300 mb-1">General Terms</label>
              <textarea
                name="generalTerms"
                defaultValue={terms?.generalTerms ?? ""}
                className="w-full bg-gray-900 text-white p-2 rounded"
                rows={3}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}
