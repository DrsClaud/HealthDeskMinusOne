import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  useTheme,
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import AddDiagnosisModal from "./AddDiagnosisModal";
import SelectableCard from "./SelectableCard";

/**
 * ConfirmDiagnosisStep - Confirm final diagnoses after running tests
 *
 * Similar to DiagnosisStep but allows MULTIPLE selections (checkboxes vs radio)
 * Uses test results from PlanStep to update/refine the original differential diagnosis
 * 
 * IMPORTANT: This step is SEEDED by the original DDX from DiagnosisStep.
 * The LLM updates/refines those diagnoses based on test results, and we merge
 * the results to ensure no diagnoses are dropped.
 * 
 * Props:
 * - transcript: The encounter transcript
 * - testResults: Map of test results from diagnostic plan
 * - originalDdxData: Original DDX data from DiagnosisStep (the seed)
 * - confirmedData: Confirmed diagnosis data from LLM (merged with original)
 * - loading: Whether confirmation is being generated
 * - error: Error message if generation failed
 * - hasConfirmedDiagnoses: Whether there are confirmed diagnoses to show
 * - retry: Function to retry confirmation generation
 * - selectedConfirmedDiagnoses: Array of selected confirmed diagnosis conditions
 * - onSelectionChange: Callback when selection changes (allows multiple)
 */
