import React, { useState, useEffect } from "react";
import firebaseApp, { db } from "services/firebase";
import firebase from "firebase/compat/app";
import { Box, Button, TextField, Alert, Typography } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Link, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { useAuth } from "hooks/useAuth";
import { passwordRules, passwordRequirements } from "utils/passwordValidation";
import PasswordRequirements from "components/auth/PasswordRequirements";
import Loading from "components/Loading";
import logoIcon from "assets/images/logos/logo-icon.png";

const Wrapper = ({ children }) => (
  <Box sx={{ textAlign: "center", maxWidth: "sm", m: "auto" }}>{children}</Box>
);

export default () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  // Reset password mode state
  const [mode, setMode] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetError, setResetError] = useState("");

  const navigate = useNavigate();
  const isMfaRevertMode = mode === "revertSecondFactorAddition";

  const {
    control: resetControl,
    handleSubmit: handleResetSubmit,
    watch: watchReset,
    formState: { errors: resetErrors },
  } = useForm({
    mode: "onBlur",
    defaultValues: { password: "", confirmPassword: "" },
  });
  const watchResetPassword = watchReset("password");

  const handleResetPassword = async (data) => {
    const oobCode = getParameter("oobCode");
    if (!oobCode) {
      setResetError("Missing reset code. Please use the link from your email.");
      return;
    }
    setResetLoading(true);
    setResetError("");
    try {
      await firebaseApp.auth().confirmPasswordReset(oobCode, data.password);
      setResetDone(true);
    } catch (err) {
      if (err.code === "auth/expired-action-code") {
        setResetError("This reset link has expired. Please request a new one.");
      } else if (err.code === "auth/invalid-action-code") {
        setResetError("This reset link is invalid or has already been used.");
      } else {
        setResetError(
          err.message || "Failed to reset password. Please try again.",
        );
      }
    } finally {
      setResetLoading(false);
    }
  };

  // Get parameters from the URL
  const getParameter = (parameter) => {
    const matches = new RegExp(`${parameter}=([^&#=]*)`).exec(
      window.location.search,
    );
    if (matches) return matches[1];

    return undefined;
  };

  const handleVerifyEmail = async () => {
    const code = getParameter("oobCode");
    const continueUrlParam = getParameter("continueUrl");

    if (!code) {
      console.error("Missing oobCode parameter");
      setLoading(false);
      setError(true);
      setErrorMessage("Missing verification code in the URL");
      return;
    }

    console.log("Starting email verification with code:", code);

    // Extract uid and pendingEmail from continueUrl (works even if user isn't logged in)
    let uidFromUrl = null;
    let pendingEmailFromUrl = null;

    if (continueUrlParam) {
      try {
        const continueUrl = new URL(decodeURIComponent(continueUrlParam));
        const continueParams = new URLSearchParams(continueUrl.search);
        uidFromUrl = continueParams.get("uid");
        pendingEmailFromUrl = continueParams.get("pendingEmail");
        console.log(
          "Parsed from continueUrl - uid:",
          uidFromUrl,
          "pendingEmail:",
          pendingEmailFromUrl,
        );
      } catch (err) {
        console.error("Error parsing continueUrl:", err);
      }
    }

    try {
      // Apply the verification code - this updates Firebase Auth
      await firebaseApp.auth().applyActionCode(code);
      console.log("Email verification successful");

      setVerified(true);

      // Get the UID - prefer URL param (works even when not logged in), fallback to authenticated user
      const uid = uidFromUrl || user?.uid;

      if (!uid) {
        console.info(
          "Email verified without UID context; waiting for normal sign-in flow.",
        );
        setVerificationMessage(
          "Your email has been verified! Please sign in to continue.",
        );
        setLoading(false);
        return;
      }

      // Update Firestore directly with the verified email
      try {
        const userRef = db.collection("users").doc(uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          const newEmail = pendingEmailFromUrl || userData.pendingEmail;

          if (newEmail) {
            await userRef.update({
              email: newEmail,
              pendingEmail: firebase.firestore.FieldValue.delete(),
              emailChangeRequested: firebase.firestore.FieldValue.delete(),
            });
            console.log("User document updated with verified email:", newEmail);

            setVerificationMessage(
              `Your email has been successfully verified as ${newEmail}. You can now use all features that require a verified email.`,
            );
          } else {
            setVerificationMessage(
              "Your email has been verified! Please sign in to continue.",
            );
          }
        } else {
          setVerificationMessage(
            "Your email has been verified! Please sign in to continue.",
          );
        }
      } catch (firestoreError) {
        console.error("Error updating Firestore:", firestoreError);
        setVerificationMessage(
          "Your email has been verified, but we encountered an error updating your profile. The change will sync automatically when you sign in.",
        );
      }

      setLoading(false);
    } catch (error) {
      console.error("Action code error:", error);
      setLoading(false);

      // Check if the error is because code was already used (email might already be verified)
      if (error.code === "auth/invalid-action-code") {
        // The code might have been used already - check if email is already set
        const uid = uidFromUrl || user?.uid;
        if (uid && pendingEmailFromUrl) {
          try {
            const userDoc = await db.collection("users").doc(uid).get();
            if (
              userDoc.exists &&
              userDoc.data().email === pendingEmailFromUrl
            ) {
              // Email is already verified!
              setVerified(true);
              setVerificationMessage(
                `Your email (${pendingEmailFromUrl}) is already verified!`,
              );
              return;
            }
          } catch (e) {
            console.error("Error checking existing email:", e);
          }
        }
      }

      setError(true);
      setErrorMessage(`Verification failed: ${error.message}`);
    }
  };

  const handleContinueAfterVerify = () => {
    const activeUser = firebaseApp.auth().currentUser || user;
    if (mode === "verifyAndChangeEmail") {
      navigate("/auth");
      return;
    }
    navigate(activeUser ? "/onboarding" : "/auth");
  };

  // NOTE: Email sign-in handler commented out - may be needed for debugging
  // Uncomment if client wants email login option back
  /*
  const handleSignIn = async () => {
    try {
      if (!firebaseApp.auth().isSignInWithEmailLink(window.location.href)) {
        setLoading(false);
        setError(true);
        setErrorMessage("Invalid sign-in link.");
        return;
      }

      const email = localStorage.getItem("emailForSignIn");
      if (!email) {
        navigate("/onboarding?needEmail=true");
        return;
      }

      const result = await firebaseApp
        .auth()
        .signInWithEmailLink(email, window.location.href);
      const userDoc = await db.collection("users").doc(result.user.uid).get();

      localStorage.removeItem("emailForSignIn");

      if (!userDoc.exists) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      setLoading(false);
      setError(true);
      setErrorMessage(error.message);
    }
  };
  */

  useEffect(() => {
    const urlMode = getParameter("mode");
    setMode(urlMode);

    if (urlMode === "verifyEmail" || urlMode === "verifyAndChangeEmail") {
      handleVerifyEmail();
    } else if (urlMode === "resetPassword") {
      setLoading(false); // Show the form immediately — no async work needed yet
    } else if (urlMode === "revertSecondFactorAddition") {
      // Intentionally no-op this mode to prevent accidental MFA unenrollment
      // from aggressive email link scanners/prefetchers.
      setLoading(false);
    } else {
      navigate("/dashboard");
    }
  }, []); // eslint-disable-line

  if (loading)
    return (
      <Wrapper>
        <Loading page />
      </Wrapper>
    );

  if (error) {
    return (
      <Wrapper>
        <Typography variant="h4" sx={{ mt: { xs: 4, sm: 10 }, mb: 2 }}>
          Verification Failed
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {errorMessage ||
            "Your verification link has expired or has already been used. Please request a new verification email."}
        </Typography>

        <Button variant="contained" component={Link} to="/dashboard">
          Return to Dashboard
        </Button>
      </Wrapper>
    );
  }

  // Reset password mode
  if (mode === "resetPassword") {
    return (
      <Wrapper>
        <Box sx={{ maxWidth: 400, mx: "auto", pt: { xs: 4, sm: 10 }, pb: 4 }}>
          {resetDone ? (
            <>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{ mb: 1, textAlign: "center" }}
              >
                Password updated
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3, textAlign: "center" }}
              >
                Your password has been reset successfully. You can now sign in
                with your new password.
              </Typography>
              <Button
                variant="contained"
                size="large"
                fullWidth
                component={Link}
                to="/auth"
                sx={{ py: 1.5 }}
              >
                Sign In
              </Button>
            </>
          ) : (
            <>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{ mb: 1, textAlign: "center" }}
              >
                Choose a new password
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3, textAlign: "center" }}
              >
                Enter a strong password to secure your account.
              </Typography>

              <form
                onSubmit={handleResetSubmit(handleResetPassword)}
                noValidate
              >
                <Controller
                  name="password"
                  control={resetControl}
                  rules={passwordRules}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="New password"
                      type="password"
                      fullWidth
                      variant="outlined"
                      error={!!resetErrors.password}
                      helperText={resetErrors.password?.message}
                      autoFocus
                      sx={{ mb: 2 }}
                    />
                  )}
                />

                <PasswordRequirements
                  value={watchResetPassword}
                  sx={{ mb: 2 }}
                />

                <Controller
                  name="confirmPassword"
                  control={resetControl}
                  rules={{
                    required: "Please confirm your password.",
                    validate: (val) =>
                      val === watchResetPassword || "Passwords do not match.",
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Confirm new password"
                      type="password"
                      fullWidth
                      variant="outlined"
                      error={!!resetErrors.confirmPassword}
                      helperText={resetErrors.confirmPassword?.message}
                      sx={{ mb: 3 }}
                    />
                  )}
                />

                <LoadingButton
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  loading={resetLoading}
                  sx={{ py: 1.5 }}
                >
                  Reset Password
                </LoadingButton>
              </form>

              {resetError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {resetError}
                </Alert>
              )}
            </>
          )}
        </Box>
      </Wrapper>
    );
  }

  if (isMfaRevertMode) {
    return (
      <Wrapper>
        <Box sx={{ maxWidth: 480, mx: "auto", pt: { xs: 4, sm: 10 }, pb: 4 }}>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ mb: 1, textAlign: "center" }}
          >
            2-factor authentication cannot be disabled
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, textAlign: "center" }}
          >
            2-factor authentication is required on all accounts to keep your
            health information secure and cannot be disabled. If you need to
            update your 2-factor authentication method or phone number, go to
            Settings.
          </Typography>
          <Button
            variant="contained"
            size="large"
            fullWidth
            component={Link}
            to="/dashboard/settings"
            sx={{ py: 1.5 }}
          >
            Go to Settings
          </Button>
        </Box>
      </Wrapper>
    );
  }

  // Email verification success
  if (verified) {
    const isEmailChange = mode === "verifyAndChangeEmail";
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 4,
        }}
      >
        <Box
          component="img"
          src={logoIcon}
          alt="HealthDesk"
          sx={{ height: 48, mb: 4 }}
        />

        <Box sx={{ width: "100%", maxWidth: 400, mx: "auto", px: 3 }}>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ mb: 1, textAlign: "center" }}
          >
            {isEmailChange ? "Email Updated" : "Email Verified"}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, textAlign: "center" }}
          >
            {isEmailChange
              ? "Your email has been changed successfully. For security, please sign in again with your new email."
              : "Your email is now verified. Click continue to finish setting up your account."}
          </Typography>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleContinueAfterVerify}
            sx={{ py: 1.5 }}
          >
            {isEmailChange ? "Sign In Again" : "Continue"}
          </Button>
        </Box>
      </Box>
    );
  }

  return null;
};
