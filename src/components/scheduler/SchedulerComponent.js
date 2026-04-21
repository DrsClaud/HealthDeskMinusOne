import React, { useState, useEffect } from "react";
import { db } from "services/firebase";
import firebase from "firebase/compat/app";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import DailyScheduler from "./DailyScheduler";
import ScheduleView from "./ScheduleView";

// Use a consistent key to match the one in DailyScheduler
const TEMP_SCHEDULE_KEY = "healthdesk_temp_schedule";

const SchedulerComponent = ({ data, previewMode = false }) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [facilityData, setFacilityData] = useState(null);

  // Refresh facility data after changes
  useEffect(() => {
    if (data) {
      setFacilityData(data);
    }
  }, [data]);

  // Clear any temporary schedule data when component unmounts
  useEffect(() => {
    return () => {
      // Only clear if not in the process of submitting
      if (!loading) {
        try {
          sessionStorage.removeItem(TEMP_SCHEDULE_KEY);
        } catch (e) {
          console.error("Error clearing temp schedule from sessionStorage:", e);
        }
      }
    };
  }, [loading]);

  // Loading state
  if (!facilityData || !facilityData.id) {
    return <CircularProgress />;
  }

  const handleScheduleSubmit = (scheduleEntries) => {
    if (!scheduleEntries.length) {
      setError("Please select at least one wait time to schedule");
      return;
    }

    setLoading(true);
    setError(null);

    // Add dashboard and admin properties to each entry
    const entriesToAdd = scheduleEntries.map((entry) => ({
      ...entry,
      waitTime: Number(entry.waitTime), // Ensure waitTime is a number
      admin: true,
    }));

    // Use a transaction to completely replace the array instead of arrayUnion
    db.runTransaction(async (transaction) => {
      // Get the current document
      const docRef = db.collection("locations").doc(String(facilityData.id));
      const doc = await transaction.get(docRef);

      if (!doc.exists) {
        throw new Error("Document does not exist!");
      }

      // Get existing wait times
      const locationData = doc.data();
      const currentWaitTimes = locationData.waitTimes || [];

      // Get all timestamps we're trying to add
      const newTimestamps = new Set(entriesToAdd.map((entry) => entry.date));

      // Remove any existing entries with the same timestamps
      const filteredWaitTimes = currentWaitTimes.filter(
        (entry) => !newTimestamps.has(entry.date)
      );

      // Add our new entries
      const newWaitTimes = [...filteredWaitTimes, ...entriesToAdd];

      // Update with new combined array - this will completely replace the old array
      transaction.update(docRef, { waitTimes: newWaitTimes });

      // Return the new array for local state update
      return newWaitTimes;
    })
      .then((newWaitTimes) => {
        // If newWaitTimes is undefined, that means no changes were needed
        if (newWaitTimes) {
          // Update local data
          setFacilityData({
            ...facilityData,
            waitTimes: newWaitTimes,
          });
        }

        setSubmitted(true);
        setLoading(false);

        // Reset submission status after 3 seconds
        setTimeout(() => {
          setSubmitted(false);
        }, 3000);

        // Clear session storage to avoid duplicates on next load
        try {
          sessionStorage.removeItem(TEMP_SCHEDULE_KEY);
        } catch (e) {
          console.error("Error clearing temp schedule from sessionStorage:", e);
        }
      })
      .catch((error) => {
        console.error("Error saving scheduled wait times:", error);
        setError("Failed to save scheduled wait times. Please try again.");
        setLoading(false);
      });
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <DailyScheduler
        onSubmit={handleScheduleSubmit}
        loading={loading}
        submitted={submitted}
        facilityData={facilityData}
        previewMode={previewMode}
      />

      <Divider sx={{ my: 4 }} />

      <ScheduleView data={facilityData} />
    </Box>
  );
};

export default SchedulerComponent;
