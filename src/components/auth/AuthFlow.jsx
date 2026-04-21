import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/functions";
import firebaseApp from "services/firebase";
import { useForm, Controller } from "react-hook-form";
import {
  Box,
  Typography,
  TextField,
  Alert,
  Link as MuiLink,
  IconButton,
  Divider,
  Button,
  CircularProgress,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { ArrowBack, Google, MarkEmailRead } from "@mui/icons-material";
import {
  getAuth,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
} from "firebase/auth";
import PasswordRequirements from "./PasswordRequirements";
import { passwordRules } from "utils/passwordValidation";
import SixDigitCodeInput from "./SixDigitCodeInput";

export const STEPS = {
  EMAIL: 0, // Email entry + social buttons
  SIGN_IN: 1, // Existing account: password only
  SIGN_UP: 2, // New account: password + confirm
  FORGOT_PASSWORD: 3, // Send reset email (inline, no page redirect)
  MFA_CHALLENGE: 4, // TOTP or SMS second factor during sign-in
  EMAIL_VERIFY: 5, // Wait for email verification after sign-up
};

/**
 * AuthFlow - Unified sign-in/sign-up flow.
 *
 * Step 0 (EMAIL): Email entry + Google social button.
 *   On Continue, calls the `checkEmailExists` Cloud Function (Admin SDK) to
 *   definitively determine if the account exists — bypasses Firebase's client-side
 *   Email Enumeration Protection which makes fetchSignInMethodsForEmail unreliable.
 * Step 1 (SIGN_IN): Existing user — password only.
 * Step 2 (SIGN_UP): New user — password + confirm.
 * Step 3+ handles email verification and MFA challenge only.
 *
 * When prefilledEmail is provided (invitation flow), skips EMAIL and checks
 * immediately on mount, dropping into SIGN_IN or SIGN_UP.
 */
const AuthFlow = ({
  onClose,
  onSuccess,
  onStepChange,
  backHandlerRef,
  inDialog = false,
  prefilledEmail = null,
  disableOAuth = false,
  skipEmailVerification = false,
  initialStep = STEPS.EMAIL,
}) => {
  const navigate = useNavigate();
  const [step, setStepInternal] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState(prefilledEmail || "");
  const [prefilledResolving, setPrefilledResolving] = useState(
    Boolean(prefilledEmail && initialStep === STEPS.EMAIL),
  );
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [verifyEmailSending, setVerifyEmailSending] = useState(false);
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);
  // MFA challenge state
  const [mfaHint, setMfaHint] = useState(null);
  const [mfaType, setMfaType] = useState(null); // 'totp' | 'phone'
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerificationId, setMfaVerificationId] = useState(null);
  const [smsSending, setSmsSending] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const mfaResolverRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);
  const recaptchaContainerRef = useRef(null);
  const mfaCodeInputRef = useRef(null);
  const emailForm = useForm({
    mode: "onSubmit",
    defaultValues: { email: prefilledEmail || "" },
  });

  const passwordForm = useForm({
    mode: "onSubmit",
    defaultValues: { password: "", confirmPassword: "" },
  });

  const watchPassword = passwordForm.watch("password");

  // Report external step for dialog back-button visibility.
  // prefilledEmail flows treat SIGN_IN/SIGN_UP as step 0 (no back needed).
  const reportStep = (s) => {
    if (prefilledEmail && (s === STEPS.SIGN_IN || s === STEPS.SIGN_UP)) {
      onStepChange?.(0);
    } else if (s === STEPS.EMAIL_VERIFY) {
      // Show back button (lets them cancel and restart with a different email)
      onStepChange?.(STEPS.EMAIL_VERIFY);
    } else {
      onStepChange?.(s);
    }
  };

  const setStep = (s) => {
    setStepInternal(s);
    reportStep(s);
  };

  // AuthPage can mount before user context is fully hydrated on hard reload.
  // If initialStep arrives late (e.g. EMAIL_VERIFY), advance from EMAIL.
  useEffect(() => {
    if (initialStep == null) return;
    if (
      step === STEPS.EMAIL &&
      initialStep !== STEPS.EMAIL &&
      !prefilledEmail
    ) {
      setStep(initialStep);
    }
  }, [initialStep, step, prefilledEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reportStep(step);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When prefilledEmail is provided, check it on mount and skip EMAIL step
  useEffect(() => {
    if (prefilledEmail && initialStep === STEPS.EMAIL) {
      resolveEmailStep(prefilledEmail);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // EMAIL_VERIFY: poll for verification; auto-advance when the link is clicked
  useEffect(() => {
    if (step !== STEPS.EMAIL_VERIFY) return;
    const user = firebaseApp.auth().currentUser;
    if (!user) return;

    // Interval reload — catches verification even if tab was backgrounded
    const interval = setInterval(async () => {
      try {
        await user.reload();
        if (firebaseApp.auth().currentUser?.emailVerified) {
          clearInterval(interval);
          finishSignIn(firebaseApp.auth().currentUser);
        }
      } catch (e) {
        /* ignore */
      }
    }, 3000);

    // onIdTokenChanged fires immediately when Firebase detects the verification
    const unsubscribe = firebaseApp.auth().onIdTokenChanged((u) => {
      if (u?.emailVerified) {
        clearInterval(interval);
        unsubscribe();
        finishSignIn(u);
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = async () => {
    if (step === STEPS.SIGN_IN || step === STEPS.SIGN_UP) {
      if (!prefilledEmail) {
        passwordForm.reset();
        setError("");
        setStep(STEPS.EMAIL);
      }
    } else if (step === STEPS.FORGOT_PASSWORD) {
      setResetEmailSent(false);
      setError("");
      setStep(STEPS.SIGN_IN);
    } else if (step === STEPS.MFA_CHALLENGE) {
      mfaResolverRef.current = null;
      setMfaHint(null);
      setMfaType(null);
      setMfaCode("");
      setMfaVerificationId(null);
      setError("");
      setStep(STEPS.SIGN_IN);
    } else if (step === STEPS.EMAIL_VERIFY) {
      // Cancel verification — sign out and restart
      try {
        await firebaseApp.auth().signOut();
      } catch (e) {
        /* ignore */
      }
      setVerifyEmailSent(false);
      setConfirmedEmail("");
      setError("");
      setStep(STEPS.EMAIL);
    }
  };

  useEffect(() => {
    if (backHandlerRef) backHandlerRef.current = handleBack;
  });

  const finishSignIn = (user) => {
    const currentUser = user || firebaseApp.auth().currentUser;
    if (onSuccess) onSuccess(currentUser);
    else navigate("/dashboard");
  };

  const goToEmailVerify = async (user) => {
    setVerifyEmailSending(true);
    setVerifyEmailSent(false);
    setError("");
    try {
      await user.sendEmailVerification();
    } catch (e) {
      // Rate-limited or already sent — still advance to the step
    } finally {
      setVerifyEmailSending(false);
    }
    setStep(STEPS.EMAIL_VERIFY);
  };

  const handleAuthSuccess = async (user) => {
    finishSignIn(user);
  };

  // Prefer TOTP, fall back to phone. For phone, sends SMS before transitioning
  // so the Sign In button stays in loading state — no intermediate blank screen.
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

  // Focus the code input when the MFA challenge step becomes active
  useEffect(() => {
    if (step === STEPS.MFA_CHALLENGE) {
      setTimeout(() => mfaCodeInputRef.current?.focus(), 100);
    }
  }, [step]);

  const handleMfaVerify = async (code = mfaCode) => {
    setLoading(true);
    setError("");
    try {
      const auth = getAuth();
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

      const result = await resolver.resolveSignIn(assertion);
      await handleAuthSuccess(result.user);
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
  };

  const handleResendSms = async () => {
    setSmsSending(true);
    setSmsSent(false);
    setMfaVerificationId(null);
    setError("");
    try {
      const auth = getAuth();
      // clear() is async internally — grecaptcha tracks elements by reference,
      // not DOM state, so reusing the same node always fails. Fresh node every time.
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
      console.error("[MFA resend]", err.code, err.message, err);
      setError("Failed to resend code. Please try again.");
    } finally {
      setSmsSending(false);
    }
  };

  // Uses Admin SDK via Cloud Function — definitive check, no client-side limitations
  const resolveEmailStep = async (email) => {
    setLoading(true);
    setError("");
    try {
      const checkEmailExists = firebase
        .functions()
        .httpsCallable("checkEmailExists");
      const { data } = await checkEmailExists({ email });
      setConfirmedEmail(email);
      setStep(data.exists ? STEPS.SIGN_IN : STEPS.SIGN_UP);
    } catch (err) {
      setError("Unable to verify email. Please try again.");
    } finally {
      setLoading(false);
      setPrefilledResolving(false);
    }
  };

  const handleEmailContinue = (data) => resolveEmailStep(data.email);

  const handleSignIn = async (data) => {
    setLoading(true);
    setError("");
    try {
      const result = await firebaseApp
        .auth()
        .signInWithEmailAndPassword(confirmedEmail, data.password);
      await handleAuthSuccess(result.user, false);
    } catch (err) {
      if (err.code === "auth/multi-factor-auth-required") {
        const auth = getAuth();
        await enterMfaChallenge(getMultiFactorResolver(auth, err));
      } else if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Incorrect password. Please try again.");
      } else {
        setError(err.message || "Sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (data) => {
    setLoading(true);
    setError("");
    try {
      const result = await firebaseApp
        .auth()
        .createUserWithEmailAndPassword(confirmedEmail, data.password);
      if (skipEmailVerification || result.user?.emailVerified) {
        finishSignIn(result.user);
      } else {
        await goToEmailVerify(result.user);
      }
    } catch (err) {
      if (err.code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (err.code === "auth/email-already-in-use") {
        setError(
          "An account already exists with this email. Please sign in instead.",
        );
      } else {
        setError(err.message || "Sign-up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider) => {
    setLoading(true);
    setError("");
    try {
      const result = await firebaseApp.auth().signInWithPopup(provider);
      setConfirmedEmail(result.user.email || "");
      await handleAuthSuccess(result.user);
    } catch (err) {
      if (err.code === "auth/multi-factor-auth-required") {
        const auth = getAuth();
        setConfirmedEmail(""); // email unknown until MFA resolves
        await enterMfaChallenge(getMultiFactorResolver(auth, err));
      } else if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () =>
    handleOAuthSignIn(new firebase.auth.GoogleAuthProvider());

  const handleResendVerification = async () => {
    setVerifyEmailSending(true);
    setVerifyEmailSent(false);
    setError("");
    try {
      await firebaseApp.auth().currentUser.sendEmailVerification();
      setVerifyEmailSent(true);
    } catch (err) {
      setError(
        "Failed to resend. Please wait a few minutes before trying again.",
      );
    } finally {
      setVerifyEmailSending(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError("");
    try {
      await firebaseApp.auth().sendPasswordResetEmail(confirmedEmail);
      setResetEmailSent(true);
    } catch (err) {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: inDialog ? "100%" : 400,
        mx: "auto",
        p: inDialog ? 0 : 3,
        bgcolor: "background.paper",
        position: "relative",
      }}
    >
      {/* Invisible recaptcha container for SMS MFA */}
      <div ref={recaptchaContainerRef} />

      {/* Back button for standalone (non-dialog) use */}
      {!inDialog &&
        (step === STEPS.SIGN_IN || step === STEPS.SIGN_UP) &&
        !prefilledEmail && (
          <Box sx={{ mb: 2 }}>
            <IconButton onClick={handleBack} edge="start" sx={{ ml: -1 }}>
              <ArrowBack />
            </IconButton>
          </Box>
        )}

      {/* Step 0: Email + social */}
      {step === STEPS.EMAIL && (
        <Box>
          {prefilledEmail && prefilledResolving ? (
            <Box
              sx={{
                minHeight: inDialog ? 220 : 320,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}
            >
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Preparing sign in...
              </Typography>
            </Box>
          ) : (
            <>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{ mb: 1, textAlign: "center" }}
              >
                Enter your email
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3, textAlign: "center" }}
              >
                Sign in or create a free account to continue.
              </Typography>

              <form
                onSubmit={emailForm.handleSubmit(handleEmailContinue)}
                noValidate
              >
                <Controller
                  name="email"
                  control={emailForm.control}
                  rules={{
                    required: "Email is required.",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Please enter a valid email address.",
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email address"
                      type="email"
                      fullWidth
                      variant="outlined"
                      error={!!emailForm.formState.errors.email}
                      helperText={emailForm.formState.errors.email?.message}
                      autoFocus
                      sx={{ mb: 2 }}
                    />
                  )}
                />

                <LoadingButton
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  loading={loading}
                  sx={{ py: 1.5, mb: 3 }}
                >
                  Continue with Email
                </LoadingButton>
              </form>

              {error && (
                <Alert
                  severity="error"
                  sx={{ mb: 2 }}
                  onClose={() => setError("")}
                >
                  {error}
                </Alert>
              )}

              {!disableOAuth && (
                <>
                  <Divider sx={{ mb: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      or
                    </Typography>
                  </Divider>

                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    startIcon={<Google />}
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    sx={{ mb: 2, py: 1.5 }}
                  >
                    Continue with Google
                  </Button>
                </>
              )}

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 2, textAlign: "center", display: "block" }}
              >
                By continuing, you agree to the MD3C{" "}
                <MuiLink href="/terms-of-use" target="_blank">
                  Terms of Service
                </MuiLink>{" "}
                and{" "}
                <MuiLink href="/privacy-policy" target="_blank">
                  Privacy Statement
                </MuiLink>
                .
              </Typography>
            </>
          )}
        </Box>
      )}

      {/* Step 1: Sign In */}
      {step === STEPS.SIGN_IN && (
        <Box>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ mb: 1, textAlign: "center" }}
          >
            Sign In
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, textAlign: "center" }}
          >
            Enter your password to sign in.
          </Typography>

          <form onSubmit={passwordForm.handleSubmit(handleSignIn)} noValidate>
            <TextField
              label="Email address"
              value={confirmedEmail}
              fullWidth
              variant="outlined"
              disabled
              sx={{ mb: 2 }}
            />

            <Controller
              name="password"
              control={passwordForm.control}
              rules={{ required: "Password is required." }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Password"
                  type="password"
                  fullWidth
                  variant="outlined"
                  error={!!passwordForm.formState.errors.password}
                  helperText={passwordForm.formState.errors.password?.message}
                  autoFocus
                  sx={{ mb: 3 }}
                />
              )}
            />

            <LoadingButton
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              loading={loading}
              sx={{ py: 1.5 }}
            >
              Sign In
            </LoadingButton>
          </form>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
            <MuiLink
              component="button"
              type="button"
              onClick={() => setStep(STEPS.FORGOT_PASSWORD)}
              underline="hover"
              sx={{ fontSize: "0.875rem" }}
            >
              Forgot password?
            </MuiLink>
          </Typography>
        </Box>
      )}

      {/* Step 2: Sign Up */}
      {step === STEPS.SIGN_UP && (
        <Box>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ mb: 1, textAlign: "center" }}
          >
            Create your account
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, textAlign: "center" }}
          >
            Choose a password to get started.
          </Typography>

          <form onSubmit={passwordForm.handleSubmit(handleSignUp)} noValidate>
            <TextField
              label="Email address"
              value={confirmedEmail}
              fullWidth
              variant="outlined"
              disabled
              sx={{ mb: 2 }}
            />

            <Controller
              name="password"
              control={passwordForm.control}
              rules={passwordRules}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Password"
                  type="password"
                  fullWidth
                  variant="outlined"
                  error={!!passwordForm.formState.errors.password}
                  helperText={passwordForm.formState.errors.password?.message}
                  autoFocus
                  sx={{ mb: 1 }}
                />
              )}
            />

            <PasswordRequirements value={watchPassword} sx={{ mb: 3 }} />

            <LoadingButton
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              loading={loading}
              sx={{ py: 1.5 }}
            >
              Create Account
            </LoadingButton>
          </form>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 3, textAlign: "center", display: "block" }}
          >
            By creating an account, you agree to the MD3C{" "}
            <MuiLink href="/terms-of-use" target="_blank">
              Terms of Service
            </MuiLink>{" "}
            and{" "}
            <MuiLink href="/privacy-policy" target="_blank">
              Privacy Statement
            </MuiLink>
            .
          </Typography>
        </Box>
      )}

      {/* Step 3: Forgot Password */}
      {step === STEPS.FORGOT_PASSWORD && (
        <Box>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ mb: 1, textAlign: "center" }}
          >
            Reset your password
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, textAlign: "center" }}
          >
            {resetEmailSent
              ? "Check your inbox for a link to reset your password."
              : "We'll send a reset link to your email address."}
          </Typography>

          {!resetEmailSent && (
            <>
              <TextField
                label="Email address"
                value={confirmedEmail}
                fullWidth
                variant="outlined"
                disabled
                sx={{ mb: 3 }}
              />

              <LoadingButton
                variant="contained"
                size="large"
                fullWidth
                loading={loading}
                onClick={handleForgotPassword}
                sx={{ py: 1.5 }}
              >
                Send Reset Link
              </LoadingButton>
            </>
          )}

          {resetEmailSent && (
            <Alert severity="success">
              A password reset link has been sent to {confirmedEmail}.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}
        </Box>
      )}

      {/* Step 4: MFA Challenge */}
      {step === STEPS.MFA_CHALLENGE && (
        <Box>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ mb: 1, textAlign: "center" }}
          >
            {mfaType === "totp" ? "Open Your Auth App" : "Check Your Phone"}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, textAlign: "center" }}
          >
            {mfaType === "totp"
              ? "Enter the 6-digit code from your authenticator app."
              : `Enter the code sent to ${mfaHint?.phoneNumber || "your phone"}.`}
          </Typography>

          <SixDigitCodeInput
            ref={mfaCodeInputRef}
            onComplete={handleMfaVerify}
            onChange={setMfaCode}
            disabled={loading || smsSending}
            autoFocus
          />

          <LoadingButton
            variant="contained"
            size="large"
            fullWidth
            loading={loading}
            disabled={mfaCode.length < 6 || smsSending}
            onClick={() => handleMfaVerify(mfaCode)}
            sx={{ py: 1.5, mt: 3 }}
          >
            Verify
          </LoadingButton>

          {mfaType === "phone" && (mfaVerificationId || smsSending) && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              {smsSent && (
                <Alert
                  severity="success"
                  sx={{ mb: 1.5, textAlign: "left" }}
                  onClose={() => setSmsSent(false)}
                >
                  A new code has been sent.
                </Alert>
              )}
              <Typography variant="body2" sx={{ mt: 0.5 }}>
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
                    {
                      "It may take a minute to receive your code. Haven't received it? "
                    }
                    <MuiLink
                      component="button"
                      type="button"
                      onClick={handleResendSms}
                      underline="hover"
                      sx={{ fontSize: "0.875rem" }}
                    >
                      Resend a new code
                    </MuiLink>
                  </>
                )}
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 3, textAlign: "center", display: "block" }}
          >
            Can't log in?{" "}
            <MuiLink href="mailto:support@md3c.com" underline="hover">
              Contact support@md3c.com
            </MuiLink>
          </Typography>
        </Box>
      )}

      {/* Step 6: Email verification */}
      {step === STEPS.EMAIL_VERIFY && (
        <Box sx={{ textAlign: "center" }}>
          <MarkEmailRead
            sx={{ fontSize: 52, color: "primary.main", mb: 1.5 }}
          />
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            Check your inbox
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            We sent a verification link to{" "}
            <Box component="span" fontWeight={600} color="text.primary">
              {confirmedEmail}
            </Box>
            . Click it to activate your account.
          </Typography>

          {verifyEmailSent && (
            <Alert severity="success" sx={{ mb: 2, textAlign: "left" }}>
              Verification email resent.
            </Alert>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2, textAlign: "left" }}
              onClose={() => setError("")}
            >
              {error}
            </Alert>
          )}

          <LoadingButton
            variant="outlined"
            fullWidth
            loading={verifyEmailSending}
            onClick={handleResendVerification}
            sx={{ mb: 1.5 }}
          >
            Resend Email
          </LoadingButton>
        </Box>
      )}
    </Box>
  );
};

export default AuthFlow;
