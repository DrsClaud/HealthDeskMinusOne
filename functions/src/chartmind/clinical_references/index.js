const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const pdfParse = require("pdf-parse");
const AdmZip = require("adm-zip");
const path = require("path");
const { randomUUID } = require("crypto");

const { queryLLM } = require("../../nlp");

const db = admin.firestore();

const DEFAULT_STORAGE_BUCKET = "hlthdsk-sandbox-2cc23.appspot.com";
const STORAGE_PREFIX = "documents/chartdmind/clinical_references";
const ROOT_DOC_PATH = "chartdmind/clinical_references";
const ROOT_COLLECTION = "documents";
const MAX_DOWNLOAD_BYTES = 200 * 1024 * 1024;
const MAX_INLINE_UPLOAD_BYTES = 8 * 1024 * 1024;
const PDF_BATCH_SIZE = 5;
const TAG_TEXT_LIMIT = 50000;
const DEFAULT_RETRIEVE_LIMIT = 10;
const MAX_RETRIEVE_LIMIT = 25;
const MAX_CONVERSATION_CHARS = 20000;
const MAX_TERMS_PER_MESSAGE = 30;
const MIN_TERM_LENGTH = 3;
const MAX_REFS_PER_TERM = 3;
const MAX_REFS_BY_TITLE = 15;
const DEFAULT_RETRIEVE_MODEL = "openai/gpt-5-nano";

const TAG_EXTRACTION_PROMPT = `You are a clinical document indexing system. Given text from a clinical document, extract structured tags for indexing.

Return ONLY valid JSON (no markdown fences, no commentary) in this exact format:
{
  "primaryTopics": ["main topic 1", "main topic 2"],
  "symptoms": ["symptom1", "symptom2"],
  "diagnoses": ["diagnosis1", "abbreviation1"],
  "tests": ["test1", "test2"],
  "treatments": ["treatment1", "drug1"],
  "scoringSystems": ["scoring system name"],
  "general": ["general topic terms"]
}

Rules:
- primaryTopics must contain the 1-3 main clinical subjects the document is primarily about.
- Include both full names and common abbreviations when they appear.
- Include common synonyms when clinically relevant.
- All tags should be lowercase.
- Include drug names, scoring systems, imaging modalities, and lab tests.
- Be comprehensive in symptom, diagnosis, test, and treatment tags.
- If the text is partially unreadable, extract what you confidently can.
- Return empty arrays for categories with no relevant terms.`;

const CONVERSATION_TERM_EXTRACTION_PROMPT = `You are a clinical conversation indexing system.

Given a medical chat conversation, extract the core clinical topics and searchable terms that should be used to find relevant reference documents.

Return ONLY valid JSON in this exact format:
{
  "primaryTopics": ["topic 1", "topic 2"],
  "symptoms": ["symptom 1"],
  "diagnoses": ["diagnosis 1"],
  "tests": ["test 1"],
  "treatments": ["treatment 1"],
  "scoringSystems": ["score 1"],
  "general": ["general topic 1"],
  "searchTerms": ["term 1", "term 2"]
}

Rules:
- All values must be lowercase.
- primaryTopics should contain the 1-3 main clinical subjects of the conversation.
- searchTerms should be the best concise retrieval phrases for finding relevant documents.
- Include diagnoses, tests, treatments, symptoms, and abbreviations when relevant.
- Do not invent facts that are not supported by the conversation.
- Return empty arrays for categories with no content.`;

const GENERIC_TERM_BLOCKLIST = new Set([
  "management", "assessment", "assessments", "guidelines", "guideline",
  "protocols", "protocol", "referral", "referrals", "overview",
  "introduction", "document", "documents", "information", "general",
  "section", "sections", "recommendations", "recommendation", "what",
  "about", "when", "where", "which", "this", "that", "with", "from",
  "have", "been", "they", "there", "would", "could", "should", "will",
  "your", "please", "need", "want", "know", "think", "like", "some",
  "more", "other", "into", "only", "just", "also", "such", "than",
  "then", "them", "these", "those", "after", "before", "being", "both",
  "does", "during", "each", "here", "make", "many", "most", "must",
  "over", "same", "take", "were", "while", "their", "said", "patient",
  "patients", "clinical", "medicine", "medical", "health",
]);

