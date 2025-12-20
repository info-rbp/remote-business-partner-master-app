import type { Timestamp as FirestoreTimestamp } from "firebase-admin/firestore";

export type Timestamp = FirestoreTimestamp;

export type BusinessProfile = {
  id: string;
  orgId: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
  businessName: string;
  legalName?: string;
  abn?: string;
  website?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  positioningCopy?: string;
  expertiseAreas: string[];
  proofSnippets: string[];
};

export type BrandKit = {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
};

export type StandardTermsBlocks = {
  paymentTerms?: string;
  cancellationTerms?: string;
  confidentiality?: string;
  liability?: string;
  warranty?: string;
  ipOwnership?: string;
  generalTerms?: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
};

export type BusinessProfileDoc = {
  profile: BusinessProfile;
  brandKit: BrandKit;
  terms: StandardTermsBlocks;
};

export type ServiceSuite = {
  id: string;
  orgId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  name: string;
  slug: string;
  description: string;
  expertiseTags: string[];
  status: "active" | "archived";
};

export type DeliverableTemplate = {
  id: string;
  title: string;
  description?: string;
  defaultIncluded: boolean;
  sortOrder: number;
};

export type MilestoneTemplate = {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  defaultDurationDays?: number;
  deliverableIds?: string[];
};

export type PricingModel =
  | {
      model: "fixed";
      currency: "AUD" | "USD" | "EUR" | string;
      fixedPrice: number;
      notes?: string;
    }
  | {
      model: "retainer";
      currency: "AUD" | "USD" | "EUR" | string;
      retainerMonthly: number;
      minimumCommitmentMonths?: number;
      notes?: string;
    }
  | {
      model: "time_and_materials";
      currency: "AUD" | "USD" | "EUR" | string;
      hourlyRate: number;
      notes?: string;
    };

export type DiscoveryQuestionTemplate = {
  id: string;
  question: string;
  helpText?: string;
  sortOrder: number;
  required: boolean;
  inputType: "text" | "textarea" | "select" | "multiselect";
  options?: string[];
};

export type ServiceSuiteTemplateDoc = {
  suite: ServiceSuite;
  defaultDeliverables: DeliverableTemplate[];
  defaultMilestones: MilestoneTemplate[];
  defaultPricing: PricingModel;
  discoveryQuestions: DiscoveryQuestionTemplate[];
};
