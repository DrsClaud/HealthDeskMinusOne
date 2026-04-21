import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Box } from '@mui/material';
import PlanStep, { Diagnosis, DiagnosticTest, DiagnosticPlanData } from 'components/dashboard/chartmind/PlanStep';

export default {
  title: 'ChartMind/PlanStep',
  component: PlanStep,
  parameters: {
    layout: 'padded',
  },
} as Meta<typeof PlanStep>;

// Mock diagnoses
const mockDiagnoses: Diagnosis[] = [
  {
    condition: 'Upper Respiratory Infection',
    likelihood: 'More Likely',
    rationale: 'Cough, sore throat, nasal congestion for 3 days',
  },
  {
    condition: 'Influenza',
    likelihood: 'Likely',
    rationale: 'Fever, body aches, fatigue',
  },
];

// Mock tests
const mockTests: DiagnosticTest[] = [
  {
    id: 'rapid-flu',
    name: 'Rapid Influenza Antigen Test',
    category: 'lab',
    rationale: 'Quick differentiation between URI and influenza to guide antiviral therapy',
    linkedDiagnoses: ['Upper Respiratory Infection', 'Influenza'],
    priority: 'stat',
  },
  {
    id: 'strep-rapid',
    name: 'Rapid Strep Test',
    category: 'lab',
    rationale: 'Rule out Group A Streptococcal pharyngitis given sore throat',
    linkedDiagnoses: ['Upper Respiratory Infection'],
    priority: 'routine',
  },
  {
    id: 'covid-pcr',
    name: 'COVID-19 PCR',
    category: 'lab',
    rationale: 'Exclude COVID-19 given overlapping symptoms',
    linkedDiagnoses: ['Upper Respiratory Infection', 'Influenza'],
    priority: 'routine',
  },
  {
    id: 'cbc',
    name: 'Complete Blood Count (CBC)',
    category: 'lab',
    rationale: 'Assess for bacterial vs viral infection pattern',
    linkedDiagnoses: ['Upper Respiratory Infection'],
    priority: 'routine',
  },
  {
    id: 'chest-xray',
    name: 'Chest X-Ray (PA & Lateral)',
    category: 'imaging',
    rationale: 'Consider if symptoms worsen or pneumonia suspected',
    linkedDiagnoses: ['Upper Respiratory Infection', 'Influenza'],
    priority: 'routine',
  },
];

const mockPlanData: DiagnosticPlanData = {
  tests: mockTests,
  testingStrategy: 'Start with rapid point-of-care tests (flu, strep) for immediate management decisions. Reserve imaging for patients with concerning respiratory symptoms.',
  considerations: [
    'Consider antiviral therapy if influenza confirmed within 48 hours of symptom onset',
    'Bacterial superinfection possible if symptoms worsen after initial improvement',
    'Follow up in 5-7 days if not improving',
  ],
};

/**
 * Default - Full plan with all categories
 */
export const Default: StoryFn = () => {
  const [disabledTestIds, setDisabledTestIds] = React.useState<Set<string>>(new Set());
  const [testResults, setTestResults] = React.useState<Map<string, any>>(new Map());

  const handleToggle = (testId: string) => {
    setDisabledTestIds((prev) => {
      const next = new Set(prev);
      next.has(testId) ? next.delete(testId) : next.add(testId);
      return next;
    });
  };

  const handleUpdateTestResult = (testId: string, result: any) => {
    setTestResults((prev) => {
      const next = new Map(prev);
      if (result === null || result === undefined) {
        next.delete(testId);
      } else {
        next.set(testId, result);
      }
      return next;
    });
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
      <PlanStep
        selectedDiagnoses={mockDiagnoses}
        planData={mockPlanData}
        loading={false}
        error={null}
        hasTests={true}
        retry={() => console.log('Retry')}
        disabledTestIds={disabledTestIds}
        onToggleTestDisabled={handleToggle}
        onAddTest={(test) => console.log('Add test:', test)}
        testResults={testResults}
        onUpdateTestResult={handleUpdateTestResult}
      />
    </Box>
  );
};

/**
 * With Some Tests Disabled
 */
export const WithDisabledTests: StoryFn = () => {
  const [disabledTestIds, setDisabledTestIds] = React.useState<Set<string>>(
    new Set(['cbc', 'chest-xray'])
  );
  const [testResults, setTestResults] = React.useState<Map<string, any>>(new Map());

  const handleToggle = (testId: string) => {
    setDisabledTestIds((prev) => {
      const next = new Set(prev);
      next.has(testId) ? next.delete(testId) : next.add(testId);
      return next;
    });
  };

  const handleUpdateTestResult = (testId: string, result: any) => {
    setTestResults((prev) => {
      const next = new Map(prev);
      if (result === null || result === undefined) {
        next.delete(testId);
      } else {
        next.set(testId, result);
      }
      return next;
    });
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
      <PlanStep
        selectedDiagnoses={mockDiagnoses}
        planData={mockPlanData}
        loading={false}
        error={null}
        hasTests={true}
        retry={() => {}}
        disabledTestIds={disabledTestIds}
        onToggleTestDisabled={handleToggle}
        onAddTest={(test) => console.log('Add test:', test)}
        testResults={testResults}
        onUpdateTestResult={handleUpdateTestResult}
      />
    </Box>
  );
};

