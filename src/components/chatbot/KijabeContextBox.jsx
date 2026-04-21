import React, { useContext } from "react";
import { Box } from "@mui/material";
import { MainContainer } from "@chatscope/chat-ui-kit-react";
import UnauthenticatedChatbot from "./UnauthenticatedChatbot";
import { useKijabeRateLimit } from "hooks/useKijabeRateLimit";
import { UnauthenticatedChatContext } from "context/UnauthenticatedChat";

const KijabeContextBox = ({ userData, contextProviderProps }) => {
  const {
    messages,
    setMessages,
    tabs,
    expanded,
    setExpanded,
    currentTab,
    setCurrentTab,
  } = useContext(UnauthenticatedChatContext);

  // Pass userData to the rate limit hook
  const rateLimitHook = useKijabeRateLimit(userData);

  const openTab = (tab) => {
    setCurrentTab(tab);
    setExpanded(true);
  };

  // Create context string for the AI based on WordPress page title
  const generateContext = () => {
    const pageTitle = userData?.pageTitle;

    if (!pageTitle) {
      return "";
    }

    // Generate the context string - either custom from JWT or default
    let contextString;

    // Check for custom prompt from JWT token
    if (userData?.custom_prompt) {
      // Replace all instances of {pageTitle} with the actual page title
      contextString = userData.custom_prompt.replace(/{pageTitle}/g, pageTitle);
    } else {
      // Fall back to default prompt if no custom prompt in JWT
      contextString = `IMPORTANT: The user has just completed a medical education module on "${pageTitle}".

Please respond to questions in the context of "${pageTitle}" and related medical knowledge.

Your role is to help reinforce their learning by providing accurate medical information related to ${pageTitle}. The user is a medical professional or student who needs to consolidate their understanding of this topic.`;
    }

    return contextString;
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "585px",
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
            kijabeUser={userData}
            contextData={generateContext()}
          />
        </MainContainer>
      </Box>
    </Box>
  );
};

// Use React.memo but allow updates to propagate when props change
export default React.memo(KijabeContextBox, (prevProps, nextProps) => {
  // Return false if custom_prompt has changed (forcing a re-render)
  if (prevProps.userData?.custom_prompt !== nextProps.userData?.custom_prompt) {
    return false;
  }

  // Return true for other cases (preventing re-renders)
  return true;
});
