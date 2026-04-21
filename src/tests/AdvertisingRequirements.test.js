import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdvertisingRequirements from '../components/dashboard/auction/AdvertisingRequirements';

jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: null, emailVerified: false } }),
}));
jest.mock('components/dashboard/advertising/MarketingSettings', () => ({ __esModule: true, default: () => null }));
jest.mock('components/dashboard/AccountSettings', () => ({ __esModule: true, default: () => null }));

const theme = createTheme();

function renderWithTheme(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <AdvertisingRequirements location={{}} userData={{}} {...props} />
    </ThemeProvider>
  );
}

describe('Auction/AdvertisingRequirements', () => {
  it('renders setup title', () => {
    renderWithTheme();
    expect(screen.getByText('Complete Your Advertising Setup')).toBeInTheDocument();
  });
});
