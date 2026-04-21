const { iterateSSE, readErrorResponse } = require("./sse");

const GOOGLE_REQUEST_TIMEOUT_MS = 90_000;
const GOOGLE_MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isGoogleRateLimited(status, errorText) {
  return (
    status === 429 ||
    status === 503 ||
    (typeof errorText === "string" && errorText.includes("Resource exhausted"))
  );
}

function googleRetryDelayMs(attempt, retryAfterHeader) {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds)) {
      return Math.min(seconds * 1000, 30_000);
    }
  }
  return Math.min(2000 * 2 ** (attempt - 1), 15_000);
}

function toGooglePayload(messages, maxTokens, temperature) {
  const systemParts = [];
  const contents = [];

  for (const message of messages) {
    if (message.role === "system") {
      systemParts.push(message.content);
      continue;
    }

    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    });
  }

  return {
    ...(systemParts.length
      ? {
          systemInstruction: {
            parts: [{ text: systemParts.join("\n\n") }],
          },
        }
      : {}),
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  };
}

function extractGoogleText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => {
      if (typeof part?.text === "string") {
        return part.text;
      }

      return "";
    })
    .join("");
}

function normalizeUsage(usageMetadata) {
  if (!usageMetadata) {
    return null;
  }

  const promptTokens = Number(usageMetadata.promptTokenCount ?? 0);
  const completionTokens = Number(usageMetadata.candidatesTokenCount ?? 0);
  const totalTokens = Number(
    usageMetadata.totalTokenCount ?? promptTokens + completionTokens
  );

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  };
}

async function fetchGoogleJsonWithRetry(url, payload) {
  let lastError = null;
  for (let attempt = 1; attempt <= GOOGLE_MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
    });
    if (response.ok) {
      return response.json();
    }

    const retryAfter = response.headers.get("retry-after");
    const errText = await readErrorResponse(response);
    lastError = new Error(`Google request failed: ${errText}`);

    if (!isGoogleRateLimited(response.status, errText) || attempt >= GOOGLE_MAX_RETRIES) {
      throw lastError;
    }

    await sleep(googleRetryDelayMs(attempt, retryAfter));
  }

  throw lastError || new Error("Google API call failed");
}

async function fetchGoogleStreamResponseWithRetry(url, payload) {
  let lastError = null;
  for (let attempt = 1; attempt <= GOOGLE_MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
    });
    if (response.ok) {
      return response;
    }

    const retryAfter = response.headers.get("retry-after");
    const errText = await readErrorResponse(response);
    lastError = new Error(`Google streaming request failed: ${errText}`);

    if (!isGoogleRateLimited(response.status, errText) || attempt >= GOOGLE_MAX_RETRIES) {
      throw lastError;
    }

    await sleep(googleRetryDelayMs(attempt, retryAfter));
  }

  throw lastError || new Error("Google streaming API call failed");
}

async function queryGoogle({ apiKey, model, messages, maxTokens, temperature }) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = toGooglePayload(messages, maxTokens, temperature);
  const body = await fetchGoogleJsonWithRetry(url, payload);

  return {
    text: extractGoogleText(body),
    usage: normalizeUsage(body.usageMetadata),
    raw: body,
  };
}

async function* streamGoogle({
  apiKey,
  model,
  messages,
  maxTokens,
  temperature,
}) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const payload = toGooglePayload(messages, maxTokens, temperature);
  const response = await fetchGoogleStreamResponseWithRetry(url, payload);

  let lastUsage = null;
  let emittedText = "";

  for await (const event of iterateSSE(response)) {
    if (!event.data) {
      continue;
    }

    const chunkPayload = JSON.parse(event.data);
    lastUsage = normalizeUsage(chunkPayload.usageMetadata) || lastUsage;

    const text = extractGoogleText(chunkPayload);
    if (!text) {
      continue;
    }

    const delta = text.startsWith(emittedText)
      ? text.slice(emittedText.length)
      : text;

    if (!delta) {
      continue;
    }

    emittedText = text.startsWith(emittedText) ? text : emittedText + delta;
    yield { text: delta };
  }

  yield {
    text: "",
    done: true,
    usage: lastUsage,
  };
}

module.exports = {
  queryGoogle,
  streamGoogle,
};