function getStorageBucketName() {
  const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || "{}");
  return firebaseConfig.storageBucket || DEFAULT_STORAGE_BUCKET;
}

function getStorageBucket(bucketName = getStorageBucketName()) {
  return admin.storage().bucket(bucketName);
}

function getReferencesRootRef() {
  return db.doc(ROOT_DOC_PATH);
}

function getReferencesCollectionRef() {
  return getReferencesRootRef().collection(ROOT_COLLECTION);
}

function normalizeStringArray(values, limit = Infinity) {
  if (!Array.isArray(values)) {
    return [];
  }

  const deduped = [];
  const seen = new Set();

  for (const value of values) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    deduped.push(normalized);
    seen.add(normalized);

    if (deduped.length >= limit) {
      break;
    }
  }

  return deduped;
}

function stripCodeFences(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function sanitizeFileName(fileName) {
  return String(fileName || "document.pdf")
    .split(/[\\/]/)
    .pop()
    .replace(/[^\w.\-]+/g, "_");
}

function normalizeTextValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePromptId(value) {
  return normalizeTextValue(value);
}

function getExtension(fileName = "") {
  return path.extname(String(fileName || "")).toLowerCase();
}

function inferFileName(data) {
  if (data.fileName) {
    return sanitizeFileName(data.fileName);
  }

  if (data.storagePath) {
    return sanitizeFileName(path.basename(data.storagePath));
  }

  if (data.fileURL) {
    try {
      const url = new URL(data.fileURL);
      return sanitizeFileName(path.basename(decodeURIComponent(url.pathname)));
    } catch (error) {
      return "document";
    }
  }

  return "document";
}

function normalizeConversationInput(payload) {
  if (typeof payload.conversation === "string" && payload.conversation.trim()) {
    return payload.conversation.trim();
  }

  if (typeof payload.text === "string" && payload.text.trim()) {
    return payload.text.trim();
  }

  if (Array.isArray(payload.messages) && payload.messages.length > 0) {
    const parts = payload.messages
      .filter((message) => message && typeof message === "object")
      .map((message) => {
        const role = String(message.role || "user").trim().toLowerCase();
        const content = String(message.content || "").trim();
        if (!content) {
          return "";
        }

        return `${role}: ${content}`;
      })
      .filter(Boolean);

    if (parts.length > 0) {
      return parts.join("\n");
    }
  }

  throw new functions.https.HttpsError(
    "invalid-argument",
    "Provide conversation, text, or a non-empty messages array."
  );
}

function coerceLimit(value, defaultValue = DEFAULT_RETRIEVE_LIMIT) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return defaultValue;
  }

  return Math.min(Math.floor(numeric), MAX_RETRIEVE_LIMIT);
}

function extractTermsFromText(text) {
  if (!text || typeof text !== "string") {
    return [];
  }

  const words = text
    .replace(/[\n\r]+/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ""))
    .filter((word) => word.length >= MIN_TERM_LENGTH);

  const seen = new Set();
  const terms = [];

  for (const word of words) {
    const normalized = normalizeTextValue(word);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    terms.push(normalized);

    if (terms.length >= MAX_TERMS_PER_MESSAGE) {
      break;
    }
  }

  return terms;
}

function filterToClinicalTerms(terms) {
  return normalizeStringArray(terms).filter(
    (term) => term.length >= MIN_TERM_LENGTH && !GENERIC_TERM_BLOCKLIST.has(term)
  );
}

function isWordBoundaryMatch(haystack, needle) {
  const isBoundaryChar = (char) => !char || /[\s\-_/(),;:.]/.test(char);
  let index = haystack.indexOf(needle);

  while (index !== -1) {
    const before = index === 0 ? "" : haystack[index - 1];
    const after =
      index + needle.length >= haystack.length ? "" : haystack[index + needle.length];

    if (isBoundaryChar(before) && isBoundaryChar(after)) {
      return true;
    }

    index = haystack.indexOf(needle, index + 1);
  }

  return false;
}

