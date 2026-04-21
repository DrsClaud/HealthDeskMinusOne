import CustomMessageInput from "components/chat_new/CustomMessageInput";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "context/Auth";

export default {
  title: "Chat/CustomMessageInput",
  component: CustomMessageInput,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <AuthContext.Provider value={{ subscription: null, user: null }}>
          <Story />
        </AuthContext.Provider>
      </MemoryRouter>
    ),
  ],
};

const mockSetInputValue = () => {};
const mockHandleSendRequest = () => {};

const Template = (args) => <CustomMessageInput {...args} />;

// Base state - empty input
export const Empty = Template.bind({});
Empty.args = {
  inputValue: "",
  setInputValue: mockSetInputValue,
  handleSendRequest: mockHandleSendRequest,
  userData: {
    messageCount: 0,
    tokensUsedThisMonth: 0,
    role: "patient",
  },
};

// Free user - running low (90%)
export const RunningLow = Template.bind({});
RunningLow.args = {
  inputValue: "Hello",
  setInputValue: mockSetInputValue,
  handleSendRequest: mockHandleSendRequest,
  userData: {
    messageCount: 3,
    tokensUsedThisMonth: 9000,
    role: "patient",
  },
};

// Free user - almost out (95%)
export const AlmostOut = Template.bind({});
AlmostOut.args = {
  inputValue: "Hello",
  setInputValue: mockSetInputValue,
  handleSendRequest: mockHandleSendRequest,
  userData: {
    messageCount: 3,
    tokensUsedThisMonth: 9500,
    role: "patient",
  },
};

// Free user - out of daily messages
export const OutOfDailyMessages = Template.bind({});
OutOfDailyMessages.args = {
  inputValue: "",
  setInputValue: mockSetInputValue,
  handleSendRequest: mockHandleSendRequest,
  userData: {
    messageCount: 4,
    tokensUsedThisMonth: 5000,
    role: "patient",
  },
};

// Free user - out of monthly tokens
export const OutOfMonthlyTokens = Template.bind({});
OutOfMonthlyTokens.args = {
  inputValue: "",
  setInputValue: mockSetInputValue,
  handleSendRequest: mockHandleSendRequest,
  userData: {
    messageCount: 2,
    tokensUsedThisMonth: 10000,
    role: "patient",
  },
};

// Paid user - normal usage
export const PaidUser = Template.bind({});
PaidUser.decorators = [
  (Story) => (
    <MemoryRouter>
      <AuthContext.Provider
        value={{ subscription: { status: "active" }, user: null }}
      >
        <Story />
      </AuthContext.Provider>
    </MemoryRouter>
  ),
];
PaidUser.args = {
  inputValue: "Hello",
  setInputValue: mockSetInputValue,
  handleSendRequest: mockHandleSendRequest,
  userData: {
    messageCount: 10,
    tokensUsedThisMonth: 50000,
    role: "professional",
  },
};

// Paid user - out of tokens
export const PaidUserOutOfTokens = Template.bind({});
PaidUserOutOfTokens.decorators = [
  (Story) => (
    <MemoryRouter>
      <AuthContext.Provider
        value={{ subscription: { status: "active" }, user: null }}
      >
        <Story />
      </AuthContext.Provider>
    </MemoryRouter>
  ),
];
PaidUserOutOfTokens.args = {
  inputValue: "",
  setInputValue: mockSetInputValue,
  handleSendRequest: mockHandleSendRequest,
  userData: {
    messageCount: 100,
    tokensUsedThisMonth: 500000,
    role: "professional",
  },
};
