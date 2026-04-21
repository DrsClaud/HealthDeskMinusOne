import React, { memo } from "react";
import PropTypes from "prop-types";
import { Box, Grid, Paper, Typography } from "@mui/material";

const leftPanelStyles = (background, left, facility) => ({
  height: "100vh",
  backgroundImage: `url(${background})`,
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
  backgroundPosition: left ? "top left" : "top center",
  minHeight: "8rem",
  p: { xs: 0, md: 8 },
  textAlign: "center",
  display: "flex",
  justifyContent: facility ? { xs: "center", md: "flex-end" } : "center",
  alignItems: facility ? { xs: "center", md: "flex-start" } : "center",
  position: "fixed",
  width: { sm: "33.333%", md: "58.333%" },
  left: 0,
  top: 0,
  zIndex: 0,
});

const rightPanelStyles = {
  my: 8,
  mx: 3,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const contentStyles = {
  maxWidth: "40rem",
  width: "100%",
};

const AuthWrapper = memo(
  ({ background, title = "", children, left = false, facility = false }) => (
    <>
      <style>
        {`
        .grecaptcha-badge {
          z-index: 9999 !important;
          position: fixed !important;
        }
        `}
      </style>

      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        {/* Fixed left panel */}
        <Box sx={leftPanelStyles(background, left, facility)}>
          {title && (
            <Typography variant="h3" component="h1" color="white">
              {title}
            </Typography>
          )}
        </Box>

        {/* Scrollable content area with shadow */}
        <Box
          component={Paper}
          elevation={6}
          square
          sx={{
            width: "100%",
            marginLeft: { xs: 0, sm: "33.333%", md: "58.333%" },
            minHeight: "100vh",
            position: "relative",
            zIndex: 1,
            boxShadow: "-5px 0 5px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Box sx={rightPanelStyles}>
            <Box sx={contentStyles}>{children}</Box>
          </Box>
        </Box>
      </Box>
    </>
  )
);

AuthWrapper.propTypes = {
  background: PropTypes.string.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  left: PropTypes.bool,
  facility: PropTypes.bool,
};

AuthWrapper.displayName = "AuthWrapper";

export default AuthWrapper;