function buildReferenceSummary(ref) {
  return {
    id: ref.id,
    userId: ref.userId || null,
    promptId: ref.promptId || null,
    fileName: ref.fileName || null,
    source: ref.metadata?.source || null,
    author: ref.metadata?.author || null,
    documentType: ref.metadata?.documentType || null,
    specialty: ref.metadata?.specialty || null,
    downloadURL: ref.downloadURL || null,
    storagePath: ref.storagePath || null,
    storageBucket: ref.storageBucket || null,
    primaryTopics: Array.isArray(ref.primaryTopics) ? ref.primaryTopics : [],
    tagSearchIndex: Array.isArray(ref.tagSearchIndex) ? ref.tagSearchIndex : [],
    metadata: ref.metadata || {},
    createdAt: ref.createdAt || null,
    updatedAt: ref.updatedAt || null,
  };
}

function findReferencesByTitle(searchTerms, references) {
  if (!searchTerms?.length || !references?.length) {
    return [];
  }

  const normalizedTerms = filterToClinicalTerms(searchTerms).sort(
    (left, right) => right.length - left.length
  );
  const byRefId = new Map();

  for (const term of normalizedTerms) {
    for (const ref of references) {
      const title = `${ref.fileName || ""} ${ref.metadata?.source || ""}`
        .trim()
        .toLowerCase();
      const refSourceLower = normalizeTextValue(ref.metadata?.source || "");
      if (!title || term === refSourceLower) {
        continue;
      }

      const primaryTopics = normalizeStringArray(ref.primaryTopics || []);
      const tagsForMatch = primaryTopics.length
        ? primaryTopics
        : normalizeStringArray(ref.tagSearchIndex || []);
      const searchable = `${title} ${tagsForMatch.join(" ")}`.trim().toLowerCase();

      if (!searchable || !isWordBoundaryMatch(searchable, term)) {
        continue;
      }

      if (!byRefId.has(ref.id)) {
        byRefId.set(ref.id, {
          ...buildReferenceSummary(ref),
          matchedTag: term,
          matchedTerms: [term],
          matchScore: 80,
          matchType: "title",
        });
      }
    }
  }

  return Array.from(byRefId.values()).slice(0, MAX_REFS_BY_TITLE);
}

function findMatchingReferences(searchTerms, references) {
  const matchMap = {};

  if (!searchTerms?.length || !references?.length) {
    return matchMap;
  }

  const normalizedTerms = filterToClinicalTerms(searchTerms);

  for (const term of normalizedTerms) {
    const matches = [];

    for (const ref of references) {
      const primaryTopics = normalizeStringArray(ref.primaryTopics || []);
      const tagsToMatch = primaryTopics.length
        ? primaryTopics
        : normalizeStringArray(ref.tagSearchIndex || []);
      let bestTag = null;
      let bestScore = 0;

      for (const tag of tagsToMatch) {
        let score = 0;

        if (tag === term) {
          score = 100;
        } else if (
          term.includes(tag) &&
          tag.length >= 6 &&
          isWordBoundaryMatch(term, tag)
        ) {
          const coverage = tag.length / term.length;
          if (coverage >= 0.35) {
            score = 50 + Math.round(coverage * 40);
          }
        } else if (
          tag.includes(term) &&
          term.length >= 3 &&
          isWordBoundaryMatch(tag, term)
        ) {
          const coverage = term.length / tag.length;
          if (coverage >= 0.4) {
            score = 40 + Math.round(coverage * 30);
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestTag = tag;
        }
      }

      if (bestScore > 0 && bestTag) {
        matches.push({
          ...buildReferenceSummary(ref),
          matchedTag: bestTag,
          matchedTerms: [term],
          matchScore: bestScore,
          matchType: "tag",
        });
      }
    }

    if (matches.length > 0) {
      matches.sort((left, right) => right.matchScore - left.matchScore);
      matchMap[term] = matches.slice(0, MAX_REFS_PER_TERM);
    }
  }

  return matchMap;
}

function mergeReferenceMatches({ titleMatches, matchMap, limit }) {
  const merged = new Map();

  const upsert = (ref) => {
    const existing = merged.get(ref.id);
    if (!existing) {
      merged.set(ref.id, {
        ...ref,
        matchedTerms: normalizeStringArray(ref.matchedTerms || []),
      });
      return;
    }

    const combinedTerms = normalizeStringArray([
      ...(existing.matchedTerms || []),
      ...(ref.matchedTerms || []),
    ]);

    if ((ref.matchScore || 0) > (existing.matchScore || 0)) {
      merged.set(ref.id, {
        ...existing,
        ...ref,
        matchedTerms: combinedTerms,
      });
      return;
    }

    merged.set(ref.id, {
      ...existing,
      matchedTerms: combinedTerms,
    });
  };

  for (const ref of titleMatches || []) {
    upsert(ref);
  }

  for (const refs of Object.values(matchMap || {})) {
    for (const ref of refs) {
      upsert(ref);
    }
  }

  return Array.from(merged.values())
    .sort((left, right) => (right.matchScore || 0) - (left.matchScore || 0))
    .slice(0, limit);
}

async function loadReferenceDocumentsForUser(userId, promptId) {
  const snapshot = await getReferencesCollectionRef()
    .where("userId", "==", userId)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
    };
  }).filter((document) => normalizePromptId(document.promptId) === promptId);
}

