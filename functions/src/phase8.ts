/**
 * Phase 8: Knowledge Extraction, Usage Tracking, and Health Monitoring
 * Cloud Functions for AI-assisted extraction, automated triggers, and governance
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentUpdated, onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';

const db = admin.firestore();

// Initialize Vertex AI for knowledge extraction
const vertexAI = new VertexAI({ project: process.env.GCLOUD_PROJECT, location: 'us-central1' });
const generativeModel = vertexAI.getGenerativeModel({ model: 'gemini-pro' });

// ============================================================================
// PHASE 8.4: AI-ASSISTED KNOWLEDGE EXTRACTION (Supervised)
// ============================================================================

export const extractKnowledgeCandidates = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { orgId, projectId, debriefId } = request.data;

  if (!orgId || !projectId || !debriefId) {
    throw new HttpsError('invalid-argument', 'orgId, projectId, debriefId required');
  }

  try {
    // Fetch debrief
    const debriefRef = db.doc(`orgs/${orgId}/projects/${projectId}/debriefs/${debriefId}`);
    const debriefSnap = await debriefRef.get();
    const debrief = debriefSnap.data();

    if (!debrief) {
      throw new HttpsError('not-found', 'Debrief not found');
    }

    // Fetch project for context
    const projSnap = await db.doc(`orgs/${orgId}/projects/${projectId}`).get();
    const project = projSnap.data();

    // Build prompt for AI
    const prompt = `
You are a business consultant analyzing a project debrief to extract reusable knowledge.

Project: ${project?.name || 'Unknown'}
Client: ${project?.companyName || 'Unknown'}

DEBRIEF:
- What Worked: ${debrief.whatWorked}
- What Did Not Work: ${debrief.whatDidNotWork}
- Unexpected Issues: ${debrief.unexpectedIssues || 'None noted'}
- Patterns Observed: ${debrief.patternsObserved || 'None noted'}
- Frameworks Used: ${(debrief.frameworksUsed || []).join(', ') || 'None noted'}
- Client Behaviours: ${debrief.clientBehavioursWorthNoting || 'None noted'}
- Would Do Differently: ${debrief.wouldDoDifferentlyNextTime || 'None noted'}

Extract 2-4 reusable knowledge items as JSON array. Each item must have:
{
  "title": "Clear, actionable title",
  "type": "playbook|framework|pattern|diagnostic|caution",
  "summary": "1-2 sentences explaining what this is",
  "detailedContent": {
    "whatThisIs": "detailed explanation",
    "whenToUseIt": "when this applies",
    "signals": ["signal1", "signal2"],
    "steps": ["step1", "step2"],
    "caveats": ["caveat1"]
  },
  "suggestedTags": {
    "serviceSuites": ["if applicable"],
    "industries": ["if applicable"],
    "proposalTypes": ["if applicable"]
  }
}

Return ONLY valid JSON array. No markdown, no explanations.
`;

    const resp = await generativeModel.generateContent(prompt);

    if (!resp.response.candidates || resp.response.candidates.length === 0) {
      throw new HttpsError('internal', 'No content generated from model');
    }

    let content = resp.response.candidates[0].content.parts[0].text || '';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const candidates = JSON.parse(content);

    if (!Array.isArray(candidates)) {
      throw new HttpsError('internal', 'Invalid response format from AI');
    }

    // Save candidates to review queue
    const batch = db.batch();
    const candidateIds: string[] = [];

    for (const cand of candidates) {
      const ref = db.collection(`orgs/${orgId}/knowledgeCandidates`).doc();
      batch.set(ref, {
        id: ref.id,
        orgId,
        sourceDebriefId: debriefId,
        sourceProjectId: projectId,
        title: cand.title,
        type: cand.type,
        summary: cand.summary,
        detailedContent: cand.detailedContent,
        suggestedTags: cand.suggestedTags,
        confidenceSuggestion: 'draft',
        generatedBy: 'ai',
        status: 'pending-review',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      candidateIds.push(ref.id);
    }

    // Update debrief with candidate links
    batch.update(debriefRef, {
      extractedCandidateIds: candidateIds,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return { candidateIds, count: candidates.length };
  } catch (error: unknown) {
    console.error('Error extracting knowledge:', error);
    throw new HttpsError('internal', (error as Error).message || 'Failed to extract knowledge');
  }
});

// ============================================================================
// PHASE 8.3: TRIGGER - Auto-debrief on Project Completion
// ============================================================================

export const onProjectCompleted = onDocumentUpdated('orgs/{orgId}/projects/{projectId}', async (event) => {
  const { orgId, projectId } = event.params;
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;
  if (before.status === after.status) return;
  if (after.status !== 'completed') return;

  // Check if debrief already exists
  const existing = await db.collection(`orgs/${orgId}/projects/${projectId}/debriefs`).limit(1).get();
  if (!existing.empty) return; // Debrief already submitted

  // Log a prompt in project activity: "Project completed - debrief required"
  await db.collection(`orgs/${orgId}/projects/${projectId}/activity`).add({
    actorId: 'system',
    actorRole: 'staff',
    action: 'project_completed_awaiting_debrief',
    entityType: 'project',
    entityId: projectId,
    metadata: { projectName: after.name },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// ============================================================================
// PHASE 8.7: USAGE TRACKING
// ============================================================================

// Track when knowledge is used in proposals
export const onProposalWithKnowledge = onDocumentCreated('orgs/{orgId}/proposals/{proposalId}', async (event) => {
  const { orgId } = event.params;
  const data = event.data?.data();

  if (!data) return;

  // If proposal has linkedKnowledge field, record usage
  if (data.linkedKnowledgeIds && Array.isArray(data.linkedKnowledgeIds)) {
    const batch = db.batch();
    for (const knowledgeId of data.linkedKnowledgeIds) {
      const usageRef = db.collection(`orgs/${orgId}/knowledgeUsage`).doc();
      batch.set(usageRef, {
        id: usageRef.id,
        orgId,
        knowledgeId,
        usedIn: 'proposal',
        usedInId: event.params.proposalId,
        usageType: 'reference',
        createdBy: data.createdBy,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
});

// ============================================================================
// PHASE 8.8: GUARDRAILS - Knowledge Health Monitoring
// ============================================================================

export const checkKnowledgeHealth = onSchedule({ schedule: 'every 30 days' }, async () => {
  const orgs = await db.collection('orgs').get();

  for (const orgDoc of orgs.docs) {
    const orgId = orgDoc.id;
    const knowledge = await db.collection(`orgs/${orgId}/knowledge`).where('archivedAt', '==', null).get();

    for (const kDoc of knowledge.docs) {
      const kData = kDoc.data();
      const lastUsed = kData.lastUsedAt?.toMillis?.() ?? 0;
      const now = Date.now();
      const daysSinceUsed = (now - lastUsed) / (1000 * 60 * 60 * 24);

      // Flag if unused for 90+ days
      if (lastUsed === 0 || daysSinceUsed > 90) {
        await db.collection(`orgs/${orgId}/knowledge/${kDoc.id}/healthChecks`).add({
          knowledgeId: kDoc.id,
          knowledgeTitle: kData.title,
          flaggedForReview: true,
          reason: 'unused_threshold',
          suggestedAction: 'review',
          checkRunAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Check for associated failures
      if (kData.linkedOutcomes && Array.isArray(kData.linkedOutcomes)) {
        const failures = kData.linkedOutcomes.filter((o: any) => o.outcome === 'failure').map((o: any) => o.projectId);
        if (failures.length > 0) {
          await db.collection(`orgs/${orgId}/knowledge/${kDoc.id}/healthChecks`).add({
            knowledgeId: kDoc.id,
            knowledgeTitle: kData.title,
            flaggedForReview: true,
            reason: 'associated_failures',
            associatedFailures: failures,
            suggestedAction: 'reassess',
            checkRunAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    }
  }
});

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export const onKnowledgeItemCreated = onDocumentCreated('orgs/{orgId}/knowledge/{knowledgeId}', async (event) => {
  const { orgId } = event.params;
  const data = event.data?.data();

  if (!data) return;

  await db.collection('auditLogs').add({
    orgId,
    eventType: 'knowledge_item_created',
    eventDescription: `Knowledge item created: ${data.title}`,
    actor: data.createdBy,
    actorRole: 'staff',
    targetType: 'knowledge',
    targetId: event.params.knowledgeId,
    targetName: data.title,
    metadata: { type: data.type, confidenceLevel: data.confidenceLevel },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});

export const onDebriefSubmitted = onDocumentCreated('orgs/{orgId}/projects/{projectId}/debriefs/{debriefId}', async (event) => {
  const { orgId, projectId } = event.params;
  const data = event.data?.data();

  if (!data) return;

  await db.collection('auditLogs').add({
    orgId,
    eventType: 'debrief_submitted',
    eventDescription: `Project debrief submitted: ${projectId}`,
    actor: data.submittedBy,
    actorRole: 'staff',
    targetType: 'debrief',
    targetId: event.params.debriefId,
    metadata: { projectId },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});

export const onCandidateReviewed = onDocumentUpdated('orgs/{orgId}/knowledgeCandidates/{candidateId}', async (event) => {
  const { orgId } = event.params;
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;
  if (before.status === after.status) return;

  const eventType = after.status === 'approved' ? 'candidate_approved' : 'candidate_rejected';
  const description = after.status === 'approved' ? 'Knowledge candidate approved' : 'Knowledge candidate rejected';

  await db.collection('auditLogs').add({
    orgId,
    eventType,
    eventDescription: description,
    actor: after.reviewedBy || 'unknown',
    actorRole: 'admin',
    targetType: 'knowledge_candidate',
    targetId: event.params.candidateId,
    targetName: after.title,
    metadata: { decision: after.status },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});
