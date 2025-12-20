'use client';

import { useState } from 'react';

interface FormState {
  name: string;
  email: string;
  company: string;
  phone: string;
  message: string;
  urgencyScore: number;
  website: string;
}

export default function ServiceInquiryForm({ serviceSlug }: { serviceSlug: string }) {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: '',
    urgencyScore: 3,
    website: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = field === 'urgencyScore' ? Number(event.target.value) : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...form,
        source: 'public_service_inquiry',
        serviceInterests: [serviceSlug],
        urgencyScore: form.urgencyScore,
      };

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Unable to submit your inquiry.');
      }

      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'service_inquiry_submit',
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined,
          serviceSlug,
        }),
      });

      setSuccess(true);
      setForm({
        name: '',
        email: '',
        company: '',
        phone: '',
        message: '',
        urgencyScore: 3,
        website: '',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg text-center">
        <h3 className="text-2xl font-bold mb-2 text-green-300">Inquiry received</h3>
        <p className="text-gray-200">We will follow up about {serviceSlug} shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1" htmlFor="name">Name</label>
          <input
            id="name"
            required
            value={form.name}
            onChange={handleChange('name')}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange('email')}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1" htmlFor="company">Company</label>
          <input
            id="company"
            value={form.company}
            onChange={handleChange('company')}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1" htmlFor="phone">Phone</label>
          <input
            id="phone"
            value={form.phone}
            onChange={handleChange('phone')}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-1" htmlFor="urgency">Urgency</label>
        <select
          id="urgency"
          value={form.urgencyScore}
          onChange={handleChange('urgencyScore')}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>{value} - {value === 1 ? 'Low' : value === 5 ? 'Immediate' : 'Medium'}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-1" htmlFor="message">Project details</label>
        <textarea
          id="message"
          rows={4}
          value={form.message}
          onChange={handleChange('message')}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          placeholder="Tell us about the scope, timeline, or current blockers."
        />
      </div>
      <div className="hidden">
        <label htmlFor="website">Website</label>
        <input id="website" value={form.website} onChange={handleChange('website')} />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit inquiry'}
      </button>
    </form>
  );
}
