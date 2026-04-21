import React, { useState, useEffect } from "react";
import { AccessTimeRounded } from "@mui/icons-material";
import { Alert } from "@mui/material";
import { formatDistanceToNow } from "date-fns";

const TimeRemaining = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const expiry = new Date(expiresAt);
      if (expiry <= new Date()) {
        setTimeLeft("Your daily pass has expired.");
        return;
      }

      const timeRemaining = formatDistanceToNow(expiry, { addSuffix: true });
      setTimeLeft(`Your daily pass expires ${timeRemaining}.`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <Alert
      icon={<AccessTimeRounded fontSize="inherit" />}
      severity="info"
      sx={{ mt: "-10px", mb: 3 }}
    >
      {timeLeft}
    </Alert>
  );
};

export default TimeRemaining;
