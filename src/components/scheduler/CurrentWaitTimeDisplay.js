import React from "react";
import { Box, Typography, useTheme, Chip, Alert } from "@mui/material";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { ReactComponent as SeatIcon } from "assets/images/chair.svg";
import { ReactComponent as SeatFilledIcon } from "assets/images/chair-filled.svg";
import { PeopleAlt } from "@mui/icons-material";

// Helper function to get current occupancy state description
const getWaitingStateText = (waitTime) => {
  const waitTimeNum =
    typeof waitTime === "string" ? parseInt(waitTime, 10) : waitTime;

  if (waitTimeNum <= 30) return "empty";
  if (waitTimeNum <= 120) return "half-full";
  if (waitTimeNum <= 240) return "full";
  return "overflowing";
};

// Render waiting room seat indicators
const WaitingRoomSeats = ({ waitTime, primaryColor }) => {
  const theme = useTheme();

  // Map wait time to number of filled seats (out of 7)
  const getFilledSeats = (waitTime) => {
    const waitTimeNum =
      typeof waitTime === "string" ? parseInt(waitTime, 10) : waitTime;
    if (waitTimeNum <= 30) return 1;
    if (waitTimeNum <= 60) return 2;
    if (waitTimeNum <= 120) return 3;
    if (waitTimeNum <= 150) return 4;
    if (waitTimeNum <= 180) return 5;
    if (waitTimeNum <= 240) return 6;
    return 7;
  };

  // Constants for seat display
  const options = [30, 60, 120, 150, 180, 240, 360];
  const filledSeats = getFilledSeats(waitTime);
  const currentState = getWaitingStateText(waitTime);

  // SVG Props for proper sizing and display - scaled down from original
  const svgProps = {
    width: 20,
    height: 20,
    viewBox: "0 0 85 118",
    preserveAspectRatio: "xMidYMid meet",
  };

  // Use provided primaryColor or default to theme primary
  const fillColor = primaryColor || theme.palette.primary.main;

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}
    >
      <Box sx={{ display: "flex", gap: 0.25, alignItems: "center" }}>
        {options.map((_, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            {i < filledSeats ? (
              <SeatFilledIcon
                {...svgProps}
                style={{
                  fill: fillColor,
                }}
              />
            ) : (
              <SeatIcon
                {...svgProps}
                style={{
                  fill: theme.palette.grey[400],
                }}
              />
            )}
          </Box>
        ))}
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 500,
          color: "grey.600",
          letterSpacing: 0.5,
          mt: 0.5,
        }}
      >
        Currently {currentState}
      </Typography>
    </Box>
  );
};

/**
 * Component to display the current wait time status with warnings and context
 *
 * @param {Object} activeTime - The active time data
 * @param {Date} activeTime.date - The date of the active time
 * @param {number} activeTime.waitTime - The wait time in minutes
 * @param {boolean} activeTime.isManual - Whether this is a manual update (vs scheduled)
 * @param {boolean} activeTime.isUserSubmitted - Whether this time is from user submissions
 * @param {number} activeTime.userCount - Number of user submissions if isUserSubmitted is true
 * @param {string} activeTime.timeDisplay - The formatted time string
 * @param {boolean} activeTime.needsUpdate - Whether this time is outdated and needs updating
 * @param {Object} sx - Custom styles
 */
const CurrentWaitTimeDisplay = ({ activeTime, sx = {} }) => {
  const theme = useTheme();

  if (!activeTime) return null;

  const timeAgo = formatDistanceToNow(new Date(activeTime.date), {
    addSuffix: true,
  });

  const waitingStatus = getWaitingStateText(activeTime.waitTime);

  // Use theme colors for seats
  const primaryColor = theme.palette.primary.main;

  // Check if this specific active time is stale (>6 hours old)
  const hoursSinceUpdate = differenceInHours(
    new Date(),
    new Date(activeTime.date)
  );
  const isStale = hoursSinceUpdate >= 6;

  return (
    <Box sx={{ mb: 2, ...sx }}>
      {isStale && (
        <Alert
          severity="warning"
          sx={{
            mb: 2,
            "& .MuiAlert-message": {
              width: "100%",
            },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Your wait time hasn't been updated in over 6 hours.
          </Typography>
        </Alert>
      )}

      <Alert
        severity="info"
        sx={{
          "& .MuiAlert-message": {
            width: "100%",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 0 }}>
            {activeTime.isManual
              ? "Currently Showing on Map (Manual Update):"
              : activeTime.isUserSubmitted
              ? "Currently Showing on Map (User Reported):"
              : "Currently Showing on Map:"}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
              }}
            >
              {activeTime.timeDisplay}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Updated {timeAgo}
              {activeTime.isUserSubmitted && activeTime.userCount > 1 && (
                <> from {activeTime.userCount} users</>
              )}
            </Typography>
          </Box>
          <WaitingRoomSeats
            waitTime={activeTime.waitTime}
            primaryColor={primaryColor}
          />
        </Box>

        {activeTime.isUserSubmitted && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mt: 1.5,
            }}
          >
            <PeopleAlt sx={{ mr: 1, fontSize: 20 }} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
              }}
            >
              This time is based on recent patient reports.
            </Typography>
          </Box>
        )}
      </Alert>
    </Box>
  );
};

export default CurrentWaitTimeDisplay;
