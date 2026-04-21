const { stripeClient } = require("../services/stripe");
const { db } = require("../config/firebase");

/**
 * Get a user's default payment method for auto-charging
 * @param {string} userId - Firebase user ID
 * @returns {Promise<{customerId: string, paymentMethodId: string}>} - Stripe customer and payment method IDs
 * @throws {Error} If no payment method found
 */
async function getDefaultPaymentMethod(userId) {
  // Get user document to find their Stripe customer ID
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new Error(`User ${userId} not found`);
  }

  const userData = userDoc.data();
  const customerId = userData.stripeId;

  if (!customerId) {
    throw new Error(`No Stripe customer ID found for user ${userId}`);
  }

  // Get saved payment methods for this customer
  const paymentMethods = await stripeClient.paymentMethods.list({
    customer: customerId,
    type: "card",
  });

  if (paymentMethods.data.length === 0) {
    throw new Error(`No saved payment methods found for user ${userId}`);
  }

  // Use the first (most recent) payment method as default
  const defaultPaymentMethod = paymentMethods.data[0];

  return {
    customerId,
    paymentMethodId: defaultPaymentMethod.id,
  };
}

/**
 * Auto-charge a user for an auction win
 * @param {string} userId - Firebase user ID
 * @param {number} amount - Amount in cents
 * @param {string} zipCode - ZIP code for the auction
 * @param {string} description - Description for the charge
 * @returns {Promise<{success: boolean, paymentIntentId?: string, error?: string}>}
 */
async function autoChargeAuctionWinner(userId, amount, zipCode, description) {
  try {
    console.log(`Attempting to auto-charge user ${userId} for ${amount} cents`);

    const { customerId, paymentMethodId } = await getDefaultPaymentMethod(
      userId
    );

    // Create payment intent with off_session flag for auto-charging
    const paymentIntent = await stripeClient.paymentIntents.create({
      customer: customerId,
      payment_method: paymentMethodId,
      amount: amount,
      currency: "usd",
      description: description,
      off_session: true, // They're not in a checkout flow
      confirm: true, // Automatically confirm the payment
      metadata: {
        userId: userId,
        zipCode: zipCode,
        type: "auction_win",
        source: "auto_charge",
      },
    });

    console.log(`Payment intent created successfully: ${paymentIntent.id}`);

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error(`Auto-charge failed for user ${userId}:`, error);

    // Stripe-specific error handling
    if (error.type === "StripeCardError") {
      return {
        success: false,
        error: `Card declined: ${error.message}`,
        code: error.code,
      };
    } else if (error.type === "StripeAuthenticationError") {
      return {
        success: false,
        error: "Authentication required for this card",
        code: error.code,
      };
    } else {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * Retry payment with exponential backoff
 * @param {string} userId - Firebase user ID
 * @param {number} amount - Amount in cents
 * @param {string} zipCode - ZIP code for the auction
 * @param {string} description - Description for the charge
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<{success: boolean, paymentIntentId?: string, error?: string}>}
 */
async function retryAutoCharge(
  userId,
  amount,
  zipCode,
  description,
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Auto-charge attempt ${attempt} for user ${userId}`);

    const result = await autoChargeAuctionWinner(
      userId,
      amount,
      zipCode,
      description
    );

    if (result.success) {
      return result;
    }

    // Don't retry for certain error types
    if (
      result.code === "card_declined" ||
      result.code === "insufficient_funds"
    ) {
      console.log(`Permanent failure for user ${userId}: ${result.error}`);
      return result;
    }

    // Wait before retrying (exponential backoff: 1s, 2s, 4s)
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: `Auto-charge failed after ${maxRetries} attempts`,
  };
}

module.exports = {
  getDefaultPaymentMethod,
  autoChargeAuctionWinner,
  retryAutoCharge,
};
