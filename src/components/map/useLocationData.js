import { useCallback } from "react";
import { GeoFirestore } from "geofirestore";
import firebase from "firebase/compat/app";
import { db } from "services/firebase";
import { processLocationData } from "./mapHelpers";
import { SEARCH_RADIUS_KM } from "./constants";

/**
 * Custom hook for fetching and managing location data from Firestore.
 * Handles geolocation queries, data processing, and loading states.
 * Implements radius-based location fetching with zoom level optimization.
 */
export const useLocationData = (setData, setSearchLoaded, setLoading) => {
  return useCallback(
    async (center) => {
      const geofirestore = new GeoFirestore(db);
      const geocollection = geofirestore.collection("locations");

      console.log("Fetching locations with center:", center);

      setSearchLoaded(false);

      try {
        const query = geocollection.near({
          center: new firebase.firestore.GeoPoint(center.lat, center.lng),
          radius: SEARCH_RADIUS_KM,
        });

        const snapshot = await query.get();
        const locations = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          lat: doc.data().coordinates.latitude,
          lng: doc.data().coordinates.longitude,
        }));

        console.log("Fetched locations:", locations);

        const newData = processLocationData(locations);

        console.log("Processed locations:", newData);

        setData(newData);
        setSearchLoaded(true);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setSearchLoaded(true);
        setLoading(false);
      }
    },
    [setData, setSearchLoaded, setLoading]
  );
};
