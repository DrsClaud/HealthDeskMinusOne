import React from "react";
import AuctionHeader from "../../components/dashboard/auction/AuctionHeader";
import { addDays, addHours, addMinutes } from "date-fns";

export default {
  title: "AUCTION/AuctionHeader",
  component: AuctionHeader,
  decorators: [
    (Story) => (
      <div style={{ padding: "20px", maxWidth: "800px" }}>
        <Story />
      </div>
    ),
  ],
};

const Template = (args) => <AuctionHeader {...args} />;

// Mock auction data with different end times
const createMockAuctionData = (endTime) => ({
  12345: {
    endTime: endTime,
    status: "active",
    currentBid: 250000,
    numberOfBids: 3,
  },
  67890: {
    endTime: endTime,
    status: "active",
    currentBid: 180000,
    numberOfBids: 1,
  },
});

export const MoreThan7Days = Template.bind({});
MoreThan7Days.args = {
  selectedZips: new Set(["12345", "67890"]),
  auctionData: createMockAuctionData(addDays(new Date(), 15)),
};

export const Within7Days = Template.bind({});
Within7Days.args = {
  selectedZips: new Set(["12345", "67890"]),
  auctionData: createMockAuctionData(addDays(new Date(), 3)),
};

export const Within24Hours = Template.bind({});
Within24Hours.args = {
  selectedZips: new Set(["12345", "67890"]),
  auctionData: createMockAuctionData(addHours(new Date(), 8)),
};

export const LastFewMinutes = Template.bind({});
LastFewMinutes.args = {
  selectedZips: new Set(["12345", "67890"]),
  auctionData: createMockAuctionData(addMinutes(new Date(), 12)),
};

export const ExtendedAuction = Template.bind({});
ExtendedAuction.args = {
  selectedZips: new Set(["12345", "67890"]),
  auctionData: {
    12345: {
      endTime: addMinutes(new Date(), 3), // Extended auction - ends soon
      status: "active",
      currentBid: 250000,
      numberOfBids: 8,
    },
    67890: {
      endTime: addMinutes(new Date(), 5), // Another extended auction
      status: "active",
      currentBid: 180000,
      numberOfBids: 12,
    },
  },
};

export const JustEnded = Template.bind({});
JustEnded.args = {
  selectedZips: new Set(["12345", "67890"]),
  auctionData: {
    12345: {
      endTime: addMinutes(new Date(), -10), // Ended 10 minutes ago
      status: "ended",
      currentBid: 250000,
      numberOfBids: 8,
    },
    67890: {
      endTime: addMinutes(new Date(), -10), // Ended 10 minutes ago
      status: "ended",
      currentBid: 180000,
      numberOfBids: 12,
    },
  },
};

export const NoZipsSelected = Template.bind({});
NoZipsSelected.args = {
  selectedZips: new Set(),
  auctionData: {},
};
