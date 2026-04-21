import React, { useEffect, useState } from "react";
import { Box, Typography, Alert, CircularProgress } from "@mui/material";
import KijabeChat from "components/chatbot/KijabeChat";

/**
 * Page component for Kijabe chat functionality
 * Handles authentication and wraps the KijabeChat component
 */
const KijabeChatPage = () => {
  const [kijabeData, setKijabeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if we have Kijabe data in session storage (from JWT auth)
    const storedKijabeUser = sessionStorage.getItem("kijabeUser");
    
    if (storedKijabeUser) {
      try {
        const kijabeUserData = JSON.parse(storedKijabeUser);
        
        setKijabeData({
          userId: kijabeUserData.userId,
          displayName: kijabeUserData.displayName,
          email: kijabeUserData.email,
          userTier: kijabeUserData.userTier || "basic",
          isDirectLogin: true,
          fromWordPress: kijabeUserData.fromWordPress || false,
          custom_prompt: kijabeUserData.custom_prompt,
        });
        
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

  if (loading) {
    return (
      <Box sx={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        height: "100vh" 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column",
      p: 2 
    }}>
      <Typography variant="h4" sx={{ mb: 2, textAlign: "center" }}>
        Kijabe Health Chat
      </Typography>
      
      {kijabeData && (
        <Typography variant="subtitle1" sx={{ mb: 2, textAlign: "center", color: "text.secondary" }}>
          Welcome, {kijabeData.displayName}
        </Typography>
      )}
      
      <Box sx={{ flexGrow: 1 }}>
        <KijabeChat userData={kijabeData} />
      </Box>
    </Box>
  );
};

export default KijabeChatPage; 