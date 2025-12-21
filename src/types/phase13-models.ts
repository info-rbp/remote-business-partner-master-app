/**
 * Phase 13: Client Self-Service Intelligence
 * Client-facing, derived, read-only snapshot of project state.
 */

import type { Timestamp } from 'firebase/firestore';

export interface ClientIntelligenceSnapshot {
  id: string;
  orgId: string;
  projectId: string;
  generatedAt: Timestamp;
  generatedBy: 'system' | 'staff';
  currentStateSummary: string; // plain language
  decisionsRequired: Array<{
    decisionId: string;
    title: string;
    description: string; // client-safe
    dueBy?: Timestamp;
  }>;
  inputsRequired: Array<{
    inputId: string;
    description: string;
    linkedDeliverableId?: string;
    dueBy?: Timestamp;
  }>;
  nextSteps: string[]; // ordered, human-readable
  recentProgressSummary?: string;
  published: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
