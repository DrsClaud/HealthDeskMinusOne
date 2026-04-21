import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
} from "@mui/material";
import { Close, ArrowBack } from "@mui/icons-material";
import AuthFlow from "./AuthFlow";
import logoIcon from "assets/images/logos/logo-icon.png";

/**
 * AuthDialog - Modal wrapper for the unified auth flow (email/Google/Apple).
 *
 * @param {boolean} open
 * @param {function} onClose
 * @param {function} onSuccess - Called with Firebase user on successful auth
 * @param {string} preselectedRole - Optional role to skip account type selection
 */
const AuthDialog = ({ open, onClose, onSuccess, preselectedRole }) => {
  const [step, setStep] = useState(0);
  const backHandlerRef = useRef(null);

  const handleBackClick = () => {
    backHandlerRef.current?.();
  };

  const canDismiss = step === 0;
  const showBackButton = step !== 0;

  return (
    <Dialog
      open={open}
      onClose={canDismiss ? onClose : undefined}
      disableEscapeKeyDown={!canDismiss}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          position: "relative",
          zIndex: 1,
        },
      }}
      sx={{
        "& .MuiDialog-container": {
          zIndex: 1,
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        <IconButton
          aria-label="back"
          onClick={handleBackClick}
          sx={{
            position: "absolute",
            left: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
            visibility: showBackButton ? "visible" : "hidden",
          }}
        >
          <ArrowBack />
        </IconButton>

        <Box
          component="img"
          src={logoIcon}
          alt="HealthDesk"
          sx={{ height: 32 }}
        />

        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          py: 3,
          position: "relative",
          zIndex: 1,
          pointerEvents: "auto",
        }}
      >
        <AuthFlow
          onClose={onClose}
          onSuccess={onSuccess}
          onStepChange={setStep}
          backHandlerRef={backHandlerRef}
          preselectedRole={preselectedRole}
          inDialog
        />
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
