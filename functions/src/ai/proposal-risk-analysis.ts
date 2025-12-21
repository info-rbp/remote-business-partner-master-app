/**
 * Phase 4.4: Proposal Risk Analysis
 * Staff-only risk assessment for proposals
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getAIService } from './service';
import { ProposalRiskAnalysisRequest, ProposalRiskAnalysisResponse } from './types';

const db = admin.firestore();

/**
 * Analyze proposal for pricing, scope, timeline, and delivery risks
 * Staff-only for internal health assessment
 */
export const analyzeProposalRisk = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { orgId, proposalId } = request.data;

  if (!orgId || !proposalId) {
    throw new HttpsError('invalid-argument', 'orgId and proposalId are required');
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
      throw new HttpsError('permission-denied', 'Risk analysis is staff-only');
    }

    // Fetch proposal
    const proposalRef = db.collection(`orgs/${orgId}/proposals`).doc(proposalId);
    const proposalDoc = await proposalRef.get();

    if (!proposalDoc.exists) {
      throw new HttpsError('not-found', 'Proposal not found');
    }

    const proposalData = proposalDoc.data();

    // Fetch historical proposals for baseline
    const historicalProposals = await db
      .collection(`orgs/${orgId}/proposals`)
      .where('status', 'in', ['accepted', 'converted'])
      .orderBy('acceptedAt', 'desc')
      .limit(10)
      .get();

    const historicalData = historicalProposals.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        outcome: data.status,
        metrics: {
          totalAmount: data.pricing?.totalAmount,
          duration: data.timeline?.estimatedDuration,
          deliverableCount: data.deliverables?.length || 0,
          milestoneCount: data.timeline?.milestones?.length || 0,
        },
      };
    });

    // Build AI input
    const aiInput: Omit<ProposalRiskAnalysisRequest, 'executedBy' | 'executedByRole'> = {
      orgId,
      entityType: 'proposal',
      entityId: proposalId,
      proposalId,
      proposalData: {
        pricing: proposalData?.pricing,
        scope: proposalData?.scope,
        timeline: proposalData?.timeline,
        deliverables: proposalData?.deliverables,
      },
      historicalProposals: historicalData,
    };

    // Execute AI risk analysis
    const aiService = getAIService();
    const result = await aiService.executeAI<
      Omit<ProposalRiskAnalysisRequest, 'executedBy' | 'executedByRole'>,
      Omit<ProposalRiskAnalysisResponse, keyof import('./types').BaseAIResponse>
    >(
      'proposal-risk-analysis-v1',
      'risk-analysis-v1',
      aiInput,
      {
        orgId,
        entityType: 'proposal',
        entityId: proposalId,
        executedBy: request.auth.uid,
        executedByRole: userRole,
        actionType: 'analyze',
      }
    );

    // Store risk analysis (staff-only collection)
    await db.collection(`orgs/${orgId}/proposals/${proposalId}/riskAnalysis`).add({
      ...result.output,
      analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
      analyzedBy: request.auth.uid,
      aiExecutionLogId: result.executionLogId,
      validationStatus: result.validationStatus,
    });

    // Update proposal with risk score
    await proposalRef.update({
      riskScore: result.output.overallRiskScore,
      riskLevel: result.output.overallRiskScore > 70 ? 'high' : result.output.overallRiskScore > 40 ? 'medium' : 'low',
      lastRiskAnalysisAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create audit log
    await db.collection('auditLogs').add({
      orgId,
      eventType: 'proposal_risk_analyzed',
      eventDescription: `Risk analysis performed on proposal: ${proposalData?.title}`,
      actor: request.auth.uid,
      actorRole: userRole,
      targetType: 'proposal',
      targetId: proposalId,
      targetName: proposalData?.title,
      metadata: {
        riskScore: result.output.overallRiskScore,
        riskFlagCount: result.output.riskFlags.length,
        executionLogId: result.executionLogId,
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    const response: ProposalRiskAnalysisResponse = {
      success: true,
      executionLogId: result.executionLogId,
      validationStatus: result.validationStatus,
      warnings: result.warnings,
      ...result.output,
    };

    return response;

  } catch (error: any) {
    console.error('Error analyzing proposal risk:', error);
    throw new HttpsError('internal', error.message || 'Failed to analyze proposal risk');
  }
});
