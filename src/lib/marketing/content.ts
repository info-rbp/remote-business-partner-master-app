import { db } from '@/lib/db';
import type { CaseStudy, ServiceSuite, Testimonial } from './types';

const DEMO_SERVICES: ServiceSuite[] = [
  {
    slug: 'dealflow-automation',
    title: 'DealFlow Automation',
    summary: 'Automate intake, scoring, and follow-up for every inbound lead.',
    heroImage: 'https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1400&q=80',
    body: 'We streamline your deal pipeline with AI-driven enrichment, prioritization, and outreach. From lead capture to proposal handoff, everything is traceable and auditable.',
    tags: ['automation', 'crm', 'ai'],
    seo: {
      title: 'DealFlow Automation Services',
      description: 'Automate lead intake, routing, and proposal workflows with DealFlow AI.',
    },
    status: 'published',
    updatedAt: new Date() as unknown as FirebaseFirestore.Timestamp,
    createdAt: new Date() as unknown as FirebaseFirestore.Timestamp,
  },
  {
    slug: 'proposal-generation',
    title: 'Proposal Generation',
    summary: 'Generate compliant, client-ready proposals with audit trails.',
    heroImage: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80',
    body: 'Our Gemini-powered drafting and approval flow keeps stakeholders aligned. Templates, attachments, and role-aware reviews are built in.',
    tags: ['ai', 'proposals', 'governance'],
    seo: {
      title: 'AI Proposal Generation',
      description: 'Produce polished proposals faster with governance and role-aware approvals.',
    },
    status: 'published',
    updatedAt: new Date() as unknown as FirebaseFirestore.Timestamp,
    createdAt: new Date() as unknown as FirebaseFirestore.Timestamp,
  },
];

const DEMO_CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'saas-pipeline-lift',
    title: 'SaaS Pipeline Lift',
    summary: 'Increased qualified pipeline by 38% in six weeks.',
    heroImage: 'https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?auto=format&fit=crop&w=1400&q=80',
    clientName: 'Northwind SaaS',
    industry: 'Software',
    challenge: 'Low conversion from inbound demos to proposals.',
    approach: 'Implemented AI triage, automated stakeholder briefs, and proposal templates.',
    results: 'Cut proposal prep from 3 days to 4 hours and lifted win rate by 9 points.',
    body: 'By unifying intake, data enrichment, and proposal generation, the sales team reclaimed hours weekly and improved quality. Playbooks and audit trails kept leadership confident.',
    seo: {
      title: 'Case Study: SaaS Pipeline Lift',
      description: 'How DealFlow AI boosted qualified pipeline and proposal velocity for a SaaS leader.',
    },
    status: 'published',
    publishedAt: new Date() as unknown as FirebaseFirestore.Timestamp,
    updatedAt: new Date() as unknown as FirebaseFirestore.Timestamp,
    createdAt: new Date() as unknown as FirebaseFirestore.Timestamp,
  },
];

const DEMO_TESTIMONIALS: Testimonial[] = [
  {
    id: 'demo-1',
    quote: 'DealFlow AI gave us governance without slowing us down. We ship proposals in hours, not days.',
    name: 'Jamie Rivera',
    role: 'VP Sales',
    company: 'Northwind',
    rating: 5,
    status: 'published',
    publishedAt: new Date() as unknown as FirebaseFirestore.Timestamp,
    updatedAt: new Date() as unknown as FirebaseFirestore.Timestamp,
    createdAt: new Date() as unknown as FirebaseFirestore.Timestamp,
  },
  {
    id: 'demo-2',
    quote: 'Our client reviews improved because every attachment is traceable and role-aware.',
    name: 'Priya Desai',
    role: 'Head of RevOps',
    company: 'Stark Industries',
    rating: 5,
    status: 'published',
    publishedAt: new Date() as unknown as FirebaseFirestore.Timestamp,
    updatedAt: new Date() as unknown as FirebaseFirestore.Timestamp,
    createdAt: new Date() as unknown as FirebaseFirestore.Timestamp,
  },
];

function mapDocs<T>(snapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>) {
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })) as unknown as T[];
}

export async function getPublishedServices(): Promise<ServiceSuite[]> {
  const snapshot = await db
    .collection('publicServiceSuites')
    .where('status', '==', 'published')
    .orderBy('updatedAt', 'desc')
    .get()
    .catch(() => null);

  if (!snapshot || snapshot.empty) {
    return DEMO_SERVICES;
  }

  return mapDocs<ServiceSuite>(snapshot);
}

export async function getServiceBySlug(slug: string): Promise<ServiceSuite | null> {
  const docSnap = await db.collection('publicServiceSuites').doc(slug).get().catch(() => null);
  if (docSnap?.exists) {
    const data = docSnap.data() as ServiceSuite;
    if (data.status === 'published') {
      return data;
    }
  }
  return DEMO_SERVICES.find((service) => service.slug === slug && service.status === 'published') ?? null;
}

export async function getPublishedCaseStudies(): Promise<CaseStudy[]> {
  const snapshot = await db
    .collection('publicCaseStudies')
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'desc')
    .get()
    .catch(() => null);

  if (!snapshot || snapshot.empty) {
    return DEMO_CASE_STUDIES;
  }

  return mapDocs<CaseStudy>(snapshot);
}

export async function getCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
  const docSnap = await db.collection('publicCaseStudies').doc(slug).get().catch(() => null);
  if (docSnap?.exists) {
    const data = docSnap.data() as CaseStudy;
    if (data.status === 'published') {
      return data;
    }
  }
  return DEMO_CASE_STUDIES.find((cs) => cs.slug === slug && cs.status === 'published') ?? null;
}

export async function getPublishedTestimonials(limit?: number): Promise<Testimonial[]> {
  let queryRef = db
    .collection('publicTestimonials')
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'desc') as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

  if (limit) {
    queryRef = queryRef.limit(limit);
  }

  const snapshot = await queryRef.get().catch(() => null);

  if (!snapshot || snapshot.empty) {
    return DEMO_TESTIMONIALS.slice(0, limit ?? DEMO_TESTIMONIALS.length);
  }

  return mapDocs<Testimonial>(snapshot);
}
