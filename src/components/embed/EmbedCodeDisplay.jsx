import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Snackbar,
  Typography,
  DialogContentText,
} from "@mui/material";
import { copyEmbedCode, embedCode } from "./snippet";

const EmbedCodeDisplay = () => {
  const [showCopied, setShowCopied] = useState(false);

  const handleCopy = () => {
    copyEmbedCode();
    setShowCopied(true);
  };

  return (
    <>
      <DialogContentText sx={{ mb: 3 }}>
        Copy and paste this code into your website to add the My HealthDesk
        widget:
      </DialogContentText>

      <TextField
        multiline
        rows={4}
        fullWidth
        value={embedCode}
        InputProps={{
          readOnly: true,
          sx: {
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: "0.9rem",
          },
        }}
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        onClick={handleCopy}
        sx={{ backgroundColor: "#117aca" }}
      >
        Copy Embed Code
      </Button>

      <Snackbar
        open={showCopied}
        autoHideDuration={3000}
        onClose={() => setShowCopied(false)}
        message="Embed code copied to clipboard!"
      />

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Preview:
        </Typography>
        <div dangerouslySetInnerHTML={{ __html: embedCode }} />
      </Box>
    </>
  );
};

export default EmbedCodeDisplay;
