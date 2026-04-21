import {
  LinearProgress,
  Box,
  Grid,
  Typography,
  Chip,
  Paper,
} from "@mui/material";
import { InsightsRounded, ChevronRightRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useRateLimit } from "hooks/useRateLimit";
import { useAuth } from "hooks/useAuth";
import { LoadingButton } from "@mui/lab";
import { getTrialLabelForRole } from "constants/trials";

const UsageDisplay = ({ userData = {}, subscription }) => {
  const navigate = useNavigate();
  const { hasActiveTrial, hasActiveDailyPass, subscriptionTier, organization } = useAuth();
  const rateLimit = useRateLimit(userData, subscription, organization);

  // Check if we're in a debug environment (staging or sandbox)
  const isDebugEnv = ["staging", "sandbox"].includes(
    process.env.REACT_APP_ENVIRONMENT
  );

  // Determine user status for display
  const getUserStatus = () => {
    if (hasActiveDailyPass) {
      const tier = userData?.subscriptionTier || "Medium";
      return `${tier.charAt(0).toUpperCase() + tier.slice(1)} Daily Pass`;
    }
    if (hasActiveTrial) return getTrialLabelForRole(userData?.role);
    if (subscription) {
      const tier = subscriptionTier;

      if (tier) {
        return `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`;
      }
      return "Subscribed"; // fallback for users without tier data
    }
    return "Free Plan";
  };

  const getUserStatusColor = () => {
    if (hasActiveTrial || hasActiveDailyPass || subscription) return "primary";
    return "default";
  };

  // Format token limit for display
  const formatTokenLimit = (limit) => {
    if (limit >= 1000000) {
      return `${(limit / 1000000).toFixed(1)}M`;
    }
    if (limit >= 1000) {
      return `${limit / 1000}K`;
    }
    return limit.toString();
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
          <InsightsRounded fontSize="large" color="primary" />
        </Grid>

        <Grid item xs={12} md={7}>
          <Typography variant="h6" sx={{ mt: { xs: 1, md: 0 } }}>
            Usage
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track your monthly usage and limits.
          </Typography>
        </Grid>
        <Grid
          item
          xs={12}
          md={4}
          sx={{
            my: 2,
            display: "flex",
            justifyContent: { xs: "flex-start", md: "flex-end" },
          }}
        >
          <Chip
            label={getUserStatus()}
            color={getUserStatusColor()}
            variant="outlined"
          />
        </Grid>

        {/* Token Usage - offset by 1 column to align with text */}
        <Grid item xs={12} md={11} sx={{ ml: { xs: 0, md: "auto" } }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body1" fontWeight="medium">
              {isDebugEnv
                ? `Tokens (${rateLimit.tokensUsed?.toLocaleString()}/${rateLimit.tokenLimit?.toLocaleString()})`
                : rateLimit.isOrgProfessional
                ? `Organization Token Pool (${formatTokenLimit(
                    rateLimit.tokenLimit
                  )} tokens shared)`
                : hasActiveTrial
                ? `Trial Capacity (${formatTokenLimit(
                    rateLimit.tokenLimit
                  )} tokens)`
                : `Monthly Capacity${
                    !rateLimit.isFreeTier
                      ? ` (${formatTokenLimit(rateLimit.tokenLimit)} tokens)`
                      : ""
                  }`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.floor(rateLimit.tokenPercentage)}% used
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={rateLimit.tokenPercentage}
            color={rateLimit.getProgressColor(rateLimit.tokenPercentage)}
            sx={{ height: 8, borderRadius: 4, bgcolor: "grey.100" }}
          />
          {rateLimit.nextReset &&
            rateLimit.tokenPercentage > rateLimit.messagePercentage && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                Resets {rateLimit.nextReset}
                {rateLimit.isOrgProfessional && " (shared across all team members)"}
              </Typography>
            )}

          {/* Message Usage - only for free tier */}
          {rateLimit.isFreeTier && rateLimit.tokenPercentage < 100 && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body1" fontWeight="medium">
                  Daily Messages ({rateLimit.messageCount}/
                  {rateLimit.messageLimit})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Math.floor(rateLimit.messagePercentage)}% used
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={rateLimit.messagePercentage}
                color={rateLimit.getProgressColor(rateLimit.messagePercentage)}
                sx={{ height: 8, borderRadius: 4, bgcolor: "grey.100" }}
              />
              {rateLimit.nextReset && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  Resets {rateLimit.nextReset}
                </Typography>
              )}
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Upgrade CTA for free users */}
      {rateLimit.isFreeTier && (
        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <LoadingButton
            variant="outlined"
            endIcon={<ChevronRightRounded />}
            onClick={() => navigate("/dashboard/upgrade")}
            sx={{ textTransform: "none" }}
          >
            {rateLimit.tokenPercentage >= 100
              ? "Upgrade for more monthly capacity"
              : "Upgrade for unlimited daily messages"}
          </LoadingButton>
        </Box>
      )}

      {/* Upgrade CTA for paid users approaching limits */}
      {!rateLimit.isFreeTier &&
        rateLimit.tokenPercentage >= 80 &&
        subscriptionTier !== "large" &&
        !hasActiveTrial && (
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <LoadingButton
              variant="outlined"
              endIcon={<ChevronRightRounded />}
              onClick={() => navigate("/dashboard/upgrade")}
              sx={{ textTransform: "none" }}
            >
              Upgrade to {subscriptionTier === "small" ? "Medium" : "Large"} for
              more capacity
            </LoadingButton>
          </Box>
        )}
    </Paper>
  );
};

export default UsageDisplay;
