const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../config/firebase");
const { stripeClient } = require("../services/stripe");
const {
  getNextAuctionEndDate,
  getPromotionEndDate,
} = require("../utils/dateUtils");
const {
  getPromotionActivationEmail,
  getAuctionWinnerEmail,
} = require("../templates/emailTemplates");
const { runtimeConfigSecret, getRuntimeConfig } = require("../runtimeConfig");

/**
 * Processes successful Stripe payments for promotions AND auction recovery invoices
 *
 * This function is triggered by Stripe webhooks for:
 * 1. checkout.session.completed - Immediate promotion payments via Checkout (primary)
 * 2. payment_intent.succeeded - Immediate promotion payments (fallback)
 * 3. invoice.payment_succeeded - Auction recovery payments
 */
const processPayment = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onRequest(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const webhookSecret = getRuntimeConfig().stripe.auction_webhook_secret;

  try {
    // Verify the webhook signature
    let event;
    try {
      event = stripeClient.webhooks.constructEvent(
        req.rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Process different event types
    if (event.type === "payment_intent.succeeded") {
      return await handlePromotionPayment(event, res);
    } else if (event.type === "checkout.session.completed") {
      // For checkout sessions, we need to get the payment intent
      const session = event.data.object;
      if (session.metadata?.type === "promotion" && session.payment_intent) {
        console.log(`Processing promotion checkout session: ${session.id}`);
        const paymentIntent = await stripeClient.paymentIntents.retrieve(
          session.payment_intent,
        );
        // Preserve session metadata since payment intent metadata might be empty
        paymentIntent.metadata = {
          ...paymentIntent.metadata,
          ...session.metadata,
        };
        const syntheticEvent = { ...event, data: { object: paymentIntent } };
        return await handlePromotionPayment(syntheticEvent, res);
      }
      console.log(`Skipping non-promotion checkout session: ${session.id}`);
      return res.status(200).send({ received: true });
    } else if (event.type === "invoice.payment_succeeded") {
      return await handleInvoicePayment(event, res);
    } else {
      console.log(`Skipping event type: ${event.type}`);
      return res.status(200).send({ received: true });
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    return res.status(500).send({ error: error.message });
  }
  });

/**
 * Handles immediate promotion payments from Stripe Checkout
 * @param {Object} event - Stripe payment_intent.succeeded event
 * @param {Object} res - Express response object
 */
async function handlePromotionPayment(event, res) {
  const paymentIntent = event.data.object;
  const metadata = paymentIntent.metadata;

  console.log(`Processing promotion payment: ${paymentIntent.id}`);

  // Check if this is a promotion payment
  if (metadata.type !== "promotion") {
    console.log(`Skipping non-promotion payment: ${paymentIntent.id}`);
    return res.status(200).send({ received: true });
  }

  const { zipCode, userId, location } = metadata;
  const amount = paymentIntent.amount; // Amount in cents

  if (!zipCode || !userId) {
    console.error("Missing required metadata for promotion payment");
    return res.status(400).send({ error: "Missing promotion metadata" });
  }

  try {
    // Get user data for email notification
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.error(`User ${userId} not found`);
      return res.status(404).send({ error: "User not found" });
    }

    const userData = userDoc.data();
    const userEmail = userData.email;

    // Calculate promotion expiration - Next NEXT auction end date to cover both auction and potential win period
    const endDate = admin.firestore.Timestamp.fromDate(getPromotionEndDate());
    const now = admin.firestore.Timestamp.now();

    // Create listing data with type "promotion"
    const listingData = {
      type: "promotion",
      status: "active",
      userId: userId,
      location: location || userData.location,
      zipCode: zipCode,
      createdAt: now,
      activatedAt: now,
      updatedAt: now,
      endDate: endDate,
      amount: amount,
      documentSource: "userListing",
    };

    // Create batch to update both locations
    const batch = db.batch();

    // Update user's listings collection
    const userListingRef = db
      .collection("users")
      .doc(userId)
      .collection("listings")
      .doc(zipCode);

    batch.set(userListingRef, listingData, { merge: true });

    // Update zip's listings collection
    const zipListingRef = db
      .collection("zips")
      .doc(zipCode)
      .collection("listings")
      .doc(userId);

    const zipListingData = {
      type: "promotion",
      status: "active",
      userId: userId,
      location: location || userData.location,
      zipCode: zipCode,
      createdAt: now,
      endDate: endDate,
      updatedAt: now,
      documentSource: "zipListing",
    };

    batch.set(zipListingRef, zipListingData, { merge: true });

    // Send confirmation email
    const emailRef = db.collection("emails").doc();
    const emailTemplate = getPromotionActivationEmail(
      userEmail,
      zipCode,
      amount,
      endDate,
    );
    batch.set(emailRef, emailTemplate);

    // Commit all updates
    await batch.commit();

    console.log(
      `Successfully activated promotion for ${userId} in ZIP ${zipCode}`,
    );
    return res.status(200).send({ success: true });
  } catch (error) {
    console.error("Error processing promotion payment:", error);
    return res.status(500).send({ error: error.message });
  }
}

/**
 * Handles auction recovery invoice payments
 * @param {Object} event - Stripe invoice.payment_succeeded event
 * @param {Object} res - Express response object
 */
async function handleInvoicePayment(event, res) {
  const invoice = event.data.object;

  console.log(`Processing invoice payment: ${invoice.id}`);

  // Check if this is an auction recovery invoice
  if (invoice.metadata?.type !== "auction_recovery") {
    console.log(`Skipping non-auction-recovery invoice: ${invoice.id}`);
    return res.status(200).send({ received: true });
  }

  const { zipCode, userId } = invoice.metadata;

  if (!zipCode || !userId) {
    console.error("Missing required metadata for auction recovery invoice");
    return res.status(400).send({ error: "Missing auction recovery metadata" });
  }

  try {
    const now = admin.firestore.Timestamp.now();

    console.log(
      `💰 Recovery payment successful for ZIP ${zipCode}, user ${userId}`,
    );

    // Update auction as paid
    await db.collection("auctions").doc(zipCode).update({
      paymentStatus: "paid",
      paymentIntentId: invoice.payment_intent,
      paidAt: now,
      recoveredAfterFailure: true,
      updatedAt: now,
    });

    // Activate the winner's subscriptions
    await activateWinnerSubscriptions(
      userId,
      zipCode,
      invoice.payment_intent,
      now,
    );

    // Get auction data for notification
    const auctionDoc = await db.collection("auctions").doc(zipCode).get();
    const auctionData = auctionDoc.data();

    // Send success notification
    await sendWinnerSuccessNotification(
      auctionData.winnerEmail,
      zipCode,
      auctionData.winningBid,
      invoice.payment_intent,
    );

    // Log the successful recovery
    await db.collection("payment_events").add({
      type: "recovery_payment_completed",
      zipCode,
      userId,
      invoiceId: invoice.id,
      paymentIntentId: invoice.payment_intent,
      amount: invoice.amount_paid,
      timestamp: now,
    });

    console.log(
      `✅ Successfully processed recovery payment for ZIP ${zipCode}`,
    );
    return res.status(200).send({ success: true });
  } catch (error) {
    console.error("Error processing auction recovery payment:", error);
    return res.status(500).send({ error: error.message });
  }
}

/**
 * Activate winner subscriptions after successful payment
 */
async function activateWinnerSubscriptions(
  userId,
  zipCode,
  paymentIntentId,
  now,
) {
  const batch = db.batch();

  // Activate user subscription
  const userSubscriptionRef = db
    .collection("users")
    .doc(userId)
    .collection("listings")
    .doc(zipCode);

  batch.update(userSubscriptionRef, {
    status: "active",
    paymentIntentId: paymentIntentId,
    activatedAt: now,
    updatedAt: now,
  });

  // Activate zip subscription
  const zipSubscriptionRef = db
    .collection("zip_subscriptions")
    .doc(zipCode)
    .collection("subscriptions")
    .doc(userId);

  batch.update(zipSubscriptionRef, {
    status: "active",
    paymentIntentId: paymentIntentId,
    activatedAt: now,
    updatedAt: now,
  });

  await batch.commit();
}

/**
 * Send success notification to auction winner
 */
async function sendWinnerSuccessNotification(
  winnerEmail,
  zipCode,
  winningBid,
  paymentIntentId,
) {
  try {
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

module.exports = processPayment;
