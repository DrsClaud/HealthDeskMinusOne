import React from 'react';
import { render, screen } from '@testing-library/react';
import DischargeInstructionsList from '../../components/dashboard/chartmind/DischargeInstructionsList';

const mockInstructions = [
  {
    id: 'med-gen-1',
    title: 'Medication Instructions (General)',
    category: 'medication_general',
    prose: 'Take all medications exactly as prescribed by your doctor.',
    dependsOn: [],
    includedByDefault: true,
  },
  {
    id: 'followup-1',
    title: 'Follow-up Instructions',
    category: 'followup',
    prose: 'Follow up with your primary care doctor within 1 week.',
    dependsOn: [],
    includedByDefault: true,
  },
];

describe('ChartMind/DischargeStep (DischargeInstructionsList)', () => {
  it('renders default state with instructions without crashing', () => {
    render(
      <DischargeInstructionsList
        instructions={mockInstructions}
        includedInstructionIds={new Set(['med-gen-1', 'followup-1'])}
        isAnalyzing={false}
      />
    );
    expect(screen.getByText('Medication Instructions (General)')).toBeInTheDocument();
    expect(screen.getByText('Follow-up Instructions')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(
      <DischargeInstructionsList
        instructions={[]}
        includedInstructionIds={new Set()}
        isAnalyzing={true}
      />
    );
    expect(screen.getByText(/Generating discharge instructions/i)).toBeInTheDocument();
  });

  it('renders empty state when no instructions', () => {
    render(
      <DischargeInstructionsList
        instructions={[]}
        includedInstructionIds={new Set()}
        isAnalyzing={false}
      />
    );
    expect(screen.queryByText('Medication Instructions (General)')).not.toBeInTheDocument();
  });
});
