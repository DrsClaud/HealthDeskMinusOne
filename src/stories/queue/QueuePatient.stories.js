import React from 'react';
import QueuePatient from 'components/queue/QueuePatient';
import { AuthContext } from 'context/Auth';
import { db } from 'services/firebase';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Firebase operations with delays
const mockBatch = {
  update: () => {},
  set: () => {},
  delete: () => {},
  commit: () => delay(1500)
};

// Override Firebase methods for stories
db.collection = () => ({
  doc: () => ({
    update: () => delay(1000)
  }),
  add: () => delay(1000).then(() => ({ 
    id: 'mock-id',
    update: () => Promise.resolve() 
  })),
  where: () => ({
    get: () => delay(1000).then(() => ({ forEach: () => {} }))
  })
});

db.batch = () => mockBatch;

const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com'
};

export const Template = (args) => (
  <AuthContext.Provider value={{ user: mockUser }}>
    <div style={{ width: '600px', padding: '20px' }}>
      <QueuePatient {...args} />
    </div>
  </AuthContext.Provider>
);

const basePatient = {
  id: 'P123',
  phone: '+1234567890',
  date: new Date().getTime(),
};

const mockData = {
  id: '123',
  title: 'Test Clinic',
  address: '123 Test St',
  healthcare_que: {
    enabled: true
  },
  queue: [basePatient]
};

const defaultArgs = {
  data: mockData,
  setData: () => console.log('setData called'),
  patient: basePatient
};

export default {
  title: 'Queue/QueuePatient',
  component: QueuePatient,
  parameters: {
    layout: 'centered',
  }
};

export const Waiting = {
  render: Template,
  args: defaultArgs
};

export const Called = {
  render: Template,
  args: {
    ...defaultArgs,
    patient: {
      ...basePatient,
      called: new Date().getTime(),
    },
  },
};

export const Arrived = {
  render: Template,
  args: {
    ...defaultArgs,
    patient: {
      ...basePatient,
      status: 'ARRIVED',
    },
  },
};

export const Cancelled = {
  render: Template,
  args: {
    ...defaultArgs,
    patient: {
      ...basePatient,
      status: 'CANCELLED',
    },
  },
};

export const WithRegistration = {
  render: Template,
  args: {
    ...defaultArgs,
    patient: {
      ...basePatient,
      registration: true,
    },
  },
};

export const RegistrationSent = {
  render: Template,
  args: {
    ...defaultArgs,
    patient: {
      ...basePatient,
      registrationSent: true,
    },
  },
};

export const WithoutHealthcareQueue = {
  render: Template,
  args: {
    ...defaultArgs,
    data: {
      ...mockData,
      healthcare_que: {
        enabled: false
      }
    },
    patient: basePatient,
  },
}; 