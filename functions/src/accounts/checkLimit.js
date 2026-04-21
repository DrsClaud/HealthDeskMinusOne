const functions = require("firebase-functions");
const admin = require("firebase-admin");

const ACCOUNT_LIMITS = {
  patient: 300,
  professional: 300,
};

exports.checkAccountLimit = functions.https.onCall(async (data, context) => {
  const { role } = data;
  const db = admin.firestore();

  try {
    const statsRef = db.collection("statistics").doc("accounts");

    return await db.runTransaction(async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      const stats = statsDoc.exists
        ? statsDoc.data()
        : { patient: 0, professional: 0 };

      if (stats[role] >= ACCOUNT_LIMITS[role]) {
        // Send email notification to admin
        await db.collection("emails").add({
          to: ["eric@ericmurphy.xyz", "drsclaud@aol.com"],
          message: {
            subject: `My HealthDesk: ${
              role.charAt(0).toUpperCase() + role.slice(1)
            } Account Limit Reached`,
            html: `
              <p>The ${
                role === "patient" ? "individual" : role
              } account limit (${ACCOUNT_LIMITS[role]}) has been reached.</p>
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
          allowed: false,
          message:
            "We've reached capacity for new registrations. Please try again later.",
        };
      }

      transaction.set(
        statsRef,
        {
          [role]: admin.firestore.FieldValue.increment(1),
        },
        { merge: true }
      );

      return { allowed: true };
    });
  } catch (error) {
    console.error("Error checking account limit:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Unable to process registration"
    );
  }
});
