const {
  addMonths,
  setDate,
  setHours,
  setMinutes,
  setSeconds,
} = require("date-fns");

const { getEnvironmentConfig } = require("../config/environments");

/**
 * Calculates the next auction end date
 * - Production: 15th of current or next month at 2PM
 * - Test mode: Next quarter-hour at :00, :15, :30, or :45
 * @param {Date} [baseDate=new Date()] The date to calculate from
 * @returns {Date} The next auction end date
 */
const getNextAuctionEndDate = (baseDate = new Date()) => {
  const envConfig = getEnvironmentConfig();

  // Test mode: 15-minute auctions ending at :00, :15, :30, :45
  if (!envConfig.isProduction) {
    const nextQuarterHour = new Date(baseDate);
    const minutes = nextQuarterHour.getMinutes();

    // Round up to next 15-minute mark
    const nextInterval = Math.ceil((minutes + 1) / 15) * 15;

    if (nextInterval >= 60) {
      nextQuarterHour.setHours(nextQuarterHour.getHours() + 1, 0);
    } else {
      nextQuarterHour.setMinutes(nextInterval);
    }

    // Set seconds and milliseconds to 0 for clean timing
    nextQuarterHour.setSeconds(0);
    nextQuarterHour.setMilliseconds(0);

    return nextQuarterHour;
  }

  // Production mode: monthly auctions on 15th at 2PM
  const currentMonth15th = setHours(
    setMinutes(setSeconds(setDate(baseDate, 15), 0), 0),
    14
  );

  if (currentMonth15th > baseDate) {
    return currentMonth15th;
  } else {
    const nextMonth = addMonths(baseDate, 1);
    return setHours(setMinutes(setSeconds(setDate(nextMonth, 15), 0), 0), 14);
  }
};

/**
 * Calculates the end date for promotions
 * - Production: Two auction cycles from now (next next auction date)
 * - Test mode: Two auction cycles from now (follows same pattern as production)
 *
 * @param {Date} [baseDate=new Date()] The date to calculate from
 * @returns {Date} The end date for promotions
 */
const getPromotionEndDate = (baseDate = new Date()) => {
  const nextAuctionDate = getNextAuctionEndDate(baseDate);
  return getNextAuctionEndDate(nextAuctionDate);
};

/**
 * Gets the maximum extension duration for auctions based on environment
 * - Production: 15 minutes maximum extension
 * - Test mode: 5 minutes maximum extension
 * @returns {number} Maximum extension time in milliseconds
 */
const getMaxAuctionExtension = () => {
  const envConfig = getEnvironmentConfig();

  if (!envConfig.isProduction) {
    return 5 * 60 * 1000; // 5 minutes for test environments
  }

  return 15 * 60 * 1000; // 15 minutes for production
};

module.exports = {
  getNextAuctionEndDate,
  getPromotionEndDate,
  getMaxAuctionExtension,
};
