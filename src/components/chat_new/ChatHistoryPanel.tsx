import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  CircularProgress,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import CloseRounded from "@mui/icons-material/CloseRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import ChatHistory from "./ChatHistoryList";

interface ChatHistoryPanelProps {
  user: any;
  isPanelExpanded: boolean;
  togglePanel: () => void;
  chatHistoryItems: any[];
  isChatHistoryLoading: boolean;
  activeChat: string | null;
  onNewChat: () => void;
  onLoadChat: (chat: any) => void;
  onDeleteChat: (id: string) => Promise<void>;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteAllChats: () => Promise<void>;
}

const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  user,
  isPanelExpanded,
  togglePanel,
  chatHistoryItems,
  isChatHistoryLoading,
  activeChat,
  onNewChat,
  onLoadChat,
  onDeleteChat,
  onRenameChat,
  onDeleteAllChats,
}) => {
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleCloseConfirmModal = () => {
    if (!isDeletingAll) {
      setOpenConfirmModal(false);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await onDeleteAllChats();
      setOpenConfirmModal(false);
    } catch (error) {
      console.error("Failed to delete all chats:", error);
      // You could add error handling here - maybe a toast notification
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleModalOpenConfirm = () => {
    setOpenConfirmModal(true);
  };

  // Wrap onNewChat to auto-close panel on mobile
  const handleNewChat = () => {
    onNewChat();
    if (isMobile) {
      togglePanel();
    }
  };

  // Wrap onLoadChat to auto-close panel on mobile
  const handleLoadChat = (chat: any) => {
    onLoadChat(chat);
    if (isMobile) {
      togglePanel();
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Mobile overlay backdrop - always present on mobile, but fades in/out */}
      {isMobile && (
        <Box
          onClick={togglePanel}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1400,
            opacity: isPanelExpanded ? 1 : 0,
            visibility: isPanelExpanded ? "visible" : "hidden",
            transition: "opacity 0.3s ease-in-out, visibility 0.3s ease-in-out",
            pointerEvents: isPanelExpanded ? "auto" : "none",
          }}
        />
      )}

      <Box
        sx={{
          width: isMobile ? "320px" : "280px",
          borderLeft: isMobile ? "none" : "1px solid #e0e0e0",
          backgroundColor: "#ffffff",
          position: isMobile ? "fixed" : "absolute",
          right: isMobile
            ? isPanelExpanded
              ? 0
              : "-320px"
            : isPanelExpanded
            ? 0
            : "-280px",
          top: 0,
          bottom: 0,
          transition: "right 0.3s ease-in-out",
          zIndex: isMobile ? 1500 : 1260, // Higher than backdrop (1400) and buttons (1250)
          display: "flex",
          flexDirection: "column",
          boxShadow: isPanelExpanded
            ? isMobile
              ? "0 0 20px rgba(0,0,0,0.15)"
              : "-2px 0 8px rgba(0,0,0,0.05)"
            : "none",
          // Prevent horizontal overflow
          maxWidth: "100vw",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: "1.1rem",
              color: "#2c3e50",
            }}
          >
            Chat History
          </Typography>
          <IconButton
            onClick={togglePanel}
            size="small"
            sx={{
              color: "#64748b",
              "&:hover": {
                backgroundColor: "#f8fafc",
                color: "#475569",
              },
            }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </Box>

        <Box
          onClick={handleNewChat}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mx: 1,
            my: 1,
            py: 1.5,
            px: 1.5,
            borderRadius: "8px",
            cursor: "pointer",
            color: "primary.main",
            backgroundColor: "transparent",
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: "#f0f9ff",
              color: "primary.dark",
            },
          }}
        >
          <AddRounded sx={{ fontSize: "16px" }} />
          <Typography sx={{ fontWeight: 500, fontSize: "0.9rem" }}>
            New Chat
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 0.5,
            pb: chatHistoryItems.length > 0 ? "60px" : 0,
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#e2e8f0",
              borderRadius: "3px",
              "&:hover": {
                backgroundColor: "#cbd5e1",
              },
            },
          }}
        >
          {isChatHistoryLoading ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "200px",
                gap: 2,
              }}
            >
              <CircularProgress size={32} sx={{ color: "#64748b" }} />
              <Typography sx={{ color: "#64748b", fontSize: "0.9rem" }}>
                Loading chats...
              </Typography>
            </Box>
          ) : (
            <ChatHistory
              items={chatHistoryItems}
              onChatSelect={handleLoadChat}
              onChatDelete={onDeleteChat}
              onChatRename={onRenameChat}
              activeChat={activeChat}
            />
          )}
        </Box>

        {chatHistoryItems.length > 0 && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              px: 0.5,
              py: 1,
              backgroundColor: "#ffffff",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <Box
              onClick={handleModalOpenConfirm}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                mx: 0.5,
                py: 1,
                px: 1.5,
                borderRadius: "8px",
                cursor: "pointer",
                color: "#64748b",
                backgroundColor: "transparent",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "#f8fafc",
                  color: "#475569",
                },
              }}
            >
              <DeleteRounded sx={{ fontSize: "16px" }} />
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                Delete All Chats
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Dialog
        open={openConfirmModal}
        onClose={handleCloseConfirmModal}
        maxWidth="xs"
      >
        <DialogTitle>Delete All Chats</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete your entire chat history. This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmModal} disabled={isDeletingAll}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteAll}
            loading={isDeletingAll}
          >
            Delete All
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatHistoryPanel;
