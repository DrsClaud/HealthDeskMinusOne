import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Fade,
  Alert,
} from "@mui/material";
import { LocationOn, TouchApp, Schedule } from "@mui/icons-material";
import { loadNearbyZipCodes } from "./data/zipCodes";
import ZipMarker from "./ZipMarker";
import "leaflet/dist/leaflet.css";
import { useAuth } from "hooks/useAuth";
import { useFacility } from "hooks/useFacility";
import { isAuctionEnded } from "utils/dateUtils";

// Component to handle ZIP code selection
const ZipCodeMap = ({ selectedZips, onZipToggle }) => {
  const { data: facility } = useFacility();
  const [loading, setLoading] = useState(true);
  const [visibleMarkers, setVisibleMarkers] = useState([]);
  const { zipSubscriptions, zipPromotions } = useAuth();
  const [auctionProcessing, setAuctionProcessing] = useState(false);
  const initialZoomLevel = 12;

  // Fixed radius in kilometers and max markers to show
  const FIXED_RADIUS = 50;
  const MAX_MARKERS = 150;

  // Check if auctions are in processing period
  useEffect(() => {
    const checkAuctionStatus = () => {
      // Check if we're in global auction processing period
      const isEnded = isAuctionEnded();
      setAuctionProcessing(isEnded);
    };

    // Check immediately
    checkAuctionStatus();

    // Check every 30 seconds during processing periods
    const interval = setInterval(checkAuctionStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // Load ZIP codes around facility location
  useEffect(() => {
    if (!facility || !facility.lat || !facility.lng) return;

    const loadZipCodes = async () => {
      setLoading(true);
      try {
        console.log(
          `Loading ZIP codes around facility at ${facility.lat},${facility.lng}`
        );
        const zipCodes = await loadNearbyZipCodes(
          facility.lat,
          facility.lng,
          FIXED_RADIUS
        );

        // Always show selected ZIPs first
        const selectedZipArray = Array.from(selectedZips);
        const priorityZips = selectedZipArray
          .filter((zipId) => zipCodes[zipId])
          .map((zipId) => zipCodes[zipId]);

        // Sort other ZIP codes by distance to facility
        const otherZips = Object.values(zipCodes)
          .filter((zip) => !selectedZipArray.includes(zip.id))
          .filter((zip) => zip.lat && zip.lng)
          .sort((a, b) => {
            const distA = Math.sqrt(
              Math.pow(a.lat - facility.lat, 2) +
                Math.pow(a.lng - facility.lng, 2)
            );
            const distB = Math.sqrt(
              Math.pow(b.lat - facility.lat, 2) +
                Math.pow(b.lng - facility.lng, 2)
            );
            return distA - distB;
          })
          .slice(0, MAX_MARKERS - priorityZips.length);

        // Set visible markers
        setVisibleMarkers([...priorityZips, ...otherZips]);
      } catch (error) {
        console.error("Error loading ZIP codes:", error);
      } finally {
        setLoading(false);
      }
    };

    loadZipCodes();
  }, [facility, selectedZips]);

  // Handle ZIP code toggle
  const handleZipToggle = useCallback(
    (zipCode) => {
      // Don't allow new selections during auction processing
      if (auctionProcessing) return;

      if (onZipToggle) {
        onZipToggle(zipCode);
      }
    },
    [onZipToggle, auctionProcessing]
  );

  // Check if we have facility data yet
  if (!facility?.lat || !facility?.lng) {
    return (
      <Box
        sx={{
          mb: 4,
          height: 400,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading facility location...
        </Typography>
      </Box>
    );
  }

  // Show auction processing message
  if (auctionProcessing) {
    return (
      <Alert severity="info" icon={<Schedule />} sx={{ mb: 2 }}>
        <Typography variant="body2">
          The current auction cycle has ended and results are being processed.
          You can view your existing ZIP codes below, but new ZIP code selection
          will be available when the next auction period begins.
        </Typography>
      </Alert>
    );
  }

  // Show message when no markers are visible or when user hasn't selected any ZIPs yet
  const showMessage =
    !loading && (visibleMarkers.length === 0 || selectedZips.size === 0);

  return (
    <Box sx={{ mb: 4, height: 400, position: "relative" }}>
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backgroundColor: "rgba(255,255,255,0.7)",
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <Box sx={{ height: "100%", width: "100%" }}>
        <MapContainer
          center={[facility.lat, facility.lng]}
          zoom={initialZoomLevel}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url={`https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${process.env.REACT_APP_MAPTILER_KEY || ''}`}
            attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
          />

          {visibleMarkers.map((zip) => (
            <ZipMarker
              key={zip.id}
              zip={zip}
              isSelected={selectedZips.has(zip.id)}
              hasActiveAd={zipSubscriptions[zip.id]?.status === "active"}
              hasActivePromotion={zipPromotions[zip.id]?.status === "active"}
              onToggle={handleZipToggle}
            />
          ))}

          {/* Click to get started message */}
          <Fade in={showMessage} timeout={500}>
            <Box
              sx={{
                position: "absolute",
                bottom: 20,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 500,
                pointerEvents: "none",
              }}
            >
              <Paper
                elevation={2}
                sx={{
                  px: 2,
                  py: 1.5,
                  textAlign: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TouchApp
                    sx={{
                      fontSize: 20,
                      color: "primary.main",
                      opacity: 0.8,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: "text.primary" }}
                  >
                    Click on a marker to select a ZIP code.
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Fade>
        </MapContainer>
      </Box>
    </Box>
  );
};

export default ZipCodeMap;
