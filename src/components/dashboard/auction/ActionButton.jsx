import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
  FormHelperText,
  Box,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  HourglassEmpty as HourglassEmptyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  EmojiEvents as EmojiEventsIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { useAuth } from "../../../hooks/useAuth";
import { useForm, Controller } from "react-hook-form";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import { formatCurrency } from "./utils/formatUtils";
import { LoadingButton } from "@mui/lab";
import { db } from "../../../services/firebase";
import {
  getPromotionExpirationDate,
  isAuctionEnded,
} from "../../../utils/dateUtils";
import { formatInTimeZone } from "date-fns-tz";
import CountdownCircle from "./CountdownCircle";
import { addMonths, setDate, setHours, setMinutes, setSeconds } from "date-fns";

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

const ActionButton = ({
  zipCode,
  auction = {},
  userBidData = { hasBid: false, isWinning: false },
  onBidPlaced,
  displayMode = "action", // "status" or "action"
}) => {
  const { userData, zipPromotions, zipSubscriptions } = useAuth();
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentMethodLoading, setPaymentMethodLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [isExtended, setIsExtended] = useState(false);
  const [localAuctionEnded, setLocalAuctionEnded] = useState(false);

  // Get current state data
  const promotionData = zipPromotions?.[zipCode];
  const promotionStatus = promotionData?.status || null;
  const subscriptionData = zipSubscriptions?.[zipCode];
  const hasActiveSubscription = subscriptionData?.status === "active";
  const hasInvoicedSubscription = subscriptionData?.status === "invoiced";

  // Calculate current bid info
  const hasExistingBids = auction.numberOfBids > 0;
  const currentBid = hasExistingBids
    ? auction.currentBid
    : auction.startingPrice || 100000;
  const currentBidDollars = currentBid / 100;
  const minBidAmount = hasExistingBids ? currentBidDollars + 250 : 1000;

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: { bidAmount: minBidAmount },
    mode: "onChange",
  });

  // Reset form when minBidAmount changes
  useEffect(() => {
    reset({ bidAmount: minBidAmount });
  }, [minBidAmount, reset]);

  // Track auction end status with real-time updates
  useEffect(() => {
    if (!auction?.endTime) {
      setLocalAuctionEnded(false);
      return;
    }

    const checkAuctionEnd = () => {
      let endTime = auction.endTime;
      if (endTime?.toDate) endTime = endTime.toDate();
      if (!(endTime instanceof Date)) endTime = new Date(endTime);

      if (endTime && !isNaN(endTime.getTime())) {
        const now = new Date();
        const hasEnded = now > endTime;
        setLocalAuctionEnded(hasEnded);

        console.log("⏰ ActionButton auction end check:", {
          zipCode,
          now: now.toISOString(),
          endTime: endTime.toISOString(),
          hasEnded,
        });
      }
    };

    // Check immediately
    checkAuctionEnd();

    // Then check every second
    const interval = setInterval(checkAuctionEnd, 1000);

    return () => clearInterval(interval);
  }, [auction?.endTime, zipCode]);

  // Countdown logic for status display - IMMEDIATE extension feedback
  useEffect(() => {
    // Only run countdown logic if displayMode is "status" and auction has endTime
    if (displayMode !== "status" || !auction?.endTime) {
      setSecondsLeft(null);
      setIsExtended(false);
      return;
    }

    // If auction has ended, don't show countdown
    if (isAuctionEnded(auction)) {
      setSecondsLeft(null);
      setIsExtended(false);
      return;
    }

    // Process the end time once outside the interval function
    let end = auction.endTime;

    // Handle Firestore timestamps
    if (end?.toDate) end = end.toDate();

    // Handle timezone conversion if needed
    if (end && !(end instanceof Date)) {
      try {
        end = new Date(end);
      } catch (error) {
        console.error("Error parsing date:", error);
        setSecondsLeft(null);
        setIsExtended(false);
        return;
      }
    }

    // If end date is invalid, don't show countdown
    if (!end || isNaN(end?.getTime())) {
      setSecondsLeft(null);
      setIsExtended(false);
      return;
    }

    // Check if this auction is extended (compare to base end time)
    const baseEndTime = getBaseAuctionEndTime(end);
    const extensionMs = end.getTime() - baseEndTime.getTime();
    const isAuctionExtended = extensionMs > 30 * 1000; // 30 second buffer
    setIsExtended(isAuctionExtended);

    const updateCountdown = () => {
      const now = new Date();

      // If auction has ended, don't show countdown
      if (end <= now) {
        setSecondsLeft(null);
        return;
      }

      // Calculate total seconds remaining
      const totalSecondsLeft = Math.floor((end - now) / 1000);

      // Show countdown when extended AND within 5 minutes (immediate feedback)
      if (isAuctionExtended && totalSecondsLeft <= 300) {
        setSecondsLeft(totalSecondsLeft);
      } else {
        setSecondsLeft(null);
      }
    };

    // Initial update
    updateCountdown();

    // Set up interval
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [auction, displayMode]);

  // Helper function to get status icon and text
  const getStatusIcon = (statusType, isWinning = false) => {
    const iconProps = { sx: { fontSize: 16, mr: 1 } };

    switch (statusType) {
      case "not-active":
        return null; // No icon for cleaner, less busy appearance
      case "pending":
        return (
          <HourglassEmptyIcon
            {...iconProps}
            sx={{ ...iconProps.sx, color: "primary.main" }}
          />
        );
      case "payment-pending":
        return (
          <WarningIcon
            {...iconProps}
            sx={{ ...iconProps.sx, color: "warning.main" }}
          />
        );
      case "featured":
        return (
          <EmojiEventsIcon
            {...iconProps}
            sx={{ ...iconProps.sx, color: "#FFD700" }} // Gold color for auction winners
          />
        );
      case "promoted":
        return (
          <CheckCircleIcon
            {...iconProps}
            sx={{ ...iconProps.sx, color: "success.main" }}
          />
        );
      case "winning":
        return (
          <EmojiEventsIcon
            {...iconProps}
            sx={{ ...iconProps.sx, color: "warning.main" }}
          />
        );
      default:
        return null;
    }
  };

  // Determine current state and what to display
  const getStatusAndAction = () => {
    console.log(
      "🎯 ActionButton getStatusAndAction called for zipCode:",
      zipCode,
      {
        auctionData: auction,
        hasActiveSubscription,
        hasInvoicedSubscription,
        promotionStatus,
        userBidData,
      }
    );

    // Check if auction has ended - use local state that's updated every second
    const auctionEnded = localAuctionEnded || auction?.status === "ended";

    // Additional check for race condition during extensions:
    // If user has bid and auction endTime is in the recent past (within 10 seconds),
    // treat as ended even if status/localAuctionEnded aren't updated yet
    const now = new Date();
    let auctionEndTime = auction?.endTime;
    if (auctionEndTime?.toDate) auctionEndTime = auctionEndTime.toDate();
    if (!(auctionEndTime instanceof Date))
      auctionEndTime = new Date(auctionEndTime);

    const timeBasedEnded =
      auctionEndTime &&
      !isNaN(auctionEndTime.getTime()) &&
      now > auctionEndTime &&
      now - auctionEndTime < 10000; // Within 10 seconds of end time

    const finalAuctionEnded =
      auctionEnded || (timeBasedEnded && userBidData.hasBid);

    console.log("🎯 ActionButton final auction status:", {
      zipCode,
      localAuctionEnded,
      auctionStatus: auction?.status,
      timeBasedEnded,
      userHasBid: userBidData.hasBid,
      finalAuctionEnded,
    });

    if (finalAuctionEnded) {
      return {
        statusPrimary: userBidData.hasBid
          ? userBidData.isWinning
            ? "You Won!"
            : "You Lost"
          : "Auction Ended",
        statusSecondary: userBidData.hasBid
          ? `Your bid: ${formatCurrency(userBidData.amount / 100)} • ${
              userBidData.isWinning
                ? "Payment processing..."
                : `Winning bid: ${formatCurrency(
                    (auction.numberOfBids > 0
                      ? auction.currentBid
                      : auction.startingPrice || 0) / 100
                  )}`
            }`
          : "Results being processed...",
        actionType: "ended",
        statusIcon:
          userBidData.hasBid && userBidData.isWinning ? "featured" : null,
      };
    }

    // Has active paid subscription (auction winner)
    if (hasActiveSubscription) {
      const biddingStatus = userBidData.hasBid
        ? userBidData.isWinning
          ? "Currently Winning"
          : "Not Winning"
        : "Ready to bid";

      return {
        statusPrimary: "Featured",
        statusIcon: "featured",
        statusSecondary: `Active Until ${formatSubscriptionDate(
          subscriptionData.endDate
        )} • ${biddingStatus}`,
        secondaryIcon:
          userBidData.hasBid && userBidData.isWinning ? "winning" : null,
        actionType: "bid",
        actionText: userBidData.hasBid
          ? userBidData.isWinning
            ? "Currently Winning"
            : "Not Winning"
          : "Place Bid",
        buttonColor: userBidData.hasBid
          ? userBidData.isWinning
            ? "success"
            : "error"
          : "success",
      };
    }

    // EXTENSION EDGE CASE: During auction extensions, subscription might expire
    // based on original end date, but user should still be treated as "Featured"
    // if they're actively participating in an extended auction
    const isAuctionExtended = (() => {
      if (!auction?.endTime) return false;
      try {
        let endTime = auction.endTime;
        if (endTime?.toDate) endTime = endTime.toDate();
        if (!(endTime instanceof Date)) endTime = new Date(endTime);

        const baseEndTime = getBaseAuctionEndTime(endTime);
        const extensionMs = endTime.getTime() - baseEndTime.getTime();
        return extensionMs > 30 * 1000; // 30 second buffer
      } catch (error) {
        return false;
      }
    })();

    // If auction is extended AND user has winning bid, treat as Featured
    // (subscription data might be stale during extension period)
    if (
      isAuctionExtended &&
      userBidData.hasBid &&
      userBidData.isWinning &&
      !finalAuctionEnded
    ) {
      return {
        statusPrimary: "Featured",
        statusIcon: "featured",
        statusSecondary: "Currently Winning • Extended Auction",
        secondaryIcon: "winning",
        actionType: "bid",
        actionText: "Currently Winning",
        buttonColor: "success",
      };
    }

    // Has invoiced subscription (payment pending)
    if (hasInvoicedSubscription) {
      return {
        statusPrimary: "Payment Pending",
        statusIcon: "payment-pending",
        statusSecondary: "Ad subscription requires payment",
        actionType: "info",
        actionText: "Payment Pending",
        buttonColor: "warning",
      };
    }

    // Has active promotion
    if (promotionStatus === "active") {
      return {
        statusPrimary: "Promoted",
        statusIcon: "promoted",
        statusSecondary: userBidData.hasBid
          ? userBidData.isWinning
            ? "Currently Winning"
            : "Not Winning"
          : "Ready to bid",
        secondaryIcon:
          userBidData.hasBid && userBidData.isWinning ? "winning" : null,
        actionType: "bid",
        actionText: userBidData.hasBid
          ? userBidData.isWinning
            ? "Currently Winning"
            : "Not Winning"
          : "Place Bid",
        buttonColor: userBidData.hasBid
          ? userBidData.isWinning
            ? "success"
            : "error"
          : "primary",
      };
    }

    // Has pending promotion
    if (
      promotionStatus === "pending" ||
      promotionStatus === "invoiced" ||
      promotionStatus === "payment_pending"
    ) {
      return {
        statusPrimary: "Promotion Pending",
        statusIcon: "pending",
        statusSecondary: "Cannot bid yet",
        actionType: "pending",
        actionText: "Pending...",
        buttonColor: "primary",
      };
    }

    // No promotion
    console.log(
      '🚫 Falling through to "Add Promotion" - no valid promotion found'
    );
    return {
      statusPrimary: "Not Active",
      statusIcon: "not-active",
      statusSecondary: "Add a promotion to bid in the auction.",
      actionType: "promote",
      actionText: "Add Promotion",
      buttonColor: "primary",
    };
  };

  const formatSubscriptionDate = (date) => {
    if (!date) return "";
    try {
      const dateObj =
        date instanceof Date
          ? date
          : date.toDate
          ? date.toDate()
          : new Date(date);
      return formatInTimeZone(dateObj, "America/New_York", "MMM d, yyyy");
    } catch (e) {
      return "";
    }
  };

  const handlePromotionRequest = async () => {
    if (!userData?.uid) return;

    setIsLoading(true);
    try {
      // Get the promotion price from Firestore
      const promotionPlanSnapshot = await db
        .collection("plans")
        .where("active", "==", true)
        .where("stripe_metadata_id", "==", "advertising")
        .limit(1)
        .get();

      if (promotionPlanSnapshot.empty) {
        throw new Error("Promotion plan not found");
      }

      const promotionPlanDoc = promotionPlanSnapshot.docs[0];
      const promotionPriceSnapshot = await db
        .collection("plans")
        .doc(promotionPlanDoc.id)
        .collection("prices")
        .where("active", "==", true)
        .limit(1)
        .get();

      if (promotionPriceSnapshot.empty) {
        throw new Error("Promotion price not found");
      }

      const promotionPriceId = promotionPriceSnapshot.docs[0].id;

      const createCheckoutSession = firebase
        .functions()
        .httpsCallable("createCheckoutSession");

      const { data } = await createCheckoutSession({
        priceId: promotionPriceId,
        successUrl: `${window.location.origin}/dashboard/advertising?promotion_success=true&zipCode=${zipCode}`,
        cancelUrl: window.location.href,
        mode: "payment",
        ...(userData?.stripeId
          ? { stripeId: userData.stripeId }
          : { createNew: true }),
        metadata: {
          type: "promotion",
          zipCode: zipCode,
          userId: userData.uid,
          location: userData.location,
          expirationDate: getPromotionExpirationDate().toISOString(),
        },
      });

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      alert(
        `Failed to create checkout session: ${error.message || "Unknown error"}`
      );
      setIsLoading(false);
    }
  };

  const handleBidSubmit = async (formData) => {
    if (!userData?.uid) return;

    setError("");
    setIsLoading(true);

    try {
      const amountInCents = Math.round(Number(formData.bidAmount) * 100);
      const placeBidFunction = firebase.functions().httpsCallable("placeBid");
      const result = await placeBidFunction({
        zipCode: String(zipCode),
        bidAmount: amountInCents,
        userEmail: userData.email,
        userLocation: userData.location,
      });

      handleBidDialogClose();
      reset();

      if (onBidPlaced && result.data.success) {
        onBidPlaced(amountInCents);
      }
    } catch (error) {
      console.error("Error placing bid:", error);
      setError(error.message || "Failed to place bid. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentMethod = async () => {
    if (!userData?.uid) return;

    setPaymentMethodLoading(true);
    try {
      const getUserPaymentMethod = firebase
        .functions()
        .httpsCallable("getUserPaymentMethod");

      const result = await getUserPaymentMethod();
      setPaymentMethod(result.data);
    } catch (error) {
      console.error("Error fetching payment method:", error);
      setPaymentMethod({
        success: false,
        error: "unknown",
        message: "Unable to retrieve payment information.",
      });
    } finally {
      setPaymentMethodLoading(false);
    }
  };

  const handleBidDialogOpen = () => {
    setShowBidDialog(true);
    fetchPaymentMethod(); // Get payment method info when opening bid dialog
  };

  const handleBidDialogClose = () => {
    // Only close dialog - don't reset states until animation completes
    setShowBidDialog(false);
  };

  const handleBidDialogExited = () => {
    // Reset states after dialog animation completes
    setPaymentMethod(null);
    setPaymentMethodLoading(false);
  };

  const handleActionClick = () => {
    const state = getStatusAndAction();

    switch (state.actionType) {
      case "promote":
        setShowPromotionDialog(true);
        break;
      case "bid":
        handleBidDialogOpen();
        break;
      case "info":
      case "pending":
        setShowInfoDialog(true);
        break;
      default:
        break;
    }
  };

  const state = getStatusAndAction();

  // If displayMode is "status", show the status text and countdown if applicable
  if (displayMode === "status") {
    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {getStatusIcon(state.statusIcon)}
          <Typography
            variant="body2"
            fontWeight="medium"
            sx={
              state.statusPrimary === "You Won!"
                ? {
                    color: "success.main",
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }
                : undefined
            }
          >
            {state.statusPrimary}
          </Typography>
        </Box>
        {state.statusSecondary && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            {state.secondaryIcon && getStatusIcon(state.secondaryIcon)}
            <Typography variant="caption" color="text.secondary">
              {state.statusSecondary}
            </Typography>
            {/* Extended chip next to Currently Winning text */}
            {isExtended &&
              userBidData.hasBid &&
              userBidData.isWinning &&
              state.statusPrimary !== "You Won!" &&
              state.statusPrimary !== "You Lost" &&
              state.statusPrimary !== "Auction Ended" && (
                <Chip
                  icon={<ScheduleIcon />}
                  label="Extended"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{
                    height: 18,
                    fontSize: "0.6rem",
                    "& .MuiChip-icon": {
                      fontSize: "0.7rem",
                    },
                  }}
                />
              )}
          </Box>
        )}
        {/* Countdown gets its own line - it's time-critical */}
        {secondsLeft !== null && isExtended && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <CountdownCircle
              seconds={secondsLeft}
              isExtended={isExtended}
              variant="inline"
              size={24}
            />
            <Typography
              variant="caption"
              sx={{
                fontWeight: "medium",
                color:
                  secondsLeft <= 10
                    ? "#d32f2f"
                    : secondsLeft <= 30
                    ? "#f57c00"
                    : "#1976d2",
              }}
            >
              Time remaining
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // If displayMode is "action", show the button and dialogs
  return (
    <>
      {/* Action Button */}
      {state.actionType === "ended" ? (
        <Button variant="contained" color="primary" fullWidth disabled>
          Auction Ended
        </Button>
      ) : (
        <Button
          variant="contained"
          color={state.buttonColor}
          onClick={handleActionClick}
          disabled={state.actionType === "pending" || isLoading}
          fullWidth
        >
          {state.actionText}
        </Button>
      )}

      {/* Promotion Dialog */}
      <Dialog
        open={showPromotionDialog}
        onClose={() => !isLoading && setShowPromotionDialog(false)}
      >
        <DialogTitle>Add Promotion</DialogTitle>
        <DialogContent>
          <DialogContentText variant="body2" sx={{ pb: 2 }}>
            Promote your facility for a{" "}
            <Typography component="span" fontWeight="bold" color="primary.main">
              $100 one-time payment
            </Typography>
            . your promotion for ZIP code {zipCode} will become active on the
            map immediately after payment and run until{" "}
            <strong>
              {formatInTimeZone(
                getPromotionExpirationDate(),
                "America/New_York",
                "MMMM d, yyyy"
              )}
            </strong>
            .
          </DialogContentText>
          <DialogContentText variant="body2" sx={{ pb: 3 }}>
            No automatic renewal. You'll be taken to a secure checkout page to
            complete your payment.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowPromotionDialog(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handlePromotionRequest}
            color="primary"
            variant="contained"
            loading={isLoading}
            disabled={isLoading}
          >
            Continue to Checkout
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Bid Dialog */}
      <Dialog
        open={showBidDialog}
        onClose={() => !isLoading && handleBidDialogClose()}
        TransitionProps={{
          onExited: handleBidDialogExited,
        }}
        PaperProps={{
          sx: { minWidth: 520, maxWidth: 520 }, // Fixed width to prevent jumping
        }}
      >
        <form onSubmit={handleSubmit(handleBidSubmit)}>
          <DialogTitle>Place Bid for ZIP Code {zipCode}</DialogTitle>
          <DialogContent>
            <DialogContentText variant="body2" sx={{ pb: 2 }}>
              Enter your bid amount. The minimum bid is{" "}
              {formatCurrency(minBidAmount)}.
              {currentBid > 0 &&
                hasExistingBids &&
                ` The current highest bid is ${formatCurrency(
                  currentBidDollars
                )}.`}
            </DialogContentText>

            {paymentMethodLoading ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  py: 2,
                  mb: 3,
                }}
              >
                <CircularProgress size={20} sx={{ mr: 1.5 }} />
                <Typography variant="body2" color="text.secondary">
                  Loading your payment information...
                </Typography>
              </Box>
            ) : (
              <Alert severity="warning" sx={{ mb: 3 }} icon={false}>
                {paymentMethod?.success ? (
                  <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                    If you win this auction, your{" "}
                    <strong style={{ textTransform: "capitalize" }}>
                      {paymentMethod.paymentMethod.card.brand} ending in{" "}
                      {paymentMethod.paymentMethod.card.last4}
                    </strong>{" "}
                    will be charged immediately when the auction ends on the
                    15th.
                  </Typography>
                ) : (
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: "medium", mb: 1 }}
                    >
                      <strong>Important:</strong> If you win this auction, your
                      saved payment method will be charged immediately when the
                      auction ends on the 15th.
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      {paymentMethod?.message ||
                        "Unable to verify payment method. Please ensure you have completed the promotion setup."}
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}

            <Controller
              name="bidAmount"
              control={control}
              rules={{
                required: "Bid amount is required",
                min: {
                  value: minBidAmount,
                  message: `Your bid must be at least ${formatCurrency(
                    minBidAmount
                  )}`,
                },
                validate: (value) =>
                  !isNaN(Number(value)) || "Please enter a valid number",
              }}
              render={({ field }) => (
                <TextField
                  autoFocus
                  margin="dense"
                  label="Bid Amount"
                  type="number"
                  fullWidth
                  variant="standard"
                  InputLabelProps={{ shrink: true }}
                  disabled={isLoading}
                  error={!!errors.bidAmount}
                  helperText={errors.bidAmount?.message}
                  InputProps={{
                    startAdornment: <Typography variant="body1">$</Typography>,
                  }}
                  {...field}
                />
              )}
            />

            {error && (
              <FormHelperText error sx={{ mt: 1 }}>
                {error}
              </FormHelperText>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleBidDialogClose} disabled={isLoading}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              loading={isLoading}
              disabled={
                isLoading ||
                Object.keys(errors).length > 0 ||
                paymentMethodLoading
              }
              variant="contained"
              color="primary"
            >
              Place Bid
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>

      {/* Info Dialog */}
      <Dialog open={showInfoDialog} onClose={() => setShowInfoDialog(false)}>
        <DialogTitle>
          {hasInvoicedSubscription ? "Payment Required" : "Status Information"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText variant="body2">
            {hasInvoicedSubscription
              ? `Your ad subscription for ZIP code ${zipCode} is pending payment. Once payment is received, your ad will become active.`
              : promotionStatus === "pending"
              ? `Your promotion for ZIP code ${zipCode} is pending. After the auction ends, you will receive an invoice for $100.`
              : `Information about ZIP code ${zipCode} status.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInfoDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ActionButton;
