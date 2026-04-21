import { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "context/Auth";
import firebaseApp from "services/firebase";

// Helper function to convert Firestore timestamp to Date
const toDate = (timestamp) => {
  if (!timestamp) return null;
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dbError, setDbError] = useState(null);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const {
    user,
    subscription, // This is actually the user ROLE (patient, facility, etc.) - confusing naming!
    subscriptionData, // This is the actual Stripe subscription object with status
    tokenClaims,
    isGlobalAdmin,
    userData,
    userLoading,
    logout,
    listings,
    invoices,
    // Medication management
    medications,
    reminderStatuses,
    medicationsLoading,
    addMedication,
    updateMedication,
    deleteMedication,
    refreshReminderStatuses,
    loadMedications,

    // Tracking data management
    trackingData,
    loadTrackingData,
    clearTrackingData,
    forceResetTrackingData,

    // Organization data (for admin users)
    organization,
    organizationMembers,
    organizationInvitations,
    organizationLoading,
    refreshOrganizationTeamData,
  } = context;

  const isAuthenticated = useMemo(() => {
    return user !== null && !userLoading;
  }, [user, userLoading]);

  const isVerified = useMemo(() => {
    return isAuthenticated && user?.emailVerified;
  }, [isAuthenticated, user]);

  const hasRole = useMemo(() => {
    return isVerified && userData?.role;
  }, [isVerified, userData]);

  const isRegionalAdmin = useMemo(
    () => userData?.role === "regional_admin",
    [userData?.role],
  );

  const hasValidSubscription = useMemo(() => {
    if (isGlobalAdmin || isRegionalAdmin) {
      return true;
    }
    // Simple trial check - just date comparison
    const hasActiveTrial =
      userData?.trialExpiresAt && toDate(userData.trialExpiresAt) > new Date();

    // Check if subscription exists and has active status
    const hasActiveSubscription =
      subscriptionData && subscriptionData.status === "active";

    // Check if daily pass is active
    const hasActiveDailyPass =
      userData?.dailyPassExpiresAt &&
      new Date(userData.dailyPassExpiresAt) > new Date();

    return (
      hasRole && (hasActiveTrial || hasActiveSubscription || hasActiveDailyPass)
    );
  }, [isGlobalAdmin, isRegionalAdmin, hasRole, subscriptionData, userData]);

  const hasActiveTrial = useMemo(() => {
    if (!userData?.trialExpiresAt) return false;
    return toDate(userData.trialExpiresAt) > new Date();
  }, [userData?.trialExpiresAt]);

  // Check if subscription exists and is active
  const hasActiveSubscription = useMemo(() => {
    return subscriptionData && subscriptionData.status === "active";
  }, [subscriptionData]);

  // Check if subscription is cancelled or past due
  const hasLapsedSubscription = useMemo(() => {
    return (
      subscriptionData &&
      ["canceled", "past_due", "unpaid"].includes(subscriptionData.status)
    );
  }, [subscriptionData]);

  const canStartTrial = useMemo(() => {
    if (isGlobalAdmin || isRegionalAdmin) {
      return false;
    }
    return (
      hasRole &&
      ["patient", "professional", "facility"].includes(userData?.role) &&
      !userData?.hasUsedTrial &&
      !hasActiveSubscription
    );
  }, [
    isGlobalAdmin,
    isRegionalAdmin,
    hasRole,
    userData?.role,
    userData?.hasUsedTrial,
    hasActiveSubscription,
  ]);

  const trialExpired = useMemo(() => {
    // Only true if trial was used, no active trial, NO subscription, and trial wasn't consumed by upgrade
    return (
      userData?.hasUsedTrial &&
      !hasActiveTrial &&
      !subscriptionData &&
      !userData?.trialConsumedByUpgrade
    );
  }, [
    userData?.hasUsedTrial,
    hasActiveTrial,
    subscriptionData,
    userData?.trialConsumedByUpgrade,
  ]);

  const hasActiveDailyPass = useMemo(() => {
    return (
      userData?.dailyPassExpiresAt &&
      new Date(userData.dailyPassExpiresAt) > new Date()
    );
  }, [userData?.dailyPassExpiresAt]);

  const activeSubscriptionRole = useMemo(() => {
    if (!isVerified) return undefined;

    // Check for active trial first
    if (hasActiveTrial) {
      return userData?.role;
    }

    // Check for daily pass
    if (hasActiveDailyPass) {
      return userData?.role;
    }

    // Then check for active stripe subscription
    if (hasActiveSubscription) {
      return userData?.role;
    }

    // No valid subscription found
    return undefined;
  }, [
    isVerified,
    hasActiveTrial,
    hasActiveDailyPass,
    hasActiveSubscription,
    userData?.role,
  ]);

  const canUseFreeTrial = useMemo(() => {
    return subscription === "facility" && !userData?.hasUsedFreeTrial;
  }, [subscription, userData]);

  const formattedZipSubscriptions = useMemo(() => {
    if (!listings) return {};

    const formatted = {};
    Object.entries(listings).forEach(([zipCode, listing]) => {
      if (listing.type === "featured") {
        formatted[zipCode] = {
          ...listing,
          // Ensure amount_paid is properly formatted as a number
          amount_paid: listing.amount_paid
            ? typeof listing.amount_paid === "string"
              ? parseInt(listing.amount_paid, 10)
              : listing.amount_paid
            : 0,
          // Ensure status is a string
          status: listing.status || "pending",
        };
      }
    });
    return formatted;
  }, [listings]);

  const formattedZipPromotions = useMemo(() => {
    if (!listings) return {};

    const formatted = {};
    Object.entries(listings).forEach(([zipCode, listing]) => {
      if (listing.type === "promotion") {
        formatted[zipCode] = {
          ...listing,
          status: listing.status || "pending",
          active: listing.active || false,
        };
      }
    });
    return formatted;
  }, [listings]);

  const resendEmail = async () => {
    setLoading(true);
    setDbError(null);

    try {
      await user.sendEmailVerification();
      setSubmitted(true);
    } catch (error) {
      setDbError(error.message);
      console.error("Email verification error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setDbError(null);
      setSubmitted(false);
    }
  }, [user]);

  const pendingInvoice = useMemo(() => {
    return invoices?.find((inv) => inv.status === "open");
  }, [invoices]);

  // Convenience getter for organization ID (used by AI workflows)
  const organizationId = useMemo(() => {
    return userData?.organizationId || null;
  }, [userData?.organizationId]);

  return {
    // User state
    user,
    userData,
    subscription,
    subscriptionData,
    tokenClaims,
    isGlobalAdmin,
    isRegionalAdmin,
    subscriptionTier: userData?.subscriptionTier, // Works for both subscriptions and daily passes
    userLoading,
    zipSubscriptions: formattedZipSubscriptions,
    zipPromotions: formattedZipPromotions,

    // Verification state
    loading,
    submitted,
    dbError,

    // Computed state
    isAuthenticated,
    isVerified,
    hasRole,
    hasValidSubscription,
    hasActiveDailyPass,
    hasActiveTrial,
    hasActiveSubscription,
    hasLapsedSubscription,
    canStartTrial,
    trialExpired,
    activeSubscriptionRole,
    canUseFreeTrial,

    // Methods
    resendEmail,
    logout,

    // Additional state
    invoices,
    pendingInvoice,

    // Medication management
    medications,
    reminderStatuses,
    medicationsLoading,
    addMedication,
    updateMedication,
    deleteMedication,
    refreshReminderStatuses,
    loadMedications,

    // Tracking data management
    trackingData,
    loadTrackingData,
    clearTrackingData,
    forceResetTrackingData,

    // Organization data (for admin users)
    organization,
    organizationMembers,
    organizationInvitations,
    organizationLoading,
    refreshOrganizationTeamData,
    organizationId, // Convenience getter for AI workflows
  };
};
