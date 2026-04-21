const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../../config/firebase");
const { stripeClient } = require("../../services/stripe");
const { runtimeConfigSecret } = require("../../runtimeConfig");

// Add logging helper
const logOperation = (type, operation, data) => {
  functions.logger.info(`[${type}] ${operation}`, data);
};

/**
 * Get the current advertising subscription
 */
async function getUserSubscription(userId) {
  try {
    const subscriptionsRef = db
      .collection("users")
      .doc(userId)
      .collection("subscriptions");
    const allActiveSubscriptions = await subscriptionsRef
      .where("status", "==", "active")
      .get();

    if (allActiveSubscriptions.empty) {
      throw new Error("No active subscriptions found");
    }

    // Find the subscription that has metadata.adId
    const adSubscription = allActiveSubscriptions.docs.find((doc) => {
      const data = doc.data();
      return data.metadata && data.metadata.adId;
    });

    if (!adSubscription) {
      throw new Error("No active ad subscription found");
    }

    const subscriptionData = adSubscription.data();

    // Extract subscription ID from stripeLink
    // Format: "https://dashboard.stripe.com/test/subscriptions/sub_1QQ3WdEQXF105V0lJJCblJLc"
    const subscriptionId = subscriptionData.stripeLink.split("/").pop();

    logOperation("DB", "Retrieved user subscription", {
      userId,
      subscriptionId,
    });
    return {
      ...subscriptionData,
      subscriptionId,
    };
  } catch (error) {
    functions.logger.error("[DB_ERROR] Failed to get user subscription:", {
      userId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Add or remove ads once we already have an active subscription.
 */
exports.manageAdSubscription = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const { action, uid, location, zip, price } = data;
  logOperation("FUNCTION", "Starting manageAdSubscription", {
    action,
    uid,
    zip,
  });

  functions.logger.info({ action, uid, zip });

  try {
    // For remove action, get the ad document first
    if (action === "remove") {
      const adRef = db
        .collection("zips")
        .doc(String(zip))
        .collection("listings")
        .doc(uid);
      const adDoc = await adRef.get();

      if (!adDoc.exists) {
        throw new Error("Ad document not found");
      }

      const adData = adDoc.data();

      // Handle trial ads
      if (adData.isTrial) {
        await adRef.update({
          status: "inactive",
          isTrial: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logOperation("DB", "Deactivated trial ad", { zip, uid });
        return { success: true };
      }

      // For paid subscriptions, continue with the existing flow
      const userSubscription = await getUserSubscription(uid);
      const subscriptionId = userSubscription?.subscriptionId;

      if (!subscriptionId) {
        throw new Error("No Stripe subscription ID found");
      }

      const subscription =
        await stripeClient.subscriptions.retrieve(subscriptionId);
      const subscriptionItemId = adData.subscriptionItemId;

      if (!subscriptionItemId) {
        throw new Error(`No subscriptionItemId found for ad ${uid}`);
      }

      const item = subscription.items.data.find(
        (item) => item.id === subscriptionItemId,
      );

      if (!item) {
        functions.logger.error(
          `Subscription item ${subscriptionItemId} not found in subscription ${subscriptionId}`,
        );
        throw new Error("Subscription item not found");
      }

      try {
        if (item.quantity > 1) {
          await stripeClient.subscriptionItems.update(subscriptionItemId, {
            quantity: item.quantity - 1,
          });
          logOperation("STRIPE", "Reduced subscription item quantity", {
            subscriptionItemId,
            oldQuantity: item.quantity,
            newQuantity: item.quantity - 1,
          });
        } else {
          await stripeClient.subscriptionItems.del(subscriptionItemId);
          logOperation("STRIPE", "Deleted subscription item", {
            subscriptionItemId,
          });
        }

        await adRef.update({
          status: "inactive",
          subscriptionItemId: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logOperation("DB", "Deactivated paid ad", { zip, uid });

        return { success: true };
      } catch (stripeError) {
        functions.logger.error("[STRIPE_ERROR] Operation failed:", {
          error: stripeError.message,
          subscriptionItemId,
          action: "remove",
        });
        throw stripeError;
      }
    }

    // For add action, proceed with subscription handling
    const userSubscription = await getUserSubscription(uid);
    const subscriptionId = userSubscription?.subscriptionId;

    switch (action) {
      case "add": {
        if (!subscriptionId) {
          throw new Error("No Stripe subscription ID found");
        }

        // Get the subscription directly from Stripe
        const subscription =
          await stripeClient.subscriptions.retrieve(subscriptionId);

        // Check if an item with this price already exists
        const existingItem = subscription.items.data.find(
          (item) => item.price.id === price,
        );

        let updatedSubscription;
        if (existingItem) {
          // Update existing item's quantity
          updatedSubscription = await stripeClient.subscriptions.update(
            subscriptionId,
            {
              items: [
                {
                  id: existingItem.id,
                  quantity: existingItem.quantity + 1,
                },
              ],
            },
          );
          logOperation("STRIPE", "Updated existing subscription item", {
            subscriptionId,
            itemId: existingItem.id,
            oldQuantity: existingItem.quantity,
            newQuantity: existingItem.quantity + 1,
          });
        } else {
          // Add new item if price doesn't exist
          updatedSubscription = await stripeClient.subscriptions.update(
            subscriptionId,
            {
              items: [
                ...subscription.items.data.map((item) => ({
                  id: item.id,
                })),
                { price },
              ],
            },
          );
          logOperation("STRIPE", "Added new subscription item", {
            subscriptionId,
            price,
          });
        }

        // Get the relevant subscription item
        const subscriptionItem = existingItem
          ? updatedSubscription.items.data.find(
              (item) => item.id === existingItem.id,
            )
          : updatedSubscription.items.data[
              updatedSubscription.items.data.length - 1
            ];

        // Update Firestore
        await db
          .collection("zips")
          .doc(String(zip))
          .collection("listings")
          .doc(uid)
          .set(
            {
              subscriptionItemId: subscriptionItem.id,
              status: "active",
              zip: String(zip),
              uid,
              price,
              location,
              type: "promotion", // Add type field for the consolidated structure
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );

        logOperation("DB", "Updated ad document", {
          zip,
          uid,
          subscriptionItemId: subscriptionItem.id,
        });

        return { success: true, subscriptionId: updatedSubscription.id };
      }

      default:
        throw new Error("Invalid action");
    }
  } catch (error) {
    functions.logger.error("[ERROR] Error managing subscription:", {
      error: error.message,
      action,
      uid,
      zip,
    });
    throw new functions.https.HttpsError(
      "internal",
      "Error managing subscription.",
    );
  }
  });
