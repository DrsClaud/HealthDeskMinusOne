import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChartStep from '../../components/dashboard/chartmind/ChartStep';

const mockTemplate = {
  name: 'SOAP Note',
  sections: [
    { key: 'subjective', title: 'Subjective', placeholder: 'Chief complaint...' },
    { key: 'objective', title: 'Objective', placeholder: 'Vital signs...' },
    { key: 'assessment', title: 'Assessment', placeholder: 'Clinical summary...' },
    { key: 'plan', title: 'Plan', placeholder: 'Treatment plan...' },
  ],
};

const mockNoteSections = {
  subjective: 'Patient presents with chest pain.',
  objective: 'BP: 145/90, HR: 88. EKG normal.',
  assessment: 'Chest pain, rule out ACS.',
  plan: 'Serial troponins, aspirin, follow-up.',
};

describe('ChartMind/ChartStep', () => {
  it('renders default state with note sections without crashing', () => {
    render(
      <ChartStep
        noteSections={mockNoteSections}
        template={mockTemplate}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText('Subjective')).toBeInTheDocument();
    expect(screen.getByText('Objective')).toBeInTheDocument();
    expect(screen.getByText(/Patient presents with chest pain/)).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(
      <ChartStep
        noteSections={{}}
        template={mockTemplate}
        loading={true}
        error={null}
      />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state with message', () => {
    const errorMessage = 'Failed to generate clinical note. Please try again.';
    render(
      <ChartStep
        noteSections={{}}
        template={mockTemplate}
        loading={false}
        error={errorMessage}
      />
    );
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('calls onCopyToClipboard when Copy button is clicked', async () => {
    const user = userEvent.setup();
    const onCopyToClipboard = jest.fn().mockResolvedValue(undefined);
    render(
      <ChartStep
        noteSections={mockNoteSections}
        template={mockTemplate}
        loading={false}
        error={null}
        onCopyToClipboard={onCopyToClipboard}
      />
    );
    const copyButton = screen.getByRole('button', { name: /copy/i });
    await user.click(copyButton);
    expect(onCopyToClipboard).toHaveBeenCalledTimes(1);
  });

  it('calls onFeedbackRatingChange when a star is selected', async () => {
    const user = userEvent.setup();
    const onFeedbackRatingChange = jest.fn();

    render(
      <ChartStep
        noteSections={mockNoteSections}
        template={mockTemplate}
        feedbackRating={null}
        loading={false}
        error={null}
        onFeedbackRatingChange={onFeedbackRatingChange}
      />
    );

    await user.click(screen.getByRole('radio', { name: '4 Stars' }));

    expect(onFeedbackRatingChange).toHaveBeenCalledWith(4);
  });

  it('calls onFeedbackRemarksChange when remarks are entered', async () => {
    const user = userEvent.setup();
    const onFeedbackRemarksChange = jest.fn();

    render(
      <ChartStep
        noteSections={mockNoteSections}
        template={mockTemplate}
        feedbackRating={null}
        feedbackRemarks=""
        loading={false}
        error={null}
        onFeedbackRemarksChange={onFeedbackRemarksChange}
      />
    );

    await user.type(
      screen.getByRole('textbox', { name: /additional remarks/i }),
      'Very helpful, but make the assessment more specific.',
    );

    expect(onFeedbackRemarksChange).toHaveBeenCalled();
  });
});
