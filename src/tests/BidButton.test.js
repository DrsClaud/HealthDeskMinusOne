import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import BidButton from '../components/dashboard/auction/BidButton';

jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({
    userData: { uid: 'user1' },
    zipPromotions: {},
    zipSubscriptions: {},
  }),
}));
jest.mock('../services/firebase', () => ({ db: {} }));
jest.mock('firebase/compat/app', () => ({ default: {} }));
jest.mock('firebase/compat/functions', () => ({}));

const theme = createTheme();

function renderWithTheme(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <BidButton zipCode="123" onBidPlaced={() => {}} {...props} />
    </ThemeProvider>
  );
}

describe('Auction/BidButton', () => {
  it('renders a button', () => {
    renderWithTheme();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
