import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import SelectableCard from '../../components/dashboard/chartmind/SelectableCard';
import { Box } from '@mui/material';

const meta: Meta<typeof SelectableCard> = {
  title: 'ChartMind/SelectableCard',
  component: SelectableCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SelectableCard>;

// ============================================================================
// Basic Examples
// ============================================================================

export const Default: Story = {
  args: {
    title: 'Community-Acquired Pneumonia',
    rationale: 'Patient presents with fever, productive cough, and shortness of breath. Physical exam reveals crackles in right lower lobe.',
    chips: [
      { label: 'High likelihood', color: 'success', variant: 'outlined' },
    ],
  },
};

export const Selected: Story = {
  args: {
    title: 'Community-Acquired Pneumonia',
    rationale: 'Patient presents with fever, productive cough, and shortness of breath. Physical exam reveals crackles in right lower lobe.',
    selected: true,
    chips: [
      { label: 'High likelihood', color: 'success', variant: 'outlined' },
    ],
  },
};

export const Disabled: Story = {
  args: {
    title: 'Community-Acquired Pneumonia',
    rationale: 'Patient presents with fever, productive cough, and shortness of breath. Physical exam reveals crackles in right lower lobe.',
    disabled: true,
    chips: [
      { label: 'High likelihood', color: 'success', variant: 'outlined' },
    ],
  },
};

export const Dimmed: Story = {
  args: {
    title: 'Azithromycin 500mg PO daily',
    rationale: 'Alternative for penicillin-allergic patients. Covers atypical pathogens.',
    dimmed: true,
    chips: [
      { label: 'Pick 1', color: 'warning', variant: 'outlined' },
      { label: 'PO', color: 'default', variant: 'outlined' },
      { label: 'Alternative', color: 'primary', variant: 'outlined' },
    ],
  },
};

// ============================================================================
// With Toggle
// ============================================================================

export const WithToggle: Story = {
  render: () => {
    const [disabled, setDisabled] = useState(false);
    return (
      <SelectableCard
        title="Chest X-ray (PA and Lateral)"
        rationale="Confirm pneumonia diagnosis and assess severity."
        disabled={disabled}
        onToggleDisabled={() => setDisabled(!disabled)}
        chips={[
          { label: 'Custom', color: 'default', variant: 'outlined' },
        ]}
      />
    );
  },
};

export const WithToggleDisabled: Story = {
  render: () => {
    const [disabled, setDisabled] = useState(true);
    return (
      <SelectableCard
        title="Chest X-ray (PA and Lateral)"
        rationale="Confirm pneumonia diagnosis and assess severity."
        disabled={disabled}
        onToggleDisabled={() => setDisabled(!disabled)}
        chips={[
          { label: 'Custom', color: 'default', variant: 'outlined' },
        ]}
      />
    );
  },
};

// ============================================================================
// Different Chip Combinations
// ============================================================================

export const DiagnosisStyle: Story = {
  args: {
    title: 'Acute Bronchitis',
    rationale: 'Viral illness with cough and minimal fever. No focal consolidation.',
    chips: [
      { label: 'Moderate likelihood', color: 'default', variant: 'outlined' },
      { label: 'Urgent', color: 'warning', variant: 'filled' },
    ],
  },
};

export const TestStyle: Story = {
  render: () => {
    const [disabled, setDisabled] = useState(false);
    return (
      <SelectableCard
        title="Complete Blood Count (CBC)"
        rationale="Assess for leukocytosis indicating bacterial infection."
        disabled={disabled}
        onToggleDisabled={() => setDisabled(!disabled)}
        chips={[
          { label: 'Lab', color: 'primary', variant: 'outlined' },
          { label: 'STAT', color: 'error', variant: 'filled' },
        ]}
      />
    );
  },
};

export const TreatmentStyle: Story = {
  render: () => {
    const [disabled, setDisabled] = useState(false);
    return (
      <SelectableCard
        title="Amoxicillin-Clavulanate 875-125mg PO BID"
        rationale="Broad-spectrum coverage for typical and atypical pathogens. Good oral bioavailability."
        disabled={disabled}
        onToggleDisabled={() => setDisabled(!disabled)}
        chips={[
          { label: 'Pick 1', color: 'warning', variant: 'outlined' },
          { label: 'PO', color: 'default', variant: 'outlined' },
          { label: 'First-line', color: 'primary', variant: 'outlined' },
          { label: 'Urgent', color: 'warning', variant: 'filled' },
        ]}
      />
    );
  },
};

// ============================================================================
// Interactive Examples
// ============================================================================

export const InteractiveDiagnosis: Story = {
  render: () => {
    const [selected, setSelected] = useState(false);
    return (
      <SelectableCard
        title="Community-Acquired Pneumonia"
        rationale="Patient presents with fever, productive cough, and shortness of breath. Physical exam reveals crackles in right lower lobe."
        selected={selected}
        onClick={() => setSelected(!selected)}
        chips={[
          { label: 'High likelihood', color: 'success', variant: 'outlined' },
          { label: 'Urgent', color: 'warning', variant: 'filled' },
        ]}
      />
    );
  },
};

export const InteractiveTest: Story = {
  render: () => {
    const [disabled, setDisabled] = useState(false);
    return (
      <SelectableCard
        title="Chest X-ray (PA and Lateral)"
        rationale="Confirm pneumonia diagnosis and assess severity."
        disabled={disabled}
        onClick={() => alert('Test clicked')}
        onToggleDisabled={() => setDisabled(!disabled)}
        chips={[
          { label: 'Imaging', color: 'primary', variant: 'outlined' },
          { label: 'STAT', color: 'error', variant: 'filled' },
        ]}
      />
    );
  },
};

export const InteractiveTreatment: Story = {
  render: () => {
    const [selected, setSelected] = useState(false);
    const [disabled, setDisabled] = useState(false);
    return (
      <SelectableCard
        title="Amoxicillin-Clavulanate 875-125mg PO BID"
        rationale="Broad-spectrum coverage for typical and atypical pathogens. Good oral bioavailability."
        selected={selected}
        disabled={disabled}
        onClick={() => setSelected(!selected)}
        onToggleDisabled={() => {
          setDisabled(!disabled);
          if (!disabled) setSelected(false); // Deselect when hiding
        }}
        chips={[
          { label: 'Pick 1', color: 'warning', variant: 'outlined' },
          { label: 'PO', color: 'default', variant: 'outlined' },
          { label: 'First-line', color: 'primary', variant: 'outlined' },
          { label: 'Urgent', color: 'warning', variant: 'filled' },
        ]}
      />
    );
  },
};

// ============================================================================
// Multiple Cards Demo
// ============================================================================

export const MultipleCards: Story = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());

    const diagnoses = [
      {
        id: '1',
        title: 'Community-Acquired Pneumonia',
        rationale: 'Patient presents with fever, productive cough, and shortness of breath.',
        chips: [
          { label: 'High likelihood', color: 'success' as const, variant: 'outlined' as const },
          { label: 'Urgent', color: 'warning' as const, variant: 'filled' as const },
        ],
      },
      {
        id: '2',
        title: 'Acute Bronchitis',
        rationale: 'Viral illness with cough and minimal fever. No focal consolidation.',
        chips: [
          { label: 'Moderate likelihood', color: 'default' as const, variant: 'outlined' as const },
        ],
      },
      {
        id: '3',
        title: 'Pulmonary Embolism',
        rationale: 'Consider given dyspnea, but less likely without chest pain or hemoptysis.',
        chips: [
          { label: 'Low likelihood', color: 'default' as const, variant: 'outlined' as const },
        ],
      },
    ];

    const handleToggleDisabled = (id: string) => {
      const newSet = new Set(disabledIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        if (selectedId === id) setSelectedId(null);
      }
      setDisabledIds(newSet);
    };

    return (
      <Box>
        <div style={{ 
          padding: '16px', 
          marginBottom: '16px', 
          backgroundColor: '#e3f2fd', 
          border: '1px solid #2196f3',
          borderRadius: '8px'
        }}>
          <strong>📌 Try This:</strong>
          <br />
          • Click cards to select (radio button behavior)
          <br />
          • Use toggle to hide/show cards
          <br />
          • Notice hover effects (light blue) and consistent styling
        </div>
        {diagnoses.map((dx) => (
          <SelectableCard
            key={dx.id}
            title={dx.title}
            rationale={dx.rationale}
            selected={selectedId === dx.id}
            disabled={disabledIds.has(dx.id)}
            onClick={() => setSelectedId(selectedId === dx.id ? null : dx.id)}
            onToggleDisabled={() => handleToggleDisabled(dx.id)}
            chips={dx.chips}
          />
        ))}
      </Box>
    );
  },
};

