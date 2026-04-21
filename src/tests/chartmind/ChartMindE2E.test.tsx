/**
 * ChartMind end-to-end test: full flow with header, all steps, and footer.
 * Builds on the individual step tests by asserting the integrated flow
 * renders each step correctly and that navigation works.
 */
import React, { useState, useCallback } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { STEPS } from '../../components/dashboard/chartmind/ChartMindHeader';
import ChartMindHeader from '../../components/dashboard/chartmind/ChartMindHeader';
import ChartMindFooter from '../../components/dashboard/chartmind/ChartMindFooter';
import RecordingStep from '../../components/dashboard/chartmind/RecordingStep';
import DiagnosisStep from '../../components/dashboard/chartmind/DiagnosisStep';
import PlanStep, { DiagnosticPlanData } from '../../components/dashboard/chartmind/PlanStep';
import TreatmentPlanStep, { type TreatmentPlanData } from '../../components/dashboard/chartmind/TreatmentPlanStep';
import DischargeInstructionsList from '../../components/dashboard/chartmind/DischargeInstructionsList';
import ChartStep from '../../components/dashboard/chartmind/ChartStep';

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

// Minimal mock data (aligned with step tests and story)
const mockTranscript = 'Patient is a 45-year-old male with chest pain. Vital signs stable. EKG normal.';
const mockDDXData = {
  primary_diagnoses: [
    { condition: 'Chest Pain - Rule out ACS', likelihood: 'Likely', rationale: 'Cardiac risk factors', urgent: false },
    { condition: 'Anxiety', likelihood: 'Possible', rationale: 'Pain resolved with rest', urgent: false },
  ],
  alternative_diagnoses: [],
  clarifications: [],
  red_flags: [],
  next_steps: [],
};
const mockDiagnosticPlan: DiagnosticPlanData = {
  tests: [
    { id: 't1', name: 'Serial Troponins', category: 'lab', rationale: 'Rule out MI', priority: 'stat', linkedDiagnoses: ['Chest Pain - Rule out ACS'] },
  ],
  testingStrategy: 'Serial troponins.',
  considerations: [],
};
const mockTreatmentPlan: TreatmentPlanData = {
  treatments: [
    { id: 'tx-1', name: 'Aspirin 325mg PO', category: 'medication', priority: 'first-line', urgency: 'stat', rationale: 'Antiplatelet', route: 'PO', linkedDiagnoses: ['Chest Pain - Rule out ACS'] },
  ],
};
const mockDischargeInstructions = [
  { id: 'i1', title: 'Medication Instructions', category: 'medication_general', prose: 'Take as prescribed.', dependsOn: [], includedByDefault: true },
];
const mockNoteSections = {
  subjective: 'Chief complaint: Chest pain.',
  objective: 'BP 145/90, HR 88. EKG normal.',
  assessment: 'Chest pain, rule out ACS.',
  plan: 'Serial troponins, aspirin, follow-up.',
};
const mockTemplate = {
  name: 'SOAP Note',
  sections: [
    { key: 'subjective', title: 'Subjective', placeholder: '...' },
    { key: 'objective', title: 'Objective', placeholder: '...' },
    { key: 'assessment', title: 'Assessment', placeholder: '...' },
    { key: 'plan', title: 'Plan', placeholder: '...' },
  ],
};

