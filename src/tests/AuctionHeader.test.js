import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AuctionHeader from '../components/dashboard/auction/AuctionHeader';

jest.mock('../utils/dateUtils', () => ({
  getNextAuctionEndDate: () => new Date(Date.now() + 3600000),
  getLastAuctionEndDate: () => new Date(Date.now() - 3600000),
  getPostAuctionDisplayDuration: () => 15,
}));

const theme = createTheme();

function renderWithTheme(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <AuctionHeader selectedZips={new Set(['123'])} auctionData={{}} {...props} />
    </ThemeProvider>
  );
}

describe('Auction/AuctionHeader', () => {
  it('renders without crashing', () => {
    const { container } = renderWithTheme();
    expect(container).toBeInTheDocument();
  });
});
