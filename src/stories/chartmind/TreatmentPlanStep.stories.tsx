import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import TreatmentPlanStep from '../../components/dashboard/chartmind/TreatmentPlanStep';

const meta: Meta<typeof TreatmentPlanStep> = {
  title: 'ChartMind/TreatmentPlanStep',
  component: TreatmentPlanStep,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TreatmentPlanStep>;

// Mock data
const mockDiagnoses = [
  { condition: 'Community-Acquired Pneumonia', likelihood: 'High' },
  { condition: 'Acute Bronchitis', likelihood: 'Moderate' },
];

const mockTreatments = [
  // Medications - with mutually redundant group
  {
    id: 'med-1',
    name: 'Amoxicillin-Clavulanate 875-125mg PO BID',
    category: 'medication' as const,
    priority: 'first-line' as const,
    urgency: 'urgent' as const,
    rationale: 'Broad-spectrum coverage for typical and atypical pathogens. Good oral bioavailability.',
    route: 'PO',
    linkedDiagnoses: ['Community-Acquired Pneumonia'],
    mutuallyRedundantGroup: 'antibiotic-choice',
    pickCount: 1,
  },
  {
    id: 'med-2',
    name: 'Azithromycin 500mg PO daily',
    category: 'medication' as const,
    priority: 'alternative' as const,
    urgency: 'urgent' as const,
    rationale: 'Alternative for penicillin-allergic patients. Covers atypical pathogens.',
    route: 'PO',
    contraindications: ['QT prolongation', 'Severe hepatic impairment'],
    linkedDiagnoses: ['Community-Acquired Pneumonia'],
    mutuallyRedundantGroup: 'antibiotic-choice',
    pickCount: 1,
  },
  {
    id: 'med-3',
    name: 'Levofloxacin 750mg PO daily',
    category: 'medication' as const,
    priority: 'alternative' as const,
    urgency: 'urgent' as const,
    rationale: 'Respiratory fluoroquinolone for severe cases or resistant organisms.',
    route: 'PO',
    contraindications: ['Tendon disorders', 'Myasthenia gravis'],
    linkedDiagnoses: ['Community-Acquired Pneumonia'],
    mutuallyRedundantGroup: 'antibiotic-choice',
    pickCount: 1,
  },
  {
    id: 'med-4',
    name: 'Acetaminophen 650mg PO q6h PRN',
    category: 'medication' as const,
    priority: 'adjunct' as const,
    rationale: 'Fever and pain management.',
    route: 'PO',
    linkedDiagnoses: ['Community-Acquired Pneumonia', 'Acute Bronchitis'],
  },
  {
    id: 'med-5',
    name: 'Guaifenesin 400mg PO q4h',
    category: 'medication' as const,
    priority: 'adjunct' as const,
    rationale: 'Expectorant to help clear respiratory secretions.',
    route: 'PO',
    linkedDiagnoses: ['Acute Bronchitis'],
  },
  // Procedures
  {
    id: 'proc-1',
    name: 'Chest X-ray (PA and Lateral)',
    category: 'procedure' as const,
    priority: 'first-line' as const,
    urgency: 'stat' as const,
    rationale: 'Confirm pneumonia diagnosis and assess severity.',
    linkedDiagnoses: ['Community-Acquired Pneumonia'],
  },
  {
    id: 'proc-2',
    name: 'Pulse Oximetry',
    category: 'procedure' as const,
    priority: 'first-line' as const,
    urgency: 'stat' as const,
    rationale: 'Assess oxygenation status and need for supplemental oxygen.',
    linkedDiagnoses: ['Community-Acquired Pneumonia'],
  },
  // Therapies
  {
    id: 'therapy-1',
    name: 'Supplemental Oxygen (if SpO2 <92%)',
    category: 'therapy' as const,
    priority: 'first-line' as const,
    urgency: 'stat' as const,
    rationale: 'Maintain adequate oxygenation.',
    linkedDiagnoses: ['Community-Acquired Pneumonia'],
  },
  {
    id: 'therapy-2',
    name: 'Incentive Spirometry q2h while awake',
    category: 'therapy' as const,
    priority: 'first-line' as const,
    rationale: 'Prevent atelectasis and promote lung expansion.',
    linkedDiagnoses: ['Community-Acquired Pneumonia'],
  },
  // Lifestyle
  {
    id: 'lifestyle-1',
    name: 'Increased Fluid Intake (2-3L/day)',
    category: 'lifestyle' as const,
    priority: 'first-line' as const,
    rationale: 'Maintain hydration and thin respiratory secretions.',
    linkedDiagnoses: ['Community-Acquired Pneumonia', 'Acute Bronchitis'],
  },
  {
    id: 'lifestyle-2',
    name: 'Rest and Activity Restriction',
    category: 'lifestyle' as const,
    priority: 'first-line' as const,
    rationale: 'Allow body to recover and prevent exacerbation.',
    linkedDiagnoses: ['Community-Acquired Pneumonia', 'Acute Bronchitis'],
  },
  {
    id: 'lifestyle-3',
    name: 'Smoking Cessation Counseling',
    category: 'lifestyle' as const,
    priority: 'first-line' as const,
    rationale: 'Critical for respiratory health and recovery.',
    linkedDiagnoses: ['Community-Acquired Pneumonia', 'Acute Bronchitis'],
  },
  // Referrals
  {
    id: 'referral-1',
    name: 'Pulmonology Consultation',
    category: 'referral' as const,
    priority: 'alternative' as const,
    rationale: 'If no improvement in 48-72 hours or severe presentation.',
    linkedDiagnoses: ['Community-Acquired Pneumonia'],
  },
];

const mockPlanData = {
  treatments: mockTreatments,
  treatmentStrategy: 'Initiate empiric antibiotic therapy for community-acquired pneumonia with coverage for typical and atypical pathogens. Provide supportive care including hydration, oxygen if needed, and symptom management. Monitor response to therapy and escalate care if no improvement in 48-72 hours.',
  considerations: [
    'Monitor for antibiotic resistance patterns in your region',
    'Assess need for hospitalization using CURB-65 or PSI score',
    'Consider procalcitonin if available to guide antibiotic duration',
    'Follow up in 48-72 hours to reassess response to therapy',
    'Complete antibiotic course even if symptoms improve',
  ],
};

// ============================================================================
// Stories
// ============================================================================

// Interactive wrapper for all stories
const InteractiveWrapper = ({ 
  initialSelections = new Set<string>(),
  initialDisabled = new Set<string>(),
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelections);
  const [disabledIds, setDisabledIds] = useState<Set<string>>(initialDisabled);

  const handleToggleSelected = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleToggleDisabled = (id: string) => {
    const newSet = new Set(disabledIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
      // Auto-deselect if disabling
      const newSelected = new Set(selectedIds);
      newSelected.delete(id);
      setSelectedIds(newSelected);
    }
    setDisabledIds(newSet);
  };

  return (
    <TreatmentPlanStep
      selectedDiagnoses={mockDiagnoses}
      planData={mockPlanData}
      loading={false}
      error={null}
      hasTreatments={true}
      retry={() => console.log('Retry clicked')}
      disabledTreatmentIds={disabledIds}
      onToggleTreatmentDisabled={handleToggleDisabled}
      selectedTreatments={selectedIds}
      onToggleTreatmentSelected={handleToggleSelected}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveWrapper />,
};

export const WithSelections: Story = {
  render: () => (
    <InteractiveWrapper
      initialSelections={new Set(['med-1', 'med-4', 'proc-1', 'proc-2', 'therapy-1', 'lifestyle-1', 'lifestyle-2'])}
      initialDisabled={new Set(['med-2', 'med-3', 'referral-1'])} // Disabled alternative antibiotics
    />
  ),
};

export const Interactive: Story = {
  render: () => <InteractiveWrapper />,
};

export const Loading: Story = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());
    return (
      <TreatmentPlanStep
        selectedDiagnoses={mockDiagnoses}
        planData={null}
        loading={true}
        error={null}
        hasTreatments={false}
        retry={() => console.log('Retry clicked')}
        disabledTreatmentIds={disabledIds}
        onToggleTreatmentDisabled={(id) => {
          const newSet = new Set(disabledIds);
          newSet.has(id) ? newSet.delete(id) : newSet.add(id);
          setDisabledIds(newSet);
        }}
        selectedTreatments={selectedIds}
        onToggleTreatmentSelected={(id) => {
          const newSet = new Set(selectedIds);
          newSet.has(id) ? newSet.delete(id) : newSet.add(id);
          setSelectedIds(newSet);
        }}
      />
    );
  },
};

