const functions = require("firebase-functions");
const { admin, db } = require("../config/firebase");

// This function will be called via HTTP after email verification
exports.completeEmailUpdate = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  console.log(
    "[completeEmailUpdate] Received request with query params:",
    req.query
  );

  // Get parameters from the request
  const { uid, success } = req.query;

  if (!uid) {
    console.error("[completeEmailUpdate] Missing uid parameter");
    res.status(400).json({ success: false, error: "Missing uid parameter" });
    return;
  }

  if (success !== "true") {
    console.error(
      "[completeEmailUpdate] Success parameter is not true:",
      success
    );
    res
      .status(400)
      .json({ success: false, error: "Invalid success parameter" });
    return;
  }

  try {
    console.log(`[completeEmailUpdate] Getting user record for uid: ${uid}`);

    // Get the user record from Auth
    const userRecord = await admin.auth().getUser(uid);
    const email = userRecord.email;

    console.log(`[completeEmailUpdate] Found user with email: ${email}`);

    // Get the user document to check for pendingEmail
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      console.error(
        `[completeEmailUpdate] User document not found for uid: ${uid}`
      );
      res.status(404).json({
        success: false,
        error: "User not found",
        code: "user_not_found",
      });
      return;
    }

    const userData = userDoc.data();
    console.log(`[completeEmailUpdate] User document data:`, userData);

    // If this was an email change (we had a pendingEmail stored)
    if (userData && userData.pendingEmail) {
      console.log(
        `[completeEmailUpdate] Found pendingEmail: ${userData.pendingEmail}`
      );
      console.log(`[completeEmailUpdate] New verified email: ${email}`);

      // Update the email in the user document
      await db.collection("users").doc(uid).update({
        email: email, // Use the verified email from Auth
        pendingEmail: admin.firestore.FieldValue.delete(), // Remove the pending field
        emailChangeRequested: admin.firestore.FieldValue.delete(), // Remove the timestamp
      });

      console.log(
        `[completeEmailUpdate] User document email updated to: ${email}`
      );

      res.status(200).json({
        success: true,
        email: email,
        code: "email_updated",
      });
    } else {
      console.log(
        `[completeEmailUpdate] No pendingEmail found for user ${uid}`
      );

      res.status(200).json({
        success: false,
        error: "No pending email change found",
        code: "no_pending_email",
      });
    }
  } catch (error) {
    console.error(`[completeEmailUpdate] Error:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: "server_error",
    });
  }
});
