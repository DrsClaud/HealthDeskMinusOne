import React, { useEffect, useState } from "react";
import ZipCodeTable from "../../components/dashboard/auction/ZipCodeTable";
import { AuthContext } from "../../context/Auth";
import { BrowserRouter } from "react-router-dom";
import { Box, Button, Typography, Paper } from "@mui/material";
import { addMinutes, addSeconds } from "date-fns";

// Mock Firebase functions
// This needs to happen BEFORE any components that use firebase are imported
import firebase from "firebase/compat/app";

// Create a mock implementation of firebase.functions()
const mockHttpsCallable = (functionName) => {
  if (functionName === "placeBid") {
    return (data) => {
      console.log("Mock placeBid called with:", data);

      // If our mock function handler is set up, use it
      if (mockFirebaseFunctions.placeBid.call) {
        return mockFirebaseFunctions.placeBid.call(data);
      }

      // Otherwise return a simple success response
      return Promise.resolve({ data: { success: true } });
    };
  }
  return () => Promise.resolve({ data: {} });
};

// Set up the mock for firebase.functions()
firebase.functions = () => ({
  httpsCallable: mockHttpsCallable,
});

// Mock Firebase functions container
const mockFirebaseFunctions = {
  placeBid: {
    call: null,
  },
};

// No need to import or mock firebase/functions
// We'll just create our own mock function

// Create mock context for the story
const createMockContext = () => ({
  user: {
    email: "user@example.com",
    uid: "user-123",
    displayName: "Test User",
    isAnonymous: false,
  },
  userData: {
    uid: "user-123",
    role: "facility",
    email: "user@example.com",
  },
  zipPromotions: {
    60601: { status: "active" },
    60602: { status: "active" },
    60603: { status: "active" },
    60604: { status: "active" },
    60605: { status: "active" },
  },
  zipSubscriptions: {
    60601: {
      status: "active",
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    60604: {
      status: "active",
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    },
  },
  // Add these authentication-related properties
  isAuthenticated: true,
  isLoading: false,
  isAdmin: false,
});

// Context wrapper for the stories
const ContextWrapper = ({ children, contextValue }) => (
  <BrowserRouter>
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  </BrowserRouter>
);

export default {
  title: "Auction/Live Auction Scenario",
  component: ZipCodeTable,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story, context) => (
      <Box sx={{ p: 3 }}>
        <ContextWrapper contextValue={createMockContext()}>
          <Story {...context.args} />
        </ContextWrapper>
      </Box>
    ),
  ],
};

