const functions = require("firebase-functions");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const cors = require("cors")({ origin: true });
const { differenceInHours } = require("date-fns");
const { runtimeConfigSecret, getRuntimeConfig } = require("../runtimeConfig");

// Get config values from Firebase environment
function getJwtSecret() {
  return getRuntimeConfig().kijabe?.jwt_secret;
}

// Kijabe user rate limiting constants
const KIJABE_RATE_LIMITS = {
  default: 10, // Default limit for Kijabe users
  basic: 10, // Free tier
  standard: 20, // Standard tier
  premium: 30, // Premium tier
  admin: 50, // Admin tier
};
const RESET_PERIOD_HOURS = 24;

/**
 * Firebase function to validate JWT tokens from Kijabe
 * and authenticate users in Firebase
 */
exports.kijabeLogin = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onRequest((req, res) => {
  return cors(req, res, async () => {
    console.log("==== kijabeLogin function started ====");
    try {
      const token = req.query.token;

      console.log(
        "Token received:",
        token ? `${token.substring(0, 15)}...` : "No token",
      );

      if (!token) {
        console.error("Missing token in request");
        return res.status(400).json({ error: "Missing token" });
      }

      // Verify the JWT token from Kijabe
      const JWT_SECRET = getJwtSecret();
      console.log(
        "Attempting to verify JWT with secret:",
        `${JWT_SECRET.substring(0, 3)}...`,
      );
      const decoded = jwt.verify(token, JWT_SECRET);

      console.log("JWT successfully verified, user info:", {
        id: decoded.user_id,
        email: decoded.email,
        name: decoded.display_name,
        tier: decoded.user_tier,
      });

      if (!decoded.user_id || !decoded.email) {
        console.error("Invalid token payload:", decoded);
        return res.status(400).json({ error: "Invalid token payload" });
      }

      // NO FIREBASE LOOKUP - Using direct login approach
      console.log(
        "Skipping Firebase user lookup/creation - using direct login approach",
      );

      // Create an HMAC signature of the email to verify it hasn't been tampered with
      const crypto = require("crypto");
      const signature = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(decoded.email)
        .digest("hex");

      console.log("Generated HMAC signature for email");

      // Return user info with signature for frontend to handle
      const responseData = {
        userEmail: decoded.email,
        displayName: decoded.display_name || "",
        userId: decoded.user_id,
        userTier: decoded.user_tier || "basic",
        signature: signature,
        useDirectLogin: true,
      };

      console.log(
        "Sending direct login response:",
        JSON.stringify(responseData, null, 2),
      );
      res.json(responseData);
    } catch (error) {
      console.error("Authentication error details:", error);

      // Provide more descriptive error messages
      let errorMessage = "Authentication failed";

      if (
        error.code === "auth/argument-error" ||
        error.code === "auth/invalid-credential"
      ) {
        errorMessage = "Invalid authentication token format";
      } else if (
        error.name === "JsonWebTokenError" &&
        error.message === "invalid signature"
      ) {
        errorMessage =
          "The JWT secret in WordPress doesn't match the server. Please check your HealthDesk settings in WordPress admin.";
      } else if (
        error.code === "auth/invalid-token" ||
        error.message.includes("jwt")
      ) {
        errorMessage =
          "Invalid JWT token - check if JWT_SECRET matches between Kijabe and Firebase";
      } else if (
        error.message.includes("Permission") &&
        error.message.includes("iam.serviceAccounts.signBlob")
      ) {
        errorMessage =
          "Firebase service account lacks required permissions. The service account needs the Service Account Token Creator role";
      } else {
        // Include the original error for debugging
        errorMessage = `${errorMessage}: ${error.message}`;
      }

      console.log("Sending error response:", errorMessage);
      res
        .status(401)
        .json({ error: errorMessage, originalError: error.message });
    }
  });
});

// Alternative direct authentication that doesn't require custom tokens
exports.kijabeLoginDirect = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onRequest((req, res) => {
  return cors(req, res, async () => {
    console.log("==== kijabeLoginDirect function started ====");
    try {
      const token = req.query.token;

      console.log(
        "Token received:",
        token ? `${token.substring(0, 15)}...` : "No token",
      );

      if (!token) {
        console.error("Missing token in request");
        return res.status(400).json({ error: "Missing token" });
      }

      // Verify the JWT token from Kijabe
      const JWT_SECRET = getJwtSecret();
      console.log(
        "Attempting to verify JWT with secret:",
        `${JWT_SECRET.substring(0, 3)}...`,
      );
      const decoded = jwt.verify(token, JWT_SECRET);

      console.log("JWT successfully verified, user info:", {
        email: decoded.email,
        name: decoded.display_name,
        id: decoded.user_id,
        tier: decoded.user_tier,
      });

      if (!decoded.user_id || !decoded.email) {
        console.error("Invalid token payload:", decoded);
        return res.status(400).json({ error: "Invalid token payload" });
      }

      // Instead of trying to generate a Firebase token, just pass user info to the frontend
      // Create an HMAC signature of the email to verify it hasn't been tampered with
      const crypto = require("crypto");
      const signature = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(decoded.email)
        .digest("hex");

      console.log("Generated HMAC signature for email");

      // Return user info with signature for frontend to handle
      const responseData = {
        userEmail: decoded.email,
        displayName: decoded.display_name || "",
        userId: decoded.user_id,
        userTier: decoded.user_tier || "basic",
        signature: signature,
        useDirectLogin: true,
      };

      console.log(
        "Sending direct login response:",
        JSON.stringify(responseData, null, 2),
      );
      res.json(responseData);
    } catch (error) {
      console.error("Authentication error:", error);

      // Provide more descriptive error messages
      let errorMessage = "Authentication failed";

      if (
        error.name === "JsonWebTokenError" &&
        error.message === "invalid signature"
      ) {
        errorMessage =
          "The JWT secret in WordPress doesn't match the server. Please check your HealthDesk settings in WordPress admin.";
      } else {
        errorMessage = errorMessage + ": " + error.message;
      }

      res.status(401).json({ error: errorMessage });
    }
  });
});

