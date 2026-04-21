const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { twilioClient } = require("./twilio/client");

const db = admin.firestore();

/**
 * Scheduled function to process and send medication reminders
 * Runs at exact 15-minute intervals: :00, :15, :30, :45 (cost-optimized)
 */
exports.processMedicationReminders = functions.pubsub
  .schedule("*/15 * * * *")
  .onRun(async (context) => {
    try {
      const now = new Date();

      functions.logger.info(
        `Processing medication reminders at ${now.toISOString()}`,
      );

      // Get all enabled reminders across all users using collection group query
      const remindersSnapshot = await db
        .collectionGroup("medicationReminders")
        .where("enabled", "==", true)
        .get();

      // Group reminders by userId to batch user document fetches
      const remindersByUser = new Map();
      const remindersToProcess = [];

      remindersSnapshot.forEach((doc) => {
        const reminder = doc.data();
        // Extract userId from document path: users/{userId}/medicationReminders/{medicationId}
        const userId = doc.ref.path.split("/")[1];

        // FIXED: Check if any reminder times are due OR will be due soon for grouping
        // This allows medications with nearby times to be processed together
        const shouldSendReminder = reminder.times.some((time) => {
          const [hours, minutes] = time.split(":").map(Number);

          // Get current time in the user's timezone
          const userTimezone = reminder.timezone || "UTC";
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

          // FIXED: Expand window to 22 minutes to catch groupable reminders
          // This ensures medications scheduled within grouping window (15min) get processed together
          // 22 minutes = 7 min past + 15 min future for next execution cycle
          return timeDiff <= 22;
        });

        if (shouldSendReminder) {
          // Group by userId for efficient batching
          if (!remindersByUser.has(userId)) {
            remindersByUser.set(userId, []);
          }
          remindersByUser.get(userId).push(reminder);
          remindersToProcess.push({ userId, reminder });
        }
      });

      if (remindersToProcess.length === 0) {
        functions.logger.info("No reminders to process");
        return null;
      }

      // Batch fetch user documents - this is the key optimization
      // We only fetch each unique user doc once, regardless of how many medications they have
      const uniqueUserIds = Array.from(remindersByUser.keys());

      // Firebase allows many concurrent reads, but we'll be reasonable about batch size
      // Process in chunks of 500 to stay well under any potential limits
      const BATCH_SIZE = 500;
      const userDataMap = new Map();

      for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
        const userIdBatch = uniqueUserIds.slice(i, i + BATCH_SIZE);

        // Fetch user documents in parallel for this batch
        const userDocPromises = userIdBatch.map((userId) =>
          db.collection("users").doc(userId).get(),
        );

        const userDocs = await Promise.all(userDocPromises);

        // Store user data in map for quick lookup
        userDocs.forEach((userDoc, index) => {
          const userId = userIdBatch[index];
          if (userDoc.exists) {
            userDataMap.set(userId, userDoc.data());
          }
        });
      }

      // SMART BATCHING: Group reminders by user and time window to prevent reply ambiguity
      const reminderPromises = [];
      const processedUsers = new Set();

      for (const userId of uniqueUserIds) {
        if (processedUsers.has(userId)) continue;
        processedUsers.add(userId);

        const userData = userDataMap.get(userId);
        if (!userData?.phoneVerified || !userData?.phone) {
          functions.logger.warn(
            `Skipping reminders for user ${userId} - phone not verified or missing`,
          );
          continue;
        }

        const userReminders = remindersByUser.get(userId);

        // Store daily expectations for this user (capture ALL active medications)
        await storeDailyExpectations(userId);

        const groupedReminders = groupRemindersByTimeWindow(userReminders);

        for (const reminderGroup of groupedReminders) {
          // Check if we've already sent this combination today using daily tracking
          const combinationHash = reminderGroup
            .map((r) => r.medicationId)
            .sort()
            .join(",");
          const hasSentToday = await checkAndMarkReminderSent(
            userId,
            combinationHash,
          );

          if (hasSentToday) {
            functions.logger.info(
              `Skipping duplicate reminder for user ${userId}, combination already sent: ${reminderGroup
                .map((r) => r.medicationName)
                .join(", ")}`,
            );
            continue;
          }

          if (reminderGroup.length === 1) {
            // Single reminder - use existing logic
            functions.logger.info(
              `Sending individual reminder for user ${userId}, medication ${reminderGroup[0].medicationName}`,
            );
            reminderPromises.push(
              sendMedicationReminder(reminderGroup[0], userId, userData.phone),
            );
          } else {
            // Multiple reminders - send as batch
            functions.logger.info(
              `Sending batched reminders for user ${userId}, medications: ${reminderGroup
                .map((r) => r.medicationName)
                .join(", ")}`,
            );
            reminderPromises.push(
              sendBatchedMedicationReminders(
                reminderGroup,
                userId,
                userData.phone,
              ),
            );
          }
        }
      }

      if (reminderPromises.length > 0) {
        await Promise.all(reminderPromises);
        functions.logger.info(
          `Sent ${reminderPromises.length} medication reminders`,
        );
      }

      return null;
    } catch (error) {
      functions.logger.error("Error processing medication reminders:", error);
      throw error;
    }
  });

