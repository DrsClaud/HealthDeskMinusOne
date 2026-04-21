import React from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box, Typography } from "@mui/material";
import { muiTheme } from "../../../config/theme";
import { ChatContext } from "context/Chat";
import { AuthContext } from "context/Auth";
import DashboardNav from "./DashboardNav";

export default {
  title: "Dashboard/Navigation",
  component: DashboardNav,
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
            <Story />
          </ChatContext.Provider>
        </MemoryRouter>
      </ThemeProvider>
    ),
  ],
};

// Mock data
const mockUser = {
  emailVerified: true,
  email: "test@example.com",
  uid: "123456",
};

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

// Sample content component
const SampleContent = ({ title, description }) => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body1" color="text.secondary">
      {description}
    </Typography>
  </Box>
);

// Patient Navigation Stories
export const PatientCanStartTrial = {
  name: "Patient - Can Start Trial",
  render: () => (
    <MockAuthProvider
      mockUserData={mockUserData.patient}
      mockSubscription="patient"
    >
      <MockChatProvider
        messages={[
          {
            sender: "user",
            message: "Hello, I have a question about my health",
          },
          {
            sender: "bot",
            message: "I'd be happy to help! What's your question?",
          },
        ]}
      >
        <DashboardNav>
          <SampleContent
            title="Patient Dashboard"
            description="Welcome! You can start your free trial to access unlimited features."
          />
        </DashboardNav>
      </MockChatProvider>
    </MockAuthProvider>
  ),
};

export const PatientActiveTrial = {
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
          {
            sender: "user",
            message: "Hello, I have a question about my health",
          },
          {
            sender: "bot",
            message: "I'd be happy to help! What's your question?",
          },
        ]}
      >
        <DashboardNav>
          <SampleContent
            title="Patient Dashboard"
            description="You're on a free trial! Enjoy unlimited access."
          />
        </DashboardNav>
      </MockChatProvider>
    </MockAuthProvider>
  ),
};

export const PatientTrialExpired = {
  name: "Patient - Trial Expired",
  render: () => (
    <MockAuthProvider
      mockUserData={{ ...mockUserData.patient, hasUsedTrial: true }}
      mockSubscription="patient"
    >
      <MockChatProvider
        messages={[
          {
            sender: "user",
            message: "Hello, I have a question about my health",
          },
          {
            sender: "bot",
            message: "I'd be happy to help! What's your question?",
          },
        ]}
      >
        <DashboardNav>
          <SampleContent
            title="Patient Dashboard"
            description="Your trial has ended. Upgrade to continue with unlimited access."
          />
        </DashboardNav>
      </MockChatProvider>
    </MockAuthProvider>
  ),
};

export const PatientWithSubscription = {
  name: "Patient - With Subscription",
  render: () => (
    <MockAuthProvider
      mockUserData={mockUserData.patient}
      mockSubscription="patient"
      mockSubscriptionData={{ status: "active", plan: "premium" }}
    >
      <MockChatProvider
        messages={[
          {
            sender: "user",
            message: "Hello, I have a question about my health",
          },
          {
            sender: "bot",
            message: "I'd be happy to help! What's your question?",
          },
        ]}
      >
        <DashboardNav>
          <SampleContent
            title="Patient Dashboard"
            description="You have an active subscription. Enjoy all premium features!"
          />
        </DashboardNav>
      </MockChatProvider>
    </MockAuthProvider>
  ),
};

export const PatientDailyPass = {
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
          {
            sender: "user",
            message: "Hello, I have a question about my health",
          },
          {
            sender: "bot",
            message: "I'd be happy to help! What's your question?",
          },
        ]}
      >
        <DashboardNav>
          <SampleContent
            title="Patient Dashboard"
            description="You have a daily pass! Enjoy unlimited access today."
          />
        </DashboardNav>
      </MockChatProvider>
    </MockAuthProvider>
  ),
};

