import Link from 'next/link';
import BookConsultButton from '@/components/marketing/BookConsultButton';
import ServiceCard from '@/components/marketing/ServiceCard';
import CaseStudyCard from '@/components/marketing/CaseStudyCard';
import TestimonialCard from '@/components/marketing/TestimonialCard';
import { getPublishedCaseStudies, getPublishedServices, getPublishedTestimonials } from '@/lib/marketing/content';

export default async function HomePage() {
  const [services, caseStudies, testimonials] = await Promise.all([
    getPublishedServices(),
    getPublishedCaseStudies(),
    getPublishedTestimonials(3),
  ]);

  return (
    <div className="space-y-12">
      <section className="text-center bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-10 shadow-lg">
        <p className="uppercase tracking-wide text-blue-100 font-semibold mb-2">DealFlow AI</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Ship proposals with governance and speed</h1>
        <p className="text-lg text-blue-100 mb-6 max-w-3xl mx-auto">
          Unified intake, AI drafting, and role-aware approvals so your team can move fast without losing control.
        </p>
        <div className="flex justify-center gap-4">
          <BookConsultButton href={process.env.NEXT_PUBLIC_CONSULT_URL ?? '#'} label="Book a consult" />
          <Link href="/services" className="text-white underline font-semibold">Explore services</Link>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold">Services</h2>
          <Link href="/services" className="text-blue-400 hover:text-blue-200">View all services</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold">Case Studies</h2>
          <Link href="/case-studies" className="text-blue-400 hover:text-blue-200">View all case studies</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {caseStudies.map((cs) => (
            <CaseStudyCard key={cs.slug} caseStudy={cs} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold">Reviews</h2>
          <Link href="/reviews" className="text-blue-400 hover:text-blue-200">See all</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id ?? testimonial.name} testimonial={testimonial} />
          ))}
        </div>
      </section>
    </div>
  );
}
