import React, { useEffect, useState, useRef } from "react";
import { Box, Typography, CircularProgress, Alert } from "@mui/material";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "services/firebase";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  MessageList,
  Message,
  TypingIndicator,
  ChatContainer,
} from "@chatscope/chat-ui-kit-react";
import CustomMessageInput from "./Chat/CustomMessageInput";
import { HEALTH_DESK_SENDER } from "./constants";

/**
 * Chat component for Kijabe users
 * Uses the kijabe_chat collection with server-side rate limiting
 */
const KijabeChat = ({ userData }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatDoc, setChatDoc] = useState(null);
  const chatBoxRef = useRef(null);

  // Initialize chat and set up listener
  useEffect(() => {
    if (!userData?.userId) {
      setError("User data not available");
      setLoading(false);
      return;
    }

    async function initializeChat() {
      try {
        // Check for existing chat document
        const q = query(
          collection(db, "kijabe_chat"),
          where("userId", "==", userData.userId),
          orderBy("timestamp", "desc"),
          limit(1)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
          // If no document exists, create one
          if (snapshot.empty) {
            const newChatRef = await addDoc(collection(db, "kijabe_chat"), {
              userId: userData.userId,
              userTier: userData.userTier || "basic",
              messages: [],
              timestamp: new Date(),
            });

            setChatDoc(newChatRef);
            setMessages([]);
            setLoading(false);
          } else {
            // Use existing document
            const doc = snapshot.docs[0];
            setChatDoc({ id: doc.id, ref: doc.ref });

            // Set messages from the document
            const data = doc.data();
            setMessages(data.messages || []);
            setLoading(false);

            // Check if assistant is typing
            const lastMessage = data.messages?.[data.messages.length - 1];
            if (lastMessage) {
              setIsTyping(
                Date.now() - lastMessage.created < 5000 &&
                  lastMessage.sender !== HEALTH_DESK_SENDER
              );
            } else {
              setIsTyping(false);
            }
          }
        });

        return () => unsubscribe();
      } catch (err) {
        console.error("Error initializing Kijabe chat:", err);
        setError("Failed to load chat. Please try again later.");
        setLoading(false);
      }
    }

    initializeChat();
  }, [userData]);

  // Auto-scroll effect
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (message) => {
    if (!message.trim() || !chatDoc) return;

    try {
      setInputValue("");
      setIsTyping(true);

      // Add the message to Firestore
      await chatDoc.ref.update({
        messages: [
          ...(messages || []),
          {
            sender: "user",
            message: message,
            created: Date.now(),
            direction: "outgoing",
          },
        ],
        timestamp: new Date(),
      });
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "70vh",
        display: "flex",
        flexDirection: "column",
      }}
      ref={chatBoxRef}
    >
      <ChatContainer style={{ flexGrow: 1 }}>
        <MessageList
          typingIndicator={
            isTyping ? (
              <TypingIndicator content="My HealthDesk is typing..." />
            ) : null
          }
        >
          {messages.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography>
                Welcome to the Kijabe Health Desk! How can I help you today?
              </Typography>
            </Box>
          ) : (
            messages.map((msg, i) => (
              <Message
                key={`kijabe_msg_${i}`}
                model={{
                  direction:
                    msg.direction ||
                    (msg.sender === "user" ? "outgoing" : "incoming"),
                  position: "normal",
                }}
              >
                <Message.CustomContent>
                  {msg.isError ? (
                    <Alert severity="warning" sx={{ mb: 0 }}>
                      {msg.message}
                    </Alert>
                  ) : (
                    msg.message
                  )}
                </Message.CustomContent>
              </Message>
            ))
          )}
        </MessageList>
      </ChatContainer>

      <Box sx={{ mt: 2 }}>
        <CustomMessageInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          computedValue={inputValue}
          handleSendRequest={handleSendMessage}
          rateLimited={false}
          updateComputed={() => {}}
        />
      </Box>
    </Box>
  );
};

export default KijabeChat;
