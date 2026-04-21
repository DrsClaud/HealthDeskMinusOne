const functions = require("firebase-functions");
const { stripeClient } = require("../services/stripe");
const { db } = require("../config/firebase");
const { runtimeConfigSecret } = require("../runtimeConfig");

/**
 * Get active subscription for a user
 * @param {string} uid - User ID
 * @returns {Promise<{subscriptionDoc: FirebaseFirestore.QueryDocumentSnapshot, subscriptionData: any}>}
 */
async function getActiveSubscription(uid) {
  const subscriptionsRef = db
    .collection("users")
    .doc(uid)
    .collection("subscriptions");

  const subscriptionQuery = await subscriptionsRef
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (subscriptionQuery.empty) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "No active subscription found",
    );
  }

  const subscriptionDoc = subscriptionQuery.docs[0];
  const subscriptionData = subscriptionDoc.data();

  return { subscriptionDoc, subscriptionData };
}

/**
 * Change a subscription's plan within the same billing cycle
 */
exports.changePlan = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const { subscriptionId, newPriceId, prorate = true } = data;

  try {
    // Get the user's active subscription
    const { subscriptionData } = await getActiveSubscription(context.auth.uid);

    // Verify the subscription ID matches
    if (subscriptionData.subscription !== subscriptionId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Subscription does not belong to authenticated user",
      );
    }

    // Get the subscription from Stripe to check current items
    const subscription =
      await stripeClient.subscriptions.retrieve(subscriptionId);

    // Get the current subscription item ID (we only have one item per subscription)
    const itemId = subscription.items.data[0].id;

    // Update the subscription
    const updatedSubscription = await stripeClient.subscriptions.update(
      subscriptionId,
      {
        items: [
          {
            id: itemId,
            price: newPriceId,
          },
        ],
        proration_behavior: prorate ? "always_invoice" : "none",
      },
    );

    return {
      success: true,
      subscription: updatedSubscription,
    };
  } catch (error) {
    console.error("Error changing subscription plan:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
  });

/**
 * Create a customer portal session with role-specific product configuration and optional deep linking
 *
 * @param {Object} data - The input data object
 * @param {string} data.successUrl - The URL to redirect to after successful completion (e.g., plan change)
 * @param {string} data.cancelUrl - The URL to redirect to when user cancels/exits the portal
 * @param {string} data.role - The user's role (e.g., 'facility', 'patient', 'professional')
 * @param {string} data.stripeId - The user's Stripe customer ID
 * @param {string} [data.flowType] - Optional deep link to specific portal action:
 *   - 'subscription_cancel' - Cancel subscription
 *   - 'subscription_update_confirm' - Update subscription plan
 * @param {Object} [data.flowData] - Data required for specific flow types:
 *   - For 'subscription_update_confirm': { subscription_update_confirm: { subscription: string, items: Array<{id: string, price: string}> } }
 * @param {string} [data.subscriptionId] - Required when flowType is 'subscription_cancel'
 * @returns {Promise<{success: boolean, url: string}>} The portal session URL
 */
