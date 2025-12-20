import { redirect } from "next/navigation";
import {
  archiveServiceSuite,
  createServiceSuite,
  restoreServiceSuite,
  updateServiceSuite,
  upsertBusinessProfile,
} from "@/lib/catalog/repo";
import { seedProposalFromServiceSuite } from "@/lib/catalog/seeding";
import type {
  DeliverableTemplate,
  DiscoveryQuestionTemplate,
  MilestoneTemplate,
  PricingModel,
  ServiceSuiteTemplateDoc,
} from "@/lib/catalog/types";

const ORG_ID = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? "demo-org";

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parsePricingModel(formData: FormData): PricingModel {
  const model = formData.get("pricingModel") as PricingModel["model"];
  const currency = (formData.get("currency") as string) || "USD";

  if (model === "fixed") {
    const fixedPrice = parseNumber(formData.get("fixedPrice"));
    return { model, currency, fixedPrice: fixedPrice ?? 0, notes: formData.get("pricingNotes") as string | undefined };
  }
  if (model === "retainer") {
    const retainerMonthly = parseNumber(formData.get("retainerMonthly"));
    const minimumCommitmentMonths = parseNumber(formData.get("minimumCommitmentMonths"));
    return {
      model,
      currency,
      retainerMonthly: retainerMonthly ?? 0,
      minimumCommitmentMonths: minimumCommitmentMonths,
      notes: formData.get("pricingNotes") as string | undefined,
    };
  }
  if (model === "time_and_materials") {
    const hourlyRate = parseNumber(formData.get("hourlyRate"));
    return { model, currency, hourlyRate: hourlyRate ?? 0, notes: formData.get("pricingNotes") as string | undefined };
  }
  throw new Error("Unsupported pricing model");
}

function parseArray(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeParseJson<T>(value: FormDataEntryValue | null): T | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    console.warn("Failed to parse JSON payload", err);
    return undefined;
  }
}

export async function saveBusinessProfile(formData: FormData) {
  "use server";
  const expertiseAreas = parseArray(formData.get("expertiseAreas"));
  const proofSnippets = parseArray(formData.get("proofSnippets"));

  await upsertBusinessProfile(ORG_ID, {
    profile: {
      orgId: ORG_ID,
      id: ORG_ID,
      businessName: (formData.get("businessName") as string) || "Demo Business",
      legalName: formData.get("legalName") as string | undefined,
      abn: formData.get("abn") as string | undefined,
      website: formData.get("website") as string | undefined,
      contactEmail: formData.get("contactEmail") as string | undefined,
      phone: formData.get("phone") as string | undefined,
      address: formData.get("address") as string | undefined,
      positioningCopy: formData.get("positioningCopy") as string | undefined,
      expertiseAreas,
      proofSnippets,
    },
    brandKit: {
      logoUrl: formData.get("logoUrl") as string | undefined,
      primaryColor: formData.get("primaryColor") as string | undefined,
      secondaryColor: formData.get("secondaryColor") as string | undefined,
      accentColor: formData.get("accentColor") as string | undefined,
      fontFamily: formData.get("fontFamily") as string | undefined,
    },
    terms: {
      paymentTerms: formData.get("paymentTerms") as string | undefined,
      cancellationTerms: formData.get("cancellationTerms") as string | undefined,
      confidentiality: formData.get("confidentiality") as string | undefined,
      liability: formData.get("liability") as string | undefined,
      warranty: formData.get("warranty") as string | undefined,
      ipOwnership: formData.get("ipOwnership") as string | undefined,
      generalTerms: formData.get("generalTerms") as string | undefined,
    },
  });

  redirect("/catalog/business");
}

