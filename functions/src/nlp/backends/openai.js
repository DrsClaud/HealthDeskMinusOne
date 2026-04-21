const OpenAI = require("openai");

function extractOpenAIText(content) {
  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (part?.type === "text" && typeof part.text === "string") {
        return part.text;
      }

      return "";
    })
    .join("");
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

function openaiClient(apiKey) {
  return new OpenAI({ apiKey });
}

/**
 * Newer OpenAI models (o1, o3, o4, gpt-5, gpt-4.1 families):
 *  - use `max_completion_tokens` instead of `max_tokens`
 *  - do not support a custom `temperature` (only the default 1 is allowed)
 */
function isRestrictedModel(model) {
  const m = String(model || "").toLowerCase();
  return (
    /^o\d/.test(m) ||       // o1, o3, o4-mini, …
    m.includes("gpt-5") ||  // gpt-5, gpt-5-nano, gpt-5-mini
    m.includes("gpt-4.1")   // gpt-4.1, gpt-4.1-mini
  );
}

function maxTokensParam(model, value) {
  if (!value) return {};
  return isRestrictedModel(model)
    ? { max_completion_tokens: value }
    : { max_tokens: value };
}

function temperatureParam(model, value) {
  // Restricted models only support the default temperature (1); omit the param entirely.
  if (isRestrictedModel(model)) return {};
  if (value == null) return {};
  return { temperature: value };
}

async function queryOpenAI({ apiKey, model, messages, maxTokens, temperature }) {
  const client = openaiClient(apiKey);
  const payload = await client.chat.completions.create({
    model,
    messages,
    ...maxTokensParam(model, maxTokens),
    ...temperatureParam(model, temperature),
  });

  const text = extractOpenAIText(payload.choices?.[0]?.message?.content);

  return {
    text,
    usage: normalizeUsage(payload.usage),
    raw: payload,
  };
}

async function* streamOpenAI({
  apiKey,
  model,
  messages,
  maxTokens,
  temperature,
}) {
  const client = openaiClient(apiKey);
  const stream = await client.chat.completions.create({
    model,
    messages,
    ...maxTokensParam(model, maxTokens),
    ...temperatureParam(model, temperature),
    stream: true,
    stream_options: {
      include_usage: true,
    },
  });

  let finalUsage = null;

  for await (const chunk of stream) {
    finalUsage = normalizeUsage(chunk.usage) || finalUsage;

    const text = extractOpenAIText(chunk.choices?.[0]?.delta?.content);
    if (text) {
      yield { text };
    }
  }

  yield {
    text: "",
    done: true,
    usage: finalUsage,
  };
}

module.exports = {
  queryOpenAI,
  streamOpenAI,
};
