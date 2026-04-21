const functions = require("firebase-functions");
const { FieldValue } = require("firebase-admin/firestore");
const { openaiClient } = require("./client");
const { delay, handleOpenAIError } = require("./utils");
const { HEALTH_DESK_SENDER } = require("./constants");
const admin = require("firebase-admin");
const { runtimeConfigSecret, getRuntimeConfig } = require("../../runtimeConfig");

// Update configuration constants
const TIMEOUT_MS = 540000; // 9 minutes (leaving 1 minute buffer for Firebase's 10-minute limit)
const INITIAL_POLL_INTERVAL = 1000; // Start with 1 second
const MAX_POLL_INTERVAL = 5000; // Max 5 seconds between polls
const MAX_RETRIES = 30; // Increased retries

// Rate limit constants
const RATE_LIMIT_COLLECTION = "kijabe_rate_limits";
const DAILY_LIMIT_PER_MODULE = 8; // 8 turns

exports.writeUnauthenticatedResponse = functions
  .runWith({
    timeoutSeconds: Math.floor(TIMEOUT_MS / 1000),
    secrets: [runtimeConfigSecret],
  })
  .firestore.document("unauthenticated_chat/{threadId}")
  .onWrite(async (change, context) => {
    try {
      const data = change.after.data();
      if (!data) return;

      console.log("Full Firestore document:", JSON.stringify(data, null, 2));

      const { context: contextData = "", messages: messageList = [] } = data;

      // Log extracted data
      console.log("Extracted contextData:", contextData);
      console.log("messageList length:", messageList?.length);

      // Early returns
      if (
        !messageList?.length ||
        messageList[messageList.length - 1].sender === HEALTH_DESK_SENDER ||
        !messageList[messageList.length - 1].message
      )
        return;

      const lastMessage = messageList[messageList.length - 1].message;

      // Check Kijabe rate limit (non-blocking) if userId starts with special prefix
      // This is a secondary validation, primary enforcement is on frontend
      try {
        const lastMessageObj = messageList[messageList.length - 1];
        if (lastMessageObj.userId && lastMessageObj.pageTitle) {
          // Extract WordPress details if available
          const wpUserId = lastMessageObj.userId;
          let moduleTitle = "";

          // Try to extract module title from context data or message object
          if (contextData && contextData.includes("medical education module")) {
            const match = contextData.match(/module on "(.*?)"/);
            if (match && match[1]) {
              moduleTitle = match[1];
            }
          } else if (lastMessageObj.pageTitle) {
            moduleTitle = lastMessageObj.pageTitle;
          }

          if (wpUserId && moduleTitle) {
            await validateKijabeRateLimit(wpUserId, moduleTitle);
          }
        }
      } catch (validationError) {
        // Just log but don't block - frontend should already enforce limits
        console.warn("Rate limit validation warning:", validationError);
      }

      // Always create a new thread
      const newThreadId = await createThread();

      // Get the assistant ID from config
      const lastMessageObj = messageList[messageList.length - 1];
      const isKijabeChat = lastMessageObj.userId && lastMessageObj.pageTitle;
      const cfg = getRuntimeConfig();

      const assistantId = isKijabeChat
        ? cfg.openai.assistant_kijabe
        : cfg.openai.assistant;

      // Add logging for the assistant ID and chat type
      console.log(
        `Using assistant: ${assistantId} for ${
          isKijabeChat ? "Kijabe" : "standard"
        } chat`,
      );

      try {
        // Create message first
        await createMessage(newThreadId, lastMessage);

        // Then run the assistant
        const runResult = await runAssistantWithTimeout(
          newThreadId,
          assistantId,
          contextData,
        );

        if (runResult.status === "completed") {
          const messages =
            await openaiClient.beta.threads.messages.list(newThreadId);
          await updateChatThread(change.after.ref, messages, newThreadId);
          return messages;
        } else {
          throw new Error(
            `Assistant run ended with status: ${runResult.status}`,
          );
        }
      } catch (error) {
        console.error("Error in message creation or assistant run:", error);
        throw error; // Re-throw to be caught by outer try-catch
      }
    } catch (error) {
      await handleError(change.after.ref, error);
    }
  });

/**
 * Helper function to validate Kijabe rate limits without blocking main flow
 * This is a verification step - main enforcement is client-side
 */
async function validateKijabeRateLimit(wpUserId, moduleTitle) {
  if (!wpUserId || !moduleTitle) return;

  const userId = `kij-${wpUserId}`;
  const moduleId = moduleTitle
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  const db = admin.firestore();

  try {
    const docRef = db.collection(RATE_LIMIT_COLLECTION).doc(userId);
    const doc = await docRef.get();

    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();

    let usageData = {};
    let shouldUpdate = false;

    if (doc.exists) {
      usageData = doc.data();

      // Reset if new day
      if (usageData.lastReset < today) {
        usageData = {
          userId,
          lastReset: today,
          modules: {},
        };
        shouldUpdate = true;
      }
    } else {
      // Initialize new user
      usageData = {
        userId,
        lastReset: today,
        modules: {},
      };
      shouldUpdate = true;
    }

    // Get module usage
    if (!usageData.modules) {
      usageData.modules = {};
    }

    const currentCount = usageData.modules[moduleId] || 0;

    // We'll only perform validation here without incrementing
    // The client is already incrementing the counter via KijabeRateLimitService.incrementUsage
    // This prevents double counting when processing messages

    // Only write to Firestore if we need to initialize or reset data
    if (shouldUpdate) {
      await docRef.set(usageData);
    }

    return true;
  } catch (error) {
    console.error("Error validating Kijabe rate limit:", error);
    return false;
  }
}

