import React from "react";
import { ReactComponent as SeatIcon } from "assets/images/chair.svg";
import { ReactComponent as SeatFilledIcon } from "assets/images/chair-filled.svg";
import { Box, useTheme, alpha, Typography } from "@mui/material";
import { AccessTimeRounded } from "@mui/icons-material";

const SeatData = ({ waitTime, hideStatus = false }) => {
  const options = [30, 60, 120, 150, 180, 240, 360];
  const theme = useTheme();

  // Custom color that's between text.primary and text.secondary
  const midToneColor = alpha(theme.palette.text.primary, 0.75);

  // SVG Props for proper sizing and display
  const svgProps = {
    width: 44,
    height: 44,
    viewBox: "0 0 85 118",
    preserveAspectRatio: "xMidYMid meet",
  };

  // Helper function to determine if a seat should be filled
  const shouldBeFilled = (option) => {
    return option <= waitTime;
  };

  // Determine current occupancy state based on the original Legend labels
  const getCurrentState = () => {
    if (waitTime <= 30) return "empty";
    if (waitTime <= 120) return "half-full";
    if (waitTime <= 240) return "full";
    return "overflowing";
  };

  const currentState = getCurrentState();

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "420px",
        margin: "auto",
        mb: 0.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          width: "100%",
          gap: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={{ display: "flex" }}>
          {options.map((option, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                alignItems: "center",
                mx: 0.2,
              }}
            >
              {shouldBeFilled(option) ? (
                <SeatFilledIcon
                  {...svgProps}
                  style={{
                    fill: theme.palette.primary.main,
                  }}
                />
              ) : (
                <SeatIcon
                  {...svgProps}
                  style={{
                    fill: midToneColor,
                  }}
                />
              )}
            </Box>
          ))}
        </Box>
        <AccessTimeRounded sx={{ width: 44, ml: 1 }} />
      </Box>

      {!hideStatus && (
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 500,
              color: "grey.600",
              letterSpacing: 0.5,
            }}
          >
            Currently {currentState}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SeatData;
