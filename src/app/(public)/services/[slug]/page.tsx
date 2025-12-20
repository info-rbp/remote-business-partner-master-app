import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BookConsultButton from '@/components/marketing/BookConsultButton';
import ServiceInquiryForm from '@/components/marketing/ServiceInquiryForm';
import { getServiceBySlug } from '@/lib/marketing/content';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const service = await getServiceBySlug(params.slug);
  if (!service) {
    return { title: 'Service not found' };
  }
  return {
    title: service.seo.title,
    description: service.seo.description,
    alternates: service.seo.canonical ? { canonical: service.seo.canonical } : undefined,
    openGraph: service.seo.ogImage ? { images: [service.seo.ogImage] } : undefined,
    robots: service.seo.noindex ? { index: false, follow: false } : undefined,
  };
}

export default async function ServicePage({ params }: { params: { slug: string } }) {
  const service = await getServiceBySlug(params.slug);

  if (!service) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <header className="bg-gray-800 p-8 rounded-lg">
        <p className="text-blue-300 uppercase tracking-wide text-sm mb-2">Service</p>
        <h1 className="text-4xl font-bold mb-2">{service.title}</h1>
        <p className="text-gray-300 max-w-3xl">{service.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(service.tags ?? []).map((tag) => (
            <span key={tag} className="bg-gray-700 text-gray-200 px-2 py-1 rounded text-xs">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-6">
          <BookConsultButton
            href={process.env.NEXT_PUBLIC_CONSULT_URL ?? '#'}
            serviceSlug={service.slug}
            label="Book a consult"
          />
        </div>
      </header>
      <article className="prose prose-invert max-w-none">
        <p>{service.body}</p>
      </article>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Tell us what you need</h2>
        <ServiceInquiryForm serviceSlug={service.slug} />
      </section>
    </div>
  );
}
