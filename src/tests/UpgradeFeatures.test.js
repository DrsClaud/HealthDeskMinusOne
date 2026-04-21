import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import UpgradeFeatures, { getFeaturesForRole } from '../components/dashboard/upgrade/UpgradeFeatures';

const theme = createTheme();

function renderWithTheme(ui) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('UpgradeFeatures', () => {
  it('renders patient features for role patient', () => {
    renderWithTheme(<UpgradeFeatures role="patient" />);
    expect(screen.getByText(/Medical SuperIntelligence/i)).toBeInTheDocument();
  });

  it('renders facility features for role facility', () => {
    renderWithTheme(<UpgradeFeatures role="facility" />);
    expect(screen.getByText('Set your current waiting room volume')).toBeInTheDocument();
  });

  it('getFeaturesForRole returns correct lists', () => {
    expect(getFeaturesForRole('patient').length).toBeGreaterThan(0);
    expect(getFeaturesForRole('professional').length).toBeGreaterThan(0);
    expect(getFeaturesForRole('facility').length).toBeGreaterThan(0);
    expect(getFeaturesForRole('other')).toEqual(getFeaturesForRole('facility'));
  });
});
