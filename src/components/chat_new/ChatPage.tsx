import React, { useState, useContext, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Collapse,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { ChatContext } from "context/Chat";
import { db } from "services/firebase";
import firebase from "firebase/compat/app";
import { useLocation, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

import AddRounded from "@mui/icons-material/AddRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ForumIcon from "@mui/icons-material/Forum";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import MedicalServicesRounded from "@mui/icons-material/MedicalServicesRounded";
import TimelineIcon from "@mui/icons-material/Timeline";

import CustomMessageInput from "components/chat_new/CustomMessageInput";
import { ChatMessages } from "./messages";
import ChatHistoryPanel from "./ChatHistoryPanel";
import ChatSuggestions from "./ChatSuggestions";
import { AuthContext } from "context/Auth";
import { useRateLimit } from "hooks/useRateLimit";
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(); // Get the functions instance
const getThreadsCallable = httpsCallable(functions, "getThreads");
const startNewChatCallable = httpsCallable(functions, "startNewChat");
const sendMessageCallable = httpsCallable(functions, "sendMessage");
const renameChatCallable = httpsCallable(functions, "renameChat");
const deleteChatCallable = httpsCallable(functions, "deleteChat");
const deleteAllChatsCallable = httpsCallable(functions, "deleteAllChats");
const updateMessageCallable = httpsCallable(functions, "updateMessage");

// Assistant configuration - centralized in one place
const getAssistantConfig = (assistantType: string) => {
  const configs = {
    brainflash: {
      pageTitle: "BrainFlash",
      pageDescription: "Rapid clinical facts",
      introIcon: <FlashOnIcon sx={{ fontSize: 64 }} color="primary" />,
      introDescription:
        "Get instant dosing, contraindications, and critical clinical information in seconds. Built for time-sensitive decisions when every moment counts.",
    },
    "deep-dive": {
      pageTitle: "DeepDive",
      pageDescription: "Medical reference",
      introIcon: <MenuBookIcon sx={{ fontSize: 64 }} color="primary" />,
      introDescription:
        "Explore detailed pathophysiology, mechanisms, and evidence-based medicine. Your comprehensive resource for thorough clinical understanding.",
    },
    "peer-review": {
      pageTitle: "PeerView Case Consultation",
      pageDescription: "Virtual consultation",
      introIcon: <ForumIcon sx={{ fontSize: 64 }} color="primary" />,
      introDescription:
        "Collaborate on challenging cases with structured clinical decision support. Navigate through history, examination, diagnostics, and treatment planning.",
    },
    "basic-medical-library": {
      pageTitle: "Basic Medical Library",
      pageDescription: "Simple medical questions",
      introIcon: <SchoolRounded sx={{ fontSize: 64 }} color="primary" />,
      introDescription:
        "Learn about your body, common health conditions, and medical concepts in simple, friendly language. Perfect for general health education.",
    },
    "advanced-medical-library": {
      pageTitle: "Advanced Medical Library",
      pageDescription: "Detailed medical education",
      introIcon: <LibraryBooksRounded sx={{ fontSize: 64 }} color="primary" />,
      introDescription:
        "Explore advanced medical concepts with expert-reviewed content. Designed for learners who want deeper understanding of medical topics.",
    },
    "virtual-md": {
      pageTitle: "Virtual MD",
      pageDescription: "Interactive medical education",
      introIcon: (
        <MedicalServicesRounded sx={{ fontSize: 64 }} color="primary" />
      ),
      introDescription:
        "Explore the mind of a doctor through interactive medical education. Learn about clinical considerations in a safe, educational environment.",
    },
    general: {
      pageTitle: "Medical SuperIntelligence",
      pageDescription: "AI-powered medical assistance",
      introIcon: <MedicalServicesIcon sx={{ fontSize: 64 }} color="primary" />,
      introDescription:
        "Get comprehensive medical guidance and support for your health questions.",
    },
  };

  return configs[assistantType] || configs["general"];
};

const ChatPage = ({
  hideHistory = false,
  hideGraph = false,
  assistantType = "general",
}) => {
  // Get assistant configuration
  const assistantConfig = getAssistantConfig(assistantType);
  const { pageTitle, pageDescription, introIcon, introDescription } =
    assistantConfig;

  const {
    messages = [],
    setMessages,
    thread,
    newThread,
    setThread,
  } = useContext(ChatContext);
  const [messagesnew, setMessagesnew] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistoryItems, setChatHistoryItems] = useState([]);
  const [isChatHistoryLoading, setIsChatHistoryLoading] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [isPanelExpanded, setIsPanelExpanded] = useState(() => {
    // Only use localStorage preference on desktop, always default to closed on mobile
    if (isMobile) return false;
    const saved = localStorage.getItem("chatHistoryPanelExpanded");
    return saved ? JSON.parse(saved) : false;
  });
  const [isGraphPanelOpen, setIsGraphPanelOpen] = useState(false);
  const chatBoxRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userData, subscription } = useContext(AuthContext); // <-- Get user, userData, and subscription from AuthContext
  const rateLimit = useRateLimit(userData, subscription);

  const [activeChat, setActiveChat] = useState(null);

  // Add edit state
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(
    null,
  );

  // Add a ref to track if we've processed the initial message
  const hasProcessedInitialMessage = useRef(false);

  // Function to toggle the panel expansion state
  const togglePanel = () => {
    const newState = !isPanelExpanded;
    setIsPanelExpanded(newState);
    // Only save to localStorage on desktop - mobile should always default to closed
    if (!isMobile) {
      localStorage.setItem(
        "chatHistoryPanelExpanded",
        JSON.stringify(newState),
      );
    }
  };

  // Function to toggle the graph panel
  const toggleGraphPanel = () => {
    setIsGraphPanelOpen(!isGraphPanelOpen);
  };

  const handleDeleteAllChats = async () => {
    console.log("Attempting to delete all chats...");

    const o = await deleteAllChatsCallable({ userid: user.uid });
    console.log("o", o);

    setChatHistoryItems([]);
    setActiveChat(null);
    setMessagesnew([]);
    setThread(null);
  };

  const fetchUserChats = async () => {
    if (!user) {
      // Ensure user is available from AuthContext
      // console.log("No user logged in to fetch chats.");
      setIsChatHistoryLoading(false);
      return;
    }

    try {
      // console.log("getThreadsCallable.....")
      const userChats = await getThreadsCallable({ userid: user.uid });
      // console.log("userChats", userChats.data)

      const formattedChats = (userChats.data as any[])
        .map((chat, index) => ({
          id: chat.id || index,
          date: new Date(
            chat.datetimeCreated._seconds * 1000 +
              chat.datetimeCreated._nanoseconds / 1000000,
          ),
          title: chat.title,
          chattype: chat.chattype,
          messages: chat.messages || [], // Ensure messages are returned
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      // console.log("formattedChats", formattedChats)
      setChatHistoryItems(formattedChats);
    } catch (error) {
      console.error("Error fetching chat history:", error);
    } finally {
      setIsChatHistoryLoading(false);
    }
  };

  // Function to handle loading a selected chat from history
  const handleLoadChat = (selectedChat) => {
    console.log("Loading chat...");

    if (!selectedChat || !selectedChat.messages) {
      console.error("Selected chat is invalid or has no messages.");
      return;
    }

    // Navigate to the correct page based on chat type
    const chatType = selectedChat.chattype;
    let targetRoute = "/dashboard";

    if (chatType === "deep-dive") {
      targetRoute = "/dashboard/deepdive";
    } else if (chatType === "peer-review") {
      targetRoute = "/dashboard/peerview";
    } else if (chatType === "general") {
      targetRoute = "/dashboard"; // Default for both patients and professionals
    } else if (chatType === "brainflash") {
      targetRoute = "/dashboard"; // Default for professionals
    }

    // Only navigate if we're not already on the correct route
    if (location.pathname !== targetRoute) {
      navigate(targetRoute, {
        state: { loadChat: selectedChat },
      });
      return; // Exit early - the navigation will trigger a new ChatPage mount with correct assistant type
    }

    // Format messages for the MessageList component
    const formattedMessages = selectedChat.messages.map((msg) => ({
      message: msg.content,
      direction: msg.role === "user" ? "outgoing" : "incoming",
      sender: msg.role,
    }));
    setMessagesnew(formattedMessages);
    // setThread(selectedChat.id); // Set the current thread ID
    setActiveChat(selectedChat.id);
  };

  const handleDeleteChat = async (id) => {
    console.log("Deleting chat:", id);

    try {
      await deleteChatCallable({ userid: user.uid, threadid: id });
      setChatHistoryItems(chatHistoryItems.filter((chat) => chat.id !== id));
      setActiveChat(null);
      setMessagesnew([]);
    } catch (error) {
      console.error("Error deleting chat:", error);
      throw error; // Re-throw to let the dialog handle the error
    }
  };

  // Function to handle renaming a chat
  const handleRenameChat = async (id, newTitle) => {
    console.log("userid", user.uid, "threadid", id, "newtitle:", newTitle);
    setChatHistoryItems(
      chatHistoryItems.map((chat) =>
        chat.id === id ? { ...chat, title: newTitle } : chat,
      ),
    );
    const o = await renameChatCallable({
      userid: user.uid,
      threadid: id,
      newtitle: newTitle,
    });
    // console.log("o", o)
  };

  // Function to handle resetting the chat
  const handleNewChat = () => {
    setMessagesnew([]);
    setActiveChat(null);
  };

  // Function to handle sending messages
  const handleSendNewMessage = async (message) => {
    if (!message.trim()) return;

    console.log("handleSendNewMessage.....", message);

    let user_id = null;
    if (user) {
      user_id = user.uid;
    }

    try {
      // Clear input and show typing indicator
      setInputValue("");

      setMessagesnew([
        ...messagesnew,
        { message: message, direction: "outgoing", sender: "user" },
      ]);
      setIsTyping(true);

      let current_chat_id = activeChat;
      if (!activeChat) {
        // setMessagesnew([{ message: message, direction: "outgoing", sender: "user" }]);

        // Use assistant type from props
        let assistant_id = assistantType;
        let title = null;

        console.log("startNewChatCallable.....", assistant_id);
        const o = await startNewChatCallable({
          userid: user_id,
          chattype: assistant_id,
          assistantID: assistant_id,
          title: title,
        });
        console.log("new_chat_id", o.data);
        await setActiveChat(o.data);
        current_chat_id = o.data;
      }

      console.log(
        "userid",
        user_id,
        "threadid",
        current_chat_id,
        "message",
        message,
      );
      const o2 = await sendMessageCallable({
        userid: user_id,
        threadid: current_chat_id,
        message: message,
      });
      console.log("new_message", o2);
      setMessagesnew(
        (o2.data as any[]).map((msg) => ({
          message: msg.content,
          direction: msg.role === "user" ? "outgoing" : "incoming",
          sender: msg.role,
        })),
      );
      setIsTyping(false);

      // Update history
      await fetchUserChats();
    } catch (error) {
      console.error("Error sending message:", error);
      setIsTyping(false);
    }
  };

  // Function to handle editing a message
  const handleEditMessage = (message: string, index: number) => {
    console.log("editing message at index:", index, "message:", message);
    setEditingMessageIndex(index);
  };

  // Function to handle finishing message edit
  const handleEditMessageFinish = async (index: number, newMessage: string) => {
    console.log("index:", index, "new message:", newMessage);

    if (!activeChat || !user) {
      console.error("No active chat or user available");
      return;
    }

    try {
      // Immediately update UI to show truncated messages and new message
      const truncatedMessages = messagesnew.slice(0, index);
      const updatedMessages = [
        ...truncatedMessages,
        { message: newMessage, direction: "outgoing", sender: "user" },
      ];
      setMessagesnew(updatedMessages);

      // Show typing indicator
      setIsTyping(true);

      // Exit edit mode
      setEditingMessageIndex(null);

      // Call the backend update_message function
      const response = await updateMessageCallable({
        userid: user.uid,
        threadid: activeChat,
        index: index,
        new_message: newMessage,
      });

      console.log("Update message response:", response);

      // Update with the complete message history including AI response
      const formattedMessages = (response.data as any[]).map((msg) => ({
        message: msg.content,
        direction: msg.role === "user" ? "outgoing" : "incoming",
        sender: msg.role,
      }));

      setMessagesnew(formattedMessages);
      setIsTyping(false);

      // Refresh chat history to reflect the changes
      await fetchUserChats();
    } catch (error) {
      console.error("Error updating message:", error);
      setIsTyping(false);
      // Optionally show an error message to the user
    }
  };

  // Function to cancel editing
  const handleEditMessageCancel = () => {
    setEditingMessageIndex(null);
  };

  // Auto-scroll effect
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messagesnew, isTyping]);

  // Add a useEffect to handle assistant type changes
  useEffect(() => {
    // Reset chat when assistant type changes to prevent mixed conversations
    if (activeChat !== null) {
      handleNewChat();
    }
  }, [assistantType]);

  // Add a useEffect to handle the location state
  useEffect(() => {
    const initiateMessage = location.state?.initiateChatWith;
    const loadChat = location.state?.loadChat;

    // Handle loading a specific chat (don't use hasProcessedInitialMessage for this)
    if (loadChat) {
      const formattedMessages = loadChat.messages.map((msg) => ({
        message: msg.content,
        direction: msg.role === "user" ? "outgoing" : "incoming",
        sender: msg.role,
      }));
      setMessagesnew(formattedMessages);
      setActiveChat(loadChat.id);

      // Clear the state
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, loadChat: null },
      });
      return;
    }

    // Handle initiating a new message
    if (initiateMessage && !hasProcessedInitialMessage.current) {
      hasProcessedInitialMessage.current = true;
      setActiveChat(null);
      handleSendNewMessage(initiateMessage);

      // Clear the state by replacing the current history entry
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, initiateChatWith: null },
      });
    }
  }, [navigate, location.pathname, location.state]);

  // Fetch user chats on component mount
  useEffect(() => {
    if (user) {
      fetchUserChats();
    } else {
      setIsChatHistoryLoading(false);
    }
  }, [user]); // Re-run when user changes

  // Add a function to get the current chat info
  const getCurrentChatInfo = () => {
    if (!activeChat) {
      return { title: null, icon: null };
    }

    // First try to find in chatHistoryItems (for existing chats)
    const currentChat = chatHistoryItems.find((chat) => chat.id === activeChat);

    // Determine chat type - use from history if available, otherwise fall back to assistantType
    const chatType = currentChat?.chattype || assistantType;
    const chatTitle = currentChat?.title || null;

    // Get the appropriate icon for the chat type
    let chatIcon = null;
    const iconStyle = { fontSize: 20, color: "#64748b" };

    if (chatType === "brainflash") {
      chatIcon = <FlashOnIcon sx={iconStyle} />;
    } else if (chatType === "peer-review") {
      chatIcon = <ForumIcon sx={iconStyle} />;
    } else if (chatType === "deep-dive") {
      chatIcon = <MenuBookIcon sx={iconStyle} />;
    } else if (chatType === "basic-medical-library") {
      chatIcon = <SchoolRounded sx={iconStyle} />;
    } else if (chatType === "advanced-medical-library") {
      chatIcon = <LibraryBooksRounded sx={iconStyle} />;
    } else if (chatType === "virtual-md") {
      chatIcon = <MedicalServicesRounded sx={iconStyle} />;
    } else if (chatType === "general") {
      chatIcon = <MedicalServicesIcon sx={iconStyle} />;
    }

    return { title: chatTitle, icon: chatIcon };
  };

  const currentChatInfo = getCurrentChatInfo();

  return (
    <Box
      sx={{
        height: { xs: "calc(100dvh - 65px)", sm: "100dvh" },
        width: "100%",
        display: "flex",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Main chat area - adjusted dynamically based on panel state */}
      <Box
        sx={{
          width:
            user && !hideHistory && isPanelExpanded && !isMobile
              ? "calc(100% - 280px)"
              : "100%",
          transition: "width 0.3s ease-in-out",
          overflowY: "hidden",
          overflowX: "hidden", // Prevent horizontal overflow
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Top bar with chat info and actions */}
        {user && !hideHistory && !isXs && (
          <Box
            sx={{
              ...theme.mixins.toolbar,
              width: "100%",
              display: "flex",
              alignItems: "center",
              px: 3,
              backgroundColor: "#ffffff",
              flexShrink: 0,
              zIndex: 10,
            }}
          >
            {/* Left side - Current chat info */}
            <Box
              sx={{
                display: { xs: "none", sm: "none", md: "none", lg: "flex" },
                alignItems: "center",
                gap: 1.5,
                minWidth: 0,
                flex: 1,
              }}
            >
              {currentChatInfo.icon && (
                <Box
                  sx={{
                    display: { xs: "none", sm: "none", md: "none", lg: "flex" },
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {currentChatInfo.icon}
                </Box>
              )}
              {(currentChatInfo.title || messagesnew.length > 0) && (
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: currentChatInfo.title ? "#1f2937" : "#9ca3af",
                    fontSize: "1.1rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: { xs: "none", lg: "block" },
                  }}
                >
                  {currentChatInfo.title || "Untitled"}
                </Typography>
              )}
            </Box>

            {/* Center - Graph button (large desktop only) */}
            {/* <Box
              sx={{
                display: { xs: "none", sm: "none", md: "none", lg: "flex" },
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              {!hideGraph && messagesnew.length > 0 && (
                <Button
                  onClick={toggleGraphPanel}
                  startIcon={<TimelineIcon />}
                  variant="outlined"
                  sx={{
                    textTransform: "none",
                    fontWeight: 500,
                    backgroundColor: isGraphPanelOpen
                      ? "#f0f9ff"
                      : "transparent",
                    borderColor: isGraphPanelOpen ? "#0ea5e9" : "#d1d5db",
                    color: isGraphPanelOpen ? "#0284c7" : "#374151",
                    "&:hover": {
                      borderColor: isGraphPanelOpen ? "#0284c7" : "#9ca3af",
                      backgroundColor: isGraphPanelOpen ? "#e0f2fe" : "#f9fafb",
                    },
                  }}
                >
                  Graph
                </Button>
              )}
            </Box> */}

            {/* Right side - Action buttons */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 1,
                flex: { xs: 1, sm: 1, lg: 1 },
              }}
            >
              {/* Graph button for sm/md screens - always visible */}
              {/* {!hideGraph && messagesnew.length > 0 && (
                <Tooltip title="Graph">
                  <IconButton
                    onClick={toggleGraphPanel}
                    sx={{
                      display: {
                        xs: "none",
                        sm: "flex",
                        md: "flex",
                        lg: "none",
                      },
                      color: isGraphPanelOpen ? "#0284c7" : "#64748b",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                      },
                    }}
                    size="small"
                  >
                    <TimelineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )} */}

              {!isPanelExpanded && (
                <>
                  {/* New Chat button - full button on lg+, icon on sm/md */}
                  <Button
                    onClick={handleNewChat}
                    startIcon={<AddRounded />}
                    variant="outlined"
                    sx={{
                      display: {
                        xs: "none",
                        sm: "none",
                        md: "none",
                        lg: "flex",
                      },
                      borderColor: "#d1d5db",
                      color: "#374151",
                      textTransform: "none",
                      fontWeight: 500,
                      "&:hover": {
                        borderColor: "#9ca3af",
                        backgroundColor: "#f9fafb",
                      },
                    }}
                  >
                    New Chat
                  </Button>

                  <Tooltip title="New Chat">
                    <IconButton
                      onClick={handleNewChat}
                      sx={{
                        display: {
                          xs: "none",
                          sm: "flex",
                          md: "flex",
                          lg: "none",
                        },
                        color: "#64748b",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                        },
                      }}
                      size="small"
                    >
                      <AddRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {/* History button - full button on lg+, icon on sm/md */}
                  <Button
                    onClick={togglePanel}
                    startIcon={<HistoryRounded />}
                    variant="outlined"
                    sx={{
                      display: {
                        xs: "none",
                        sm: "none",
                        md: "none",
                        lg: "flex",
                      },
                      borderColor: "#d1d5db",
                      color: "#374151",
                      textTransform: "none",
                      fontWeight: 500,
                      "&:hover": {
                        borderColor: "#9ca3af",
                        backgroundColor: "#f9fafb",
                      },
                    }}
                  >
                    History
                  </Button>

                  <Tooltip title="History">
                    <IconButton
                      onClick={togglePanel}
                      sx={{
                        display: {
                          xs: "none",
                          sm: "flex",
                          md: "flex",
                          lg: "none",
                        },
                        color: "#64748b",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                        },
                      }}
                      size="small"
                    >
                      <HistoryRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </Box>
        )}

        {/* Mobile floating buttons - ChatGPT style */}
        {user && !hideHistory && isXs && (
          <Box
            sx={{
              position: "fixed",
              top: isXs ? "12px" : "20px",
              right: "20px",
              display: "flex",
              gap: 1,
              zIndex: 1150,
            }}
          >
            {/* {!hideGraph && messagesnew.length > 0 && (
              <Tooltip title="Graph">
                <IconButton
                  onClick={toggleGraphPanel}
                  sx={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: isGraphPanelOpen ? "#0284c7" : "#64748b",
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.04)",
                    },
                  }}
                  size="small"
                >
                  <TimelineIcon />
                </IconButton>
              </Tooltip>
            )} */}
            <Tooltip title="New Chat">
              <IconButton
                onClick={handleNewChat}
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#64748b",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                  },
                }}
                size="small"
              >
                <AddRounded />
              </IconButton>
            </Tooltip>
            <Tooltip title="Chat History">
              <IconButton
                onClick={togglePanel}
                sx={{
                  backgroundColor: isXs
                    ? "transparent"
                    : "rgba(255, 255, 255, 0.9)",
                  border: isXs ? "none" : "1px solid #ddd",
                  color: isXs ? "#64748b" : "inherit",
                  "&:hover": {
                    backgroundColor: isXs ? "rgba(0, 0, 0, 0.04)" : "#f5f5f5",
                  },
                }}
                size="small"
              >
                <HistoryRounded />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Graph Panel - Clean collapsible design */}
        {!hideGraph && (
          <Collapse in={isGraphPanelOpen} timeout="auto" unmountOnExit>
            <Box
              sx={{
                height: "40vh",
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "auto",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: "#64748b",
                  fontWeight: 500,
                }}
              >
                Graph Panel Content Goes Here
              </Typography>

              {/* Optional: Add a "Go to Map" button for non-logged-in users */}
              {!user && (
                <Button
                  variant="outlined"
                  onClick={() =>
                    (window.location.href = "http://localhost:3001/map")
                  }
                  sx={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    textTransform: "none",
                    borderColor: "#d1d5db",
                    color: "#374151",
                    "&:hover": {
                      borderColor: "#9ca3af",
                      backgroundColor: "#f9fafb",
                    },
                  }}
                >
                  Go to Map
                </Button>
              )}
            </Box>
          </Collapse>
        )}

        {/* Centered content container with max-width */}
        <Box
          sx={{
            margin: "0 auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            width: "100%",
            maxWidth: "970px", // Same max-width as messages
            px: 2,
            backgroundColor: "#ffffff",
            // Different layouts for empty vs with messages
            ...(messagesnew.length === 0
              ? {
                  // Fixed intro position for empty state
                  justifyContent: "flex-start",
                  alignItems: "center",
                  paddingTop: { sm: "1rem", md: "20vh" }, // Responsive padding - much less on mobile
                }
              : {
                  // Flex layout for chat with messages
                  justifyContent: "flex-start",
                  gap: 0,
                }),
          }}
        >
          {/* Show intro when no messages */}
          {messagesnew.length === 0 && (introIcon || introDescription) && (
            <Box
              sx={{
                textAlign: "center",
                py: 0,
                px: 2,
                maxWidth: "600px",
                width: "100%",
              }}
            >
              {introIcon && (
                <Box
                  sx={{
                    mb: 3,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {introIcon}
                </Box>
              )}
              <Typography
                variant="h4"
                sx={{
                  mb: { xs: 1.5, sm: 2 }, // Reduced margin on mobile
                  fontWeight: 600,
                  fontSize: { xs: "1.75rem", sm: "2.125rem" }, // Smaller font size on mobile
                }}
              >
                {pageTitle}
              </Typography>
              {introDescription && (
                <Typography
                  variant="body1"
                  sx={{
                    mb: { xs: 1, sm: 3 }, // Reduced margin on mobile
                    color: "text.secondary",
                    lineHeight: 1.6,
                  }}
                >
                  {introDescription}
                </Typography>
              )}
            </Box>
          )}

          {/* Messages area - only shown when there are messages */}
          {messagesnew.length > 0 && (
            <ChatMessages
              messages={messagesnew}
              isTyping={isTyping}
              maxMessageWidth="970px"
              onEditMessage={handleEditMessage}
              onEditMessageFinish={handleEditMessageFinish}
              onEditMessageCancel={handleEditMessageCancel}
              editingMessageIndex={editingMessageIndex}
              sx={{
                flex: 1,
                overflowY: "auto",
                minHeight: 0,
                mb: 1, // Small gap above input
              }}
            />
          )}

          {/* Input area - responsive to context */}
          <Box
            sx={{
              flexShrink: 0,
              width: "100%",
              ...(messagesnew.length === 0
                ? {
                    // Fixed positioning for empty state - only grows downward
                    position: "relative",
                    maxWidth: "600px",
                  }
                : {
                    marginBottom: "6px",
                  }),
            }}
          >
            <CustomMessageInput
              inputValue={inputValue}
              setInputValue={setInputValue}
              handleSendRequest={handleSendNewMessage}
              userData={userData}
              hasMessages={messagesnew.length > 0}
            />

            {/* Show suggestions below input when no messages and not rate limited */}
            {messagesnew.length === 0 && !rateLimit.isRateLimited && (
              <ChatSuggestions
                assistantType={assistantType}
                onSuggestionClick={handleSendNewMessage}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Chat history panel */}
      {!hideHistory && (
        <ChatHistoryPanel
          user={user}
          isPanelExpanded={isPanelExpanded}
          togglePanel={togglePanel}
          chatHistoryItems={chatHistoryItems}
          isChatHistoryLoading={isChatHistoryLoading}
          activeChat={activeChat}
          onNewChat={handleNewChat}
          onLoadChat={handleLoadChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onDeleteAllChats={handleDeleteAllChats}
        />
      )}
    </Box>
  );
};

export default ChatPage;
