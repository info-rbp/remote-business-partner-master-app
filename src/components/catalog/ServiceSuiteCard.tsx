import Link from "next/link";
import type { ServiceSuite } from "@/lib/catalog/types";
import { Layers } from "lucide-react";

export function ServiceSuiteCard({ suite }: { suite: ServiceSuite }) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg flex items-start space-x-3 border border-gray-700">
      <div className="bg-blue-600/20 text-blue-400 rounded-full p-2">
        <Layers className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">{suite.name}</h3>
          <span
            className={`px-2 py-1 text-xs rounded ${
              suite.status === "active" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-200"
            }`}
          >
            {suite.status}
          </span>
        </div>
        <p className="text-gray-400 text-sm mb-2">{suite.description}</p>
        <div className="flex flex-wrap gap-2 text-xs text-gray-300">
          {suite.expertiseTags?.map((tag) => (
            <span key={tag} className="bg-gray-900 px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-3">
          <Link href={`/catalog/services/${suite.id}`} className="text-blue-400 hover:underline text-sm">
            Edit suite
          </Link>
        </div>
      </div>
    </div>
  );
}
