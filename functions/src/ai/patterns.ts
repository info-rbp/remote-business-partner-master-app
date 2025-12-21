/**
 * Phase 12.6: Pattern Detection Across Clients & Projects
 * Monthly scheduled job to identify cross-project patterns and save as draft insights.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const identifyCrossProjectPatterns = onSchedule('0 8 1 * *', async () => {
  const orgs = await db.collection('orgs').where('status','==','active').get();
  for (const org of orgs.docs) {
    const orgId = org.id;
    const projectsSnap = await db.collection(`orgs/${orgId}/projects`).where('status','==','completed').get();

    const patterns: Array<{ description: string; indicators: string[]; examples: string[]; confidenceLevel: 'low'|'medium'|'high' }> = [];

    // Heuristic aggregation
    let weakMargins: string[] = [];
    let scopeCreepProjects: string[] = [];
    let repeatedRisks: Record<string,string[]> = {};

    for (const p of projectsSnap.docs) {
      const projectId = p.id;
      const financialsSnap = await db.collection(`orgs/${orgId}/projects/${projectId}/financials`).limit(1).get();
      const financial = financialsSnap.docs[0]?.data() || {};

      if ((financial.estimatedMarginPercent || 0) < 20) {
        weakMargins.push(projectId);
      }

      if ((financial.additionalScopeValue || 0) > (financial.quotedValue || 1) * 0.3) {
        scopeCreepProjects.push(projectId);
      }

      const risksSnap = await db.collection(`orgs/${orgId}/projects/${projectId}/risks`).get();
      risksSnap.docs.forEach(r => {
        const cat = r.data().category || 'general';
        if (!repeatedRisks[cat]) repeatedRisks[cat] = [];
        repeatedRisks[cat].push(projectId);
      });
    }

    if (weakMargins.length >= Math.max(2, Math.floor(projectsSnap.size * 0.2))) {
      patterns.push({
        description: 'Consistently weak margins across completed projects',
        indicators: ['estimatedMarginPercent < 20%'],
        examples: weakMargins.slice(0,10),
        confidenceLevel: 'medium',
      });
    }

    if (scopeCreepProjects.length >= Math.max(2, Math.floor(projectsSnap.size * 0.2))) {
      patterns.push({
        description: 'Scope creep exceeding 30% of quoted value',
        indicators: ['additionalScopeValue > 30% of quotedValue'],
        examples: scopeCreepProjects.slice(0,10),
        confidenceLevel: 'medium',
      });
    }

    Object.entries(repeatedRisks).forEach(([cat, ids]) => {
      if (ids.length >= Math.max(3, Math.floor(projectsSnap.size * 0.25))) {
        patterns.push({
          description: `Repeated risk theme: ${cat}`,
          indicators: [`risk category ${cat}`],
          examples: ids.slice(0,10),
          confidenceLevel: 'low',
        });
      }
    });

    for (const pat of patterns) {
      const ref = db.collection(`orgs/${orgId}/commercialPatterns`).doc();
      await ref.set({
        id: ref.id,
        ...pat,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'system',
        status: 'draft',
      });
    }

    console.log(`Patterns saved for org ${orgId}: ${patterns.length}`);
  }
});
