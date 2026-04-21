const functions = require("firebase-functions");
const { openaiClient } = require("./client");
const { v4: uuidv4 } = require("uuid");
const { db } = require("../../config/firebase");
const { getSummary } = require("../nlp");
const admin = require("firebase-admin");
const { canUserSendMessage, updateUsageBackground } = require("./ratelimiting");
const { trackUsage } = require("./usageTracking");

const { getAssistantConfig } = require("./assistantCache");
const {
  differenceInYears,
  startOfMonth,
  startOfDay,
  isAfter,
} = require("date-fns");

// DROP-IN REPLACEMENT for start_new_chat using Responses API
async function startNewChat(
  userid,
  assistantID = null,
  chattype = "basic_chat",
  title = null,
  kijabeData = null,
  tracking = null
) {
  // Handle assistant/config mapping
  if (chattype === "kijabe") {
    if (!kijabeData?.moduleTitle || !kijabeData?.custom_prompt) {
      throw new Error("Kijabe chats require moduleTitle and custom_prompt");
    }
    assistantID = "kijabe";
  }

  const ThreadId = `thread_${uuidv4()}`;
  const ThreadDate = new Date();
  const ThreadTitle = title;
  const ThreadAssistant = assistantID;

  // Note: Usage limits are checked in sendMessage, not here

  let final_user_id = "anonymous";
  if (userid) {
    final_user_id = userid;
  }

  // Create the thread
  await db
    .collection("chatnew")
    .doc(final_user_id)
    .collection("threads")
    .doc(ThreadId)
    .set({
      messages: [],
      datetimeCreated: ThreadDate,
      datetimeUpdated: ThreadDate,
      title: ThreadTitle,
      assistant: ThreadAssistant,
      chattype: chattype,
      id: ThreadId,
      ...(chattype === "kijabe"
        ? {
            moduleTitle: kijabeData.moduleTitle,
            custom_prompt: kijabeData.custom_prompt,
          }
        : {}),
    });

  return ThreadId;
}

// Helper function to format health data for AI context
function formatHealthDataForAI(healthRecords) {
  if (!healthRecords || typeof healthRecords !== "object") {
    return null;
  }

  const healthContext = [];

  // Calculate age from DOB using date-fns
  if (healthRecords.dateOfBirth) {
    try {
      const dob = new Date(healthRecords.dateOfBirth);
      if (!isNaN(dob.getTime())) {
        const age = differenceInYears(new Date(), dob);

        if (age >= 0 && age <= 150) {
          // Sanity check
          healthContext.push(`Age: ${age} years`);
        }
      }
    } catch (error) {
      // Invalid DOB format - skip age calculation
    }
  }

  if (healthRecords.sex && typeof healthRecords.sex === "string") {
    const normalizedSex = healthRecords.sex.toLowerCase();
    if (["male", "female", "other"].includes(normalizedSex)) {
      healthContext.push(`Sex: ${healthRecords.sex}`);
    }
  }

  // Future medical fields can be added here following the same pattern
  // Examples for future implementation:
  // if (healthRecords.weight) healthContext.push(`Weight: ${healthRecords.weight} kg`);
  // if (healthRecords.height) healthContext.push(`Height: ${healthRecords.height} cm`);
  // if (healthRecords.allergies?.length) healthContext.push(`Allergies: ${healthRecords.allergies.join(', ')}`);
  // if (healthRecords.medications?.length) healthContext.push(`Current medications: ${healthRecords.medications.join(', ')}`);
  // if (healthRecords.conditions?.length) healthContext.push(`Medical conditions: ${healthRecords.conditions.join(', ')}`);

  return healthContext.length > 0 ? healthContext.join(", ") : null;
}

// Helper function to build final instructions with proper layering
function buildInstructions(
  ThreadData,
  assistantConfig,
  extra_instructions,
  healthData
) {
  // LAYER 1: Always start with assistant prompt (required)
  let instructions = assistantConfig.prompt;

  // LAYER 2: Append additional context (custom_prompt OR extra_instructions)
  if (ThreadData.custom_prompt) {
    // Kijabe chats: Add module-specific prompt
    instructions += `\n\n--- ADDITIONAL CONTEXT ---\n${ThreadData.custom_prompt}`;
  } else if (extra_instructions !== "You are a helpful assistant") {
    // Assistant chats: Add extra_instructions if not default
    instructions += `\n\n--- ADDITIONAL INSTRUCTIONS ---\n${extra_instructions}`;
  }

  // LAYER 3: Append health data if available
  if (healthData) {
    instructions += `\n\nPATIENT HEALTH PROFILE: ${healthData}\nPlease consider this health information when providing medical guidance.`;
  }

  return instructions;
}

