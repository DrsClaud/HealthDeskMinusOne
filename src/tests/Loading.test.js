import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import Loading from '../components/Loading';

const theme = {
  colors: {
    primary: '#117ACA',
    white: '#FFFFFF',
  },
};

function renderLoading(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <Loading {...props} />
    </ThemeProvider>
  );
}

describe('UI/Loading', () => {
  it('renders a loading spinner', () => {
    renderLoading();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
