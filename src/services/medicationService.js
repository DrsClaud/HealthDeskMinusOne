import { db } from "./firebase";
import { serverTimestamp } from "firebase/firestore";

export const medicationService = {
  // Create a new medication
  async createMedication(userId, medicationData) {
    try {
      const now = new Date();
      const docRef = await db
        .collection("users")
        .doc(userId)
        .collection("medications")
        .add({
          ...medicationData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

      return {
        id: docRef.id,
        ...medicationData,
        createdAt: now, // Add current date to returned object
        updatedAt: now,
      };
    } catch (error) {
      console.error("Error creating medication:", error);
      throw error;
    }
  },

  // Update an existing medication
  async updateMedication(userId, medicationId, medicationData) {
    try {
      // Update the main medication document
      await db
        .collection("users")
        .doc(userId)
        .collection("medications")
        .doc(medicationId)
        .update({
          ...medicationData,
          updatedAt: serverTimestamp(),
        });

      // If medication name was updated, also update the medicationName field
      // in any associated reminder documents to maintain data consistency
      if (medicationData.name) {
        const reminderRef = db
          .collection("users")
          .doc(userId)
          .collection("medicationReminders")
          .doc(medicationId);

        // Check if reminder document exists before updating
        const reminderDoc = await reminderRef.get();
        if (reminderDoc.exists) {
          await reminderRef.update({
            medicationName: medicationData.name,
            updatedAt: serverTimestamp(),
          });
        }
      }

      return {
        id: medicationId,
        ...medicationData,
      };
    } catch (error) {
      console.error("Error updating medication:", error);
      throw error;
    }
  },

  // Delete a medication
  async deleteMedication(userId, medicationId) {
    try {
      // First, delete all associated reminder documents from medicationReminders subcollection
      const reminderQuery = await db
        .collection("users")
        .doc(userId)
        .collection("medicationReminders")
        .where("medicationId", "==", medicationId)
        .get();

      // Delete all matching reminder documents
      const batch = db.batch();
      reminderQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Also delete the main medication document
      const medicationRef = db
        .collection("users")
        .doc(userId)
        .collection("medications")
        .doc(medicationId);
      batch.delete(medicationRef);

      // Execute all deletions atomically
      await batch.commit();
    } catch (error) {
      console.error("Error deleting medication:", error);
      throw error;
    }
  },

  // Get all medications for a user
  async getMedications(userId) {
    try {
      const snapshot = await db
        .collection("users")
        .doc(userId)
        .collection("medications")
        .orderBy("createdAt", "desc")
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamps to JS Dates
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }));
    } catch (error) {
      console.error("Error getting medications:", error);
      throw error;
    }
  },

  // Get a single medication
  async getMedication(userId, medicationId) {
    try {
      const doc = await db
        .collection("users")
        .doc(userId)
        .collection("medications")
        .doc(medicationId)
        .get();

      if (!doc.exists) {
        throw new Error("Medication not found");
      }

      return {
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamps to JS Dates
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      };
    } catch (error) {
      console.error("Error getting medication:", error);
      throw error;
    }
  },
};
