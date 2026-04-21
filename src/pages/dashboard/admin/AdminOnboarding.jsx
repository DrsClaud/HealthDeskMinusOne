import React, { useEffect, useState } from "react";
import { db } from "services/firebase";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
  Chip,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useAuth } from "hooks/useAuth";
import logoIcon from "assets/images/logos/logo-icon.png";

/**
 * AdminOnboarding - Full-screen seat purchase for new ChartMind Managers
 * Shown before they can access the dashboard
 */
const AdminOnboarding = () => {
  const { user, logout, userData } = useAuth();
  const [prices, setPrices] = useState({ monthly: null, yearly: null });
  const [loading, setLoading] = useState(true);
  const [selectedInterval, setSelectedInterval] = useState("yearly");
  const [seatCount, setSeatCount] = useState(1);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSeats, setCustomSeats] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handlePurchaseSeats = async () => {
    const finalSeatCount = showCustomInput ? parseInt(customSeats) : seatCount;

    if (!finalSeatCount || finalSeatCount < 1) {
      setError("Please select at least 1 seat.");
      return;
    }

    setCheckoutLoading(true);
    setError("");

    try {
      const selectedPrice = prices[selectedInterval];
      if (!selectedPrice) {
        throw new Error("Please select a billing interval.");
      }

      // Create checkout session via Stripe extension (document-based)
      const docRef = await db
        .collection("users")
        .doc(user.uid)
        .collection("checkout_sessions")
        .add({
          price: selectedPrice.id,
          quantity: finalSeatCount,
          success_url: `${window.location.origin}/dashboard?checkout=success`,
          cancel_url: `${window.location.origin}/dashboard`,
          metadata: {
            seatCount: finalSeatCount.toString(),
            interval: selectedInterval,
          },
        });

      // Listen for the checkout session URL from the extension
      docRef.onSnapshot((snap) => {
        const data = snap.data();
        if (data?.error) {
          setError(data.error.message || "Failed to create checkout.");
          setCheckoutLoading(false);
        }
        if (data?.url) {
          window.location.assign(data.url);
        }
      });
    } catch (err) {
      console.error("Error creating checkout:", err);
      setError(err.message || "Failed to start checkout.");
      setCheckoutLoading(false);
    }
  };

  const handleSeatSelect = (count) => {
    if (count === "8+") {
      setShowCustomInput(true);
      setSeatCount(8);
    } else {
      setShowCustomInput(false);
      setSeatCount(count);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const selectedPrice = prices[selectedInterval];
  const finalSeatCount = showCustomInput
    ? parseInt(customSeats) || 0
    : seatCount;
  const pricePerSeat = selectedPrice?.amount || 0;
  const totalPrice = pricePerSeat * finalSeatCount;

  // Calculate yearly discount
  const yearlyDiscount =
    prices.yearly && prices.monthly
      ? Math.round(
          ((prices.monthly.amount * 12 - prices.yearly.amount) /
            (prices.monthly.amount * 12)) *
            100
        )
      : 0;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
        pt: 2,
        pb: 8,
      }}
    >
      {/* Main Content */}
      <Box sx={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
        {/* Logo */}
        <Box sx={{ mb: 3 }}>
          <img src={logoIcon} alt="HealthDesk" style={{ height: 48 }} />
        </Box>

        {/* Header */}
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
          Invite Your Team
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Purchase seats to invite healthcare providers in your organization to
          use ChartMind. Each seat allows one provider to generate AI-powered
          clinical notes.
        </Typography>

        {/* Billing Interval Toggle */}
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mb: 4 }}>
          {[
            {
              value: "monthly",
              label: `Monthly · $${prices.monthly?.amount || "—"}/user`,
            },
            {
              value: "yearly",
              label: `Yearly · $${prices.yearly?.amount || "—"}/user`,
            },
          ].map(({ value, label }) => {
            const isSelected = selectedInterval === value;
            return (
              <Button
                key={value}
                variant="outlined"
                onClick={() => setSelectedInterval(value)}
                sx={{
                  px: 2,
                  py: 1,
                  textTransform: "none",
                  fontWeight: 500,
                  borderColor: isSelected ? "primary.main" : "divider",
                  color: isSelected ? "primary.main" : "text.primary",
                  bgcolor: "transparent",
                }}
              >
                {label}
                {value === "yearly" && yearlyDiscount > 0 && (
                  <Chip
                    label={`${yearlyDiscount}% off`}
                    size="small"
                    color="secondary"
                    sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                  />
                )}
              </Button>
            );
          })}
        </Box>

        {/* Seat Selection */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          Number of Seats
        </Typography>
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mb: 3 }}>
          {[1, 2, 3, 4, 5, 6, 7, "8+"].map((count) => {
            const isSelected =
              (count === "8+" && showCustomInput) ||
              (count !== "8+" && !showCustomInput && seatCount === count);
            return (
              <Button
                key={count}
                variant="outlined"
                onClick={() => handleSeatSelect(count)}
                sx={{
                  minWidth: 44,
                  height: 44,
                  fontWeight: 600,
                  borderColor: isSelected ? "primary.main" : "divider",
                  color: isSelected ? "primary.main" : "text.primary",
                  bgcolor: "transparent",
                }}
              >
                {count}
              </Button>
            );
          })}
        </Box>

        {/* Custom Input for 8+ */}
        {showCustomInput && (
          <Box sx={{ mb: 3 }}>
            <input
              type="number"
              min="8"
              max="100"
              value={customSeats}
              onChange={(e) => setCustomSeats(e.target.value)}
              placeholder="Enter seats (8-100)"
              style={{
                width: "100%",
                maxWidth: 200,
                padding: "10px 14px",
                fontSize: "1rem",
                border: "1px solid #e0e0e0",
                borderRadius: 4,
                outline: "none",
                textAlign: "center",
              }}
            />
          </Box>
        )}

        {/* Checkout Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  colSpan={2}
                  sx={{ fontWeight: 600, fontSize: "1rem" }}
                >
                  Checkout
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{finalSeatCount} × ChartMind Seat</TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    component="span"
                  >
                    {selectedInterval === "yearly" ? "Annually" : "Monthly"} ·{" "}
                  </Typography>
                  ${pricePerSeat}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 700, fontSize: "1.1rem" }}
                >
                  ${totalPrice.toFixed(2)}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: 0.5 }}
                  >
                    /{selectedInterval === "yearly" ? "yr" : "mo"}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Checkout Button */}
        <LoadingButton
          loading={checkoutLoading}
          variant="contained"
          size="large"
          onClick={handlePurchaseSeats}
          disabled={finalSeatCount < 1}
          sx={{ px: 5, py: 1.5 }}
        >
          Proceed to Checkout
        </LoadingButton>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* Logout Link */}
        <Box sx={{ mt: 4 }}>
          <Link
            component="button"
            variant="body2"
            onClick={logout}
            sx={{ color: "text.secondary", textDecoration: "none" }}
          >
            Log out
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminOnboarding;
