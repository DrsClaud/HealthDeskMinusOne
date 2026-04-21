import React from "react";
import { Box } from "@mui/material";

const PremiumWrapper = ({ children, disabled = false }) => {
  return (
    <Box
      sx={{
        position: "relative",
        ...(disabled && {
          opacity: 0.7,
          pointerEvents: "none",
          "&::after": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            zIndex: 1,
            borderRadius: 1,
          },
        }),
      }}
    >
      {children}
    </Box>
  );
};

export default PremiumWrapper;
