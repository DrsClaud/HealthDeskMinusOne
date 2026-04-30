import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "hooks/useAuth";
import { Box, Typography, Alert, AlertTitle, Card } from "@mui/material";
import DashboardPageHeader from "components/common/DashboardPageHeader";

import { LoadingButton } from "@mui/lab";
import Pricing from "components/dashboard/upgrade/Pricing";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import { getTrialLengthForRole } from "constants/trials";

const UpgradePage = () => {
  const {
    userData,
    subscription,
    subscriptionData,
    hasActiveSubscription,
    hasLapsedSubscription,
    canStartTrial,
    hasActiveTrial,
    trialExpired,
  } = useAuth();
  const navigate = useNavigate();
  const [manageBillingLoading, setManageBillingLoading] = useState(false);

  const handleManageBilling = async () => {
    setManageBillingLoading(true);
    try {
      const createPortalSession = firebase
        .functions()
        .httpsCallable("createPortalSession");

      const { data } = await createPortalSession({
        successUrl: window.location.href,
        cancelUrl: window.location.href,
        role: userData?.role,
        stripeId: userData?.stripeId,
        // No flowType = regular portal with billing history, payment methods, invoices, reactivation
      });

      if (data.url) {
        window.location.assign(data.url);
      }
    } catch (error) {
      console.error("Error opening portal:", error);
      alert("Failed to open billing management. Please try again.");
      setManageBillingLoading(false);
    }
  };

  const getUpgradeMessage = (
    role,
    canStartTrial,
    trialExpired,
    hasLapsedSubscription
  ) => {
    // Active subscription - show current plan message
    if (hasActiveSubscription) {
      if (subscriptionData?.cancel_at_period_end) {
        return "Your subscription is scheduled to cancel. Please use Manage Billing to continue your subscription.";
      }
      if (role === "facility") {
        return "You're currently on the CareMap Plus plan. Review your subscription details below.";
      }
      return "You're currently a HealthDesk Member. Change your subscription plan below.";
    }

    // Lapsed subscription - different messaging based on status
    if (hasLapsedSubscription) {
      if (subscriptionData?.status === "past_due") {
        return "Your subscription has been suspended due to failed payment. Use the button below to manage your billing and reactivate your subscription.";
      }
      if (subscriptionData?.status === "canceled") {
        return "Your subscription has been cancelled. Choose a plan below to resubscribe.";
      }
      return "Your subscription is no longer active. Choose a plan below to resubscribe.";
    }

    const isTrialRole =
      role === "patient" ||
      role === "p4" ||
      role === "professional" ||
      role === "facility";

    if (isTrialRole && canStartTrial) {
      const trialLengthDays = getTrialLengthForRole(role);
      if (role === "facility") {
        return `Coordinate your waiting room, staffing, and virtual queue with CareMap Plus free for ${trialLengthDays} days.`;
      }
      return `Experience Medical SuperIntelligence risk-free for ${trialLengthDays} days.`;
    }

    if (isTrialRole && trialExpired) {
      if (role === "facility") {
        return "Your CareMap Plus trial has ended. Keep patients informed and queues moving by choosing a plan below.";
      }
      return "Your trial has ended. Continue your journey with Medical SuperIntelligence by choosing a plan below.";
    }

    // Standard messaging for other cases
    if (role === "facility") {
      return "Upgrade to CareMap Plus to access all our features and supercharge your facility.";
    }
    if (role === "patient" || role === "p4") {
      return "Upgrade to become a HealthDesk Member. Get unlimited access to Medical SuperIntelligence, your personal health assistant.";
    }
    if (role === "professional") {
      return "Upgrade to become a HealthDesk Member. Get unlimited access to Medical SuperIntelligence for healthcare professionals.";
    }
    return "Upgrade to become a HealthDesk Member to access all our features.";
  };

  const getPageTitle = (
    role,
    canStartTrial,
    trialExpired,
    hasLapsedSubscription
  ) => {
    if (hasLapsedSubscription) {
      if (subscriptionData?.status === "past_due") {
        return "Reactivate Your Subscription";
      }
      if (subscriptionData?.status === "canceled") {
        return "Choose Your Plan";
      }
      return "Resubscribe";
    }

    if (
      role === "patient" ||
      role === "p4" ||
      role === "professional" ||
      role === "facility"
    ) {
      if (canStartTrial) {
        return "Start Your Free Trial";
      }
      return "Choose Your Plan";
    }

    return "Upgrade";
  };

  const shouldShowPricing = () => {
    // For past_due subscriptions, don't show pricing - portal can handle reactivation
    if (hasLapsedSubscription && subscriptionData?.status === "past_due") {
      return false;
    }

    // For canceled/ended subscriptions, show pricing - portal can't reactivate these
    if (hasLapsedSubscription && subscriptionData?.status === "canceled") {
      return true;
    }

    return true;
  };

  return (
    <Box sx={{ pb: 4 }}>
      <DashboardPageHeader
        title={getPageTitle(
          userData?.role,
          canStartTrial,
          trialExpired,
          hasLapsedSubscription
        )}
        subtitle={false}
        sx={{ mb: 2 }}
      />

      {hasActiveTrial && (
        <Alert severity="info" sx={{ mt: 3, mb: 3 }}>
          <AlertTitle>Upgrade Early?</AlertTitle>
          Your free trial is still active, but you can upgrade now to ensure
          uninterrupted access.
        </Alert>
      )}

      <Typography
        variant="body"
        sx={{
          display: "block",
          mt: 1,
          mb: userData?.role === "facility" && hasActiveSubscription ? 5 : 2,
        }}
      >
        {getUpgradeMessage(
          userData?.role,
          canStartTrial,
          trialExpired,
          hasLapsedSubscription
        )}
      </Typography>

      {/* Past Due Subscription - Show Manage Billing Button */}
      {hasLapsedSubscription && subscriptionData?.status === "past_due" && (
        <Card
          sx={{
            textAlign: "center",
            py: 4,
            px: 2,
            my: 4,
          }}
        >
          <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
            Update Your Payment Method
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Update your payment method and reactivate your subscription to
            continue using Medical SuperIntelligence.
          </Typography>
          <LoadingButton
            loading={manageBillingLoading}
            disabled={manageBillingLoading}
            variant="contained"
            size="large"
            onClick={handleManageBilling}
            sx={{ px: 4, py: 1.5 }}
          >
            Manage Billing
          </LoadingButton>
        </Card>
      )}

      {shouldShowPricing() && (
        <Pricing
          uid={userData?.uid}
          role={userData?.role}
          subscription={subscription}
        />
      )}
    </Box>
  );
};

export default UpgradePage;
