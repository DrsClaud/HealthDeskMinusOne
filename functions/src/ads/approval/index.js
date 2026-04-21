const functions = require("firebase-functions");
const { db } = require("../../config/firebase");

/**
 * Set "pending" ads to "active" once the user's subscription is placed using Stripe.
 */
exports.approveZipAd = functions.firestore
  .document("users/{userId}/subscriptions/{subscriptionId}")
  .onWrite(async (change, context) => {
    const previousStatus = change.before.data()?.status;
    const currentStatus = change.after.data()?.status;
    const metadata = change.after.data()?.metadata;

    if (previousStatus !== "active" && currentStatus === "active" && metadata) {
      const { zip, adId } = metadata;
      if (zip && adId) {
        try {
          const adRef = db.doc(`zips/${zip}/ads/${adId}`);
          await adRef.update({ status: "active" });

          functions.logger.log("ad posted successfully");
        } catch (error) {
          functions.logger.log(error);
        }
      }
    }
  });
