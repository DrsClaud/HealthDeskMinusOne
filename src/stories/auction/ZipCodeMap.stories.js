// HealthDesk/src/components/dashboard/auction/ZipCodeMap.stories.jsx
import React, { useState } from "react";
import ZipCodeMap from "components/dashboard/auction/ZipCodeMap";

export default {
  title: "Auction/ZipCodeMap",
  component: ZipCodeMap,
  parameters: {
    layout: "fullscreen",
  },
};

// Basic story with empty selection
export const Default = () => {
  const [selectedZips, setSelectedZips] = useState(new Set());

  const handleZipToggle = (zipCode) => {
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
    <div style={{ height: "600px", padding: "20px" }}>
      <ZipCodeMap selectedZips={selectedZips} onZipToggle={handleZipToggle} />
    </div>
  );
};

// Story with pre-selected ZIP codes
export const WithSelectedZips = () => {
  const [selectedZips, setSelectedZips] = useState(
    new Set(["60601", "60602", "60603"])
  );

  const handleZipToggle = (zipCode) => {
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
    <div style={{ height: "600px", padding: "20px" }}>
      <ZipCodeMap selectedZips={selectedZips} onZipToggle={handleZipToggle} />
    </div>
  );
};
