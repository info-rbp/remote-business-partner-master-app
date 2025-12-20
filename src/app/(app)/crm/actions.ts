'use server';

import { revalidatePath } from 'next/cache';
import {
  createActivity,
  createCompany,
  createContact,
  createLead,
  createOpportunity,
  disqualifyLead,
  markActivityDone,
  qualifyLead,
  updateActivity,
  updateCompany,
  updateContact,
  updateLead,
  updateOpportunity,
} from '@/lib/crm/repo';
import { convertLeadToCrmObjects } from '@/lib/crm/workflows';
import type { ActivityStatus, ActivityType, LeadStatus, OpportunityStage } from '@/lib/crm/types';

export async function updateLeadStatus(id: string, status: LeadStatus, notes?: string) {
  if (status === 'qualified') {
    await qualifyLead(id, { notes });
  } else if (status === 'disqualified') {
    await disqualifyLead(id, notes);
  } else {
    await updateLead(id, { status });
  }
  revalidatePath('/crm/leads');
  revalidatePath(`/crm/leads/${id}`);
}

export async function updateLeadFitScore(id: string, fitScore: number) {
  await updateLead(id, { fitScore });
  revalidatePath(`/crm/leads/${id}`);
}

export async function convertLead(formData: FormData) {
  const leadId = formData.get('leadId') as string;
  const companyName = (formData.get('companyName') as string) ?? '';
  const companyAbn = formData.get('companyAbn') as string | null;
  const companyIndustry = formData.get('companyIndustry') as string | null;
  const companyWebsite = formData.get('companyWebsite') as string | null;

  const contactName = (formData.get('contactName') as string) ?? '';
  const contactEmail = (formData.get('contactEmail') as string) ?? '';
  const contactPhone = formData.get('contactPhone') as string | null;
  const contactRole = formData.get('contactRole') as string | null;

  const valueEstimate = formData.get('opportunityValue');
  const probability = formData.get('opportunityProbability');
  const stage = (formData.get('opportunityStage') as OpportunityStage | null) ?? 'discovery';
  const nextStep = formData.get('nextStep') as string | null;

  await convertLeadToCrmObjects({
    leadId,
    company: {
      name: companyName,
      abn: companyAbn ?? undefined,
      industry: companyIndustry ?? undefined,
      website: companyWebsite ?? undefined,
      address: undefined,
    },
    contact: {
      name: contactName,
      email: contactEmail,
      phone: contactPhone ?? undefined,
      role: contactRole ?? undefined,
    },
    opportunity: {
      valueEstimate: valueEstimate ? Number(valueEstimate) : undefined,
      probability: probability ? Number(probability) : undefined,
      stage,
      nextStep: nextStep ?? undefined,
    },
  });

  revalidatePath('/crm/leads');
  revalidatePath(`/crm/leads/${leadId}`);
}

export async function createCompanyAction(formData: FormData) {
  const name = (formData.get('name') as string) ?? '';
  await createCompany({ name });
  revalidatePath('/crm/companies');
}

export async function createContactAction(formData: FormData) {
  const name = (formData.get('name') as string) ?? '';
  const email = (formData.get('email') as string) ?? '';
  const companyId = (formData.get('companyId') as string) || undefined;
  await createContact({ name, email, companyId });
  revalidatePath('/crm/contacts');
}

export async function createOpportunityAction(formData: FormData) {
  const companyId = (formData.get('companyId') as string) ?? '';
  const primaryContactId = (formData.get('primaryContactId') as string) || undefined;
  const stage = (formData.get('stage') as OpportunityStage | null) ?? 'discovery';
  const valueEstimate = formData.get('valueEstimate');
  const probability = formData.get('probability');
  await createOpportunity({
    companyId,
    primaryContactId,
    stage,
    valueEstimate: valueEstimate ? Number(valueEstimate) : undefined,
    probability: probability ? Number(probability) : undefined,
  });
  revalidatePath('/crm/opportunities');
}

export async function updateOpportunityAction(id: string, patch: Partial<{ stage: OpportunityStage; nextStep: string; probability: number; valueEstimate: number }>) {
  await updateOpportunity(id, patch as any);
  revalidatePath(`/crm/opportunities/${id}`);
}

export async function createActivityAction(formData: FormData) {
  const subject = (formData.get('subject') as string) ?? '';
  const type = (formData.get('type') as ActivityType) ?? 'task';
  const linkedEntityType = formData.get('linkedEntityType') as string;
  const linkedEntityId = formData.get('linkedEntityId') as string;
  await createActivity({
    subject,
    type,
    linked: { entityType: linkedEntityType as any, entityId: linkedEntityId },
    status: 'open',
  });
  revalidatePath('/crm/activities');
}

export async function markActivityDoneAction(id: string) {
  await markActivityDone(id);
  revalidatePath('/crm/activities');
  revalidatePath(`/crm/activities/${id}`);
}
