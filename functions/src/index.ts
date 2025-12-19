
import crypto from "node:crypto";

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";

// Set the region for all functions in this file
setGlobalOptions({ region: "us-central1" });

admin.initializeApp();

const db = admin.firestore();
const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID ?? "demo-org";

// Initialize Vertex AI
const vertexAI = new VertexAI({ project: process.env.GCLOUD_PROJECT, location: "us-central1" });

const generativeModel = vertexAI.getGenerativeModel({
    model: "gemini-pro",
});

type AuditActorRole = "admin" | "staff" | "client" | "system";
type AuditEntityType = "proposal" | "client" | "project" | "file" | "user" | "auth";

interface AuditEvent {
  orgId: string;
  actor: { uid: string; role: AuditActorRole; displayName?: string };
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  before?: { ref: string };
  after?: { ref: string };
  metadata?: Record<string, unknown>;
  requestContext?: { ipAddress?: string; userAgent?: string };
}

function resolveRole(roleClaim: unknown): AuditActorRole {
  if (roleClaim === "admin" || roleClaim === "client" || roleClaim === "system") {
    return roleClaim;
  }
  return "staff";
}

function resolveOrgIdFromAuth(auth: { token?: Record<string, unknown> } | undefined): string {
  const claim = auth?.token?.["orgId"];
  if (typeof claim === "string" && claim.length > 0) {
    return claim;
  }
  return DEFAULT_ORG_ID;
}

function resolveActorFromAuth(auth: { uid?: string; token?: Record<string, unknown> } | undefined): AuditEvent["actor"] {
  const uid = auth?.uid ?? "system";
  const role = resolveRole(auth?.token?.["role"]);
  const displayName = typeof auth?.token?.["name"] === "string"
    ? (auth?.token?.["name"] as string)
    : (typeof auth?.token?.["email"] === "string" ? (auth?.token?.["email"] as string) : undefined);

  return {
    uid,
    role,
    ...(displayName ? { displayName } : {}),
  };
}

async function logAuditEvent(event: AuditEvent) {
  const auditId = crypto.randomUUID();
  const payload = {
    ...event,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    actor: {
      uid: event.actor.uid,
      role: event.actor.role,
      ...(event.actor.displayName ? { displayName: event.actor.displayName } : {}),
    },
    ...(event.before ? { before: event.before } : {}),
    ...(event.after ? { after: event.after } : {}),
    ...(event.metadata ? { metadata: event.metadata } : {}),
    ...(event.requestContext?.ipAddress ? { ipAddress: event.requestContext.ipAddress } : {}),
    ...(event.requestContext?.userAgent ? { userAgent: event.requestContext.userAgent } : {}),
  };

  try {
    await db.collection("orgs").doc(event.orgId).collection("auditLogs").doc(auditId).set(payload, { merge: false });
  } catch (error) {
    console.error("Failed to write audit log from callable", { error, action: event.action, entityId: event.entityId });
  }
}

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

  const orgId = resolveOrgIdFromAuth(request.auth);
  const proposal = {
    content: proposalContent,
    createdBy: request.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: "draft",
    orgId,
  };

  const newProposalRef = await db.collection("orgs").doc(orgId).collection("proposals").add(proposal);

  await logAuditEvent({
    orgId,
    actor: resolveActorFromAuth(request.auth),
    action: "proposal.create",
    entityType: "proposal",
    entityId: newProposalRef.id,
    summary: "Proposal draft created via AI callable.",
    after: { ref: newProposalRef.path },
    metadata: { source: "ai_callable" },
    requestContext: {
      ipAddress: request.rawRequest?.ip,
      userAgent: request.rawRequest?.get("user-agent") ?? undefined,
    },
  });

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
