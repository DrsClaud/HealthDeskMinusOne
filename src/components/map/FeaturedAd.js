import React from "react";
import {
  Paper,
  Box,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";

const FeaturedAd = ({ ad, onLocationClick, setFilter }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  if (!ad?.website || !ad?.logo) return null;

  const handleWebsiteClick = (e) => {
    e.stopPropagation();
    window.open(ad.website, "_blank", "noopener,noreferrer");
  };

  const handleAdClick = () => {
    console.log({ type: ad.facilityType });
    // Update filter to match the facility type if available
    if (ad.facilityType && setFilter) {
      setFilter((prev) => ({
        ...prev,
        facility: ad.facilityType,
        ...(ad.facilityType === "emergency" && { rating: 1 }),
        ...(ad.facilityType !== "emergency" && { rating: "" }),
      }));
    }

    // Move to location if coordinates are available
    if (
      ad.coordinates &&
      ad.coordinates.lat &&
      ad.coordinates.lng &&
      onLocationClick
    ) {
      console.log("Moving to coordinates:", ad.coordinates);
      onLocationClick(ad.coordinates);
    } else {
      console.log(
        "No valid coordinates for:",
        ad.title,
        "coordinates:",
        ad.coordinates
      );
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        alignItems: { xs: "flex-start", md: "center" },
        flexDirection: { xs: "column", md: "row" },
        gap: { xs: 1.5, md: 1 },
        p: 0,
        borderRadius: 1,
        cursor: "pointer",
        transition: "all 0.2s ease-in-out",
      }}
      onClick={handleAdClick}
    >
      {/* Logo */}
      <Box
        component="img"
        src={ad.logo}
        alt={ad.title || "Sponsored"}
        sx={{
          maxWidth: isDesktop ? "120px" : "80px",
          maxHeight: "28px",
          width: "auto",
          height: "auto",
          mr: 2,
          flexShrink: 0,
          objectFit: "contain",
        }}
      />

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0, mr: 1.5 }}>
        {/* Title with Sponsored label */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 0.25 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "#333",
              overflow: "hidden",
              textOverflow: "ellipsis",
              mr: 0.5,
            }}
          >
            {ad.title || "Your Facility"}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "#757575",
              fontSize: "0.75rem",
              flexShrink: 0,
              fontWeight: 500,
            }}
          >
            • Sponsored
          </Typography>
        </Box>

        {/* Tagline */}
        {ad.tagline && (
          <Typography
            variant="body"
            sx={{
              fontSize: "0.8125rem",
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {ad.tagline}
          </Typography>
        )}
      </Box>

      {/* Website Button */}
      <Button
        variant="outlined"
        size="small"
        color="primary"
        sx={{
          fontSize: "0.75rem",
          fontWeight: 600,
          px: 2,
          py: 0.5,
          minHeight: 30,
          textTransform: "none",
          flexShrink: 0,
        }}
        onClick={handleWebsiteClick}
      >
        Visit Site
      </Button>
    </Paper>
  );
};

export default FeaturedAd;
