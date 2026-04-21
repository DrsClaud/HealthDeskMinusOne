import { addMonths, setDate, setHours, setMinutes, setSeconds } from "date-fns";

/**
 * Check if we're in production environment
 */
const isProduction = () => {
  return process.env.REACT_APP_ENVIRONMENT === "production";
};

/**
 * Get how long to show the "auction ended" message
 * Production: 15 minutes (matches backend display period)
 * Test/Sandbox: 5 minutes (matches backend display period)
 */
export const getPostAuctionDisplayDuration = () => {
  return isProduction() ? 15 : 5; // minutes
};

/**
 * Calculates the next auction end date based on environment
 * Production: 15th of month at 2PM (monthly cycle)
 * Test/Sandbox: Next quarter-hour at :00, :15, :30, :45 (15-minute cycle)
 * Note: Backend processes winners 1 minute after end time in test, 15 minutes in prod
 *
 * @returns {Date} The next auction end date
 */
export const getNextAuctionEndDate = () => {
  const now = new Date();

  if (isProduction()) {
    // Production: Monthly cycle (15th at 2PM)
    return getNextMonthlyAuctionEnd(now);
  } else {
    // Test/Sandbox: 15-minute cycle (quarter-hour marks)
    return getNextQuarterHourAuctionEnd(now);
  }
};

/**
 * Get the most recent auction end date (the one that just passed)
 * Used to calculate when the next auction starts after processing period
 *
 * @returns {Date} The most recent auction end date
 */
export const getLastAuctionEndDate = () => {
  const now = new Date();

  if (isProduction()) {
    // Production: Monthly cycle (15th at 2PM)
    return getLastMonthlyAuctionEnd(now);
  } else {
    // Test/Sandbox: 15-minute cycle (quarter-hour marks)
    return getLastQuarterHourAuctionEnd(now);
  }
};

/**
 * Get next monthly auction end (production)
 */
const getNextMonthlyAuctionEnd = (now) => {
  // Get the 15th of current month at 2PM
  const currentMonth15th = setHours(
    setMinutes(setSeconds(setDate(now, 15), 0), 0),
    14
  );

  if (currentMonth15th > now) {
    // Current month's auction hasn't happened yet
    return currentMonth15th;
  } else {
    // Current month's auction has passed, get next month's 15th
    const nextMonth = addMonths(now, 1);
    return setHours(setMinutes(setSeconds(setDate(nextMonth, 15), 0), 0), 14);
  }
};

/**
 * Get the last monthly auction end (production)
 */
const getLastMonthlyAuctionEnd = (now) => {
  // Get the 15th of current month at 2PM
  const currentMonth15th = setHours(
    setMinutes(setSeconds(setDate(now, 15), 0), 0),
    14
  );

  if (currentMonth15th <= now) {
    // Current month's auction has already happened
    return currentMonth15th;
  } else {
    // Current month's auction hasn't happened yet, get previous month's 15th
    const previousMonth = addMonths(now, -1);
    return setHours(
      setMinutes(setSeconds(setDate(previousMonth, 15), 0), 0),
      14
    );
  }
};

/**
 * Get next quarter-hour auction end (test environments)
 * Auctions end at :00, :15, :30, :45 of each hour
 */
const getNextQuarterHourAuctionEnd = (now) => {
  const nextQuarterHour = new Date(now);
  const minutes = now.getMinutes();

  // Round up to next 15-minute mark
  const nextInterval = Math.ceil((minutes + 1) / 15) * 15;

  if (nextInterval >= 60) {
    // Next interval is in the next hour
    nextQuarterHour.setHours(nextQuarterHour.getHours() + 1, 0);
  } else {
    // Next interval is in current hour
    nextQuarterHour.setMinutes(nextInterval);
  }

  // Set seconds and milliseconds to 0 for clean timing
  nextQuarterHour.setSeconds(0);
  nextQuarterHour.setMilliseconds(0);

  return nextQuarterHour;
};

/**
 * Get the last quarter-hour auction end (test environments)
 * Returns the most recent :00, :15, :30, or :45 mark that has passed
 */
const getLastQuarterHourAuctionEnd = (now) => {
  const lastQuarterHour = new Date(now);
  const minutes = now.getMinutes();

  // Round down to the last 15-minute mark
  const lastInterval = Math.floor(minutes / 15) * 15;

  lastQuarterHour.setMinutes(lastInterval);
  lastQuarterHour.setSeconds(0);
  lastQuarterHour.setMilliseconds(0);

  return lastQuarterHour;
};

/**
 * Get promotion expiration date based on environment
 * Production: Two auction cycles from now
 * Test: 30 minutes from next auction end (covers 2 fifteen-minute cycles)
 */
export const getPromotionExpirationDate = () => {
  const nextAuctionEnd = getNextAuctionEndDate();

  if (isProduction()) {
    // Production: Get the following month's 15th (two cycles from now)
    const followingMonth = addMonths(nextAuctionEnd, 1);
    return setHours(
      setMinutes(setSeconds(setDate(followingMonth, 15), 0), 0),
      14
    );
  } else {
    // Test: 30 minutes from next auction end (covers 2 fifteen-minute cycles)
    const promotionEnd = new Date(nextAuctionEnd);
    promotionEnd.setMinutes(promotionEnd.getMinutes() + 30);
    return promotionEnd;
  }
};

/**
 * Helper function to get environment info for debugging
 */
export const getEnvironmentInfo = () => {
  return {
    isProduction: isProduction(),
    environment: process.env.REACT_APP_ENVIRONMENT || "development",
    cycleDuration: isProduction() ? "monthly" : "15-minute",
    nextAuctionEnd: getNextAuctionEndDate(),
    lastAuctionEnd: getLastAuctionEndDate(),
  };
};

/**
 * Determine if an auction should be considered ended
 * Simple logic:
 * 1. If auction has endTime -> check if now > endTime
 * 2. If no auction document -> check global timing
 *
 * @param {Object} auction - The auction document data (can be empty/null)
 * @returns {boolean} - Whether the auction should be considered ended
 */
export const isAuctionEnded = (auction = {}) => {
  const now = new Date();

  // FIRST: Check Firestore document status - this is authoritative
  if (auction?.status === "ended") {
    return true;
  }

  // SECOND: If auction has endTime, use it directly (handles extensions properly)
  if (auction?.endTime && auction?.zipCode) {
    let endTime = auction.endTime;

    // Handle Firestore timestamps
    if (endTime?.toDate) endTime = endTime.toDate();
    if (!(endTime instanceof Date)) {
      try {
        endTime = new Date(endTime);
      } catch (error) {
        console.error("Error parsing auction endTime:", error);
        // Fall through to global timing if endTime is invalid
      }
    }

    if (endTime && !isNaN(endTime.getTime())) {
      // Simple check: is now past the auction's actual endTime?
      return now > endTime;
    }
  }

  // THIRD: No auction document or invalid endTime -> use global timing
  const lastAuctionEnd = getLastAuctionEndDate();
  const displayDurationMinutes = getPostAuctionDisplayDuration();
  const nextAuctionStart = new Date(lastAuctionEnd);
  nextAuctionStart.setMinutes(
    nextAuctionStart.getMinutes() + displayDurationMinutes
  );

  // Check if we're in global processing window (auction ended, processing winners)
  return now > lastAuctionEnd && now < nextAuctionStart;
};
