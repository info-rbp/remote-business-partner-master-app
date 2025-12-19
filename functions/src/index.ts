
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";

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
  };

  const newProposalRef = await db.collection("proposals").add(proposal);

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
