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
  title: "Auction/ZipCodeTable Loading States",
  component: ZipCodeTable,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story, context) => {
      return (
        <ContextWrapper contextValue={context.args.contextValue}>
          <Story />
        </ContextWrapper>
      );
    },
  ],
};

// Template for the stories
const Template = (args) => <ZipCodeTable {...args} />;

// Story with all ZIP codes loading
export const AllZipsLoading = Template.bind({});
AllZipsLoading.args = {
  selectedZips: new Set(["60601", "60602", "60603"]),
  auctionData: {},
  loading: true,
  loadingZips: new Set(["60601", "60602", "60603"]),
  contextValue: createMockContext({
    promotionStatuses: {
      60601: { status: "active" },
      60602: { status: "active" },
      60603: { status: "active" },
    },
  }),
};

// Story with some ZIP codes loading and some loaded
export const PartialLoading = Template.bind({});
PartialLoading.args = {
  selectedZips: new Set(["60601", "60602", "60603", "60604", "60605"]),
  auctionData: {
    60601: {
      currentBid: 150000,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 3,
      bidHistory: [{ userId: "test-user-123", amount: 150000 }],
      lastBidder: "test-user-123",
    },
    60603: {
      currentBid: 200000,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 5,
      bidHistory: [{ userId: "other-user", amount: 200000 }],
      lastBidder: "other-user",
    },
    60605: {
      currentBid: null,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 0,
      bidHistory: [],
      lastBidder: null,
    },
  },
  loading: false,
  loadingZips: new Set(["60602", "60604"]),
  contextValue: createMockContext({
    promotionStatuses: {
      60601: { status: "active" },
      60602: { status: "active" },
      60603: { status: "active" },
      60604: { status: "pending" },
      60605: { status: "active" },
    },
  }),
};

// Story with transition from loading to loaded
export const LoadingTransition = Template.bind({});
LoadingTransition.storyName = "Loading → Loaded Transition";
LoadingTransition.args = {
  selectedZips: new Set(["60601", "60602", "60603"]),
  auctionData: {
    60601: {
      currentBid: 150000,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 3,
      bidHistory: [{ userId: "test-user-123", amount: 150000 }],
      lastBidder: "test-user-123",
    },
    60602: {
      currentBid: 180000,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 4,
      bidHistory: [{ userId: "other-user", amount: 180000 }],
      lastBidder: "other-user",
    },
    60603: {
      currentBid: null,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 0,
      bidHistory: [],
      lastBidder: null,
    },
  },
  loading: false,
  loadingZips: new Set(["60601", "60602", "60603"]),
  contextValue: createMockContext({
    promotionStatuses: {
      60601: { status: "active" },
      60602: { status: "active" },
      60603: { status: "active" },
    },
  }),
  play: async ({ canvasElement, args }) => {
    // This will simulate the loading state transitioning to loaded after 2 seconds
    setTimeout(() => {
      args.loadingZips = new Set([]);
      // Force a re-render
      document.querySelector("button")?.click();
    }, 2000);
  },
};

// Story with very long values to test overflow
export const LongValuesTest = Template.bind({});
LongValuesTest.args = {
  selectedZips: new Set(["60601", "60602", "60603"]),
  auctionData: {
    60601: {
      currentBid: 9999999999, // Very large bid
      startingPrice: 100000,
      endTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      status: "active",
      numberOfBids: 999,
      bidHistory: [{ userId: "test-user-123", amount: 9999999999 }],
      lastBidder: "test-user-123",
    },
    60602: {
      currentBid: 180000,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 4,
      bidHistory: [{ userId: "other-user", amount: 180000 }],
      lastBidder: "other-user",
    },
    60603: {
      currentBid: null,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 0,
      bidHistory: [],
      lastBidder: null,
    },
  },
  loading: false,
  loadingZips: new Set([]),
  contextValue: createMockContext({
    promotionStatuses: {
      60601: { status: "active" },
      60602: { status: "active" },
      60603: { status: "active" },
    },
  }),
};

// Story with alternating loading states
export const AlternatingLoadingStates = Template.bind({});
AlternatingLoadingStates.args = {
  selectedZips: new Set(["60601", "60602", "60603", "60604", "60605"]),
  auctionData: {
    60601: {
      currentBid: 150000,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 3,
      bidHistory: [{ userId: "test-user-123", amount: 150000 }],
      lastBidder: "test-user-123",
    },
    60602: {
      currentBid: 180000,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 4,
      bidHistory: [{ userId: "other-user", amount: 180000 }],
      lastBidder: "other-user",
    },
    60603: {
      currentBid: 200000,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 5,
      bidHistory: [{ userId: "test-user-123", amount: 200000 }],
      lastBidder: "test-user-123",
    },
    60604: {
      currentBid: 220000,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 6,
      bidHistory: [{ userId: "other-user", amount: 220000 }],
      lastBidder: "other-user",
    },
    60605: {
      currentBid: null,
      startingPrice: 100000,
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "active",
      numberOfBids: 0,
      bidHistory: [],
      lastBidder: null,
    },
  },
  loading: false,
  loadingZips: new Set(["60602", "60604"]), // Every other ZIP is loading
  contextValue: createMockContext({
    promotionStatuses: {
      60601: { status: "active" },
      60602: { status: "active" },
      60603: { status: "active" },
      60604: { status: "active" },
      60605: { status: "active" },
    },
  }),
};
