// HealthDesk/src/components/dashboard/auction/ZipMarker.stories.jsx
import React, { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import ZipMarker from "components/dashboard/auction/ZipMarker";
import "leaflet/dist/leaflet.css";

export default {
  title: "Auction/ZipMarker",
  component: ZipMarker,
  parameters: {
    layout: "fullscreen",
  },
};

// Sample ZIP code data
const sampleZip = {
  id: "60601",
  city: "Chicago",
  state: "IL",
  lat: 41.88502,
  lng: -87.622387,
};

// Basic story with a single marker
export const Default = () => {
  const [isSelected, setIsSelected] = useState(false);

  return (
    <div style={{ height: "400px" }}>
      <MapContainer
        center={[sampleZip.lat, sampleZip.lng]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url={`https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${process.env.REACT_APP_MAPTILER_KEY || ''}`}
          attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
        />
        <ZipMarker
          zip={sampleZip}
          isSelected={isSelected}
          onToggle={() => setIsSelected(!isSelected)}
        />
      </MapContainer>
      <div style={{ padding: "10px", background: "#f5f5f5" }}>
        <p>Click the marker to toggle selection state</p>
        <p>Current state: {isSelected ? "Selected" : "Not Selected"}</p>
      </div>
    </div>
  );
};

// Story with multiple markers
export const MultipleMarkers = () => {
  const [selectedZips, setSelectedZips] = useState(new Set());

  const zipCodes = [
    {
      id: "60601",
      city: "Chicago",
      state: "IL",
      lat: 41.88502,
      lng: -87.622387,
    },
    {
      id: "60602",
      city: "Chicago",
      state: "IL",
      lat: 41.883225,
      lng: -87.627261,
    },
    {
      id: "60603",
      city: "Chicago",
      state: "IL",
      lat: 41.8808,
      lng: -87.625515,
    },
  ];

  const handleToggle = (zipCode) => {
    setSelectedZips((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(zipCode)) {
        newSelected.delete(zipCode);
      } else {
        newSelected.add(zipCode);
      }
      return newSelected;
    });
  };

  return (
    <div style={{ height: "400px" }}>
      <MapContainer
        center={[41.883, -87.625]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url={`https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${process.env.REACT_APP_MAPTILER_KEY || ''}`}
          attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
        />
        {zipCodes.map((zip) => (
          <ZipMarker
            key={zip.id}
            zip={zip}
            isSelected={selectedZips.has(zip.id)}
            onToggle={() => handleToggle(zip.id)}
          />
        ))}
      </MapContainer>
      <div style={{ padding: "10px", background: "#f5f5f5" }}>
        <p>
          Selected ZIP codes: {Array.from(selectedZips).join(", ") || "None"}
        </p>
      </div>
    </div>
  );
};
