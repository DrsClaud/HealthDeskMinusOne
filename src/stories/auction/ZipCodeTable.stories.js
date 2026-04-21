import React from "react";
import ZipCodeTable from "../../components/dashboard/auction/ZipCodeTable";
import { AuthContext } from "../../context/Auth";
import { BrowserRouter } from "react-router-dom";

// Mock the Firebase db module
import { db } from "../../services/firebase";

// Create a mock version of the db for our stories
const mockAuctionData = {
  currentBid: 150000,
  startingPrice: 100000,
  endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
  status: "active",
  numberOfBids: 3,
  bidHistory: [{ userId: "test-user-123", amount: 150000 }],
  lastBidder: "test-user-123",
};

// Mock the db.collection().doc().get() chain
db.collection = () => ({
  doc: () => ({
    get: () =>
      Promise.resolve({
        exists: true,
        data: () => mockAuctionData,
      }),
  }),
});

// Create different mock contexts for different scenarios
const createMockContext = (options = {}) => {
  const {
    isWinning = false,
    promotionStatuses = {},
    subscriptionStatuses = {},
  } = options;

  return {
    user: { email: "test@example.com" },
    userData: {
      uid: "test-user-123",
      role: "facility",
    },
    zipPromotions: promotionStatuses,
    zipSubscriptions: subscriptionStatuses,
  };
};

// Context wrapper for the stories
const ContextWrapper = ({ children, contextValue }) => (
  <BrowserRouter>
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  </BrowserRouter>
);

export default {
  title: "Auction/ZipCodeTable",
  component: ZipCodeTable,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story, context) => {
      // Create the auctionData object for all ZIP codes
      const auctionData = {};

      if (context.args.selectedZips && context.args.mockAuctionData) {
        Array.from(context.args.selectedZips).forEach((zipCode) => {
          auctionData[zipCode] = { ...context.args.mockAuctionData };
        });
      }

      // Override with specific ZIP data if provided
      if (context.args.auctionData) {
        Object.assign(auctionData, context.args.auctionData);
      }

      // Update the component props
      const updatedArgs = {
        ...context.args,
        auctionData: auctionData,
      };

      return (
        <ContextWrapper contextValue={context.args.contextValue}>
          <Story args={updatedArgs} />
        </ContextWrapper>
      );
    },
  ],
};

// Template for the stories
const Template = (args) => <ZipCodeTable {...args} />;

