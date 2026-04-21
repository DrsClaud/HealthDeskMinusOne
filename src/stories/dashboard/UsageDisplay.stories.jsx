import UsageDisplay from "components/dashboard/account/UsageDisplay";
import { MemoryRouter } from "react-router-dom";

export default {
  title: "Dashboard/UsageDisplay",
  component: UsageDisplay,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

const Template = (args) => <UsageDisplay {...args} />;

// Free user - no usage
export const FreeNoUsage = Template.bind({});
FreeNoUsage.args = {
  userData: {
    messageCount: 0,
    tokensUsedThisMonth: 0,
    role: "patient",
    lastMessageReset: new Date(),
    lastTokenReset: new Date(),
  },
};

// Free user - light usage
export const FreeLightUsage = Template.bind({});
FreeLightUsage.args = {
  userData: {
    messageCount: 1,
    tokensUsedThisMonth: 2500,
    role: "patient",
    lastMessageReset: new Date(),
    lastTokenReset: new Date(),
  },
};

// Free user - moderate usage
export const FreeModerateUsage = Template.bind({});
FreeModerateUsage.args = {
  userData: {
    messageCount: 2,
    tokensUsedThisMonth: 5000,
    role: "patient",
    lastMessageReset: new Date(),
    lastTokenReset: new Date(),
  },
};

// Free user - heavy usage
export const FreeHeavyUsage = Template.bind({});
FreeHeavyUsage.args = {
  userData: {
    messageCount: 3,
    tokensUsedThisMonth: 7500,
    role: "patient",
    lastMessageReset: new Date(),
    lastTokenReset: new Date(),
  },
};

// Free user - at limit
export const FreeAtLimit = Template.bind({});
FreeAtLimit.args = {
  userData: {
    messageCount: 4,
    tokensUsedThisMonth: 10000,
    role: "patient",
    lastMessageReset: new Date(),
    lastTokenReset: new Date(),
  },
};

// Paid user - light usage
export const PaidLightUsage = Template.bind({});
PaidLightUsage.args = {
  userData: {
    messageCount: 10,
    tokensUsedThisMonth: 25000,
    role: "professional",
    lastMessageReset: new Date(),
    lastTokenReset: new Date(),
  },
  subscription: { status: "active" },
};

// Paid user - moderate usage
export const PaidModerateUsage = Template.bind({});
PaidModerateUsage.args = {
  userData: {
    messageCount: 50,
    tokensUsedThisMonth: 250000,
    role: "professional",
    lastMessageReset: new Date(),
    lastTokenReset: new Date(),
  },
  subscription: { status: "active" },
};

// Paid user - at limit
export const PaidAtLimit = Template.bind({});
PaidAtLimit.args = {
  userData: {
    messageCount: 100,
    tokensUsedThisMonth: 500000,
    role: "professional",
    lastMessageReset: new Date(),
    lastTokenReset: new Date(),
  },
  subscription: { status: "active" },
};
