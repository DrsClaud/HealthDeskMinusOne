import React, { useState } from "react";
import { Box, Grid, Typography, Avatar, Paper, Alert } from "@mui/material";
import { PaymentRounded, ChevronRightRounded } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { useNavigate } from "react-router-dom";
import capitalize from "../../../utils/helpers/capitalize";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import { useAuth } from "hooks/useAuth";
import { format, fromUnixTime } from "date-fns";

const PlanManagement = ({ subscriptionTier, loading }) => {
  const [actionLoading, setActionLoading] = useState(null);
  const { userData, subscriptionData } = useAuth();
  const navigate = useNavigate();

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
    }
  };

  const handleManageBilling = async () => {
    setActionLoading("manage_billing");
    try {
      const createPortalSession = firebase
        .functions()
        .httpsCallable("createPortalSession");

      const { data } = await createPortalSession({
        successUrl: window.location.href,
        cancelUrl: window.location.href,
        role: userData?.role,
        stripeId: userData?.stripeId,
        // No flowType = regular portal with billing history, payment methods, invoices
      });

      if (data.url) {
        window.location.assign(data.url);
      }
    } catch (error) {
      console.error("Error opening portal:", error);
      alert("Failed to open billing management. Please try again.");
    }
  };

  const handleChangePlan = () => {
    // Navigate to your upgrade page instead of portal
    navigate("/dashboard/upgrade");
  };

  const formatDate = (timestamp) => {
    // Handle Firebase timestamp objects
    return format(timestamp.toDate(), "MMMM d, yyyy");
  };

  // Get appropriate plan name and button text based on user role
  const getPlanName = () => {
    if (userData?.role === "facility") {
      // Only show "CareMap Plus" if they actually have subscription data
      return subscriptionData ? "CareMap Plus" : "Unknown Plan";
    }
    return `${capitalize(subscriptionTier || "medium")} Plan`;
  };

  const getChangePlanButtonText = () => {
    if (userData?.role === "facility") {
      return "Change Billing Cycle";
    }
    return "Change Plan";
  };

  return (
    <Paper
      sx={{
        p: 2,
        pb: 3,
        mb: 3,
        minWidth: 300,
      }}
    >
      <Grid container spacing={{ xs: 0, md: 2 }}>
        <Grid item xs={12} md={1}>
          <Avatar sx={{ bgcolor: "background.paper" }}>
            <PaymentRounded fontSize="large" color="primary" />
          </Avatar>
        </Grid>

        <Grid item xs={12} md={11}>
          <Typography variant="h6" sx={{ mt: { xs: 1, md: 0 } }}>
            Plan Management
          </Typography>
          <Typography variant="body2" gutterBottom>
            You're currently subscribed to {getPlanName()}.
          </Typography>

          {subscriptionData?.cancel_at_period_end && (
            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              Your subscription is scheduled to cancel on{" "}
              {formatDate(subscriptionData.current_period_end)}. Click "Renew
              Subscription" below to continue your access.
            </Alert>
          )}

          <Grid container gap={2} sx={{ mt: 2.5 }}>
            {!subscriptionData?.cancel_at_period_end && (
              <Grid item>
                <LoadingButton
                  variant="outlined"
                  loading={actionLoading === "change_plan"}
                  loadingPosition="end"
                  disabled={!!actionLoading}
                  endIcon={<ChevronRightRounded />}
                  onClick={handleChangePlan}
                  sx={{ textTransform: "none" }}
                >
                  {getChangePlanButtonText()}
                </LoadingButton>
              </Grid>
            )}
            <Grid item>
              <LoadingButton
                variant="outlined"
                loading={actionLoading === "manage_billing"}
                loadingPosition="end"
                disabled={!!actionLoading}
                endIcon={<ChevronRightRounded />}
                onClick={handleManageBilling}
                sx={{ textTransform: "none" }}
              >
                {subscriptionData?.cancel_at_period_end
                  ? "Renew Subscription"
                  : "Manage Billing"}
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
  );
};

export default PlanManagement;
