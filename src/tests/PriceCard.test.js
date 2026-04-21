import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PriceCard from '../components/dashboard/upgrade/PriceCard';

jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({
    subscriptionData: null,
    hasActiveSubscription: false,
    userData: { subscriptionStatus: null },
  }),
}));

const theme = createTheme();

function renderWithTheme(ui) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const noop = () => {};

describe('PriceCard', () => {
  it('returns null when price is invalid', () => {
    const { container } = renderWithTheme(
      <PriceCard title="Test" price={{}} sendToCheckout={noop} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and price when price is valid', () => {
    renderWithTheme(
      <PriceCard
        title="Monthly Plan"
        price={{ id: 'price_1', price: '$9.99', interval: 'month' }}
        sendToCheckout={noop}
      />
    );
    expect(screen.getByText('Monthly Plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subscribe now/i })).toBeInTheDocument();
  });
});