async function sendMessage(
  userid,
  threadid,
  message,
  extra_instructions = "You are a helpful assistant",
  model = "gpt-4o-mini",
  tracking = null
) {
  let final_user_id = "anonymous";
  if (userid) {
    final_user_id = userid;
  }

  // STEP 1 & 2: Get user data and thread data IN PARALLEL
  const [userDoc, ThreadDoc] = await Promise.all([
    // User data fetch
    (async () => {
      if (!userid) return null;
      const userRef = db.collection("users").doc(userid);
      const result = await userRef.get();
      return result;
    })(),
    // Thread data fetch
    (async () => {
      const ThreadRef = db
        .collection("chatnew")
        .doc(final_user_id)
        .collection("threads")
        .doc(threadid);
      const result = await ThreadRef.get();
      return result;
    })(),
  ]);

  // Process user data (same as original)
  let limitCheck = null;
  let userData = null;
  let subscriptionTier = "free";
  let healthData = null; // NEW: Extract health profile

  if (userDoc && userDoc.exists && userid) {
    userData = userDoc.data();

    // NEW: Extract and format health profile for AI context
    healthData = formatHealthDataForAI(userData.healthRecords);

    let userRole = userData.role || "patient";

    // Check for active trial first
    const hasActiveTrial =
      userData.trialExpiresAt && userData.trialExpiresAt.toDate() > new Date();

    // NEW: Use subscriptionStatus if available (fast, single-read approach)
    const subscriptionStatus = userData.subscriptionStatus;

    if (subscriptionStatus) {
      const isPayingViaStatus = subscriptionStatus === "active";

      if (isPayingViaStatus || hasActiveTrial) {
        subscriptionTier = userRole;
        console.log(
          "💰 PAID ACCESS via subscriptionStatus:",
          subscriptionStatus
        );
      } else {
        subscriptionTier = "free";
        console.log("🆓 FREE TIER via subscriptionStatus:", subscriptionStatus);
      }
    } else {
      // FALLBACK PATH: Use customClaims (SLOW - only for unmigrated users)
      try {
        const userAuth = await admin.auth().getUser(userid);
        const userClaims = userAuth.customClaims || {};

        if (userClaims.stripeRole || hasActiveTrial) {
          subscriptionTier = userRole;
          console.log(
            "💰 PAID ACCESS via fallback stripeRole:",
            userClaims.stripeRole
          );
        } else {
          subscriptionTier = "free";
          console.log("🆓 FREE TIER via fallback - no stripeRole");
        }
      } catch (error) {
        console.log("❌ AUTH ERROR - defaulting to free:", error.message);
        subscriptionTier = "free";
      }
    }

    console.log("📊 FINAL DECISION: subscriptionTier =", subscriptionTier);

    // Check if user is ALREADY over their limits (not predictive)
    // Frontend handles warnings/blocking based on real usage data
    let actualSubscriptionTier = userData.subscriptionTier || "medium";
    
    // If subscription tier is "trial", verify the trial is still active
    // Otherwise revert to free tier limits
    if (actualSubscriptionTier === "trial" && !hasActiveTrial) {
      actualSubscriptionTier = "free";
      console.log("⚠️ Trial tier detected but trial expired - reverting to free limits");
    }

    // For professionals in organizations, use organization's shared token pool
    let tokensUsedThisMonth = userData.tokensUsedThisMonth || 0;
    let lastTokenReset = userData.lastTokenReset?.toDate() || null;
    
    if (userData.role === "professional" && userData.organizationId) {
      console.log(`👥 Professional in org ${userData.organizationId} - using shared token pool`);
      try {
        const orgDoc = await db.collection("organizations").doc(userData.organizationId).get();
        if (orgDoc.exists) {
          const orgData = orgDoc.data();
          tokensUsedThisMonth = orgData.tokensUsedThisMonth || 0;
          lastTokenReset = orgData.lastTokenReset?.toDate() || null;
          // Token limit for org is seats.total * 500k per seat
          const orgTokenLimit = (orgData.seats?.total || 0) * 500000;
          console.log(`👥 Org has ${orgData.seats?.total || 0} seats = ${orgTokenLimit} token limit, used ${tokensUsedThisMonth}`);
        }
      } catch (error) {
        console.error("Error fetching org data for rate limit:", error);
        // Fall back to user's individual limits
      }
    }

    limitCheck = canUserSendMessage(
      subscriptionTier, // userRole (patient/professional/free)
      actualSubscriptionTier, // subscriptionTier (small/medium/large/trial)
      tokensUsedThisMonth,
      userData.messageCount || 0,
      lastTokenReset,
      userData.lastMessageReset?.toDate() || null,
      0 // estimatedTokens
    );

    // Only block if user has already exceeded their limits
    if (
      !limitCheck.canProceed &&
      !limitCheck.needsTokenReset &&
      !limitCheck.needsMessageReset
    ) {
      throw new Error(
        `Rate limit already exceeded for ${subscriptionTier} user`
      );
    }
  }

  // Process thread data
  if (!ThreadDoc.exists) {
    throw new Error("Thread not found");
  }

  const ThreadData = ThreadDoc.data();
  if (!ThreadData) {
    throw new Error("Thread data not found");
  }

  const ThreadRef = ThreadDoc.ref;

  // STEP 3: Handle Kijabe rate limits
  if (ThreadData.chattype === "kijabe" && ThreadData.moduleTitle) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const docRef = db.collection("kijabe_rate_limits").doc(userid);
    const doc = await docRef.get();

    let usageData = doc.exists
      ? doc.data()
      : {
          userId: userid,
          lastReset: today.getTime(),
          modules: {},
        };

    if (usageData.lastReset < today.getTime()) {
      usageData = {
        userId: userid,
        lastReset: today.getTime(),
        modules: {},
      };
    }

    const moduleId = ThreadData.moduleTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    const currentCount = usageData.modules[moduleId] || 0;
    if (currentCount >= 8) {
      throw new Error("Daily module limit exceeded");
    }

    usageData.modules[moduleId] = currentCount + 1;
    await docRef.set(usageData);
  }

  // STEP 4: Prepare messages
  const ThreadMessages = ThreadData.messages || [];
  const now = new Date();

  // Handle title generation for new threads
  if (
    ThreadData.title == null &&
    ThreadMessages.length == 0 &&
    ThreadData.chattype !== "kijabe"
  ) {
    getSummary(message).then((new_title) => {
      if (new_title) {
        ThreadRef.update({ title: String(new_title) });
      }
    });
  }

  // Add user message to thread
  ThreadMessages.push({
    role: "user",
    content: message,
    datetime: now,
    type: "text",
    model: null,
  });

  // STEP 5: Generate AI response
  let response = null;
  let tokensUsed = 0;

  // Get assistant config - NOW USING DATABASE WITH CACHE
  const assistantConfig = await getAssistantConfig(ThreadData.assistant);

  // VALIDATION: Every proper call should have an assistant defined
  if (!assistantConfig) {
    throw new Error(
      `No assistant configuration found for assistant: '${ThreadData.assistant}'.`
    );
  }

  // Convert messages to proper format: simple {role, content} objects
  const inputMessages = ThreadMessages.map((msg) => ({
    role: msg.role.toLowerCase(),
    content: msg.content,
  }));

  // Generate final instructions with proper layering
  const finalInstructions = buildInstructions(
    ThreadData,
    assistantConfig,
    extra_instructions,
    healthData
  );

  // Build tools array using EXACT API syntax
  const tools = [];

  // Add file search
  if (assistantConfig.vectorStoreId) {
    tools.push({
      type: "file_search",
      vector_store_ids: [assistantConfig.vectorStoreId],
    });
  }

  // All chats use assistant configuration
  const responsesResponse = await openaiClient.responses.create({
    model: assistantConfig.model || model,
    input: inputMessages,
    instructions: finalInstructions,
    tools: tools,
  });

  response = responsesResponse.output_text || null;

  if (!response) {
    const messageOutput = responsesResponse.output?.find(
      (item) => item.type === "message"
    );
    response = messageOutput?.content?.[0]?.text || "No response generated";
  }

  // Get token usage from OpenAI response
  if (responsesResponse.usage) {
    tokensUsed = responsesResponse.usage.total_tokens;

    // Track usage for cost monitoring (optional) - Fire and forget (async)
    if (tracking) {
      console.log("📊 OpenAI usage data:", responsesResponse.usage);

      // OpenAI uses different field names: input_tokens/output_tokens (not prompt_tokens/completion_tokens)
      let promptTokens =
        responsesResponse.usage.input_tokens ||
        responsesResponse.usage.prompt_tokens;
      let completionTokens =
        responsesResponse.usage.output_tokens ||
        responsesResponse.usage.completion_tokens;
      const totalTokens = responsesResponse.usage.total_tokens;

      // If breakdown is missing but we have total, estimate based on typical split
      if ((!promptTokens || !completionTokens) && totalTokens > 0) {
        // Typical assistant conversation: ~65% prompt (context), ~35% completion (response)
        completionTokens = Math.round(totalTokens * 0.35);
        promptTokens = totalTokens - completionTokens;
        console.log(
          `⚠️ Token breakdown not provided by OpenAI. Estimating: ${promptTokens} prompt + ${completionTokens} completion = ${totalTokens} total`
        );
      }

      // Don't await - let it run in background
      setImmediate(() => {
        trackUsage({
          userId: userid,
          threadId: threadid,
          operation: "sendMessage",
          usage: {
            prompt_tokens: promptTokens || 0,
            completion_tokens: completionTokens || 0,
            total_tokens: totalTokens || 0,
          },
          model: assistantConfig.model || model,
          tracking: {
            source: tracking.source,
          },
        }).catch((err) => {
          // Don't fail the main operation if tracking fails
          console.error("Usage tracking failed:", err);
        });
      });
    }
  } else {
    // If OpenAI doesn't provide usage data, log warning but continue
    tokensUsed = 0; // Don't guess - just skip usage tracking for this call
  }

  // STEP 6: Add assistant response to thread
  ThreadMessages.push({
    role: "assistant",
    content: response || "",
    datetime: new Date(),
    type: "text",
    model: model,
  });

  // STEP 7: Update database
  await ThreadRef.update({
    messages: ThreadMessages,
    datetimeUpdated: now,
  });

  // STEP 8: Update usage stats
  if (userid && tokensUsed > 0 && limitCheck && userData) {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const todayStart = startOfDay(now);

    // For org professionals, use organization's reset time (shared pool)
    // For others, use individual user's reset time
    let needsTokenReset = false;
    let lastTokenResetForCheck = null;
    
    if (userData.role === "professional" && userData.organizationId) {
      // Use the lastTokenReset we fetched from org earlier
      lastTokenResetForCheck = lastTokenReset; // This is org's lastTokenReset from rate limit check above
      if (lastTokenResetForCheck) {
        needsTokenReset = isAfter(currentMonthStart, lastTokenResetForCheck);
      } else {
        needsTokenReset = true;
      }
    } else {
      // Individual user reset
      lastTokenResetForCheck = userData.lastTokenReset?.toDate() || null;
      if (lastTokenResetForCheck) {
        needsTokenReset = isAfter(currentMonthStart, lastTokenResetForCheck);
      } else {
        needsTokenReset = true;
      }
    }

    let needsMessageReset = false;
    if (subscriptionTier === "free") {
      const lastMessageReset = userData.lastMessageReset?.toDate() || null;
      if (lastMessageReset) {
        needsMessageReset = isAfter(todayStart, startOfDay(lastMessageReset));
      } else {
        needsMessageReset = true;
      }
    }

    updateUsageBackground(
      userid,
      tokensUsed,
      subscriptionTier === "free",
      needsTokenReset,
      needsMessageReset,
      userData // Pass userData for org professional detection
    );
  }

  return ThreadMessages;
}

