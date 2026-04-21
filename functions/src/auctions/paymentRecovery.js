const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../config/firebase");
const { stripeClient } = require("../services/stripe");
const { runtimeConfigSecret } = require("../runtimeConfig");

/**
 * Handle payment failure with 48-hour recovery period
 */
async function handlePaymentFailure(
  auctionDoc,
  winnerId,
  winnerEmail,
  zipCode,
  winningBid,
  summary,
  now,
) {
  console.log(
    `💳 Payment failed for ZIP ${zipCode} - starting 48h recovery process`,
  );

  try {
    // Get user's Stripe customer ID
    const userDoc = await db.collection("users").doc(winnerId).get();
    const userData = userDoc.data();
    const stripeCustomerId = userData.stripeCustomerId;

    if (!stripeCustomerId) {
      throw new Error(`No Stripe customer ID found for user ${winnerId}`);
    }

    // Create invoice with 48-hour due date
    const invoice = await stripeClient.invoices.create({
      customer: stripeCustomerId,
      description: `Featured listing for ZIP ${zipCode}`,
      metadata: {
        type: "auction_recovery",
        zipCode: zipCode,
        userId: winnerId,
        originalAuctionDate: now.toDate().toISOString(),
        recoveryDeadline: new Date(
          Date.now() + 48 * 60 * 60 * 1000,
        ).toISOString(),
      },
      auto_advance: false, // Don't auto-finalize
      collection_method: "send_invoice",
      days_until_due: 2, // 48 hours
    });

    // Add line item for the auction win
    await stripeClient.invoiceItems.create({
      customer: stripeCustomerId,
      invoice: invoice.id,
      amount: winningBid,
      currency: "usd",
      description: `Featured listing for ZIP ${zipCode} - Auction Winner`,
    });

    // Finalize and send the invoice
    const finalizedInvoice = await stripeClient.invoices.finalizeInvoice(
      invoice.id,
    );
    await stripeClient.invoices.sendInvoice(invoice.id);

    // Update auction with recovery status
    await auctionDoc.ref.update({
      paymentStatus: "recovery_pending",
      paymentRecoveryInvoiceId: invoice.id,
      paymentRecoveryUrl: finalizedInvoice.hosted_invoice_url,
      paymentRecoveryDeadline: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 48 * 60 * 60 * 1000),
      ),
      paymentRecoveryStarted: now,
      updatedAt: now,
    });

    // Send recovery email with payment link
    await sendPaymentRecoveryEmail(
      winnerEmail,
      zipCode,
      winningBid,
      finalizedInvoice.hosted_invoice_url,
      finalizedInvoice.id,
    );

    // Schedule function to check payment status after 48 hours
    await schedulePaymentRecoveryCheck(zipCode, winnerId, invoice.id, 48);

    console.log(
      `✅ Payment recovery initiated for ZIP ${zipCode}, invoice: ${invoice.id}`,
    );
    summary.payments.recoveryInitiated =
      (summary.payments.recoveryInitiated || 0) + 1;
  } catch (error) {
    console.error(
      `❌ Failed to initiate payment recovery for ZIP ${zipCode}:`,
      error,
    );

    // Fall back to marking as failed
    await auctionDoc.ref.update({
      paymentStatus: "failed",
      paymentError: error.message,
      requiresManualIntervention: true,
      updatedAt: now,
    });

    summary.payments.recoveryFailed =
      (summary.payments.recoveryFailed || 0) + 1;
  }
}

/**
 * Send payment recovery email with Stripe-hosted payment link
 */
async function sendPaymentRecoveryEmail(
  winnerEmail,
  zipCode,
  winningBid,
  paymentUrl,
  invoiceId,
) {
  const emailTemplate = {
    to: winnerEmail,
    template: {
      name: "payment-recovery",
      data: {
        zipCode,
        amount: winningBid / 100,
        paymentUrl, // Stripe-hosted page
        invoiceId,
        deadline: "48 hours",
        deadlineDate: new Date(
          Date.now() + 48 * 60 * 60 * 1000,
        ).toLocaleDateString(),
      },
    },
    // Basic email content if template system not ready
    subject: `Action Required: Complete Payment for ZIP ${zipCode}`,
    html: `
      <h2>Payment Required for Your Auction Win</h2>
      <p>Congratulations! You won the auction for ZIP ${zipCode} with a bid of $${
        winningBid / 100
      }.</p>
      <p>However, your payment could not be processed. Please complete payment within 48 hours.</p>
      
      <div style="margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <h3>Payment Details:</h3>
        <p><strong>ZIP Code:</strong> ${zipCode}</p>
        <p><strong>Amount:</strong> $${winningBid / 100}</p>
        <p><strong>Deadline:</strong> ${new Date(
          Date.now() + 48 * 60 * 60 * 1000,
        ).toLocaleString()}</p>
      </div>
      
      <p><a href="${paymentUrl}" style="background: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        Complete Payment Now
      </a></p>
      
      <p><em>If you don't complete payment within 48 hours, your listing will be cancelled and the auction slot will become available again.</em></p>
      
      <p>Questions? Reply to this email.</p>
    `,
  };

  await db.collection("emails").add(emailTemplate);
}

