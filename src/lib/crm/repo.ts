import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/db';
import type {
  Activity,
  ActivityStatus,
  ActivityType,
  Company,
  Contact,
  Lead,
  LeadStatus,
  LeadSource,
  Opportunity,
  OpportunityStage,
} from './types';

const now = () => Timestamp.now();

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? '';
}

function ensureId<T>(doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
  return { id: doc.id, ...(doc.data() as T) };
}

// ------------ Leads ------------
type CreateLeadInput = {
  source: LeadSource;
  serviceInterest: string[];
  urgency: 1 | 2 | 3 | 4 | 5;
  fitScore?: number;
  status?: LeadStatus;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  notes?: string;
};

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const timestamp = now();
  const payload: Omit<Lead, 'id'> & { nameLower: string; emailLower: string } = {
    createdAt: timestamp,
    updatedAt: timestamp,
    source: input.source,
    serviceInterest: input.serviceInterest ?? [],
    urgency: input.urgency,
    fitScore: input.fitScore,
    status: input.status ?? 'new',
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    phone: input.phone?.trim(),
    companyName: input.companyName?.trim(),
    notes: input.notes,
    convertedCompanyId: undefined,
    convertedContactId: undefined,
    convertedOpportunityId: undefined,
    nameLower: input.name.trim().toLowerCase(),
    emailLower: normalizeEmail(input.email),
  };

  const ref = await db.collection('leads').add(payload);
  return { id: ref.id, ...payload };
}

export async function getLead(id: string): Promise<Lead | null> {
  const snap = await db.collection('leads').doc(id).get();
  return snap.exists ? (ensureId<Lead>(snap) as Lead) : null;
}

export async function listLeads(params: { status?: LeadStatus; limit?: number; search?: string } = {}): Promise<Lead[]> {
  const { status, limit = 50, search } = params;
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('leads');

  if (status) {
    query = query.where('status', '==', status);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    query = query
      .where('nameLower', '>=', searchLower)
      .where('nameLower', '<', `${searchLower}\uf8ff`)
      .orderBy('nameLower');
  } else {
    query = query.orderBy('createdAt', 'desc');
  }

  const snap = await query.limit(limit).get();
  return snap.docs.map((doc) => ensureId<Lead>(doc) as Lead);
}

export async function updateLead(id: string, patch: Partial<Lead>) {
  await db.collection('leads').doc(id).update({ ...patch, updatedAt: now() });
}

export async function qualifyLead(id: string, patch?: Partial<Pick<Lead, 'fitScore' | 'notes'>>) {
  const update: Partial<Lead> & { status: LeadStatus } = { status: 'qualified', updatedAt: now() };
  if (patch?.fitScore !== undefined) update.fitScore = patch.fitScore;
  if (patch?.notes) update.notes = patch.notes;
  await db.collection('leads').doc(id).update(update);
}

export async function disqualifyLead(id: string, reason?: string) {
  const update: Partial<Lead> & { status: LeadStatus } = {
    status: 'disqualified',
    updatedAt: now(),
  };
  if (reason) {
    update.notes = reason;
  }
  await db.collection('leads').doc(id).update(update);
}

// ------------ Companies ------------
type CreateCompanyInput = {
  name: string;
  abn?: string;
  industry?: string;
  address?: string;
  website?: string;
  keyContactIds?: string[];
  maturityScore?: number;
  notes?: string;
};

export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const timestamp = now();
  const payload: Omit<Company, 'id'> & { nameLower: string } = {
    createdAt: timestamp,
    updatedAt: timestamp,
    name: input.name.trim(),
    abn: input.abn,
    industry: input.industry,
    address: input.address,
    website: input.website,
    keyContactIds: input.keyContactIds ?? [],
    maturityScore: input.maturityScore,
    notes: input.notes,
    nameLower: input.name.trim().toLowerCase(),
  };
  const ref = await db.collection('companies').add(payload);
  return { id: ref.id, ...payload };
}

export async function getCompany(id: string): Promise<Company | null> {
  const snap = await db.collection('companies').doc(id).get();
  return snap.exists ? (ensureId<Company>(snap) as Company) : null;
}

export async function listCompanies(params: { limit?: number; search?: string } = {}): Promise<Company[]> {
  const { limit = 50, search } = params;
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('companies');

  if (search) {
    const searchLower = search.toLowerCase();
    query = query
      .where('nameLower', '>=', searchLower)
      .where('nameLower', '<', `${searchLower}\uf8ff`)
      .orderBy('nameLower');
  } else {
    query = query.orderBy('createdAt', 'desc');
  }

  const snap = await query.limit(limit).get();
  return snap.docs.map((doc) => ensureId<Company>(doc) as Company);
}

export async function updateCompany(id: string, patch: Partial<Company>) {
  await db.collection('companies').doc(id).update({ ...patch, updatedAt: now() });
}

// ------------ Contacts ------------
type CreateContactInput = {
  companyId?: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  notes?: string;
};

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const timestamp = now();
  const payload: Omit<Contact, 'id'> & { nameLower: string; emailLower: string } = {
    createdAt: timestamp,
    updatedAt: timestamp,
    companyId: input.companyId,
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    phone: input.phone?.trim(),
    role: input.role,
    notes: input.notes,
    nameLower: input.name.trim().toLowerCase(),
    emailLower: normalizeEmail(input.email),
  };
  const ref = await db.collection('contacts').add(payload);
  return { id: ref.id, ...payload };
}

