import { useEffect } from "react";
import { useMap } from "react-leaflet/hooks";

/**
 * Extended MapUpdater component that handles visibility changes for MiniMap
 */
const MiniMapUpdater = ({ coords, updateMap, visible }) => {
  const map = useMap();

  // Handle coordinate changes
  useEffect(() => {
    if (coords) {
      const zoom = map.getZoom();
      updateMap(map, coords, zoom);
    }
  }, [coords, map, updateMap]);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      // Small delay to ensure the container is visible before invalidating
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [visible, map]);

  return null;
};

export default MiniMapUpdater;
