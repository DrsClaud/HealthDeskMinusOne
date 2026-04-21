import React, { useState } from "react";
import firebase from "firebase/compat/app";
import { db } from "services/firebase";
import { Controller, useForm } from "react-hook-form";
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
} from "@mui/material";
import { LoadingButton } from "@mui/lab";

const AccountSettings = ({ user, userData, visible, close, setSubmitted }) => {
  // Get email from Firebase Auth first, fallback to Firestore userData
  const currentEmail = user?.email || userData?.email || "";

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm({
    defaultValues: {
      email: currentEmail,
    },
  });
  const [loading, setLoading] = useState(false);
  const [firebaseError, setFirebaseError] = useState();

  // Watch email to determine if changes were made
  const watchEmail = watch("email");

  const onSubmit = async (data) => {
    setLoading(true);
    setFirebaseError(null);
    setSubmitted(false);

    try {
      // Check if this is a new verification (no Auth email) or an update
      const isNewVerification = !user.email;

      // Only check for changes if user already has a verified email
      if (!isNewVerification && data.email === user.email) {
        setFirebaseError("No changes detected");
        setLoading(false);
        return;
      }

      try {
        // Configure action code settings with custom URL parameters
        const actionCodeSettings = {
          url: `${window.location.origin}/account/verify?uid=${
            user.uid
          }&pendingEmail=${encodeURIComponent(data.email)}`,
          handleCodeInApp: false, // Set to false for email action links
        };

        // Send verification email to the new address
        await user.verifyBeforeUpdateEmail(data.email, actionCodeSettings);

        // Store the pending email update in Firestore
        await db.collection("users").doc(user.uid).update({
          pendingEmail: data.email,
          emailChangeRequested: firebase.firestore.FieldValue.serverTimestamp(),
        });

        // Reset form and show success message
        reset({
          email: data.email, // Show the email they're verifying
        });

        setSubmitted(
          "A verification email has been sent to your new email address. " +
            "Please check your inbox and click the verification link to complete the email change."
        );

        close();
      } catch (emailError) {
        console.error("Email update error:", emailError);

        switch (emailError.code) {
          case "auth/requires-recent-login":
            setFirebaseError(
              "For security reasons, please sign out and sign in again before making this change."
            );
            break;
          case "auth/email-already-in-use":
            setFirebaseError(
              "This email is already in use by another account."
            );
            break;
          case "auth/invalid-email":
            setFirebaseError("The email address is not valid.");
            break;
          default:
            setFirebaseError(`An error occurred: ${emailError.message}`);
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setFirebaseError(`An unexpected error occurred: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // When dialog closes, reset the form
  const handleClose = () => {
    reset({
      email: currentEmail,
    });
    setFirebaseError(null);
    close();
  };

  // If user data not loaded yet, return loading screen
  if (!user) {
    return (
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={visible}
        onClick={close}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  return (
    <Dialog open={visible} onClose={handleClose}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {user?.email ? "Update Your Email" : "Verify Your Email"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            {user?.email
              ? "Enter your new email address below. A verification email will be sent to confirm the change."
              : "Confirm your email address below. A verification email will be sent to verify your account."}
          </DialogContentText>

          <Controller
            name="email"
            control={control}
            defaultValue={currentEmail}
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
                error={!!errors?.email}
                helperText={errors?.email?.message}
                sx={{ mb: 2 }}
                {...field}
              />
            )}
          />

          {firebaseError && (
            <FormHelperText error sx={{ mt: 1 }}>
              {firebaseError}
            </FormHelperText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <LoadingButton
            loading={loading}
            type="submit"
            disabled={loading || (user?.email && watchEmail === user.email)}
            autoFocus
            variant="contained"
          >
            {user?.email ? "Update Email" : "Verify Email"}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AccountSettings;
