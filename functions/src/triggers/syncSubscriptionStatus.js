const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../config/firebase");

/**
 * Firestore trigger: Sync subscription status from Stripe extension subcollection to user doc
 * Watches: users/{userId}/subscriptions/{subscriptionId}
 * Updates: users/{userId}.subscriptionStatus and subscription tier info
 */
const syncSubscriptionStatus = functions.firestore
  .document("users/{userId}/subscriptions/{subscriptionId}")
  .onWrite(async (change, context) => {
    const { userId, subscriptionId } = context.params;

    try {
      console.log(`🔄 Syncing subscription status for user: ${userId}`);

      // Get all subscriptions for this user
      const subscriptionsRef = db
        .collection("users")
        .doc(userId)
        .collection("subscriptions");

      const allSubscriptions = await subscriptionsRef.get();

      let subscriptionStatus = "inactive";
      let subscriptionTier = null;

      if (!allSubscriptions.empty) {
        const subscriptions = allSubscriptions.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Check for any active subscription first (highest priority)
        const activeSubscription = subscriptions.find(
          (sub) => sub.status === "active"
        );

        let currentSubscription = null;

        if (activeSubscription) {
          subscriptionStatus = "active";
          currentSubscription = activeSubscription;
          console.log(`✅ User ${userId} has active subscription`);
        } else {
          // No active subscriptions - find the most recent subscription
          // Sort by created timestamp (handles both Firestore timestamp and Unix timestamp)
          const latestSubscription = subscriptions.sort((a, b) => {
            const aCreated =
              a.created?.toDate?.() ||
              new Date(a.created * 1000) ||
              new Date(0);
            const bCreated =
              b.created?.toDate?.() ||
              new Date(b.created * 1000) ||
              new Date(0);
            return bCreated.getTime() - aCreated.getTime();
          })[0];

          currentSubscription = latestSubscription;

          // Additional validation: check if subscription actually ended
          if (latestSubscription.ended_at) {
            const endedAt =
              latestSubscription.ended_at.toDate?.() ||
              new Date(latestSubscription.ended_at * 1000);
            const now = new Date();

            if (endedAt < now) {
              subscriptionStatus = "canceled"; // Definitely ended
              console.log(
                `📊 User ${userId} subscription ended at: ${endedAt.toISOString()}`
              );
            } else {
              subscriptionStatus = mapStripeStatus(latestSubscription.status);
              console.log(
                `📊 User ${userId} latest subscription: ${latestSubscription.status} → ${subscriptionStatus}`
              );
            }
          } else {
            subscriptionStatus = mapStripeStatus(latestSubscription.status);
            console.log(
              `📊 User ${userId} latest subscription: ${latestSubscription.status} → ${subscriptionStatus}`
            );
          }
        }

        // Extract tier information from the current subscription
        if (
          currentSubscription &&
          currentSubscription.items &&
          currentSubscription.items.length > 0
        ) {
          const item = currentSubscription.items[0];

          // Extract tier from plan nickname (e.g., "large_monthly" → tier: "large")
          if (item.plan && item.plan.nickname) {
            const [tier] = item.plan.nickname.split("_");
            subscriptionTier = tier;
            console.log(`📊 User ${userId} subscription tier: ${tier}`);
          }
          // Fallback: try to extract from price nickname if plan nickname fails
          else if (item.price && item.price.nickname) {
            const [tier] = item.price.nickname.split("_");
            subscriptionTier = tier;
            console.log(
              `📊 User ${userId} subscription tier (from price): ${tier}`
            );
          }
          // Fallback: try lookup_key if available
          else if (item.price && item.price.lookup_key) {
            const [tier] = item.price.lookup_key.split("_");
            subscriptionTier = tier;
            console.log(
              `📊 User ${userId} subscription tier (from lookup_key): ${tier}`
            );
          }
        }
      } else {
        // No subscriptions found
        subscriptionStatus = "inactive";
        console.log(`🆓 User ${userId} has no subscriptions`);
      }

      // Prepare update data
      const updateData = {
        subscriptionStatus: subscriptionStatus,
      };

      // Only update tier if we have an active subscription with tier data
      // This preserves historical tier information when subscriptions lapse
      if (subscriptionTier && subscriptionStatus === "active") {
        updateData.subscriptionTier = subscriptionTier;
      }

      // Remove trialExpiresAt when subscription becomes active
      // This prevents conflicts between trial and subscription states
      if (subscriptionStatus === "active") {
        updateData.trialExpiresAt = admin.firestore.FieldValue.delete();
        updateData.trialConsumedByUpgrade = true; // Flag that trial was consumed by upgrade
        console.log(
          `Removed trialExpiresAt for user ${userId} - subscription now active`
        );
      }

      // Update the user document
      await db.collection("users").doc(userId).update(updateData);

      console.log(
        `✅ Updated user ${userId} subscriptionStatus to: ${subscriptionStatus}`,
        subscriptionTier
          ? `with tier: ${subscriptionTier}`
          : "without tier data"
      );

      // Update organization seat count if this is an admin subscription
      const subscriptionData = change.after.exists ? change.after.data() : null;

      if (subscriptionData && subscriptionData.role === "admin") {
        // Get user's organizationId
        const userDoc = await db.collection("users").doc(userId).get();

        if (userDoc.exists && userDoc.data().organizationId) {
          const organizationId = userDoc.data().organizationId;

          if (subscriptionData.items && subscriptionData.items.length > 0) {
            const quantity = subscriptionData.items[0].quantity || 0;

            // Only update if quantity is positive (avoid setting to 0 on deletions)
            if (quantity > 0) {
              await db.collection("organizations").doc(organizationId).update({
                "seats.total": quantity,
              });

              console.log(
                `✅ Updated organization ${organizationId} total seats to: ${quantity}`
              );
            }
          }
        }
      }
    } catch (error) {
      console.error(
        `🚨 Error syncing subscription status for user ${userId}:`,
        error
      );
      // Don't throw - let the extension continue working even if our sync fails
    }
  });

/**
 * Map Stripe extension status to our simplified status
 */
function mapStripeStatus(stripeStatus) {
  switch (stripeStatus) {
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
      console.warn(
        `🤷 Unknown Stripe status: ${stripeStatus}, defaulting to inactive`
      );
      return "inactive";
  }
}

module.exports = { syncSubscriptionStatus };