export async function createServiceSuiteAction(formData: FormData) {
  "use server";
  const suiteId = await createServiceSuite(ORG_ID, {
    name: (formData.get("name") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    expertiseTags: parseArray(formData.get("expertiseTags")),
    defaultPricing: parsePricingModel(formData),
    defaultDeliverables: [],
    defaultMilestones: [],
    discoveryQuestions: [],
  });

  redirect(`/catalog/services/${suiteId}`);
}

export async function updateServiceSuiteAction(suiteId: string, formData: FormData) {
  "use server";
  const pricingModel = parsePricingModel(formData);
  const parsedDeliverables = safeParseJson<DeliverableTemplate[]>(formData.get("deliverablesJson")) ?? [];
  const parsedMilestones = safeParseJson<MilestoneTemplate[]>(formData.get("milestonesJson")) ?? [];
  const parsedQuestions = safeParseJson<DiscoveryQuestionTemplate[]>(formData.get("discoveryQuestionsJson")) ?? [];

  await updateServiceSuite(ORG_ID, suiteId, {
    suite: {
      name: (formData.get("name") as string) ?? "",
      description: (formData.get("description") as string) ?? "",
      expertiseTags: parseArray(formData.get("expertiseTags")),
    },
    defaultPricing: pricingModel,
    defaultDeliverables: parsedDeliverables.map((d, index) => ({
      ...d,
      sortOrder: d.sortOrder ?? index,
      defaultIncluded: Boolean(d.defaultIncluded),
    })),
    defaultMilestones: parsedMilestones.map((m, index) => ({
      ...m,
      sortOrder: m.sortOrder ?? index,
      deliverableIds: (() => {
        const deliverableIdsRaw = (m as { deliverableIds?: unknown }).deliverableIds;
        if (Array.isArray(deliverableIdsRaw)) return deliverableIdsRaw as string[];
        if (typeof deliverableIdsRaw === "string") {
          return deliverableIdsRaw.split(",").map((v) => v.trim()).filter(Boolean);
        }
        return [];
      })(),
    })),
    discoveryQuestions: parsedQuestions.map((q, index) => ({
      ...q,
      sortOrder: q.sortOrder ?? index,
      required: Boolean(q.required),
      options: (() => {
        const optionsRaw = (q as { options?: unknown }).options;
        if (Array.isArray(optionsRaw)) return optionsRaw as string[];
        if (typeof optionsRaw === "string") {
          return optionsRaw.split(",").map((v) => v.trim()).filter(Boolean);
        }
        return [];
      })(),
    })),
  });
}

export async function updateDeliverables(suiteId: string, formData: FormData) {
  "use server";
  const payload = safeParseJson<DeliverableTemplate[]>(formData.get("deliverablesJson")) ?? [];
  await updateServiceSuite(ORG_ID, suiteId, {
    defaultDeliverables: payload.map((d, index) => ({
      ...d,
      sortOrder: d.sortOrder ?? index,
      defaultIncluded: Boolean(d.defaultIncluded),
    })),
  });
}

export async function updateMilestones(suiteId: string, formData: FormData) {
  "use server";
  const payload = safeParseJson<MilestoneTemplate[]>(formData.get("milestonesJson")) ?? [];
  await updateServiceSuite(ORG_ID, suiteId, {
    defaultMilestones: payload.map((m, index) => ({
      ...m,
      sortOrder: m.sortOrder ?? index,
      deliverableIds: (() => {
        const deliverableIdsRaw = (m as { deliverableIds?: unknown }).deliverableIds;
        if (Array.isArray(deliverableIdsRaw)) return deliverableIdsRaw as string[];
        if (typeof deliverableIdsRaw === "string") {
          return deliverableIdsRaw.split(",").map((v) => v.trim()).filter(Boolean);
        }
        return [];
      })(),
    })),
  });
}

export async function updateDiscoveryQuestions(suiteId: string, formData: FormData) {
  "use server";
  const payload = safeParseJson<DiscoveryQuestionTemplate[]>(formData.get("discoveryQuestionsJson")) ?? [];
  await updateServiceSuite(ORG_ID, suiteId, {
    discoveryQuestions: payload.map((q, index) => ({
      ...q,
      sortOrder: q.sortOrder ?? index,
      required: Boolean(q.required),
      options: (() => {
        const optionsRaw = (q as { options?: unknown }).options;
        if (Array.isArray(optionsRaw)) return optionsRaw as string[];
        if (typeof optionsRaw === "string") {
          return optionsRaw.split(",").map((v) => v.trim()).filter(Boolean);
        }
        return [];
      })(),
    })),
  });
}

export async function archiveServiceSuiteAction(suiteId: string) {
  "use server";
  await archiveServiceSuite(ORG_ID, suiteId);
}

export async function restoreServiceSuiteAction(suiteId: string) {
  "use server";
  await restoreServiceSuite(ORG_ID, suiteId);
}

export async function seedProposalFromSuiteAction(suiteId: string, formData: FormData) {
  "use server";
  const title = formData.get("title") as string | null;
  const { proposalId } = await seedProposalFromServiceSuite(ORG_ID, suiteId, { title: title ?? undefined });
  redirect(`/proposals/${proposalId}/preview`);
}
