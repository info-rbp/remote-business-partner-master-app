import { createServiceSuiteAction } from "@/app/(app)/catalog/actions";
import { PricingModelForm } from "@/components/catalog/PricingModelForm";

export const dynamic = "force-dynamic";

export default function NewServiceSuitePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-gray-500">Product Layer</p>
        <h1 className="text-3xl font-bold">New Service Suite</h1>
        <p className="text-gray-400 mt-1">Define the core details and pricing model for this service.</p>
      </div>

      <form action={createServiceSuiteAction} className="space-y-6">
        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">Basics</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Name</label>
              <input
                name="name"
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="Implementation Sprint"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Description</label>
              <textarea
                name="description"
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="What is included and who it is for."
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Expertise Tags (comma separated)</label>
              <input
                name="expertiseTags"
                className="w-full bg-gray-900 text-white p-2 rounded"
                placeholder="Onboarding, Implementation, Data"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Pricing</h2>
          <PricingModelForm defaultCurrency="USD" />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Create Suite
          </button>
        </div>
      </form>
    </div>
  );
}
