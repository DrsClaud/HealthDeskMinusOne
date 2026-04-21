import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import EditOutlined from "@mui/icons-material/EditOutlined";

const EMPTY_FORM = {
  id: null,
  title: "",
  body: "",
};

const TestEncountersPanel = ({
  encounters = [],
  loading = false,
  error = "",
  disabled = false,
  onSelectEncounter,
  onSaveEncounter,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = useMemo(() => Boolean(draft.id), [draft.id]);

  const resetDialogState = () => {
    setDialogOpen(false);
    setDraft(EMPTY_FORM);
    setSaveError("");
  };

  const handleCloseDialog = () => {
    if (saving) {
      return;
    }

    resetDialogState();
  };

  const handleOpenAdd = () => {
    setDraft(EMPTY_FORM);
    setSaveError("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (encounter) => {
    setDraft({
      id: encounter.id,
      title: encounter.title || "",
      body: encounter.body || "",
    });
    setSaveError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const title = draft.title.trim();
    const body = draft.body.trim();

    if (!title || !body) {
      setSaveError("Both title and body are required.");
      return;
    }

    try {
      setSaving(true);
      setSaveError("");
      await onSaveEncounter?.({
        id: draft.id,
        title,
        body,
      });
      resetDialogState();
    } catch (dialogError) {
      console.error("[TestEncountersPanel] Failed to save encounter:", dialogError);
      setSaveError(dialogError.message || "Failed to save test encounter.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ width: "100%", mt: 4 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 1.5,
        }}
      >
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ color: "text.secondary", fontWeight: 600 }}
          >
            Test Encounters
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Click a card to load a saved example transcript.
          </Typography>
        </Box>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
          },
          gap: 1.5,
        }}
      >
        {encounters.map((encounter) => (
          <Paper
            key={encounter.id}
            variant="outlined"
            sx={{
              position: "relative",
              minHeight: 108,
              borderRadius: 2,
              borderColor: "divider",
              backgroundColor: disabled ? "action.hover" : "background.paper",
            }}
          >
            <Box
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && onSelectEncounter?.(encounter)}
              onKeyDown={(event) => {
                if (disabled) {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectEncounter?.(encounter);
                }
              }}
              sx={{
                p: 2,
                pr: 7,
                minHeight: 108,
                cursor: disabled ? "not-allowed" : "pointer",
                outline: "none",
                borderRadius: 2,
                transition: "background-color 0.2s ease",
                "&:hover": disabled
                  ? undefined
                  : {
                      backgroundColor: "action.hover",
                    },
                "&:focus-visible": {
                  boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}`,
                },
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  overflow: "hidden",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {encounter.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mt: 1,
                  display: "-webkit-box",
                  overflow: "hidden",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {encounter.body}
              </Typography>
            </Box>

            <IconButton
              size="small"
              aria-label={`Edit ${encounter.title}`}
              onClick={(event) => {
                event.stopPropagation();
                handleOpenEdit(encounter);
              }}
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
              }}
            >
              <EditOutlined fontSize="small" />
            </IconButton>
          </Paper>
        ))}
      </Box>

      {!loading && encounters.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
          No test encounters saved yet.
        </Typography>
      ) : null}

      {loading ? (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
          Loading saved test encounters...
        </Typography>
      ) : null}

      <Button
        variant="contained"
        onClick={handleOpenAdd}
        disabled={saving}
        sx={{ mt: 2 }}
      >
        Add
      </Button>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? "Edit Test Encounter" : "Add Test Encounter"}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Title"
            fullWidth
            variant="outlined"
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            label="Body"
            fullWidth
            multiline
            minRows={8}
            variant="outlined"
            value={draft.body}
            onChange={(event) =>
              setDraft((current) => ({ ...current, body: event.target.value }))
            }
          />
          {saveError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {saveError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestEncountersPanel;
