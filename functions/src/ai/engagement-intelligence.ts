/**
 * Phase 4.5: Engagement Intelligence
 * Generate comprehensive project status summaries
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getAIService } from './service';
import { EngagementSummaryRequest, EngagementSummaryResponse } from './types';

const db = admin.firestore();

/**
 * Generate instant engagement summary for project status awareness
 */
export const generateEngagementSummary = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { orgId, projectId } = request.data;

  if (!orgId || !projectId) {
    throw new HttpsError('invalid-argument', 'orgId and projectId are required');
  }

  try {
    // Verify access
    const memberDoc = await db.collection(`orgs/${orgId}/members`).doc(request.auth.uid).get();
    if (!memberDoc.exists) {
      throw new HttpsError('permission-denied', 'User not member of organization');
    }

    const memberData = memberDoc.data();
    const userRole = memberData?.role || 'client';

    // Fetch project
    const projectRef = db.collection(`orgs/${orgId}/projects`).doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      throw new HttpsError('not-found', 'Project not found');
    }

    const projectData = projectDoc.data();

    // Verify user has access to project
    if (userRole === 'client') {
      const hasAccess = projectData?.clientUsers?.includes(request.auth.uid);
      if (!hasAccess) {
        throw new HttpsError('permission-denied', 'No access to this project');
      }
    }

    // Fetch recent updates
    const recentUpdates = await db
      .collection(`orgs/${orgId}/projects/${projectId}/updates`)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    // Fetch risks
    const recentRisks = await db
      .collection(`orgs/${orgId}/projects/${projectId}/risks`)
      .where('status', '==', 'open')
      .orderBy('severity', 'desc')
      .limit(5)
      .get();

    // Fetch change requests
    const changeRequests = await db
      .collection(`orgs/${orgId}/projects/${projectId}/changeRequests`)
      .where('status', 'in', ['pending', 'approved'])
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    // Fetch client interactions (activities)
    const clientInteractions = await db
      .collection(`orgs/${orgId}/activities`)
      .where('linkedEntityId', '==', projectId)
      .where('type', 'in', ['meeting', 'email', 'call'])
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    // Build AI input
    const aiInput: Omit<EngagementSummaryRequest, 'executedBy' | 'executedByRole'> = {
      orgId,
      entityType: 'project',
      entityId: projectId,
      projectId,
      projectData: {
        name: projectData?.name || '',
        status: projectData?.status || '',
        startDate: projectData?.startDate,
        endDate: projectData?.endDate,
        milestones: projectData?.milestones || [],
        deliverables: projectData?.deliverables || [],
      },
      recentUpdates: recentUpdates.docs.map(doc => doc.data()),
      recentRisks: recentRisks.docs.map(doc => doc.data()),
      changeRequests: changeRequests.docs.map(doc => doc.data()),
      clientInteractions: clientInteractions.docs.map(doc => doc.data()),
    };

    // Execute AI summary generation
    const aiService = getAIService();
    const result = await aiService.executeAI<
      Omit<EngagementSummaryRequest, 'executedBy' | 'executedByRole'>,
      EngagementSummaryResponse['summary']
    >(
      'engagement-summary-v1',
      'engagement-summary-v1',
      aiInput,
      {
        orgId,
        entityType: 'project',
        entityId: projectId,
        executedBy: request.auth.uid,
        executedByRole: userRole,
        actionType: 'summarize',
      }
    );

    // Store summary for quick access
    await db.collection(`orgs/${orgId}/projects/${projectId}/summaries`).add({
      ...result.output,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedBy: request.auth.uid,
      aiExecutionLogId: result.executionLogId,
      validFor: 'dashboard',
    });

    // Update project last summary timestamp
    await projectRef.update({
      lastSummaryAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSummaryStatus: result.output.progressVsPlan?.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const response: EngagementSummaryResponse = {
      success: true,
      executionLogId: result.executionLogId,
      validationStatus: result.validationStatus,
      warnings: result.warnings,
      summary: result.output,
    };

    return response;

  } catch (error: any) {
    console.error('Error generating engagement summary:', error);
    throw new HttpsError('internal', error.message || 'Failed to generate engagement summary');
  }
});
