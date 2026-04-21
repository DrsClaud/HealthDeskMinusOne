import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiagnosisStep from '../../components/dashboard/chartmind/DiagnosisStep';

const mockDDXData = {
  primary_diagnoses: [
    {
      condition: 'Upper Respiratory Infection',
      likelihood: 'More Likely',
      rationale: 'Patient presents with cough, sore throat for 3 days',
      urgent: false,
    },
    {
      condition: 'Influenza',
      likelihood: 'Likely',
      rationale: 'Fever, body aches, fatigue',
      urgent: false,
    },
  ],
  alternative_diagnoses: [
    {
      condition: 'COVID-19',
      likelihood: 'Less Likely',
      rationale: 'Similar presentation but negative test',
      urgent: false,
    },
  ],
  red_flags: ['High fever >39°C'],
  clarifications: ['Duration of symptoms?'],
  next_steps: ['Consider rapid flu test'],
};

const defaultProps = {
  transcript: 'Patient is a 35-year-old male with cough and sore throat...',
  ddxData: null,
  loading: false,
  error: null,
  hasDiagnoses: false,
  retry: () => {},
  rawResponse: null,
  selectedDiagnoses: [],
  onSelectionChange: () => {},
  onPrefetch: () => {},
  onToggleDiagnosisDisabled: () => {},
};

describe('ChartMind/DiagnosisStep', () => {
  it('renders default state with DDX data without crashing', () => {
    render(
      <DiagnosisStep
        {...defaultProps}
        ddxData={mockDDXData}
        hasDiagnoses={true}
      />
    );
    expect(screen.getByText('Upper Respiratory Infection')).toBeInTheDocument();
    expect(screen.getByText('Influenza')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(
      <DiagnosisStep
        {...defaultProps}
        loading={true}
      />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state with retry', () => {
    const errorMessage = 'Failed to generate differential diagnosis. Please try again.';
    const retry = jest.fn();
    render(
      <DiagnosisStep
        {...defaultProps}
        error={errorMessage}
        retry={retry}
      />
    );
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('calls onSelectionChange when a diagnosis is selected', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    render(
      <DiagnosisStep
        {...defaultProps}
        ddxData={mockDDXData}
        hasDiagnoses={true}
        onSelectionChange={onSelectionChange}
      />
    );
    const firstDiagnosis = screen.getByText('Upper Respiratory Infection');
    await user.click(firstDiagnosis);
    expect(onSelectionChange).toHaveBeenCalled();
  });
});
