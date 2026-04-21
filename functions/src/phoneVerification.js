const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { twilioClient } = require("./services/twilio/client");
const { runtimeConfigSecret, getRuntimeConfig } = require("./runtimeConfig");

const db = admin.firestore();

// Send phone verification using Twilio Verify API
exports.sendPhoneVerificationCode = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onCall(
  async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const { phoneNumber } = data;
    const userId = context.auth.uid;

    // Validate E.164 international phone number format
    // More permissive: + followed by 1-15 digits (covers all international formats)
    if (!phoneNumber || !/^\+\d{1,15}$/.test(phoneNumber)) {
      functions.logger.error(`Invalid phone format received: "${phoneNumber}"`);
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid phone number format. Must be in E.164 format (e.g., +1234567890)",
      );
    }

    functions.logger.info(`Phone validation passed for: ${phoneNumber}`);

    try {
      // Check if phone number is already verified by another user
      const existingPhoneQuery = await db
        .collection("users")
        .where("phone", "==", phoneNumber)
        .where("phoneVerified", "==", true)
        .get();

      if (!existingPhoneQuery.empty) {
        // Check if it's not the current user
        const existingUser = existingPhoneQuery.docs[0];
        if (existingUser.id !== userId) {
          throw new functions.https.HttpsError(
            "already-exists",
            "Phone number already verified by another account",
          );
        }
      }

      // Use Twilio Verify API to send verification
      const cfg = getRuntimeConfig();
      const verification = await twilioClient.verify.v2
        .services(cfg.twilio.verify_sid)
        .verifications.create({
          to: phoneNumber,
          channel: "sms",
        });

      // Store pending phone number in user document
      await db.collection("users").doc(userId).update({
        pendingPhone: phoneNumber,
        phoneVerificationRequested:
          admin.firestore.FieldValue.serverTimestamp(),
        twilioVerificationSid: verification.sid, // Store for reference
      });

      functions.logger.info(
        `Verification sent to ${phoneNumber} for user ${userId}. SID: ${verification.sid}`,
      );

      return {
        success: true,
        message: "Verification code sent successfully",
        verificationSid: verification.sid,
      };
    } catch (error) {
      functions.logger.error("Error sending verification code:", error);

      // Handle Twilio Verify API errors
      if (error.code === 20003) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Authentication failed with Twilio",
        );
      } else if (error.code === 60200) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid phone number format",
        );
      } else if (error.code === 60202) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "Too many verification attempts. Please try again later.",
        );
      } else if (error.code === 60203) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "Rate limit exceeded. Please try again later.",
        );
      }

      // Re-throw HttpsError if it's already one
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to send verification code",
      );
    }
  },
);

// Verify phone code using Twilio Verify API
exports.verifyPhoneCode = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const { verificationCode } = data;
  const userId = context.auth.uid;

  // Validate verification code format
  if (!verificationCode || !/^\d{6}$/.test(verificationCode)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid verification code format",
    );
  }

  try {
    // Get user document to retrieve pending phone and verification SID
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists || !userDoc.data().pendingPhone) {
      throw new functions.https.HttpsError(
        "not-found",
        "No pending phone verification found",
      );
    }

    const userData = userDoc.data();
    const { pendingPhone } = userData;

    const cfg = getRuntimeConfig();
    // Use Twilio Verify API to check the code
    const verificationCheck = await twilioClient.verify.v2
      .services(cfg.twilio.verify_sid)
      .verificationChecks.create({
        to: pendingPhone,
        code: verificationCode,
      });

    if (verificationCheck.status === "approved") {
      // Code is valid - update user document
      await db.collection("users").doc(userId).update({
        phone: pendingPhone,
        phoneVerified: true,
        phoneVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Clear pending phone data
        pendingPhone: admin.firestore.FieldValue.delete(),
        phoneVerificationRequested: admin.firestore.FieldValue.delete(),
        twilioVerificationSid: admin.firestore.FieldValue.delete(),
      });

      functions.logger.info(
        `Phone number verified successfully for user ${userId}`,
      );

      return {
        success: true,
        message: "Phone number verified successfully",
      };
    } else {
      // Code is invalid
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid verification code",
      );
    }
  } catch (error) {
    functions.logger.error("Error verifying phone code:", error);

    // Handle Twilio Verify API errors
    if (error.code === 20404) {
      throw new functions.https.HttpsError(
        "not-found",
        "Verification request not found or expired",
      );
    } else if (error.code === 60202) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Too many verification attempts",
      );
    }

    // Re-throw HttpsError if it's already one
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError("internal", "Failed to verify code");
  }
  });

// No cleanup function needed - Twilio Verify handles expiration automatically
