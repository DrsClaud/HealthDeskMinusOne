import React from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { Schedule } from "@mui/icons-material";

/**
 * Unified CountdownCircle component for auction timers using MUI CircularProgress
 * Supports both header and individual auction row display modes
 */
const CountdownCircle = ({
  seconds,
  size = 36,
  isExtended = false,
  variant = "header", // "header", "auction", or "inline"
}) => {
  const percentage = Math.max(0, Math.min(100, (seconds / 60) * 100));

  // Color based on urgency and variant
  const getColor = () => {
    if ((variant === "auction" || variant === "inline") && isExtended) {
      // Extended auctions get special colors
      if (seconds <= 10) return "#d32f2f"; // Darker red for extended
      if (seconds <= 30) return "#f57c00"; // Darker orange for extended
      return "#1976d2"; // Darker blue for extended
    } else {
      // Normal colors for header or non-extended auctions
      if (seconds <= 10) return "#f44336"; // Red for last 10 seconds
      if (seconds <= 30) return "#ff9800"; // Orange for last 30 seconds
      return variant === "auction" ? "#4caf50" : "#2196f3"; // Green for auction, blue for header
    }
  };

  // Format time display
  const formatTime = () => {
    if (variant === "header" || variant === "inline") {
      // Header and inline show just seconds
      return seconds.toString();
    } else {
      // Auction rows show m:ss format
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
  };

  // Adjust size for extended auctions (but not for inline)
  const actualSize = variant === "auction" && isExtended ? size + 8 : size;
  const thickness =
    variant === "auction" && isExtended ? 6 : variant === "inline" ? 4 : 5;

  // Animation conditions
  const shouldPulse =
    variant === "header"
      ? seconds <= 10
      : variant === "inline"
      ? isExtended && seconds <= 15
      : isExtended && seconds <= 15;

  return (
    <Box
      sx={{
        position: "relative",
        width: actualSize,
        height: actualSize,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        animation: shouldPulse
          ? variant === "header"
            ? "headerPulse 1s infinite"
            : variant === "inline"
            ? "inlinePulse 1.2s infinite"
            : "extensionPulse 1.5s infinite"
          : "none",
        "@keyframes headerPulse": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
        "@keyframes inlinePulse": {
          "0%": { transform: "scale(1)", opacity: 1 },
          "50%": { transform: "scale(1.1)", opacity: 0.8 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        "@keyframes extensionPulse": {
          "0%": {
            transform: "scale(1)",
            boxShadow: "0 0 0 0 rgba(25, 118, 210, 0.4)",
          },
          "50%": {
            transform: "scale(1.05)",
            boxShadow: "0 0 0 8px rgba(25, 118, 210, 0.1)",
          },
          "100%": {
            transform: "scale(1)",
            boxShadow: "0 0 0 0 rgba(25, 118, 210, 0)",
          },
        },
      }}
    >
      {/* Background glow for extended auctions (not for inline) */}
      {variant === "auction" && isExtended && (
        <Box
          sx={{
            position: "absolute",
            width: actualSize + 8,
            height: actualSize + 8,
            borderRadius: "50%",
            backgroundColor: "rgba(25, 118, 210, 0.1)",
            border: "2px solid rgba(25, 118, 210, 0.2)",
            zIndex: 0,
          }}
        />
      )}

      {/* Background circle for contrast */}
      <CircularProgress
        variant="determinate"
        value={100}
        size={actualSize}
        thickness={thickness}
        sx={{
          position: "absolute",
          color:
            (variant === "auction" || variant === "inline") && isExtended
              ? "rgba(25, 118, 210, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          zIndex: 1,
        }}
      />

      {/* Progress circle */}
      <CircularProgress
        variant="determinate"
        value={percentage}
        size={actualSize}
        thickness={thickness}
        sx={{
          position: "absolute",
          color: getColor(),
          zIndex: 2,
          "& .MuiCircularProgress-circle": {
            strokeLinecap: "round",
            transition: "stroke-dasharray 0.1s linear, stroke 0.3s ease",
          },
        }}
      />

      {/* Countdown text */}
      <Typography
        variant="caption"
        sx={{
          position: "absolute",
          fontWeight: "bold",
          color: getColor(),
          fontSize:
            variant === "header"
              ? "0.6rem"
              : variant === "inline"
              ? "0.55rem"
              : isExtended
              ? "0.8rem"
              : "0.75rem",
          zIndex: 3,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {formatTime()}
      </Typography>

      {/* Extension indicator for auction variant only */}
      {variant === "auction" && isExtended && (
        <Box
          sx={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 12,
            height: 12,
            backgroundColor: "#1976d2",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 4,
            border: "2px solid white",
            boxShadow: 1,
          }}
        >
          <Schedule sx={{ fontSize: 8, color: "white" }} />
        </Box>
      )}
    </Box>
  );
};

export default CountdownCircle;
