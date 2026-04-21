const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const OpenAI = require("openai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const AdmZip = require("adm-zip");
const path = require("path");
const { createHash, randomUUID } = require("crypto");

const { queryLLM } = require("../../nlp");

const db = admin.firestore();

const DEFAULT_STORAGE_BUCKET = "hlthdsk-sandbox-2cc23.appspot.com";
const STORAGE_PREFIX = "documents/chartdmind/embedded_documents";
const ROOT_DOC_PATH = "chartdmind/embedded_documents";
const ROOT_COLLECTION = "documents";
const CHUNKS_SUBCOLLECTION = "chunks";
const DEFAULT_RETRIEVAL_MODEL = "openai/gpt-5-nano";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-large";
const DEFAULT_DOCUMENT_LIMIT = 5;
const DEFAULT_CHUNK_LIMIT = 12;
const DEFAULT_MAX_CHUNKS_PER_DOCUMENT = 3;
const MAX_DOCUMENT_LIMIT = 20;
const MAX_CHUNK_LIMIT = 30;
const MAX_INLINE_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DOWNLOAD_BYTES = 200 * 1024 * 1024;
const MAX_EMBEDDING_TEXT_LENGTH = 30000;
const CHUNK_SIZE_CHARS = 2500;
const CHUNK_OVERLAP_CHARS = 350;
const MIN_SIMILARITY = 0.2;
const ZIP_BATCH_SIZE = 5;
const MAX_QUERY_REWRITE_CHARS = 12000;
const MAX_TEXT_PREVIEW_CHARS = 2000;
const SUPPORTED_TEXT_EXTENSIONS = new Set([".txt", ".md"]);
const SUPPORTED_ZIP_EXTENSIONS = new Set([".txt", ".md", ".pdf", ".docx"]);

const QUERY_REWRITE_PROMPT = `You are a medical retrieval query rewriter.

Given a clinical chat conversation, produce a compact semantic retrieval query for embedded-document search.

Return ONLY valid JSON in this exact format:
{
  "searchQuery": "short retrieval query",
  "keywords": ["keyword 1", "keyword 2"],
  "primaryTopics": ["topic 1", "topic 2"],
  "filters": {
    "documentType": "",
    "specialty": ""
  }
}

Rules:
- All string values except searchQuery should be lowercase.
- searchQuery should be concise but clinically specific.
- keywords should include the most important diagnoses, symptoms, tests, treatments, and abbreviations.
- primaryTopics should contain 1-3 main clinical subjects.
- filters.documentType and filters.specialty should be empty strings unless strongly implied.
- Do not invent facts not present in the conversation.`;

let cachedOpenAIClient = null;

function getStorageBucketName() {
  const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || "{}");
  return firebaseConfig.storageBucket || DEFAULT_STORAGE_BUCKET;
}

function getFunctionsConfig() {
  try {
    return functions.config();
  } catch (error) {
    return {};
  }
}

function getOpenAIClient() {
  if (cachedOpenAIClient) {
    return cachedOpenAIClient;
  }

  const config = getFunctionsConfig();
  const apiKey =
    config.openai?.apikey ||
    config.openai?.api_key ||
    process.env.OPENAI_API_KEY ||
    null;

  if (!apiKey) {
    throw new functions.https.HttpsError(
      "internal",
      "Missing OpenAI API key for embedded document embeddings."
    );
  }

  cachedOpenAIClient = new OpenAI({ apiKey });
  return cachedOpenAIClient;
}

function getStorageBucket(bucketName = getStorageBucketName()) {
  return admin.storage().bucket(bucketName);
}

function getEmbeddedDocumentsRootRef() {
  return db.doc(ROOT_DOC_PATH);
}

