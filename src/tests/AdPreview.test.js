import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdPreview from '../components/dashboard/auction/AdPreview';

jest.mock('components/map/FeaturedAd', () => ({ __esModule: true, default: () => <div data-testid="featured-ad" /> }));
jest.mock('components/dashboard/advertising/MarketingSettings', () => ({ __esModule: true, default: () => null }));

const theme = createTheme();

function renderWithTheme(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <AdPreview location={{}} userData={{}} {...props} />
    </ThemeProvider>
  );
}

describe('Auction/AdPreview', () => {
  it('renders Ad Preview header', () => {
    renderWithTheme();
    expect(screen.getByText('Ad Preview')).toBeInTheDocument();
  });

  it('renders Edit Advertising Profile button', () => {
    renderWithTheme();
    expect(screen.getByRole('button', { name: /edit advertising profile/i })).toBeInTheDocument();
  });
});