function ChartMindFlowWrapper({
  initialStep = STEPS.RECORD,
  initialTranscript = '',
}: {
  initialStep?: string;
  initialTranscript?: string;
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [visitedSteps, setVisitedSteps] = useState(new Set([STEPS.RECORD, STEPS.DIAGNOSIS, STEPS.DIAGNOSTIC_PLAN, STEPS.CONFIRM_DIAGNOSIS, STEPS.TREATMENT, STEPS.DISCHARGE, STEPS.CHART]));
  const [transcript, setTranscript] = useState(
    initialTranscript || (initialStep === STEPS.RECORD ? '' : mockTranscript)
  );
  const [selectedDiagnoses, setSelectedDiagnoses] = useState((mockDDXData.primary_diagnoses || []).slice(0, 1));
  const [disabledTestIds, setDisabledTestIds] = useState(new Set<string>());
  const [testResults, setTestResults] = useState(new Map<string, unknown>());
  const [selectedTreatments, setSelectedTreatments] = useState(new Set<string>());
  const [disabledTreatmentIds, setDisabledTreatmentIds] = useState(new Set<string>());
  const [includedInstructionIds, setIncludedInstructionIds] = useState(new Set(mockDischargeInstructions.map((i) => i.id)));
  const [patientName, setPatientName] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [noteSections, setNoteSections] = useState(mockNoteSections);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackRemarks, setFeedbackRemarks] = useState('');

  const addVisited = useCallback((step: string) => {
    setVisitedSteps((prev) => new Set(prev).add(step));
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 400 }}>
      <ChartMindHeader
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        isRecording={false}
        recordingTime={0}
        ddxLoading={false}
        hasDiagnoses={!!mockDDXData}
        diagnosticPlanLoading={false}
        hasDiagnosticPlan={!!mockDiagnosticPlan}
        treatmentPlanLoading={false}
        hasTreatmentPlan={!!mockTreatmentPlan}
        chartLoading={false}
        hasNote={Object.keys(noteSections).length > 0}
        hasTranscript={transcript.length >= 50}
        hasSelectedDiagnosis={selectedDiagnoses.length > 0}
        visitedSteps={visitedSteps}
      />
      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        <Box sx={{ maxWidth: 700, mx: 'auto' }}>
          {currentStep === STEPS.RECORD && (
            <RecordingStep
              isSupported
              isRecording={false}
              isGeneratingChart={false}
              transcript={transcript}
              error={null}
              onMicClick={() => setTranscript(mockTranscript)}
              onClearError={() => {}}
              onTranscriptChange={setTranscript}
            />
          )}
          {currentStep === STEPS.DIAGNOSIS && (
            <DiagnosisStep
              transcript={transcript}
              ddxData={mockDDXData}
              loading={false}
              error={null}
              hasDiagnoses
              retry={() => {}}
              rawResponse={null}
              selectedDiagnoses={selectedDiagnoses}
              onSelectionChange={setSelectedDiagnoses}
              onPrefetch={() => {}}
              onToggleDiagnosisDisabled={() => {}}
            />
          )}
          {currentStep === STEPS.DIAGNOSTIC_PLAN && (
            <PlanStep
              selectedDiagnoses={selectedDiagnoses}
              planData={mockDiagnosticPlan}
              loading={false}
              error={null}
              hasTests
              retry={() => {}}
              disabledTestIds={disabledTestIds}
              onToggleTestDisabled={(id) => {
                setDisabledTestIds((prev) => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                });
              }}
              onAddTest={() => {}}
              testResults={testResults}
              onUpdateTestResult={() => {}}
            />
          )}
          {currentStep === STEPS.CONFIRM_DIAGNOSIS && (
            <Typography>Confirm Diagnosis step (placeholder in test)</Typography>
          )}
          {currentStep === STEPS.TREATMENT && (
            <TreatmentPlanStep
              selectedDiagnoses={selectedDiagnoses}
              planData={mockTreatmentPlan}
              loading={false}
              error={null}
              hasTreatments
              retry={() => {}}
              disabledTreatmentIds={disabledTreatmentIds}
              onToggleTreatmentDisabled={(id) => {
                setDisabledTreatmentIds((prev) => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                });
              }}
              selectedTreatments={selectedTreatments}
              onToggleTreatmentSelected={(id) => {
                setSelectedTreatments((prev) => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                });
              }}
            />
          )}
          {currentStep === STEPS.DISCHARGE && (
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Discharge Instructions
              </Typography>
              <DischargeInstructionsList
                instructions={mockDischargeInstructions}
                includedInstructionIds={includedInstructionIds}
                onToggleIncluded={(id) => {
                  setIncludedInstructionIds((prev) => {
                    const next = new Set(prev);
                    next.has(id) ? next.delete(id) : next.add(id);
                    return next;
                  });
                }}
                onUpdateProse={() => {}}
                isAnalyzing={false}
              />
            </Box>
          )}
          {currentStep === STEPS.CHART && (
            <ChartStep
              noteSections={noteSections}
              template={mockTemplate}
              feedbackRating={feedbackRating}
              feedbackRemarks={feedbackRemarks}
              loading={false}
              error={null}
              onUpdateSection={(key, value) => setNoteSections((prev) => ({ ...prev, [key]: value }))}
              onFeedbackRatingChange={setFeedbackRating}
              onFeedbackRemarksChange={setFeedbackRemarks}
              onCopyToClipboard={async () => {}}
              onRegenerate={() => {}}
            />
          )}
        </Box>
      </Box>
      {transcript && transcript.length >= 50 && (
        <ChartMindFooter
          currentStep={currentStep}
          transcript={transcript}
          selectedDiagnosesCount={selectedDiagnoses.length}
          selectedConfirmedDiagnosesCount={selectedDiagnoses.length}
          onContinueToDiagnosis={() => { setCurrentStep(STEPS.DIAGNOSIS); addVisited(STEPS.DIAGNOSIS); }}
          onContinueToPlan={() => { setCurrentStep(STEPS.DIAGNOSTIC_PLAN); addVisited(STEPS.DIAGNOSTIC_PLAN); }}
          onContinueToConfirm={() => { setCurrentStep(STEPS.CONFIRM_DIAGNOSIS); addVisited(STEPS.CONFIRM_DIAGNOSIS); }}
          onContinueToTreatment={() => { setCurrentStep(STEPS.TREATMENT); addVisited(STEPS.TREATMENT); }}
          onContinueToDischarge={() => { setCurrentStep(STEPS.DISCHARGE); addVisited(STEPS.DISCHARGE); }}
          onGenerateChart={() => { setCurrentStep(STEPS.CHART); addVisited(STEPS.CHART); }}
          onBack={() => {
            if (currentStep === STEPS.DIAGNOSIS) setCurrentStep(STEPS.RECORD);
            else if (currentStep === STEPS.DIAGNOSTIC_PLAN) setCurrentStep(STEPS.DIAGNOSIS);
            else if (currentStep === STEPS.CONFIRM_DIAGNOSIS) setCurrentStep(STEPS.DIAGNOSTIC_PLAN);
            else if (currentStep === STEPS.TREATMENT) setCurrentStep(STEPS.CONFIRM_DIAGNOSIS);
            else if (currentStep === STEPS.DISCHARGE) setCurrentStep(STEPS.TREATMENT);
            else if (currentStep === STEPS.CHART) setCurrentStep(STEPS.DISCHARGE);
          }}
          saving={false}
          lastSavedAt={new Date()}
        />
      )}
    </Box>
  );
}

