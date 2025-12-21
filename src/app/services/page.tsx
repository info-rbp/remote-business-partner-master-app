import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Services | Remote Business Partner - Expert Business Consulting',
  description: 'Comprehensive business consulting services including strategy, operations, digital transformation, and fractional CXO support for growing businesses.',
  keywords: 'business consulting, strategy consulting, operations improvement, digital transformation, fractional CXO',
};

const services = [
  {
    id: 'strategy',
    title: 'Strategic Planning',
    description: 'Develop clear, actionable strategies aligned with your business goals',
    features: [
      'Business model design and validation',
      'Market analysis and competitive positioning',
      'Growth strategy and roadmap development',
      'OKR and KPI framework design',
    ],
    icon: '🎯',
  },
  {
    id: 'operations',
    title: 'Operations Excellence',
    description: 'Streamline processes and improve operational efficiency',
    features: [
      'Process mapping and optimization',
      'Systems and tools implementation',
      'Resource planning and capacity management',
      'Quality assurance frameworks',
    ],
    icon: '⚙️',
  },
  {
    id: 'digital',
    title: 'Digital Transformation',
    description: 'Modernize your business with technology and digital processes',
    features: [
      'Digital strategy and roadmap',
      'Technology selection and implementation',
      'Change management and adoption',
      'Data and analytics foundation',
    ],
    icon: '🚀',
  },
  {
    id: 'fractional',
    title: 'Fractional CXO',
    description: 'Executive-level expertise on a flexible, part-time basis',
    features: [
      'Fractional COO services',
      'Interim leadership during transitions',
      'Board advisory and governance',
      'Strategic program management',
    ],
    icon: '👔',
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-900 to-gray-900 py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold text-white mb-6 text-center">
            Our Services
          </h1>
          <p className="text-xl text-gray-300 text-center max-w-3xl mx-auto">
            Expert consulting services to help your business grow, transform, and succeed
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-gray-800 rounded-lg p-8 hover:bg-gray-750 transition-colors"
              >
                <div className="text-5xl mb-4">{service.icon}</div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  {service.title}
                </h2>
                <p className="text-gray-300 mb-6">{service.description}</p>
                <ul className="space-y-3">
                  {service.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="w-6 h-6 text-green-400 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="bg-gray-800 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">
            How We Work
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Discovery', desc: 'Understand your business, challenges, and goals' },
              { step: '2', title: 'Diagnosis', desc: 'Analyze current state and identify opportunities' },
              { step: '3', title: 'Design', desc: 'Develop tailored solutions and implementation plans' },
              { step: '4', title: 'Delivery', desc: 'Execute with your team and track outcomes' },
            ].map((phase) => (
              <div key={phase.step} className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                  {phase.step}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{phase.title}</h3>
                <p className="text-gray-300">{phase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Let's discuss how we can help you achieve your goals
          </p>
          <Link
            href="/contact"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
}
