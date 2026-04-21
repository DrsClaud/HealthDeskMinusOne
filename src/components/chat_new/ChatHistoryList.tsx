import "../../index.css";
import React, { useState } from "react";
import {
  List,
  ListItem,
  ListItemText,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Button,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ForumIcon from "@mui/icons-material/Forum";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import MedicalServicesRounded from "@mui/icons-material/MedicalServicesRounded";

import {
  isToday,
  isThisWeek,
  isThisMonth,
  subWeeks,
  subMonths,
  format,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  isThisYear,
} from "date-fns";

interface ChatItem {
  id: string;
  title: string;
  date: string;
  messages: any[];
  chattype: string;
}

interface ChatHistoryProps {
  items: ChatItem[];
  onChatSelect: (item: ChatItem) => void;
  onChatDelete: (id: string) => Promise<void>;
  onChatRename: (id: string, newTitle: string) => void;
  activeChat: string | null;
}

// Helper function to categorize dates
const getRelativeDateCategory = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();

  if (isToday(date)) return "Today";
  if (isThisWeek(date)) return "This Week";

  // Check if it's last week
  const lastWeekStart = startOfWeek(subWeeks(now, 1));
  const lastWeekEnd = endOfWeek(subWeeks(now, 1));
  if (isWithinInterval(date, { start: lastWeekStart, end: lastWeekEnd })) {
    return "Last Week";
  }

  if (isThisMonth(date)) return "This Month";

  // Check if it's last month
  const lastMonth = subMonths(now, 1);
  if (
    date.getMonth() === lastMonth.getMonth() &&
    date.getFullYear() === lastMonth.getFullYear()
  ) {
    return "Last Month";
  }

  if (isThisYear(date)) return format(date, "MMMM");

  return format(date, "yyyy");
};

