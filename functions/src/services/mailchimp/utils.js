const crypto = require("crypto");
const functions = require("firebase-functions");

exports.generateSubscriberHash = (email) => {
  return crypto.createHash("md5").update(email.toLowerCase()).digest("hex");
};

exports.handleMailchimpError = (error, operation, email) => {
  functions.logger.error(`Mailchimp ${operation} failed for ${email}:`, error);
  throw new functions.https.HttpsError(
    "internal",
    `Mailchimp ${operation} failed`
  );
};
