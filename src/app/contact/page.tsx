'use client';

import { useState } from 'react';
import { Metadata } from 'next';

const metadata = {
  title: 'Contact Us | Remote Business Partner - Start Your Transformation',
  description: "Get in touch with our expert consultants. Tell us about your business challenges and let's explore how we can help.",
};

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    jobTitle: '',
    serviceInterest: [] as string[],
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    budget: '',
    timeline: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const serviceOptions = [
    'Strategic Planning',
    'Operations Excellence',
    'Digital Transformation',
    'Fractional CXO',
    'Process Improvement',
    'Change Management',
  ];

  const handleServiceToggle = (service: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceInterest: prev.serviceInterest.includes(service)
        ? prev.serviceInterest.filter((s) => s !== service)
        : [...prev.serviceInterest, service],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Calculate fit score based on form data
      let fitScore = 50;
      if (formData.budget) fitScore += 10;
      if (formData.timeline) fitScore += 10;
      if (formData.serviceInterest.length > 0) fitScore += 15;
      if (formData.companyName) fitScore += 15;

      const leadData = {
        ...formData,
        source: 'website',
        sourceDetail: 'contact-form',
        fitScore,
        status: 'new',
        createdAt: new Date().toISOString(),
      };

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      setSubmitStatus('success');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        companyName: '',
        jobTitle: '',
        serviceInterest: [],
        urgency: 'medium',
        budget: '',
        timeline: '',
        message: '',
      });

      // Track event (if analytics configured)
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'lead_submitted', {
          event_category: 'contact',
          event_label: 'contact_form',
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-900 to-gray-900 py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold text-white mb-6 text-center">
            Let's Talk About Your Business
          </h1>
          <p className="text-xl text-gray-300 text-center max-w-3xl mx-auto">
            Share your challenges and goals with us. We'll get back to you within 24 hours.
          </p>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-8">
            {/* Personal Information */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Personal Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Company Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Job Title</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Service Interest */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">What Can We Help With?</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {serviceOptions.map((service) => (
                  <label key={service} className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.serviceInterest.includes(service)}
                      onChange={() => handleServiceToggle(service)}
                      className="w-5 h-5 bg-gray-700 border-gray-600 rounded"
                    />
                    <span>{service}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Project Details */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Project Details</h2>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-gray-300 mb-2">Urgency</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="low">Low - Exploring options</option>
                    <option value="medium">Medium - Next quarter</option>
                    <option value="high">High - Within 6 weeks</option>
                    <option value="urgent">Urgent - ASAP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Budget Range</label>
                  <select
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select budget</option>
                    <option value="<25k">Under $25,000</option>
                    <option value="25k-50k">$25,000 - $50,000</option>
                    <option value="50k-100k">$50,000 - $100,000</option>
                    <option value=">100k">Over $100,000</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Timeline</label>
                  <select
                    value={formData.timeline}
                    onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select timeline</option>
                    <option value="1-3m">1-3 months</option>
                    <option value="3-6m">3-6 months</option>
                    <option value="6-12m">6-12 months</option>
                    <option value=">12m">Over 12 months</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-2">
                  Tell Us About Your Needs <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="What challenges are you facing? What are your goals?"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send Inquiry'}
              </button>

              {submitStatus === 'success' && (
                <p className="mt-4 text-green-400 text-center">
                  Thank you! We'll be in touch within 24 hours.
                </p>
              )}

              {submitStatus === 'error' && (
                <p className="mt-4 text-red-400 text-center">
                  Something went wrong. Please try again or email us directly.
                </p>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
