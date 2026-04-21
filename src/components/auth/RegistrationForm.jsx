import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  Box,
  TextField,
  FormHelperText,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import firebaseApp from "services/firebase";
import LinkedInTag from "react-linkedin-insight";

import PrivacyAndTerms from "components/auth/layout/PrivacyAndTerms";
import { isLikelyWorkEmail } from "utils/emailUtils";

const RegistrationForm = ({
  role,
  onSuccess,
  features,
  checkWorkEmail = false,
  redirectUrl = "/account",
}) => {
  const [loading, setLoading] = useState(false);
  const [firebaseErrors, setFirebaseErrors] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isPersonalEmail, setIsPersonalEmail] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);

  const {
    handleSubmit,
    formState: { errors },
    control,
    register,
    watch,
  } = useForm({
    mode: "onBlur",
  });

  const email = watch("email", "");

  const handleEmailBlur = (event) => {
    if (checkWorkEmail) {
      const email = event.target.value;
      if (email) {
        setIsPersonalEmail(!isLikelyWorkEmail(email));
        setEmailChecked(true);
      } else {
        setEmailChecked(false);
      }
    }
  };

  // Function to send sign-in link to email
  const sendRegistrationLink = async (email) => {
    // Check if user exists and if account limit is reached in one call
    const functions = firebase.app().functions("us-central1");
    const checkEligibility = functions.httpsCallable(
      "checkRegistrationEligibility"
    );
    const { data: eligibilityCheck } = await checkEligibility({
      email,
      role,
    });

    if (!eligibilityCheck.eligible) {
      if (eligibilityCheck.reason === "user_exists") {
        throw new Error(
          "An account with this email already exists. Please use the login page instead."
        );
      } else if (eligibilityCheck.reason === "limit_reached") {
        throw new Error(eligibilityCheck.message);
      }
    }

    // Save the email to localStorage to remember what email was used
    localStorage.setItem("emailForSignIn", email);

    // Configure action code settings with continueUrl for redirection after auth
    const actionCodeSettings = {
      url: `${window.location.origin}/account?role=${role}`,
      handleCodeInApp: true,
    };

    // Send sign-in link to user's email
    await firebaseApp.auth().sendSignInLinkToEmail(email, actionCodeSettings);

    // Track LinkedIn conversion
    LinkedInTag.track(2177722);

    return true;
  };

  const onSubmit = async (formData) => {
    setLoading(true);
    setFirebaseErrors("");

    try {
      await sendRegistrationLink(formData.email);
      setEmailSent(true);
      if (onSuccess) onSuccess(formData.email);
    } catch (error) {
      setFirebaseErrors(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {emailSent ? (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            A sign-in link has been sent to <strong>{email}</strong>. Please
            check your inbox and click the link to complete your registration.
          </Alert>
          <Typography variant="body2" sx={{ mb: 4 }}>
            The link will expire in 24 hours. If you don't see the email, please
            check your spam folder.
          </Typography>
        </Box>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            id="email"
            label="Email"
            type="email"
            variant="standard"
            fullWidth
            InputLabelProps={{ shrink: true }}
            error={!!errors?.email}
            helperText={errors?.email?.message}
            sx={{
              mb:
                checkWorkEmail &&
                  (!isPersonalEmail || !emailChecked) &&
                  !errors?.email
                  ? 0
                  : 2,
            }}
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,
                message: "Invalid email address",
              },
            })}
            onBlur={handleEmailBlur}
          />

          {checkWorkEmail &&
            (!isPersonalEmail || !emailChecked) &&
            !errors?.email && (
              <FormHelperText sx={{ mb: 1, mt: 1 }}>
                Using a work email address is not recommended. Using a personal
                email address (like Gmail or Outlook) will allow you to have
                access to your account even if your employment changes.
              </FormHelperText>
            )}

          {firebaseErrors && (
            <FormHelperText error={true} sx={{ mb: 2 }}>
              {firebaseErrors}
            </FormHelperText>
          )}

          {features && features}

          <PrivacyAndTerms control={control} errors={errors} />

          <LoadingButton
            type="submit"
            loading={loading}
            disabled={loading}
            variant="contained"
            fullWidth
            size="large"
            sx={{ mt: 3, mb: 2 }}
          >
            Continue
          </LoadingButton>
        </form>
      )}
    </Box>
  );
};

export default RegistrationForm;
