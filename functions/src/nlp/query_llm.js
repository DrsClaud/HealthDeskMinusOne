const functions = require("firebase-functions");
const { admin, db } = require("../config/firebase");
const { queryOpenAI, streamOpenAI } = require("./backends/openai");
const { queryAnthropic, streamAnthropic } = require("./backends/anthropic");
const { queryGoogle, streamGoogle } = require("./backends/google");

const KNOWN_MODELS = Object.freeze([
  "openai/gpt-5.4",
  "openai/gpt-5.4-pro",
  "openai/gpt-5.4-mini",
  "openai/gpt-5.4-nano",
  "openai/gpt-5.2",
  "openai/gpt-5.1",
  "openai/gpt-5",
  "openai/gpt-5-pro",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-4.1",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/o3",
  "openai/o4-mini",
  "anthropic/claude-opus-4-6",
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-opus-4-5",
  "anthropic/claude-sonnet-4-5",
  "anthropic/claude-opus-4-1",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-opus-4",
  "anthropic/claude-haiku-4-5",
  "anthropic/claude-haiku-3-5",
  "google/gemini-3",
  "google/gemini-3.1-pro",
  "google/gemini-3-flash",
  "google/gemini-3-flash-lite",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
]);

const MODEL_METADATA = {
  "openai/gpt-5.4": {
    provider: "openai",
    apiModel: "gpt-5.4",
    pricingPerMillion: {
      input: 2.5,
      output: 15,
    },
  },
  "openai/gpt-5.4-pro": {
    provider: "openai",
    apiModel: "gpt-5.4-pro",
    pricingPerMillion: {
      input: 30,
      output: 180,
    },
  },
  "openai/gpt-5.4-mini": {
    provider: "openai",
    apiModel: "gpt-5.4-mini",
    pricingPerMillion: {
      input: 0.75,
      output: 4.5,
    },
  },
  "openai/gpt-5.4-nano": {
    provider: "openai",
    apiModel: "gpt-5.4-nano",
    pricingPerMillion: {
      input: 0.2,
      output: 1.25,
    },
  },
  "openai/gpt-5.2": {
    provider: "openai",
    apiModel: "gpt-5.2",
    pricingPerMillion: {
      input: 1.75,
      output: 14,
    },
  },
  "openai/gpt-5.1": {
    provider: "openai",
    apiModel: "gpt-5.1",
    pricingPerMillion: {
      input: 1.25,
      output: 10,
    },
  },
  "openai/gpt-5": {
    provider: "openai",
    apiModel: "gpt-5",
    pricingPerMillion: {
      input: 1.25,
      output: 10,
    },
  },
  "openai/gpt-5-pro": {
    provider: "openai",
    apiModel: "gpt-5-pro",
    pricingPerMillion: {
      input: 15,
      output: 120,
    },
  },
  "openai/gpt-5-mini": {
    provider: "openai",
    apiModel: "gpt-5-mini",
    pricingPerMillion: {
      input: 0.25,
      output: 2,
    },
  },
  "openai/gpt-5-nano": {
    provider: "openai",
    apiModel: "gpt-5-nano",
    pricingPerMillion: {
      input: 0.05,
      output: 0.4,
    },
  },
  "openai/gpt-4.1": {
    provider: "openai",
    apiModel: "gpt-4.1",
    pricingPerMillion: {
      input: 2,
      output: 8,
    },
  },
  "openai/gpt-4o": {
    provider: "openai",
    apiModel: "gpt-4o",
    pricingPerMillion: {
      input: 2.5,
      output: 10,
    },
  },
  "openai/gpt-4o-mini": {
    provider: "openai",
    apiModel: "gpt-4o-mini",
    pricingPerMillion: {
      input: 0.15,
      output: 0.6,
    },
  },
  "openai/o3": {
    provider: "openai",
    apiModel: "o3",
    pricingPerMillion: {
      input: 2,
      output: 8,
    },
  },
  "openai/o4-mini": {
    provider: "openai",
    apiModel: "o4-mini",
    pricingPerMillion: {
      input: 1.1,
      output: 4.4,
    },
  },
  "anthropic/claude-opus-4-6": {
    provider: "anthropic",
    apiModel: "claude-opus-4-6",
    pricingPerMillion: {
      input: 5,
      output: 25,
    },
  },
  "anthropic/claude-sonnet-4-6": {
    provider: "anthropic",
    apiModel: "claude-sonnet-4-6",
    pricingPerMillion: {
      input: 3,
      output: 15,
    },
  },
  "anthropic/claude-opus-4-5": {
    provider: "anthropic",
    apiModel: "claude-opus-4-5",
    pricingPerMillion: {
      input: 5,
      output: 25,
    },
  },
  "anthropic/claude-sonnet-4-5": {
    provider: "anthropic",
    apiModel: "claude-sonnet-4-5",
    pricingPerMillion: {
      input: 3,
      output: 15,
    },
  },
  "anthropic/claude-opus-4-1": {
    provider: "anthropic",
    apiModel: "claude-opus-4-1",
    pricingPerMillion: {
      input: 15,
      output: 75,
    },
  },
  "anthropic/claude-sonnet-4": {
    provider: "anthropic",
    apiModel: "claude-sonnet-4-0",
    pricingPerMillion: {
      input: 3,
      output: 15,
    },
  },
  "anthropic/claude-opus-4": {
    provider: "anthropic",
    apiModel: "claude-opus-4-0",
    pricingPerMillion: {
      input: 15,
      output: 75,
    },
  },
  "anthropic/claude-haiku-4-5": {
    provider: "anthropic",
    apiModel: "claude-haiku-4-5",
    pricingPerMillion: {
      input: 1,
      output: 5,
    },
  },
  "anthropic/claude-haiku-3-5": {
    provider: "anthropic",
    apiModel: "claude-3-5-haiku-20241022",
    pricingPerMillion: {
      input: 0.8,
      output: 4,
    },
  },
  "google/gemini-3": {
    provider: "google",
    apiModel: "gemini-3.1-pro-preview",
    pricingPerMillion: {
      input: 2,
      output: 12,
    },
  },
  "google/gemini-3.1-pro": {
    provider: "google",
    apiModel: "gemini-3.1-pro-preview",
    pricingPerMillion: {
      input: 2,
      output: 12,
    },
  },
  "google/gemini-3-flash": {
    provider: "google",
    apiModel: "gemini-3-flash-preview",
    pricingPerMillion: {
      input: 0.5,
      output: 3,
    },
  },
  "google/gemini-3-flash-lite": {
    provider: "google",
    apiModel: "gemini-3.1-flash-lite-preview",
    pricingPerMillion: {
      input: 0.25,
      output: 1.5,
    },
  },
  "google/gemini-2.5-pro": {
    provider: "google",
    apiModel: "gemini-2.5-pro",
    pricingPerMillion: {
      input: 1.25,
      output: 10,
    },
  },
  "google/gemini-2.5-flash": {
    provider: "google",
    apiModel: "gemini-2.5-flash",
    pricingPerMillion: {
      input: 0.3,
      output: 2.5,
    },
  },
  "google/gemini-2.5-flash-lite": {
    provider: "google",
    apiModel: "gemini-2.5-flash-lite",
    pricingPerMillion: {
      input: 0.1,
      output: 0.4,
    },
  },
};

