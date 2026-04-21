import { useCallback, useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import { debounce } from "lodash";

/**
 * Component that manages map interaction events.
 * Handles zoom and pan events with debouncing for performance.
 * Coordinates location data updates based on map viewport changes.
 * @param {Function} getLocations - Callback to fetch new location data
 */
const MapEventHandler = ({ getLocations }) => {
  const map = useMap();

  const debouncedGetLocations = useCallback(
    debounce((center) => {
      console.log("Fetching locations for center:", center);
      getLocations(center);
    }, 500),
    [getLocations]
  );

  // Initial load
  useEffect(() => {
    const center = map.getCenter();
    debouncedGetLocations(center);
  }, []);

  useMapEvents({
    dragend: () => {
      const center = map.getCenter();
      debouncedGetLocations(center);
    },
  });

  return null;
};

export default MapEventHandler;
