import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PromotionButton from '../components/dashboard/auction/PromotionButton';

jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({
    userData: { uid: 'user1' },
    zipPromotions: {},
  }),
}));
jest.mock('../services/firebase', () => ({ db: {} }));
jest.mock('firebase/compat/app', () => ({ default: {} }));
jest.mock('firebase/compat/functions', () => ({}));

const theme = createTheme();

function renderWithTheme(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <PromotionButton zipCode="123" {...props} />
    </ThemeProvider>
  );
}

describe('Auction/PromotionButton', () => {
  it('renders without crashing', () => {
    const { container } = renderWithTheme();
    expect(container).toBeInTheDocument();
  });
});
