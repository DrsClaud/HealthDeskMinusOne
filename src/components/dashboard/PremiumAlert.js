import React from "react";
import { Alert, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const PremiumAlert = ({ feature = "This feature" }) => {
  return (
    <Alert
      severity="warning"
      sx={{ mb: 3 }}
      action={
        <Button
          color="inherit"
          size="small"
          component={RouterLink}
          to="/dashboard/upgrade"
        >
          Upgrade
        </Button>
      }
    >
      {feature} is a premium feature. Upgrade your membership to save and
      activate settings.
    </Alert>
  );
};

export default PremiumAlert;
