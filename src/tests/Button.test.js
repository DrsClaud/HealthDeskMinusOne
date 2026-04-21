import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import Button from '../components/styled/Button';

const theme = {
  colors: {
    primary: '#117ACA',
    secondary: '#1B4584',
    white: '#FFFFFF',
    gray: '#EEEEEE',
    darkgray: '#666666',
  },
};

function renderPrimaryButton(onClick = () => { }) {
  return render(
    <ThemeProvider theme={theme}>
      <Button onClick={onClick}>Primary Button</Button>
    </ThemeProvider>
  );
}

describe('UI/Button Primary', () => {
  it('clicking Primary Button does something', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    renderPrimaryButton(handleClick);

    const button = screen.getByRole('button', { name: /primary button/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
