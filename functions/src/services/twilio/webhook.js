const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

/**
 * Webhook endpoint for processing incoming Twilio SMS messages
 * Twilio calls this when users reply to our SMS messages
 */
exports.twilioWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // DEBUG: Log ALL incoming requests
    functions.logger.info(
      `WEBHOOK HIT: ${req.method} ${req.url} from ${req.ip}`
    );
    functions.logger.info(`Request body: ${JSON.stringify(req.body)}`);
    functions.logger.info(`Request headers: ${JSON.stringify(req.headers)}`);

    // Verify it's a POST request from Twilio
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { From: phoneNumber, Body: messageBody, MessageSid } = req.body;

    functions.logger.info(
      `Received SMS reply from ${phoneNumber}: "${messageBody}"`
    );

    // Clean up the message body
    const cleanedBody = messageBody.trim().toUpperCase();

    // Handle STOP requests (Twilio standard)
    if (cleanedBody === "STOP" || cleanedBody === "UNSUBSCRIBE") {
      await handleStopRequest(phoneNumber);
      return res
        .status(200)
        .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    // Handle facility alert responses
    if (
      cleanedBody === "DONE" ||
      cleanedBody === "UPDATED" ||
      cleanedBody === "COMPLETE"
    ) {
      await handleFacilityAlertResponse(phoneNumber, "updated", MessageSid);
    } else if (
      // Handle medication progress responses (both individual and batch)
      cleanedBody === "Y" ||
      cleanedBody === "YES" ||
      cleanedBody === "TAKEN"
    ) {
      await handleMedicationResponse(phoneNumber, "taken", MessageSid);
    } else if (
      cleanedBody === "N" ||
      cleanedBody === "NO" ||
      cleanedBody === "SKIP" ||
      cleanedBody === "SKIPPED"
    ) {
      await handleMedicationResponse(phoneNumber, "skipped", MessageSid);
    } else if (
      cleanedBody === "BOTH" ||
      cleanedBody === "ALL" ||
      cleanedBody === "NONE" ||
      cleanedBody.includes("FIRST") ||
      cleanedBody.includes("SECOND") ||
      cleanedBody.includes("THIRD") ||
      cleanedBody.includes("FOURTH") ||
      cleanedBody.includes("FIFTH") ||
      cleanedBody.match(/^[YN\d\s]+$/)
    ) {
      // Handle batch responses (natural language or legacy format)
      await handleBatchMedicationResponse(phoneNumber, cleanedBody, MessageSid);
    } else {
      functions.logger.warn(
        `Unrecognized SMS reply from ${phoneNumber}: "${messageBody}"`
      );
      // Don't send a response for unrecognized messages to avoid SMS loops
    }

    // Always return valid TwiML response
    res
      .status(200)
      .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    functions.logger.error("Error processing Twilio webhook:", error);
    res
      .status(500)
      .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

/**
 * Handle STOP requests - disable SMS reminders for this phone number
 */
async function handleStopRequest(phoneNumber) {
  try {
    // Find user by phone number
    const usersSnapshot = await db
      .collection("users")
      .where("phone", "==", phoneNumber)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      functions.logger.warn(
        `STOP request from unknown phone number: ${phoneNumber}`
      );
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    // Disable all medication reminders for this user
    const remindersSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("medicationReminders")
      .where("enabled", "==", true)
      .get();

    const batch = db.batch();

    remindersSnapshot.forEach((doc) => {
      batch.update(doc.ref, { enabled: false });
    });

    await batch.commit();

    functions.logger.info(
      `Disabled all medication reminders for user ${userId} due to STOP request`
    );
  } catch (error) {
    functions.logger.error("Error handling STOP request:", error);
  }
}

/**
 * Handle batch medication response (e.g., "Y1 N2", "Y N Y") for multiple medications
 */
async function handleBatchMedicationResponse(
  phoneNumber,
  responseBody,
  messageSid
) {
  try {
    functions.logger.info(
      `Processing batch medication response: ${phoneNumber} -> ${responseBody}`
    );

    // Find user by phone number
    const usersSnapshot = await db
      .collection("users")
      .where("phone", "==", phoneNumber)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      functions.logger.warn(
        `Batch medication response from unknown phone number: ${phoneNumber}`
      );
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    // Find recent batch reminder
    const batchMessageSnapshot = await db
      .collection("messages")
      .where("to", "==", phoneNumber)
      .where("type", "==", "medication_reminder_batch")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    if (batchMessageSnapshot.empty) {
      functions.logger.warn(
        `No recent batch medication reminders found for user ${userId}`
      );
      return;
    }

    // Find the most recent batch that hasn't been responded to
    let matchedBatch = null;
    for (const messageDoc of batchMessageSnapshot.docs) {
      const messageData = messageDoc.data();

      if (messageData.status === "failed" || messageData.error) {
        continue;
      }

      const messageTime = messageData.createdAt?.toDate();
      const now = new Date();
      const hoursDiff = (now - messageTime) / (1000 * 60 * 60);

      if (hoursDiff <= 4 && !messageData.userResponse) {
        matchedBatch = {
          messageId: messageDoc.id,
          ...messageData,
        };
        break;
      }
    }

    if (matchedBatch) {
      const responses = parseBatchResponse(
        responseBody,
        matchedBatch.medications.length
      );

      functions.logger.info(
        `User ${userId} responded to batch reminder: ${JSON.stringify(
          responses
        )} for medications: ${matchedBatch.medications
          .map((m) => m.medicationName)
          .join(", ")}`
      );

      // Process each medication response
      const trackingPromises = [];
      for (let i = 0; i < matchedBatch.medications.length; i++) {
        const medication = matchedBatch.medications[i];
        const response = responses[i] || "taken"; // Default to taken if not specified

        trackingPromises.push(
          createTrackingEntryAtomic(
            userId,
            medication.medicationId,
            matchedBatch.scheduledTime || "unknown",
            response,
            matchedBatch.messageId,
            messageSid + `_${i}` // Unique response ID for each medication
          )
        );
      }

      await Promise.all(trackingPromises);

      // Mark the batch message as responded
      await db.collection("messages").doc(matchedBatch.messageId).update({
        userResponse: responseBody,
        responseTime: admin.firestore.FieldValue.serverTimestamp(),
        responseSid: messageSid,
      });
    } else {
      functions.logger.warn(
        `No matching recent batch medication reminder found for ${phoneNumber}`
      );
    }
  } catch (error) {
    functions.logger.error("Error handling batch medication response:", error);
  }
}

/**
 * Parse batch response formats - supports natural language and legacy formats
 */
function parseBatchResponse(responseBody, medicationCount) {
  const responses = [];
  const cleanResponse = responseBody.trim().toUpperCase();

  // Handle natural language responses (new preferred format)
  if (cleanResponse === "BOTH" || cleanResponse === "ALL") {
    return Array(medicationCount).fill("taken");
  }

  if (cleanResponse === "NONE") {
    return Array(medicationCount).fill("skipped");
  }

  // Handle positional responses (FIRST, SECOND, THIRD, etc.)
  const positionWords = ["FIRST", "SECOND", "THIRD", "FOURTH", "FIFTH"];
  const tokens = cleanResponse.split(/\s+/);

  // Check if response contains any position words
  const hasPositionWords = tokens.some((token) =>
    positionWords.includes(token)
  );

  if (hasPositionWords) {
    // Initialize all as skipped, then mark specified positions as taken
    for (let i = 0; i < medicationCount; i++) {
      responses[i] = "skipped";
    }

    for (const token of tokens) {
      const positionIndex = positionWords.indexOf(token);
      if (positionIndex >= 0 && positionIndex < medicationCount) {
        responses[positionIndex] = "taken";
      }
    }

    return responses;
  }

  // Legacy format support - Handle simple "Y" or "N" for all medications
  if (
    cleanResponse === "Y" ||
    cleanResponse === "YES" ||
    cleanResponse === "TAKEN"
  ) {
    return Array(medicationCount).fill("taken");
  }

  if (
    cleanResponse === "N" ||
    cleanResponse === "NO" ||
    cleanResponse === "SKIP"
  ) {
    return Array(medicationCount).fill("skipped");
  }

  // Legacy format - Handle indexed format like "Y1 N2" or "1Y 2N"
  const indexedMatches = cleanResponse.match(/([YN])(\d+)|([\d]+)([YN])/g);
  if (indexedMatches) {
    // Initialize all as taken (default)
    for (let i = 0; i < medicationCount; i++) {
      responses[i] = "taken";
    }

    for (const match of indexedMatches) {
      const yMatch = match.match(/Y(\d+)|(\d+)Y/);
      const nMatch = match.match(/N(\d+)|(\d+)N/);

      if (yMatch) {
        const index = parseInt(yMatch[1] || yMatch[2]) - 1;
        if (index >= 0 && index < medicationCount) {
          responses[index] = "taken";
        }
      }

      if (nMatch) {
        const index = parseInt(nMatch[1] || nMatch[2]) - 1;
        if (index >= 0 && index < medicationCount) {
          responses[index] = "skipped";
        }
      }
    }

    return responses;
  }

  // Legacy format - Handle space-separated format like "Y N Y"
  if (tokens.length <= medicationCount) {
    for (let i = 0; i < medicationCount; i++) {
      if (i < tokens.length) {
        const token = tokens[i];
        if (token === "Y" || token === "YES" || token === "TAKEN") {
          responses[i] = "taken";
        } else if (token === "N" || token === "NO" || token === "SKIP") {
          responses[i] = "skipped";
        } else {
          responses[i] = "taken"; // Default to taken for unclear responses
        }
      } else {
        responses[i] = "taken"; // Default to taken if not specified
      }
    }
    return responses;
  }

  // Fallback: default all to taken
  return Array(medicationCount).fill("taken");
}

/**
 * Handle medication response (Y/N) with atomic tracking entry creation
 * Now handles both individual and batch responses
 */
async function handleMedicationResponse(phoneNumber, responseType, messageSid) {
  try {
    functions.logger.info(
      `Processing medication response: ${phoneNumber} -> ${responseType}`
    );

    // Find user by phone number
    const usersSnapshot = await db
      .collection("users")
      .where("phone", "==", phoneNumber)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      functions.logger.warn(
        `Medication response from unknown phone number: ${phoneNumber}`
      );
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    // First check for batch reminders that could match this simple response
    const batchMessagesSnapshot = await db
      .collection("messages")
      .where("to", "==", phoneNumber)
      .where("type", "==", "medication_reminder_batch")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(3)
      .get();

    // Check if there's a recent batch that matches
    for (const batchDoc of batchMessagesSnapshot.docs) {
      const batchData = batchDoc.data();

      if (
        batchData.status === "failed" ||
        batchData.error ||
        batchData.userResponse
      ) {
        continue;
      }

      const messageTime = batchData.createdAt?.toDate();
      const now = new Date();
      const hoursDiff = (now - messageTime) / (1000 * 60 * 60);

      if (hoursDiff <= 4) {
        // This simple Y/N response is for a batch - apply to all medications
        functions.logger.info(
          `Simple response "${responseType}" applied to all medications in batch: ${batchData.medications
            .map((m) => m.medicationName)
            .join(", ")}`
        );

        const trackingPromises = [];
        for (let i = 0; i < batchData.medications.length; i++) {
          const medication = batchData.medications[i];

          trackingPromises.push(
            createTrackingEntryAtomic(
              userId,
              medication.medicationId,
              batchData.scheduledTime || "unknown",
              responseType,
              batchDoc.id,
              messageSid + `_${i}`
            )
          );
        }

        await Promise.all(trackingPromises);

        // Mark the batch message as responded
        await db.collection("messages").doc(batchDoc.id).update({
          userResponse: responseType,
          responseTime: admin.firestore.FieldValue.serverTimestamp(),
          responseSid: messageSid,
        });

        return; // Found and processed batch, exit
      }
    }

    // No recent batch found, handle as individual reminder (original logic)
    const recentMessagesSnapshot = await db
      .collection("messages")
      .where("to", "==", phoneNumber)
      .where("type", "==", "medication_reminder")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    if (recentMessagesSnapshot.empty) {
      functions.logger.warn(
        `No recent medication reminders found for user ${userId} at ${phoneNumber}`
      );
      return;
    }

    // Find the most recent reminder that hasn't been responded to yet
    let matchedReminder = null;
    for (const messageDoc of recentMessagesSnapshot.docs) {
      const messageData = messageDoc.data();

      if (messageData.status === "failed" || messageData.error) {
        continue;
      }

      const messageTime = messageData.createdAt?.toDate();
      const now = new Date();
      const hoursDiff = (now - messageTime) / (1000 * 60 * 60);

      if (hoursDiff <= 4 && !messageData.userResponse) {
        functions.logger.info(
          `Found matching individual reminder: ${messageDoc.id}, status: ${
            messageData.status
          }, sent ${hoursDiff.toFixed(1)} hours ago`
        );
        matchedReminder = {
          messageId: messageDoc.id,
          ...messageData,
        };
        break;
      }
    }

    if (matchedReminder) {
      functions.logger.info(
        `User ${userId} responded "${responseType}" to individual medication reminder for ${matchedReminder.medicationName} (messageId: ${matchedReminder.messageId})`
      );

      await createTrackingEntryAtomic(
        userId,
        matchedReminder.medicationId,
        matchedReminder.scheduledTime || "unknown",
        responseType,
        matchedReminder.messageId,
        messageSid
      );
    } else {
      functions.logger.warn(
        `No matching recent medication reminder found for ${phoneNumber}`
      );
    }
  } catch (error) {
    functions.logger.error("Error handling medication response:", error);
  }
}

/**
 * Atomically create tracking entry in daily document structure
 * ALL operations succeed or ALL fail - no partial state
 * New approach: One document per day per user, contains all medication responses
 * FIXED: Now stores expected medications for accurate historical calculations
 * FIXED: Now stores response time in user's timezone for consistency
 */
async function createTrackingEntryAtomic(
  userId,
  medicationId,
  scheduledTime,
  status,
  messageId,
  responseSid
) {
  const now = new Date();

  // Get user's timezone from their medication reminder settings
  const userRemindersSnapshot = await db
    .collection("users")
    .doc(userId)
    .collection("medicationReminders")
    .limit(1)
    .get();

  let userTimezone = "UTC"; // fallback
  if (!userRemindersSnapshot.empty) {
    const reminderData = userRemindersSnapshot.docs[0].data();
    userTimezone = reminderData.timezone || "UTC";
  }

  // Convert current time to user's timezone using reliable formatting
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: userTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year").value;
  const month = parts.find((p) => p.type === "month").value;
  const day = parts.find((p) => p.type === "day").value;
  const hour = parts.find((p) => p.type === "hour").value;
  const minute = parts.find((p) => p.type === "minute").value;

  const today = `${year}-${month}-${day}`;
  const timeOnly = `${hour}:${minute}`;

  functions.logger.info(
    `Storing response time in user's timezone ${userTimezone}: ${timeOnly} (scheduled: ${scheduledTime})`
  );

  // Reference to today's tracking document
  const dailyTrackingRef = db
    .collection("users")
    .doc(userId)
    .collection("medicationTracking")
    .doc(today);

  const messageRef = db.collection("messages").doc(messageId);

  // Use transaction to ensure atomicity
  await db.runTransaction(async (transaction) => {
    // Read current daily tracking document
    const dailyDoc = await transaction.get(dailyTrackingRef);

    // Initialize or get existing document data
    const dailyData = dailyDoc.exists
      ? dailyDoc.data()
      : {
          date: today,
          medications: {},
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

    // Expectations should already be stored by reminder system - if not, something's wrong
    if (!dailyData.expectedMedications) {
      functions.logger.warn(
        `No expected medications found for user ${userId} on ${today}. This may indicate reminder system hasn't run yet.`
      );
      // Initialize empty expectations as fallback
      dailyData.expectedMedications = {};
    }

    // Initialize medication array if it doesn't exist
    if (!dailyData.medications[medicationId]) {
      dailyData.medications[medicationId] = { responses: [] };
    }

    // Add the new response
    dailyData.medications[medicationId].responses.push({
      time: timeOnly,
      status: status,
      responseSid: responseSid,
      scheduledTime: scheduledTime,
    });

    // Update timestamp
    dailyData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Write the daily document (creates or updates)
    transaction.set(dailyTrackingRef, dailyData);

    // Update message document to mark as responded
    transaction.update(messageRef, {
      userResponse: status,
      responseTime: admin.firestore.FieldValue.serverTimestamp(),
      responseSid,
    });

    functions.logger.info(
      `Successfully added tracking entry to daily document ${today} for medication ${medicationId}: ${status} at ${timeOnly}`
    );
  });
}

/**
 * Handle facility alert response (DONE, UPDATED, etc.)
 */
async function handleFacilityAlertResponse(
  phoneNumber,
  responseType,
  messageSid
) {
  try {
    functions.logger.info(
      `Processing facility alert response: ${phoneNumber} -> ${responseType}`
    );

    // Find user by phone number
    const usersSnapshot = await db
      .collection("users")
      .where("phone", "==", phoneNumber)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      functions.logger.warn(
        `Facility alert response from unknown phone number: ${phoneNumber}`
      );
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    // Find recent facility alert messages
    const recentMessagesSnapshot = await db
      .collection("messages")
      .where("to", "==", phoneNumber)
      .where("type", "==", "facility_alert")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    if (recentMessagesSnapshot.empty) {
      functions.logger.warn(
        `No recent facility alerts found for user ${userId} at ${phoneNumber}`
      );
      return;
    }

    // Find the most recent alert that hasn't been responded to yet
    let matchedAlert = null;
    for (const messageDoc of recentMessagesSnapshot.docs) {
      const messageData = messageDoc.data();

      if (messageData.status === "failed" || messageData.error) {
        continue;
      }

      const messageTime = messageData.createdAt?.toDate();
      const now = new Date();
      const hoursDiff = (now - messageTime) / (1000 * 60 * 60);

      if (hoursDiff <= 4 && !messageData.userResponse) {
        functions.logger.info(
          `Found matching facility alert: ${messageDoc.id}, facility: ${
            messageData.facilityName
          }, sent ${hoursDiff.toFixed(1)} hours ago`
        );
        matchedAlert = {
          messageId: messageDoc.id,
          ...messageData,
        };
        break;
      }
    }

    if (matchedAlert) {
      functions.logger.info(
        `User ${userId} responded "${responseType}" to facility alert for ${matchedAlert.facilityName} (messageId: ${matchedAlert.messageId})`
      );

      // Mark the message as responded
      await db.collection("messages").doc(matchedAlert.messageId).update({
        userResponse: responseType,
        responseTime: admin.firestore.FieldValue.serverTimestamp(),
        responseSid: messageSid,
      });

      // Update the facility alert document to record the response
      await db
        .collection("users")
        .doc(userId)
        .collection("facilityAlerts")
        .doc(matchedAlert.facilityId)
        .update({
          lastWaitTimeUpdate: Date.now(), // Record that they updated
          lastResponseTime: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      functions.logger.info(
        `Updated facility alert tracking for user ${userId}, facility ${matchedAlert.facilityId}`
      );
    } else {
      functions.logger.warn(
        `No matching recent facility alert found for ${phoneNumber}`
      );
    }
  } catch (error) {
    functions.logger.error("Error handling facility alert response:", error);
  }
}
