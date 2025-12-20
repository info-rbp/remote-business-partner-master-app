import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/db';
import type { Lead, OpportunityStage } from './types';

export async function convertLeadToCrmObjects(params: {
  leadId: string;
  company: { name: string; abn?: string; industry?: string; address?: string; website?: string };
  contact: { name: string; email: string; phone?: string; role?: string };
  opportunity: {
    valueEstimate?: number;
    probability?: number;
    stage?: OpportunityStage;
    nextStep?: string;
    nextStepDueDate?: FirebaseFirestore.Timestamp;
  };
}) {
  const timestamp = Timestamp.now();

  await db.runTransaction(async (tx) => {
    const leadRef = db.collection('leads').doc(params.leadId);
    const leadSnap = await tx.get(leadRef);
    if (!leadSnap.exists) {
      throw new Error('Lead not found');
    }
    const lead = leadSnap.data() as Lead;
    if (lead.status === 'converted') {
      throw new Error('Lead already converted');
    }

    const companyRef = db.collection('companies').doc();
    const contactRef = db.collection('contacts').doc();
    const opportunityRef = db.collection('opportunities').doc();

    const companyPayload = {
      createdAt: timestamp,
      updatedAt: timestamp,
      name: params.company.name.trim() || lead.companyName || 'New Company',
      nameLower: (params.company.name.trim() || lead.companyName || 'new company').toLowerCase(),
      abn: params.company.abn,
      industry: params.company.industry,
      address: params.company.address,
      website: params.company.website,
      keyContactIds: [contactRef.id],
      maturityScore: undefined,
      notes: undefined,
    };

    const contactPayload = {
      createdAt: timestamp,
      updatedAt: timestamp,
      companyId: companyRef.id,
      name: params.contact.name || lead.name,
      nameLower: (params.contact.name || lead.name).toLowerCase(),
      email: (params.contact.email || lead.email).toLowerCase(),
      emailLower: (params.contact.email || lead.email).toLowerCase(),
      phone: params.contact.phone ?? lead.phone,
      role: params.contact.role,
      notes: lead.notes,
    };

    const opportunityPayload = {
      createdAt: timestamp,
      updatedAt: timestamp,
      companyId: companyRef.id,
      primaryContactId: contactRef.id,
      valueEstimate: params.opportunity.valueEstimate,
      probability: params.opportunity.probability,
      stage: params.opportunity.stage ?? 'discovery',
      linkedProposalId: undefined,
      nextStep: params.opportunity.nextStep,
      nextStepDueDate: params.opportunity.nextStepDueDate,
      notes: lead.notes,
    };

    tx.set(companyRef, companyPayload);
    tx.set(contactRef, contactPayload);
    tx.set(opportunityRef, opportunityPayload);
    tx.update(leadRef, {
      status: 'converted',
      updatedAt: timestamp,
      convertedCompanyId: companyRef.id,
      convertedContactId: contactRef.id,
      convertedOpportunityId: opportunityRef.id,
    });
  });
}

export async function createActivityForLeadTriage(leadId: string) {
  const dueDate = Timestamp.fromMillis(Date.now() + 1000 * 60 * 60 * 24 * 2);
  await db.collection('activities').add({
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    type: 'task',
    subject: 'Triage lead',
    status: 'open',
    dueDate,
    linked: { entityType: 'lead', entityId: leadId },
  });
}

export async function createActivityForOpportunityNextStep(
  opportunityId: string,
  nextStep?: string,
  dueDate?: FirebaseFirestore.Timestamp,
) {
  await db.collection('activities').add({
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    type: 'task',
    subject: nextStep ?? 'Opportunity next step',
    status: 'open',
    dueDate,
    linked: { entityType: 'opportunity', entityId: opportunityId },
  });
}