const PROVIDER_RUNNERS = {
  openai: {
    query: queryOpenAI,
    stream: streamOpenAI,
  },
  anthropic: {
    query: queryAnthropic,
    stream: streamAnthropic,
  },
  google: {
    query: queryGoogle,
    stream: streamGoogle,
  },
};

function getFunctionsConfig() {
  try {
    return functions.config();
  } catch (error) {
    return {};
  }
}

function tryRuntimeConfigApiKey(provider) {
  try {
    const { getRuntimeConfig } = require("../runtimeConfig");
    const rc = getRuntimeConfig();
    if (provider === "openai") {
      return rc.openai?.apikey || rc.openai?.api_key || null;
    }
    if (provider === "anthropic") {
      return rc.anthropic?.apikey || rc.anthropic?.api_key || null;
    }
    if (provider === "google") {
      return (
        rc.google?.apikey ||
        rc.google?.api_key ||
        rc.gemini?.apikey ||
        rc.gemini?.api_key ||
        null
      );
    }
  } catch (_err) {
    return null;
  }
  return null;
}

function getApiKey(provider) {
  const fromRuntime = tryRuntimeConfigApiKey(provider);
  if (fromRuntime) return fromRuntime;

  const config = getFunctionsConfig();

  if (provider === "openai") {
    return (
      config.openai?.apikey ||
      config.openai?.api_key ||
      process.env.OPENAI_API_KEY ||
      null
    );
  }

  if (provider === "anthropic") {
    return (
      config.anthropic?.apikey ||
      config.anthropic?.api_key ||
      process.env.ANTHROPIC_API_KEY ||
      null
    );
  }

  if (provider === "google") {
    return (
      config.google?.apikey ||
      config.google?.api_key ||
      config.gemini?.apikey ||
      config.gemini?.api_key ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      null
    );
  }

  return null;
}

