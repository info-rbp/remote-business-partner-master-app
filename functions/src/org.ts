import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface UserProfile {
  orgId?: string;
  role?: "owner" | "admin" | "member";
  email?: string;
  displayName?: string;
  createdAt?: FirebaseFirestore.Timestamp;
  lastLoginAt?: FirebaseFirestore.Timestamp;
}

interface OrgMember {
  role: "owner" | "admin" | "member";
  status: "active" | "invited" | "disabled";
  email?: string;
  createdAt: FirebaseFirestore.Timestamp;
  createdBy: string;
}

export const bootstrapOrg = onCall(async (request) => {
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  if (!request.app) {
    throw new HttpsError(
      "failed-precondition",
      "App Check is required to bootstrap an organization."
    );
  }

  const uid = auth.uid;
  const email = auth.token.email ?? undefined;
  const displayName = auth.token.name ?? undefined;

  const result = await db.runTransaction(async (transaction) => {
    const userRef = db.collection("users").doc(uid);
    const userSnap = await transaction.get(userRef);
    const userProfile = (userSnap.data() as UserProfile | undefined) ?? null;

    // Existing org: ensure membership exists and return.
    if (userProfile?.orgId) {
      const memberRef = db
        .collection("orgs")
        .doc(userProfile.orgId)
        .collection("members")
        .doc(uid);

      const memberSnap = await transaction.get(memberRef);
      if (!memberSnap.exists) {
        const member: OrgMember = {
          role: (userProfile.role as OrgMember["role"]) ?? "member",
          status: "active",
          email,
          createdAt: admin.firestore.Timestamp.now(),
          createdBy: uid,
        };
        transaction.set(memberRef, member);
      }

      transaction.set(
        userRef,
        { lastLoginAt: admin.firestore.Timestamp.now(), email, displayName },
        { merge: true }
      );

      return {
        orgId: userProfile.orgId,
        role: (userProfile.role as OrgMember["role"]) ?? "member",
      };
    }

    const now = admin.firestore.Timestamp.now();
    const orgRef = db.collection("orgs").doc();
    const orgId = orgRef.id;
    const memberRef = orgRef.collection("members").doc(uid);

    transaction.set(orgRef, {
      name: `Org for ${email ?? uid}`,
      createdAt: now,
      createdBy: uid,
      plan: "trial",
    });

    const ownerMember: OrgMember = {
      role: "owner",
      status: "active",
      email,
      createdAt: now,
      createdBy: uid,
    };

    transaction.set(memberRef, ownerMember);
    transaction.set(db.collection("users").doc(uid), {
      email,
      displayName,
      orgId,
      role: "owner",
      createdAt: userProfile?.createdAt ?? now,
      lastLoginAt: now,
    });

    return { orgId, role: "owner" as const };
  });

  await admin.auth().setCustomUserClaims(uid, {
    orgId: result.orgId,
    role: result.role,
  });

  return result;
});

export const getIdentity = onCall(async (request) => {
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  if (!request.app) {
    throw new HttpsError(
      "failed-precondition",
      "App Check is required to read identity."
    );
  }

  const uid = auth.uid;
  const userSnap = await db.collection("users").doc(uid).get();
  const profile = userSnap.data() as UserProfile | undefined;

  if (!profile?.orgId || !profile.role) {
    throw new HttpsError("failed-precondition", "User is not associated with an organization.");
  }

  const memberSnap = await db
    .collection("orgs")
    .doc(profile.orgId)
    .collection("members")
    .doc(uid)
    .get();

  const member = memberSnap.data() as OrgMember | undefined;

  return {
    orgId: profile.orgId,
    role: profile.role,
    status: member?.status ?? "unknown",
  };
});
