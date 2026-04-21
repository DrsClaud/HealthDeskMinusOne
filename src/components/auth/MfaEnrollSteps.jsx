import React, { useState, useRef, useEffect, useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "react-phone-number-input";
import SixDigitCodeInput from "./SixDigitCodeInput";
import {
  Box,
  Typography,
  TextField,
  FormHelperText,
  InputLabel,
  Alert,
  Button,
  IconButton,
  Collapse,
  styled,
} from "@mui/material";
import SelectableChoiceCard from "components/common/SelectableChoiceCard";
import { LoadingButton } from "@mui/lab";
import {
  ArrowBack,
  CheckCircleOutline,
  ContentCopy,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";
import {
  getAuth,
  multiFactor,
  TotpMultiFactorGenerator,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
} from "firebase/auth";
import { isDevEnvironment } from "utils/isDevEnvironment";

const DevTextMessage = () =>
  isDevEnvironment() ? (
    <Alert severity="info" sx={{ mb: 3 }}>
      <Typography variant="body2">
        For development, use text message authentication with phone{" "}
        <strong>+12623333333</strong> and verification code{" "}
        <strong>333333</strong>.
      </Typography>
    </Alert>
  ) : null;

// Root styles apply directly to .PhoneInput (the library's outer div).
// "& .PhoneInput" would target a nested .PhoneInput — wrong, since the root IS .PhoneInput.
const StyledPhoneInput = styled(PhoneInput)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  border: `1px solid rgba(0, 0, 0, 0.23)`,
  borderRadius: `${theme.shape.borderRadius}px`,
  padding: "10px 14px",
  gap: "8px",
  transition: "border-color 200ms, box-shadow 200ms",
  "&:hover": {
    borderColor: "rgba(0, 0, 0, 0.87)",
  },
  "&:focus-within": {
    borderColor: theme.palette.primary.main,
    // box-shadow simulates a 2px border without layout shift
    boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
  },
  "& .PhoneInputInput": {
    border: "none",
    fontSize: "1rem",
    fontFamily: theme.typography.fontFamily,
    color: theme.palette.text.primary,
    backgroundColor: "transparent",
    flex: 1,
    minWidth: 0,
    padding: "16.5px 14px",
    height: ".4375em",
    "&:focus": {
      outline: "none",
    },
  },
  "& .PhoneInputCountrySelect": {
    border: "none",
    backgroundColor: "transparent",
    fontSize: "1rem",
    fontFamily: theme.typography.fontFamily,
    color: theme.palette.text.primary,
    cursor: "pointer",
    "&:focus": {
      outline: "none",
    },
  },
}));

// Wrapper that changes the label color on focus-within via CSS — no JS state needed.
const PhoneInputWrapper = styled(Box)(({ theme }) => ({
  position: "relative",
  "& .PhoneInputLabel": {
    color: theme.palette.text.secondary,
    transition: "color 200ms",
  },
  "&:focus-within .PhoneInputLabel": {
    color: theme.palette.primary.main,
  },
}));

const STEPS = {
  METHOD_SELECT: "method_select",
  TOTP_SETUP: "totp_setup",
  SMS_PHONE: "sms_phone",
  SMS_VERIFY: "sms_verify",
  SUCCESS: "success",
};

/**
 * MfaEnrollSteps — Inline MFA enrollment flow (no Dialog).
 * Used in AuthFlow (mandatory signup step) and inside MfaEnrollDialog (Settings).
 *
 * @param {function} onDone - Called when user clicks Continue/Done on SUCCESS step
 * @param {function} [onEnrolled] - Called when enrollment verifies (before SUCCESS)
 * @param {function} [onCancel] - If provided, shows Cancel button on METHOD_SELECT
 * @param {function} [onRequireReauth] - (retryFn) => {} when auth/requires-recent-login
 * @param {string} [title] - Override title for METHOD_SELECT
 * @param {string} [subtitle] - Override subtitle for METHOD_SELECT
 * @param {boolean} [showMethodSelectHeader] - Show title/subtitle for METHOD_SELECT
 * @param {boolean} [showBackOnMethodSelect] - Show back button on METHOD_SELECT (e.g. when switching from MANAGE)
 */
