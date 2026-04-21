import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import ChartMindVisualization, { Diagnosis } from 'components/dashboard/chartmind/ChartMindVisualization';
import { Box, Typography } from '@mui/material';

export default {
  title: 'ChartMind/Visualization',
  component: ChartMindVisualization,
  parameters: {
    layout: 'padded',
  },
} as Meta<typeof ChartMindVisualization>;

// Mock diagnoses - typical DDX result
const mockDiagnoses: Diagnosis[] = [
  {
    condition: 'Upper Respiratory Infection',
    likelihood: 'More likely (85%)',
    urgent: false,
    rationale: 'Patient presents with cough, sore throat, and nasal congestion',
  },
  {
    condition: 'Influenza',
    likelihood: 'More likely (70%)',
    urgent: false,
    rationale: 'Fever and body aches suggest viral illness',
  },
  {
    condition: 'COVID-19',
    likelihood: 'Less likely (45%)',
    urgent: false,
    rationale: 'Similar symptoms but recent test was negative',
  },
  {
    condition: 'Pneumonia',
    likelihood: 'Less likely (30%)',
    urgent: true,
    rationale: 'Would expect more severe symptoms and chest pain',
  },
  {
    condition: 'Acute Bronchitis',
    likelihood: 'More likely (60%)',
    urgent: false,
    rationale: 'Persistent cough with production could indicate bronchitis',
  },
];

/**
 * Interactive Demo - Main story for testing
 * Has state management for selection toggle
 */
export const InteractiveDemo: StoryFn = () => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const handleDiagnosisClick = (diagnosis: Diagnosis) => {
    setSelectedIds(prev => 
      prev.includes(diagnosis.condition)
        ? []  // Deselect
        : [diagnosis.condition]  // Select (single selection mode)
    );
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        ChartMind Diagnosis Visualization
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        Hover over nodes to see details, click to select
      </Typography>
      <ChartMindVisualization
        diagnoses={mockDiagnoses}
        selectedIds={selectedIds}
        onDiagnosisClick={handleDiagnosisClick}
        width={700}
        height={450}
      />
      {selectedIds.length > 0 && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: '#f0f9ff', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Selected Diagnosis:
          </Typography>
          <Typography variant="body2">{selectedIds.join(', ')}</Typography>
        </Box>
      )}
    </Box>
  );
};

/**
 * With Urgent Diagnoses - Tests urgent badge display
 */
export const WithUrgentDiagnoses: StoryFn = () => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const urgentDiagnoses: Diagnosis[] = [
    {
      condition: 'Sepsis',
      likelihood: 'More likely (75%)',
      urgent: true,
      rationale: 'Critical condition requiring immediate attention',
    },
    {
      condition: 'Myocardial Infarction',
      likelihood: 'More likely (65%)',
      urgent: true,
      rationale: 'Chest pain and elevated cardiac markers',
    },
    {
      condition: 'Pulmonary Embolism',
      likelihood: 'Less likely (45%)',
      urgent: true,
      rationale: 'Shortness of breath and risk factors present',
    },
    {
      condition: 'Anxiety',
      likelihood: 'Less likely (30%)',
      urgent: false,
      rationale: 'Symptoms could be anxiety-related',
    },
  ];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: 'error.main' }}>
        Emergency DDX (Urgent Cases)
      </Typography>
      <ChartMindVisualization
        diagnoses={urgentDiagnoses}
        selectedIds={selectedIds}
        onDiagnosisClick={(dx) => setSelectedIds([dx.condition])}
        width={700}
        height={450}
      />
    </Box>
  );
};
