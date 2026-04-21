import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Box,
  Typography,
  Alert,
} from "@mui/material";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import LockIcon from "@mui/icons-material/Lock";
import { useAuth } from "../../../hooks/useAuth";
import { db } from "../../../services/firebase";
import { LoadingButton } from "@mui/lab";
import { formatInTimeZone } from "date-fns-tz";
import { getPromotionExpirationDate } from "../../../utils/dateUtils";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";

const PromotionButton = ({ zipCode, hasBid = false }) => {
  const { userData, zipPromotions } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  // Get promotion status from context
  const promotionData = zipPromotions?.[zipCode];
  const promotionStatus = promotionData?.status || null;

  // Format expiration date if available
  const formatExpirationDate = (date) => {
    if (!date) return null;
    return formatInTimeZone(
      new Date(date),
      "America/New_York",
      "MMMM d, yyyy 'at' h:mm aaaa"
    );
  };

  const expirationDate = promotionData?.expirationDate
    ? formatExpirationDate(promotionData.expirationDate)
    : null;

  const handlePromotionRequest = async () => {
    if (!userData?.uid) return;

    setIsLoading(true);
    try {
      // Get the promotion price from Firestore (same pattern as your advertising code)
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

      console.log("🔥 PROMOTION DEBUG:", {
        promotionPriceId,
        userData: userData?.uid,
        stripeId: userData?.stripeId,
      });

      const createCheckoutSession = firebase
        .functions()
        .httpsCallable("createCheckoutSession");

      const { data } = await createCheckoutSession({
        priceId: promotionPriceId,
        successUrl: `${window.location.origin}/dashboard?promotion_success=true&zipCode=${zipCode}`,
        cancelUrl: window.location.href,
        mode: "payment", // One-time payment, not subscription
        // Use existing customer if available, otherwise create new
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
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      console.error("🚨 FULL ERROR DETAILS:", {
        message: error.message,
        code: error.code,
        details: error.details,
        fullError: error,
      });
      alert(
        `Failed to create checkout session: ${error.message || "Unknown error"}`
      );
      setIsLoading(false); // Only reset loading on error, success will redirect
    }
  };

  const handleCancelPromotion = async () => {
    if (!userData?.uid || hasBid) return;

    setIsLoading(true);
    try {
      // First check if the promotion is in a deletable state
      const promotionRef = db
        .collection("zips")
        .doc(zipCode)
        .collection("promotions")
        .doc(userData.uid);

      const promotionDoc = await promotionRef.get();
      if (promotionDoc.exists && promotionDoc.data().status !== "pending") {
        throw new Error(
          `Cannot cancel a promotion that is already ${
            promotionDoc.data().status
          }`
        );
      }

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

      // Delete both documents in a batch
      batch.delete(zipPromotionRef);
      batch.delete(userPromotionRef);

      // Commit the batch
      await batch.commit();

      // Close the dialog
      setShowCancelDialog(false);
    } catch (error) {
      console.error("Error canceling promotion:", error);
      alert("Failed to cancel promotion: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Render different UI based on promotion status
  if (promotionStatus === "active") {
    return (
      <>
        <Button
          variant="contained"
          color="success"
          onClick={() => setShowInfoDialog(true)}
        >
          Active
        </Button>

        <Dialog open={showInfoDialog} onClose={() => setShowInfoDialog(false)}>
          <DialogTitle>Active Promotion</DialogTitle>
          <DialogContent>
            <DialogContentText variant="body2" sx={{ pb: 2 }}>
              Your promotion for ZIP code {zipCode} is currently active. Your
              business is visible on the map and in the carousel for this area.
            </DialogContentText>

            {expirationDate && (
              <Box
                sx={{
                  bgcolor: "success.lighter",
                  borderRadius: 1,
                }}
              >
                <Typography variant="subtitle2" color="success.dark">
                  This promotion will be active until {expirationDate} ET
                </Typography>
              </Box>
            )}

            {hasBid && (
              <DialogContentText
                variant="body2"
                sx={{ mt: 3, fontStyle: "italic" }}
              >
                Your promotion is locked because you have placed a bid in the
                auction for this ZIP code.
              </DialogContentText>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowInfoDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  if (promotionStatus === "invoiced" || promotionStatus === "payment_pending") {
    return (
      <>
        <Button
          variant="contained"
          color="warning"
          onClick={() => setShowInfoDialog(true)}
        >
          Payment Pending
        </Button>

        <Dialog open={showInfoDialog} onClose={() => setShowInfoDialog(false)}>
          <DialogTitle>Payment Required</DialogTitle>
          <DialogContent>
            <DialogContentText variant="body2">
              Your promotion for ZIP code {zipCode} is pending payment. Once
              payment is received, your promotion will become active.
            </DialogContentText>

            {hasBid && (
              <DialogContentText
                variant="body2"
                sx={{ mt: 3, fontStyle: "italic" }}
              >
                Your promotion is locked because you have placed a bid in the
                auction for this ZIP code.
              </DialogContentText>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowInfoDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  if (promotionStatus === "pending") {
    return (
      <>
        <Button
          variant="contained"
          color="primary"
          onClick={() =>
            !hasBid ? setShowCancelDialog(true) : setShowInfoDialog(true)
          }
          endIcon={
            hasBid ? (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <HourglassEmptyIcon sx={{ fontSize: 14, mr: 0.5 }} />
                <LockIcon sx={{ fontSize: 14 }} />
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <HourglassEmptyIcon sx={{ fontSize: 14, mr: 0.5 }} />
              </Box>
            )
          }
        >
          Pending
        </Button>

        <Dialog
          open={showCancelDialog}
          onClose={() => !isLoading && setShowCancelDialog(false)}
        >
          <DialogTitle>Cancel Promotion</DialogTitle>
          <DialogContent>
            <DialogContentText variant="body2" sx={{ pb: 3 }}>
              Are you sure you want to cancel your promotion for ZIP code{" "}
              {zipCode}?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setShowCancelDialog(false)}
              disabled={isLoading}
            >
              No, Keep It
            </Button>
            <LoadingButton
              onClick={handleCancelPromotion}
              color="error"
              variant="contained"
              loading={isLoading}
              disabled={isLoading}
            >
              Yes, Cancel
            </LoadingButton>
          </DialogActions>
        </Dialog>

        <Dialog open={showInfoDialog} onClose={() => setShowInfoDialog(false)}>
          <DialogTitle>Pending Promotion</DialogTitle>
          <DialogContent>
            <DialogContentText variant="body2" sx={{ pb: 2 }}>
              Your promotion for ZIP code {zipCode} is pending. After the
              auction ends, you will receive an invoice for $100. Your promotion
              will become active once payment is received. Invoices are
              typically sent on the 15th of each month.
            </DialogContentText>

            {hasBid && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Your promotion is locked because you have placed a bid in the
                auction for this ZIP code.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowInfoDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  // Default: No promotion
  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setShowConfirmDialog(true)}
      >
        Add Promotion
      </Button>

      <Dialog
        open={showConfirmDialog}
        onClose={() => !isLoading && setShowConfirmDialog(false)}
      >
        <DialogTitle>Confirm Promotion</DialogTitle>
        <DialogContent>
          <DialogContentText variant="body2" sx={{ pb: 3 }}>
            Placing a promotion for ZIP code {zipCode} will cost $100 per month.
            You will be charged immediately and your promotion will become
            active after the auction ends. Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowConfirmDialog(false)}
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
            Confirm
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PromotionButton;
