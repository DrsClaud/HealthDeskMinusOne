import React, { useState, useEffect } from "react";
import firebase from "firebase/compat/app";
import { db } from "services/firebase";
import { Controller, useForm } from "react-hook-form";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { parsePhoneNumber, isValidPhoneNumber } from "react-phone-number-input";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormHelperText,
  TextField,
  Button,
  Backdrop,
  CircularProgress,
  Box,
  Typography,
  Link,
  Alert,
  styled,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";

// Styled PhoneInput to match MUI theme (define outside component to prevent re-creation)
const StyledPhoneInput = styled(PhoneInput, {
  shouldForwardProp: (prop) => prop !== "error",
})(({ theme, error }) => ({
  "& .PhoneInputInput": {
    border: "none",
    borderBottom: `2px solid ${
      error ? theme.palette.error.main : "rgba(0, 0, 0, 0.42)"
    }`,
    borderRadius: 0,
    padding: "8px 0 6px", // Reduced by 1px to compensate for thicker border
    fontSize: "1rem",
    fontFamily: theme.typography.fontFamily,
    color: theme.palette.text.primary,
    backgroundColor: "transparent",
    "&:focus": {
      outline: "none",
      borderBottomColor: theme.palette.primary.main,
    },
    "&:hover": {
      borderBottomColor: theme.palette.text.primary,
    },
  },
  "& .PhoneInputCountrySelect": {
    border: "none",
    borderBottom: `2px solid ${
      error ? theme.palette.error.main : "rgba(0, 0, 0, 0.42)"
    }`,
    borderRadius: 0,
    padding: "8px 8px 6px 0", // Reduced by 1px to compensate for thicker border
    fontSize: "1rem",
    fontFamily: theme.typography.fontFamily,
    backgroundColor: "transparent",
    marginRight: "8px",
    "&:focus": {
      outline: "none",
      borderBottomColor: theme.palette.primary.main,
    },
    "&:hover": {
      borderBottomColor: theme.palette.text.primary,
    },
  },
}));

