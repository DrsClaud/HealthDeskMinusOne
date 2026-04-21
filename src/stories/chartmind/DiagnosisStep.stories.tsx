import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Box } from '@mui/material';
import DiagnosisStep from 'components/dashboard/chartmind/DiagnosisStep';

// Types matching the component's expected shape
interface Diagnosis {
  condition: string;
  likelihood: string;
  rationale?: string;
  urgent?: boolean;
  isCustom?: boolean;
}

interface DDXData {
  primary_diagnoses?: Diagnosis[];
  alternative_diagnoses?: Diagnosis[];
  red_flags?: string[];
  clarifications?: string[];
  next_steps?: string[];
}

export default {
  title: 'ChartMind/DiagnosisStep',
  component: DiagnosisStep,
  parameters: {
    layout: 'padded',
  },
} as Meta<typeof DiagnosisStep>;

// Mock DDX data
const mockDDXData: DDXData = {
  primary_diagnoses: [
    {
      condition: 'Upper Respiratory Infection',
      likelihood: 'More Likely',
      rationale: 'Patient presents with cough, sore throat, and nasal congestion for 3 days',
      urgent: false,
    },
    {
      condition: 'Influenza',
      likelihood: 'Likely',
      rationale: 'Fever, body aches, and fatigue consistent with flu syndrome',
      urgent: false,
    },
  ],
  alternative_diagnoses: [
    {
      condition: 'COVID-19',
      likelihood: 'Less Likely',
      rationale: 'Similar presentation but recent negative test',
      urgent: false,
    },
    {
      condition: 'Pneumonia',
      likelihood: 'Less Likely',
      rationale: 'Would expect more severe symptoms, chest pain, and abnormal lung sounds',
      urgent: true,
    },
    {
      condition: 'Acute Bronchitis',
      likelihood: 'Likely',
      rationale: 'Persistent productive cough could indicate bronchial involvement',
      urgent: false,
    },
  ],
  red_flags: [
    'High fever >39°C',
    'Shortness of breath at rest',
  ],
  clarifications: [
    'Duration of symptoms?',
    'Any chest pain or difficulty breathing?',
    'Recent travel or sick contacts?',
  ],
  next_steps: [
    'Consider rapid flu test',
    'Monitor oxygen saturation',
    'Symptomatic treatment with follow-up if worsening',
  ],
};

const noopAddCustomDiagnosis = () => {};

/**
 * List View - Default state with mock DDX data
 */
export const ListView: StoryFn = () => {
  const [selectedDiagnoses, setSelectedDiagnoses] = React.useState<Diagnosis[]>([]);
  const [customDiagnoses, setCustomDiagnoses] = React.useState<Diagnosis[]>([]);
  const handleAddCustomDiagnosis = (diagnosis: Diagnosis) => {
    setCustomDiagnoses((prev) => [...prev, diagnosis]);
    setSelectedDiagnoses([diagnosis]);
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
      <DiagnosisStep
        transcript="Patient is a 35-year-old male presenting with cough, sore throat, and fever for 3 days..."
        ddxData={mockDDXData}
        loading={false}
        error={null}
        hasDiagnoses={true}
        retry={() => console.log('Retry clicked')}
        rawResponse={null}
        selectedDiagnoses={selectedDiagnoses}
        onSelectionChange={setSelectedDiagnoses}
        onPrefetch={(diagnoses) => console.log('Prefetch:', diagnoses)}
        onToggleDiagnosisDisabled={() => {}}
        customDiagnoses={customDiagnoses}
        onAddCustomDiagnosis={handleAddCustomDiagnosis}
      />
    </Box>
  );
};

/**
 * Loading State
 */
export const Loading: StoryFn = () => (
  <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
    <DiagnosisStep
      transcript="Patient is a 35-year-old male..."
      ddxData={null}
      loading={true}
      error={null}
      hasDiagnoses={false}
      retry={() => {}}
      rawResponse={null}
      selectedDiagnoses={[]}
      onSelectionChange={() => {}}
      onPrefetch={() => {}}
      onToggleDiagnosisDisabled={() => {}}
      customDiagnoses={[]}
      onAddCustomDiagnosis={noopAddCustomDiagnosis}
    />
  </Box>
);

/**
 * Error State
 */