// Other functions - keeping same structure, no changes needed
async function getThreads(userid) {
  const ThreadsRef = db.collection("chatnew").doc(userid).collection("threads");
  const ThreadsDoc = await ThreadsRef.get();
  if (ThreadsDoc.empty) {
    return [];
  }
  const ThreadsData = ThreadsDoc.docs.map((doc) => doc.data());
  return ThreadsData;
}

async function renameChat(userid, threadid, newtitle) {
  try {
    if (!userid || typeof userid !== "string" || userid.trim() === "") {
      throw new Error("Invalid or missing userid");
    }
    if (!threadid || typeof threadid !== "string" || threadid.trim() === "") {
      throw new Error("Invalid or missing threadid");
    }
    if (!newtitle || typeof newtitle !== "string" || newtitle.trim() === "") {
      throw new Error("Invalid or missing newtitle");
    }

    const ThreadRef = db
      .collection("chatnew")
      .doc(userid)
      .collection("threads")
      .doc(threadid);
    const ThreadDoc = await ThreadRef.get();
    if (!ThreadDoc.exists) {
      throw new Error("Thread not found");
    }

    await ThreadRef.update({ title: newtitle });

    return {
      success: true,
      message: "Chat renamed successfully to " + newtitle,
    };
  } catch (error) {
    throw error;
  }
}

