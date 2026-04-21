import { useMemo } from "react";
import {
  startOfTomorrow,
  startOfDay,
  isAfter,
  addDays,
  formatDistanceToNowStrict,
  startOfMonth,
  addMonths,
} from "date-fns";

// Constants should match backend - duplicated for frontend use
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

const MESSAGE_LIMITS = {
  free: 4,
};

// Helper function to check if user has active trial
const hasActiveTrial = (userData) => {
  if (!userData?.trialExpiresAt) return false;
  const expiresAt = userData.trialExpiresAt.toDate
    ? userData.trialExpiresAt.toDate()
    : new Date(userData.trialExpiresAt);
  return expiresAt > new Date();
};

// Helper function to check if user has active daily pass
const hasActiveDailyPass = (userData) => {
  if (!userData?.dailyPassExpiresAt) return false;
  return new Date(userData.dailyPassExpiresAt) > new Date();
};

// Get token limit for user based on role and subscription tier
function getTokenLimit(userRole, subscriptionTier, hasValidSubscription) {
  if (!hasValidSubscription) {
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

export const useRateLimit = (userData = {}, subscription, organization = null) => {
  return useMemo(() => {
    // Check if user has valid subscription (including trials and daily passes)
    const hasValidSubscription =
      subscription || hasActiveTrial(userData) || hasActiveDailyPass(userData);
    const isFreeTier = !hasValidSubscription;
    const userRole = userData?.role || "patient";
    const subscriptionTier = userData?.subscriptionTier || "medium"; // Works for both subscriptions and daily passes

    // Check if professional in organization (shared token pool)
    const isOrgProfessional = userRole === "professional" && userData?.organizationId && organization;

    // Determine subscription tier: if no valid subscription, use free limits regardless of role
    const subscriptionType = hasValidSubscription ? userRole : "free";
    
    // Calculate token limit
    let tokenLimit;
    let tokensUsed;
    
    if (isOrgProfessional) {
      // Organization professionals share a token pool: seats * 500k per seat
      const totalSeats = organization?.seats?.total || 0;
      tokenLimit = totalSeats * 500000;
      tokensUsed = organization?.tokensUsedThisMonth || 0;
      console.log(`👥 Org professional: ${totalSeats} seats × 500k = ${tokenLimit} token limit`);
    } else {
      // Individual token limits (patients, non-org professionals, etc.)
      tokenLimit = getTokenLimit(
        userRole,
        subscriptionTier,
        hasValidSubscription
      );
      tokensUsed = userData?.tokensUsedThisMonth || 0;
    }

    const tokenPercentage =
      tokenLimit === 0 ? 100 : Math.min((tokensUsed / tokenLimit) * 100, 100);

    // Calculate message usage for free users
    const messageLimit = MESSAGE_LIMITS.free;

    // Check if we need to reset message count based on lastMessageReset
    const now = new Date();
    const todayStart = startOfDay(now);
    const lastReset = userData?.lastMessageReset
      ? userData.lastMessageReset.toDate
        ? userData.lastMessageReset.toDate()
        : new Date(userData.lastMessageReset)
      : null;

    // If lastReset is before today's start or doesn't exist, count should be 0
    const needsReset = !lastReset || isAfter(todayStart, startOfDay(lastReset));
    const messageCount = needsReset ? 0 : userData?.messageCount || 0;

    const messagePercentage = isFreeTier
      ? Math.min((messageCount / messageLimit) * 100, 100)
      : 0;

    // Helper function to get usage status text
    const getUsageStatus = (percentage) => {
      if (percentage === 0) return `${tokensUsed}/${tokenLimit} tokens`;
      return `${tokensUsed}/${tokenLimit} tokens`;
    };

    // Helper function to get progress bar color
    const getProgressColor = (percentage) => {
      if (percentage < 50) return "primary";
      if (percentage < 75) return "warning";
      return "error";
    };

    const formatResetDate = (timestamp) => {
      if (!timestamp) return null;

      // Calculate next reset: start of next month from current date
      const now = new Date();
      const nextMonthStart = startOfMonth(addMonths(now, 1));

      return formatDistanceToNowStrict(nextMonthStart, { addSuffix: true });
    };

    // Determine if user is rate limited
    const isRateLimited =
      isFreeTier && (tokenPercentage >= 100 || messagePercentage >= 100);

    // Determine warning level (80%+ usage)
    const shouldShowWarning =
      isFreeTier &&
      !isRateLimited &&
      (tokenPercentage >= 80 || messagePercentage >= 80);

    // Get the most restrictive percentage for display
    const effectivePercentage = isFreeTier
      ? Math.max(tokenPercentage, messagePercentage)
      : tokenPercentage;

    // Get next reset time - more accurate logic
    const getNextResetTime = () => {
      if (isFreeTier && messagePercentage > tokenPercentage) {
        // Daily message limit is more restrictive
        return formatDistanceToNowStrict(startOfTomorrow(), {
          addSuffix: true,
        });
      } else if (userData?.lastTokenReset) {
        // Monthly token limit
        return formatResetDate(userData.lastTokenReset);
      }
      return null;
    };

    const nextReset = getNextResetTime();

    return {
      // Raw data
      tokensUsed,
      tokenLimit,
      tokenPercentage,
      messageCount,
      messageLimit,
      messagePercentage,
      isFreeTier,
      subscriptionType,
      subscriptionTier,
      hasValidSubscription,

      // Computed states
      isRateLimited,
      shouldShowWarning,
      effectivePercentage,

      // Helpers
      getUsageStatus,
      getProgressColor,
      nextReset,

      // For upgrade logic
      canUpgrade: !userData?.fromWordPress && !hasValidSubscription,
      
      // Organization-specific data
      isOrgProfessional,
    };
  }, [userData, subscription, organization]);
};
