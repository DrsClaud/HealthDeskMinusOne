import React from "react";
import { Avatar, Box, Button, Grid, Typography } from "@mui/material";
import { ChevronRightRounded } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";

const MuWrapper = ({ children }) => (
  <Box
    sx={{
      margin: "auto",
    }}
  >
    {children}
  </Box>
);

export default MuWrapper;