function getEmbeddedDocumentsCollectionRef() {
  return getEmbeddedDocumentsRootRef().collection(ROOT_COLLECTION);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function normalizePromptId(value) {
  return normalizeLower(value);
}

function normalizeStringArray(values, limit = Infinity) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set();
  const output = [];

  for (const value of values) {
    const normalized = normalizeLower(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    output.push(normalized);
    seen.add(normalized);

    if (output.length >= limit) {
      break;
    }
  }

  return output;
}

function sanitizeFileName(fileName) {
  return String(fileName || "document")
    .split(/[\\/]/)
    .pop()
    .replace(/[^\w.\-]+/g, "_");
}

function getExtension(fileName = "") {
  return path.extname(String(fileName || "")).toLowerCase();
}

function getContentTypeFromExtension(extension) {
  if (extension === ".pdf") {
    return "application/pdf";
  }

  if (extension === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (extension === ".md") {
    return "text/markdown";
  }

  if (extension === ".txt") {
    return "text/plain";
  }

  if (extension === ".zip") {
    return "application/zip";
  }

  return "application/octet-stream";
}

function stripCodeFences(value) {
  const trimmed = normalizeText(value);
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function extractFirstJsonObject(value) {
  const text = String(value || "");
  const start = text.indexOf("{");
  if (start === -1) {
    return "";
  }

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }
      if (char === "\\") {
        escaping = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return "";
}

function parseModelJsonResponse(response) {
  const normalized = stripCodeFences(response);
  try {
    return JSON.parse(normalized);
  } catch (directError) {
    const extracted = extractFirstJsonObject(normalized);
    if (!extracted) {
      throw directError;
    }
    return JSON.parse(extracted);
  }
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

function inferFileName(payload) {
  if (payload.fileName) {
    return sanitizeFileName(payload.fileName);
  }

  if (payload.storagePath) {
    return sanitizeFileName(path.basename(payload.storagePath));
  }

  if (payload.fileURL) {
    try {
      const url = new URL(payload.fileURL);
      return sanitizeFileName(path.basename(decodeURIComponent(url.pathname)));
    } catch (error) {
      return "document";
    }
  }

  return "document";
}

async function ensureRootDocument() {
  await getEmbeddedDocumentsRootRef().set(
    {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      storagePrefix: STORAGE_PREFIX,
    },
    { merge: true }
  );
}

async function readSourceBuffer(payload) {
  const sources = [payload.fileBase64, payload.fileURL, payload.storagePath].filter(Boolean);
  if (sources.length !== 1) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Provide exactly one of fileBase64, fileURL, or storagePath."
    );
  }

  if (payload.fileBase64) {
    const cleanedBase64 = String(payload.fileBase64)
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

  if (payload.storagePath) {
    const [buffer] = await getStorageBucket().file(String(payload.storagePath)).download();
    return buffer;
  }

  if (String(payload.fileURL).startsWith("gs://")) {
    const { bucketName, filePath } = parseGsUrl(payload.fileURL);
    const [buffer] = await getStorageBucket(bucketName).file(filePath).download();
    return buffer;
  }

  try {
    const response = await axios.get(String(payload.fileURL), {
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

function detectRootKind(buffer, fileName, fileType) {
  const normalizedType = normalizeLower(fileType);
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

  if (
    normalizedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalizedType === "docx" ||
    extension === ".docx"
  ) {
    return "docx";
  }

  if (
    normalizedType === "text/plain" ||
    normalizedType === "text/markdown" ||
    normalizedType === "txt" ||
    normalizedType === "md" ||
    SUPPORTED_TEXT_EXTENSIONS.has(extension)
  ) {
    return "text";
  }

  throw new functions.https.HttpsError(
    "invalid-argument",
    "Unsupported file type. Supported: TXT, MD, PDF, DOCX, ZIP."
  );
}

function normalizeDocumentText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractTextFromPdfBuffer(buffer) {
  try {
    const parsed = await pdfParse(buffer);
    const text = normalizeDocumentText(parsed.text || "");
    if (!text) {
      throw new Error("PDF contains no extractable text.");
    }

    return {
      text,
      pageCount: parsed.numpages || null,
    };
  } catch (error) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Failed to extract text from PDF: ${error.message}`
    );
  }
}

async function extractTextFromDocxBuffer(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = normalizeDocumentText(result.value || "");
    if (!text) {
      throw new Error("DOCX contains no extractable text.");
    }

    return {
      text,
    };
  } catch (error) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Failed to extract text from DOCX: ${error.message}`
    );
  }
}

function extractTextFromPlainBuffer(buffer) {
  const text = normalizeDocumentText(buffer.toString("utf8"));
  if (!text) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Text file contains no extractable text."
    );
  }

  return {
    text,
  };
}

function extractSectionTitles(text) {
  const sectionTitles = [];
  const sectionPatterns = [
    /(?:^|\n)\s*(#{1,3})\s+(.+?)(?:\n|$)/g,
    /(?:^|\n)\s*([A-Z][A-Z\s]{2,50}):\s*(?:\n|$)/g,
    /(?:^|\n)\s*\d+\.\s*([A-Z][^\n]{2,80})(?:\n|$)/g,
  ];

  sectionPatterns.forEach((pattern) => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach((match) => {
      const position = match.index || 0;
      const title = normalizeText(match[2] || match[1] || "");
      if (title && title.length < 100) {
        sectionTitles.push({ title, position });
      }
    });
  });

  return sectionTitles.sort((left, right) => left.position - right.position);
}

function findSectionTitleForChunk(chunk, sectionTitles) {
  for (let index = sectionTitles.length - 1; index >= 0; index -= 1) {
    if (sectionTitles[index].position <= chunk.start) {
      return sectionTitles[index].title;
    }
  }

  return null;
}

function splitLargeParagraph(paragraph, chunkSize) {
  const output = [];
  let cursor = 0;

  while (cursor < paragraph.length) {
    const targetEnd = Math.min(cursor + chunkSize, paragraph.length);
    let end = targetEnd;

    if (targetEnd < paragraph.length) {
      const window = paragraph.slice(cursor, targetEnd);
      const sentenceBreak = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("? "),
        window.lastIndexOf("! ")
      );
      if (sentenceBreak > chunkSize * 0.5) {
        end = cursor + sentenceBreak + 1;
      }
    }

    output.push(paragraph.slice(cursor, end).trim());
    cursor = end;
  }

  return output.filter(Boolean);
}

function chunkText(text, chunkSize = CHUNK_SIZE_CHARS, overlap = CHUNK_OVERLAP_CHARS) {
  const normalized = normalizeDocumentText(text);
  if (!normalized) {
    return [];
  }

  const rawParagraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const paragraphs = rawParagraphs.flatMap((paragraph) =>
    paragraph.length > chunkSize
      ? splitLargeParagraph(paragraph, chunkSize)
      : [paragraph]
  );

  const chunks = [];
  let cursor = 0;
  let current = "";
  let chunkStart = 0;

  paragraphs.forEach((paragraph) => {
    const separator = current ? "\n\n" : "";
    if ((current + separator + paragraph).length <= chunkSize) {
      current += separator + paragraph;
      return;
    }

    if (current) {
      const chunkTextValue = current.trim();
      const chunkEnd = chunkStart + chunkTextValue.length;
      chunks.push({
        text: chunkTextValue,
        index: chunks.length,
        start: chunkStart,
        end: chunkEnd,
      });
      const overlapText = chunkTextValue.slice(Math.max(0, chunkTextValue.length - overlap));
      chunkStart = Math.max(0, chunkEnd - overlapText.length);
      current = overlapText ? `${overlapText}\n\n${paragraph}` : paragraph;
    } else {
      current = paragraph;
      chunkStart = cursor;
    }

    cursor += paragraph.length + 2;
  });

  if (current.trim()) {
    const chunkTextValue = current.trim();
    chunks.push({
      text: chunkTextValue,
      index: chunks.length,
      start: chunkStart,
      end: chunkStart + chunkTextValue.length,
    });
  }

  const sectionTitles = extractSectionTitles(normalized);
  return chunks.map((chunk) => ({
    ...chunk,
    sectionTitle: findSectionTitleForChunk(chunk, sectionTitles),
  }));
}

async function generateEmbedding(text, model = DEFAULT_EMBEDDING_MODEL) {
  const truncated = String(text || "").slice(0, MAX_EMBEDDING_TEXT_LENGTH).trim();
  if (!truncated) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Embedding text must be non-empty."
    );
  }

  try {
    const response = await getOpenAIClient().embeddings.create({
      model,
      input: truncated,
      dimensions: 1536,
    });

    const embedding = response.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("OpenAI returned an empty embedding.");
    }

    return embedding;
  } catch (error) {
    throw new functions.https.HttpsError(
      "internal",
      `Failed to generate embedding: ${error.message}`
    );
  }
}

