import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ZipMarker from '../components/dashboard/auction/ZipMarker';

jest.mock('react-leaflet', () => ({
  Marker: ({ children, eventHandlers }) => (
    <div data-testid="marker" onClick={() => eventHandlers?.click?.({ target: { closePopup: () => {} } })}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
}));

const theme = createTheme();

function renderWithTheme(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <ZipMarker zip={{ id: '123', lat: 40, lng: -74, city: 'New York', state: 'NY' }} {...props} />
    </ThemeProvider>
  );
}

describe('Auction/ZipMarker', () => {
  it('returns null when zip has no coordinates', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <ZipMarker zip={{ id: '123' }} />
      </ThemeProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders popup with ZIP and city when coords provided', () => {
    renderWithTheme();
    expect(screen.getByText('ZIP Code: 123')).toBeInTheDocument();
    expect(screen.getByText(/New York/)).toBeInTheDocument();
  });
});
