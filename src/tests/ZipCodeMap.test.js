import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ZipCodeMap from '../components/dashboard/auction/ZipCodeMap';

jest.mock('hooks/useAuth', () => ({
  useAuth: () => ({ zipSubscriptions: {}, zipPromotions: {} }),
}));
jest.mock('hooks/useFacility', () => ({
  useFacility: () => ({ data: null }),
}));
jest.mock('../components/dashboard/auction/data/zipCodes', () => ({
  loadNearbyZipCodes: () => Promise.resolve({}),
}));
jest.mock('../utils/dateUtils', () => ({ isAuctionEnded: () => false }));
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
}));
jest.mock('../components/dashboard/auction/ZipMarker', () => () => null);

const theme = createTheme();

function renderWithTheme(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <ZipCodeMap selectedZips={new Set()} onZipToggle={() => {}} {...props} />
    </ThemeProvider>
  );
}

describe('Auction/ZipCodeMap', () => {
  it('renders without crashing', () => {
    const { container } = renderWithTheme();
    expect(container).toBeInTheDocument();
  });
});
