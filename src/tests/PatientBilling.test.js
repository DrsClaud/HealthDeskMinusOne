import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";

jest.mock("firebase/compat/app", () => ({
  __esModule: true,
  default: {
    app: () => ({
      functions: () => ({
        httpsCallable: () => jest.fn().mockResolvedValue({ data: { url: "#" } }),
      }),
    }),
  },
}));
jest.mock("firebase/compat/functions", () => ({}));
jest.mock("components/dashboard/upgrade/Pricing", () => ({ __esModule: true, default: () => null }));
jest.mock("../components/chatbot/UserProfileSettings", () => ({ __esModule: true, default: () => null }));
jest.mock("context/Auth", () => ({
  AuthContext: require("react").createContext({
    user: null,
    subscription: null,
    userLoading: false,
    logout: jest.fn(),
  }),
}));

const { AuthContext } = require("context/Auth");
const PatientBilling = require("../components/chatbot/PatientBilling").default;

const theme = createTheme();
const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderPatientBilling(props = {}) {
  const authValue = {
    user: { email: "patient@test.com" },
    subscription: { status: "active" },
    userLoading: false,
    logout: jest.fn(),
  };
  return render(
    <MemoryRouter future={routerFuture}>
      <ThemeProvider theme={theme}>
        <AuthContext.Provider value={authValue}>
          <PatientBilling userData={{ role: "patient" }} {...props} />
        </AuthContext.Provider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("PatientBilling", () => {
  it("renders Account heading and user email", () => {
    renderPatientBilling();
    expect(screen.getByRole("heading", { name: "Account", level: 3 })).toBeInTheDocument();
    expect(screen.getByText(/patient@test\.com/i)).toBeInTheDocument();
  });
});