/**
 * Schedule a check to see if payment was completed after 48 hours
 */
async function schedulePaymentRecoveryCheck(
  zipCode,
  winnerId,
  invoiceId,
  hoursDelay,
) {
  await db.collection("payment_recovery_checks").add({
    zipCode,
    winnerId,
    invoiceId,
    checkAfter: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + hoursDelay * 60 * 60 * 1000),
    ),
    status: "pending",
    createdAt: admin.firestore.Timestamp.now(),
  });
}

/**
 * Function to process payment recovery results (run daily)
 */
const processPaymentRecoveryResults = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .pubsub
  .schedule("0 10 * * *") // Run daily at 10 AM
  .timeZone("America/New_York")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    // Find recovery checks that are due
    const dueChecks = await db
      .collection("payment_recovery_checks")
      .where("status", "==", "pending")
      .where("checkAfter", "<=", now)
      .get();

    console.log(`Processing ${dueChecks.size} payment recovery checks`);

    for (const checkDoc of dueChecks.docs) {
      const checkData = checkDoc.data();
      await processIndividualRecoveryCheck(checkDoc, checkData);
    }
  });

/**
 * Check if individual payment recovery was successful
 */
async function processIndividualRecoveryCheck(checkDoc, checkData) {
  const { zipCode, winnerId, invoiceId } = checkData;

  try {
    // Check invoice status in Stripe
    const invoice = await stripeClient.invoices.retrieve(invoiceId);

    if (invoice.status === "paid") {
      console.log(
        `✅ Recovery payment successful for ZIP ${zipCode} - payment handled by webhook`,
      );

      // Mark check as completed (actual activation handled by webhook)
      await checkDoc.ref.update({
        status: "completed_paid",
        completedAt: admin.firestore.Timestamp.now(),
      });
    } else {
      console.log(
        `❌ Recovery payment failed for ZIP ${zipCode}, final status: ${invoice.status}`,
      );

      // Mark auction as definitively failed
      await db.collection("auctions").doc(zipCode).update({
        paymentStatus: "recovery_failed",
        finalPaymentFailure: true,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // For beta: just log it. Later: implement abuse tracking
      console.log(
        `📊 BETA: User ${winnerId} failed to complete payment for ZIP ${zipCode}`,
      );

      // Send final failure notification
      await sendFinalPaymentFailureNotification(zipCode, winnerId);

      // Mark check as completed
      await checkDoc.ref.update({
        status: "completed_failed",
        completedAt: admin.firestore.Timestamp.now(),
      });
    }
  } catch (error) {
    console.error(`Error checking recovery for ZIP ${zipCode}:`, error);

    // Mark check for retry
    await checkDoc.ref.update({
      status: "error",
      error: error.message,
      retryAfter: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 60 * 60 * 1000), // Retry in 1 hour
      ),
    });
  }
}

/**
 * Send final notification when payment recovery fails
 */
async function sendFinalPaymentFailureNotification(zipCode, winnerId) {
  try {
    const userDoc = await db.collection("users").doc(winnerId).get();
    const userEmail = userDoc.data().email;

    const emailTemplate = {
      to: userEmail,
      subject: `Auction Listing Cancelled - ZIP ${zipCode}`,
      html: `
        <h2>Auction Listing Cancelled</h2>
        <p>Your payment for ZIP ${zipCode} was not completed within the 48-hour deadline.</p>
        <p>Your listing has been cancelled and the auction slot is now available for other users.</p>
        <p>You can participate in future auctions by ensuring your payment method is up to date.</p>
        <p>Questions? Reply to this email.</p>
      `,
    };

    await db.collection("emails").add(emailTemplate);
  } catch (error) {
    console.error(`Failed to send final failure notification:`, error);
  }
}

module.exports = {
  handlePaymentFailure,
  processPaymentRecoveryResults,
};