// ============================================================================
// Edge Cases
// ============================================================================

export const NoChips: Story = {
  args: {
    title: 'Simple Diagnosis',
    rationale: 'No additional metadata needed.',
    chips: [],
  },
};

export const NoRationale: Story = {
  args: {
    title: 'Quick Item',
    chips: [
      { label: 'Tag', color: 'primary', variant: 'outlined' },
    ],
  },
};

export const ManyChips: Story = {
  args: {
    title: 'Treatment with Many Details',
    rationale: 'This treatment has multiple attributes that need to be displayed.',
    chips: [
      { label: 'Pick 1', color: 'warning', variant: 'outlined' },
      { label: 'PO', color: 'default', variant: 'outlined' },
      { label: 'First-line', color: 'primary', variant: 'outlined' },
      { label: 'Urgent', color: 'warning', variant: 'filled' },
      { label: 'Custom', color: 'default', variant: 'outlined' },
      { label: 'Extra', color: 'secondary', variant: 'outlined' },
    ],
  },
};

export const LongText: Story = {
  args: {
    title: 'This is a Very Long Diagnosis Name That Might Wrap to Multiple Lines in Some Cases',
    rationale: 'This is a very long rationale that explains the clinical reasoning in great detail. It includes multiple sentences and provides comprehensive information about why this diagnosis is being considered. The rationale discusses the patient presentation, relevant findings, and differential considerations.',
    chips: [
      { label: 'High likelihood', color: 'success', variant: 'outlined' },
    ],
  },
};
