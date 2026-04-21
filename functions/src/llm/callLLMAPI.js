const functions = require("firebase-functions");
const { db } = require("../config/firebase");
const { queryLLM } = require("../nlp/query_llm");
const { _private: embeddedDocumentsPrivate } = require("../chartmind/embedded_documents");
const { runtimeConfigSecret } = require("../runtimeConfig");

const DEFAULT_EMBEDDED_DOC_RETRIEVAL_MODEL = "openai/gpt-5-nano";
const DEFAULT_EMBEDDED_DOC_LIMIT = 5;
const DEFAULT_EMBEDDED_CHUNK_LIMIT = 5;
const DEFAULT_EMBEDDED_MAX_CHUNKS_PER_DOCUMENT = 3;
const DEFAULT_EMBEDDED_MIN_SIMILARITY = 0.2;
const MAX_EMBEDDED_CHUNK_LIMIT = 30;

const asTrimmed = (value) => (typeof value === "string" ? value.trim() : "");

const pickDefinedFields = (source, allowedFields) => {
  if (!source || typeof source !== "object") return {};
  return allowedFields.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      acc[field] = source[field];
    }
    return acc;
  }, {});
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const candidate = asTrimmed(value);
    if (candidate) return candidate;
  }
  return "";
};

const resolveRegionId = (userData = {}, data = {}) =>
  firstNonEmpty(
    data.regionId,
    userData.regionId,
    userData.region,
    userData.geographicRegion,
    userData.scope?.regionId,
    userData.scope?.region,
  );

const getLocalPromptDocId = ({ scope, scopeId, promptId }) =>
  `${scope}__${scopeId}__${promptId}`;

const ANTHROPIC_MODEL_IDS = {
  "claude-3-sonnet": "claude-sonnet-4-20250514",
  "claude-3-5-sonnet": "claude-sonnet-4-20250514",
  "claude-3-5-sonnet-20241022": "claude-sonnet-4-20250514",
  "claude-3-5-sonnet-20240620": "claude-sonnet-4-20250514",
  "claude-3-5-sonnet-latest": "claude-sonnet-4-20250514",
  "claude-sonnet-4": "claude-sonnet-4-20250514",
  "claude-sonnet-4-5": "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5": "claude-haiku-4-5-20251001",
  "claude-opus-4-5": "claude-opus-4-20250514",
  "claude-opus-4-6": "claude-opus-4-6",
};
const ANTHROPIC_RETIRED_IDS = new Set([
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
]);
const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-20250514";

function resolveAnthropicModelId(model) {
  const normalized = asTrimmed(model).toLowerCase();
  if (!normalized) return ANTHROPIC_DEFAULT_MODEL;
  if (ANTHROPIC_RETIRED_IDS.has(normalized)) return ANTHROPIC_DEFAULT_MODEL;
  return ANTHROPIC_MODEL_IDS[normalized] || model;
}

function detectProviderFromModel(model) {
  const normalized = asTrimmed(model).toLowerCase();
  if (normalized.startsWith("claude")) return "anthropic";
  if (normalized.startsWith("gemini")) return "google";
  if (
    normalized.startsWith("gpt") ||
    normalized.startsWith("o1") ||
    normalized.startsWith("o3") ||
    normalized.startsWith("o4")
  ) {
    return "openai";
  }
  return "openai";
}

function toFiniteNumber(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPositiveInt(value, fallback, maxValue) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(maxValue, Math.floor(parsed));
}

function resolveConfig(config = {}, globalLayer = {}) {
  const model = firstNonEmpty(config.model, globalLayer.model);
  return {
    model,
    provider: firstNonEmpty(config.provider, globalLayer.provider),
    temperature: toFiniteNumber(
      config.temperature,
      toFiniteNumber(globalLayer.temperature, 0.1),
    ),
    maxTokens: Math.max(
      1,
      Math.floor(
        toFiniteNumber(config.maxTokens, toFiniteNumber(globalLayer.maxTokens, 4000)),
      ),
    ),
  };
}

/** Model id passed to {@link queryLLM} (provider prefix + api id, with legacy Anthropic aliases). */
function buildQueryModel(resolvedConfig) {
  const raw = asTrimmed(resolvedConfig.model);
  if (!raw) return "";

  const provider =
    asTrimmed(resolvedConfig.provider).toLowerCase() ||
    detectProviderFromModel(raw);

  if (raw.includes("/")) {
    const [p, ...rest] = raw.split("/");
    const apiPart = rest.join("/").trim();
    if (!apiPart) return raw;
    if (p.toLowerCase() === "anthropic") {
      return `anthropic/${resolveAnthropicModelId(apiPart)}`;
    }
    return raw;
  }

  if (provider === "anthropic") {
    return `anthropic/${resolveAnthropicModelId(raw)}`;
  }
  return `${provider}/${raw}`;
}

function messagesForQueryLLM(systemPrompt, userMessage) {
  const messages = [];
  const sys = asTrimmed(systemPrompt);
  if (sys) {
    messages.push({ role: "system", content: sys });
  }
  messages.push({ role: "user", content: userMessage });
  return messages;
}