// Debug endpoint to check the service account identity
exports.checkServiceAccount = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const cfg = getRuntimeConfig();
      // Get the service account email from the environment
      const serviceAccountEmail =
        cfg.service_account?.email ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        "Unknown (using default)";

      // Check if admin SDK is initialized
      const isInitialized = admin.apps.length > 0;

      // Return service account info for debugging
      res.json({
        serviceAccount: serviceAccountEmail,
        isAdminInitialized: isInitialized,
        projectId: process.env.GCLOUD_PROJECT || admin.app().options.projectId,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          functionRegion: process.env.FUNCTION_REGION,
        },
        suggestion:
          "Make sure this service account has the 'Service Account Token Creator' role",
      });
    } catch (error) {
      console.error("Error checking service account:", error);
      res.status(500).json({ error: "Error checking service account" });
    }
  });
});

// Function to check message limits for Kijabe users
async function checkAndUpdateMessageLimit(userId, userTier) {
  const db = admin.firestore();
  const userRef = db.collection("kijabe_users").doc(`kijabe-${userId}`);

  return await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const userData = userDoc.data() || {};

    const now = new Date();
    let lastReset = userData.lastMessageReset;

    // If lastReset doesn't exist, use epoch time
    if (!lastReset) {
      lastReset = new Date(0);
    }
    // Convert to Date object if it's a Firestore timestamp
    else if (lastReset._seconds !== undefined) {
      lastReset = new Date(lastReset._seconds * 1000);
    }

    const hoursSinceReset = differenceInHours(now, lastReset);

    // Reset counter if 24 hours have passed
    let currentCount = userData.messageCount || 0;
    if (hoursSinceReset >= RESET_PERIOD_HOURS) {
      currentCount = 0;
    }

    // Check against appropriate limit
    const tierLimit =
      KIJABE_RATE_LIMITS[userTier] || KIJABE_RATE_LIMITS.default;
    if (currentCount >= tierLimit) {
      return {
        withinLimit: false,
        limit: tierLimit,
        currentCount: currentCount,
        hoursUntilReset: RESET_PERIOD_HOURS - hoursSinceReset,
      };
    }

    // Update message count
    transaction.set(
      userRef,
      {
        userId,
        userTier,
        messageCount: currentCount + 1,
        lastMessageReset:
          hoursSinceReset >= RESET_PERIOD_HOURS ? now : lastReset,
        lastUpdated: now,
      },
      { merge: true },
    );

    return {
      withinLimit: true,
      limit: tierLimit,
      currentCount: currentCount + 1,
      hoursUntilReset: RESET_PERIOD_HOURS - hoursSinceReset,
    };
  });
}

// Export the function for other modules to use
exports.checkAndUpdateMessageLimit = checkAndUpdateMessageLimit;

// Simple endpoint to just get Kijabe user info without Firebase auth/db
exports.kijabeUserInfo = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onRequest((req, res) => {
  return cors(req, res, async () => {
    console.log("==== kijabeUserInfo function started ====");
    try {
      const token = req.query.token;

      console.log(
        "Token received:",
        token ? `${token.substring(0, 15)}...` : "No token",
      );

      if (!token) {
        console.error("Missing token in request");
        return res.status(400).json({ error: "Missing token" });
      }

      // Verify the JWT token from Kijabe
      const JWT_SECRET = getJwtSecret();
      console.log(
        "Attempting to verify JWT with secret:",
        `${JWT_SECRET.substring(0, 3)}...`,
      );
      const decoded = jwt.verify(token, JWT_SECRET);

      console.log("JWT successfully verified, user info:", {
        email: decoded.email,
        name: decoded.display_name,
        id: decoded.user_id,
        tier: decoded.user_tier,
      });

      if (!decoded.user_id || !decoded.email) {
        console.error("Invalid token payload:", decoded);
        return res.status(400).json({ error: "Invalid token payload" });
      }

      // Just return the decoded user info directly
      const userInfo = {
        userEmail: decoded.email,
        displayName: decoded.display_name || "",
        userId: decoded.user_id,
        userTier: decoded.user_tier || "basic",
        jwtReceived: true,
      };

      console.log(
        "Sending user info response:",
        JSON.stringify(userInfo, null, 2),
      );
      res.json(userInfo);
    } catch (error) {
      console.error("Authentication error:", error);

      // Provide more descriptive error messages
      let errorMessage = "Authentication failed";

      if (
        error.name === "JsonWebTokenError" &&
        error.message === "invalid signature"
      ) {
        errorMessage =
          "The JWT secret in WordPress doesn't match the server. Please check your HealthDesk settings in WordPress admin.";
      } else {
        errorMessage = errorMessage + ": " + error.message;
      }

      res.status(401).json({ error: errorMessage });
    }
  });
});
