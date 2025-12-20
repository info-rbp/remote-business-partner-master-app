import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCaseStudyBySlug } from '@/lib/marketing/content';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const cs = await getCaseStudyBySlug(params.slug);
  if (!cs) {
    return { title: 'Case study not found' };
  }
  return {
    title: cs.seo.title,
    description: cs.seo.description,
    alternates: cs.seo.canonical ? { canonical: cs.seo.canonical } : undefined,
    openGraph: cs.seo.ogImage ? { images: [cs.seo.ogImage] } : undefined,
    robots: cs.seo.noindex ? { index: false, follow: false } : undefined,
  };
}

export default async function CaseStudyPage({ params }: { params: { slug: string } }) {
  const caseStudy = await getCaseStudyBySlug(params.slug);

  if (!caseStudy) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <header className="bg-gray-800 p-8 rounded-lg">
        <p className="text-green-300 uppercase tracking-wide text-sm mb-2">Case Study</p>
        <h1 className="text-4xl font-bold mb-2">{caseStudy.title}</h1>
        <p className="text-gray-300 max-w-3xl">{caseStudy.summary}</p>
        <div className="mt-4 text-gray-400 text-sm space-y-1">
          {caseStudy.clientName && <p>Client: <span className="text-gray-200">{caseStudy.clientName}</span></p>}
          {caseStudy.industry && <p>Industry: <span className="text-gray-200">{caseStudy.industry}</span></p>}
        </div>
      </header>
      <article className="prose prose-invert max-w-none space-y-4">
        {caseStudy.challenge && (
          <section>
            <h3>Challenge</h3>
            <p>{caseStudy.challenge}</p>
          </section>
        )}
        {caseStudy.approach && (
          <section>
            <h3>Approach</h3>
            <p>{caseStudy.approach}</p>
          </section>
        )}
        {caseStudy.results && (
          <section>
            <h3>Results</h3>
            <p>{caseStudy.results}</p>
          </section>
        )}
        <p>{caseStudy.body}</p>
      </article>
    </div>
  );
}
