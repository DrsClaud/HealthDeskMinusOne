import React, { useState, useEffect } from "react";
import { Alert, IconButton, Button } from "@mui/material";
import {
  CheckCircleOutlineRounded,
  CloseRounded,
  ErrorOutlineRounded,
} from "@mui/icons-material";
import { useAuth } from "hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { db } from "services/firebase";
import SubscriberWelcomeDialog from "./SubscriberWelcomeDialog";
import AdminWelcomeDialog from "./admin/AdminWelcomeDialog";
import { getTrialLengthForRole, getTrialLabelForRole } from "constants/trials";

const StatusBanner = () => {
  const {
    hasActiveTrial,
    trialExpired,
    subscription, // This is the user ROLE (patient, facility, etc.) - confusing naming for backwards compatibility
    subscriptionData, // This is the actual Stripe subscription object with status
    hasLapsedSubscription,
    hasActiveDailyPass,
    userData,
    user,
    organization,
  } = useAuth();
  const navigate = useNavigate();
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const trialLengthDays = getTrialLengthForRole(userData?.role);
  const trialLabel = getTrialLabelForRole(userData?.role);
  const isFacility = userData?.role === "facility";
  const [showSubscriptionChange, setShowSubscriptionChange] = useState(null);
  const [showRenewalSuccess, setShowRenewalSuccess] = useState(false);

  // Helper function to update user document fields
  const updateUserField = async (fieldName, value) => {
    if (!user?.uid) return;

    try {
      await db
        .collection("users")
        .doc(user.uid)
        .update({
          [fieldName]: value,
        });
    } catch (error) {
      console.error(`Error updating ${fieldName}:`, error);
    }
  };

  // Check if subscription is recent (within 48 hours)
  const isRecentSubscription = (subscriptionData) => {
    if (!subscriptionData?.created) return false;
    const created = subscriptionData.created * 1000; // Stripe timestamp to milliseconds
    const now = Date.now();
    return now - created < 48 * 60 * 60 * 1000; // 48 hours
  };

  // Detect subscription changes
  useEffect(() => {
    if (!subscriptionData) return;

    const storageKey = `prevSubscriptionData_${user?.uid}`;
    const prevSubDataStr = localStorage.getItem(storageKey);

    if (prevSubDataStr) {
      try {
        const prevSubData = JSON.parse(prevSubDataStr);
        const currentPlanId = subscriptionData.items?.[0]?.plan?.id;
        const prevPlanId = prevSubData.items?.[0]?.plan?.id;

        // Only show change notification if plan actually changed and subscription is active
        if (
          currentPlanId &&
          prevPlanId &&
          currentPlanId !== prevPlanId &&
          subscriptionData.status === "active"
        ) {
          const currentAmount = subscriptionData.items[0].plan.amount;
          const prevAmount = prevSubData.items[0].plan.amount;
          const currentInterval = subscriptionData.items[0].plan.interval;
          const prevInterval = prevSubData.items[0].plan.interval;

          // Determine if it's an upgrade/downgrade or just a billing change
          let changeType = "updated";
          if (currentInterval === prevInterval) {
            // Same billing interval, compare amounts
            changeType =
              currentAmount > prevAmount
                ? "upgrade"
                : currentAmount < prevAmount
                ? "downgrade"
                : "updated";
          }

          setShowSubscriptionChange({
            type: changeType,
            newPlan: subscriptionData.items[0].price.product.name,
            amount: currentAmount / 100, // Convert cents to dollars
            interval: currentInterval,
          });
        }
      } catch (error) {
        console.error("Error parsing previous subscription data:", error);
      }
    }

    // Store current subscription data for next comparison
    localStorage.setItem(storageKey, JSON.stringify(subscriptionData));
  }, [subscriptionData, user?.uid]);

  // Detect subscription renewal (canceled -> active)
  useEffect(() => {
    if (!userData?.subscriptionStatus || !user?.uid) return;

    const storageKey = `prevSubscriptionStatus_${user.uid}`;
    const prevStatus = localStorage.getItem(storageKey);

    // Check if user went from canceled to active
    if (prevStatus === "canceled" && userData.subscriptionStatus === "active") {
      setShowRenewalSuccess(true);
    }

    // Only write to localStorage if value actually changed
    if (prevStatus !== userData.subscriptionStatus) {
      localStorage.setItem(storageKey, userData.subscriptionStatus);
    }
  }, [userData?.subscriptionStatus, user?.uid]);

  // Payment success detection
  useEffect(() => {
    // Show welcome dialog if:
    // 1. User has subscription
    // 2. Subscription is recent (within 48 hours)
    // 3. User hasn't dismissed it before
    if (
      subscriptionData &&
      isRecentSubscription(subscriptionData) &&
      !userData?.hideSubscriptionWelcome
    ) {
      setShowPaymentSuccess(true);
      // Auto-dismiss onboarding dialog for new subscribers
      updateUserField("hideOnboardingDialog", true);
    }
  }, [subscriptionData, userData?.hideSubscriptionWelcome, userData?.role]);

  // Reset banner dismissals when status changes
  useEffect(() => {
    // Reset trial banner dismissal when trial status changes
    if (!hasActiveTrial && userData?.hideTrialBanner) {
      updateUserField("hideTrialBanner", false);
    }
    // Reset expired trial banner dismissal when no longer expired
    if (!trialExpired && userData?.hideExpiredTrialBanner) {
      updateUserField("hideExpiredTrialBanner", false);
    }
    // Reset lapsed subscription banner dismissal when no longer lapsed
    if (!hasLapsedSubscription && userData?.hideLapsedSubscriptionBanner) {
      updateUserField("hideLapsedSubscriptionBanner", false);
    }
  }, [
    hasActiveTrial,
    trialExpired,
    hasLapsedSubscription,
    userData?.hideTrialBanner,
    userData?.hideExpiredTrialBanner,
    userData?.hideLapsedSubscriptionBanner,
  ]);

  const handleTrialDismiss = () => {
    updateUserField("hideTrialBanner", true);
  };

  const handleExpiredDismiss = () => {
    updateUserField("hideExpiredTrialBanner", true);
  };

  const handleUpgradeClick = () => {
    navigate("/dashboard/upgrade");
  };

  const handlePaymentSuccessClose = () => {
    setShowPaymentSuccess(false);
    updateUserField("hideSubscriptionWelcome", true);
  };

  const handleLapsedDismiss = () => {
    updateUserField("hideLapsedSubscriptionBanner", true);
  };

  // Show renewal success banner (highest priority)
  if (showRenewalSuccess) {
    return (
      <Alert
        severity="success"
        icon={<CheckCircleOutlineRounded />}
        sx={{
          position: "fixed",
          top: 0,
          left: { xs: 0, sm: "300px" },
          right: 0,
          width: { xs: "100%", sm: "calc(100% - 300px)" },
          zIndex: 1300,
          borderRadius: 0,
        }}
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={() => setShowRenewalSuccess(false)}
          >
            <CloseRounded fontSize="inherit" />
          </IconButton>
        }
      >
        <strong>Welcome back!</strong> Your subscription has been renewed
        successfully.
      </Alert>
    );
  }

  // Show subscription change notification (second highest priority)
  if (showSubscriptionChange && !showRenewalSuccess) {
    const { type, newPlan, amount, interval } = showSubscriptionChange;

    return (
      <Alert
        severity="success"
        icon={<CheckCircleOutlineRounded />}
        sx={{
          position: "fixed",
          top: 0,
          left: { xs: 0, sm: "300px" },
          right: 0,
          width: { xs: "100%", sm: "calc(100% - 300px)" },
          zIndex: 1300,
          borderRadius: 0,
        }}
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={() => setShowSubscriptionChange(null)}
          >
            <CloseRounded fontSize="inherit" />
          </IconButton>
        }
      >
        Your subscription has been updated successfully.
      </Alert>
    );
  }

  // Show daily pass banner (third highest priority)
  if (hasActiveDailyPass && !userData?.hideDailyPassBanner) {
    return (
      <Alert
        severity="success"
        icon={<CheckCircleOutlineRounded />}
        sx={{
          position: "fixed",
          top: 0,
          left: { xs: 0, sm: "300px" },
          right: 0,
          width: { xs: "100%", sm: "calc(100% - 300px)" },
          zIndex: 1300,
          borderRadius: 0,
        }}
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={() => updateUserField("hideDailyPassBanner", true)}
          >
            <CloseRounded fontSize="inherit" />
          </IconButton>
        }
      >
        <strong>Daily Pass Active.</strong> Enjoy unlimited access to all
        medical tools for 3 days.
      </Alert>
    );
  }

  // Show active trial banner (fourth highest priority - overrides lapsed subscription)
  if (hasActiveTrial && !userData?.hideTrialBanner) {
    return (
      <Alert
        severity="success"
        icon={<CheckCircleOutlineRounded />}
        sx={{
          position: "fixed",
          top: 0,
          left: { xs: 0, sm: "300px" }, // Account for sidebar on desktop
          right: 0,
          width: { xs: "100%", sm: "calc(100% - 300px)" },
          zIndex: 1300,
          borderRadius: 0,
        }}
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={handleTrialDismiss}
          >
            <CloseRounded fontSize="inherit" />
          </IconButton>
        }
      >
        <strong>Free Trial Active.</strong>{" "}
        {isFacility
          ? `Enjoy full access to CareMap tools for ${trialLengthDays} days.`
          : `Enjoy full access to all medical tools for ${trialLengthDays} days.`}
      </Alert>
    );
  }

  // Show lapsed subscription banner (fifth priority - only if no active trial/pass)
  if (
    hasLapsedSubscription &&
    !userData?.hideLapsedSubscriptionBanner &&
    !hasActiveTrial &&
    !hasActiveDailyPass
  ) {
    return (
      <Alert
        severity="error"
        icon={<ErrorOutlineRounded />}
        sx={{
          position: "fixed",
          top: 0,
          left: { xs: 0, sm: "300px" }, // Account for sidebar on desktop
          right: 0,
          width: { xs: "100%", sm: "calc(100% - 300px)" },
          zIndex: 1300,
          borderRadius: 0,
        }}
        action={
          <>
            <Button
              color="inherit"
              size="small"
              onClick={handleUpgradeClick}
              sx={{ mr: 1 }}
            >
              Reactivate
            </Button>
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleLapsedDismiss}
            >
              <CloseRounded fontSize="inherit" />
            </IconButton>
          </>
        }
      >
        <strong>
          Your subscription has been{" "}
          {subscriptionData?.status === "past_due"
            ? "suspended due to failed payment"
            : "cancelled"}
          .
        </strong>{" "}
        {subscriptionData?.status === "past_due"
          ? "Please update your payment method to restore access."
          : "Please choose a new plan to resubscribe."}
      </Alert>
    );
  }

  // Show expired trial banner
  if (trialExpired && !userData?.hideExpiredTrialBanner) {
    return (
      <Alert
        severity="error"
        icon={<ErrorOutlineRounded />}
        sx={{
          position: "fixed",
          top: 0,
          left: { xs: 0, sm: "300px" }, // Account for sidebar on desktop
          right: 0,
          width: { xs: "100%", sm: "calc(100% - 300px)" },
          zIndex: 1300,
          borderRadius: 0,
        }}
        action={
          <>
            <Button
              color="inherit"
              size="small"
              onClick={handleUpgradeClick}
              sx={{ mr: 1 }}
            >
              Upgrade
            </Button>
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleExpiredDismiss}
            >
              <CloseRounded fontSize="inherit" />
            </IconButton>
          </>
        }
      >
        <strong>Your {trialLabel.toLowerCase()} has expired.</strong>{" "}
        {isFacility
          ? "Please upgrade to keep your CareMap Plus workflows running."
          : "Please upgrade to get unlimited access to Medical SuperIntelligence."}
      </Alert>
    );
  }

  // Get seat count from subscription for admin
  const seatCount = subscriptionData?.items?.[0]?.quantity || 1;

  return (
    <>
      {userData?.role === "admin" ? (
        <AdminWelcomeDialog
          open={showPaymentSuccess}
          onClose={handlePaymentSuccessClose}
          organization={organization}
          seatCount={seatCount}
        />
      ) : (
      <SubscriberWelcomeDialog
        open={showPaymentSuccess}
        onClose={handlePaymentSuccessClose}
        userData={userData}
      />
      )}
    </>
  );
};

export default StatusBanner;
