import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Box, Typography, TextField, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { RefreshRounded, ContentCopyOutlined, PrintOutlined, SaveOutlined } from '@mui/icons-material';
import { STEPS } from '../../components/dashboard/chartmind/ChartMindHeader';
import ChartMindHeader from '../../components/dashboard/chartmind/ChartMindHeader';
import ChartMindFooter from '../../components/dashboard/chartmind/ChartMindFooter';
import RecordingStep from '../../components/dashboard/chartmind/RecordingStep';
import DiagnosisStep from '../../components/dashboard/chartmind/DiagnosisStep';
import PlanStep, { type DiagnosticPlanData } from '../../components/dashboard/chartmind/PlanStep';
import TreatmentPlanStep, { type TreatmentPlanData } from '../../components/dashboard/chartmind/TreatmentPlanStep';
import DischargeInstructionsList from '../../components/dashboard/chartmind/DischargeInstructionsList';
import ChartStep from '../../components/dashboard/chartmind/ChartStep';

const meta: Meta = {
  title: 'ChartMind/FullFlow',
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    ),
  ],
};

export default meta;

// ============================================================================
// Mock Data
// ============================================================================

const mockTranscript = `Patient is a 45-year-old male presenting with chest pain that started 2 hours ago while exercising. He describes the pain as pressure-like, 7/10 severity, located in the center of his chest. No radiation. Denies shortness of breath, nausea, or diaphoresis. Pain has improved with rest.

Vital signs: BP 145/90, HR 88, RR 16, Temp 98.6°F, SpO2 98% on room air.

Physical exam: Alert, anxious-appearing male in no acute distress. Heart regular rate and rhythm, no murmurs. Lungs clear bilaterally. No peripheral edema.

EKG shows normal sinus rhythm, no ST changes. Initial troponin negative.

Past medical history: Hypertension, hyperlipidemia. Family history: Father with MI at age 55. Non-smoker, occasional alcohol use.`;

const mockDDXData = {
  diagnoses: [
    {
      id: 'dx-1',
      condition: 'Acute Chest Pain - Rule out ACS',
      likelihood: 'Likely',
      rationale: 'Patient with cardiac risk factors presenting with chest pain during exertion',
      urgent: false,
      redFlags: ['Elevated BP', 'Family history of early MI'],
    },
    {
      id: 'dx-2',
      condition: 'Anxiety',
      likelihood: 'Possible',
      rationale: 'Patient appears anxious, pain resolved with rest',
      urgent: false,
    },
    {
      id: 'dx-3',
      condition: 'Musculoskeletal Pain',
      likelihood: 'Less Likely',
      rationale: 'No reproducibility on palpation, but possible',
      urgent: false,
    },
  ],
  clarifications: [],
  redFlags: ['Elevated BP during episode', 'Family history of early MI'],
};

const mockDiagnosticPlan: DiagnosticPlanData = {
  tests: [
    {
      id: 'test-1',
      name: 'Serial Troponins',
      category: 'lab',
      rationale: 'Rule out myocardial infarction',
      priority: 'stat',
      linkedDiagnoses: ['Acute Chest Pain - Rule out ACS'],
    },
    {
      id: 'test-2',
      name: 'Chest X-ray',
      category: 'imaging',
      rationale: 'Evaluate for cardiac silhouette, pulmonary edema',
      priority: 'urgent',
      linkedDiagnoses: ['Acute Chest Pain - Rule out ACS'],
    },
    {
      id: 'test-3',
      name: 'Lipid Panel',
      category: 'lab',
      rationale: 'Assess cardiac risk factors',
      priority: 'routine',
      linkedDiagnoses: ['Acute Chest Pain - Rule out ACS'],
    },
  ],
  testingStrategy: 'Serial troponins to rule out ACS, imaging to evaluate cardiac status',
  considerations: ['Patient is high-risk due to family history and multiple risk factors'],
};

