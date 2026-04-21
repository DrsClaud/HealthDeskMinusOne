const functions = require("firebase-functions");
const axios = require("axios");
// TODO: Re-enable usage tracking once it's properly set up
// const { trackUsage } = require("./services/openai/usageTracking");

const AI_API_BASE_URL =
  "https://core-ai-service-225336522280.us-central1.run.app";

// Proxy for starting a new chat with new AI API
exports.proxyStartChat = functions.https.onCall(async (data, context) => {
  try {
    console.log("Starting new chat via proxy...");
    console.log("Making request to:", `${AI_API_BASE_URL}/v1/chat/start`);

    const response = await axios.post(
      `${AI_API_BASE_URL}/v1/chat/start`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 second timeout
      }
    );

    console.log("New chat started successfully!");
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    // Enhanced error logging
    console.error("=== AI API ERROR DETAILS ===");
    console.error("Error message:", error.message);
    console.error("Response status:", error.response?.status);
    console.error("Response data:", error.response?.data);
    console.error("Response headers:", error.response?.headers);
    console.error("Request URL:", `${AI_API_BASE_URL}/v1/chat/start`);
    console.error("================================");

    const errorMessage = error.response?.data
      ? JSON.stringify(error.response.data)
      : error.message;

    throw new functions.https.HttpsError(
      "internal",
      `AI API Error (${error.response?.status || "unknown"}): ${errorMessage}`
    );
  }
});

// Proxy for sending messages to new AI API
exports.proxySendMessage = functions.https.onCall(async (data, context) => {
  try {
    const { id_chat, message } = data;

    if (!id_chat || !message) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing id_chat or message"
      );
    }

    console.log("Sending message via proxy...", { id_chat, message });

    const response = await axios.post(
      `${AI_API_BASE_URL}/v1/chat/send_message`,
      {
        id_chat: id_chat,
        message: message,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        responseType: "text", // Handle streaming response
      }
    );

    console.log("Message sent, response received");
    return { response: response.data };
  } catch (error) {
    console.error(
      "Error in sendMessageToAI proxy:",
      error.response?.data || error.message
    );
    throw new functions.https.HttpsError(
      "internal",
      `Failed to send message: ${error.response?.data || error.message}`
    );
  }
});

// Proxy for getting chat messages from new AI API
exports.proxyGetMessages = functions.https.onCall(async (data, context) => {
  try {
    const { id_chat } = data;

    if (!id_chat) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing id_chat"
      );
    }

    console.log("Getting chat messages via proxy...", { id_chat });

    const response = await axios.get(`${AI_API_BASE_URL}/v1/chat/messages`, {
      params: { id_chat },
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Chat messages retrieved");
    return response.data;
  } catch (error) {
    console.error(
      "Error in getChatMessages proxy:",
      error.response?.data || error.message
    );
    throw new functions.https.HttpsError(
      "internal",
      `Failed to get chat messages: ${error.response?.data || error.message}`
    );
  }
});

/**
 * Proxy for LLM calls via the AI service
 * Simple one-off LLM queries without chat context
 *
 * @param {Object} data
 * @param {string} data.query - The query/prompt to send
 * @param {string} [data.systemPrompt] - Optional system prompt
 * @param {string} [data.module] - Module name for usage tracking (e.g., 'chartmind')
 * @param {string} [data.featureName] - Feature name for usage tracking
 */
