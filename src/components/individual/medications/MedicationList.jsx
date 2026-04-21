import React from "react";
import {
  Box,
  Typography,
  Alert,
  Skeleton,
  Card,
  CardContent,
} from "@mui/material";

import MedicationCard from "./MedicationCard";

const MedicationListSkeleton = () => (
  <Card>
    <CardContent>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
        <Skeleton variant="text" width="60%" height={28} />
      </Box>
      <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="80%" height={16} />
      <Skeleton variant="text" width="70%" height={16} />
      <Skeleton variant="text" width="50%" height={16} sx={{ mt: 2 }} />
    </CardContent>
  </Card>
);

const MedicationList = ({
  medications = [],
  reminderStatuses = new Map(),
  loading = false,
  error = null,
  onEdit,
  onDelete,
  onAdherenceChange,
  canEnableMoreAlerts = true,
  emptyMessage = "No medications added yet.",
  trackingSummaries = new Map(), // Now passed as prop
  trackingLoading = false, // Now passed as prop
}) => {
  if (loading) {
    return (
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          alignItems: "start",
        }}
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <MedicationListSkeleton key={index} />
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (medications.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" gutterBottom>
            {emptyMessage}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Get started by adding your first medication above.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gap: 3,
        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
        alignItems: "start",
        "@media (max-width: 600px)": {
          gridTemplateColumns: "1fr",
        },
      }}
    >
      {medications.map((medication) => {
        const trackingSummary = trackingSummaries.get(medication.id);

        return (
          <MedicationCard
            key={medication.id}
            medication={medication}
            reminderStatus={reminderStatuses.get(medication.id)}
            trackingSummary={trackingSummary}
            onEdit={onEdit}
            onDelete={onDelete}
            onAdherenceChange={onAdherenceChange}
            canEnableMoreAlerts={canEnableMoreAlerts}
          />
        );
      })}
    </Box>
  );
};

export default MedicationList;
