import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

const callLLMAPICallable = httpsCallable(functions, "callLLMAPI", {
  timeout: 300000,
});

export async function invokeLLMPrompt({
  promptId,
  userMessage,
  config,
  systemPrompt,
  organizationId,
  regionId,
  preview,
  includeEmbeddedDocuments,
  embeddedDocumentsOptions,
}) {
  const payload = {
    promptId,
    userMessage,
  };

  if (config && typeof config === "object") payload.config = config;
  if (typeof systemPrompt === "string" && systemPrompt.trim()) {
    payload.systemPrompt = systemPrompt;
  }
  if (typeof organizationId === "string" && organizationId.trim()) {
    payload.organizationId = organizationId;
  }
  if (typeof regionId === "string" && regionId.trim()) {
    payload.regionId = regionId;
  }
  if (preview && typeof preview === "object") {
    payload.preview = preview;
  }
  if (includeEmbeddedDocuments === true) {
    payload.includeEmbeddedDocuments = true;
  }
  if (embeddedDocumentsOptions && typeof embeddedDocumentsOptions === "object") {
    payload.embeddedDocumentsOptions = embeddedDocumentsOptions;
  }

  const result = await callLLMAPICallable(payload);
  const output = result?.data?.output;

  if (!output || typeof output !== "string") {
    throw new Error("callLLMAPI returned no output");
  }

  return {
    output,
    meta: result?.data?.meta || null,
    embeddedDocuments: result?.data?.meta?.embeddedDocuments || null,
    raw: result?.data || null,
  };
}

