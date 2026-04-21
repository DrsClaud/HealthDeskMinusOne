export const LLM_PROVIDERS = {
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  GOOGLE: "google",
};

export const DEFAULT_MODEL = "gemini-2.0-flash";

export const LLM_COLLECTIONS = {
  QUERY_CONFIG: "llmQueryConfig",
  QUERIES: "llmQueries",
  VERSIONS: "llmQueryVersions",
  CHAINS: "llmQueryChains",
  GLOBAL_PROMPTS: "llmGlobalPrompts",
  LOCAL_PROMPTS: "llmLocalPrompts",
};

export const CHAIN_MODE = {
  SEQUENTIAL: "sequential",
  SUBSTITUTIONARY: "substitutionary",
};
