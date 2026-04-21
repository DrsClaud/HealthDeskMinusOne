function parseSSEFrame(frame) {
  const lines = frame.split(/\r?\n/);
  let event = "message";
  const data = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      data.push(line.slice("data:".length).trimStart());
    }
  }

  return {
    event,
    data: data.join("\n"),
  };
}

function findFrameSeparator(buffer) {
  const match = /\r?\n\r?\n/.exec(buffer);
  if (!match || typeof match.index !== "number") {
    return null;
  }

  return {
    index: match.index,
    length: match[0].length,
  };
}

async function* iterateSSE(response) {
  if (!response.body) {
    throw new Error("Expected a streaming response body.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });

    while (true) {
      const separator = findFrameSeparator(buffer);
      if (!separator) {
        break;
      }

      const frame = buffer.slice(0, separator.index);
      buffer = buffer.slice(separator.index + separator.length);

      if (!frame.trim()) {
        continue;
      }

      yield parseSSEFrame(frame);
    }
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    yield parseSSEFrame(buffer);
  }
}

async function readErrorResponse(response) {
  const rawText = await response.text();

  if (!rawText) {
    return `HTTP ${response.status}`;
  }

  try {
    const parsed = JSON.parse(rawText);
    return parsed.error?.message || parsed.message || rawText;
  } catch (error) {
    return rawText;
  }
}

module.exports = {
  iterateSSE,
  readErrorResponse,
};
