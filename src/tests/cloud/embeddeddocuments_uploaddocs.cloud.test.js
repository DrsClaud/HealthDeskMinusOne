/**
 * @jest-environment node
 */
/**
 * Cloud smoke test for the deployed `embeddeddocuments_uploaddocs` Firebase function.
 *
 * Uploads a small plain-text document and verifies it is processed and stored.
 * Skipped automatically when credentials are not configured.
 * Run with: npm run test:all -- --testPathPattern=embeddeddocuments_uploaddocs.cloud
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

async function callFunction(functionName, idToken, data) {
  const url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ data }),
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
    throw new Error(`${functionName} error: ${msg}`);
  }

  return json.result;
}

const describeIfConfigured = hasCredentials ? describe : describe.skip;

describeIfConfigured("embeddeddocuments_uploaddocs (cloud smoke)", () => {
  jest.setTimeout(120000);

  it("uploads a plain-text document and returns processed file metadata", async () => {
    const idToken = await resolveIdToken();

    const textContent = [
      "Cloud Smoke Test Document",
      "This is a small plain-text document uploaded by the automated cloud smoke test.",
      "It verifies that embeddeddocuments_uploaddocs can ingest a document,",
      "extract text, generate embeddings, and store the result in Firestore.",
    ].join("\n");

    const fileBase64 = Buffer.from(textContent, "utf8").toString("base64");

    const result = await callFunction("embeddeddocuments_uploaddocs", idToken, {
      fileBase64,
      fileName: "cloud-smoke-test.txt",
      fileType: "text/plain",
      promptId: "cloud-smoke-test",
      metadata: { source: "cloud-smoke-test" },
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.uploadKind).toBe("text");
    expect(result.processed).toBe(1);
    expect(Array.isArray(result.files)).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);

    const file = result.files[0];
    expect(typeof file.id).toBe("string");
    expect(file.id.length).toBeGreaterThan(0);
    expect(file.fileName).toBe("cloud-smoke-test.txt");
    expect(file.promptId).toBe("cloud-smoke-test");
    expect(typeof file.chunkCount).toBe("number");
    expect(file.chunkCount).toBeGreaterThan(0);
  });
});
