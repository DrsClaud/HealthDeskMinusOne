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
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ForumIcon from "@mui/icons-material/Forum";
import { db } from "services/firebase";

const ProfessionalOnboardingDialog = ({ open, onClose, userId }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

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

  const handleDisclaimerAccept = () => {
    setDisclaimerAccepted(true);
    handleNext();
  };

  const steps = [
    {
      label: "Important Disclaimer",
      content: (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <MedicalServicesIcon color="primary" sx={{ fontSize: 64, mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 3 }}>
            Important Notice for Medical Professionals
          </Typography>
          <Typography variant="body1" paragraph sx={{ textAlign: "center" }}>
            The materials on this site are provided for general medical
            education purposes only and should not be applied rigidly or
            universally in any clinical scenario. Decisions regarding patient
            care must remain the professional responsibility of the individual
            medical practitioner, who must use clinical judgment based on the
            unique circumstances of each case.
          </Typography>
          <Typography variant="body1" paragraph sx={{ textAlign: "center" }}>
            HealthDesk Professional is intended strictly for use by medical
            professionals. Neither HealthDesk nor its representatives assume
            legal, financial, or medical liability for decisions made using, or
            based on, the information provided through its platform.
          </Typography>
          <Typography variant="body1" paragraph sx={{ textAlign: "center" }}>
            By accessing and using this site, you agree to these conditions as
            well as the full HealthDesk Terms of Use.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleDisclaimerAccept}
            sx={{ mt: 2, px: 4 }}
          >
            I Understand
          </Button>
        </Box>
      ),
      hideNavigation: true,
    },
    {
      label: "Welcome to HealthDesk Professional",
      content: (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <MedicalServicesIcon color="primary" sx={{ fontSize: 64, mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 3 }}>
            Welcome to HealthDesk Professional
          </Typography>
          <Typography variant="body1" paragraph>
            Welcome to HealthDesk Professional. We're excited to enhance your
            clinical practice.
          </Typography>
          <Typography variant="body1" paragraph>
            HealthDesk Medical SuperIntelligence™ requires just a brief clinical
            scenario input—taking seconds to complete—to deliver precise,
            relevant insights drawn from a physician-curated knowledge base.
          </Typography>
          <Typography variant="body1" paragraph>
            This fast, focused approach helps you access what's needed
            immediately, so you can stay focused on patient care.
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
              <FlashOnIcon
                sx={{ fontSize: 40, flexShrink: 0 }}
                color="primary"
              />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  BrainFlash
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rapid clinical facts, dosing, and contraindications for
                  time-sensitive decisions
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
              <MenuBookIcon
                sx={{ fontSize: 40, flexShrink: 0 }}
                color="primary"
              />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  DeepDive
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Comprehensive medical reference with detailed pathophysiology
                  and evidence
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
              <ForumIcon sx={{ fontSize: 40, flexShrink: 0 }} color="primary" />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  PeerView
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Virtual case consultation for collaborative clinical
                  decision-making
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
      label: "Ready to Get Started",
      content: (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <ForumIcon color="primary" sx={{ fontSize: 64, mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 3 }}>
            You're Ready to Get Started
          </Typography>
          <Typography variant="body1" paragraph>
            Choose any assistant from the sidebar to begin your first
            consultation.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Quick tip:</strong> Start with BrainFlash for rapid clinical
            facts, DeepDive for comprehensive research, or PeerView for
            collaborative case discussion.
          </Typography>
          <Typography variant="body1" paragraph>
            Each assistant is designed to enhance your clinical workflow and
            support better patient outcomes.
          </Typography>
        </Box>
      ),
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={activeStep > 0 ? handleClose : null} // Prevent closing on first step (disclaimer)
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      {activeStep > 0 && (
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
      )}

      <DialogContent sx={{ p: 4, pb: 1 }}>
        {steps[activeStep].content}

        {!steps[activeStep].hideNavigation && (
          <MobileStepper
            variant="dots"
            steps={steps.length - 1} // Don't count disclaimer as a step in the dots
            position="static"
            activeStep={activeStep - 1} // Adjust for disclaimer step
            sx={{
              background: "transparent",
              justifyContent: "center",
              mt: 2,
            }}
            nextButton={null}
            backButton={null}
          />
        )}
      </DialogContent>

      {!steps[activeStep].hideNavigation && (
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
            {activeStep > 1 && (
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
      )}
    </Dialog>
  );
};

export default ProfessionalOnboardingDialog;
