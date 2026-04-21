const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../config/firebase");

const TRIAL_LENGTH_DAYS = {
  patient: 3,
  professional: 3,
  facility: 21,
  admin: 0, // Admins don't get trials - they manage billing for their org
};

/**
 * Start a role-based free trial
 */
exports.startTrial = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in."
    );
  }

  const uid = context.auth.uid;

  try {
    // Get user document to check eligibility
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "User document not found."
      );
    }

    const userData = userDoc.data();

    // Check if user is eligible for trials (patient, professional, facility)
    // Admins are not eligible for trials - they manage org billing
    if (
      userData.role !== "patient" &&
      userData.role !== "professional" &&
      userData.role !== "facility"
    ) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Only patients, professionals, and facilities can start trials."
      );
    }

    // Check if user has already used their trial
    if (userData.hasUsedTrial) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "User has already used their trial."
      );
    }

    // Check if user already has an active subscription
    const decodedToken = await admin.auth().getUser(uid);
    if (decodedToken.customClaims?.stripeRole) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "User already has an active subscription."
      );
    }

    const trialLengthDays =
      TRIAL_LENGTH_DAYS[userData.role] || TRIAL_LENGTH_DAYS.patient;

    // Calculate trial end date
    const trialExpiresAt = new Date(
      Date.now() + trialLengthDays * 24 * 60 * 60 * 1000
    );

    // Update user document with minimal trial information
    await db
      .collection("users")
      .doc(uid)
      .update({
        hasUsedTrial: true,
        trialExpiresAt: admin.firestore.Timestamp.fromDate(trialExpiresAt),
        subscriptionTier: "trial", // Set trial tier for role-specific token limit
      });

    functions.logger.info(
      `Started ${trialLengthDays}-day trial for ${userData.role} user ${uid}`,
      {
        uid,
        role: userData.role,
        trialExpiresAt,
      }
    );

    return {
      success: true,
      trialExpiresAt: trialExpiresAt.toISOString(),
      message: `Trial started successfully! You have ${trialLengthDays} days of full access.`,
    };
  } catch (error) {
    functions.logger.error("Error starting trial:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError("internal", "Error starting trial");
  }
});
