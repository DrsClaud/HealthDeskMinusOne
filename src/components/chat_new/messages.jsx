import React, { useState, useRef, useEffect } from "react";
import { Box, Typography, keyframes, TextField, Button } from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import MessageBlood from "./message_blood";
import ReactMarkdown from "react-markdown";

// Create a pulsing animation
const pulse = keyframes`
  0% { transform: scale(0.95); opacity: 0.4; }
  50% { transform: scale(1.05); opacity: 0.7; }
  100% { transform: scale(0.95); opacity: 0.4; }
`;

const TypingIndicator = () => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, pl: 2 }}>
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: "#1976d2",
        animation: `${pulse} 1.2s ease-in-out infinite`,
      }}
    />
    <Typography variant="body2" color="text.secondary" sx={{ ml: 0 }}>
      My HealthDesk is typing...
    </Typography>
  </Box>
);

export const MessageRed = ({ message, direction }) => {
  return (
    <Box
      sx={{
        backgroundColor: "#ff7979",
        borderRadius: "8px",
        padding: "10px",
        margin: "5px 0",
        maxWidth: "80%",
        alignSelf: direction === "outgoing" ? "flex-end" : "flex-start",
        display: "flex",
        alignItems: "center",
        position: "relative",
        boxShadow: 1,
        "& p": {
          margin: 0,
        },
        "& p + p": {
          marginTop: "16px",
        },
      }}
    >
      <Box sx={{ minWidth: "50px", display: "flex", justifyContent: "center" }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.403zm.01 13.33l-.127 .007a1 1 0 0 0 0 1.986l.117 .007l.127 -.007a1 1 0 0 0 0 -1.986l-.117 -.007zm-.01 -7a1 1 0 0 0 -.993 .883l-.007 .117v4l.007 .117a1 1 0 0 0 1.986 0l.007 -.117v-4l-.007 -.117a1 1 0 0 0 -.993 -.883z" />
        </svg>
      </Box>
      <Typography
        variant="body1"
        sx={{
          color: "black",
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
        component="span"
      >
        <ReactMarkdown>{message}</ReactMarkdown>
      </Typography>
    </Box>
  );
};

export const MessageWarning = ({ message, direction }) => {
  return (
    <Box
      sx={{
        backgroundColor: "#ffe14a",
        borderRadius: "8px",
        padding: "10px",
        margin: "5px 0",
        maxWidth: "80%",
        alignSelf: direction === "outgoing" ? "flex-end" : "flex-start",
        display: "flex",
        alignItems: "center",
        position: "relative",
        boxShadow: 1,
        "& p": {
          margin: 0,
        },
        "& p + p": {
          marginTop: "16px",
        },
      }}
    >
      <Box sx={{ minWidth: "50px", display: "flex", justifyContent: "center" }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="icon icon-tabler icons-tabler-outline icon-tabler-alert-square"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </Box>
      <Typography
        variant="body1"
        sx={{
          color: "black",
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
        component="span"
      >
        <ReactMarkdown>{message}</ReactMarkdown>
      </Typography>
    </Box>
  );
};

export const MessageUser = ({
  message,
  direction,
  index,
  onEditMessage = (message, index) => {},
  onEditMessageFinish = (index, newMessage) => {},
  onEditMessageCancel = () => {},
  isEditing = false,
  showEditButton = true,
}) => {
  const [editValue, setEditValue] = useState(message);
  const inputRef = useRef(null);

  // Focus the input field when entering edit mode (without cursor positioning)
  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        inputRef.current.focus();
      }, 10);
    }
  }, [isEditing]);

  // Reset edit value when message changes
  useEffect(() => {
    setEditValue(message);
  }, [message]);

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSave();
    } else if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
    }
  };

  const handleSave = () => {
    if (editValue.trim() !== message.trim()) {
      onEditMessageFinish(index, editValue.trim());
    } else {
      onEditMessageCancel();
    }
  };

  const handleCancel = () => {
    setEditValue(message);
    onEditMessageCancel();
  };

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: isEditing ? "flex-start" : "center",
        margin: "5px 0",
        width: "100%",
        gap: 1,
      }}
    >
      {/* Message Content */}
      <Box
        sx={{
          backgroundColor: direction === "outgoing" ? "#1976d2" : "#eee",
          color: direction === "outgoing" ? "white" : "black",
          borderRadius:
            direction === "outgoing" ? "8px 0px 8px 8px" : "0px 8px 8px 8px",
          padding: isEditing ? "16px" : "10px",
          maxWidth: isEditing ? "90%" : "80%",
          width: isEditing ? "100%" : "fit-content",
          marginLeft: direction === "outgoing" ? "auto" : "0",
          marginRight: direction === "outgoing" ? "0" : "auto",
          position: "relative",
          boxShadow: 1,
          "&:hover .edit-button": {
            opacity: 1,
            transform: "scale(1)",
          },
          "& p": {
            margin: 0,
          },
          "& p + p": {
            marginTop: "16px",
          },
        }}
      >
        {/* Edit Button */}
        {direction === "outgoing" && !isEditing && showEditButton && (
          <Box
            className="edit-button"
            onClick={() => onEditMessage(message, index)}
            sx={{
              position: "absolute",
              bottom: "0px",
              left: "-35px",
              opacity: 0,
              transition: "opacity 0.2s ease-in-out",
              zIndex: 10,
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: "#1976d2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: 2,
              "&:hover": {
                backgroundColor: "#1565c0",
              },
            }}
          >
            <EditIcon sx={{ fontSize: 16, color: "white" }} />
          </Box>
        )}

        {/* Message Content or Edit Field */}
        {isEditing ? (
          <Box sx={{ width: "100%" }}>
            <TextField
              inputRef={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyPress}
              multiline
              minRows={2}
              variant="outlined"
              fullWidth
              sx={{
                mb: 1,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                  "& fieldset": {
                    borderColor: "rgba(255,255,255,0.3)",
                  },
                  "&:hover fieldset": {
                    borderColor: "rgba(255,255,255,0.5)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "white",
                    borderWidth: "2px",
                  },
                },
                "& .MuiInputBase-input": {
                  color: direction === "outgoing" ? "white" : "black",
                  fontSize: "16px",
                  "&::placeholder": {
                    color: "rgba(255,255,255,0.6)",
                  },
                },
              }}
              placeholder="Edit your message."
            />

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                gap: 1,
                justifyContent: "flex-end",
              }}
            >
              <Button
                variant="outlined"
                size="small"
                onClick={handleCancel}
                sx={{
                  color: "white",
                  borderColor: "rgba(255,255,255,0.3)",
                  "&:hover": {
                    borderColor: "rgba(255,255,255,0.5)",
                    backgroundColor: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleSave}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  color: "#1976d2",
                  "&:hover": {
                    backgroundColor: "white",
                  },
                }}
              >
                Save
              </Button>
            </Box>
          </Box>
        ) : (
          <Typography
            variant="body1"
            component="span"
            sx={{
              color: direction === "outgoing" ? "white" : "black",
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            <ReactMarkdown>{message}</ReactMarkdown>
          </Typography>
        )}
      </Box>
    </Box>
  );
};

