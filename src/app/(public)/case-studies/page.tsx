import Link from 'next/link';
import type { Metadata } from 'next';
import CaseStudyCard from '@/components/marketing/CaseStudyCard';
import { getPublishedCaseStudies } from '@/lib/marketing/content';

export const metadata: Metadata = {
  title: 'Case Studies | DealFlow AI',
  description: 'Proof that role-aware proposal workflows deliver results.',
};

export default async function CaseStudiesPage() {
  const caseStudies = await getPublishedCaseStudies();

  return (
    <div className="space-y-8">
      <header className="bg-gray-800 p-8 rounded-lg flex items-center justify-between">
        <div>
          <p className="text-green-300 uppercase tracking-wide text-sm mb-2">Case Studies</p>
          <h1 className="text-4xl font-bold mb-2">Proof from the field</h1>
          <p className="text-gray-300 max-w-2xl">Published customer stories that connect proposals to outcomes.</p>
        </div>
        <Link href="/contact" className="text-blue-400 hover:text-blue-200 font-semibold">Share your challenge</Link>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {caseStudies.map((caseStudy) => (
          <CaseStudyCard key={caseStudy.slug} caseStudy={caseStudy} />
        ))}
      </div>
    </div>
  );
}
