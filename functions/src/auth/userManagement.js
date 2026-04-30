const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { normalizeEmail } = require("../utils/emailUtils");

/**
 * Checks whether a Firebase Auth account exists for the given email.
 * Uses the Admin SDK — bypasses client-side Email Enumeration Protection.
 */
exports.checkEmailExists = functions.https.onCall(async (data) => {
  const { email } = data;
  if (!email) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email is required.",
    );
  }
  try {
    await admin.auth().getUserByEmail(email);
    return { exists: true };
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      return { exists: false };
    }
    throw new functions.https.HttpsError("internal", "Failed to check email.");
  }
});

/**
 * Combined function to check if a user exists and if account limits are reached
 * This reduces the number of backend calls during registration
 */
exports.checkRegistrationEligibility = functions.https.onCall(
  async (data, context) => {
    const { email, role } = data;
    const normalizedRole = role === "p4" ? "patient" : role;

    if (!email) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email is required",
      );
    }

    if (!role) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Role is required",
      );
    }

    try {
      // Check for email tricks (Gmail +addressing, dots, etc.)
      // NOTE: Currently runs in ALL environments (production, sandbox, dev)
      // To enable production-only: uncomment the environment check below
      // const envMode = functions.config().environment?.mode;
      // if (envMode === "production") { ... }

      const normalizedEmail = normalizeEmail(email);

      // Check if normalized email already exists in Firebase Auth
      try {
        const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
        if (userRecord) {
          console.log(
            `[Registration Blocked] Email trick detected: ${email} → ${normalizedEmail} (user exists: ${userRecord.uid})`,
          );
          return {
            eligible: false,
            reason: "user_exists",
            message:
              "An account with this email already exists. Please use the login page instead.",
          };
        }
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          throw error;
        }
      }

      // Also check Firestore users collection for normalized emails
      const usersSnapshot = await admin
        .firestore()
        .collection("users")
        .where("email", "==", normalizedEmail)
        .limit(1)
        .get();

      if (!usersSnapshot.empty) {
        console.log(
          `[Registration Blocked] Email trick detected: ${email} → ${normalizedEmail} (Firestore user exists)`,
        );
        return {
          eligible: false,
          reason: "user_exists",
          message:
            "An account with this email already exists. Please use the login page instead.",
        };
      }
      // Check account limit (skip for facility role)
      if (normalizedRole !== "facility") {
        const ACCOUNT_LIMITS = {
          patient: 300,
          professional: 300,
        };

        // Get account stats
        const statsDoc = await admin
          .firestore()
          .collection("statistics")
          .doc("accounts")
          .get();

        // Use the stats we fetched
        const stats = statsDoc.exists
          ? statsDoc.data()
          : { patient: 0, professional: 0 };

        // Check if limit reached
        if (stats[normalizedRole] >= ACCOUNT_LIMITS[normalizedRole]) {
          // Send email notification to admin
          await admin
            .firestore()
            .collection("emails")
            .add({
              to: ["eric@ericmurphy.xyz", "drsclaud@aol.com"],
              message: {
                subject: `My HealthDesk: ${
                  normalizedRole.charAt(0).toUpperCase() +
                  normalizedRole.slice(1)
                } Account Limit Reached`,
                html: `
              <p>The ${
                normalizedRole === "patient" ? "individual" : normalizedRole
              } account limit (${ACCOUNT_LIMITS[normalizedRole]}) has been reached.</p>
              <p>Current counts:</p>
              <ul>
                <li>Patient accounts: ${stats.patient || 0}</li>
                <li>Professional accounts: ${stats.professional || 0}</li>
              </ul>
              <p>A user attempted to register but was turned away.</p>
            `,
              },
            });

          return {
            eligible: false,
            reason: "limit_reached",
            message:
              "We've reached capacity for new registrations. Please try again later.",
          };
        }

        // Increment the account counter
        await admin
          .firestore()
          .collection("statistics")
          .doc("accounts")
          .set(
            {
              [normalizedRole]: admin.firestore.FieldValue.increment(1),
            },
            { merge: true },
          );
      }

      return {
        eligible: true,
      };
    } catch (error) {
      console.error("Error checking registration eligibility:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);
