const functions = require("firebase-functions");
const { db } = require("../../config/firebase");
const admin = require("firebase-admin");
const { startOfMonth, startOfDay, isAfter } = require("date-fns");

// Token limits per role and tier (monthly)
const TOKEN_LIMITS = {
  free: 50000,
  // Patient tiers (doubled from base: 50k→100k, 200k→400k, 500k→1M)
  patient: {
    trial: 150000, // 3-day patient trial limit
    small: 100000, // 100K tokens
    medium: 400000, // 400K tokens
    large: 1000000, // 1M tokens
  },
  // Professional tiers (5x patient amounts)
  professional: {
    trial: 500000, // 3-day professional trial limit (~3x patient trial)
    small: 500000, // 500K tokens
    medium: 1000000, // 1M tokens
    large: 2500000, // 2.5M tokens
  },
  // Facility tiers (CareMap organizations) - no AI access
  facility: {
    trial: 0,
    caremap: 0,
    facility: 0,
    plus: 0,
    default: 0,
  },
};

// Message limits per role (daily) - ONLY for free users
const MESSAGE_LIMITS = {
  free: 4,
  // Paid users have no daily message limits
};

// Kijabe module limit
const DAILY_LIMIT_PER_MODULE = 8;

/**
 * Get token limit for user based on role and subscription tier
 */
function getTokenLimit(userRole, subscriptionTier) {
  if (userRole === "free") {
    return TOKEN_LIMITS.free;
  }

  if (userRole === "patient") {
    return (
      TOKEN_LIMITS.patient[subscriptionTier] || TOKEN_LIMITS.patient.medium
    );
  }

  if (userRole === "professional") {
    return (
      TOKEN_LIMITS.professional[subscriptionTier] ||
      TOKEN_LIMITS.professional.medium
    );
  }

  if (userRole === "facility") {
    const facilityLimits = TOKEN_LIMITS.facility;
    return (
      facilityLimits[subscriptionTier] ||
      facilityLimits.default ||
      TOKEN_LIMITS.free
    );
  }

  // Fallback
  return TOKEN_LIMITS.free;
}

/**
 * FAST: Check if user can send a message
 * @param {string} userRole - User's role (free, patient, professional)
 * @param {string} subscriptionTier - User's subscription tier (small, medium, large)
 * @param {number} tokensUsedThisMonth - Current token usage
 * @param {number} messageCount - Current daily message count (free users only)
 * @param {Date|null} lastTokenReset - Last token reset timestamp
 * @param {Date|null} lastMessageReset - Last message reset timestamp
 * @param {number} estimatedTokens - Estimated tokens needed
 * @returns {Object} Whether the request can proceed
 */
function canUserSendMessage(
  userRole,
  subscriptionTier,
  tokensUsedThisMonth,
  messageCount,
  lastTokenReset,
  lastMessageReset,
  estimatedTokens = 1000
) {
  const startTime = Date.now();

  try {
    const now = new Date();

    // Check token limits (all users)
    const tokenLimit = getTokenLimit(userRole, subscriptionTier);
    const hasEnoughTokens = tokensUsedThisMonth + estimatedTokens <= tokenLimit;

    // Check monthly reset for tokens
    let needsTokenReset = false;
    if (lastTokenReset) {
      const currentMonthStart = startOfMonth(now);
      needsTokenReset = isAfter(currentMonthStart, lastTokenReset);
    } else {
      needsTokenReset = true; // First time user
    }

    // Check message limits (free users only)
    let hasEnoughMessages = true;
    let needsMessageReset = false;

    if (userRole === "free") {
      hasEnoughMessages = messageCount < MESSAGE_LIMITS.free;

      if (lastMessageReset) {
        const todayStart = startOfDay(now);
        needsMessageReset = isAfter(todayStart, startOfDay(lastMessageReset));
      } else {
        needsMessageReset = true;
      }
    }

    // If resets are needed, user can proceed (limits reset)
    const canProceed =
      (hasEnoughTokens || needsTokenReset) &&
      (hasEnoughMessages || needsMessageReset);

    const result = {
      canProceed,
      needsTokenReset,
      needsMessageReset,
      userRole,
      subscriptionTier,
      tokensUsed: tokensUsedThisMonth,
      tokenLimit,
      messageCount: userRole === "free" ? messageCount : null,
      executionTime: Date.now() - startTime,
    };

    console.log(`Rate limit check took ${result.executionTime}ms`);
    return result;
  } catch (error) {
    console.error("Error in canUserSendMessage:", error);
    return {
      canProceed: false,
      error: error.message,
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * FAST: Update usage after successful API call (fire-and-forget)
 * @param {string} userid - User ID
 * @param {number} tokensUsed - Actual tokens consumed
 * @param {boolean} incrementMessage - Whether to increment message count
 * @param {boolean} needsTokenReset - Whether token count needs reset
 * @param {boolean} needsMessageReset - Whether message count needs reset
 * @param {Object} userData - User data object (optional, for org professionals)
 */
function updateUsageBackground(
  userid,
  tokensUsed,
  incrementMessage = false,
  needsTokenReset = false,
  needsMessageReset = false,
  userData = null
) {
  const startTime = Date.now();

  // Check if user is a professional in an organization (shared token pool)
  const isOrgProfessional =
    userData?.role === "professional" && userData?.organizationId;

  if (isOrgProfessional) {
    // Update organization token pool (professionals share tokens)
    const orgRef = db.collection("organizations").doc(userData.organizationId);
    const orgUpdates = {};

    if (needsTokenReset) {
      orgUpdates.tokensUsedThisMonth = tokensUsed;
      orgUpdates.lastTokenReset = admin.firestore.Timestamp.now();
    } else {
      orgUpdates.tokensUsedThisMonth =
        admin.firestore.FieldValue.increment(tokensUsed);
    }

    orgRef
      .update(orgUpdates)
      .then(() => {
        const executionTime = Date.now() - startTime;
        console.log(
          `Background org usage update took ${executionTime}ms (${tokensUsed} tokens for org ${userData.organizationId})`
        );
      })
      .catch((error) => {
        console.error("Background org usage update failed:", error);
      });
  } else {
    // Update individual user token pool (patients, non-org professionals, etc.)
    const userRef = db.collection("users").doc(userid);
    const updates = {};

    // Handle token reset or increment
    if (needsTokenReset) {
      updates.tokensUsedThisMonth = tokensUsed;
      updates.lastTokenReset = admin.firestore.Timestamp.now();
    } else {
      updates.tokensUsedThisMonth =
        admin.firestore.FieldValue.increment(tokensUsed);
    }

    // Handle message reset or increment (free users only)
    if (incrementMessage) {
      if (needsMessageReset) {
        updates.messageCount = 1;
        updates.lastMessageReset = admin.firestore.Timestamp.now();
      } else {
        updates.messageCount = admin.firestore.FieldValue.increment(1);
      }
    }

    // Fire and forget - don't await this
    userRef
      .update(updates)
      .then(() => {
        const executionTime = Date.now() - startTime;
        console.log(`Background usage update took ${executionTime}ms`);
      })
      .catch((error) => {
        console.error("Background usage update failed:", error);
      });
  }
}

// Kijabe rate limit check
async function getKijabeRateLimit(userid, moduleTitle) {
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

    // Reset if new day
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
    console.error("Rate limit check failed:", error);
    return { messages_remaining: DAILY_LIMIT_PER_MODULE };
  }
}

module.exports = {
  canUserSendMessage,
  updateUsageBackground,
  getKijabeRateLimit,
  getTokenLimit,
  TOKEN_LIMITS,
  MESSAGE_LIMITS,
};
