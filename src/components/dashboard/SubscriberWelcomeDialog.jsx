import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon, CheckCircleRounded } from "@mui/icons-material";

const SubscriberWelcomeDialog = ({ open, onClose, userData }) => {
  const getMembershipName = (role) => {
    if (role === "facility") {
      return "CareMap Plus";
    }
    return role === "patient" || role === "p4"
      ? "HealthDesk Member"
      : "HealthDesk Plus";
  };

  const getWelcomeMessage = (role) => {
    const membershipName = getMembershipName(role);
    if (role === "facility") {
      return `Thanks for upgrading to ${membershipName}! Your facility now has access to all dashboard features.`;
    }
    return `Thanks for becoming a ${membershipName}! You now have unlimited access to Medical SuperIntelligence.`;
  };

  const getFeatures = (role) => {
    if (role === "facility") {
      return [
        "Schedule your estimated waiting room volume days and weeks in advance",
        // TODO: Re-enable once Twilio BAA is in place
        // "Manage your virtual queue",
        // "Send your patients a text when you're ready to see them",
      ];
    }

    if (role === "patient" || role === "p4") {
      return [
        "Unlimited daily messages",
        "Ad-free experience",
        "Unlimited access to Basic Medical Library",
        "Unlimited access to Advanced Medical Library",
        "Unlimited access to Virtual MD",
      ];
    }

    if (role === "professional") {
      return [
        "Unlimited daily messages",
        "Ad-free experience",
        "Unlimited access to BrainFlash",
        "Unlimited access to DeepDive",
        "Unlimited access to PeerView",
      ];
    }

    return [
      "Unlimited daily messages",
      "Ad-free experience",
      "Unlimited access to all features",
    ];
  };

  const getButtonText = (role) => {
    if (role === "facility") {
      return "Get Started with CareMap Plus";
    }
    return "Start Using Medical SuperIntelligence";
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: "hidden" },
      }}
    >
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
          zIndex: 1,
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ textAlign: "center", p: 4, pb: 2 }}>
        <Box sx={{ mb: 3 }}>
          <CheckCircleRounded
            sx={{
              fontSize: 64,
              color: "primary.main",
              mb: 2,
              display: "block",
              mx: "auto",
            }}
          />
        </Box>

        <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>
          Welcome to Your HealthDesk!
        </Typography>

        <Typography variant="h6" sx={{ mb: 4, color: "text.secondary" }}>
          {getWelcomeMessage(userData?.role)}
        </Typography>

        <Box
          sx={{
            borderRadius: 2,
            px: 3,
            pb: 1,
            mb: 2,
            textAlign: "left",
          }}
        >
          {getFeatures(userData?.role).map((feature, index) => (
            <Box
              key={index}
              sx={{ display: "flex", alignItems: "center", mb: 1 }}
            >
              <CheckCircleRounded
                sx={{ color: "primary.main", fontSize: 20, mr: 1.5 }}
              />
              <Typography variant="body1">{feature}</Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", p: 3, pt: 1 }}>
        <Button
          variant="contained"
          size="large"
          onClick={onClose}
          sx={{ px: 4, py: 1.5 }}
        >
          {getButtonText(userData?.role)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubscriberWelcomeDialog;
