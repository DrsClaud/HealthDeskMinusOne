import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import React, { useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { ThemeProvider as StyledThemeProvider } from "styled-components";
import { Box } from "@mui/material";
import {
  MessageList,
  Message,
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import ChatWrapper from "../../components/chatbot/Chat/ChatWrapper";
import { muiTheme } from "../../config/theme";
import theme from "../../utils/helpers/theme";

// Create a simplified version of CustomMessageInput without speech recognition
const SimplifiedMessageInput = ({
  inputValue,
  setInputValue,
  handleSendRequest,
}) => {
  return (
    <div style={{ display: "flex", padding: "10px" }}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        style={{
          flexGrow: 1,
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #ccc",
        }}
        placeholder="Type a message..."
      />
      <button
        onClick={() => handleSendRequest(inputValue)}
        style={{
          marginLeft: "8px",
          padding: "8px 16px",
          backgroundColor: "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "4px",
        }}
      >
        Send
      </button>
    </div>
  );
};

export default {
  title: "Chat/ChatWrapper",
  component: ChatWrapper,
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "dark",
      values: [
        {
          name: "dark",
          value: "#1a1a1a",
        },
      ],
    },
  },
  tags: ["autodocs"],
  argTypes: {
    expanded: {
      control: "boolean",
      description: "Whether the chat is expanded to full size",
    },
    full: {
      control: "boolean",
      description: "Whether the chat takes full width (no tabs)",
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={muiTheme}>
        <StyledThemeProvider theme={theme}>
          <div
            style={{
              height: "500px",
              width: "500px",
              margin: "20px auto",
              border: "1px solid #eee",
            }}
          >
            <Story />
          </div>
        </StyledThemeProvider>
      </ThemeProvider>
    ),
  ],
};

const Template = (args) => {
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      message: "Hello! How can I help you today?",
      direction: "incoming",
      sender: "My HealthDesk",
    },
    {
      message: "I have a question about medications.",
      direction: "outgoing",
      sender: "user",
    },
    {
      message:
        "Sure, I can help with that. What specific medication would you like to know about?",
      direction: "incoming",
      sender: "My HealthDesk",
    },
  ]);

  const handleSendRequest = (message) => {
    if (!message.trim()) return;

    // Add user message
    setMessages([
      ...messages,
      {
        message: message,
        direction: "outgoing",
        sender: "user",
      },
    ]);

    setInputValue("");

    // Simulate bot typing
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          message:
            "This is a simulated response from My HealthDesk. In a real implementation, this would be replaced with an actual API response.",
          direction: "incoming",
          sender: "My HealthDesk",
        },
      ]);
      setIsTyping(false);
    }, 2000);
  };

  // Simple message parser for the story (simplified version)
  const parseMessage = (message) => {
    return message.message;
  };

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      <ChatWrapper {...args}>
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
          <SimplifiedMessageInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSendRequest={handleSendRequest}
          />
        </div>
      </ChatWrapper>
    </Box>
  );
};

export const Default = Template.bind({});
Default.args = {
  expanded: true,
  full: true,
};

export const Collapsed = Template.bind({});
Collapsed.args = {
  expanded: false,
  full: false,
};
