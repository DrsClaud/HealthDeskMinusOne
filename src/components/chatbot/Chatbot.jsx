import React, { useContext, useEffect, useRef, useState } from "react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  MessageList,
  Message,
  TypingIndicator,
  ChatContainer,
} from "@chatscope/chat-ui-kit-react";
import {
  Box,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Chip,
  Alert,
  IconButton,
} from "@mui/material";
import { ChatContext } from "context/Chat";
import { useSpeechRecognition } from "react-speech-recognition";
import { useMessageParser } from "components/chatbot/Chat/useMessageParser";
import { useMessageHandler } from "components/chatbot/Chat/useMessageHandler";
import { useLocation, useNavigate } from "react-router-dom";
import BetaDisclaimer from "components/dashboard/BetaDisclaimer";

// Import components
import Options from "components/chatbot/Options";
import Disclaimer from "components/chatbot/Chat/Disclaimer";
import ChatWrapper from "components/chatbot/Chat/ChatWrapper";
import CustomMessageInput from "components/chatbot/Chat/CustomMessageInput";
import ProfessionalDisclaimer from "./Chat/ProfessionalDisclaimer";
import ContextBox from "./ContextBox";

const Chatbot = ({
  visible = true,
  user,
  userData,
  expanded,
  openTab,
  tabs,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    messages = [],
    rateLimited,
    limit,
    isMessagesLoading,
    newThread,
  } = useContext(ChatContext);
  const chatBoxRef = useRef(null);

  const {
    transcript,
    finalTranscript,
    listening,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [inputValue, setInputValue] = useState("");
  const [computedValue, setComputedValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [submitInfo, setSubmitInfo] = useState(true);
  const [selectedAssistant, setSelectedAssistant] = useState("");
  const { parseMessage } = useMessageParser(openTab);

  const { handleSendRequest } = useMessageHandler({
    user,
    userData,
    setIsTyping,
    submitInfo,
    assistantId: selectedAssistant,
  });

  // Track when we've handled the initial state
  const [hasProcessedInitialState, setHasProcessedInitialState] =
    useState(false);

  // Auto-scroll effect
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, isTyping]); // Re-run when messages change or typing status changes

  // Handle speech recognition
  useEffect(() => {
    if (transcript && listening) {
      setComputedValue(inputValue + " " + transcript);
    }

    if (finalTranscript) {
      setInputValue((prev) => prev + " " + finalTranscript);
      setComputedValue((prev) => prev + " " + finalTranscript);
    }
  }, [transcript, finalTranscript, listening, inputValue]);

  // Modified useEffect for handling the initial chat message
  useEffect(() => {
    // Only run this once when the component is first mounted or when state changes
    if (hasProcessedInitialState) return;

    const initiateMessage = location.state?.initiateChatWith;
    const assistantId = location.state?.assistantId;
    const shouldResetChat = location.state?.resetChat;

    if (initiateMessage && !isMessagesLoading) {
      // Reset chat if the flag is present
      if (shouldResetChat) {
        newThread(); // Call the newThread function from context
        setHasProcessedInitialState(false); // Allow processing after reset
        return; // Exit and let the next render handle the message
      }

      // Set the selected assistant if provided
      if (assistantId) {
        setSelectedAssistant(assistantId);
      }

      // Only send message if there are no messages yet
      if (messages.length === 0) {
        handleSendRequest(initiateMessage);
      }

      // Mark that we've processed this state
      setHasProcessedInitialState(true);

      // Clear the location state to prevent issues on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [
    location.state,
    messages.length,
    isMessagesLoading,
    hasProcessedInitialState,
  ]);

  // Reset the state processor when starting a new chat
  const handleNewChat = () => {
    // This should be called by your "New Chat" button
    setHasProcessedInitialState(false);
  };

  const updateComputed = () => {
    setComputedValue(inputValue);
  };

  const onSendMessage = async (message) => {
    try {
      setInputValue("");
      await handleSendRequest(message);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  console.log("Current location:", location.pathname);

  if (isMessagesLoading) {
    return (
      <Box
        sx={{
          height: "100dvh",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // if (!(!messages || messages.length === 0))
  // if (false)
  return (
    <>
      <Box
        sx={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Options
          sendMessage={handleSendRequest}
          user={user}
          userData={userData}
          submitInfo={submitInfo}
          setSubmitInfo={setSubmitInfo}
          setSelectedAssistant={setSelectedAssistant}
        />
        {/* <ChatContainer // Disabled according to KAN-679
            style={{ height: 100, flexBasis: 0, flexGrow: 0, order: "initial" }}
          >
            <div as="MessageInput" style={{ height: 50 }}>
              <CustomMessageInput
                inputValue={inputValue}
                setInputValue={setInputValue}
                computedValue={computedValue}
                handleSendRequest={onSendMessage}
                rateLimited={rateLimited}
                limit={limit}
                listening={listening}
                browserSupportsSpeechRecognition={
                  browserSupportsSpeechRecognition
                }
                updateComputed={updateComputed}
              />
            </div>
          </ChatContainer> */}

        <Disclaimer userData={userData} />
      </Box>
    </>
  );

  return (
    <>
      <Box
        sx={{
          display: visible ? "block" : "none",
          width: "100%",
          overflow: "scroll",
        }}
        ref={chatBoxRef}
      >
        <Box>
          <ChatWrapper expanded={expanded} full={!tabs || tabs.length === 0}>
            <ContextBox onNewChat={handleNewChat} />

            <MessageList
              typingIndicator={
                isTyping ? (
                  <TypingIndicator content="My HealthDesk is typing..." />
                ) : null
              }
            >
              {messages?.map((message, i) => {
                const parsedText = parseMessage(message);

                return (
                  <Message
                    key={`message_${i}`}
                    model={{
                      direction: message.direction,
                      position: "normal",
                    }}
                  >
                    <Message.CustomContent>{parsedText}</Message.CustomContent>
                  </Message>
                );
              })}
            </MessageList>

            <div
              as="MessageInput"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                margin: "0 auto",
                paddingTop: 10,
                paddingBottom: 10,
                backgroundColor: "#fff",
              }}
            >
              <CustomMessageInput
                inputValue={inputValue}
                setInputValue={setInputValue}
                computedValue={computedValue}
                handleSendRequest={onSendMessage}
                rateLimited={rateLimited}
                limit={limit}
                listening={listening}
                browserSupportsSpeechRecognition={
                  browserSupportsSpeechRecognition
                }
                updateComputed={updateComputed}
              />
              <div style={{ height: 10 }}></div>
              <BetaDisclaimer />
            </div>
          </ChatWrapper>
        </Box>
      </Box>
    </>
  );
};

export default Chatbot;
