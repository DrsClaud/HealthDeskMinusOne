const { iterateSSE, readErrorResponse } = require("./sse");

function splitAnthropicMessages(messages) {
  const systemParts = [];
  const chatMessages = [];

  for (const message of messages) {
    if (message.role === "system") {
      systemParts.push(message.content);
      continue;
    }

    chatMessages.push({
      role: message.role,
      content: message.content,
    });
  }

  return {
    system: systemParts.join("\n\n").trim() || undefined,
    messages: chatMessages,
  };
}

function extractAnthropicText(contentBlocks) {
  if (!Array.isArray(contentBlocks)) {
    return "";
  }

  return contentBlocks
    .map((block) => (block?.type === "text" ? block.text || "" : ""))
    .join("");
}

function normalizeUsage(usage) {
  if (!usage) {
    return null;
  }

  const promptTokens = Number(usage.input_tokens ?? 0);
  const completionTokens = Number(usage.output_tokens ?? 0);
  const totalTokens = Number(
    usage.total_tokens ?? promptTokens + completionTokens
  );

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  };
}

async function queryAnthropic({
  apiKey,
  model,
  messages,
  maxTokens,
  temperature,
}) {
  const anthropicInput = splitAnthropicMessages(messages);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: anthropicInput.system,
      messages: anthropicInput.messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Anthropic request failed: ${await readErrorResponse(response)}`
    );
  }

  const payload = await response.json();

  return {
    text: extractAnthropicText(payload.content),
    usage: normalizeUsage(payload.usage),
    raw: payload,
  };
}

async function* streamAnthropic({
  apiKey,
  model,
  messages,
  maxTokens,
  temperature,
}) {
  const anthropicInput = splitAnthropicMessages(messages);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: anthropicInput.system,
      messages: anthropicInput.messages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Anthropic streaming request failed: ${await readErrorResponse(response)}`
    );
  }

  let promptTokens = 0;
  let completionTokens = 0;

  for await (const event of iterateSSE(response)) {
    if (!event.data) {
      continue;
    }

    const payload = JSON.parse(event.data);

    if (payload.type === "message_start") {
      promptTokens = Number(payload.message?.usage?.input_tokens ?? 0);
      continue;
    }

    if (payload.type === "content_block_delta") {
      const text =
        payload.delta?.text ||
        payload.delta?.text_delta ||
        payload.delta?.partial_text ||
        "";

      if (text) {
        yield { text };
      }
      continue;
    }

    if (payload.type === "message_delta") {
      completionTokens = Number(payload.usage?.output_tokens ?? completionTokens);
      continue;
    }

    if (payload.type === "message_stop") {
      yield {
        text: "",
        done: true,
        usage: normalizeUsage({
          input_tokens: promptTokens,
          output_tokens: completionTokens,
        }),
      };
      return;
    }
  }

  yield {
    text: "",
    done: true,
    usage: normalizeUsage({
      input_tokens: promptTokens,
      output_tokens: completionTokens,
    }),
  };
}

module.exports = {
  queryAnthropic,
  streamAnthropic,
};
