import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

const uploadDocsCallable = httpsCallable(functions, "clinicalreferences_uploaddocs", {
  timeout: 300000,
});
const listDocsCallable = httpsCallable(functions, "clinicalreferences_listdocs", {
  timeout: 60000,
});
const deleteDocsCallable = httpsCallable(functions, "clinicalreferences_deletedocs", {
  timeout: 60000,
});
const retrieveLexicalCallable = httpsCallable(
  functions,
  "clinicalreferences_retrieve_lexical",
  { timeout: 60000 }
);

function normalizePromptId(promptId) {
  return String(promptId || "").trim().toLowerCase();
}

/**
 * Convert a File object to a base64 string (data URI prefix stripped).
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a single PDF file.
 * @param {File} file
 * @param {{ source?: string, specialty?: string, documentType?: string }} meta
 * @returns {Promise<Object>} result from the function
 */
export async function uploadDocument(file, promptId, meta = {}) {
  const normalizedPromptId = normalizePromptId(promptId);
  if (!normalizedPromptId) {
    throw new Error("A prompt ID is required to upload clinical references.");
  }
  const fileBase64 = await fileToBase64(file);
  const result = await uploadDocsCallable({
    fileBase64,
    fileName: file.name,
    fileType: file.type || "application/pdf",
    promptId: normalizedPromptId,
    metadata: {
      source: meta.source || "",
      specialty: meta.specialty || "",
      documentType: meta.documentType || "reference",
    },
  });
  return result.data;
}

/**
 * List all clinical reference documents for the current user.
 * @returns {Promise<Array>} array of document metadata objects
 */
export async function listDocuments(promptId) {
  const normalizedPromptId = normalizePromptId(promptId);
  if (!normalizedPromptId) {
    return [];
  }
  const result = await listDocsCallable({ promptId: normalizedPromptId });
  return result.data?.documents ?? [];
}

/**
 * Delete one or more clinical reference documents.
 * @param {string|string[]} docIds
 * @returns {Promise<Object>} result from the function
 */
export async function deleteDocument(docIds, promptId) {
  const normalizedPromptId = normalizePromptId(promptId);
  if (!normalizedPromptId) {
    throw new Error("A prompt ID is required to delete clinical references.");
  }
  const ids = Array.isArray(docIds) ? docIds : [docIds];
  const result = await deleteDocsCallable({ docIds: ids, promptId: normalizedPromptId });
  return result.data;
}

/**
 * Retrieve relevant clinical references using lexical search.
 * @param {string} conversationText - Conversation or transcript to search against
 * @param {{ limit?: number }} options
 * @returns {Promise<Array>} array of matching document objects
 */
export async function retrieveClinicalReferences(
  conversationText,
  { limit = 10, promptId } = {}
) {
  const normalizedPromptId = normalizePromptId(promptId);
  if (!normalizedPromptId) {
    return [];
  }
  const result = await retrieveLexicalCallable({
    conversationText,
    limit,
    promptId: normalizedPromptId,
  });
  return result.data?.documents ?? [];
}