// Story with active promotions and winning bids
export const ActivePromotionsWinningBids = Template.bind({});
ActivePromotionsWinningBids.args = {
  selectedZips: new Set(["60601", "60602", "60603"]),
  contextValue: createMockContext({
    isWinning: true,
    promotionStatuses: {
      60601: { status: "active" },
      60602: { status: "active" },
      60603: { status: "active" },
    },
    subscriptionStatuses: {
      60601: {
        status: "active",
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    },
  }),
  mockAuctionData: {
    currentBid: 150000,
    startingPrice: 100000,
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    status: "active",
    numberOfBids: 3,
    bidHistory: [{ userId: "test-user-123", amount: 150000 }],
    lastBidder: "test-user-123",
  },
};

// Story with mixed promotion statuses
export const MixedPromotionStatuses = Template.bind({});
MixedPromotionStatuses.args = {
  selectedZips: new Set(["60601", "60602", "60603", "60604", "60605"]),
  contextValue: createMockContext({
    promotionStatuses: {
      60601: { status: "active" },
      60602: { status: "pending" },
      60603: { status: "invoiced" },
      // 60604 has no promotion
      60605: { status: "active" },
    },
  }),
  mockAuctionData: {
    currentBid: 120000,
    startingPrice: 100000,
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: "active",
    numberOfBids: 2,
    bidHistory: [{ userId: "other-user", amount: 120000 }],
    lastBidder: "other-user",
  },
};

// Story with no bids yet
export const NoBidsYet = Template.bind({});
NoBidsYet.args = {
  selectedZips: new Set(["60601", "60602", "60603"]),
  contextValue: createMockContext({
    promotionStatuses: {
      60601: { status: "active" },
      60602: { status: "active" },
      60603: { status: "active" },
    },
  }),
  mockAuctionData: {
    currentBid: null,
    startingPrice: 100000,
    endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    status: "active",
    numberOfBids: 0,
    bidHistory: [],
    lastBidder: null,
  },
};

// Story with user not winning
export const NotWinningBids = Template.bind({});
NotWinningBids.args = {
  selectedZips: new Set(["60601", "60602", "60603"]),
  contextValue: createMockContext({
    promotionStatuses: {
      60601: { status: "active" },
      60602: { status: "active" },
      60603: { status: "active" },
    },
  }),
  mockAuctionData: {
    currentBid: 250000,
    startingPrice: 100000,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "active",
    numberOfBids: 5,
    bidHistory: [
      { userId: "test-user-123", amount: 200000 },
      { userId: "other-user", amount: 250000 },
    ],
    lastBidder: "other-user",
  },
};

// Story with ending soon auctions
export const EndingSoonAuctions = Template.bind({});
EndingSoonAuctions.args = {
  selectedZips: new Set(["60601", "60602", "60603"]),
  contextValue: createMockContext({
    promotionStatuses: {
      60601: { status: "active" },
      60602: { status: "active" },
      60603: { status: "active" },
    },
  }),
  mockAuctionData: {
    currentBid: 180000,
    startingPrice: 100000,
    endTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    status: "active",
    numberOfBids: 4,
    bidHistory: [
      { userId: "test-user-123", amount: 150000 },
      { userId: "other-user", amount: 180000 },
    ],
    lastBidder: "other-user",
  },
};

// Story with many ZIP codes
export const ManyZipCodes = Template.bind({});
ManyZipCodes.args = {
  selectedZips: new Set([
    "60601",
    "60602",
    "60603",
    "60604",
    "60605",
    "60606",
    "60607",
    "60608",
    "60609",
    "60610",
    "60611",
    "60612",
    "60613",
    "60614",
    "60615",
  ]),
  contextValue: createMockContext({
    promotionStatuses: {
      60601: { status: "active" },
      60603: { status: "active" },
      60605: { status: "pending" },
      60607: { status: "invoiced" },
      60609: { status: "active" },
    },
  }),
  mockAuctionData: {
    currentBid: 150000,
    startingPrice: 100000,
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: "active",
    numberOfBids: 3,
    bidHistory: [{ userId: "other-user", amount: 150000 }],
    lastBidder: "other-user",
  },
};

// Story with no selected ZIP codes
export const NoSelectedZips = Template.bind({});
NoSelectedZips.args = {
  selectedZips: new Set([]),
  contextValue: createMockContext(),
};

// Story for ended auction that user won
export const EndedAuctionWon = Template.bind({});
EndedAuctionWon.args = {
  selectedZips: new Set(["60601", "60602", "60603"]),
  contextValue: createMockContext({
    promotionStatuses: {
      60601: { status: "active" },
      60602: { status: "active" },
      60603: { status: "active" },
    },
  }),
  mockAuctionData: {
    currentBid: 250000,
    startingPrice: 100000,
    endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    status: "ended",
    numberOfBids: 5,
    bidHistory: [
      { userId: "other-user", amount: 200000 },
      { userId: "test-user-123", amount: 250000 },
    ],
    lastBidder: "test-user-123",
    winnerId: "test-user-123",
    winnerEmail: "test@example.com",
    winningBid: 250000,
    hasWinner: true,
  },
};

// Story for ended auction that user lost
export const EndedAuctionLost = Template.bind({});
EndedAuctionLost.args = {
  selectedZips: new Set(["60601", "60602", "60603"]),
  contextValue: createMockContext({
    promotionStatuses: {
      60601: { status: "active" },
      60602: { status: "active" },
      60603: { status: "active" },
    },
  }),
  mockAuctionData: {
    currentBid: 300000,
    startingPrice: 100000,
    endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    status: "ended",
    numberOfBids: 6,
    bidHistory: [
      { userId: "test-user-123", amount: 250000 },
      { userId: "other-user", amount: 300000 },
    ],
    lastBidder: "other-user",
    winnerId: "other-user",
    winnerEmail: "winner@example.com",
    winningBid: 300000,
    hasWinner: true,
  },
};

// Story for multiple ZIP codes with mixed auction states
export const MixedAuctionStates = Template.bind({});
MixedAuctionStates.args = {
  selectedZips: new Set(["60601", "60602", "60603", "60604"]),
  contextValue: createMockContext({
    promotionStatuses: {
      60601: { status: "active" },
      60602: { status: "active" },
      60603: { status: "active" },
      60604: { status: "active" },
    },
  }),
  auctionData: {
    60601: {
      // Active auction user is winning
      currentBid: 150000,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 3,
      bidHistory: [{ userId: "test-user-123", amount: 150000 }],
      lastBidder: "test-user-123",
    },
    60602: {
      // Ended auction user won
      currentBid: 250000,
      startingPrice: 100000,
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: "ended",
      numberOfBids: 5,
      bidHistory: [{ userId: "test-user-123", amount: 250000 }],
      lastBidder: "test-user-123",
      winnerId: "test-user-123",
      winnerEmail: "test@example.com",
      winningBid: 250000,
      hasWinner: true,
    },
    60603: {
      // Ended auction user lost
      currentBid: 300000,
      startingPrice: 100000,
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: "ended",
      numberOfBids: 6,
      bidHistory: [
        { userId: "test-user-123", amount: 250000 },
        { userId: "other-user", amount: 300000 },
      ],
      lastBidder: "other-user",
      winnerId: "other-user",
      winnerEmail: "winner@example.com",
      winningBid: 300000,
      hasWinner: true,
    },
    60604: {
      // Active auction with no bids
      currentBid: null,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 0,
      bidHistory: [],
    },
  },
};
