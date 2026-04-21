import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Paper,
  useTheme,
  Tabs,
  Tab,
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import ListRounded from "@mui/icons-material/ListRounded";
import BubbleChartRounded from "@mui/icons-material/BubbleChartRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import useDebounce from "hooks/useDebounce";
import ChartMindVisualization from "./ChartMindVisualization";
import AddDiagnosisModal from "./AddDiagnosisModal";
import SelectableCard from "./SelectableCard";

/**
 * DiagnosisStep - Shows DDX results with selectable diagnoses
 *
 * Props:
 * - transcript: The encounter transcript
 * - ddxData: Differential diagnosis data from LLM
 * - loading: Whether DDX is being generated
 * - error: Error message if generation failed
 * - hasDiagnoses: Whether there are diagnoses to show
 * - retry: Function to retry DDX generation
 * - rawResponse: Raw LLM response for debugging
 * - selectedDiagnoses: Array of selected diagnosis conditions
 * - onSelectionChange: Callback when selection changes
 * - onPrefetch: Callback to prefetch/pregenerate note (called after debounce)
 * - disabledDiagnosisIds: Set of hidden diagnosis IDs (condition names)
 * - onToggleDiagnosisDisabled: Callback to toggle diagnosis disabled state
 * - customDiagnoses: User-added diagnoses (session-owned for persistence)
 * - onAddCustomDiagnosis: Called when user adds a diagnosis from the modal
 */
