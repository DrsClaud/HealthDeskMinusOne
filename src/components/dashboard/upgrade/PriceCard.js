import React from "react";
import { Box, Typography } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useAuth } from "hooks/useAuth";

const PriceCard = ({
  title,
  description,
  price,
  sendToCheckout,
  loading,
  isDaily,
  tier,
  canStartTrial,
  startTrial,
  trialLoading,
  isCurrentPlan,
  onManageClick,
  onRegularPortal,
  portalLoading,
  savingsPercentage,
}) => {
  const { subscriptionData, hasActiveSubscription, userData } = useAuth();

  if (price === undefined || !price.id || !price.price) {
    console.log(`Skipping render for ${title} due to invalid price data`);
    return null;
  }

  // Get the tier level for comparison (small=0, medium=1, large=2)
  const getTierLevel = (tierName) => {
    const levels = { small: 0, medium: 1, large: 2 };
    return levels[tierName] || 0;
  };

  const checkCurrentPlan = (priceId) => {
    // If subscription is canceled or no subscription data, it's not current plan
    if (
      userData?.subscriptionStatus === "canceled" ||
      !subscriptionData?.items?.[0]?.price?.id
    )
      return false;

    // Only consider it current plan if IDs match
    return subscriptionData.items[0].price.id === priceId;
  };

  // Get current subscription tier
  const getCurrentTier = () => {
    // If subscription is canceled, return null
    if (userData?.subscriptionStatus === "canceled") return null;

    console.log("Subscription Data:", subscriptionData?.items?.[0]?.price);

    const priceData = subscriptionData?.items?.[0]?.price;
    if (!priceData) return null;

    // Check description field first (for backward compatibility)
    if (priceData.description) {
      const [tier] = priceData.description.split("_");
      if (["small", "medium", "large"].includes(tier)) {
        console.log("Found tier from description:", tier);
        return tier;
      }
    }

    // Check nickname field (e.g., "medium_monthly")
    if (priceData.nickname) {
      const [tier] = priceData.nickname.split("_");
      if (["small", "medium", "large"].includes(tier)) {
        console.log("Found tier from nickname:", tier);
        return tier;
      }
    }

    // Fallback to product name check
    const productName = priceData.product?.name?.toLowerCase() || "";
    console.log("Product Name:", productName);
    if (productName.includes("small")) return "small";
    if (productName.includes("medium")) return "medium";
    if (productName.includes("large")) return "large";

    console.log("No tier found, returning null");
    return null;
  };

  // Get current subscription interval
  const getCurrentInterval = () => {
    // If subscription is canceled, return null
    if (userData?.subscriptionStatus === "canceled") return null;

    const interval = subscriptionData?.items?.[0]?.price?.recurring?.interval;
    return interval || null;
  };

  // Check if this is the same tier but different billing cycle
  const isSameTierDifferentInterval = () => {
    if (userData?.subscriptionStatus === "canceled" || !tier) return false;

    const currentTier = getCurrentTier();
    const currentInterval = getCurrentInterval();

    return currentTier === tier && currentInterval !== price.interval;
  };

  // Determine button text based on plan comparison
  const getButtonText = () => {
    // If subscription is canceled, treat it as a new subscription
    if (userData?.subscriptionStatus === "canceled") {
      return isDaily ? "Purchase Now" : "Subscribe Now";
    }

    // If no active subscription, everything should be "Subscribe Now" (or "Purchase Now" for daily)
    if (!hasActiveSubscription) {
      return isDaily ? "Purchase Now" : "Subscribe Now";
    }

    if (isCurrentPlan) return "Current Plan";
    if (isDaily) return "Purchase Now";

    // Check for same tier, different billing cycle
    if (isSameTierDifferentInterval()) {
      const targetInterval = price.interval === "month" ? "Monthly" : "Yearly";
      return `Switch to ${targetInterval}`;
    }

    const currentTier = getCurrentTier();
    console.log("Current Tier:", currentTier, "This Tier:", tier);

    // If we're showing legacy pricing (no tiers), check for billing cycle switch
    if (!tier && hasActiveSubscription) {
      const currentInterval = getCurrentInterval();
      if (currentInterval && currentInterval !== price.interval) {
        const targetInterval =
          price.interval === "month" ? "Monthly" : "Yearly";
        return `Switch to ${targetInterval}`;
      }
      return "Subscribe Now";
    }

    // If no current tier but has active subscription, treat as new subscription
    if (!currentTier && hasActiveSubscription) {
      console.log("No current tier detected but has active subscription");
      return "Subscribe Now";
    }

    const currentLevel = getTierLevel(currentTier);
    const thisLevel = getTierLevel(tier);
    console.log("Levels:", { currentLevel, thisLevel });

    if (thisLevel > currentLevel) return "Upgrade";
    if (thisLevel < currentLevel) return "Downgrade";
    return "Subscribe Now";
  };

  // Format price with proper cents display
  const formatPrice = (priceString) => {
    const amount = parseFloat(priceString.replace("$", ""));
    const dollars = Math.floor(amount);
    const cents = Math.round((amount - dollars) * 100);

    return {
      dollars: dollars.toString(),
      cents: cents.toString().padStart(2, "0"),
    };
  };

  // Calculate display price and interval
  const getDisplayPrice = () => {
    if (price.interval === "year") {
      const monthlyAmount = parseFloat(price.price.replace("$", "")) / 12;
      const yearlyAmount = parseFloat(price.price.replace("$", ""));
      return {
        ...formatPrice(`$${monthlyAmount.toFixed(2)}`),
        interval: "month",
        billingNote: `(billed yearly at $${yearlyAmount.toFixed(2)})`,
      };
    }
    return {
      ...formatPrice(price.price),
      interval: price.interval,
      billingNote: "",
    };
  };

  const displayPrice = getDisplayPrice();

  // Get tier-specific descriptions
  const getTierDescription = (tierName) => {
    const descriptions = {
      small: "Perfect for individuals getting started.",
      medium: "Great for regular users who need more capacity.",
      large: "Ideal for power users who need maximum resources.",
    };
    return descriptions[tierName] || "";
  };

  // Check if this is the popular/recommended plan (medium tier)
  const isPopular = tier === "medium";

  const handleButtonClick = () => {
    // If subscription is scheduled for cancellation, don't allow plan changes
    if (subscriptionData?.cancel_at_period_end) {
      return;
    }

    // If user has active subscription and this isn't current plan, go to portal
    if (
      hasActiveSubscription &&
      !isCurrentPlan &&
      userData?.subscriptionStatus !== "canceled"
    ) {
      onManageClick(price.id);
    } else if (!isCurrentPlan || userData?.subscriptionStatus === "canceled") {
      // New subscription or resubscribe after cancellation - go to checkout
      sendToCheckout(price.id, isDaily);
    }
  };

  // Determine if the button should be disabled
  const isButtonDisabled = () => {
    // Don't disable buttons if subscription is canceled
    if (userData?.subscriptionStatus === "canceled") {
      return !!loading || !!portalLoading || trialLoading !== null;
    }

    return (
      !!loading ||
      !!portalLoading ||
      trialLoading !== null ||
      isCurrentPlan ||
      subscriptionData?.cancel_at_period_end
    );
  };

  return (
    <Box
      key={price.id}
      sx={{
        boxShadow: isPopular ? 4 : 1,
        borderRadius: 2,
        p: { xs: 3, lg: 4 },
        pb: { xs: 4, lg: 5 },
        mb: { xs: 2, lg: 1 },
        textAlign: "center",
        width: "100%",
        position: "relative",
        border: isPopular ? 2 : 1,
        borderColor: isPopular ? "primary.main" : "divider",
        transform: isPopular ? "scale(1.05)" : "none",
        zIndex: isPopular ? 1 : 0,
      }}
    >
      {isPopular && (
        <Box
          sx={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "primary.main",
            color: "primary.contrastText",
            px: 3,
            py: 0.5,
            borderRadius: 2,
            fontSize: "0.875rem",
            fontWeight: "bold",
          }}
        >
          Most Popular
        </Box>
      )}

      {savingsPercentage && (
        <Box
          sx={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "success.main",
            color: "success.contrastText",
            px: 2,
            py: 0.5,
            borderRadius: 2,
            fontSize: "0.75rem",
            fontWeight: "bold",
          }}
        >
          Save {savingsPercentage}%
        </Box>
      )}

      <Typography variant="h5" sx={{ mb: 1, fontWeight: "bold" }}>
        {title}
      </Typography>

      {/* Large Price Display */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            mb: 0.5,
          }}
        >
          <Typography
            variant="h3"
            component="span"
            sx={{
              fontWeight: "bold",
              color: isPopular ? "primary.main" : "text.primary",
            }}
          >
            ${displayPrice.dollars}
          </Typography>
          <Typography
            variant="h5"
            component="span"
            sx={{
              fontWeight: "bold",
              color: isPopular ? "primary.main" : "text.primary",
            }}
          >
            .{displayPrice.cents}
          </Typography>
        </Box>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            textAlign: "center",
            mt: -1,
            mb: 1,
          }}
        >
          /{displayPrice.interval}
        </Typography>
        {displayPrice.billingNote && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: "0.75rem" }}
          >
            {displayPrice.billingNote}
          </Typography>
        )}
      </Box>

      {tier && (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 2, minHeight: "1.5em" }}
        >
          {getTierDescription(tier)}
        </Typography>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {description
          ? description
          : isDaily
          ? "Does not auto-renew."
          : "Cancel anytime."}
      </Typography>

      {/* Subscribe/Upgrade/Downgrade Button */}
      <LoadingButton
        loading={loading === price.id || portalLoading === price.id}
        disabled={isButtonDisabled()}
        onClick={handleButtonClick}
        size="large"
        variant={
          isCurrentPlan && userData?.subscriptionStatus !== "canceled"
            ? "outlined"
            : "contained"
        }
        sx={{
          py: 1.5,
          px: 4,
          borderRadius: 2,
          fontWeight: "bold",
          mb: 1,
        }}
      >
        {getButtonText()}
      </LoadingButton>

      {/* Manage Plan Button for Current Plan */}
      {isCurrentPlan && userData?.subscriptionStatus !== "canceled" && (
        <Box>
          <LoadingButton
            loading={portalLoading === "manage"}
            disabled={!!loading || !!portalLoading || trialLoading !== null}
            variant="text"
            onClick={onRegularPortal}
            size="small"
            sx={{ textTransform: "none" }}
          >
            Manage Plan
          </LoadingButton>
        </Box>
      )}
    </Box>
  );
};

export default PriceCard;
