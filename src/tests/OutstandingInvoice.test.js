import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import OutstandingInvoice from '../components/dashboard/auction/OutstandingInvoice';

const theme = createTheme();

function renderWithTheme(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <OutstandingInvoice {...props} />
    </ThemeProvider>
  );
}

describe('Auction/OutstandingInvoice', () => {
  it('returns null when invoice is missing', () => {
    const { container } = renderWithTheme({ invoice: null });
    expect(container.firstChild).toBeNull();
  });

  it('renders promotion title when invoice has no ad subscriptions', () => {
    renderWithTheme({
      invoice: {
        items: [
          { type: 'promotion', description: 'ZIP Code Promotion', zipCode: '123', amount: 1000 },
        ],
      },
    });
    expect(screen.getByText('Your ZIP Code Promotion is Ready')).toBeInTheDocument();
  });
});
