const functions = require("firebase-functions");
const admin = require("firebase-admin");

// If admin is not already initialized elsewhere in your app
try {
  admin.initializeApp();
} catch (e) {
  console.log("Admin already initialized");
}

const db = admin.firestore();
const COLLECTION_NAME = "kijabe_rate_limits";

/**
 * Daily cleanup function to reset stale rate limit data
 * Runs every day at midnight
 */
exports.cleanupRateLimits = functions.pubsub
  .schedule("0 0 * * *") // Run at midnight every day
  .timeZone("UTC")
  .onRun(async (context) => {
    try {
      const now = new Date();
      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime();

      // Get all user documents
      const snapshot = await db.collection(COLLECTION_NAME).get();
      const batch = db.batch();
      let count = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        // If last reset is before today, reset the modules
        if (data.lastReset < today) {
          batch.update(doc.ref, {
            lastReset: today,
            modules: {},
          });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        console.log(`Reset rate limits for ${count} users`);
      } else {
        console.log("No rate limits needed resetting");
      }

      return null;
    } catch (error) {
      console.error("Error in rate limit cleanup:", error);
      return null;
    }
  });

/**
 * Security rules for the kijabe_rate_limits collection
 * These rules ensure only admin users can directly access the collection
 * All other access must be through Firebase Functions
 */
exports.securityRules = `
service cloud.firestore {
  match /databases/{database}/documents {
    match /kijabe_rate_limits/{userId} {
      allow read: if request.auth != null && 
                     (request.auth.token.admin == true || 
                      request.auth.uid == userId);
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
`;

// Export the module
module.exports = {
  cleanupRateLimits: exports.cleanupRateLimits,
  securityRules: exports.securityRules,
};
