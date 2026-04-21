import React from "react";
import BidButton from "../../components/dashboard/auction/BidButton";
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
  title: "Auction/BidButton",
  component: BidButton,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    zipCode: {
      control: "text",
      description: "The ZIP code for the bid",
    },
    disabled: {
      control: "boolean",
      description: "Whether the button is disabled",
    },
    hasBid: {
      control: "boolean",
      description: "Whether the user has already placed a bid",
    },
    isWinning: {
      control: "boolean",
      description: "Whether the user is currently winning the auction",
    },
    currentBid: {
      control: "number",
      description: "Current bid amount in cents",
    },
  },
};

// Template for the stories
const Template = (args) => {
  const contextValue = createMockContext(args.promotionStatus);
  return (
    <AuthContext.Provider value={contextValue}>
      <BidButton {...args} />
    </AuthContext.Provider>
  );
};

// Story with active promotion (can bid)
export const CanBid = Template.bind({});
CanBid.args = {
  zipCode: "60601",
  disabled: false,
  hasBid: false,
  isWinning: false,
  currentBid: 100000, // $1000.00
  promotionStatus: "active",
  auctionData: {
    currentBid: 100000,
    startingPrice: 100000,
    numberOfBids: 0,
    bidHistory: [],
  },
};

// Story with no promotion (cannot bid)
export const NeedPromotion = Template.bind({});
NeedPromotion.args = {
  zipCode: "60601",
  disabled: true,
  hasBid: false,
  isWinning: false,
  currentBid: 100000,
  promotionStatus: null,
  auctionData: {
    currentBid: 100000,
    startingPrice: 100000,
    numberOfBids: 0,
    bidHistory: [],
  },
};

// Story with pending promotion (cannot bid yet)
export const PendingPromotion = Template.bind({});
PendingPromotion.args = {
  zipCode: "60601",
  disabled: false,
  hasBid: false,
  isWinning: false,
  currentBid: 100000,
  promotionStatus: "pending",
  auctionData: {
    currentBid: 100000,
    startingPrice: 100000,
    numberOfBids: 0,
    bidHistory: [],
  },
};

// Story where user has already bid and is winning
export const WinningBid = Template.bind({});
WinningBid.args = {
  zipCode: "60601",
  hasBid: true,
  isWinning: true,
  currentBid: 150000, // $1500.00
  promotionStatus: "active",
  auctionData: {
    currentBid: 150000,
    startingPrice: 100000,
    numberOfBids: 3,
    bidHistory: [{ userId: "test-user-123", amount: 150000 }],
  },
};

// Story where user has already bid but is not winning
export const NotWinningBid = Template.bind({});
NotWinningBid.args = {
  zipCode: "60601",
  hasBid: true,
  isWinning: false,
  currentBid: 200000, // $2000.00
  promotionStatus: "active",
  auctionData: {
    currentBid: 200000,
    startingPrice: 100000,
    numberOfBids: 4,
    bidHistory: [
      { userId: "test-user-123", amount: 150000 },
      { userId: "other-user", amount: 200000 },
    ],
  },
};

// Story with existing bids (higher minimum bid)
export const WithExistingBids = Template.bind({});
WithExistingBids.args = {
  zipCode: "60601",
  disabled: false,
  hasBid: false,
  isWinning: false,
  currentBid: 200000, // $2000.00
  promotionStatus: "active",
  auctionData: {
    currentBid: 200000,
    startingPrice: 100000,
    numberOfBids: 2,
    bidHistory: [
      { userId: "other-user-1", amount: 150000 },
      { userId: "other-user-2", amount: 200000 },
    ],
  },
};
