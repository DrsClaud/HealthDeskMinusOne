const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Notify a patient that it's their turn (or call them in).
 * Replaces the client-side batch in QueuePatient.textPatient().
 */
exports.notifyQueuePatient = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { locationId, patientId, type, address, title } = data || {};
  if (!locationId || patientId == null || !type) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "locationId, patientId, and type are required"
    );
  }

  const db = admin.firestore();
  const locationRef = db.collection("locations").doc(String(locationId));
  const locationSnap = await locationRef.get();
  if (!locationSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Location not found");
  }

  const loc = locationSnap.data();
  const queue = loc.queue ? [...loc.queue] : [];
  const patientIndex = queue.findIndex((p) => p.id === patientId);
  if (patientIndex === -1) {
    throw new functions.https.HttpsError("not-found", "Patient not found in queue");
  }

  const patient = queue[patientIndex];
  const updatedPatient =
    type === "call"
      ? { ...patient, called: Date.now() }
      : { ...patient, registered: Date.now() };
  queue[patientIndex] = updatedPatient;

  const locationName = title || loc.title || "your facility";
  const locationAddress = address || loc.address || "";
  const body =
    type === "call"
      ? `${locationName} is ready for you to come in. The address is ${locationAddress}. Show this text to the welcome desk. You are "Patient ${patient.id}".`
      : `Please expect a registration phone call shortly from ${locationName}.`;

  const batch = db.batch();
  batch.update(locationRef, { queue });
  batch.set(db.collection("messages").doc(), {
    to: patient.phone,
    body,
  });
  await batch.commit();

  return { success: true };
});

/**
 * Send a patient their registration link via SMS.
 * Replaces the client-side batch in QueuePatient.registerPatient().
 */
exports.sendPatientRegistration = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { locationId, patientId, appOrigin, textSequenceSecondMessage, healthcareQueEnabled } = data || {};
  if (!locationId || patientId == null) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "locationId and patientId are required"
    );
  }

  const db = admin.firestore();
  const locationRef = db.collection("locations").doc(String(locationId));
  const locationSnap = await locationRef.get();
  if (!locationSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Location not found");
  }

  const loc = locationSnap.data();
  const queue = loc.queue ? [...loc.queue] : [];
  const patientIndex = queue.findIndex((p) => p.id === patientId);
  if (patientIndex === -1) {
    throw new functions.https.HttpsError("not-found", "Patient not found in queue");
  }

  const patient = queue[patientIndex];

  // Create registration doc
  const registrationRef = db.collection("registrations").doc();
  const registrationDoc = {
    id: registrationRef.id,
    location: locationId,
    patient: patientId,
    uid: context.auth.uid,
  };

  // Mark patient as registration sent
  queue[patientIndex] = { ...patient, registrationSent: true };

  const defaultMessage = "Please go to this link to complete the virtual registration sequence.";
  const messageText = textSequenceSecondMessage || defaultMessage;
  const registrationLink =
    healthcareQueEnabled !== false
      ? ` ${appOrigin || "https://hlthdsk.com"}/registration/${registrationRef.id}`
      : "";
  const body = messageText + registrationLink;

  const batch = db.batch();
  batch.set(registrationRef, registrationDoc);
  batch.update(locationRef, { queue });
  batch.set(db.collection("messages").doc(), {
    to: patient.phone,
    body,
  });
  await batch.commit();

  return { success: true, registrationId: registrationRef.id };
});

/**
 * Remove a patient from queue and delete any matching registration docs.
 * Replaces client-side registrations query/delete in QueuePatient.deletePatient().
 */
exports.deleteQueuePatient = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { locationId, patientId } = data || {};
  if (!locationId || patientId == null) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "locationId and patientId are required"
    );
  }

  const db = admin.firestore();
  const locationRef = db.collection("locations").doc(String(locationId));
  const locationSnap = await locationRef.get();
  if (!locationSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Location not found");
  }

  const loc = locationSnap.data();
  const queue = loc.queue ? [...loc.queue] : [];
  const patientIndex = queue.findIndex((p) => p.id === patientId);
  if (patientIndex === -1) {
    throw new functions.https.HttpsError("not-found", "Patient not found in queue");
  }

  // Authorization: allow platform admins or staff assigned to this location
  const userSnap = await db.collection("users").doc(context.auth.uid).get();
  const userData = userSnap.exists ? userSnap.data() : null;
  const isPlatformAdmin = context.auth.token && context.auth.token.admin === true;
  const isLocationStaff = userData && String(userData.location) === String(locationId);
  if (!isPlatformAdmin && !isLocationStaff) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "You do not have permission to modify this queue."
    );
  }

  const registrationQuery = await db
    .collection("registrations")
    .where("location", "==", String(locationId))
    .where("patient", "==", patientId)
    .get();

  queue.splice(patientIndex, 1);

  const batch = db.batch();
  batch.update(locationRef, { queue });
  registrationQuery.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return { success: true };
});
