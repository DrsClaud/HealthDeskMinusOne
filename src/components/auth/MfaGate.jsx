import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { LockOutlined, SecurityRounded } from "@mui/icons-material";
import MfaEnrollDialog from "./MfaEnrollDialog";
import useMfaStatus from "hooks/useMfaStatus";
import firebaseApp from "services/firebase";

/**
 * MfaGate - Wraps content that requires MFA to be both enrolled AND verified
 * in the current session (i.e. the user passed the MFA challenge at sign-in).
 *
 * Three states:
 *   1. Not enrolled  → shows enrollment prompt + MfaEnrollDialog
 *   2. Enrolled but session not MFA-verified (enrolled mid-session or old session)
 *      → asks user to sign out and back in
 *   3. Enrolled + session verified → renders children
 *
 * Usage:
 *   <MfaGate>
 *     <SensitivePage />
 *   </MfaGate>
 */
const MfaGate = ({ children }) => {
  const { isEnrolled, sessionMfaVerified, sessionMfaLoading } = useMfaStatus();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  if (sessionMfaLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Already enrolled and verified this session — full access
  if (isEnrolled && sessionMfaVerified) {
    return children;
  }

  // Enrolled but this session pre-dates MFA (enrolled just now or old session)
  if (isEnrolled && !sessionMfaVerified) {
    return (
      <GateScreen
        icon={<LockOutlined sx={{ fontSize: 48, color: "warning.main" }} />}
        title="Re-authentication required"
        body="You've set up two-factor authentication. Sign out and back in to verify your identity and access this content."
        action={
          <Button
            variant="contained"
            size="large"
            onClick={() => firebaseApp.auth().signOut()}
          >
            Sign Out
          </Button>
        }
      />
    );
  }

  // Not enrolled — prompt to set up MFA
  return (
    <>
      <GateScreen
        icon={<SecurityRounded sx={{ fontSize: 48, color: "primary.main" }} />}
        title="Two-factor authentication required"
        body="To keep your account and data secure, you need to set up two-factor authentication before you can access this section."
        action={
          <Button
            variant="contained"
            size="large"
            onClick={() => setEnrollOpen(true)}
          >
            Set Up 2FA
          </Button>
        }
        extra={
          enrolled && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Two-factor authentication enabled. Sign out and back in to access
              this content.
            </Alert>
          )
        }
      />
      <MfaEnrollDialog
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        onEnrolled={() => {
          setEnrollOpen(false);
          setEnrolled(true);
        }}
      />
    </>
  );
};

const GateScreen = ({ icon, title, body, action, extra }) => (
  <Box
    sx={{
      maxWidth: 480,
      mx: "auto",
      mt: { xs: 6, sm: 12 },
      px: 3,
      textAlign: "center",
    }}
  >
    <Box sx={{ mb: 2 }}>{icon}</Box>
    <Typography variant="h5" fontWeight={700} sx={{ mb: 1.5 }}>
      {title}
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
      {body}
    </Typography>
    {action}
    {extra}
  </Box>
);

export default MfaGate;
