const functions = require("firebase-functions");
const { twilioClient } = require("./client");
const { handleTwilioError } = require("./utils");
const { twilioWebhook } = require("./webhook");
const { runtimeConfigSecret, getRuntimeConfig } = require("../../runtimeConfig");

// Export the webhook handler
exports.twilioWebhook = twilioWebhook;

exports.createTwilioMessage = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .firestore
  .document("messages/{pushId}")
  .onCreate(async (snap, context) => {
    const messageData = snap.data();

    try {
      const cfg = getRuntimeConfig();
      // Construct message object
      const messagePayload = {
        from: cfg.twilio.phone,
        to: messageData.to,
        body: messageData.body,
      };

      if (messageData.images) {
        messagePayload.mediaUrl = messageData.images;
      }

      // Send message and await response
      const message = await twilioClient.messages.create(messagePayload);

      // Update document with delivery details
      await snap.ref.set(
        {
          messageSid: message.sid,
          status: message.status,
          dateCreated: message.dateCreated,
          dateSent: message.dateSent,
          dateUpdated: message.dateUpdated,
          messagingServiceSid: message.messagingServiceSid,
          numMedia: message.numMedia,
          numSegments: message.numSegments,
        },
        { merge: true },
      );

      functions.logger.info(
        `Delivered message: ${snap.ref.path} successfully. MessageSid: ${message.sid}`,
      );

      return message;
    } catch (error) {
      const userError = handleTwilioError(error);

      // Update document with error
      await snap.ref.set(
        {
          error: userError,
          status: "failed",
        },
        { merge: true },
      );

      functions.logger.error("Error sending Twilio message:", error);
      throw new functions.https.HttpsError("internal", userError);
    }
  });