exports.createPortalSession = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const uid = context.auth.uid;

  try {
    const {
      successUrl,
      cancelUrl,
      role,
      stripeId,
      flowType,
      flowData,
      subscriptionId,
    } = data;

    if (!role || !stripeId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "User role and stripeId must be provided",
      );
    }

    if (!successUrl || !cancelUrl) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Both successUrl and cancelUrl must be provided",
      );
    }

    // Base configuration for portal features
    const baseFeatures = {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
      },
    };

    let portalProducts = [];

    // Only fetch and configure products if we're updating subscription
    if (flowType === "subscription_update_confirm") {
      // Get all active prices for this role from Firestore
      const plansSnapshot = await db
        .collection("plans")
        .where("active", "==", true)
        .where("role", "==", role)
        .get();

      // Group prices by product
      const productMap = new Map();

      // First pass: collect all recurring prices
      for (const doc of plansSnapshot.docs) {
        const pricesSnapshot = await db
          .collection("plans")
          .doc(doc.id)
          .collection("prices")
          .where("active", "==", true)
          .get();

        pricesSnapshot.forEach((priceDoc) => {
          const priceData = priceDoc.data();

          // Skip one-time prices and only include recurring ones
          if (priceData.type === "one_time" || !priceData.recurring) {
            return;
          }

          if (!productMap.has(doc.id)) {
            productMap.set(doc.id, {
              product: doc.id,
              prices: [],
            });
          }
          productMap.get(doc.id).prices.push(priceDoc.id);
        });
      }

      // Convert map to array and filter out products with no prices
      portalProducts = Array.from(productMap.values()).filter(
        (product) => product.prices.length > 0,
      );
    }

    // Create portal configuration with conditional subscription_update feature
    const configuration =
      await stripeClient.billingPortal.configurations.create({
        features: {
          ...baseFeatures,
          ...(flowType === "subscription_update_confirm" && {
            subscription_update: {
              enabled: true,
              default_allowed_updates: ["price"],
              products: portalProducts,
              proration_behavior: "always_invoice",
            },
          }),
        },
      });

    // Base session parameters - use cancelUrl as default return_url
    const sessionParams = {
      customer: stripeId,
      return_url: cancelUrl,
      configuration: configuration.id,
    };

    // Add flow_data for deep linking if specified
    if (flowType) {
      sessionParams.flow_data = {
        type: flowType,
        after_completion: {
          type: "redirect",
          redirect: {
            return_url: successUrl, // Use successUrl for successful completions
          },
        },
      };

      // Add required params for specific flows
      if (flowType === "subscription_update_confirm") {
        if (!flowData || !flowData.subscription_update_confirm) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "flowData.subscription_update_confirm is required for subscription_update_confirm flow",
          );
        }

        sessionParams.flow_data.subscription_update_confirm = {
          subscription: flowData.subscription_update_confirm.subscription,
          items: flowData.subscription_update_confirm.items,
        };
      } else if (flowType === "subscription_cancel" && subscriptionId) {
        sessionParams.flow_data.subscription_cancel = {
          subscription: subscriptionId,
        };
      }
    }

    // Create the portal session
    const session =
      await stripeClient.billingPortal.sessions.create(sessionParams);

    console.log(
      `Created portal session for user ${uid} with role ${role}${
        flowType ? ` and flow ${flowType}` : ""
      }`,
    );

    return {
      success: true,
      url: session.url,
    };
  } catch (error) {
    console.error("Error creating portal session:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
  });

/**
 * Update seat quantity on an existing subscription
 * This avoids requiring a new checkout - just updates the quantity directly
 */
exports.updateSeatQuantity = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const { quantity } = data;

  if (!quantity || quantity < 1) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Quantity must be at least 1",
    );
  }

  try {
    // Get the user's active subscription
    const { subscriptionDoc, subscriptionData } = await getActiveSubscription(
      context.auth.uid,
    );

    console.log("Subscription doc ID:", subscriptionDoc.id);
    console.log("Subscription data keys:", Object.keys(subscriptionData));
    console.log(
      "subscriptionData.subscription:",
      subscriptionData.subscription,
    );
    console.log("subscriptionData.id:", subscriptionData.id);

    // The Stripe subscription ID might be stored as 'id' or 'subscription' or be the doc ID itself
    const subscriptionId =
      subscriptionData.id ||
      subscriptionData.subscription ||
      subscriptionDoc.id;

    console.log("Using subscription ID:", subscriptionId);

    if (!subscriptionId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Subscription ID not found in subscription data",
      );
    }

    // Get the subscription from Stripe
    const subscription =
      await stripeClient.subscriptions.retrieve(subscriptionId);

    // Get the current subscription item ID
    const itemId = subscription.items.data[0].id;
    const currentQuantity = subscription.items.data[0].quantity;

    // No change needed
    if (currentQuantity === quantity) {
      return {
        success: true,
        message: "No changes needed",
        subscription,
      };
    }

    // Update the subscription quantity
    const updatedSubscription = await stripeClient.subscriptions.update(
      subscriptionId,
      {
        items: [
          {
            id: itemId,
            quantity: quantity,
          },
        ],
        proration_behavior: "always_invoice", // Prorate immediately
        metadata: {
          seatCount: quantity.toString(),
        },
      },
    );

    console.log(
      `Updated subscription ${subscriptionId} quantity from ${currentQuantity} to ${quantity}`,
    );

    // Update organization seat count (if user is part of an organization)
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    if (userDoc.exists && userDoc.data().organizationId) {
      const orgId = userDoc.data().organizationId;
      await db.collection("organizations").doc(orgId).update({
        "seats.total": quantity,
      });
      console.log(`Updated organization ${orgId} total seats to ${quantity}`);
    }

    return {
      success: true,
      previousQuantity: currentQuantity,
      newQuantity: quantity,
      subscription: updatedSubscription,
    };
  } catch (error) {
    console.error("Error updating seat quantity:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
  });

