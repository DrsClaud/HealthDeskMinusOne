import React, { useState } from "react";
import { Paper, Box, Typography, Button } from "@mui/material";
import { ChevronRightRounded, PreviewRounded } from "@mui/icons-material";
import FeaturedAd from "components/map/FeaturedAd";
import MarketingSettings from "components/dashboard/advertising/MarketingSettings";

const AdPreview = ({ location, userData }) => {
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [submitted, setSubmitted] = useState("");

  // Create a preview ad object from the location data
  const previewAd = {
    title:
      location?.branding?.title || location?.group || "Your Advertising Title",
    logo: location?.branding?.logo || "",
    website: location?.branding?.website || "",
    tagline: location?.branding?.tagline || "Your tagline will appear here",
    facilityType: location?.type || "",
    coordinates: location?.coordinates || null,
  };

  return (
    <>
      <Paper
        sx={{
          mt: 1,
          mb: 3,
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 2, pb: 3 }}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <PreviewRounded color="primary" sx={{ mr: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              Ad Preview
            </Typography>
          </Box>

          {/* Description */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This is how your ad will appear to patients searching in your
            promoted ZIP codes:
          </Typography>

          {/* Ad Preview Box */}
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: "background.default",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
            }}
          >
            <FeaturedAd ad={previewAd} />
          </Box>

          {/* Action Section */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              Want to customize how your ad appears?
            </Typography>
            <Button
              variant="outlined"
              endIcon={<ChevronRightRounded />}
              onClick={() => setMarketingOpen(true)}
              sx={{ textTransform: "none" }}
            >
              Edit Advertising Profile
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Marketing Settings Dialog */}
      {location && (
        <MarketingSettings
          user={userData}
          data={userData}
          location={location}
          visible={marketingOpen}
          close={() => setMarketingOpen(false)}
          setSubmitted={setSubmitted}
        />
      )}
    </>
  );
};

export default AdPreview;
