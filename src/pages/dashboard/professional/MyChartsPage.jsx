import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Add as AddIcon, MoreVert as MoreVertIcon } from "@mui/icons-material";
import { useAuth } from "hooks/useAuth";
import DashboardPageHeader from "components/common/DashboardPageHeader";
import * as sessionService from "services/chartMindSessionService";
import { formatDistanceToNow } from "date-fns";

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

const MyChartsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadSessions();
  }, [user?.uid]);

  const loadSessions = async (limit = 20) => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const userSessions = await sessionService.listUserSessions(
        user.uid,
        limit,
      );
      setSessions(userSessions);
      setHasMore(userSessions.length === limit);
      setError(null);
    } catch (err) {
      console.error("Error loading sessions:", err);
      setError("Failed to load your charts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreSessions = async () => {
    if (!user?.uid || loadingMore) return;

    try {
      setLoadingMore(true);
      const currentLimit = sessions.length + 20;
      const userSessions = await sessionService.listUserSessions(
        user.uid,
        currentLimit,
      );
      setSessions(userSessions);
      setHasMore(userSessions.length === currentLimit);
    } catch (err) {
      console.error("Error loading more sessions:", err);
      setError("Failed to load more charts.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSessionClick = (sessionId) => {
    navigate(`/dashboard/chartmind/${sessionId}`);
  };

  const handleMenuOpen = (event, session) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedSession(session);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    // Don't clear selectedSession here - we need it for the dialogs
  };

  const handleRenameClick = () => {
    setNewTitle(selectedSession?.title || "");
    setRenameDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleRenameConfirm = async () => {
    if (!selectedSession?.id || !newTitle.trim()) return;

    setRenaming(true);

    try {
      await sessionService.updateSessionTitle(
        selectedSession.id,
        newTitle.trim(),
      );

      // Update local state
      setSessions(
        sessions.map((s) =>
          s.id === selectedSession.id ? { ...s, title: newTitle.trim() } : s,
        ),
      );

      setRenameDialogOpen(false);
      setNewTitle("");
      setSelectedSession(null);
      setSuccessMessage("Chart renamed successfully.");
    } catch (err) {
      console.error("Error renaming session:", err);
      setError("Failed to rename chart.");
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSession?.id) return;

    setDeleting(true);

    try {
      await sessionService.deleteSession(selectedSession.id);
      setSessions(sessions.filter((s) => s.id !== selectedSession.id));
      setDeleteDialogOpen(false);
      setSelectedSession(null);
      setSuccessMessage("Chart deleted successfully.");
    } catch (err) {
      console.error("Error deleting session:", err);
      setError("Failed to delete chart.");
    } finally {
      setDeleting(false);
    }
  };

  const handleRenameCancel = () => {
    setRenameDialogOpen(false);
    setNewTitle("");
    setSelectedSession(null); // Clear only when dialog closes
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedSession(null); // Clear only when dialog closes
  };

  const handleNewEncounter = () => {
    navigate("/dashboard/chartmind");
  };

  const getSessionTitle = (session) => {
    // 1. Use AI-generated title (ideal)
    if (session.title) {
      return session.title;
    }

    // 2. Fallback: Use diagnoses if available
    const diagnoses = session.data?.diagnosis?.selectedDiagnosisNames;
    if (diagnoses?.length > 0) {
      return diagnoses.slice(0, 2).join(", ");
    }

    // 3. Fallback: First line of transcript
    const transcript = session.data?.recording?.transcript;
    if (transcript) {
      const firstLine = transcript.split("\n")[0].trim();
      return firstLine.length > 60
        ? `${firstLine.substring(0, 60)}...`
        : firstLine;
    }

    // 4. Last resort
    return "Untitled Encounter";
  };

  const getSessionDate = (session) => {
    const timestamp =
      session.updatedAt || session.timestamp || session.createdAt;
    if (!timestamp)
      return { relative: "Last edited at unknown time", full: "Unknown date" };

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const distance = formatDistanceToNow(date, { addSuffix: false });

      return {
        relative: `Last edited ${distance} ago`,
        full: fullDateFormatter.format(date),
      };
    } catch (err) {
      return { relative: "Last edited at invalid time", full: "Invalid date" };
    }
  };

  return (
    <>
      <DashboardPageHeader
        title="My Charts"
        subtitle={
          <Typography color="text.secondary">
            View and manage your saved patient encounters.
          </Typography>
        }
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewEncounter}
            sx={{ flexShrink: 0 }}
          >
            New Chart
          </Button>
        }
      />

      {/* Success Alert */}
      {successMessage && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!loading && sessions.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            No charts yet. Start your first patient encounter to see it here.
          </Typography>
        </Box>
      )}

      {/* Sessions List */}
      {!loading && sessions.length > 0 && (
        <>
          <Paper variant="outlined" sx={{ mb: 3 }}>
            <List disablePadding>
              {sessions.map((session, index) => {
                const title = getSessionTitle(session);
                const { relative: dateRelative, full: dateFull } =
                  getSessionDate(session);
                const isMenuOpen =
                  menuAnchor && selectedSession?.id === session.id;

                return (
                  <React.Fragment key={session.id}>
                    <ListItem
                      disablePadding
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={(e) => handleMenuOpen(e, session)}
                          sx={{
                            opacity: isMenuOpen ? 1 : 0,
                            transition: "opacity 0.2s",
                            ".MuiListItem-root:hover &": {
                              opacity: 1,
                            },
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      }
                    >
                      <ListItemButton
                        onClick={() => handleSessionClick(session.id)}
                        sx={{ py: 2, px: 2, pr: 6 }}
                      >
                        <ListItemText
                          primary={
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: 500,
                                mb: 0.5,
                              }}
                            >
                              {title}
                            </Typography>
                          }
                          secondary={
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              component="span"
                              title={dateFull}
                            >
                              {dateRelative}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < sessions.length - 1 && (
                      <Box
                        sx={{ borderBottom: 1, borderColor: "divider", mx: 2 }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>

          {/* Load More Button */}
          {hasMore && (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
              <LoadingButton
                variant="outlined"
                onClick={loadMoreSessions}
                loading={loadingMore}
              >
                Load More
              </LoadingButton>
            </Box>
          )}
        </>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleRenameClick}>Rename</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
          Delete
        </MenuItem>
      </Menu>

      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={renaming ? undefined : handleRenameCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rename Chart</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Chart Title"
            type="text"
            fullWidth
            variant="standard"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && newTitle.trim()) {
                handleRenameConfirm();
              }
            }}
            disabled={renaming}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRenameCancel} disabled={renaming}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleRenameConfirm}
            loading={renaming}
            disabled={!newTitle.trim() || renaming}
            variant="contained"
            autoFocus
          >
            Rename
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={deleting ? undefined : handleDeleteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Chart?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this chart? This action cannot be
            undone.
          </Typography>
          {selectedSession?.title && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2, fontStyle: "italic" }}
            >
              "{selectedSession.title}"
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleDeleteConfirm}
            loading={deleting}
            disabled={deleting}
            variant="contained"
            color="error"
            autoFocus
          >
            Delete
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MyChartsPage;
