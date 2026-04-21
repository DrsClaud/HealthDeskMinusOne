const functions = require("firebase-functions");
const { mailchimpClient } = require("./client");
const { handleMailchimpError, generateSubscriberHash } = require("./utils");
const { VALID_ROLES, getMailchimpConfig } = require("./constants");
const { runtimeConfigSecret } = require("../../runtimeConfig");

exports.mailchimpSubscribe = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    const { email, name, lastName, role } = snap.data();

    if (!email) {
      functions.logger.warn("No email provided for new user");
      return;
    }

    try {
      const { listId } = getMailchimpConfig();
      const response = await mailchimpClient.lists.addListMember(
        listId,
        {
          email_address: email,
          status: "subscribed",
          tags: [role],
          merge_fields: {
            FNAME: name || "", // Ensure name is never undefined
            LNAME: lastName || "", // Add last name to merge fields
          },
        },
      );

      functions.logger.info(`Successfully subscribed ${email} to Mailchimp`);
      return response;
    } catch (error) {
      handleMailchimpError(error, "subscription", email);
    }
  });

exports.mailchimpUpdate = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .firestore
  .document("users/{userId}/subscriptions/{pushId}")
  .onWrite(async (change, context) => {
    // Handle deletions
    if (!change.after.exists) {
      functions.logger.info("Subscription document deleted, no action needed");
      return;
    }

    const { role, status } = change.after.data();

    // Early return if invalid role or non-active status
    if (!VALID_ROLES.includes(role) || status !== "active") {
      functions.logger.info(
        `Skipping update for role: ${role}, status: ${status}`,
      );
      return;
    }

    try {
      const { listId } = getMailchimpConfig();
      const userDoc = await change.after.ref.parent.parent.get();
      const email = userDoc.data()?.email;

      if (!email) {
        functions.logger.error("No email found for user");
        return;
      }

      const subscriberHash = generateSubscriberHash(email);
      const response = await mailchimpClient.lists.updateListMember(
        listId,
        subscriberHash,
        {
          tags: [role, "subscribed"],
        },
      );

      functions.logger.info(`Successfully updated ${email} in Mailchimp`);
      return response;
    } catch (error) {
      handleMailchimpError(error, "update", email);
    }
  });
