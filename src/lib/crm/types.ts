import type { Timestamp } from 'firebase-admin/firestore';

export type LeadStatus = 'new' | 'qualified' | 'disqualified' | 'converted';
export type LeadSource = 'website' | 'contact' | 'referral' | 'other';

export type Lead = {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  source: LeadSource;
  serviceInterest: string[];
  urgency: 1 | 2 | 3 | 4 | 5;
  fitScore?: number;
  status: LeadStatus;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  notes?: string;
  convertedCompanyId?: string;
  convertedContactId?: string;
  convertedOpportunityId?: string;
};

export type Company = {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  name: string;
  abn?: string;
  industry?: string;
  address?: string;
  website?: string;
  keyContactIds: string[];
  maturityScore?: number;
  notes?: string;
};

export type Contact = {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  companyId?: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  notes?: string;
};

export type OpportunityStage = 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost';

export type Opportunity = {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  companyId: string;
  primaryContactId?: string;
  valueEstimate?: number;
  probability?: number;
  stage: OpportunityStage;
  linkedProposalId?: string;
  nextStep?: string;
  nextStepDueDate?: Timestamp;
  notes?: string;
};

export type ActivityType = 'call' | 'email' | 'meeting' | 'task';
export type ActivityStatus = 'open' | 'done' | 'cancelled';

export type Activity = {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  type: ActivityType;
  subject: string;
  notes?: string;
  dueDate?: Timestamp;
  owner?: string;
  status: ActivityStatus;
  linked: {
    entityType: 'lead' | 'company' | 'contact' | 'opportunity' | 'client' | 'project';
    entityId: string;
  };
};
