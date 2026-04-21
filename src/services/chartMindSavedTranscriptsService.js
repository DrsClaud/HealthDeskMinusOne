import firebase from "firebase/compat/app";
import { db } from "services/firebase";

const COLLECTION = "chartmind_savedtranscripts";
const EXAMPLE_TRANSCRIPT_TYPE = "example_transcript";

function getCollection(userId) {
  if (!userId) {
    throw new Error("userId is required");
  }

  return db.collection("users").doc(userId).collection(COLLECTION);
}

function normalizeSavedTranscript(doc) {
  const data = doc.data() || {};

  return {
    id: doc.id,
    title: data.title || "",
    body: data.body || "",
    type: data.type || EXAMPLE_TRANSCRIPT_TYPE,
    userId: data.userId || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

export function subscribeSavedTranscripts(userId, onNext, onError) {
  return getCollection(userId)
    .orderBy("updatedAt", "desc")
    .onSnapshot(
      (snapshot) => {
        onNext(
          snapshot.docs
            .map(normalizeSavedTranscript)
            .filter((item) => item.type === EXAMPLE_TRANSCRIPT_TYPE),
        );
      },
      (error) => {
        console.error(
          "[chartMindSavedTranscriptsService] Failed to subscribe:",
          error,
        );
        onError?.(error);
      },
    );
}

export async function createSavedTranscript(userId, { title, body }) {
  const trimmedTitle = title?.trim();
  const trimmedBody = body?.trim();

  if (!trimmedTitle || !trimmedBody) {
    throw new Error("title and body are required");
  }

  const now = firebase.firestore.FieldValue.serverTimestamp();
  const payload = {
    userId,
    title: trimmedTitle,
    body: trimmedBody,
    type: EXAMPLE_TRANSCRIPT_TYPE,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getCollection(userId).add(payload);
  return docRef.id;
}

export async function updateSavedTranscript(userId, transcriptId, updates) {
  const trimmedTitle = updates?.title?.trim();
  const trimmedBody = updates?.body?.trim();

  if (!transcriptId) {
    throw new Error("transcriptId is required");
  }

  if (!trimmedTitle || !trimmedBody) {
    throw new Error("title and body are required");
  }

  await getCollection(userId).doc(transcriptId).set(
    {
      userId,
      title: trimmedTitle,
      body: trimmedBody,
      type: EXAMPLE_TRANSCRIPT_TYPE,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export { COLLECTION as CHARTMIND_SAVED_TRANSCRIPTS_COLLECTION };
