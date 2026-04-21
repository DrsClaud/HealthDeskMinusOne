const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Join Virtual Queue (callable).
 * Unauthenticated users submit phone + locationId; we validate, update the location
 * queue, and create the SMS message doc so the existing Twilio onCreate trigger
 * sends the confirmation text. No client write to Firestore — avoids unauthenticated
 * message/location writes in rules.
 */
exports.joinVirtualQueue = functions.https.onCall(async (data, context) => {
  const { locationId, phone, title, textSequenceFirstMessage } = data || {};

  if (!locationId || !phone) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "locationId and phone are required",
    );
  }

  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 10) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Please enter a valid 10-digit phone number.",
    );
  }

  const db = admin.firestore();
  const locationRef = db.collection("locations").doc(String(locationId));

  const locationSnap = await locationRef.get();
  if (!locationSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Location not found");
  }

  const loc = locationSnap.data();
  const queue = loc.queue || [];
  const queueNumber = loc.queueNumber || 0;
  const queueCap = loc.queueCap != null ? loc.queueCap : 999;
  const queueEnabled = loc.queueEnabled === true;

  if (!queueEnabled) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Virtual queue is not enabled for this location",
    );
  }

  if (queue.length >= queueCap) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Queue is full. Please try again later.",
    );
  }

  const nextQueueNumber = queueNumber + 1;
  const locationName = title || loc.title || "this facility";

  const defaultBody = `Thank you for joining the Virtual Queue at ${locationName}. You should expect several more texts to guide you through this process. If your phone dies (they do that), proceed directly to ${locationName} to check in, and tell them your patient number in the Virtual Queue.`;
  const body =
    (textSequenceFirstMessage || defaultBody) +
    ` You are patient #${nextQueueNumber}.`;

  const batch = db.batch();

  batch.update(locationRef, {
    queueNumber: admin.firestore.FieldValue.increment(1),
    queue: admin.firestore.FieldValue.arrayUnion({
      id: nextQueueNumber,
      date: Date.now(),
      phone,
    }),
  });

  const messageRef = db.collection("messages").doc();
  batch.set(messageRef, {
    to: phone,
    body,
    location: locationId,
    date: Date.now(),
  });

  await batch.commit();

  return {
    success: true,
    queueNumber: nextQueueNumber,
  };
});
