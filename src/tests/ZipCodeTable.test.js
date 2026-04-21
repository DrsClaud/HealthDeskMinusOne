import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ZipCodeTable from '../components/dashboard/auction/ZipCodeTable';

jest.mock('services/firebase', () => ({ db: {} }));
jest.mock('firebase/compat/app', () => ({ default: {} }));
jest.mock('firebase/compat/functions', () => ({}));
jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({
    userData: { uid: 'user1' },
    zipSubscriptions: {},
  }),
}));
jest.mock('../utils/dateUtils', () => ({
  getNextAuctionEndDate: () => new Date(Date.now() + 3600000),
  getLastAuctionEndDate: () => new Date(Date.now() - 3600000),
  getPostAuctionDisplayDuration: () => 15,
  getPromotionExpirationDate: () => new Date(Date.now() + 86400000),
  isAuctionEnded: () => false,
}));

const theme = createTheme();

function renderWithTheme(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <ZipCodeTable selectedZips={new Set(['123'])} auctionData={{}} {...props} />
    </ThemeProvider>
  );
}

describe('Auction/ZipCodeTable', () => {
  it('returns null when no selected zips', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <ZipCodeTable selectedZips={new Set()} auctionData={{}} />
      </ThemeProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders table with ZIP Code header when zips selected', () => {
    renderWithTheme();
    expect(screen.getByText('ZIP Code')).toBeInTheDocument();
  });
});