function resolveModel(model) {
  if (MODEL_METADATA[model]) {
    return {
      requestedModel: model,
      ...MODEL_METADATA[model],
    };
  }

  if (typeof model !== "string" || !model.trim()) {
    throw new Error("model must be a non-empty string.");
  }

  if (model.includes("/")) {
    const [provider, ...rest] = model.split("/");
    const apiModel = rest.join("/").trim();

    if (!PROVIDER_RUNNERS[provider]) {
      throw new Error(`Unsupported LLM provider "${provider}".`);
    }

    if (!apiModel) {
      throw new Error(`Missing model name after provider prefix in "${model}".`);
    }

    return {
      requestedModel: model,
      provider,
      apiModel,
      pricingPerMillion: null,
    };
  }

  const lowerModel = model.toLowerCase();
  let provider = "openai";

  if (lowerModel.includes("claude")) {
    provider = "anthropic";
  } else if (lowerModel.includes("gemini")) {
    provider = "google";
  }

  return {
    requestedModel: model,
    provider,
    apiModel: model,
    pricingPerMillion: null,
  };
}

function normalizeMessages(input) {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error("prompt must be a non-empty string.");
    }

    return [
      {
        role: "user",
        content: trimmed,
      },
    ];
  }

  if (!Array.isArray(input) || input.length === 0) {
    throw new Error(
      "prompt must be a non-empty string or a non-empty array of messages."
    );
  }

  const normalized = input.map((message, index) => {
    if (!message || typeof message !== "object") {
      throw new Error(`Invalid message at index ${index}.`);
    }

    if (!["system", "user", "assistant"].includes(message.role)) {
      throw new Error(
        `Invalid role at index ${index}. Expected system, user, or assistant.`
      );
    }

    if (typeof message.content !== "string" || !message.content.trim()) {
      throw new Error(`Invalid content at index ${index}.`);
    }

    return {
      role: message.role,
      content: message.content,
    };
  });

  if (!normalized.some((message) => message.role !== "system")) {
    throw new Error("At least one user or assistant message is required.");
  }

  return normalized;
}

function normalizeUsage(usage) {
  if (!usage) {
    return null;
  }

  const promptTokens = Number(usage.prompt_tokens ?? 0);
  const completionTokens = Number(usage.completion_tokens ?? 0);
  const totalTokens = Number(
    usage.total_tokens ?? promptTokens + completionTokens
  );

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  };
}

function calculateCost(pricingPerMillion, usage) {
  if (!pricingPerMillion || !usage) {
    return null;
  }

  const inputCost =
    (Number(usage.prompt_tokens ?? 0) / 1000000) * pricingPerMillion.input;
  const outputCost =
    (Number(usage.completion_tokens ?? 0) / 1000000) * pricingPerMillion.output;

  return Number((inputCost + outputCost).toFixed(8));
}

