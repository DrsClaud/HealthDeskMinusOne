const { db } = require("../config/firebase");

/**
 * Get the current advertising subscription
 */
exports.getUserSubscription = async function (userId) {
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
  const subscriptionId = subscriptionData.stripeLink.split("/").pop();

  return {
    ...subscriptionData,
    subscriptionId,
  };
};
