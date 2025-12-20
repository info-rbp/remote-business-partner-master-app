import type { Testimonial } from '@/lib/marketing/types';

export default function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full flex flex-col">
      <p className="text-sm text-yellow-300 uppercase tracking-wide mb-2">Testimonial</p>
      <p className="text-gray-200 italic mb-4">“{testimonial.quote}”</p>
      <div className="mt-auto">
        <p className="font-semibold text-white">{testimonial.name}</p>
        <p className="text-gray-400 text-sm">
          {[testimonial.role, testimonial.company].filter(Boolean).join(' · ')}
        </p>
        {testimonial.rating ? (
          <p className="text-yellow-400 text-sm mt-2">Rating: {testimonial.rating}/5</p>
        ) : null}
      </div>
    </div>
  );
}
