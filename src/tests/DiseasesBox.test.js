import React from 'react';
import { render } from '@testing-library/react';
import DiseasesBox from '../components/chatbot/ContextBox/DiseasesBox';
import { ChatContext } from '../context/Chat';

jest.mock('services/firebase', () => ({ db: {} }));
jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('react-d3-graph', () => {
  const React = require('react');
  const Graph = React.forwardRef((props, ref) => (
    <div data-testid="graph" ref={ref} />
  ));
  return { Graph };
});

const mockDiseases = ['fever', 'cough'];
const mockDiseaseData = [
  { name: 'COVID-19', match: ['fever', 'cough'], description: 'Test description' },
];

function renderDiseasesBox(props = {}) {
  const defaultProps = {
    diseases: mockDiseases,
    expanded: false,
    visible: true,
    openTab: () => { },
    mockDiseaseData,
    ...props,
  };
  const chatContext = { keyword: '', descOpen: false, setDescOpen: () => { } };
  return render(
    <ChatContext.Provider value={chatContext}>
      <DiseasesBox {...defaultProps} />
    </ChatContext.Provider>
  );
}

describe('DiseasesBox', () => {
  it('renders without crashing', () => {
    const { container } = renderDiseasesBox();
    expect(container.querySelector('.noselect')).toBeInTheDocument();
  });
});
