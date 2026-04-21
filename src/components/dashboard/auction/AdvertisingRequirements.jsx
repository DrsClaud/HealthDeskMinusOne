import React, { useState } from "react";
import { Box, Typography, Paper, Alert, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import { CampaignRounded, ChevronRightRounded, CheckCircle, RadioButtonUnchecked } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import MarketingSettings from "components/dashboard/advertising/MarketingSettings";
import AccountSettings from "components/dashboard/AccountSettings";
import { useAuth } from "hooks/useAuth";

const AdvertisingRequirements = ({ location, userData }) => {
  const { user } = useAuth();
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [submitted, setSubmitted] = useState("");

  // Individual requirement checks
  const hasLogo = !!location?.branding?.logo;
  const hasWebsite = !!location?.branding?.website;
  const hasGroup = !!location?.group;
  const hasEmail = !!userData?.email;
  // Email is only verified if Firebase Auth HAS an email AND it's marked verified
  // (phone auth users have emailVerified=true but email=null, which doesn't count)
  const hasEmailVerified = !!user?.email && !!user?.emailVerified;

  // Check if advertising profile is complete
  const hasBranding = hasLogo && hasWebsite && location?.branding?.tagline && hasGroup;

  return (
    <Box>
      {submitted && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {submitted}
        </Alert>
      )}

      <Paper
        elevation={2}
        sx={{
          mb: 3,
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <CampaignRounded color="primary" sx={{ mr: 2, fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 500 }}>
              Complete Your Advertising Setup
            </Typography>
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            To get started advertising your facility, complete the following requirements:
          </Typography>

          {/* Requirements checklist */}
          <List dense sx={{ mb: 2 }}>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {hasLogo ? <CheckCircle color="success" /> : <RadioButtonUnchecked color="disabled" />}
              </ListItemIcon>
              <ListItemText 
                primary="Upload facility logo" 
                primaryTypographyProps={{ color: hasLogo ? "text.primary" : "text.secondary" }}
              />
            </ListItem>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {hasWebsite ? <CheckCircle color="success" /> : <RadioButtonUnchecked color="disabled" />}
              </ListItemIcon>
              <ListItemText 
                primary="Add website URL" 
                primaryTypographyProps={{ color: hasWebsite ? "text.primary" : "text.secondary" }}
              />
            </ListItem>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {hasGroup ? <CheckCircle color="success" /> : <RadioButtonUnchecked color="disabled" />}
              </ListItemIcon>
              <ListItemText 
                primary="Set organization/group name" 
                primaryTypographyProps={{ color: hasGroup ? "text.primary" : "text.secondary" }}
              />
            </ListItem>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {hasEmailVerified ? <CheckCircle color="success" /> : <RadioButtonUnchecked color="disabled" />}
              </ListItemIcon>
              <ListItemText 
                primary={hasEmail ? `Verify email (${userData.email})` : "Add and verify email address"}
                primaryTypographyProps={{ color: hasEmailVerified ? "text.primary" : "text.secondary" }}
              />
            </ListItem>
          </List>

          {/* Action buttons */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <LoadingButton
              variant="contained"
              size="large"
              endIcon={<ChevronRightRounded />}
              onClick={() => setMarketingOpen(true)}
              sx={{ textTransform: "none" }}
            >
              {hasBranding
                ? "Update Advertising Profile"
                : "Complete Advertising Profile"}
            </LoadingButton>

            {/* Email button - show if no email OR email not verified */}
            {(!hasEmail || !hasEmailVerified) && (
              <LoadingButton
                variant="contained"
                size="large"
                endIcon={<ChevronRightRounded />}
                onClick={() => setAccountOpen(true)}
                sx={{ textTransform: "none" }}
              >
                {!hasEmail ? "Add Email Address" : "Verify Email Address"}
              </LoadingButton>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Settings Dialog - Only render when location is available */}
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

      {/* Account Settings Dialog for email verification */}
      <AccountSettings
        user={user}
        userData={userData}
        visible={accountOpen}
        close={() => setAccountOpen(false)}
        setSubmitted={setSubmitted}
      />
    </Box>
  );
};

export default AdvertisingRequirements;