const mockTreatmentPlan: TreatmentPlanData = {
  treatments: [
    {
      id: 'tx-1',
      name: 'Aspirin 325mg PO',
      category: 'medication',
      priority: 'first-line',
      urgency: 'stat',
      rationale: 'Antiplatelet therapy for potential ACS',
      route: 'PO',
      linkedDiagnoses: ['Acute Chest Pain - Rule out ACS'],
    },
    {
      id: 'tx-2',
      name: 'Sublingual Nitroglycerin PRN',
      category: 'medication',
      priority: 'first-line',
      urgency: 'stat',
      rationale: 'For chest pain relief',
      route: 'SL',
      linkedDiagnoses: ['Acute Chest Pain - Rule out ACS'],
    },
    {
      id: 'tx-3',
      name: 'Continuous Cardiac Monitoring',
      category: 'procedure',
      priority: 'first-line',
      urgency: 'stat',
      rationale: 'Monitor for arrhythmias',
      linkedDiagnoses: ['Acute Chest Pain - Rule out ACS'],
    },
    {
      id: 'tx-4',
      name: 'Smoking Cessation Counseling',
      category: 'lifestyle',
      priority: 'adjunct',
      rationale: 'Risk factor modification',
      linkedDiagnoses: ['Acute Chest Pain - Rule out ACS'],
    },
  ],
};

const mockDischargeInstructions = [
  {
    id: 'inst-1',
    title: 'Medication Instructions - Aspirin',
    category: 'medication_specific',
    prose: 'Take Aspirin 81mg daily as prescribed. Take with food to prevent stomach upset. Do not skip doses.',
    includedByDefault: true,
  },
  {
    id: 'inst-2',
    title: 'Medication Instructions - Nitroglycerin',
    category: 'medication_specific',
    prose: 'Keep nitroglycerin with you at all times. If chest pain occurs, place one tablet under your tongue. You may take up to 3 doses, 5 minutes apart. If pain persists after 3 doses, call 911 immediately.',
    includedByDefault: true,
  },
  {
    id: 'inst-3',
    title: 'Activity Restrictions',
    category: 'activity',
    prose: 'Avoid strenuous activity for the next 48 hours. Gradually return to normal activities as tolerated. Stop and rest if chest pain occurs.',
    includedByDefault: true,
  },
  {
    id: 'inst-4',
    title: 'Follow-up Instructions',
    category: 'followup',
    prose: 'Follow up with cardiology within 1 week. Call to schedule stress test. Follow up with primary care doctor within 2 weeks.',
    includedByDefault: true,
  },
  {
    id: 'inst-5',
    title: 'Warning Signs',
    category: 'warning_signs',
    prose: 'Return to emergency department immediately if you experience: chest pain lasting more than 5 minutes, chest pain not relieved by nitroglycerin, shortness of breath, lightheadedness, or loss of consciousness.',
    includedByDefault: true,
  },
];

const mockNoteSections = {
  subjective: `Chief Complaint: Chest pain

History of Present Illness:
Patient is a 45-year-old male presenting with chest pain that started 2 hours ago while exercising. Pain is described as pressure-like, 7/10 severity, located in center of chest. No radiation. Denies SOB, nausea, diaphoresis. Pain improved with rest.

Review of Systems:
Cardiovascular: Chest pain as described
Respiratory: Denies SOB, cough
Constitutional: Denies fever, chills

Past Medical History: Hypertension, hyperlipidemia
Family History: Father with MI at age 55
Social History: Non-smoker, occasional alcohol use`,
  
  objective: `Vital Signs:
BP: 145/90 mmHg, HR: 88 bpm, RR: 16/min, Temp: 98.6°F, SpO2: 98% RA

Physical Examination:
General: Alert, anxious-appearing male, NAD
Cardiovascular: RRR, no murmurs, rubs, gallops. No JVD. Peripheral pulses 2+ bilaterally
Respiratory: CTAB, no wheezes or crackles
Abdomen: Soft, non-tender

Diagnostic Results:
EKG: Normal sinus rhythm, no ST changes
Troponin: < 0.01 ng/mL (negative)`,
  
  assessment: `1. Chest Pain - Rule out Acute Coronary Syndrome
   - Cardiac risk factors present (age, HTN, HLD, family history)
   - Pain with exertion, resolved with rest
   - Initial workup negative but requires serial troponins
   - Differential: ACS vs anxiety vs musculoskeletal

2. Hypertension - elevated during episode
3. Anxiety`,
  
  plan: `1. Chest Pain workup:
   - Serial troponins at 3 and 6 hours
   - Continuous cardiac monitoring
   - Aspirin 325mg given
   - Nitroglycerin SL PRN
   - Cardiology consult if troponins positive
   - Stress test if troponins negative

2. Hypertension management:
   - Continue home medications
   - Monitor BP

3. Patient Education:
   - Warning signs discussed (recurrent chest pain, SOB)
   - Risk factor modification counseling
   - Smoking cessation, diet, exercise

4. Disposition: Observation for serial troponins
5. Follow-up: Cardiology within 1 week, PCP within 2 weeks`,
};

