
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";
import { bootstrapOrg, getIdentity } from "./org";

// Set the region for all functions in this file
setGlobalOptions({ region: "us-central1" });

admin.initializeApp();

const db = admin.firestore();

// Initialize Vertex AI
const vertexAI = new VertexAI({ project: process.env.GCLOUD_PROJECT, location: "us-central1" });

const generativeModel = vertexAI.getGenerativeModel({
    model: "gemini-pro",
});

export const generateProposal = onCall(async (request) => {
  if (request.app == undefined) {
    throw new HttpsError(
      "failed-precondition",
      "The function must be called from an App Check verified app."
    );
  }

  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called by an authenticated user."
    );
  }

  const orgId = (request.auth.token as { orgId?: string }).orgId;
  if (!orgId) {
    throw new HttpsError("permission-denied", "No organization associated with this user.");
  }

  const { prompt } = request.data;

  if (!prompt || typeof prompt !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a string 'prompt' argument."
    );
  }

  const resp = await generativeModel.generateContent(prompt);

  if (!resp.response.candidates || resp.response.candidates.length === 0) {
    throw new HttpsError("internal", "No content generated from model.");
  }

  const proposalContent = resp.response.candidates[0].content.parts[0].text;

  if (!proposalContent) {
    throw new HttpsError("internal", "Failed to extract text from generated content.");
  }

  const proposal = {
    content: proposalContent,
    createdBy: request.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    orgId,
    status: "draft",
  };

  const newProposalRef = await db
    .collection("orgs")
    .doc(orgId)
    .collection("proposals")
    .add(proposal);

  return { proposalId: newProposalRef.id };
});

export const weeklySummary = onSchedule({ schedule: "every sunday 00:00" }, (event) => {
  console.log("Weekly summary placeholder triggered.", { event });
});

export const monthlyReview = onSchedule({ schedule: "0 0 1 * *" }, (event) => {
  console.log("Monthly review placeholder triggered.", { event });
});

export const staleLeadNudge = onSchedule({ schedule: "every 24 hours" }, (event) => {
  console.log("Stale lead nudge placeholder triggered.", { event });
});

export { bootstrapOrg, getIdentity };

// ============================================================================
// AUDIT LOGGING FUNCTIONS
// ============================================================================

interface AuditLogEntry {
  orgId: string;
  eventType: string;
  eventDescription: string;
  actor: string;
  actorEmail?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  changes?: Record<string, { before?: unknown; after?: unknown }>;
  metadata?: Record<string, unknown>;
  timestamp: admin.firestore.FieldValue;
}

