import Link from 'next/link';
import type { CaseStudy } from '@/lib/marketing/types';

export default function CaseStudyCard({ caseStudy }: { caseStudy: CaseStudy }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full flex flex-col">
      <p className="text-sm text-green-300 uppercase tracking-wide mb-2">Case Study</p>
      <h3 className="text-2xl font-bold mb-2">{caseStudy.title}</h3>
      <p className="text-gray-300 mb-4 flex-1">{caseStudy.summary}</p>
      {caseStudy.clientName && (
        <p className="text-gray-400 text-sm mb-2">
          Client: <span className="text-gray-200">{caseStudy.clientName}</span>
        </p>
      )}
      <Link
        href={`/case-studies/${caseStudy.slug}`}
        className="text-blue-400 hover:text-blue-200 font-semibold"
      >
        Read the story
      </Link>
    </div>
  );
}
