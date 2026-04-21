import React from "react";
import { Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const ResetPasswordFooter = () => {
  return (
    <Link component={RouterLink} to="/auth" underline="none" variant="body2">
      Go back to login
    </Link>
  );
};

export default ResetPasswordFooter;
