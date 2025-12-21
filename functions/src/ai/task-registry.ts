/**
 * AI Task Registry
 * Defines allowed backend-only AI tasks, their purpose, schemas, and guardrails.
 * Phase 12.1 requirement: If a task isn’t registered, it cannot run.
 */

import type { AIActionType } from './types';

export interface AITaskDefinition {
  taskId: string;
  purpose: string;
  promptTemplateId: string;
  inputSchemaId: string; // for validation in prompt template
  outputSchemaId: string;
  allowedEntities: Array<'proposal' | 'project' | 'client' | 'org'>;
  sensitivityLevel: 'low' | 'medium' | 'high';
  actionType: AIActionType;
}

// Central registry of permitted tasks
const TASKS: Record<string, AITaskDefinition> = {
  proposal_sanity_check: {
    taskId: 'proposal_sanity_check',
    purpose: 'Analyze proposal for pricing/scope/timeline risks before sending',
    promptTemplateId: 'proposal-risk-analysis-v1',
    inputSchemaId: 'risk-analysis-v1',
    outputSchemaId: 'risk-analysis-v1',
    allowedEntities: ['proposal', 'org'],
    sensitivityLevel: 'medium',
    actionType: 'analyze',
  },
  engagement_summary: {
    taskId: 'engagement_summary',
    purpose: 'Summarize delivery reality into clear, structured status',
    promptTemplateId: 'engagement-summary-v1',
    inputSchemaId: 'engagement-summary-v1',
    outputSchemaId: 'engagement-summary-v1',
    allowedEntities: ['project', 'org'],
    sensitivityLevel: 'low',
    actionType: 'summarize',
  },
  decision_brief: {
    taskId: 'decision_brief',
    purpose: 'Structure a decision with options, risks, and assumptions',
    promptTemplateId: 'decision-brief-v1',
    inputSchemaId: 'decision-brief-v1',
    outputSchemaId: 'decision-brief-v1',
    allowedEntities: ['project', 'proposal', 'client', 'org'],
    sensitivityLevel: 'high',
    actionType: 'generate',
  },
  client_engagement_summary: {
    taskId: 'client_engagement_summary',
    purpose: 'Client-safe engagement status summary (sanitized)',
    promptTemplateId: 'client-summary-v1',
    inputSchemaId: 'client-summary-v1',
    outputSchemaId: 'client-summary-v1',
    allowedEntities: ['project', 'client', 'org'],
    sensitivityLevel: 'low',
    actionType: 'summarize',
  },
};

export function getTaskByPromptId(promptTemplateId: string): AITaskDefinition | null {
  const task = Object.values(TASKS).find(t => t.promptTemplateId === promptTemplateId);
  return task || null;
}

export function ensureTaskAllowed(params: {
  promptTemplateId: string;
  entityType: 'proposal' | 'project' | 'client' | 'org';
  actionType: AIActionType;
}): { allowed: boolean; reason?: string; task?: AITaskDefinition } {
  const task = getTaskByPromptId(params.promptTemplateId);
  if (!task) {
    return { allowed: false, reason: `Task for prompt ${params.promptTemplateId} is not registered` };
  }
  if (task.actionType !== params.actionType) {
    return { allowed: false, reason: `Action type mismatch: expected ${task.actionType}` };
  }
  if (!task.allowedEntities.includes(params.entityType)) {
    return { allowed: false, reason: `Entity type ${params.entityType} not allowed for task ${task.taskId}` };
  }
  return { allowed: true, task };
}
