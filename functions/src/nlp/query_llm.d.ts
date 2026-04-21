export type KnownModel =
  | "openai/gpt-5.4"
  | "openai/gpt-5.4-pro"
  | "openai/gpt-5.4-mini"
  | "openai/gpt-5.4-nano"
  | "openai/gpt-5.2"
  | "openai/gpt-5.1"
  | "openai/gpt-5"
  | "openai/gpt-5-pro"
  | "openai/gpt-5-mini"
  | "openai/gpt-5-nano"
  | "openai/gpt-4.1"
  | "openai/gpt-4o"
  | "openai/gpt-4o-mini"
  | "openai/o3"
  | "openai/o4-mini"
  | "anthropic/claude-opus-4-6"
  | "anthropic/claude-sonnet-4-6"
  | "anthropic/claude-opus-4-5"
  | "anthropic/claude-sonnet-4-5"
  | "anthropic/claude-opus-4-1"
  | "anthropic/claude-sonnet-4"
  | "anthropic/claude-opus-4"
  | "anthropic/claude-haiku-4-5"
  | "anthropic/claude-haiku-3-5"
  | "google/gemini-3"
  | "google/gemini-3.1-pro"
  | "google/gemini-3-flash"
  | "google/gemini-3-flash-lite"
  | "google/gemini-2.5-pro"
  | "google/gemini-2.5-flash"
  | "google/gemini-2.5-flash-lite";

export type Model = KnownModel | (string & {});

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMInput = string | LLMMessage[];

export type LLMStreamChunk = {
  text: string;
  done?: boolean;
};

export declare const KNOWN_MODELS: readonly KnownModel[];

export declare function queryLLM(
  prompt: LLMInput,
  maxTokens: number,
  temperature: number,
  model: Model,
  description?: string,
  stream?: false
): Promise<string>;

export declare function queryLLM(
  prompt: LLMInput,
  maxTokens: number,
  temperature: number,
  model: Model,
  description: string | undefined,
  stream: true
): Promise<AsyncIterable<LLMStreamChunk>>;
