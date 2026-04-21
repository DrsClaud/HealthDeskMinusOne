const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../config/firebase");
const { getEnvironmentConfig } = require("../config/environments");

// Get environment-specific configuration
const envConfig = getEnvironmentConfig();

/**
 * Retires expired subscriptions - dynamically scheduled based on environment
 */
const endAuctions = functions.pubsub
  .schedule(envConfig.retirementSchedule)
  .timeZone(envConfig.timeZone)
  .onRun(async (context) => {
    return await run();
  });

/**
 * Main function logic
 */
const run = async () => {
  const now = admin.firestore.Timestamp.now();

  const summary = {
    processingTime: now.toDate().toISOString(),
    listings: {
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      promotionCount: 0,
      featuredCount: 0,
    },
  };

  console.log("🚀 Starting subscription retirement at", now.toDate());

  try {
    await retireExpiredListings(summary, now);

    await markAuctionsAsEnded(summary, now);

    console.log("✅ Subscription retirement completed:", summary);
    return summary;
  } catch (error) {
    console.error("❌ Error in subscription retirement:", error);
    return summary;
  }
};

/**
 * Retires expired listings by checking endDate
 */
const retireExpiredListings = async (summary, now) => {
  try {
    console.log("🔄 Starting to retire expired listings");

    // Query only user listings that have actually expired
    const query = db
      .collectionGroup("listings")
      .where("status", "==", "active")
      .where("documentSource", "==", "userListing")
      .where("endDate", "<=", now);

    const expiredListingsSnapshot = await query.get();

    console.log(
      `📊 Found ${expiredListingsSnapshot.size} expired listings to retire`
    );
    summary.listings.processedCount = expiredListingsSnapshot.size;

    if (expiredListingsSnapshot.empty) {
      console.log("No expired listings found. Skipping.");
      return;
    }

    // Process in batches
    let batch = db.batch();
    let batchCount = 0;
    const batchLimit = 500;
    let batches = [];

    for (const doc of expiredListingsSnapshot.docs) {
      try {
        const userId = doc.ref.parent.parent.id;
        const zipCode = doc.id;
        const listingData = doc.data();
        const listingType = listingData.type || "unknown";

        // Validate document structure
        if (!userId || !zipCode) {
          console.error("Invalid document path:", doc.ref.path);
          throw new Error("Invalid document path - missing userId or zipCode");
        }

        // Validate endDate exists
        if (!listingData.endDate) {
          console.error(`Missing endDate for listing ${doc.ref.path}`);
          throw new Error("Missing endDate field");
        }

        console.log(
          `🔄 Retiring ${listingType} listing: ${userId} in ${zipCode}`
        );

        const updateData = {
          status: "expired",
          updatedAt: now,
        };

        // Update user's listing (source document)
        batch.update(doc.ref, updateData);

        // Update mirrored document in zips collection
        const zipListingRef = db
          .collection("zips")
          .doc(zipCode)
          .collection("listings")
          .doc(userId);

        batch.update(zipListingRef, updateData);

        batchCount++;
        summary.listings.successCount++;

        // Track counts by type
        if (listingType === "promotion") {
          summary.listings.promotionCount++;
        } else if (listingType === "featured") {
          summary.listings.featuredCount++;
        }

        if (batchCount >= batchLimit) {
          batches.push(batch);
          console.log(`Queued batch with ${batchCount} listing updates`);
          batchCount = 0;
          batch = db.batch();
        }
      } catch (error) {
        console.error(`Error retiring listing ${doc.id}:`, error);
        summary.listings.errorCount++;
        summary.listings.errors.push({
          docId: doc.id,
          docPath: doc.ref.path,
          message: error.message,
          timestamp: now.toDate().toISOString(),
        });
      }
    }

    // Add final batch
    if (batchCount > 0) {
      batches.push(batch);
    }

    // Commit all batches
    console.log(`💾 Committing ${batches.length} batches...`);
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`Committed batch ${i + 1} of ${batches.length}`);
    }

    console.log(
      `✅ Retirement completed: ${summary.listings.successCount} listings retired`
    );
  } catch (error) {
    console.error("❌ Error in retireExpiredListings:", error);
    summary.listings.errorCount++;
    summary.listings.errors.push({
      message: error.message,
      timestamp: now.toDate().toISOString(),
    });
  }
};

const markAuctionsAsEnded = async (summary, now) => {
  const activeAuctions = await db
    .collection("auctions")
    .where("status", "==", "active")
    .where("endTime", "<=", now)
    .get();

  if (activeAuctions.empty) return;

  const batch = db.batch();
  activeAuctions.forEach((doc) => {
    batch.update(doc.ref, {
      status: "ended",
      endedAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();
  console.log(`🏁 Ended ${activeAuctions.size} auctions`);
};

module.exports = endAuctions;
module.exports.run = run;
