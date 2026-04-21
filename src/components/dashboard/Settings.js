import React, { useState, useContext, useEffect } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "context/Auth";
import { useAuth } from "hooks/useAuth";
import capitalize from "../../utils/helpers/capitalize";
import {
  Alert,
  Box,
  Typography,
  Skeleton,
  Button,
  AlertTitle,
  Link,
  Paper,
  Grid,
  Avatar,
} from "@mui/material";
import {
  LocalHospitalRounded,
  PersonRounded,
  BusinessRounded,
  ChevronRightRounded,
  PaymentRounded,
  SecurityRounded,
} from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import InfoBox from "components/common/InfoBox";
import DashboardPageHeader from "components/common/DashboardPageHeader";
import AddressSettings from "./AddressSettings";
import AccountSettings from "./AccountSettings";
import PhoneSettings from "./PhoneSettings";
import MarketingSettings from "./advertising/MarketingSettings";
import UsageDisplay from "./account/UsageDisplay";
import PlanManagement from "./account/PlanManagement";
import SeatManagementDialog from "./admin/SeatManagementDialog";
import MfaEnrollDialog from "components/auth/MfaEnrollDialog";
import useMfaStatus from "hooks/useMfaStatus";
import { shouldSkipMfaEnrollmentUi } from "utils/isDevEnvironment";
import { LocationContext } from "context/Location";
import { formatDistanceToNow } from "date-fns";
import { getTrialLabelForRole } from "constants/trials";

