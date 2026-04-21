import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AuctionStatus from '../components/dashboard/auction/AuctionStatus';

const theme = createTheme();

function renderWithTheme(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <AuctionStatus {...props} />
    </ThemeProvider>
  );
}

describe('Auction/AuctionStatus', () => {
  it('shows skeleton when loading', () => {
    const { container } = renderWithTheme({ isLoading: true });
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('shows current bid and label when data provided', () => {
    renderWithTheme({
      auctionData: { currentBid: 150000, numberOfBids: 2, startingPrice: 100000 },
    });
    expect(screen.getByText('$1,500')).toBeInTheDocument();
    expect(screen.getByText(/2 bids placed/)).toBeInTheDocument();
  });
});
