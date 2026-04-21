import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const mockGetRegistration = jest.fn();
const mockCollection = jest.fn();
const mockHttpsCallable = jest.fn();

jest.mock("services/firebase", () => ({
  __esModule: true,
  default: {
    functions: () => ({
      httpsCallable: () => mockHttpsCallable,
    }),
  },
  db: {
    collection: (...args) => mockCollection(...args),
  },
}));

jest.mock("react-image-file-resizer", () => ({
  __esModule: true,
  default: {
    imageFileResizer: jest.fn(),
  },
}));

jest.mock("components/styled/LogoLarge", () => ({
  __esModule: true,
  default: () => <div data-testid="logo-large" />,
}));

jest.mock("components/Loading", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-indicator" />,
}));

const PatientRegistration =
  require("../components/vaccine/queue/PatientRegistration").default;

const theme = createTheme();
const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderPatientRegistration() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter future={routerFuture}>
        <PatientRegistration />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  window.history.pushState({}, "", "/registration/test-id");
  mockGetRegistration.mockReset();
  mockHttpsCallable.mockReset();
  mockCollection.mockReset();
  mockCollection.mockImplementation((name) => {
    if (name === "registrations") {
      return {
        doc: jest.fn(() => ({
          get: mockGetRegistration,
        })),
      };
    }

    return {
      doc: jest.fn(() => ({
        get: jest.fn(),
      })),
    };
  });
  mockGetRegistration.mockResolvedValue({ exists: false });
});

describe("PatientRegistration", () => {
  it("shows the not found state for an invalid registration link", async () => {
    renderPatientRegistration();

    expect(
      await screen.findByRole("heading", { name: /registration not found/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we couldn't find the registration you're looking for/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to map/i })).toBeInTheDocument();
  });
});
