/**
 * AI Governance Settings (Phase 12.7)
 * Org-level controls: per-task enable/disable and sensitivity levels.
 */

import * as admin from 'firebase-admin';

export interface AIGovernanceSettings {
  enabled: boolean;
  sensitivityLevel: 'low' | 'medium' | 'high';
  enabledTasks?: string[]; // taskIds allowed
  disabledTasks?: string[]; // taskIds blocked
  requireAcknowledgement?: boolean; // outputs must be reviewed
}

const DEFAULT_SETTINGS: AIGovernanceSettings = {
  enabled: true,
  sensitivityLevel: 'medium',
  enabledTasks: [],
  disabledTasks: [],
  requireAcknowledgement: true,
};

export async function getGovernanceSettings(orgId: string): Promise<AIGovernanceSettings> {
  const db = admin.firestore();
  const doc = await db.doc(`orgs/${orgId}/settings/ai`).get();
  if (!doc.exists) return DEFAULT_SETTINGS;
  const data = doc.data() as Partial<AIGovernanceSettings>;
  return { ...DEFAULT_SETTINGS, ...(data || {}) };
}

export function isTaskEnabled(taskId: string, settings: AIGovernanceSettings): boolean {
  if (!settings.enabled) return false;
  if (settings.disabledTasks && settings.disabledTasks.includes(taskId)) return false;
  if (settings.enabledTasks && settings.enabledTasks.length > 0) {
    return settings.enabledTasks.includes(taskId);
  }
  return true; // default allow unless explicitly disabled
}
