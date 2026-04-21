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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChatIcon from "@mui/icons-material/Chat";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import MedicalServicesRounded from "@mui/icons-material/MedicalServicesRounded";
import UpgradeIcon from "@mui/icons-material/Upgrade";
import { db } from "services/firebase";

const PatientOnboardingDialog = ({ open, onClose, userId }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleClose = () => {
    // Close the dialog immediately
    onClose();

    // Save preference in the background if needed
    if (dontShowAgain && userId) {
      db.collection("users")
        .doc(userId)
        .update({
          hideOnboardingDialog: true,
        })
        .catch((error) => {
          console.error("Error saving onboarding preference:", error);
        });
    }
  };

  const steps = [
    {
      label: "Welcome to Your HealthDesk",
      content: (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <ChatIcon color="primary" sx={{ fontSize: 64, mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 3 }}>
            Welcome to Your HealthDesk
          </Typography>
          <Typography variant="body1" paragraph>
            Medical SuperIntelligence is like having a window into a doctor's
            thought process, providing clear, reliable insights when you need
            them most.
          </Typography>
          <Typography variant="body1" paragraph>
            To get started, choose from our specialized assistants designed just
            for you.
          </Typography>
        </Box>
      ),
    },
    {
      label: "Your AI Assistant Suite",
      content: (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Three Specialized Medical Assistants
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                border: "1px solid #e0e0e0",
                borderRadius: 2,
                textAlign: "left",
              }}
            >
              <SchoolRounded
                sx={{ fontSize: 40, flexShrink: 0 }}
                color="primary"
              />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Basic Medical Library
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Learn about your body and health conditions in simple,
                  friendly language
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                border: "1px solid #e0e0e0",
                borderRadius: 2,
                textAlign: "left",
              }}
            >
              <LibraryBooksRounded
                sx={{ fontSize: 40, flexShrink: 0 }}
                color="primary"
              />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Advanced Medical Library
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Explore detailed medical concepts for deeper understanding of
                  your health
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                border: "1px solid #e0e0e0",
                borderRadius: 2,
                textAlign: "left",
              }}
            >
              <MedicalServicesRounded
                sx={{ fontSize: 40, flexShrink: 0 }}
                color="primary"
              />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Virtual MD
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Interactive medical education to explore clinical thinking
                  safely
                </Typography>
              </Box>
            </Box>
          </Box>

          <Typography
            variant="body2"
            sx={{ mt: 3, fontStyle: "italic", color: "text.secondary" }}
          >
            Access any assistant from the sidebar to get started.
          </Typography>
        </Box>
      ),
    },
    {
      label: "Upgrade Options",
      content: (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <UpgradeIcon color="primary" sx={{ fontSize: 64, mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 3 }}>
            Unlimited Access
          </Typography>
          <Typography variant="body1" paragraph>
            For unlimited access and an ad-free experience, upgrade to become a
            My HealthDesk Member.
          </Typography>
          <Typography variant="body1" paragraph>
            Invest in yourself with Medical SuperIntelligence™ and experience
            healthcare with comfort, confidence, and coherence.
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

export default PatientOnboardingDialog;