export const ErrorState: StoryFn = () => (
  <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
    <DiagnosisStep
      transcript="Patient is a 35-year-old male..."
      ddxData={null}
      loading={false}
      error="Failed to generate differential diagnosis. Please try again."
      hasDiagnoses={false}
      retry={() => console.log('Retry clicked')}
      rawResponse={null}
      selectedDiagnoses={[]}
      onSelectionChange={() => {}}
      onPrefetch={() => {}}
      onToggleDiagnosisDisabled={() => {}}
      customDiagnoses={[]}
      onAddCustomDiagnosis={noopAddCustomDiagnosis}
    />
  </Box>
);

/**
 * No Transcript - Initial state before recording
 */
export const NoTranscript: StoryFn = () => (
  <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
    <DiagnosisStep
      transcript={null}
      ddxData={null}
      loading={false}
      error={null}
      hasDiagnoses={false}
      retry={() => {}}
      rawResponse={null}
      selectedDiagnoses={[]}
      onSelectionChange={() => {}}
      onPrefetch={() => {}}
      onToggleDiagnosisDisabled={() => {}}
      customDiagnoses={[]}
      onAddCustomDiagnosis={noopAddCustomDiagnosis}
    />
  </Box>
);

/**
 * With Selection - Shows selected state
 */
export const WithSelection: StoryFn = () => {
  const [selectedDiagnoses, setSelectedDiagnoses] = React.useState<Diagnosis[]>([
    mockDDXData.primary_diagnoses![0],
  ]);
  const [customDiagnoses, setCustomDiagnoses] = React.useState<Diagnosis[]>([]);
  const handleAddCustomDiagnosis = (diagnosis: Diagnosis) => {
    setCustomDiagnoses((prev) => [...prev, diagnosis]);
    setSelectedDiagnoses([diagnosis]);
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
      <DiagnosisStep
        transcript="Patient is a 35-year-old male presenting with cough..."
        ddxData={mockDDXData}
        loading={false}
        error={null}
        hasDiagnoses={true}
        retry={() => {}}
        rawResponse={null}
        selectedDiagnoses={selectedDiagnoses}
        onSelectionChange={setSelectedDiagnoses}
        onPrefetch={(diagnoses) => console.log('Prefetch:', diagnoses)}
        onToggleDiagnosisDisabled={() => {}}
        customDiagnoses={customDiagnoses}
        onAddCustomDiagnosis={handleAddCustomDiagnosis}
      />
    </Box>
  );
};

/**
 * Urgent Diagnoses - Tests urgent badge display
 */
export const UrgentDiagnoses: StoryFn = () => {
  const [selectedDiagnoses, setSelectedDiagnoses] = React.useState<Diagnosis[]>([]);
  const [customDiagnoses, setCustomDiagnoses] = React.useState<Diagnosis[]>([]);
  const handleAddCustomDiagnosis = (diagnosis: Diagnosis) => {
    setCustomDiagnoses((prev) => [...prev, diagnosis]);
    setSelectedDiagnoses([diagnosis]);
  };

  const urgentDDX: DDXData = {
    primary_diagnoses: [
      {
        condition: 'Acute Myocardial Infarction',
        likelihood: 'More Likely',
        rationale: 'Crushing chest pain radiating to left arm, diaphoresis, elevated troponins',
        urgent: true,
      },
      {
        condition: 'Unstable Angina',
        likelihood: 'Likely',
        rationale: 'Chest pain at rest, ECG changes without troponin elevation',
        urgent: true,
      },
    ],
    alternative_diagnoses: [
      {
        condition: 'Pulmonary Embolism',
        likelihood: 'Less Likely',
        rationale: 'Sudden dyspnea and pleuritic chest pain, consider D-dimer',
        urgent: true,
      },
      {
        condition: 'GERD',
        likelihood: 'Less Likely',
        rationale: 'Burning sensation, but presentation more concerning for cardiac',
        urgent: false,
      },
    ],
    red_flags: [
      'Ongoing chest pain',
      'ST elevation on ECG',
      'Hemodynamic instability',
    ],
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
      <DiagnosisStep
        transcript="62-year-old male with crushing chest pain for 30 minutes..."
        ddxData={urgentDDX}
        loading={false}
        error={null}
        hasDiagnoses={true}
        retry={() => {}}
        rawResponse={null}
        selectedDiagnoses={selectedDiagnoses}
        onSelectionChange={setSelectedDiagnoses}
        onPrefetch={() => {}}
        onToggleDiagnosisDisabled={() => {}}
        customDiagnoses={customDiagnoses}
        onAddCustomDiagnosis={handleAddCustomDiagnosis}
      />
    </Box>
  );
};