/**
 * Group reminders by time window to detect simultaneous medications
 * FIXED: Groups all collected reminders, but filters to only send groups with due reminders
 */
function groupRemindersByTimeWindow(reminders, windowMinutes = 15) {
  if (!reminders || reminders.length === 0) return [];

  const now = new Date();

  // Sort all reminders by their closest trigger times (including future ones)
  const sortedReminders = reminders
    .map((reminder) => {
      const userTimezone = reminder.timezone || "UTC";
      const nowInUserTz = new Date(
        now.toLocaleString("en-US", { timeZone: userTimezone }),
      );
      const currentMinutes =
        nowInUserTz.getHours() * 60 + nowInUserTz.getMinutes();

      let closestTime = null;
      let minTimeDiff = Infinity;
      let isDue = false;

      for (const time of reminder.times) {
        const [hours, minutes] = time.split(":").map(Number);
        const scheduledMinutes = hours * 60 + minutes;

        let timeDiff = Math.abs(currentMinutes - scheduledMinutes);
        if (timeDiff > 720) {
          timeDiff = 1440 - timeDiff;
        }

        if (timeDiff < minTimeDiff) {
          closestTime = scheduledMinutes;
          minTimeDiff = timeDiff;
          isDue = timeDiff <= 7; // Mark if this reminder is actually due now
        }
      }

      return {
        ...reminder,
        triggeredMinutes: closestTime || currentMinutes,
        isDue: isDue,
      };
    })
    .sort((a, b) => a.triggeredMinutes - b.triggeredMinutes);

  // Group reminders within the time window (15 minutes for user constraint)
  const groups = [];
  let currentGroup = [sortedReminders[0]];

  for (let i = 1; i < sortedReminders.length; i++) {
    const timeDiff = Math.abs(
      sortedReminders[i].triggeredMinutes - currentGroup[0].triggeredMinutes,
    );

    if (timeDiff <= windowMinutes) {
      currentGroup.push(sortedReminders[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [sortedReminders[i]];
    }
  }

  groups.push(currentGroup);

  // Only return groups that contain at least one due reminder
  return groups.filter((group) => group.some((reminder) => reminder.isDue));
}

/**
 * Send a batched medication reminder for multiple medications due at the same time
 */
async function sendBatchedMedicationReminders(reminders, userId, phoneNumber) {
  try {
    const medicationNames = reminders.map((r) => r.medicationName);
    const medicationList =
      medicationNames.length === 2
        ? `${medicationNames[0]} and ${medicationNames[1]}`
        : medicationNames.slice(0, -1).join(", ") +
          `, and ${medicationNames[medicationNames.length - 1]}`;

    // Create response instructions based on medication count
    let responseInstructions;
    if (medicationNames.length === 2) {
      responseInstructions =
        "Reply BOTH if taken, NONE if skipped, or FIRST/SECOND.";
    } else {
      responseInstructions =
        "Reply ALL if taken, NONE if skipped, or combinations like FIRST THIRD.";
    }

    const message = `Time to take ${medicationList}. ${responseInstructions} STOP to opt out.`;

    // Determine triggered time (use the first reminder's time as representative)
    const triggeredTime = determineTriggeredTime(reminders[0]);

    // Create a single message document representing the batch
    await db.collection("messages").add({
      to: phoneNumber,
      body: message,
      type: "medication_reminder_batch",
      userId: userId,
      medications: reminders.map((r) => ({
        medicationId: r.medicationId,
        medicationName: r.medicationName,
      })),
      scheduledTime: triggeredTime,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(
      `Created batched reminder message for user ${userId}, medications: ${medicationNames.join(
        ", ",
      )}`,
    );

    return true;
  } catch (error) {
    functions.logger.error(
      `Failed to send batched reminder for user ${userId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Helper function to determine triggered time for a reminder
 * FIXED: Expanded window to handle grouped reminders
 */
function determineTriggeredTime(reminder) {
  const now = new Date();
  const userTimezone = reminder.timezone || "UTC";
  const nowInUserTz = new Date(
    now.toLocaleString("en-US", { timeZone: userTimezone }),
  );
  const currentMinutes = nowInUserTz.getHours() * 60 + nowInUserTz.getMinutes();

  let triggeredTime = "unknown";
  let minTimeDiff = Infinity;

  for (const time of reminder.times) {
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledMinutes = hours * 60 + minutes;

    let timeDiff = Math.abs(currentMinutes - scheduledMinutes);
    if (timeDiff > 720) {
      timeDiff = 1440 - timeDiff;
    }

    // Use expanded window to catch grouped reminders, find closest time
    if (timeDiff <= 22 && timeDiff < minTimeDiff) {
      triggeredTime = time;
      minTimeDiff = timeDiff;
    }
  }

  return triggeredTime;
}

/**
 * Helper function to send a medication reminder
 */
async function sendMedicationReminder(reminder, userId, phoneNumber) {
  try {
    const message = `Time to take ${reminder.medicationName}. Reply Y if taken, N if skipped. STOP to opt out.`;

    // Determine which scheduled time triggered this reminder
    const now = new Date();
    const userTimezone = reminder.timezone || "UTC";
    const nowInUserTz = new Date(
      now.toLocaleString("en-US", { timeZone: userTimezone }),
    );
    const currentMinutes =
      nowInUserTz.getHours() * 60 + nowInUserTz.getMinutes();

    // Find the scheduled time that matches current time (expanded window for grouping)
    let triggeredTime = "unknown";
    let minTimeDiff = Infinity;

    for (const time of reminder.times) {
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledMinutes = hours * 60 + minutes;

      // Calculate absolute time difference, handling day boundary
      let timeDiff = Math.abs(currentMinutes - scheduledMinutes);
      if (timeDiff > 720) {
        // Handle crossing midnight
        timeDiff = 1440 - timeDiff;
      }

      if (timeDiff <= 22 && timeDiff < minTimeDiff) {
        triggeredTime = time;
        minTimeDiff = timeDiff;
      }
    }

    // Create message document - this will trigger the existing Twilio function
    await db.collection("messages").add({
      to: phoneNumber, // Now using phone number from user document (single source of truth)
      body: message,
      type: "medication_reminder",
      userId: userId,
      medicationId: reminder.medicationId,
      medicationName: reminder.medicationName,
      scheduledTime: determineTriggeredTime(reminder), // Store which time slot triggered this reminder
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log successful reminder creation
    functions.logger.info(
      `Created reminder message for user ${userId}, medication ${reminder.medicationName}`,
    );

    return true;
  } catch (error) {
    functions.logger.error(
      `Failed to send reminder for user ${userId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Process missed medication reminders
 * Runs hourly to find reminders sent > 2 hours ago with no response
 * and creates "missed" tracking entries
 */
exports.processMissedReminders = functions.pubsub
  .schedule("0 * * * *") // Run at the start of every hour
  .onRun(async (context) => {
    try {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      functions.logger.info(
        `Processing missed reminders for messages sent before: ${twoHoursAgo.toISOString()}`,
      );

      // Find unresponded medication reminder messages older than 2 hours
      const unrespondedMessages = await db
        .collection("messages")
        .where("type", "in", [
          "medication_reminder",
          "medication_reminder_batch",
        ])
        .where("createdAt", "<=", twoHoursAgo)
        .where("userResponse", "==", null)
        .where("status", "in", ["sent", "delivered"])
        .limit(100) // Process in batches to avoid timeout
        .get();

      if (unrespondedMessages.empty) {
        functions.logger.info("No missed reminders to process");
        return null;
      }

      functions.logger.info(
        `Found ${unrespondedMessages.size} unresponded reminders to process`,
      );

      // Process each unresponded message
      const processPromises = unrespondedMessages.docs.map(
        async (messageDoc) => {
          const messageData = messageDoc.data();

          try {
            if (messageData.type === "medication_reminder") {
              // Individual reminder - create single missed entry
              await createMissedTrackingEntry(
                messageData.userId,
                messageData.medicationId,
                messageData.scheduledTime || "unknown",
                messageDoc.id,
              );
            } else if (messageData.type === "medication_reminder_batch") {
              // Batch reminder - create missed entries for all medications
              const medications = messageData.medications || [];

              for (const medication of medications) {
                await createMissedTrackingEntry(
                  messageData.userId,
                  medication.medicationId,
                  messageData.scheduledTime || "unknown",
                  messageDoc.id + `_${medication.medicationId}`,
                );
              }
            }

            // Mark message as processed to avoid reprocessing
            await messageDoc.ref.update({
              userResponse: "missed_auto",
              responseTime: admin.firestore.FieldValue.serverTimestamp(),
              processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            functions.logger.info(
              `Processed missed reminder: ${messageDoc.id} for user ${messageData.userId}`,
            );
          } catch (error) {
            functions.logger.error(
              `Error processing missed reminder ${messageDoc.id}:`,
              error,
            );
            // Continue processing other messages even if one fails
          }
        },
      );

      await Promise.allSettled(processPromises);

      functions.logger.info(
        `Completed processing ${unrespondedMessages.size} missed reminders`,
      );

      return null;
    } catch (error) {
      functions.logger.error("Error processing missed reminders:", error);
      return null;
    }
  });

/**
 * Create a missed tracking entry for an unresponded reminder using NEW daily document structure
 * FIXED: Now uses user's timezone for consistent date calculation
 */
async function createMissedTrackingEntry(
  userId,
  medicationId,
  scheduledTime,
  messageId,
) {
  try {
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

    // Calculate the date when the reminder was supposed to be taken in user's timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: userTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(now);
    const year = parts.find((p) => p.type === "year").value;
    const month = parts.find((p) => p.type === "month").value;
    const day = parts.find((p) => p.type === "day").value;

    const dateKey = `${year}-${month}-${day}`;
    const timeOnly = scheduledTime; // Keep original scheduled time (already in user's timezone)

    // Reference to the daily tracking document
    const dailyTrackingRef = db
      .collection("users")
      .doc(userId)
      .collection("medicationTracking")
      .doc(dateKey);

    // Use transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
      // Read current daily tracking document
      const dailyDoc = await transaction.get(dailyTrackingRef);

      // Initialize or get existing document data
      const dailyData = dailyDoc.exists
        ? dailyDoc.data()
        : {
            date: dateKey,
            medications: {},
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          };

      // Initialize medication array if it doesn't exist
      if (!dailyData.medications[medicationId]) {
        dailyData.medications[medicationId] = { responses: [] };
      }

      // Check if we already have a response for this exact time to avoid duplicates
      const existingResponse = dailyData.medications[
        medicationId
      ].responses.find(
        (response) =>
          response.time === timeOnly && response.status === "missed",
      );

      if (existingResponse) {
        functions.logger.info(
          `Missed tracking entry already exists for ${medicationId} at ${timeOnly} on ${dateKey}, skipping`,
        );
        return;
      }

      // Add the missed response
      dailyData.medications[medicationId].responses.push({
        time: timeOnly,
        status: "missed",
        responseSid: `missed_${messageId}_${Date.now()}`, // Unique ID for missed entries
        scheduledTime: scheduledTime,
        autoGenerated: true, // Flag to indicate this was auto-generated
        sourceMessageId: messageId,
      });

      // Update timestamp
      dailyData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      // Write the daily document (creates or updates)
      transaction.set(dailyTrackingRef, dailyData);

      functions.logger.info(
        `Added missed tracking entry to daily document ${dateKey} for medication ${medicationId}: ${scheduledTime}`,
      );
    });
  } catch (error) {
    functions.logger.error(
      `Error creating missed tracking entry for medication ${medicationId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Store daily expectations for all active medications for a user
 * Called once per day when reminders are first processed
 */
async function storeDailyExpectations(userId) {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format

    // Get ALL enabled medications for this user (proper subcollection query)
    const allRemindersSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("medicationReminders")
      .where("enabled", "==", true)
      .get();

    // If no active medications, don't create expectations document
    if (allRemindersSnapshot.empty) {
      functions.logger.info(
        `No active medications found for user ${userId}, skipping expectations storage`,
      );
      return;
    }

    // Calculate expected counts for ALL active medications (simplified structure)
    const expectedMedications = {};
    allRemindersSnapshot.forEach((reminderDoc) => {
      const reminderData = reminderDoc.data();
      expectedMedications[reminderData.medicationId] =
        (reminderData.times || []).length || 1;
    });

    // Reference to today's tracking document
    const dailyTrackingRef = db
      .collection("users")
      .doc(userId)
      .collection("medicationTracking")
      .doc(today);

    // Use transaction to ensure we merge with existing expectations
    await db.runTransaction(async (transaction) => {
      const dailyDoc = await transaction.get(dailyTrackingRef);

      // Check if we need to add any new medications to existing expectations
      if (dailyDoc.exists && dailyDoc.data().expectedMedications) {
        const existingExpectations = dailyDoc.data().expectedMedications;
        const newMedications = Object.keys(expectedMedications).filter(
          (medId) => !existingExpectations.hasOwnProperty(medId),
        );

        if (newMedications.length === 0) {
          // No new medications to add - skip
          functions.logger.info(
            `Daily expectations already complete for user ${userId} on ${today}`,
          );
          return;
        }

        // Merge new medications into existing expectations
        functions.logger.info(
          `Adding ${
            newMedications.length
          } new medications to existing expectations for user ${userId} on ${today}: ${newMedications.join(
            ", ",
          )}`,
        );
      }

      // Initialize or update document with expectations
      const dailyData = dailyDoc.exists
        ? dailyDoc.data()
        : {
            date: today,
            medications: {},
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          };

      // Merge expectations (preserve existing + add new)
      if (dailyData.expectedMedications) {
        // Merge new medications with existing expectations
        dailyData.expectedMedications = {
          ...dailyData.expectedMedications,
          ...expectedMedications,
        };
      } else {
        // First time setting expectations
        dailyData.expectedMedications = expectedMedications;
      }

      dailyData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      transaction.set(dailyTrackingRef, dailyData);

      functions.logger.info(
        `Stored daily expectations for user ${userId} on ${today}: ${JSON.stringify(
          dailyData.expectedMedications,
        )}`,
      );
    });
  } catch (error) {
    functions.logger.error(
      `Error storing daily expectations for user ${userId}:`,
      error,
    );
    // Don't throw - this shouldn't block reminder sending
  }
}

/**
 * Check if we've already sent this reminder combination today and mark it as sent
 * Uses the existing daily tracking document for efficiency (zero additional DB operations)
 */
async function checkAndMarkReminderSent(userId, combinationHash) {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format

    // Reference to today's tracking document
    const dailyTrackingRef = db
      .collection("users")
      .doc(userId)
      .collection("medicationTracking")
      .doc(today);

    // Use transaction to ensure atomicity
    return await db.runTransaction(async (transaction) => {
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

      // Initialize sentReminderGroups array if it doesn't exist
      if (!dailyData.sentReminderGroups) {
        dailyData.sentReminderGroups = [];
      }

      // Check if this combination was already sent today
      if (dailyData.sentReminderGroups.includes(combinationHash)) {
        return true; // Already sent, skip
      }

      // Mark this combination as sent
      dailyData.sentReminderGroups.push(combinationHash);
      dailyData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      // Write the updated document
      transaction.set(dailyTrackingRef, dailyData);

      return false; // Not sent yet, proceed with sending
    });
  } catch (error) {
    functions.logger.error(
      `Error checking reminder sent status for user ${userId}:`,
      error,
    );
    // If we can't check, err on the side of not sending to prevent spam
    return true;
  }
}