const MfaEnrollSteps = ({
  onDone,
  onEnrolled,
  onCancel,
  onRequireReauth,
  title = "Set up two-factor authentication",
  subtitle = "To keep your account and data secure, two-factor authentication is required.",
  showMethodSelectHeader = true,
  showBackOnMethodSelect = false,
}) => {
  const [step, setStep] = useState(STEPS.METHOD_SELECT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totpQrUrl, setTotpQrUrl] = useState("");
  const [totpKey, setTotpKey] = useState("");
  const [showManualKey, setShowManualKey] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [enrolledMethod, setEnrolledMethod] = useState("");
  const [smsCodeValue, setSmsCodeValue] = useState("");

  const totpSecretRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);
  const recaptchaContainerRef = useRef(null);
  const smsCodeInputRef = useRef(null);
  const auth = getAuth();

  const phoneForm = useForm({
    defaultValues: { phoneNumber: "" },
  });
  const { control, handleSubmit, reset: resetPhoneForm, watch } = phoneForm;

  const clearRecaptchaVerifier = useCallback(() => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (e) {
        /* ignore */
      }
      recaptchaVerifierRef.current = null;
    }
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = "";
    }
  }, []);

  useEffect(() => clearRecaptchaVerifier, [clearRecaptchaVerifier]);

  useEffect(() => {
    if (step === STEPS.SMS_PHONE) {
      resetPhoneForm({ phoneNumber: phoneNumber || "" });
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps -- only sync when entering SMS_PHONE

  const handleBack = () => {
    setError("");
    if (step === STEPS.TOTP_SETUP || step === STEPS.SMS_PHONE) {
      clearRecaptchaVerifier();
      setStep(STEPS.METHOD_SELECT);
    } else if (step === STEPS.SMS_VERIFY) {
      clearRecaptchaVerifier();
      setStep(STEPS.SMS_PHONE);
    }
  };

  const startTotpEnrollment = async () => {
    setLoading(true);
    setError("");
    try {
      const user = auth.currentUser;
      const session = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      totpSecretRef.current = secret;
      setTotpQrUrl(
        secret.generateQrCodeUrl(
          user.email || user.phoneNumber || "HealthDesk User",
          "HealthDesk",
        ),
      );
      setTotpKey(secret.secretKey);
      setStep(STEPS.TOTP_SETUP);
    } catch (err) {
      if (err.code === "auth/requires-recent-login" && onRequireReauth) {
        onRequireReauth(startTotpEnrollment);
      } else {
        setError(
          err.code === "auth/requires-recent-login"
            ? "For your security, please sign out and sign back in, then try again."
            : "Failed to initialize authenticator setup. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyTotpCode = async () => {
    if (!totpSecretRef.current || totpCode.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
        totpSecretRef.current,
        totpCode,
      );
      await multiFactor(auth.currentUser).enroll(
        assertion,
        "Authenticator App",
      );
      setEnrolledMethod("totp");
      onEnrolled?.();
      setStep(STEPS.SUCCESS);
    } catch (err) {
      setError(
        err.code === "auth/invalid-verification-code"
          ? "Incorrect code. Check your authenticator app and try again."
          : err.message || "Verification failed. Please try again.",
      );
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  };

  const copyKey = async () => {
    await navigator.clipboard.writeText(totpKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const getRecaptchaVerifier = () => {
    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }
    if (!recaptchaContainerRef.current) {
      throw new Error("reCAPTCHA container is not ready.");
    }
    recaptchaVerifierRef.current = new RecaptchaVerifier(
      auth,
      recaptchaContainerRef.current,
      { size: "invisible", callback: () => {} },
    );
    return recaptchaVerifierRef.current;
  };

  const sendSmsCode = async (phoneValue) => {
    const normalizedPhone = (phoneValue ?? phoneNumber ?? "").trim();
    if (!isValidPhoneNumber(normalizedPhone)) {
      setError("Please enter a valid phone number.");
      return;
    }
    setPhoneNumber(normalizedPhone);
    setLoading(true);
    setError("");
    try {
      const session = await multiFactor(auth.currentUser).getSession();
      const verifier = getRecaptchaVerifier();
      const vid = await new PhoneAuthProvider(auth).verifyPhoneNumber(
        { phoneNumber: normalizedPhone, session },
        verifier,
      );
      setVerificationId(vid);
      setSmsCodeValue("");
      setStep(STEPS.SMS_VERIFY);
    } catch (err) {
      if (err.code === "auth/requires-recent-login" && onRequireReauth) {
        onRequireReauth(() => sendSmsCode(normalizedPhone));
      } else {
        setError(err.message || "Failed to send code. Please try again.");
      }
      if (err.code !== "auth/requires-recent-login") {
        clearRecaptchaVerifier();
      }
    } finally {
      setLoading(false);
    }
  };

  const verifySmsCode = async (code) => {
    if (!code || code.length !== 6 || !verificationId) return;
    setLoading(true);
    setError("");
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const assertion = PhoneMultiFactorGenerator.assertion(credential);
      await multiFactor(auth.currentUser).enroll(assertion, "Phone");
      setEnrolledMethod("sms");
      onEnrolled?.();
      setStep(STEPS.SUCCESS);
    } catch (err) {
      setError(
        err.code === "auth/invalid-verification-code"
          ? "Incorrect code. Please try again."
          : err.message || "Verification failed. Please try again.",
      );
      smsCodeInputRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  const canGoBack =
    step === STEPS.TOTP_SETUP ||
    step === STEPS.SMS_PHONE ||
    step === STEPS.SMS_VERIFY ||
    (step === STEPS.METHOD_SELECT && showBackOnMethodSelect);

  return (
    <Box>
      <div
        ref={recaptchaContainerRef}
        style={{ position: "absolute", top: -9999, left: -9999 }}
      />

      {canGoBack && (
        <IconButton
          onClick={handleBack}
          edge="start"
          size="small"
          sx={{ mb: 1, ml: -0.5 }}
        >
          <ArrowBack fontSize="small" />
        </IconButton>
      )}

      {step === STEPS.METHOD_SELECT && (
        <>
          {showMethodSelectHeader && (
            <>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{ mb: 1, textAlign: "center" }}
              >
                {title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3, textAlign: "center" }}
              >
                {subtitle}
              </Typography>
            </>
          )}

          <DevTextMessage />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <SelectableChoiceCard
              loading={loading}
              onClick={startTotpEnrollment}
              title="Authenticator App"
              description="Use an app like Google Authenticator, Authy, or Apple Passwords. More secure than text message."
            />

            <SelectableChoiceCard
              onClick={() => {
                setError("");
                setStep(STEPS.SMS_PHONE);
              }}
              title="Text Message (SMS)"
              description="Receive a one-time code by text message each time you sign in."
            />
          </Box>

          {error && (
            <FormHelperText error sx={{ mt: 1.5 }}>
              {error}
            </FormHelperText>
          )}

          {onCancel && (
            <Button onClick={onCancel} sx={{ mt: 2 }} fullWidth>
              Cancel
            </Button>
          )}
        </>
      )}

      {step === STEPS.TOTP_SETUP && (
        <>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ mb: 1, textAlign: "center" }}
          >
            Set up authenticator app
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, textAlign: "center" }}
          >
            Download or open an authenticator app such as{" "}
            <strong>Google Authenticator</strong>, <strong>Authy</strong>, or{" "}
            <strong>Apple Passwords</strong>.
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Scan this QR code
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            In your app, tap <strong>+</strong> or <strong>Add account</strong>,
            then scan the code below.
          </Typography>

          {totpQrUrl && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mb: 1.5,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "background.paper",
                  display: "inline-flex",
                }}
              >
                <QRCodeSVG value={totpQrUrl} size={220} level="M" />
              </Box>
            </Box>
          )}

          <Button
            size="small"
            startIcon={showManualKey ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setShowManualKey((v) => !v)}
            sx={{ mb: 0.5, textTransform: "none", color: "text.secondary" }}
          >
            Can&apos;t scan? Enter the key manually
          </Button>

          <Collapse in={showManualKey}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: "grey.100",
                borderRadius: 1,
                px: 1.5,
                py: 1,
                mb: 1,
                fontFamily: "monospace",
                fontSize: "0.8rem",
                letterSpacing: 0.5,
                wordBreak: "break-all",
              }}
            >
              <Box sx={{ flexGrow: 1 }}>{totpKey}</Box>
              <IconButton size="small" onClick={copyKey} title="Copy key">
                {keyCopied ? (
                  <CheckCircleOutline fontSize="small" color="success" />
                ) : (
                  <ContentCopy fontSize="small" />
                )}
              </IconButton>
            </Box>
          </Collapse>

          <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
            Enter the 6-digit code
          </Typography>
          <TextField
            label="Verification code"
            value={totpCode}
            onChange={(e) =>
              setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputProps={{ inputMode: "numeric", maxLength: 6 }}
            variant="outlined"
            fullWidth
            autoFocus
            sx={{ mt: 0.5, mb: 2 }}
          />

          {error && (
            <FormHelperText error sx={{ mt: -1, mb: 1 }}>
              {error}
            </FormHelperText>
          )}

          <LoadingButton
            variant="contained"
            size="large"
            fullWidth
            loading={loading}
            disabled={totpCode.length !== 6}
            onClick={verifyTotpCode}
            sx={{ py: 1.5 }}
          >
            Verify
          </LoadingButton>
        </>
      )}

      {step === STEPS.SMS_PHONE && (
        <form
          onSubmit={handleSubmit((data) => sendSmsCode(data.phoneNumber))}
          noValidate
        >
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ mb: 1, textAlign: "center" }}
          >
            Set up text message verification
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, textAlign: "center" }}
          >
            Enter the phone number where you&apos;d like to receive verification
            codes.
          </Typography>

          <DevTextMessage />

          <Controller
            name="phoneNumber"
            control={control}
            rules={{
              validate: (v) =>
                isValidPhoneNumber(v || "") || "Invalid phone number",
            }}
            render={({ field }) => (
              <PhoneInputWrapper>
                <InputLabel
                  shrink
                  className="PhoneInputLabel"
                  sx={{
                    position: "absolute",
                    top: -9,
                    left: 10,
                    bgcolor: "background.paper",
                    px: 0.5,
                    zIndex: 1,
                    pointerEvents: "none",
                  }}
                >
                  Phone Number
                </InputLabel>
                <StyledPhoneInput
                  international
                  countryCallingCodeEditable={false}
                  defaultCountry="US"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="(555) 555-5555"
                  autoFocus
                />
              </PhoneInputWrapper>
            )}
          />

          {error && (
            <FormHelperText error sx={{ mt: 1, mb: 1 }}>
              {error}
            </FormHelperText>
          )}

          <LoadingButton
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            loading={loading}
            disabled={!isValidPhoneNumber(watch("phoneNumber") || "")}
            sx={{ mt: 2, py: 1.5 }}
          >
            Send Code
          </LoadingButton>
        </form>
      )}

      {step === STEPS.SMS_VERIFY && (
        <>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ mb: 1, textAlign: "center" }}
          >
            Verify your phone number
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, textAlign: "center" }}
          >
            Enter the 6-digit code we just sent to{" "}
            <Box component="span" fontWeight={600} color="text.primary">
              {phoneNumber}
            </Box>
            .
          </Typography>

          <DevTextMessage />

          <SixDigitCodeInput
            ref={smsCodeInputRef}
            onComplete={verifySmsCode}
            onChange={setSmsCodeValue}
            disabled={loading}
            autoFocus
          />

          {error && (
            <FormHelperText error sx={{ mt: 2, mb: 0 }}>
              {error}
            </FormHelperText>
          )}

          <LoadingButton
            variant="contained"
            size="large"
            fullWidth
            loading={loading}
            disabled={smsCodeValue.length !== 6}
            onClick={() => verifySmsCode(smsCodeValue)}
            sx={{ py: 1.5, mt: 2 }}
          >
            Verify
          </LoadingButton>
        </>
      )}

      {step === STEPS.SUCCESS && (
        <>
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
              Two-factor authentication enabled
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {enrolledMethod === "totp"
                ? "Your authenticator app has been linked successfully."
                : "Your phone number has been verified successfully."}
            </Typography>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={onDone}
              sx={{ py: 1.5 }}
            >
              Continue
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default MfaEnrollSteps;