async function extractConversationTermsWithLLM(conversationText, model) {
  const promptText = String(conversationText || "")
    .slice(0, MAX_CONVERSATION_CHARS)
    .trim();

  const response = await queryLLM(
    [
      { role: "system", content: CONVERSATION_TERM_EXTRACTION_PROMPT },
      {
        role: "user",
        content: `Extract retrieval terms from this medical conversation:\n\n${promptText}`,
      },
    ],
    1500,
    0.1,
    model || DEFAULT_RETRIEVE_MODEL,
    "chartmind clinical reference retrieval term extraction"
  );

  let parsed;

  try {
    parsed = JSON.parse(stripCodeFences(response));
  } catch (error) {
    throw new functions.https.HttpsError(
      "internal",
      "LLM returned invalid retrieval JSON."
    );
  }

  const extraction = {
    primaryTopics: normalizeStringArray(parsed.primaryTopics, 3),
    symptoms: normalizeStringArray(parsed.symptoms),
    diagnoses: normalizeStringArray(parsed.diagnoses),
    tests: normalizeStringArray(parsed.tests),
    treatments: normalizeStringArray(parsed.treatments),
    scoringSystems: normalizeStringArray(parsed.scoringSystems),
    general: normalizeStringArray(parsed.general),
    searchTerms: normalizeStringArray(parsed.searchTerms),
  };

  extraction.searchTerms = filterToClinicalTerms([
    ...extraction.searchTerms,
    ...extraction.primaryTopics,
    ...extraction.symptoms,
    ...extraction.diagnoses,
    ...extraction.tests,
    ...extraction.treatments,
    ...extraction.scoringSystems,
    ...extraction.general,
  ]);

  return extraction;
}

async function runReferenceRetrieval({
  userId,
  promptId,
  conversationText,
  searchTerms,
  limit,
}) {
  const references = await loadReferenceDocumentsForUser(userId, promptId);
  const normalizedSearchTerms = filterToClinicalTerms(searchTerms);
  const titleMatches = findReferencesByTitle(normalizedSearchTerms, references);
  const matchMap = findMatchingReferences(normalizedSearchTerms, references);
  const documents = mergeReferenceMatches({
    titleMatches,
    matchMap,
    limit,
  });

  return {
    referencesConsidered: references.length,
    searchTerms: normalizedSearchTerms,
    titleMatchesCount: titleMatches.length,
    matchMap,
    documents,
    conversationPreview: conversationText.slice(0, 500),
  };
}