/**
 * Loading State
 */
export const Loading: StoryFn = () => (
  <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
    <PlanStep
      selectedDiagnoses={mockDiagnoses}
      planData={null}
      loading={true}
      error={null}
      hasTests={false}
      retry={() => {}}
      disabledTestIds={new Set()}
      onToggleTestDisabled={() => {}}
      onAddTest={() => {}}
      testResults={new Map()}
      onUpdateTestResult={() => {}}
    />
  </Box>
);

/**
 * Error State
 */
export const ErrorState: StoryFn = () => (
  <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
    <PlanStep
      selectedDiagnoses={mockDiagnoses}
      planData={null}
      loading={false}
      error="Failed to generate diagnostic plan. Please try again."
      hasTests={false}
      retry={() => console.log('Retry')}
      disabledTestIds={new Set()}
      onToggleTestDisabled={() => {}}
      onAddTest={() => {}}
      testResults={new Map()}
      onUpdateTestResult={() => {}}
    />
  </Box>
);

/**
 * No Diagnoses Selected
 */
export const NoDiagnoses: StoryFn = () => (
  <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
    <PlanStep
      selectedDiagnoses={[]}
      planData={null}
      loading={false}
      error={null}
      hasTests={false}
      retry={() => {}}
      disabledTestIds={new Set()}
      onToggleTestDisabled={() => {}}
      onAddTest={() => {}}
      testResults={new Map()}
      onUpdateTestResult={() => {}}
    />
  </Box>
);

/**
 * Empty Results
 */
export const EmptyResults: StoryFn = () => (
  <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
    <PlanStep
      selectedDiagnoses={mockDiagnoses}
      planData={{ tests: [] }}
      loading={false}
      error={null}
      hasTests={false}
      retry={() => console.log('Retry')}
      disabledTestIds={new Set()}
      onToggleTestDisabled={() => {}}
      onAddTest={() => {}}
      testResults={new Map()}
      onUpdateTestResult={() => {}}
    />
  </Box>
);

/**
 * Cardiac Workup - Different clinical scenario
 */
export const CardiacWorkup: StoryFn = () => {
  const cardiacDiagnoses: Diagnosis[] = [
    { condition: 'Acute Coronary Syndrome', likelihood: 'More Likely', urgent: true },
    { condition: 'Unstable Angina', likelihood: 'Likely', urgent: true },
  ];

  const cardiacPlan: DiagnosticPlanData = {
    tests: [
      {
        id: 'troponin',
        name: 'Troponin I/T (Serial)',
        category: 'lab',
        rationale: 'Gold standard for myocardial injury detection. Repeat at 3 and 6 hours.',
        linkedDiagnoses: ['Acute Coronary Syndrome'],
        priority: 'stat',
      },
      {
        id: 'ecg',
        name: '12-Lead ECG',
        category: 'procedure',
        rationale: 'Immediate assessment for STEMI vs NSTEMI vs unstable angina',
        linkedDiagnoses: ['Acute Coronary Syndrome', 'Unstable Angina'],
        priority: 'stat',
      },
      {
        id: 'bnp',
        name: 'BNP / NT-proBNP',
        category: 'lab',
        rationale: 'Assess for heart failure component',
        linkedDiagnoses: ['Acute Coronary Syndrome'],
        priority: 'routine',
      },
      {
        id: 'cxr',
        name: 'Chest X-Ray',
        category: 'imaging',
        rationale: 'Rule out pulmonary edema, cardiomegaly',
        linkedDiagnoses: ['Acute Coronary Syndrome'],
        priority: 'stat',
      },
      {
        id: 'echo',
        name: 'Transthoracic Echocardiogram',
        category: 'imaging',
        rationale: 'Assess wall motion abnormalities, ejection fraction',
        linkedDiagnoses: ['Acute Coronary Syndrome', 'Unstable Angina'],
        priority: 'routine',
      },
    ],
    testingStrategy: 'Immediate ECG and troponin. Serial troponins every 3 hours. Prepare for cardiology consult and potential cath lab activation.',
    considerations: [
      'Activate cath lab immediately if ST elevation present',
      'Start dual antiplatelet therapy if ACS confirmed',
      'Consider early invasive strategy for high-risk NSTEMI',
    ],
  };

  const [disabledTestIds, setDisabledTestIds] = React.useState<Set<string>>(new Set());
  const [testResults, setTestResults] = React.useState<Map<string, any>>(new Map());

  const handleUpdateTestResult = (testId: string, result: any) => {
    setTestResults((prev) => {
      const next = new Map(prev);
      if (result === null || result === undefined) {
        next.delete(testId);
      } else {
        next.set(testId, result);
      }
      return next;
    });
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
      <PlanStep
        selectedDiagnoses={cardiacDiagnoses}
        planData={cardiacPlan}
        loading={false}
        error={null}
        hasTests={true}
        retry={() => {}}
        disabledTestIds={disabledTestIds}
        onToggleTestDisabled={(id) => {
          setDisabledTestIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          });
        }}
        onAddTest={(test) => console.log('Add:', test)}
        testResults={testResults}
        onUpdateTestResult={handleUpdateTestResult}
      />
    </Box>
  );
};
