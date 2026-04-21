/**
 * Provides a shared caching mechanism for Mapbox-related data across the application.
 *
 * This context and hook combination creates a centralized cache for storing and retrieving
 * geographic data (coordinates and ZIP codes) fetched from Mapbox APIs. This prevents
 * redundant API calls when the same location data is needed by different components
 * or hooks.
 *
 * The cache stores:
 * - ZIP codes indexed by coordinate pairs
 * - Coordinates indexed by Mapbox place IDs
 *
 * Used by both useSearch and useLocation hooks to coordinate their Mapbox API usage
 * and prevent unnecessary duplicate calls.
 */
import { createContext, useContext, useRef } from "react";

const MapboxCacheContext = createContext(null);

export const MapboxCacheProvider = ({ children }) => {
  const cache = useRef(new Map());

  const value = {
    getZipCode: (lat, lng) => {
      // Add input validation
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        isNaN(lat) ||
        isNaN(lng)
      ) {
        console.warn("Invalid coordinates provided to getZipCode:", {
          lat,
          lng,
        });
        return null;
      }

      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      return cache.current.get(key);
    },
    setZipCode: (lat, lng, zipCode) => {
      // Add input validation
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        isNaN(lat) ||
        isNaN(lng)
      ) {
        console.warn("Invalid coordinates provided to setZipCode:", {
          lat,
          lng,
        });
        return;
      }

      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      cache.current.set(key, zipCode);
    },
    getCoords: (placeId) => cache.current.get(`place_${placeId}`),
    setCoords: (placeId, coords) =>
      cache.current.set(`place_${placeId}`, coords),
  };

  return (
    <MapboxCacheContext.Provider value={value}>
      {children}
    </MapboxCacheContext.Provider>
  );
};

export const useMapboxCache = () => {
  const context = useContext(MapboxCacheContext);
  if (!context) {
    throw new Error("useMapboxCache must be used within a MapboxCacheProvider");
  }
  return context;
};
