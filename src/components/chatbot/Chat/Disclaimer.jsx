import React from "react";
import { Alert } from "@mui/material";

const Disclaimer = ({ userData }) => {
  const disclaimerText =
    userData?.role === "professional"
      ? "My HealthDesk Medical SuperIntelligence is expert-curated artificial intelligence for educational purposes only. It can make mistakes and cannot provide health care. Exercise professional judgement and independently verify any information presented here."
      : "My HealthDesk Medical SuperIntelligence is expert-curated artificial intelligence. It can make mistakes and cannot provide health care. Verify all medical information with a health care professional.";

  return (
    <Alert severity="info" sx={{ mt: 2, mb: 2, textAlign: "center" }}>
      {disclaimerText}
    </Alert>
  );
};

export default Disclaimer;
