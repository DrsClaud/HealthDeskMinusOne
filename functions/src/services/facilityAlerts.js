const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { runtimeConfigSecret, getRuntimeConfig } = require("../runtimeConfig");

const db = admin.firestore();

/**
 * Scheduled function to process and send facility wait time update reminders
 * Runs at exact 15-minute intervals: :00, :15, :30, :45 (same as medication reminders)
 */
exports.processFacilityAlerts = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .pubsub
  .schedule("*/15 * * * *")
  .onRun(async (context) => {
    try {
      const now = new Date();

      functions.logger.info(
        `Processing facility alerts at ${now.toISOString()}`,
      );

      // Get all enabled facility alerts using collection group query
      const alertsSnapshot = await db
        .collectionGroup("facilityAlerts")
        .where("enabled", "==", true)
        .get();

      if (alertsSnapshot.empty) {
        functions.logger.info("No facility alerts to process");
        return null;
      }

      // Group alerts by userId to batch user document fetches
      const alertsByUser = new Map();
      const alertsToProcess = [];

      alertsSnapshot.forEach((doc) => {
        const alert = doc.data();
        // Extract userId from document path: users/{userId}/facilityAlerts/{facilityId}
        const userId = doc.ref.path.split("/")[1];

        // Check if any alert times are due
        const shouldSendAlert = alert.alertTimes.some((time) => {
          const [hours, minutes] = time.split(":").map(Number);

          // Get current time in the user's timezone
          const userTimezone = alert.timezone || "UTC";
          const nowInUserTz = new Date(
            now.toLocaleString("en-US", { timeZone: userTimezone }),
          );
          const currentMinutes =
            nowInUserTz.getHours() * 60 + nowInUserTz.getMinutes();
          const scheduledMinutes = hours * 60 + minutes;

          // Calculate absolute time difference, handling day boundary
          let timeDiff = Math.abs(currentMinutes - scheduledMinutes);
          if (timeDiff > 720) {
            // Handle crossing midnight (12 hours = 720 minutes)
            timeDiff = 1440 - timeDiff;
          }

          // 7-minute window to catch alerts (same as medication reminders)
          return timeDiff <= 7;
        });

        if (shouldSendAlert) {
          // Group by userId for efficient batching
          if (!alertsByUser.has(userId)) {
            alertsByUser.set(userId, []);
          }
          alertsByUser.get(userId).push(alert);
          alertsToProcess.push({ userId, alert });
        }
      });

      if (alertsToProcess.length === 0) {
        functions.logger.info("No facility alerts due at this time");
        return null;
      }

      // Batch fetch user documents
      const uniqueUserIds = Array.from(alertsByUser.keys());
      const BATCH_SIZE = 500;
      const userDataMap = new Map();

      for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
        const userIdBatch = uniqueUserIds.slice(i, i + BATCH_SIZE);

        const userDocPromises = userIdBatch.map((userId) =>
          db.collection("users").doc(userId).get(),
        );

        const userDocs = await Promise.all(userDocPromises);

        userDocs.forEach((userDoc, index) => {
          const userId = userIdBatch[index];
          if (userDoc.exists) {
            userDataMap.set(userId, userDoc.data());
          }
        });
      }

      // Process alerts
      const alertPromises = [];
      const processedUsers = new Set();

      for (const userId of uniqueUserIds) {
        if (processedUsers.has(userId)) continue;
        processedUsers.add(userId);

        const userData = userDataMap.get(userId);
        if (!userData?.phoneVerified || !userData?.phone) {
          functions.logger.warn(
            `Skipping facility alerts for user ${userId} - phone not verified or missing`,
          );
          continue;
        }

        const userAlerts = alertsByUser.get(userId);

        for (const alert of userAlerts) {
          // Check if we've already sent this alert today
          const hasSentToday = await checkAndMarkAlertSent(
            userId,
            alert.facilityId,
          );

          if (hasSentToday) {
            functions.logger.info(
              `Skipping duplicate facility alert for user ${userId}, facility ${alert.facilityName} - already sent today`,
            );
            continue;
          }

          // Check if wait time is stale (older than 4 hours)
          const isWaitTimeStale = checkWaitTimeStale(
            alert.lastWaitTimeUpdate,
            4,
          );

          if (!isWaitTimeStale) {
            functions.logger.info(
              `Skipping facility alert for user ${userId}, facility ${alert.facilityName} - wait time is recent`,
            );
            continue;
          }

          functions.logger.info(
            `Sending facility alert for user ${userId}, facility ${alert.facilityName}`,
          );

          alertPromises.push(sendFacilityAlert(alert, userId, userData.phone));
        }
      }

      if (alertPromises.length > 0) {
        await Promise.all(alertPromises);
        functions.logger.info(
          `Sent ${alertPromises.length} facility update reminders`,
        );
      }

      return null;
    } catch (error) {
      functions.logger.error("Error processing facility alerts:", error);
      throw error;
    }
  });

