import React, { useState, useRef, useEffect, useCallback } from "react";
import SixDigitCodeInput from "./SixDigitCodeInput";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import firebaseApp from "services/firebase";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Button,
  TextField,
  FormHelperText,
  Divider,
  Typography,
  Box,
  Link as MuiLink,
  CircularProgress,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Google } from "@mui/icons-material";
import {
  getAuth,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
} from "firebase/auth";

/**
 * ReauthDialog — re-verifies the user's identity before a sensitive action.
 *
 * Step 1 (CREDENTIALS): email/password or Google popup.
 * Step 2 (MFA_CHALLENGE): shown automatically if the user has MFA enrolled.
 *   Supports TOTP and SMS, same logic as the sign-in MFA challenge.
 *
 * onSuccess is called only after all factors are verified.
 */
const STEPS = { CREDENTIALS: "credentials", MFA_CHALLENGE: "mfa_challenge" };

const ReauthDialog = ({ open, onClose, onSuccess }) => {
  const [step, setStep] = useState(STEPS.CREDENTIALS);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // MFA challenge state
  const [mfaHint, setMfaHint] = useState(null);
  const [mfaType, setMfaType] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerificationId, setMfaVerificationId] = useState(null);
  const [smsSending, setSmsSending] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  const mfaResolverRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);
  const recaptchaContainerRef = useRef(null);
  const mfaCodeInputRef = useRef(null);

  const user = firebaseApp.auth().currentUser;
  const providers = user?.providerData?.map((p) => p.providerId) || [];
  const hasEmail = providers.includes("password");
  const hasGoogle = providers.includes("google.com");

  // Reset everything when dialog closes/opens
  useEffect(() => {
    if (!open) {
      setStep(STEPS.CREDENTIALS);
      setPassword("");
      setError("");
      setMfaHint(null);
      setMfaType(null);
      setMfaCode("");
      setMfaVerificationId(null);
      setSmsSending(false);
      setSmsSent(false);
      mfaResolverRef.current = null;
      recaptchaVerifierRef.current = null;
    }
  }, [open]);

  // Focus code input when MFA challenge step becomes active
  useEffect(() => {
    if (step === STEPS.MFA_CHALLENGE) {
      setTimeout(() => mfaCodeInputRef.current?.focus(), 100);
    }
  }, [step]);

  const handleClose = () => {
    onClose();
  };

  // For phone MFA, sends SMS before transitioning so the button stays loading.
  const enterMfaChallenge = async (resolverObj) => {
    mfaResolverRef.current = resolverObj;
    const hint =
      resolverObj.hints.find((h) => h.factorId === "totp") ||
      resolverObj.hints.find((h) => h.factorId === "phone") ||
      resolverObj.hints[0];
    setMfaCode("");
    setError("");

    if (hint.factorId === "phone") {
      setMfaHint(hint);
      setMfaType("phone");
      try {
        const auth = getAuth();
        if (!recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(
            auth,
            recaptchaContainerRef.current,
            { size: "invisible" },
          );
        }
        const provider = new PhoneAuthProvider(auth);
        const vid = await provider.verifyPhoneNumber(
          { multiFactorHint: hint, session: resolverObj.session },
          recaptchaVerifierRef.current,
        );
        setMfaVerificationId(vid);
        setStep(STEPS.MFA_CHALLENGE);
      } catch (err) {
        setError("Failed to send verification code. Please try again.");
        mfaResolverRef.current = null;
        setMfaHint(null);
        setMfaType(null);
      }
    } else {
      setMfaHint(hint);
      setMfaType(hint.factorId);
      setStep(STEPS.MFA_CHALLENGE);
    }
  };

  const handleMfaError = async (err) => {
    if (err.code === "auth/multi-factor-auth-required") {
      await enterMfaChallenge(getMultiFactorResolver(getAuth(), err));
    } else if (
      err.code === "auth/wrong-password" ||
      err.code === "auth/invalid-credential"
    ) {
      setError("Incorrect password. Please try again.");
    } else if (err.code !== "auth/popup-closed-by-user") {
      setError(err.message || "Re-authentication failed. Please try again.");
    }
  };

  const handleEmailReauth = async () => {
    setLoading(true);
    setError("");
    try {
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        password,
      );
      await user.reauthenticateWithCredential(credential);
      handleClose();
      onSuccess();
    } catch (err) {
      await handleMfaError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleReauth = async () => {
    setLoading(true);
    setError("");
    try {
      await user.reauthenticateWithPopup(
        new firebase.auth.GoogleAuthProvider(),
      );
      handleClose();
      onSuccess();
    } catch (err) {
      await handleMfaError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendSms = async () => {
    setSmsSending(true);
    setSmsSent(false);
    setMfaVerificationId(null);
    setError("");
    try {
      const auth = getAuth();
      recaptchaVerifierRef.current?.clear();
      recaptchaVerifierRef.current = null;
      const freshNode = document.createElement("div");
      document.body.appendChild(freshNode);
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, freshNode, {
        size: "invisible",
      });
      const provider = new PhoneAuthProvider(auth);
      const vid = await provider.verifyPhoneNumber(
        { multiFactorHint: mfaHint, session: mfaResolverRef.current.session },
        recaptchaVerifierRef.current,
      );
      setMfaVerificationId(vid);
      setSmsSent(true);
      mfaCodeInputRef.current?.reset();
    } catch (err) {
      console.error("[ReauthDialog MFA resend]", err.code, err.message, err);
      setError("Failed to resend code. Please try again.");
    } finally {
      setSmsSending(false);
    }
  };

  const handleMfaVerify = useCallback(async (code = mfaCode) => {
    setLoading(true);
    setError("");
    try {
      const resolver = mfaResolverRef.current;
      let assertion;
      if (mfaType === "totp") {
        assertion = TotpMultiFactorGenerator.assertionForSignIn(
          mfaHint.uid,
          code,
        );
      } else {
        const credential = PhoneAuthProvider.credential(
          mfaVerificationId,
          code,
        );
        assertion = PhoneMultiFactorGenerator.assertion(credential);
      }
      await resolver.resolveSignIn(assertion);
      handleClose();
      onSuccess();
    } catch (err) {
      if (
        err.code === "auth/invalid-verification-code" ||
        err.code === "auth/invalid-verification-id"
      ) {
        setError("Incorrect code. Please try again.");
      } else {
        setError(err.message || "Verification failed. Please try again.");
      }
      setMfaCode("");
      mfaCodeInputRef.current?.reset();
    } finally {
      setLoading(false);
    }
  }, [mfaCode, mfaType, mfaHint, mfaVerificationId, onSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMfa = step === STEPS.MFA_CHALLENGE;

  return (
    <>
      <div ref={recaptchaContainerRef} />

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>
          {isMfa
            ? mfaType === "totp"
              ? "Open Your Auth App"
              : "Check Your Phone"
            : "Confirm Your Identity"}
        </DialogTitle>

        <DialogContent>
          {!isMfa && (
            <>
              <DialogContentText sx={{ mb: 3 }}>
                For security, please verify your identity before continuing.
              </DialogContentText>

              {hasEmail && (
                <>
                  <TextField
                    label="Email"
                    value={user?.email || ""}
                    fullWidth
                    variant="outlined"
                    disabled
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && password) handleEmailReauth();
                    }}
                    fullWidth
                    variant="outlined"
                    autoFocus
                    disabled={loading}
                  />
                </>
              )}

              {hasEmail && hasGoogle && (
                <Divider sx={{ my: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    or
                  </Typography>
                </Divider>
              )}

              {hasGoogle && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Google />}
                  onClick={handleGoogleReauth}
                  disabled={loading}
                  sx={{ mt: hasEmail ? 0 : 1, py: 1 }}
                >
                  Verify with Google
                </Button>
              )}
            </>
          )}

          {isMfa && (
            <>
              <DialogContentText sx={{ mb: 3 }}>
                {mfaType === "totp"
                  ? "Enter the 6-digit code from your authenticator app."
                  : `Enter the code sent to ${mfaHint?.phoneNumber || "your phone"}.`}
              </DialogContentText>

              <SixDigitCodeInput
                ref={mfaCodeInputRef}
                onComplete={handleMfaVerify}
                onChange={setMfaCode}
                disabled={loading || smsSending}
                autoFocus
              />

              {mfaType === "phone" && (mfaVerificationId || smsSending) && (
                <Box sx={{ mt: 1.5 }}>
                  {smsSent && (
                    <Alert
                      severity="success"
                      sx={{ mb: 1 }}
                      onClose={() => setSmsSent(false)}
                    >
                      A new code was sent.
                    </Alert>
                  )}
                  <Typography variant="caption">
                    {smsSending ? (
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.75,
                          color: "text.secondary",
                        }}
                      >
                        <CircularProgress size={12} />
                        Sending a new code…
                      </Box>
                    ) : (
                      <>
                        {"It may take a minute to receive your code. Haven't received it? "}
                        <MuiLink
                          component="button"
                          type="button"
                          underline="hover"
                          onClick={handleResendSms}
                        >
                          Resend a new code
                        </MuiLink>
                      </>
                    )}
                  </Typography>
                </Box>
              )}
            </>
          )}

          {error && (
            <FormHelperText error sx={{ mt: 1.5 }}>
              {error}
            </FormHelperText>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>

          {!isMfa && hasEmail && (
            <LoadingButton
              variant="contained"
              loading={loading}
              disabled={!password}
              onClick={handleEmailReauth}
            >
              Confirm
            </LoadingButton>
          )}

          {isMfa && (
            <LoadingButton
              variant="contained"
              loading={loading}
              disabled={mfaCode.length < 6 || smsSending}
              onClick={() => handleMfaVerify(mfaCode)}
            >
              Verify
            </LoadingButton>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReauthDialog;
