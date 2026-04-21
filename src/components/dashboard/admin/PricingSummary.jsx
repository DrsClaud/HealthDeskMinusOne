import React from "react";
import { Box, Typography, Divider } from "@mui/material";

/**
 * PricingSummary - Consistent pricing display for seat changes
 */
const PricingSummary = ({
  currentSeats,
  newSeats,
  pricePerSeat,
  interval = "monthly",
}) => {
  const seatDifference = newSeats - currentSeats;
  const isAdding = seatDifference > 0;
  const intervalLabel = interval === "yearly" ? "yr" : "mo";
  const proratedAmount = Math.abs(seatDifference) * pricePerSeat;
  const newTotalPerCycle = newSeats * pricePerSeat;

  if (seatDifference === 0) {
    return null;
  }

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
        Summary
      </Typography>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {isAdding
            ? `Adding ${Math.abs(seatDifference)} seat${
                Math.abs(seatDifference) === 1 ? "" : "s"
              }`
            : `Removing ${Math.abs(seatDifference)} seat${
                Math.abs(seatDifference) === 1 ? "" : "s"
              }`}
        </Typography>
        <Typography
          variant="body2"
          fontWeight={600}
          color={isAdding ? "primary.main" : "success.main"}
        >
          {isAdding ? "+" : "-"}${proratedAmount}/{intervalLabel}
        </Typography>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 1.5,
        }}
      >
        <Box>
          <Typography variant="body2" fontWeight={600}>
            Total Due Today
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isAdding
              ? "Prorated for this billing period"
              : "Credit applied to next cycle"}
          </Typography>
        </Box>
        <Typography variant="h6" fontWeight={600}>
          {isAdding ? `$${proratedAmount.toFixed(2)}` : "$0.00"}
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary">
        Starting next billing cycle, you'll pay ${newTotalPerCycle.toFixed(2)}/
        {intervalLabel}.
      </Typography>
    </Box>
  );
};

export default PricingSummary;