const PhoneSettings = ({ user, userData, visible, close, setSubmitted }) => {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm();

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [changePhoneLoading, setChangePhoneLoading] = useState(false);
  const [firebaseError, setFirebaseError] = useState();
  const [successMessage, setSuccessMessage] = useState("");
  // Logic: Always start on step 0, only advance to step 1 when code is sent
  const [step, setStep] = useState(0); // 0: enter phone, 1: verify code
  const [codeSent, setCodeSent] = useState(false);

  // Watch form values
  const watchCode = watch("verificationCode");

  // Local state for phone input (uncontrolled)
  const [phoneValue, setPhoneValue] = useState(userData?.phone || "");
  const [lastSyncedPhone, setLastSyncedPhone] = useState(userData?.phone || "");

  // Sync phoneValue when userData.phone actually changes (handles verification updates)
  useEffect(() => {
    // Handle both initial load and subsequent updates
    const currentPhone = userData?.phone || "";
    if (currentPhone !== lastSyncedPhone) {
      setPhoneValue(currentPhone);
      setValue("phoneNumber", currentPhone);
      setLastSyncedPhone(currentPhone);
    }
  }, [userData?.phone, lastSyncedPhone, setValue]);

  // Check for active pending verification when dialog opens
  useEffect(() => {
    if (
      visible &&
      userData?.pendingPhone &&
      userData?.phoneVerificationRequested
    ) {
      // Only go to step 1 if there's a recent pending verification (within last 10 minutes)
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      let verificationTime;

      try {
        // Handle Firestore timestamp
        verificationTime =
          userData.phoneVerificationRequested.toDate?.() ||
          new Date(userData.phoneVerificationRequested);

        if (verificationTime && verificationTime.getTime() > tenMinutesAgo) {
          setStep(1);
          setCodeSent(true);
        } else {
          // Old pending verification, start fresh
          setStep(0);
        }
      } catch (error) {
        // If timestamp parsing fails, start fresh
        console.log("Could not parse verification timestamp, starting fresh");
        setStep(0);
      }
    } else {
      setStep(0);
    }
  }, [visible, userData?.pendingPhone, userData?.phoneVerificationRequested]);

  // Format phone number for display (keep existing for backwards compatibility)
  const formatPhoneNumberForDisplay = (phoneNumber) => {
    if (!phoneNumber) return "";
    try {
      const parsed = parsePhoneNumber(phoneNumber);
      return parsed ? parsed.formatNational() : phoneNumber;
    } catch {
      return phoneNumber;
    }
  };

  const handlePhoneChange = (value) => {
    setPhoneValue(value);
    setValue("phoneNumber", value); // Sync with react-hook-form
  };

  const sendVerificationCode = async (data) => {
    // Use phoneValue as source of truth, fallback to form data
    const phoneNumber = phoneValue || data.phoneNumber;

    // Prevent submission if phone number hasn't changed from current verified number
    if (userData?.phone && userData.phone === phoneNumber) {
      return; // Silently prevent submission
    }

    setLoading(true);
    setFirebaseError(null);

    try {
      // Validate phone number using the library
      if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
        setFirebaseError("Please enter a valid phone number.");
        setLoading(false);
        return;
      }

      // Call Firebase function to send verification code
      const sendCodeFunction = firebase
        .functions()
        .httpsCallable("sendPhoneVerificationCode");
      await sendCodeFunction({ phoneNumber });

      // Update user document with pending phone
      await db.collection("users").doc(user.uid).update({
        pendingPhone: phoneNumber,
        phoneVerificationRequested:
          firebase.firestore.FieldValue.serverTimestamp(),
      });

      setCodeSent(true);
      setStep(1);
    } catch (error) {
      console.error("Error sending verification code:", error);

      if (error.code === "functions/invalid-argument") {
        setFirebaseError("Invalid phone number format.");
      } else if (error.code === "functions/already-exists") {
        setFirebaseError(
          "This phone number is already verified by another account."
        );
      } else {
        setFirebaseError(`Error sending code: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (data) => {
    setLoading(true);
    setFirebaseError(null);

    try {
      // Call Firebase function to verify code
      const verifyFunction = firebase
        .functions()
        .httpsCallable("verifyPhoneCode");
      await verifyFunction({
        verificationCode: data.verificationCode,
      });

      // Close dialog and show success in Settings page
      setSubmitted(
        userData?.role === "facility"
          ? "Phone number verified successfully! You can now receive update reminders."
          : "Phone number verified successfully! You can now receive medication reminders."
      );
      handleClose();
    } catch (error) {
      console.error("Error verifying code:", error);

      if (error.code === "functions/invalid-argument") {
        setFirebaseError("Invalid verification code.");
      } else if (error.code === "functions/deadline-exceeded") {
        setFirebaseError(
          "Verification code expired. Please request a new code."
        );
      } else {
        setFirebaseError(`Error verifying code: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!userData?.pendingPhone) {
      setFirebaseError("No pending phone found.");
      return;
    }

    setResendLoading(true);
    setFirebaseError(null);

    try {
      const sendCodeFunction = firebase
        .functions()
        .httpsCallable("sendPhoneVerificationCode");
      await sendCodeFunction({ phoneNumber: userData.pendingPhone });

      setSuccessMessage("Verification code resent!");
    } catch (error) {
      console.error("Error resending code:", error);
      setFirebaseError(`Error resending code: ${error.message}`);
    } finally {
      setResendLoading(false);
    }
  };

  const changePhoneNumber = async () => {
    setChangePhoneLoading(true);
    setFirebaseError(null);

    try {
      // Clear pending phone verification from user document
      await db.collection("users").doc(user.uid).update({
        pendingPhone: firebase.firestore.FieldValue.delete(),
        phoneVerificationRequested: firebase.firestore.FieldValue.delete(),
        twilioVerificationSid: firebase.firestore.FieldValue.delete(),
      });

      // Reset form and go back to step 0
      const resetPhone = userData?.phone || "";
      setPhoneValue(resetPhone);
      setLastSyncedPhone(resetPhone); // Update sync tracker
      setValue("phoneNumber", resetPhone);
      setValue("verificationCode", "");
      setStep(0);
      setCodeSent(false);
      setSuccessMessage("");
    } catch (error) {
      console.error("Error clearing pending phone:", error);
      setFirebaseError(`Error changing phone number: ${error.message}`);
    } finally {
      setChangePhoneLoading(false);
    }
  };

  // When dialog closes, reset everything
  const handleClose = () => {
    const resetPhone = userData?.phone || "";
    setPhoneValue(resetPhone);
    setLastSyncedPhone(resetPhone); // Update sync tracker
    reset({
      phoneNumber: resetPhone,
      verificationCode: "",
    });
    setStep(0); // Always reset to step 0, don't rely on potentially stale userData
    setCodeSent(false);
    setFirebaseError(null);
    setSuccessMessage("");
    setResendLoading(false);
    setChangePhoneLoading(false);
    close();
  };

  // If user data not loaded yet, return early
  if (!user) {
    return;
  }

  const isPhoneVerified = userData?.phoneVerified === true;

  return (
    <Dialog open={visible} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {isPhoneVerified ? "Update Phone Number" : "Verify Phone Number"}
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {isPhoneVerified
            ? "Your phone number is verified. You can update it below if needed."
            : userData?.role === "facility"
            ? "Enter your phone number to receive update reminders via SMS."
            : "Enter your phone number to receive medication reminders via SMS."}
        </DialogContentText>

        {/* Step 0: Enter Phone Number */}
        {step === 0 && (
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1, fontSize: "0.75rem" }}
            >
              Phone Number
            </Typography>
            <form onSubmit={handleSubmit(sendVerificationCode)}>
              <input
                type="hidden"
                {...register("phoneNumber", {
                  required: "Phone number is required.",
                  validate: (value) => {
                    const currentValue = phoneValue || value;
                    if (!currentValue) return "Phone number is required.";
                    if (!isValidPhoneNumber(currentValue)) {
                      return "Please enter a valid phone number.";
                    }
                    return true;
                  },
                })}
              />
              <Box>
                <StyledPhoneInput
                  international
                  countryCallingCodeEditable={false}
                  defaultCountry="US"
                  value={phoneValue}
                  onChange={handlePhoneChange}
                  placeholder="Enter phone number"
                  error={!!errors?.phoneNumber}
                />
                {errors?.phoneNumber && (
                  <FormHelperText error sx={{ mt: 0.5 }}>
                    {errors.phoneNumber.message}
                  </FormHelperText>
                )}
              </Box>
            </form>
          </Box>
        )}

        {/* Step 1: Verify Code */}
        {step === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              We sent a verification code to{" "}
              <strong>
                {userData?.pendingPhone
                  ? formatPhoneNumberForDisplay(userData.pendingPhone)
                  : formatPhoneNumberForDisplay(phoneValue)}
              </strong>
              .
            </Typography>

            <form onSubmit={handleSubmit(verifyCode)}>
              <Controller
                name="verificationCode"
                control={control}
                defaultValue=""
                rules={{
                  required: "Verification code is required.",
                  pattern: {
                    value: /^\d{6}$/,
                    message: "Please enter the 6-digit code.",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Verification Code"
                    type="text"
                    placeholder="123456"
                    InputLabelProps={{ shrink: true }}
                    variant="standard"
                    fullWidth
                    error={!!errors?.verificationCode}
                    helperText={errors?.verificationCode?.message}
                    inputProps={{ maxLength: 6 }}
                  />
                )}
              />
            </form>

            <Box
              sx={{
                mt: 1,
                mb: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography color="text.secondary" variant="body2">
                Didn't receive a code?{" "}
                <Link
                  variant="body2"
                  onClick={resendCode}
                  disabled={resendLoading}
                  sx={{
                    cursor: resendLoading ? "default" : "pointer",
                    color: resendLoading ? "text.disabled" : "primary.main",
                  }}
                >
                  Resend code
                </Link>
                .
              </Typography>
              {resendLoading && <CircularProgress size={14} sx={{ ml: 0.5 }} />}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography color="text.secondary" variant="body2">
                Wrong number?{" "}
                <Link
                  variant="body2"
                  onClick={changePhoneNumber}
                  disabled={changePhoneLoading}
                  sx={{
                    cursor: changePhoneLoading ? "default" : "pointer",
                    color: changePhoneLoading
                      ? "text.disabled"
                      : "primary.main",
                  }}
                >
                  Change phone number
                </Link>
                .
              </Typography>
              {changePhoneLoading && (
                <CircularProgress size={14} sx={{ ml: 0.5 }} />
              )}
            </Box>
          </Box>
        )}

        {successMessage && (
          <Alert
            severity="success"
            sx={{ mt: 2 }}
            onClose={() => setSuccessMessage("")}
          >
            {successMessage}
          </Alert>
        )}

        {firebaseError && (
          <FormHelperText error sx={{ mt: 1 }}>
            {firebaseError}
          </FormHelperText>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading || changePhoneLoading}>
          Cancel
        </Button>

        {step === 0 && (
          <LoadingButton
            loading={loading}
            onClick={handleSubmit(sendVerificationCode)}
            disabled={
              loading ||
              changePhoneLoading ||
              !phoneValue ||
              !isValidPhoneNumber(phoneValue || "") ||
              (userData?.phone && userData.phone === phoneValue)
            }
            variant="contained"
          >
            Send Code
          </LoadingButton>
        )}

        {step === 1 && (
          <LoadingButton
            loading={loading}
            onClick={handleSubmit(verifyCode)}
            disabled={loading || changePhoneLoading || !watchCode}
            variant="contained"
          >
            Verify Phone
          </LoadingButton>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PhoneSettings;
