import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, CircularProgress, Alert } from "@mui/material";
import { useAuth } from "hooks/useAuth";
import useChartMindSession from "hooks/useChartMindSession";
import { STEPS } from "components/dashboard/chartmind/ChartMindHeader";
import ChartMindHeader from "components/dashboard/chartmind/ChartMindHeader";
import ChartMindFooter from "components/dashboard/chartmind/ChartMindFooter";
import RecordingStep from "components/dashboard/chartmind/RecordingStep";
import DiagnosisStep from "components/dashboard/chartmind/DiagnosisStep";
import PlanStep from "components/dashboard/chartmind/PlanStep";
import ConfirmDiagnosisStep from "components/dashboard/chartmind/ConfirmDiagnosisStep";
import TreatmentPlanStep from "components/dashboard/chartmind/TreatmentPlanStep";
import DischargeStep from "components/dashboard/chartmind/DischargeStep";
import ChartStep from "components/dashboard/chartmind/ChartStep";
import {
  createSavedTranscript,
  subscribeSavedTranscripts,
  updateSavedTranscript,
} from "services/chartMindSavedTranscriptsService";

const ChartMindPage = () => {
  const { isGlobalAdmin, user } = useAuth();
  // Get sessionId from URL params (if loading existing session)
  const { sessionId } = useParams();

  // Track previous sessionId from URL to detect transitions
  const prevUrlSessionIdRef = useRef(sessionId);

  // Use the master session hook - all state and handlers are now here
  const session = useChartMindSession(sessionId);
  const [testEncounters, setTestEncounters] = useState([]);
  const [testEncountersLoading, setTestEncountersLoading] = useState(false);
  const [testEncountersError, setTestEncountersError] = useState("");

  useEffect(() => {
    if (!isGlobalAdmin || !user?.uid) {
      setTestEncounters([]);
      setTestEncountersLoading(false);
      setTestEncountersError("");
      return undefined;
    }

    setTestEncountersLoading(true);
    setTestEncountersError("");

    const unsubscribe = subscribeSavedTranscripts(
      user.uid,
      (items) => {
        setTestEncounters(items);
        setTestEncountersLoading(false);
      },
      (error) => {
        setTestEncountersLoading(false);
        setTestEncountersError(
          error.message || "Failed to load test encounters.",
        );
      },
    );

    return () => unsubscribe?.();
  }, [isGlobalAdmin, user?.uid]);

  const handleSelectTestEncounter = useCallback(
    (encounter) => {
      if (!encounter?.body) {
        return;
      }

      session.recording.updateTranscript(encounter.body);
    },
    [session.recording],
  );

  const handleSaveTestEncounter = useCallback(
    async ({ id, title, body }) => {
      if (!user?.uid) {
        throw new Error("User not authenticated");
      }

      if (id) {
        await updateSavedTranscript(user.uid, id, { title, body });
        return;
      }

      await createSavedTranscript(user.uid, { title, body });
    },
    [user?.uid],
  );

  // Navigate to permanent URL when session is saved for the first time
  useEffect(() => {
    const hasSessionId = session.session.sessionId;
    const isOnBaseRoute = !sessionId; // We're on /dashboard/chartmind (no ID in URL)

    // If we have a session ID but we're on the base route, update URL silently
    if (hasSessionId && isOnBaseRoute) {
      console.log(
        "[ChartMindPage] First save detected, updating URL to permanent slug:",
        hasSessionId,
      );
      // Use window.history.replaceState to avoid React Router re-render/interruption
      const newUrl = `/dashboard/chartmind/${hasSessionId}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, [session.session.sessionId, sessionId]);

  // Clear session when navigating FROM a loaded session TO base route
  // (e.g., clicking "New ChartMind Encounter" in drawer after viewing a session)
  useEffect(() => {
    const prevUrlSessionId = prevUrlSessionIdRef.current;

    // Only clear if we're transitioning FROM having a sessionId in URL TO not having one
    // This means user clicked "New Encounter" after viewing an existing session
    // Don't clear if we're just creating a new session naturally (both null -> both null)
    if (prevUrlSessionId && !sessionId && session.session.sessionId) {
      console.log(
        "[ChartMindPage] Transitioning from session to new encounter, clearing state",
      );
      session.session.clearSession();
    }

    // Update ref for next render
    prevUrlSessionIdRef.current = sessionId;
  }, [sessionId, session.session.sessionId, session.session.clearSession]);

  // Show loading state while session is being loaded
  if (session.session.loading) {
    return (
      <Box
        sx={{
          height: { xs: "calc(100dvh - 56px)", sm: "100dvh" },
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={48} />
          <Box sx={{ mt: 2, color: "text.secondary" }}>Loading session...</Box>
        </Box>
      </Box>
    );
  }

  // Show error state if session failed to load
  if (sessionId && session.session.error) {
    return (
      <Box
        sx={{
          height: { xs: "calc(100dvh - 56px)", sm: "100dvh" },
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          px: 3,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          {session.session.error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: { xs: "calc(100dvh - 56px)", sm: "100dvh" },
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <ChartMindHeader
        currentStep={session.navigation.currentStep}
        setCurrentStep={session.navigation.setCurrentStep}
        isRecording={session.recording.isRecording}
        recordingTime={session.recording.recordingTime}
        ddxLoading={session.diagnosis.loading}
        hasDiagnoses={session.diagnosis.hasDiagnoses}
        diagnosticPlanLoading={session.diagnosticPlan.loading}
        hasDiagnosticPlan={session.diagnosticPlan.hasTests}
        treatmentPlanLoading={session.treatment.loading}
        hasTreatmentPlan={session.treatment.hasTreatments}
        chartLoading={session.chart.loading}
        hasNote={session.chart.hasNote}
        hasTranscript={
          session.recording.transcript &&
          session.recording.transcript.length >= 50
        }
        hasSelectedDiagnosis={session.diagnosis.selectedDiagnoses.length > 0}
        visitedSteps={session.navigation.visitedSteps}
      />

      {/* Main Content — extra top padding on xs so body isn’t tight under AppBar + stepper */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent:
            session.navigation.currentStep === STEPS.RECORD
              ? { xs: "flex-start", sm: "center" }
              : "flex-start",
          px: { xs: 2, sm: 3 },
          pt: {
            xs: "calc(20px + env(safe-area-inset-top, 0px))",
            sm: 4,
          },
          pb: 4,
          overflowY: "auto",
        }}
      >
        <Box
          sx={{
            maxWidth: "700px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          {/* Step Content */}
          {session.navigation.currentStep === STEPS.RECORD && (
            <RecordingStep
              isSupported={session.recording.isSupported}
              isRecording={session.recording.isRecording}
              isGeneratingChart={session.chart.loading}
              transcript={session.recording.transcript}
              error={session.recording.error}
              onMicClick={session.recording.onMicClick}
              onClearError={session.recording.clearError}
              onTranscriptChange={session.recording.updateTranscript}
              language={session.recording.language}
              onLanguageChange={session.recording.setLanguage}
              showTestEncounters={isGlobalAdmin}
              testEncounters={testEncounters}
              testEncountersLoading={testEncountersLoading}
              testEncountersError={testEncountersError}
              onSelectTestEncounter={handleSelectTestEncounter}
              onSaveTestEncounter={handleSaveTestEncounter}
            />
          )}

          {session.navigation.currentStep === STEPS.DIAGNOSIS && (
            <DiagnosisStep
              transcript={session.recording.transcript}
              ddxData={session.diagnosis.ddxData}
              loading={session.diagnosis.loading}
              error={session.diagnosis.error}
              hasDiagnoses={session.diagnosis.hasDiagnoses}
              retry={session.diagnosis.retry}
              rawResponse={session.diagnosis.rawResponse}
              selectedDiagnoses={session.diagnosis.selectedDiagnoses}
              onSelectionChange={session.diagnosis.onSelectionChange}
              onPrefetch={session.diagnosis.onPrefetch}
              disabledDiagnosisIds={session.diagnosis.disabledDiagnosisIds}
              onToggleDiagnosisDisabled={
                session.diagnosis.onToggleDiagnosisDisabled
              }
              customDiagnoses={session.diagnosis.customDiagnoses}
              onAddCustomDiagnosis={session.diagnosis.onAddCustomDiagnosis}
            />
          )}

          {session.navigation.currentStep === STEPS.DIAGNOSTIC_PLAN && (
            <PlanStep
              selectedDiagnoses={session.diagnosis.selectedDiagnoses}
              planData={session.diagnosticPlan.planData}
              loading={session.diagnosticPlan.loading}
              error={session.diagnosticPlan.error}
              hasTests={session.diagnosticPlan.hasTests}
              retry={() =>
                session.diagnosticPlan.retry(
                  session.recording.transcript,
                  session.diagnosis.selectedDiagnoses,
                )
              }
              disabledTestIds={session.diagnosticPlan.disabledTestIds}
              onToggleTestDisabled={session.diagnosticPlan.onToggleTestDisabled}
              onAddTest={session.diagnosticPlan.addTest}
              testResults={session.diagnosticPlan.testResults}
              onUpdateTestResult={session.diagnosticPlan.onUpdateTestResult}
            />
          )}

          {session.navigation.currentStep === STEPS.CONFIRM_DIAGNOSIS && (
            <ConfirmDiagnosisStep
              transcript={session.recording.transcript}
              testResults={session.diagnosticPlan.testResults}
              originalDdxData={session.confirmDiagnosis.originalDdxData}
              confirmedData={session.confirmDiagnosis.confirmedData}
              loading={session.confirmDiagnosis.loading}
              error={session.confirmDiagnosis.error}
              hasConfirmedDiagnoses={
                session.confirmDiagnosis.hasConfirmedDiagnoses
              }
              retry={session.confirmDiagnosis.retry}
              selectedConfirmedDiagnoses={
                session.confirmDiagnosis.selectedConfirmedDiagnoses
              }
              onSelectionChange={session.confirmDiagnosis.onSelectionChange}
            />
          )}

          {session.navigation.currentStep === STEPS.TREATMENT && (
            <TreatmentPlanStep
              selectedDiagnoses={session.diagnosis.selectedDiagnoses}
              planData={session.treatment.planData}
              loading={session.treatment.loading}
              error={session.treatment.error}
              hasTreatments={session.treatment.hasTreatments}
              retry={() =>
                session.treatment.retry(
                  session.recording.transcript,
                  session.diagnosis.selectedDiagnoses,
                  session.diagnosticPlan.planData,
                )
              }
              disabledTreatmentIds={session.treatment.disabledTreatmentIds}
              onToggleTreatmentDisabled={
                session.treatment.onToggleTreatmentDisabled
              }
              selectedTreatments={session.treatment.selectedTreatments}
              onToggleTreatmentSelected={
                session.treatment.onToggleTreatmentSelected
              }
            />
          )}

          {session.navigation.currentStep === STEPS.DISCHARGE && (
            <DischargeStep
              transcript={session.recording.transcript}
              selectedDiagnoses={session.diagnosis.selectedDiagnoses}
              selectedTreatments={
                session.treatment.planData?.treatments?.filter(
                  (t) =>
                    session.treatment.selectedTreatments.has(t.id) &&
                    !session.treatment.disabledTreatmentIds.has(t.id),
                ) || []
              }
              autoGenerate={true}
              // Pass down discharge state
              instructions={session.discharge.instructions}
              includedInstructionIds={session.discharge.includedInstructionIds}
              loading={session.discharge.loading}
              error={session.discharge.error}
              isGenerating={session.discharge.isGenerating}
              hasBeenGenerated={session.discharge.hasBeenGenerated}
              generateDischargeInstructions={
                session.discharge.generateDischargeInstructions
              }
              regenerateDischargeInstructions={
                session.discharge.regenerateDischargeInstructions
              }
              toggleInstructionIncluded={
                session.discharge.toggleInstructionIncluded
              }
              updateInstructionProse={session.discharge.updateInstructionProse}
            />
          )}

          {session.navigation.currentStep === STEPS.CHART && (
            <ChartStep
              noteSections={session.chart.noteSections}
              template={session.chart.template}
              feedbackRating={session.chart.feedback?.rating ?? null}
              feedbackRemarks={session.chart.feedback?.remarks ?? ""}
              loading={session.chart.loading}
              error={session.chart.error}
              onUpdateSection={session.chart.updateSection}
              onFeedbackRatingChange={session.chart.updateFeedbackRating}
              onFeedbackRemarksChange={session.chart.updateFeedbackRemarks}
              onCopyToClipboard={session.chart.onCopyToClipboard}
              onRegenerate={session.chart.onRegenerate}
            />
          )}
        </Box>
      </Box>

      {/* Footer with context-aware action buttons - only show if transcript exists */}
      {session.recording.transcript &&
        session.recording.transcript.length >= 50 && (
          <ChartMindFooter
            currentStep={session.navigation.currentStep}
            transcript={session.recording.transcript}
            selectedDiagnosesCount={session.diagnosis.selectedDiagnoses.length}
            selectedConfirmedDiagnosesCount={
              session.confirmDiagnosis.selectedConfirmedDiagnoses.length
            }
            onContinueToDiagnosis={session.navigation.handleContinueToDiagnosis}
            onContinueToPlan={session.navigation.handleContinueToPlan}
            onContinueToConfirm={session.navigation.handleContinueToConfirm}
            onContinueToTreatment={session.navigation.handleContinueToTreatment}
            onContinueToDischarge={session.navigation.handleContinueToDischarge}
            onGenerateChart={session.navigation.handleContinueToChart}
            onBack={session.navigation.handleBack}
            saving={session.session.saving}
            lastSavedAt={session.session.lastSavedAt}
            hasUnsavedChanges={session.session.hasUnsavedChanges}
          />
        )}

      {isGlobalAdmin ? (
        <Alert
          severity="warning"
          variant="outlined"
          sx={{
            flexShrink: 0,
            mx: { xs: 2, sm: 3 },
            mb: { xs: 2, sm: 3 },
            mt: 0,
            bgcolor: "#fff9e6",
            border: "1px solid #f0e0b8",
            color: "#616161",
            fontWeight: 400,
            fontSize: "1.0625rem",
            lineHeight: 1.55,
            "& .MuiAlert-icon": {
              color: "#757575",
            },
            "& .MuiAlert-message": {
              width: "100%",
              color: "#616161",
            },
          }}
        >
          This view is meant to be used as a simulation for global admin prompts
          to see how well the system is behaving. This is not intended for
          medical use but instead for development.
        </Alert>
      ) : null}
    </Box>
  );
};

export default ChartMindPage;
