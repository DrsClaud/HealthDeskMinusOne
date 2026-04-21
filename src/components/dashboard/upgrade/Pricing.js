import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import { db } from "services/firebase";
import { useStripe } from "@stripe/react-stripe-js";
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Stack,
  CircularProgress,
  Link,
  ToggleButton,
  ToggleButtonGroup,
  Card,
} from "@mui/material";
import PricingControls from "./PricingControls";
import { LoadingButton } from "@mui/lab";
import UpgradeFeatures from "./UpgradeFeatures";
import { useAuth } from "hooks/useAuth";
import {
  getTrialLabelForRole,
  getTrialLengthForRole,
} from "constants/trials";

const Pricing = ({ uid, role, subscription }) => {
  const navigate = useNavigate();
  const stripe = useStripe();
  const {
    hasValidSubscription,
    canStartTrial,
    hasActiveTrial,
    trialExpired,
    userData,
  } = useAuth();
  const [trialLoading, setTrialLoading] = useState(null);
  const [prices, setPrices] = useState({});
  const [selectedInterval, setSelectedInterval] = useState("monthly");
  const [showPricing, setShowPricing] = useState(false);
  const trialLengthDays = getTrialLengthForRole(role);
  const trialLabel = getTrialLabelForRole(role);
  const isFacility = role === "facility";

  // All the existing Firebase logic stays here...
  const getPlans = async () => {
    if (!role || !db?.collection) {
      return;
    }
    try {
      const plansSnapshot = await db
          .collection("plans")
          .where("active", "==", true)
          .where("role", "==", role)
          .get();

        const pricePromises = plansSnapshot.docs.map(async (doc) => {
          const productData = doc.data();

          const pricesSnapshot = await db
            .collection("plans")
            .doc(doc.id)
            .collection("prices")
            .where("active", "==", true)
            .get();

          const priceList = {};

          pricesSnapshot.forEach((price) => {
            const priceData = price.data();

            const roundNumber =
              String(priceData.unit_amount).slice(-2) === "00";
            const formattedAmount = roundNumber
              ? priceData.unit_amount / 100
              : (priceData.unit_amount / 100).toFixed(2);

            const newPrice = {
              id: price.id,
              role: productData.role,
              price: `$${formattedAmount}`,
              interval: priceData.interval || "day",
              type: priceData.type || "recurring",
            };

            if (priceData.description) {
              const [tier, interval] = priceData.description.split("_");
              if (tier && interval) {
                // Standard format: "medium_monthly"
                if (!priceList[tier]) {
                  priceList[tier] = {};
                }
                priceList[tier][interval] = newPrice;
              } else if (
                priceData.description === "monthly" ||
                priceData.description === "yearly"
              ) {
                // Facility format: just "monthly" or "yearly"
                if (!priceList["facility"]) {
                  priceList["facility"] = {};
                }
                priceList["facility"][priceData.description] = newPrice;
              }
            } else {
              let key =
                priceData.type === "one_time" ? "day" : priceData.interval;
              priceList[key] = newPrice;
            }
          });

          return priceList;
        });

        const allPriceLists = await Promise.all(pricePromises);
        const mergedPrices = allPriceLists.reduce(
          (acc, curr) => ({ ...acc, ...curr }),
          {}
        );

        setPrices(mergedPrices);
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  useEffect(() => {
    if (role) {
      getPlans();
    }
  }, [role]);

  const startTrial = async (planId = null) => {
    setTrialLoading(planId);
    try {
      const startTrialFunction = firebase
        .functions()
        .httpsCallable("startTrial");
      const result = await startTrialFunction();
      if (result.data.success) {
        console.log("Trial started successfully");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error starting trial:", error);
      alert(`Error starting trial: ${error.message}`);
      setTrialLoading(null);
    }
  };

  return (
    <>
      {trialExpired && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Trial Expired</AlertTitle>
          {isFacility
            ? "Your CareMap Plus trial has ended. Choose a plan below to keep your facility workflows running smoothly."
            : "Your free trial has ended. Choose a plan below to get unlimited access to Medical SuperIntelligence."}
        </Alert>
      )}

      {canStartTrial && !showPricing ? (
        <Box
          sx={{
            textAlign: "center",
            py: 6,
            px: 2,
            my: 4,
          }}
        >
          <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>
            {isFacility
              ? "Try CareMap Plus Free"
              : "Try Medical SuperIntelligence Free"}
          </Typography>
          {isFacility && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 3, maxWidth: 520, mx: "auto" }}
            >
              Coordinate your waiting room, staffing, and patient flow with the
              same tools you keep on CareMap Plus.
            </Typography>
          )}
          {!isFacility && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 500, mx: "auto" }}
            >
              No credit card required. Full access to AI-powered medical
              intelligence for {trialLengthDays} days.
            </Typography>
          )}
          <UpgradeFeatures
            role={role}
            dense
            sx={{
              textAlign: "left",
              maxWidth: 520,
              mx: "auto",
              mb: 3,
              color: "text.secondary",
              "& .MuiListItemIcon-root": { minWidth: 32 },
            }}
          />
          <LoadingButton
            loading={trialLoading === "startTrial"}
            disabled={trialLoading !== null}
            variant="contained"
            size="large"
            onClick={() => startTrial("startTrial")}
            sx={{ px: 5, py: 1.5, fontSize: "1.1rem", mb: 2 }}
          >
            {isFacility
              ? `Start ${trialLengthDays}-Day CareMap Trial`
              : `Start ${trialLengthDays}-Day Free Trial`}
          </LoadingButton>
          <Box sx={{ mt: 2 }}>
            <Link
              component="button"
              variant="body2"
              onClick={() => setShowPricing(true)}
              sx={{
                color: "text.secondary",
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              View subscription plans →
            </Link>
          </Box>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              maxWidth: 520,
              mx: "auto",
              textAlign: "left",
              mb: 3,
              color: "text.secondary",
            }}
          >
            <UpgradeFeatures
              role={role}
              dense
              sx={{
                "& .MuiListItemIcon-root": { minWidth: 32 },
                color: "text.secondary",
              }}
            />
          </Box>

          <Box id="pricing-plans">
            <PricingControls
              prices={prices}
              selectedInterval={selectedInterval}
              onIntervalChange={setSelectedInterval}
              canStartTrial={canStartTrial}
              startTrial={startTrial}
              trialLoading={trialLoading}
              subscription={subscription}
              role={role}
              trialExpired={trialExpired}
            />
          </Box>

          {canStartTrial && showPricing && (
            <Box sx={{ textAlign: "center", mt: 4, mb: 2 }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => setShowPricing(false)}
                sx={{
                  color: "text.secondary",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                ← Back to free trial
              </Link>
            </Box>
          )}
        </>
      )}
    </>
  );
};

export default Pricing;
