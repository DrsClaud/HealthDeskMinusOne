import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Description, Upload } from "@mui/icons-material";
import { format, formatDistanceToNow } from "date-fns";
import {
  deleteDocument,
  listDocuments,
  updateDocumentPublic,
  uploadDocument,
} from "services/embeddedDocumentsService";

const DEFAULT_ACCEPTED_TYPES = [".pdf", ".docx", ".txt", ".md"];
const SHOW_PUBLIC_TOGGLE = false;

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  // Serialized Firestore Timestamp from callable function response
  if (typeof value?._seconds === "number") return new Date(value._seconds * 1000);
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const formatFileSize = (bytes = 0) => {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const DocumentManagementPanel = ({
  disabled = false,
  promptId = "",
  chunkLimit = 5,
  onChunkLimitChange,
}) => {
  const normalizedPromptId = String(promptId || "").trim().toLowerCase();
  const hasPromptId = Boolean(normalizedPromptId);
  const [prioritizeUploadedDocs, setPrioritizeUploadedDocs] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [persistedDocs, setPersistedDocs] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [uploadError, setUploadError] = useState(null);
  const [updatingPublicDocId, setUpdatingPublicDocId] = useState(null);

  const visibleDocuments = useMemo(
    () => [...pendingFiles, ...persistedDocs],
    [pendingFiles, persistedDocs],
  );

  const refreshList = useCallback(async () => {
    if (!hasPromptId) {
      setPersistedDocs([]);
      setListLoading(false);
      return;
    }
    try {
      setListLoading(true);
      const docs = await listDocuments(normalizedPromptId);
      setPersistedDocs(docs);
    } catch (err) {
      console.error("[DocumentManagementPanel] listDocuments failed:", err);
    } finally {
      setListLoading(false);
    }
  }, [hasPromptId, normalizedPromptId]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const persistSettings = (nextValue) => {
    console.log("[DocumentManagementPanel] submit-settings (no-op)", {
      prioritizeUploadedDocs: nextValue,
    });
  };

  const normalizePendingFile = (file) => ({
    id: `pending-${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    fileName: file.name,
    metadata: {
      fileSize: file.size,
      fileType: file.name.split(".").pop() || "file",
    },
    createdAt: new Date(),
    isPending: true,
    public: false,
  });

  const acceptFiles = async (files) => {
    if (!files.length || !hasPromptId) return;

    setUploadError(null);
    const normalized = files.map(normalizePendingFile);

    setPendingFiles((current) => {
      const existing = new Set(current.map((f) => f.id));
      const merged = [...current];
      normalized.forEach((f) => {
        if (!existing.has(f.id)) merged.push(f);
      });
      return merged;
    });

    const errors = [];

    await Promise.all(
      files.map(async (file, i) => {
        try {
          await uploadDocument(file, normalizedPromptId);
        } catch (err) {
          console.error("[DocumentManagementPanel] upload failed:", file.name, err);
          errors.push(file.name);
          const failedId = normalized[i].id;
          setPendingFiles((current) => current.filter((f) => f.id !== failedId));
        }
      }),
    );

    if (errors.length) {
      setUploadError(`Failed to upload: ${errors.join(", ")}`);
    }

    await refreshList();
    setPendingFiles((current) =>
      current.filter((f) => errors.some((name) => f.fileName === name)),
    );
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled || !hasPromptId) return;
    acceptFiles(Array.from(event.dataTransfer.files || []));
  };

  const handleFileInput = (event) => {
    acceptFiles(Array.from(event.target.files || []));
    event.target.value = "";
  };

  const handleRemoveClick = async (docId, isPending) => {
    if (isPending) {
      setPendingFiles((current) => current.filter((doc) => doc.id !== docId));
      return;
    }
    try {
      await deleteDocument(docId, normalizedPromptId);
      setPersistedDocs((current) => current.filter((doc) => doc.id !== docId));
    } catch (err) {
      console.error("[DocumentManagementPanel] deleteDocument failed:", err);
    }
  };

  const handlePublicToggle = async (docId, nextPublic) => {
    try {
      setUpdatingPublicDocId(docId);
      await updateDocumentPublic(docId, nextPublic, normalizedPromptId);
      setPersistedDocs((current) =>
        current.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                public: nextPublic,
              }
            : doc,
        ),
      );
    } catch (err) {
      console.error("[DocumentManagementPanel] updateDocumentPublic failed:", err);
    } finally {
      setUpdatingPublicDocId(null);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={prioritizeUploadedDocs}
            onChange={(event) => {
              setPrioritizeUploadedDocs(event.target.checked);
              persistSettings(event.target.checked);
            }}
            disabled={disabled}
          />
        }
        label="Prioritize uploaded documents in model responses"
      />
      <Typography variant="body2" color="text.secondary" sx={{ mt: -1 }}>
        Turn this on if you want the assistant to rely on these uploaded
        documents as the main source of truth when answering. If you leave it
        off, the assistant can still use general medical knowledge and may treat
        uploaded files as secondary context.
      </Typography>
      {!hasPromptId ? (
        <Typography variant="body2" color="text.secondary">
          Enter a prompt ID before uploading embedded documents.
        </Typography>
      ) : null}

      <Paper
        variant="outlined"
        sx={{
          p: 3,
          textAlign: "center",
          border: "2px dashed",
          borderColor: isDragging ? "primary.main" : "divider",
          bgcolor: isDragging ? "action.hover" : "background.paper",
          transition: "all 0.2s ease",
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
        <Typography variant="subtitle1">Upload Documents</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Drag files here or choose files manually.
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 1.5, display: "block" }}
        >
          Accepted formats: {DEFAULT_ACCEPTED_TYPES.join(", ")}
        </Typography>
        <input
          id="embedded-documents-upload"
          type="file"
          multiple
          accept={DEFAULT_ACCEPTED_TYPES.join(",")}
          style={{ display: "none" }}
          onChange={handleFileInput}
          disabled={disabled || !hasPromptId}
        />
        <label htmlFor="embedded-documents-upload">
          <Button
            component="span"
            variant="outlined"
            startIcon={<Upload />}
            disabled={disabled || !hasPromptId}
          >
            Select Files
          </Button>
        </label>
      </Paper>

      <TextField
        type="number"
        label="Included Chunks"
        value={chunkLimit}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (!Number.isFinite(nextValue)) return;
          const clampedValue = Math.min(30, Math.max(1, Math.floor(nextValue)));
          onChunkLimitChange?.(clampedValue);
        }}
        inputProps={{ min: 1, max: 30, step: 1 }}
        disabled={disabled || !hasPromptId}
        helperText="How many embedded-document chunks Try Prompt should include. Range: 1-30."
        sx={{ maxWidth: 220 }}
      />

      <Divider />

      {uploadError ? (
        <Typography variant="body2" color="error">
          {uploadError}
        </Typography>
      ) : null}

      <Typography variant="subtitle2">Documents</Typography>
      {listLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : !visibleDocuments.length ? (
        <Typography variant="body2" color="text.secondary">
          No documents uploaded yet.
        </Typography>
      ) : (
        <List dense>
          {visibleDocuments.map((doc) => {
            const metadata = doc.metadata || {};
            const uploadedAt = toDate(doc.createdAt || metadata.createdAt);
            const uploadedLabel = uploadedAt
              ? `${format(uploadedAt, "MMM d, yyyy")} (${formatDistanceToNow(uploadedAt, { addSuffix: true })})`
              : "Unknown";
            const chunkCount = Number(doc.chunkCount || 0);
            const isPublic = doc.public === true;

            return (
              <ListItem
                key={doc.id}
                alignItems="flex-start"
                secondaryAction={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {!doc.isPending ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ whiteSpace: "nowrap" }}
                      >
                        {chunkCount} {chunkCount === 1 ? "chunk" : "chunks"}
                      </Typography>
                    ) : null}
                    {/* Keep the public toggle code in place, but hide it until the UX is ready. */}
                    {SHOW_PUBLIC_TOGGLE ? (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          px: 0.75,
                          py: 0.125,
                          borderRadius: 1,
                          bgcolor: "grey.100",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.8125rem",
                            color: "text.primary",
                            fontWeight: 500,
                            lineHeight: 1,
                          }}
                        >
                          Public
                        </Typography>
                        <Switch
                          size="small"
                          checked={isPublic}
                          onChange={(event) =>
                            handlePublicToggle(doc.id, event.target.checked)
                          }
                          disabled={
                            disabled ||
                            doc.isPending ||
                            updatingPublicDocId === doc.id
                          }
                          sx={{ mr: -0.5 }}
                        />
                      </Box>
                    ) : null}
                    <Button
                      size="small"
                      onClick={() => handleRemoveClick(doc.id, doc.isPending)}
                      disabled={disabled || updatingPublicDocId === doc.id}
                    >
                      {doc.isPending ? "Dismiss" : "Remove"}
                    </Button>
                  </Box>
                }
              >
                <Description fontSize="small" />
                <ListItemText
                  sx={{ ml: 1, mr: 24 }}
                  secondaryTypographyProps={{ component: "div" }}
                  primary={doc.fileName || doc.name || "Untitled document"}
                  secondary={
                    <Box sx={{ mt: 0.25 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        {formatFileSize(doc.fileSize || metadata.fileSize)}
                        {metadata.source ? ` • ${metadata.source}` : ""}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        {doc.isPending ? "Ready to upload" : "Uploaded"}:{" "}
                        {uploadedLabel}
                      </Typography>
                    </Box>
                  }
                />
                {doc.metadata?.fileType || doc.type ? (
                  <Chip
                    size="small"
                    label={(doc.metadata?.fileType || doc.type || "doc")
                      .toString()
                      .toUpperCase()}
                    sx={{ mr: 1 }}
                  />
                ) : null}
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
};

export default DocumentManagementPanel;
