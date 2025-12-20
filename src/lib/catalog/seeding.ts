import { db } from "@/lib/db";
import { Timestamp } from "firebase-admin/firestore";
import { getBusinessProfile, getServiceSuite } from "./repo";
import type { ServiceSuiteTemplateDoc } from "./types";

function buildPricingSummary(doc: ServiceSuiteTemplateDoc): string {
  const pricing = doc.defaultPricing;
  switch (pricing.model) {
    case "fixed":
      return `Pricing: ${pricing.currency} ${pricing.fixedPrice?.toLocaleString()} (fixed)${pricing.notes ? `\nNotes: ${pricing.notes}` : ""}`;
    case "retainer":
      return `Pricing: ${pricing.currency} ${pricing.retainerMonthly?.toLocaleString()} / month retainer${
        pricing.minimumCommitmentMonths ? ` (min ${pricing.minimumCommitmentMonths} months)` : ""
      }${pricing.notes ? `\nNotes: ${pricing.notes}` : ""}`;
    case "time_and_materials":
      return `Pricing: ${pricing.currency} ${pricing.hourlyRate?.toLocaleString()} / hour (time & materials)${
        pricing.notes ? `\nNotes: ${pricing.notes}` : ""
      }`;
    default:
      return "Pricing: TBD";
  }
}

export async function seedProposalFromServiceSuite(
  orgId: string,
  suiteId: string,
  params: { title?: string; clientId?: string } = {}
): Promise<{ proposalId: string }> {
  const suite = await getServiceSuite(orgId, suiteId);
  if (!suite) {
    throw new Error("Service suite not found");
  }
  const profile = await getBusinessProfile(orgId);
  const timestamp = Timestamp.now();
  const title = params.title ?? `${suite.suite.name} Proposal`;

  const lines: string[] = [`# ${title}`, suite.suite.description];

  if (profile?.profile.positioningCopy) {
    lines.push(`## About Us\n${profile.profile.positioningCopy}`);
  }

  if (suite.defaultDeliverables.length) {
    const deliverablesList = suite.defaultDeliverables
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((d) => `- ${d.title}${d.description ? `: ${d.description}` : ""}`)
      .join("\n");
    lines.push(`## Deliverables\n${deliverablesList}`);
  }

  if (suite.defaultMilestones.length) {
    const milestonesList = suite.defaultMilestones
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((m, idx) => {
        const duration = m.defaultDurationDays ? ` (${m.defaultDurationDays} days)` : "";
        return `${idx + 1}. ${m.title}${duration}${m.description ? ` – ${m.description}` : ""}`;
      })
      .join("\n");
    lines.push(`## Milestones\n${milestonesList}`);
  }

  const pricing = buildPricingSummary(suite);
  if (pricing) {
    lines.push(`## Commercials\n${pricing}`);
  }

  if (profile?.terms) {
    const termsSections = [
      { heading: "Payment Terms", value: profile.terms.paymentTerms },
      { heading: "Cancellation", value: profile.terms.cancellationTerms },
      { heading: "Confidentiality", value: profile.terms.confidentiality },
      { heading: "Liability", value: profile.terms.liability },
      { heading: "Warranty", value: profile.terms.warranty },
      { heading: "IP Ownership", value: profile.terms.ipOwnership },
      { heading: "General Terms", value: profile.terms.generalTerms },
    ]
      .filter((section) => Boolean(section.value))
      .map((section) => `### ${section.heading}\n${section.value}`)
      .join("\n\n");
    if (termsSections) {
      lines.push(`## Standard Terms\n${termsSections}`);
    }
  }

  const content = lines.join("\n\n");
  const proposalsRef = db.collection("orgs").doc(orgId).collection("proposals");
  const proposalRef = await proposalsRef.add({
    title,
    content,
    status: "draft",
    orgId,
    serviceSuiteId: suiteId,
    clientId: params.clientId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return { proposalId: proposalRef.id };
}

export async function seedProjectFromServiceSuite(
  orgId: string,
  suiteId: string,
  params: { name?: string; clientId?: string } = {}
): Promise<{ projectId: string }> {
  const suite = await getServiceSuite(orgId, suiteId);
  if (!suite) {
    throw new Error("Service suite not found");
  }

  const timestamp = Timestamp.now();
  const projectName = params.name ?? `${suite.suite.name} Project`;
  const projectRef = await db.collection("orgs").doc(orgId).collection("projects").add({
    name: projectName,
    orgId,
    serviceSuiteId: suiteId,
    clientId: params.clientId ?? null,
    status: "draft",
    deliverables: suite.defaultDeliverables,
    milestones: suite.defaultMilestones,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return { projectId: projectRef.id };
}
