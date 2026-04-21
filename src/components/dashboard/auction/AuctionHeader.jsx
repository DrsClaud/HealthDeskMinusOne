import React, { useState, useEffect } from "react";
import { Box, Typography, Alert } from "@mui/material";
import { AccessTime, Schedule } from "@mui/icons-material";
import { format, setDate, setHours, setMinutes, setSeconds } from "date-fns";
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
} from "date-fns";
import {
  getNextAuctionEndDate,
  getLastAuctionEndDate,
  getPostAuctionDisplayDuration,
} from "../../../utils/dateUtils";
import CountdownCircle from "./CountdownCircle";

// Helper function to get the base auction end time for the current auction cycle
const getBaseAuctionEndTime = (auctionEndTime) => {
  // Calculate what the "natural" end time should be for this auction
  // by finding the quarter-hour boundary that this auction belongs to
  const isProduction = process.env.REACT_APP_ENVIRONMENT === "production";

  let baseTime;

  if (isProduction) {
    // Production: Monthly cycle (15th at 2PM)
    // Extract the month/year from auction end time and set to 15th at 2PM
    baseTime = setHours(
      setMinutes(setSeconds(setDate(auctionEndTime, 15), 0), 0),
      14
    );
  } else {
    // Test/Sandbox: Find the quarter-hour boundary this auction should end at
    // Round DOWN the auction end time to the nearest quarter-hour
    const endTime = new Date(auctionEndTime);
    const minutes = endTime.getMinutes();
    const quarterHour = Math.floor(minutes / 15) * 15;

    baseTime = new Date(endTime);
    baseTime.setMinutes(quarterHour);
    baseTime.setSeconds(0);
    baseTime.setMilliseconds(0);
  }

  return baseTime;
};

const AuctionHeader = ({ auctionData = {}, selectedZips = new Set() }) => {
  const [displayText, setDisplayText] = useState("");
  const [isExtended, setIsExtended] = useState(false);
  const [isPostAuction, setIsPostAuction] = useState(false);
  const [urgentCountdown, setUrgentCountdown] = useState(null);

  useEffect(() => {
    if (selectedZips.size === 0) return;

    const updateDisplay = () => {
      const now = new Date();

      // Get timing info
      const lastAuctionEndTime = getLastAuctionEndDate();
      const nextAuctionEndTime = getNextAuctionEndDate();
      const postAuctionDisplayMinutes = getPostAuctionDisplayDuration();

      // Calculate when the processing period ends
      const processingEndTime = new Date(lastAuctionEndTime);
      processingEndTime.setMinutes(
        processingEndTime.getMinutes() + postAuctionDisplayMinutes
      );

      // Are we in the post-auction processing period?
      const inProcessingPeriod =
        now > lastAuctionEndTime && now < processingEndTime;

      // Check auction statuses for selected auctions
      const selectedAuctions = Array.from(selectedZips)
        .map((zipCode) => auctionData[zipCode])
        .filter(Boolean);

      const hasEndedAuctions = selectedAuctions.some(
        (auction) => auction?.status === "ended"
      );

      // Check if any auctions have extensions beyond the official time
      const hasExtensions = selectedAuctions.some((auction) => {
        if (!auction?.endTime) return false;
        let endTime = auction.endTime;
        if (endTime?.toDate) endTime = endTime.toDate();
        if (!(endTime instanceof Date)) endTime = new Date(endTime);

        // Get the base auction end time for this specific auction
        const baseEndTime = getBaseAuctionEndTime(endTime);

        // Extension if auction endTime is more than 30 seconds past base time
        const extensionMs = endTime.getTime() - baseEndTime.getTime();
        return extensionMs > 30 * 1000; // 30 second buffer for clock differences
      });
      setIsExtended(hasExtensions);

      // State 1: Auction has ended (either in processing period or backend marked as ended)
      if (inProcessingPeriod || hasEndedAuctions) {
        setIsPostAuction(true);
        setUrgentCountdown(null);

        const minutesUntilNextAuction = Math.ceil(
          (processingEndTime.getTime() - now.getTime()) / (60 * 1000)
        );

        const timeText =
          minutesUntilNextAuction <= 0
            ? "shortly"
            : `in ${minutesUntilNextAuction} minute${
                minutesUntilNextAuction === 1 ? "" : "s"
              }`;

        setDisplayText(
          `This auction has ended. Winners are being processed and will be billed shortly. The next auction begins ${timeText}.`
        );
        return;
      }

      // State 2: Active auction - countdown to next auction end time
      setIsPostAuction(false);

      // Show urgent countdown when within 60 seconds of auction end
      const secondsUntilEnd = Math.floor(
        (nextAuctionEndTime.getTime() - now.getTime()) / 1000
      );
      if (secondsUntilEnd > 0 && secondsUntilEnd <= 60) {
        setUrgentCountdown(secondsUntilEnd);
      } else {
        setUrgentCountdown(null);
      }

      // Calculate time remaining until auction end
      const days = differenceInDays(nextAuctionEndTime, now);
      const hours = differenceInHours(nextAuctionEndTime, now) % 24;
      const minutes = differenceInMinutes(nextAuctionEndTime, now) % 60;
      const seconds = differenceInSeconds(nextAuctionEndTime, now) % 60;

      // Format display text based on time remaining
      if (days > 7) {
        const formattedDate = format(nextAuctionEndTime, "MMMM d 'at' h:mm a");
        setDisplayText(
          `This auction ends ${formattedDate} (${days} days left).`
        );
      } else if (days > 0) {
        const formattedDate = format(nextAuctionEndTime, "MMMM d 'at' h:mm a");
        setDisplayText(
          `This auction ends in ${days} day${
            days === 1 ? "" : "s"
          } (${formattedDate}).`
        );
      } else if (hours > 0) {
        setDisplayText(
          `This auction ends in ${hours} hour${
            hours === 1 ? "" : "s"
          } and ${minutes} minute${minutes === 1 ? "" : "s"}.`
        );
      } else if (minutes > 0) {
        setDisplayText(
          `This auction ends in ${minutes} minute${
            minutes === 1 ? "" : "s"
          } and ${seconds} second${seconds === 1 ? "" : "s"}.`
        );
      } else {
        setDisplayText(
          `This auction ends in ${seconds} second${seconds === 1 ? "" : "s"}.`
        );
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);

    return () => clearInterval(interval);
  }, [auctionData, selectedZips]);

  if (selectedZips.size === 0 || !displayText) return null;

  return (
    <Alert
      severity={isPostAuction ? "success" : "info"}
      icon={<AccessTime />}
      sx={{
        mb: 2,
        "& .MuiAlert-message": {
          width: "100%",
        },
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        <Typography variant="body1" sx={{ fontWeight: "medium" }}>
          {displayText}
        </Typography>
        {isExtended && !isPostAuction && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 2 }}>
            <Schedule fontSize="small" color="info" />
            <Typography
              variant="body2"
              color="info.main"
              sx={{ fontWeight: "medium" }}
            >
              Some auctions extended due to last-minute bidding.
            </Typography>
          </Box>
        )}
      </Box>
    </Alert>
  );
};

export default AuctionHeader;