const Settings = () => {
  const { user, userData, subscription } = useContext(AuthContext);
  const {
    hasActiveTrial,
    hasActiveDailyPass,
    hasValidSubscription,
    hasActiveSubscription,
    subscriptionTier,
    subscriptionData,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { location } = useContext(LocationContext);

  const [loading, setLoading] = useState();
  const [submitted, setSubmitted] = useState();

  const [addressOpen, setAddressOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [seatsOpen, setSeatsOpen] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const { isEnrolled, hasTOTP, hasSMS, enrolledFactors } = useMfaStatus();

  // Admin billing info
  const seatCount = subscriptionData?.items?.[0]?.quantity || 0;
  const billingInterval =
    subscriptionData?.items?.[0]?.price?.recurring?.interval === "year"
      ? "yearly"
      : "monthly";
  const seatLabel = `${seatCount} provider seat${seatCount === 1 ? "" : "s"}`;

  // Handle URL parameters for auto-opening dialogs
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "phone") {
      setPhoneOpen(true);
      // Clear the parameter to avoid reopening on refresh
      searchParams.delete("tab");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const sendToPortal = async (loadingKey = "portal") => {
    setLoading(loadingKey);

    const functionRef = firebase
      .app()
      .functions("us-central1")
      .httpsCallable("ext-firestore-stripe-payments-createPortalLink");
    const { data } = await functionRef({
      returnUrl: window.location.href,
    });
    window.location.assign(data.url);
  };

  const handlePortalAction = async (flowType) => {
    setActionLoading(flowType);
    try {
      const createPortalSession = firebase
        .functions()
        .httpsCallable("createPortalSession");

      const { data } = await createPortalSession({
        successUrl: window.location.href,
        cancelUrl: window.location.href,
        role: userData?.role,
        stripeId: userData?.stripeId,
        flowType,
        subscriptionId: subscriptionData?.id,
      });

      if (data.url) {
        window.location.assign(data.url);
      }
    } catch (error) {
      console.error("Error opening portal:", error);
      alert("Failed to open subscription management. Please try again.");
      setActionLoading(null);
    }
  };

  const trialLabel = getTrialLabelForRole(userData?.role);
  const isFacility = userData?.role === "facility";
  const isAdmin = userData?.role === "admin";

  return (
    <Box>
      <DashboardPageHeader
        title="Settings"
        subtitle={
          <Typography>
            You're logged in as {user?.email || userData?.phone}
            {userData?.role === "facility" && location?.title ? (
              <>
                {" "}
                using the <strong>{capitalize(location.title)}</strong> facility
                account.
              </>
            ) : (
              <>.</>
            )}
          </Typography>
        }
      />

      {submitted ? (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSubmitted(null)}
        >
          {submitted}
        </Alert>
      ) : null}

      {/* Daily Pass Status Display */}
      {hasActiveDailyPass && userData?.dailyPassExpiresAt && (
        <Alert severity="info" sx={{ pt: 1, mb: 3 }}>
          <Box>
            <AlertTitle>Daily Pass Active</AlertTitle>
            Your {userData?.subscriptionTier || "Medium"} Daily Pass expires{" "}
            {formatDistanceToNow(new Date(userData.dailyPassExpiresAt), {
              addSuffix: true,
            })}
            .
          </Box>
        </Alert>
      )}

      {/* Trial Status Display */}
      {hasActiveTrial && (
        <Alert severity="success" sx={{ pt: 1, mb: 3 }}>
          <Box>
            <AlertTitle>{trialLabel} Active.</AlertTitle>
            {isFacility
              ? "Enjoying CareMap Plus? Upgrade now to keep your waiting room operations connected after the trial."
              : "Enjoying Medical SuperIntelligence? Upgrade now to continue unlimited access after your trial ends."}
            <Button
              color="inherit"
              variant="outlined"
              onClick={() => navigate("/dashboard/upgrade")}
              sx={{ mt: 2, mb: 1, display: "block" }}
            >
              Upgrade
            </Button>
          </Box>
        </Alert>
      )}

      {/* Usage Display - hide for facility and admin */}
      {userData?.role !== "facility" && userData?.role !== "admin" && (
        <UsageDisplay userData={userData} subscription={subscription} />
      )}

      {/* Plan Management for non-facilities/non-admins - Only show for users with REAL subscription (not daily pass or trial) */}
      {hasValidSubscription &&
        !hasActiveTrial &&
        !hasActiveDailyPass &&
        userData?.role !== "facility" &&
        userData?.role !== "admin" && (
          <PlanManagement
            subscriptionTier={subscriptionTier}
            loading={loading}
            onPortal={sendToPortal}
            onChangePlan={() => navigate("/dashboard/upgrade")}
          />
        )}

      {/* Admin Billing Management */}
      {isAdmin && hasActiveSubscription && (
        <Paper sx={{ p: 2, pb: 3, mb: 3, minWidth: 300 }}>
          <Grid container spacing={{ xs: 0, md: 2 }}>
            <Grid item xs={12} md={1}>
              <Avatar sx={{ bgcolor: "background.paper" }}>
                <PaymentRounded fontSize="large" color="primary" />
              </Avatar>
            </Grid>

            <Grid item xs={12} md={11}>
              <Typography variant="h6" sx={{ mt: { xs: 1, md: 0 } }}>
                Billing & Seats
              </Typography>
              <Typography variant="body2" gutterBottom>
                You have {seatLabel} on your {billingInterval} plan.
              </Typography>

              {subscriptionData?.cancel_at_period_end && (
                <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                  Your subscription is scheduled to cancel. Click "Renew
                  Subscription" below to continue your access.
                </Alert>
              )}

              <Grid container gap={2} sx={{ mt: 2.5 }}>
                {!subscriptionData?.cancel_at_period_end && (
                  <Grid item>
                    <LoadingButton
                      variant="outlined"
                      loading={actionLoading === "seats"}
                      loadingPosition="end"
                      disabled={!!actionLoading}
                      endIcon={<ChevronRightRounded />}
                      onClick={() => setSeatsOpen(true)}
                      sx={{ textTransform: "none" }}
                    >
                      Add or Remove Seats
                    </LoadingButton>
                  </Grid>
                )}
                <Grid item>
                  <LoadingButton
                    variant="outlined"
                    loading={actionLoading === "payment_method_update"}
                    loadingPosition="end"
                    disabled={!!actionLoading}
                    endIcon={<ChevronRightRounded />}
                    onClick={() => handlePortalAction("payment_method_update")}
                    sx={{ textTransform: "none" }}
                  >
                    {subscriptionData?.cancel_at_period_end
                      ? "Renew Subscription"
                      : "Change Payment Method"}
                  </LoadingButton>
                </Grid>
                {!subscriptionData?.cancel_at_period_end && (
                  <Grid item>
                    <LoadingButton
                      variant="outlined"
                      color="error"
                      loading={actionLoading === "subscription_cancel"}
                      loadingPosition="end"
                      disabled={!!actionLoading}
                      endIcon={<ChevronRightRounded />}
                      onClick={() => handlePortalAction("subscription_cancel")}
                      sx={{ textTransform: "none" }}
                    >
                      Cancel Subscription
                    </LoadingButton>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Facility Info */}
      {userData?.role === "facility" && (
        <>
          <InfoBox
            icon={
              <LocalHospitalRounded
                fontSize="large"
                sx={{ color: "#117aca" }}
              />
            }
            title="Your Facility"
            description="Manage your facility location, group settings for multi-location maps, and advertising profile."
            links={[
              {
                title: "Manage Facility & Location",
                onClick: () => setAddressOpen(true),
              },
              {
                title: "Update Your Advertising Profile",
                onClick: () => setMarketingOpen(true),
              },
            ]}
          />

          {/* Multi-Location Map URL Alert - Only show if group name is set */}
          {location?.group && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Patients can view only your {location.group} facilities at{" "}
              <Link
                href={`${window.location.origin}/map/${location.group
                  .toLowerCase()
                  .replace(/[^a-z0-9\s\-'&]/g, "")
                  .replace(/[\s'&]+/g, "-")
                  .replace(/-+/g, "-")
                  .replace(/^-|-$/g, "")}`}
                target="_blank"
                variant="body2"
              >
                {window.location.origin}/map/
                {location.group
                  .toLowerCase()
                  .replace(/[^a-z0-9\s\-'&]/g, "")
                  .replace(/[\s'&]+/g, "-")
                  .replace(/-+/g, "-")
                  .replace(/^-|-$/g, "")}
              </Link>
              .
            </Alert>
          )}

          {/* Plan Management for facilities - Only show for users with REAL subscription (not daily pass or trial) */}
          {hasValidSubscription && !hasActiveTrial && !hasActiveDailyPass && (
            <PlanManagement
              subscriptionTier={subscriptionTier}
              loading={loading}
              onPortal={sendToPortal}
              onChangePlan={() => navigate("/dashboard/upgrade")}
            />
          )}
        </>
      )}

      {/* Account Management */}
      <InfoBox
        icon={<PersonRounded fontSize="large" color="primary" />}
        title="Your Account"
        description="Manage your account settings and contact information."
        links={[
          {
            title: "Update Email",
            onClick: () => setAccountOpen(true),
          },
          {
            title: userData?.phoneVerified
              ? "Update Phone Number"
              : "Verify Phone Number",
            onClick: () => setPhoneOpen(true),
          },
        ]}
      />

      {/* Security — MFA enrollment UI omitted in dev/sandbox (sign-in MFA challenge unchanged) */}
      {!shouldSkipMfaEnrollmentUi() && (
        <InfoBox
          icon={<SecurityRounded fontSize="large" color="primary" />}
          title="Security"
          description={
            isEnrolled
              ? `Two-factor authentication is active${hasTOTP ? " via authenticator app" : hasSMS ? " via SMS" : ""}.`
              : "Protect your account and health records with two-factor authentication."
          }
          links={[
            {
              title: isEnrolled
                ? "Manage Two-Factor Authentication"
                : "Set Up Two-Factor Authentication",
              onClick: () => setMfaOpen(true),
            },
          ]}
        />
      )}

      {/* Settings Dialogs */}
      <AddressSettings
        user={user}
        data={userData}
        location={location}
        visible={addressOpen}
        close={() => setAddressOpen(false)}
        setSubmitted={setSubmitted}
      />

      <MarketingSettings
        user={user}
        data={userData}
        location={location}
        visible={marketingOpen}
        close={() => setMarketingOpen(false)}
        setSubmitted={setSubmitted}
      />

      <AccountSettings
        user={user}
        userData={userData}
        visible={accountOpen}
        close={() => setAccountOpen(false)}
        setSubmitted={setSubmitted}
      />

      <PhoneSettings
        user={user}
        userData={userData}
        visible={phoneOpen}
        close={() => setPhoneOpen(false)}
        setSubmitted={setSubmitted}
      />

      {/* Admin Seat Management Dialog */}
      <SeatManagementDialog
        open={seatsOpen}
        onClose={() => setSeatsOpen(false)}
      />

      {!shouldSkipMfaEnrollmentUi() && (
        <MfaEnrollDialog
          open={mfaOpen}
          source="settings"
          enrolledFactors={enrolledFactors}
          onClose={() => setMfaOpen(false)}
          onEnrolled={() => {
            setMfaOpen(false);
            setSubmitted(
              "Two-factor authentication has been enabled on your account.",
            );
          }}
        />
      )}
    </Box>
  );
};

export default Settings;