/**
 * Empty Results - No diagnoses after analysis
 */
export const EmptyResults: StoryFn = () => (
  <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
    <DiagnosisStep
      transcript="Patient says hello."
      ddxData={{ primary_diagnoses: [], alternative_diagnoses: [] }}
      loading={false}
      error={null}
      hasDiagnoses={false}
      retry={() => console.log('Retry clicked')}
      rawResponse={null}
      selectedDiagnoses={[]}
      onSelectionChange={() => {}}
      onPrefetch={() => {}}
      onToggleDiagnosisDisabled={() => {}}
      customDiagnoses={[]}
      onAddCustomDiagnosis={noopAddCustomDiagnosis}
    />
  </Box>
);

// Moved outside component to prevent recreation on each render
const manyDiagnosesDDX: DDXData = {
  primary_diagnoses: [
    { condition: 'Gastroesophageal Reflux Disease', likelihood: 'More Likely', rationale: 'Burning epigastric pain worse after meals' },
    { condition: 'Peptic Ulcer Disease', likelihood: 'More Likely', rationale: 'Epigastric pain, history of NSAID use' },
    { condition: 'Functional Dyspepsia', likelihood: 'Likely', rationale: 'Chronic symptoms without alarm features' },
    { condition: 'Acute Gastritis', likelihood: 'Likely', rationale: 'Recent alcohol use and NSAID intake' },
    { condition: 'H. Pylori Infection', likelihood: 'Likely', rationale: 'Endemic area, no prior testing' },
  ],
  alternative_diagnoses: [
    { condition: 'Cholelithiasis', likelihood: 'Less Likely', rationale: 'Pain not colicky, no relation to fatty foods' },
    { condition: 'Acute Pancreatitis', likelihood: 'Less Likely', rationale: 'No radiating pain, normal lipase expected' },
    { condition: 'Acute Cholecystitis', likelihood: 'Less Likely', rationale: 'No Murphy sign, afebrile' },
    { condition: 'Gastroparesis', likelihood: 'Less Likely', rationale: 'No diabetes, no early satiety' },
    { condition: 'Biliary Dyskinesia', likelihood: 'Less Likely', rationale: 'Consider if other causes excluded' },
    { condition: 'Esophageal Spasm', likelihood: 'Less Likely', rationale: 'No dysphagia or chest pain' },
    { condition: 'Eosinophilic Esophagitis', likelihood: 'Less Likely', rationale: 'No food impaction or allergy history' },
    { condition: 'Celiac Disease', likelihood: 'Less Likely', rationale: 'No diarrhea or weight loss' },
    { condition: 'Small Intestinal Bacterial Overgrowth', likelihood: 'Less Likely', rationale: 'No bloating or diarrhea' },
    { condition: 'Gastric Malignancy', likelihood: 'Less Likely', rationale: 'Young patient, no alarm symptoms', urgent: true },
  ],
  red_flags: [
    'Age >55 with new symptoms',
    'Unintentional weight loss',
    'GI bleeding',
    'Dysphagia',
  ],
  clarifications: [
    'Any blood in stool or vomit?',
    'Weight changes in past 6 months?',
    'Family history of GI cancers?',
  ],
};

/**
 * Many Diagnoses - Tests crowded visualization with 15+ diagnoses
 */
export const ManyDiagnoses: StoryFn = () => {
  const [selectedDiagnoses, setSelectedDiagnoses] = React.useState<Diagnosis[]>([]);
  const [customDiagnoses, setCustomDiagnoses] = React.useState<Diagnosis[]>([]);
  const handleAddCustomDiagnosis = (diagnosis: Diagnosis) => {
    setCustomDiagnoses((prev) => [...prev, diagnosis]);
    setSelectedDiagnoses([diagnosis]);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <DiagnosisStep
        transcript="45-year-old with epigastric pain for 2 weeks, worse after meals, taking ibuprofen for back pain..."
        ddxData={manyDiagnosesDDX}
        loading={false}
        error={null}
        hasDiagnoses={true}
        retry={() => {}}
        rawResponse={null}
        selectedDiagnoses={selectedDiagnoses}
        onSelectionChange={setSelectedDiagnoses}
        onPrefetch={() => {}}
        onToggleDiagnosisDisabled={() => {}}
        customDiagnoses={customDiagnoses}
        onAddCustomDiagnosis={handleAddCustomDiagnosis}
      />
    </Box>
  );
};
