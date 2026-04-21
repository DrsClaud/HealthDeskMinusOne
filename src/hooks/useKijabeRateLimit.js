import { useState, useEffect } from "react";
import KijabeRateLimitService from "services/kijabeRateLimit";

// Constants - make this clear and consistent
// Each turn consists of a user message + AI response (2 messages total)
const TURNS_PER_MODULE = 8; // 8 turns per module per day
const MESSAGES_PER_MODULE = TURNS_PER_MODULE * 2; // 16 messages (8 turns * 2)

// Local storage for pending writes
const STORAGE_KEY = "kijabe_chat_pending";

export const useKijabeRateLimit = (user = null) => {
  const [messageCount, setMessageCount] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [remaining, setRemaining] = useState(MESSAGES_PER_MODULE);
  const [loading, setLoading] = useState(true);

  // Extract user data
  const wpUserId = user?.wpUserId || user?.userId;
  const moduleTitle = user?.wpPageTitle || user?.pageTitle;

  // Legacy localStorage rate limit (fallback)
  const applyLegacyRateLimit = () => {
    const LEGACY_KEY = "kijabe_chat";

    // Load stored message count and timestamp
    const stored = localStorage.getItem(LEGACY_KEY);
    if (stored) {
      const { count, timestamp } = JSON.parse(stored);
      const hoursSinceReset = (Date.now() - timestamp) / (1000 * 60 * 60);

      if (hoursSinceReset >= 24) {
        // Reset if 24 hours have passed
        setMessageCount(0);
        setRemaining(MESSAGES_PER_MODULE);
        setRateLimited(false);
        localStorage.setItem(
          LEGACY_KEY,
          JSON.stringify({
            count: 0,
            timestamp: Date.now(),
          })
        );
      } else {
        setMessageCount(count);
        setRemaining(Math.max(0, MESSAGES_PER_MODULE - count));
        setRateLimited(count >= MESSAGES_PER_MODULE);
      }
    }

    setLoading(false);
  };

  // Helper to update local pending data
  const updateLocalPending = (key, count) => {
    try {
      const pendingStr = localStorage.getItem(STORAGE_KEY);
      const pendingData = pendingStr ? JSON.parse(pendingStr) : {};

      pendingData[key] = {
        count,
        timestamp: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingData));
    } catch (e) {
      console.error("Error updating pending data:", e);
    }
  };

  // Initialize and check limits
  useEffect(() => {
    const checkRateLimit = async () => {
      if (!wpUserId || !moduleTitle) {
        // Fallback to localStorage if no user ID or module title
        applyLegacyRateLimit();
        return;
      }

      // First check local storage for immediate response
      // This gives us the most recent state without waiting for Firestore
      const pendingKey = `${wpUserId}:${moduleTitle}`;
      const pendingStr = localStorage.getItem(STORAGE_KEY);
      const pendingData = pendingStr ? JSON.parse(pendingStr) : {};
      const now = new Date();
      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime();

      // We have fresh pending data - use it immediately
      if (
        pendingData[pendingKey] &&
        pendingData[pendingKey].timestamp >= today
      ) {
        const count = pendingData[pendingKey].count || 0;
        setMessageCount(count);
        setRemaining(Math.max(0, MESSAGES_PER_MODULE - count));
        setRateLimited(count >= MESSAGES_PER_MODULE);
        setLoading(false);

        // Still check Firestore in the background but don't block UI
        KijabeRateLimitService.checkLimit(wpUserId, moduleTitle)
          .then(({ limited, remaining }) => {
            // Only update if Firestore has a different (likely more accurate) count
            if (remaining !== MESSAGES_PER_MODULE - count) {
              setRemaining(remaining);
              setMessageCount(MESSAGES_PER_MODULE - remaining);
              setRateLimited(limited);

              // Update pending data with the accurate count
              updateLocalPending(pendingKey, MESSAGES_PER_MODULE - remaining);
            }
          })
          .catch((error) => {
            console.warn("Background Firestore check failed:", error);
          });

        return;
      }

      // No pending data, check Firestore directly
      try {
        const { limited, remaining: remainingCount } =
          await KijabeRateLimitService.checkLimit(wpUserId, moduleTitle);

        setRateLimited(limited);
        setRemaining(remainingCount);
        setMessageCount(MESSAGES_PER_MODULE - remainingCount);
        setLoading(false);

        // Update pending data with the fetched count
        updateLocalPending(pendingKey, MESSAGES_PER_MODULE - remainingCount);
      } catch (error) {
        console.error(
          "Error checking rate limit, falling back to local storage:",
          error
        );
        applyLegacyRateLimit();
      }
    };

    checkRateLimit();
  }, [wpUserId, moduleTitle]);

  // Increment message count
  const incrementCount = async () => {
    if (!wpUserId || !moduleTitle) {
      // Fallback to localStorage if user data is missing
      const newCount = messageCount + 1;
      setMessageCount(newCount);
      setRemaining(Math.max(0, MESSAGES_PER_MODULE - newCount));
      setRateLimited(newCount >= MESSAGES_PER_MODULE);

      localStorage.setItem(
        "kijabe_chat",
        JSON.stringify({
          count: newCount,
          timestamp: Date.now(),
        })
      );
      return;
    }

    // Always optimistically update the UI instantly
    const newCount = messageCount + 1;
    setMessageCount(newCount);
    setRemaining(Math.max(0, MESSAGES_PER_MODULE - newCount));
    setRateLimited(newCount >= MESSAGES_PER_MODULE);

    // Update local pending data
    const pendingKey = `${wpUserId}:${moduleTitle}`;
    updateLocalPending(pendingKey, newCount);

    // Then update Firestore in the background (don't block UI)
    try {
      // Fire and forget - don't await
      KijabeRateLimitService.incrementUsage(wpUserId, moduleTitle)
        .then(({ success, remaining: newRemaining }) => {
          if (success && newRemaining !== MESSAGES_PER_MODULE - newCount) {
            // Only update UI if the server value differs
            setRemaining(newRemaining);
            setMessageCount(MESSAGES_PER_MODULE - newRemaining);
            setRateLimited(newRemaining <= 0);

            // Update local pending data with the accurate count
            updateLocalPending(pendingKey, MESSAGES_PER_MODULE - newRemaining);
          }
        })
        .catch((err) =>
          console.error("Background rate limit update failed:", err)
        );
    } catch (error) {
      console.error("Error initiating rate limit increment:", error);
      // Already updated UI optimistically, so nothing needed here
    }
  };

  return {
    messageCount,
    rateLimited,
    incrementCount,
    remaining,
    limit: MESSAGES_PER_MODULE,
    turnsUsed: Math.ceil(messageCount / 2),
    turnsRemaining: Math.floor(remaining / 2),
    turnsLimit: TURNS_PER_MODULE,
    loading,
  };
};
