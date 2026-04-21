import React from "react";
import { TimeRemaining } from "../../components/dashboard/auction/AuctionStatus";
import { Box } from "@mui/material";

export default {
  title: "Auction/TimeRemaining",
  component: TimeRemaining,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 250, p: 2, border: "1px solid #eee", borderRadius: 2 }}>
        <Story />
      </Box>
    ),
  ],
};

// Template for the stories
const Template = (args) => <TimeRemaining {...args} />;

// Story for days remaining
export const DaysRemaining = Template.bind({});
DaysRemaining.args = {
  auctionData: {
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    status: "active",
  },
};

// Story for hours remaining
export const HoursRemaining = Template.bind({});
HoursRemaining.args = {
  auctionData: {
    endTime: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours from now
    status: "active",
  },
};

// Story for minutes remaining
export const MinutesRemaining = Template.bind({});
MinutesRemaining.args = {
  auctionData: {
    endTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    status: "active",
  },
};

// Story for countdown circle (45 seconds remaining)
export const CountdownCircle45Seconds = Template.bind({});
CountdownCircle45Seconds.args = {
  auctionData: {
    endTime: new Date(Date.now() + 45 * 1000), // 45 seconds from now
    status: "active",
  },
};

// Story for countdown circle (30 seconds remaining - orange)
export const CountdownCircle30Seconds = Template.bind({});
CountdownCircle30Seconds.args = {
  auctionData: {
    endTime: new Date(Date.now() + 30 * 1000), // 30 seconds from now
    status: "active",
  },
};

// Story for countdown circle (10 seconds remaining - red)
export const CountdownCircle10Seconds = Template.bind({});
CountdownCircle10Seconds.args = {
  auctionData: {
    endTime: new Date(Date.now() + 10 * 1000), // 10 seconds from now
    status: "active",
  },
};

// Story for auction ended
export const AuctionEnded = Template.bind({});
AuctionEnded.args = {
  auctionData: {
    endTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    status: "ended",
  },
};

// Story for loading state
export const Loading = Template.bind({});
Loading.args = {
  isLoading: true,
};

// Story for invalid date
export const InvalidDate = Template.bind({});
InvalidDate.args = {
  auctionData: {
    endTime: "not-a-date",
    status: "active",
  },
};

// Story for no end time
export const NoEndTime = Template.bind({});
NoEndTime.args = {
  auctionData: {
    status: "active",
  },
};

// Story with dynamic countdown (will show real-time countdown)
export const DynamicCountdown = Template.bind({});
DynamicCountdown.args = {
  auctionData: {
    endTime: new Date(Date.now() + 65 * 1000), // 65 seconds from now
    status: "active",
  },
};
DynamicCountdown.parameters = {
  docs: {
    description: {
      story:
        'This story shows a real-time countdown that will transition from "1m 5s" to the countdown circle when 60 seconds remain.',
    },
  },
};