export async function getContact(id: string): Promise<Contact | null> {
  const snap = await db.collection('contacts').doc(id).get();
  return snap.exists ? (ensureId<Contact>(snap) as Contact) : null;
}

export async function listContacts(params: { companyId?: string; limit?: number; search?: string } = {}): Promise<Contact[]> {
  const { companyId, limit = 50, search } = params;
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('contacts');

  if (companyId) {
    query = query.where('companyId', '==', companyId);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    query = query
      .where('nameLower', '>=', searchLower)
      .where('nameLower', '<', `${searchLower}\uf8ff`)
      .orderBy('nameLower');
  } else {
    query = query.orderBy('createdAt', 'desc');
  }

  const snap = await query.limit(limit).get();
  return snap.docs.map((doc) => ensureId<Contact>(doc) as Contact);
}

export async function updateContact(id: string, patch: Partial<Contact>) {
  await db.collection('contacts').doc(id).update({ ...patch, updatedAt: now() });
}

// ------------ Opportunities ------------
type CreateOpportunityInput = {
  companyId: string;
  primaryContactId?: string;
  valueEstimate?: number;
  probability?: number;
  stage?: OpportunityStage;
  linkedProposalId?: string;
  nextStep?: string;
  nextStepDueDate?: FirebaseFirestore.Timestamp;
  notes?: string;
};

export async function createOpportunity(input: CreateOpportunityInput): Promise<Opportunity> {
  const timestamp = now();
  const payload: Omit<Opportunity, 'id'> = {
    createdAt: timestamp,
    updatedAt: timestamp,
    companyId: input.companyId,
    primaryContactId: input.primaryContactId,
    valueEstimate: input.valueEstimate,
    probability: input.probability,
    stage: input.stage ?? 'discovery',
    linkedProposalId: input.linkedProposalId,
    nextStep: input.nextStep,
    nextStepDueDate: input.nextStepDueDate,
    notes: input.notes,
  };
  const ref = await db.collection('opportunities').add(payload);
  return { id: ref.id, ...payload };
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const snap = await db.collection('opportunities').doc(id).get();
  return snap.exists ? (ensureId<Opportunity>(snap) as Opportunity) : null;
}

export async function listOpportunities(params: { stage?: OpportunityStage; companyId?: string; limit?: number } = {}): Promise<Opportunity[]> {
  const { stage, companyId, limit = 50 } = params;
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('opportunities');

  if (stage) {
    query = query.where('stage', '==', stage);
  }

  if (companyId) {
    query = query.where('companyId', '==', companyId);
  }

  query = query.orderBy('updatedAt', 'desc');

  const snap = await query.limit(limit).get();
  return snap.docs.map((doc) => ensureId<Opportunity>(doc) as Opportunity);
}

export async function updateOpportunity(id: string, patch: Partial<Opportunity>) {
  await db.collection('opportunities').doc(id).update({ ...patch, updatedAt: now() });
}

// ------------ Activities ------------
type CreateActivityInput = {
  type: ActivityType;
  subject: string;
  notes?: string;
  dueDate?: FirebaseFirestore.Timestamp;
  owner?: string;
  status?: ActivityStatus;
  linked: Activity['linked'];
};

export async function createActivity(input: CreateActivityInput): Promise<Activity> {
  const timestamp = now();
  const payload: Omit<Activity, 'id'> = {
    createdAt: timestamp,
    updatedAt: timestamp,
    type: input.type,
    subject: input.subject,
    notes: input.notes,
    dueDate: input.dueDate,
    owner: input.owner,
    status: input.status ?? 'open',
    linked: input.linked,
  };
  const ref = await db.collection('activities').add(payload);
  return { id: ref.id, ...payload };
}

export async function getActivity(id: string): Promise<Activity | null> {
  const snap = await db.collection('activities').doc(id).get();
  return snap.exists ? (ensureId<Activity>(snap) as Activity) : null;
}

export async function listActivities(params: {
  entityType?: Activity['linked']['entityType'];
  entityId?: string;
  status?: ActivityStatus;
  dueBefore?: FirebaseFirestore.Timestamp;
  limit?: number;
} = {}): Promise<Activity[]> {
  const { entityType, entityId, status, dueBefore, limit = 50 } = params;
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('activities');

  if (entityType) {
    query = query.where('linked.entityType', '==', entityType);
  }
  if (entityId) {
    query = query.where('linked.entityId', '==', entityId);
  }
  if (status) {
    query = query.where('status', '==', status);
  }
  if (dueBefore) {
    query = query.where('dueDate', '<=', dueBefore);
  }

  query = query.orderBy('dueDate', 'asc').orderBy('createdAt', 'desc');

  const snap = await query.limit(limit).get();
  return snap.docs.map((doc) => ensureId<Activity>(doc) as Activity);
}

export async function updateActivity(id: string, patch: Partial<Activity>) {
  await db.collection('activities').doc(id).update({ ...patch, updatedAt: now() });
}

export async function markActivityDone(id: string) {
  await db.collection('activities').doc(id).update({ status: 'done', updatedAt: now() });
}
