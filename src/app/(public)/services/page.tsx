import Link from 'next/link';
import BookConsultButton from '@/components/marketing/BookConsultButton';
import ServiceCard from '@/components/marketing/ServiceCard';
import { getPublishedServices } from '@/lib/marketing/content';
import type { Metadata } from 'next';

const META_DEFAULT: Metadata = {
  title: 'Services | DealFlow AI',
  description: 'Explore DealFlow AI services for proposal automation, intake, and governance.',
};

export const metadata = META_DEFAULT;

export default async function ServicesPage() {
  const services = await getPublishedServices();

  return (
    <div className="space-y-8">
      <header className="bg-gray-800 p-8 rounded-lg flex items-center justify-between">
        <div>
          <p className="text-blue-300 uppercase tracking-wide text-sm mb-2">Services</p>
          <h1 className="text-4xl font-bold mb-2">Ship reliable proposals and proof</h1>
          <p className="text-gray-300 max-w-2xl">
            Every service includes lifecycle tracking, audit logs, and role-aware access so your team stays aligned.
          </p>
        </div>
        <BookConsultButton href={process.env.NEXT_PUBLIC_CONSULT_URL ?? '#'} label="Book a consult" />
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <ServiceCard key={service.slug} service={service} />
        ))}
      </div>
      <div className="text-center">
        <Link href="/contact" className="text-blue-400 hover:text-blue-200 font-semibold">Need something custom? Contact us.</Link>
      </div>
    </div>
  );
}
