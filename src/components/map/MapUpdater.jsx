import { useEffect } from "react";
import { useMap } from "react-leaflet/hooks";

/**
 * Component responsible for updating map view when coordinates change.
 * Synchronizes map position with selected location or user position.
 * @param {Object} coords - Target coordinates {lat, lng}
 * @param {Function} updateMap - Callback to update map position
 */
const MapUpdater = ({ coords, updateMap }) => {
  console.log("MapUpdater - Received coords:", coords);

  const map = useMap();

  useEffect(() => {
    console.log("MapUpdater - Effect triggered with coords:", coords);

    if (coords && coords.lat && coords.lng) {
      const zoom = map.getZoom();
      console.log("MapUpdater - Updating map with:", { coords, zoom });

      updateMap(map, coords, zoom);
    }
    // eslint-disable-next-line
  }, [coords.lat, coords.lng, map]);

  return null;
};

export default MapUpdater;
