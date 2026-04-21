import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Box, Button, TextField, Typography } from "@mui/material";
import firebaseApp from "services/firebase";

const AccountResetPassword = ({ getParameter }) => {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();
  const password = watch("password", "");

  const onSubmit = async (data) => {
    setError("");

    try {
      const code = getParameter("oobCode");
      await firebaseApp.auth().confirmPasswordReset(code, data.password);
      setSuccess(true);
      setTimeout(() => navigate("/auth"), 3000);
    } catch (error) {
      setError("Failed to reset password. Please try again.");
    }
  };

  if (success) {
    return (
      <>
        <Typography variant="h4" sx={{ mt: { xs: 4, sm: 10 }, mb: 2 }}>
          Password Reset Successful
        </Typography>
        <Typography variant="body1">
          Your password has been updated. Please wait while we redirect you to
          login...
        </Typography>
      </>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        mt: { xs: 4, sm: 10 },
        mb: 4,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%",
        maxWidth: "400px",
        mx: "auto",
      }}
    >
      <Typography variant="h4" gutterBottom>
        Reset Your Password
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        Please enter your new password below.
      </Typography>

      <TextField
        label="New Password"
        type="password"
        fullWidth
        required
        error={!!errors.password || !!error}
        helperText={errors.password?.message}
        variant="standard"
        InputLabelProps={{ shrink: true }}
        {...register("password", {
          required: "Password is required",
          minLength: {
            value: 6,
            message: "Password must be at least 6 characters long",
          },
        })}
      />

      <TextField
        label="Confirm Password"
        type="password"
        fullWidth
        required
        error={!!errors.confirmPassword || !!error}
        helperText={errors.confirmPassword?.message || error}
        variant="standard"
        InputLabelProps={{ shrink: true }}
        {...register("confirmPassword", {
          required: "Please confirm your password",
          validate: (value) => value === password || "Passwords do not match",
        })}
      />

      <Button
        type="submit"
        variant="contained"
        size="large"
        sx={{ mt: 2 }}
        fullWidth
      >
        Reset Password
      </Button>
    </Box>
  );
};

export default AccountResetPassword;
