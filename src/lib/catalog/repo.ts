import { db } from "@/lib/db";
import { Timestamp, type Query, type DocumentData } from "firebase-admin/firestore";
import type {
  BusinessProfileDoc,
  DeliverableTemplate,
  DiscoveryQuestionTemplate,
  MilestoneTemplate,
  PricingModel,
  BusinessProfile,
  BrandKit,
  StandardTermsBlocks,
  ServiceSuite,
  ServiceSuiteTemplateDoc,
} from "./types";

const now = () => Timestamp.now();

function ensureArray<T>(value: T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validatePricingModel(model: PricingModel) {
  if (!model?.model) {
    throw new Error("Pricing model is required");
  }
  switch (model.model) {
    case "fixed":
      if (model.fixedPrice === undefined || model.fixedPrice === null) {
        throw new Error("Fixed price is required for fixed model");
      }
      break;
    case "retainer":
      if (model.retainerMonthly === undefined || model.retainerMonthly === null) {
        throw new Error("Retainer monthly is required for retainer model");
      }
      break;
    case "time_and_materials":
      if (model.hourlyRate === undefined || model.hourlyRate === null) {
        throw new Error("Hourly rate is required for time and materials model");
      }
      break;
    default:
      throw new Error("Unknown pricing model");
  }
}

export async function getBusinessProfile(orgId: string): Promise<BusinessProfileDoc | null> {
  const ref = db.collection("orgs").doc(orgId).collection("settings").doc("businessProfile");
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as BusinessProfileDoc;
  return {
    profile: {
      ...data.profile,
      expertiseAreas: ensureArray(data.profile?.expertiseAreas),
      proofSnippets: ensureArray(data.profile?.proofSnippets),
    },
    brandKit: data.brandKit,
    terms: data.terms,
  };
}

type BusinessProfilePatch = Partial<{
  profile: Partial<BusinessProfile>;
  brandKit: Partial<BrandKit>;
  terms: Partial<StandardTermsBlocks>;
}>;

export async function upsertBusinessProfile(orgId: string, patch: BusinessProfilePatch): Promise<void> {
  const existing = await getBusinessProfile(orgId);
  const ref = db.collection("orgs").doc(orgId).collection("settings").doc("businessProfile");
  const timestamp = now();

  if (!existing) {
    const profile = {
      id: orgId,
      orgId,
      createdAt: timestamp,
      updatedAt: timestamp,
      businessName: patch.profile?.businessName ?? "Demo Business",
      legalName: patch.profile?.legalName,
      abn: patch.profile?.abn,
      website: patch.profile?.website,
      contactEmail: patch.profile?.contactEmail,
      phone: patch.profile?.phone,
      address: patch.profile?.address,
      positioningCopy: patch.profile?.positioningCopy,
      expertiseAreas: ensureArray(patch.profile?.expertiseAreas),
      proofSnippets: ensureArray(patch.profile?.proofSnippets),
    };
    const brandKit = {
      logoUrl: patch.brandKit?.logoUrl,
      primaryColor: patch.brandKit?.primaryColor,
      secondaryColor: patch.brandKit?.secondaryColor,
      accentColor: patch.brandKit?.accentColor,
      fontFamily: patch.brandKit?.fontFamily,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const terms = {
      paymentTerms: patch.terms?.paymentTerms,
      cancellationTerms: patch.terms?.cancellationTerms,
      confidentiality: patch.terms?.confidentiality,
      liability: patch.terms?.liability,
      warranty: patch.terms?.warranty,
      ipOwnership: patch.terms?.ipOwnership,
      generalTerms: patch.terms?.generalTerms,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await ref.set({ profile, brandKit, terms });
    return;
  }

  const nextProfile = patch.profile
    ? {
        ...existing.profile,
        ...patch.profile,
        expertiseAreas: ensureArray(patch.profile.expertiseAreas ?? existing.profile.expertiseAreas),
        proofSnippets: ensureArray(patch.profile.proofSnippets ?? existing.profile.proofSnippets),
        updatedAt: timestamp,
      }
    : existing.profile;

  const nextBrandKit = patch.brandKit
    ? {
        ...existing.brandKit,
        ...patch.brandKit,
        updatedAt: timestamp,
      }
    : existing.brandKit;

  const nextTerms = patch.terms
    ? {
        ...existing.terms,
        ...patch.terms,
        updatedAt: timestamp,
      }
    : existing.terms;

  await ref.set({ profile: nextProfile, brandKit: nextBrandKit, terms: nextTerms }, { merge: true });
}

type CreateServiceSuiteInput = {
  name: string;
  description: string;
  expertiseTags?: string[];
  defaultDeliverables?: DeliverableTemplate[];
  defaultMilestones?: MilestoneTemplate[];
  defaultPricing: PricingModel;
  discoveryQuestions?: DiscoveryQuestionTemplate[];
};

function normalizeSuiteArrays(doc: ServiceSuiteTemplateDoc): ServiceSuiteTemplateDoc {
  return {
    ...doc,
    defaultDeliverables: ensureArray(doc.defaultDeliverables).map((d, index) => ({
      ...d,
      defaultIncluded: d.defaultIncluded ?? false,
      sortOrder: d.sortOrder ?? index,
    })),
    defaultMilestones: ensureArray(doc.defaultMilestones).map((m, index) => ({
      ...m,
      sortOrder: m.sortOrder ?? index,
      deliverableIds: ensureArray(m.deliverableIds),
    })),
    discoveryQuestions: ensureArray(doc.discoveryQuestions).map((q, index) => ({
      ...q,
      sortOrder: q.sortOrder ?? index,
      options: ensureArray(q.options),
    })),
  };
}

export async function createServiceSuite(
  orgId: string,
  input: CreateServiceSuiteInput
): Promise<string> {
  if (!input.name?.trim()) {
    throw new Error("Service suite name is required");
  }
  if (!input.description?.trim()) {
    throw new Error("Service suite description is required");
  }
  validatePricingModel(input.defaultPricing);

  const suitesRef = db.collection("orgs").doc(orgId).collection("serviceSuites");
  const baseSlug = slugify(input.name);
  let slug = baseSlug || "suite";
  let suffix = 1;
  // Ensure slug uniqueness
  while (true) {
    const existingSlug = await suitesRef.where("suite.slug", "==", slug).limit(1).get();
    if (existingSlug.empty) break;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const timestamp = now();
  const suiteRef = suitesRef.doc();
  const suite: ServiceSuite = {
    id: suiteRef.id,
    orgId,
    name: input.name,
    slug,
    description: input.description,
    expertiseTags: ensureArray(input.expertiseTags),
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const doc: ServiceSuiteTemplateDoc = normalizeSuiteArrays({
    suite,
    defaultDeliverables: ensureArray(input.defaultDeliverables),
    defaultMilestones: ensureArray(input.defaultMilestones),
    defaultPricing: input.defaultPricing,
    discoveryQuestions: ensureArray(input.discoveryQuestions),
  });

  await suiteRef.set(doc);
  return suiteRef.id;
}

export async function getServiceSuite(
  orgId: string,
  suiteId: string
): Promise<ServiceSuiteTemplateDoc | null> {
  const ref = db.collection("orgs").doc(orgId).collection("serviceSuites").doc(suiteId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as ServiceSuiteTemplateDoc;
  return normalizeSuiteArrays({
    ...data,
    suite: { ...data.suite, expertiseTags: ensureArray(data.suite?.expertiseTags) },
  });
}

export async function listServiceSuites(
  orgId: string,
  opts: { status?: "active" | "archived"; search?: string; limit?: number } = {}
): Promise<(ServiceSuite & { pricingModel?: PricingModel["model"] })[]> {
  const suitesRef = db.collection("orgs").doc(orgId).collection("serviceSuites");
  let queryRef: Query<DocumentData> = suitesRef;
  if (opts.status) {
    queryRef = queryRef.where("suite.status", "==", opts.status);
  }
  if (opts.limit) {
    queryRef = queryRef.limit(opts.limit);
  }

  const snap = await queryRef.get();
  let suites = snap.docs
    .map((doc) => doc.data() as ServiceSuiteTemplateDoc)
    .filter(Boolean)
    .map((data) => ({
      ...data.suite,
      expertiseTags: ensureArray(data.suite.expertiseTags),
      pricingModel: data.defaultPricing?.model,
    }));

  if (opts.search) {
    const search = opts.search.toLowerCase();
    suites = suites.filter((suite) => suite.name.toLowerCase().includes(search));
  }

  return suites;
}

export async function updateServiceSuite(
  orgId: string,
  suiteId: string,
  patch: {
    suite?: Partial<ServiceSuite>;
    defaultDeliverables?: DeliverableTemplate[];
    defaultMilestones?: MilestoneTemplate[];
    defaultPricing?: PricingModel;
    discoveryQuestions?: DiscoveryQuestionTemplate[];
  }
): Promise<void> {
  const ref = db.collection("orgs").doc(orgId).collection("serviceSuites").doc(suiteId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Service suite not found");
  }
  const current = snap.data() as ServiceSuiteTemplateDoc;
  const timestamp = now();

  const nextSuite = patch.suite
    ? {
        ...current.suite,
        ...patch.suite,
        updatedAt: timestamp,
        expertiseTags: ensureArray(patch.suite.expertiseTags ?? current.suite.expertiseTags),
      }
    : { ...current.suite, updatedAt: timestamp };

  const doc: ServiceSuiteTemplateDoc = normalizeSuiteArrays({
    suite: nextSuite,
    defaultDeliverables: ensureArray(patch.defaultDeliverables ?? current.defaultDeliverables),
    defaultMilestones: ensureArray(patch.defaultMilestones ?? current.defaultMilestones),
    defaultPricing: patch.defaultPricing ?? current.defaultPricing,
    discoveryQuestions: ensureArray(patch.discoveryQuestions ?? current.discoveryQuestions),
  });

  validatePricingModel(doc.defaultPricing);
  await ref.set(doc, { merge: true });
}

export async function archiveServiceSuite(orgId: string, suiteId: string): Promise<void> {
  const ref = db.collection("orgs").doc(orgId).collection("serviceSuites").doc(suiteId);
  await ref.update({
    "suite.status": "archived",
    "suite.updatedAt": now(),
  });
}

export async function restoreServiceSuite(orgId: string, suiteId: string): Promise<void> {
  const ref = db.collection("orgs").doc(orgId).collection("serviceSuites").doc(suiteId);
  await ref.update({
    "suite.status": "active",
    "suite.updatedAt": now(),
  });
}
