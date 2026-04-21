import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlanStep, {
  Diagnosis,
  DiagnosticTest,
  DiagnosticPlanData,
} from '../../components/dashboard/chartmind/PlanStep';

const mockDiagnoses: Diagnosis[] = [
  {
    condition: 'Upper Respiratory Infection',
    likelihood: 'More Likely',
    rationale: 'Cough, sore throat for 3 days',
  },
  {
    condition: 'Influenza',
    likelihood: 'Likely',
    rationale: 'Fever, body aches, fatigue',
  },
];

const mockTests: DiagnosticTest[] = [
  {
    id: 'rapid-flu',
    name: 'Rapid Influenza Antigen Test',
    category: 'lab',
    rationale: 'Quick differentiation between URI and influenza',
    linkedDiagnoses: ['Upper Respiratory Infection', 'Influenza'],
    priority: 'stat',
  },
  {
    id: 'strep-rapid',
    name: 'Rapid Strep Test',
    category: 'lab',
    rationale: 'Rule out Group A Streptococcal pharyngitis',
    linkedDiagnoses: ['Upper Respiratory Infection'],
    priority: 'routine',
  },
];

const mockPlanData: DiagnosticPlanData = {
  tests: mockTests,
  testingStrategy: 'Start with rapid point-of-care tests.',
  considerations: ['Follow up in 5-7 days if not improving'],
};

const defaultProps = {
  selectedDiagnoses: mockDiagnoses,
  planData: null,
  loading: false,
  error: null,
  hasTests: false,
  retry: () => {},
  disabledTestIds: new Set<string>(),
  onToggleTestDisabled: () => {},
  onAddTest: () => {},
  testResults: new Map<string, unknown>(),
  onUpdateTestResult: () => {},
};

describe('ChartMind/PlanStep', () => {
  it('renders default state with plan data without crashing', () => {
    render(
      <PlanStep
        {...defaultProps}
        planData={mockPlanData}
        hasTests={true}
      />
    );
    expect(screen.getByText('Rapid Influenza Antigen Test')).toBeInTheDocument();
    expect(screen.getByText('Rapid Strep Test')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(
      <PlanStep
        {...defaultProps}
        loading={true}
      />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state with retry', () => {
    const errorMessage = 'Failed to generate diagnostic plan. Please try again.';
    const retry = jest.fn();
    render(
      <PlanStep
        {...defaultProps}
        error={errorMessage}
        retry={retry}
      />
    );
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('calls onToggleTestDisabled when the hide button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleTestDisabled = jest.fn();
    render(
      <PlanStep
        {...defaultProps}
        planData={mockPlanData}
        hasTests={true}
        onToggleTestDisabled={onToggleTestDisabled}
      />
    );
    const menuButtons = screen.getAllByRole('button');
    const hideButton = menuButtons.find((b) => b.querySelector('[data-testid="VisibilityOffOutlinedIcon"]'));
    expect(hideButton).toBeDefined();
    await user.click(hideButton!);
    expect(onToggleTestDisabled).toHaveBeenCalledWith('rapid-flu');
  });
});