async function persistLLMCall({
  messages,
  maxTokens,
  temperature,
  model,
  description,
  output,
  usage,
  success,
  error,
}) {
  try {
    const normalizedUsage = normalizeUsage(usage);

    await db.collection("firestore_llmcalls").add({
      cost: calculateCost(model.pricingPerMillion, normalizedUsage),
      date: admin.firestore.Timestamp.now(),
      description: description || null,
      error: error || null,
      inp: JSON.stringify(messages),
      max_tokens: maxTokens,
      model: model.requestedModel,
      model_name: model.apiModel,
      out: output,
      provider: model.provider,
      success,
      temperature,
      usage_tokens_compl: normalizedUsage?.completion_tokens ?? null,
      usage_tokens_prmpt: normalizedUsage?.prompt_tokens ?? null,
      usage_tokens_total: normalizedUsage?.total_tokens ?? null,
    });
  } catch (persistError) {
    console.error("Failed to persist LLM call log:", persistError);
  }
}

async function runNonStreamingQuery({
  runner,
  apiKey,
  model,
  messages,
  maxTokens,
  temperature,
  description,
}) {
  try {
    const result = await runner.query({
      apiKey,
      model: model.apiModel,
      messages,
      maxTokens,
      temperature,
    });

    await persistLLMCall({
      messages,
      maxTokens,
      temperature,
      model,
      description,
      output: result.text,
      usage: result.usage,
      success: true,
      error: null,
    });

    return result.text;
  } catch (error) {
    await persistLLMCall({
      messages,
      maxTokens,
      temperature,
      model,
      description,
      output: "",
      usage: null,
      success: false,
      error: error.message,
    });

    throw error;
  }
}

function createTrackedStream({
  providerStream,
  messages,
  maxTokens,
  temperature,
  model,
  description,
}) {
  async function* trackedStream() {
    let output = "";
    let usage = null;
    let completed = false;
    let logged = false;

    try {
      for await (const chunk of providerStream) {
        if (chunk.usage) {
          usage = chunk.usage;
        }

        if (chunk.text) {
          output += chunk.text;
          yield { text: chunk.text };
        }

        if (chunk.done) {
          completed = true;
          yield { text: "", done: true };
          break;
        }
      }

      if (!logged) {
        await persistLLMCall({
          messages,
          maxTokens,
          temperature,
          model,
          description,
          output,
          usage,
          success: completed,
          error: completed ? null : "Stream ended before completion.",
        });
        logged = true;
      }
    } catch (error) {
      if (!logged) {
        await persistLLMCall({
          messages,
          maxTokens,
          temperature,
          model,
          description,
          output,
          usage,
          success: false,
          error: error.message,
        });
        logged = true;
      }

      throw error;
    } finally {
      if (!logged && output) {
        await persistLLMCall({
          messages,
          maxTokens,
          temperature,
          model,
          description,
          output,
          usage,
          success: false,
          error: "Stream consumer closed before completion.",
        });
      }
    }
  }

  return trackedStream();
}

/**
 * @param {string | Array<{role: "system" | "user" | "assistant", content: string}>} prompt
 * @param {number} maxTokens
 * @param {number} temperature
 * @param {string} model
 * @param {string} [description]
 * @param {boolean} [stream=false]
 * @returns {Promise<string | AsyncIterable<{text: string, done?: boolean}>>}
 */
async function queryLLM(
  prompt,
  maxTokens,
  temperature,
  model,
  description,
  stream = false
) {
  if (!Number.isFinite(maxTokens) || maxTokens <= 0) {
    throw new Error("maxTokens must be a positive number.");
  }

  if (!Number.isFinite(temperature) || temperature < 0) {
    throw new Error("temperature must be a non-negative number.");
  }

  const messages = normalizeMessages(prompt);
  const resolvedModel = resolveModel(model);
  const runner = PROVIDER_RUNNERS[resolvedModel.provider];
  const apiKey = getApiKey(resolvedModel.provider);

  if (!apiKey) {
    throw new Error(`Missing API key for provider "${resolvedModel.provider}".`);
  }

  if (!stream) {
    return runNonStreamingQuery({
      runner,
      apiKey,
      model: resolvedModel,
      messages,
      maxTokens,
      temperature,
      description,
    });
  }

  const providerStream = runner.stream({
    apiKey,
    model: resolvedModel.apiModel,
    messages,
    maxTokens,
    temperature,
  });

  return createTrackedStream({
    providerStream,
    messages,
    maxTokens,
    temperature,
    model: resolvedModel,
    description,
  });
}

module.exports = {
  KNOWN_MODELS,
  queryLLM,
};
