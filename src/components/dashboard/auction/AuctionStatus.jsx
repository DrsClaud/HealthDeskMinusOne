import React, { useState, useEffect } from "react";
import { Box, Typography, Skeleton } from "@mui/material";
import { formatCurrency } from "./utils/formatUtils";
import { isAuctionEnded, getLastAuctionEndDate } from "utils/dateUtils";

// Main component for displaying auction status (current bid and bid count only)
const AuctionStatus = ({ auctionData = {}, isLoading }) => {
  if (
    isLoading ||
    !auctionData ||
    (!auctionData.currentBid && !auctionData.startingPrice)
  ) {
    return (
      <Box
        sx={{
          height: 76,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Skeleton variant="text" width={60} height={32} />
        <Skeleton variant="text" width={80} height={20} />
      </Box>
    );
  }

  // Check if there are any bids
  const hasBids = auctionData.numberOfBids > 0;

  // Display current bid if there are bids, otherwise show "No bids yet"
  const displayAmount = hasBids
    ? auctionData.currentBid
    : auctionData.startingPrice || 0;

  const amountInDollars = displayAmount / 100;

  // Check if auction has actually ended by comparing with actual endTime
  const isActuallyEnded = (() => {
    if (!auctionData?.endTime) return false;
    let endTime = auctionData.endTime;
    if (endTime?.toDate) endTime = endTime.toDate();
    if (!(endTime instanceof Date)) endTime = new Date(endTime);
    return new Date() > endTime;
  })();

  // Secondary text content
  const secondaryText = isActuallyEnded
    ? `Final bid: ${auctionData.numberOfBids} ${
        auctionData.numberOfBids === 1 ? "bid" : "bids"
      } placed`
    : hasBids
    ? `${auctionData.numberOfBids} ${
        auctionData.numberOfBids === 1 ? "bid" : "bids"
      } placed`
    : "Starting price";

  return (
    <Box
      sx={{
        height: 76,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Typography variant="h6" fontWeight="bold">
        {formatCurrency(amountInDollars)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {secondaryText}
      </Typography>
    </Box>
  );
};

export default AuctionStatus;
