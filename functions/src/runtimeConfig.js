const { defineSecret } = require("firebase-functions/params");

const runtimeConfigSecret = defineSecret("RUNTIME_CONFIG");

let cachedRuntimeConfig = null;

function getRuntimeConfig() {
  if (!cachedRuntimeConfig) {
    const rawValue = runtimeConfigSecret.value();
    if (!rawValue || typeof rawValue !== "string") {
      throw new Error("RUNTIME_CONFIG secret is missing or invalid");
    }

    try {
      cachedRuntimeConfig = JSON.parse(rawValue);
    } catch (error) {
      throw new Error("RUNTIME_CONFIG secret must be valid JSON");
    }
  }

  return cachedRuntimeConfig;
}

module.exports = {
  runtimeConfigSecret,
  getRuntimeConfig,
};