const mockTemplate = {
  name: 'SOAP Note',
  sections: [
    { key: 'subjective', title: 'Subjective', placeholder: 'Chief complaint, HPI, ROS...' },
    { key: 'objective', title: 'Objective', placeholder: 'Vital signs, physical exam...' },
    { key: 'assessment', title: 'Assessment', placeholder: 'Clinical summary, diagnosis...' },
    { key: 'plan', title: 'Plan', placeholder: 'Treatment plan, follow-up...' },
  ],
};

// ============================================================================
// Helper: Serialize Session (mimics useChartMindSession.serializeSession)
// ============================================================================

const serializeSessionData = (state: any) => {
  // Helper: Check if value is empty
  const isEmpty = (value: any) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
  };

  // Helper: Remove empty values
  const removeEmpty = (obj: any): any => {
    if (Array.isArray(obj)) {
      const filtered = obj.filter(item => !isEmpty(item));
      return filtered.length > 0 ? filtered : undefined;
    }
    if (typeof obj === 'object' && obj !== null) {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = removeEmpty(value);
        if (!isEmpty(cleanedValue)) {
          cleaned[key] = cleanedValue;
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }
    return isEmpty(obj) ? undefined : obj;
  };

  const raw = {
    timestamp: new Date().toISOString(),
    
    // Recording (only if transcript exists)
    recording: state.transcript && state.transcript.trim() ? {
      transcript: state.transcript,
      recordingTime: state.recordingTime,
    } : undefined,
    
    // Diagnosis (only if has data)
    // Store ddxData (full AI response) + selected diagnosis names (not full objects)
    diagnosis: (state.ddxData || (state.selectedDiagnoses && state.selectedDiagnoses.length > 0) || (state.customDiagnoses && state.customDiagnoses.length > 0)) ? {
      ...(state.ddxData && { ddxData: state.ddxData }),
      ...(state.customDiagnoses && state.customDiagnoses.length > 0 && { customDiagnoses: state.customDiagnoses }),
      // Store only condition names, not full objects (reduces duplication)
      ...(state.selectedDiagnoses && state.selectedDiagnoses.length > 0 && { 
        selectedDiagnosisNames: state.selectedDiagnoses.map((d: any) => d.condition || d.name)
      }),
    } : undefined,
    
    // Diagnostic plan (only if has data)
    diagnosticPlan: (state.diagnosticPlanData || state.disabledTestIds.size > 0 || state.testResults.size > 0) ? {
      ...(state.diagnosticPlanData && { planData: state.diagnosticPlanData }),
      ...(state.disabledTestIds.size > 0 && { disabledTestIds: Array.from(state.disabledTestIds) }),
      ...(state.testResults.size > 0 && { testResults: Array.from(state.testResults.entries()) }),
    } : undefined,
    
    // Treatment (only if has data)
    treatment: (state.treatmentPlanData || state.disabledTreatmentIds.size > 0 || state.selectedTreatments.size > 0) ? {
      ...(state.treatmentPlanData && { planData: state.treatmentPlanData }),
      ...(state.disabledTreatmentIds.size > 0 && { disabledTreatmentIds: Array.from(state.disabledTreatmentIds) }),
      ...(state.selectedTreatments.size > 0 && { selectedTreatments: Array.from(state.selectedTreatments) }),
    } : undefined,
    
    // Discharge (only if has instructions or patientName - date only included if other data exists)
    discharge: (() => {
      const hasInstructions = state.dischargeInstructions && state.dischargeInstructions.length > 0;
      const hasPatientName = state.patientName && state.patientName.trim();
      
      // Only create discharge object if there are instructions or patientName
      if (!hasInstructions && !hasPatientName) {
        return undefined;
      }
      
      // Build discharge object with only non-empty fields
      const discharge: any = {};
      if (hasInstructions) {
        discharge.instructions = state.dischargeInstructions;
        discharge.includedInstructionIds = Array.from(state.includedInstructionIds);
      }
      if (hasPatientName) {
        discharge.patientName = state.patientName;
      }
      // Only include date if there are instructions or patientName
      if ((hasInstructions || hasPatientName) && state.date) {
        discharge.date = state.date;
      }
      
      return Object.keys(discharge).length > 0 ? discharge : undefined;
    })(),
    
    // Chart (only if has note sections, no template)
    chart: state.noteSections && Object.keys(state.noteSections).length > 0 ? {
      noteSections: state.noteSections,
    } : undefined,
  };

  return removeEmpty(raw);
};

