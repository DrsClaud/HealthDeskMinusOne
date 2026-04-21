import React from "react";
import { Box, Typography } from "@mui/material";
import { Check, Close } from "@mui/icons-material";
import { passwordRequirements } from "utils/passwordValidation";

const STRENGTH_COLORS = [
  "#f44336",
  "#f44336",
  "#ff9800",
  "#ffc107",
  "#8bc34a",
  "#4caf50",
];

const PasswordRequirements = ({ value = "", sx = {} }) => {
  const hasInput = value.length > 0;
  const metCount = passwordRequirements.filter(({ test }) =>
    test(value),
  ).length;
  const total = passwordRequirements.length;
  const barColor = STRENGTH_COLORS[metCount];
  const barWidth = hasInput ? (metCount / total) * 100 : 0;

  return (
    <Box sx={{ ...sx }}>
      {/* Strength bar */}
      <Box
        sx={{
          height: 4,
          borderRadius: 2,
          bgcolor: "grey.200",
          overflow: "hidden",
          mb: 1.5,
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${barWidth}%`,
            bgcolor: barColor,
            borderRadius: 2,
            transition: "width 0.25s ease, background-color 0.25s ease",
          }}
        />
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 1 }}
      >
        Your password must meet the following requirements.
      </Typography>

      {/* Requirements list */}
      {passwordRequirements.map(({ label, test }) => {
        const met = hasInput && test(value);
        const unmet = hasInput && !test(value);
        return (
          <Box
            key={label}
            sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}
          >
            {met ? (
              <Check
                sx={{ fontSize: 13, color: "success.main", flexShrink: 0 }}
              />
            ) : (
              <Close
                sx={{
                  fontSize: 13,
                  color: unmet ? "error.main" : "text.disabled",
                  flexShrink: 0,
                }}
              />
            )}
            <Typography
              variant="caption"
              color={
                met ? "success.main" : unmet ? "error.main" : "text.secondary"
              }
            >
              {label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default PasswordRequirements;
