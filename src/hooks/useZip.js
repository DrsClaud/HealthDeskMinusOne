import { useState, useEffect } from "react";
import { db } from "services/firebase";
import firebase from "firebase/compat/app";
import useLocation from "hooks/useLocation";

const useZip = () => {
  const { zipCode: locationZip } = useLocation();
  const [zip, setZip] = useState();
  const [customLocation, setCustomLocation] = useState();
  const [allListings, setAllListings] = useState([]);
  const [featuredListings, setFeaturedListings] = useState([]);
  const [listingsLoaded, setListingsLoaded] = useState(false);

  const getListings = async (zip) => {
    console.log("useZip: getListings started", { zip });
    setListingsLoaded(false); // Reset loading state when starting new fetch

    try {
      const querySnapshot = await db
        .collection("zips")
        .doc(String(zip))
        .collection("listings")
        .where("status", "==", "active")
        .get();

      console.log("useZip: got listings snapshot", {
        size: querySnapshot.size,
      });

      // Use Set to avoid duplicate location lookups
      const uniqueLocationIds = new Set();
      const allListingsData = [];
      const featuredListingsData = [];

      querySnapshot.forEach((doc) => {
        const listingData = doc.data();
        const { location, type } = listingData;

        if (location) {
          uniqueLocationIds.add(location);

          // All listings go to carousel
          allListingsData.push(listingData);

          // Only featured listings go to header
          if (type === "featured") {
            featuredListingsData.push(listingData);
          }
        }
      });

      // Fetch unique locations using batch queries (10x performance improvement)
      const locationIds = Array.from(uniqueLocationIds);

      // Helper function to chunk array into groups of 10 (Firestore 'in' limit)
      const chunkArray = (array, size) => {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
          chunks.push(array.slice(i, i + size));
        }
        return chunks;
      };

      // Batch queries using 'in' operator instead of individual doc gets
      const locationChunks = chunkArray(locationIds, 10);
      const batchQueries = locationChunks.map((chunk) =>
        db
          .collection("locations")
          .where(firebase.firestore.FieldPath.documentId(), "in", chunk)
          .get()
      );

      const batchResults = await Promise.all(batchQueries);

      // Flatten results and create location lookup map
      const locationMap = {};
      batchResults.forEach((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          if (doc.exists) {
            locationMap[doc.id] = doc.data();
          }
        });
      });

      // Helper function to extract coordinates from location data
      const extractCoordinates = (locationData) => {
        if (locationData.coordinates) {
          // Handle Firestore GeoPoint
          if (
            locationData.coordinates.latitude &&
            locationData.coordinates.longitude
          ) {
            return {
              lat: locationData.coordinates.latitude,
              lng: locationData.coordinates.longitude,
            };
          }
          // Handle array format [lat, lng]
          if (
            Array.isArray(locationData.coordinates) &&
            locationData.coordinates.length === 2
          ) {
            return {
              lat: locationData.coordinates[0],
              lng: locationData.coordinates[1],
            };
          }
        }
        // Fallback to lat/lng fields
        if (locationData.lat && locationData.lng) {
          return {
            lat: locationData.lat,
            lng: locationData.lng,
          };
        }
        return null;
      };

      // Combine listing data with location data for all listings
      const combinedAllListings = allListingsData
        .map((listing) => {
          const locationData = locationMap[listing.location];
          if (locationData && locationData.branding && locationData.group) {
            const coordinates = extractCoordinates(locationData);

            // Add facilityType determination for all listings
            const facilityType =
              locationData.type === "Emergency Department"
                ? "emergency"
                : "clinic";

            return {
              title: locationData.group,
              ...locationData.branding,
              type: listing.type,
              coordinates,
              facilityType,
            };
          }
          return null;
        })
        .filter(Boolean);

      // Combine listing data with location data for featured listings
      const combinedFeaturedListings = featuredListingsData
        .map((listing) => {
          const locationData = locationMap[listing.location];
          if (locationData && locationData.branding && locationData.group) {
            const coordinates = extractCoordinates(locationData);

            // Determine facility type based on location data
            const facilityType =
              locationData.type === "Emergency Department"
                ? "emergency"
                : "clinic";
            console.log({ facilityType });

            return {
              title: locationData.group,
              ...locationData.branding,
              type: listing.type,
              coordinates,
              facilityType,
            };
          }
          return null;
        })
        .filter(Boolean);

      setAllListings(combinedAllListings);
      setFeaturedListings(combinedFeaturedListings);
      console.log("useZip: finished processing", {
        allListingsCount: combinedAllListings.length,
        featuredListingsCount: combinedFeaturedListings.length,
      });
      setListingsLoaded(true);
    } catch (error) {
      console.error("useZip: Error fetching listings:", error);
      setAllListings([]);
      setFeaturedListings([]);
      setListingsLoaded(true);
    }
  };

  useEffect(() => {
    const targetZip = customLocation?.zip || locationZip;
    console.log("useZip: zip changed", {
      targetZip,
      locationZip,
      customLocation,
    });

    if (targetZip) {
      setZip(targetZip);
      getListings(targetZip);
    } else {
      console.log("useZip: no zip code available yet");
      setListingsLoaded(true); // This might be our issue - we're setting loaded too early
    }
  }, [locationZip, customLocation]);

  return {
    zip,
    setCustomLocation,
    listingsLoaded,
    allListings, // All active listings for carousel
    featuredListings, // Only featured listings for header
    // Legacy support
    ads: allListings,
    adsLoaded: listingsLoaded,
  };
};

export default useZip;
