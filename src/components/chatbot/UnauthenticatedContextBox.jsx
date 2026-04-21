import React, { useContext } from "react";
import { Box } from "@mui/material";
import { MainContainer } from "@chatscope/chat-ui-kit-react";
import UnauthenticatedChatbot from "./UnauthenticatedChatbot";
import { useUnauthenticatedRateLimit } from "hooks/useUnauthenticatedRateLimit";
import { UnauthenticatedChatContext } from "context/UnauthenticatedChat";

const UnauthenticatedContextBox = ({ branding }) => {
  const {
    messages,
    setMessages,
    tabs,
    expanded,
    setExpanded,
    currentTab,
    setCurrentTab,
  } = useContext(UnauthenticatedChatContext);
  const rateLimitHook = useUnauthenticatedRateLimit();

  const openTab = (tab) => {
    setCurrentTab(tab);
    setExpanded(true);
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <MainContainer style={{ border: 0, flex: 1 }}>
          <UnauthenticatedChatbot
            visible={true}
            messages={messages}
            setMessages={setMessages}
            expanded={expanded}
            openTab={openTab}
            tabs={tabs}
            rateLimitHook={rateLimitHook}
          />
        </MainContainer>
      </Box>
    </Box>
  );
};

export default UnauthenticatedContextBox;
