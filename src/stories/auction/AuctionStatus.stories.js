import React from "react";
import AuctionStatus, {
  TimeRemaining,
  CurrentBid,
} from "../../components/dashboard/auction/AuctionStatus";
import { AuthContext } from "../../context/Auth";
import { Box } from "@mui/material";
import { addSeconds } from "date-fns";

// Mock data for the AuthContext
const createMockContext = (isWinning = false) => ({
  user: { email: "test@example.com" },
  userData: {
    uid: isWinning ? "test-user-123" : "other-user-456",
    role: "facility",
    email: "test@example.com",
  },
});

export default {
  title: "Auction/AuctionStatus",
  component: AuctionStatus,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    zipCode: {
      control: "text",
      description: "The ZIP code for the auction",
    },
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 300, p: 2, border: "1px solid #eee", borderRadius: 2 }}>
        <Story />
      </Box>
    ),
  ],
};

// Template for the stories
const Template = (args) => {
  const contextValue = createMockContext(args.isWinning);
  return (
    <AuthContext.Provider value={contextValue}>
      <AuctionStatus {...args} />
    </AuthContext.Provider>
  );
};

const TimeRemainingTemplate = (args) => <TimeRemaining {...args} />;
const CurrentBidTemplate = (args) => <CurrentBid {...args} />;

// Story for countdown circle (45 seconds remaining)
export const CountdownCircle45Seconds = TimeRemainingTemplate.bind({});
CountdownCircle45Seconds.args = {
  auctionData: {
    endTime: addSeconds(new Date(), 45), // 45 seconds from now
    status: "active",
  },
};

// Story for countdown circle (30 seconds remaining - orange)
export const CountdownCircle30Seconds = TimeRemainingTemplate.bind({});
CountdownCircle30Seconds.args = {
  auctionData: {
    endTime: addSeconds(new Date(), 30), // 30 seconds from now
    status: "active",
  },
};

// Story for countdown circle (10 seconds remaining - red)
export const CountdownCircle10Seconds = TimeRemainingTemplate.bind({});
CountdownCircle10Seconds.args = {
  auctionData: {
    endTime: addSeconds(new Date(), 10), // 10 seconds from now
    status: "active",
  },
};

// Story for countdown circle (59 seconds remaining)
export const CountdownCircle59Seconds = TimeRemainingTemplate.bind({});
CountdownCircle59Seconds.args = {
  auctionData: {
    endTime: addSeconds(new Date(), 59), // 59 seconds from now
    status: "active",
  },
};

// Story for full auction status with countdown
export const AuctionWithCountdown = Template.bind({});
AuctionWithCountdown.args = {
  auctionData: {
    currentBid: 150000,
    startingPrice: 100000,
    endTime: addSeconds(new Date(), 45), // 45 seconds from now
    status: "active",
    numberOfBids: 3,
    bidHistory: [{ userId: "test-user-123", amount: 150000 }],
    lastBidder: "test-user-123",
  },
};

// Story for full auction status with no bids
export const AuctionWithNoBids = Template.bind({});
AuctionWithNoBids.args = {
  auctionData: {
    startingPrice: 100000,
    endTime: addSeconds(new Date(), 30), // 30 seconds from now
    status: "active",
    numberOfBids: 0,
    bidHistory: [],
  },
};

// Story for loading state
export const Loading = Template.bind({});
Loading.args = {
  isLoading: true,
};
