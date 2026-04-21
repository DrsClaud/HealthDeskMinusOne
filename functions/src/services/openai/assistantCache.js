const { db } = require("../../config/firebase");

// Container-level cache - persists for the lifetime of the function container
// Now caches individual configs instead of loading all at once
let cachedConfigs = {};
let cacheLoadTimes = {};

/**
 * Load a single assistant configuration from Firestore
 * Uses container-level caching - only loads once per assistant per container lifecycle
 */
async function loadSingleAssistantConfig(assistantId) {
  const loadStart = Date.now();

  try {
    const doc = await db.collection("assistants").doc(assistantId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    const config = {
      id: assistantId,
      prompt: data.prompt || "",
      vectorStoreId: data.vectorStoreId || null,
      model: data.model || "gpt-4o-mini",
    };

    return config;
  } catch (error) {
    return null;
  }
}

/**
 * Get assistant configuration by ID
 * Uses container-level cache for performance - only loads individual configs as needed
 */
async function getAssistantConfig(assistantId) {
  const getStart = Date.now();

  // Check if this specific assistant is cached
  if (cachedConfigs[assistantId]) {
    return cachedConfigs[assistantId];
  }

  // Cache miss - load this specific assistant
  const config = await loadSingleAssistantConfig(assistantId);

  if (config) {
    // Cache the loaded config
    cachedConfigs[assistantId] = config;
    cacheLoadTimes[assistantId] = Date.now();
  }

  return config;
}

/**
 * Get all assistant configurations
 * Useful for admin interfaces - loads all configs at once for this specific use case
 */
async function getAllAssistantConfigs() {
  try {
    const snapshot = await db.collection("assistants").get();

    if (snapshot.empty) {
      return {};
    }

    const configs = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      configs[doc.id] = {
        id: doc.id,
        prompt: data.prompt || "",
        vectorStoreId: data.vectorStoreId || null,
        model: data.model || "gpt-4o-mini",
      };
    });

    return configs;
  } catch (error) {
    return {};
  }
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
function clearCache() {
  cachedConfigs = {};
  cacheLoadTimes = {};
}

/**
 * Get cache status for debugging
 */
function getCacheStatus() {
  const status = {
    cachedAssistants: Object.keys(cachedConfigs),
    configCount: Object.keys(cachedConfigs).length,
    cacheDetails: {},
  };

  // Add details for each cached assistant
  Object.keys(cachedConfigs).forEach((assistantId) => {
    const loadTime = cacheLoadTimes[assistantId];
    status.cacheDetails[assistantId] = {
      loadTime,
      ageMs: loadTime ? Date.now() - loadTime : null,
    };
  });

  return status;
}

module.exports = {
  getAssistantConfig,
  getAllAssistantConfigs,
  clearCache,
  getCacheStatus,
  loadSingleAssistantConfig, // Export for testing
};
