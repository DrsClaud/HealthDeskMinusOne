import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  FormHelperText,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Add } from "@mui/icons-material";
import { Controller, useForm } from "react-hook-form";
import { db } from "services/firebase";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import PricingSummary from "./PricingSummary";

/**
 * InviteTeamDialog - Dialog to invite team members with automatic seat addition
 */
const InviteTeamDialog = ({
  open,
  onClose,
  onInvitationsSent,
  totalSeats,
  usedSeats,
  members,
  invitations,
  subscriptionData,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pricePerSeat, setPricePerSeat] = useState(0);
  const [priceInterval, setPriceInterval] = useState("monthly");

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      emails: [""],
    },
  });

  const watchedEmails = watch("emails");

  // Load pricing when dialog opens
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const currentInterval =
          subscriptionData?.items?.[0]?.price?.recurring?.interval === "year"
            ? "yearly"
            : "monthly";

        const plansSnapshot = await db
          .collection("plans")
          .where("active", "==", true)
          .where("role", "==", "admin")
          .get();

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

            if (key === currentInterval) {
              setPricePerSeat(price.unit_amount / 100);
              setPriceInterval(key);
            }
          });
        }
      } catch (err) {
        console.error("Error loading pricing:", err);
      }
    };

    if (open && subscriptionData) {
      loadPricing();
    }
  }, [open, subscriptionData]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      reset({ emails: [""] });
      setError("");
      setSuccess("");
      setLoading(false);
    }
  }, [open, reset]);

  const handleAddEmailField = () => {
    const currentEmails = watch("emails");
    setValue("emails", [...currentEmails, ""]);
  };

  const handleInvite = async (data) => {
    setError("");
    setSuccess("");

    // Filter out empty emails
    const validEmails = data.emails.filter((email) => email.trim());

    // Validate we have at least one email
    if (validEmails.length === 0) {
      setError("Please enter at least one email address.");
      return;
    }

    // Check for duplicates in the input
    const uniqueEmails = new Set(validEmails.map((e) => e.toLowerCase()));
    if (uniqueEmails.size !== validEmails.length) {
      setError("You have duplicate email addresses in your list.");
      return;
    }

    // Check if any email is already invited or a member
    for (const email of validEmails) {
      const existingInvite = invitations.find(
        (inv) =>
          inv.email.toLowerCase() === email.toLowerCase() &&
          inv.status === "pending"
      );
      if (existingInvite) {
        setError(`${email} already has a pending invitation.`);
        return;
      }

      const existingMember = members.find(
        (member) => member.email?.toLowerCase() === email.toLowerCase()
      );
      if (existingMember) {
        setError(`${email} is already a member of your organization.`);
        return;
      }
    }

    setLoading(true);

    try {
      const functions = firebase.app().functions("us-central1");

      // Check if we need to add seats
      const seatsNeeded = usedSeats + validEmails.length;
      if (seatsNeeded > totalSeats) {
        // Add seats first
        const updateSeatQuantity =
          functions.httpsCallable("updateSeatQuantity");
        await updateSeatQuantity({ quantity: seatsNeeded });
      }

      // Send all invitations in parallel
      const sendInvitation = functions.httpsCallable("sendInvitation");
      await Promise.all(
        validEmails.map((email) =>
          sendInvitation({ email: email.toLowerCase() })
        )
      );
      if (onInvitationsSent) {
        await onInvitationsSent();
      }

      const count = validEmails.length;
      setSuccess(
        `${count} invitation${count === 1 ? "" : "s"} sent successfully.`
      );
      setShowPricing(false); // Hide pricing summary on success
      reset({ emails: [""] }); // Clear email inputs after success
    } catch (err) {
      console.error("Error sending invitation:", err);
      setError(err.message || "Failed to send invitation.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate pricing details - use stable values during loading
  const validEmailCount = watchedEmails.filter((e) => e.trim()).length;
  const seatsNeeded = usedSeats + validEmailCount;
  const additionalSeats = Math.max(0, seatsNeeded - totalSeats);

  // Store the pricing info so it doesn't disappear during loading
  const [showPricing, setShowPricing] = React.useState(false);
  const [pricingInfo, setPricingInfo] = React.useState({
    validEmailCount: 0,
    seatsNeeded: 0,
    additionalSeats: 0,
  });

  React.useEffect(() => {
    if (loading) {
      setShowPricing(false);
      return;
    }
    if (additionalSeats > 0 && pricePerSeat > 0) {
      setShowPricing(true);
      setPricingInfo({
        validEmailCount,
        seatsNeeded,
        additionalSeats,
      });
    } else {
      setShowPricing(false);
    }
  }, [loading, additionalSeats, pricePerSeat, validEmailCount, seatsNeeded]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(handleInvite)}>
        <DialogTitle>Invite Team Members</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Invite team members to give them access to ChartMind in your
            organization.
          </DialogContentText>

          {watchedEmails.map((email, index) => (
            <Controller
              key={index}
              name={`emails.${index}`}
              control={control}
              rules={{
                validate: (value) => {
                  // Allow empty fields
                  if (!value || !value.trim()) {
                    return true;
                  }
                  // Validate non-empty fields
                  const pattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
                  return pattern.test(value) || "Invalid email address.";
                },
              }}
              render={({ field }) => (
                <TextField
                  fullWidth
                  type="email"
                  placeholder="Email Address"
                  disabled={loading}
                  variant="standard"
                  autoFocus={index === 0}
                  error={!!errors?.emails?.[index]}
                  helperText={errors?.emails?.[index]?.message}
                  sx={{ mb: 3 }}
                  {...field}
                />
              )}
            />
          ))}

          <Button
            startIcon={<Add />}
            onClick={handleAddEmailField}
            disabled={loading}
            size="small"
            sx={{ mb: 2 }}
          >
            Add Another
          </Button>

          {/* Pricing summary if adding seats */}
          {showPricing && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Inviting{" "}
                {pricingInfo.validEmailCount === 1
                  ? "this user"
                  : "these users"}{" "}
                will add {pricingInfo.additionalSeats} seat
                {pricingInfo.additionalSeats === 1 ? "" : "s"} to your
                organization.
              </Alert>
              <PricingSummary
                currentSeats={totalSeats}
                newSeats={pricingInfo.seatsNeeded}
                pricePerSeat={pricePerSeat}
                interval={priceInterval}
              />
            </Box>
          )}

          {error && (
            <FormHelperText error sx={{ mt: 1 }}>
              {error}
            </FormHelperText>
          )}
          {success && (
            <Alert severity="success" sx={{ mt: 1 }}>
              {success}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Close
          </Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={loading}
            disabled={!watchedEmails.some((e) => e.trim())}
            autoFocus
          >
            Send {validEmailCount > 1 ? "Invitations" : "Invitation"}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InviteTeamDialog;
