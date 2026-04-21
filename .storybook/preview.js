import React from 'react';
import { initialize, mswDecorator } from 'msw-storybook-addon';
import { AuthContext } from '../src/context/Auth';

// Initialize MSW
initialize();

// Mock auth context value for Storybook
const mockAuthContextValue = {
  user: { uid: 'mock-user-id', email: 'mock@example.com', emailVerified: true },
  subscription: 'professional',
  subscriptionData: { status: 'active' },
  userData: { role: 'professional', organizationId: 'mock-org' },
  userLoading: false,
  logout: () => {},
  listings: {},
  invoices: [],
  medications: [],
  reminderStatuses: new Map(),
  medicationsLoading: false,
  addMedication: () => {},
  updateMedication: () => {},
  deleteMedication: () => {},
  refreshReminderStatuses: () => {},
  loadMedications: () => {},
  trackingData: null,
  loadTrackingData: () => {},
  clearTrackingData: () => {},
  forceResetTrackingData: () => {},
  organizationMembers: [],
  organizationInvitations: [],
  organizationLoading: false,
};

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;

// Export decorators - wrap all stories with AuthContext
export const decorators = [
  mswDecorator,
  (Story) => (
    <AuthContext.Provider value={mockAuthContextValue}>
      <Story />
    </AuthContext.Provider>
  ),
];