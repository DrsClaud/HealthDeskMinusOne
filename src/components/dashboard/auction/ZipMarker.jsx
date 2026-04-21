import React, { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "@mui/material/styles";

// Create custom icons for markers with different states
const createIcon = (isSelected, hasActiveAd, hasActivePromotion, theme) => {
  // Determine color based on status
  let color = theme.palette.primary.main; // Default blue for unselected

  if (isSelected) {
    if (hasActiveAd || hasActivePromotion) {
      color = theme.palette.success.main; // Green for active ads/promotions
    } else {
      color = theme.palette.secondary.main; // Default purple for selected
    }
  }

  return L.divIcon({
    className: "custom-zip-marker",
    html: `<div style="
      width: 18px;
      height: 18px;
      background-color: ${color};
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

const ZipMarker = ({
  zip,
  isSelected,
  hasActiveAd = false,
  hasActivePromotion = false,
  onToggle,
}) => {
  const theme = useTheme();

  // Memoize icon creation to prevent unnecessary re-renders
  const icon = useMemo(
    () => createIcon(isSelected, hasActiveAd, hasActivePromotion, theme),
    [isSelected, hasActiveAd, hasActivePromotion, theme]
  );

  if (!zip.lat || !zip.lng) return null;

  // Determine status text for popup
  let statusText = isSelected ? "Selected" : "Click to select";
  if (isSelected && (hasActiveAd || hasActivePromotion)) {
    statusText =
      hasActiveAd && hasActivePromotion
        ? "Active Ad & Promotion"
        : hasActiveAd
        ? "Active Ad"
        : "Active Promotion";
  }

  // Ensure zip.id is a string
  const zipId = String(zip.id);

  return (
    <Marker
      position={[zip.lat, zip.lng]}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          onToggle(zipId);
          e.target.closePopup();
        },
      }}
    >
      <Popup>
        <div>
          <h3>ZIP Code: {zipId}</h3>
          {zip.city && (
            <p>
              {zip.city}{zip.state ? `, ${zip.state}` : ''}
            </p>
          )}
          {!zip.city && zip.state && (
            <p>State: {zip.state}</p>
          )}
          <p>{statusText}</p>
        </div>
      </Popup>
    </Marker>
  );
};

export default React.memo(ZipMarker);
