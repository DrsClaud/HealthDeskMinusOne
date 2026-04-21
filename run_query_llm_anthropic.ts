// Local runner to test `queryLLM` with Anthropic (Claude) via the functions module.
//
// Deployed callable smoke (callLLMAPI on Firebase): scripts/cloud-smoke-call-llm-api.js
// and src/tests/cloud/callLLMAPI.cloud.test.js
//
// Examples:
//   npx ts-node --transpile-only run_query_llm_anthropic.ts --prompt "Say hi"
//   npx ts-node --transpile-only run_query_llm_anthropic.ts --stream --maxTokens 256
//
// Requires `ANTHROPIC_API_KEY` to be present in `a/.env.sandbox` (or pass --envFile).

import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

type LLMStreamChunk = {
  text: string;
  done?: boolean;
};

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function stripQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadDotEnvFile(envFilePath: string, opts?: { overrideEnv?: boolean }) {
  if (!fs.existsSync(envFilePath)) return;

  const overrideEnv = Boolean(opts?.overrideEnv);
  const raw = fs.readFileSync(envFilePath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    const value = stripQuotes(trimmed.slice(eqIdx + 1));

    if (!key) continue;
    if (overrideEnv || typeof process.env[key] === "undefined") {
      process.env[key] = value;
    }
  }
}

async function main() {
  const requestedEnvFile =
    getArgValue("--envFile") || getArgValue("--env") || ".env.sandbox";
  const resolvedEnvFile = path.resolve(process.cwd(), requestedEnvFile);
  const overrideEnv = hasFlag("--overrideEnv");
  loadDotEnvFile(resolvedEnvFile, {
    overrideEnv,
  });

  // Helpful debug log (no secret value).
  const hasAnthropicKey =
    typeof process.env.ANTHROPIC_API_KEY === "string" &&
    process.env.ANTHROPIC_API_KEY.trim().length > 0;
  console.log("ANTHROPIC_API_KEY present:", hasAnthropicKey);
  console.log("env file used:", resolvedEnvFile);
  const key = process.env.ANTHROPIC_API_KEY || "";
  console.log("ANTHROPIC_API_KEY prefix (first 12 chars):", key.trim().slice(0, 12));
  console.log(
    "ANTHROPIC_API_KEY looksLikeSkAnt:",
    typeof process.env.ANTHROPIC_API_KEY === "string" &&
      /^sk-ant-/.test(process.env.ANTHROPIC_API_KEY)
  );
  console.log("ANTHROPIC_API_KEY length:", process.env.ANTHROPIC_API_KEY?.length);

  // If you run local emulators, Firestore typically runs on 8080.
  process.env.FIRESTORE_EMULATOR_HOST ??= "localhost:8080";

  const { queryLLM } = require(
    path.resolve(process.cwd(), "functions/src/nlp/query_llm.js")
  );

  const model = "anthropic/claude-sonnet-4-5";
  const prompt =
    getArgValue("--prompt") ||
    "Give a short helpful answer to: What is the difference between supervised and unsupervised learning?";
  const maxTokens = Number(getArgValue("--maxTokens") || "256");
  const temperature = Number(getArgValue("--temperature") || "0.3");
  const description = getArgValue("--description") || "local_run_claude";
  const stream = hasFlag("--stream");

  if (stream) {
    const chunks: AsyncIterable<LLMStreamChunk> = await queryLLM(
      prompt,
      maxTokens,
      temperature,
      model,
      description,
      true
    );

    for await (const chunk of chunks) {
      process.stdout.write(chunk.text);
      if (chunk.done) break;
    }
    process.stdout.write("\n");
    return;
  }

  const result: string = await queryLLM(
    prompt,
    maxTokens,
    temperature,
    model,
    description,
    false
  );

  console.log(result);
}

main().catch((err: any) => {
  console.error("run_query_llm_anthropic failed:", err?.message || err);
  process.exit(1);
});

