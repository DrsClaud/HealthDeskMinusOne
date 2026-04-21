import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';

jest.mock('firebase/compat/functions', () => ({}));
jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({
    hasValidSubscription: false,
    canStartTrial: true,
    hasActiveTrial: false,
    trialExpired: false,
    userData: {},
  }),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));
jest.mock('services/firebase', () => ({ db: {} }));
jest.mock('@stripe/react-stripe-js', () => ({ useStripe: () => null }));

import Pricing from '../components/dashboard/upgrade/Pricing';

const theme = createTheme();
const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderWithTheme(ui) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter future={routerFuture}>{ui}</MemoryRouter>
    </ThemeProvider>
  );
}

describe('Pricing', () => {
  it('renders trial CTA when canStartTrial is true', () => {
    renderWithTheme(<Pricing uid="u1" role="patient" />);
    expect(screen.getByText(/Try Medical SuperIntelligence Free/i)).toBeInTheDocument();
  });

  it('renders View subscription plans link', () => {
    renderWithTheme(<Pricing uid="u1" role="patient" />);
    expect(screen.getByText(/View subscription plans/i)).toBeInTheDocument();
  });
});
