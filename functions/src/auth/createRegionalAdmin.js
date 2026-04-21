const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const { normalizeEmail } = require("../utils/emailUtils");

function generateTempPassword(length = 20) {
  const chars =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@%^*-=+";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

/**
 * Platform admins only: create Auth user + Firestore users doc for regional_admin.
 * No invitation email (operators share password out-of-band).
 */
exports.createRegionalAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Platform admin only.",
    );
  }

  const emailRaw = (data && data.email) || "";
  const regionRaw = (data && data.region) || "";

  const email = normalizeEmail(String(emailRaw).trim());
  if (!email || !email.includes("@")) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Valid email is required.",
    );
  }

  const region = String(regionRaw).trim();
  if (!region || region.length > 512) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Region is required (max 512 characters).",
    );
  }

  const password = generateTempPassword(20);
  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();

  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      emailVerified: true,
      password,
      disabled: false,
    });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError(
        "already-exists",
        "An account with this email already exists.",
      );
    }
    console.error("[createRegionalAdmin] createUser failed", err);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to create auth user.",
    );
  }

  try {
    await db
      .collection("users")
      .doc(userRecord.uid)
      .set({
        uid: userRecord.uid,
        email,
        name: "",
        lastName: "",
        role: "regional_admin",
        region,
        registrationDate: now,
        onboarding: false,
      });
  } catch (err) {
    console.error("[createRegionalAdmin] Firestore set failed", err);
    try {
      await admin.auth().deleteUser(userRecord.uid);
    } catch (delErr) {
      console.error("[createRegionalAdmin] rollback deleteUser failed", delErr);
    }
    throw new functions.https.HttpsError(
      "internal",
      "Failed to create user profile.",
    );
  }

  return {
    uid: userRecord.uid,
    email,
    region,
    temporaryPassword: password,
  };
});
