'use client';

import { useMemo, useState } from "react";
import type { PricingModel } from "@/lib/catalog/types";

type PricingModelFormProps = {
  defaultPricing?: PricingModel;
  defaultCurrency?: string;
};

const pricingOptions: { value: PricingModel["model"]; label: string }[] = [
  { value: "fixed", label: "Fixed" },
  { value: "retainer", label: "Retainer" },
  { value: "time_and_materials", label: "Time & Materials" },
];

export function PricingModelForm({ defaultPricing, defaultCurrency }: PricingModelFormProps) {
  const [model, setModel] = useState<PricingModel["model"]>(defaultPricing?.model ?? "fixed");

  const placeholders = useMemo(() => {
    switch (model) {
      case "fixed":
        return { fixedPrice: defaultPricing && defaultPricing.model === "fixed" ? defaultPricing.fixedPrice : undefined };
      case "retainer":
        return {
          retainerMonthly:
            defaultPricing && defaultPricing.model === "retainer" ? defaultPricing.retainerMonthly : undefined,
          minimumCommitmentMonths:
            defaultPricing && defaultPricing.model === "retainer"
              ? defaultPricing.minimumCommitmentMonths
              : undefined,
        };
      case "time_and_materials":
        return {
          hourlyRate:
            defaultPricing && defaultPricing.model === "time_and_materials" ? defaultPricing.hourlyRate : undefined,
        };
      default:
        return {};
    }
  }, [defaultPricing, model]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg space-y-4">
      <div>
        <label className="block text-sm text-gray-300 mb-1">Pricing Model</label>
        <select
          name="pricingModel"
          value={model}
          onChange={(e) => setModel(e.target.value as PricingModel["model"])}
          className="w-full bg-gray-900 text-white p-2 rounded"
        >
          {pricingOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Currency</label>
        <input
          type="text"
          name="currency"
          defaultValue={defaultPricing?.currency ?? defaultCurrency ?? "USD"}
          className="w-full bg-gray-900 text-white p-2 rounded"
          placeholder="USD"
        />
      </div>

      {model === "fixed" && (
        <div>
          <label className="block text-sm text-gray-300 mb-1">Fixed Price</label>
          <input
            type="number"
            name="fixedPrice"
            step="0.01"
            defaultValue={placeholders.fixedPrice}
            className="w-full bg-gray-900 text-white p-2 rounded"
            placeholder="5000"
          />
        </div>
      )}

      {model === "retainer" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Monthly Retainer</label>
            <input
              type="number"
              name="retainerMonthly"
              step="0.01"
              defaultValue={placeholders.retainerMonthly}
              className="w-full bg-gray-900 text-white p-2 rounded"
              placeholder="4000"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Minimum Commitment (months)</label>
            <input
              type="number"
              name="minimumCommitmentMonths"
              defaultValue={placeholders.minimumCommitmentMonths}
              className="w-full bg-gray-900 text-white p-2 rounded"
              placeholder="6"
            />
          </div>
        </div>
      )}

      {model === "time_and_materials" && (
        <div>
          <label className="block text-sm text-gray-300 mb-1">Hourly Rate</label>
          <input
            type="number"
            name="hourlyRate"
            step="0.01"
            defaultValue={placeholders.hourlyRate}
            className="w-full bg-gray-900 text-white p-2 rounded"
            placeholder="180"
          />
        </div>
      )}

      <div>
        <label className="block text-sm text-gray-300 mb-1">Pricing Notes</label>
        <textarea
          name="pricingNotes"
          defaultValue={defaultPricing?.notes}
          className="w-full bg-gray-900 text-white p-2 rounded"
          placeholder="Any assumptions or exclusions..."
        />
      </div>
    </div>
  );
}