export const Error: Story = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());
    return (
      <TreatmentPlanStep
        selectedDiagnoses={mockDiagnoses}
        planData={null}
        loading={false}
        error="Failed to generate treatment plan. The AI service is temporarily unavailable."
        hasTreatments={false}
        retry={() => console.log('Retry clicked')}
        disabledTreatmentIds={disabledIds}
        onToggleTreatmentDisabled={(id) => {
          const newSet = new Set(disabledIds);
          newSet.has(id) ? newSet.delete(id) : newSet.add(id);
          setDisabledIds(newSet);
        }}
        selectedTreatments={selectedIds}
        onToggleTreatmentSelected={(id) => {
          const newSet = new Set(selectedIds);
          newSet.has(id) ? newSet.delete(id) : newSet.add(id);
          setSelectedIds(newSet);
        }}
      />
    );
  },
};

export const EmptyState: Story = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());
    return (
      <TreatmentPlanStep
        selectedDiagnoses={mockDiagnoses}
        planData={{ treatments: [], treatmentStrategy: undefined, considerations: [] }}
        loading={false}
        error={null}
        hasTreatments={false}
        retry={() => console.log('Retry clicked')}
        disabledTreatmentIds={disabledIds}
        onToggleTreatmentDisabled={(id) => {
          const newSet = new Set(disabledIds);
          newSet.has(id) ? newSet.delete(id) : newSet.add(id);
          setDisabledIds(newSet);
        }}
        selectedTreatments={selectedIds}
        onToggleTreatmentSelected={(id) => {
          const newSet = new Set(selectedIds);
          newSet.has(id) ? newSet.delete(id) : newSet.add(id);
          setSelectedIds(newSet);
        }}
      />
    );
  },
};

