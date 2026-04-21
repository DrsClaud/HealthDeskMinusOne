const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { randomUUID } = require("crypto");

/**
 * Submit a patient registration (callable).
 * Unauthenticated patients follow an SMS link, fill out the form, and call
 * this function with their photo ID as base64. We validate the registration
 * exists and hasn't been submitted, upload the photo via Admin SDK (bypassing
 * storage rules), then update the registration doc and location queue.
 *
 * This replaces the direct client-side Storage upload + Firestore batch in
 * PatientRegistration.js and closes the unauthenticated storage write vulnerability.
 */
exports.submitPatientRegistration = functions.https.onCall(
  async (data, context) => {
    const { registrationId, email, name, photoBase64 } = data || {};

    if (!registrationId || !email || !name || !photoBase64) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "registrationId, email, name, and photoBase64 are required"
      );
    }

    // base64 chars * 0.75 ≈ binary bytes; 8M chars ≈ 6MB binary
    if (photoBase64.length > 8 * 1024 * 1024) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Image is too large. Maximum 6MB."
      );
    }

    const db = admin.firestore();
    const registrationRef = db.collection("registrations").doc(registrationId);
    const registrationSnap = await registrationRef.get();

    if (!registrationSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Registration not found."
      );
    }

    const registration = registrationSnap.data();

    if (registration.submitted) {
      throw new functions.https.HttpsError(
        "already-exists",
        "Registration already submitted."
      );
    }

    // Upload photo via Admin SDK — no client storage permissions needed.
    // Bucket name must be explicit because admin is initialized without storageBucket.
    const { storageBucket } = JSON.parse(process.env.FIREBASE_CONFIG || "{}");
    const bucket = admin.storage().bucket(storageBucket);
    const filePath = `registrations/${registration.uid}/${registrationId}.jpg`;
    const fileRef = bucket.file(filePath);

    const imageBuffer = Buffer.from(photoBase64, "base64");
    const downloadToken = randomUUID();

    await fileRef.save(imageBuffer, {
      metadata: {
        contentType: "image/jpeg",
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;

    // Update the patient entry in the location queue with the photo URL
    const locationRef = db
      .collection("locations")
      .doc(String(registration.location));
    const locationSnap = await locationRef.get();

    if (!locationSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Location not found.");
    }

    const loc = locationSnap.data();
    const queue = loc.queue ? [...loc.queue] : [];
    const patientIndex = queue.findIndex((p) => p.id === registration.patient);

    if (patientIndex !== -1) {
      queue[patientIndex] = {
        ...queue[patientIndex],
        registration: registrationId,
        photoId: downloadUrl,
      };
    }

    const batch = db.batch();
    batch.update(locationRef, { queue });
    batch.update(registrationRef, {
      email,
      name,
      photoId: filePath,
      submitted: true,
    });
    await batch.commit();

    return { success: true };
  }
);