const ConfirmDiagnosisStep = ({
  transcript,
  testResults,
  originalDdxData,
  confirmedData,
  loading,
  error,
  hasConfirmedDiagnoses,
  retry,
  selectedConfirmedDiagnoses = [],
  onSelectionChange,
}) => {
  const theme = useTheme();

  // Debug: Log confirmedData changes
  useEffect(() => {
    console.log("[ConfirmDiagnosisStep] 🔄 confirmedData changed:", {
      hasData: !!confirmedData,
      diagnosesCount: confirmedData?.diagnoses?.length || 0,
      diagnoses: confirmedData?.diagnoses?.map(d => d.condition) || [],
    });
  }, [confirmedData]);

  // Custom diagnoses state
  const [customDiagnoses, setCustomDiagnoses] = useState([]);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Toggle diagnosis selection (checkbox behavior - multiple allowed)
  const handleToggle = (diagnosis) => {
    const condition = diagnosis.condition;
    const isCurrentlySelected = selectedConfirmedDiagnoses.some(
      (d) => d.condition === condition
    );

    if (isCurrentlySelected) {
      // Remove from selection
      onSelectionChange?.(
        selectedConfirmedDiagnoses.filter((d) => d.condition !== condition)
      );
    } else {
      // Add to selection
      onSelectionChange?.([...selectedConfirmedDiagnoses, diagnosis]);
    }
  };

  // Check if a diagnosis is selected
  const isSelected = (diagnosis) => {
    return selectedConfirmedDiagnoses.some((d) => d.condition === diagnosis.condition);
  };

  // Add diagnosis modal handlers
  const handleOpenAddModal = () => setAddModalOpen(true);
  const handleCloseAddModal = () => setAddModalOpen(false);

  const handleAddDiagnosis = (diagnosis) => {
    setCustomDiagnoses((prev) => [...prev, diagnosis]);
  };

  // Get all existing condition names for duplicate checking
  const existingConditions = [
    ...(confirmedData?.confirmed_diagnoses || []),
    ...(confirmedData?.alternative_diagnoses || []),
    ...customDiagnoses,
  ].map((dx) => dx.condition);

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
          Confirm Diagnosis
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            lineHeight: 1.6,
          }}
        >
          Complete the diagnostic plan first to confirm your final diagnoses.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            mb: { xs: 1.5, sm: 2 },
            fontWeight: 600,
          }}
        >
          Confirm Final Diagnoses
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            lineHeight: 1.6,
          }}
        >
          Based on your test results, select one or more final diagnoses. You can select multiple diagnoses.
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
              onClick={() => retry(transcript, testResults, originalDdxData)}
              startIcon={<RefreshRounded />}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Non-blocking loader - show original diagnoses while loading */}
      {loading && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
            p: 3,
            mb: 3,
            backgroundColor: "primary.50",
            borderRadius: 1,
          }}
        >
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Updating...
          </Typography>
        </Box>
      )}

      {/* Show original diagnoses immediately, then show confirmed results when ready */}
      {(hasConfirmedDiagnoses || (loading && originalDdxData)) && (
        <Box sx={{ width: "100%" }}>
          {/* Add Diagnosis - top right */}
          <Box display="flex" justifyContent="flex-end" alignItems="center" mb={3}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddRounded />}
              onClick={handleOpenAddModal}
            >
              Add Diagnosis
            </Button>
          </Box>

          {/* Group diagnoses by likelihood */}
          {(() => {
            // While loading, show original diagnoses
            // Once loaded, show confirmed (merged) diagnoses
            let allDiagnoses = [];
            
            console.log("[ConfirmDiagnosisStep] 🔍 Render state:", {
              hasConfirmedData: !!confirmedData,
              confirmedDataDiagnosesLength: confirmedData?.diagnoses?.length || 0,
              loading,
              hasOriginalDdxData: !!originalDdxData,
            });
            
            if (confirmedData?.diagnoses && confirmedData.diagnoses.length > 0) {
              // AI has returned - use merged data
              allDiagnoses = confirmedData.diagnoses;
              console.log("[ConfirmDiagnosisStep] 📊 Using confirmedData.diagnoses:", {
                count: allDiagnoses.length,
                diagnoses: allDiagnoses.map(d => d.condition),
              });
            } else if (originalDdxData) {
              // Fallback to original diagnoses (handles: loading, no confirmed data, or empty confirmed data)
              allDiagnoses = originalDdxData.diagnoses || [
                ...(originalDdxData.primary_diagnoses || []),
                ...(originalDdxData.alternative_diagnoses || []),
              ];
              console.log("[ConfirmDiagnosisStep] 📋 Using original DDX (loading or empty confirmed):", {
                count: allDiagnoses.length,
                loading,
                hasEmptyConfirmedData: confirmedData?.diagnoses?.length === 0,
                diagnoses: allDiagnoses.map(d => d.condition),
              });
            }
            
            console.log("[ConfirmDiagnosisStep] 🎯 Final allDiagnoses:", {
              count: allDiagnoses.length,
            });
            
            // Group: "More Likely" -> Primary, "Likely" + "Less Likely" -> Alternative
            const primaryDiagnoses = allDiagnoses.filter(dx => dx.likelihood === "More Likely");
            const alternativeDiagnoses = allDiagnoses.filter(dx => 
              dx.likelihood === "Likely" || dx.likelihood === "Less Likely"
            );

            return (
              <>
                {/* Primary Diagnoses */}
                {primaryDiagnoses.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                      Primary Diagnoses
                    </Typography>
                    {primaryDiagnoses.map((dx, index) => (
                      <ConfirmedDiagnosisCard
                        key={`primary-${index}`}
                        diagnosis={dx}
                        selected={isSelected(dx)}
                        onToggle={() => handleToggle(dx)}
                        preservedFromOriginal={dx._preservedFromOriginal}
                      />
                    ))}
                  </Box>
                )}

                {/* Alternative Diagnoses */}
                {alternativeDiagnoses.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                      Alternative Diagnoses
                    </Typography>
                    {alternativeDiagnoses.map((dx, index) => (
                      <ConfirmedDiagnosisCard
                        key={`alternative-${index}`}
                        diagnosis={dx}
                        selected={isSelected(dx)}
                        onToggle={() => handleToggle(dx)}
                        preservedFromOriginal={dx._preservedFromOriginal}
                      />
                    ))}
                  </Box>
                )}
              </>
            );
          })()}

          {/* Custom Diagnoses */}
          {customDiagnoses.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Your Diagnoses
              </Typography>
              {customDiagnoses.map((dx, index) => (
                <ConfirmedDiagnosisCard
                  key={`custom-${index}`}
                  diagnosis={dx}
                  selected={isSelected(dx)}
                  onToggle={() => handleToggle(dx)}
                />
              ))}
            </Box>
          )}

          {/* Red Flags */}
          {confirmedData?.red_flags?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 1.5, color: "error.main" }}
              >
                Red Flags
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {confirmedData.red_flags.map((flag, index) => (
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
          {confirmedData?.clarifications?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Clarifying Questions
              </Typography>
              <Box
                component="ul"
                sx={{ m: 0, pl: 2.5, color: "text.secondary" }}
              >
                {confirmedData.clarifications.map((question, index) => (
                  <li key={index}>
                    <Typography variant="body2">{question}</Typography>
                  </li>
                ))}
              </Box>
            </Box>
          )}

          {/* Next Steps */}
          {confirmedData?.next_steps?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Recommended Next Steps
              </Typography>
              <Box
                component="ul"
                sx={{ m: 0, pl: 2.5, color: "text.secondary" }}
              >
                {confirmedData.next_steps.map((step, index) => (
                  <li key={index}>
                    <Typography variant="body2">{step}</Typography>
                  </li>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* No results after analysis (and not currently loading) */}
      {!loading && !hasConfirmedDiagnoses && !error && !originalDdxData && (
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
            No confirmed diagnoses generated yet. Please ensure you have completed the diagnostic plan.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => retry(transcript, testResults, originalDdxData)}
            startIcon={<RefreshRounded />}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
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
 * Individual confirmed diagnosis card - multiple selection (checkbox behavior)
 */
const ConfirmedDiagnosisCard = ({ diagnosis, selected, onToggle, preservedFromOriginal }) => {
  const getLikelihoodColor = (likelihood) => {
    if (typeof likelihood === "string") {
      const lower = likelihood.toLowerCase();
      if (lower.includes("confirmed") || lower.includes("definite")) {
        return "success";
      }
      if (lower.includes("likely") || lower.includes("probable")) {
        return "success";
      }
      if (lower.includes("possible")) {
        return "default";
      }
    }
    return "default";
  };

  const chips = [
    {
      label: diagnosis.likelihood || "Confirmed",
      color: getLikelihoodColor(diagnosis.likelihood),
      variant: 'outlined',
    },
  ];

  if (diagnosis.urgent) {
    chips.push({
      label: 'Urgent',
      color: 'warning',
      variant: 'filled',
    });
  }

  // Show test impact if available (but skip "unchanged" for preserved diagnoses)
  if (diagnosis.test_impact && !preservedFromOriginal) {
    const impactLabels = {
      'increased': 'Likelihood Increased',
      'decreased': 'Likelihood Decreased',
      'new': 'New from Tests',
    };
    const impactColors = {
      'increased': 'success',
      'decreased': 'warning',
      'new': 'primary',
    };
    
    if (impactLabels[diagnosis.test_impact]) {
      chips.push({
        label: impactLabels[diagnosis.test_impact],
        color: impactColors[diagnosis.test_impact] || 'default',
        variant: 'outlined',
      });
    }
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
      selectionVariant="checkbox"
      selected={selected}
      onClick={onToggle}
      chips={chips}
    />
  );
};

export default ConfirmDiagnosisStep;
