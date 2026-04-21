import React, { useContext } from "react";
import { Box } from "@mui/material";
import { MessageInput } from "@chatscope/chat-ui-kit-react";
import { AuthContext } from "context/Auth";
import MicButton from "./MicButton";
import SendButton from "./SendButton";

const KijabeMessageInput = ({
  inputValue,
  setInputValue,
  computedValue,
  handleSendRequest,
  rateLimited,
  limit,
  listening,
  browserSupportsSpeechRecognition,
  updateComputed,
}) => {
  const { subscription } = useContext(AuthContext);

  const upgradeMessage = !subscription
    ? `You have reached your message limit. Please start a new chat to continue.`
    : `You have reached your message limit. Please start a new chat to continue.`;

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
        disabled={rateLimited || listening}
        placeholder={rateLimited ? upgradeMessage : "Message My HealthDesk"}
        attachButton={false}
        sendButton={false}
        onSend={handleSendRequest}
        value={inputValue}
        onChange={setInputValue}
        style={{
          marginLeft: browserSupportsSpeechRecognition ? "50px" : "0",
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

export default KijabeMessageInput;
