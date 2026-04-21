import React from "react";
import PromotionButton from "../../components/dashboard/auction/PromotionButton";
import { AuthContext } from "../../context/Auth";

// Mock data for the AuthContext
const createMockContext = (promotionStatus = null) => ({
  user: { email: "test@example.com" },
  userData: {
    uid: "test-user-123",
    role: "facility",
    email: "test@example.com",
  },
  zipPromotions: promotionStatus
    ? {
        60601: { status: promotionStatus },
      }
    : {},
});

export default {
  title: "Auction/PromotionButton",
  component: PromotionButton,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    zipCode: {
      control: "text",
      description: "The ZIP code for the promotion",
    },
  },
};

// Template for the stories
const Template = (args) => {
  const contextValue = createMockContext(args.promotionStatus);
  return (
    <AuthContext.Provider value={contextValue}>
      <PromotionButton {...args} />
    </AuthContext.Provider>
  );
};

// Story with no promotion
export const NoPromotion = Template.bind({});
NoPromotion.args = {
  zipCode: "60601",
  promotionStatus: null,
};

// Story with pending promotion
export const PendingPromotion = Template.bind({});
PendingPromotion.args = {
  zipCode: "60601",
  promotionStatus: "pending",
};

// Story with invoiced promotion
export const InvoicedPromotion = Template.bind({});
InvoicedPromotion.args = {
  zipCode: "60601",
  promotionStatus: "invoiced",
};

// Story with active promotion
export const ActivePromotion = Template.bind({});
ActivePromotion.args = {
  zipCode: "60601",
  promotionStatus: "active",
};
