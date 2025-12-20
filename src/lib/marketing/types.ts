export type PublishStatus = "draft" | "approved" | "published";

export type SeoMeta = {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
};

export type ServiceSuite = {
  slug: string;
  title: string;
  summary: string;
  heroImage?: string;
  body: string;
  tags?: string[];
  seo: SeoMeta;
  status: PublishStatus;
  updatedAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
};

export type CaseStudy = {
  slug: string;
  title: string;
  summary: string;
  heroImage?: string;
  clientName?: string;
  industry?: string;
  challenge?: string;
  approach?: string;
  results?: string;
  body: string;
  seo: SeoMeta;
  status: PublishStatus;
  publishedAt?: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
};

export type Testimonial = {
  id?: string;
  quote: string;
  name: string;
  role?: string;
  company?: string;
  avatarUrl?: string;
  rating?: number;
  seo?: SeoMeta;
  status: PublishStatus;
  publishedAt?: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
};

export type Lead = {
  id?: string;
  createdAt: FirebaseFirestore.Timestamp;
  source: "public_contact" | "public_service_inquiry";
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message?: string;
  serviceInterests?: string[];
  urgencyScore?: number;
  pageUrl?: string;
  referrer?: string;
  crm: {
    status: "new" | "synced" | "failed";
    lastAttemptAt?: FirebaseFirestore.Timestamp;
    externalId?: string;
    error?: string;
  };
};

export type MarketingEvent = {
  createdAt: FirebaseFirestore.Timestamp;
  type: "book_consult_click" | "contact_submit" | "service_inquiry_submit";
  pageUrl?: string;
  referrer?: string;
  serviceSlug?: string;
  metadata?: Record<string, unknown>;
};
