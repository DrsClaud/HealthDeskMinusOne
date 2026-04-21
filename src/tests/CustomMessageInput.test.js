import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CustomMessageInput from "../components/chat_new/CustomMessageInput";

jest.mock("context/Auth", () => ({
  AuthContext: require("react").createContext({ subscription: null, user: null }),
}));

const { AuthContext } = require("context/Auth");

const defaultProps = {
  inputValue: "",
  setInputValue: () => { },
  handleSendRequest: () => { },
  userData: { messageCount: 0, tokensUsedThisMonth: 0, role: "patient" },
};

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderCustomMessageInput(props = {}) {
  return render(
    <MemoryRouter future={routerFuture}>
      <AuthContext.Provider value={{ subscription: null, user: null }}>
        <CustomMessageInput {...defaultProps} {...props} />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("CustomMessageInput", () => {
  it("renders the message input", () => {
    renderCustomMessageInput();
    expect(screen.getByPlaceholderText(/message my healthdesk/i)).toBeInTheDocument();
  });
});
