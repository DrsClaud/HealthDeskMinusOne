const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../config/firebase");
const { getEnvironmentConfig } = require("../config/environments");
const {
  getNextAuctionEndDate,
  getMaxAuctionExtension,
} = require("../utils/dateUtils");
const { retryAutoCharge } = require("../utils/paymentUtils");
const { handlePaymentFailure } = require("./paymentRecovery");
const {
  getAuctionWinnerEmail,
  getPaymentFailureEmail,
} = require("../templates/emailTemplates");
const { runtimeConfigSecret } = require("../runtimeConfig");

// Get environment-specific configuration
const envConfig = getEnvironmentConfig();

/**
 * Processes auction winners - dynamically scheduled based on environment
 */
const processAuctionWinners = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .pubsub
  .schedule(envConfig.auctionSchedule)
  .timeZone(envConfig.timeZone)
  .onRun(async (context) => {
    return await run();
  });

/**
 * Main function logic
 */
const run = async () => {
  const now = admin.firestore.Timestamp.now();
  console.log("🚀🚀🚀 STARTING processAuctionWinners at", now.toDate());
  console.log("🚀 Current timestamp:", now.toDate().toISOString());

  const summary = {
    processingTime: now.toDate().toISOString(),
    auctions: {
      processed: 0,
      successful: 0,
      failed: 0,
      noWinners: 0,
    },
    payments: {
      successful: 0,
      failed: 0,
    },
    reset: {
      auctionsReset: 0,
      resetFailed: 0,
    },
    notifications: {
      winners: 0,
      losers: 0,
      failed: 0,
    },
    errors: [],
  };

  try {
    console.log("🚀 Starting auction processing at", now.toDate());

    // PHASE 1: Process all auction winners and collect processed auction data
    console.log("📊 PHASE 1: Processing auction winners...");
    const processedAuctions = await processAllAuctionWinners(summary, now);
    console.log(
      "📊 PHASE 1 COMPLETE. Processed auctions:",
      processedAuctions.length,
    );

    // PHASE 2: Send notifications using processed auction data
    console.log("🔔 PHASE 2: Sending notifications...");
    await sendAuctionNotifications(summary, now, processedAuctions);
    console.log("🔔 PHASE 2 COMPLETE");

    // PHASE 3: Reset auctions for next cycle
    console.log("🔄 PHASE 3: Resetting auctions...");
    await resetAuctionsForNextCycle(summary, now);
    console.log("🔄 PHASE 3 COMPLETE");

    console.log("✅✅✅ Auction processing complete:", summary);
    return summary;
  } catch (error) {
    console.error("💥💥💥 CRITICAL: Auction processing failed:", error);

    summary.errors.push({
      type: "CRITICAL_FAILURE",
      message: error.message,
      timestamp: now.toDate().toISOString(),
    });

    throw error;
  }
};

/**
 * Process all auction winners and return processed auction data
 */
async function processAllAuctionWinners(summary, now) {
  console.log("🔍 Starting processAllAuctionWinners...");

  const maxExtensionMs = getMaxAuctionExtension();
  console.log("📏 Max extension MS:", maxExtensionMs);

  // Just get ALL ended auctions - we're resetting them all anyway!
  console.log("🔍 Querying for ALL ended auctions...");
  const recentAuctions = await db.collection("auctions").get();

  console.log(`📊 Found ${recentAuctions.size} auctions in time window`);

  // Log every auction found
  recentAuctions.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`🔍 Auction ${index + 1}/${recentAuctions.size}:`);
    console.log(`   📍 ZIP: ${doc.id}`);
    console.log(`   📅 EndTime: ${data.endTime?.toDate()?.toISOString()}`);
    console.log(`   📅 EndedAt: ${data.endedAt?.toDate()?.toISOString()}`);
    console.log(`   📊 Status: ${data.status}`);
    console.log(`   🏆 LastBidder: ${data.lastBidder}`);
    console.log(`   💰 CurrentBid: ${data.currentBid}`);
    console.log(`   📧 LastBidderEmail: ${data.lastBidderEmail}`);
    console.log(`   📍 LastBidderLocation: ${data.lastBidderLocation}`);
    console.log(`   🎯 HasWinner: ${data.hasWinner}`);
    console.log(`   💳 PaymentStatus: ${data.paymentStatus}`);
  });

  if (recentAuctions.empty) {
    console.log("⚠️ No auctions found to process!");
    return [];
  }

  const processedAuctions = [];

  // Process auctions in parallel with individual error handling
  console.log("🔄 Starting to process individual auctions...");
  const promises = recentAuctions.docs.map(async (doc, index) => {
    try {
      console.log(
        `🔄 Processing auction ${index + 1}/${recentAuctions.size}: ${doc.id}`,
      );

      // Process individual auction and get enriched data back
      const enrichedAuctionData = await processIndividualAuction(
        doc,
        summary,
        now,
      );

      // Collect processed auction data for notifications with enriched winner info
      processedAuctions.push({
        id: doc.id,
        data: enrichedAuctionData, // This now includes winnerId, winningBid, etc.
        ref: doc.ref,
      });
      console.log(`✅ Successfully processed auction ${doc.id}`);
    } catch (error) {
      console.error(`❌ Failed to process auction ${doc.id}:`, error);
      // Error already handled in processIndividualAuction
    }
  });

  await Promise.allSettled(promises);
  console.log(`🏁 Finished processing ${promises.length} auctions`);

  return processedAuctions;
}

