import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import QueueDisplay from '../components/queue/splitflap/QueueDisplay';

const theme = createTheme();

function renderQueueDisplay(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <QueueDisplay {...props} />
    </ThemeProvider>
  );
}

describe('QueueDisplay', () => {
  it('renders nothing when queue is empty', () => {
    const { container } = renderQueueDisplay({ queue: [] });
    expect(container.firstChild).toBeNull();
  });

  it('shows header when queue has items', () => {
    renderQueueDisplay({
      queue: [{ id: 1, phone: '5551234567', date: Date.now() }],
    });
    expect(screen.getByText(/virtual queue status/i)).toBeInTheDocument();
  });
});
