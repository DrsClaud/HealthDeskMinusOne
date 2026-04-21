import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, FormHelperText, TextField } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import firebaseApp from "services/firebase";
import { useAuth } from "hooks/useAuth";
import { formValidation } from "validation/formValidation";

const ResetPasswordForm = () => {
  const { loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [firebaseErrors, setFirebaseErrors] = useState("");

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ email }) => {
    setLoading(true);
    setFirebaseErrors("");

    try {
      await firebaseApp.auth().sendPasswordResetEmail(email);
      setSent(true);
    } catch (error) {
      setFirebaseErrors(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="email"
          control={control}
          defaultValue={""}
          rules={formValidation.email}
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
              sx={{ pb: 1 }}
              {...field}
            />
          )}
        />

        {firebaseErrors && (
          <FormHelperText error={true}>{firebaseErrors}</FormHelperText>
        )}

        <LoadingButton
          type="submit"
          loading={loading || authLoading}
          disabled={loading || authLoading}
          variant="contained"
          fullWidth
          size="large"
          sx={{ mt: 2, mb: 3 }}
        >
          Reset Password
        </LoadingButton>
      </form>

      {sent && (
        <Alert severity="success" sx={{ mb: 3 }}>
          A password reset email has been sent.
        </Alert>
      )}
    </>
  );
};

export default ResetPasswordForm;
