import Link from 'next/link';
import type { ServiceSuite } from '@/lib/marketing/types';
import BookConsultButton from './BookConsultButton';

export default function ServiceCard({ service }: { service: ServiceSuite }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full flex flex-col">
      <div className="flex-1">
        <p className="text-sm text-blue-300 uppercase tracking-wide mb-2">Service</p>
        <h3 className="text-2xl font-bold mb-2">{service.title}</h3>
        <p className="text-gray-300 mb-4">{service.summary}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {(service.tags ?? []).map((tag) => (
            <span key={tag} className="bg-gray-700 text-gray-200 px-2 py-1 rounded text-xs">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={`/services/${service.slug}`}
          className="text-blue-400 hover:text-blue-200 font-semibold"
        >
          View details
        </Link>
        <BookConsultButton
          href={process.env.NEXT_PUBLIC_CONSULT_URL ?? '#'}
          serviceSlug={service.slug}
          label="Book a consult"
        />
      </div>
    </div>
  );
}
