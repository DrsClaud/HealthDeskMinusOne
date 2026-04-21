import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

jest.mock('firebase/compat/functions', () => ({}));
jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({
    hasActiveSubscription: false,
    hasLapsedSubscription: false,
    subscriptionData: null,
    userData: {},
  }),
}));
jest.mock('firebase/compat/app', () => ({
  functions: () => ({ httpsCallable: () => () => Promise.resolve({ data: {} }) }),
}));

import PricingControls from '../components/dashboard/upgrade/PricingControls';

const theme = createTheme();

function renderWithTheme(ui) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('PricingControls', () => {
  it('shows loading when prices are empty', () => {
    renderWithTheme(
      <PricingControls
        prices={{}}
        selectedInterval="monthly"
        onIntervalChange={() => {}}
      />
    );
    const progress = document.querySelector('.MuiCircularProgress-root');
    expect(progress).toBeInTheDocument();
  });

  it('renders legacy monthly/yearly cards when prices provided', () => {
    const prices = {
      month: { id: 'p_month', price: '$9.99', interval: 'month' },
      year: { id: 'p_year', price: '$99', interval: 'year' },
    };
    renderWithTheme(
      <PricingControls
        prices={prices}
        selectedInterval="monthly"
        onIntervalChange={() => {}}
      />
    );
    expect(screen.getByText('Monthly Plan')).toBeInTheDocument();
    expect(screen.getByText('Yearly Plan')).toBeInTheDocument();
  });
});
