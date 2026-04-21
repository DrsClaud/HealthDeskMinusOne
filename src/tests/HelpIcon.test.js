import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HelpIcon from "../components/common/HelpIcon";

const theme = createTheme({ palette: { primary: { main: '#1B4584' } } });

function renderHelpIcon(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <HelpIcon {...props} />
    </ThemeProvider>
  );
}

describe('UI/HelpIcon', () => {
  it('renders and toggles help text on click', async () => {
    const user = userEvent.setup();
    renderHelpIcon({ text: 'Help content' });

    expect(screen.getByText('?')).toBeInTheDocument();
    const helpText = screen.getByText('Help content');
    expect(helpText).not.toBeVisible();

    await act(async () => {
      await user.click(screen.getByText('?'));
    });
    expect(helpText).toBeVisible();

    await act(async () => {
      await user.click(screen.getByText('?'));
    });
    expect(helpText).not.toBeVisible();
  });
});
