import { SendRounded } from "@mui/icons-material";
import { Box } from "@mui/material";
import React from "react";

const SendButton = ({ inputValue, handleSendRequest, disabled = false }) => {
  return (
    <Box>
      <Box
        sx={{
          p: "0.3rem 0 0",
          position: "relative",
          zIndex: 999,
        }}
      >
        <button
          className="cs-button cs-submit"
          disabled={inputValue.length === 0 || disabled}
          style={{
            margin: "0",
            zIndex: 9999,
            position: "absolute",
          }}
          onClick={() => handleSendRequest(inputValue)}
        >
          <SendRounded />
        </button>
      </Box>
    </Box>
  );
};

export default SendButton;