/**
 * Create a unified checkout session that handles both new subscriptions and upgrades
 * This replaces the need for checkout_sessions documents and ensures existing customers
 * don't have to re-enter payment methods
 */
exports.createCheckoutSession = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onCall(
  async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const uid = context.auth.uid;

    try {
      const {
        priceId,
        successUrl,
        cancelUrl,
        mode = "subscription", // 'subscription' or 'payment'
        isUpgrade = false,
        metadata = {},
        stripeId, // Optional: existing Stripe customer ID
        createNew = false, // Optional: force creation of new customer
      } = data;

      if (!priceId || !successUrl || !cancelUrl) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "priceId, successUrl, and cancelUrl are required",
        );
      }

      // Require explicit intent: either use existing customer or create new
      if (!stripeId && !createNew) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Must provide either stripeId (existing customer) or createNew: true",
        );
      }

      let customerId;

      if (stripeId) {
        // Use existing customer
        customerId = stripeId;

        // Check if customer has saved payment methods for debugging
        const paymentMethods = await stripeClient.paymentMethods.list({
          customer: customerId,
          type: "card",
        });

        console.log(
          `Customer ${customerId} has ${paymentMethods.data.length} saved payment methods`,
        );
      } else {
        // Create new customer
        const userDoc = await db.collection("users").doc(uid).get();
        const userData = userDoc.data();

        const customer = await stripeClient.customers.create({
          email: userData?.email,
          metadata: {
            firebaseUID: uid,
          },
        });

        customerId = customer.id;

        // Save customer ID to user document
        await db.collection("users").doc(uid).update({
          stripeId: customerId,
        });
      }

      // Create the checkout session
      const sessionConfig = {
        customer: customerId,
        billing_address_collection: "auto",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          firebaseUID: uid,
          ...metadata,
        },
      };

      // Configure based on mode
      if (mode === "subscription") {
        // For subscriptions, always show payment form
        sessionConfig.payment_method_collection = "always";

        // If this is an upgrade, we might want to prorate
        if (isUpgrade) {
          sessionConfig.subscription_data = {
            proration_behavior: "always_invoice",
          };
        }
      } else if (mode === "payment") {
        // For one-time payments, save payment method for future use
        sessionConfig.payment_intent_data = {
          setup_future_usage: "off_session", // Save for future use
        };

        // Show checkbox to save payment method for future display
        sessionConfig.saved_payment_method_options = {
          payment_method_save: "enabled", // Shows "Save for future purchases" checkbox
          allow_redisplay_filters: ["limited", "always"], // Show existing saved cards
        };
      }

      const session =
        await stripeClient.checkout.sessions.create(sessionConfig);

      console.log(
        `Created checkout session ${
          session.id
        } for user ${uid} with mode ${mode} (${
          stripeId ? "existing customer" : "new customer"
        })`,
      );

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error("Error creating checkout session:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create checkout session",
      );
    }
  },
  );
