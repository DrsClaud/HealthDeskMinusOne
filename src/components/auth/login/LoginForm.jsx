import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import {
  TextField,
  FormHelperText,
  Button,
  Box,
  Typography,
  Alert,
  Paper,
  Grid,
  Avatar,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import firebaseApp from "services/firebase";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import { useAuth } from "hooks/useAuth";

const LoginForm = ({ loginFormOpen, setLoginFormOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: authLoading } = useAuth();
  const [firebaseErrors, setFirebaseErrors] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({ mode: "onBlur" });

  const email = watch("email", "");

  // Display message from navigation state if it exists
  useEffect(() => {
    if (location.state?.message) {
      setFirebaseErrors(location.state.message);
    }
  }, [location.state]);

  // Pre-fill email if provided in navigation state
  useEffect(() => {
    if (location.state?.prefillEmail) {
      // Set the email in the form
      setValue("email", location.state.prefillEmail);
    }
  }, [location.state, setValue]);

  const onSubmit = async ({ email }) => {
    setLoading(true);
    setFirebaseErrors("");

    try {
      // Configure action code settings
      const actionCodeSettings = {
        url: `${window.location.origin}/account`,
        handleCodeInApp: true,
      };

      // Get returnUrl from query parameters
      const params = new URLSearchParams(location.search);
      const returnUrl = params.get("returnUrl");

      // If there's a valid returnUrl, include it in the continueUrl
      if (returnUrl) {
        const isValidReturnUrl = (url) => {
          try {
            const parsedUrl = new URL(url, window.location.origin);
            return parsedUrl.origin === window.location.origin;
          } catch {
            return false;
          }
        };

        if (isValidReturnUrl(returnUrl)) {
          actionCodeSettings.url += `?continueUrl=${encodeURIComponent(
            returnUrl
          )}`;
        }
      }

      // Save the email to localStorage to remember what email was used
      localStorage.setItem("emailForSignIn", email);

      // Send sign-in link to user's email
      await firebaseApp.auth().sendSignInLinkToEmail(email, actionCodeSettings);

      // Show success message
      setEmailSent(true);
    } catch (error) {
      console.error("Login error details:", error);

      // Map Firebase error codes to user-friendly messages
      const errorMessages = {
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-disabled":
          "This account has been disabled. Please contact support.",
        "auth/user-not-found":
          "No account found with this email address. Please check your email or sign up.",
        "auth/network-request-failed":
          "Unable to connect to the server. Please check your internet connection.",
      };

      const errorMessage =
        errorMessages[error.code] ||
        `An unexpected error occurred: ${error.message || "Please try again."}`;
      setFirebaseErrors(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // If email has been sent, show confirmation message
  if (emailSent) {
    return (
      <Box>
        <Alert severity="success" sx={{ mb: 2 }}>
          A sign-in link has been sent to <strong>{email}</strong>. Please check
          your inbox and click the link to sign in.
        </Alert>
        <Typography variant="body2" sx={{ mt: 1, pb: 3 }}>
          Didn't receive the email? Check your spam folder or{" "}
          <Button
            variant="text"
            onClick={() => setEmailSent(false)}
            sx={{
              p: 0,
              minWidth: "auto",
              verticalAlign: "baseline",
              textTransform: "none",
            }}
          >
            try again
          </Button>
          .
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" sx={{ textAlign: "center", mb: 3 }}>
        Login
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="email"
          control={control}
          defaultValue={""}
          rules={{
            required: "Email is required.",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,
              message: "Invalid email address.",
            },
          }}
          render={({ field }) => (
            <TextField
              id="email"
              label="Email"
              type="email"
              InputLabelProps={{ shrink: true }}
              variant="standard"
              fullWidth
              sx={{ mb: 2 }}
              error={!!errors?.email}
              helperText={errors?.email?.message}
              {...field}
            />
          )}
        />

        <LoadingButton
          type="submit"
          loading={loading || authLoading}
          disabled={loading || authLoading}
          variant="contained"
          size="large"
          fullWidth
        >
          Sign In
        </LoadingButton>

        {firebaseErrors && (
          <FormHelperText error={true} sx={{ mt: 2 }}>
            {firebaseErrors}
          </FormHelperText>
        )}
      </form>
    </Box>
  );
};

export default LoginForm;
