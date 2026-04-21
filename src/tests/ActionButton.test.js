import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ActionButton from '../components/dashboard/auction/ActionButton';

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
      <ActionButton zipCode="123" auction={{}} onBidPlaced={() => {}} {...props} />
    </ThemeProvider>
  );
}

describe('Auction/ActionButton', () => {
  it('renders without crashing', () => {
    const { container } = renderWithTheme();
    expect(container).toBeInTheDocument();
  });
});
