import type { Metadata } from 'next';
import ContactForm from '@/components/marketing/ContactForm';
import BookConsultButton from '@/components/marketing/BookConsultButton';

export const metadata: Metadata = {
  title: 'Contact | DealFlow AI',
  description: 'Contact DealFlow AI to modernize your proposal workflows.',
};

export default function ContactPage() {
  const consultUrl = process.env.NEXT_PUBLIC_CONSULT_URL ?? '#';

  return (
    <div className="space-y-8">
      <header className="bg-gray-800 p-8 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-blue-300 uppercase tracking-wide text-sm mb-2">Contact</p>
          <h1 className="text-4xl font-bold mb-2">Tell us about your deals</h1>
          <p className="text-gray-300 max-w-3xl">
            We’ll align on the workflow, data, and governance you need to move fast without surprises.
          </p>
        </div>
        <BookConsultButton href={consultUrl} label="Book a consult" />
      </header>
      <ContactForm />
    </div>
  );
}
