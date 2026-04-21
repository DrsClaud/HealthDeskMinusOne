const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../config/firebase");
const {
  getNextAuctionEndDate,
  getMaxAuctionExtension,
} = require("../utils/dateUtils");
const { isAfter } = require("date-fns");

/**
 * Places a bid on an auction for a specific zip code
 *
 * This function handles the complex logic of placing bids, including:
 * - Verifying the user has an active or pending promotion
 * - Validating bid amounts against current highest bid
 * - Creating the auction if it doesn't exist
 * - Extending auction end time for last-minute bids
 * - Recording bid history
 *
 * @param {Object} data - The bid data
 * @param {string} data.zipCode - The zip code for the auction
 * @param {number} data.bidAmount - The bid amount in cents
 * @param {string} data.userEmail - The user's email (passed from frontend)
 * @param {Object} data.userLocation - The user's location object (passed from frontend)
 * @param {Object} context - The function context containing auth info
 * @returns {Object} - The updated auction data
 */
const placeBid = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to place a bid"
    );
  }

  const { zipCode, bidAmount, userEmail, userLocation } = data;
  const userId = context.auth.uid;

  // Validate required parameters
  if (!zipCode) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "A valid zip code must be provided"
    );
  }

  if (!bidAmount || typeof bidAmount !== "number" || bidAmount <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "A valid bid amount must be provided"
    );
  }

  // Validate user data passed from frontend
  if (!userEmail) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User email is required"
    );
  }

  if (!userLocation) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User location is required"
    );
  }

  try {
    // Check promotion status outside the transaction
    const promotionRef = db
      .collection("zips")
      .doc(String(zipCode))
      .collection("listings")
      .doc(userId);

    const promotionDoc = await promotionRef.get();

    // Validate promotion exists and is of the correct type
    if (!promotionDoc.exists) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "You must have an active or pending promotion to place a bid"
      );
    }

    const promotionData = promotionDoc.data();

    // Check if this listing is a promotion type
    if (!["promotion", "featured"].includes(promotionData.type)) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "You must have an active or pending promotion to place a bid"
      );
    }

    if (!["active", "pending", "invoiced"].includes(promotionData.status)) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Your promotion status (${promotionData.status}) does not allow bidding`
      );
    }

    // Get current time once
    const now = admin.firestore.Timestamp.now();

    // Pre-calculate original end time outside transaction
    const originalEndTime = admin.firestore.Timestamp.fromDate(
      getNextAuctionEndDate()
    );

    // Run auction update in a transaction for data consistency
    return await db.runTransaction(async (transaction) => {
      // We only need the auction reference within the transaction now
      const auctionRef = db.collection("auctions").doc(String(zipCode));

      // Get auction data or create if it doesn't exist
      const auctionDoc = await transaction.get(auctionRef);
      let auctionData;

      if (!auctionDoc.exists) {
        // Create a new auction ending on the 15th of the current or next month at 2PM

        // Create bid history entry for the first bid
        const bidEntry = {
          bidderId: userId,
          userEmail: userEmail,
          location: userLocation,
          amount: bidAmount,
          timestamp: now,
        };

        auctionData = {
          zipCode: String(zipCode),
          currentBid: bidAmount,
          startingPrice: 100000,
          startTime: now,
          endTime: originalEndTime,
          lastBidder: userId,
          lastBidderEmail: userEmail,
          lastBidderLocation: userLocation,
          numberOfBids: 1,
          bidHistory: [bidEntry],
          status: "active",
          createdAt: now,
          updatedAt: now,
        };
      } else {
        auctionData = auctionDoc.data();

        // Check if auction has ended
        if (
          auctionData.status !== "active" ||
          isAfter(now.toDate(), auctionData.endTime.toDate())
        ) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "This auction has ended"
          );
        }

        // Validate bid amount against current highest
        const minimumBid = auctionData.currentBid
          ? auctionData.currentBid + 500 // $5 increment in cents
          : auctionData.startingPrice;

        if (bidAmount < minimumBid) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            `Bid must be at least $${(minimumBid / 100).toFixed(2)}`
          );
        }
      }

      // Check for auction extension (if bid is placed in last 1 minute)
      const EXTENSION_THRESHOLD_MS = 1 * 60 * 1000; // 1 minute
      const EXTENSION_AMOUNT_MS = 1 * 60 * 1000; // Extend by 1 minute

      if (
        auctionData.endTime.toMillis() - now.toMillis() <
        EXTENSION_THRESHOLD_MS
      ) {
        // Calculate the new end time (current end time + 1 minute)
        let newEndTime = auctionData.endTime.toMillis() + EXTENSION_AMOUNT_MS;

        // Check if extension would exceed maximum allowed
        const ABSOLUTE_MAX_END_TIME =
          originalEndTime.toMillis() + getMaxAuctionExtension();

        if (newEndTime > ABSOLUTE_MAX_END_TIME) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Auction has reached maximum extension time"
          );
        }

        console.log(
          `Auction for ${zipCode} extended to ${new Date(newEndTime)}`
        );

        // Set the new end time
        auctionData.endTime = admin.firestore.Timestamp.fromMillis(newEndTime);
      }

      // Create bid history entry
      const bidEntry = {
        bidderId: userId,
        userEmail: userEmail,
        location: userLocation,
        amount: bidAmount,
        timestamp: now,
      };

      // Update auction data
      auctionData.currentBid = bidAmount;
      auctionData.lastBidder = userId;
      auctionData.lastBidderEmail = userEmail;
      auctionData.lastBidderLocation = userLocation;

      // Only increment numberOfBids and add to bidHistory if this is an existing auction
      if (auctionDoc.exists) {
        auctionData.numberOfBids = (auctionData.numberOfBids || 0) + 1;
        auctionData.bidHistory = [...(auctionData.bidHistory || []), bidEntry];
      }

      auctionData.updatedAt = now;

      // Write the updated auction data
      transaction.set(auctionRef, auctionData);

      return {
        success: true,
        auction: {
          zipCode: auctionData.zipCode,
          currentBid: auctionData.currentBid,
          endTime: auctionData.endTime,
          isWinning: true,
          numberOfBids: auctionData.numberOfBids,
        },
      };
    });
  } catch (error) {
    console.error("Error placing bid:", error);
    // Preserve original error type and message
    if (error instanceof functions.https.HttpsError) {
      throw error; // Already properly formatted error
    }
    throw new functions.https.HttpsError(
      "internal",
      `Failed to place bid: ${error.message}`
    );
  }
});

module.exports = placeBid;
