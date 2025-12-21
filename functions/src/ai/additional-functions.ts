/**
 * Phase 4.7-4.11: Additional AI Functions
 * Knowledge extraction, case studies, decision briefs, scheduled reports, client-facing AI
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { getAIService } from './service';
import {
  KnowledgeExtractionRequest,
  KnowledgeExtractionResponse,
  CaseStudyDraftRequest,
  CaseStudyDraftResponse,
  DecisionBriefRequest,
  DecisionBriefResponse,
  ClientEngagementSummaryResponse,
  PipelineHealthReport,
  DeliveryHealthReport,
} from './types';

const db = admin.firestore();

// ============================================================================
// Phase 4.7: Knowledge Extraction & Reuse
// ============================================================================

export const extractReusableInsights = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { orgId, projectId, debriefNotes, clientFeedback } = request.data;

  if (!orgId || !projectId) {
    throw new HttpsError('invalid-argument', 'orgId and projectId are required');
  }

  try {
    // Verify staff access
    const memberDoc = await db.collection(`orgs/${orgId}/members`).doc(request.auth.uid).get();
    if (!memberDoc.exists || !['admin', 'staff'].includes(memberDoc.data()?.role)) {
      throw new HttpsError('permission-denied', 'Staff only');
    }

    const userRole = memberDoc.data()?.role || 'staff';

    // Fetch project
    const projectDoc = await db.collection(`orgs/${orgId}/projects`).doc(projectId).get();
    if (!projectDoc.exists) {
      throw new HttpsError('not-found', 'Project not found');
    }

    const projectData = projectDoc.data();

    // Fetch proposal snapshot if available
    let proposalData = null;
    if (projectData?.sourceProposalId) {
      const proposalDoc = await db.collection(`orgs/${orgId}/proposals`).doc(projectData.sourceProposalId).get();
      proposalData = proposalDoc.data();
    }

    // Fetch deliverables
    const deliverables = projectData?.deliverables || [];

    const aiInput: Omit<KnowledgeExtractionRequest, 'executedBy' | 'executedByRole'> = {
      orgId,
      entityType: 'project',
      entityId: projectId,
      projectId,
      projectData: {
        name: projectData?.name || '',
        outcomes: projectData?.outcomes || {},
        metrics: projectData?.metrics || {},
      },
      proposalData: proposalData || undefined,
      deliverables,
      debriefNotes,
      clientFeedback,
    };

    const aiService = getAIService();
    const result = await aiService.executeAI<
      Omit<KnowledgeExtractionRequest, 'executedBy' | 'executedByRole'>,
      Omit<KnowledgeExtractionResponse, keyof import('./types').BaseAIResponse>
    >(
      'knowledge-extraction-v1',
      'knowledge-extraction-v1',
      aiInput,
      {
        orgId,
        entityType: 'project',
        entityId: projectId,
        executedBy: request.auth.uid,
        executedByRole: userRole,
        actionType: 'extract',
      }
    );

    // Store draft knowledge entry for review
    await db.collection(`orgs/${orgId}/knowledgeBase/drafts`).add({
      ...result.output.draftKnowledgeEntry,
      insights: result.output.insights,
      suggestedTags: result.output.suggestedTags,
      sourceProjectId: projectId,
      status: 'draft',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
      aiExecutionLogId: result.executionLogId,
    });

    const response: KnowledgeExtractionResponse = {
      success: true,
      executionLogId: result.executionLogId,
      validationStatus: result.validationStatus,
      warnings: result.warnings,
      ...result.output,
    };

    return response;
  } catch (error: any) {
    console.error('Error extracting insights:', error);
    throw new HttpsError('internal', error.message || 'Failed to extract insights');
  }
});

// ============================================================================
// Phase 4.8: Proof & Case Study Drafting
// ============================================================================

export const draftCaseStudy = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { orgId, projectId, clientQuotes, anonymize, targetAudience } = request.data;

  if (!orgId || !projectId) {
    throw new HttpsError('invalid-argument', 'orgId and projectId are required');
  }

  try {
    const memberDoc = await db.collection(`orgs/${orgId}/members`).doc(request.auth.uid).get();
    if (!memberDoc.exists || !['admin', 'staff'].includes(memberDoc.data()?.role)) {
      throw new HttpsError('permission-denied', 'Staff only');
    }

    const userRole = memberDoc.data()?.role || 'staff';

    const projectDoc = await db.collection(`orgs/${orgId}/projects`).doc(projectId).get();
    if (!projectDoc.exists) {
      throw new HttpsError('not-found', 'Project not found');
    }

    const projectData = projectDoc.data();

    const aiInput: Omit<CaseStudyDraftRequest, 'executedBy' | 'executedByRole'> = {
      orgId,
      entityType: 'project',
      entityId: projectId,
      projectId,
      projectOutcomes: {
        metrics: projectData?.metrics || {},
        achievements: projectData?.achievements || [],
        feedback: projectData?.clientFeedback,
      },
      clientQuotes: clientQuotes || [],
      anonymize: anonymize !== false, // Default to true
      targetAudience,
    };

    const aiService = getAIService();
    const result = await aiService.executeAI<
      Omit<CaseStudyDraftRequest, 'executedBy' | 'executedByRole'>,
      Omit<CaseStudyDraftResponse, keyof import('./types').BaseAIResponse>
    >(
      'case-study-draft-v1',
      'case-study-draft-v1',
      aiInput,
      {
        orgId,
        entityType: 'project',
        entityId: projectId,
        executedBy: request.auth.uid,
        executedByRole: userRole,
        actionType: 'generate',
      }
    );

    // Store draft for review and approval
    await db.collection(`orgs/${orgId}/caseStudies`).add({
      ...result.output.draft,
      seoSuggestions: result.output.seoSuggestions,
      sourceProjectId: projectId,
      status: 'draft',
      approvalStatus: 'pending-internal',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
      aiExecutionLogId: result.executionLogId,
    });

    const response: CaseStudyDraftResponse = {
      success: true,
      executionLogId: result.executionLogId,
      validationStatus: result.validationStatus,
      warnings: result.warnings,
      ...result.output,
    };

    return response;
  } catch (error: any) {
    console.error('Error drafting case study:', error);
    throw new HttpsError('internal', error.message || 'Failed to draft case study');
  }
});

// ============================================================================
// Phase 4.9: Decision Briefs
// ============================================================================

export const generateDecisionBrief = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { orgId, contextEntityType, contextEntityId, recentActivity, risks, financials, options } = request.data;

  if (!orgId || !contextEntityType || !contextEntityId) {
    throw new HttpsError('invalid-argument', 'orgId, contextEntityType, and contextEntityId are required');
  }

  try {
    const memberDoc = await db.collection(`orgs/${orgId}/members`).doc(request.auth.uid).get();
    if (!memberDoc.exists || !['admin', 'staff'].includes(memberDoc.data()?.role)) {
      throw new HttpsError('permission-denied', 'Staff only');
    }

    const userRole = memberDoc.data()?.role || 'staff';

    const aiInput: Omit<DecisionBriefRequest, 'executedBy' | 'executedByRole'> = {
      orgId,
      entityType: contextEntityType,
      entityId: contextEntityId,
      contextEntityType,
      contextEntityId,
      recentActivity: recentActivity || [],
      risks: risks || [],
      financials,
      options,
    };

    const aiService = getAIService();
    const result = await aiService.executeAI<
      Omit<DecisionBriefRequest, 'executedBy' | 'executedByRole'>,
      Omit<DecisionBriefResponse, keyof import('./types').BaseAIResponse>
    >(
      'decision-brief-v1',
      'decision-brief-v1',
      aiInput,
      {
        orgId,
        entityType: contextEntityType,
        entityId: contextEntityId,
        executedBy: request.auth.uid,
        executedByRole: userRole,
        actionType: 'generate',
      }
    );

    // Store decision brief
    await db.collection(`orgs/${orgId}/decisionBriefs`).add({
      ...result.output.brief,
      contextEntityType,
      contextEntityId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
      aiExecutionLogId: result.executionLogId,
      status: 'active',
    });

    const response: DecisionBriefResponse = {
      success: true,
      executionLogId: result.executionLogId,
      validationStatus: result.validationStatus,
      warnings: result.warnings,
      ...result.output,
    };

    return response;
  } catch (error: any) {
    console.error('Error generating decision brief:', error);
    throw new HttpsError('internal', error.message || 'Failed to generate decision brief');
  }
});

// ============================================================================
// Phase 4.10: AI in the Operating Rhythm
// ============================================================================

export const weeklyPipelineHealthReport = onSchedule('every sunday 00:00', async (event) => {
  console.log('Running weekly pipeline health report...');

  try {
    // Get all active orgs
    const orgsSnapshot = await db.collection('orgs').where('status', '==', 'active').get();

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;

      // Calculate pipeline metrics
      const leadsSnapshot = await db.collection(`orgs/${orgId}/leads`).get();
      const proposalsSnapshot = await db.collection(`orgs/${orgId}/proposals`).where('status', 'in', ['draft', 'sent']).get();
      const acceptedProposals = await db.collection(`orgs/${orgId}/proposals`).where('status', '==', 'accepted').get();

      const totalLeads = leadsSnapshot.size;
      const qualifiedLeads = leadsSnapshot.docs.filter(doc => doc.data().status === 'qualified').length;
      const activeProposals = proposalsSnapshot.size;
      const acceptanceRate = totalLeads > 0 ? (acceptedProposals.size / totalLeads) * 100 : 0;

      const report: PipelineHealthReport = {
        orgId,
        reportDate: admin.firestore.Timestamp.now(),
        metrics: {
          totalLeads,
          qualifiedLeads,
          activeProposals,
          acceptanceRate,
          averageDealSize: 0, // Calculate from proposals
          projectedRevenue: 0,
        },
        risks: [],
        upcomingDecisions: [],
      };

      // Store report
      await db.collection(`orgs/${orgId}/reports/pipeline`).add({
        ...report,
        type: 'weekly',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Pipeline report generated for org ${orgId}`);
    }
  } catch (error) {
    console.error('Error generating pipeline reports:', error);
  }
});

export const weeklyDeliveryHealthReport = onSchedule('every sunday 01:00', async (event) => {
  console.log('Running weekly delivery health report...');

  try {
    const orgsSnapshot = await db.collection('orgs').where('status', '==', 'active').get();

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;

      // Get active projects
      const projectsSnapshot = await db.collection(`orgs/${orgId}/projects`)
        .where('status', 'in', ['onboarding', 'active', 'delivery'])
        .get();

      let onTrack = 0;
      let atRisk = 0;
      let delayed = 0;
      const risks: any[] = [];

      for (const projectDoc of projectsSnapshot.docs) {
        const project = projectDoc.data();
        const healthStatus = project.healthStatus || 'green';

        if (healthStatus === 'green') onTrack++;
        else if (healthStatus === 'yellow') atRisk++;
        else delayed++;

        if (healthStatus !== 'green') {
          risks.push({
            projectId: projectDoc.id,
            projectName: project.name,
            riskLevel: project.riskLevel || 'medium',
            description: `Project health status: ${healthStatus}`,
          });
        }
      }

      const report: DeliveryHealthReport = {
        orgId,
        reportDate: admin.firestore.Timestamp.now(),
        activeProjects: projectsSnapshot.size,
        projectStatus: {
          onTrack,
          atRisk,
          delayed,
        },
        risks,
        upcomingMilestones: [],
      };

      await db.collection(`orgs/${orgId}/reports/delivery`).add({
        ...report,
        type: 'weekly',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Delivery report generated for org ${orgId}`);
    }
  } catch (error) {
    console.error('Error generating delivery reports:', error);
  }
});

// ============================================================================
// Phase 4.11: Client-Facing AI
// ============================================================================

export const getClientEngagementSummary = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { projectId } = request.data;

  if (!projectId) {
    throw new HttpsError('invalid-argument', 'projectId is required');
  }

  try {
    // Find project and verify client access
    const projectsQuery = await db.collectionGroup('projects').where('__name__', '==', projectId).get();
    
    if (projectsQuery.empty) {
      throw new HttpsError('not-found', 'Project not found');
    }

    const projectDoc = projectsQuery.docs[0];
    const projectData = projectDoc.data();
    const orgId = projectData.orgId;

    // Verify user is client on this project
    const memberDoc = await db.collection(`orgs/${orgId}/members`).doc(request.auth.uid).get();
    if (!memberDoc.exists) {
      throw new HttpsError('permission-denied', 'Access denied');
    }

    const memberData = memberDoc.data();
    const userRole = memberData?.role || 'client';

    if (userRole === 'client') {
      const hasAccess = projectData?.clientUsers?.includes(request.auth.uid);
      if (!hasAccess) {
        throw new HttpsError('permission-denied', 'Not authorized for this project');
      }
    }

    // Fetch safe, client-appropriate data only
    const completedMilestones = (projectData?.milestones || []).filter((m: any) => m.status === 'completed');
    const upcomingMilestones = (projectData?.milestones || []).filter((m: any) => m.status === 'pending');

    const aiService = getAIService();
    const result = await aiService.executeAI<
        any,
      ClientEngagementSummaryResponse['summary']
    >(
      'client-summary-v1',
      'client-summary-v1',
      {
        projectStatus: {
          name: projectData?.name,
          status: projectData?.status,
          progressPercentage: projectData?.progressPercentage || 0,
        },
        completedItems: completedMilestones.map((m: any) => m.name),
        upcomingItems: upcomingMilestones.map((m: any) => m.name),
        changesSinceLastReview: [],
        requiredActions: [],
      },
      {
        orgId,
        entityType: 'project',
        entityId: projectId,
        executedBy: request.auth.uid,
        executedByRole: userRole,
        actionType: 'summarize',
      }
    );

    const response: ClientEngagementSummaryResponse = {
      summary: result.output,
    };

    return response;
  } catch (error: any) {
    console.error('Error generating client summary:', error);
    throw new HttpsError('internal', error.message || 'Failed to generate summary');
  }
});
