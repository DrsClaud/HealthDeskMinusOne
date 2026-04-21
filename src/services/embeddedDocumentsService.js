import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

const uploadDocsCallable = httpsCallable(functions, "embeddeddocuments_uploaddocs", {
  timeout: 300000,
});
const listDocsCallable = httpsCallable(functions, "embeddeddocuments_listdocs", {
  timeout: 60000,
});
const deleteDocsCallable = httpsCallable(functions, "embeddeddocuments_deletedocs", {
  timeout: 60000,
});
const setPublicCallable = httpsCallable(functions, "embeddeddocuments_setpublic", {
  timeout: 60000,
});

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
 * Upload a single document file (PDF, DOCX, TXT, MD, or ZIP).
 * @param {File} file
 * @param {Object} metadata - arbitrary metadata to attach
 * @returns {Promise<Object>} result from the function
 */
export async function uploadDocument(file, promptId, metadata = {}) {
  const normalizedPromptId = normalizePromptId(promptId);
  if (!normalizedPromptId) {
    throw new Error("A prompt ID is required to upload embedded documents.");
  }
  const fileBase64 = await fileToBase64(file);
  const result = await uploadDocsCallable({
    fileBase64,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    promptId: normalizedPromptId,
    metadata,
  });
  return result.data;
}

/**
 * List all embedded documents for the current user.
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
 * Delete one or more embedded documents (and their chunks).
 * @param {string|string[]} docIds
 * @returns {Promise<Object>} result from the function
 */
export async function deleteDocument(docIds, promptId) {
  const normalizedPromptId = normalizePromptId(promptId);
  if (!normalizedPromptId) {
    throw new Error("A prompt ID is required to delete embedded documents.");
  }
  const ids = Array.isArray(docIds) ? docIds : [docIds];
  const result = await deleteDocsCallable({ docIds: ids, promptId: normalizedPromptId });
  return result.data;
}

/**
 * Update the public flag for one embedded document.
 * @param {string} docId
 * @param {boolean} isPublic
 * @returns {Promise<Object>} result from the function
 */
export async function updateDocumentPublic(docId, isPublic, promptId) {
  const normalizedPromptId = normalizePromptId(promptId);
  if (!normalizedPromptId) {
    throw new Error("A prompt ID is required to update embedded document visibility.");
  }
  const result = await setPublicCallable({ docId, isPublic, promptId: normalizedPromptId });
  return result.data;
}