const DiagnosisStep = ({
  transcript,
  ddxData,
  loading,
  error,
  hasDiagnoses,
  retry,
  rawResponse,
  selectedDiagnoses = [],
  onSelectionChange,
  onPrefetch,
  disabledDiagnosisIds = new Set(),
  onToggleDiagnosisDisabled,
  customDiagnoses = [],
  onAddCustomDiagnosis,
}) => {
  const theme = useTheme();

  // ============================================================================
  // TODO: RE-ENABLE VISUALIZATION AFTER FIXING BUGS
  // Temporarily disabled visualization tab due to bugs - needs fixing before deadline
  // Uncomment below to restore visualization functionality:
  // ============================================================================
  // const [viewMode, setViewMode] = useState(1); // 0 = visualization, 1 = list
  // const visualizationContainerRef = useRef(null);
  // const [vizDimensions, setVizDimensions] = useState({ width: 600, height: 400 });

  const isInitialMount = useRef(true);

  const [addModalOpen, setAddModalOpen] = useState(false);

  // Debounce the selected diagnosis for prefetch (800ms)
  const debouncedSelection = useDebounce(selectedDiagnoses, 800);

  // Trigger prefetch when debounced selection changes (but not on initial mount)
  useEffect(() => {
    // Skip prefetch on initial mount if there's already a selection
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (debouncedSelection.length > 0) {
      onPrefetch?.(debouncedSelection);
    }
  }, [debouncedSelection, onPrefetch]);

  // Select single diagnosis (radio button behavior)
  const handleSelect = (diagnosis) => {
    const condition = diagnosis.condition;
    const isCurrentlySelected = selectedDiagnoses.some(
      (d) => d.condition === condition,
    );

    if (isCurrentlySelected) {
      // Deselect if clicking the same one
      onSelectionChange?.([]);
    } else {
      // Replace with new selection
      onSelectionChange?.([diagnosis]);
    }
  };

  // Check if a diagnosis is selected
  const isSelected = (diagnosis) => {
    return selectedDiagnoses.some((d) => d.condition === diagnosis.condition);
  };

  // ============================================================================
  // TODO: RE-ENABLE VISUALIZATION AFTER FIXING BUGS
  // ============================================================================
  // const handleViewModeChange = (event, newValue) => {
  //   setViewMode(newValue);
  // };

  // Add diagnosis modal handlers
  const handleOpenAddModal = () => setAddModalOpen(true);
  const handleCloseAddModal = () => setAddModalOpen(false);

  const handleAddDiagnosis = (diagnosis) => {
    onAddCustomDiagnosis?.(diagnosis);
  };

  // Get all existing condition names for duplicate checking
  const existingConditions = [
    ...(ddxData?.primary_diagnoses || []),
    ...(ddxData?.alternative_diagnoses || []),
    ...customDiagnoses,
  ].map((dx) => dx.condition);

  // ============================================================================
  // TODO: RE-ENABLE VISUALIZATION AFTER FIXING BUGS
  // ============================================================================
  // useEffect(() => {
  //   if (viewMode === 0 && visualizationContainerRef.current) {
  //     const observer = new ResizeObserver((entries) => {
  //       if (entries[0]) {
  //         const { width } = entries[0].contentRect;
  //         setVizDimensions({ width, height: 400 });
  //       }
  //     });
  //     observer.observe(visualizationContainerRef.current);
  //     return () => observer.disconnect();
  //   }
  // }, [viewMode]);

  // ============================================================================
  // TODO: RE-ENABLE VISUALIZATION AFTER FIXING BUGS
  // ============================================================================
  // const allDiagnosesForViz = useMemo(() => [
  //   ...(ddxData?.primary_diagnoses || []),
  //   ...(ddxData?.alternative_diagnoses || []),
  //   ...customDiagnoses,
  // ], [ddxData?.primary_diagnoses, ddxData?.alternative_diagnoses, customDiagnoses]);

  // No transcript yet
  if (!transcript) {
    return (
      <Box sx={{ textAlign: "center" }}>
        <Typography
          variant="h4"
          sx={{
            mb: { xs: 1.5, sm: 2 },
            fontWeight: 600,
          }}
        >
          Diagnosis
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            lineHeight: 1.6,
          }}
        >
          Start recording an encounter first to generate diagnosis suggestions.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            mb: { xs: 1.5, sm: 2 },
            fontWeight: 600,
          }}
        >
          Differential Diagnosis
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            lineHeight: 1.6,
          }}
        >
          Click to select your final diagnosis. Hide diagnoses that don't fit.
        </Typography>
      </Box>

      {/* Error state */}
      {error && (
        <Alert
          severity="error"
          sx={{ width: "100%", mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => retry(transcript)}
              startIcon={<RefreshRounded />}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            py: 4,
          }}
        >
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Analyzing transcript...
          </Typography>
        </Box>
      )}

      {/* DDX Results */}
      {!loading && hasDiagnoses && (
        <Box sx={{ width: "100%" }}>
          {/* ============================================================================ */}
          {/* TODO: RE-ENABLE VISUALIZATION AFTER FIXING BUGS */}
          {/* Temporarily disabled visualization tab switcher due to bugs */}
          {/* ============================================================================ */}
          {/* <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
            <Tabs
              value={viewMode}
              onChange={handleViewModeChange}
              aria-label="view mode"
              sx={{
                minHeight: 0,
                "& .MuiTab-root": {
                  minHeight: 0,
                  textTransform: "none",
                },
              }}
            >
              <Tab
                icon={<BubbleChartRounded sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Visualization"
              />
              <Tab
                icon={<ListRounded sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="List"
              />
            </Tabs>
          </Box> */}

          {/* ============================================================================ */}
          {/* TODO: RE-ENABLE VISUALIZATION AFTER FIXING BUGS */}
          {/* ============================================================================ */}
          {/* {viewMode === 0 && (
            <Box ref={visualizationContainerRef} sx={{ mb: 3 }}>
              <ChartMindVisualization
                diagnoses={allDiagnosesForViz}
                selectedIds={selectedDiagnoses.map((d) => d.condition)}
                onDiagnosisClick={handleSelect}
                onAddDiagnosis={handleOpenAddModal}
                width={vizDimensions.width}
                height={vizDimensions.height}
              />
            </Box>
          )} */}

          {/* Add Diagnosis - top right like PlanStep */}
          <Box
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            mb={3}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddRounded />}
              onClick={handleOpenAddModal}
            >
              Add Diagnosis
            </Button>
          </Box>

          {/* Primary Diagnoses */}
          {ddxData.primary_diagnoses?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Primary Diagnoses
              </Typography>
              {ddxData.primary_diagnoses.map((dx, index) => (
                <DiagnosisCard
                  key={index}
                  diagnosis={dx}
                  selected={isSelected(dx)}
                  onSelect={() => handleSelect(dx)}
                  disabled={disabledDiagnosisIds.has(dx.condition)}
                  onToggleDisabled={
                    onToggleDiagnosisDisabled
                      ? () => {
                          if (!disabledDiagnosisIds.has(dx.condition) && isSelected(dx)) {
                            onSelectionChange?.([]);
                          }
                          onToggleDiagnosisDisabled(dx.condition);
                        }
                      : undefined
                  }
                />
              ))}
            </Box>
          )}

          {/* Alternative Diagnoses */}
          {ddxData.alternative_diagnoses?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Alternative Diagnoses
              </Typography>
              {ddxData.alternative_diagnoses.map((dx, index) => (
                <DiagnosisCard
                  key={index}
                  diagnosis={dx}
                  selected={isSelected(dx)}
                  onSelect={() => handleSelect(dx)}
                  disabled={disabledDiagnosisIds.has(dx.condition)}
                  onToggleDisabled={
                    onToggleDiagnosisDisabled
                      ? () => {
                          if (!disabledDiagnosisIds.has(dx.condition) && isSelected(dx)) {
                            onSelectionChange?.([]);
                          }
                          onToggleDiagnosisDisabled(dx.condition);
                        }
                      : undefined
                  }
                />
              ))}
            </Box>
          )}

          {/* Custom Diagnoses */}
          {customDiagnoses.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Your Diagnoses
              </Typography>
              {customDiagnoses.map((dx, index) => (
                <DiagnosisCard
                  key={`custom-${index}`}
                  diagnosis={dx}
                  selected={isSelected(dx)}
                  onSelect={() => handleSelect(dx)}
                  disabled={disabledDiagnosisIds.has(dx.condition)}
                  onToggleDisabled={
                    onToggleDiagnosisDisabled
                      ? () => {
                          if (!disabledDiagnosisIds.has(dx.condition) && isSelected(dx)) {
                            onSelectionChange?.([]);
                          }
                          onToggleDiagnosisDisabled(dx.condition);
                        }
                      : undefined
                  }
                />
              ))}
            </Box>
          )}

          {/* Red Flags */}
          {ddxData.red_flags?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 1.5, color: "error.main" }}
              >
                Red Flags
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {ddxData.red_flags.map((flag, index) => (
                  <Chip
                    key={index}
                    label={flag}
                    color="error"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Clarifying Questions */}
          {ddxData.clarifications?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Clarifying Questions
              </Typography>
              <Box
                component="ul"
                sx={{ m: 0, pl: 2.5, color: "text.secondary" }}
              >
                {ddxData.clarifications.map((question, index) => (
                  <li key={index}>
                    <Typography variant="body2">{question}</Typography>
                  </li>
                ))}
              </Box>
            </Box>
          )}

          {/* Next Steps */}
          {ddxData.next_steps?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Recommended Next Steps
              </Typography>
              <Box
                component="ul"
                sx={{ m: 0, pl: 2.5, color: "text.secondary" }}
              >
                {ddxData.next_steps.map((step, index) => (
                  <li key={index}>
                    <Typography variant="body2">{step}</Typography>
                  </li>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* No results after analysis */}
      {!loading && !hasDiagnoses && !error && (
        <Box
          sx={{
            width: "100%",
            p: 4,
            backgroundColor: "#f9fafb",
            borderRadius: 2,
            border: "1px dashed #d1d5db",
            textAlign: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No diagnoses generated yet. The transcript may need more clinical
            information.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => retry(transcript)}
            startIcon={<RefreshRounded />}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        </Box>
      )}

      {/* Raw response fallback - shows when parsing fails or for debugging */}
      {rawResponse && !hasDiagnoses && (
        <Box sx={{ width: "100%", mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Raw LLM Response:
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              backgroundColor: "#f5f5f5",
              maxHeight: 400,
              overflow: "auto",
            }}
          >
            <Typography
              variant="body2"
              component="pre"
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "monospace",
                fontSize: "0.8rem",
                m: 0,
              }}
            >
              {rawResponse}
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Add Diagnosis Modal */}
      <AddDiagnosisModal
        open={addModalOpen}
        onClose={handleCloseAddModal}
        onAdd={handleAddDiagnosis}
        existingConditions={existingConditions}
      />
    </Box>
  );
};

/**
 * Individual diagnosis card - single selection (radio-like behavior)
 */
const DiagnosisCard = ({
  diagnosis,
  selected,
  onSelect,
  disabled,
  onToggleDisabled,
}) => {
  const getLikelihoodColor = (likelihood) => {
    if (typeof likelihood === "string") {
      const lower = likelihood.toLowerCase();
      if (lower.includes("more likely") || lower.includes("likely")) {
        if (lower.includes("unlikely") || lower.includes("less")) {
          return "default";
        }
        return "success";
      }
      if (lower.includes("unlikely") || lower.includes("less likely")) {
        return "default";
      }
    }
    return "default";
  };

  const chips = [
    {
      label: diagnosis.likelihood,
      color: getLikelihoodColor(diagnosis.likelihood),
      variant: "outlined",
    },
  ];

  if (diagnosis.urgent) {
    chips.push({
      label: "Urgent",
      color: "warning",
      variant: "filled",
    });
  }

  if (selected) {
    chips.push({
      label: "Final Diagnosis",
      color: "primary",
      variant: "filled",
    });
  }

  return (
    <SelectableCard
      title={diagnosis.condition}
      rationale={diagnosis.rationale}
      selectionVariant="radio"
      selected={selected}
      onClick={onSelect}
      chips={chips}
      disabled={disabled}
      onToggleDisabled={onToggleDisabled}
    />
  );
};

export default DiagnosisStep;
