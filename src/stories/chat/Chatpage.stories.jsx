import React from "react";
import { ThemeProvider } from "@mui/material/styles";
import { ThemeProvider as StyledThemeProvider } from "styled-components";
import { ChatContext } from "context/Chat";
import ChatPage from "components/chat_new/ChatPage";
import { muiTheme } from "../../config/theme";
import theme from "../../utils/helpers/theme";

// Mock Firebase
const mockFirebase = {
  auth: () => ({
    currentUser: { uid: "mock-user-id" },
  }),
};

// Mock the Firebase db
const mockDb = {
  collection: () => ({
    doc: () => ({
      collection: () => ({
        doc: () => ({
          set: () => Promise.resolve(),
          onSnapshot: (callback) => {
            // Simulate a response after a delay
            setTimeout(() => {
              callback({
                data: () => ({
                  messages: [
                    {
                      sender: "user",
                      message: "What is my first message of this conversation?",
                      created: 1742549641,
                    },
                    {
                      sender: "My HealthDesk",
                      message:
                        "Thank you for accessing Medical SuperIntelligence. I understand you need health care. I will help you evaluate the venue most likely to help you without unnecessary delay.",
                      created: 1742549645,
                    },
                  ],
                }),
              });
            }, 1500);

            // Return an unsubscribe function
            return () => {};
          },
        }),
      }),
    }),
  }),
};

// Mock the useNavigate and useLocation hooks
const mockNavigate = jest.fn();
const mockLocation = { pathname: "/chat", state: null };

// Override the dependencies
jest.mock("firebase/compat/app", () => mockFirebase);
jest.mock("services/firebase", () => ({ db: mockDb }));
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

export default {
  title: "Chat/ChatPage",
  component: ChatPage,
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "light",
      values: [
        {
          name: "light",
          value: "#ffffff",
        },
        {
          name: "dark",
          value: "#1a1a1a",
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={muiTheme}>
        <StyledThemeProvider theme={theme}>
          <div
            style={{
              height: "100vh",
              margin: "0 auto",
            }}
          >
            <Story />
          </div>
        </StyledThemeProvider>
      </ThemeProvider>
    ),
  ],
};

// Template for different story variants
const Template = ({
  initialMessages = [],
  isTyping = false,
  threadId = "12345",
}) => {
  return (
    <ChatContext.Provider
      value={{
        messages: initialMessages,
        setMessages: () => {},
        thread: threadId,
        newThread: () => {},
      }}
    >
      <ChatPage />
    </ChatContext.Provider>
  );
};

// Empty chat story
export const EmptyChat = () => <Template initialMessages={[]} />;

// Chat with welcome message
export const WelcomeMessage = () => (
  <Template
    initialMessages={[
      {
        message:
          "Thank you for accessing Medical SuperIntelligence. I understand you need health care. I will help you evaluate the venue most likely to help you without unnecessary delay.",
        direction: "incoming",
        sender: "My HealthDesk",
      },
    ]}
  />
);

// Chat with ongoing conversation
export const OngoingConversation = () => (
  <Template
    initialMessages={[
      {
        message: "What is my first message of this conversation?",
        direction: "outgoing",
        sender: "user",
      },
      {
        message:
          "Thank you for accessing Medical SuperIntelligence. I understand you need health care. I will help you evaluate the venue most likely to help you without unnecessary delay.",
        direction: "incoming",
        sender: "My HealthDesk",
      },
      {
        message: "I have a headache that won't go away",
        direction: "outgoing",
        sender: "user",
      },
      {
        message:
          "I'm sorry to hear you're experiencing a persistent headache. Let me ask you a few questions to better understand your situation. How long have you had this headache? And would you rate the pain as mild, moderate, or severe?",
        direction: "incoming",
        sender: "My HealthDesk",
      },
    ]}
  />
);

// Chat with longer conversation
export const LongerConversation = () => (
  <Template
    initialMessages={[
      {
        message: "What is my first message of this conversation?",
        direction: "outgoing",
        sender: "user",
      },
      {
        message:
          "Thank you for accessing Medical SuperIntelligence. I understand you need health care. I will help you evaluate the venue most likely to help you without unnecessary delay.",
        direction: "incoming",
        sender: "My HealthDesk",
      },
      {
        message: "I have a headache that won't go away",
        direction: "outgoing",
        sender: "user",
      },
      {
        message:
          "I'm sorry to hear you're experiencing a persistent headache. Let me ask you a few questions to better understand your situation. How long have you had this headache? And would you rate the pain as mild, moderate, or severe?",
        direction: "incoming",
        sender: "My HealthDesk",
      },
      {
        message:
          "It's been about 3 days and I would say the pain is moderate to severe",
        direction: "outgoing",
        sender: "user",
      },
      {
        message:
          "Thank you for providing that information. A headache lasting 3 days with moderate to severe pain is concerning. Have you experienced any other symptoms alongside the headache, such as nausea, vomiting, sensitivity to light or sound, visual disturbances, or fever?",
        direction: "incoming",
        sender: "My HealthDesk",
      },
      {
        message: "Yes, I've been feeling nauseous and sensitive to light",
        direction: "outgoing",
        sender: "user",
      },
      {
        message:
          "Based on the information you've provided - a headache lasting 3 days with moderate to severe pain, accompanied by nausea and light sensitivity - your symptoms are consistent with a migraine or another significant headache disorder. Given the duration and severity, I recommend seeking medical attention soon. Would you prefer to see a primary care physician or visit an urgent care center?",
        direction: "incoming",
        sender: "My HealthDesk",
      },
    ]}
  />
);

// Create a dynamic story that demonstrates typing
export const WithTypingIndicator = () => {
  // We can't directly manipulate state in stories, so we'll use a workaround
  // to show the typing indicator
  const [showTyping, setShowTyping] = React.useState(false);
  const [messages, setMessages] = React.useState([
    {
      message: "Hello, how can I help you today?",
      direction: "incoming",
      sender: "My HealthDesk",
    },
  ]);

  React.useEffect(() => {
    // Show typing indicator after 1 second
    const typingTimeout = setTimeout(() => {
      setShowTyping(true);

      // After 3 seconds, add a new message and hide typing
      const messageTimeout = setTimeout(() => {
        setMessages([
          ...messages,
          {
            message: "I have a question about my symptoms",
            direction: "outgoing",
            sender: "user",
          },
        ]);

        setShowTyping(false);

        // Show typing again after 1 second
        const secondTypingTimeout = setTimeout(() => {
          setShowTyping(true);

          // Add final message after 3 seconds
          const finalMessageTimeout = setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                message:
                  "I'd be happy to help with your symptoms. Could you please describe what you're experiencing?",
                direction: "incoming",
                sender: "My HealthDesk",
              },
            ]);
            setShowTyping(false);
          }, 3000);

          return () => clearTimeout(finalMessageTimeout);
        }, 1000);

        return () => clearTimeout(secondTypingTimeout);
      }, 3000);

      return () => clearTimeout(messageTimeout);
    }, 1000);

    return () => clearTimeout(typingTimeout);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages: messages,
        setMessages: setMessages,
        thread: "12345",
        newThread: () => {},
        isTyping: showTyping,
      }}
    >
      <ChatPage />
    </ChatContext.Provider>
  );
};
