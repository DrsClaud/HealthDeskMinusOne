import React from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { STEPS } from "./ChartMindHeader";

/**
 * ChartMindFooter - Minimal sticky footer with navigation buttons
 *
 * Shows different actions based on current step with back/forward navigation.
 * When hasUnsavedChanges is true, center shows "Unsaved changes" instead of the last-saved timestamp.
 * The final (chart) step has Back only — no primary forward action in the footer.
 */
const ChartMindFooter = ({
  currentStep,
  transcript,
  selectedDiagnosesCount,
  selectedConfirmedDiagnosesCount,
  onContinueToDiagnosis,
  onContinueToPlan,
  onContinueToConfirm,
  onContinueToTreatment,
  onContinueToDischarge,
  onGenerateChart,
  onBack,
  saving,
  lastSavedAt,
  hasUnsavedChanges = false,
}) => {
  // Format last saved time
  const formatSavedTime = (date) => {
    if (!date) return null;
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  // Determine button state based on current step
  const getButtonConfig = () => {
    switch (currentStep) {
      case STEPS.RECORD:
        return {
          showBack: false,
          showNext: true,
          nextLabel: "Choose Diagnoses",
          nextDisabled: !transcript || transcript.length < 50,
          onNext: onContinueToDiagnosis,
        };

      case STEPS.DIAGNOSIS:
        return {
          showBack: true,
          showNext: true,
          nextLabel: "Review Plan",
          nextDisabled: selectedDiagnosesCount === 0,
          onNext: onContinueToPlan,
        };

      case STEPS.DIAGNOSTIC_PLAN:
        return {
          showBack: true,
          showNext: true,
          nextLabel: "Confirm Diagnosis",
          nextDisabled: selectedDiagnosesCount === 0,
          onNext: onContinueToConfirm,
        };

      case STEPS.CONFIRM_DIAGNOSIS:
        return {
          showBack: true,
          showNext: true,
          nextLabel: "Review Treatments",
          nextDisabled: selectedConfirmedDiagnosesCount === 0,
          onNext: onContinueToTreatment,
        };

      case STEPS.TREATMENT:
        return {
          showBack: true,
          showNext: true,
          nextLabel: "Review Discharge",
          nextDisabled: selectedConfirmedDiagnosesCount === 0,
          onNext: onContinueToDischarge,
        };

      case STEPS.DISCHARGE:
        return {
          showBack: true,
          showNext: true,
          nextLabel: "Generate Note",
          nextDisabled: selectedConfirmedDiagnosesCount === 0,
          onNext: onGenerateChart,
        };

      case STEPS.CHART:
        return {
          showBack: true,
          showNext: false,
        };

      default:
        return { showBack: false, showNext: false };
    }
  };

  const config = getButtonConfig();

  const saveStatus = saving ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <CircularProgress size={14} thickness={5} />
      <Typography variant="caption" color="text.secondary">
        Saving...
      </Typography>
    </Box>
  ) : hasUnsavedChanges ? (
    <Typography variant="caption" color="text.secondary">
      Unsaved changes
    </Typography>
  ) : lastSavedAt ? (
    <Typography variant="caption" color="text.secondary">
      Saved at {formatSavedTime(lastSavedAt)}
    </Typography>
  ) : null;

  return (
    <Box
      sx={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "background.paper",
        px: 2,
        py: 1,
        zIndex: 10,
      }}
    >
      {/* Save status row (mobile only) */}
      {saveStatus && (
        <Box
          sx={{
            display: { xs: 'flex', sm: 'none' },
            justifyContent: 'center',
            alignItems: 'center',
            gap: 0.5,
            mb: 0.5,
          }}
        >
          {saveStatus}
        </Box>
      )}

      {/* Nav row: back on left, next on right */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {/* Left: Back button */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
          {config.showBack && (
            <Button size="small" onClick={onBack}>
              Back
            </Button>
          )}
        </Box>

        {/* Center: Save status (desktop only) */}
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', sm: 'flex' },
            justifyContent: 'center',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {saveStatus}
        </Box>

        {/* Right: Next/Action button */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          {config.showNext && (
            <Button
              size="small"
              variant="contained"
              onClick={config.onNext}
              disabled={config.nextDisabled}
            >
              {config.nextLabel}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ChartMindFooter;
