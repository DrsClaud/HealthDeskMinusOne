import React, { useState, useEffect, useContext } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Snackbar,
  Alert,
  Button,
  Chip,
  Stack,
} from "@mui/material";
import { CheckCircle, Cancel, Close } from "@mui/icons-material";
import ZipCodeTable from "components/dashboard/auction/ZipCodeTable";
import ZipCodeMap from "components/dashboard/auction/ZipCodeMap";
import OutstandingInvoice from "components/dashboard/auction/OutstandingInvoice";
import AdvertisingRequirements from "components/dashboard/auction/AdvertisingRequirements";
import AdPreview from "components/dashboard/auction/AdPreview";
import { useAuth } from "hooks/useAuth";
import DashboardPageHeader from "components/common/DashboardPageHeader";
import { LocationContext } from "context/Location";
import { db } from "services/firebase";
import { getNextAuctionEndDate } from "utils/dateUtils";
import firebase from "firebase/compat/app";
import { preloadZipCodes } from "components/dashboard/auction/data/zipCodes";
import { formatCurrency } from "components/dashboard/auction/utils/formatUtils";

const AuctionPage = () => {
  const { userData, zipPromotions, zipSubscriptions, pendingInvoice, user } =
    useAuth();
  const { location } = useContext(LocationContext);
  const [selectedZips, setSelectedZips] = useState([]);
  const [auctionData, setAuctionData] = useState({});
  const [loading, setLoading] = useState(true);
  const [pendingZips, setPendingZips] = useState(new Set());
  const [initialLoad, setInitialLoad] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successZipCode, setSuccessZipCode] = useState(null);

  // Check for promotion success on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const promotionSuccess = urlParams.get("promotion_success");
    const zipCode = urlParams.get("zipCode");

    if (promotionSuccess === "true" && zipCode) {
      setShowSuccessMessage(true);
      setSuccessZipCode(zipCode);

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Check if requirements are met (including verified email for facilities)
  // Email is only verified if Firebase Auth HAS an email AND it's marked verified
  // (phone auth users have emailVerified=true but email=null, which doesn't count)
  const requirementsMet =
    location?.branding?.logo &&
    location?.branding?.website &&
    location?.group &&
    user?.email &&
    user?.emailVerified;

  // Handle dismissing auction notifications
  const dismissAuctionNotifications = async () => {
    if (!userData?.uid) return;

    try {
      await db.collection("users").doc(userData.uid).update({
        auctionNotifications: firebase.firestore.FieldValue.delete(),
        auctionNotificationsUpdatedAt: firebase.firestore.Timestamp.now(),
      });
    } catch (error) {
      console.error("Failed to dismiss auction notifications:", error);
    }
  };

  // Get auction notifications from userData
  const auctionNotifications = userData?.auctionNotifications || [];

  // Render win notifications
  const renderWinNotifications = () => {
    const winNotifications = auctionNotifications.filter(
      (n) => n.type === "auction_win"
    );

    if (winNotifications.length === 0) return null;

    return (
      <Alert
        severity="success"
        sx={{ mb: 3 }}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={dismissAuctionNotifications}
            startIcon={<Close />}
          >
            Dismiss
          </Button>
        }
      >
        <Typography variant="h6" sx={{ mb: 1 }}>
          You've won!
        </Typography>

        <Typography variant="body1" sx={{ mb: 2 }}>
          Congratulations! Your featured listings are now active. You have been
          billed for your winning bid{winNotifications.length > 1 ? "s" : ""}.
        </Typography>

        <Box component="ul" sx={{ pl: 0, mb: 0 }}>
          {winNotifications.map((notification) => (
            <Box
              component="li"
              key={notification.zipCode}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                mb: 1,
                listStyle: "none",
              }}
            >
              <CheckCircle sx={{ color: "success.main", fontSize: 20 }} />
              <Typography variant="body1">
                <strong>ZIP Code {notification.zipCode}</strong> - Winning bid:{" "}
                {formatCurrency(notification.yourBid / 100)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Alert>
    );
  };

  // Render loss notifications
  const renderLossNotifications = () => {
    const lossNotifications = auctionNotifications.filter(
      (n) => n.type === "auction_loss"
    );

    if (lossNotifications.length === 0) return null;

    return (
      <Alert
        severity="info"
        sx={{ mb: 3 }}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={dismissAuctionNotifications}
            startIcon={<Close />}
          >
            Dismiss
          </Button>
        }
      >
        <Typography variant="h6" sx={{ mb: 1 }}>
          Recent Auction Results
        </Typography>

        <Typography variant="body2" sx={{ mb: 2 }}>
          You didn't win {lossNotifications.length} auction
          {lossNotifications.length > 1 ? "s" : ""} this time.
        </Typography>

        <Box component="ul" sx={{ pl: 0, mb: 0 }}>
          {lossNotifications.map((notification) => (
            <Box
              component="li"
              key={notification.zipCode}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                mb: 1,
                listStyle: "none",
              }}
            >
              <Cancel sx={{ color: "text.secondary", fontSize: 20 }} />
              <Typography variant="body2">
                <strong>ZIP Code {notification.zipCode}</strong> - Your bid:{" "}
                {formatCurrency(notification.yourBid / 100)} | Winning bid:{" "}
                {formatCurrency(notification.winningBid / 100)}
              </Typography>
            </Box>
          ))}
        </Box>

        <Typography variant="body2" sx={{ mt: 2 }}>
          New auctions start monthly. You can place bids anytime.
        </Typography>
      </Alert>
    );
  };

  // Load user's promoted ZIP codes
  useEffect(() => {
    // Combine both promotion and subscription (featured) ZIP codes
    const allActiveZips = [
      ...(zipPromotions ? Object.keys(zipPromotions) : []),
      ...(zipSubscriptions ? Object.keys(zipSubscriptions) : []),
    ];

    // Remove duplicates
    const uniqueZips = [...new Set(allActiveZips)];

    if (uniqueZips.length > 0) {
      // Mark all ZIPs as pending initially
      if (initialLoad && uniqueZips.length > 0) {
        setPendingZips(new Set(uniqueZips));
      }

      // Only set initial ZIP codes on first load or when no ZIPs are selected
      if (selectedZips.length === 0) {
        setSelectedZips(uniqueZips);

        // Batch preload ZIP code data for the selected ZIPs
        preloadZipCodes(uniqueZips);
      } else {
        // For subsequent updates, add any new listings to the beginning
        // without removing existing selections
        setSelectedZips((prev) => {
          const newZips = [];

          // Add newly active ZIPs that aren't already selected
          uniqueZips.forEach((zip) => {
            if (!prev.includes(zip)) {
              newZips.push(zip);
              // Also mark newly added ZIPs as pending
              setPendingZips((prevPending) => new Set([...prevPending, zip]));
            }
          });

          // Preload any new ZIP codes
          if (newZips.length > 0) {
            preloadZipCodes(newZips);
          }

          // Combine with existing selections
          return [...newZips, ...prev];
        });
      }
    }
  }, [zipPromotions, zipSubscriptions, initialLoad]);

  // Handle ZIP selection with loading state
  const handleZipToggle = (zipCode) => {
    setPendingZips((prev) => new Set([...prev, zipCode]));

    // No need to preload here as we'll do it in the ZIP code map component

    setSelectedZips((prev) => {
      // Check if the ZIP is already in the array
      const zipIndex = prev.indexOf(zipCode);

      if (zipIndex >= 0) {
        // If ZIP exists, remove it
        const newZips = [...prev];
        newZips.splice(zipIndex, 1);
        return newZips;
      } else {
        // If ZIP doesn't exist, add it to the beginning
        return [zipCode, ...prev];
      }
    });
  };

  // Fetch auction data
  useEffect(() => {
    if (selectedZips.length === 0) {
      setAuctionData({});
      return;
    }

    if (initialLoad) setLoading(true);

    const zipArray = [...selectedZips];
    const auctionDataMap = { ...auctionData }; // Keep existing data

    // Get the next auction end date
    const nextEndDate = getNextAuctionEndDate();

    // Default auction data for ZIP codes without an auction document
    const defaultAuctionData = {
      currentBid: 0,
      startingPrice: 100000, // $1000 in cents
      endTime: firebase.firestore.Timestamp.fromDate(nextEndDate),
      numberOfBids: 0,
      status: "active",
    };

    // Create an array to store all the unsubscribe functions
    const unsubscribers = [];

    // Set up real-time listeners for each ZIP code
    zipArray.forEach((zipCode) => {
      const unsubscribe = db
        .collection("auctions")
        .doc(String(zipCode))
        .onSnapshot(
          (doc) => {
            if (doc.exists) {
              // Use actual auction data if it exists
              setAuctionData((prevData) => ({
                ...prevData,
                [zipCode]: doc.data(),
              }));
            } else {
              // Use default data if no auction document exists
              setAuctionData((prevData) => ({
                ...prevData,
                [zipCode]: defaultAuctionData,
              }));
            }

            // Remove this ZIP from pending state once data is loaded
            setPendingZips((prev) => {
              const updated = new Set(prev);
              updated.delete(zipCode);
              return updated;
            });
          },
          (error) => {
            console.error(
              `Error fetching auction data for ZIP ${zipCode}:`,
              error
            );

            // Still provide default data on error
            setAuctionData((prevData) => ({
              ...prevData,
              [zipCode]: defaultAuctionData,
            }));

            // Remove this ZIP from pending state
            setPendingZips((prev) => {
              const updated = new Set(prev);
              updated.delete(zipCode);
              return updated;
            });
          }
        );

      // Store the unsubscribe function
      unsubscribers.push(unsubscribe);
    });

    if (initialLoad) {
      setLoading(false);
      setInitialLoad(false);
    }

    // Clean up function to detach listeners when component unmounts
    // or when selected ZIPs change
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [selectedZips]);

  return (
    <Container maxWidth="lg">
      <DashboardPageHeader
        title="Advertise"
        subtitle={
          <Typography sx={{ display: "block", maxWidth: "800px" }}>
            Enhance your facility's visibility to local patients seeking care.
            Select ZIP codes you want to advertise in to get started. Top bidders
            secure priority positions in search results and the promotional
            carousel, maximizing exposure to potential patients in your area.
          </Typography>
        }
      />

      {/* Display win notifications at the top */}
      {renderWinNotifications()}

      {/* Display outstanding invoice if exists */}
      <OutstandingInvoice invoice={pendingInvoice} />

      {!requirementsMet ? (
        <AdvertisingRequirements location={location} userData={userData} />
      ) : (
        <>
          {/* Success message for promotion checkout */}
          {showSuccessMessage && successZipCode && (
            <Alert
              onClose={() => setShowSuccessMessage(false)}
              severity="success"
              sx={{ mb: 4 }}
            >
              {`Your promotion for ZIP Code ${successZipCode} has been successfully added! Your ad is now active on the CareMap.`}
            </Alert>
          )}

          {/* Show ad preview before the map */}
          <AdPreview location={location} userData={userData} />

          <ZipCodeMap
            selectedZips={new Set(selectedZips)}
            onZipToggle={handleZipToggle}
          />

          {/* Display loss notifications after the map */}
          {renderLossNotifications()}

          <Box>
            <ZipCodeTable
              selectedZips={new Set(selectedZips)}
              auctionData={auctionData}
              loading={initialLoad && loading}
              loadingZips={pendingZips}
            />
          </Box>
        </>
      )}
    </Container>
  );
};

export default AuctionPage;