function parseGsUrl(gsUrl) {
  const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(String(gsUrl || ""));
  if (!match) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid gs:// fileURL."
    );
  }

  return {
    bucketName: match[1],
    filePath: match[2],
  };
}

async function readSourceBuffer(data) {
  const sources = [data.fileBase64, data.fileURL, data.storagePath].filter(Boolean);
  if (sources.length !== 1) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Provide exactly one of fileBase64, fileURL, or storagePath."
    );
  }

  if (data.fileBase64) {
    const cleanedBase64 = String(data.fileBase64)
      .replace(/^data:.*?;base64,/, "")
      .trim();
    const buffer = Buffer.from(cleanedBase64, "base64");

    if (!buffer.length) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "fileBase64 decoded to an empty buffer."
      );
    }

    if (buffer.length > MAX_INLINE_UPLOAD_BYTES) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Inline uploads must be 8MB or smaller. Use fileURL or storagePath for larger files."
      );
    }

    return buffer;
  }

  if (data.storagePath) {
    const [buffer] = await getStorageBucket().file(String(data.storagePath)).download();
    return buffer;
  }

  if (String(data.fileURL).startsWith("gs://")) {
    const { bucketName, filePath } = parseGsUrl(data.fileURL);
    const [buffer] = await getStorageBucket(bucketName).file(filePath).download();
    return buffer;
  }

  try {
    const response = await axios.get(String(data.fileURL), {
      responseType: "arraybuffer",
      timeout: 300000,
      maxContentLength: MAX_DOWNLOAD_BYTES,
    });

    return Buffer.from(response.data);
  } catch (error) {
    if (error.response) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Failed to download file: HTTP ${error.response.status}.`
      );
    }

    if (error.code === "ECONNABORTED") {
      throw new functions.https.HttpsError(
        "deadline-exceeded",
        "File download timed out."
      );
    }

    throw new functions.https.HttpsError(
      "internal",
      `Failed to read source file: ${error.message}`
    );
  }
}

function detectUploadKind(buffer, fileName, fileType) {
  const normalizedType = String(fileType || "").toLowerCase().trim();
  const extension = getExtension(fileName);
  const startsWithPdf = buffer.subarray(0, 4).toString("utf8") === "%PDF";
  const startsWithZip =
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);

  if (
    normalizedType === "application/pdf" ||
    normalizedType === "pdf" ||
    extension === ".pdf" ||
    startsWithPdf
  ) {
    return "pdf";
  }

  if (
    normalizedType === "application/zip" ||
    normalizedType === "application/x-zip-compressed" ||
    normalizedType === "zip" ||
    extension === ".zip" ||
    startsWithZip
  ) {
    return "zip";
  }

  throw new functions.https.HttpsError(
    "invalid-argument",
    "Unsupported file type. Only PDF and ZIP files containing PDFs are supported."
  );
}

async function extractTextFromPdfBuffer(pdfBuffer) {
  try {
    const parsed = await pdfParse(pdfBuffer);
    const text = String(parsed.text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!text) {
      throw new Error("PDF contains no extractable text.");
    }

    return {
      text,
      characterCount: text.length,
      pageCount: parsed.numpages || null,
    };
  } catch (error) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Failed to extract text from PDF: ${error.message}`
    );
  }
}

async function extractClinicalTags(text, fileName) {
  const textForTags = String(text || "").slice(0, TAG_TEXT_LIMIT);
  if (!textForTags.trim()) {
    return {
      tags: {
        symptoms: [],
        diagnoses: [],
        tests: [],
        treatments: [],
        scoringSystems: [],
        general: [],
      },
      tagSearchIndex: [],
      primaryTopics: [],
    };
  }

  const response = await queryLLM(
    [
      { role: "system", content: TAG_EXTRACTION_PROMPT },
      {
        role: "user",
        content: `Extract clinical tags from this document.\nFile: ${fileName}\n\n${textForTags}`,
      },
    ],
    2000,
    0.1,
    "openai/gpt-5-nano",
    `chartmind clinical reference tag extraction: ${fileName}`
  );

  let parsed;

  try {
    parsed = JSON.parse(stripCodeFences(response));
  } catch (error) {
    throw new functions.https.HttpsError(
      "internal",
      `LLM returned invalid clinical tag JSON for ${fileName}.`
    );
  }

  const tags = {
    symptoms: normalizeStringArray(parsed.symptoms),
    diagnoses: normalizeStringArray(parsed.diagnoses),
    tests: normalizeStringArray(parsed.tests),
    treatments: normalizeStringArray(parsed.treatments),
    scoringSystems: normalizeStringArray(parsed.scoringSystems),
    general: normalizeStringArray(parsed.general),
  };

  const primaryTopics = normalizeStringArray(parsed.primaryTopics, 3);
  const tagSearchIndex = normalizeStringArray(Object.values(tags).flat());

  return {
    tags,
    tagSearchIndex,
    primaryTopics,
  };
}