/**
 * Check if wait time is stale (older than X hours)
 */
function checkWaitTimeStale(lastUpdate, hoursThreshold = 4) {
  if (!lastUpdate) return true; // No update recorded = stale

  const now = Date.now();
  const diffHours = (now - lastUpdate) / (1000 * 60 * 60);
  return diffHours >= hoursThreshold;
}

/**
 * Capitalize each word in a string (same logic as frontend capitalize utility)
 */
function capitalize(string) {
  if (!string) return string;
  const splitString = string.toLowerCase().split(" ");
  for (let i = 0; i < splitString.length; i++) {
    splitString[i] =
      splitString[i].charAt(0).toUpperCase() + splitString[i].substring(1);
  }
  return splitString.join(" ");
}

/**
 * Send a facility wait time update reminder
 */
async function sendFacilityAlert(alert, userId, phoneNumber) {
  try {
    // Get site URL from environment variable
    const cfg = getRuntimeConfig();
    const siteUrl =
      cfg.app?.site_url ||
      process.env.SITE_URL ||
      "https://healthdesk.app";

    // Normalize facility name for professional appearance
    const normalizedFacilityName = capitalize(alert.facilityName);

    const message = `What's the current wait time estimate at ${normalizedFacilityName}? Please update at: ${siteUrl}/dashboard - Text STOP to opt out.`;

    // Determine which scheduled time triggered this alert
    const triggeredTime = determineTriggeredTime(alert);

    // Create message document - this will trigger the existing Twilio function
    await db.collection("messages").add({
      to: phoneNumber,
      body: message,
      type: "facility_alert",
      userId: userId,
      facilityId: alert.facilityId,
      facilityName: alert.facilityName,
      scheduledTime: triggeredTime,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(
      `Created facility alert message for user ${userId}, facility ${alert.facilityName}`,
    );

    return true;
  } catch (error) {
    functions.logger.error(
      `Failed to send facility alert for user ${userId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Helper function to determine triggered time for an alert
 */
function determineTriggeredTime(alert) {
  const now = new Date();
  const userTimezone = alert.timezone || "UTC";
  const nowInUserTz = new Date(
    now.toLocaleString("en-US", { timeZone: userTimezone }),
  );
  const currentMinutes = nowInUserTz.getHours() * 60 + nowInUserTz.getMinutes();

  let triggeredTime = "unknown";
  let minTimeDiff = Infinity;

  for (const time of alert.alertTimes) {
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledMinutes = hours * 60 + minutes;

    let timeDiff = Math.abs(currentMinutes - scheduledMinutes);
    if (timeDiff > 720) {
      timeDiff = 1440 - timeDiff;
    }

    if (timeDiff <= 7 && timeDiff < minTimeDiff) {
      triggeredTime = time;
      minTimeDiff = timeDiff;
    }
  }

  return triggeredTime;
}

/**
 * Check if we've already sent this facility alert today and mark it as sent
 */
async function checkAndMarkAlertSent(userId, facilityId) {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format

    // Reference to today's alert tracking document
    const alertTrackingRef = db
      .collection("users")
      .doc(userId)
      .collection("facilityAlertTracking")
      .doc(today);

    // Use transaction to ensure atomicity
    return await db.runTransaction(async (transaction) => {
      const alertDoc = await transaction.get(alertTrackingRef);

      // Initialize or get existing document data
      const alertData = alertDoc.exists
        ? alertDoc.data()
        : {
            date: today,
            sentAlerts: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          };

      // Check if this facility alert was already sent today
      if (alertData.sentAlerts.includes(facilityId)) {
        return true; // Already sent, skip
      }

      // Mark this facility alert as sent
      alertData.sentAlerts.push(facilityId);
      alertData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      // Write the updated document
      transaction.set(alertTrackingRef, alertData);

      return false; // Not sent yet, proceed with sending
    });
  } catch (error) {
    functions.logger.error(
      `Error checking alert sent status for user ${userId}, facility ${facilityId}:`,
      error,
    );
    // If we can't check, err on the side of not sending to prevent spam
    return true;
  }
}
