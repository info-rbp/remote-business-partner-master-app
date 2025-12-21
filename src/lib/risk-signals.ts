import type { ProjectMilestone6, ProjectDeliverable6, ProjectUpdate6 } from '@/types/data-models';

export interface RiskSignals {
  milestoneOverdue: boolean;
  deliverableStuck: boolean;
  updateLag: boolean;
}

export function computeRiskSignals(milestones: ProjectMilestone6[], deliverables: ProjectDeliverable6[], updates: ProjectUpdate6[], now = Date.now()): RiskSignals {
  const milestoneOverdue = milestones.some((m) => m.dueDate && m.status !== 'complete' && m.dueDate.toMillis() < now);
  const deliverableStuck = deliverables.some((d) => d.status === 'changes_requested');
  const latestUpdate = updates.find((u) => u.published);
  const updateLag = latestUpdate ? latestUpdate.periodEnd.toMillis() < now - 7 * 86400000 : true;
  return { milestoneOverdue, deliverableStuck, updateLag };
}
