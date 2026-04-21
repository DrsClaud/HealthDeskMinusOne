const OpenAI = require("openai");
const { getRuntimeConfig } = require("../../runtimeConfig");

let cachedClient = null;

function getOpenAIClient() {
  if (!cachedClient) {
    const cfg = getRuntimeConfig();
    cachedClient = new OpenAI({
      apiKey: cfg.openai.apikey,
    });
  }
  return cachedClient;
}

const openaiClient = new Proxy(
  {},
  {
    get(_target, prop) {
      return getOpenAIClient()[prop];
    },
  },
);

exports.openaiClient = openaiClient;
exports.getOpenAIClient = getOpenAIClient;
