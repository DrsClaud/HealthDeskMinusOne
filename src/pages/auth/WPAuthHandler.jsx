import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Typography, Box, CircularProgress, Alert } from "@mui/material";

// Firebase function endpoint for Kijabe authentication
const FIREBASE_FUNCTION_URL = `https://us-central1-${process.env.REACT_APP_FIREBASE_PROJECT_ID}.cloudfunctions.net/kijabeLogin`;

/**
 * This component handles WordPress iframe authentication flow
 * It expects a JWT token parameter in the URL
 */
const WPAuthHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("==== WordPress Auth Handler Initialized ====");

    const params = new URLSearchParams(location.search);
    const wpToken = params.get("token");

    console.log(
      "WordPress token received:",
      wpToken ? `${wpToken.substring(0, 15)}...` : "No token"
    );

    if (!wpToken) {
      console.error("No WordPress token provided");
      setError("No authentication token provided.");
      setLoading(false);
      return;
    }

    // Send WordPress JWT to Firebase function
    console.log(`Sending token to Firebase function: ${FIREBASE_FUNCTION_URL}`);
    fetch(`${FIREBASE_FUNCTION_URL}?token=${wpToken}`)
      .then((response) => {
        console.log(
          "Response received from Firebase function:",
          response.status,
          response.statusText
        );
        if (!response.ok) {
          return response.json().then((err) => {
            console.error("Response error data:", err);
            // Use the detailed error message from the server
            throw new Error(
              err.error || err.originalError || "Failed to authenticate"
            );
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log("Parsed response data:", JSON.stringify(data, null, 2));

        // We're always using direct login method for WordPress embedding
        if (data.userEmail) {
          console.log("Direct login method for WordPress:", data.userEmail);

          // Extract WordPress-specific data from the token if available
          let wpData = {};

          try {
            // Attempt to decode the token to extract custom WordPress fields
            // This is a fallback in case they're not returned directly from the function
            const tokenParts = wpToken.split(".");
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              console.log("Decoded JWT payload:", payload);

              // Extract WordPress data from the token
              if (payload.wp_page_title || payload.user_id) {
                wpData = {
                  wpUserId: payload.user_id,
                  wpUsername: payload.wp_username,
                  wpPageTitle: payload.wp_page_title,
                  wpPageUrl: payload.wp_page_url,
                };

                // Add custom prompt if available in the token
                if (payload.custom_prompt) {
                  console.log("Custom prompt received from WordPress");
                  wpData.custom_prompt = payload.custom_prompt;
                }

                // Add assistant ID if specified (for Ask Me Anything or other assistants)
                if (payload.assistant_id) {
                  console.log(
                    "Assistant ID received from WordPress:",
                    payload.assistant_id
                  );
                  wpData.assistant_id = payload.assistant_id;
                }
              }
            }
          } catch (e) {
            console.error("Error decoding JWT token:", e);
          }

          // Store user info in sessionStorage
          sessionStorage.setItem(
            "kijabeUser",
            JSON.stringify({
              email: data.userEmail,
              displayName: data.displayName,
              userId: data.userId,
              signature: data.signature,
              fromWordPress: true,
              // Add WordPress data
              ...wpData,
            })
          );

          console.log("WordPress user data stored in session storage");

          // Navigate directly to dashboard
          console.log("Navigating to Kijabe dashboard...");
          setLoading(false);
          navigate("/kijabe-dashboard");
        } else {
          throw new Error("No user data received from authentication service");
        }
      })
      .catch((error) => {
        console.error("Authentication error details:", error);
        setError(`${error.message}`);
        setLoading(false);
      });
  }, [location.search, navigate]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "300px",
        p: 3,
      }}
    >
      {loading ? (
        <>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="h6">Loading...</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please wait while we verify your credentials.
          </Typography>
        </>
      ) : error ? (
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          {error}
        </Alert>
      ) : null}
    </Box>
  );
};

export default WPAuthHandler;
