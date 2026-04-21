import React, { useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepButton,
  // Tabs,
  // Tab,
  // Link,
  // CircularProgress,
  useTheme,
} from "@mui/material";
// import FiberManualRecordRounded from "@mui/icons-material/FiberManualRecordRounded";
// import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";

const STEPS = {
  RECORD: "record",
  DIAGNOSIS: "diagnosis",
  DIAGNOSTIC_PLAN: "diagnostic_plan",
  CONFIRM_DIAGNOSIS: "confirm_diagnosis",
  TREATMENT: "treatment",
  DISCHARGE: "discharge",
  CHART: "chart",
};

// Step order for progressive unlocking
const STEP_ORDER = [
  STEPS.RECORD,
  STEPS.DIAGNOSIS,
  STEPS.DIAGNOSTIC_PLAN,
  STEPS.CONFIRM_DIAGNOSIS,
  STEPS.TREATMENT,
  STEPS.DISCHARGE,
  STEPS.CHART,
];

const ChartMindHeader = ({
  currentStep,
  setCurrentStep,
  isRecording,
  recordingTime,
  ddxLoading,
  hasDiagnoses,
  diagnosticPlanLoading,
  hasDiagnosticPlan,
  treatmentPlanLoading,
  hasTreatmentPlan,
  chartLoading,
  hasNote,
  hasTranscript,
  hasSelectedDiagnosis,
  visitedSteps,
}) => {
  const theme = useTheme();
  const scrollContainerRef = useRef(null);

  // On mobile, keep the active step centered in the scroll container
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || container.scrollWidth <= container.clientWidth) return;
    // Skip on desktop — only scroll when there's actual overflow (mobile)
    if (window.innerWidth >= theme.breakpoints.values.sm) return;
    const steps = container.querySelectorAll(".MuiStep-root");
    const activeEl = steps[getActiveStepIndex()];
    if (!activeEl) return;
    const elCenter = activeEl.offsetLeft + activeEl.offsetWidth / 2;
    container.scrollTo({
      left: elCenter - container.offsetWidth / 2,
      behavior: "smooth",
    });
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // COMMENTED OUT: Status indicators (recording/loading/ready states)
  // Determine what status to show (priority: chart > treatment > plan > ddx)
  // const showChartStatus = !isRecording && (chartLoading || hasNote);
  // const showTreatmentStatus = !isRecording && !showChartStatus && (treatmentPlanLoading || hasTreatmentPlan);
  // const showPlanStatus = !isRecording && !showChartStatus && !showTreatmentStatus && (diagnosticPlanLoading || hasDiagnosticPlan);
  // const showDdxStatus = !isRecording && !showChartStatus && !showTreatmentStatus && !showPlanStatus && (ddxLoading || hasDiagnoses);

  // const formatTime = (seconds) => {
  //   const mins = Math.floor(seconds / 60);
  //   const secs = seconds % 60;
  //   return `${mins.toString().padStart(2, "0")}:${secs
  //     .toString()
  //     .padStart(2, "0")}`;
  // };

  // Map step values to indices for Stepper
  const getActiveStepIndex = () => {
    return STEP_ORDER.indexOf(currentStep);
  };

  const handleStepClick = (step) => {
    if (!isStepDisabled(step)) {
      setCurrentStep(step);
    }
  };

  // Helper: Check if a step should be disabled
  // Only allow navigating to steps that have been visited via "Next" button
  const isStepDisabled = (step) => {
    // Recording is always available
    if (step === STEPS.RECORD) return false;

    // Diagnosis requires transcript and must be visited
    if (step === STEPS.DIAGNOSIS) {
      return !hasTranscript || !visitedSteps.has(STEPS.DIAGNOSIS);
    }

    // All other steps: must have been visited via Next button
    return !visitedSteps.has(step);
  };

  // Step labels
  const stepLabels = [
    "Recording",
    "Diagnosis",
    "Plan",
    "Confirm",
    "Treatment",
    "Discharge",
    "Chart",
  ];

  return (
    <Box
      sx={{
        ...theme.mixins.toolbar,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
        flexShrink: 0,
      }}
    >
      {/* COMMENTED OUT: Left status indicators */}
      {/* <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          minWidth: 200,
        }}
      >
        {isRecording ? (
          <>
            <FiberManualRecordRounded
              sx={{
                fontSize: 14,
                color: theme.palette.error.main,
                animation: "blink 1s infinite",
                "@keyframes blink": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.3 },
                },
              }}
            />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: theme.palette.error.main,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatTime(recordingTime)}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", ml: 0.5 }}
            >
              Recording
            </Typography>
          </>
        ) : showChartStatus ? (
          <>
            {chartLoading ? (
              <>
                <CircularProgress
                  size={14}
                  sx={{ color: theme.palette.primary.main }}
                />
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Generating chart...
                </Typography>
              </>
            ) : hasNote ? (
              <>
                <CheckCircleRounded
                  sx={{ fontSize: 16, color: theme.palette.success.main }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: theme.palette.success.main, fontWeight: 500 }}
                >
                  Chart ready
                </Typography>
              </>
            ) : null}
          </>
        ) : showTreatmentStatus ? (
          <>
            {treatmentPlanLoading ? (
              <>
                <CircularProgress
                  size={14}
                  sx={{ color: theme.palette.primary.main }}
                />
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Generating treatment plan...
                </Typography>
              </>
            ) : hasTreatmentPlan ? (
              <>
                <CheckCircleRounded
                  sx={{ fontSize: 16, color: theme.palette.primary.main }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: theme.palette.primary.main, fontWeight: 500 }}
                >
                  Treatment plan ready
                </Typography>
              </>
            ) : null}
          </>
        ) : showPlanStatus ? (
          <>
            {diagnosticPlanLoading ? (
              <>
                <CircularProgress
                  size={14}
                  sx={{ color: theme.palette.primary.main }}
                />
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Generating plan...
                </Typography>
              </>
            ) : hasDiagnosticPlan ? (
              <>
                <CheckCircleRounded
                  sx={{ fontSize: 16, color: theme.palette.primary.main }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: theme.palette.primary.main, fontWeight: 500 }}
                >
                  Plan ready
                </Typography>
              </>
            ) : null}
          </>
        ) : showDdxStatus ? (
          <>
            {ddxLoading ? (
              <>
                <CircularProgress
                  size={14}
                  sx={{ color: theme.palette.primary.main }}
                />
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Analyzing transcript...
                </Typography>
              </>
            ) : hasDiagnoses ? (
              <>
                <CheckCircleRounded
                  sx={{ fontSize: 16, color: theme.palette.primary.main }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: theme.palette.primary.main, fontWeight: 500 }}
                >
                  Diagnoses ready
                </Typography>
              </>
            ) : null}
          </>
        ) : null}
      </Box> */}

      {/* Stepper navigation — horizontally scrollable on mobile */}
      <Box
        ref={scrollContainerRef}
        sx={{
          width: "100%",
          maxWidth: 960,
          overflowX: { xs: "auto", sm: "auto" },
          overflowY: { xs: "hidden", sm: "visible" },
          // Thin scrollbar on mobile as scroll affordance
          scrollbarWidth: "thin",
          scrollbarColor: `${theme.palette.divider} transparent`,
          "&::-webkit-scrollbar": { height: 4 },
          "&::-webkit-scrollbar-thumb": {
            borderRadius: 2,
            backgroundColor: theme.palette.divider,
          },
          "&::-webkit-scrollbar-track": { backgroundColor: "transparent" },
          // On desktop: restore full toolbar height so StepButtons aren't clipped
          [theme.breakpoints.up("sm")]: {
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            alignSelf: "stretch",
            display: "flex",
            alignItems: "center",
          },
        }}
      >
        <Stepper
          activeStep={getActiveStepIndex()}
          nonLinear
          sx={{
            minWidth: { xs: 560, sm: "unset" },
            width: "100%",
            // Always bold to prevent layout shift on active change
            "& .MuiStepLabel-label": { fontWeight: 700 },
            "& .MuiStepLabel-label.Mui-active": { color: "primary.main" },
          }}
        >
          {STEP_ORDER.map((step, index) => {
            // A step is completed if the NEXT step has been visited
            const nextStep = STEP_ORDER[index + 1];
            const isCompleted = nextStep && visitedSteps.has(nextStep);
            const disabled = isStepDisabled(step);
            const isActive = index === getActiveStepIndex();

            const stepIconColor = disabled
              ? theme.palette.action.disabled
              : isActive || !isCompleted
                ? theme.palette.primary.main
                : undefined;

            return (
              <Step
                key={step}
                completed={isCompleted}
                sx={{
                  "& .MuiStepIcon-root": {
                    ...(stepIconColor &&
                      !isCompleted && { color: stepIconColor }),
                  },
                }}
              >
                <StepButton
                  onClick={() => handleStepClick(step)}
                  disabled={disabled}
                >
                  {stepLabels[index]}
                </StepButton>
              </Step>
            );
          })}
        </Stepper>
      </Box>
    </Box>
  );
};

export { STEPS };
export default ChartMindHeader;