// Professional Navigation Stories
export const ProfessionalCanStartTrial = {
  name: "Professional - Can Start Trial",
  render: () => (
    <MockAuthProvider
      mockUserData={mockUserData.professional}
      mockSubscription="professional"
    >
      <DashboardNav>
        <SampleContent
          title="Professional Dashboard"
          description="Access professional-grade medical tools and resources."
        />
      </DashboardNav>
    </MockAuthProvider>
  ),
};

export const ProfessionalActiveTrial = {
  name: "Professional - Active Trial",
  render: () => (
    <MockAuthProvider
      mockUserData={{
        ...mockUserData.professional,
        trialExpiresAt: new Date(Date.now() + 86400000),
      }}
      mockSubscription="professional"
    >
      <DashboardNav>
        <SampleContent
          title="Professional Dashboard"
          description="You're on a free trial! Access all professional features."
        />
      </DashboardNav>
    </MockAuthProvider>
  ),
};

export const ProfessionalWithSubscription = {
  name: "Professional - With Subscription",
  render: () => (
    <MockAuthProvider
      mockUserData={mockUserData.professional}
      mockSubscription="professional"
      mockSubscriptionData={{ status: "active", plan: "pro" }}
    >
      <DashboardNav>
        <SampleContent
          title="Professional Dashboard"
          description="Full professional access with all premium features."
        />
      </DashboardNav>
    </MockAuthProvider>
  ),
};

// Facility Navigation Stories
export const FacilityNoSubscription = {
  name: "Facility - No Subscription",
  render: () => (
    <MockAuthProvider
      mockUserData={mockUserData.facility}
      mockSubscription="facility"
    >
      <DashboardNav>
        <SampleContent
          title="Facility Dashboard"
          description="Manage your healthcare facility operations."
        />
      </DashboardNav>
    </MockAuthProvider>
  ),
};

export const FacilityWithSubscription = {
  name: "Facility - With Subscription",
  render: () => (
    <MockAuthProvider
      mockUserData={mockUserData.facility}
      mockSubscription="facility"
      mockSubscriptionData={{ status: "active", plan: "facility" }}
    >
      <DashboardNav>
        <SampleContent
          title="Facility Dashboard"
          description="Full facility management with CareMap Plus features."
        />
      </DashboardNav>
    </MockAuthProvider>
  ),
};

// Admin Navigation Stories
export const AdminUser = {
  name: "Admin - Full Access",
  render: () => (
    <MockAuthProvider
      mockUserData={mockUserData.admin}
      mockSubscription="professional"
      mockSubscriptionData={{ status: "active", plan: "admin" }}
    >
      <DashboardNav>
        <SampleContent
          title="Admin Dashboard"
          description="Administrative controls and system management."
        />
      </DashboardNav>
    </MockAuthProvider>
  ),
};

// Email Not Verified Story
export const EmailNotVerified = {
  render: () => (
    <MockAuthProvider
      mockUser={{ ...mockUser, emailVerified: false }}
      mockUserData={mockUserData.patient}
      mockSubscription="patient"
    >
      <MockChatProvider
        messages={[
          {
            sender: "user",
            message: "Hello, I have a question about my health",
          },
          {
            sender: "bot",
            message: "I'd be happy to help! What's your question?",
          },
        ]}
      >
        <DashboardNav>
          <SampleContent
            title="Verify Your Email"
            description="Please verify your email to access all features."
          />
        </DashboardNav>
      </MockChatProvider>
    </MockAuthProvider>
  ),
};

// Mobile View Story
export const MobileView = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  render: () => (
    <MockAuthProvider
      mockUserData={mockUserData.patient}
      mockSubscription="patient"
    >
      <MockChatProvider
        messages={[
          {
            sender: "user",
            message: "Hello, I have a question about my health",
          },
          {
            sender: "bot",
            message: "I'd be happy to help! What's your question?",
          },
        ]}
      >
        <DashboardNav>
          <SampleContent
            title="Mobile Dashboard"
            description="Responsive design for mobile devices."
          />
        </DashboardNav>
      </MockChatProvider>
    </MockAuthProvider>
  ),
};
