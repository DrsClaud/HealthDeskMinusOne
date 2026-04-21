/**
 * Hook for handling user geolocation and ZIP code lookup using Mapbox's geocoding API.
 *
 * This hook manages the user's location state and handles the retrieval of ZIP codes
 * for given coordinates. It integrates with the shared Mapbox cache to prevent
 * redundant API calls when ZIP codes have already been fetched by other parts of
 * the application (like the search functionality).
 *
 * Features:
 * - Automatic geolocation on mount
 * - Fallback to default coordinates if geolocation fails
 * - ZIP code lookup using Mapbox API
 * - Coordinates formatting for map consumption
 * - Error handling
 * - Loading state management
 * - Welcome popup for fallback scenarios
 * - Shared cache integration to prevent redundant API calls
 *
 * @returns {Object} Location state and handlers
 * @property {number} latitude - Current latitude
 * @property {number} longitude - Current longitude
 * @property {Object} coords - Formatted {lat, lng} for map consumption
 * @property {string} zipCode - ZIP code for current location
 * @property {string} error - Error message if geolocation/API calls fail
 * @property {boolean} loading - Loading state for API calls
 * @property {boolean} showPopup - Welcome modal visibility state
 * @property {Function} setShowPopup - Control welcome modal visibility
 * @property {Function} setCoords - Update coordinates manually
 */

import { useState, useEffect, useCallback } from "react";
import { useMapboxCache } from "./useMapboxCache";

const FALLBACK_POSITION = {
  latitude: 40.703545,
  longitude: -89.579086,
};

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_API;

export default function useLocation() {
  const [position, setPosition] = useState(null);
  const [zipCode, setZipCode] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const cache = useMapboxCache();

  const formatCoords = (pos) => ({
    lat: pos.latitude,
    lng: pos.longitude,
  });

  const setCoords = useCallback(
    (lat, lng) => {
      // Ensure we have valid numbers
      const numLat = Number(lat);
      const numLng = Number(lng);

      if (isNaN(numLat) || isNaN(numLng)) {
        console.error("Invalid coordinates:", { lat, lng });
        return;
      }

      // Add position equality check
      if (position?.latitude === numLat && position?.longitude === numLng) {
        return;
      }

      const newPosition = {
        latitude: numLat,
        longitude: numLng,
      };

      // Check shared cache first
      const cachedZipCode = cache.getZipCode(numLat, numLng);
      if (cachedZipCode) {
        console.log("Using cached ZIP code:", cachedZipCode);
        setPosition(newPosition);
        setZipCode(cachedZipCode);
        return;
      }

      setPosition(newPosition);
      setLoading(true);

      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${numLng},${numLat}.json?access_token=${MAPBOX_TOKEN}&types=postcode`
      )
        .then((response) => response.json())
        .then((data) => {
          const postcode = data.features?.[0]?.text;
          if (postcode) {
            cache.setZipCode(numLat, numLng, postcode);
            setZipCode(postcode);
          } else {
            throw new Error("No ZIP code found for these coordinates");
          }
        })
        .catch((err) => {
          console.error("Error fetching zip code:", err);
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [cache, position] // Add position to dependencies
  );

  useEffect(() => {
    // First check localStorage for saved location
    const savedLocation = localStorage.getItem("userLocation");
    if (savedLocation) {
      try {
        const { lat, lng, zip } = JSON.parse(savedLocation);
        console.log("Using saved location:", { lat, lng, zip });
        setPosition({ latitude: lat, longitude: lng });
        if (zip) {
          setZipCode(zip);
        } else {
          setCoords(lat, lng); // Trigger ZIP lookup if no ZIP saved
        }
        return;
      } catch (error) {
        console.error("Error parsing saved location:", error);
        localStorage.removeItem("userLocation");
      }
    }

    if (!navigator.geolocation) {
      console.log("Geolocation not supported");
      setCoords(FALLBACK_POSITION.latitude, FALLBACK_POSITION.longitude);
      setShowPopup(true);
      setError("Geolocation not supported");
      return;
    }

    console.log("Requesting geolocation...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Geolocation success:", position);
        setCoords(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setCoords(FALLBACK_POSITION.latitude, FALLBACK_POSITION.longitude);
        setShowPopup(true);
        setError(error.message);
      },
      { timeout: 10000, maximumAge: 0 }
    );
  }, []); // Only run on mount

  return {
    ...position,
    coords: position ? formatCoords(position) : formatCoords(FALLBACK_POSITION),
    zipCode,
    error,
    loading,
    showPopup,
    setShowPopup,
    setCoords,
  };
}