async function uploadPdfToStorage(pdfBuffer, userId, fileName) {
  const bucket = getStorageBucket();
  const safeFileName = sanitizeFileName(fileName);
  const storagePath = `${STORAGE_PREFIX}/${userId}/${Date.now()}_${safeFileName}`;
  const fileRef = bucket.file(storagePath);
  const downloadToken = randomUUID();

  await fileRef.save(pdfBuffer, {
    metadata: {
      contentType: "application/pdf",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;

  return {
    bucket: bucket.name,
    storagePath,
    downloadURL,
  };
}

async function ensureRootDocument() {
  await getReferencesRootRef().set(
    {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      storagePrefix: STORAGE_PREFIX,
    },
    { merge: true }
  );
}

async function processSinglePdf({
  pdfBuffer,
  fileName,
  userId,
  promptId,
  metadata,
  sourceType,
  sourceArchiveName = null,
  sourcePath = null,
}) {
  const upload = await uploadPdfToStorage(pdfBuffer, userId, fileName);
  const extraction = await extractTextFromPdfBuffer(pdfBuffer);
  const tagsResult = await extractClinicalTags(extraction.text, fileName);

  await ensureRootDocument();

  const docRef = getReferencesCollectionRef().doc();
  const documentData = {
    id: docRef.id,
    userId,
    promptId,
    fileName: sanitizeFileName(fileName),
    fileSize: pdfBuffer.length,
    fileType: "application/pdf",
    sourceType,
    sourceArchiveName,
    sourcePath,
    storageBucket: upload.bucket,
    storagePath: upload.storagePath,
    downloadURL: upload.downloadURL,
    primaryTopics: tagsResult.primaryTopics,
    tags: tagsResult.tags,
    tagSearchIndex: tagsResult.tagSearchIndex,
    extractedTextCharacterCount: extraction.characterCount,
    extractedTextPreview: extraction.text.slice(0, 2000),
    pageCount: extraction.pageCount,
    metadata: metadata || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await docRef.set(documentData);

  return {
    id: docRef.id,
    fileName: documentData.fileName,
    storagePath: documentData.storagePath,
    primaryTopics: documentData.primaryTopics,
    tagCount: documentData.tagSearchIndex.length,
  };
}

function getPdfEntriesFromZip(zipBuffer) {
  const zip = new AdmZip(zipBuffer);

  return zip.getEntries().filter((entry) => {
    const name = String(entry.entryName || "").toLowerCase();
    return (
      !entry.isDirectory &&
      name.endsWith(".pdf") &&
      !name.startsWith("__macosx") &&
      !path.basename(name).startsWith(".")
    );
  });
}

async function processZipUpload(zipBuffer, sourceFileName, userId, promptId, metadata) {
  const entries = getPdfEntriesFromZip(zipBuffer);

  if (!entries.length) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "ZIP contains no PDF files."
    );
  }

  const files = [];
  const errors = [];

  for (let index = 0; index < entries.length; index += PDF_BATCH_SIZE) {
    const batch = entries.slice(index, index + PDF_BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (entry) => {
        const fileName = sanitizeFileName(path.basename(entry.entryName));

        try {
          return await processSinglePdf({
            pdfBuffer: entry.getData(),
            fileName,
            userId,
            promptId,
            metadata,
            sourceType: "zip_entry",
            sourceArchiveName: sanitizeFileName(sourceFileName),
            sourcePath: entry.entryName,
          });
        } catch (error) {
          errors.push({
            fileName,
            error: error.message,
          });
          return null;
        }
      })
    );

    files.push(...batchResults.filter(Boolean));
  }

  return {
    processed: files.length,
    total: entries.length,
    files,
    errors,
  };
}

exports.clinicalreferences_uploaddocs = async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const payload = data && typeof data === "object" ? data : {};
  const userId = String(payload.userId || context.auth.uid || "").trim();
  const promptId = normalizePromptId(payload.promptId);

  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId is required."
    );
  }

  if (payload.metadata && typeof payload.metadata !== "object") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "metadata must be an object when provided."
    );
  }

  if (!promptId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "promptId is required."
    );
  }

  const sourceBuffer = await readSourceBuffer(payload);
  const fileName = inferFileName(payload);
  const uploadKind = detectUploadKind(sourceBuffer, fileName, payload.fileType);
  const metadata = payload.metadata || {};

  if (uploadKind === "pdf") {
    const file = await processSinglePdf({
      pdfBuffer: sourceBuffer,
      fileName,
      userId,
      promptId,
      metadata,
      sourceType: "direct_pdf",
      sourceArchiveName: null,
      sourcePath: payload.storagePath || payload.fileURL || null,
    });

    return {
      success: true,
      uploadKind,
      processed: 1,
      total: 1,
      files: [file],
      errors: [],
      promptId,
      storagePrefix: `gs://${getStorageBucketName()}/${STORAGE_PREFIX}/${userId}`,
      firestoreCollectionPath: `${ROOT_DOC_PATH}/${ROOT_COLLECTION}`,
    };
  }

  const zipResult = await processZipUpload(
    sourceBuffer,
    fileName,
    userId,
    promptId,
    metadata
  );

  return {
    success: zipResult.errors.length === 0,
    uploadKind,
    processed: zipResult.processed,
    total: zipResult.total,
    files: zipResult.files,
    errors: zipResult.errors,
    promptId,
    storagePrefix: `gs://${getStorageBucketName()}/${STORAGE_PREFIX}/${userId}`,
    firestoreCollectionPath: `${ROOT_DOC_PATH}/${ROOT_COLLECTION}`,
  };
};

