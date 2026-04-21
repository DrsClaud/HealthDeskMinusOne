/**
 * Hook for getting and managing user geolocation
 *
 * Returns position data, formatted coordinates, error state, and welcome popup control.
 * Falls back to default Illinois coordinates if geolocation fails or is unavailable.
 * Shows welcome popup when using fallback location to let user input custom location.
 *
 * @returns {Object}
 * - latitude/longitude: Raw position values
 * - coords: Formatted {lat, lng} for map consumption
 * - error: Error message if geolocation fails
 * - showPopup/setShowPopup: Welcome modal state control
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

export const FALLBACK_POSITION = {
  latitude: 41.873545,
  longitude: -87.629086,
};

export default function usePosition() {
  const [position, setPosition] = useState(() => {
    // Check for saved location on initial load
    const saved = localStorage.getItem("userLocation");
    if (saved) {
      const { lat, lng } = JSON.parse(saved);
      return { latitude: lat, longitude: lng };
    }
    return null;
  });
  const [manualCoords, setManualCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Use ref to avoid dependency loop (handleError → position → handleError)
  const positionRef = useRef(position);
  positionRef.current = position;

  const handleError = useCallback((error) => {
    if (!positionRef.current) {
      const saved = localStorage.getItem("userLocation");
      if (saved) {
        const { lat, lng } = JSON.parse(saved);
        setPosition({ latitude: lat, longitude: lng });
      } else {
        setPosition(FALLBACK_POSITION);
        setPermissionDenied(error.code === 1);
        setShowPopup(error.code === 1);
      }
      setError(error.message);
    }
    setLoading(false);
  }, []); // No dependencies - uses ref instead

  const coords = useMemo(() => {
    if (manualCoords) return manualCoords;
    return {
      lat: position?.latitude ?? FALLBACK_POSITION.latitude,
      lng: position?.longitude ?? FALLBACK_POSITION.longitude,
    };
  }, [position, manualCoords]);

  const setCoords = useCallback((newCoords) => {
    setManualCoords(newCoords);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      handleError({ message: "Geolocation not supported" });
      return;
    }

    let timeoutId;
    let lastUpdate = 0;
    const MIN_UPDATE_INTERVAL = 5000; // Only update every 5 seconds max
    
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Throttle updates to prevent infinite re-renders in Chromium
        const now = Date.now();
        if (now - lastUpdate < MIN_UPDATE_INTERVAL) {
          setLoading(false);
          return;
        }
        lastUpdate = now;
        
        setPosition((prev) => {
          // Only update if position actually changed significantly
          if (prev && 
              Math.abs(prev.latitude - coords.latitude) < 0.0001 &&
              Math.abs(prev.longitude - coords.longitude) < 0.0001) {
            return prev; // Return same reference to prevent re-render
          }
          return {
            latitude: coords.latitude,
            longitude: coords.longitude,
          };
        });
        setLoading(false);
      },
      handleError,
      { enableHighAccuracy: true }
    );

    // Set timeout after starting the watch
    timeoutId = setTimeout(() => {
      handleError({ message: "Geolocation timeout" });
    }, 5000);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      navigator.geolocation.clearWatch(watchId);
    };
  }, [handleError]);

  return {
    loading,
    error,
    showPopup,
    setShowPopup,
    setCoords,
    permissionDenied,
    ...position,
    coords,
  };
}