function cosineSimilarity(vectorA, vectorB) {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB) || vectorA.length !== vectorB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < vectorA.length; index += 1) {
    dotProduct += vectorA[index] * vectorB[index];
    normA += vectorA[index] * vectorA[index];
    normB += vectorB[index] * vectorB[index];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

async function findExistingDocumentByHash(userId, promptId, contentHash) {
  const snapshot = await getEmbeddedDocumentsCollectionRef()
    .where("userId", "==", userId)
    .get();

  const match = snapshot.docs.find((doc) => {
    const data = doc.data() || {};
    return (
      normalizePromptId(data.promptId) === promptId &&
      String(data.contentHash || "") === contentHash
    );
  });

  if (!match) {
    return null;
  }

  return {
    id: match.id,
    ...match.data(),
  };
}

async function uploadOriginalDocument(buffer, userId, fileName, extension) {
  const bucket = getStorageBucket();
  const safeFileName = sanitizeFileName(fileName);
  const storagePath = `${STORAGE_PREFIX}/${userId}/${Date.now()}_${safeFileName}`;
  const fileRef = bucket.file(storagePath);
  const downloadToken = randomUUID();

  await fileRef.save(buffer, {
    metadata: {
      contentType: getContentTypeFromExtension(extension),
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  return {
    storageBucket: bucket.name,
    storagePath,
    downloadURL: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`,
  };
}

function summarizeDocumentForOutput(documentData, extras = {}) {
  return {
    id: documentData.id,
    userId: documentData.userId,
    promptId: documentData.promptId || null,
    fileName: documentData.fileName,
    fileType: documentData.fileType,
    source: documentData.metadata?.source || null,
    author: documentData.metadata?.author || null,
    documentType: documentData.metadata?.documentType || null,
    specialty: documentData.metadata?.specialty || null,
    storagePath: documentData.storagePath,
    storageBucket: documentData.storageBucket,
    downloadURL: documentData.downloadURL,
    chunkCount: documentData.chunkCount || 0,
    textCharacterCount: documentData.textCharacterCount || 0,
    public: documentData.public === true,
    duplicate: false,
    ...extras,
  };
}

async function ingestSingleDocument({
  buffer,
  fileName,
  userId,
  promptId,
  metadata,
  isPublic = false,
  sourceType,
  sourceArchiveName = null,
  sourcePath = null,
}) {
  const safeFileName = sanitizeFileName(fileName);
  const extension = getExtension(safeFileName);
  const contentHash = createHash("sha256").update(buffer).digest("hex");
  const existing = await findExistingDocumentByHash(userId, promptId, contentHash);

  if (existing) {
    return summarizeDocumentForOutput(existing, {
      duplicate: true,
      reused: true,
    });
  }

  let extraction;
  if (extension === ".pdf") {
    extraction = await extractTextFromPdfBuffer(buffer);
  } else if (extension === ".docx") {
    extraction = await extractTextFromDocxBuffer(buffer);
  } else if (SUPPORTED_TEXT_EXTENSIONS.has(extension)) {
    extraction = extractTextFromPlainBuffer(buffer);
  } else {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Unsupported embedded document extension: ${extension || "(none)"}`
    );
  }

  const chunks = chunkText(extraction.text);
  if (!chunks.length) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `No usable chunks were generated for ${safeFileName}.`
    );
  }

  const uploadedFile = await uploadOriginalDocument(buffer, userId, safeFileName, extension);
  const docRef = getEmbeddedDocumentsCollectionRef().doc();
  const documentData = {
    id: docRef.id,
    userId,
    promptId,
    contentHash,
    fileName: safeFileName,
    fileType: getContentTypeFromExtension(extension),
    sourceType,
    sourceArchiveName,
    sourcePath,
    storageBucket: uploadedFile.storageBucket,
    storagePath: uploadedFile.storagePath,
    downloadURL: uploadedFile.downloadURL,
    fileSize: buffer.length,
    textCharacterCount: extraction.text.length,
    extractedTextPreview: extraction.text.slice(0, MAX_TEXT_PREVIEW_CHARS),
    pageCount: extraction.pageCount || null,
    chunkCount: chunks.length,
    public: isPublic === true,
    metadata: metadata || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ensureRootDocument();
  await docRef.set(documentData);

  const chunkCollection = docRef.collection(CHUNKS_SUBCOLLECTION);
  for (let offset = 0; offset < chunks.length; offset += ZIP_BATCH_SIZE) {
    const batch = db.batch();
    const slice = chunks.slice(offset, offset + ZIP_BATCH_SIZE);

    // Embeddings are generated only for the current slice to keep memory steady.
    const embeddings = await Promise.all(
      slice.map((chunk) => generateEmbedding(chunk.text))
    );

    slice.forEach((chunk, index) => {
      const embedding = embeddings[index];
      const chunkRef = chunkCollection.doc(String(chunk.index));
      batch.set(chunkRef, {
        userId,
        promptId,
        documentId: docRef.id,
        documentFileName: safeFileName,
        source: metadata?.source || null,
        documentType: metadata?.documentType || null,
        specialty: metadata?.specialty || null,
        index: chunk.index,
        start: chunk.start,
        end: chunk.end,
        sectionTitle: chunk.sectionTitle || null,
        text: chunk.text,
        embedding,
        embeddingModel: DEFAULT_EMBEDDING_MODEL,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  }

  return summarizeDocumentForOutput(documentData);
}

function getSupportedEntriesFromZip(buffer) {
  const zip = new AdmZip(buffer);
  return zip.getEntries().filter((entry) => {
    if (entry.isDirectory) {
      return false;
    }

    const entryName = String(entry.entryName || "");
    const ext = getExtension(entryName);
    return SUPPORTED_ZIP_EXTENSIONS.has(ext) && !path.basename(entryName).startsWith(".");
  });
}

async function ingestZipUpload(
  zipBuffer,
  sourceFileName,
  userId,
  promptId,
  metadata,
  isPublic = false
) {
  const entries = getSupportedEntriesFromZip(zipBuffer);
  if (!entries.length) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "ZIP contains no supported files. Supported: TXT, MD, PDF, DOCX."
    );
  }

  const files = [];
  const errors = [];

  for (let offset = 0; offset < entries.length; offset += ZIP_BATCH_SIZE) {
    const batch = entries.slice(offset, offset + ZIP_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (entry) => {
        const safeFileName = sanitizeFileName(path.basename(entry.entryName));

        try {
          return await ingestSingleDocument({
            buffer: entry.getData(),
            fileName: safeFileName,
            userId,
            promptId,
            metadata,
            isPublic,
            sourceType: "zip_entry",
            sourceArchiveName: sanitizeFileName(sourceFileName),
            sourcePath: entry.entryName,
          });
        } catch (error) {
          errors.push({
            fileName: safeFileName,
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

function normalizeConversationInput(payload) {
  if (typeof payload.conversation === "string" && payload.conversation.trim()) {
    return payload.conversation.trim();
  }

  if (typeof payload.text === "string" && payload.text.trim()) {
    return payload.text.trim();
  }

  if (Array.isArray(payload.messages) && payload.messages.length > 0) {
    const combined = payload.messages
      .map((message) => {
        const role = normalizeLower(message?.role || "user");
        const content = normalizeText(message?.content || "");
        return content ? `${role}: ${content}` : "";
      })
      .filter(Boolean)
      .join("\n");

    if (combined) {
      return combined;
    }
  }

  throw new functions.https.HttpsError(
    "invalid-argument",
    "Provide conversation, text, or a non-empty messages array."
  );
}

async function rewriteRetrievalQuery(conversationText, model) {
  const truncatedConversation = String(conversationText || "")
    .slice(0, MAX_QUERY_REWRITE_CHARS)
    .trim();

  const response = await queryLLM(
    [
      { role: "system", content: QUERY_REWRITE_PROMPT },
      {
        role: "user",
        content: `Rewrite this conversation for embedded-document retrieval:\n\n${truncatedConversation}`,
      },
    ],
    1000,
    0.1,
    model || DEFAULT_RETRIEVAL_MODEL,
    "chartmind embedded documents retrieval query rewrite"
  );

  let parsed;

  try {
    parsed = parseModelJsonResponse(response);
  } catch (error) {
    console.warn(
      "[embedded_documents] Retrieval query rewrite returned invalid JSON; using fallback query.",
      {
        model: model || DEFAULT_RETRIEVAL_MODEL,
        conversationPreview: truncatedConversation.slice(0, 300),
        responsePreview: String(response || "").slice(0, 1000),
        parseError: error?.message || String(error),
      }
    );
    parsed = {
      searchQuery: truncatedConversation,
      keywords: [],
      primaryTopics: [],
      filters: {
        documentType: "",
        specialty: "",
      },
    };
  }

  const searchQuery = normalizeText(parsed.searchQuery || truncatedConversation);
  return {
    searchQuery,
    keywords: normalizeStringArray(parsed.keywords, 20),
    primaryTopics: normalizeStringArray(parsed.primaryTopics, 3),
    filters: {
      documentType: normalizeLower(parsed.filters?.documentType || ""),
      specialty: normalizeLower(parsed.filters?.specialty || ""),
    },
  };
}

async function loadDocumentsForUser(userId, promptId, filters = {}) {
  const snapshot = await getEmbeddedDocumentsCollectionRef()
    .where("userId", "==", userId)
    .get();

  const documents = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() || null,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString?.() || null,
  }));

  return documents.filter((document) => {
    if (normalizePromptId(document.promptId) !== promptId) {
      return false;
    }

    if (
      filters.documentType &&
      normalizeLower(document.metadata?.documentType) !== filters.documentType
    ) {
      return false;
    }

    if (
      filters.specialty &&
      normalizeLower(document.metadata?.specialty) !== filters.specialty
    ) {
      return false;
    }

    return true;
  });
}

async function loadChunksForDocument(documentId) {
  const snapshot = await getEmbeddedDocumentsCollectionRef()
    .doc(documentId)
    .collection(CHUNKS_SUBCOLLECTION)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

function applyChunkBoosts(chunk, document, keywordSet) {
  let boost = 0;
  const searchableText = normalizeLower(chunk.text);
  const titleText = normalizeLower(`${document.fileName || ""} ${document.metadata?.source || ""}`);

  keywordSet.forEach((keyword) => {
    if (searchableText.includes(keyword)) {
      boost += 0.01;
    }

    if (titleText.includes(keyword)) {
      boost += 0.03;
    }
  });

  return boost;
}

function buildContextBlock(topChunks) {
  if (!topChunks.length) {
    return null;
  }

  const formatted = topChunks
    .map((chunk) => {
      const source = chunk.document.source || chunk.document.fileName || "Unknown document";
      const section = chunk.sectionTitle ? ` | Section: ${chunk.sectionTitle}` : "";
      return `[Source: ${source}${section} | Similarity: ${(chunk.score * 100).toFixed(1)}%]\n${chunk.text}`;
    })
    .join("\n\n---\n\n");

  return `=== EMBEDDED DOCUMENT CONTEXT ===\n${formatted}\n=== END EMBEDDED DOCUMENT CONTEXT ===`;
}

async function retrieveEmbeddedDocuments({
  userId,
  promptId,
  conversationText,
  model,
  documentLimit,
  chunkLimit,
  maxChunksPerDocument,
  minSimilarity,
}) {
  const rewrittenQuery = await rewriteRetrievalQuery(conversationText, model);
  const queryEmbedding = await generateEmbedding(rewrittenQuery.searchQuery);
  const documents = await loadDocumentsForUser(userId, promptId, rewrittenQuery.filters);
  const keywordSet = new Set([
    ...rewrittenQuery.keywords,
    ...rewrittenQuery.primaryTopics,
  ]);

  const scoredChunks = [];
  for (const document of documents) {
    const chunks = await loadChunksForDocument(document.id);
    const rankedChunks = chunks
      .map((chunk) => {
        const similarity = cosineSimilarity(queryEmbedding, chunk.embedding || []);
        const score = similarity + applyChunkBoosts(chunk, document, keywordSet);
        return {
          ...chunk,
          document: summarizeDocumentForOutput(document),
          similarity,
          score,
        };
      })
      .filter((chunk) => chunk.score >= minSimilarity)
      .sort((left, right) => right.score - left.score)
      .slice(0, maxChunksPerDocument);

    scoredChunks.push(...rankedChunks);
  }

  const topChunks = scoredChunks
    .sort((left, right) => right.score - left.score)
    .slice(0, chunkLimit)
    .map((chunk) => ({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      fileName: chunk.document.fileName,
      source: chunk.document.source,
      documentType: chunk.document.documentType,
      specialty: chunk.document.specialty,
      downloadURL: chunk.document.downloadURL,
      sectionTitle: chunk.sectionTitle || null,
      text: chunk.text,
      similarity: Number(chunk.similarity.toFixed(6)),
      score: Number(chunk.score.toFixed(6)),
      index: chunk.index,
    }));

  const documentsById = new Map();
  topChunks.forEach((chunk) => {
    const existing = documentsById.get(chunk.documentId);
    if (!existing) {
      documentsById.set(chunk.documentId, {
        id: chunk.documentId,
        fileName: chunk.fileName,
        source: chunk.source,
        documentType: chunk.documentType,
        specialty: chunk.specialty,
        downloadURL: chunk.downloadURL,
        topScore: chunk.score,
        topSimilarity: chunk.similarity,
        matchedChunks: [chunk],
      });
      return;
    }

    existing.topScore = Math.max(existing.topScore, chunk.score);
    existing.topSimilarity = Math.max(existing.topSimilarity, chunk.similarity);
    existing.matchedChunks.push(chunk);
  });

  const topDocuments = Array.from(documentsById.values())
    .map((document) => ({
      ...document,
      matchedChunks: document.matchedChunks
        .sort((left, right) => right.score - left.score)
        .slice(0, maxChunksPerDocument),
    }))
    .sort((left, right) => right.topScore - left.topScore)
    .slice(0, documentLimit);

  return {
    rewrittenQuery,
    queryEmbeddingDimensions: queryEmbedding.length,
    documentsConsidered: documents.length,
    chunksRetrieved: topChunks.length,
    documents: topDocuments,
    chunks: topChunks,
    contextBlock: buildContextBlock(
      topChunks.map((chunk) => ({
        ...chunk,
        document: {
          source: chunk.source,
          fileName: chunk.fileName,
        },
      }))
    ),
  };
}

function coercePositiveInt(value, defaultValue, maxValue) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return defaultValue;
  }

  return Math.min(Math.floor(numeric), maxValue);
}

exports.embeddeddocuments_uploaddocs = async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const payload = data && typeof data === "object" ? data : {};
  const userId = normalizeText(payload.userId || context.auth.uid || "");
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
  const rootKind = detectRootKind(sourceBuffer, fileName, payload.fileType);
  const metadata = payload.metadata || {};
  const isPublic = payload.public === true;

  if (rootKind === "zip") {
    const result = await ingestZipUpload(
      sourceBuffer,
      fileName,
      userId,
      promptId,
      metadata,
      isPublic
    );
    return {
      success: result.errors.length === 0,
      uploadKind: "zip",
      processed: result.processed,
      total: result.total,
      files: result.files,
      errors: result.errors,
      promptId,
      storagePrefix: `gs://${getStorageBucketName()}/${STORAGE_PREFIX}/${userId}`,
      firestoreCollectionPath: `${ROOT_DOC_PATH}/${ROOT_COLLECTION}`,
    };
  }

  const file = await ingestSingleDocument({
    buffer: sourceBuffer,
    fileName,
    userId,
    promptId,
    metadata,
    isPublic,
    sourceType: "direct_upload",
    sourceArchiveName: null,
    sourcePath: payload.storagePath || payload.fileURL || null,
  });

  return {
    success: true,
    uploadKind: rootKind,
    processed: 1,
    total: 1,
    files: [file],
    errors: [],
    promptId,
    storagePrefix: `gs://${getStorageBucketName()}/${STORAGE_PREFIX}/${userId}`,
    firestoreCollectionPath: `${ROOT_DOC_PATH}/${ROOT_COLLECTION}`,
  };
};

exports.embeddeddocuments_retrieve = async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const payload = data && typeof data === "object" ? data : {};
  const userId = normalizeText(payload.userId || context.auth.uid || "");
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

  const conversationText = normalizeConversationInput(payload);
  const model = normalizeText(payload.model || DEFAULT_RETRIEVAL_MODEL) || DEFAULT_RETRIEVAL_MODEL;
  const documentLimit = coercePositiveInt(
    payload.documentLimit,
    DEFAULT_DOCUMENT_LIMIT,
    MAX_DOCUMENT_LIMIT
  );
  const chunkLimit = coercePositiveInt(
    payload.chunkLimit,
    DEFAULT_CHUNK_LIMIT,
    MAX_CHUNK_LIMIT
  );
  const maxChunksPerDocument = coercePositiveInt(
    payload.maxChunksPerDocument,
    DEFAULT_MAX_CHUNKS_PER_DOCUMENT,
    DEFAULT_MAX_CHUNKS_PER_DOCUMENT
  );
  const minSimilarity = Number.isFinite(Number(payload.minSimilarity))
    ? Number(payload.minSimilarity)
    : MIN_SIMILARITY;

  const result = await retrieveEmbeddedDocuments({
    userId,
    promptId,
    conversationText,
    model,
    documentLimit,
    chunkLimit,
    maxChunksPerDocument,
    minSimilarity,
  });

  return {
    success: true,
    userId,
    promptId,
    model,
    documentLimit,
    chunkLimit,
    maxChunksPerDocument,
    minSimilarity,
    conversationPreview: conversationText.slice(0, 500),
    ...result,
  };
};

exports.embeddeddocuments_listdocs = async (data, context) => {
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
    throw new functions.https.HttpsError("invalid-argument", "userId is required.");
  }

  if (!promptId) {
    throw new functions.https.HttpsError("invalid-argument", "promptId is required.");
  }

  const snapshot = await getEmbeddedDocumentsCollectionRef()
    .where("userId", "==", userId)
    .get();

  const documents = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: d.id,
      promptId: d.promptId || null,
      fileName: d.fileName,
      fileType: d.fileType,
      fileSize: d.fileSize || 0,
      chunkCount: d.chunkCount,
      public: d.public === true,
      textCharacterCount: d.textCharacterCount,
      pageCount: d.pageCount || null,
      sourceType: d.sourceType,
      storagePath: d.storagePath,
      metadata: d.metadata || {},
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

  return { success: true, userId, promptId, count: documents.length, documents };
};

exports.embeddeddocuments_setpublic = async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const payload = data && typeof data === "object" ? data : {};
  const userId = String(payload.userId || context.auth.uid || "").trim();
  const docId = String(payload.docId || "").trim();
  const promptId = normalizePromptId(payload.promptId);
  const isPublic = payload.public === true || payload.isPublic === true;

  if (!userId) {
    throw new functions.https.HttpsError("invalid-argument", "userId is required.");
  }

  if (!docId) {
    throw new functions.https.HttpsError("invalid-argument", "docId is required.");
  }

  if (!promptId) {
    throw new functions.https.HttpsError("invalid-argument", "promptId is required.");
  }

  const docRef = getEmbeddedDocumentsCollectionRef().doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Document not found.");
  }

  const docData = docSnap.data() || {};
  if (
    String(docData.userId || "").trim() !== userId ||
    normalizePromptId(docData.promptId) !== promptId
  ) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "You do not have access to update this document."
    );
  }

  await docRef.update({
    public: isPublic,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    docId,
    promptId,
    public: isPublic,
  };
};

exports.embeddeddocuments_deletedocs = async (data, context) => {
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
    throw new functions.https.HttpsError("invalid-argument", "userId is required.");
  }

  if (!promptId) {
    throw new functions.https.HttpsError("invalid-argument", "promptId is required.");
  }

  const rawIds = payload.docIds ?? (payload.docId ? [payload.docId] : []);
  const docIds = (Array.isArray(rawIds) ? rawIds : [rawIds])
    .map((id) => String(id).trim())
    .filter(Boolean);

  if (docIds.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Provide docId or docIds.");
  }

  const collectionRef = getEmbeddedDocumentsCollectionRef();
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

        // Delete Storage file
        if (docData.storagePath) {
          try {
            await bucket.file(docData.storagePath).delete();
          } catch (storageErr) {
            if (storageErr.code !== 404) throw storageErr;
          }
        }

        // Delete chunk sub-collection then the document itself
        const chunksSnap = await docRef.collection(CHUNKS_SUBCOLLECTION).get();
        const batch = db.batch();
        chunksSnap.docs.forEach((chunkDoc) => batch.delete(chunkDoc.ref));
        batch.delete(docRef);
        await batch.commit();

        deleted.push(docId);
      } catch (err) {
        errors.push({ docId, error: err.message || "Unknown error." });
      }
    })
  );

  return { success: errors.length === 0, userId, promptId, deleted, errors };
};

exports._private = {
  chunkText,
  cosineSimilarity,
  detectRootKind,
  extractSectionTitles,
  extractTextFromDocxBuffer,
  extractTextFromPdfBuffer,
  getSupportedEntriesFromZip,
  normalizeConversationInput,
  retrieveEmbeddedDocuments,
  rewriteRetrievalQuery,
};
