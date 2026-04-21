import { Typography, Alert, CircularProgress } from "@mui/material";
import React from "react";

export default function AccountVerifyEmail({ verified, isEmailRecovery }) {
  return (
    <>
      <Typography variant="h4" sx={{ mt: { xs: 4, sm: 10 }, mb: 2 }}>
        {isEmailRecovery
          ? "Your Email Has Been Restored"
          : "Your Email Has Been Updated"}
      </Typography>

      {verified ? (
        <Typography>Please wait, you will be redirected shortly.</Typography>
      ) : (
        <CircularProgress />
      )}
    </>
  );
}
