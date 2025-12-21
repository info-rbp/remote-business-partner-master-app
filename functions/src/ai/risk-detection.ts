/**
 * Phase 4.6: Early Warning & Risk Signals
 * Proactive detection of engagement risks from behavioral signals
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getAIService } from './service';
import { EngagementRiskDetectionRequest, EngagementRiskDetectionResponse } from './types';

const db = admin.firestore();

/**
 * Detect early warning signals in project engagement
 * Staff-only for proactive risk management
 */
export const detectEngagementRisk = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { orgId, projectId } = request.data;

  if (!orgId || !projectId) {
    throw new HttpsError('invalid-argument', 'orgId and projectId are required');
  }

  try {
    // Verify access - STAFF ONLY
    const memberDoc = await db.collection(`orgs/${orgId}/members`).doc(request.auth.uid).get();
    if (!memberDoc.exists) {
      throw new HttpsError('permission-denied', 'User not member of organization');
    }

    const memberData = memberDoc.data();
    const userRole = memberData?.role || 'client';

    if (!['admin', 'staff'].includes(userRole)) {
      throw new HttpsError('permission-denied', 'Risk detection is staff-only');
    }

    // Fetch project
    const projectRef = db.collection(`orgs/${orgId}/projects`).doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      throw new HttpsError('not-found', 'Project not found');
    }

    const projectData = projectDoc.data();

    // Calculate behavioral signals
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Missed milestones
    const milestones = projectData?.milestones || [];
    const missedMilestones = milestones.filter((m: any) => {
      if (m.status !== 'completed' && m.dueDate) {
        const dueTime = m.dueDate.toMillis ? m.dueDate.toMillis() : m.dueDate;
        return dueTime < now;
      }
      return false;
    }).length;

    // Repeated revisions on deliverables
    const deliverables = projectData?.deliverables || [];
    const repeatedRevisions = deliverables.filter((d: any) => (d.revisionCount || 0) > (d.maxRevisions || 3) * 0.75).length;

    // Delayed responses (activities with long gaps)
    const recentActivities = await db
      .collection(`orgs/${orgId}/activities`)
      .where('linkedEntityId', '==', projectId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(thirtyDaysAgo))
      .orderBy('createdAt', 'desc')
      .get();

    let delayedResponseCount = 0;
    for (let i = 0; i < recentActivities.docs.length - 1; i++) {
      const current = recentActivities.docs[i].data();
      const next = recentActivities.docs[i + 1].data();
      const gap = (current.createdAt.toMillis() - next.createdAt.toMillis()) / (24 * 60 * 60 * 1000);
      if (gap > 7) { // More than 7 days between activities
        delayedResponseCount++;
      }
    }

    // Scope changes
    const changeRequests = await db
      .collection(`orgs/${orgId}/projects/${projectId}/changeRequests`)
      .where('status', 'in', ['approved', 'completed'])
      .get();
    const scopeChanges = changeRequests.size;

    // Decision velocity (average time to make decisions)
    const decisions = await db
      .collection(`orgs/${orgId}/activities`)
      .where('linkedEntityId', '==', projectId)
      .where('type', '==', 'decision')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(thirtyDaysAgo))
      .get();

    let totalDecisionTime = 0;
    decisions.forEach(doc => {
      const data = doc.data();
      if (data.decisionMadeAt && data.decisionRequestedAt) {
        const timeToDecide = (data.decisionMadeAt.toMillis() - data.decisionRequestedAt.toMillis()) / (24 * 60 * 60 * 1000);
        totalDecisionTime += timeToDecide;
      }
    });
    const avgDecisionVelocity = decisions.size > 0 ? totalDecisionTime / decisions.size : 0;

    const historicalBaseline = {
      avgMissedMilestones: 0,
      avgRevisions: 0,
      avgDecisionVelocity: 3, // Default 3 days
    };

    // Build AI input
    const aiInput: Omit<EngagementRiskDetectionRequest, 'executedBy' | 'executedByRole'> = {
      orgId,
      entityType: 'project',
      entityId: projectId,
      projectId,
      signals: {
        missedMilestones,
        repeatedRevisions,
        delayedResponses: delayedResponseCount,
        scopeChanges,
        decisionVelocity: avgDecisionVelocity,
      },
      projectContext: {
        name: projectData?.name,
        status: projectData?.status,
        startDate: projectData?.startDate,
        budget: projectData?.budget,
        teamSize: projectData?.teamMembers?.length || 0,
      },
      historicalBaseline,
    };

    // Execute AI risk detection
    const aiService = getAIService();
    const result = await aiService.executeAI<
      Omit<EngagementRiskDetectionRequest, 'executedBy' | 'executedByRole'>,
      Omit<EngagementRiskDetectionResponse, keyof import('./types').BaseAIResponse>
    >(
      'risk-detection-v1',
      'risk-detection-v1',
      aiInput,
      {
        orgId,
        entityType: 'project',
        entityId: projectId,
        executedBy: request.auth.uid,
        executedByRole: userRole,
        actionType: 'detect',
      }
    );

    // Store risk detection (staff-only)
    await db.collection(`orgs/${orgId}/projects/${projectId}/riskDetection`).add({
      ...result.output,
      signals: aiInput.signals,
      detectedAt: admin.firestore.FieldValue.serverTimestamp(),
      detectedBy: request.auth.uid,
      aiExecutionLogId: result.executionLogId,
    });

    // Update project risk level
    await projectRef.update({
      riskLevel: result.output.riskLevel,
      riskScore: result.output.riskScore,
      lastRiskDetectionAt: admin.firestore.FieldValue.serverTimestamp(),
      healthStatus: result.output.riskLevel === 'critical' || result.output.riskLevel === 'high' ? 'red' : 
                    result.output.riskLevel === 'medium' ? 'yellow' : 'green',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create high-priority alerts for critical risks
    if (result.output.riskLevel === 'critical' || result.output.riskLevel === 'high') {
      await db.collection(`orgs/${orgId}/alerts`).add({
        type: 'engagement-risk',
        severity: result.output.riskLevel,
        projectId,
        projectName: projectData?.name,
        message: `High risk detected in project: ${projectData?.name}`,
        details: result.output.detectedIssues,
        recommendedActions: result.output.recommendedMitigations,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        assignedTo: projectData?.projectManager,
        status: 'open',
      });
    }

    // Audit log
    await db.collection('auditLogs').add({
      orgId,
      eventType: 'engagement_risk_detected',
      eventDescription: `Risk detection performed on project: ${projectData?.name}`,
      actor: request.auth.uid,
      actorRole: userRole,
      targetType: 'project',
      targetId: projectId,
      targetName: projectData?.name,
      metadata: {
        riskScore: result.output.riskScore,
        riskLevel: result.output.riskLevel,
        issueCount: result.output.detectedIssues.length,
        executionLogId: result.executionLogId,
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    const response: EngagementRiskDetectionResponse = {
      success: true,
      executionLogId: result.executionLogId,
      validationStatus: result.validationStatus,
      warnings: result.warnings,
      ...result.output,
    };

    return response;

  } catch (error: any) {
    console.error('Error detecting engagement risk:', error);
    throw new HttpsError('internal', error.message || 'Failed to detect engagement risk');
  }
});
