import React from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { muiTheme } from "../../../config/theme";
import { ChatContext } from "context/Chat";
import { AuthContext } from "context/Auth";
import {
  OnboardingDrawer,
  PatientDrawer,
  ProfessionalDrawer,
  FacilityDrawer,
  SettingsDrawer,
} from "./DrawerComponents";

export default {
  title: "Dashboard/Drawer Components",
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <MemoryRouter>
          <ChatContext.Provider
            value={{
              newThread: () => console.log("New thread created"),
            }}
          >
            <div style={{ width: "300px", minHeight: "100vh" }}>
              <Story />
            </div>
          </ChatContext.Provider>
        </MemoryRouter>
      </ThemeProvider>
    ),
  ],
};

// Mock data
const mockUserData = {
  patient: { role: "patient", name: "John Doe" },
  professional: { role: "professional", name: "Dr. Smith" },
  facility: { role: "facility", name: "City Hospital" },
  admin: { role: "professional", name: "Dr. Admin", admin: true },
};

// Create mock AuthProvider that provides all the context values useAuth expects
const MockAuthProvider = ({
  children,
  mockUser,
  mockSubscription,
  mockUserData,
  mockSubscriptionData,
}) => {
  const mockAuthValue = {
    user: mockUser || {
      emailVerified: true,
      email: "test@example.com",
      uid: "123456",
    },
    subscription: mockSubscription || null, // This is the user ROLE (patient, facility, etc.)
    subscriptionData: mockSubscriptionData || null, // The actual Stripe subscription object
    userData: mockUserData,
    zipSubscriptions: {},
    zipPromotions: {},
    invoices: [],
    userLoading: false,
    logout: () => console.log("Mock logout"),
  };

  return (
    <AuthContext.Provider value={mockAuthValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Mock Chat context provider
const MockChatProvider = ({ children, messages = [] }) => {
  const mockChatValue = {
    messages,
    // Add other ChatContext values as needed
    loading: false,
    error: null,
  };

  return (
    <ChatContext.Provider value={mockChatValue}>
      {children}
    </ChatContext.Provider>
  );
};

// Onboarding Drawer
export const OnboardingDrawerStory = {
  name: "Onboarding Drawer",
  render: () => (
    <OnboardingDrawer logout={() => console.log("Logout clicked")} />
  ),
};

// Patient Drawer Stories
export const PatientDrawerCanStartTrial = {
  name: "Patient - Can Start Trial",
  render: () => (
    <MockAuthProvider
      mockUserData={mockUserData.patient}
      mockSubscription="patient"
    >
      <MockChatProvider
        messages={[
          { sender: "user", message: "Hello, I have a question" },
          { sender: "bot", message: "I can help you!" },
        ]}
      >
        <PatientDrawer subscription={null} userData={mockUserData.patient} />
      </MockChatProvider>
    </MockAuthProvider>
  ),
};

export const PatientDrawerActiveTrial = {
  name: "Patient - Active Trial",
  render: () => (
    <MockAuthProvider
      mockUserData={{
        ...mockUserData.patient,
        trialExpiresAt: new Date(Date.now() + 86400000),
      }}
      mockSubscription="patient"
    >
      <MockChatProvider
        messages={[
          { sender: "user", message: "Hello, I have a question" },
          { sender: "bot", message: "I can help you!" },
        ]}
      >
        <PatientDrawer subscription={null} userData={mockUserData.patient} />
      </MockChatProvider>
    </MockAuthProvider>
  ),
};

export const PatientDrawerDailyPass = {
  name: "Patient - Daily Pass",
  render: () => (
    <MockAuthProvider
      mockUserData={{
        ...mockUserData.patient,
        dailyPassExpiresAt: new Date(Date.now() + 86400000),
      }}
      mockSubscription="patient"
    >
      <MockChatProvider
        messages={[
          { sender: "user", message: "Hello, I have a question" },
          { sender: "bot", message: "I can help you!" },
        ]}
      >
        <PatientDrawer subscription={null} userData={mockUserData.patient} />
      </MockChatProvider>
    </MockAuthProvider>
  ),
};

export const PatientDrawerTrialExpired = {
  name: "Patient - Trial Expired",
  render: () => (
    <MockAuthProvider
      mockUserData={{ ...mockUserData.patient, hasUsedTrial: true }}
      mockSubscription="patient"
    >
      <MockChatProvider
        messages={[
          { sender: "user", message: "Hello, I have a question" },
          { sender: "bot", message: "I can help you!" },
        ]}
      >
        <PatientDrawer subscription={null} userData={mockUserData.patient} />
      </MockChatProvider>
    </MockAuthProvider>
  ),
};

export const PatientDrawerWithSubscription = {
  name: "Patient - With Subscription",
  render: () => (
    <MockAuthProvider
      mockUserData={mockUserData.patient}
      mockSubscription="patient"
      mockSubscriptionData={{ status: "active", plan: "premium" }}
    >
      <MockChatProvider
        messages={[
          { sender: "user", message: "Hello, I have a question" },
          { sender: "bot", message: "I can help you!" },
        ]}
      >
        <PatientDrawer
          subscription={{ plan: "premium", active: true }}
          userData={mockUserData.patient}
        />
      </MockChatProvider>
    </MockAuthProvider>
  ),
};

export const PatientDrawerNoMessages = {
  name: "Patient - No Chat Messages",
  render: () => (
    <MockAuthProvider
      mockUserData={mockUserData.patient}
      mockSubscription="patient"
    >
      <MockChatProvider messages={[]}>
        <PatientDrawer subscription={null} userData={mockUserData.patient} />
      </MockChatProvider>
    </MockAuthProvider>
  ),
};

// Professional Drawer Stories
export const ProfessionalDrawerCanStartTrial = {
  name: "Professional - Can Start Trial",
  render: () => (
    <MockAuthProvider
      mockUserData={mockUserData.professional}
      mockSubscription="professional"
    >
      <ProfessionalDrawer
        subscription={null}
        userData={mockUserData.professional}
      />
    </MockAuthProvider>
  ),
};

export const ProfessionalDrawerActiveTrial = {
  name: "Professional - Active Trial",
  render: () => (
    <MockAuthProvider
      mockUserData={{
        ...mockUserData.professional,
        trialExpiresAt: new Date(Date.now() + 86400000),
      }}
      mockSubscription="professional"
    >
      <ProfessionalDrawer
        subscription={null}
        userData={mockUserData.professional}
      />
    </MockAuthProvider>
  ),
};

export const ProfessionalDrawerTrialExpired = {
  name: "Professional - Trial Expired",
  render: () => (
    <MockAuthProvider
      mockUserData={{ ...mockUserData.professional, hasUsedTrial: true }}
      mockSubscription="professional"
    >
      <ProfessionalDrawer
        subscription={null}
        userData={mockUserData.professional}
      />
    </MockAuthProvider>
  ),
};

export const ProfessionalDrawerWithSubscription = {
  name: "Professional - With Subscription",
  render: () => (
    <MockAuthProvider
      mockUserData={mockUserData.professional}
      mockSubscription="professional"
      mockSubscriptionData={{ status: "active", plan: "pro" }}
    >
      <ProfessionalDrawer
        subscription={{ plan: "pro", active: true }}
        userData={mockUserData.professional}
      />
    </MockAuthProvider>
  ),
};

// Facility Drawer
export const FacilityDrawerStory = {
  name: "Facility Drawer",
  render: () => <FacilityDrawer />,
};

// Settings Drawer Stories
export const SettingsDrawerBasicUser = {
  name: "Settings - Basic User",
  render: () => (
    <SettingsDrawer
      activeSubscriptionRole={null}
      userData={mockUserData.patient}
    />
  ),
};

export const SettingsDrawerFacilityNoSubscription = {
  name: "Settings - Facility No Subscription",
  render: () => (
    <SettingsDrawer
      activeSubscriptionRole={null}
      userData={mockUserData.facility}
    />
  ),
};

export const SettingsDrawerFacilityWithSubscription = {
  name: "Settings - Facility With Subscription",
  render: () => (
    <SettingsDrawer
      activeSubscriptionRole="facility"
      userData={mockUserData.facility}
    />
  ),
};

export const SettingsDrawerAdmin = {
  name: "Settings - Admin User",
  render: () => (
    <SettingsDrawer
      activeSubscriptionRole="professional"
      userData={mockUserData.admin}
    />
  ),
};
