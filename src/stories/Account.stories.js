import React from "react";
import Account from "../components/dashboard/Settings";
import { AuthContext } from "context/Auth";
import { LocationContext } from "context/Location";
import { BrowserRouter } from "react-router-dom";
import { MapboxCacheProvider } from "hooks/useMapboxCache";

// Mock firebase functions
const mockFirebase = {
  app: () => ({
    functions: () => ({
      httpsCallable: () => Promise.resolve({ data: { url: "#" } }),
    }),
  }),
};

// Mock contexts wrapper
const ContextWrapper = ({ children, authValue, locationValue }) => (
  <BrowserRouter>
    <AuthContext.Provider value={authValue}>
      <LocationContext.Provider value={locationValue}>
        <MapboxCacheProvider>{children}</MapboxCacheProvider>
      </LocationContext.Provider>
    </AuthContext.Provider>
  </BrowserRouter>
);

export default {
  title: "Dashboard/Account",
  component: Account,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story, context) => (
      <ContextWrapper
        authValue={context.args.authContext}
        locationValue={context.args.locationContext}
      >
        <Story />
      </ContextWrapper>
    ),
  ],
};

// Regular user story
export const RegularUser = {
  args: {
    authContext: {
      user: { email: "user@example.com" },
      userData: { role: "user" },
      subscription: null,
    },
    locationContext: {
      location: null,
    },
  },
};

// Subscribed user story
export const SubscribedUser = {
  args: {
    authContext: {
      user: { email: "subscriber@example.com" },
      userData: { role: "user" },
      subscription: { status: "active" },
    },
    locationContext: {
      location: null,
    },
  },
};

// Facility user story
export const FacilityUser = {
  args: {
    authContext: {
      user: { email: "facility@example.com" },
      userData: { role: "facility" },
      subscription: { status: "active" },
    },
    locationContext: {
      location: {
        title: "Downtown Medical Center",
        address: "123 Medical Ave",
      },
    },
  },
};