const callLLMAPI = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onCall(async (data, context) => {
    if (!context?.auth?.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required.",
      );
    }

  const promptId = asTrimmed(data?.promptId);
  const userMessage = asTrimmed(data?.userMessage);
  const config = typeof data?.config === "object" && data?.config ? data.config : {};
  const fallbackSystemPrompt = asTrimmed(data?.systemPrompt);
  const preview = typeof data?.preview === "object" && data?.preview ? data.preview : {};
  const includeEmbeddedDocuments = data?.includeEmbeddedDocuments === true;
  const embeddedDocumentsOptions =
    typeof data?.embeddedDocumentsOptions === "object" && data?.embeddedDocumentsOptions
      ? data.embeddedDocumentsOptions
      : {};
  const retrieveEmbeddedDocuments =
    embeddedDocumentsPrivate?.retrieveEmbeddedDocuments || null;

  if (!promptId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "promptId is required.",
    );
  }

  if (!userMessage) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userMessage is required.",
    );
  }

  const userRef = db.collection("users").doc(context.auth.uid);
  const globalRef = db.collection("llmGlobalPrompts").doc(promptId);
  const [userSnap, globalSnap] = await Promise.all([userRef.get(), globalRef.get()]);

  const userData = userSnap.exists ? userSnap.data() || {} : {};
  const organizationId = asTrimmed(data?.organizationId || userData.organizationId);
  const regionId = resolveRegionId(userData, data);

  const regionalRef = regionId
    ? db
        .collection("llmLocalPrompts")
        .doc(getLocalPromptDocId({ scope: "region", scopeId: regionId, promptId }))
    : null;
  const orgRef = organizationId
    ? db
        .collection("llmLocalPrompts")
        .doc(getLocalPromptDocId({ scope: "org", scopeId: organizationId, promptId }))
    : null;

  const [regionalSnap, orgSnap] = await Promise.all([
    regionalRef ? regionalRef.get() : Promise.resolve(null),
    orgRef ? orgRef.get() : Promise.resolve(null),
  ]);

  const globalLayer = globalSnap.exists ? globalSnap.data() || {} : {};
  const regionalLayer = regionalSnap?.exists ? regionalSnap.data() || {} : {};
  const organizationLayer = orgSnap?.exists ? orgSnap.data() || {} : {};
  const previewGlobalLayer = pickDefinedFields(preview.globalLayer, [
    "systemPrompt",
    "globalPrompt",
    "contextProvided",
    "responseFormat",
    "model",
    "provider",
    "temperature",
    "maxTokens",
  ]);
  const previewRegionalLayer = pickDefinedFields(preview.regionalLayer, [
    "prompt",
    "regionalPrompt",
  ]);
  const previewOrganizationLayer = pickDefinedFields(preview.organizationLayer, [
    "prompt",
    "organizationPrompt",
  ]);
  const effectiveGlobalLayer = { ...globalLayer, ...previewGlobalLayer };
  const effectiveRegionalLayer = { ...regionalLayer, ...previewRegionalLayer };
  const effectiveOrganizationLayer = {
    ...organizationLayer,
    ...previewOrganizationLayer,
  };

  const composedSections = [
    firstNonEmpty(
      effectiveGlobalLayer.systemPrompt,
      effectiveGlobalLayer.globalPrompt,
      fallbackSystemPrompt,
    ),
    firstNonEmpty(effectiveGlobalLayer.contextProvided),
    firstNonEmpty(effectiveGlobalLayer.responseFormat),
    firstNonEmpty(effectiveRegionalLayer.prompt, effectiveRegionalLayer.regionalPrompt),
    firstNonEmpty(
      effectiveOrganizationLayer.prompt,
      effectiveOrganizationLayer.organizationPrompt,
    ),
  ].filter(Boolean);

  if (!composedSections.length) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `No prompt content is available for "${promptId}".`,
    );
  }

    const resolvedConfig = resolveConfig(config, effectiveGlobalLayer);
    const resolvedModel = resolvedConfig.model;

    if (!resolvedModel) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "model is required (via config.model or llmGlobalPrompts).",
      );
    }

    const provider =
      asTrimmed(resolvedConfig.provider).toLowerCase() ||
      detectProviderFromModel(resolvedConfig.model);

    if (!["openai", "anthropic", "google"].includes(provider)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Unsupported provider "${provider}". Use openai, anthropic, or google.`,
      );
    }

    const queryModel = buildQueryModel(resolvedConfig);
    if (!queryModel) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "model is required (via config.model or llmGlobalPrompts).",
      );
    }

    let embeddedDocuments = null;
    let embeddedDocumentsWarning = null;
    const systemPromptSections = [...composedSections];

    if (includeEmbeddedDocuments) {
      if (typeof retrieveEmbeddedDocuments === "function") {
        try {
          const embeddedChunkLimit = clampPositiveInt(
            embeddedDocumentsOptions.chunkLimit,
            DEFAULT_EMBEDDED_CHUNK_LIMIT,
            MAX_EMBEDDED_CHUNK_LIMIT,
          );
          embeddedDocuments = await retrieveEmbeddedDocuments({
            userId: context.auth.uid,
            promptId,
            conversationText: userMessage,
            model: DEFAULT_EMBEDDED_DOC_RETRIEVAL_MODEL,
            documentLimit: DEFAULT_EMBEDDED_DOC_LIMIT,
            chunkLimit: embeddedChunkLimit,
            maxChunksPerDocument: DEFAULT_EMBEDDED_MAX_CHUNKS_PER_DOCUMENT,
            minSimilarity: DEFAULT_EMBEDDED_MIN_SIMILARITY,
          });

          if (embeddedDocuments?.contextBlock) {
            systemPromptSections.push(embeddedDocuments.contextBlock);
          }
        } catch (error) {
          embeddedDocumentsWarning =
            error?.message || "Embedded document retrieval failed.";
          console.warn("[callLLMAPI] Embedded document retrieval failed", {
            promptId,
            uid: context?.auth?.uid || null,
            message: embeddedDocumentsWarning,
          });
        }
      } else {
        embeddedDocumentsWarning =
          "Embedded document retrieval is unavailable in this environment.";
      }
    }

    const systemPrompt = systemPromptSections.join("\n\n");

    console.info("[callLLMAPI] Executing composed prompt", {
      uid: context?.auth?.uid || null,
      promptId,
      provider,
      model: resolvedConfig.model,
      queryModel,
      organizationId: organizationId || null,
      regionId: regionId || null,
      hasGlobalLayer: globalSnap.exists,
      hasRegionalLayer: Boolean(regionalSnap?.exists),
      hasOrganizationLayer: Boolean(orgSnap?.exists),
      hasPreviewOverrides:
        Boolean(Object.keys(previewGlobalLayer).length) ||
        Boolean(Object.keys(previewRegionalLayer).length) ||
        Boolean(Object.keys(previewOrganizationLayer).length),
      includeEmbeddedDocuments,
      embeddedChunksRetrieved: embeddedDocuments?.chunksRetrieved || 0,
      embeddedChunkLimitRequested: includeEmbeddedDocuments
        ? clampPositiveInt(
            embeddedDocumentsOptions.chunkLimit,
            DEFAULT_EMBEDDED_CHUNK_LIMIT,
            MAX_EMBEDDED_CHUNK_LIMIT,
          )
        : null,
      hasSystemPrompt: Boolean(systemPrompt.length),
      userMessageLength: userMessage.length,
      temperature: resolvedConfig.temperature,
      maxTokens: resolvedConfig.maxTokens,
    });

    try {
      const output = await queryLLM(
        messagesForQueryLLM(systemPrompt, userMessage),
        resolvedConfig.maxTokens,
        resolvedConfig.temperature,
        queryModel,
        `callLLMAPI:${promptId}`,
      );

      if (!output) {
        throw new functions.https.HttpsError(
          "internal",
          `${provider} returned an empty response.`,
        );
      }

      return {
        status: "ok",
        output,
        meta: {
          promptId,
          provider,
          model: resolvedConfig.model,
          temperature: resolvedConfig.temperature,
          maxTokens: resolvedConfig.maxTokens,
          hasPreviewOverrides:
            Boolean(Object.keys(previewGlobalLayer).length) ||
            Boolean(Object.keys(previewRegionalLayer).length) ||
            Boolean(Object.keys(previewOrganizationLayer).length),
          embeddedDocuments: includeEmbeddedDocuments
            ? {
                enabled: true,
                warning: embeddedDocumentsWarning,
                includedInPrompt: Boolean(embeddedDocuments?.contextBlock),
                chunkLimitRequested: clampPositiveInt(
                  embeddedDocumentsOptions.chunkLimit,
                  DEFAULT_EMBEDDED_CHUNK_LIMIT,
                  MAX_EMBEDDED_CHUNK_LIMIT,
                ),
                rewrittenQuery: embeddedDocuments?.rewrittenQuery || null,
                documentsConsidered: embeddedDocuments?.documentsConsidered || 0,
                chunksRetrieved: embeddedDocuments?.chunksRetrieved || 0,
                documents: embeddedDocuments?.documents || [],
                chunks: embeddedDocuments?.chunks || [],
              }
            : null,
          hasSystemPrompt: Boolean(systemPrompt.length),
        },
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      const upstreamMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Unknown upstream error";

      console.error("[callLLMAPI] Upstream provider call failed", {
        promptId,
        provider,
        model: resolvedConfig.model,
        message: upstreamMessage,
        status: error?.response?.status || null,
      });

      if (
        typeof upstreamMessage === "string" &&
        upstreamMessage.startsWith("Missing API key")
      ) {
        throw new functions.https.HttpsError("failed-precondition", upstreamMessage);
      }

      throw new functions.https.HttpsError(
        "internal",
        `LLM call failed (${provider}): ${upstreamMessage}`,
      );
    }
  });

module.exports = {
  callLLMAPI,
};