exports.clinicalreferences_retrieve_lexical = async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const payload = data && typeof data === "object" ? data : {};
  const userId = String(payload.userId || context.auth.uid || "").trim();
  const promptId = normalizePromptId(payload.promptId);
  const conversationText = normalizeConversationInput(payload);
  const limit = coerceLimit(payload.limit);
  const extractedTerms = filterToClinicalTerms(
    extractTermsFromText(conversationText.slice(0, MAX_CONVERSATION_CHARS))
  );

  if (!promptId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "promptId is required."
    );
  }

  const result = await runReferenceRetrieval({
    userId,
    promptId,
    conversationText,
    searchTerms: extractedTerms,
    limit,
  });

  return {
    success: true,
    strategy: "lexical",
    userId,
    promptId,
    limit,
    extractedTerms,
    referencesConsidered: result.referencesConsidered,
    documents: result.documents,
    conversationPreview: result.conversationPreview,
  };
};

exports.clinicalreferences_retrieve_llm = async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const payload = data && typeof data === "object" ? data : {};
  const userId = String(payload.userId || context.auth.uid || "").trim();
  const promptId = normalizePromptId(payload.promptId);
  const conversationText = normalizeConversationInput(payload);
  const limit = coerceLimit(payload.limit);
  const model = String(payload.model || DEFAULT_RETRIEVE_MODEL).trim();
  if (!promptId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "promptId is required."
    );
  }
  const llmExtraction = await extractConversationTermsWithLLM(conversationText, model);

  const result = await runReferenceRetrieval({
    userId,
    promptId,
    conversationText,
    searchTerms: llmExtraction.searchTerms,
    limit,
  });

  return {
    success: true,
    strategy: "llm",
    userId,
    promptId,
    limit,
    model,
    llmExtraction,
    referencesConsidered: result.referencesConsidered,
    documents: result.documents,
    conversationPreview: result.conversationPreview,
  };
};

