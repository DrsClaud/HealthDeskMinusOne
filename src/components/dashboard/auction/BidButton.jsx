import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  CircularProgress,
  Typography,
  FormHelperText,
} from "@mui/material";
import { useAuth } from "../../../hooks/useAuth";
import { useForm, Controller } from "react-hook-form";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import { formatCurrency } from "./utils/formatUtils";
import { LoadingButton } from "@mui/lab";
import { db } from "../../../services/firebase";
import { getPromotionExpirationDate } from "../../../utils/dateUtils";

const BidButton = ({
  zipCode,
  disabled,
  hasBid = false,
  isWinning = false,
  currentBid = 100000, // Default 1000 dollars in cents
  auctionData = {},
  hasActiveAd = false,
  onBidPlaced,
}) => {
  const { userData, zipPromotions, zipSubscriptions } = useAuth();
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [showPromotionRequiredDialog, setShowPromotionRequiredDialog] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [isPromotionLoading, setIsPromotionLoading] = useState(false);
  const [showPromotionConfirmDialog, setShowPromotionConfirmDialog] =
    useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  // Convert currentBid from cents to dollars for display
  const currentBidDollars = currentBid / 100;

  // Calculate minimum bid based on whether there are existing bids
  const hasExistingBids = auctionData.numberOfBids > 0;
  const minBidAmount = hasExistingBids
    ? currentBidDollars + 250 // $250 higher than current bid if there are bids
    : 1000; // $1000 minimum if no bids yet

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      bidAmount: minBidAmount,
    },
    mode: "onChange",
  });

  // Reset form when minBidAmount changes
  useEffect(() => {
    reset({ bidAmount: minBidAmount });
  }, [minBidAmount, reset]);

  const handleBidSubmit = async (formData) => {
    if (!userData?.uid) return;

    setError("");
    setIsLoading(true);

    try {
      // Convert dollars to cents for the backend
      const amountInCents = Math.round(Number(formData.bidAmount) * 100);

      // Call the Cloud Function with additional user data
      const placeBidFunction = firebase.functions().httpsCallable("placeBid");
      const result = await placeBidFunction({
        zipCode: String(zipCode),
        bidAmount: amountInCents,
        userEmail: userData.email,
        userLocation: userData.location,
      });

      // Close the dialog and reset the form
      setShowBidDialog(false);
      reset();

      // Call the callback to update parent component
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

  const handleDialogClose = () => {
    if (!isLoading) {
      setShowBidDialog(false);
      reset();
      setError("");
    }
  };

  const handlePromotionRequest = async () => {
    if (!userData?.uid) return;

    setIsPromotionLoading(true);
    try {
      // Create a batch operation
      const batch = db.batch();

      // Reference to the promotion in the zips collection
      const zipPromotionRef = db
        .collection("zips")
        .doc(zipCode)
        .collection("promotions")
        .doc(userData.uid);

      // Reference to the promotion in the user's collection
      const userPromotionRef = db
        .collection("users")
        .doc(userData.uid)
        .collection("zip_promotions")
        .doc(zipCode);

      // Get proper expiration date based on auction cycle
      const expirationDate = getPromotionExpirationDate();

      // Promotion data
      const promotionData = {
        status: "pending",
        active: false,
        userId: userData.uid,
        location: userData.location,
        zipCode: zipCode,
        createdAt: new Date().toISOString(),
        endDate: expirationDate.toISOString(),
      };

      // Add both documents in a batch
      batch.set(zipPromotionRef, promotionData);
      batch.set(userPromotionRef, promotionData);

      // Commit the batch
      await batch.commit();

      // Close the dialog
      setShowPromotionConfirmDialog(false);

      // Open the bid dialog now that the promotion is placed
      setShowBidDialog(true);
    } catch (error) {
      console.error("Error creating promotion:", error);
      alert("Failed to create promotion. Please try again.");
    } finally {
      setIsPromotionLoading(false);
    }
  };

  const handleButtonClick = () => {
    // Check if user has a promotion
    const hasPromotion =
      zipPromotions &&
      (zipPromotions[zipCode]?.status === "active" ||
        zipPromotions[zipCode]?.status === "pending" ||
        zipPromotions[zipCode]?.status === "invoiced" ||
        zipPromotions[zipCode]?.status === "payment_pending");

    if (hasPromotion) {
      setShowBidDialog(true);
    } else {
      setShowPromotionRequiredDialog(true);
    }
  };

  // Check if there's a pending invoice for this ZIP code
  const hasInvoicedSubscription =
    zipSubscriptions && zipSubscriptions[zipCode]?.status === "invoiced";

  // If there's an invoiced subscription, show Payment Pending button
  if (hasInvoicedSubscription) {
    return (
      <>
        <Button
          variant="contained"
          color="warning"
          onClick={() => setShowInfoDialog(true)}
          fullWidth
        >
          Payment Pending
        </Button>

        <Dialog open={showInfoDialog} onClose={() => setShowInfoDialog(false)}>
          <DialogTitle>Payment Required</DialogTitle>
          <DialogContent>
            <DialogContentText variant="body2">
              Your ad subscription for ZIP code {zipCode} is pending payment.
              Once payment is received, your ad will become active and appear at
              the top of search results for this area.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowInfoDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  const buttonText = hasBid
    ? isWinning
      ? "Currently Winning"
      : "Not Winning"
    : "Place Bid";

  const buttonColor = hasBid
    ? isWinning
      ? "success"
      : "error"
    : hasActiveAd
    ? "success"
    : "primary";

  return (
    <>
      <Button
        variant="contained"
        color={buttonColor}
        onClick={handleButtonClick}
        disabled={disabled}
        fullWidth
      >
        {buttonText}
      </Button>

      {/* Promotion Required Dialog */}
      <Dialog
        open={showPromotionRequiredDialog}
        onClose={() => setShowPromotionRequiredDialog(false)}
      >
        <DialogTitle>Promotion Required</DialogTitle>
        <DialogContent>
          <DialogContentText variant="body2" sx={{ pb: 3 }}>
            You need to place a promotion for ZIP code {zipCode} before you can
            bid. Promotions cost $100 per month and allow you to participate in
            auctions.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPromotionRequiredDialog(false)}>
            Cancel
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              setShowPromotionRequiredDialog(false);
              setShowPromotionConfirmDialog(true);
            }}
          >
            Place Promotion
          </Button>
        </DialogActions>
      </Dialog>

      {/* Promotion Confirmation Dialog */}
      <Dialog
        open={showPromotionConfirmDialog}
        onClose={() =>
          !isPromotionLoading && setShowPromotionConfirmDialog(false)
        }
      >
        <DialogTitle>Confirm Promotion</DialogTitle>
        <DialogContent>
          <DialogContentText variant="body2" sx={{ pb: 3 }}>
            Placing a promotion for ZIP code {zipCode} will cost $100 per month.
            You will receive an invoice after the auction ends. Do you want to
            continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowPromotionConfirmDialog(false)}
            disabled={isPromotionLoading}
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handlePromotionRequest}
            color="primary"
            variant="contained"
            loading={isPromotionLoading}
            disabled={isPromotionLoading}
          >
            Confirm
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Bid Dialog */}
      <Dialog open={showBidDialog} onClose={handleDialogClose}>
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

            <DialogContentText
              variant="body2"
              sx={{
                pb: 3,
                bgcolor: "warning.light",
                p: 2,
                borderRadius: 1,
                fontWeight: "medium",
              }}
            >
              ⚠️ <strong>Important:</strong> If you win this auction, your saved
              payment method will be charged immediately when the auction ends
              on the 15th. No invoice will be sent.
            </DialogContentText>

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
            <Button onClick={handleDialogClose} disabled={isLoading}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              loading={isLoading}
              disabled={isLoading || Object.keys(errors).length > 0}
              variant="contained"
              color="primary"
            >
              Place Bid
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};

export default BidButton;
