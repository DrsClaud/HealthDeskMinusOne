/**
 * @jest-environment node
 */
/**
 * Cloud smoke test for the deployed `callLLMAPI` Firebase function — OpenAI provider.
 *
 * Skipped automatically when credentials are not configured.
 * Run with: npm run test:all -- --testPathPattern=callLLMAPI.openai.cloud
 *
 * Required env (via .env.sandbox or .env.cloud-smoke):
 *   REACT_APP_FIREBASE_API_KEY
 *   REACT_APP_FIREBASE_PROJECT_ID
 *   CLOUD_SMOKE_FB_EMAIL + CLOUD_SMOKE_FB_PASSWORD
 *     — or —
 *   CLOUD_SMOKE_FIREBASE_ID_TOKEN
 */

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch").default;

function stripQuotes(value) {
  const t = value.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function loadDotEnvFile(envFilePath, opts = {}) {
  if (!fs.existsSync(envFilePath)) return;
  const overrideEnv = Boolean(opts.overrideEnv);
  for (const line of fs.readFileSync(envFilePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = stripQuotes(trimmed.slice(eq + 1));
    if (!key) continue;
    if (overrideEnv || typeof process.env[key] === "undefined") {
      process.env[key] = val;
    }
  }
}

const rootDir = path.resolve(__dirname, "../../..");
loadDotEnvFile(path.join(rootDir, ".env.sandbox"));
loadDotEnvFile(path.join(rootDir, ".env.cloud-smoke"), { overrideEnv: true });

const webApiKey = (
  process.env.REACT_APP_FIREBASE_API_KEY ||
  process.env.FIREBASE_WEB_API_KEY ||
  ""
).trim();
const projectId = (process.env.REACT_APP_FIREBASE_PROJECT_ID || "").trim();
const region = (
  process.env.CLOUD_SMOKE_FUNCTIONS_REGION || "us-central1"
).trim();

const hasCredentials =
  Boolean(webApiKey) &&
  Boolean(projectId) &&
  Boolean(
    (process.env.CLOUD_SMOKE_FIREBASE_ID_TOKEN || "").trim() ||
      ((process.env.CLOUD_SMOKE_FB_EMAIL || "").trim() &&
        (process.env.CLOUD_SMOKE_FB_PASSWORD || "").trim())
  );

async function signInWithPassword(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(webApiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.idToken) {
    throw new Error(
      json.error?.message || `signInWithPassword failed (${res.status})`
    );
  }
  return json.idToken;
}

async function resolveIdToken() {
  const fromEnv = (process.env.CLOUD_SMOKE_FIREBASE_ID_TOKEN || "").trim();
  if (fromEnv) return fromEnv;
  return signInWithPassword(
    process.env.CLOUD_SMOKE_FB_EMAIL.trim(),
    process.env.CLOUD_SMOKE_FB_PASSWORD.trim()
  );
}

async function callLLMAPI(idToken) {
  const url = `https://${region}-${projectId}.cloudfunctions.net/callLLMAPI`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      data: {
        promptId: "cloud-smoke-call-llm-api",
        userMessage: "Reply with exactly the single word pong and nothing else.",
        systemPrompt: "You follow instructions exactly. Output only what is asked.",
        config: {
          model: "gpt-4o-mini",
          provider: "openai",
          maxTokens: 64,
          temperature: 0,
        },
      },
    }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 500)}`);
  }

  if (json.error) {
    const msg =
      typeof json.error === "string"
        ? json.error
        : json.error.message || JSON.stringify(json.error);
    throw new Error(`callLLMAPI error: ${msg}`);
  }

  return json.result;
}

const describeIfConfigured = hasCredentials ? describe : describe.skip;

describeIfConfigured("callLLMAPI OpenAI (cloud smoke)", () => {
  jest.setTimeout(60000);

  it("generates tokens and returns a non-empty output string", async () => {
    const idToken = await resolveIdToken();
    const result = await callLLMAPI(idToken);

    expect(result).toBeDefined();
    expect(result.status).toBe("ok");
    expect(typeof result.output).toBe("string");
    expect(result.output.trim().length).toBeGreaterThan(0);
  });
});
