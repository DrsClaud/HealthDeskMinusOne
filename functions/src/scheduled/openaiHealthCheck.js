const { db } = require("../config/firebase");
const { openaiClient } = require("../services/openai/client");

/**
 * OpenAI API Health Check with Immediate Failure Alerting
 *
 * Features:
 * - Tests OpenAI API every hour with minimal cost
 * - Sends immediate failure alerts when API is down (no cooldown)
 * - Includes retry logic to avoid false alarms
 * - No recovery emails (test the app manually to confirm recovery)
 */

const MAX_RETRIES = 3;
const RETRY_DELAY = 10000; // 10 seconds (was 30, but that causes timeouts)
const ADMIN_EMAILS = ["eric@ericmurphy.xyz", "drsclaud@aol.com"];
const ERROR_SUBJECT = "Critical Issue with HealthDesk's OpenAI Service";

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Test OpenAI API with minimal cost
 * Uses the cheapest model with shortest possible prompt
 */
async function testOpenAIAPI() {
  const requestPayload = {
    model: "gpt-3.5-turbo", // Cheapest model
    messages: [{ role: "user", content: "Hi" }], // Minimal prompt
    max_tokens: 5, // Minimal response (1 might be too low)
    temperature: 0,
  };

  console.log("OpenAI Request:", JSON.stringify(requestPayload, null, 2));

  const response = await openaiClient.chat.completions.create(requestPayload);

  console.log(
    "OpenAI Response:",
    JSON.stringify(
      {
        id: response.id,
        model: response.model,
        usage: response.usage,
        choices: response.choices?.map((choice) => ({
          role: choice.message?.role,
          content: choice.message?.content,
          finish_reason: choice.finish_reason,
        })),
      },
      null,
      2
    )
  );

  if (!response || !response.choices || response.choices.length === 0) {
    throw new Error("Invalid response structure from OpenAI");
  }

  return response;
}

/**
 * Send failure alert email
 */
async function sendFailureAlert(errorDetails) {
  const htmlContent = `
    <h2>Critical Issue with HealthDesk's OpenAI Service</h2>
    <p>The OpenAI API is not responding after ${MAX_RETRIES} attempts.</p>
    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Error Details:</strong></p>
    <pre>${errorDetails}</pre>
    <p><strong>Likely Causes:</strong></p>
    <ul>
      <li>API key deactivated or expired</li>
      <li>API key rotated but not updated in Firebase config</li>
      <li>OpenAI service outage</li>
      <li>Rate limits exceeded</li>
      <li>Account billing issues</li>
    </ul>
    <p><strong>Action Required:</strong> Check OpenAI dashboard and update API key if needed.</p>
  `;

  try {
    await db.collection("emails").add({
      to: ADMIN_EMAILS,
      message: {
        subject: ERROR_SUBJECT,
        html: htmlContent,
      },
      sentAt: new Date(),
    });

    console.log("Failure alert sent");
  } catch (error) {
    console.error("Failed to send failure alert email:", error);
  }
}

/**
 * Main health check function
 * Tests API with retries, sends failure alerts (respects cooldown)
 */
exports.openaiHealthCheck = async (context) => {
  const startTime = Date.now();
  const checkId = `health-check-${startTime}`;

  console.log(`[${checkId}] Starting OpenAI API health check`);

  let isCurrentlyHealthy = true;
  let errorDetails = null;

  // Perform health check with retries
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[${checkId}] Health check attempt ${attempt}/${MAX_RETRIES}`
      );

      const response = await testOpenAIAPI();

      console.log(`[${checkId}] OpenAI API responding normally`);
      console.log(
        `[${checkId}] Response tokens: ${
          response.usage?.total_tokens || "unknown"
        }`
      );

      isCurrentlyHealthy = true;
      errorDetails = null;
      break; // Success! Exit retry loop
    } catch (error) {
      console.error(`[${checkId}] Attempt ${attempt} failed:`, error.message);

      errorDetails = `Attempt ${attempt}: ${error.message}\nStack: ${error.stack}`;

      if (attempt < MAX_RETRIES) {
        console.log(
          `[${checkId}] Waiting ${RETRY_DELAY / 1000}s before retry...`
        );
        await sleep(RETRY_DELAY);
      } else {
        console.error(`[${checkId}] All ${MAX_RETRIES} attempts failed`);
        isCurrentlyHealthy = false;
      }
    }
  }

  // Simple alerting: send failure alerts immediately
  console.log(
    `[${checkId}] Current API status: ${
      isCurrentlyHealthy ? "healthy" : "unhealthy"
    }`
  );

  if (!isCurrentlyHealthy) {
    console.log(`[${checkId}] API is down, sending failure alert`);
    await sendFailureAlert(errorDetails);
  } else {
    console.log(`[${checkId}] API is healthy, no alert needed`);
  }

  const executionTime = (Date.now() - startTime) / 1000;
  console.log(
    `[${checkId}] Health check completed in ${executionTime.toFixed(2)} seconds`
  );

  return null;
};
