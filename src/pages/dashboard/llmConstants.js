/**
 * LLM Constants (Client-Side)
 *
 * SYNC PARTNER: functions/functions/src/llm/llmConstants.js
 * LAST SYNCED: 2026-02-11
 *
 * Canonical definitions for LLM provider detection, default model,
 * and Firestore collection names. These values are shared with
 * the backend Query Manager Orchestrator. When updating, also update
 * the SYNC PARTNER file above.
 *
 * Values that MUST stay in sync with the server:
 * - DEFAULT_MODEL
 * - LLM_PROVIDERS
 * - detectProviderFromModel logic
 * - LLM_COLLECTIONS (QUERIES, VERSIONS, CHAINS)
 */

// ---------------------------------------------------------------------------
// Provider constants
// ---------------------------------------------------------------------------

export const LLM_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
};

// ---------------------------------------------------------------------------
// Default model -- cheapest reliable option, used when no model is specified
// ---------------------------------------------------------------------------

export const DEFAULT_MODEL = 'gemini-2.0-flash';

// ---------------------------------------------------------------------------
// Firestore collection names for the Query Manager system
// ---------------------------------------------------------------------------

export const LLM_COLLECTIONS = {
  QUERY_CONFIG: 'llmQueryConfig',
  QUERIES: 'llmQueries',
  VERSIONS: 'llmQueryVersions',
  CHAINS: 'llmQueryChains',
  GLOBAL_PROMPTS: 'llmGlobalPrompts',
  LOCAL_PROMPTS: 'llmLocalPrompts',
  REGIONS: 'geographicRegions',
  LOCALITIES: 'geographicLocalities',
};

// ---------------------------------------------------------------------------
// Chain execution mode (stored on base query; used by backend for full chains)
// ---------------------------------------------------------------------------
export const CHAIN_MODE = {
  /** Position 1 → 2 → 3; each step can modify the previous output */
  SEQUENTIAL: 'sequential',
  /** Use only the highest-position query that exists (P3 else P2 else P1) */
  SUBSTITUTIONARY: 'substitutionary',
};

// ---------------------------------------------------------------------------
// Model name patterns for auto-detection
// ---------------------------------------------------------------------------

const MODEL_PATTERNS = {
  [LLM_PROVIDERS.OPENAI]: /^gpt-/i,
  [LLM_PROVIDERS.ANTHROPIC]: /^claude-/i,
  [LLM_PROVIDERS.GOOGLE]: /^gemini-/i,
};

/**
 * Auto-detect LLM provider from model name.
 * @param {string} model - Model name (e.g., 'gpt-4-turbo', 'claude-3-opus', 'gemini-2.0-flash')
 * @returns {string} Provider name ('openai', 'anthropic', or 'google')
 */
export function detectProviderFromModel(model) {
  if (!model || typeof model !== 'string') {
    console.warn('[LLMProvider] Invalid model name, defaulting to OpenAI:', model);
    return LLM_PROVIDERS.OPENAI;
  }

  const modelLower = model.toLowerCase().trim();

  // Check Anthropic (claude-* models)
  if (MODEL_PATTERNS[LLM_PROVIDERS.ANTHROPIC].test(modelLower)) {
    return LLM_PROVIDERS.ANTHROPIC;
  }

  // Check Google (gemini-* models)
  if (MODEL_PATTERNS[LLM_PROVIDERS.GOOGLE].test(modelLower)) {
    return LLM_PROVIDERS.GOOGLE;
  }

  // Check OpenAI (gpt-* models)
  if (MODEL_PATTERNS[LLM_PROVIDERS.OPENAI].test(modelLower)) {
    return LLM_PROVIDERS.OPENAI;
  }

  // Default to OpenAI if unknown
  console.warn('[LLMProvider] Unknown model pattern, defaulting to OpenAI:', model);
  return LLM_PROVIDERS.OPENAI;
}

// ---------------------------------------------------------------------------
// Model max completion tokens (prevents API errors when registry sends too high a value)
// ---------------------------------------------------------------------------

/**
 * Max completion tokens allowed per model. Caps client-side so we never send more than the API allows.
 * @param {string} model - Model name
 * @param {string} provider - 'openai' | 'anthropic' | 'google'
 * @returns {number}
 */
export function getMaxCompletionTokensForModel(model, provider) {
  if (!model || typeof model !== 'string') return 4096;
  const m = model.toLowerCase();
  if (provider === LLM_PROVIDERS.ANTHROPIC) {
    return 8192; // Claude typically allows 4096–8192+; use 8192 as safe client cap
  }
  if (provider === LLM_PROVIDERS.GOOGLE) {
    return 8192; // Gemini 2.0 Flash supports up to 8192 output tokens
  }
  // OpenAI
  if (m.includes('gpt-4-turbo') || m.includes('gpt-4-1106')) return 4096;
  if (m.includes('gpt-4o')) return 4096;
  if (m.includes('gpt-4.1')) return 16384;
  return 4096;
}