// Create a component for displaying chat messages
export const ChatMessages = ({
  messages,
  isTyping = false,
  sx = {},
  maxMessageWidth = "970px",
  onEditMessage = (message, index) => {},
  onEditMessageFinish = (index, newMessage) => {},
  onEditMessageCancel = () => {},
  editingMessageIndex = null,
  showEditButton = true,
}) => {
  // Add ref for scrollable container
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  // Auto-scroll when messages change or typing indicator appears
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const renderMessage = (message, i) => {
    if (message.type === "message_red") {
      return (
        <MessageRed
          key={`message_${i}`}
          message={message.message}
          direction={message.direction}
        />
      );
    } else if (message.type === "message_warning") {
      return (
        <MessageWarning
          key={`message_${i}`}
          message={message.message}
          direction={message.direction}
        />
      );
    } else if (message.type === "message_blood") {
      return (
        <MessageBlood
          key={`message_${i}`}
          message={message.message}
          direction={message.direction}
        />
      );
    } else if (message.direction === "outgoing") {
      return (
        <MessageUser
          key={`message_${i}`}
          message={message.message}
          direction={message.direction}
          index={i}
          onEditMessage={onEditMessage}
          onEditMessageFinish={onEditMessageFinish}
          onEditMessageCancel={onEditMessageCancel}
          isEditing={editingMessageIndex === i}
          showEditButton={showEditButton}
        />
      );
    } else {
      return (
        <MessageUser
          key={`message_${i}`}
          message={message.message}
          direction={message.direction}
          index={i}
          onEditMessage={onEditMessage}
          onEditMessageFinish={onEditMessageFinish}
          onEditMessageCancel={onEditMessageCancel}
          isEditing={editingMessageIndex === i}
          showEditButton={showEditButton}
        />
      );
    }
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: "relative",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",

        // Custom scrollbar styles
        "&::-webkit-scrollbar": {
          width: "10px",
        },
        "&::-webkit-scrollbar-track": {
          background: "transparent", // No background
        },
        "&::-webkit-scrollbar-thumb": {
          background: "#1976d2", // Blue square handler
          borderRadius: "0px", // Square corners for that clean look
          border: "none",
        },
        "&::-webkit-scrollbar-thumb:hover": {
          background: "#1565c0", // Slightly darker blue on hover
        },
        "&::-webkit-scrollbar-thumb:active": {
          background: "#0d47a1", // Even darker when clicked
        },
        "&::-webkit-scrollbar-corner": {
          background: "transparent", // No background for corner
        },
        // Firefox scrollbar styles
        scrollbarWidth: "thin",
        scrollbarColor: "#1976d2 transparent",

        ...sx,
      }}
    >
      {/* Messages container with max width constraint */}
      <Box
        sx={{
          width: "100%",
          maxWidth: maxMessageWidth,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {messages?.map((message, i) => renderMessage(message, i))}
        {isTyping && <TypingIndicator />}
        {/* Invisible element at the bottom to scroll to */}
        <div ref={messagesEndRef} />
      </Box>
    </Box>
  );
};
