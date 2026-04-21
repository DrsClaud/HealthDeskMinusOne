import React from "react";
import { Box } from "@mui/material";
import { MessageInput } from "@chatscope/chat-ui-kit-react";
import SendButton from "./SendButton";

const UnauthenticatedMessageInput = ({
  inputValue,
  setInputValue,
  handleSendRequest,
  rateLimited,
  limit,
  remaining,
}) => {
  const upgradeMessage = `You've reached your daily limit of 8 turns for this module.`;

  return (
    <Box
      sx={{
        position: "relative",
        zIndex: 999,
        height: 50,
        maxWidth: 970,
        margin: "0 auto",
      }}
    >
      <MessageInput
        placeholder={rateLimited ? upgradeMessage : "Message My HealthDesk"}
        disabled={rateLimited}
        attachButton={false}
        sendButton={false}
        onSend={handleSendRequest}
        value={inputValue}
        onChange={setInputValue}
        style={{
          marginRight: "40px",
          width: "calc(100% - 50px)",
        }}
      />

      <Box>
        <SendButton
          inputValue={inputValue}
          handleSendRequest={handleSendRequest}
          disabled={rateLimited}
        />
      </Box>
    </Box>
  );
};

export default UnauthenticatedMessageInput;
