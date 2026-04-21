import React from 'react';
import WaitingRoom from 'components/queue/WaitingRoom';
import { AuthContext } from 'context/Auth';
import { db } from 'services/firebase';
import { BrowserRouter } from 'react-router-dom';

// Mock Firebase just like in QueuePatient stories
db.collection = () => ({
  doc: () => ({
    update: () => Promise.resolve(),
  }),
  add: () => Promise.resolve({ id: 'mock-id' }),
  where: () => ({
    get: () => Promise.resolve({ forEach: () => {} })
  })
});

db.batch = () => ({
  update: () => {},
  set: () => {},
  delete: () => {},
  commit: () => Promise.resolve()
});

const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com'
};

const mockAuthContext = {
  user: mockUser,
  subscription: true,
  userData: {
    uid: 'test-uid',
    email: 'test@example.com'
  }
};

const Wrapper = ({ children }) => (
  <BrowserRouter>
    <AuthContext.Provider value={mockAuthContext}>
      {children}
    </AuthContext.Provider>
  </BrowserRouter>
);

export default {
  title: 'Queue/WaitingRoom',
  component: WaitingRoom,
  parameters: {
    layout: 'padded',
  },
  decorators: [(Story) => <Wrapper><Story /></Wrapper>]
};

// Create a bunch of patients in different states
const patients = [
  {
    id: 'P123',
    phone: '+1234567890',
    date: new Date().getTime() - 1000 * 60 * 30, // 30 mins ago
    status: 'ARRIVED',
  },
  {
    id: 'P124',
    phone: '+1234567891',
    date: new Date().getTime() - 1000 * 60 * 20, // 20 mins ago
    called: new Date().getTime() - 1000 * 60 * 5, // called 5 mins ago
  },
  {
    id: 'P125',
    phone: '+1234567892',
    date: new Date().getTime() - 1000 * 60 * 15, // 15 mins ago
    registrationSent: true,
  },
  {
    id: 'P126',
    phone: '+1234567893',
    date: new Date().getTime() - 1000 * 60 * 10, // 10 mins ago
    registration: true,
  },
  {
    id: 'P127',
    phone: '+1234567894',
    date: new Date().getTime() - 1000 * 60 * 5, // 5 mins ago
  },
  {
    id: 'P128',
    phone: '+1234567895',
    date: new Date().getTime(),
    status: 'CANCELLED',
  }
];

const mockData = {
  id: '123',
  title: 'Test Clinic',
  address: '123 Test St',
  healthcare_que: {
    enabled: true
  },
  queue: patients,
  queueEnabled: true,
  queueCap: 10
};

export const BusyWaitingRoom = {
  args: {
    data: mockData,
    setData: () => console.log('setData called')
  }
};

export const EmptyWaitingRoom = {
  args: {
    data: {
      ...mockData,
      queue: []
    },
    setData: () => console.log('setData called')
  }
};

export const DisabledWaitingRoom = {
  args: {
    data: {
      ...mockData,
      queueEnabled: false
    },
    setData: () => console.log('setData called')
  }
};

export const NoHealthcareQueue = {
  args: {
    data: {
      ...mockData,
      healthcare_que: {
        enabled: false
      }
    },
    setData: () => console.log('setData called')
  }
};

export const FullWaitingRoom = {
  args: {
    data: {
      ...mockData,
      queueCap: 6,
      queue: patients
    },
    setData: () => console.log('setData called')
  }
}; 