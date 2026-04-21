import { useContext, useState, useEffect } from "react";
import { LocationContext } from "context/Location";

/**
 * useFacility is a custom hook that manages facility location data and wait times.
 * It handles the processing and transformation of raw location data from the
 * LocationContext into a format that's ready for use in the dashboard.
 *
 * Key responsibilities:
 * - Processes wait times from the location data
 * - Uses capabilities field for facility service information (lab, xray, etc.)
 * - Manages loading states for location data
 * - Provides methods to update location data
 *
 * This hook is primarily used in facility dashboards to display and manage
 * wait times and service availability.
 *
 * @returns {Object} An object containing:
 * - Processed location data
 * - Methods to update location data
 * - Loading state for location data
 *
 * @example
 * const { data, setData } = useFacility();
 * console.log(data.capabilities.lab); // Access lab capability
 */
export const useFacility = () => {
  const { location, locationLoaded } = useContext(LocationContext);
  const [data, setData] = useState({});

  useEffect(() => {
    if (locationLoaded && location) {
      let newData = { ...location };

      // Process the location data for backwards compatibility
      ensureCapabilitiesField(newData);
      ensureCustomPhoneProperty(newData);

      setData(newData);
    }
  }, [locationLoaded, location]);

  // Ensure the location has a capabilities object, creating it if needed
  const ensureCapabilitiesField = (locationData) => {
    if (!locationData.capabilities) {
      const capabilityFields = ["lab", "xray", "ultrasound", "ct", "mri"];

      // Check if any capabilities exist directly on the location object
      const hasDirectCapabilities = capabilityFields.some(
        (field) =>
          locationData[field] !== undefined && locationData[field] !== null
      );

      if (hasDirectCapabilities) {
        // Create a capabilities object from the direct properties
        locationData.capabilities = {
          lab: locationData.lab === true,
          xray: locationData.xray === true,
          ultrasound: locationData.ultrasound === true,
          ct: locationData.ct === true,
          mri: locationData.mri === true,
        };
      } else {
        // Check if capabilities exist in waitTimes (legacy locations)
        if (locationData.waitTimes && locationData.waitTimes.length > 0) {
          const dashboardEntry = [...locationData.waitTimes]
            .reverse()
            .find((time) => time.dashboard === true);

          if (dashboardEntry) {
            locationData.capabilities = {
              lab: dashboardEntry.lab === true,
              xray: dashboardEntry.xray === true,
              ultrasound: dashboardEntry.ultrasound === true,
              ct: dashboardEntry.ct === true,
              mri: dashboardEntry.mri === true,
            };
          } else {
            // Initialize empty capabilities object
            locationData.capabilities = {
              lab: false,
              xray: false,
              ultrasound: false,
              ct: false,
              mri: false,
            };
          }
        } else {
          // Initialize empty capabilities object
          locationData.capabilities = {
            lab: false,
            xray: false,
            ultrasound: false,
            ct: false,
            mri: false,
          };
        }
      }
    }
  };

  // Ensure the location has the customPhone property
  const ensureCustomPhoneProperty = (locationData) => {
    // If customPhone doesn't exist at the top level, try to get it from waitTimes
    if (
      locationData.customPhone === undefined &&
      locationData.waitTimes &&
      locationData.waitTimes.length > 0
    ) {
      const dashboardEntry = [...locationData.waitTimes]
        .reverse()
        .find((time) => time.dashboard === true);

      if (dashboardEntry && dashboardEntry.customPhone !== undefined) {
        locationData.customPhone = dashboardEntry.customPhone;
      }
    }
  };

  return { data, setData };
};
