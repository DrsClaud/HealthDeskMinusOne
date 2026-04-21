const functions = require("firebase-functions");
const { getDefaultPaymentMethod } = require("../utils/paymentUtils");
const { stripeClient } = require("../services/stripe");
const { runtimeConfigSecret } = require("../runtimeConfig");

/**
 * Get user's default payment method for display in the UI
 * This function retrieves the payment method that will be charged for auction wins
 */
const getUserPaymentMethod = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to get payment method information",
    );
  }

  const userId = context.auth.uid;

  try {
    // Get the user's default payment method
    const { customerId, paymentMethodId } =
      await getDefaultPaymentMethod(userId);

    // Retrieve payment method details from Stripe
    const paymentMethod =
      await stripeClient.paymentMethods.retrieve(paymentMethodId);

    // Return safe payment method info for display
    return {
      success: true,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card
          ? {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              exp_month: paymentMethod.card.exp_month,
              exp_year: paymentMethod.card.exp_year,
            }
          : null,
        billing_details: {
          name: paymentMethod.billing_details?.name || null,
        },
      },
    };
  } catch (error) {
    console.error("Error getting payment method:", error);

    // Return specific error types for better UX
    if (error.message.includes("No Stripe customer ID found")) {
      return {
        success: false,
        error: "no_customer",
        message: "No payment method on file. Please add a promotion first.",
      };
    } else if (error.message.includes("No saved payment methods found")) {
      return {
        success: false,
        error: "no_payment_method",
        message: "No saved payment method found. Please add a promotion first.",
      };
    } else {
      return {
        success: false,
        error: "unknown",
        message: "Unable to retrieve payment information.",
      };
    }
  }
  });

module.exports = getUserPaymentMethod;
