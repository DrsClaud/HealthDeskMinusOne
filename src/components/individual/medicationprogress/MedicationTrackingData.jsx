import React from "react";
import { Box, Typography, Grid, Paper, Button } from "@mui/material";
import { Link } from "react-router-dom";
import {
  CheckCircleRounded,
  LocalFireDepartmentRounded,
  TrendingUpRounded,
  CancelRounded,
  EmojiEventsRounded,
  MedicationRounded,
  SettingsRounded,
} from "@mui/icons-material";

const MedicationTrackingData = ({
  summary,
  dataSource,
  isOverviewMode,
  showOverviewStats,
  thisWeekData = null, // { thisWeekRate, timeframeLabel }
  loading = false,
  dataProcessing = false,
}) => {
  // If still loading, don't render anything (parent will show loading spinner)
  if (loading || dataProcessing) {
    return null;
  }

  if (!summary) return null;

  // Common paper styling to DRY up the code
  const paperStyles = {
    p: 2,
    textAlign: "center",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "center",
  };

  // Overview mode stats
  if (showOverviewStats && summary.averageAdherence > 0) {
    const currentStreak = summary.currentStreak || 0;
    const longestStreak = summary.bestStreak || 0;
    const isNewRecord = currentStreak > 0 && currentStreak > longestStreak;
    const isTiedRecord = currentStreak > 0 && currentStreak === longestStreak;

    return (
      <Box sx={{ mt: 4 }}>
        <Grid container spacing={2} sx={{ mb: 3, alignItems: "stretch" }}>
          {/* Current Streak */}
          <Grid item xs={12} sm={3}>
            <Paper sx={{ ...paperStyles, bgcolor: "warning.50" }}>
              <LocalFireDepartmentRounded
                color="warning"
                sx={{ fontSize: 28, mb: 0.5 }}
              />
              <Typography variant="h6">
                {currentStreak} {currentStreak === 1 ? "day" : "days"}
              </Typography>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{
                  display: "block",
                  mb: 1,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Current Streak
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.75rem" }}
              >
                {currentStreak > 0
                  ? isNewRecord
                    ? "Amazing! You've set a new personal record!"
                    : isTiedRecord
                    ? "You're doing great. You've matched your personal best!"
                    : "Great progress! Each consistent day builds your streak."
                  : "Your streak will begin once you start taking medications consistently."}
              </Typography>
            </Paper>
          </Grid>

          {/* Longest Streak */}
          <Grid item xs={12} sm={3}>
            <Paper sx={{ ...paperStyles, bgcolor: "primary.50" }}>
              <EmojiEventsRounded
                color="primary"
                sx={{ fontSize: 28, mb: 0.5 }}
              />
              <Typography variant="h6">
                {longestStreak} {longestStreak === 1 ? "day" : "days"}
              </Typography>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{
                  display: "block",
                  mb: 1,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Longest Streak
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.75rem" }}
              >
                {longestStreak > 0
                  ? isNewRecord
                    ? "A new personal record!"
                    : "Your personal best streak. Can you surpass it?"
                  : "Your best streak will appear here once you get started."}
              </Typography>
            </Paper>
          </Grid>

          {/* Total Medications Taken */}
          <Grid item xs={12} sm={3}>
            <Paper sx={{ ...paperStyles, bgcolor: "success.50" }}>
              <MedicationRounded
                color="success"
                sx={{ fontSize: 28, mb: 0.5 }}
              />
              <Typography variant="h6">
                {summary.totalTaken}{" "}
                {summary.totalTaken === 1 ? "medication" : "medications"}
              </Typography>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{
                  display: "block",
                  mb: 1,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Medications Taken
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.75rem" }}
              >
                Every medication counts. This is how many you've taken so far.
              </Typography>
            </Paper>
          </Grid>

          {/* Weekly Progress */}
          {thisWeekData && (
            <Grid item xs={12} sm={3}>
              <Paper
                sx={{
                  ...paperStyles,
                  bgcolor:
                    thisWeekData.thisWeekRate >= 80
                      ? "success.50"
                      : thisWeekData.thisWeekRate >= 60
                      ? "warning.50"
                      : "info.50",
                }}
              >
                <TrendingUpRounded
                  color={
                    thisWeekData.thisWeekRate >= 80
                      ? "success"
                      : thisWeekData.thisWeekRate >= 60
                      ? "warning"
                      : "info"
                  }
                  sx={{ fontSize: 28, mb: 0.5 }}
                />
                <Typography variant="h6">
                  {thisWeekData.thisWeekRate}%
                </Typography>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    mb: 1,
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {thisWeekData.timeframeLabel} Adherence
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: "0.75rem" }}
                >
                  {thisWeekData.thisWeekRate >= 80
                    ? "You're doing great. Keep up the good work."
                    : thisWeekData.thisWeekRate >= 60
                    ? "Good progress! A bit more consistency will help you improve."
                    : "Every day is a new chance to build better habits."}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  }

  return null;
};

export default MedicationTrackingData;
