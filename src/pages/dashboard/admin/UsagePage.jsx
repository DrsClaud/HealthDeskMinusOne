import React, { useContext } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  LinearProgress,
  Chip,
  Avatar,
} from "@mui/material";
import { InsightsRounded } from "@mui/icons-material";
import DashboardPageHeader from "components/common/DashboardPageHeader";
import { AuthContext } from "context/Auth";
import { formatDistanceToNowStrict, startOfMonth, addMonths } from "date-fns";

// Token limit per seat (can be adjusted later)
const TOKENS_PER_SEAT = 500000;

/**
 * UsagePage - Organization-wide usage tracking for ChartMind Managers
 */
const UsagePage = () => {
  const { organization, organizationMembers, userData } =
    useContext(AuthContext);

  // Calculate organization usage stats
  const seatCount = organization?.seats?.total || 0;
  const tokenLimit = seatCount * TOKENS_PER_SEAT;
  const tokensUsed = organization?.tokensUsedThisMonth || 0;
  const tokenPercentage =
    tokenLimit === 0 ? 0 : Math.min((tokensUsed / tokenLimit) * 100, 100);

  // Format token numbers for display
  const formatTokens = (tokens) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${Math.round(tokens / 1000)}K`;
    }
    return tokens.toLocaleString();
  };

  // Get progress bar color based on percentage
  const getProgressColor = (percentage) => {
    if (percentage < 50) return "primary";
    if (percentage < 75) return "warning";
    return "error";
  };

  // Calculate next reset date
  const getNextResetDate = () => {
    const now = new Date();
    const nextMonthStart = startOfMonth(addMonths(now, 1));
    return formatDistanceToNowStrict(nextMonthStart, { addSuffix: true });
  };

  const nextReset = getNextResetDate();

  return (
    <>
      <DashboardPageHeader
        title="Usage"
        subtitle="Monitor your organization's monthly token usage across all team members."
      />

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
              <InsightsRounded fontSize="large" color="primary" />
            </Avatar>
          </Grid>

          <Grid item xs={12} md={7}>
            <Typography variant="h6" sx={{ mt: { xs: 1, md: 0 } }}>
              Organization Usage
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track monthly usage across all {seatCount} seat
              {seatCount === 1 ? "" : "s"}.
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
              label={`${seatCount} Seat${seatCount === 1 ? "" : "s"}`}
              color="primary"
              variant="outlined"
            />
          </Grid>

          {/* Token Usage - offset by 1 column to align with text */}
          <Grid item xs={12} md={11} sx={{ ml: { xs: 0, md: "auto" } }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="body1" fontWeight="medium">
                Monthly Capacity ({formatTokens(tokenLimit)} tokens)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.floor(tokenPercentage)}% used
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={tokenPercentage}
              color={getProgressColor(tokenPercentage)}
              sx={{ height: 8, borderRadius: 4, bgcolor: "grey.100" }}
            />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: 0.5,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {tokensUsed.toLocaleString()} tokens used
              </Typography>
              {nextReset && (
                <Typography variant="caption" color="text.secondary">
                  Resets {nextReset}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Team Members Usage Breakdown */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Team Members
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="h4" color="primary.main" fontWeight={600}>
                {organizationMembers?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Members
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="h4" color="primary.main" fontWeight={600}>
                {seatCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Seats
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="h4" color="primary.main" fontWeight={600}>
                {formatTokens(TOKENS_PER_SEAT)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tokens per Seat
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography
                variant="h4"
                color={
                  tokenPercentage >= 75
                    ? "error.main"
                    : tokenPercentage >= 50
                    ? "warning.main"
                    : "primary.main"
                }
                fontWeight={600}
              >
                {Math.floor(tokenPercentage)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Capacity Used
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </>
  );
};

export default UsagePage;