/**
 * Send notifications using processed auction data (no database query needed)
 */
async function sendAuctionNotifications(summary, now, processedAuctions) {
  try {
    console.log("🔔 Starting sendAuctionNotifications");
    console.log(
      `🔔 Processing ${processedAuctions.length} auctions for notifications`,
    );

    // Filter for auctions that have ended and have bidders
    const endedAuctionsWithBidders = processedAuctions.filter((auction) => {
      const auctionData = auction.data;
      const hasBidders =
        auctionData.bidHistory && auctionData.bidHistory.length > 0;
      console.log(
        `🔔 Auction ${auction.id}: bidHistory=${
          auctionData.bidHistory?.length || 0
        }, hasBidders=${hasBidders}`,
      );
      return hasBidders;
    });

    console.log(
      `🔔 Found ${endedAuctionsWithBidders.length} auctions with bidders`,
    );

    if (endedAuctionsWithBidders.length === 0) {
      console.log("🔔 No auctions with bidders to process notifications for");
      return;
    }

    // Collect all unique participants across all auctions
    const userNotifications = new Map();

    endedAuctionsWithBidders.forEach((auction) => {
      const auctionData = auction.data;
      const zipCode = auction.id;
      console.log(`🔔 Processing notifications for auction ${zipCode}`);

      // Get unique bidders
      const uniqueBidders = new Set(
        auctionData.bidHistory.map((bid) => bid.bidderId),
      );
      console.log(
        `🔔 Auction ${zipCode} has ${uniqueBidders.size} unique bidders:`,
        Array.from(uniqueBidders),
      );

      uniqueBidders.forEach((bidderId) => {
        if (!userNotifications.has(bidderId)) {
          userNotifications.set(bidderId, []);
        }

        // Use winnerId field that's now properly set in the enriched data
        const isWinner = auctionData.winnerId === bidderId;
        const userBids = auctionData.bidHistory.filter(
          (bid) => bid.bidderId === bidderId,
        );
        const highestBid = Math.max(...userBids.map((bid) => bid.amount));

        console.log(
          `🔔 User ${bidderId} in auction ${zipCode}: isWinner=${isWinner}, highestBid=${highestBid}, winnerId=${auctionData.winnerId}`,
        );

        const notification = {
          type: isWinner ? "auction_win" : "auction_loss",
          zipCode: zipCode,
          yourBid: highestBid,
          winningBid: auctionData.winningBid || null,
          winnerId: auctionData.winnerId || null,
          createdAt: now,
          dismissed: false,
        };

        // Add payment info for winners
        if (isWinner && auctionData.paymentIntentId) {
          notification.paymentIntentId = auctionData.paymentIntentId;
          notification.paymentStatus = auctionData.paymentStatus;
          console.log(
            `🔔 Added payment info for winner ${bidderId}: ${auctionData.paymentIntentId}`,
          );
        }

        userNotifications.get(bidderId).push(notification);
      });
    });

    console.log(`🔔 Total users to notify: ${userNotifications.size}`);

    // Batch update user documents
    const batches = [];
    let batch = db.batch();
    let count = 0;

    for (const [userId, notifications] of userNotifications) {
      console.log(
        `🔔 Preparing notifications for user ${userId}: ${notifications.length} notifications`,
      );

      const userRef = db.collection("users").doc(userId);

      batch.update(userRef, {
        auctionNotifications: notifications,
        auctionNotificationsUpdatedAt: now,
      });

      count++;

      // Count notifications for summary
      notifications.forEach((notification) => {
        if (notification.type === "auction_win") {
          summary.notifications.winners++;
        } else {
          summary.notifications.losers++;
        }
      });

      if (count >= 500) {
        batches.push(batch);
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) batches.push(batch);

    console.log(`🔔 Committing ${batches.length} notification batches...`);
    // Commit all batches
    for (const b of batches) {
      await b.commit();
    }

    console.log(`✅ Sent notifications to ${userNotifications.size} users`);
  } catch (error) {
    console.error("❌ Failed to send notifications:", error);
    summary.notifications.failed++;
    summary.errors.push({
      type: "NOTIFICATION_FAILED",
      message: error.message,
      timestamp: now.toDate().toISOString(),
    });
  }
}

/**
 * Reset auctions for next cycle
 */
async function resetAuctionsForNextCycle(summary, now) {
  try {
    console.log("🔄 Starting resetAuctionsForNextCycle");

    const existingAuctions = await db.collection("auctions").get();
    const nextEndDate = admin.firestore.Timestamp.fromDate(
      getNextAuctionEndDate(),
    );

    console.log(`🔄 Found ${existingAuctions.size} existing auctions to reset`);
    console.log(
      `🔄 Next auction ends at ${nextEndDate.toDate().toISOString()}`,
    );

    // Process in batches
    const batches = [];
    let batch = db.batch();
    let count = 0;

    existingAuctions.forEach((doc, index) => {
      console.log(
        `🔄 Resetting auction ${index + 1}/${existingAuctions.size}: ${doc.id}`,
      );

      const newAuctionData = {
        zipCode: doc.id,
        currentBid: null,
        startingPrice: 100000, // $1000.00 in cents
        startTime: now,
        endTime: nextEndDate,
        lastBidder: null,
        lastBidderEmail: null,
        lastBidderLocation: null,
        numberOfBids: 0,
        bidHistory: [],
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      batch.set(doc.ref, newAuctionData);
      count++;

      if (count >= 500) {
        batches.push(batch);
        batch = db.batch();
        count = 0;
      }
    });

    if (count > 0) batches.push(batch);

    console.log(`🔄 Committing ${batches.length} reset batches...`);
    // Commit all batches
    for (const b of batches) {
      await b.commit();
    }

    summary.reset.auctionsReset = existingAuctions.size;
    console.log(`✅ Reset ${existingAuctions.size} auctions for next cycle`);
  } catch (error) {
    console.error("❌ Failed to reset auctions:", error);
    summary.reset.resetFailed++;
    summary.errors.push({
      type: "AUCTION_RESET_FAILED",
      message: error.message,
      timestamp: now.toDate().toISOString(),
    });
  }
}

/**
 * Process a single auction with comprehensive error handling
 * Returns enriched auction data with winner information
 */
async function processIndividualAuction(auctionDoc, summary, now) {
  const zipCode = auctionDoc.id;
  const auctionData = auctionDoc.data();

  console.log(`🎯 ===== PROCESSING INDIVIDUAL AUCTION: ${zipCode} =====`);
  console.log(`🎯 Auction status: ${auctionData.status}`);
  console.log(
    `🎯 Auction endTime: ${auctionData.endTime?.toDate()?.toISOString()}`,
  );
  console.log(
    `🎯 Auction endedAt: ${auctionData.endedAt?.toDate()?.toISOString()}`,
  );
  console.log(`🎯 Last bidder: ${auctionData.lastBidder}`);
  console.log(`🎯 Current bid: ${auctionData.currentBid}`);
  console.log(`🎯 Has winner: ${auctionData.hasWinner}`);

  summary.auctions.processed++;

  // Start with original auction data
  let enrichedData = { ...auctionData };

  try {
    // Mark auction as ended first
    console.log(`🎯 Marking auction ${zipCode} as ended...`);
    await auctionDoc.ref.update({
      status: "ended",
      endedAt: now,
      updatedAt: now,
    });
    console.log(`✅ Auction ${zipCode} marked as ended`);

    // Update enriched data
    enrichedData.status = "ended";
    enrichedData.endedAt = now;
    enrichedData.updatedAt = now;

    // No winner case
    if (!auctionData.lastBidder || !auctionData.currentBid) {
      console.log(
        `📭 No winner for ZIP ${zipCode} (no lastBidder or currentBid)`,
      );
      await auctionDoc.ref.update({ hasWinner: false });
      enrichedData.hasWinner = false;
      summary.auctions.noWinners++;
      return enrichedData;
    }

    // Process winner
    const winnerId = auctionData.lastBidder;
    const winningBid = auctionData.currentBid;
    const winnerEmail = auctionData.lastBidderEmail;
    const winnerLocation = auctionData.lastBidderLocation;

    console.log(`🏆 Processing winner for ZIP ${zipCode}:`);
    console.log(`🏆   Winner ID: ${winnerId}`);
    console.log(`🏆   Winning bid: $${winningBid / 100}`);
    console.log(`🏆   Winner email: ${winnerEmail}`);
    console.log(`🏆   Winner location: ${winnerLocation}`);

    // Create subscription documents (pending payment)
    console.log(`📝 Creating subscription documents for winner ${winnerId}...`);
    await createWinnerSubscriptions(
      winnerId,
      winnerEmail,
      winnerLocation,
      zipCode,
      winningBid,
      now,
    );
    console.log(`✅ Subscription documents created for ${winnerId}`);

    // Update auction with winner info
    console.log(`📝 Updating auction ${zipCode} with winner info...`);
    const winnerUpdate = {
      hasWinner: true,
      winnerId,
      winnerEmail,
      winnerLocation,
      winningBid,
      paymentStatus: "payment_pending",
    };

    await auctionDoc.ref.update(winnerUpdate);
    console.log(`✅ Auction ${zipCode} updated with winner info`);

    // Update enriched data with winner info
    Object.assign(enrichedData, winnerUpdate);

    // Handle payment with recovery on failure
    console.log(`💳 Processing payment for winner ${winnerId}...`);
    const paymentResult = await processPaymentWithRecovery(
      auctionDoc,
      winnerId,
      winnerEmail,
      zipCode,
      winningBid,
      summary,
      now,
    );

    // Update enriched data with payment results
    if (paymentResult) {
      Object.assign(enrichedData, paymentResult);
    }

    summary.auctions.successful++;
    console.log(`✅ Successfully processed auction ${zipCode}`);

    return enrichedData;
  } catch (error) {
    console.error(`❌ Failed to process auction ${zipCode}:`, error);

    summary.auctions.failed++;
    summary.errors.push({
      type: "AUCTION_PROCESSING_FAILED",
      zipCode,
      message: error.message,
      timestamp: now.toDate().toISOString(),
    });

    // Mark auction as failed but ended
    try {
      console.log(`📝 Marking auction ${zipCode} as failed...`);
      const failureUpdate = {
        status: "ended",
        hasWinner: false,
        error: error.message,
        requiresManualIntervention: true,
        endedAt: now,
        updatedAt: now,
      };

      await auctionDoc.ref.update(failureUpdate);
      Object.assign(enrichedData, failureUpdate);
      console.log(`✅ Auction ${zipCode} marked as failed`);
    } catch (updateError) {
      console.error(
        `Failed to mark auction ${zipCode} as failed:`,
        updateError,
      );
    }

    return enrichedData;
  }
}

/**
 * Process payment with automatic recovery on failure
 * Returns payment-related data to be included in enriched auction data
 */
async function processPaymentWithRecovery(
  auctionDoc,
  winnerId,
  winnerEmail,
  zipCode,
  winningBid,
  summary,
  now,
) {
  try {
    console.log(
      `💳 Attempting to charge winner ${winnerId} for ZIP ${zipCode}`,
    );
    console.log(`💳 Amount: $${winningBid / 100}`);

    const chargeResult = await retryAutoCharge(
      winnerId,
      winningBid,
      zipCode,
      `Featured listing for ZIP ${zipCode}`,
      2, // max retries
    );

    if (chargeResult.success) {
      console.log(
        `✅ Payment successful for ZIP ${zipCode}: ${chargeResult.paymentIntentId}`,
      );

      // Update auction with successful payment info
      console.log(`📝 Updating auction ${zipCode} with payment success...`);
      const paymentUpdate = {
        paymentStatus: "paid",
        paymentIntentId: chargeResult.paymentIntentId,
        paidAt: now,
        updatedAt: now,
      };

      await auctionDoc.ref.update(paymentUpdate);
      console.log(`✅ Auction ${zipCode} updated with payment success`);

      // Activate both subscription documents
      console.log(`🎯 Activating winner subscriptions for ${winnerId}...`);
      await activateWinnerSubscriptions(
        winnerId,
        zipCode,
        chargeResult.paymentIntentId,
        now,
      );
      console.log(`✅ Winner subscriptions activated for ${winnerId}`);

      // Send success notification
      console.log(`📧 Sending success notification to ${winnerEmail}...`);
      await sendWinnerSuccessNotification(
        winnerEmail,
        zipCode,
        winningBid,
        chargeResult.paymentIntentId,
      );
      console.log(`✅ Success notification sent to ${winnerEmail}`);

      summary.payments.successful++;

      // Return payment data for enriched auction data
      return paymentUpdate;
    } else {
      console.log(
        `❌ Payment failed for ZIP ${zipCode}: ${chargeResult.error}`,
      );

      // Initiate payment recovery process
      console.log(`🔄 Initiating payment recovery for ${winnerId}...`);
      await handlePaymentFailure(
        auctionDoc,
        winnerId,
        winnerEmail,
        zipCode,
        winningBid,
        summary,
        now,
      );
      console.log(`✅ Payment recovery initiated for ${winnerId}`);

      summary.payments.failed++;

      // Return payment failure data
      return {
        paymentStatus: "failed",
        paymentError: chargeResult.error,
        paymentErrorAt: now,
      };
    }
  } catch (paymentError) {
    console.error(
      `💥 Unexpected error charging winner for ZIP ${zipCode}:`,
      paymentError,
    );

    // Update auction with error info
    console.log(`📝 Updating auction ${zipCode} with payment error...`);
    const errorUpdate = {
      paymentStatus: "failed",
      paymentError: paymentError.message,
      paymentErrorAt: now,
      updatedAt: now,
      requiresManualIntervention: true,
    };

    await auctionDoc.ref.update(errorUpdate);
    console.log(`✅ Auction ${zipCode} updated with payment error`);

    // Send failure notification
    console.log(`📧 Sending payment failure notification to ${winnerEmail}...`);
    await sendPaymentFailureNotification(
      winnerEmail,
      zipCode,
      winningBid,
      paymentError.message,
    );
    console.log(`✅ Payment failure notification sent to ${winnerEmail}`);

    summary.payments.failed++;

    // Return error data
    return errorUpdate;
  }
}

/**
 * Create subscription documents for winner
 */
async function createWinnerSubscriptions(
  winnerId,
  winnerEmail,
  winnerLocation,
  zipCode,
  winningBid,
  now,
) {
  console.log(`📝 ===== CREATING WINNER SUBSCRIPTIONS =====`);
  console.log(`📝 Winner ID: ${winnerId}`);
  console.log(`📝 ZIP Code: ${zipCode}`);
  console.log(`📝 Winning bid: $${winningBid / 100}`);
  console.log(`📝 Winner location: ${winnerLocation}`);

  const subscriptionEndDate = admin.firestore.Timestamp.fromDate(
    getNextAuctionEndDate(),
  );
  console.log(
    `📝 Subscription end date: ${subscriptionEndDate.toDate().toISOString()}`,
  );

  // Create user listing document
  const userListingData = {
    zipCode: zipCode,
    location: winnerLocation,
    endDate: subscriptionEndDate,
    amount: winningBid,
    status: "pending", // Will be activated after payment
    type: "featured",
    createdAt: now,
    updatedAt: now,
    documentSource: "userListing",
    userId: winnerId,
  };

  // Create mirrored zip listing document
  const zipListingData = {
    userId: winnerId,
    location: winnerLocation,
    endDate: subscriptionEndDate,
    status: "pending", // Will be activated after payment
    type: "featured",
    createdAt: now,
    updatedAt: now,
    documentSource: "zipListing",
    zipCode: zipCode,
  };

  console.log(
    `📝 User listing data:`,
    JSON.stringify(userListingData, null, 2),
  );
  console.log(`📝 ZIP listing data:`, JSON.stringify(zipListingData, null, 2));

  const batch = db.batch();

  // Create user listing
  const userListingRef = db
    .collection("users")
    .doc(winnerId)
    .collection("listings")
    .doc(zipCode);

  console.log(`📝 User listing path: ${userListingRef.path}`);
  batch.set(userListingRef, userListingData);

  // Create zip listing (same structure as retirement function expects)
  const zipListingRef = db
    .collection("zips")
    .doc(zipCode)
    .collection("listings")
    .doc(winnerId);

  console.log(`📝 ZIP listing path: ${zipListingRef.path}`);
  batch.set(zipListingRef, zipListingData);

  console.log(`📝 Committing subscription documents batch...`);
  await batch.commit();
  console.log(`✅ Subscription documents committed successfully`);
}

/**
 * Activate winner subscriptions after successful payment
 */
async function activateWinnerSubscriptions(
  winnerId,
  zipCode,
  paymentIntentId,
  now,
) {
  console.log(`🎯 ===== ACTIVATING WINNER SUBSCRIPTIONS =====`);
  console.log(`🎯 Winner ID: ${winnerId}`);
  console.log(`🎯 ZIP Code: ${zipCode}`);
  console.log(`🎯 Payment Intent ID: ${paymentIntentId}`);

  const batch = db.batch();

  // Activate user listing
  const userListingRef = db
    .collection("users")
    .doc(winnerId)
    .collection("listings")
    .doc(zipCode);

  console.log(`🎯 Activating user listing: ${userListingRef.path}`);
  batch.update(userListingRef, {
    status: "active",
    paymentIntentId: paymentIntentId,
    activatedAt: now,
    updatedAt: now,
  });

  // Activate zip listing
  const zipListingRef = db
    .collection("zips")
    .doc(zipCode)
    .collection("listings")
    .doc(winnerId);

  console.log(`🎯 Activating ZIP listing: ${zipListingRef.path}`);
  batch.update(zipListingRef, {
    status: "active",
    paymentIntentId: paymentIntentId,
    activatedAt: now,
    updatedAt: now,
  });

  console.log(`🎯 Committing activation batch...`);
  await batch.commit();
  console.log(`✅ Winner subscriptions activated successfully`);
}

/**
 * Sends success notification to auction winner
 */
async function sendWinnerSuccessNotification(
  winnerEmail,
  zipCode,
  winningBid,
  paymentIntentId,
) {
  try {
    console.log(
      `📧 Sending success notification to ${winnerEmail} for ZIP ${zipCode}`,
    );

    const emailTemplate = getAuctionWinnerEmail(
      winnerEmail,
      zipCode,
      winningBid,
    );
    await db.collection("emails").add(emailTemplate);

    console.log(`✅ Success email queued for ${winnerEmail}`);
  } catch (error) {
    console.error("Failed to send winner success notification:", error);
  }
}

/**
 * Sends payment failure notification to auction winner
 */
async function sendPaymentFailureNotification(
  winnerEmail,
  zipCode,
  winningBid,
  error,
) {
  try {
    console.log(
      `📧 Sending payment failure notification to ${winnerEmail} for ZIP ${zipCode}`,
    );

    const emailTemplate = getPaymentFailureEmail(
      winnerEmail,
      zipCode,
      winningBid,
      error,
    );
    await db.collection("emails").add(emailTemplate);

    console.log(`✅ Payment failure email queued for ${winnerEmail}`);
  } catch (emailError) {
    console.error("Failed to send payment failure notification:", emailError);
  }
}

module.exports = processAuctionWinners;
module.exports.run = run;
