import type { Metadata } from 'next';
import BookConsultButton from '@/components/marketing/BookConsultButton';

export const metadata: Metadata = {
  title: 'Approach | DealFlow AI',
  description: 'How DealFlow AI delivers governed, role-aware proposal workflows.',
};

export default function ApproachPage() {
  const consultUrl = process.env.NEXT_PUBLIC_CONSULT_URL ?? '#';

  return (
    <div className="space-y-8">
      <header className="bg-gray-800 p-8 rounded-lg">
        <p className="text-sm text-blue-300 uppercase tracking-wide mb-2">Approach</p>
        <h1 className="text-4xl font-bold mb-2">Every workflow has a lifecycle</h1>
        <p className="text-gray-300 max-w-3xl">
          We start with identity and roles, connect assets to every workflow, and ensure AI stays server-side and auditable.
        </p>
        <div className="mt-6">
          <BookConsultButton href={consultUrl} label="Talk to the team" />
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: 'Identity-first',
            body: 'Org-scoped data, custom claims, and role-aware surfaces from day one.',
          },
          {
            title: 'Lifecycle by default',
            body: 'Create → update → status → audit log → archive. Every workflow leaves traceable proof.',
          },
          {
            title: 'AI with guardrails',
            body: 'Server-side AI, schema-bound outputs, and zero browser keys keep data safe.',
          },
        ].map((item) => (
          <div key={item.title} className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-2">{item.title}</h3>
            <p className="text-gray-300">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
