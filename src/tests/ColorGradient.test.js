import React from 'react';
import { render, screen } from '@testing-library/react';
import ColorGradient from '../components/dashboard/ColorGradient';

describe('ColorGradient', () => {
  it('renders gradient labels', () => {
    render(<ColorGradient />);
    expect(screen.getByText('Worst')).toBeInTheDocument();
    expect(screen.getByText('Best')).toBeInTheDocument();
  });
});
