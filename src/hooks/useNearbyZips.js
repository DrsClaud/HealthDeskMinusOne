import { useState, useEffect } from "react";
import { db } from "services/firebase";
import { splitArrayIntoChunks } from "components/dashboard/advertising/ZipTable/zipHelpers";

/**
 * Custom hook to fetch and manage nearby ZIP codes
 * @param {Object} location - Current location object containing ZIP code
 * @param {Array} existingZips - Array of ZIP codes user already has
 * @returns {Object} Object containing nearby ZIPs and loading state
 */
export const useNearbyZips = (location, existingZips) => {
  const [nearbyZips, setNearbyZips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNearbyZips = async () => {
      if (!location) return;

      try {
        const doc = await db
          .collection("zips_near")
          .doc(String(location.zip))
          .get();

        if (!doc.data()) {
          setIsLoading(false);
          return;
        }

        const tempZipCodes = doc.data().near.map((z) => Number(z));
        const zipChunks = splitArrayIntoChunks(tempZipCodes);
        const zipsWithPopulation = [];

        const batches = zipChunks.map((chunk) =>
          db
            .collection("populations")
            .where("zip", "in", chunk)
            .get()
            .then((querySnapshot) => {
              querySnapshot.forEach((doc) => {
                const data = doc.data();
                const isDuplicate = existingZips
                  .map((z) => z.zip)
                  .includes(data.zip);
                if (data.population > 0 && !isDuplicate) {
                  zipsWithPopulation.push(data);
                }
              });
            })
        );

        await Promise.all(batches);
        setNearbyZips(zipsWithPopulation);
      } catch (error) {
        console.error("Error fetching nearby zips:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNearbyZips();
  }, [location, existingZips]);

  return { nearbyZips, isLoading };
};
