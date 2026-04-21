const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../config/firebase");

/**
 * One-time migration to populate user.subscriptionStatus field
 * Run this once after deploying the webhook to get all existing users synced
 */
const populateSubscriptionStatus = functions.https.onCall(
  async (data, context) => {
    // Only allow admin users to run this migration
    if (!context.auth || !context.auth.token.admin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admin users can run migrations"
      );
    }

    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      console.log("🔄 Starting subscription status migration...");

      // Get all users in batches
      let lastDoc = null;
      const batchSize = 100;

      while (true) {
        let query = db.collection("users").limit(batchSize);

        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }

        const userBatch = await query.get();

        if (userBatch.empty) {
          break;
        }

        // Process this batch
        const batch = db.batch();

        for (const userDoc of userBatch.docs) {
          processedCount++;
          const userId = userDoc.id;
          const userData = userDoc.data();

          try {
            // Skip if subscriptionStatus already exists
            if (userData.subscriptionStatus) {
              console.log(
                `⏭️ User ${userId} already has subscriptionStatus: ${userData.subscriptionStatus}`
              );
              continue;
            }

            let subscriptionStatus = "inactive";

            // Check trial status first
            const hasActiveTrial =
              userData.trialExpiresAt &&
              userData.trialExpiresAt.toDate() > new Date();

            if (hasActiveTrial) {
              subscriptionStatus = "active";
              console.log(`✅ User ${userId} has active trial`);
            } else {
              // Check for active subscriptions in subcollection
              const subscriptionsRef = db
                .collection("users")
                .doc(userId)
                .collection("subscriptions");

              const activeSubscriptions = await subscriptionsRef
                .where("status", "==", "active")
                .get();

              if (!activeSubscriptions.empty) {
                // Found active subscription
                subscriptionStatus = "active";
                console.log(`✅ User ${userId} has active subscription`);
              } else {
                // Check for any subscription (might be canceled, past_due, etc.)
                const allSubscriptions = await subscriptionsRef.get();

                if (!allSubscriptions.empty) {
                  // Get the most recent subscription status
                  const latestSub = allSubscriptions.docs
                    .map((doc) => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => (b.created || 0) - (a.created || 0))[0];

                  subscriptionStatus = mapSubscriptionStatus(latestSub.status);
                  console.log(
                    `📊 User ${userId} latest subscription status: ${latestSub.status} → ${subscriptionStatus}`
                  );
                } else {
                  // No subscriptions found - likely free user
                  subscriptionStatus = "inactive";
                  console.log(
                    `🆓 User ${userId} has no subscriptions - setting inactive`
                  );
                }
              }
            }

            // Add to batch update
            batch.update(userDoc.ref, {
              subscriptionStatus: subscriptionStatus,
              lastSubscriptionUpdate:
                admin.firestore.FieldValue.serverTimestamp(),
            });

            updatedCount++;
          } catch (userError) {
            errorCount++;
            const errorMsg = `User ${userId}: ${userError.message}`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        }

        // Commit this batch
        if (updatedCount > 0) {
          await batch.commit();
          console.log(`✅ Committed batch of ${userBatch.docs.length} users`);
        }

        lastDoc = userBatch.docs[userBatch.docs.length - 1];
      }

      const result = {
        success: true,
        processedCount,
        updatedCount,
        errorCount,
        errors: errors.slice(0, 10), // Limit errors in response
      };

      console.log("🎉 Migration completed:", result);
      return result;
    } catch (error) {
      console.error("🚨 Migration failed:", error);
      throw new functions.https.HttpsError("internal", "Migration failed", {
        error: error.message,
      });
    }
  }
);

/**
 * Map Stripe extension status to our simplified status
 */
function mapSubscriptionStatus(extensionStatus) {
  switch (extensionStatus) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    case "unpaid":
      return "inactive";
    default:
      return "inactive";
  }
}

module.exports = { populateSubscriptionStatus };
