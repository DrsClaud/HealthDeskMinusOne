import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Slider,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { ExpandMore, MoreVert } from "@mui/icons-material";
import { Controller, useForm } from "react-hook-form";
import { formatDistanceToNow } from "date-fns";
import InlineTextDiff from "components/common/InlineTextDiff";
import { useAuth } from "hooks/useAuth";
import { DEFAULT_MODEL } from "services/llm/llmConstants";
import { invokeLLMPrompt } from "services/llmService";
import promptRegistryService, {
  historyFieldValuesEqual,
} from "services/llm/promptRegistryService";
import DocumentManagementPanel from "./DocumentManagementPanel";
import ClinicalReferencesPanel from "./ClinicalReferencesPanel";

const EMPTY_CHAIN = { isPartOfChain: false, chainId: "", chainPosition: "" };

/** Default when creating a prompt or when stored data has no temperature. */
const DEFAULT_PROMPT_TEMPERATURE = 0.8;

const EMPTY_FORM = {
  id: "",
  featureName: "",
  featureDescription: "",
  category: "chartmind",
  organizationPrompt: "",
  regionalPrompt: "",
  systemPrompt: "",
  contextProvided: "",
  responseFormat: "",
  model: DEFAULT_MODEL,
  maxTokens: 4000,
  temperature: DEFAULT_PROMPT_TEMPERATURE,
  chainConfig: { ...EMPTY_CHAIN },
  reason: "",
};

const models = [
  "gemini-2.0-flash",
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "claude-sonnet-4-5",
];

const HISTORY_META_KEYS = new Set([
  "id",
  "changedAt",
  "changedBy",
  "changedByEmail",
  "scope",
  "scopeId",
  "promptId",
  "reason",
  "changedFields",
  "previousValues",
  "nextValues",
]);

const GLOBAL_HISTORY_FIELDS = [
  "systemPrompt",
  "contextProvided",
  "responseFormat",
  "model",
  "maxTokens",
  "temperature",
];

