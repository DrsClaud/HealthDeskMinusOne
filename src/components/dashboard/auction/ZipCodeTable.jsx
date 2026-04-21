import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../../../hooks/useAuth";
import { ZIP_CODES } from "./data/zipCodes";
import AuctionStatus from "./AuctionStatus";
import AuctionHeader from "./AuctionHeader";
import { formatInTimeZone } from "date-fns-tz";
import ActionButton from "./ActionButton";

const ZipCodeTable = ({
  selectedZips,
  auctionData = {},
  loading = false,
  loadingZips = new Set(),
}) => {
  const { userData, zipSubscriptions } = useAuth();
  const [userBids, setUserBids] = useState({});

  useEffect(() => {
    // Process auction data to determine user bids
    if (
      !selectedZips ||
      selectedZips.size === 0 ||
      !userData?.uid ||
      !auctionData
    ) {
      return;
    }

    const userBidsMap = {};

    // Check each auction to see if user has placed a bid
    Array.from(selectedZips).forEach((zipCode) => {
      const auction = auctionData[zipCode] || {};

      // Check if user has placed a bid
      const hasBid =
        auction.bidHistory &&
        auction.bidHistory.some((bid) => bid.bidderId === userData.uid);

      // Check if user is winning
      const isWinning = auction.lastBidder === userData.uid;

      userBidsMap[zipCode] = {
        hasBid,
        isWinning,
        amount: hasBid
          ? auction.bidHistory
              ?.filter((bid) => bid.bidderId === userData.uid)
              ?.sort((a, b) => b.timestamp - a.timestamp)?.[0]?.amount
          : null,
      };
    });

    setUserBids(userBidsMap);
  }, [selectedZips, userData?.uid, auctionData]);

  if (!selectedZips || selectedZips.size === 0) {
    return null;
  }

  return (
    <>
      <AuctionHeader auctionData={auctionData} selectedZips={selectedZips} />
      <TableContainer component={Paper} sx={{ my: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: "20%" }}>ZIP Code</TableCell>
              <TableCell sx={{ width: "30%" }}>Your Status</TableCell>
              <TableCell sx={{ width: "20%", minWidth: 150 }}>
                Current Auction
              </TableCell>
              <TableCell sx={{ width: "30%", minWidth: 200 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from(selectedZips).map((zipCode) => {
              // Try to get ZIP data from our static data first, then check dynamic data
              const zipData = ZIP_CODES[zipCode];
              const auction = auctionData[zipCode] || {};
              const userBidData = userBids[zipCode] || {
                hasBid: false,
                isWinning: false,
              };

              return (
                <TableRow key={zipCode}>
                  <TableCell sx={{ width: "20%" }}>
                    <Typography variant="body1" fontWeight="bold">
                      {zipCode}
                    </Typography>
                    {zipData && (
                      <Typography variant="body2" color="text.secondary">
                        {zipData.city && zipData.state
                          ? `${zipData.city}, ${zipData.state}`
                          : zipData.state || ""}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ width: "30%" }}>
                    <ActionButton
                      zipCode={zipCode}
                      auction={auction}
                      userBidData={userBidData}
                      onBidPlaced={(amount) => {
                        setUserBids((prev) => ({
                          ...prev,
                          [zipCode]: {
                            hasBid: true,
                            isWinning: true,
                            amount: amount,
                          },
                        }));
                      }}
                      displayMode="status"
                    />
                  </TableCell>
                  <TableCell sx={{ width: "20%", minWidth: 150 }}>
                    <AuctionStatus
                      auctionData={auction}
                      isLoading={
                        loadingZips.has(zipCode) ||
                        (!auction.currentBid && !auction.startingPrice)
                      }
                    />
                  </TableCell>
                  <TableCell sx={{ width: "30%", minWidth: 200 }}>
                    {loadingZips.has(zipCode) ? (
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <ActionButton
                        zipCode={zipCode}
                        auction={auction}
                        userBidData={userBidData}
                        onBidPlaced={(amount) => {
                          setUserBids((prev) => ({
                            ...prev,
                            [zipCode]: {
                              hasBid: true,
                              isWinning: true,
                              amount: amount,
                            },
                          }));
                        }}
                        displayMode="action"
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default ZipCodeTable;
