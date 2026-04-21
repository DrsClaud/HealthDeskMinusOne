const { db } = require("../../config/firebase");
const admin = require("firebase-admin");

/**
 * Track OpenAI usage for cost monitoring
 * @param {Object} params - Tracking parameters
 * @param {string} params.userId - User ID
 * @param {string} params.threadId - Thread ID
 * @param {string} params.operation - 'startNewChat' or 'sendMessage'
 * @param {Object} params.usage - OpenAI usage object
 * @param {number} params.usage.prompt_tokens
 * @param {number} params.usage.completion_tokens
 * @param {number} params.usage.total_tokens
 * @param {string} params.model - Model used (e.g., 'gpt-4o-mini')
 * @param {Object} [params.tracking] - Optional tracking metadata
 * @param {string} [params.tracking.source] - Source identifier (e.g., 'Kijabe Education Module')
 */
async function trackUsage({
  userId,
  threadId,
  operation,
  usage,
  model,
  tracking,
}) {
  // Only track if tracking metadata is provided
  if (!tracking || !tracking.source) {
    return;
  }

  const timestamp = admin.firestore.Timestamp.now();
  const date = new Date();
  const yearMonth = `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;

  try {
    // Use a transaction to update monthly aggregates atomically
    await db.runTransaction(async (transaction) => {
      // Reference to global monthly aggregate document (single doc per month)
      const aggregateRef = db.collection("usage_monthly").doc(yearMonth);

      const aggregateDoc = await transaction.get(aggregateRef);

      // Prepare source key (sanitize for Firestore field names)
      const sourceKey = tracking.source
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      // Prepare model key
      const modelKey = model
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      if (!aggregateDoc.exists) {
        // Create new aggregate document for this month
        const newData = {
          yearMonth,
          total_tokens: usage.total_tokens,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          calls_count: 1,
          sources: {
            [sourceKey]: {
              source: tracking.source,
              total_tokens: usage.total_tokens,
              prompt_tokens: usage.prompt_tokens,
              completion_tokens: usage.completion_tokens,
              calls_count: 1,
              models: {
                [modelKey]: {
                  model,
                  total_tokens: usage.total_tokens,
                  prompt_tokens: usage.prompt_tokens,
                  completion_tokens: usage.completion_tokens,
                  calls_count: 1,
                },
              },
            },
          },
          users: {
            [userId]: {
              total_tokens: usage.total_tokens,
              prompt_tokens: usage.prompt_tokens,
              completion_tokens: usage.completion_tokens,
              calls_count: 1,
            },
          },
          lastUpdated: timestamp,
        };
        transaction.set(aggregateRef, newData);
      } else {
        // Update existing aggregate - need to check if source/model/user exist
        const currentData = aggregateDoc.data();
        const sources = currentData.sources || {};
        const sourceExists = sources[sourceKey];
        const modelExists = sourceExists?.models?.[modelKey];
        const users = currentData.users || {};
        const userExists = users[userId];

        // Build update object
        const updates = {
          total_tokens: admin.firestore.FieldValue.increment(
            usage.total_tokens
          ),
          prompt_tokens: admin.firestore.FieldValue.increment(
            usage.prompt_tokens
          ),
          completion_tokens: admin.firestore.FieldValue.increment(
            usage.completion_tokens
          ),
          calls_count: admin.firestore.FieldValue.increment(1),
          lastUpdated: timestamp,
        };

        if (!sourceExists) {
          // Create new source with nested structure
          updates[`sources.${sourceKey}`] = {
            source: tracking.source,
            total_tokens: usage.total_tokens,
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            calls_count: 1,
            models: {
              [modelKey]: {
                model,
                total_tokens: usage.total_tokens,
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                calls_count: 1,
              },
            },
          };
        } else if (!modelExists) {
          // Source exists but model doesn't - add model and update source totals
          updates[`sources.${sourceKey}.total_tokens`] =
            admin.firestore.FieldValue.increment(usage.total_tokens);
          updates[`sources.${sourceKey}.prompt_tokens`] =
            admin.firestore.FieldValue.increment(usage.prompt_tokens);
          updates[`sources.${sourceKey}.completion_tokens`] =
            admin.firestore.FieldValue.increment(usage.completion_tokens);
          updates[`sources.${sourceKey}.calls_count`] =
            admin.firestore.FieldValue.increment(1);
          updates[`sources.${sourceKey}.models.${modelKey}`] = {
            model,
            total_tokens: usage.total_tokens,
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            calls_count: 1,
          };
        } else {
          // Both exist - just increment
          updates[`sources.${sourceKey}.total_tokens`] =
            admin.firestore.FieldValue.increment(usage.total_tokens);
          updates[`sources.${sourceKey}.prompt_tokens`] =
            admin.firestore.FieldValue.increment(usage.prompt_tokens);
          updates[`sources.${sourceKey}.completion_tokens`] =
            admin.firestore.FieldValue.increment(usage.completion_tokens);
          updates[`sources.${sourceKey}.calls_count`] =
            admin.firestore.FieldValue.increment(1);
          updates[`sources.${sourceKey}.models.${modelKey}.total_tokens`] =
            admin.firestore.FieldValue.increment(usage.total_tokens);
          updates[`sources.${sourceKey}.models.${modelKey}.prompt_tokens`] =
            admin.firestore.FieldValue.increment(usage.prompt_tokens);
          updates[`sources.${sourceKey}.models.${modelKey}.completion_tokens`] =
            admin.firestore.FieldValue.increment(usage.completion_tokens);
          updates[`sources.${sourceKey}.models.${modelKey}.calls_count`] =
            admin.firestore.FieldValue.increment(1);
        }

        // Update user tracking
        if (!userExists) {
          // Create new user entry
          updates[`users.${userId}`] = {
            total_tokens: usage.total_tokens,
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            calls_count: 1,
          };
        } else {
          // User exists - increment their totals
          updates[`users.${userId}.total_tokens`] =
            admin.firestore.FieldValue.increment(usage.total_tokens);
          updates[`users.${userId}.prompt_tokens`] =
            admin.firestore.FieldValue.increment(usage.prompt_tokens);
          updates[`users.${userId}.completion_tokens`] =
            admin.firestore.FieldValue.increment(usage.completion_tokens);
          updates[`users.${userId}.calls_count`] =
            admin.firestore.FieldValue.increment(1);
        }

        transaction.update(aggregateRef, updates);
      }

      // Store individual record for audit trail in flat collection
      const recordRef = db.collection("usage_records").doc();

      transaction.set(recordRef, {
        timestamp,
        userId,
        threadId,
        operation,
        model,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        source: tracking.source,
      });
    });

    console.log(
      `✅ Usage tracked: ${tracking.source} - ${usage.total_tokens} tokens`
    );
  } catch (error) {
    // Log error but don't fail the main operation
    console.error("❌ Failed to track usage:", error);
  }
}

module.exports = {
  trackUsage,
};