export const NoDiagnosis: Story = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());
    return (
      <TreatmentPlanStep
        selectedDiagnoses={[]}
        planData={null}
        loading={false}
        error={null}
        hasTreatments={false}
        retry={() => console.log('Retry clicked')}
        disabledTreatmentIds={disabledIds}
        onToggleTreatmentDisabled={(id) => {
          const newSet = new Set(disabledIds);
          newSet.has(id) ? newSet.delete(id) : newSet.add(id);
          setDisabledIds(newSet);
        }}
        selectedTreatments={selectedIds}
        onToggleTreatmentSelected={(id) => {
          const newSet = new Set(selectedIds);
          newSet.has(id) ? newSet.delete(id) : newSet.add(id);
          setSelectedIds(newSet);
        }}
      />
    );
  },
};

export const PickOneDemo: Story = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());
    return (
      <div>
        <div style={{ 
          padding: '16px', 
          marginBottom: '16px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107',
          borderRadius: '8px'
        }}>
          <strong>📌 Try This:</strong>
          <br />
          • Notice the 3 antibiotics have orange "PICK 1" badges (warning color = mutually exclusive group)
          <br />
          • Click one antibiotic - the other 2 fade out and become unclickable (group full!)
          <br />
          • Click the selected one again to deselect and free up the group
          <br />
          • Use the "Visible/Hidden" toggle to hide treatments from documentation entirely
        </div>
        <TreatmentPlanStep
          selectedDiagnoses={mockDiagnoses}
          planData={mockPlanData}
          loading={false}
          error={null}
          hasTreatments={true}
          retry={() => console.log('Retry clicked')}
          disabledTreatmentIds={disabledIds}
          onToggleTreatmentDisabled={(id) => {
            const newSet = new Set(disabledIds);
            newSet.has(id) ? newSet.delete(id) : newSet.add(id);
            setDisabledIds(newSet);
          }}
          selectedTreatments={selectedIds}
          onToggleTreatmentSelected={(id) => {
            const newSet = new Set(selectedIds);
            newSet.has(id) ? newSet.delete(id) : newSet.add(id);
            setSelectedIds(newSet);
          }}
        />
      </div>
    );
  },
};

export const MinimalData: Story = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());
    return (
      <TreatmentPlanStep
        selectedDiagnoses={[{ condition: 'Hypertension', likelihood: 'High' }]}
        planData={{
          treatments: [
            {
              id: 'med-simple-1',
              name: 'Lisinopril 10mg PO daily',
              category: 'medication' as const,
              priority: 'first-line' as const,
              rationale: 'ACE inhibitor for blood pressure control.',
              route: 'PO',
              linkedDiagnoses: ['Hypertension'],
            },
            {
              id: 'lifestyle-simple-1',
              name: 'DASH Diet',
              category: 'lifestyle' as const,
              priority: 'first-line' as const,
              rationale: 'Dietary approach to lower blood pressure.',
              linkedDiagnoses: ['Hypertension'],
            },
          ],
        }}
        loading={false}
        error={null}
        hasTreatments={true}
        retry={() => console.log('Retry clicked')}
        disabledTreatmentIds={disabledIds}
        onToggleTreatmentDisabled={(id) => {
          const newSet = new Set(disabledIds);
          newSet.has(id) ? newSet.delete(id) : newSet.add(id);
          setDisabledIds(newSet);
        }}
        selectedTreatments={selectedIds}
        onToggleTreatmentSelected={(id) => {
          const newSet = new Set(selectedIds);
          newSet.has(id) ? newSet.delete(id) : newSet.add(id);
          setSelectedIds(newSet);
        }}
      />
    );
  },
};