function renderFlow(initialStep: string = STEPS.RECORD) {
  return render(
    <BrowserRouter future={routerFuture}>
      <ChartMindFlowWrapper initialStep={initialStep} />
    </BrowserRouter>
  );
}

describe('ChartMind E2E', () => {
  it('renders full flow with header and recording step by default', () => {
    renderFlow(STEPS.RECORD);
    expect(screen.getByText('Recording')).toBeInTheDocument();
    expect(screen.getByText('Diagnosis')).toBeInTheDocument();
    expect(screen.getByText('Chart')).toBeInTheDocument();
  });

  it('shows Diagnosis step content when on Diagnosis step', () => {
    renderFlow(STEPS.DIAGNOSIS, true);
    expect(screen.getByText('Chest Pain - Rule out ACS')).toBeInTheDocument();
    expect(screen.getByText('Anxiety')).toBeInTheDocument();
  });

  it('shows Plan step content when on Diagnostic Plan step', () => {
    renderFlow(STEPS.DIAGNOSTIC_PLAN);
    expect(screen.getByText('Serial Troponins')).toBeInTheDocument();
    expect(screen.getByText('Diagnostic Plan')).toBeInTheDocument();
  });

  it('shows Treatment step content when on Treatment step', () => {
    renderFlow(STEPS.TREATMENT);
    expect(screen.getByText('Aspirin 325mg PO')).toBeInTheDocument();
  });

  it('shows Discharge step content when on Discharge step', () => {
    renderFlow(STEPS.DISCHARGE);
    expect(screen.getByText('Discharge Instructions')).toBeInTheDocument();
    expect(screen.getByText('Medication Instructions')).toBeInTheDocument();
  });

  it('shows Chart step content when on Chart step', () => {
    renderFlow(STEPS.CHART);
    expect(screen.getByText('Subjective')).toBeInTheDocument();
    expect(screen.getByText('Chief complaint: Chest pain.')).toBeInTheDocument();
    expect(screen.getByText('Help us improve by providing feedback')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /additional remarks/i })).toBeInTheDocument();
  });

  it('footer Next advances from Record to Diagnosis when transcript exists', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter future={routerFuture}>
        <ChartMindFlowWrapper initialStep={STEPS.RECORD} initialTranscript={mockTranscript} />
      </BrowserRouter>
    );
    const nextButton = screen.getByRole('button', { name: /choose diagnoses/i });
    await user.click(nextButton);
    expect(screen.getByText('Chest Pain - Rule out ACS')).toBeInTheDocument();
  });

  it('stepper allows navigating to a visited step', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter future={routerFuture}>
        <ChartMindFlowWrapper initialStep={STEPS.DIAGNOSIS} />
      </BrowserRouter>
    );
    expect(screen.getByText('Chest Pain - Rule out ACS')).toBeInTheDocument();
    const chartStepButton = screen.getByRole('button', { name: /chart/i });
    await user.click(chartStepButton);
    expect(screen.getByText('Subjective')).toBeInTheDocument();
    expect(screen.getByText('Chief complaint: Chest pain.')).toBeInTheDocument();
  });
});
