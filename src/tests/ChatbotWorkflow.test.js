import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import UnauthenticatedChatbot from '../components/chatbot/UnauthenticatedChatbot';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
jest.mock('services/firebase', () => ({ db: {} }));
jest.mock('firebase/compat/app', () => ({
  default: {
    firestore: {
      FieldValue: {
        serverTimestamp: () => ({}),
        arrayUnion: (...args) => args,
      },
    },
  },
}));
jest.mock('firebase/compat/functions', () => ({}));

function ChatWorkflowWrapper(props) {
  const [messages, setMessages] = useState(props.initialMessages || []);
  return (
    <UnauthenticatedChatbot
      messages={messages}
      setMessages={setMessages}
      rateLimitHook={{
        rateLimited: false,
        incrementCount: jest.fn(),
        remaining: 8,
        limit: 8,
      }}
      {...props}
    />
  );
}

describe('Chatbot workflow (high level)', () => {
  it('renders chat workflow: welcome message, disclaimer, and message input', () => {
    render(<ChatWorkflowWrapper />);
    expect(screen.getByText(/How can I help you today/i)).toBeInTheDocument();
    expect(screen.getByText(/expert-curated artificial intelligence/i)).toBeInTheDocument();
    expect(document.querySelector('[data-placeholder="Message My HealthDesk"]')).toBeInTheDocument();
  });
});