// ============================================================================
// Full Flow Story (with Save Test)
// ============================================================================

export const FullFlow: StoryObj = {
  render: () => {
    const [currentStep, setCurrentStep] = useState(STEPS.RECORD);
    const [visitedSteps, setVisitedSteps] = useState(new Set([STEPS.RECORD]));
    const [transcript, setTranscript] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    
    // DDX state
    const [ddxData, setDdxData] = useState(null);
    const [ddxLoading, setDdxLoading] = useState(false);
    const [selectedDiagnoses, setSelectedDiagnoses] = useState<any[]>([]);
    const [customDiagnoses, setCustomDiagnoses] = useState<any[]>([]);
    
    // Plan state
    const [diagnosticPlanData, setDiagnosticPlanData] = useState(null);
    const [diagnosticPlanLoading, setDiagnosticPlanLoading] = useState(false);
    const [disabledTestIds, setDisabledTestIds] = useState<Set<string>>(new Set());
    const [testResults, setTestResults] = useState(new Map());
    
    // Confirmed diagnosis state
    const [selectedConfirmedDiagnoses, setSelectedConfirmedDiagnoses] = useState<any[]>([]);
    
    // Treatment state
    const [treatmentPlanData, setTreatmentPlanData] = useState(null);
    const [treatmentPlanLoading, setTreatmentPlanLoading] = useState(false);
    const [selectedTreatments, setSelectedTreatments] = useState<Set<string>>(new Set());
    const [disabledTreatmentIds, setDisabledTreatmentIds] = useState<Set<string>>(new Set());
    
    // Discharge state
    const [dischargeInstructions, setDischargeInstructions] = useState<any[]>([]);
    const [includedInstructionIds, setIncludedInstructionIds] = useState<Set<string>>(new Set());
    const [patientName, setPatientName] = useState('');
    const [date, setDate] = useState(new Date().toLocaleDateString());
    const [dischargeLoading, setDischargeLoading] = useState(false);
    
    // Chart state
    const [noteSections, setNoteSections] = useState({});
    const [chartLoading, setChartLoading] = useState(false);

    // Save dialog state
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [serializedData, setSerializedData] = useState<any>(null);

    // Handle save (serialize and show dialog)
    const handleSave = useCallback(() => {
      const state = {
        currentStep,
        visitedSteps,
        transcript,
        recordingTime,
        ddxData,
        selectedDiagnoses,
        customDiagnoses,
        diagnosticPlanData,
        disabledTestIds,
        testResults,
        treatmentPlanData,
        disabledTreatmentIds,
        selectedTreatments,
        dischargeInstructions,
        includedInstructionIds,
        patientName,
        date,
        noteSections,
      };
      
      const serialized = serializeSessionData(state);
      setSerializedData(serialized);
      setShowSaveDialog(true);
      
      console.log('📦 Serialized Session Data:', serialized);
      console.log('📏 Serialized Size:', JSON.stringify(serialized).length, 'bytes');
    }, [
      currentStep,
      visitedSteps,
      transcript,
      recordingTime,
      ddxData,
      selectedDiagnoses,
      customDiagnoses,
      diagnosticPlanData,
      disabledTestIds,
      testResults,
      treatmentPlanData,
      disabledTreatmentIds,
      selectedTreatments,
      dischargeInstructions,
      includedInstructionIds,
      patientName,
      date,
      noteSections,
    ]);

    // Simulate recording
    useEffect(() => {
      if (isRecording) {
        const interval = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
      }
    }, [isRecording]);

    const handleMicClick = () => {
      if (!isRecording) {
        setIsRecording(true);
        setRecordingTime(0);
        // Simulate transcript appearing
        setTimeout(() => {
          setTranscript(mockTranscript);
          setIsRecording(false);
        }, 3000);
      } else {
        setIsRecording(false);
      }
    };

    const handleContinueToDiagnosis = useCallback(() => {
      setCurrentStep(STEPS.DIAGNOSIS);
      setVisitedSteps(prev => {
        const next = new Set(prev);
        next.add(STEPS.DIAGNOSIS);
        return next;
      });
      // Simulate DDX generation
      setDdxLoading(true);
      setDdxData(null); // Clear first
      setTimeout(() => {
        setDdxData(mockDDXData);
        setDdxLoading(false);
      }, 2000);
    }, []);

    const handleContinueToPlan = useCallback(() => {
      setCurrentStep(STEPS.DIAGNOSTIC_PLAN);
      setVisitedSteps(prev => {
        const next = new Set(prev);
        next.add(STEPS.DIAGNOSTIC_PLAN);
        return next;
      });
      // Simulate plan generation
      setDiagnosticPlanLoading(true);
      setTimeout(() => {
        setDiagnosticPlanData(mockDiagnosticPlan);
        setDiagnosticPlanLoading(false);
      }, 2000);
    }, []);

    const handleContinueToConfirm = useCallback(() => {
      setCurrentStep(STEPS.CONFIRM_DIAGNOSIS);
      setVisitedSteps(prev => {
        const next = new Set(prev);
        next.add(STEPS.CONFIRM_DIAGNOSIS);
        return next;
      });
      // In a real scenario, confirmed diagnoses would be generated by AI
      // For storybook, we'll just use the same diagnoses from DDX
      console.log('Generating confirmed diagnoses...');
    }, []);

    const handleContinueToTreatment = useCallback(() => {
      setCurrentStep(STEPS.TREATMENT);
      setVisitedSteps(prev => {
        const next = new Set(prev);
        next.add(STEPS.TREATMENT);
        return next;
      });
      // Simulate treatment generation
      setTreatmentPlanLoading(true);
      setTimeout(() => {
        setTreatmentPlanData(mockTreatmentPlan);
        setTreatmentPlanLoading(false);
      }, 2000);
    }, []);

    const handleContinueToDischarge = useCallback(() => {
      setCurrentStep(STEPS.DISCHARGE);
      setVisitedSteps(prev => {
        const next = new Set(prev);
        next.add(STEPS.DISCHARGE);
        return next;
      });
      // Simulate discharge generation
      setDischargeLoading(true);
      setTimeout(() => {
        setDischargeInstructions(mockDischargeInstructions);
        const defaultIncluded = new Set(
          mockDischargeInstructions.filter(i => i.includedByDefault).map(i => i.id)
        );
        setIncludedInstructionIds(defaultIncluded);
        setDischargeLoading(false);
      }, 2000);
    }, []);

    const handleGenerateChart = useCallback(() => {
      setCurrentStep(STEPS.CHART);
      setVisitedSteps(prev => {
        const next = new Set(prev);
        next.add(STEPS.CHART);
        return next;
      });
      // Simulate chart generation
      setChartLoading(true);
      setTimeout(() => {
        setNoteSections(mockNoteSections);
        setChartLoading(false);
      }, 3000);
    }, []);

    const handleAddCustomDiagnosis = useCallback((diagnosis: any) => {
      setCustomDiagnoses((prev) => [...prev, diagnosis]);
      setSelectedDiagnoses([diagnosis]);
    }, []);

    const handleBack = useCallback(() => {
      if (currentStep === STEPS.DIAGNOSIS) setCurrentStep(STEPS.RECORD);
      else if (currentStep === STEPS.DIAGNOSTIC_PLAN) setCurrentStep(STEPS.DIAGNOSIS);
      else if (currentStep === STEPS.CONFIRM_DIAGNOSIS) setCurrentStep(STEPS.DIAGNOSTIC_PLAN);
      else if (currentStep === STEPS.TREATMENT) setCurrentStep(STEPS.CONFIRM_DIAGNOSIS);
      else if (currentStep === STEPS.DISCHARGE) setCurrentStep(STEPS.TREATMENT);
      else if (currentStep === STEPS.CHART) setCurrentStep(STEPS.DISCHARGE);
    }, [currentStep]);

    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {/* Header with Save Button */}
        <Box sx={{ position: 'relative' }}>
          <ChartMindHeader
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          isRecording={isRecording}
          recordingTime={recordingTime}
          ddxLoading={ddxLoading}
          hasDiagnoses={!!ddxData}
          diagnosticPlanLoading={diagnosticPlanLoading}
          hasDiagnosticPlan={!!diagnosticPlanData}
          treatmentPlanLoading={treatmentPlanLoading}
          hasTreatmentPlan={!!treatmentPlanData}
          chartLoading={chartLoading}
          hasNote={Object.keys(noteSections).length > 0}
          hasTranscript={transcript.length >= 50}
          hasSelectedDiagnosis={selectedDiagnoses.length > 0}
          visitedSteps={visitedSteps}
        />
        
        {/* Save Button - Test Serialization */}
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveOutlined />}
          onClick={handleSave}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
          }}
        >
          Test Save
        </Button>
      </Box>

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: currentStep === STEPS.RECORD ? 'center' : 'flex-start',
            px: 3,
            py: 4,
            overflowY: 'auto',
          }}
        >
          <Box sx={{ maxWidth: '700px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {currentStep === STEPS.RECORD && (
              <RecordingStep
                isSupported={true}
                isRecording={isRecording}
                isGeneratingChart={false}
                transcript={transcript}
                error={null}
                onMicClick={handleMicClick}
                onClearError={() => {}}
                onTranscriptChange={setTranscript}
                language="en-US"
                onLanguageChange={() => {}}
              />
            )}

            {currentStep === STEPS.DIAGNOSIS && (
              <DiagnosisStep
                transcript={transcript}
                ddxData={ddxData}
                loading={ddxLoading}
                error={null}
                hasDiagnoses={!!ddxData}
                retry={() => {}}
                rawResponse={null}
                selectedDiagnoses={selectedDiagnoses}
                onSelectionChange={setSelectedDiagnoses}
                onPrefetch={() => {}}
                onToggleDiagnosisDisabled={() => {}}
                customDiagnoses={customDiagnoses}
                onAddCustomDiagnosis={handleAddCustomDiagnosis}
              />
            )}

            {currentStep === STEPS.DIAGNOSTIC_PLAN && (
              <PlanStep
                selectedDiagnoses={selectedDiagnoses}
                planData={diagnosticPlanData}
                loading={diagnosticPlanLoading}
                error={null}
                hasTests={!!diagnosticPlanData}
                retry={() => {}}
                disabledTestIds={disabledTestIds}
                onToggleTestDisabled={(id) => {
                  const next = new Set(disabledTestIds);
                  next.has(id) ? next.delete(id) : next.add(id);
                  setDisabledTestIds(next);
                }}
                onAddTest={() => {}}
                testResults={testResults}
                onUpdateTestResult={() => {}}
              />
            )}

            {currentStep === STEPS.TREATMENT && (
              <TreatmentPlanStep
                selectedDiagnoses={selectedDiagnoses}
                planData={treatmentPlanData}
                loading={treatmentPlanLoading}
                error={null}
                hasTreatments={!!treatmentPlanData}
                retry={() => {}}
                disabledTreatmentIds={disabledTreatmentIds}
                onToggleTreatmentDisabled={(id) => {
                  const next = new Set(disabledTreatmentIds);
                  next.has(id) ? next.delete(id) : next.add(id);
                  setDisabledTreatmentIds(next);
                }}
                selectedTreatments={selectedTreatments}
                onToggleTreatmentSelected={(id) => {
                  const next = new Set(selectedTreatments);
                  next.has(id) ? next.delete(id) : next.add(id);
                  setSelectedTreatments(next);
                }}
              />
            )}

            {currentStep === STEPS.DISCHARGE && (
              <Box sx={{ width: '100%', maxWidth: 900 }}>
                {dischargeLoading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                    <Box sx={{ mb: 2, color: 'primary.main' }}>
                      <Box component="span" className="MuiCircularProgress-root">⏳</Box>
                    </Box>
                    <Typography variant="body1" color="text.secondary">
                      Generating discharge instructions...
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight={600}>
                        Discharge Instructions
                      </Typography>
                      <Chip
                        size="small"
                        label={`${includedInstructionIds.size} of ${dischargeInstructions.length} included`}
                        color={includedInstructionIds.size > 0 ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>

                    {/* Patient info */}
                    <Box display="flex" gap={2} mb={2}>
                      <TextField
                        size="small"
                        label="Patient Name"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        sx={{ flex: 1, minWidth: 200 }}
                      />
                      <TextField
                        size="small"
                        label="Date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        sx={{ width: 150 }}
                      />
                    </Box>

                    {/* Actions */}
                    <Box display="flex" gap={1} justifyContent="flex-end" mb={2}>
                      <Button variant="outlined" size="small" startIcon={<RefreshRounded />}>
                        Regenerate
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<ContentCopyOutlined />}>
                        Copy
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<PrintOutlined />}>
                        Print
                      </Button>
                    </Box>

                    {/* Instructions List */}
                    <DischargeInstructionsList
                      instructions={dischargeInstructions}
                      includedInstructionIds={includedInstructionIds}
                      onToggleIncluded={(id) => {
                        const next = new Set(includedInstructionIds);
                        next.has(id) ? next.delete(id) : next.add(id);
                        setIncludedInstructionIds(next);
                      }}
                      onUpdateProse={(id, prose) => {
                        setDischargeInstructions(prev => 
                          prev.map(inst => inst.id === id ? { ...inst, prose } : inst)
                        );
                      }}
                      isAnalyzing={false}
                    />
                  </>
                )}
              </Box>
            )}

            {currentStep === STEPS.CHART && (
              <ChartStep
                noteSections={noteSections}
                template={mockTemplate}
                loading={chartLoading}
                error={null}
                onUpdateSection={(key, value) => {
                  setNoteSections(prev => ({ ...prev, [key]: value }));
                }}
                onCopyToClipboard={async () => {
                  console.log('Copied to clipboard');
                }}
                onRegenerate={() => {
                  setChartLoading(true);
                  setTimeout(() => setChartLoading(false), 2000);
                }}
              />
            )}
          </Box>
        </Box>

        {/* Footer */}
        {transcript && transcript.length >= 50 && (
          <ChartMindFooter
            currentStep={currentStep}
            transcript={transcript}
            selectedDiagnosesCount={selectedDiagnoses.length}
            selectedConfirmedDiagnosesCount={selectedConfirmedDiagnoses.length}
            onContinueToDiagnosis={handleContinueToDiagnosis}
            onContinueToPlan={handleContinueToPlan}
            onContinueToConfirm={handleContinueToConfirm}
            onContinueToTreatment={handleContinueToTreatment}
            onContinueToDischarge={handleContinueToDischarge}
            onGenerateChart={handleGenerateChart}
            onBack={handleBack}
            saving={false}
            lastSavedAt={new Date()}
            hasUnsavedChanges={false}
          />
        )}

        {/* Save Dialog - Shows Serialized Data */}
        <Dialog
          open={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            📦 Serialized Session Data (Test)
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This is what would be saved to Firestore at <code>chartmind/&#123;sessionId&#125;</code>
            </Typography>
            
            <Box
              sx={{
                backgroundColor: '#f5f5f5',
                borderRadius: 1,
                p: 2,
                maxHeight: 400,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {JSON.stringify(serializedData, null, 2)}
            </Box>

            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                label={`Size: ${JSON.stringify(serializedData).length.toLocaleString()} bytes`}
                size="small"
                color="info"
              />
              <Chip
                label={`Sections: ${Object.keys(serializedData || {}).filter(k => k !== 'timestamp').length}`}
                size="small"
                color="success"
              />
              {serializedData?.recording && (
                <Chip
                  label={`Transcript: ${serializedData.recording.transcript?.length || 0} chars`}
                  size="small"
                />
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(serializedData, null, 2));
              console.log('✅ Copied to clipboard');
            }}>
              Copy JSON
            </Button>
            <Button onClick={() => setShowSaveDialog(false)} variant="contained">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  },
};
