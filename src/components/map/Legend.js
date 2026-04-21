import { Box, Typography } from "@mui/material";
import React from "react";

const Legend = () => {
  const labels = ["empty", "half", "full", "overflowing"];

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        width: "100%",
        mt: 0.5,
        mb: 0,
      }}
    >
      {labels.map((text, i) => (
        <Typography
          key={i}
          variant="caption"
          sx={{
            fontWeight: 500,
            textTransform: "capitalize",
            color: "grey.600",
            letterSpacing: 0.5,
            fontSize: "0.75rem",
            flex: 1,
          }}
        >
          {text}
        </Typography>
      ))}
    </Box>
  );
};

export default Legend;
