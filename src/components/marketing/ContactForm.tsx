'use client';

import { useState } from 'react';

interface FormState {
  name: string;
  email: string;
  company: string;
  phone: string;
  message: string;
  website: string;
}

export default function ContactForm() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: '',
    website: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...form,
        source: 'public_contact',
      };
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Unable to submit contact request.');
      }

      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contact_submit',
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined,
        }),
      });

      setSuccess(true);
      setForm({
        name: '',
        email: '',
        company: '',
        phone: '',
        message: '',
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
        <h3 className="text-2xl font-bold mb-2 text-green-300">Thank you!</h3>
        <p className="text-gray-200">We received your message and will reach out shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg space-y-4">
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
        <label className="block text-sm text-gray-300 mb-1" htmlFor="message">Message</label>
        <textarea
          id="message"
          rows={4}
          value={form.message}
          onChange={handleChange('message')}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          placeholder="What challenge can we help with?"
        />
      </div>
      <div className="hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          value={form.website}
          onChange={handleChange('website')}
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Submit'}
      </button>
    </form>
  );
}
