import type { Metadata } from 'next';
import TestimonialCard from '@/components/marketing/TestimonialCard';
import { getPublishedTestimonials } from '@/lib/marketing/content';

export const metadata: Metadata = {
  title: 'Reviews | DealFlow AI',
  description: 'Customer testimonials about governed proposal workflows.',
};

export default async function ReviewsPage() {
  const testimonials = await getPublishedTestimonials();

  return (
    <div className="space-y-6">
      <header className="bg-gray-800 p-8 rounded-lg">
        <p className="text-yellow-300 uppercase tracking-wide text-sm mb-2">Reviews</p>
        <h1 className="text-4xl font-bold mb-2">What teams say</h1>
        <p className="text-gray-300 max-w-3xl">
          Published testimonials from teams that needed speed, governance, and AI without chaos.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {testimonials.map((testimonial) => (
          <TestimonialCard key={testimonial.id ?? testimonial.name} testimonial={testimonial} />
        ))}
      </div>
    </div>
  );
}