exports.clinicalreferences_listdocs = async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const payload = data && typeof data === "object" ? data : {};
  const userId = String(payload.userId || context.auth.uid || "").trim();
  const promptId = normalizePromptId(payload.promptId);

  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId is required."
    );
  }

  if (!promptId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "promptId is required."
    );
  }

  const snapshot = await getReferencesCollectionRef()
    .where("userId", "==", userId)
    .get();

  const documents = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: d.id,
      promptId: d.promptId || null,
      fileName: d.fileName,
      fileSize: d.fileSize,
      pageCount: d.pageCount,
      primaryTopics: d.primaryTopics,
      tagCount: d.tagSearchIndex ? d.tagSearchIndex.length : 0,
      sourceType: d.sourceType,
      storagePath: d.storagePath,
      createdAt: d.createdAt,
    };
  })
    .filter((document) => normalizePromptId(document.promptId) === promptId)
    .sort((left, right) => {
      const leftSeconds =
        left.createdAt?.seconds ??
        left.createdAt?._seconds ??
        left.createdAt?.toDate?.()?.getTime?.() / 1000 ??
        0;
      const rightSeconds =
        right.createdAt?.seconds ??
        right.createdAt?._seconds ??
        right.createdAt?.toDate?.()?.getTime?.() / 1000 ??
        0;
      return rightSeconds - leftSeconds;
    });

  return {
    success: true,
    userId,
    promptId,
    count: documents.length,
    documents,
  };
};

exports.clinicalreferences_deletedocs = async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const payload = data && typeof data === "object" ? data : {};
  const userId = String(payload.userId || context.auth.uid || "").trim();
  const promptId = normalizePromptId(payload.promptId);

  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId is required."
    );
  }

  if (!promptId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "promptId is required."
    );
  }

  const rawIds = payload.docIds ?? (payload.docId ? [payload.docId] : []);
  const docIds = (Array.isArray(rawIds) ? rawIds : [rawIds])
    .map((id) => String(id).trim())
    .filter(Boolean);

  if (docIds.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Provide docId or docIds."
    );
  }

  const collectionRef = getReferencesCollectionRef();
  const bucket = getStorageBucket();
  const deleted = [];
  const errors = [];

  await Promise.all(
    docIds.map(async (docId) => {
      try {
        const docRef = collectionRef.doc(docId);
        const snap = await docRef.get();

        if (!snap.exists) {
          errors.push({ docId, error: "Document not found." });
          return;
        }

        const docData = snap.data();

        if (
          docData.userId !== userId ||
          normalizePromptId(docData.promptId) !== promptId
        ) {
          errors.push({ docId, error: "Permission denied." });
          return;
        }

        if (docData.storagePath) {
          try {
            await bucket.file(docData.storagePath).delete();
          } catch (storageErr) {
            // Non-fatal: log but continue with Firestore deletion
            errors.push({
              docId,
              error: `Storage deletion failed: ${storageErr.message}`,
              firestoreDeleted: false,
            });
            return;
          }
        }

        await docRef.delete();
        deleted.push({ docId, fileName: docData.fileName });
      } catch (err) {
        errors.push({ docId, error: err.message });
      }
    })
  );

  return {
    success: errors.length === 0,
    userId,
    promptId,
    deleted,
    errors,
  };
};

exports._private = {
  CONVERSATION_TERM_EXTRACTION_PROMPT,
  DEFAULT_RETRIEVE_MODEL,
  detectUploadKind,
  extractClinicalTags,
  extractConversationTermsWithLLM,
  extractTermsFromText,
  extractTextFromPdfBuffer,
  filterToClinicalTerms,
  findMatchingReferences,
  findReferencesByTitle,
  getPdfEntriesFromZip,
  mergeReferenceMatches,
  normalizeConversationInput,
  readSourceBuffer,
  sanitizeFileName,
};
