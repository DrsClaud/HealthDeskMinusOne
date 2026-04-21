import React from "react";
import { Box, CircularProgress } from "@mui/material";

export default ({ page, search, small = false }) => {
  // Full-page loading: centered in viewport
  if (page) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: "100dvh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          overflowX: "hidden",
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  // Search/inline loading: small, absolutely positioned
  if (search) {
    return (
      <CircularProgress
        color="primary"
        size={20}
        sx={{
          position: "absolute",
          top: "4px",
          right: "0.25em",
        }}
      />
    );
  }

  // Default: simple inline loading
  return <CircularProgress color="primary" size={small ? 30 : 48} />;
};
