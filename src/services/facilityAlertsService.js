import { db } from "./firebase";
import firebase from "firebase/compat/app";

/**
 * Service for managing facility wait time alert reminders
 * Similar to adherenceService but focused on facility admin notifications
 */
class FacilityAlertsService {
  /**
   * Enable facility alerts for a user
   */
  async enableAlerts(
    userId,
    facilityId,
    facilityName,
    alertTimes = [],
    timezone = "UTC"
  ) {
    try {
      const alertData = {
        facilityId,
        facilityName,
        enabled: true,
        alertTimes,
        timezone,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      await db
        .collection("users")
        .doc(userId)
        .collection("facilityAlerts")
        .doc(facilityId)
        .set(alertData);

      return { success: true };
    } catch (error) {
      console.error("Error enabling facility alerts:", error);
      throw error;
    }
  }

  /**
   * Disable facility alerts for a user
   */
  async disableAlerts(userId, facilityId) {
    try {
      await db
        .collection("users")
        .doc(userId)
        .collection("facilityAlerts")
        .doc(facilityId)
        .update({
          enabled: false,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true };
    } catch (error) {
      console.error("Error disabling facility alerts:", error);
      throw error;
    }
  }

  /**
   * Update alert times for a facility
   */
  async updateAlertTimes(userId, facilityId, alertTimes, timezone) {
    try {
      await db
        .collection("users")
        .doc(userId)
        .collection("facilityAlerts")
        .doc(facilityId)
        .update({
          alertTimes,
          timezone,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true };
    } catch (error) {
      console.error("Error updating alert times:", error);
      throw error;
    }
  }

  /**
   * Get facility alert settings for a user
   */
  async getAlertSettings(userId, facilityId) {
    try {
      const doc = await db
        .collection("users")
        .doc(userId)
        .collection("facilityAlerts")
        .doc(facilityId)
        .get();

      if (doc.exists) {
        return doc.data();
      } else {
        // Return default settings if no document exists
        return {
          facilityId,
          enabled: false,
          alertTimes: [],
          timezone: "UTC",
        };
      }
    } catch (error) {
      console.error("Error getting alert settings:", error);
      throw error;
    }
  }

  /**
   * Set up real-time listener for alert settings
   */
  setupAlertSettingsListener(userId, facilityId, callback) {
    return db
      .collection("users")
      .doc(userId)
      .collection("facilityAlerts")
      .doc(facilityId)
      .onSnapshot((doc) => {
        if (doc.exists) {
          callback(doc.data());
        } else {
          // Return default settings if no document exists
          callback({
            facilityId,
            enabled: false,
            alertTimes: [],
            timezone: "UTC",
          });
        }
      });
  }

  /**
   * Update the last wait time update timestamp
   * Called whenever admin submits a wait time update
   */
  async recordWaitTimeUpdate(userId, facilityId) {
    try {
      // Only update if alerts are enabled for this facility
      const alertDoc = await db
        .collection("users")
        .doc(userId)
        .collection("facilityAlerts")
        .doc(facilityId)
        .get();

      if (alertDoc.exists && alertDoc.data().enabled) {
        await db
          .collection("users")
          .doc(userId)
          .collection("facilityAlerts")
          .doc(facilityId)
          .update({
            lastWaitTimeUpdate: Date.now(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
      }

      return { success: true };
    } catch (error) {
      console.error("Error recording wait time update:", error);
      // Don't throw - this is a background operation
      return { success: false, error };
    }
  }

  /**
   * Format time for display (12-hour format)
   */
  formatTimeForDisplay(time24) {
    if (!time24 || typeof time24 !== "string") return "";

    const [hours, minutes] = time24.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${String(minutes).padStart(2, "0")} ${ampm}`;
  }

  /**
   * Get preset alert time options for quick setup
   */
  getPresetOptions() {
    return [
      {
        label: "Every 4 Hours",
        times: ["08:00", "12:00", "16:00", "20:00"],
      },
      {
        label: "Twice Daily",
        times: ["09:00", "17:00"],
      },
      {
        label: "Once Daily",
        times: ["09:00"],
      },
    ];
  }

  /**
   * Check if wait time is stale (older than X hours)
   */
  isWaitTimeStale(lastUpdate, hoursThreshold = 4) {
    if (!lastUpdate) return true;

    const now = Date.now();
    const diffHours = (now - lastUpdate) / (1000 * 60 * 60);
    return diffHours >= hoursThreshold;
  }
}

// Export singleton instance
export const facilityAlertsService = new FacilityAlertsService();
