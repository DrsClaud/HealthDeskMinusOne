import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { Description, LocalLibrary, Upload } from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import {
  deleteDocument,
  listDocuments,
  uploadDocument,
} from "services/clinicalReferencesService";

const DOCUMENT_TYPES = [
  { value: "guideline", label: "Guideline" },
  { value: "protocol", label: "Protocol" },
  { value: "algorithm", label: "Algorithm" },
  { value: "reference", label: "Reference" },
];

const ACCEPTED_REFERENCE_TYPES = [".pdf"];

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  // Serialized Firestore Timestamp from callable function response
  if (typeof value?._seconds === "number") return new Date(value._seconds * 1000);
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const ClinicalReferencesPanel = ({ disabled = false, promptId = "", references }) => {
  const useFixedReferenceList = references !== undefined;
  const normalizedPromptId = String(promptId || "").trim().toLowerCase();
  const hasPromptId = Boolean(normalizedPromptId);

  const [isDragging, setIsDragging] = useState(false);
  const [source, setSource] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [documentType, setDocumentType] = useState("guideline");
  const [pendingReferences, setPendingReferences] = useState([]);
  const [persistedReferences, setPersistedReferences] = useState(() =>
    useFixedReferenceList ? references : [],
  );
  const [listLoading, setListLoading] = useState(() => !useFixedReferenceList);
  const [uploadError, setUploadError] = useState(null);

  const visibleReferences = useMemo(
    () => [...pendingReferences, ...persistedReferences],
    [pendingReferences, persistedReferences],
  );

  const refreshList = useCallback(async () => {
    if (useFixedReferenceList) {
      setListLoading(false);
      return;
    }
    if (!hasPromptId) {
      setPersistedReferences([]);
      setListLoading(false);
      return;
    }
    try {
      setListLoading(true);
      const docs = await listDocuments(normalizedPromptId);
      setPersistedReferences(docs);
    } catch (err) {
      console.error("[ClinicalReferencesPanel] listDocuments failed:", err);
    } finally {
      setListLoading(false);
    }
  }, [hasPromptId, normalizedPromptId, useFixedReferenceList]);

  useEffect(() => {
    if (useFixedReferenceList) {
      setPersistedReferences(references);
      setListLoading(false);
      return;
    }
    refreshList();
  }, [references, refreshList, useFixedReferenceList]);

  const normalizePendingReference = (file) => ({
    id: `pending-${file.name}-${file.size}-${file.lastModified}`,
    fileName: file.name,
    source: source || "Unspecified source",
    specialty: specialty || "General",
    documentType,
    createdAt: new Date(),
    isPending: true,
  });

  const acceptFiles = async (files) => {
    if (!hasPromptId) return;
    const pdfFiles = files.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"),
    );
    if (!pdfFiles.length) return;

    setUploadError(null);
    const normalized = pdfFiles.map(normalizePendingReference);

    // Add pending placeholders immediately so the user sees them
    setPendingReferences((current) => {
      const existing = new Set(current.map((ref) => ref.id));
      const merged = [...current];
      normalized.forEach((ref) => {
        if (!existing.has(ref.id)) merged.push(ref);
      });
      return merged;
    });

    const meta = { source, specialty, documentType };
    const errors = [];

    await Promise.all(
      pdfFiles.map(async (file, i) => {
        try {
          await uploadDocument(file, normalizedPromptId, meta);
        } catch (err) {
          console.error("[ClinicalReferencesPanel] upload failed:", file.name, err);
          errors.push(file.name);
          // Remove failed placeholder
          const failedId = normalized[i].id;
          setPendingReferences((current) => current.filter((ref) => ref.id !== failedId));
        }
      }),
    );

    if (errors.length) {
      setUploadError(`Failed to upload: ${errors.join(", ")}`);
    }

    // Refresh the persisted list and clear successful pending entries
    await refreshList();
    setPendingReferences((current) =>
      current.filter((ref) => errors.some((name) => ref.fileName === name)),
    );
  };

  const handleFileInput = (event) => {
    acceptFiles(Array.from(event.target.files || []));
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled || (!useFixedReferenceList && !hasPromptId)) return;
    acceptFiles(Array.from(event.dataTransfer.files || []));
  };

  const handleRemove = async (reference) => {
    if (reference.isPending) {
      setPendingReferences((current) =>
        current.filter((entry) => entry.id !== reference.id),
      );
      return;
    }
    if (useFixedReferenceList) {
      setPersistedReferences((current) =>
        current.filter((entry) => entry.id !== reference.id),
      );
      return;
    }
    try {
      await deleteDocument(reference.id, normalizedPromptId);
      setPersistedReferences((current) =>
        current.filter((entry) => entry.id !== reference.id),
      );
    } catch (err) {
      console.error("[ClinicalReferencesPanel] deleteDocument failed:", err);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
          gap: 1.5,
        }}
      >
        <TextField
          label="Source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder="WHO, NICE, MOH, etc."
          disabled={disabled}
          size="small"
        />
        <TextField
          label="Specialty"
          value={specialty}
          onChange={(event) => setSpecialty(event.target.value)}
          placeholder="Cardiology, Pediatrics, ..."
          disabled={disabled}
          size="small"
        />
        <FormControl size="small" disabled={disabled}>
          <InputLabel id="clinical-reference-document-type-label">
            Type
          </InputLabel>
          <Select
            labelId="clinical-reference-document-type-label"
            label="Type"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
          >
            {DOCUMENT_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {!hasPromptId && !useFixedReferenceList ? (
        <Typography variant="body2" color="text.secondary">
          Enter a prompt ID before uploading clinical references.
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
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && (useFixedReferenceList || hasPromptId)) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        <Upload sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
        <Typography variant="subtitle1">Upload Documents</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Drop guideline PDFs here or choose files manually.
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 1.5, display: "block" }}
        >
          Accepted formats: {ACCEPTED_REFERENCE_TYPES.join(", ")}
        </Typography>
        <input
          id="clinical-references-upload"
          type="file"
          multiple
          accept={ACCEPTED_REFERENCE_TYPES.join(",")}
          style={{ display: "none" }}
          onChange={handleFileInput}
          disabled={disabled || (!useFixedReferenceList && !hasPromptId)}
        />
        <label htmlFor="clinical-references-upload">
          <Button
            component="span"
            variant="outlined"
            startIcon={<Upload />}
            disabled={disabled || (!useFixedReferenceList && !hasPromptId)}
          >
            Select Files
          </Button>
        </label>
      </Paper>

      {uploadError ? (
        <Typography variant="body2" color="error">
          {uploadError}
        </Typography>
      ) : null}

      <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LocalLibrary fontSize="small" />
        Clinical References
      </Typography>
      {listLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : !visibleReferences.length ? (
        <Typography variant="body2" color="text.secondary">
          No references uploaded yet.
        </Typography>
      ) : (
        <List dense>
          {visibleReferences.map((reference) => {
            const createdAt = toDate(reference.createdAt);
            const recency = createdAt
              ? formatDistanceToNow(createdAt, { addSuffix: true })
              : "unknown date";

            return (
              <ListItem
                key={reference.id}
                alignItems="flex-start"
                secondaryAction={
                  <Button
                    size="small"
                    disabled={disabled}
                    onClick={() => handleRemove(reference)}
                  >
                    {reference.isPending ? "Dismiss" : "Remove"}
                  </Button>
                }
              >
                <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                  <Description fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  sx={{ minWidth: 0, pr: 1 }}
                  primary={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                        pr: { xs: 0, sm: 1 },
                      }}
                    >
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{ wordBreak: "break-word" }}
                      >
                        {reference.fileName || "Untitled reference"}
                      </Typography>
                      <Chip
                        size="small"
                        label={(reference.documentType || "reference").toUpperCase()}
                        sx={{ flexShrink: 0 }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {reference.source || "Unspecified source"} •{" "}
                      {reference.specialty || "General"} • {recency}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
};

export default ClinicalReferencesPanel;
