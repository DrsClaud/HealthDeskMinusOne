import { MicRounded } from "@mui/icons-material";
import { Box, Dialog, DialogContent, Tooltip, Typography } from "@mui/material";
import SpeechRecognition from "react-speech-recognition";
import React, { useState } from "react";

const MicButton = ({ listening, updateComputed }) => {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  const handleRecording = () => {
    navigator.permissions.query({ name: "microphone" }).then((result) => {
      if (result.state === "granted") {
        if (listening) {
          SpeechRecognition.stopListening();
        } else {
          SpeechRecognition.startListening();
          updateComputed();
        }
      } else {
        setOpen(true);
        SpeechRecognition.startListening();
      }

      result.onchange = function () {
        if (this.state === "granted") {
          setOpen(false);
        }
      };
    });

    // if (listening) {
    //   SpeechRecognition.stopListening();
    // } else {
    //   SpeechRecognition.startListening();
    // }
  };

  return (
    <Box sx={{ position: "absolute", bottom: 0, left: 0 }}>
      <Dialog open={open} onClose={handleClose}>
        <DialogContent>
          <Typography variant="body">Select “Allow” in settings to use your microphone.</Typography>
        </DialogContent>
      </Dialog>
      <Box
        sx={{
          p: "0.4rem 0 0",
          position: "relative",
          zIndex: 999,
        }}
      >
        <Tooltip
          PopperProps={{
            disablePortal: true,
          }}
          open={listening}
          disableFocusListener
          disableHoverListener
          disableTouchListener
          title="Now listening..."
        >
          <button
            className="cs-button"
            style={{
              margin: "0",
              zIndex: 9999,
              position: "absolute",
            }}
            onClick={handleRecording}
          >
            <MicRounded color={listening ? "primary" : "initial"} />
          </button>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default MicButton;
