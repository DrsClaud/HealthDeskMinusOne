import React from 'react';
import { render, screen } from '@testing-library/react';
import NewDiseasesBox from '../components/chat_new/GraphNodes';

jest.mock('react-force-graph-2d', () => ({
  __esModule: true,
  default: () => <div data-testid="force-graph" />,
}));

describe('NewDiseasesBox', () => {
  it('renders without crashing', () => {
    render(<NewDiseasesBox />);
    expect(screen.getByTestId('force-graph')).toBeInTheDocument();
  });
});
