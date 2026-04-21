const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../config/firebase");

exports.createDailyPass = functions.firestore
  .document("users/{userId}/payments/{paymentId}")
  .onCreate(async (snap, context) => {
    const payment = snap.data();
    const { userId } = context.params;

    // Only process daily pass payments
    if (payment.metadata?.type !== "daily_pass") {
      return null;
    }

    // Extract tier from payment items (e.g., "large_daily" -> "large")
    let tier = "medium"; // fallback
    if (payment.items && payment.items.length > 0) {
      const priceNickname = payment.items[0].price?.nickname;
      if (priceNickname && priceNickname.includes("_daily")) {
        tier = priceNickname.split("_")[0]; // "large_daily" -> "large"
      }
    }

    // Add daily pass expiration and tier to user doc (reuse subscriptionTier field)
    await db.collection("users").doc(userId).update({
      dailyPassExpiresAt: payment.metadata.expiresAt,
      subscriptionTier: tier, // Reuse existing field
      subscriptionStatus: "daily_pass", // Special status for daily passes
      trialExpiresAt: admin.firestore.FieldValue.delete(), // Remove trial
      trialConsumedByUpgrade: true, // Flag that trial was consumed by upgrade, not expired
    });

    console.log(
      `🗑️ Added dailyPassExpiresAt (${tier} tier) for user ${userId} - removed trialExpiresAt`
    );

    return null;
  });
