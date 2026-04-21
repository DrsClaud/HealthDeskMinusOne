import React, { useContext } from "react";
import { ChatProvider } from "context/Chat";
import { AuthContext } from "context/Auth";
import ChatPage from "components/chat_new/ChatPage";
import { Box, Typography } from "@mui/material";

const ChatPageWrapper = () => {
  const { user, userLoading } = useContext(AuthContext);

  // Show loading while auth is being determined
  if (userLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100dvh",
        }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <ChatProvider>
      <ChatPage hideHistory={true} hideGraph={true} />
    </ChatProvider>
  );
};

export default ChatPageWrapper;
