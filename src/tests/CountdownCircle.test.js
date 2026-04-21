import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CountdownCircle from '../components/dashboard/auction/CountdownCircle';

const theme = createTheme();

function renderWithTheme(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <CountdownCircle seconds={45} {...props} />
    </ThemeProvider>
  );
}

describe('Auction/CountdownCircle', () => {
  it('renders and shows time for header variant', () => {
    renderWithTheme({ seconds: 30, variant: 'header' });
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders m:ss for auction variant', () => {
    renderWithTheme({ seconds: 125, variant: 'auction' });
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });
});