async function deleteChat(userid, threadid) {
  try {
    const ThreadRef = db
      .collection("chatnew")
      .doc(userid)
      .collection("threads")
      .doc(threadid);
    const ThreadDoc = await ThreadRef.get();

    if (!ThreadDoc.exists) {
      throw new Error("Thread not found");
    }

    await ThreadRef.delete();

    return { success: true, message: "Chat permanently deleted" };
  } catch (error) {
    throw error;
  }
}

async function deleteAllChats(userid) {
  try {
    const ThreadsRef = db
      .collection("chatnew")
      .doc(userid)
      .collection("threads");
    const ThreadsDoc = await ThreadsRef.get();

    if (ThreadsDoc.empty) {
      throw new Error("No threads found");
    }

    // Use batch operations for massive performance improvement
    const docs = ThreadsDoc.docs;
    const batchSize = 500; // Firestore batch limit

    // Process in batches of 500
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = docs.slice(i, i + batchSize);

      batchDocs.forEach((threadDoc) => {
        batch.delete(threadDoc.ref);
      });

      await batch.commit();
    }

    return { success: true, message: "All chats deleted" };
  } catch (error) {
    throw error;
  }
}

const DAILY_LIMIT_PER_MODULE = 8;

async function getRateLimit(userid, moduleTitle) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const docRef = db.collection("kijabe_rate_limits").doc(userid);

  try {
    const doc = await docRef.get();

    const usageData = doc.exists
      ? doc.data()
      : {
          userId: userid,
          lastReset: today.getTime(),
          modules: {},
        };

    if (usageData.lastReset < today.getTime()) {
      usageData.lastReset = today.getTime();
      usageData.modules = {};
      docRef.set(usageData).catch(() => {});
    }

    const moduleId = moduleTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    const currentCount = usageData.modules[moduleId] || 0;
    const messages_remaining = Math.max(
      0,
      DAILY_LIMIT_PER_MODULE - currentCount
    );

    return { messages_remaining };
  } catch (error) {
    return { messages_remaining: DAILY_LIMIT_PER_MODULE };
  }
}

async function updateMessage(userid, threadid, index, new_message) {
  const ThreadRef = db
    .collection("chatnew")
    .doc(userid)
    .collection("threads")
    .doc(threadid);

  const ThreadDoc = await ThreadRef.get();
  if (!ThreadDoc.exists) {
    throw new Error("Thread not found");
  }

  const ThreadData = ThreadDoc.data();
  if (!ThreadData) {
    throw new Error("Thread data not found");
  }

  const ThreadMessages = ThreadData.messages || [];

  if (index < 0 || index >= ThreadMessages.length) {
    throw new Error(
      `Invalid index: ${index}. Must be between 0 and ${
        ThreadMessages.length - 1
      }`
    );
  }

  const truncatedMessages = ThreadMessages.slice(0, index);

  await ThreadRef.update({ messages: truncatedMessages });

  return await sendMessage(userid, threadid, new_message);
}

module.exports = {
  startNewChat,
  sendMessage,
  getThreads,
  renameChat,
  deleteChat,
  deleteAllChats,
  getRateLimit,
  updateMessage,
};
