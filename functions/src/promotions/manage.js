const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { stripeClient } = require("../services/stripe");
const { getNextAuctionEndDate } = require("../utils/dateUtils");
const { addMonths } = require("date-fns");

// Cleanup function to archive old listings (promotions and featured ads)
exports.archiveOldPromotions = functions.pubsub
  .schedule("0 0 1 * *") // Run at midnight on the 1st of each month
  .timeZone("America/New_York")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const cutoffDate = admin.firestore.Timestamp.fromDate(threeMonthsAgo);

    const db = admin.firestore();
    const expiredListings = await db
      .collectionGroup("listings")
      .where("status", "==", "expired")
      .where("expiredAt", "<=", cutoffDate)
      .limit(500) // Process in batches to avoid timeout
      .get();

    if (expiredListings.empty) {
      return null;
    }

    const batch = db.batch();
    expiredListings.forEach((doc) => {
      // Archive all listings to unified listingsArchive collection
      const archiveRef = doc.ref.parent.parent
        .collection("listingsArchive")
        .doc(doc.id);

      batch.set(archiveRef, {
        ...doc.data(),
        archivedAt: now,
      });

      batch.delete(doc.ref);
    });

    await batch.commit();
    return null;
  });