// Create the LiveAuction story
export const LiveAuction = () => {
  // Set up opponent bidders
  const opponents = [
    {
      id: "opponent-1",
      name: "BidMaster",
      email: "bid.master@example.com",
      aggressiveness: 0.7,
    },
    {
      id: "opponent-2",
      name: "AuctionPro",
      email: "auction.pro@example.com",
      aggressiveness: 0.5,
    },
    {
      id: "opponent-3",
      name: "ZipBidder",
      email: "zip.bidder@example.com",
      aggressiveness: 0.3,
    },
  ];

  // Set up selected ZIP codes
  const selectedZips = new Set(["60601", "60602", "60603", "60604", "60605"]);

  // Initialize auction data
  const [auctionData, setAuctionData] = useState({
    60601: {
      // User is winning this one
      currentBid: 180000, // $1,800
      startingPrice: 100000,
      endTime: addMinutes(new Date(), 1), // 1 minute from now
      status: "active",
      numberOfBids: 4,
      bidHistory: [
        { userId: "opponent-2", amount: 120000, bidderId: "opponent-2" },
        { userId: "opponent-1", amount: 150000, bidderId: "opponent-1" },
        { userId: "user-123", amount: 180000, bidderId: "user-123" },
      ],
      lastBidder: "user-123",
    },
    60602: {
      // User is not winning this one
      currentBid: 220000, // $2,200
      startingPrice: 100000,
      endTime: addSeconds(new Date(), 90), // 90 seconds from now
      status: "active",
      numberOfBids: 5,
      bidHistory: [
        { userId: "opponent-3", amount: 150000, bidderId: "opponent-3" },
        { userId: "user-123", amount: 180000, bidderId: "user-123" },
        { userId: "opponent-1", amount: 220000, bidderId: "opponent-1" },
      ],
      lastBidder: "opponent-1",
    },
    60603: {
      // No bids yet
      currentBid: null,
      startingPrice: 100000,
      endTime: addMinutes(new Date(), 2), // 2 minutes from now
      status: "active",
      numberOfBids: 0,
      bidHistory: [],
      lastBidder: null,
    },
    60604: {
      // About to end very soon
      currentBid: 120000, // $1,200
      startingPrice: 100000,
      endTime: addSeconds(new Date(), 30), // 30 seconds from now
      status: "active",
      numberOfBids: 1,
      bidHistory: [
        { userId: "opponent-2", amount: 120000, bidderId: "opponent-2" },
      ],
      lastBidder: "opponent-2",
    },
    60605: {
      // Auction ended
      currentBid: 250000, // $2,500
      startingPrice: 100000,
      endTime: new Date(Date.now() - 60 * 1000), // 1 minute ago
      status: "ended",
      numberOfBids: 6,
      bidHistory: [
        { userId: "opponent-1", amount: 200000, bidderId: "opponent-1" },
        { userId: "user-123", amount: 250000, bidderId: "user-123" },
      ],
      lastBidder: "user-123",
      winnerId: "user-123",
      winnerEmail: "user@example.com",
      winningBid: 250000,
      hasWinner: true,
    },
  });

  const [loadingZips, setLoadingZips] = useState(new Set());
  const [bidActivity, setBidActivity] = useState([]);

  // Function to simulate a bid from an opponent
  const opponentBid = (zipCode, incrementAmount = 30000) => {
    setLoadingZips((prev) => new Set([...prev, zipCode]));

    setTimeout(() => {
      setAuctionData((prev) => {
        const auction = prev[zipCode];
        if (!auction || auction.status !== "active") return prev;

        // Select a random opponent
        const opponent =
          opponents[Math.floor(Math.random() * opponents.length)];

        // Calculate new bid amount (outbid by $300 or more)
        const currentAmount = auction.currentBid || auction.startingPrice;
        const newAmount = currentAmount + incrementAmount;

        // Update bid history
        const updatedBidHistory = [
          ...(auction.bidHistory || []),
          { userId: opponent.id, amount: newAmount, bidderId: opponent.id },
        ];

        // Add to activity log
        setBidActivity((prev) => [
          {
            time: new Date(),
            action: "bid",
            amount: newAmount,
            zipCode,
            bidder: opponent.name,
          },
          ...prev.slice(0, 9), // Keep only last 10 activities
        ]);

        // Only extend time if less than 1 minute remaining
        const now = new Date();
        const endTime = new Date(auction.endTime);
        const timeRemainingMs = endTime - now;
        const ONE_MINUTE_MS = 60 * 1000;

        // If less than 1 minute remaining, extend by 1 minute
        let newEndTime = new Date(auction.endTime);
        if (timeRemainingMs < ONE_MINUTE_MS) {
          newEndTime.setMinutes(newEndTime.getMinutes() + 1);
        }

        return {
          ...prev,
          [zipCode]: {
            ...auction,
            currentBid: newAmount,
            numberOfBids: (auction.numberOfBids || 0) + 1,
            bidHistory: updatedBidHistory,
            lastBidder: opponent.id,
            endTime: newEndTime,
          },
        };
      });

      setLoadingZips((prev) => {
        const updated = new Set([...prev]);
        updated.delete(zipCode);
        return updated;
      });
    }, 1000 + Math.random() * 500); // Random delay between 1-1.5 seconds
  };

  // Setup bid timers
  useEffect(() => {
    // Handle automatic opponent bids
    const timers = [];

    // 60601 - Someone might outbid you soon
    timers.push(
      setTimeout(() => {
        if (auctionData["60601"].lastBidder === "user-123") {
          opponentBid("60601");
        }
      }, 20000)
    ); // After 20 seconds

    // 60602 - A bidding war
    timers.push(
      setTimeout(() => {
        opponentBid("60602", 20000);
      }, 10000)
    ); // After 10 seconds

    // 60603 - First bid will come in on this one
    timers.push(
      setTimeout(() => {
        opponentBid("60603", 10000);
      }, 15000)
    ); // After 15 seconds

    // 60604 - Last-second bid to create urgency
    timers.push(
      setTimeout(() => {
        opponentBid("60604", 40000);
      }, 22000)
    ); // After 22 seconds

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // Setup countdown timers to update auction status when time expires
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date();

      setAuctionData((prev) => {
        const updated = { ...prev };
        let changed = false;

        Object.keys(updated).forEach((zipCode) => {
          const auction = updated[zipCode];

          if (auction.status === "active" && new Date(auction.endTime) <= now) {
            updated[zipCode] = {
              ...auction,
              status: "ended",
              hasWinner: auction.lastBidder !== null,
              winnerId: auction.lastBidder || null,
              winnerEmail:
                auction.lastBidder === "user-123"
                  ? "user@example.com"
                  : opponents.find((o) => o.id === auction.lastBidder)?.email ||
                    "unknown",
              winningBid: auction.currentBid || auction.startingPrice,
            };

            // Add to activity log
            setBidActivity((prev) => [
              {
                time: now,
                action: "ended",
                zipCode,
                winner: updated[zipCode].winnerEmail,
              },
              ...prev.slice(0, 9),
            ]);

            changed = true;
          }
        });

        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Function to handle user bids from the UI
  const handleUserBid = (zipCode, amount) => {
    setLoadingZips((prev) => new Set([...prev, zipCode]));

    setTimeout(() => {
      setAuctionData((prev) => {
        const auction = prev[zipCode];
        if (!auction || auction.status !== "active") return prev;

        // Update bid history
        const updatedBidHistory = [
          ...(auction.bidHistory || []),
          { userId: "user-123", amount: amount, bidderId: "user-123" },
        ];

        // Add to activity log
        setBidActivity((prev) => [
          {
            time: new Date(),
            action: "bid",
            amount: amount,
            zipCode,
            bidder: "You",
          },
          ...prev.slice(0, 9),
        ]);

        // Only extend time if less than 1 minute remaining
        const now = new Date();
        const endTime = new Date(auction.endTime);
        const timeRemainingMs = endTime - now;
        const ONE_MINUTE_MS = 60 * 1000;

        // If less than 1 minute remaining, extend by 1 minute
        let newEndTime = new Date(auction.endTime);
        if (timeRemainingMs < ONE_MINUTE_MS) {
          newEndTime.setMinutes(newEndTime.getMinutes() + 1);
        }

        return {
          ...prev,
          [zipCode]: {
            ...auction,
            currentBid: amount,
            numberOfBids: (auction.numberOfBids || 0) + 1,
            bidHistory: updatedBidHistory,
            lastBidder: "user-123",
            endTime: newEndTime,
          },
        };
      });

      setLoadingZips((prev) => {
        const updated = new Set([...prev]);
        updated.delete(zipCode);
        return updated;
      });

      // There's a chance an opponent will quickly outbid you
      if (Math.random() > 0.6) {
        setTimeout(() => {
          opponentBid(zipCode, 20000 + Math.floor(Math.random() * 30000));
        }, 5000 + Math.random() * 8000);
      }
    }, 1500);
  };

  // Mock the Firebase functions call
  useEffect(() => {
    // Set up our mock implementation of the placeBid function
    mockFirebaseFunctions.placeBid.call = (data) => {
      const { zipCode, bidAmount } = data;

      // Process the bid in our local state
      handleUserBid(zipCode, bidAmount);

      // Return a successful response similar to what the real function would return
      return Promise.resolve({
        data: {
          success: true,
          auction: {
            zipCode: zipCode,
            currentBid: bidAmount,
            endTime: auctionData[zipCode]?.endTime,
            isWinning: true,
            numberOfBids: (auctionData[zipCode]?.numberOfBids || 0) + 1,
          },
        },
      });
    };

    // Clean up
    return () => {
      mockFirebaseFunctions.placeBid.call = null;
    };
  }, [auctionData]);

  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      <Box sx={{ flexGrow: 1 }}>
        <ZipCodeTable
          selectedZips={selectedZips}
          auctionData={auctionData}
          loadingZips={loadingZips}
        />
      </Box>

      <Paper sx={{ width: 300, p: 2, alignSelf: "flex-start" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Auction Activity
        </Typography>

        {bidActivity.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No activity yet. Try placing a bid!
          </Typography>
        ) : (
          bidActivity.map((activity, index) => (
            <Box
              key={index}
              sx={{
                mb: 1.5,
                pb: 1,
                borderBottom:
                  index < bidActivity.length - 1 ? "1px solid #eee" : "none",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                {activity.time.toLocaleTimeString()}
              </Typography>

              {activity.action === "bid" ? (
                <Typography variant="body2">
                  <strong>{activity.bidder}</strong> bid $
                  {(activity.amount / 100).toFixed(2)} on ZIP {activity.zipCode}
                </Typography>
              ) : activity.action === "ended" ? (
                <Typography variant="body2">
                  Auction for ZIP {activity.zipCode} ended. Winner:{" "}
                  {activity.winner}
                </Typography>
              ) : null}
            </Box>
          ))
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Instructions
          </Typography>
          <Typography variant="body2" paragraph>
            This is a simulated auction with opponents bidding against you. Try
            placing bids using the bid buttons and watch the auction activity
            unfold.
          </Typography>
          <Typography variant="body2">
            • ZIP 60601: You're currently winning
            <br />
            • ZIP 60602: Opponent is winning
            <br />
            • ZIP 60603: No bids yet
            <br />
            • ZIP 60604: Ending very soon
            <br />• ZIP 60605: Already ended (you won)
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
