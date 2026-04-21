import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TreatmentPlanStep from '../../components/dashboard/chartmind/TreatmentPlanStep';

const mockDiagnoses = [
  { condition: 'Community-Acquired Pneumonia', likelihood: 'High' },
  { condition: 'Acute Bronchitis', likelihood: 'Moderate' },
];

const mockTreatments = [
  {
    id: 'med-1',
    name: 'Amoxicillin-Clavulanate 875-125mg PO BID',
    category: 'medication' as const,
    priority: 'first-line' as const,
    urgency: 'urgent' as const,
    rationale: 'Broad-spectrum coverage for typical and atypical pathogens.',
    route: 'PO',
    linkedDiagnoses: ['Community-Acquired Pneumonia'],
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
    id: 'proc-1',
    name: 'Chest X-ray (PA and Lateral)',
    category: 'procedure' as const,
    priority: 'first-line' as const,
    urgency: 'stat' as const,
    rationale: 'Confirm pneumonia diagnosis and assess severity.',
    linkedDiagnoses: ['Community-Acquired Pneumonia'],
  },
];

const mockPlanData = {
  treatments: mockTreatments,
  treatmentStrategy: 'Antibiotic plus symptomatic care.',
  considerations: ['Follow up if worsening'],
};

const defaultProps = {
  selectedDiagnoses: mockDiagnoses,
  planData: null,
  loading: false,
  error: null,
  hasTreatments: false,
  retry: () => {},
  disabledTreatmentIds: new Set<string>(),
  onToggleTreatmentDisabled: () => {},
  selectedTreatments: new Set<string>(),
  onToggleTreatmentSelected: () => {},
};

describe('ChartMind/TreatmentPlanStep', () => {
  it('renders default state with plan data without crashing', () => {
    render(
      <TreatmentPlanStep
        {...defaultProps}
        planData={mockPlanData}
        hasTreatments={true}
      />
    );
    expect(screen.getByText('Amoxicillin-Clavulanate 875-125mg PO BID')).toBeInTheDocument();
    expect(screen.getByText('Chest X-ray (PA and Lateral)')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(
      <TreatmentPlanStep
        {...defaultProps}
        loading={true}
      />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state with retry', () => {
    const errorMessage = 'Failed to generate treatment plan. The AI service is temporarily unavailable.';
    const retry = jest.fn();
    render(
      <TreatmentPlanStep
        {...defaultProps}
        error={errorMessage}
        retry={retry}
      />
    );
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('calls onToggleTreatmentSelected when a treatment is selected', async () => {
    const user = userEvent.setup();
    const onToggleTreatmentSelected = jest.fn();
    render(
      <TreatmentPlanStep
        {...defaultProps}
        planData={mockPlanData}
        hasTreatments={true}
        onToggleTreatmentSelected={onToggleTreatmentSelected}
      />
    );
    const treatmentName = screen.getByText('Acetaminophen 650mg PO q6h PRN');
    await user.click(treatmentName);
    expect(onToggleTreatmentSelected).toHaveBeenCalled();
  });
});