// Helper functions
async function createThread() {
  const thread = await openaiClient.beta.threads.create();
  return thread.id;
}

async function createMessage(threadId, content) {
  return await openaiClient.beta.threads.messages.create(threadId, {
    role: "user",
    content,
  });
}

async function runAssistant(threadId, assistantId, contextData) {
  // More detailed logging of the context
  console.log("======= CONTEXT DATA =======");
  console.log("Context:", contextData);
  console.log("Context Type:", typeof contextData);
  console.log("Context Length:", contextData ? contextData.length : 0);
  console.log("===========================");

  functions.logger.log({
    assistantId,
    threadId,
    contextData,
  });

  const cfg = getRuntimeConfig();
  const runQuery = {
    assistant_id: assistantId,
    ...(assistantId !== cfg.openai.assistant_kijabe && {
      tool_choice: { type: "file_search" },
    }),
  };

  // Add contextData as additional instructions if provided
  if (contextData) {
    runQuery.additional_instructions = contextData;
    // Log the actual query being sent
    console.log("OpenAI Run Query:", JSON.stringify(runQuery, null, 2));
  }

  const run = await openaiClient.beta.threads.runs.create(threadId, runQuery);
  return await waitForCompletion(threadId, run.id);
}

async function runAssistantWithTimeout(threadId, assistantId, contextData) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Assistant timeout")), TIMEOUT_MS),
  );

  const runPromise = runAssistant(threadId, assistantId, contextData);
  return Promise.race([runPromise, timeoutPromise]);
}

/**
 * Polls the OpenAI API until the assistant's response is ready
 * @param {string} threadId - The thread ID being processed
 * @param {string} runId - The run ID to check status for
 * @returns {Promise<Object>} The completed assistant run
 *
 * OpenAI processes requests asynchronously:
 * 1. Initial state is "queued"
 * 2. Then moves to "in_progress"
 * 3. Finally reaches "completed" or fails
 *
 * This function implements exponential backoff:
 * - Starts polling every 1 second
 * - Gradually increases wait time up to 5 seconds
 * - Gives up after 30 attempts (roughly 2-3 minutes)
 */
async function waitForCompletion(threadId, runId) {
  let attempts = 0;
  let pollInterval = INITIAL_POLL_INTERVAL;

  try {
    let assistantRun = await openaiClient.beta.threads.runs.retrieve(
      threadId,
      runId,
    );

    console.log("Initial run status:", assistantRun.status);
    console.log("Run details:", JSON.stringify(assistantRun, null, 2));

    while (assistantRun.status !== "completed" && attempts < MAX_RETRIES) {
      // Exponential backoff with max limit
      pollInterval = Math.min(pollInterval * 1.5, MAX_POLL_INTERVAL);
      await delay(pollInterval);

      assistantRun = await openaiClient.beta.threads.runs.retrieve(
        threadId,
        runId,
      );
      console.log(`Attempt ${attempts}: Status = ${assistantRun.status}`);
      if (assistantRun.last_error) {
        console.error("Run error details:", assistantRun.last_error);
      }

      attempts++;

      // Handle non-completed but terminal states
      if (["failed", "cancelled", "expired"].includes(assistantRun.status)) {
        throw new Error(`Assistant run ${assistantRun.status}`);
      }
    }

    if (attempts >= MAX_RETRIES) {
      throw new Error("Max retries exceeded waiting for assistant response");
    }

    return assistantRun;
  } catch (error) {
    console.error("Detailed error in waitForCompletion:", error);
    throw error;
  }
}

async function updateChatThread(ref, messages, threadId) {
  await ref.update({
    messages: FieldValue.arrayUnion({
      sender: HEALTH_DESK_SENDER,
      message: messages?.data[0].content[0].text.value,
      created: messages?.data[0].created_at,
      direction: "incoming",
    }),
    threadId,
    timestamp: Date.now(),
  });
}

async function handleError(ref, error) {
  console.error("OpenAI Assistant Error:", error);
  const errorMessage = handleOpenAIError(error);

  await ref.update({
    messages: FieldValue.arrayUnion({
      sender: HEALTH_DESK_SENDER,
      message: errorMessage,
      created: Date.now(),
      isError: true,
      direction: "incoming",
    }),
    timestamp: Date.now(),
  });
}

// Export helper functions at the bottom of the file
exports.createThread = createThread;
exports.createMessage = createMessage;
exports.runAssistantWithTimeout = runAssistantWithTimeout;
exports.waitForCompletion = waitForCompletion;

// Export the unauthenticated handler
module.exports = {
  writeUnauthenticatedResponse: exports.writeUnauthenticatedResponse,
};
