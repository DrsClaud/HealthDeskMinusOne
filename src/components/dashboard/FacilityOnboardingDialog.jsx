import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  FormControlLabel,
  Checkbox,
  IconButton,
  MobileStepper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CampaignIcon from "@mui/icons-material/Campaign";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import QueueIcon from "@mui/icons-material/Queue";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { Link as RouterLink } from "react-router-dom";
import { db } from "services/firebase";

const FacilityOnboardingDialog = ({ open, onClose, userId, locationData }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleClose = () => {
    onClose();

    if (dontShowAgain && userId) {
      // Set session flag to prevent immediate checklist appearance
      sessionStorage.setItem("onboardingJustDismissed", "true");

      db.collection("users")
        .doc(userId)
        .update({
          hideFacilityOnboardingDialog: true,
        })
        .catch((error) => {
          console.error("Error saving onboarding preference:", error);
        });
    }
  };

  // Determine completion status of each step
  const hasCapabilities =
    locationData?.capabilities &&
    Object.values(locationData.capabilities).some((value) => value === true);

  // TODO: Re-enable hasVirtualQueue once Twilio BAA is in place
  // const hasVirtualQueue = locationData?.queueEnabled === true;

  const hasWaitTimes = locationData?.waitTimes?.length > 0;

  const completedSteps = [hasCapabilities, hasWaitTimes].filter(Boolean).length;
  const totalSteps = 2;

  const steps = [
    {
      label: "Status Board",
      content: (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <DashboardIcon color="primary" sx={{ fontSize: 64, mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 3 }}>
            Manage Your Facility Status
          </Typography>
          <Typography variant="body1" paragraph>
            With your Status Board, keep your patients informed about current
            waiting times.
          </Typography>
          <Typography variant="body1" paragraph>
            Update your waiting room status in real-time to help patients make
            informed decisions about their care options.
          </Typography>
        </Box>
      ),
    },
    {
      label: "Advertise",
      content: (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <CampaignIcon color="primary" sx={{ fontSize: 64, mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 3 }}>
            Boost Your Local Visibility
          </Typography>
          <Typography variant="body1" paragraph>
            Advertise your facility and target specific ZIP codes to reach more
            patients in your area.
          </Typography>
          <Typography variant="body1" paragraph>
            Secure premium positions in search results and the promotional
            carousel to maximize your facility's exposure to potential patients.
          </Typography>
        </Box>
      ),
    },
    {
      label: "Premium Features",
      content: (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <MedicalServicesIcon color="primary" sx={{ fontSize: 64, mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 3 }}>
            Unlock All Features
          </Typography>
          <Typography variant="body1" paragraph>
            Upgrade to CareMap Plus to access all our features and supercharge
            your facility.
          </Typography>
          <Typography
            variant="body1"
            sx={{ maxWidth: "450px", mx: "auto", mb: 2 }}
          >
            Set your current waiting room volume and schedule estimates days and
            weeks in advance.
          </Typography>
        </Box>
      ),
    },
    {
      label: "Facility Checklist",
      content: (
        <Box sx={{ py: 2 }}>
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <AssignmentIcon color="primary" sx={{ fontSize: 64, mb: 3 }} />
            <Typography variant="h5" sx={{ mb: 1 }}>
              Your Facility Checklist
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Complete these steps to prioritize your facility on the map.
            </Typography>
          </Box>

          <List sx={{ width: "100%" }}>
            <ListItem
              component={RouterLink}
              to="/dashboard/status"
              button
              sx={{
                borderRadius: 1,
                mb: 1,
                border: (theme) =>
                  `1px solid ${
                    hasWaitTimes
                      ? "rgba(76, 175, 80, 0.3)"
                      : theme.palette.divider
                  }`,
                bgcolor: hasWaitTimes
                  ? "rgba(76, 175, 80, 0.08)"
                  : "transparent",
                "&:hover": {
                  bgcolor: hasWaitTimes
                    ? "rgba(76, 175, 80, 0.15)"
                    : "rgba(0, 0, 0, 0.04)",
                },
              }}
            >
              <ListItemIcon>
                <CheckCircleOutlineIcon
                  color={hasWaitTimes ? "success" : "disabled"}
                />
              </ListItemIcon>
              <ListItemText
                primary="Update Wait Times"
                secondary="Keep your wait times current to help patients plan their visit."
              />
            </ListItem>

            <ListItem
              component={RouterLink}
              to="/dashboard/status"
              button
              sx={{
                borderRadius: 1,
                mb: 1,
                border: (theme) =>
                  `1px solid ${
                    hasCapabilities
                      ? "rgba(76, 175, 80, 0.3)"
                      : theme.palette.divider
                  }`,
                bgcolor: hasCapabilities
                  ? "rgba(76, 175, 80, 0.08)"
                  : "transparent",
                "&:hover": {
                  bgcolor: hasCapabilities
                    ? "rgba(76, 175, 80, 0.15)"
                    : "rgba(0, 0, 0, 0.04)",
                },
              }}
            >
              <ListItemIcon>
                <CheckCircleOutlineIcon
                  color={hasCapabilities ? "success" : "disabled"}
                />
              </ListItemIcon>
              <ListItemText
                primary="Update Your Capabilities"
                secondary="Complete your Status Board to let patients know what diagnostic services you offer."
              />
            </ListItem>

            {/* TODO: Re-enable once Twilio BAA is in place */}
            {/* <ListItem
              component={RouterLink}
              to="/dashboard/queue"
              button
              sx={{
                borderRadius: 1,
                border: (theme) =>
                  `1px solid ${
                    hasVirtualQueue
                      ? "rgba(76, 175, 80, 0.3)"
                      : theme.palette.divider
                  }`,
                bgcolor: hasVirtualQueue
                  ? "rgba(76, 175, 80, 0.08)"
                  : "transparent",
                "&:hover": {
                  bgcolor: hasVirtualQueue
                    ? "rgba(76, 175, 80, 0.15)"
                    : "rgba(0, 0, 0, 0.04)",
                },
              }}
            >
              <ListItemIcon>
                <CheckCircleOutlineIcon
                  color={hasVirtualQueue ? "success" : "disabled"}
                />
              </ListItemIcon>
              <ListItemText
                primary="Enable Virtual Queue"
                secondary="Allow patients to join a virtual waiting room and notify them when you're ready."
              />
            </ListItem> */}
          </List>

          <Typography
            variant="body2"
            sx={{ mt: 2, textAlign: "center", color: "text.secondary" }}
          >
            {completedSteps === totalSteps
              ? "Great job! Your facility has maximum visibility on the HealthDesk map."
              : "Completing these steps will maximize your facility's visibility on the HealthDesk map."}
          </Typography>
        </Box>
      ),
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <IconButton
        aria-label="close"
        onClick={handleClose}
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

      <DialogContent sx={{ p: 4, pb: 1 }}>
        {steps[activeStep].content}

        <MobileStepper
          variant="dots"
          steps={steps.length}
          position="static"
          activeStep={activeStep}
          sx={{
            background: "transparent",
            justifyContent: "center",
            mt: 2,
          }}
          nextButton={null}
          backButton={null}
        />
      </DialogContent>

      <DialogActions sx={{ justifyContent: "space-between", p: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
          }
          label="Don't show this again"
        />
        <Box>
          {activeStep > 0 && (
            <Button onClick={handleBack} sx={{ mr: 1 }}>
              Back
            </Button>
          )}

          {activeStep === steps.length - 1 ? (
            <Button variant="contained" onClick={handleClose}>
              Get Started
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default FacilityOnboardingDialog;
