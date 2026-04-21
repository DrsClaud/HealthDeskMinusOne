import { useState, useEffect } from "react";

const RATE_LIMIT = 10; // Number of messages allowed
const STORAGE_KEY = "unauthenticated_chat";

export const useUnauthenticatedRateLimit = () => {
  const [messageCount, setMessageCount] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);

  useEffect(() => {
    // Load stored message count and timestamp
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const { count, timestamp } = JSON.parse(stored);
      const hoursSinceReset = (Date.now() - timestamp) / (1000 * 60 * 60);

      if (hoursSinceReset >= 24) {
        // Reset if 24 hours have passed
        setMessageCount(0);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            count: 0,
            timestamp: Date.now(),
          })
        );
      } else {
        setMessageCount(count);
        setRateLimited(count >= RATE_LIMIT);
      }
    }
  }, []);

  const incrementCount = () => {
    const newCount = messageCount + 1;
    setMessageCount(newCount);
    setRateLimited(newCount >= RATE_LIMIT);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        count: newCount,
        timestamp: Date.now(),
      })
    );
  };

  return {
    messageCount,
    rateLimited,
    incrementCount,
    limit: RATE_LIMIT,
  };
};
