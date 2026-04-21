import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  Alert,
  AlertTitle,
} from "@mui/material";
import { useAuth } from "hooks/useAuth";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import PriceCard from "./PriceCard";

const PricingControls = ({
  prices,
  selectedInterval,
  onIntervalChange,
  sendToCheckout,
  loading,
  canStartTrial,
  startTrial,
  trialLoading,
  subscription,
  role,
  trialExpired,
}) => {
  const {
    hasActiveSubscription,
    hasLapsedSubscription,
    subscriptionData,
    userData,
  } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(null); // null or priceId
  const [portalLoading, setPortalLoading] = useState(null); // null, priceId, or 'manage'

  console.log("PricingControls Subscription Data:", {
    hasActiveSubscription,
    hasLapsedSubscription,
    subscriptionDetails: subscriptionData?.items?.[0]?.price,
    prices,
  });

  // Get the user's current subscription interval to set as default
  const getCurrentSubscriptionInterval = () => {
    const interval = subscriptionData?.items?.[0]?.price?.recurring?.interval;
    if (!interval) return "monthly";

    // Map Stripe intervals to our UI intervals
    if (interval === "year") return "yearly";
    if (interval === "month") return "monthly";
    if (interval === "day") return "daily";
    return "monthly"; // fallback
  };

  // Use current subscription interval as default if user has active subscription
  const defaultInterval = hasActiveSubscription
    ? getCurrentSubscriptionInterval()
    : "monthly";

  // Set the interval to match user's current subscription on mount (only once)
  useEffect(() => {
    if (
      hasActiveSubscription &&
      subscriptionData?.items?.[0]?.price?.recurring?.interval
    ) {
      const currentInterval = getCurrentSubscriptionInterval();
      // Only set if we haven't set it yet (avoid fighting with user clicks)
      if (selectedInterval === "monthly" && currentInterval === "yearly") {
        onIntervalChange(currentInterval);
      }
    }
  }, [hasActiveSubscription, subscriptionData]); // Removed selectedInterval from deps

  // Check if we have new tiered pricing structure
  const hasTimedPricing = () => {
    return Object.keys(prices).some(
      (key) =>
        typeof prices[key] === "object" &&
        prices[key] !== null &&
        !prices[key].id
    );
  };

  // Check if this is facility pricing structure
  const hasFacilityPricing = () => {
    return prices.facility && typeof prices.facility === "object";
  };

  // Check if this is the user's current plan
  const isCurrentPlan = (priceId) => {
    if (!subscriptionData?.items?.[0]?.price?.id) return false;
    return subscriptionData.items[0].price.id === priceId;
  };

  // NEW: Unified checkout function that handles both new subscriptions and upgrades
  const handleCheckout = async (priceId, isDaily = false) => {
    setCheckoutLoading(priceId);
    try {
      const createCheckoutSession = firebase
        .functions()
        .httpsCallable("createCheckoutSession");

      const { data } = await createCheckoutSession({
        priceId,
        successUrl: window.location.origin + "/dashboard",
        cancelUrl: window.location.href,
        mode: isDaily ? "payment" : "subscription",
        // Explicit intent: either use existing customer or create new
        ...(userData?.stripeId
          ? { stripeId: userData.stripeId }
          : { createNew: true }),
        metadata: {
          ...(isDaily && {
            type: "daily_pass",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }),
        },
      });

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      alert("Failed to create checkout session. Please try again.");
      setCheckoutLoading(null);
    }
  };

  // Handle manage subscription click - goes to portal for plan changes
  const handleManageClick = async (targetPriceId) => {
    setPortalLoading(targetPriceId);
    try {
      const createPortalSession = firebase
        .functions()
        .httpsCallable("createPortalSession");

      const { data } = await createPortalSession({
        successUrl: window.location.origin + "/dashboard/settings", // Go to settings on successful plan change
        cancelUrl: window.location.href, // Stay on current page if canceled
        role: userData?.role,
        stripeId: userData?.stripeId,
        flowType: "subscription_update_confirm",
        flowData: {
          subscription_update_confirm: {
            subscription: subscriptionData?.id, // The subscription ID, not the item
            items: [
              {
                id: subscriptionData?.items?.[0]?.id, // Current subscription item ID
                price: targetPriceId, // New price ID they want to switch to
              },
            ],
          },
        },
      });

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating portal session:", error);
      alert("Failed to open subscription management. Please try again.");
      setPortalLoading(null); // Only set loading to false on error
    }
  };

  // Handle regular portal access (for billing/cancellation)
  const handleRegularPortal = async () => {
    setPortalLoading("manage");
    try {
      const createPortalSession = firebase
        .functions()
        .httpsCallable("createPortalSession");

      const { data } = await createPortalSession({
        successUrl: window.location.origin + "/dashboard/settings", // Go to settings on successful actions
        cancelUrl: window.location.href, // Stay on current page if canceled
        role: userData?.role,
        stripeId: userData?.stripeId,
      });

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating portal session:", error);
      alert("Failed to open subscription management. Please try again.");
      setPortalLoading(null); // Only set loading to false on error
    }
  };

  if (Object.keys(prices).length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Only show daily passes if no active subscription and not lapsed
  const showDaily = !hasActiveSubscription && !hasLapsedSubscription;

  return (
    <>
      {hasTimedPricing() && !hasFacilityPricing() && (
        <Box sx={{ textAlign: "center", pt: 4, mb: 4 }}>
          <ToggleButtonGroup
            value={selectedInterval}
            exclusive
            onChange={(e, newInterval) => {
              if (newInterval !== null) {
                onIntervalChange(newInterval);
              }
            }}
            sx={{
              mb: 4,
              borderRadius: "20px",
              backgroundColor: "grey.100",
              border: "1px solid",
              borderColor: "divider",
              position: "relative",
              "& .MuiToggleButton-root": {
                px: 2.5,
                py: 0.75,
                border: "none",
                borderRadius: 0,
                fontSize: "0.875rem",
                fontWeight: 500,
                minWidth: "80px",
                backgroundColor: "transparent",
                color: "text.secondary",
                transition: "all 0.2s ease-in-out",
                "&:not(:last-child)": {
                  borderRight: "1px solid",
                  borderRightColor: "divider",
                },
                "&.Mui-selected": {
                  backgroundColor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": {
                    backgroundColor: "primary.dark",
                  },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: -1,
                    bottom: -1,
                    left: 0,
                    right: 0,
                    border: "1px solid",
                    borderColor: "primary.main",
                    borderRadius: "inherit",
                    pointerEvents: "none",
                    transition: "all 0.2s ease-in-out",
                  },
                },
                "&:hover:not(.Mui-selected)": {
                  backgroundColor: "grey.200",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: -1,
                    bottom: -1,
                    left: 0,
                    right: 0,
                    border: "1px solid transparent",
                    borderRadius: "inherit",
                    pointerEvents: "none",
                  },
                },
                "&:first-of-type": {
                  borderTopLeftRadius: "20px",
                  borderBottomLeftRadius: "20px",
                  "&.Mui-selected::before, &:hover::before": {
                    borderRadius: "20px 0 0 20px",
                  },
                },
                "&:last-of-type": {
                  borderTopRightRadius: "20px",
                  borderBottomRightRadius: "20px",
                  "&.Mui-selected::before, &:hover::before": {
                    borderRadius: "0 20px 20px 0",
                  },
                },
              },
            }}
          >
            {showDaily && <ToggleButton value="daily">Daily</ToggleButton>}
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="yearly" sx={{ position: "relative" }}>
              Yearly
              <Box
                sx={{
                  position: "absolute",
                  top: -28,
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "success.main",
                  color: "success.contrastText",
                  fontSize: "0.7rem",
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  zIndex: 10,
                }}
              >
                Save 31%
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={4}
        sx={{ mb: 4, alignItems: "stretch" }}
      >
        {hasFacilityPricing() ? (
          // Facility pricing: side-by-side monthly/yearly
          ["monthly", "yearly"].map((interval) => {
            const currentPrice = prices.facility?.[interval];
            if (!currentPrice) return null;

            // Calculate savings for yearly plan
            const isYearly = interval === "yearly";
            const monthlyPrice = prices.facility?.monthly;
            const yearlyPrice = prices.facility?.yearly;
            let savingsPercentage = null;

            if (isYearly && monthlyPrice && yearlyPrice) {
              const monthlyAnnual =
                parseInt(monthlyPrice.price.replace("$", "")) * 12;
              const yearlyAnnual = parseInt(yearlyPrice.price.replace("$", ""));
              const savings = monthlyAnnual - yearlyAnnual;
              savingsPercentage = Math.round((savings / monthlyAnnual) * 100);
            }

            return (
              <PriceCard
                key={interval}
                title={`${
                  interval.charAt(0).toUpperCase() + interval.slice(1)
                } Plan`}
                price={currentPrice}
                sendToCheckout={handleCheckout}
                loading={checkoutLoading}
                isDaily={false}
                canStartTrial={canStartTrial}
                startTrial={startTrial}
                trialLoading={trialLoading}
                isCurrentPlan={isCurrentPlan(currentPrice.id)}
                onManageClick={handleManageClick}
                onRegularPortal={handleRegularPortal}
                portalLoading={portalLoading}
                savingsPercentage={isYearly ? savingsPercentage : null}
              />
            );
          })
        ) : hasTimedPricing() ? (
          // Standard tiered pricing: small/medium/large
          ["small", "medium", "large"].map((tier) => {
            const tierPrices = prices[tier];
            const currentPrice = tierPrices?.[selectedInterval];

            if (!currentPrice) return null;

            return (
              <PriceCard
                key={tier}
                title={`${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`}
                price={currentPrice}
                sendToCheckout={handleCheckout}
                loading={checkoutLoading}
                isDaily={selectedInterval === "daily"}
                tier={tier}
                canStartTrial={canStartTrial}
                startTrial={startTrial}
                trialLoading={trialLoading}
                isCurrentPlan={isCurrentPlan(currentPrice.id)}
                onManageClick={handleManageClick}
                onRegularPortal={handleRegularPortal}
                portalLoading={portalLoading}
              />
            );
          })
        ) : (
          // Legacy pricing
          <>
            <PriceCard
              title={"Monthly Plan"}
              price={prices.month}
              sendToCheckout={handleCheckout}
              loading={checkoutLoading}
              isDaily={false}
              canStartTrial={canStartTrial}
              startTrial={startTrial}
              trialLoading={trialLoading}
              isCurrentPlan={isCurrentPlan(prices.month?.id)}
              onManageClick={handleManageClick}
              onRegularPortal={handleRegularPortal}
              portalLoading={portalLoading}
            />
            <PriceCard
              title={"Yearly Plan"}
              price={prices.year}
              sendToCheckout={handleCheckout}
              loading={checkoutLoading}
              isDaily={false}
              canStartTrial={canStartTrial}
              startTrial={startTrial}
              trialLoading={trialLoading}
              isCurrentPlan={isCurrentPlan(prices.year?.id)}
              onManageClick={handleManageClick}
              onRegularPortal={handleRegularPortal}
              portalLoading={portalLoading}
            />
            {showDaily && (
              <PriceCard
                title={"Day Pass"}
                description={"24-hour access. Does not auto-renew."}
                price={prices.day}
                sendToCheckout={handleCheckout}
                loading={checkoutLoading}
                isDaily={true}
                canStartTrial={canStartTrial}
                startTrial={startTrial}
                trialLoading={trialLoading}
                isCurrentPlan={isCurrentPlan(prices.day?.id)}
                onManageClick={handleManageClick}
                onRegularPortal={handleRegularPortal}
                portalLoading={portalLoading}
              />
            )}
          </>
        )}
      </Stack>

      {role === "patient" &&
        !trialExpired &&
        Object.keys(prices).length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Alert severity="info" sx={{ mt: 4, mb: 2 }}>
              <AlertTitle>Important Subscriber Information</AlertTitle>
              Thank you for considering a subscription with us! We want to
              ensure the best experience for all users, so please be aware that
              all subscriptions are subject to use restrictions. These
              guidelines are in place to help maintain the overall system's
              viability and ensure fair access for everyone. We appreciate your
              understanding and cooperation.
            </Alert>
          </Box>
        )}
    </>
  );
};

export default PricingControls;
