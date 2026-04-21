import React, { useEffect, useRef, useState } from "react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  MessageList,
  Message,
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ChatWrapper from "components/chatbot/Chat/ChatWrapper";
import UnauthenticatedMessageInput from "components/chatbot/Chat/UnauthenticatedMessageInput";
import Disclaimer from "components/chatbot/Chat/Disclaimer";
import { db } from "services/firebase";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";

const UnauthenticatedChatbot = ({
  visible = true,
  messages,
  setMessages,
  expanded,
  rateLimitHook,
  kijabeUser,
  contextData = "",
}) => {
  const navigate = useNavigate();
  const chatBoxRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentThreadDoc, setCurrentThreadDoc] = useState(null);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [processingMessage, setProcessingMessage] = useState(false);
  const lastMessageRef = useRef("");

  // Get module title for display
  const moduleTitle =
    kijabeUser?.pageTitle || kijabeUser?.wpPageTitle || "this module";

  // Auto-scroll effect
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Hide disclaimer when messages exist
  useEffect(() => {
    if (messages?.length > 0) {
      setShowDisclaimer(false);
    }
  }, [messages]);

  // Add this useEffect to handle URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialMessage = params.get("message");

    if (initialMessage && !messages?.length) {
      handleSendRequest(initialMessage);
    }
  }, []); // Empty dependency array since we only want this to run once on mount

  const handleSendRequest = async (message) => {
    if (rateLimitHook.rateLimited || !message.trim()) return;

    // Prevent duplicate message processing (can happen with StrictMode or double renders)
    if (processingMessage || lastMessageRef.current === message) {
      console.log("Preventing duplicate message processing:", message);
      return;
    }

    // Set message tracking state
    setProcessingMessage(true);
    lastMessageRef.current = message;

    // Set typing indicator immediately
    setIsTyping(true);
    setInputValue("");

    try {
      const userMessage = {
        message,
        direction: "outgoing",
        sender: "user",
        created: Date.now(),
      };

      // Add Kijabe user info to message if available
      if (kijabeUser) {
        userMessage.userId = kijabeUser.userId;
        // Add page title to support module-based rate limiting
        userMessage.pageTitle =
          kijabeUser?.pageTitle || kijabeUser?.wpPageTitle;
      }

      // Update local messages immediately to show user message
      setMessages((prev) => [...(prev || []), userMessage]);
      setShowDisclaimer(false);

      let docRef;
      if (!currentThreadDoc) {
        console.log("Creating new chat thread with context:", contextData);
        docRef = await db.collection("unauthenticated_chat").add({
          messages: [userMessage],
          context: contextData,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });
        setCurrentThreadDoc(docRef);

        // Verify context was saved
        const snapshot = await docRef.get();
        console.log("Document after creation:", snapshot.data());
      } else {
        docRef = currentThreadDoc;
        await docRef.update({
          messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Listen for the response
      const unsubscribe = docRef.onSnapshot((doc) => {
        const data = doc.data();
        const messages = data?.messages || [];
        const lastMessage = messages[messages.length - 1];

        if (lastMessage?.sender === "My HealthDesk") {
          // Increment message count only after AI response received
          rateLimitHook.incrementCount();

          // Check if this message puts us at the limit
          if (rateLimitHook.remaining <= 0) {
            setShowRateLimitModal(true);
          }

          setMessages(messages);
          setIsTyping(false);
          setProcessingMessage(false);
          unsubscribe();
        }
      });

      // Cleanup subscription after 30 seconds
      setTimeout(() => {
        unsubscribe();
        setIsTyping(false);
        setProcessingMessage(false);
      }, 30000);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...(prev || []),
        {
          message: "Sorry, I encountered an error. Please try again later.",
          direction: "incoming",
          sender: "My HealthDesk",
          isError: true,
        },
      ]);
      setIsTyping(false);
      setProcessingMessage(false);
    }
  };

  if (!messages || messages.length === 0) {
    // Create a custom welcome message that references the module if available
    const welcomeMessage =
      contextData && contextData.includes("medical education module")
        ? `Hello! I'm here to help you with any questions about the ${
            kijabeUser?.pageTitle || ""
          } module you just completed.`
        : "Hello! I'm My HealthDesk Medical SuperIntelligence. How can I help you today?";

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
          alignItems: "center",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: "970px", mb: 0 }}>
          <Disclaimer />
        </Box>

        <Box
          sx={{
            display: visible ? "flex" : "none",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
            position: "relative",
            width: "100%",
            maxWidth: "970px",
          }}
          ref={chatBoxRef}
        >
          <ChatWrapper expanded={expanded}>
            <MessageList>
              <Message
                model={{
                  direction: "incoming",
                  position: "normal",
                }}
              >
                <Message.CustomContent>{welcomeMessage}</Message.CustomContent>
              </Message>
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
              <UnauthenticatedMessageInput
                inputValue={inputValue}
                setInputValue={setInputValue}
                handleSendRequest={handleSendRequest}
                rateLimited={rateLimitHook.rateLimited}
                limit={rateLimitHook.turnsLimit}
                remaining={rateLimitHook.turnsRemaining}
              />
            </div>
          </ChatWrapper>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
          alignItems: "center",
        }}
      >
        {showDisclaimer && (
          <Box sx={{ width: "100%", maxWidth: "970px", mb: 0 }}>
            <Disclaimer />
          </Box>
        )}

        <Box
          sx={{
            display: visible ? "flex" : "none",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
            position: "relative",
            width: "100%",
            maxWidth: "970px",
          }}
          ref={chatBoxRef}
        >
          <ChatWrapper expanded={expanded}>
            <MessageList
              typingIndicator={
                isTyping ? (
                  <TypingIndicator content="My HealthDesk is typing..." />
                ) : null
              }
            >
              {messages?.map((message, i) => (
                <Message
                  key={`message_${i}`}
                  model={{
                    direction: message.direction,
                    position: "normal",
                  }}
                >
                  <Message.CustomContent>
                    {message.message}
                  </Message.CustomContent>
                </Message>
              ))}
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
              <UnauthenticatedMessageInput
                inputValue={inputValue}
                setInputValue={setInputValue}
                handleSendRequest={handleSendRequest}
                rateLimited={rateLimitHook.rateLimited}
                limit={rateLimitHook.turnsLimit}
                remaining={rateLimitHook.turnsRemaining}
              />
            </div>
          </ChatWrapper>
        </Box>
      </Box>
      <Dialog
        open={showRateLimitModal}
        onClose={() => setShowRateLimitModal(false)}
        aria-labelledby="rate-limit-dialog-title"
      >
        <DialogTitle id="rate-limit-dialog-title">
          Message Limit Reached
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You've reached your daily message limit for {moduleTitle}. Your
            message limit will reset tomorrow, or you can access a different
            module to continue learning.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRateLimitModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UnauthenticatedChatbot;
