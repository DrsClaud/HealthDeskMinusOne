import React, { useEffect, useState } from "react";
import { db } from "services/firebase";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  IconButton,
  FormHelperText,
  Button,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { AddRounded, RemoveRounded, CloseRounded } from "@mui/icons-material";
import { useAuth } from "hooks/useAuth";
import PricingSummary from "./PricingSummary";

/**
 * SeatManagementDialog - Dialog to add or remove seats from subscription
 */
const SeatManagementDialog = ({ open, onClose }) => {
  const { subscriptionData, organization } = useAuth();
  const [prices, setPrices] = useState({ monthly: null, yearly: null });
  const [loading, setLoading] = useState(true);
  const [seatCount, setSeatCount] = useState(1);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Store pricing info so it doesn't disappear during loading
  const [showPricing, setShowPricing] = React.useState(false);
  const [pricingInfo, setPricingInfo] = React.useState({
    currentSeats: 0,
    newSeats: 0,
  });

  const currentSeats = organization?.seats?.total || 0;
  const currentInterval =
    subscriptionData?.items?.[0]?.price?.recurring?.interval === "year"
      ? "yearly"
      : "monthly";
  const pricePerSeat =
    currentInterval === "yearly"
      ? prices.yearly?.amount || 0
      : prices.monthly?.amount || 0;

  // Read used seats from organization document (maintained by backend)
  const usedSeats = organization?.seats?.used || 0;

  // Reset to current values when dialog opens (not when data updates)
  const wasOpen = React.useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      // Dialog just opened
      setSeatCount(currentSeats);
      setError("");
      setSuccess("");
      wasOpen.current = true;
    } else if (open && wasOpen.current && seatCount < 1 && currentSeats > 0) {
      // If seat data arrives after dialog opens, hydrate once from org state.
      setSeatCount(currentSeats);
    } else if (!open && wasOpen.current) {
      // Dialog just closed
      wasOpen.current = false;
    }
  }, [open, currentSeats, seatCount]);

  // Load pricing from Firestore
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const plansSnapshot = await db
          .collection("plans")
          .where("active", "==", true)
          .where("role", "==", "admin")
          .get();

        const priceData = {};

        for (const doc of plansSnapshot.docs) {
          const pricesSnapshot = await db
            .collection("plans")
            .doc(doc.id)
            .collection("prices")
            .where("active", "==", true)
            .get();

          pricesSnapshot.forEach((priceDoc) => {
            const price = priceDoc.data();
            const interval = price.interval;
            const key = interval === "month" ? "monthly" : "yearly";

            priceData[key] = {
              id: priceDoc.id,
              amount: price.unit_amount / 100,
              interval: key,
            };
          });
        }

        setPrices(priceData);
      } catch (err) {
        console.error("Error loading pricing:", err);
        setError("Failed to load pricing.");
      } finally {
        setLoading(false);
      }
    };

    loadPricing();
  }, []);

  const handleUpdateSubscription = async () => {
    if (!seatCount || seatCount < 1) {
      setError("Please select at least 1 seat.");
      return;
    }

    if (seatCount === currentSeats) {
      onClose();
      return;
    }

    // Prevent reducing seats below used seats
    if (seatCount < usedSeats) {
      setError(
        `Cannot reduce to ${seatCount} seat${
          seatCount === 1 ? "" : "s"
        }. You currently have ${usedSeats} seat${
          usedSeats === 1 ? "" : "s"
        } in use (team members + pending invitations).`,
      );
      return;
    }

    setUpdateLoading(true);
    setError("");
    setSuccess("");

    try {
      // Call the updateSeatQuantity cloud function
      const functions = firebase.app().functions("us-central1");
      const updateSeatQuantity = functions.httpsCallable("updateSeatQuantity");

      const result = await updateSeatQuantity({ quantity: seatCount });

      if (result.data.success) {
        setSuccess(
          `Successfully updated to ${seatCount} seat${
            seatCount === 1 ? "" : "s"
          }.`,
        );
        setShowPricing(false); // Hide pricing summary on success
        setUpdateLoading(false);
      }
    } catch (err) {
      console.error("Error updating subscription:", err);
      setError(err.message || "Failed to update subscription.");
      setUpdateLoading(false);
    }
  };

  const hasChanges = seatCount !== currentSeats;

  // Update pricing info when changes occur
  React.useEffect(() => {
    if (hasChanges && pricePerSeat > 0) {
      setShowPricing(true);
      setPricingInfo({
        currentSeats,
        newSeats: seatCount,
      });
    } else {
      setShowPricing(false);
    }
  }, [hasChanges, pricePerSeat, currentSeats, seatCount]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add or Remove Seats</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          You currently have {currentSeats} seat{currentSeats === 1 ? "" : "s"}.
          Adjust below to add more seats or remove unused ones.
        </DialogContentText>

        {usedSeats > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            To reduce seats, first remove team members from the Team page.
          </Alert>
        )}

        {/* Add Seats Section with +/- controls on right */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Seats
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ${pricePerSeat}/{currentInterval === "yearly" ? "yr" : "mo"} each
            </Typography>
          </Box>

          {/* Stepper controls */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              onClick={() => setSeatCount(Math.max(usedSeats, seatCount - 1))}
              disabled={seatCount <= usedSeats || loading || updateLoading}
              size="small"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                width: 36,
                height: 36,
              }}
            >
              <RemoveRounded fontSize="small" />
            </IconButton>

            <Typography
              variant="h6"
              fontWeight={600}
              sx={{ minWidth: 32, textAlign: "center" }}
            >
              {seatCount}
            </Typography>

            <IconButton
              onClick={() => setSeatCount(seatCount + 1)}
              disabled={seatCount >= 100 || loading || updateLoading}
              size="small"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                width: 36,
                height: 36,
              }}
            >
              <AddRounded fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Summary (only show when there are changes) */}
        {showPricing && (
          <Box sx={{ mb: 2 }}>
            <PricingSummary
              currentSeats={pricingInfo.currentSeats}
              newSeats={pricingInfo.newSeats}
              pricePerSeat={pricePerSeat}
              interval={currentInterval}
            />
          </Box>
        )}

        {error && (
          <FormHelperText error sx={{ mt: 2 }}>
            {error}
          </FormHelperText>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={updateLoading}>
          Close
        </Button>
        <LoadingButton
          loading={updateLoading}
          variant="contained"
          onClick={handleUpdateSubscription}
          disabled={!hasChanges || seatCount < 1 || loading}
          autoFocus
        >
          Continue
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default SeatManagementDialog;