const HISTORY_FIELD_LABELS = {
  systemPrompt: "System Prompt",
  contextProvided: "Context Provided",
  responseFormat: "Response Format",
  model: "Model",
  maxTokens: "Max Tokens",
  temperature: "Temperature",
  organizationPrompt: "Organization Prompt",
  regionalPrompt: "Regional Prompt",
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const sortHistoryFieldKeys = (fields) =>
  [...fields].sort((a, b) => {
    const aIndex = GLOBAL_HISTORY_FIELDS.indexOf(a);
    const bIndex = GLOBAL_HISTORY_FIELDS.indexOf(b);
    const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    return normalizedA - normalizedB || a.localeCompare(b);
  });

const getHistoryChangedFields = (entry = {}) => {
  const prev = entry.previousValues;
  const next = entry.nextValues;
  if (
    prev &&
    typeof prev === "object" &&
    next &&
    typeof next === "object" &&
    (Object.keys(prev).length > 0 || Object.keys(next).length > 0)
  ) {
    const keySet = new Set([
      ...Object.keys(prev),
      ...Object.keys(next),
      ...(Array.isArray(entry.changedFields) ? entry.changedFields : []),
    ]);
    const out = [];
    for (const field of keySet) {
      if (HISTORY_META_KEYS.has(field)) continue;
      const before = hasOwn(prev, field) ? prev[field] : undefined;
      const after = hasOwn(next, field) ? next[field] : undefined;
      if (!historyFieldValuesEqual(field, before, after)) {
        out.push(field);
      }
    }
    return sortHistoryFieldKeys(out);
  }

  const explicitFields = Array.isArray(entry.changedFields) ? entry.changedFields : null;
  const fields =
    explicitFields || Object.keys(entry).filter((key) => !HISTORY_META_KEYS.has(key));
  return sortHistoryFieldKeys(fields);
};

const getHistoryFieldLabel = (field) => HISTORY_FIELD_LABELS[field] || field;

const getHistoryChangedAt = (entry) =>
  entry?.changedAt?.toDate?.() ??
  (entry?.changedAt?._seconds != null
    ? new Date(entry.changedAt._seconds * 1000)
    : null);

const getHistoryScopeLabel = (entry) =>
  entry.scope === "global"
    ? "Global"
    : entry.scope === "org"
      ? `Org: ${entry.scopeId}`
      : `Region: ${entry.scopeId}`;

const getHistoryFieldValue = (entry, field) => {
  if (hasOwn(entry?.nextValues, field)) return entry.nextValues[field];
  if (hasOwn(entry, field)) return entry[field];
  return undefined;
};

const formatHistoryValue = (value, known = true) => {
  if (!known) return "Unknown";
  if (value === "") return "Empty";
  if (value == null) return "Empty";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const getCurrentGlobalPromptState = (prompt) => {
  const safePrompt = prompt || {};
  return {
    systemPrompt: safePrompt.systemPrompt || safePrompt.globalPrompt || "",
    contextProvided: safePrompt.contextProvided || "",
    responseFormat: safePrompt.responseFormat || "",
    model: safePrompt.model || DEFAULT_MODEL,
    maxTokens: Number(safePrompt.maxTokens || 4000),
    temperature:
      typeof safePrompt.temperature === "number"
        ? safePrompt.temperature
        : DEFAULT_PROMPT_TEMPERATURE,
  };
};

const buildHistoryDiffDetails = ({ entry, entryIndex, history }) => {
  const changedFields = getHistoryChangedFields(entry);
  return changedFields.map((field) => {
    const olderEntry = history
      .slice(entryIndex + 1)
      .find((candidate) => getHistoryFieldValue(candidate, field) !== undefined);
    const hasExplicitPrevious = hasOwn(entry?.previousValues, field);
    const beforeValue = hasExplicitPrevious
      ? entry.previousValues[field]
      : olderEntry
        ? getHistoryFieldValue(olderEntry, field)
        : undefined;
    return {
      field,
      label: getHistoryFieldLabel(field),
      beforeValue,
      beforeKnown: hasExplicitPrevious || Boolean(olderEntry),
      afterValue: getHistoryFieldValue(entry, field),
    };
  });
};

const buildRevertSnapshot = ({ entryIndex, history, currentState }) => {
  const snapshot = {};
  const unknownFields = [];

  GLOBAL_HISTORY_FIELDS.forEach((field) => {
    const valueAtVersion = history
      .slice(entryIndex)
      .find((candidate) => getHistoryFieldValue(candidate, field) !== undefined);
    if (valueAtVersion) {
      snapshot[field] = getHistoryFieldValue(valueAtVersion, field);
      return;
    }

    const changedAfterVersion = history
      .slice(0, entryIndex)
      .some((candidate) => getHistoryFieldValue(candidate, field) !== undefined);

    if (changedAfterVersion) {
      unknownFields.push(field);
      return;
    }

    snapshot[field] = currentState[field];
  });

  return { snapshot, unknownFields };
};

const PromptEditorDialog = ({
  open,
  prompt,
  createMode = false,
  saving,
  canEditGlobal = false,
  canEditOrganization = false,
  canEditRegional = false,
  onClose,
  onSubmit,
}) => {
  const [localError, setLocalError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showReasonField, setShowReasonField] = useState(false);
  const [tryPromptInput, setTryPromptInput] = useState("");
  const [tryPromptOutput, setTryPromptOutput] = useState("");
  const [tryPromptMeta, setTryPromptMeta] = useState(null);
  const [tryPromptEmbeddedDocuments, setTryPromptEmbeddedDocuments] = useState(null);
  const [tryPromptError, setTryPromptError] = useState(null);
  const [tryPromptLoading, setTryPromptLoading] = useState(false);
  const [tryPromptChunksExpanded, setTryPromptChunksExpanded] = useState(false);
  const [tryPromptChunkLimit, setTryPromptChunkLimit] = useState(5);
  const { organizationId, userData } = useAuth();
  const regionId = String(userData?.region || "").trim() || null;

  const isGlobalEditor = Boolean(canEditGlobal);
  const isOrgEditor = Boolean(canEditOrganization && !canEditGlobal);
  const isRegionalEditor = Boolean(canEditRegional && !canEditGlobal);
  const showAuxiliaryTabs = isGlobalEditor;

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    setFocus,
    getValues,
    formState: { errors },
  } = useForm({ defaultValues: EMPTY_FORM });

  const watchedFeatureName = watch("featureName");
  const watchedId = watch("id");
  const currentPromptId = String(watchedId || prompt?.id || "").trim().toLowerCase();
  const [historyFeedback, setHistoryFeedback] = useState(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);

  const dialogTitle = useMemo(() => {
    if (watchedFeatureName) return watchedFeatureName;
    return createMode ? "Create Prompt" : "Edit Prompt";
  }, [createMode, watchedFeatureName]);

  useEffect(() => {
    if (!prompt) {
      reset(EMPTY_FORM);
      setLocalError(null);
      setActiveTab(0);
      setShowReasonField(false);
      setTryPromptInput("");
      setTryPromptOutput("");
      setTryPromptMeta(null);
      setTryPromptEmbeddedDocuments(null);
      setTryPromptError(null);
      setTryPromptChunksExpanded(false);
      setTryPromptChunkLimit(5);
      return;
    }
    reset({
      id: prompt.id || "",
      featureName: prompt.featureName || "",
      featureDescription: prompt.featureDescription || "",
      category: prompt.category || "chartmind",
      organizationPrompt: prompt.organizationPrompt || prompt.prompt || "",
      regionalPrompt: prompt.regionalPrompt || "",
      systemPrompt: prompt.systemPrompt || prompt.globalPrompt || "",
      contextProvided: prompt.contextProvided || "",
      responseFormat: prompt.responseFormat || "",
      model: prompt.model || DEFAULT_MODEL,
      maxTokens: Number(prompt.maxTokens || 4000),
      temperature:
        typeof prompt.temperature === "number"
          ? prompt.temperature
          : DEFAULT_PROMPT_TEMPERATURE,
      chainConfig: {
        isPartOfChain: Boolean(prompt.chainConfig?.isPartOfChain),
        chainId: prompt.chainConfig?.chainId || "",
        chainPosition:
          prompt.chainConfig?.chainPosition != null
            ? String(prompt.chainConfig.chainPosition)
            : "",
      },
      reason: "",
    });
    setLocalError(null);
    setHistoryFeedback(null);
    setActiveTab(0);
    setHistory([]);
    setSelectedHistoryEntry(null);
    setShowReasonField(false);
    setTryPromptInput("");
    setTryPromptOutput("");
    setTryPromptMeta(null);
    setTryPromptEmbeddedDocuments(null);
    setTryPromptError(null);
    setTryPromptChunksExpanded(false);
    setTryPromptChunkLimit(5);
  }, [prompt, reset]);

  useEffect(() => {
    if (!showReasonField || typeof window === "undefined") return undefined;
    const timeoutId = window.setTimeout(() => setFocus("reason"), 0);
    return () => window.clearTimeout(timeoutId);
  }, [setFocus, showReasonField]);

  const loadHistory = useCallback(async () => {
    if (!prompt?.id) return;
    setHistoryLoading(true);
    try {
      const entries = await promptRegistryService.getPromptHistory({ promptId: prompt.id });
      setHistory(entries);
    } catch (err) {
      console.error("[PromptEditorDialog] getPromptHistory failed", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [prompt?.id]);

  useEffect(() => {
    if (activeTab === 3) loadHistory();
  }, [activeTab, loadHistory]);

  const currentGlobalPromptState = useMemo(
    () => getCurrentGlobalPromptState(prompt),
    [prompt],
  );

  const selectedHistoryIndex = useMemo(
    () =>
      selectedHistoryEntry
        ? history.findIndex((entry) => entry.id === selectedHistoryEntry.id)
        : -1,
    [history, selectedHistoryEntry],
  );

  const selectedHistoryDetails = useMemo(() => {
    if (!selectedHistoryEntry || selectedHistoryIndex === -1) return null;
    const changedAt = getHistoryChangedAt(selectedHistoryEntry);
    const revertData = buildRevertSnapshot({
      entryIndex: selectedHistoryIndex,
      history,
      currentState: currentGlobalPromptState,
    });
    return {
      changedAt,
      diffRows: buildHistoryDiffDetails({
        entry: selectedHistoryEntry,
        entryIndex: selectedHistoryIndex,
        history,
      }),
      revertData,
    };
  }, [
    currentGlobalPromptState,
    history,
    selectedHistoryEntry,
    selectedHistoryIndex,
  ]);

  const handleOpenHistoryEntry = useCallback((entry) => {
    setSelectedHistoryEntry(entry);
  }, []);

  const handleCloseHistoryEntry = useCallback(() => {
    setSelectedHistoryEntry(null);
  }, []);

  const handleHistoryNavigatePrevious = useCallback(() => {
    if (selectedHistoryIndex <= 0) return;
    setSelectedHistoryEntry(history[selectedHistoryIndex - 1]);
  }, [history, selectedHistoryIndex]);

  const handleHistoryNavigateNext = useCallback(() => {
    if (selectedHistoryIndex < 0 || selectedHistoryIndex >= history.length - 1) return;
    setSelectedHistoryEntry(history[selectedHistoryIndex + 1]);
  }, [history, selectedHistoryIndex]);

  const handleRevertHistoryEntry = useCallback(
    (entry) => {
      const entryIndex = history.findIndex((candidate) => candidate.id === entry.id);
      if (entryIndex === -1) return;

      const { snapshot, unknownFields } = buildRevertSnapshot({
        entryIndex,
        history,
        currentState: currentGlobalPromptState,
      });

      Object.entries(snapshot).forEach(([field, value]) => {
        setValue(field, value, { shouldDirty: true });
      });

      setLocalError(null);
      setHistoryFeedback({
        severity: unknownFields.length ? "warning" : "success",
        message: unknownFields.length
          ? `Loaded the available values from this version. Some fields could not be fully reconstructed: ${unknownFields
              .map(getHistoryFieldLabel)
              .join(", ")}.`
          : "Loaded this historical version into the editor. Click Save to persist it.",
      });
      setSelectedHistoryEntry(null);
      setActiveTab(0);
    },
    [currentGlobalPromptState, history, setValue],
  );

  const handleRunTryPrompt = useCallback(async () => {
    const values = getValues();
    const resolvedId = (values.id || prompt?.id || "").trim().toLowerCase();
    const userMessage = tryPromptInput.trim();

    if (!resolvedId) {
      setTryPromptError("Prompt ID is required before running a preview.");
      setTryPromptOutput("");
      setTryPromptMeta(null);
      setTryPromptEmbeddedDocuments(null);
      setTryPromptChunksExpanded(false);
      return;
    }

    if (!userMessage) {
      setTryPromptError("Enter some input before running the prompt.");
      setTryPromptOutput("");
      setTryPromptMeta(null);
      setTryPromptEmbeddedDocuments(null);
      setTryPromptChunksExpanded(false);
      return;
    }

    const preview = {};

    if (isGlobalEditor) {
      preview.globalLayer = {
        systemPrompt: values.systemPrompt || "",
        contextProvided: values.contextProvided || "",
        responseFormat: values.responseFormat || "",
      };
    }

    if (isOrgEditor) {
      preview.organizationLayer = {
        prompt: values.organizationPrompt || "",
        organizationPrompt: values.organizationPrompt || "",
      };
    }

    if (isRegionalEditor) {
      preview.regionalLayer = {
        prompt: values.regionalPrompt || "",
        regionalPrompt: values.regionalPrompt || "",
      };
    }

    setTryPromptLoading(true);
    setTryPromptError(null);
    setTryPromptEmbeddedDocuments(null);
    setTryPromptChunksExpanded(false);

    try {
      const result = await invokeLLMPrompt({
        promptId: resolvedId,
        userMessage,
        config: {
          model: values.model || DEFAULT_MODEL,
          maxTokens: Number(values.maxTokens || 4000),
          temperature: Number(values.temperature ?? DEFAULT_PROMPT_TEMPERATURE),
        },
        organizationId,
        regionId,
        preview,
        includeEmbeddedDocuments: true,
        embeddedDocumentsOptions: {
          chunkLimit: tryPromptChunkLimit,
        },
      });

      setTryPromptOutput(result.output || "");
      setTryPromptMeta(result.meta || null);
      setTryPromptEmbeddedDocuments(result.embeddedDocuments || null);
    } catch (error) {
      setTryPromptOutput("");
      setTryPromptMeta(null);
      setTryPromptEmbeddedDocuments(null);
      setTryPromptError(error?.message || "Failed to run prompt preview.");
    } finally {
      setTryPromptLoading(false);
    }
  }, [
    getValues,
    isGlobalEditor,
    isOrgEditor,
    isRegionalEditor,
    organizationId,
    prompt?.id,
    regionId,
    tryPromptChunkLimit,
    tryPromptInput,
  ]);

  const submitForm = async (values) => {
    setLocalError(null);
    const resolvedId = (values.id || "").trim().toLowerCase();
    try {
      const updates = {};

      if (isGlobalEditor) {
        updates.featureName =
          (values.featureName || "").trim() || resolvedId;
        updates.featureDescription = (values.featureDescription || "").trim();
        updates.category = values.category;
        updates.systemPrompt = values.systemPrompt || "";
        updates.contextProvided = values.contextProvided || "";
        updates.responseFormat = values.responseFormat || "";
        updates.model = values.model;
        updates.maxTokens = Number(values.maxTokens || 0);
        updates.temperature = Number(values.temperature ?? DEFAULT_PROMPT_TEMPERATURE);
        // Chain UI commented out — omit chainConfig from saves so existing Firestore chain data is untouched.
        // updates.chainConfig = values.chainConfig?.isPartOfChain
        //   ? {
        //       isPartOfChain: true,
        //       chainId: values.chainConfig.chainId || values.category,
        //       chainPosition: Number(values.chainConfig.chainPosition) || 1,
        //     }
        //   : {
        //       isPartOfChain: false,
        //       chainId: null,
        //       chainPosition: null,
        //     };
      }

      if (isOrgEditor) {
        updates.organizationPrompt = values.organizationPrompt || "";
      }

      if (isRegionalEditor) {
        updates.regionalPrompt = values.regionalPrompt ?? "";
      }

      await onSubmit({
        id: resolvedId,
        updates,
        reason: (values.reason || "").trim() || null,
      });
    } catch (err) {
      setLocalError(err?.message || "Failed to save prompt.");
    }
  };

  const globalPromptTabContent = (
    <>
      {createMode ? (
        <Box sx={{ display: "grid", gap: 2 }}>
          <TextField
            label="Prompt ID"
            fullWidth
            inputProps={{ style: { fontFamily: "monospace" } }}
            error={Boolean(errors.id)}
            helperText={errors.id?.message}
            {...register("id", {
              required: "Prompt ID is required.",
              pattern: {
                value: /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
                message:
                  "Lowercase letters, numbers, and dashes only. Cannot start or end with a dash.",
              },
            })}
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Feature Name"
              fullWidth
              {...register("featureName")}
            />
            <TextField
              label="Category"
              fullWidth
              {...register("category")}
            />
          </Box>
          <TextField
            label="Feature Description"
            fullWidth
            {...register("featureDescription")}
          />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Feature Name"
              fullWidth
              {...register("featureName")}
            />
            <TextField label="Category" fullWidth {...register("category")} />
          </Box>
          <TextField
            label="Feature Description"
            fullWidth
            {...register("featureDescription")}
          />
        </>
      )}
      <TextField
        label="System Prompt"
        multiline
        minRows={6}
        maxRows={18}
        fullWidth
        error={Boolean(errors.systemPrompt)}
        helperText={
          errors.systemPrompt?.message ||
          "Applied to every user as part of the global prompt."
        }
        {...register("systemPrompt", {
          validate: (v) =>
            (v || "").trim().length > 0 || "System prompt cannot be empty.",
        })}
      />
      <TextField
        label="Context Provided"
        multiline
        minRows={3}
        maxRows={14}
        fullWidth
        {...register("contextProvided")}
      />
      <TextField
        label="Response Format"
        multiline
        minRows={3}
        maxRows={14}
        fullWidth
        {...register("responseFormat")}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
        }}
      >
        <Controller
          name="model"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel id="prompt-model-label">Model</InputLabel>
              <Select
                labelId="prompt-model-label"
                label="Model"
                {...field}
              >
                {models.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
        <TextField
          type="number"
          label="Max Tokens"
          fullWidth
          {...register("maxTokens", { valueAsNumber: true })}
        />
      </Box>
      <Controller
        name="temperature"
        control={control}
        render={({ field }) => (
          <Box>
            Temperature ({Number(field.value).toFixed(2)})
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={Number(field.value)}
              onChange={(_, v) => field.onChange(v)}
            />
          </Box>
        )}
      />
      {/*
      <Controller
        name="chainConfig.isPartOfChain"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(field.value)}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            }
            label="Part of a sequential chain"
          />
        )}
      />
      {isPartOfChain ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
          }}
        >
          <Controller
            name="chainConfig.chainId"
            control={control}
            render={({ field }) => (
              <TextField
                label="Chain ID"
                fullWidth
                helperText="Groups prompts into a chain, e.g. chartmind"
                {...field}
                value={field.value || watchedCategory || ""}
              />
            )}
          />
          <TextField
            type="number"
            label="Step #"
            fullWidth
            inputProps={{ min: 1 }}
            helperText="Position in the chain (1, 2, 3...)"
            {...register("chainConfig.chainPosition")}
          />
        </Box>
      ) : null}
      */}
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { minHeight: 800 } }}
    >
      <DialogTitle sx={{ pb: 0.5 }}>{dialogTitle}</DialogTitle>
      <DialogContent sx={{ pt: "8px !important" }}>
        <Box
          component="form"
          id="prompt-editor-form"
          onSubmit={handleSubmit(submitForm)}
          sx={{ display: "grid", gap: 2, mt: 0.25 }}
        >
          {localError ? <Alert severity="error">{localError}</Alert> : null}
          {historyFeedback ? (
            <Alert
              severity={historyFeedback.severity}
              onClose={() => setHistoryFeedback(null)}
            >
              {historyFeedback.message}
            </Alert>
          ) : null}

          {!createMode && (isGlobalEditor || isOrgEditor || isRegionalEditor) ? (
            <Typography variant="body2" color="text.secondary">
              <Box component="span" sx={{ fontFamily: "monospace" }}>
                {watchedId || "unknown"}
              </Box>
            </Typography>
          ) : null}

          {showAuxiliaryTabs ? (
            <>
              <Tabs
                value={activeTab}
                onChange={(_, next) => setActiveTab(next)}
                aria-label="prompt editor tabs"
              >
                <Tab label="Prompt" />
                <Tab label="Embedded Documents" />
                <Tab label="Clinical References" />
                <Tab label="History" />
                <Tab label="Try Prompt" />
              </Tabs>
              {activeTab === 0 ? (
                <Box sx={{ display: "grid", gap: 2 }}>{globalPromptTabContent}</Box>
              ) : null}
              {activeTab === 1 ? (
                <DocumentManagementPanel
                  promptId={currentPromptId}
                  chunkLimit={tryPromptChunkLimit}
                  onChunkLimitChange={setTryPromptChunkLimit}
                />
              ) : null}
              {activeTab === 2 ? <ClinicalReferencesPanel promptId={currentPromptId} /> : null}
              {activeTab === 3 ? (
                <Box sx={{ display: "grid", gap: 1 }}>
                  <Typography variant="subtitle2">History</Typography>
                  {historyLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : !history.length ? (
                    <Typography variant="body2" color="text.secondary">
                      No version history yet.
                    </Typography>
                  ) : (
                    <List dense disablePadding>
                      {history.map((entry) => {
                        const changedAt = getHistoryChangedAt(entry);
                        const when = changedAt
                          ? formatDistanceToNow(changedAt, { addSuffix: true })
                          : "unknown date";
                        const who = entry.changedByEmail || entry.changedBy || "Unknown user";
                        const scopeLabel = getHistoryScopeLabel(entry);
                        const changedFields = getHistoryChangedFields(entry);
                        const reason = (entry.reason || "").trim();
                        return (
                          <ListItem
                            key={entry.id}
                            alignItems="flex-start"
                            disablePadding
                            secondaryAction={
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRevertHistoryEntry(entry);
                                }}
                              >
                                Revert
                              </Button>
                            }
                            sx={{
                              borderBottom: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <ListItemButton
                              alignItems="flex-start"
                              onClick={() => handleOpenHistoryEntry(entry)}
                              sx={{ pr: 14, py: 1.25 }}
                            >
                              <ListItemText
                                primary={
                                  <Typography variant="body2">
                                    <Box component="span" sx={{ fontWeight: 600 }}>
                                      {who}
                                    </Box>
                                    {" · "}
                                    {scopeLabel}
                                    {" · "}
                                    {when}
                                  </Typography>
                                }
                                secondary={
                                  <Box sx={{ display: "grid", gap: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      Fields:{" "}
                                      {changedFields
                                        .map(getHistoryFieldLabel)
                                        .join(", ") || "—"}
                                    </Typography>
                                    {reason ? (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ fontStyle: "italic" }}
                                      >
                                        Reason: {reason}
                                      </Typography>
                                    ) : null}
                                  </Box>
                                }
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </Box>
              ) : null}
              {activeTab === 4 ? (
                <Box sx={{ display: "grid", gap: 2 }}>
                  <TextField
                    label="Input"
                    multiline
                    minRows={6}
                    maxRows={16}
                    fullWidth
                    placeholder="Paste the transcript, request, or other input you want to run through this prompt."
                    value={tryPromptInput}
                    onChange={(event) => setTryPromptInput(event.target.value)}
                    helperText="Runs the current editor values through the same callable prompt pipeline used by the app."
                  />
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <LoadingButton
                      variant="contained"
                      onClick={handleRunTryPrompt}
                      loading={tryPromptLoading}
                      disabled={tryPromptLoading}
                    >
                      Run
                    </LoadingButton>
                  </Box>
                  {tryPromptError ? (
                    <Alert severity="error">{tryPromptError}</Alert>
                  ) : null}
                  {tryPromptMeta ? (
                    <Typography variant="caption" color="text.secondary">
                      Model: {tryPromptMeta.model || "unknown"} | Temperature:{" "}
                      {tryPromptMeta.temperature ?? "unknown"} | Max tokens:{" "}
                      {tryPromptMeta.maxTokens ?? "unknown"}
                      {tryPromptEmbeddedDocuments
                        ? ` | Included chunks: ${
                            tryPromptEmbeddedDocuments.chunksRetrieved || 0
                          }`
                        : ""}
                    </Typography>
                  ) : null}
                  <TextField
                    label="Output"
                    multiline
                    minRows={10}
                    maxRows={24}
                    fullWidth
                    value={tryPromptOutput}
                    placeholder="Prompt output will appear here after you run it."
                    InputProps={{ readOnly: true }}
                  />
                  {tryPromptEmbeddedDocuments ? (
                    <Accordion
                      expanded={tryPromptChunksExpanded}
                      onChange={(_, expanded) => setTryPromptChunksExpanded(expanded)}
                      disableGutters
                      elevation={0}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        "&:before": { display: "none" },
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Typography variant="subtitle2">Included Chunks</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tryPromptEmbeddedDocuments.chunksRetrieved || 0}{" "}
                            {(tryPromptEmbeddedDocuments.chunksRetrieved || 0) === 1
                              ? "chunk"
                              : "chunks"}
                            {" • "}
                            {tryPromptEmbeddedDocuments.chunkLimitRequested ||
                              tryPromptChunkLimit}{" "}
                            requested
                            {" • "}
                            {(tryPromptEmbeddedDocuments.documents || []).length}{" "}
                            {(tryPromptEmbeddedDocuments.documents || []).length === 1
                              ? "document"
                              : "documents"}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0, display: "grid", gap: 1 }}>
                        {tryPromptEmbeddedDocuments.warning ? (
                          <Alert severity="warning">
                            {tryPromptEmbeddedDocuments.warning}
                          </Alert>
                        ) : null}
                        {tryPromptEmbeddedDocuments.rewrittenQuery?.searchQuery ? (
                          <Typography variant="caption" color="text.secondary">
                            Retrieval query:{" "}
                            {tryPromptEmbeddedDocuments.rewrittenQuery.searchQuery}
                          </Typography>
                        ) : null}
                        {!tryPromptEmbeddedDocuments.chunks?.length ? (
                          <Typography variant="body2" color="text.secondary">
                            No embedded document chunks were included for this response.
                          </Typography>
                        ) : (
                          <List
                            dense
                            disablePadding
                            sx={{ maxHeight: 320, overflowY: "auto" }}
                          >
                            {tryPromptEmbeddedDocuments.chunks.map((chunk, index) => (
                              <ListItem
                                key={`${chunk.documentId || "doc"}-${chunk.chunkId || index}`}
                                disablePadding
                                alignItems="flex-start"
                                sx={{
                                  py: 1,
                                  borderTop: index === 0 ? "none" : "1px solid",
                                  borderColor: "divider",
                                }}
                              >
                                <ListItemText
                                  secondaryTypographyProps={{ component: "div" }}
                                  primary={
                                    <Box
                                      sx={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {chunk.fileName || chunk.source || "Unknown document"}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Score:{" "}
                                        {typeof chunk.score === "number"
                                          ? chunk.score.toFixed(3)
                                          : "n/a"}
                                      </Typography>
                                      {chunk.sectionTitle ? (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Section: {chunk.sectionTitle}
                                        </Typography>
                                      ) : null}
                                    </Box>
                                  }
                                  secondary={
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
                                    >
                                      {chunk.text}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ) : null}
                </Box>
              ) : null}
            </>
          ) : null}

          {isRegionalEditor ? (
            <TextField
              label="Regional prompt override"
              multiline
              minRows={5}
              maxRows={18}
              fullWidth
              helperText="Saved to Firestore as scope=region on llmLocalPrompts; scopeId matches your account region field."
              {...register("regionalPrompt")}
            />
          ) : null}

          {isOrgEditor ? (
            <TextField
              label="Organization Prompt"
              multiline
              minRows={4}
              maxRows={14}
              fullWidth
              helperText="Overrides organization-level prompt behavior for your team."
              {...register("organizationPrompt")}
            />
          ) : null}
        </Box>
      </DialogContent>
      <Box sx={{ px: 3, pb: 2, pt: 1, display: "grid", gap: 1.5 }}>
        <DialogActions sx={{ px: 0, py: 0 }}>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="prompt-editor-form"
            variant="contained"
            loading={saving}
            disabled={saving}
          >
            {createMode ? "Create" : "Save"}
          </LoadingButton>
          <Tooltip title={showReasonField ? "Hide reason" : "Add reason"}>
            <span>
              <IconButton
                aria-label={showReasonField ? "Hide reason field" : "Show reason field"}
                onClick={() => setShowReasonField((current) => !current)}
                disabled={saving}
                color={showReasonField ? "primary" : "default"}
                sx={{
                  border: "1px solid",
                  borderColor: showReasonField ? "primary.main" : "divider",
                  borderRadius: 1,
                }}
              >
                <MoreVert />
              </IconButton>
            </span>
          </Tooltip>
        </DialogActions>
        <Collapse in={showReasonField} unmountOnExit>
          <TextField
            label="Reason"
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            placeholder="Why are you changing this prompt?"
            helperText="Optional note saved with this history entry so later reviews have context."
            {...register("reason")}
          />
        </Collapse>
      </Box>
      <Dialog
        open={Boolean(selectedHistoryEntry)}
        onClose={handleCloseHistoryEntry}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Version Details</DialogTitle>
        <DialogContent dividers sx={{ display: "grid", gap: 2 }}>
          {selectedHistoryEntry ? (
            <Box sx={{ display: "grid", gap: 1 }}>
              <DialogContentText>
                {(selectedHistoryEntry.changedByEmail ||
                  selectedHistoryEntry.changedBy ||
                  "Unknown user") +
                  " updated " +
                  getHistoryScopeLabel(selectedHistoryEntry) +
                  (selectedHistoryDetails?.changedAt
                    ? ` on ${selectedHistoryDetails.changedAt.toLocaleString()}.`
                    : ".")}
              </DialogContentText>
              <TextField
                label="Reason"
                value={selectedHistoryEntry.reason || ""}
                multiline
                minRows={2}
                fullWidth
                InputProps={{ readOnly: true }}
                helperText={
                  selectedHistoryEntry.reason
                    ? "Recorded when this version was saved."
                    : "No reason was recorded for this version."
                }
              />
            </Box>
          ) : null}

          {selectedHistoryDetails?.revertData.unknownFields.length ? (
            <Alert severity="warning">
              This version can restore the recorded global prompt values, but some
              fields may be incomplete because older history is unavailable:{" "}
              {selectedHistoryDetails.revertData.unknownFields
                .map(getHistoryFieldLabel)
                .join(", ")}
              .
            </Alert>
          ) : null}

          {!selectedHistoryDetails?.diffRows.length ? (
            <Typography variant="body2" color="text.secondary">
              No changed fields were recorded for this version.
            </Typography>
          ) : (
            selectedHistoryDetails.diffRows.map((row, index) => (
              <Box key={row.field} sx={{ display: "grid", gap: 1.5 }}>
                {index > 0 ? <Divider /> : null}
                <Typography variant="subtitle2">{row.label}</Typography>
                <InlineTextDiff
                  beforeText={formatHistoryValue(row.beforeValue, row.beforeKnown)}
                  afterText={formatHistoryValue(row.afterValue)}
                />
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              onClick={handleHistoryNavigatePrevious}
              disabled={selectedHistoryIndex <= 0}
            >
              Previous
            </Button>
            <Button
              onClick={handleHistoryNavigateNext}
              disabled={selectedHistoryIndex < 0 || selectedHistoryIndex >= history.length - 1}
            >
              Next
            </Button>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={handleCloseHistoryEntry}>Close</Button>
            <Button
              variant="contained"
              onClick={() => handleRevertHistoryEntry(selectedHistoryEntry)}
            >
              Revert
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default PromptEditorDialog;