const ChatHistory: React.FC<ChatHistoryProps> = ({
  items,
  onChatSelect,
  onChatDelete,
  onChatRename,
  activeChat,
}) => {
  // State for menu anchor element and the item ID whose menu is open
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuOpenItemId, setMenuOpenItemId] = useState<null | string>(null);

  // State for Rename Modal
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameItemId, setRenameItemId] = useState<null | string>(null);
  const [renameItemTitle, setRenameItemTitle] = useState<string>("");
  const [newTitleInput, setNewTitleInput] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  // State for Delete Confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<null | string>(null);
  const [deleteItemTitle, setDeleteItemTitle] = useState<string>("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    id: string
  ) => {
    setAnchorEl(event.currentTarget);
    setMenuOpenItemId(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuOpenItemId(null);
  };

  const handleDeleteClick = () => {
    console.log("handleDeleteClick", menuOpenItemId);
    if (menuOpenItemId !== null) {
      const itemToDelete = items.find((item) => item.id === menuOpenItemId);
      if (itemToDelete) {
        setDeleteItemId(itemToDelete.id);
        setDeleteItemTitle(itemToDelete.title);
        setIsDeleteModalOpen(true);
      }
    }
    handleMenuClose(); // Close the menu after action
  };

  const handleConfirmDelete = async () => {
    if (deleteItemId) {
      setDeleteLoading(true);
      try {
        await onChatDelete(deleteItemId);
        setIsDeleteModalOpen(false);
        setDeleteItemId(null);
        setDeleteItemTitle("");
      } catch (error) {
        console.error("Error deleting chat:", error);
        // Keep dialog open on error
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  const handleCancelDelete = () => {
    if (!deleteLoading) {
      setIsDeleteModalOpen(false);
      setDeleteItemId(null);
      setDeleteItemTitle("");
    }
  };

  // Opens the rename modal
  const handleRenameClick = () => {
    console.log("handleRenameClick rename", menuOpenItemId);
    // if (menuOpenItemId !== null) {
    const itemToRename = items.find((item) => item.id === menuOpenItemId);
    if (itemToRename) {
      setRenameItemId(itemToRename.id);
      setRenameItemTitle(itemToRename.title);
      setNewTitleInput(itemToRename.title); // Pre-fill input with current title
      setIsRenameModalOpen(true); // Open the modal
      console.log("itemToRename", itemToRename);
    }
    // }
    handleMenuClose(); // Close the menu regardless
  };

  // Closes the rename modal
  const handleModalClose = () => {
    setIsRenameModalOpen(false);
    setRenameItemId(null);
    setRenameItemTitle("");
    setNewTitleInput("");
    setRenameLoading(false);
  };

  // Handles the actual renaming action from the modal
  const handleConfirmRename = async () => {
    if (newTitleInput.trim()) {
      setRenameLoading(true);
      try {
        await onChatRename(renameItemId, newTitleInput.trim());
        handleModalClose(); // Close modal after successful renaming
      } catch (error) {
        setRenameLoading(false); // Keep modal open on error
      }
    }
  };

  // Sort items by date descending (newest first) to match grouping logic
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let lastCategory: string | null = null;
  const elements: React.ReactNode[] = [];

  sortedItems.forEach((item, index) => {
    const currentCategory = getRelativeDateCategory(item.date);

    // Get the appropriate icon for the chat type
    let chatIcon = null;
    const iconStyle = { fontSize: 16, color: "#64748b" }; // Text secondary color

    if (item?.chattype === "brainflash") {
      chatIcon = <FlashOnIcon sx={iconStyle} />;
    } else if (item?.chattype === "peer-review") {
      chatIcon = <ForumIcon sx={iconStyle} />;
    } else if (item?.chattype === "deep-dive") {
      chatIcon = <MenuBookIcon sx={iconStyle} />;
    } else if (item?.chattype === "basic-medical-library") {
      chatIcon = <SchoolRounded sx={iconStyle} />;
    } else if (item?.chattype === "advanced-medical-library") {
      chatIcon = <LibraryBooksRounded sx={iconStyle} />;
    } else if (item?.chattype === "virtual-md") {
      chatIcon = <MedicalServicesRounded sx={iconStyle} />;
    } else if (item?.chattype === "general") {
      chatIcon = <MedicalServicesIcon sx={iconStyle} />;
    }

    // Add separator if category changes
    if (currentCategory !== lastCategory) {
      elements.push(
        <div
          key={`sep-${currentCategory}`}
          className="noselect"
          style={{
            marginTop: index === 0 ? "0px" : "24px",
            marginBottom: "8px",
            fontWeight: "600",
            color: "#9ca3af",
            fontSize: "0.75rem",
            paddingLeft: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {currentCategory}
        </div>
      );
      lastCategory = currentCategory;
    }

    // Add chat item
    elements.push(
      <ListItem
        key={item.id}
        button
        onClick={() => onChatSelect(item)} // Call onChatSelect when clicked
        secondaryAction={
          <IconButton
            edge="end"
            aria-label="options"
            aria-controls={
              menuOpenItemId === item.id ? "chat-options-menu" : undefined
            } // For accessibility
            aria-haspopup="true"
            onClick={(event) => {
              event.stopPropagation();
              handleMenuClick(event, item.id);
            }} // Open menu on click
            sx={{
              color: "#64748b",
              zIndex: 20, // Above the chat icon
              transition: "opacity 0.2s ease",
              "&:hover": {
                backgroundColor: "#f8fafc",
              },
            }}
            className="list-item-actions"
            style={{
              opacity:
                menuOpenItemId === item.id || activeChat === item.id ? 1 : 0, // Control via inline style
            }}
          >
            <MoreVertRounded fontSize="small" />
          </IconButton>
        }
        sx={{
          mb: 0.5,
          borderRadius: "8px",
          backgroundColor: activeChat === item.id ? "#f0f9ff" : "transparent",
          border: "none",
          boxShadow: "none",
          py: 1,
          px: 1.5,
          position: "relative",
          minHeight: "48px",
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: activeChat === item.id ? "#f0f9ff" : "#f8fafc",
            "& .list-item-actions": {
              opacity: "1 !important", // Force override
            },
            "& .chat-type-icon": {
              opacity: "0 !important", // Force hide icon on hover
            },
          },
          "&:focus-within": {
            "& .list-item-actions": {
              opacity: "1 !important", // Show three dots when focused
            },
            "& .chat-type-icon": {
              opacity: "0 !important", // Hide icon when focused
            },
          },

          ...(activeChat === item.id && {
            backgroundColor: "#f0f9ff",
          }),
        }}
      >
        {chatIcon && (
          <div
            className="chat-type-icon"
            style={{
              position: "absolute",
              right: "14px", // Same position as three dots button
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 0,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity:
                activeChat === item.id || menuOpenItemId === item.id ? 0 : 1, // Hide if active chat OR menu open
              transition: "opacity 0.2s ease",
            }}
          >
            {chatIcon}
          </div>
        )}
        <ListItemText
          primary={
            item.title ||
            (item.messages && item.messages.length > 0 ? "Untitled" : "")
          }
          primaryTypographyProps={{
            fontWeight: 500,
            fontSize: "0.9rem",
            lineHeight: 1.3,
            color:
              activeChat === item.id
                ? "#1e40af"
                : item.title
                ? "#374151"
                : "#9ca3af",
            sx: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              pr: 3,
            },
          }}
        />
      </ListItem>
    );
  });

  return (
    <>
      <List dense sx={{ px: 0.5 }}>
        {items.length === 0 ? (
          <Typography
            align="center"
            sx={{
              py: 4,
              color: "text.secondary",
              fontSize: "0.95rem",
              fontWeight: 500,
            }}
          >
            No conversations yet.
          </Typography>
        ) : (
          elements
        )}
      </List>
      <Menu
        id="chat-options-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)} // Menu is open if anchorEl is not null
        onClose={handleMenuClose} // Close menu when clicking away
        MenuListProps={{
          "aria-labelledby": "basic-button", // Accessibility reference
        }}
        sx={{ zIndex: 1400 }}
      >
        <MenuItem onClick={handleRenameClick}>Rename</MenuItem>
        <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>
      </Menu>
      {/* Dialog: Rename Chat */}
      <Dialog
        open={isRenameModalOpen}
        onClose={handleModalClose}
        maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            width: "400px",
          },
        }}
      >
        <DialogTitle>Rename Chat</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="New chat title"
            variant="standard"
            value={newTitleInput}
            onChange={(e) => setNewTitleInput(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 1 }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !renameLoading) handleConfirmRename();
            }}
            autoFocus
            disabled={renameLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleModalClose} disabled={renameLoading}>
            Cancel
          </Button>
          <LoadingButton
            loading={renameLoading}
            variant="contained"
            onClick={handleConfirmRename}
            disabled={
              !newTitleInput.trim() ||
              newTitleInput.trim() === renameItemTitle ||
              renameLoading
            }
          >
            Rename
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Dialog: Delete Confirmation */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={handleCancelDelete}
        maxWidth="xs"
      >
        <DialogTitle>Delete Chat</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this chat? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={deleteLoading}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            loading={deleteLoading}
          >
            Delete
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatHistory;