async function createAuditLog(log: AuditLogEntry) {
  try {
    await db.collection('auditLogs').add(log);
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// User lifecycle events
export const onUserCreated = onDocumentCreated("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const userData = event.data?.data();

  if (!userData) return;

  await createAuditLog({
    orgId: userData.orgId || 'system',
    eventType: 'user_created',
    eventDescription: `User account created: ${userData.email}`,
    actor: userId,
    actorEmail: userData.email,
    targetType: 'user',
    targetId: userId,
    metadata: { email: userData.email, emailVerified: userData.emailVerified },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// Org lifecycle events
export const onOrgCreated = onDocumentCreated("orgs/{orgId}", async (event) => {
  const orgId = event.params.orgId;
  const orgData = event.data?.data();

  if (!orgData) return;

  await createAuditLog({
    orgId,
    eventType: 'org_created',
    eventDescription: `Organization created: ${orgData.name}`,
    actor: orgData.createdBy,
    targetType: 'org',
    targetId: orgId,
    targetName: orgData.name,
    metadata: { domain: orgData.domain, industry: orgData.industry },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// Member events
export const onMemberInvited = onDocumentCreated("orgs/{orgId}/members/{userId}", async (event) => {
  const { orgId, userId } = event.params;
  const memberData = event.data?.data();

  if (!memberData) return;

  await createAuditLog({
    orgId,
    eventType: 'member_invited',
    eventDescription: `Member invited: ${memberData.email} as ${memberData.role}`,
    actor: memberData.invitedBy,
    targetType: 'member',
    targetId: userId,
    targetName: memberData.displayName || memberData.email,
    metadata: { role: memberData.role, email: memberData.email, clientId: memberData.clientId },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});

export const onMemberRoleChanged = onDocumentUpdated("orgs/{orgId}/members/{userId}", async (event) => {
  const { orgId, userId } = event.params;
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) return;
  if (beforeData.role === afterData.role) return;

  await createAuditLog({
    orgId,
    eventType: 'member_role_changed',
    eventDescription: `Member role changed: ${afterData.email} from ${beforeData.role} to ${afterData.role}`,
    actor: 'system', // Would need to pass from request context
    targetType: 'member',
    targetId: userId,
    targetName: afterData.displayName || afterData.email,
    changes: {
      role: { before: beforeData.role, after: afterData.role },
    },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// Proposal events
export const onProposalStatusChanged = onDocumentUpdated("orgs/{orgId}/proposals/{proposalId}", async (event) => {
  const { orgId, proposalId } = event.params;
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) return;
  if (beforeData.status === afterData.status) return;

  const eventDescriptions: Record<string, string> = {
    sent: 'Proposal sent to client',
    accepted: 'Proposal accepted by client',
    declined: 'Proposal declined by client',
    converted: 'Proposal converted to project',
  };

  const description = eventDescriptions[afterData.status] || `Proposal status changed to ${afterData.status}`;

  await createAuditLog({
    orgId,
    eventType: 'proposal_status_changed',
    eventDescription: `${description}: ${afterData.title}`,
    actor: afterData.updatedBy || 'system',
    targetType: 'proposal',
    targetId: proposalId,
    targetName: afterData.title,
    changes: {
      status: { before: beforeData.status, after: afterData.status },
    },
    metadata: {
      companyName: afterData.companyName,
      contactEmail: afterData.contactEmail,
    },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Special handling for acceptance
  if (afterData.status === 'accepted') {
    await createAuditLog({
      orgId,
      eventType: 'acceptance_recorded',
      eventDescription: `Proposal acceptance recorded: ${afterData.title}`,
      actor: afterData.contactId || 'client',
      actorEmail: afterData.contactEmail,
      actorRole: 'client',
      targetType: 'proposal',
      targetId: proposalId,
      targetName: afterData.title,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});

// Project events
export const onProjectCreated = onDocumentCreated("orgs/{orgId}/projects/{projectId}", async (event) => {
  const { orgId, projectId } = event.params;
  const projectData = event.data?.data();

  if (!projectData) return;

  await createAuditLog({
    orgId,
    eventType: 'project_created',
    eventDescription: `Project created: ${projectData.name}`,
    actor: projectData.createdBy,
    targetType: 'project',
    targetId: projectId,
    targetName: projectData.name,
    metadata: {
      companyName: projectData.companyName,
      sourceProposalId: projectData.sourceProposalId,
      projectManager: projectData.projectManager,
    },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});

export const onProjectStatusChanged = onDocumentUpdated("orgs/{orgId}/projects/{projectId}", async (event) => {
  const { orgId, projectId } = event.params;
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) return;
  if (beforeData.status === afterData.status) return;

  await createAuditLog({
    orgId,
    eventType: 'project_status_changed',
    eventDescription: `Project status changed: ${afterData.name} from ${beforeData.status} to ${afterData.status}`,
    actor: 'system',
    targetType: 'project',
    targetId: projectId,
    targetName: afterData.name,
    changes: {
      status: { before: beforeData.status, after: afterData.status },
    },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// ============================================================================
// ORG BOOTSTRAPPING FUNCTION
// ============================================================================

export const bootstrapUserOrg = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated");
  }

  const { uid, email } = request.auth.token;
  const { orgName, displayName } = request.data;

  if (!orgName || typeof orgName !== 'string') {
    throw new HttpsError("invalid-argument", "orgName is required");
  }

  try {
    // Check if user already has an org
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (userData?.orgId) {
      throw new HttpsError("already-exists", "User already belongs to an organization");
    }

    // Create organization
    const orgRef = await db.collection('orgs').add({
      name: orgName,
      displayName: orgName,
      status: 'active',
      settings: {
        timezone: 'Australia/Sydney',
        currency: 'AUD',
        fiscalYearStart: '07-01',
        features: {
          aiEnabled: true,
          clientPortalEnabled: true,
          crmEnabled: true,
        },
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: uid,
    });

    const orgId = orgRef.id;

    // Create member record with admin role
    await db.collection(`orgs/${orgId}/members`).doc(uid).set({
      userId: uid,
      orgId,
      role: 'admin',
      email,
      displayName: displayName || email?.split('@')[0],
      invitedBy: uid,
      invitedAt: admin.firestore.FieldValue.serverTimestamp(),
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user document with org pointer
    await userRef.set({
      uid,
      email,
      displayName: displayName || email?.split('@')[0],
      orgId,
      createdAt: userDoc.exists ? userData?.createdAt : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      emailVerified: request.auth.token.email_verified || false,
      disabled: false,
    }, { merge: true });

    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, {
      orgId,
      role: 'admin',
    });

    return { orgId, role: 'admin' };
  } catch (error: unknown) {
    console.error('Error bootstrapping org:', error);
    throw new HttpsError("internal", (error as Error).message || "Failed to create organization");
  }
});

// ============================================================================
// ENHANCED PROPOSAL GENERATION WITH AI
// ============================================================================

export const generateProposalContent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated");
  }

  const { 
    businessContext, 
    serviceTemplates, 
    clientInfo, 
    sections 
  } = request.data;

  if (!businessContext || !clientInfo) {
    throw new HttpsError("invalid-argument", "businessContext and clientInfo are required");
  }

  try {
    // Build comprehensive prompt
    const prompt = `
You are a professional business consultant creating a proposal.

Business Context:
${JSON.stringify(businessContext, null, 2)}

Client Information:
${JSON.stringify(clientInfo, null, 2)}

Service Templates:
${JSON.stringify(serviceTemplates || {}, null, 2)}

Generate a comprehensive proposal with the following sections as a JSON object:
{
  "executiveSummary": "...",
  "diagnosis": "...",
  "scope": "...",
  "methodology": "...",
  "deliverables": [
    { "name": "...", "description": "..." }
  ],
  "timeline": {
    "estimatedDuration": 90,
    "milestones": [
      { "name": "...", "description": "...", "dueOffset": 30 }
    ]
  },
  "assumptions": ["..."],
  "exclusions": ["..."],
  "acceptanceCriteria": ["..."],
  "nextSteps": ["..."]
}

Requested sections: ${sections?.join(', ') || 'all'}

Return ONLY valid JSON, no markdown formatting or additional text.
`;

    const resp = await generativeModel.generateContent(prompt);

    if (!resp.response.candidates || resp.response.candidates.length === 0) {
      throw new HttpsError("internal", "No content generated");
    }

    let content = resp.response.candidates[0].content.parts[0].text || '';
    
    // Clean up markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse JSON
    const proposalData = JSON.parse(content);

    return proposalData;
  } catch (error: unknown) {
    console.error('Error generating proposal:', error);
    throw new HttpsError("internal", (error as Error).message || "Failed to generate proposal");
  }
});

// ============================================================================
// PROPOSAL TO PROJECT CONVERSION
// ============================================================================

export const convertProposalToProject = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated");
  }

  const { proposalId, orgId } = request.data;

  if (!proposalId || !orgId) {
    throw new HttpsError("invalid-argument", "proposalId and orgId are required");
  }

  try {
    // Get proposal
    const proposalRef = db.collection(`orgs/${orgId}/proposals`).doc(proposalId);
    const proposalDoc = await proposalRef.get();

    if (!proposalDoc.exists) {
      throw new HttpsError("not-found", "Proposal not found");
    }

    const proposal = proposalDoc.data();

    if (proposal?.status !== 'accepted') {
      throw new HttpsError("failed-precondition", "Proposal must be accepted");
    }

    if (proposal?.convertedToProjectId) {
      throw new HttpsError("already-exists", "Proposal already converted");
    }

    // Create project
    const projectRef = await db.collection(`orgs/${orgId}/projects`).add({
      orgId,
      name: proposal.title,
      description: proposal.executiveSummary,
      status: 'onboarding',
      clientId: proposal.clientId,
      companyId: proposal.companyId,
      companyName: proposal.companyName,
      primaryContactId: proposal.contactId,
      startDate: admin.firestore.FieldValue.serverTimestamp(),
      endDate: admin.firestore.Timestamp.fromMillis(
        Date.now() + (proposal.timeline?.estimatedDuration || 90) * 24 * 60 * 60 * 1000
      ),
      budget: proposal.pricing?.totalAmount,
      currency: proposal.pricing?.currency || 'AUD',
      projectManager: request.auth.uid,
      teamMembers: [request.auth.uid],
      clientUsers: proposal.clientId ? [proposal.clientId] : [],
      milestones: (proposal.timeline?.milestones || []).map((m: unknown, i: number) => ({
        ...(m as object),
        id: `milestone-${i + 1}`,
        status: 'pending',
        owner: request.auth.uid,
      })),
      deliverables: (proposal.deliverables || []).map((d: unknown, i: number) => ({
        ...(d as object),
        id: `deliverable-${i + 1}`,
        status: 'not-started',
        owner: request.auth.uid,
        revisionCount: 0,
        maxRevisions: 3,
      })),
      sourceProposalId: proposalId,
      proposalSnapshot: proposal,
      healthStatus: 'green',
      progressPercentage: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
    });

    const projectId = projectRef.id;

    // Update proposal
    await proposalRef.update({
      status: 'converted',
      convertedAt: admin.firestore.FieldValue.serverTimestamp(),
      convertedToProjectId: projectId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create onboarding tasks
    const onboardingTasks = [
      { name: 'Schedule project kickoff meeting', dueOffset: 3 },
      { name: 'Collect required documents from client', dueOffset: 5 },
      { name: 'Provision access to project tools', dueOffset: 7 },
      { name: 'Finalize project timeline with team', dueOffset: 7 },
      { name: 'Begin first milestone activities', dueOffset: 14 },
    ];

    const batch = db.batch();
    
    onboardingTasks.forEach((task, i) => {
      const activityRef = db.collection(`orgs/${orgId}/activities`).doc();
      batch.set(activityRef, {
        orgId,
        type: 'task',
        subject: task.name,
        status: 'pending',
        priority: 'high',
        dueDate: admin.firestore.Timestamp.fromMillis(Date.now() + task.dueOffset * 24 * 60 * 60 * 1000),
        owner: request.auth.uid,
        linkedEntityType: 'project',
        linkedEntityId: projectId,
        linkedEntityName: proposal.title,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
      });
    });

    await batch.commit();

    return { projectId };
  } catch (error: unknown) {
    console.error('Error converting proposal:', error);
    throw new HttpsError("internal", (error as Error).message || "Failed to convert proposal");
  }
});
