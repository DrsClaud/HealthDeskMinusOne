import React from "react";
import { Box } from "@mui/material";
import NewKijabeChatPage from "components/chatbot/NewKijabeChatPage";

/**
 * Ask Me Anything page (dev-only). Same UI as the WordPress embed.
 * NewKijabeChatPage still expects userData (userId, pageTitle, custom_prompt, etc.)
 * for rate-limit key, startNewChat payload, and layout; backend may ignore pageTitle for AMA.
 */
const MOCK_USER_DATA = {
  userId: "preview",
  displayName: "Preview User",
  email: "preview@example.com",
  isDirectLogin: true,
  fromWordPress: true,
  assistant_id: "ask_me_anything",
  pageTitle: "Ask Me Anything",
  pageUrl: "",
  custom_prompt:
    "You are a medical knowledge assistant. Answer the user's questions helpfully.",
};

const AskMeAnythingPage = () => (
  <Box sx={{ maxWidth: 900, mx: "auto", width: "100%", py: 2 }}>
    <NewKijabeChatPage userData={MOCK_USER_DATA} />
  </Box>
);

export default AskMeAnythingPage;
