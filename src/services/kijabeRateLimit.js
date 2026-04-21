import { db } from "./firebase";
import firebase from "firebase/compat/app";

// Constants
const TURNS_PER_MODULE = 8; // 8 turns per module per day
const MESSAGES_PER_MODULE = TURNS_PER_MODULE * 2; // 16 messages (8 turns * 2)
const COLLECTION_NAME = "kijabe_rate_limits";

// Cache to reduce Firestore reads
const _cache = {
  users: {},
  getCacheKey: (userId, moduleId) => `${userId}:${moduleId}`,
  getUser: (userId) => _cache.users[userId] || null,
  setUser: (userId, data) => {
    _cache.users[userId] = data;
    return data;
  },
  clearUserCache: (userId) => {
    delete _cache.users[userId];
  },
};

/**
 * Service to handle rate limiting for Kijabe WordPress users
 * - Tracks usage per user, per module
 * - Resets limits daily
 * - Enforces 8 turns (16 messages) per module per day
 */
export const KijabeRateLimitService = {
  /**
   * Check if a user has exceeded their rate limit for a specific module
   * @param {string} wpUserId - WordPress user ID
   * @param {string} moduleTitle - Title of the module being accessed
   * @returns {Promise<{limited: boolean, remaining: number, usageData: object}>}
   */
  async checkLimit(wpUserId, moduleTitle) {
    if (!wpUserId || !moduleTitle) {
      console.error("Missing required parameters for rate limit check");
      return {
        limited: false,
        remaining: MESSAGES_PER_MODULE,
        usageData: {},
      };
    }

    // Format the user ID with 'kij-' prefix
    const userId = `kij-${wpUserId}`;
    const moduleId = this.normalizeModuleId(moduleTitle);

    try {
      // Check cache first
      const cachedUser = _cache.getUser(userId);
      const now = new Date();
      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime();

      // If user data is cached and current, use it
      if (cachedUser && cachedUser.lastReset >= today) {
        const moduleUsage = cachedUser.modules[moduleId] || 0;
        const remaining = Math.max(0, MESSAGES_PER_MODULE - moduleUsage);

        return {
          limited: moduleUsage >= MESSAGES_PER_MODULE,
          remaining,
          turnsRemaining: Math.floor(remaining / 2),
          usageData: cachedUser,
        };
      }

      // Otherwise get from Firestore
      const docRef = db.collection(COLLECTION_NAME).doc(userId);
      const doc = await docRef.get();

      let usageData = {};

      if (doc.exists) {
        usageData = doc.data();

        // Check if we need to reset daily limits
        if (usageData.lastReset < today) {
          // Reset all module counts for a new day
          usageData = {
            userId,
            lastReset: today,
            modules: {},
          };
        }
      } else {
        // Initialize new user
        usageData = {
          userId,
          lastReset: today,
          modules: {},
        };
      }

      // Update cache
      _cache.setUser(userId, usageData);

      // Get usage for specific module
      const moduleUsage = usageData.modules[moduleId] || 0;
      const remaining = Math.max(0, MESSAGES_PER_MODULE - moduleUsage);

      return {
        limited: moduleUsage >= MESSAGES_PER_MODULE,
        remaining,
        turnsRemaining: Math.floor(remaining / 2),
        usageData,
      };
    } catch (error) {
      console.error("Error checking rate limit:", error);
      // Default to not limited on error to prevent blocking users
      return {
        limited: false,
        remaining: MESSAGES_PER_MODULE,
        turnsRemaining: TURNS_PER_MODULE,
        usageData: {},
      };
    }
  },

  /**
   * Increment the usage count for a specific module
   * @param {string} wpUserId - WordPress user ID
   * @param {string} moduleTitle - Title of the module being accessed
   * @returns {Promise<{success: boolean, remaining: number}>}
   */
  async incrementUsage(wpUserId, moduleTitle) {
    if (!wpUserId || !moduleTitle) {
      console.error("Missing required parameters for rate limit increment");
      return { success: false, remaining: 0, turnsRemaining: 0 };
    }

    const userId = `kij-${wpUserId}`;
    const moduleId = this.normalizeModuleId(moduleTitle);

    try {
      const { limited, usageData } = await this.checkLimit(
        wpUserId,
        moduleTitle
      );

      if (limited) {
        return { success: false, remaining: 0, turnsRemaining: 0 };
      }

      // Update module count
      if (!usageData.modules) {
        usageData.modules = {};
      }

      const currentCount = usageData.modules[moduleId] || 0;
      usageData.modules[moduleId] = currentCount + 1;

      // Update cache immediately
      _cache.setUser(userId, usageData);

      // Update Firestore
      await db.collection(COLLECTION_NAME).doc(userId).set(usageData);

      const remaining = MESSAGES_PER_MODULE - (currentCount + 1);
      return {
        success: true,
        remaining,
        turnsRemaining: Math.floor(remaining / 2),
      };
    } catch (error) {
      console.error("Error incrementing rate limit usage:", error);
      return { success: false, remaining: 0, turnsRemaining: 0 };
    }
  },

  /**
   * Convert module title to normalized ID for storage
   * @param {string} moduleTitle - Raw module title
   * @returns {string} Normalized module ID
   */
  normalizeModuleId(moduleTitle) {
    return moduleTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  },
};

export default KijabeRateLimitService;