exports.proxyLlmCall = functions
  .runWith({
    timeoutSeconds: 300, // 5 minutes for long LLM calls
    memory: "512MB",
  })
  .https.onCall(async (data, context) => {
    try {
      const { query, systemPrompt, module, featureName } = data;

      if (!query) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Query is required"
        );
      }

      const userId = context.auth?.uid || "anonymous";

      // TODO: AI service doesn't support system_prompt parameter yet.
      // Workaround: prepend system prompt to query.
      // Remove this once backend supports system_prompt natively.
      const fullQuery = systemPrompt
        ? `${systemPrompt}\n\n---\n\nUSER REQUEST:\n${query}`
        : query;

      const startTime = Date.now();
      const requestPayload = { query: fullQuery };

      console.log("[proxyLlmCall] ===== REQUEST START =====");
      console.log("[proxyLlmCall] URL:", `${AI_API_BASE_URL}/v1/llm/response`);
      console.log("[proxyLlmCall] Request metadata:", {
        queryLength: query.length,
        fullQueryLength: fullQuery.length,
        hasSystemPrompt: !!systemPrompt,
        systemPromptLength: systemPrompt?.length || 0,
        module,
        featureName,
        userId,
      });
      console.log("[proxyLlmCall] FULL REQUEST PAYLOAD (for curl testing):");
      console.log(JSON.stringify(requestPayload, null, 2));
      console.log("[proxyLlmCall] curl command:");
      console.log(`curl -X POST "${AI_API_BASE_URL}/v1/llm/response" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(requestPayload).replace(/'/g, "'\\''")}'`);
      console.log(
        "[proxyLlmCall] Sending request at:",
        new Date().toISOString()
      );

      const beforeRequest = Date.now();
      const response = await axios.post(
        `${AI_API_BASE_URL}/v1/llm/response`,
        requestPayload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 240000, // 4 minute timeout (leave buffer before function timeout)
        }
      );
      const afterRequest = Date.now();

      const requestDuration = afterRequest - beforeRequest;
      const totalDuration = afterRequest - startTime;

      console.log("[proxyLlmCall] ===== RESPONSE RECEIVED =====");
      console.log("[proxyLlmCall] Received at:", new Date().toISOString());
      console.log("[proxyLlmCall] Timing breakdown:", {
        axiosRequestMs: requestDuration,
        totalFunctionMs: totalDuration,
        overheadMs: totalDuration - requestDuration,
      });
      console.log("[proxyLlmCall] Response details:", {
        responseLength: response.data?.response?.length || 0,
        responsePreview: response.data?.response?.substring(0, 500) || "empty",
        statusCode: response.status,
        headers: response.headers,
      });

      // TODO: Re-enable usage tracking once it's properly set up
      // Track usage for cost monitoring (non-blocking)
      // if (module) {
      //   const sourceMap = {
      //     chartmind: "ChartMind",
      //     symptom_checker: "Patient Symptom Checker",
      //     ddx: "Differential Diagnosis",
      //   };
      //
      //   trackUsage({
      //     userId,
      //     threadId: null,
      //     operation: featureName || "llm_call",
      //     usage: {
      //       // Estimate tokens (rough approximation)
      //       prompt_tokens: Math.ceil(
      //         (query.length + (systemPrompt?.length || 0)) / 4
      //       ),
      //       completion_tokens: Math.ceil(
      //         (response.data?.response?.length || 0) / 4
      //       ),
      //     },
      //     model: "gpt-4o-mini", // Default model used by AI service
      //     tracking: {
      //       source: sourceMap[module] || module,
      //     },
      //   }).catch((err) => {
      //     console.warn("[proxyLlmCall] Usage tracking failed:", err.message);
      //   });
      // }

      return {
        success: true,
        response: response.data.response,
      };
    } catch (error) {
      const errorTime = Date.now();
      const timeSinceStart = startTime ? errorTime - startTime : "unknown";

      console.error("[proxyLlmCall] ===== ERROR =====");
      console.error("[proxyLlmCall] Error at:", new Date().toISOString());
      console.error(
        "[proxyLlmCall] Time since request start:",
        timeSinceStart,
        "ms"
      );
      console.error("[proxyLlmCall] Error details:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
        isTimeout: error.code === "ECONNABORTED",
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "LLM call failed";

      throw new functions.https.HttpsError(
        "internal",
        `LLM Error: ${errorMessage}`
      );
    }
  });

/**
 * Proxy for running workflows via the AI service
 * More efficient than proxyLlmCall - prompt lookup happens on backend
 *
 * @param {Object} data
 * @param {string} data.workflowName - Workflow ID (e.g., 'chartmind-diagnosis')
 * @param {string} data.query - The query/input to process
 * @param {string} [data.organization] - Organization ID, defaults to 'global'
 * @param {string} [data.professionalId] - Required for non-global org workflows
 */
exports.proxyRunWorkflow = functions
  .runWith({
    timeoutSeconds: 300, // 5 minutes for long LLM calls
    memory: "512MB",
  })
  .https.onCall(async (data, context) => {
    const startTime = Date.now();

    try {
      const {
        workflowName,
        query,
        organization = "global",
        professionalId,
      } = data;

      if (!workflowName) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "workflowName is required"
        );
      }

      if (!query) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "query is required"
        );
      }

      // For non-global orgs, professionalId is required
      if (organization !== "global" && !professionalId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "professionalId is required for organization workflows"
        );
      }

      const url = `${AI_API_BASE_URL}/v1/query/${organization}/run_single`;
      const requestPayload = {
        workflow_name: workflowName,
        query: query,
        // Only include professional_id for non-global orgs
        ...(organization !== "global" && { professional_id: professionalId }),
      };

      console.log("[proxyRunWorkflow] ===== REQUEST START =====");
      console.log("[proxyRunWorkflow] URL:", url);
      console.log("[proxyRunWorkflow] Request:", {
        workflowName,
        organization,
        queryLength: query.length,
        queryPreview: query.substring(0, 200),
      });

      const beforeRequest = Date.now();
      const response = await axios.post(url, requestPayload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 240000, // 4 minute timeout
      });
      const afterRequest = Date.now();

      console.log("[proxyRunWorkflow] ===== RESPONSE RECEIVED =====");
      console.log("[proxyRunWorkflow] Timing:", {
        requestMs: afterRequest - beforeRequest,
        totalMs: afterRequest - startTime,
      });
      console.log("[proxyRunWorkflow] Response:", {
        responseLength: response.data?.response?.length || 0,
        responsePreview: response.data?.response?.substring(0, 300) || "empty",
        hasMetadata: !!response.data?.metadata,
      });

      return {
        success: true,
        response: response.data.response,
        metadata: response.data.metadata,
      };
    } catch (error) {
      const errorTime = Date.now();

      console.error("[proxyRunWorkflow] ===== ERROR =====");
      console.error(
        "[proxyRunWorkflow] Time elapsed:",
        errorTime - startTime,
        "ms"
      );
      console.error("[proxyRunWorkflow] Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Workflow execution failed";

      throw new functions.https.HttpsError(
        "internal",
        `Workflow Error: ${errorMessage}`
      );
    }
  });
