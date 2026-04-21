import firebase from "firebase/compat/app";
import { db } from "./firebase";
import { getUserTimezoneWithFallback } from "../utils/timezoneUtils";

/**
 * Service for managing medication adherence and SMS reminders
 */
export const adherenceService = {
  /**
   * Enable SMS reminders for a medication
   */
  async enableReminders(medicationId, times = [], timezone = null) {
    // ALWAYS use user's actual detected timezone, ignore passed timezone if it's wrong
    timezone = getUserTimezoneWithFallback();

    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error("User must be authenticated");
      }

      // Get user data to verify phone
      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.data();

      if (!userData?.phoneVerified || !userData?.phone) {
        throw new Error("Phone number not verified");
      }

      // Get medication details
      const medicationDoc = await db
        .collection("users")
        .doc(user.uid)
        .collection("medications")
        .doc(medicationId)
        .get();

      if (!medicationDoc.exists) {
        throw new Error("Medication not found");
      }

      const medication = medicationDoc.data();

      // Use batch for atomic updates
      const batch = db.batch();

      // Create or update medication reminders
      const reminderRef = db
        .collection("users")
        .doc(user.uid)
        .collection("medicationReminders")
        .doc(medicationId);

      const reminderData = {
        medicationId,
        medicationName: medication.name,
        // Removed phone field - now using single source of truth from user document
        times,
        timezone,
        enabled: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      batch.set(reminderRef, reminderData, { merge: true });

      // Update medication document with adherence settings
      const medicationRef = db
        .collection("users")
        .doc(user.uid)
        .collection("medications")
        .doc(medicationId);

      batch.update(medicationRef, {
        adherence: {
          enabled: true,
          enabledAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error enabling reminders:", error);
      throw error;
    }
  },

  /**
   * Disable SMS reminders for a medication
   */
  async disableReminders(medicationId) {
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error("User must be authenticated");
      }

      const batch = db.batch();

      // Update reminder document
      const reminderRef = db
        .collection("users")
        .doc(user.uid)
        .collection("medicationReminders")
        .doc(medicationId);

      batch.update(reminderRef, {
        enabled: false,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Update medication document
      const medicationRef = db
        .collection("users")
        .doc(user.uid)
        .collection("medications")
        .doc(medicationId);

      batch.update(medicationRef, {
        adherence: {
          enabled: false,
          disabledAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error disabling reminders:", error);
      throw error;
    }
  },

  /**
   * Update reminder times for a medication
   */
  async updateReminderTimes(medicationId, times, timezone = null) {
    timezone = getUserTimezoneWithFallback();

    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error("User must be authenticated");
      }

      const reminderRef = db
        .collection("users")
        .doc(user.uid)
        .collection("medicationReminders")
        .doc(medicationId);

      await reminderRef.update({
        times,
        timezone,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error("Error updating reminder times:", error);
      throw error;
    }
  },

  /**
   * Get all reminders for a user
   */
  async getUserReminders(userId) {
    try {
      const remindersSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("medicationReminders")
        .get();

      return remindersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }));
    } catch (error) {
      console.error("Error getting user reminders:", error);
      throw error;
    }
  },

  /**
   * Get reminder status for a specific medication
   */
  async getReminderStatus(medicationId) {
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error("User must be authenticated");
      }

      const reminderDoc = await db
        .collection("users")
        .doc(user.uid)
        .collection("medicationReminders")
        .doc(medicationId)
        .get();

      if (reminderDoc.exists) {
        const data = reminderDoc.data();
        return {
          enabled: data.enabled || false,
          times: data.times || [],
          timezone: data.timezone || getUserTimezoneWithFallback(),
        };
      }

      return {
        enabled: false,
        times: [],
        timezone: getUserTimezoneWithFallback(),
      };
    } catch (error) {
      console.error("Error getting reminder status:", error);
      // Return default state on error
      return {
        enabled: false,
        times: [],
        timezone: getUserTimezoneWithFallback(),
      };
    }
  },

  /**
   * Create a manual adherence record
   */
  async createManualRecord(medicationId, status, notes = "") {
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error("User must be authenticated");
      }

      // Get medication details
      const medicationDoc = await db
        .collection("users")
        .doc(user.uid)
        .collection("medications")
        .doc(medicationId)
        .get();

      if (!medicationDoc.exists) {
        throw new Error("Medication not found");
      }

      const medication = medicationDoc.data();

      const recordData = {
        userId: user.uid,
        medicationId,
        medicationName: medication.name,
        status, // "taken" or "skipped"
        notes,
        source: "manual",
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("adherenceRecords").add(recordData);

      return {
        id: docRef.id,
        ...recordData,
        timestamp: new Date(),
        createdAt: new Date(),
      };
    } catch (error) {
      console.error("Error creating manual record:", error);
      throw error;
    }
  },

  /**
   * Get adherence records for a medication within a date range
   */
  async getAdherenceRecords(medicationId, startDate, endDate) {
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error("User must be authenticated");
      }

      const recordsSnapshot = await db
        .collection("adherenceRecords")
        .where("userId", "==", user.uid)
        .where("medicationId", "==", medicationId)
        .where(
          "timestamp",
          ">=",
          firebase.firestore.Timestamp.fromDate(startDate)
        )
        .where(
          "timestamp",
          "<=",
          firebase.firestore.Timestamp.fromDate(endDate)
        )
        .orderBy("timestamp", "desc")
        .get();

      return recordsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      }));
    } catch (error) {
      console.error("Error getting adherence records:", error);
      return [];
    }
  },

  /**
   * Format time for display (convert 24-hour to 12-hour format)
   */
  formatTimeForDisplay(timeString) {
    try {
      const [hours, minutes] = timeString.split(":").map(Number);
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHour}:${String(minutes).padStart(2, "0")} ${ampm}`;
    } catch (error) {
      return timeString; // Return as-is if parsing fails
    }
  },

  // Cache for reminder settings to avoid repeated Firestore queries
  _reminderCache: new Map(),

  /**
   * Get expected reminders count for a medication on a specific date
   * Uses cached reminder settings for performance (avoids 365+ queries per medication)
   */
  async getExpectedRemindersForDate(medicationId, date) {
    try {
      // Check cache first
      const cacheKey = medicationId;
      if (this._reminderCache.has(cacheKey)) {
        return this._reminderCache.get(cacheKey);
      }

      const user = firebase.auth().currentUser;
      if (!user) {
        this._reminderCache.set(cacheKey, 1);
        return 1; // Fallback
      }

      const reminderDoc = await db
        .collection("users")
        .doc(user.uid)
        .collection("medicationReminders")
        .doc(medicationId)
        .get();

      let expectedCount = 1; // Fallback
      if (reminderDoc.exists) {
        const reminderData = reminderDoc.data();
        expectedCount = reminderData.times?.length || 1;
      }

      // Cache the result to avoid repeated queries
      this._reminderCache.set(cacheKey, expectedCount);
      return expectedCount;
    } catch (error) {
      console.warn("Error getting expected reminders, using fallback:", error);
      this._reminderCache.set(medicationId, 1); // Cache fallback too
      return 1; // Fallback on error
    }
  },

  /**
   * Get daily tracking data for a specific medication over a date range
   * NEW STRUCTURE: Reads from daily documents instead of individual entries
   * Returns array of daily summaries with status and entries
   */
  async getDailyTrackingData(medicationId, daysBack = 90) {
    // 🎭 FAKE DATA FOR PRESENTATION - DISABLED TO USE REAL DATA
    const USE_FAKE_DATA = false;

    if (USE_FAKE_DATA) {
      return this._generateFakeTrackingData(medicationId, daysBack);
    }

    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);

      // Format dates as YYYY-MM-DD for document IDs
      const startDateId = startDate.toISOString().slice(0, 10);
      const endDateId = endDate.toISOString().slice(0, 10);

      // Query NEW daily tracking documents
      const trackingSnapshot = await db
        .collection("users")
        .doc(user.uid)
        .collection("medicationTracking")
        .where(firebase.firestore.FieldPath.documentId(), ">=", startDateId)
        .where(firebase.firestore.FieldPath.documentId(), "<=", endDateId)
        .orderBy(firebase.firestore.FieldPath.documentId(), "desc")
        .get();

      // Also get adherence records as backup for older data
      const adherenceSnapshot = await db
        .collection("adherenceRecords")
        .where("userId", "==", user.uid)
        .where("medicationId", "==", medicationId)
        .where(
          "timestamp",
          ">=",
          firebase.firestore.Timestamp.fromDate(startDate)
        )
        .where(
          "timestamp",
          "<=",
          firebase.firestore.Timestamp.fromDate(endDate)
        )
        .orderBy("timestamp", "desc")
        .get();

      // DEBUG: Log tracking data retrieval for specific medications
      if (
        medicationId === "TJK4fpObYgVfZ3KN1OCG" ||
        medicationId === "qk37Oo6kpYVc4VkM3uA5"
      ) {
        console.log(`🔍 DEBUG: getDailyTrackingData for ${medicationId}:`, {
          trackingSnapshotSize: trackingSnapshot.size,
          adherenceSnapshotSize: adherenceSnapshot.size,
          trackingDocs: trackingSnapshot.docs.map((doc) => ({
            id: doc.id,
            data: doc.data(),
          })),
        });
      }

      // Early return if no tracking data exists at all
      if (trackingSnapshot.size === 0 && adherenceSnapshot.size === 0) {
        return [];
      }

      // Process NEW daily tracking documents
      const dailyData = new Map();
      const dailyDocsWithExpectations = new Map(); // Store full doc data for expected medications

      trackingSnapshot.forEach((doc) => {
        const date = doc.id; // YYYY-MM-DD format
        const data = doc.data();

        // Store the full document data for expected medications lookup
        dailyDocsWithExpectations.set(date, data);

        // Get responses for this specific medication from the daily document
        const medicationData = data.medications?.[medicationId];

        // DEBUG: Log processing for specific medications
        if (
          medicationId === "TJK4fpObYgVfZ3KN1OCG" ||
          medicationId === "qk37Oo6kpYVc4VkM3uA5"
        ) {
          console.log(
            `🔍 DEBUG: Processing daily doc ${date} for ${medicationId}:`,
            {
              hasMedicationData: !!medicationData,
              hasResponses: !!(medicationData && medicationData.responses),
              medicationData,
              expectedMedications: data.expectedMedications,
              expectedForThisMed: data.expectedMedications?.[medicationId],
            }
          );
        }

        if (medicationData && medicationData.responses) {
          const entries = medicationData.responses.map((response) => ({
            time: response.time, // HH:mm
            status: response.status, // taken, missed, skipped
            method: "sms",
            responseTime: response.responseTime,
            scheduledTime: response.scheduledTime,
          }));

          dailyData.set(date, entries);
        } else if (
          data.expectedMedications &&
          data.expectedMedications[medicationId] > 0
        ) {
          // FIXED: Only add empty entry if medication was expected but has no responses
          dailyData.set(date, []);
        }
      });

      // Process adherence records as backup (older system)
      adherenceSnapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.timestamp.toDate().toISOString().slice(0, 10);

        // Only add if no daily tracking exists for this date
        if (!dailyData.has(date)) {
          dailyData.set(date, [
            {
              time: data.timestamp.toDate().toISOString().slice(11, 16),
              status: data.status === "taken" ? "taken" : "skipped",
              method: "manual",
              responseTime: data.timestamp,
            },
          ]);
        }
      });

      // Only process REAL tracking data - no fake days needed for habit tracker
      const result = [];

      console.log(
        `🔍 Found ${dailyData.size} real tracking dates for ${medicationId}, processing actual data only`
      );

      // Process only real tracking data
      for (const [dateKey, entries] of dailyData) {
        const dailyDocData = dailyDocsWithExpectations.get(dateKey);
        let expectedReminders = 0;

        if (dailyDocData && dailyDocData.expectedMedications) {
          const expectedMeds = dailyDocData.expectedMedications;
          if (expectedMeds[medicationId] !== undefined) {
            expectedReminders = expectedMeds[medicationId] || 0;
          }
        }

        // Skip days where this medication wasn't expected
        if (expectedReminders === 0) {
          continue;
        }

        const takenCount = entries.filter((e) => e.status === "taken").length;
        const adherenceRate =
          expectedReminders > 0 ? takenCount / expectedReminders : 0;

        // Determine day status
        let dayStatus = "pending";
        if (entries.length > 0 || expectedReminders > 0) {
          if (adherenceRate >= 1.0) {
            dayStatus = "taken";
          } else if (adherenceRate >= 0.8) {
            dayStatus = "good";
          } else if (adherenceRate >= 0.5) {
            dayStatus = "partial";
          } else if (adherenceRate > 0) {
            dayStatus = "poor";
          } else if (expectedReminders > 0) {
            // Check if intentionally skipped
            const skippedCount = entries.filter(
              (e) => e.status === "skipped"
            ).length;
            const skippedRate =
              expectedReminders > 0 ? skippedCount / expectedReminders : 0;
            dayStatus = skippedRate >= 0.5 ? "skipped" : "missed";
          }
        }

        const date = new Date(dateKey);
        result.push({
          date: dateKey,
          status: dayStatus,
          dayOfWeek: date.getDay(),
          adherenceRate: adherenceRate,
          expectedReminders: expectedReminders,
          entries: entries,
          isRealTrackingDay: true, // All entries are real now
        });
      }

      const finalResult = result.reverse(); // Chronological order (oldest first)

      // DEBUG: Extra logging for specific medications
      if (
        medicationId === "TJK4fpObYgVfZ3KN1OCG" ||
        medicationId === "qk37Oo6kpYVc4VkM3uA5"
      ) {
        console.log(`🔍 DEBUG: Final result for ${medicationId}:`, {
          length: finalResult.length,
          dailyDataSize: dailyData.size,
          finalResult: finalResult.slice(0, 3), // Show first 3 days
        });
      }

      console.log(
        `🔍 getDailyTrackingData for ${medicationId}: ${finalResult.length} days of data`
      );
      console.log(
        `📅 First day: ${finalResult[0]?.date}, Last day: ${finalResult[finalResult.length - 1]?.date
        }`
      );

      return finalResult;
    } catch (error) {
      console.error(
        `Error in getDailyTrackingData for ${medicationId}:`,
        error
      );
      return []; // Return empty array on error
    }
  },

  /**
   * 🎭 FAKE DATA GENERATOR FOR PRESENTATIONS
   * Generates realistic medication tracking data for demos
   */
  _generateFakeTrackingData(medicationId, daysBack = 365) {
    // Medication configurations based on user's real data
    const medicationConfigs = {
      RCxGyZEIQvz4wHNSFI0b: {
        name: "Metformin",
        expectedReminders: 2,
        times: ["08:30", "20:30"],
      },
      m4XumFKYMlPuWmWI6ccx: {
        name: "Lisinopril",
        expectedReminders: 1,
        times: ["09:00"],
      },
    };

    const config =
      medicationConfigs[medicationId] ?? {
        name: "Medication",
        expectedReminders: 1,
        times: ["09:00"],
      };

    const result = [];
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - daysBack);

    // Create realistic adherence patterns over time
    for (
      let date = new Date(startDate);
      date <= today;
      date.setDate(date.getDate() + 1)
    ) {
      const dateKey = date.toISOString().slice(0, 10);

      // Skip future dates
      if (date > today) continue;

      // Create realistic adherence patterns that improve over time
      const daysSinceStart = Math.floor(
        (date - startDate) / (1000 * 60 * 60 * 24)
      );
      const progressFactor = Math.min(daysSinceStart / 180, 1); // Improve over 6 months

      // Base adherence starts at 60% and improves to 85% over time
      let baseAdherence = 0.6 + progressFactor * 0.25;

      // Add weekly patterns (worse on weekends initially, then better)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        baseAdherence *= progressFactor > 0.5 ? 1.1 : 0.8; // Better weekends after improvement
      }

      // Add some random variation
      baseAdherence += (Math.random() - 0.5) * 0.3;
      baseAdherence = Math.max(0, Math.min(1, baseAdherence));

      // Determine how many doses were taken
      const expectedReminders = config.expectedReminders;
      let takenCount = 0;
      const entries = [];

      for (let i = 0; i < expectedReminders; i++) {
        const shouldTake = Math.random() < baseAdherence;
        const scheduledTime = config.times[i] || "09:00";

        if (shouldTake) {
          // Generate realistic response time (usually within 2 hours of scheduled)
          const scheduledHour = parseInt(scheduledTime.split(":")[0]);
          const scheduledMinute = parseInt(scheduledTime.split(":")[1]);
          const responseHour =
            scheduledHour + Math.floor(Math.random() * 3) - 1; // ±1 hour variation
          const responseMinute =
            scheduledMinute + Math.floor(Math.random() * 60) - 30; // ±30 min variation

          const actualResponseHour = Math.max(0, Math.min(23, responseHour));
          const actualResponseMinute = Math.max(
            0,
            Math.min(59, responseMinute)
          );

          entries.push({
            time: `${String(actualResponseHour).padStart(2, "0")}:${String(
              actualResponseMinute
            ).padStart(2, "0")}`,
            status: "taken",
            method: "sms",
            scheduledTime: scheduledTime,
            responseSid: `SM${Math.random().toString(36).substring(7)}`,
          });
          takenCount++;
        } else {
          // Sometimes add missed/skipped entries
          if (Math.random() < 0.3) {
            entries.push({
              time: scheduledTime,
              status: Math.random() < 0.7 ? "missed" : "skipped",
              method: "sms",
              scheduledTime: scheduledTime,
              responseSid: `SM${Math.random().toString(36).substring(7)}`,
            });
          }
        }
      }

      const adherenceRate =
        expectedReminders > 0 ? takenCount / expectedReminders : 0;

      // Determine day status based on adherence rate
      let dayStatus = "pending";
      if (adherenceRate >= 1.0) {
        dayStatus = "taken";
      } else if (adherenceRate >= 0.8) {
        dayStatus = "good";
      } else if (adherenceRate >= 0.5) {
        dayStatus = "partial";
      } else if (adherenceRate > 0) {
        dayStatus = "poor";
      } else {
        // Check if intentionally skipped
        const skippedCount = entries.filter(
          (e) => e.status === "skipped"
        ).length;
        dayStatus = skippedCount > 0 ? "skipped" : "missed";
      }

      result.push({
        date: dateKey,
        status: dayStatus,
        dayOfWeek: date.getDay(),
        adherenceRate: adherenceRate,
        expectedReminders: expectedReminders,
        entries: entries,
        isRealTrackingDay: true, // Mark as real data for calculations
        medicationName: config.name,
      });
    }

    console.log(
      `🎭 Generated ${result.length} days of fake tracking data for ${medicationId}`
    );
    return result.reverse(); // Chronological order (oldest first)
  },
};
