/**
 * Phase 4.2: Proposal Draft Generation
 * Backend function to generate complete proposal drafts with full validation and logging
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getAIService } from './service';
import { ProposalGenerationRequest, ProposalGenerationResponse } from './types';

const db = admin.firestore();

/**
 * Generate a complete proposal draft from discovery answers and business context
 * Server-side only, fully auditable, schema-validated
 */
export const generateProposalDraft = onCall(async (request) => {
  // Authentication check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { orgId, proposalId, discoveryAnswers, serviceTemplateId } = request.data;

  if (!orgId || !proposalId) {
    throw new HttpsError('invalid-argument', 'orgId and proposalId are required');
  }

  try {
    // Verify user has access to org
    const memberDoc = await db.collection(`orgs/${orgId}/members`).doc(request.auth.uid).get();
    if (!memberDoc.exists) {
      throw new HttpsError('permission-denied', 'User not member of organization');
    }

    const memberData = memberDoc.data();
    const userRole = memberData?.role || 'client';

    // Only staff and admin can generate proposals
    if (!['admin', 'staff'].includes(userRole)) {
      throw new HttpsError('permission-denied', 'Only staff can generate proposals');
    }

    // Fetch proposal shell
    const proposalRef = db.collection(`orgs/${orgId}/proposals`).doc(proposalId);
    const proposalDoc = await proposalRef.get();

    if (!proposalDoc.exists) {
      throw new HttpsError('not-found', 'Proposal not found');
    }

    const proposalData = proposalDoc.data();

    // Fetch org profile for business context
    const orgDoc = await db.collection('orgs').doc(orgId).get();
    const orgData = orgDoc.data();

    // Fetch service template if provided
    let serviceTemplate = null;
    if (serviceTemplateId) {
      const templateDoc = await db.collection(`orgs/${orgId}/serviceTemplates`).doc(serviceTemplateId).get();
      serviceTemplate = templateDoc.data();
    }

    // Fetch historical successful proposals for context (optional)
    const historicalProposals = await db
      .collection(`orgs/${orgId}/proposals`)
      .where('status', '==', 'accepted')
      .orderBy('acceptedAt', 'desc')
      .limit(3)
      .get();

    const historicalReferences = historicalProposals.docs.map((doc, index) => ({
      type: 'proposal' as const,
      id: doc.id,
      relevanceScore: 1 - (index * 0.2), // Decreasing relevance
    }));

    // Build AI input
    const aiInput: Omit<ProposalGenerationRequest, 'executedBy' | 'executedByRole'> = {
      orgId,
      entityType: 'proposal',
      entityId: proposalId,
      proposalId,
      discoveryAnswers: discoveryAnswers || {},
      serviceTemplateId,
      businessProfile: {
        name: orgData?.name || orgData?.displayName || '',
        industry: orgData?.industry,
        services: serviceTemplate?.services || [],
        differentiators: orgData?.differentiators || [],
        methodology: serviceTemplate?.methodology || [],
      },
      clientProfile: {
        companyName: proposalData?.companyName || '',
        industry: proposalData?.industry,
        challenges: proposalData?.challenges || [],
        goals: proposalData?.goals || [],
      },
      historicalReferences,
    };

    // Execute AI generation
    const aiService = getAIService();
    const result = await aiService.executeAI<
      Omit<ProposalGenerationRequest, 'executedBy' | 'executedByRole'>,
      ProposalGenerationResponse['generatedSections']
    >(
      'proposal-generation-v1',
      'proposal-content-v1',
      aiInput,
      {
        orgId,
        entityType: 'proposal',
        entityId: proposalId,
        executedBy: request.auth.uid,
        executedByRole: userRole,
        actionType: 'generate',
      }
    );

    // Store generated content in proposal
    await proposalRef.update({
      ...result.output,
      aiGenerated: true,
      aiGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
      aiGeneratedBy: request.auth.uid,
      aiExecutionLogId: result.executionLogId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create audit log
    await db.collection('auditLogs').add({
      orgId,
      eventType: 'proposal_ai_generated',
      eventDescription: `AI generated proposal content: ${proposalData?.title}`,
      actor: request.auth.uid,
      actorRole: userRole,
      targetType: 'proposal',
      targetId: proposalId,
      targetName: proposalData?.title,
      metadata: {
        executionLogId: result.executionLogId,
        validationStatus: result.validationStatus,
        sectionsGenerated: Object.keys(result.output).filter(k => result.output[k as keyof typeof result.output]),
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Build response
    const response: ProposalGenerationResponse = {
      success: true,
      executionLogId: result.executionLogId,
      validationStatus: result.validationStatus,
      warnings: result.warnings,
      generatedSections: result.output,
      summary: {
        sectionsGenerated: Object.keys(result.output).filter(k => result.output[k as keyof typeof result.output]),
        qualityScore: result.validationStatus === 'passed' ? 1.0 : 0.8,
      },
    };

    return response;

  } catch (error: any) {
    console.error('Error generating proposal:', error);
    throw new HttpsError('internal', error.message || 'Failed to generate proposal');
  }
});
