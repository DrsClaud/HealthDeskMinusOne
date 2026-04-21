import { useMap, useMapEvents } from "react-leaflet";
import { useCallback, useRef } from "react";

const MapEventHandler = ({ getLocations }) => {
  const map = useMap();
  const isZooming = useRef(false);

  const handleMoveEnd = useCallback(() => {
    if (!isZooming.current) {
      const center = map.getCenter();
      getLocations({ lat: center.lat, lng: center.lng }, map.getZoom());
    }
    isZooming.current = false;
  }, [map, getLocations]);

  useMapEvents({
    moveend: handleMoveEnd,
    zoomstart: () => {
      isZooming.current = true;
    },
  });

  return null;
};

export default MapEventHandler;
