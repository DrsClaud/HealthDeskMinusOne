// src/utils/formatUtils.js
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const TIMER_INTERVALS = {
  AUCTION_STATUS: 1000, // 1 second for auction timer
  TABLE_UPDATE: 250, // 250ms for table updates
};

export const LOCAL_STORAGE_KEYS = {
  FIRST_TIME_PROMOTION: "hasSeenPromotionMessage",
  USER_PREFERENCES: "userPreferences",
  BID_HISTORY: "bidHistory",
};
