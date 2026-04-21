import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import NewKijabeChatPage from "components/chatbot/NewKijabeChatPage";

/**
 * Dashboard specifically for Kijabe users
 * Only supports direct login via JWT token and session storage
 * Works in both standalone and iframe (WordPress) modes
 */
const KijabeDashboard = () => {
  const [kijabeData, setKijabeData] = useState(null);
  const [wpData, setWpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInWordPress, setIsInWordPress] = useState(false);
  const [usageStats, setUsageStats] = useState(null);

  const memoizedUserData = useMemo(() => {
    if (!kijabeData) return null;

    // Create the object once and return the same reference if dependencies haven't changed
    const baseData = {
      userId: kijabeData.userId,
      displayName: kijabeData.displayName,
      email: kijabeData.email,
      isDirectLogin: kijabeData.isDirectLogin,
      custom_prompt: kijabeData.custom_prompt,
      assistant_id: kijabeData.assistant_id, // NEW: Include assistant_id
      fromWordPress: isInWordPress,
    };

    // Add WordPress data if available
    if (wpData) {
      return {
        ...baseData,
        wpUserId: wpData.userId,
        wpUsername: wpData.username,
        pageTitle: wpData.pageTitle,
        pageUrl: wpData.pageUrl,
        assistant_id: wpData.assistant_id, // NEW: Pass through assistant_id
      };
    }

    return baseData;
  }, [
    kijabeData?.userId,
    kijabeData?.displayName,
    kijabeData?.email,
    kijabeData?.isDirectLogin,
    kijabeData?.custom_prompt,
    kijabeData?.assistant_id,
    wpData?.userId,
    wpData?.username,
    wpData?.pageTitle,
    wpData?.pageUrl,
    wpData?.assistant_id,
    isInWordPress,
  ]);

  useEffect(() => {
    const isFramed = window.self !== window.top;
    const storedKijabeUser = sessionStorage.getItem("kijabeUser");

    if (isFramed) {
      setIsInWordPress(true);
    } else {
      setIsInWordPress(false);
    }
  }, []);

  useEffect(() => {
    // Check if we have Kijabe data in session storage (from JWT auth)
    const storedKijabeUser = sessionStorage.getItem("kijabeUser");

    if (storedKijabeUser) {
      try {
        const kijabeUserData = JSON.parse(storedKijabeUser);

        // Set main Kijabe user data
        setKijabeData({
          userId: kijabeUserData.userId,
          displayName: kijabeUserData.displayName,
          email: kijabeUserData.email,
          isDirectLogin: true,
          custom_prompt: kijabeUserData.custom_prompt,
          assistant_id: kijabeUserData.assistant_id, // NEW: Include assistant_id
        });

        // Set WordPress specific data if available
        if (kijabeUserData.wpPageTitle || kijabeUserData.wpUserId) {
          setWpData({
            userId: kijabeUserData.wpUserId,
            username: kijabeUserData.wpUsername,
            pageTitle: kijabeUserData.wpPageTitle,
            pageUrl: kijabeUserData.wpPageUrl,
            custom_prompt: kijabeUserData.custom_prompt,
            assistant_id: kijabeUserData.assistant_id, // NEW: Pass through assistant_id
          });
        }

        setLoading(false);
      } catch (e) {
        console.error("Error parsing Kijabe user data:", e);
        setError("Invalid session data. Please try reloading the page.");
        setLoading(false);
      }
    } else {
      // No authentication data found
      setLoading(false);
      setError(
        "User not authenticated. Please access this page through the Kijabe learning platform."
      );
    }
  }, []);

  const handleReturnToKijabe = () => {
    // Always try to use WordPress page URL if available
    if (wpData?.pageUrl) {
      sessionStorage.removeItem("kijabeUser");
      window.location.href = wpData.pageUrl;
      return;
    }

    // Fallback to home page if no page URL
    sessionStorage.removeItem("kijabeUser");
    window.location.href = "/";
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: isInWordPress ? "800px" : "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: "auto", mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        {isInWordPress ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", textAlign: "center", mt: 2 }}
          >
            If you're experiencing issues, please refresh the page.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={handleReturnToKijabe}
            >
              Go Back
            </Button>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        mt: isInWordPress ? 1 : 4,
      }}
    >
      {!isInWordPress && wpData?.pageUrl && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleReturnToKijabe}
          >
            Return to Course
          </Button>
        </Box>
      )}

      <NewKijabeChatPage
        userData={memoizedUserData}
        onUsageUpdate={setUsageStats}
      />
    </Box>
  );
};

export default KijabeDashboard;
