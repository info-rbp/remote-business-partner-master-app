/**
 * Phase 4.3: Section-Level Regeneration
 * Non-destructive section regeneration with locked section preservation
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getAIService } from './service';
import { SectionRegenerationRequest, SectionRegenerationResponse } from './types';

const db = admin.firestore();

/**
 * Regenerate a specific section of a proposal without modifying locked sections
 */
export const regenerateProposalSection = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { orgId, proposalId, sectionKey, instructions, lockedSections } = request.data;

  if (!orgId || !proposalId || !sectionKey) {
    throw new HttpsError('invalid-argument', 'orgId, proposalId, and sectionKey are required');
  }

  try {
    // Verify access
    const memberDoc = await db.collection(`orgs/${orgId}/members`).doc(request.auth.uid).get();
    if (!memberDoc.exists) {
      throw new HttpsError('permission-denied', 'User not member of organization');
    }

    const memberData = memberDoc.data();
    const userRole = memberData?.role || 'client';

    if (!['admin', 'staff'].includes(userRole)) {
      throw new HttpsError('permission-denied', 'Only staff can regenerate sections');
    }

    // Fetch proposal
    const proposalRef = db.collection(`orgs/${orgId}/proposals`).doc(proposalId);
    const proposalDoc = await proposalRef.get();

    if (!proposalDoc.exists) {
      throw new HttpsError('not-found', 'Proposal not found');
    }

    const proposalData = proposalDoc.data();

    // Verify section exists
    if (!proposalData?.[sectionKey]) {
      throw new HttpsError('not-found', `Section ${sectionKey} not found in proposal`);
    }

    // Verify section is not locked
    const locked = lockedSections || proposalData?.lockedSections || [];
    if (locked.includes(sectionKey)) {
      throw new HttpsError('failed-precondition', `Section ${sectionKey} is locked and cannot be regenerated`);
    }

    // Build AI input
    const aiInput: Omit<SectionRegenerationRequest, 'executedBy' | 'executedByRole'> = {
      orgId,
      entityType: 'proposal',
      entityId: proposalId,
      proposalId,
      sectionKey,
      currentContent: proposalData[sectionKey],
      instructions,
      fullProposalContext: proposalData,
      lockedSections: locked,
    };

    // Execute AI regeneration
    const aiService = getAIService();
    const result = await aiService.executeAI<
      Omit<SectionRegenerationRequest, 'executedBy' | 'executedByRole'>,
      { sectionContent: any }
    >(
      'section-regeneration-v1',
      'proposal-content-v1',
      aiInput,
      {
        orgId,
        entityType: 'proposal',
        entityId: proposalId,
        executedBy: request.auth.uid,
        executedByRole: userRole,
        actionType: 'regenerate',
      }
    );

    // Store previous version for audit
    const previousVersionRef = await db.collection(`orgs/${orgId}/proposals/${proposalId}/versions`).add({
      sectionKey,
      content: proposalData[sectionKey],
      replacedAt: admin.firestore.FieldValue.serverTimestamp(),
      replacedBy: request.auth.uid,
      aiExecutionLogId: result.executionLogId,
    });

    // Update proposal with new section content (non-destructive)
    const updateData: any = {
      [sectionKey]: result.output.sectionContent,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
      lastAIRegenerationLogId: result.executionLogId,
    };

    await proposalRef.update(updateData);

    // Create audit log
    await db.collection('auditLogs').add({
      orgId,
      eventType: 'proposal_section_regenerated',
      eventDescription: `Regenerated section '${sectionKey}' in proposal: ${proposalData?.title}`,
      actor: request.auth.uid,
      actorRole: userRole,
      targetType: 'proposal',
      targetId: proposalId,
      targetName: proposalData?.title,
      metadata: {
        sectionKey,
        instructions,
        executionLogId: result.executionLogId,
        previousVersionRef: previousVersionRef.id,
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    const response: SectionRegenerationResponse = {
      success: true,
      executionLogId: result.executionLogId,
      validationStatus: result.validationStatus,
      warnings: result.warnings,
      sectionKey,
      newContent: result.output.sectionContent,
      changesSummary: `Section '${sectionKey}' regenerated successfully`,
      preservedFields: locked,
    };

    return response;

  } catch (error: any) {
    console.error('Error regenerating section:', error);
    throw new HttpsError('internal', error.message || 'Failed to regenerate section');
  }
});
