import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Link as MuiLink,
} from "@mui/material";
import ReauthDialog from "./ReauthDialog";
import MfaEnrollSteps from "./MfaEnrollSteps";
import { getAuth, multiFactor } from "firebase/auth";

const STEP_MANAGE = "manage";
const STEP_ENROLLING = "enrolling";

/**
 * MfaEnrollDialog — MFA enrollment and management dialog.
 * When already enrolled: shows factors and "Switch to a Different Method" (atomic replace).
 * No option to disable MFA entirely; users must add a new method first, then the old one is removed.
 */
const MfaEnrollDialog = ({
  open,
  onClose,
  onEnrolled,
  enrolledFactors: propEnrolledFactors = [],
  source = "default",
}) => {
  const [step, setStep] = useState(STEP_MANAGE);
  const [enrolledFactors, setEnrolledFactors] = useState(propEnrolledFactors);
  const [reauthOpen, setReauthOpen] = useState(false);
  const pendingActionRef = useRef(null);
  const factorsToUnenrollRef = useRef([]);

  const auth = getAuth();

  useEffect(() => {
    if (!open) return;
    setEnrolledFactors(propEnrolledFactors);
    setStep(propEnrolledFactors.length > 0 ? STEP_MANAGE : STEP_ENROLLING);
    factorsToUnenrollRef.current = [];
  }, [open, propEnrolledFactors]);

  const requireReauth = useCallback((action) => {
    pendingActionRef.current = action;
    setReauthOpen(true);
  }, []);

  const handleReauthSuccess = useCallback(async () => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) await action();
  }, []);

  const handleSwitchMethod = () => {
    factorsToUnenrollRef.current = [...enrolledFactors];
    setStep(STEP_ENROLLING);
  };

  const getFactorSummary = (factor) => {
    if (factor.factorId === "totp") {
      return "You're currently using an authenticator app for verification.";
    }

    const phoneText = factor.phoneNumber || "your enrolled phone number";
    return `You're currently using text message verification with the phone number ${phoneText}.`;
  };

  const handleEnrollDone = useCallback(async () => {
    const toUnenroll = factorsToUnenrollRef.current;
    if (toUnenroll.length > 0) {
      try {
        const mf = multiFactor(auth.currentUser);
        for (const factor of toUnenroll) {
          await mf.unenroll(factor);
        }
      } catch (err) {
        if (err.code === "auth/requires-recent-login") {
          requireReauth(handleEnrollDone);
          return;
        }
      }
      factorsToUnenrollRef.current = [];
    }
    onEnrolled?.();
    onClose();
  }, [auth.currentUser, onEnrolled, onClose, requireReauth]);

  const resetAndClose = () => {
    setStep(propEnrolledFactors.length > 0 ? STEP_MANAGE : STEP_ENROLLING);
    factorsToUnenrollRef.current = [];
    onClose();
  };

  const isSwitching = factorsToUnenrollRef.current.length > 0;

  return (
    <>
      <Dialog
        open={open}
        onClose={resetAndClose}
        maxWidth={step === STEP_ENROLLING ? "sm" : "xs"}
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {step === STEP_MANAGE
            ? "Two-Factor Authentication"
            : isSwitching
              ? "Switch Authentication Method"
              : "Set Up Two-Factor Authentication"}
        </DialogTitle>

        <DialogContent>
          {step === STEP_MANAGE && (
            <Box>
              {enrolledFactors.map((factor) => (
                <DialogContentText key={factor.uid} sx={{ mb: 2 }}>
                  {getFactorSummary(factor)}
                </DialogContentText>
              ))}

              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Two-factor authentication cannot be disabled. If you use text
                message verification, you can update your phone number. You can
                also switch to a different method.
              </Typography>

              <Button
                variant="outlined"
                fullWidth
                onClick={handleSwitchMethod}
                sx={{ mb: 2 }}
              >
                Switch to a Different Method
              </Button>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center" }}
              >
                Lost device?{" "}
                <MuiLink href="mailto:support@md3c.com" underline="hover">
                  Contact support@md3c.com
                </MuiLink>
              </Typography>
            </Box>
          )}

          {step === STEP_ENROLLING && (
            <MfaEnrollSteps
              title={
                isSwitching
                  ? "Switch authentication method"
                  : "Set up two-factor authentication"
              }
              subtitle={
                isSwitching
                  ? "Add a new method first. Your current method will be removed after you verify the new one."
                  : "To keep your account and data secure, two-factor authentication is required."
              }
              showMethodSelectHeader={!(source === "settings" && isSwitching)}
              showBackOnMethodSelect={
                enrolledFactors.length > 0 &&
                !(source === "settings" && isSwitching)
              }
              onCancel={
                enrolledFactors.length > 0
                  ? () => setStep(STEP_MANAGE)
                  : undefined
              }
              onDone={handleEnrollDone}
              onRequireReauth={requireReauth}
            />
          )}
        </DialogContent>
      </Dialog>

      <ReauthDialog
        open={reauthOpen}
        onClose={() => setReauthOpen(false)}
        onSuccess={handleReauthSuccess}
      />
    </>
  );
};

export default MfaEnrollDialog;
